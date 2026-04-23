export type Course = {
  slug: 'caregiving' | 'phlebotomy' | 'dialysis';
  title: string;
  cardTitle: string;
  duration: string;
  fee: string;
  entry: string;
  heroImage: string;
  summary: string;
  overview: string[];
  highlights: string[];
  accreditation?: string[];
  careerPaths?: string[];
  targetAudience?: string[];
  entryRequirements?: string[];
  technicalRequirements?: string;
};

export const site = {
  name: 'Shifah Medical Training College',
  shortName: 'Shifah Medical College',
  tagline: 'Gateway to Prosperity',
  intake: 'May 2026 Intake Ongoing',
  location: 'Ambwere Plaza, 2nd Floor, Kitale Town',
  phone: '+254 720 267045',
  whatsapp: '+254 755 147452',
  email: 'admissionssmtc@gmail.com',
  heroSlides: [
    {
      image: '/images/hero1.jpeg',
      title: 'Train for a meaningful career in healthcare.',
      text: 'Modern, clean, and practical medical training designed to prepare students for real-world service and professional growth.'
    },
    {
      image: '/images/hero4.jpeg',
      title: 'Hands-on learning that builds confidence.',
      text: 'From safe phlebotomy to clinical support skills, our programs focus on practical competence and professional readiness.'
    },
    {
      image: '/images/hero3.jpeg',
      title: 'A trusted institution for skill, discipline, and impact.',
      text: 'Explore healthcare-focused training supported by strong values, industry alignment, and a clear admissions pathway.'
    }
  ],
  marqueeItems: [
    'May 2026 intake ongoing',
    'Applications now open',
    'Caregiving, Safe Phlebotomy & Dialysis Technology available',
    'Practical training with a strong professional focus'
  ],
  vision: 'To be a centre of quality training and professional excellence in healthcare education.',
  mission: 'To strive to equip students with the knowledge, practical skills, and ethical values needed to excel in their professional roles.',
  motto: 'Gateway to Prosperity',
  about:
    'Shifah Medical Training College is positioned as a career-focused medical training institution in Kitale, committed to equipping learners with practical healthcare skills, ethical values, and a strong foundation for professional growth.',
  values: [
    { title: 'Excellence', text: 'We pursue the highest standards in education, training, and healthcare service.' },
    { title: 'Integrity', text: 'We uphold honesty, transparency, and ethical conduct in all interactions.' },
    { title: 'Evidence-Based Practice', text: 'We value informed training and care guided by best evidence, expertise, and human dignity.' },
    { title: 'Compassion', text: 'We foster empathy, sensitivity, and respect for every individual.' },
    { title: 'Collaboration', text: 'We promote teamwork and interdisciplinary communication for better outcomes.' },
    { title: 'Innovation', text: 'We embrace creativity, adaptability, and continuous improvement in learning and service.' }
  ],
  departments: [
    'Nursing Sciences',
    'Emergency Medical Sciences',
    'Orthopaedic & Physiotherapy',
    'Theatre Sciences',
    'Public Health Sciences',
    'Mortuary Sciences',
    'Medical Education',
    'Laboratory Sciences'
  ],
  partners: [
    { name: 'NITA', image: '/images/NITA.jpeg' },
    { name: 'TVET / CDACC', image: '/images/TVET CDACC.jpeg' },
    { name: 'Skyrock', image: '/images/Skyrock.png' },
    { name: 'CareCall', image: '/images/CareCall.jpeg' },
    { name: 'Equity Afya', image: '/images/Equity Afya.jpeg' },
    { name: 'Kansas Department', image: '/images/Kansas Department.jpeg' },
    { name: 'Signet Institute', image: '/images/Signet Institute.jpeg' },
    { name: 'Stable Health Foundation', image: '/images/Stable Health Foundation.jpeg' },
    { name: 'Harpers Management', image: '/images/Harpers Management.jpeg' },
    { name: 'TVETA', image: '/images/TVETA.jpeg' },
  ],
  admissionsSteps: [
    'Choose your preferred course.',
    'Complete the online application form.',
    'Submit your academic details and contact information.',
    'Wait for admissions review and guidance from the college.',
    'Receive the next steps on reporting, fees, and orientation.'
  ],
  requirements: [
    'KCSE mean grade of D- and above.',
    'Healthcare providers may also qualify for selected programmes.',
    'Applicants should provide accurate contact and academic details during application.'
  ],
  feeNotes: [
    'Confirmed flyer fees captured below for the available highlighted programmes.',
    'Some additional charges such as exams, insurance, uniforms, or ID may apply and should be confirmed with the college administration.'
  ]
};

export const courses: Course[] = [
  {
    slug: 'caregiving',
    title: 'CNA & Caregiving',
    cardTitle: 'Caregiving',
    duration: '6 Months',
    fee: 'KSh 65,000',
    entry: 'KCSE D- and above',
    heroImage: '/images/hero9.jpeg',
    summary: 'Gain hands-on skills in patient care, hygiene, mobility and elderly support. Start your healthcare career at Shifah Medical Training College today.',
    overview: [
      'Our CNA & Caregiving programme is designed for learners who want to build practical caregiving skills for patient support and daily care.',
      'It emphasizes responsibility, empathy, professional conduct, and readiness for care-focused environments including home care, residential facilities, and community support roles.'
    ],
    highlights: [
      'Patient support and personal care fundamentals',
      'Hygiene, mobility assistance and elderly care',
      'Professional communication and ethics',
      'Practical preparation for caregiving environments'
    ],
    accreditation: ['NITA accredited certificate recognized locally and internationally'],
    careerPaths: ['Home care', 'Residential facilities', 'Community support'],
    entryRequirements: ['KCSE mean grade of D- and above']
  },
  {
    slug: 'phlebotomy',
    title: 'Safe Phlebotomy',
    cardTitle: 'Safe Phlebotomy',
    duration: '2 Months',
    fee: 'KSh 30,000',
    entry: 'KCSE D- and above',
    heroImage: '/images/hero10.jpeg',
    summary: 'Foundational knowledge and hands-on skills in phlebotomy, preparing healthcare workers to perform safe, ethical, and accurate blood specimen collection.',
    overview: [
      'This short course provides foundational knowledge and hands-on skills in phlebotomy, preparing healthcare workers to perform safe, ethical, and accurate blood specimen collection.',
      'The course follows a blended approach, combining online theory with supervised practical experience.'
    ],
    highlights: [
      'Safe specimen collection practices',
      'Ethical and accurate blood collection procedures',
      'Professional patient interaction',
      'Clinical hygiene and procedural confidence'
    ],
    targetAudience: [
      'Nursing students and professionals',
      'Laboratory technicians and assistants',
      'Clinical officers and medical students',
      'Healthcare workers needing phlebotomy skills',
      'Public health professionals'
    ],
    entryRequirements: [
      'KCSE Certificate (Grade D or D- for current healthcare students)',
      'Healthcare background or current practice in a medical field preferred'
    ],
    technicalRequirements: 'Basic computer skills for online learning components'
  },
  {
    slug: 'dialysis',
    title: 'Certificate in Dialysis Technology',
    cardTitle: 'Dialysis Technology',
    duration: '3 Months',
    fee: 'Contact admissions for final fee guidance',
    entry: 'KCSE D- and above / Healthcare providers',
    heroImage: '/images/hero11.jpeg',
    summary: 'A technical programme introducing students to dialysis processes, machine handling, patient monitoring, and clinical response in renal care settings.',
    overview: [
      'Dialysis is the process of removing excess water, solutes and toxins from the blood through an artificial manner using medical equipment or machinery. It is generally applied to those suffering from kidney ailments or whose kidneys have stopped natural functioning.',
      'A dialysis technician assembles the machine, ensures it is in working order and sterile, checks the patient chart, administers local anaesthesia, and inserts the needle to start dialysis according to prescription.',
      "During dialysis, the technician monitors anticoagulant and fluid rates, adjusts them as needed, ensures the patient is in the proper position, and responds to any alarms or emergencies. After dialysis, the technician disconnects and cleans the machine and records the patient's vital signs."
    ],
    highlights: [
      'Machine assembly, preparation and sterilization',
      'Patient monitoring during dialysis sessions',
      'Anticoagulant and fluid rate management',
      'Response to alarms, procedures, and clinical routines',
      'Post-dialysis documentation and patient care'
    ],
    entryRequirements: [
      'KCSE mean grade of D- and above',
      'Healthcare providers are also eligible'
    ]
  }
];
