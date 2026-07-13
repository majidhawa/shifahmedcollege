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
    date: "1 September 2026",
    category: "Intake",
    title: "September Intake — Applications Open",
    content:
      "Applications are now open for all diploma and certificate programs. Early applicants receive priority interview slots and a 5% registration discount.",
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
    category: "Partnerships",
    title: "Clinical Placements Confirmed with 5 Regional Hospitals",
    content:
      "Shifah has confirmed new clinical placement partnerships with five hospitals across the North Rift, expanding capacity for paramedicine and EMT students.",
  },
  {
    id: 4,
    pinned: false,
    date: "15 July 2026",
    category: "Community",
    title: "Free CPR Community Day — Saturday",
    content:
      "Join our EMT students and tutors for a free community CPR & First Aid demonstration this Saturday from 9am at Ambwere Plaza.",
  },
  {
    id: 5,
    pinned: false,
    date: "30 June 2026",
    category: "Events",
    title: "Graduation Ceremony — Class of 2026",
    content:
      "Congratulations to our Class of 2026! Photos and highlights are available on the Videos page.",
  },
];