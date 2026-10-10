import { Seo } from '../components/Seo';
import { ButtonLink } from '../components/ui/Button';
import { UnderlinedHeading } from '../components/ui/HandUnderline';
import { useSite } from '../lib/site';

/** `withNavOffset`: used inside pages whose nav overlays a hero, so the message clears the nav. */
export default function NotFound({ withNavOffset = false }: { withNavOffset?: boolean }) {
  // Wording is editable in Admin → Website → Buttons, labels & 404 page.
  const { notFound, navigation } = useSite();
  return (
    <>
      <Seo title="Page not found" noindex />
      <section className={`container-page grid min-h-[70svh] content-center py-24 ${withNavOffset ? 'pt-40' : ''}`}>
        <p className="label text-slate">{notFound.eyebrow}</p>
        <UnderlinedHeading
          as="h1"
          text={notFound.heading}
          word={notFound.underlineWord}
          className="mt-4 max-w-[16ch] text-display"
        />
        <p className="prose-measure mt-6 text-lead text-slate">{notFound.body}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink to="/donate" size="lg">
            {navigation.donateLabel}
          </ButtonLink>
          <ButtonLink to="/" size="lg" variant="secondary">
            {notFound.homeLabel}
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
