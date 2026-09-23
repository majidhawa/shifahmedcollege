'use client';

import Image from 'next/image';

type Episode = {
  number: number;
  title: string;
  description: string;
  image: string;
  status: 'LIVE' | 'COMING SOON';
  tiktokUrl?: string;
};

const episodes: Episode[] = [
  {
    number: 1,
    title: 'Could You Save a Heart?',
    description:
      'Someone collapses in front of you. They are not responding. What would you do?',
    image: '/images/episode-1.png',
    status: 'LIVE',
    tiktokUrl: 'https://vt.tiktok.com/ZSbJFeF6w/',
  },
  {
    number: 2,
    title: 'Heart attack vs Cardiac Arrest: What Do You Check First?',
    description:
      'In an emergency, knowing what to check first can help you respond appropriately.',
    image: '/images/episode-2.png',
    status: 'COMING SOON',
  },
  {
    number: 3,
    title: 'CPR: Would You Know What to Do?',
    description:
      'Learn the basic principles behind responding to a person who is unresponsive and not breathing normally.',
    image: '/images/world-heart-day/episode-3.png',
    status: 'COMING SOON',
  },
];

export default function HeartDayEpisodes() {
  return (
    <section className="border-t border-white/10 bg-black/10">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">
            Follow The Series
          </p>

          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            🎬 Heart Day Episodes
          </h2>

          <p className="mt-4 text-sm leading-7 text-white/50">
            Our World Heart Day journey continues through a series of
            short educational episodes. Watch, learn, share and follow
            along as we count down to World Heart Day.
          </p>
        </div>

        {/* EPISODES */}

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

          {episodes.map((episode) => (
            <article
              key={episode.number}
              className="
                overflow-hidden
                rounded-3xl
                border
                border-white/10
                bg-white/[0.04]
                transition
                duration-300
                hover:-translate-y-1
                hover:bg-white/[0.06]
              "
            >

              {/* ================================================= */}
              {/* IMAGE */}
              {/* ================================================= */}

              <div className="relative flex h-[460px] w-full items-center justify-center overflow-hidden bg-black/30 p-3 sm:h-[500px]">

                <Image
                  src={episode.image}
                  alt={`World Heart Day Episode ${episode.number}: ${episode.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-contain p-3 transition-transform duration-500 hover:scale-[1.02]"
                />

                {/* STATUS */}

                <div className="absolute left-5 top-5 z-10">
                  <span
                    className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] ${
                      episode.status === 'LIVE'
                        ? 'bg-brand-green text-white'
                        : 'bg-black/70 text-white/60 backdrop-blur-md'
                    }`}
                  >
                    {episode.status}
                  </span>
                </div>

                {/* EPISODE NUMBER */}

                <div className="absolute bottom-5 left-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold text-sm font-black text-brand-dark shadow-lg">
                  {episode.number}
                </div>

              </div>

              {/* ================================================= */}
              {/* CONTENT */}
              {/* ================================================= */}

              <div className="p-6">

                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">
                  Episode {episode.number}
                </p>

                <h3 className="mt-2 text-xl font-black">
                  {episode.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/50">
                  {episode.description}
                </p>

                {/* TIKTOK BUTTON */}

                {episode.status === 'LIVE' && episode.tiktokUrl ? (
                  <a
                    href={episode.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      mt-6
                      inline-flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-full
                      bg-white
                      px-5
                      py-3
                      text-sm
                      font-black
                      text-brand-dark
                      transition
                      hover:bg-brand-gold
                    "
                  >
                    Watch on TikTok
                    <span>↗</span>
                  </a>
                ) : (
                  <div
                    className="
                      mt-6
                      flex
                      w-full
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-white/10
                      bg-white/5
                      px-5
                      py-3
                      text-sm
                      font-bold
                      text-white/30
                    "
                  >
                    Coming Soon
                  </div>
                )}

              </div>

            </article>
          ))}

        </div>

        {/* ================================================= */}
        {/* TIKTOK CTA */}
        {/* ================================================= */}

        <div className="mt-10 rounded-3xl border border-brand-gold/20 bg-brand-gold/5 p-7 text-center">

          <p className="text-sm font-bold text-white/70">
            New episode coming soon?
          </p>

          <h3 className="mt-2 text-2xl font-black">
            Follow SMTC and don't miss the next one.
          </h3>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/40">
            Follow our TikTok page for short healthcare lessons,
            emergency-response tips and World Heart Day episodes.
          </p>

          <a
            href="https://www.tiktok.com/@shifah.medical.tr?_r=1&_t=ZS-99y5dKhqst7"
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-6
              inline-flex
              items-center
              justify-center
              rounded-full
              bg-brand-green
              px-7
              py-3.5
              text-sm
              font-black
              text-white
              transition
              hover:bg-brand-gold
              hover:text-brand-dark
            "
          >
            Follow SMTC on TikTok ↗
          </a>

        </div>

      </div>
    </section>
  );
}