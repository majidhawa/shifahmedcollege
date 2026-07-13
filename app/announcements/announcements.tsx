import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/SiteLayout";
import { Megaphone, Calendar, Pin } from "lucide-react";
export const Route = createFileRoute("/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Shifah Medical Training College" },
      { name: "description", content: "Latest news, intakes and updates from Shifah Medical Training College." },
      { property: "og:title", content: "Announcements" },
      { property: "og:description", content: "Latest news and intake updates." },
    ],
  }),
  component: AnnouncementsPage,
});
const announcements = [
  {
    date: "2026-09-01",
    title: "September Intake — Applications Open",
    body: "Applications are now open for all diploma and certificate programs. Early applicants receive priority interview slots and a 5% registration discount.",
    pinned: true,
    tag: "Intake",
  },
  {
    date: "2026-08-20",
    title: "German Language Cohort B2 — Starts Sept 15",
    body: "The next B2 preparation cohort begins on September 15. Placement tests will run on September 12 at the campus.",
    tag: "Program",
  },
  {
    date: "2026-08-05",
    title: "Clinical Placements Confirmed with 5 Regional Hospitals",
    body: "Shifah has confirmed new clinical placement partnerships with five hospitals across the North Rift, expanding capacity for paramedicine and EMT students.",
    tag: "Partnerships",
  },
  {
    date: "2026-07-15",
    title: "Free CPR Community Day — Saturday",
    body: "Join our EMT students and tutors for a free community CPR & first aid demonstration this Saturday from 9am at Ambwere Plaza.",
    tag: "Community",
  },
  {
    date: "2026-06-30",
    title: "Graduation Ceremony — Class of 2026",
    body: "Congratulations to our Class of 2026! Photos and highlights are available on the Videos page.",
    tag: "Events",
  },
];
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
}
function AnnouncementsPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="News & Updates" title="Announcements" subtitle="Intakes, events and college updates — refreshed regularly." />
      <section className="container-page py-16">
        <div className="grid gap-5 max-w-3xl mx-auto">
          {announcements.map((a) => (
            <article key={a.title} className="relative rounded-3xl border border-border bg-card p-6 md:p-8 hover:border-brand/40 hover:shadow-card transition">
              {a.pinned && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-brand text-brand-foreground text-[11px] font-semibold px-3 py-1">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(a.date)}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand px-2 py-0.5 font-semibold"><Megaphone className="h-3 w-3" /> {a.tag}</span>
              </div>
              <h2 className="font-display text-2xl mt-3 text-slate-ink">{a.title}</h2>
              <p className="mt-2 text-muted-foreground">{a.body}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
src/routes/__root.tsx
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Lovable Generated Project" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Lovable Generated Project" },
      { title: "Shifah Medical Training College — Kitale, Kenya" },
      { name: "description", content: "Accredited medical training college in Kitale, Kenya. Paramedicine, Dialysis, EMT, Caregiving, Phlebotomy and German language programs." },
      { property: "og:title", content: "Shifah Medical Training College" },
      { property: "og:description", content: "Gateway to Prosperity — hands-on healthcare training in Kitale, Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),