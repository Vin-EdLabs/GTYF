import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Pages that should never be indexed or listed in the sitemap.
const NOINDEX = ['/404', '/donate/thank-you'];

export default defineConfig(({ mode }) => {
  // .env lives at the repo root, shared with the server.
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '..'), '');
  const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '');

  return {
    envDir: '..',
    plugins: [react(), tailwindcss()],
    server: {
      // PORT lets tooling pick a free port; 5173 otherwise.
      port: Number(process.env.PORT) || 5173,
      // Listen on the WiFi/LAN too, so a phone on the same network can open the site.
      host: true,
      proxy: { '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000' },
    },
    ssgOptions: {
      // Pretty URLs: /about -> /about/index.html, which Nginx serves directly.
      dirStyle: 'nested',
      formatting: 'none',
      // Critical CSS inlined per page; the rest loads without blocking render.
      beastiesOptions: { preload: 'swap', pruneSource: false },
      // The admin is a signed-in app: never prerender it (Nginx serves 200.html for /admin/*).
      includedRoutes: (paths) => paths.filter((p) => !p.startsWith('/admin') && !p.includes(':') && !p.includes('*')),

      // Helmet tags are injected at the top of <head>; move <meta charset> back
      // to the very start so it's inside the first 1024 bytes as browsers expect.
      onPageRendered(_route, html) {
        const charset = /<meta charset="UTF-8"\s*\/?>/i;
        return html.replace(charset, '').replace(/<head>/i, '<head><meta charset="UTF-8">');
      },

      async onFinished(dir) {
        const pages: string[] = [];
        const walk = async (d: string) => {
          for (const entry of await fs.readdir(d, { withFileTypes: true })) {
            const full = path.join(d, entry.name);
            if (entry.isDirectory()) await walk(full);
            else if (entry.name === 'index.html') {
              const route = '/' + path.relative(dir, path.dirname(full)).split(path.sep).join('/');
              pages.push(route === '/.' ? '/' : route.replace(/\/$/, '') || '/');
            }
          }
        };
        await walk(dir);

        // sitemap.xml + robots.txt pointing at it.
        if (!siteUrl) console.warn('[gtyf] VITE_SITE_URL is not set: sitemap will use relative URLs.');
        const urls = pages
          .filter((p) => !NOINDEX.includes(p))
          .sort()
          .map((p) => `  <url><loc>${siteUrl}${p === '/' ? '/' : p}</loc></url>`)
          .join('\n');
        await fs.writeFile(
          path.join(dir, 'sitemap.xml'),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        );
        const robotsPath = path.join(dir, 'robots.txt');
        const robots = await fs.readFile(robotsPath, 'utf8');
        await fs.writeFile(robotsPath, `${robots.trimEnd()}\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

        // 200.html: an empty app shell. Nginx serves it for paths that exist in
        // the app but weren't prerendered yet (e.g. an event published since
        // the last build); the page then loads its content from the API.
        const shell = (await fs.readFile(path.join(dir, '404', 'index.html'), 'utf8'))
          .replace(/<div id="root"[^>]*>[\s\S]*<\/div>(\s*<script)/, '<div id="root"></div>$1')
          .replace(/<title[^>]*>[^<]*<\/title>/, '<title>Guide The Youth Foundation</title>')
          .replace(/<meta[^>]+name="robots"[^>]*>/, '')
          .replace(/<script>window\.__VITE_REACT_SSG_HASH__[^<]*<\/script>/, '');
        await fs.writeFile(path.join(dir, '200.html'), shell);

        console.log(`[gtyf] sitemap.xml (${pages.length} pages), robots.txt and 200.html written.`);
      },
    },
  };
});
