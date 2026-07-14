export interface Announcement {
  id: number;
  date: string;
  category: string;
  title: string;
  content: string;
  pinned: boolean;
}

export const announcements: Announcement[] = [
  {
    id: 1,
    pinned: true,
    date: "7 July to September 2026",
    category: "Intake",
    title: "September Intake — Applications Open",
    content:
      "Applications are now open for all diploma and certificate programs. Early applicants receive priority interview slots.",
  },
  {
    id: 2,
    pinned: false,
    date: "20 August 2026",
    category: "Program",
    title: "German Language Cohort B2 — Starts Sept 15",
    content:
      "The next B2 preparation cohort begins on September 15. Placement tests will run on September 12 at the campus.",
  },
  {
    id: 3,
    pinned: false,
    date: "5 August 2026",
    category: "Clinical Training",
    title: "Clinical Attachment Begins",
    content:
      "Students scheduled for clinical attachment are advised to report to the Academic Office for placement letters and orientation before reporting to their assigned healthcare facilities.",
  },
  {
    id: 4,
    pinned: false,
    date: "1 August 2026",
    category: "Attachment",
    title: "Attachment Requirements",
    content:
      "Students must have the following requirements for clinical attachment: College introductory letter, attachment letter, attachment objectives, Memorandum of Understanding (MoU).",
  },
  {
    id: 5,
    pinned: false,
    date: "8 July 2026",
    category: "Courses",
    title: "Programme Duration & Tuition",
    content:
      "Students will undertake 3 Terms of classwork in EMT + 3 Months of clinical placements, for Diploma in paramedicine, the student will have classes for 5 Terms + 3 months clinicals with a tuition of 45,000 per term while for Safe Phlebotomy, the student will have classes for 2 months + 1 month practicals.",
  },
];