import { Container } from './Container';

export function PageHero({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <section className="bg-brand-radial py-16 md:py-20">
      <Container>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-green">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-brand-dark md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">{text}</p>
      </Container>
    </section>
  );
}
