import type { Metadata } from "next";
import Downloads from "@/components/Downloads";

export const metadata: Metadata = {
  title: "Downloads | Shifah Medical Training College",
  description:
    "Download fee structures, admission forms, application documents and other official publications from Shifah Medical Training College.",
};

export default function DownloadsPage() {
  return (
    <main className="min-h-screen bg-brand-cream">
      <Downloads />
    </main>
  );
}