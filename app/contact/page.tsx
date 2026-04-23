import Link from 'next/link';
import { ContactForm } from '@/components/ContactForm';
import { Container } from '@/components/Container';
import { site } from '@/data/site';

export default function ContactPage() {
  return (
    <main>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-brand-dark py-24 text-white">
        <img src="/images/girl2.jpeg" alt="Contact" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/80 to-transparent" />
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-green via-brand-gold to-transparent" />
        <Container className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Get In Touch</p>
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            We'd love to <span className="text-brand-gold">hear from you.</span>
          </h1>
          <div className="mt-4 h-1 w-16 rounded-full bg-brand-gold" />
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            Whether you have questions about admissions, programmes, or fees — our team is ready to help. Reach out through any of the channels below.
          </p>
        </Container>
      </section>

      {/* ── CONTACT CARDS + FORM ── */}
      <section className="py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

          {/* Left — contact info */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Contact Details</p>
            </div>

            {[
              {
                label: 'Phone',
                value: site.phone,
                href: `tel:${site.phone}`,
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>,
              },
              {
                label: 'WhatsApp',
                value: site.whatsapp,
                href: `https://wa.me/${site.whatsapp.replace(/\s+/g, '')}`,
                icon: <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>,
              },
              {
                label: 'Email',
                value: site.email,
                href: `mailto:${site.email}`,
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
              },
              {
                label: 'Location',
                value: site.location,
                href: 'https://maps.google.com/?q=Kitale,Kenya',
                icon: <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-lg hover:shadow-brand-green/10"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/8 text-brand-green transition-all duration-300 group-hover:bg-brand-green group-hover:text-white">
                  {item.icon}
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-brand-dark">{item.value}</p>
                </div>
                <svg className="ml-auto text-slate-300 transition-all duration-300 group-hover:text-brand-green group-hover:translate-x-1" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            ))}

            {/* Office hours */}
            <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand-gold">Office Hours</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between"><span>Monday – Friday</span><span className="font-semibold text-brand-dark">8:00am – 5:00pm</span></div>
                <div className="flex justify-between"><span>Saturday</span><span className="font-semibold text-brand-dark">9:00am – 1:00pm</span></div>
                <div className="flex justify-between"><span>Sunday</span><span className="font-semibold text-slate-400">Closed</span></div>
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <span className="h-px w-8 bg-brand-gold" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Send a Message</p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
              <ContactForm />
            </div>
          </div>
        </Container>
      </section>

      {/* ── MAP ── */}
      <section className="pb-24">
        <Container>
          <div className="flex items-center gap-2 mb-6">
            <span className="h-px w-8 bg-brand-gold" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Find Us</p>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-dark mb-8">
            Visit us in <span className="text-brand-green">Kitale, Kenya.</span>
          </h2>
          <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-xl">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63839.41!2d34.9833!3d1.0167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1781b0e0e0e0e0e1%3A0x1234567890abcdef!2sKitale%2C%20Kenya!5e0!3m2!1sen!2ske!4v1234567890"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Shifah Medical Training College — Kitale, Kenya"
            />
          </div>
        </Container>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 pt-0">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-green px-8 py-14 md:px-14 text-white">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(215,169,59,0.15)_0%,transparent_60%)]" />
            <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
            <div className="relative max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-gold">Ready to Apply?</p>
              <h2 className="mt-3 text-3xl font-extrabold leading-tight md:text-4xl">
                Don't wait — applications are open now.
              </h2>
              <p className="mt-4 text-base leading-8 text-white/75">
                Take the first step toward your healthcare career. Apply online or visit us in Kitale.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-green transition-all hover:bg-brand-cream hover:-translate-y-0.5">
                  Apply Now →
                </Link>
                <Link href="/courses" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10">
                  View Courses
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

    </main>
  );
}
