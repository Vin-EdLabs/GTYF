import type { RouteRecord } from 'vite-react-ssg';
import type { LoaderFunctionArgs } from 'react-router-dom';
import type { StaticPaths } from '@gtyf/shared/api';
import { Layout } from './components/layout/Layout';
import { fetchContent } from './lib/content';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import { RouteError } from './pages/RouteError';

/**
 * Route table. Loaders run at build time (prerender) and, for pages that
 * weren't prerendered, in the browser. Every page except Home is lazy-loaded
 * so the home page ships only the JS it needs.
 */

const load = (path: string) => () => fetchContent(path);
const loadBySlug = (prefix: string) => ({ params }: LoaderFunctionArgs) => fetchContent(`${prefix}/${params.slug}`);

// Fetched once per build and shared by every dynamic route.
let pathsPromise: Promise<StaticPaths | null> | undefined;
const staticPaths = (key: keyof StaticPaths, prefix: string) => async () => {
  pathsPromise ??= fetchContent<StaticPaths>('/content/paths');
  const paths = await pathsPromise;
  return (paths?.[key] ?? []).map((slug) => `${prefix}/${slug}`);
};

const page = (importer: () => Promise<{ default: React.ComponentType }>) => () =>
  importer().then((m) => ({ Component: m.default }));

const adminPage = (importer: () => Promise<{ default: React.ComponentType }>) => page(importer);

export const routes: RouteRecord[] = [
  // Admin: a separate app shell, loaded only when someone opens /admin. Never prerendered.
  {
    path: '/admin',
    lazy: adminPage(() => import('./admin/AdminApp')),
    children: [
      { index: true, lazy: adminPage(() => import('./admin/pages/Dashboard')) },
      { path: 'login', lazy: adminPage(() => import('./admin/pages/Login')) },
      { path: 'donations', lazy: adminPage(() => import('./admin/pages/Donations')) },
      { path: 'donations/:id', lazy: adminPage(() => import('./admin/pages/DonationDetail')) },
      { path: 'admins', lazy: adminPage(() => import('./admin/pages/Admins')) },
      { path: 'account', lazy: adminPage(() => import('./admin/pages/Account')) },
      { path: 'photos', lazy: adminPage(() => import('./admin/pages/Photos')) },
      { path: 'website-photos', lazy: adminPage(() => import('./admin/pages/WebsitePhotos')) },
      { path: 'inbox', lazy: adminPage(() => import('./admin/pages/Inbox')) },
      { path: 'content', lazy: adminPage(() => import('./admin/pages/ContentHub')) },
      { path: 'content/news', lazy: () => import('./admin/pages/News').then((m) => ({ Component: m.NewsList })) },
      { path: 'content/news/:id', lazy: () => import('./admin/pages/News').then((m) => ({ Component: m.NewsEdit })) },
      { path: 'content/events', lazy: () => import('./admin/pages/Events').then((m) => ({ Component: m.EventsList })) },
      { path: 'content/events/:id', lazy: () => import('./admin/pages/Events').then((m) => ({ Component: m.EventEdit })) },
      { path: 'content/slides', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.SlidesEditor })) },
      { path: 'content/home', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.HomeSectionsEditor })) },
      { path: 'content/programmes', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.ProgrammesList })) },
      { path: 'content/programmes/:id', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.ProgrammeEdit })) },
      { path: 'content/team', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.TeamEditor })) },
      { path: 'content/impact', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.ImpactEditor })) },
      { path: 'content/values', lazy: () => import('./admin/pages/SiteEditors').then((m) => ({ Component: m.ValuesEditor })) },
      { path: 'content/settings/:group', lazy: adminPage(() => import('./admin/pages/Settings')) },
    ],
  },
  {
    id: 'root',
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    // In the browser, a brief API hiccup falls back to the built-in site details
    // (and the page refetches) instead of an error screen. Builds still fail loudly.
    loader: () => (import.meta.env.SSR ? fetchContent('/site') : fetchContent('/site').catch(() => null)),
    children: [
      { index: true, element: <Home />, loader: load('/content/home') },
      { path: 'about', loader: load('/content/about'), lazy: page(() => import('./pages/About')) },
      { path: 'programmes', loader: load('/content/programmes'), lazy: page(() => import('./pages/Programmes')) },
      {
        path: 'programmes/:slug',
        loader: loadBySlug('/content/programmes'),
        lazy: page(() => import('./pages/Programme')),
        getStaticPaths: staticPaths('programmes', 'programmes'),
      },
      { path: 'events', loader: load('/content/events'), lazy: page(() => import('./pages/Events')) },
      {
        path: 'events/:slug',
        loader: loadBySlug('/content/events'),
        lazy: page(() => import('./pages/Event')),
        getStaticPaths: staticPaths('events', 'events'),
      },
      { path: 'news', loader: load('/content/news'), lazy: page(() => import('./pages/News')) },
      {
        path: 'news/:slug',
        loader: loadBySlug('/content/news'),
        lazy: () => import('./pages/News').then((m) => ({ Component: m.NewsPost })),
        getStaticPaths: staticPaths('news', 'news'),
      },
      { path: 'gallery', loader: load('/content/gallery'), lazy: page(() => import('./pages/Gallery')) },
      { path: 'team', loader: load('/content/team'), lazy: page(() => import('./pages/Team')) },
      { path: 'get-involved', lazy: page(() => import('./pages/GetInvolved')) },
      { path: 'contact', lazy: page(() => import('./pages/Contact')) },
      { path: 'donate', lazy: page(() => import('./pages/Donate')) },
      { path: 'donate/thank-you', lazy: page(() => import('./pages/ThankYou')) },
      // Prerendered as /404/index.html so Nginx can serve it for unknown URLs.
      { path: '404', element: <NotFound /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
