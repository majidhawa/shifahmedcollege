interface PageHeroProps {
  badge?: string;
  title: string;
  description: string;
}

export default function PageHero({
  badge,
  title,
  description,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-brand-green via-brand-green to-brand-dark text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-brand-radial opacity-60" />

      <div className="relative container-shell py-24">

        {badge && (
          <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-widest text-brand-gold backdrop-blur">
            {badge}
          </span>
        )}

        <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
          {title}
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-white/80">
          {description}
        </p>

      </div>
    </section>
  );
}