/**
 * npm run test:content -w server   (API running; uses SEED_ADMIN_* from .env)
 *
 * Checks the content admin end to end: photo upload + processing, the child
 * consent gate, events (draft → preview → publish), news HTML sanitising,
 * site settings, and that finance admins can't edit content. Cleans up after itself.
 */
import sharp from 'sharp';

const API = process.env.API_URL ?? 'http://localhost:4000';
let failures = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok || detail === undefined ? '' : `  → ${JSON.stringify(detail).slice(0, 300)}`}`);
  if (!ok) failures++;
};

function client() {
  let cookie = '';
  return async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0]!;
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };
}

const admin = client();
await admin('/api/admin/auth/login', { method: 'POST', json: { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD } });

// A 1600×1000 test "photo" (a gradient), like one taken on a phone.
const jpeg = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: { r: 242, g: 169, b: 0 } } })
  .composite([{ input: Buffer.from('<svg width="1600" height="1000"><circle cx="400" cy="300" r="200" fill="#0B1422"/></svg>'), top: 0, left: 0 }])
  .jpeg()
  .toBuffer();
const form = new FormData();
form.append('file', new Blob([new Uint8Array(jpeg)], { type: 'image/jpeg' }), 'outreach-day.jpg');
form.append('showsChildren', 'true');
form.append('consentConfirmed', 'false');
const up = await admin('/api/admin/content/media', { method: 'POST', body: form });
check('photo uploads and is resized', up.status === 201 && up.body.width === 1600 && up.body.src.endsWith('.webp'), up.body);
const photo = up.body;
check('photo of children without consent is held back', photo.hiddenReason !== null, photo.hiddenReason);
const variant = await fetch(`${API}${photo.src}`);
check('resized file is served', variant.status === 200 && variant.headers.get('content-type') === 'image/webp');

// Event draft using the photo
const ev = await admin('/api/admin/content/events', {
  method: 'POST',
  json: { title: 'Back to School Outreach', dateStart: '2026-11-14', startTime: '09:00', venue: 'Wamfie', highlights: ['Distributing exercise books'], schoolsVisited: [], heroImageId: photo.id, volunteersWanted: true, status: 'draft' },
});
check('event draft created with an automatic address', ev.status === 201 && ev.body.slug === 'back-to-school-outreach-2026', ev.body);
check('draft event is not public', (await fetch(`${API}/api/content/events/${ev.body.slug}`)).status === 404);
const preview = await admin(`/api/content/events/${ev.body.slug}?preview=1`);
check('admin can preview the draft', preview.status === 200 && preview.body.title === 'Back to School Outreach', preview.status);
check('image hidden publicly until consent', preview.body.heroImage === null, preview.body.heroImage);

await admin(`/api/admin/content/media/${photo.id}`, { method: 'PATCH', json: { altText: 'Pupils receiving exercise books', consentConfirmed: true, focalX: 0.25, focalY: 0.3 } });
await admin(`/api/admin/content/events/${ev.body.id}`, { method: 'PATCH', json: { title: 'Back to School Outreach', dateStart: '2026-11-14', startTime: '09:00', venue: 'Wamfie', highlights: ['Distributing exercise books'], schoolsVisited: [], heroImageId: photo.id, volunteersWanted: true, status: 'published' } });
const pub = await fetch(`${API}/api/content/events/${ev.body.slug}`).then((r) => r.json() as Promise<any>);
check('published event is public with its photo', pub.heroImage?.alt === 'Pupils receiving exercise books' && pub.heroImage.focalX === 0.25, pub.heroImage);
const home = await fetch(`${API}/api/content/home`).then((r) => r.json() as Promise<any>);
check('it becomes the home page’s upcoming event', home.upcomingEvent?.slug === ev.body.slug, home.upcomingEvent?.slug);

// News with unsafe HTML
const news = await admin('/api/admin/content/news', {
  method: 'POST',
  json: { title: 'Books reach Wamfie', excerpt: 'A good day.', bodyHtml: '<p>Hello <strong>friends</strong></p><script>alert(1)</script><img src="https://evil.example/x.png"><a href="javascript:alert(1)">x</a>', coverImageId: photo.id, status: 'published' },
});
check('news story published', news.status === 201 && !!news.body.publishedAt, news.body);
check('unsafe HTML is removed', !news.body.bodyHtml.includes('script') && !news.body.bodyHtml.includes('evil') && !news.body.bodyHtml.includes('javascript'), news.body.bodyHtml);
const newsList = await fetch(`${API}/api/content/news`).then((r) => r.json() as Promise<any>);
check('story appears on the News page', newsList.some((n: { slug: string }) => n.slug === news.body.slug));

// Settings
const settings = await admin('/api/admin/content/settings/contact', { method: 'PUT', json: { phone: '+233 20 000 0000', email: 'hello@example.org', hacker: 'ignored' } });
check('contact details saved (unknown fields dropped)', settings.body.phone === '+233 20 000 0000' && !('hacker' in settings.body), settings.body);
const site = await fetch(`${API}/api/site`).then((r) => r.json() as Promise<any>);
check('site shows the new phone number', site.settings.contact.phone === '+233 20 000 0000');

// Finance admins can't edit content
const fin = client();
const email = `fin.${Date.now()}@example.com`;
const created = await admin('/api/admin/admins', { method: 'POST', json: { name: 'Fin Test', email, password: 'FinanceTest123', role: 'finance' } });
await fin('/api/admin/auth/login', { method: 'POST', json: { email, password: 'FinanceTest123' } });
check('finance admin cannot edit content', (await fin('/api/admin/content/events')).status === 403);

// Clean up
await admin(`/api/admin/content/news/${news.body.id}`, { method: 'DELETE' });
await admin(`/api/admin/content/events/${ev.body.id}`, { method: 'DELETE' });
const del = await admin(`/api/admin/content/media/${photo.id}`, { method: 'DELETE' });
check('photo deleted with its files', del.status === 200 && (await fetch(`${API}${photo.src}`)).status === 404);
await admin(`/api/admin/admins/${created.body.id}`, { method: 'PATCH', json: { isActive: false } });
await admin('/api/admin/content/settings/contact', { method: 'PUT', json: { phone: 'TODO: contact phone', email: 'TODO: contact email' } });

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll content checks passed.');
process.exit(failures ? 1 : 0);
