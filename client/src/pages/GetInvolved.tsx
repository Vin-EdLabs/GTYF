import { useSearchParams } from 'react-router-dom';
import { PARTNERSHIP_TYPES, VOLUNTEER_INTERESTS, partnerSchema, volunteerSchema } from '@gtyf/shared/forms';
import {
  CheckboxGroup,
  FormFooter,
  FormSuccess,
  Honeypot,
  SelectField,
  TextArea,
  TextField,
  text,
  useFormSubmit,
} from '../components/forms';
import { Seo } from '../components/Seo';
import { Reveal } from '../components/ui/Reveal';
import { PageIntro, SectionHeading } from '../components/ui/SectionHeading';
import { useSite } from '../lib/site';

export default function GetInvolved() {
  const { pages } = useSite();
  const p = pages.getInvolved;
  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro}>
        <nav aria-label="On this page" className="mt-10 flex flex-wrap gap-3">
          <a href="#volunteer" className="rounded-full bg-mist px-5 py-2.5 font-semibold hover:bg-ink hover:text-white">
            {p.volunteerHeading}
          </a>
          <a href="#partner" className="rounded-full bg-mist px-5 py-2.5 font-semibold hover:bg-ink hover:text-white">
            {p.partnerHeading}
          </a>
        </nav>
      </PageIntro>
      <VolunteerSection />
      <PartnerSection />
    </>
  );
}

function VolunteerSection() {
  const { pages } = useSite();
  const p = pages.getInvolved;
  const [params] = useSearchParams();
  const eventSlug = params.get('event') ?? undefined;
  const { status, errors, message, onSubmit, formRef } = useFormSubmit(volunteerSchema, '/forms/volunteer', (fd) => ({
    fullName: fd.get('fullName'),
    email: fd.get('email'),
    phone: text(fd, 'phone'),
    location: text(fd, 'location'),
    interests: fd.getAll('interests'),
    availability: text(fd, 'availability'),
    message: text(fd, 'message'),
    eventSlug,
  }));

  return (
    <section id="volunteer" className="scroll-mt-24 bg-mist py-14 md:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <SectionHeading heading={p.volunteerHeading} body={p.volunteerIntro} />
          {eventSlug && <p className="label mt-6 text-slate">For event: {eventSlug.replace(/-/g, ' ')}</p>}
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          {status === 'done' ? (
            <FormSuccess>{p.success}</FormSuccess>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-6 rounded-card bg-white p-6 shadow-soft md:p-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField name="fullName" label="Your name" required autoComplete="name" errors={errors} />
                <TextField name="email" label="Email" type="email" required autoComplete="email" inputMode="email" errors={errors} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" errors={errors} />
                <TextField name="location" label="Where you live" autoComplete="address-level2" hint="Town or city" errors={errors} />
              </div>
              <CheckboxGroup name="interests" label="How you'd like to help" options={VOLUNTEER_INTERESTS} errors={errors} />
              <TextField name="availability" label="When you're available" hint="For example: weekends, school holidays" errors={errors} />
              <TextArea name="message" label="Anything else we should know" errors={errors} />
              <Honeypot />
              <FormFooter status={status} message={message} submitLabel="Send my details" />
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function PartnerSection() {
  const { pages } = useSite();
  const p = pages.getInvolved;
  const { status, errors, message, onSubmit, formRef } = useFormSubmit(partnerSchema, '/forms/partner', (fd) => ({
    organisation: fd.get('organisation'),
    contactName: fd.get('contactName'),
    email: fd.get('email'),
    phone: text(fd, 'phone'),
    partnershipType: fd.get('partnershipType') ?? '',
    message: fd.get('message'),
  }));

  return (
    <section id="partner" className="scroll-mt-24 py-14 md:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <SectionHeading heading={p.partnerHeading} body={p.partnerIntro} />
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7 lg:col-start-6">
          {status === 'done' ? (
            <FormSuccess>{p.success}</FormSuccess>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField name="organisation" label="Organisation" required autoComplete="organization" errors={errors} />
                <SelectField name="partnershipType" label="Type of organisation" required options={PARTNERSHIP_TYPES} errors={errors} />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <TextField name="contactName" label="Your name" required autoComplete="name" errors={errors} />
                <TextField name="email" label="Email" type="email" required autoComplete="email" inputMode="email" errors={errors} />
              </div>
              <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" errors={errors} />
              <TextArea name="message" label="How would you like to partner?" required errors={errors} />
              <Honeypot />
              <FormFooter status={status} message={message} submitLabel="Send enquiry" />
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
