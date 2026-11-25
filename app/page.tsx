
import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/components/Container';
import { CourseCard } from '@/components/CourseCard';
import { HeroSlider } from '@/components/HeroSlider';
import { PartnersMarquee } from '@/components/PartnersMarquee';
import { BoardSlider } from '@/components/BoardSlider';

import { courses, site } from '@/data/site';

import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  GraduationCap,
  HeartPulse,
  MapPin,
  Microscope,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { FaWhatsapp } from 'react-icons/fa';

/* =========================================================
   LEADERSHIP MESSAGES
========================================================= */

const leadership = [
  {
    name: 'Ms. Zaitun Kanenje',
    position: 'College Executive Director',
    heading: "Executive Director's Message",
    image: '/images/director.png',
    imageAlt: 'Ms. Zaitun Kanenje, Executive Director',
    imagePosition: 'object-center',
    side: 'left',
    summary:
      'Our vision is to nurture healthcare professionals who are knowledgeable, compassionate, innovative and responsive to the evolving demands of healthcare systems.',
    message: `Dear Prospective Students, Esteemed Parents, Development Partners and Distinguished Stakeholders,

It gives me immense pleasure to welcome you to Shifah Medical Training College (SMTC)—an institution dedicated to shaping the future of healthcare through excellence in education, innovation and professional development.

At SMTC, we recognize that the quality of healthcare services depends on the quality of the professionals entrusted with delivering them. Guided by this conviction, we have established a learning institution that combines academic excellence, practical competence, ethical values and technological advancement to prepare graduates who are ready to make a meaningful impact in society.

Our strategic vision is to nurture healthcare professionals who are knowledgeable, compassionate, innovative and responsive to the evolving demands of both national and international healthcare systems. Through a competency-based approach, state-of-the-art learning resources, experienced tutors and strong collaborations with healthcare institutions, we provide an educational experience that equips our students for lifelong success.

As we pursue our guiding philosophy of "Health through Innovation and Research," we remain committed to fostering a culture of continuous improvement, critical thinking, creativity and evidence-based practice. These principles enable our graduates to become transformative leaders who uphold the highest standards of professionalism and patient care.

Beyond academic achievement, we strive to develop individuals of integrity, resilience, and social responsibility who are prepared to contribute positively to their communities and the global healthcare workforce.

I warmly invite you to become part of the Shifah Medical Training College family. Together, let us embrace opportunities, inspire innovation and cultivate excellence as we prepare the next generation of healthcare professionals.

Thank you for placing your trust in Shifah Medical Training College. We look forward to partnering with you on this exciting journey of learning, growth, and professional achievement.

Welcome to Shifah Medical Training College—where excellence is nurtured, innovation is inspired and future healthcare leaders are made.`,
  },
  {
    name: 'Mr. Jactone A. Ocharo, PHN',
    position: 'Operations Director',
    heading: "Operations Director's Message",
    image: '/images/jactone.jpg',
    imageAlt: 'Mr. Jactone A. Ocharo, Operations Director',
    imagePosition: 'object-center',
    side: 'left',
    summary:
      'We are committed to providing a safe, efficient and student-centred learning environment that fosters academic excellence, professional growth and practical competence.',
    message: `Welcome to Shifah Medical Training College (SMTC).

At SMTC, operational excellence is at the heart of everything we do. We are committed to providing a safe, efficient and student-centred learning environment that fosters academic excellence, professional growth and practical competence. Our goal is to equip every learner with the knowledge, skills and values required to excel in the healthcare profession.

We are proud to be part of your journey and remain committed to your success.`,
  },
  {
    name: 'Miss. Miriam M. Gikonyo',
    position: 'College Principal',
    heading: "Principal's Message",
    image: '/images/Principal.jpg',
    imageAlt: 'Miss. Miriam M. Gikonyo, College Principal',
    imagePosition: 'object-[center_25%]',
    side: 'right',
    summary:
      'We believe that every student has the potential to make a meaningful difference in society through quality education, practical skills and professional integrity.',
    message: `It is my great pleasure to welcome you to Shifah Medical Training College, a centre of excellence committed to transforming lives through quality healthcare education. Our mission is to nurture competent, ethical and compassionate healthcare professionals who are equipped with the knowledge, practical skills and integrity needed to meet the evolving demands of the healthcare sector.

At SMTC, we believe that every student has the potential to make a meaningful difference in society. Through a learner-centred approach, experienced tutors, modern training methodologies and hands-on clinical exposure, we prepare our students to excel both academically and professionally.

Our commitment extends beyond academic achievement. We strive to cultivate leadership, professionalism, critical thinking, innovation and a lifelong passion for learning. Guided by our motto, "Health through Innovation and Research," we continuously improve our programmes to align with national and international healthcare standards.

Whether you are joining us to begin your healthcare career or to advance your professional journey, you will find a supportive learning environment that encourages excellence, integrity and service to humanity.

On behalf of the Board of Directors, Management and Staff, I warmly welcome you to the Shifah Medical Training College family. We look forward to walking with you on your journey towards a successful and rewarding healthcare career.

Thank you for choosing Shifah Medical Training College, where your future in healthcare begins.`,
  },
] as const;

/* =========================================================
   WHY CHOOSE SHIFAH
========================================================= */

const features = [
  {
    icon: ShieldCheck,
    title: 'Recognised Programmes',
    description:
      'Our training pathways are designed around recognised competency-based and professional training frameworks. Explore individual programme requirements and accreditation details.',
  },
  {
    icon: Microscope,
    title: 'Practical Training',
    description:
      'We emphasise practical learning and the development of real-world skills that prepare students for the demands of healthcare practice.',
  },
  {
    icon: Clock3,
    title: 'Flexible Study Pathways',
    description:
      'Choose from different programme durations and training pathways that support your educational and professional ambitions.',
  },
  {
    icon: Users,
    title: 'Supportive Learning',
    description:
      'Learn in a student-centred environment that encourages collaboration, professional growth, personal development and excellence.',
  },
];

/* =========================================================
   LEADERSHIP CARD
========================================================= */

type LeadershipMember = (typeof leadership)[number];

function LeadershipCard({ member }: { member: LeadershipMember }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-brand-dark/[0.06]">
      <div
        className={`grid items-stretch lg:grid-cols-[360px_1fr] ${
          member.side === 'right' ? 'lg:grid-cols-[1fr_360px]' : ''
        }`}
      >
        {/* PORTRAIT */}

        <div
          className={`relative h-[420px] overflow-hidden bg-[#edf2ee] sm:h-[480px] lg:h-full lg:min-h-[480px] ${
            member.side === 'right' ? 'lg:order-2' : ''
          }`}
        >
          <Image
            src={member.image}
            alt={member.imageAlt}
            fill
            sizes="(max-width: 1024px) 100vw, 360px"
            className={`object-cover ${member.imagePosition} transition-transform duration-700 group-hover:scale-[1.025]`}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/85 via-brand-dark/5 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-7 sm:p-9">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
              College Leadership
            </span>

            <h3 className="mt-4 text-xl font-extrabold text-white sm:text-2xl">
              {member.name}
            </h3>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-brand-gold">
              {member.position}
            </p>
          </div>
        </div>

        {/* MESSAGE */}

        <div
          className={`flex flex-col justify-center p-7 sm:p-10 lg:p-12 xl:p-14 ${
            member.side === 'right' ? 'lg:order-1' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="h-9 w-1 rounded-full bg-brand-gold" />

            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-green">
              A Message From Our Leadership
            </p>
          </div>

          <h3 className="mt-6 text-2xl font-extrabold leading-tight tracking-tight text-brand-dark sm:text-3xl">
            {member.heading}
          </h3>

          <div className="mt-6 h-1 w-12 rounded-full bg-brand-green" />

          <div className="relative mt-7">
            <span className="absolute -left-1 -top-8 font-serif text-7xl leading-none text-brand-green/10">
              "
            </span>

            <p className="relative text-sm leading-8 text-slate-600 sm:text-base">
              {member.summary}
            </p>
          </div>

          <details className="group/details mt-7 border-t border-slate-100 pt-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-brand-green transition hover:text-brand-dark">
              <span className="flex items-center gap-2">
                Read Full Message
                <ArrowRight
                  size={15}
                  className="transition-transform group-open/details:translate-x-1"
                />
              </span>

              <span className="text-xs font-medium text-slate-400 group-open/details:hidden">
                Expand
              </span>

              <span className="hidden text-xs font-medium text-slate-400 group-open/details:inline">
                Collapse
              </span>
            </summary>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5 sm:p-7">
              <p className="whitespace-pre-line text-sm leading-8 text-slate-600">
                {member.message}
              </p>

              <div className="mt-7 border-t border-slate-200 pt-5">
                <p className="text-sm font-bold text-brand-dark">
                  {member.name}
                </p>

                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-green">
                  {member.position}
                </p>
              </div>
            </div>
          </details>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
              <GraduationCap size={20} />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Shifah Medical Training College
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
  highlight,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="h-px w-10 bg-brand-gold" />

        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold sm:text-xs">
          {eyebrow}
        </p>

        <span className="h-px w-10 bg-brand-gold" />
      </div>

      <h2
        className={`text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl ${
          light ? 'text-white' : 'text-brand-dark'
        }`}
      >
        {title}{' '}
        {highlight && (
          <span className={light ? 'text-brand-gold' : 'text-brand-green'}>
            {highlight}
          </span>
        )}
      </h2>

      {description && (
        <p
          className={`mx-auto mt-6 max-w-2xl text-sm leading-8 sm:text-base ${
            light ? 'text-white/65' : 'text-slate-500'
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   HOME PAGE
========================================================= */

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white">
      {/* HERO */}

      <HeroSlider />

      {/* ABOUT THE COLLEGE */}

      <section className="relative overflow-hidden py-20 sm:py-24 lg:py-28">
        <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-brand-green/[0.045] blur-3xl" />

        <Container className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-px w-10 bg-brand-gold" />

              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold sm:text-xs">
                About Shifah
              </p>
            </div>

            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-brand-dark sm:text-4xl lg:text-5xl">
              Preparing the next generation of{' '}
              <span className="text-brand-green">
                healthcare professionals.
              </span>
            </h2>

            <div className="mt-6 h-1 w-14 rounded-full bg-brand-gold" />

            <p className="mt-7 text-sm leading-8 text-slate-600 sm:text-base">
              {site.about}
            </p>

            <div className="mt-9 grid grid-cols-3 gap-3 sm:gap-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                <p className="text-2xl font-extrabold text-brand-green sm:text-3xl">
                  {courses.length}
                </p>

                <p className="mt-2 text-[9px] font-bold uppercase leading-4 tracking-wider text-slate-400 sm:text-[10px]">
                  Programmes
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                <p className="text-xl font-extrabold text-brand-green sm:text-2xl">
                  3 Months
                </p>

                <p className="mt-2 text-[9px] font-bold uppercase leading-4 tracking-wider text-slate-400 sm:text-[10px]">
                  Shortest Course
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
                <p className="text-xl font-extrabold text-brand-green sm:text-2xl">
                  Practical
                </p>

                <p className="mt-2 text-[9px] font-bold uppercase leading-4 tracking-wider text-slate-400 sm:text-[10px]">
                  Learning
                </p>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-green/15 transition hover:-translate-y-1 hover:bg-brand-dark"
              >
                Discover Shifah
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/apply"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-brand-green hover:bg-brand-green/5 hover:text-brand-green"
              >
                Apply Today
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>

          {/* ABOUT IMAGE */}

          <div className="relative mx-auto w-full max-w-lg lg:ml-auto">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl border border-brand-gold/30 sm:-right-6 sm:-top-6" />

            <div className="absolute -left-3 bottom-10 top-10 w-1 rounded-full bg-gradient-to-b from-brand-green to-brand-gold" />

            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#eef3ef] shadow-2xl">
              <Image
                src="/images/lab.png"
                alt="Healthcare student training at Shifah Medical Training College"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover transition-transform duration-700 hover:scale-105"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/50 to-transparent p-6 pt-20 sm:p-8 sm:pt-24">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">
                  Our Institutional Motto
                </p>

                <h3 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
                  {site.motto}
                </h3>

                <div className="mt-4 flex items-center gap-2 text-xs text-white/75">
                  <MapPin size={14} />
                  Kitale, Kenya
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* LEADERSHIP MESSAGES */}

      <section className="bg-[#f7f9f7] py-20 sm:py-24 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow="College Leadership"
            title="Messages From Our"
            highlight="Leadership"
            description="Meet the leaders guiding Shifah Medical Training College towards excellence in healthcare education, innovation, professionalism and community impact."
          />

          <div className="mt-14 space-y-8 lg:mt-16">
            {leadership.map((member) => (
              <LeadershipCard key={member.name} member={member} />
            ))}
          </div>
        </Container>
      </section>

      {/* BOARD OF DIRECTORS */}

      <BoardSlider />

      {/* FEATURED COURSES */}

      <section className="relative overflow-hidden bg-white py-20 sm:py-24">
        <Container>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-brand-gold" />

                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gold sm:text-xs">
                  Academic Excellence
                </p>
              </div>

              <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-brand-dark sm:text-4xl">
                Explore our{' '}
                <span className="text-brand-green">
                  training programmes.
                </span>
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
                Discover learning opportunities designed to develop
                practical skills, professional competence and a future
                in healthcare.
              </p>
            </div>

            <Link
              href="/courses"
              className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-brand-green transition hover:gap-3"
            >
              View All Courses
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-full border border-brand-green/20 px-7 py-3.5 text-sm font-bold text-brand-green transition hover:bg-brand-green hover:text-white"
            >
              Explore All Programmes
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </Container>
      </section>

      {/* WHY CHOOSE SHIFAH */}

      <section className="relative overflow-hidden bg-brand-dark py-20 sm:py-24 lg:py-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full border border-white/[0.06]" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full border border-white/[0.06]" />

        <Container className="relative">
          <SectionHeading
            eyebrow="The Shifah Advantage"
            title="Building the future of"
            highlight="healthcare education."
            description="At Shifah Medical Training College, we combine practical learning, professional values and student-centred support to help learners pursue meaningful healthcare careers."
            light
          />

          <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-white/10 bg-white/[0.045] p-7 transition-all duration-300 hover:-translate-y-2 hover:border-brand-gold/40 hover:bg-white/[0.09]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold transition duration-300 group-hover:bg-brand-gold group-hover:text-brand-dark">
                      <Icon size={25} />
                    </div>

                    <span className="text-3xl font-black text-white/10">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="mt-7 text-lg font-bold text-white">
                    {feature.title}
                  </h3>

                  <div className="mt-3 h-0.5 w-9 rounded-full bg-brand-gold/60 transition-all duration-300 group-hover:w-14" />

                  <p className="mt-5 text-sm leading-7 text-white/60">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-brand-dark transition hover:-translate-y-1 hover:bg-white"
            >
              Learn More About Us
              <ArrowRight size={16} />
            </Link>
          </div>
        </Container>
      </section>

      {/* ACADEMIC DEPARTMENTS */}

      <section className="bg-white py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Academic Departments"
            title="Discover our"
            highlight="healthcare disciplines."
            description="Explore our academic departments and discover the different fields of healthcare education available at Shifah Medical Training College."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {site.departments.map((dept, index) => (
              <Link
                href="/departments"
                key={dept}
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-[#f8faf8] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-green/30 hover:bg-white hover:shadow-xl hover:shadow-brand-green/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-brand-green/20 transition group-hover:text-brand-green">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-green shadow-sm transition group-hover:bg-brand-green group-hover:text-white">
                    <ArrowUpRight size={17} />
                  </div>
                </div>

                <h3 className="mt-6 text-sm font-bold leading-6 text-brand-dark transition group-hover:text-brand-green">
                  {dept}
                </h3>

                <div className="mt-5 h-0.5 w-8 rounded-full bg-brand-gold/50 transition-all group-hover:w-14 group-hover:bg-brand-gold" />
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/departments"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-green hover:text-brand-dark"
            >
              Explore Departments
              <ArrowRight size={16} />
            </Link>
          </div>
        </Container>
      </section>

      {/* PARTNERS AND RECOGNITION */}

      <section className="relative overflow-hidden bg-[#f7f9f7] py-20 sm:py-24">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/20 to-transparent" />

        <Container>
          <SectionHeading
            eyebrow="Partners & Recognition"
            title="Building strong"
            highlight="professional partnerships."
            description="We value the relationships and collaborations that support quality healthcare training, professional development and institutional growth."
          />

          <div className="mt-12 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
            <PartnersMarquee />
          </div>
        </Container>
      </section>

      {/* ADMISSIONS CALL TO ACTION */}

      <section className="relative overflow-hidden bg-white py-20 sm:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-brand-dark px-7 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10" />

            <div className="pointer-events-none absolute -right-10 -top-16 h-60 w-60 rounded-full border border-brand-gold/20" />

            <div className="pointer-events-none absolute -bottom-36 -left-20 h-80 w-80 rounded-full bg-brand-green/30 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2">
                  <GraduationCap size={16} className="text-brand-gold" />

                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold">
                    Begin Your Journey
                  </span>
                </div>

                <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Your future in healthcare{' '}
                  <span className="text-brand-gold">
                    starts here.
                  </span>
                </h2>

                <p className="mt-6 max-w-xl text-sm leading-8 text-white/65 sm:text-base">
                  Take the first step towards a rewarding healthcare
                  career. Explore our programmes, review the admission
                  requirements and submit your application.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/apply"
                    className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-brand-dark transition hover:-translate-y-1 hover:bg-white"
                  >
                    Apply Now
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/admissions"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
                  >
                    Admissions Guide
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="hidden h-44 w-44 items-center justify-center rounded-full border border-brand-gold/20 bg-white/[0.04] lg:flex">
                <div className="flex h-32 w-32 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-gold/10">
                  <HeartPulse
                    size={65}
                    strokeWidth={1.2}
                    className="text-brand-gold"
                  />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* FLOATING WHATSAPP */}

      <a
        href="https://wa.me/254794882948?text=Hello%20Shifah%20Medical%20Training%20College,%20I%20would%20like%20to%20make%20an%20enquiry."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Shifah Admissions on WhatsApp"
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] p-3.5 text-white shadow-xl shadow-green-900/20 transition-all duration-300 hover:-translate-y-1 hover:bg-[#20ba5a] sm:bottom-7 sm:right-7 sm:px-5 sm:py-3.5"
      >
        <FaWhatsapp size={27} />

        <div className="hidden leading-tight sm:block">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/80">
            Need Assistance?
          </p>

          <p className="mt-0.5 text-xs font-bold">
            Chat with Admissions
          </p>
        </div>
      </a>
    </main>
  );
}
