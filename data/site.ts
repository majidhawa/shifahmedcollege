export type Course = {
  slug:
    | 'mortuary-science-diploma'
    | 'mortuary-science-certificate'
    | 'caregiving'
    | 'phlebotomy'
    | 'emt'
    | 'paramedicine'
    | 'dialysis'
    | 'acls-bls'
    | 'german'
    | 'community-health-certificate'
    | 'community-health-diploma'
    | 'health-service-support';
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
  technicalRequirements?: string | string[];
};

export const site = {
  name: 'Shifah Medical Training College',
  shortName: 'Shifah Medical College',
  tagline: 'Health through innovation and research',
  intake: 'November 2026 Intake Ongoing',
  location: 'Ambwere Plaza, 2nd Floor, Kitale Town',
  phone: '+254 142 068933',
  whatsapp: '+254 794882948',
  email: 'admin@shifahmedicalcollege.co.ke',

  tvetaRegistration: 'TVETA/PRIVATE/TVC/0146/2026',

  heroSlides: [
    {
      image: '/images/emt1.jpg',
      title: 'Best Medical Training College in Kitale, Kenya.',
      text: 'Modern, clean, and practical medical training designed to prepare students for real-world service and professional growth.'
    },
    {
      image: '/images/emt2.jpg',
      title: 'Healthcare Training and Professional Development.',
      text: 'Explore Mortuary Science, Emergency Medical Technology, Caregiving, Phlebotomy, Dialysis and Community Health programmes.'
    },
    {
      image: '/images/emt3.jpg',
      title: 'November 2026 Intake Now Ongoing.',
      text: 'Apply today and begin your journey towards a rewarding career in healthcare, with German A1 language training included in selected programmes.'
    }
  ],

  marqueeItems: [
    'November 2026 intake ongoing',
    'Applications now open',
    '12 professional training programmes available',
    'German Language A1 training available',
    'Practical healthcare training and professional development'
  ],

  vision: 'To be a centre of quality training and professional excellence in healthcare education.',

  mission: 'To strive to equip students with the knowledge, practical skills, and ethical values needed to excel in their professional roles.',

  motto: 'Health through innovation and research',

  about:
    'Shifah Medical Training College is positioned as a career-focused medical training institution in Kitale, committed to equipping learners with practical healthcare skills, ethical values, and a strong foundation for professional growth.',

  values: [
    {
      title: 'Excellence',
      text: 'We pursue the highest standards in education, training, and healthcare service.'
    },
    {
      title: 'Integrity',
      text: 'We uphold honesty, transparency, and ethical conduct in all interactions.'
    },
    {
      title: 'Evidence-Based Practice',
      text: 'We value informed training and care guided by best evidence, expertise, and human dignity.'
    },
    {
      title: 'Compassion',
      text: 'We foster empathy, sensitivity, and respect for every individual.'
    },
    {
      title: 'Collaboration',
      text: 'We promote teamwork and interdisciplinary communication for better outcomes.'
    },
    {
      title: 'Innovation',
      text: 'We embrace creativity, adaptability, and continuous improvement in learning and service.'
    }
  ],

  departments: [
  'Department of Emergency Medicine',
  'Department of Nursing Support Services',
  'Department of Laboratory',
  'Department of Pathology',
  'Department of Linguistics',
  'Department of Community Health',
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
    { name: 'TVETA', image: '/images/TVETA.jpeg' }
  ],

  admissionsSteps: [
    'Choose your preferred course.',
    'Complete the online application form.',
    'Download the application form, consent form, and medical assessment form from the downloads section of the website.',
    'Fill out and submit the forms via the official email admin@shifahmedicalcollege.co.ke.',
    'For the medical assessment form, ensure you take the required tests at Shifah Hospital or another accredited hospital facility.',
    'Pay the application fee of KSh 1,500 through the official payment channels.',
    'Wait for admissions review and guidance from the college.',
    'Receive the next steps on reporting, fees, and classes.'
  ],

  requirements: [
    'Entry requirements vary depending on the selected programme.',
    'Applicants should meet the specific KCSE grade and subject requirements for their chosen course.',
    'Applicants with relevant healthcare qualifications may qualify for selected programmes.',
    'Applicants should provide accurate contact and academic details during application.'
  ],

  feeNotes: [
    'Contact the admissions office for the latest programme fees.',
    'Course fees should be confirmed directly with the college administration.',
    'Additional charges such as examinations, insurance, uniforms, or identification may apply and should be confirmed with the college.'
  ]
};

export const courses: Course[] = [

  // 1. DIPLOMA IN MORTUARY SCIENCE LEVEL 6

  {
    slug: 'mortuary-science-diploma',
    title: 'Diploma in Mortuary Science Level 6 (Technologist)',
    cardTitle: 'Diploma in Mortuary Science',
    duration: '2 Years',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE C- (Minus) or relevant Level 5 certificate',
    heroImage: '/images/mortuary.png',
    summary:
      'Develop professional knowledge and practical skills in mortuary science, body preservation, post-mortem support and mortuary operations.',
    overview: [
      'The Diploma in Mortuary Science Level 6 prepares learners for professional responsibilities in mortuary and pathology-related environments.',
      'The programme introduces learners to the scientific, technical, ethical and practical aspects of mortuary operations and the handling of deceased persons with dignity and respect.',
      'German Language A1 training is included as an additional component.'
    ],
    highlights: [
      'Mortuary science and professional practice',
      'Specimen and body handling procedures',
      'Mortuary hygiene and infection prevention',
      'Post-mortem support procedures',
      'Professional ethics and dignity',
      'German Language A1 included'
    ],
    targetAudience: [
      'KCSE graduates interested in mortuary science',
      'Individuals interested in pathology-related careers',
      'Learners seeking professional mortuary training'
    ],
    entryRequirements: [
      'KCSE C- (Minus) and above, or',
      'Relevant Level 5 certificate'
    ],
    careerPaths: [
      'Mortuary technologist',
      'Mortuary services',
      'Pathology support services'
    ]
  },

  // 2. CERTIFICATE IN MORTUARY SCIENCE LEVEL 5

  {
    slug: 'mortuary-science-certificate',
    title: 'Certificate in Mortuary Science Level 5 (Technician)',
    cardTitle: 'Certificate in Mortuary Science',
    duration: '1 Year',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE D (Plain) and above',
    heroImage: '/images/mortuary.png',
    summary:
      'Acquire foundational technical knowledge and practical skills for working in mortuary environments and supporting mortuary operations.',
    overview: [
      'The Certificate in Mortuary Science Level 5 equips learners with foundational knowledge and practical competencies in mortuary operations.',
      'The programme focuses on professional conduct, hygiene, safe handling procedures and the importance of maintaining dignity when working with deceased persons.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Introduction to mortuary science',
      'Mortuary hygiene and safety',
      'Professional body handling',
      'Basic mortuary operations',
      'Ethical conduct and professional responsibility',
        'German Language A1 included'
    ],
    entryRequirements: [
      'KCSE D (Plain) and above'
    ],
    targetAudience: [
      'KCSE graduates interested in mortuary services',
      'Individuals seeking entry-level mortuary training'
    ],
    careerPaths: [
      'Mortuary technician',
      'Mortuary support services'
    ]
  },

  // 3. CERTIFICATE IN CAREGIVING LEVEL 4

  {
    slug: 'caregiving',
    title: 'Certificate in Caregiving Level 4',
    cardTitle: 'Caregiving Level 4',
    duration: '6 Months',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE D- (Minus) and above',
    heroImage: '/images/caregiving.png',
    summary:
      'Gain practical skills in patient care, hygiene, mobility assistance, elderly care and compassionate support.',
    overview: [
      'The Certificate in Caregiving Level 4 is designed for learners who want to develop practical caregiving skills for patient support and daily care.',
      'It emphasizes responsibility, empathy, professional conduct and readiness for care-focused environments, including home care, residential facilities and community support roles.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Patient support and personal care fundamentals',
      'Hygiene and infection prevention',
      'Mobility assistance and elderly care',
      'Professional communication and ethics',
      'Practical preparation for caregiving environments',
      'German Language A1'
    ],
    careerPaths: [
      'Home care services',
      'Residential care facilities',
      'Community support services',
      'Caregiving services'
    ],
    targetAudience: [
      'KCSE graduates interested in caregiving',
      'Aspiring caregivers',
      'Individuals interested in elderly and patient support'
    ],
    entryRequirements: [
      'KCSE D- (Minus) and above'
    ]
  },

  // 4. PHLEBOTOMY

  {
    slug: 'phlebotomy',
    title: 'Phlebotomy',
    cardTitle: 'Phlebotomy',
    duration: '3 Months',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE D- (Minus) and above',
    heroImage: '/images/phlebotomy.png',
    summary:
      'Develop foundational knowledge and practical skills in safe blood collection, specimen handling and professional patient interaction.',
    overview: [
      'The Phlebotomy programme provides foundational knowledge and practical skills in blood specimen collection.',
      'Learners are introduced to safe specimen collection procedures, patient preparation, infection prevention, ethical practices and accurate specimen handling.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Safe blood specimen collection',
      'Patient preparation and identification',
      'Specimen handling and transportation',
      'Infection prevention and control',
      'Professional patient interaction',
      'German Language A1'
    ],
    targetAudience: [
      'Healthcare students',
      'Laboratory assistants',
      'Healthcare workers',
      'Individuals interested in specimen collection'
    ],
    entryRequirements: [
      'KCSE D- (Minus) and above'
    ],
    technicalRequirements: [
      'Basic computer skills for online learning components',
      'Access to learning materials'
    ],
    careerPaths: [
      'Phlebotomy services',
      'Laboratory support',
      'Healthcare support services'
    ]
  },

  // 5. CERTIFICATE IN EMT

  {
    slug: 'emt',
    title: 'Certificate in Emergency Medical Technology (EMT)',
    cardTitle: 'Certificate in EMT',
    duration: '1 Year',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE C- (Minus) and above',
    heroImage: '/images/emt.png',
    summary:
      'Acquire essential emergency medical knowledge and practical skills for responding to medical emergencies and providing immediate patient care.',
    overview: [
      'The Certificate in Emergency Medical Technology equips learners with essential knowledge and practical competencies for emergency medical response.',
      'Students are introduced to patient assessment, first aid, basic life support, trauma management and safe patient transportation.',
      'The programme prepares learners for emergency response environments through theoretical instruction and practical training.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Basic Life Support (BLS)',
      'Cardiopulmonary Resuscitation (CPR)',
      'Patient assessment and emergency care',
      'Trauma and first aid management',
      'Airway management',
      'Ambulance operations and patient transport',
      'Disaster preparedness',
      'Infection prevention and patient safety',
      'German Language A1'
    ],
    targetAudience: [
      'KCSE graduates interested in emergency medicine',
      'Aspiring emergency medical technicians',
      'Community first responders',
      'Individuals interested in ambulance services',
      'Humanitarian and rescue personnel'
    ],
    entryRequirements: [
      'KCSE C- (Minus) and above'
    ],
    careerPaths: [
      'Emergency medical services',
      'Ambulance support services',
      'Emergency response services',
      'First responder services'
    ]
  },

  // 6. DIPLOMA IN EMT / PARAMEDICINE LEVEL 6

  {
    slug: 'paramedicine',
    title: 'Diploma in EMT / Paramedicine Level 6',
    cardTitle: 'Diploma in EMT / Paramedicine',
    duration: '2 Years',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE C (Plain) with specified subject grades and a recognised EMT certificate',
    heroImage: '/images/paramedicine.png',
    summary:
      'Prepare for advanced pre-hospital emergency medical care through clinical knowledge, patient assessment, emergency treatment and practical field experience.',
    overview: [
      'The Diploma in EMT / Paramedicine Level 6 prepares learners to deliver advanced pre-hospital emergency medical care.',
      'Learners acquire the clinical knowledge, technical skills and professional competence needed to assess, manage and safely transport critically ill or injured patients.',
      'The programme integrates classroom instruction with practical training, clinical exposure and emergency medical response activities.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Advanced patient assessment',
      'Emergency pharmacology',
      'Trauma and critical care',
      'Advanced Cardiac Life Support',
      'Medical and surgical emergencies',
      'Airway and respiratory management',
      'Obstetric and paediatric emergencies',
      'Disaster management',
      'Clinical practice and ambulance operations',
      'German Language A1'
    ],
    targetAudience: [
      'EMT certificate holders',
      'Healthcare professionals seeking career advancement',
      'Individuals interested in emergency medicine',
      'Individuals pursuing careers in ambulance and rescue services'
    ],
    entryRequirements: [
      'KCSE C (Plain)',
      'C in Biology',
      'C in English or Kiswahili',
      'One of the following: Chemistry, Physics or Mathematics',
      'Recognised EMT certificate'
    ],
    careerPaths: [
      'Paramedic services',
      'Emergency medical services',
      'Ambulance services',
      'Emergency response and rescue services'
    ]
  },

  // 7. DIALYSIS TECHNOLOGY

  {
    slug: 'dialysis',
    title: 'Dialysis Technology',
    cardTitle: 'Dialysis Technology',
    duration: '6 Months',
    fee: 'Contact admissions for fee guidance',
    entry: 'Certificate in a related healthcare field',
    heroImage: '/images/dialysis.png',
    summary:
      'Develop technical knowledge and practical skills in dialysis processes, equipment handling, patient monitoring and renal care support.',
    overview: [
      'The Dialysis Technology programme introduces learners to dialysis processes and the use of medical equipment in renal care.',
      'Students explore dialysis machine preparation, patient monitoring, infection prevention, documentation and the importance of safe clinical practices.',
      'The programme is intended for learners with relevant healthcare qualifications.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Introduction to renal care and dialysis',
      'Dialysis machine preparation',
      'Equipment handling and maintenance principles',
      'Patient monitoring',
      'Infection prevention and control',
      'Clinical documentation',
      'German Language A1'
    ],
    entryRequirements: [
      'Certificate in a related healthcare field'
    ],
    targetAudience: [
      'Healthcare certificate holders',
      'Healthcare professionals',
      'Individuals with related healthcare qualifications'
    ],
    careerPaths: [
      'Dialysis support services',
      'Renal care support',
      'Healthcare facilities'
    ]
  },

  // 8. ACLS AND BLS

  {
    slug: 'acls-bls',
    title: 'Advanced Cardiovascular Life Support (ACLS) and Basic Life Support (BLS)',
    cardTitle: 'ACLS and BLS',
    duration: '1 Week',
    fee: 'Contact admissions for fee guidance',
    entry: 'BLS: Open entry. ACLS: Healthcare student or qualified professional with BLS certification.',
    heroImage: '/images/acls-bls.png',
    summary:
      'Build essential life-support knowledge and emergency response skills through Basic Life Support and Advanced Cardiovascular Life Support training.',
    overview: [
      'The ACLS and BLS programme introduces learners to essential life-support principles and emergency response procedures.',
      'BLS focuses on foundational life-saving skills, while ACLS is intended for healthcare students and qualified professionals who already hold BLS certification.',
      'The programme is designed to strengthen emergency preparedness and patient response skills.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Basic Life Support',
      'Cardiopulmonary Resuscitation',
      'Recognition of life-threatening emergencies',
      'Emergency response procedures',
      'Advanced cardiovascular life support principles',
      'Team-based emergency response',
      'German Language A1'
    ],
    entryRequirements: [
      'BLS: Open entry',
      'ACLS: Healthcare student or qualified healthcare professional with BLS certification'
    ],
    targetAudience: [
      'Healthcare students',
      'Qualified healthcare professionals',
      'Individuals interested in basic life-support skills',
      'Emergency response personnel'
    ]
  },

  // 9. GERMAN LANGUAGE A1

  {
    slug: 'german',
    title: 'German Language A1&A2, B1&B2',
    cardTitle: 'German Language A1&A2, B1&B2',
    duration: '7 Months',
    fee: 'Contact admissions for fee guidance',
    entry: 'Open entry – no fixed KCSE grade',
    heroImage: '/images/german.png',
    summary:
      'Develop foundational German language skills in speaking, listening, reading and writing for communication, study and employment opportunities.',
    overview: [
      'The German Language A1 programme introduces learners to the German language and develops foundational communication skills.',
      'Students develop basic speaking, listening, reading and writing abilities while learning vocabulary and expressions for everyday communication.',
      'The programme is suitable for beginners and individuals preparing for further German language studies or opportunities in German-speaking countries.'
    ],
    highlights: [
      'German vocabulary and grammar',
      'Basic speaking and conversation',
      'Listening comprehension',
      'Reading and writing',
      'Everyday communication',
      'Introduction to German culture',
      'Language proficiency development'
    ],
    entryRequirements: [
      'Open entry',
      'No fixed KCSE grade required',
      'No prior German language knowledge required'
    ],
    targetAudience: [
      'Beginners interested in learning German',
      'Healthcare professionals',
      'Caregivers',
      'Students planning to study abroad',
      'Individuals interested in employment opportunities in German-speaking countries'
    ],
    technicalRequirements: [
      'Laptop, tablet or smartphone',
      'Reliable internet connection where online learning applies',
      'Notebook and writing materials'
    ],
    careerPaths: [
      'Further German language studies',
      'International study opportunities',
      'Language-based employment opportunities'
    ]
  },

  // 10. CERTIFICATE IN COMMUNITY HEALTH LEVEL 5

  {
    slug: 'community-health-certificate',
    title: 'Certificate in Community Health Level 5',
    cardTitle: 'Community Health Level 5',
    duration: '1 Year',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE D+ (Plus) and above or related Level 4 certificate',
    heroImage: '/images/community-health.png',
    summary:
      'Develop foundational knowledge and practical skills in community health promotion, disease prevention and community-based healthcare support.',
    overview: [
      'The Certificate in Community Health Level 5 introduces learners to community health principles and practices.',
      'The programme focuses on health promotion, disease prevention, community education and supporting the delivery of essential healthcare services.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Community health promotion',
      'Disease prevention and control',
      'Health education and awareness',
      'Community engagement',
      'Basic public health principles',
      'Healthcare communication',
      'German Language A1'
    ],
    entryRequirements: [
      'KCSE D+ (Plus) and above, or',
      'Related Level 4 certificate'
    ],
    targetAudience: [
      'KCSE graduates interested in community health',
      'Community health support workers',
      'Individuals interested in public health'
    ],
    careerPaths: [
      'Community health support',
      'Health promotion programmes',
      'Community outreach services',
      'Public health support'
    ]
  },

  // 11. DIPLOMA IN COMMUNITY HEALTH LEVEL 6

  {
    slug: 'community-health-diploma',
    title: 'Diploma in Community Health Level 6',
    cardTitle: 'Diploma in Community Health',
    duration: '2 Years',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE C- with specified subject requirements or Community Health Level 5 qualification',
    heroImage: '/images/community-health.png',
    summary:
      'Develop advanced knowledge and practical competencies in community health, public health promotion, disease prevention and community-based healthcare.',
    overview: [
      'The Diploma in Community Health Level 6 prepares learners for professional responsibilities in community health and public health support.',
      'The programme develops knowledge and skills in health promotion, disease prevention, community engagement and healthcare education.',
      'Learners are introduced to the principles of improving community wellbeing through informed healthcare practices.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Community health management',
      'Public health promotion',
      'Disease prevention and control',
      'Community health education',
      'Health assessment and intervention',
      'Community engagement',
      'Healthcare communication',
      'German Language A1'
    ],
    entryRequirements: [
      'KCSE C- (Minus)',
      'C- in English or Kiswahili',
      'D+ in Biology or Biological Science',
      'D in one of Mathematics, Chemistry, Physics or Home Science',
      'OR a Community Health Level 5 qualification'
    ],
    targetAudience: [
      'Community Health Level 5 graduates',
      'KCSE graduates meeting the subject requirements',
      'Individuals interested in public and community health'
    ],
    careerPaths: [
      'Community health services',
      'Public health support',
      'Health promotion programmes',
      'Community outreach and education'
    ]
  },

  // 12. CERTIFICATE IN HEALTH SERVICE SUPPORT LEVEL 5

  {
    slug: 'health-service-support',
    title: 'Certificate in Health Service Support Level 5',
    cardTitle: 'Health Service Support Level 5',
    duration: '1 Year',
    fee: 'Contact admissions for fee guidance',
    entry: 'KCSE D (Plain) and above',
    heroImage: '/images/health-service-support.png',
    summary:
      'Acquire foundational knowledge and practical skills for supporting healthcare delivery, patient services and daily operations in healthcare environments.',
    overview: [
      'The Certificate in Health Service Support Level 5 introduces learners to the essential knowledge and practical skills required to support healthcare service delivery.',
      'The programme focuses on professional conduct, patient support, healthcare environment awareness and the importance of maintaining safe and organised healthcare facilities.',
      'German Language A1 training is included.'
    ],
    highlights: [
      'Introduction to health service support',
      'Patient support and assistance',
      'Healthcare environment management',
      'Professional communication',
      'Workplace hygiene and safety',
      'Ethical conduct and teamwork',
      'German Language A1'
    ],
    entryRequirements: [
      'KCSE D (Plain) and above'
    ],
    targetAudience: [
      'KCSE graduates interested in healthcare support',
      'Individuals interested in healthcare service delivery',
      'Aspiring healthcare support personnel'
    ],
    careerPaths: [
      'Healthcare support services',
      'Patient service support',
      'Healthcare facility support'
    ]
  }
];