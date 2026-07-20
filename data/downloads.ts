export interface DownloadItem {
  id: number;
  title: string;
  description: string;
  category: "Fee Structure" | "Forms" | "Admission";
  file: string;
  size: string;
  updated: string;
}

export const downloads: DownloadItem[] = [
  {
    id: 1,
    title: "Diploma in Paramedicine — Fee Structure",
    description:
      "Indicative fees and payment plan for the Diploma in Paramedicine program.",
    category: "Fee Structure",
    file: "/downloads/fee-emt.pdf",
    size: "196 KB",
    updated: "July 2026",
  },
  {
    id: 2,
    title: "Certificate in German Language — Fee Structure",
    description:
      "Indicative fees and payment plan for the Certificate in German Language program.",
    category: "Fee Structure",
    file: "/downloads/fee-german-language.pdf",
    size: "208 KB",
    updated: "July 2026",
  },
  {
    id: 3,
    title: "Dialysis Technology — Fee Structure",
    description:
      "Indicative fees and payment plan for the Dialysis Technology program.",
    category: "Fee Structure",
    file: "/downloads/dialysis-fees.pdf",
    size: "162 KB",
    updated: "July 2026",
  },
  {
    id: 4,
    title: "Emergency Medical Technician (EMT) — Fee Structure",
    description:
      "Indicative fees and payment plan for the Emergency Medical Technician (EMT) program.",
    category: "Fee Structure",
    file: "/downloads/fee-emt.pdf",
    size: "196 KB",
    updated: "July 2026",
  },
  {
    id: 5,
    title: "Caregiving — Fee Structure",
    description:
      "Indicative fees and payment plan for the Caregiving program.",
    category: "Fee Structure",
    file: "/downloads/caregiving-fees.pdf",
    size: "195 KB",
    updated: "July 2026",
  },
  {
    id: 6,
    title: "Safe Phlebotomy — Fee Structure",
    description:
      "Indicative fees and payment plan for the Safe Phlebotomy program.",
    category: "Fee Structure",
    file: "/downloads/phlebotomy-fees.pdf",
    size: "195 KB",
    updated: "July 2026",
  },
   {
    id: 7,
    title: "General — Fee Structure",
    description:
      "Indicative fees and payment plan for the General courses program.",
    category: "Fee Structure",
    file: "/downloads/Shifah_College_Fee_Structure.pdf",
    size: "208 KB",
    updated: "July 2026",
  },
  {
    id: 8,
    title: "Medical Assessment Form",
    description:
      "To be completed by a registered medical practitioner and submitted with your application.",
    category: "Forms",
    file: "/downloads/medical-assessment-form.pdf",
    size: "159 KB",
    updated: "July 2026",
  },
   {
    id: 9,
    title: "Consent Form",
    description:
      "To be completed by a registered medical practitioner and submitted with your application.",
    category: "Forms",
    file: "/downloads/consent-form.pdf",
    size: "222 KB",
    updated: "July 2026",
  },
  {
    id: 10,
    title: "Application Letter",
    description:
      "Ready-to-fill admission application letter addressed to the Registrar.",
    category: "Admission",
    file: "/downloads/application-letter.pdf",
    size: "140 KB",
    updated: "July 2026",
  },
];