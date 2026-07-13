import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SiteLayout } from "@/components/SiteLayout";
import { Download, FileText } from "lucide-react";
// Fallback local downloads list. Replace with proper import when '@/lib/courses' is available.
const downloads: { title: string; url: string; description?: string; category: string }[] = [];
export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Shifah Medical Training College" },
      { name: "description", content: "Download fee structures for all courses, the medical assessment form and the application letter template as PDFs." },
      { property: "og:title", content: "Downloads — Fee Structures & Forms" },
      { property: "og:description", content: "Grab the PDFs you need to apply." },
    ],
  }),
  component: DownloadsPage,
});
function DownloadsPage() {
  const groups = ["Fee Structure", "Form", "Application"] as const;
  return (
    <SiteLayout>
      <PageHero eyebrow="Downloads" title="Fee structures & admission forms" subtitle="All documents are provided as PDF. Click any file to download." />
      <section className="container-page py-16 space-y-12">
        {groups.map((g) => {
          const items = downloads.filter((d) => d.category === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <h2 className="font-display text-2xl mb-6 flex items-center gap-3">
                <span className="h-8 w-1.5 rounded-full bg-gradient-brand" />
                {g === "Fee Structure" ? "Course Fee Structures" : g === "Form" ? "Forms" : "Application Documents"}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {items.map((d) => (
                  <a key={d.title} href={d.url} download
                    className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-brand hover:shadow-card transition">
                    <div className="h-12 w-12 rounded-xl bg-brand-soft grid place-items-center text-brand shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-ink group-hover:text-brand truncate">{d.title}</div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-brand text-brand-foreground grid place-items-center shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </SiteLayout>
  );
}
