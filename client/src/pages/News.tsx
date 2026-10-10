import { Link, useParams } from 'react-router-dom';
import { formatDate } from '@gtyf/shared';
import type { NewsDetail, NewsSummary } from '@gtyf/shared/api';
import { DonateBand } from '../components/blocks';
import { EmptyState, NewsCard } from '../components/cards';
import { programmeIcon } from '../components/icons/ImpactIcon';
import { Seo } from '../components/Seo';
import { Picture } from '../components/ui/Picture';
import { Reveal } from '../components/ui/Reveal';
import { ArrowIcon, PageIntro } from '../components/ui/SectionHeading';
import { useContent } from '../lib/content';
import { useSite } from '../lib/site';
import NotFound from './NotFound';
import { PageLoading } from './PageLoading';

export default function News() {
  const { pages } = useSite();
  const p = pages.news;
  const { data } = useContent<NewsSummary[]>('/content/news');
  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro} />
      <section className="container-page pb-16 md:pb-32">
        {data && data.length > 0 ? (
          <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((post, i) => (
              <Reveal as="li" key={post.slug} delay={(i % 3) * 0.06}>
                <NewsCard post={post} headingLevel="h2" />
              </Reveal>
            ))}
          </ul>
        ) : (
          <EmptyState>{p.empty}</EmptyState>
        )}
      </section>
    </>
  );
}

export function NewsPost() {
  const { slug } = useParams();
  const { data: n, loading } = useContent<NewsDetail>(`/content/news/${slug}`);
  const { common } = useSite();
  if (!n) return loading ? <PageLoading /> : <NotFound />;

  return (
    <>
      <Seo title={n.seoTitle ?? n.title} description={n.seoDescription ?? n.excerpt} image={n.coverImage?.ogUrl ?? n.coverImage?.src} type="article" />
      <article className="pb-16 md:pb-32">
        <header className="container-page max-w-4xl pt-14 md:pt-24">
          <p className="label text-slate">
            <time dateTime={n.publishedAt}>{formatDate(n.publishedAt)}</time>
            {n.programme && (
              <>
                <span aria-hidden="true"> · </span>
                <Link to={`/programmes/${n.programme.slug}`} className="hover:text-ink">
                  {n.programme.shortTitle}
                </Link>
              </>
            )}
          </p>
          <h1 className="mt-4 text-display">{n.title}</h1>
          {n.excerpt && <p className="prose-measure mt-6 text-lead text-slate">{n.excerpt}</p>}
        </header>
        {n.coverImage && (
          <div className="container-page mt-12">
            <div className="relative aspect-[16/9] overflow-hidden rounded-card">
              <Picture image={n.coverImage} sizes="(min-width: 1280px) 1200px, 100vw" priority placeholderIcon={programmeIcon(n.programme?.slug)} />
            </div>
            {n.coverImage.caption && <p className="mt-3 text-sm text-slate">{n.coverImage.caption}</p>}
          </div>
        )}
        {/* bodyHtml is sanitised by the server when the post is saved. */}
        <div className="container-page mt-12 max-w-4xl">
          <div className="prose-gtyf" dangerouslySetInnerHTML={{ __html: n.bodyHtml }} />
          <Link to="/news" className="mt-14 inline-flex items-center gap-2 font-semibold hover:text-slate">
            <ArrowIcon className="size-4 rotate-180" /> {common.allNews}
          </Link>
        </div>
      </article>
      <DonateBand cause={n.programme?.slug} />
    </>
  );
}
