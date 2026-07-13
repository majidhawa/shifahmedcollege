import paramedicine from "@/assets/pdfs/fee-emt-paramedicine.pdf.asset.json";
import german from "@/assets/pdfs/fee-german.pdf.asset.json";
import dialysis from "@/assets/pdfs/fee-dialysis.pdf.asset.json";
import emt from "@/assets/pdfs/fee-emt-paramedicine.pdf.asset.json";
import caregiver from "@/assets/pdfs/fee-caregiver.pdf.asset.json";
import phlebotomy from "@/assets/pdfs/fee-phlebotomy.pdf.asset.json";
import medAssessment from "@/assets/pdfs/medical-assessment-form.pdf.asset.json";
import appLetter from "@/assets/pdfs/application-letter.pdf.asset.json";
export interface Course {
  slug: string;
  name: string;
  duration: string;
  level: string;
  description: string;
  highlights: string[];
  feePdfUrl: string;
}
export const courseCatalog: Course[] = [
  {
    slug: "paramedicine",
    name: "Diploma in Paramedicine",
    duration: "3 Years",
    level: "Diploma",
    description: "Comprehensive pre-hospital and emergency care training preparing graduates for paramedic practice.",
    highlights: ["Advanced life support", "Trauma management", "Clinical placements", "Ambulance operations"],
    feePdfUrl: paramedicine.url,
  },
  {
    slug: "german",
    name: "Certificate in German Language",
    duration: "6–12 Months",
    level: "Certificate",
    description: "A1 to B2 German preparation for healthcare workers heading to Germany and Austria.",
    highlights: ["Goethe exam prep", "Medical German", "Cultural orientation", "Job placement support"],
    feePdfUrl: german.url,
  },
  {
    slug: "dialysis",
    name: "Dialysis Technology",
    duration: "1 Year",
    level: "Certificate",
    description: "Train as a dialysis technologist skilled in operating and maintaining renal replacement equipment.",
    highlights: ["Renal anatomy", "Machine operation", "Infection control", "Renal unit attachment"],
    feePdfUrl: dialysis.url,
  },
  {
    slug: "emt",
    name: "Emergency Medical Technician (EMT)",
    duration: "1 Year",
    level: "Certificate",
    description: "Front-line emergency response training — from scene assessment to patient transfer.",
    highlights: ["BLS & CPR", "Trauma care", "Ambulance simulation", "Field attachment"],
    feePdfUrl: emt.url,
  },
  {
    slug: "caregiver",
    name: "Caregiving",
    duration: "6 Months",
    level: "Certificate",
    description: "Skilled home and facility caregiving for the elderly, children and patients with special needs.",
    highlights: ["Patient hygiene", "Nutrition & feeding", "Basic first aid", "Ethics of care"],
    feePdfUrl: caregiver.url,
  },
  {
    slug: "phlebotomy",
    name: "Safe Phlebotomy",
    duration: "3 Months",
    level: "Certificate",
    description: "Master safe, WHO-aligned venous blood collection procedures.",
    highlights: ["Venipuncture technique", "Sample handling", "Infection prevention", "Documentation"],
    feePdfUrl: phlebotomy.url,
  },
];
export interface DownloadItem {
  title: string;
  description: string;
  url: string;
  size?: string;
  category: "Fee Structure" | "Form" | "Application";
}
export const downloads: DownloadItem[] = [
  ...courseCatalog.map<DownloadItem>((c) => ({
    title: `${c.name} — Fee Structure`,
    description: `Indicative fees and payment plan for the ${c.name} program.`,
    url: c.feePdfUrl,
    category: "Fee Structure",
  })),
  {
    title: "Medical Assessment Form",
    description: "To be completed by a registered medical practitioner and submitted with your application.",
    url: medAssessment.url,
    category: "Form",
  },
  {
    title: "Application Letter Template",
    description: "Ready-to-fill admission application letter addressed to the Registrar.",
    url: appLetter.url,
    category: "Application",
  },
];
