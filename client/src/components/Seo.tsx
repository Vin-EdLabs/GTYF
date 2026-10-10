import { Head } from 'vite-react-ssg';
import { useLocation } from 'react-router-dom';
import { useDefaultShareImage, useSite } from '../lib/site';

interface Props {
  /** Page title; the site name is appended by the title template. Omit on the home page. */
  title?: string;
  description?: string;
  /** Absolute or root-relative URL of a 1200×630 share image. */
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '');
const absolute = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url}`);

/**
 * Per-page <title>, description and Open Graph / Twitter tags. Rendered into
 * the prerendered HTML so WhatsApp and Facebook previews are correct.
 */
export function Seo({ title, description, image, type = 'website', noindex }: Props) {
  const { seo, organisation } = useSite();
  const fallbackImage = useDefaultShareImage();
  const { pathname } = useLocation();
  const fullTitle = title ? seo.titleTemplate.replace('%s', title) : seo.defaultTitle;
  const desc = description ?? seo.defaultDescription;
  const url = `${SITE_URL}${pathname}`;
  const img = absolute(image ?? fallbackImage ?? '/brand/logo-full.png');

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:site_name" content={organisation.name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title ?? seo.defaultTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta property="og:locale" content="en_GH" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title ?? seo.defaultTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Head>
  );
}
