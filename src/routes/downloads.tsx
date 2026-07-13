import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { PageHero, SiteLayout } from "@/components/SiteLayout";

const downloads = [
  {
    title: "Certificate Caregiver Fee Structure",
    url: "/assets/fee-caregiver.pdf",
    description: "Fee structure for Certificate Caregiver program.",
    category: "Fee Structure",
  },
  {
    title: "Diploma in Clinical Medicine Fee Structure",
    url: "/downloads/clinical-medicine-fees.pdf",
    description: "Fee structure for Diploma in Clinical Medicine.",
    category: "Fee Structure",
  },
  {
    title: "Medical Assessment Form",
    url: "/downloads/medical-assessment-form.pdf",
    description: "Medical examination form for new students.",
    category: "Form",
  },
  {
    title: "Application Letter Template",
    url: "/downloads/application-letter-template.pdf",
    description: "Template for student application letter.",
    category: "Application",
  },
];

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      {
        title: "Downloads | Shifah Medical Training College",
      },
      {
        name: "description",
        content:
          "Download fee structures, admission forms and application documents.",
      },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const groups = ["Fee Structure", "Form", "Application"] as const;

  return (
    <SiteLayout>
      {/* HERO */}
      <PageHero
        eyebrow="Downloads"
        title="Download Forms & Fee Structures"
        subtitle="Access all admission documents, application forms and fee structures in PDF format."
      />

      {/* DOWNLOADS */}
      <section className="container-page py-20">
        <div className="grid gap-12">
          {groups.map((group) => {
            const items = downloads.filter(
              (item) => item.category === group
            );

            return (
              <div key={group}>
                <h2 className="mb-6 text-2xl font-bold">
                  {group === "Fee Structure"
                    ? "Course Fee Structures"
                    : group === "Form"
                    ? "Admission Forms"
                    : "Application Documents"}
                </h2>

                <div className="grid gap-5 md:grid-cols-2">
                  {items.map((item) => (
                    <a
                      key={item.title}
                      href={item.url}
                      download
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-6 transition hover:border-primary hover:shadow-lg"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                        <FileText className="h-7 w-7 text-primary" />
                      </div>

                      <div className="flex-1">
                        <h3 className="font-semibold group-hover:text-primary">
                          {item.title}
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Download className="h-5 w-5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="overflow-hidden rounded-3xl bg-brand px-10 py-14 text-white">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
              Need More Information?
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Ready to begin your medical career?
            </h2>

            <p className="mt-4 text-white/80">
              Download the required documents and complete your application
              today. Contact our admissions office if you need any assistance.
            </p>

            <div className="mt-8 flex gap-4">
              <a
                href="/apply"
                className="rounded-full bg-white px-8 py-3 font-semibold text-brand transition hover:opacity-90"
              >
                Apply Now
              </a>

              <a
                href="/contact"
                className="rounded-full border border-white/40 px-8 py-3 font-semibold hover:bg-white/10"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}