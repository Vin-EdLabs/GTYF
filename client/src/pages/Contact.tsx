import { contactSchema } from '@gtyf/shared/forms';
import { FormFooter, FormSuccess, Honeypot, TextArea, TextField, text, useFormSubmit } from '../components/forms';
import { Seo } from '../components/Seo';
import { Filled, hasContent } from '../components/ui/Filled';
import { Reveal } from '../components/ui/Reveal';
import { PageIntro } from '../components/ui/SectionHeading';
import { useSite } from '../lib/site';

export default function Contact() {
  const { pages, contact, organisation } = useSite();
  const p = pages.contact;
  const { status, errors, message, onSubmit, formRef } = useFormSubmit(contactSchema, '/forms/contact', (fd) => ({
    fullName: fd.get('fullName'),
    email: fd.get('email'),
    phone: text(fd, 'phone'),
    subject: text(fd, 'subject'),
    message: fd.get('message'),
  }));

  const whatsapp = hasContent(contact.whatsapp) ? contact.whatsapp.replace(/\D/g, '') : null;

  return (
    <>
      <Seo title={p.eyebrow} description={p.intro} />
      <PageIntro eyebrow={p.eyebrow} heading={p.heading} underlineWord={p.underlineWord} intro={p.intro} />
      <section className="container-page grid gap-14 pb-16 md:pb-32 lg:grid-cols-12">
        <Reveal as="div" className="lg:col-span-4">
          <dl className="space-y-8">
            <Detail label="Email">
              <Filled value={contact.email}>{(v) => <a href={`mailto:${v}`} className="hover:text-slate">{v}</a>}</Filled>
            </Detail>
            <Detail label="Phone">
              <Filled value={contact.phone}>{(v) => <a href={`tel:${v.replace(/\s+/g, '')}`} className="hover:text-slate">{v}</a>}</Filled>
            </Detail>
            {whatsapp && (
              <Detail label="WhatsApp">
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-slate">
                  Message us on WhatsApp
                </a>
              </Detail>
            )}
            <Detail label="Address">
              <Filled value={contact.address}>{(v) => <address className="not-italic">{v}</address>}</Filled>
            </Detail>
            <Detail label="Where we work">{organisation.location}</Detail>
          </dl>
        </Reveal>

        <Reveal as="div" delay={0.1} className="lg:col-span-7 lg:col-start-6">
          <h2 className="text-title">{p.formHeading}</h2>
          <div className="mt-8">
            {status === 'done' ? (
              <FormSuccess>{p.success}</FormSuccess>
            ) : (
              <form ref={formRef} onSubmit={onSubmit} noValidate className="relative space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField name="fullName" label="Your name" required autoComplete="name" errors={errors} />
                  <TextField name="email" label="Email" type="email" required autoComplete="email" inputMode="email" errors={errors} />
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" errors={errors} />
                  <TextField name="subject" label="Subject" errors={errors} />
                </div>
                <TextArea name="message" label="Message" required errors={errors} />
                <Honeypot />
                <FormFooter status={status} message={message} submitLabel="Send message" />
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label text-slate">{label}</dt>
      <dd className="mt-2 font-display text-xl font-semibold">{children}</dd>
    </div>
  );
}
