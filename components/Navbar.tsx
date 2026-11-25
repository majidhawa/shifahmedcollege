
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
  UserRound,
  Users,
  Download,
  Video,
  Megaphone,
  HelpCircle,
} from 'lucide-react';

import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
} from 'react-icons/fa';

/* =========================================================
   MAIN NAVIGATION LINKS
========================================================= */

const links = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/courses', label: 'Courses' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/departments', label: 'Departments' },
  { href: '/contact', label: 'Contact' },
];

/* =========================================================
   PORTAL LOGIN LINKS
========================================================= */

const logins = [
  {
    href: '/student/login',
    label: 'Student Portal',
    description: 'Access your student account',
    icon: GraduationCap,
  },
  {
    href: '/lecturer/login',
    label: 'Lecturer Portal',
    description: 'Access the lecturer LMS',
    icon: UserRound,
  },
  {
    href: '/parent/login',
    label: 'Parent Portal',
    description: 'Monitor student progress',
    icon: Users,
  },
];

/* =========================================================
   RESOURCES LINKS
========================================================= */

const resources = [
  {
    href: '/downloads',
    label: 'Downloads',
    description: 'Forms and useful documents',
    icon: Download,
  },
  {
    href: '/videos',
    label: 'Videos',
    description: 'Videos and learning content',
    icon: Video,
  },
  {
    href: '/announcements',
    label: 'Announcements',
    description: 'Latest college updates',
    icon: Megaphone,
  },
  {
    href: '/faqs',
    label: 'FAQs',
    description: 'Frequently asked questions',
    icon: HelpCircle,
  },
];

/* =========================================================
   NAVBAR COMPONENT
========================================================= */

export function Navbar() {
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);

  /* =======================================================
     HANDLE SCROLL
  ======================================================= */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /* =======================================================
     CLOSE MENUS WHEN ROUTE CHANGES
  ======================================================= */

  useEffect(() => {
    setMenuOpen(false);
    setPortalOpen(false);
    setResourceOpen(false);
  }, [pathname]);

  /* =======================================================
     ACTIVE STATES
  ======================================================= */

  const isPortalActive = logins.some(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(`${item.href.split('/')[1]}/`)
  );

  const isResourceActive = resources.some(
    (item) =>
      pathname === item.href ||
      pathname.startsWith(`${item.href}/`)
  );

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);

  /* =======================================================
     DROPDOWN ITEM
  ======================================================= */

  const DropdownItem = ({
    href,
    label,
    description,
    icon: Icon,
  }: {
    href: string;
    label: string;
    description: string;
    icon: React.ElementType;
  }) => {
    const active = isActive(href);

    return (
      <Link
        href={href}
        className={`
          flex items-center gap-3 px-4 py-3.5
          transition-colors duration-200
          ${
            active
              ? 'bg-brand-green/10 text-brand-green'
              : 'text-gray-700 hover:bg-brand-green/5 hover:text-brand-green'
          }
        `}
      >
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center
            rounded-xl transition-colors
            ${
              active
                ? 'bg-brand-green text-white'
                : 'bg-gray-100 text-gray-500'
            }
          `}
        >
          <Icon size={19} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            {description}
          </p>
        </div>
      </Link>
    );
  };

  /* =======================================================
     DROPDOWN MENU
  ======================================================= */

  const DropdownMenu = ({
    title,
    description,
    items,
    active,
  }: {
    title: string;
    description: string;
    items: typeof logins;
    active: boolean;
  }) => (
    <div className="absolute left-0 top-full z-50 hidden w-72 pt-3 group-hover:block group-focus-within:block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/10">
        <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <p className="text-sm font-bold text-gray-900">
            {title}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>

        {items.map((item) => (
          <DropdownItem
            key={item.href}
            {...item}
          />
        ))}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full">

      {/* =====================================================
          TOP CONTACT BAR
      ===================================================== */}

      <div className="bg-brand-dark text-white">
        <div className="container-shell flex min-h-9 items-center justify-between gap-4 py-1.5">

          <p className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-white/65 md:block">
            Health through innovation and research
          </p>

          <div className="ml-auto flex items-center gap-3 sm:gap-5">

            <a
              href="tel:+254142068933"
              className="hidden items-center gap-1.5 text-[11px] text-white/75 transition hover:text-white lg:flex"
            >
              <Phone size={12} />
              +254 142 068933
            </a>

            <a
              href="mailto:admin@shifahmedicalcollege.co.ke"
              className="hidden items-center gap-1.5 text-[11px] text-white/75 transition hover:text-white xl:flex"
            >
              <Mail size={12} />
              admin@shifahmedicalcollege.co.ke
            </a>

            <div className="flex items-center gap-1.5">

              <a
                href="https://www.facebook.com/profile.php?id=61589605739657"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-blue-500 hover:bg-blue-600 hover:text-white"
              >
                <FaFacebookF size={11} />
              </a>

              <a
                href="https://www.instagram.com/shifahmedicalcollege/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-pink-500 hover:bg-pink-600 hover:text-white"
              >
                <FaInstagram size={11} />
              </a>

              <a
                href="https://www.tiktok.com/@shifah.medical.tr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-black hover:bg-black hover:text-white"
              >
                <FaTiktok size={11} />
              </a>

              <a
                href="https://wa.me/254794882948"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-green-500 hover:bg-green-600 hover:text-white"
              >
                <FaWhatsapp size={12} />
              </a>

            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          MAIN NAVIGATION
      ===================================================== */}

      <div
        className={`
          relative border-b border-gray-100 bg-white
          transition-shadow duration-300
          ${scrolled ? 'shadow-lg shadow-black/[0.07]' : 'shadow-sm'}
        `}
      >

        <div className="container-shell flex min-h-[76px] items-center justify-between gap-4 py-2">

          {/* =================================================
              LOGO AND COLLEGE NAME
          ================================================= */}

          <Link
            href="/"
            aria-label="Shifah Medical Training College home"
            className="group flex shrink-0 items-center gap-2.5"
          >
            <img
              src="/images/logo.png"
              alt="Shifah Medical Training College"
              className="h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-14"
            />

            <div className="hidden leading-tight sm:block">
              <p className="whitespace-nowrap text-base font-extrabold tracking-tight text-brand-green lg:text-[17px]">
                SHIFAH MEDICAL
              </p>

              <p className="mt-1 whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.19em] text-gray-500">
                Training College
              </p>
            </div>
          </Link>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav
            aria-label="Main navigation"
            className="hidden items-center lg:flex"
          >

            {/* MAIN LINKS */}

            {links.map((link) => {
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    relative whitespace-nowrap px-2.5 py-5
                    text-[12px] font-semibold transition-colors
                    xl:px-3 xl:text-[13px]
                    ${
                      active
                        ? 'text-brand-green'
                        : 'text-slate-600 hover:text-brand-green'
                    }
                  `}
                >
                  {link.label}

                  <span
                    className={`
                      absolute bottom-2 left-3 right-3 h-[2px]
                      rounded-full bg-brand-gold transition-transform
                      duration-200
                      ${active ? 'scale-x-100' : 'scale-x-0'}
                    `}
                  />
                </Link>
              );
            })}

            {/* PORTAL DROPDOWN */}

            <div className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                className={`
                  flex items-center gap-1 whitespace-nowrap
                  px-2.5 py-5 text-[12px] font-semibold
                  transition-colors xl:px-3 xl:text-[13px]
                  ${
                    isPortalActive
                      ? 'text-brand-green'
                      : 'text-slate-600 hover:text-brand-green'
                  }
                `}
              >
                Portals
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                />
              </button>

              <DropdownMenu
                title="Portal Login"
                description="Select your portal to continue"
                items={logins}
                active={isPortalActive}
              />
            </div>

            {/* RESOURCES DROPDOWN */}

            <div className="group relative">
              <button
                type="button"
                aria-haspopup="true"
                className={`
                  flex items-center gap-1 whitespace-nowrap
                  px-2.5 py-5 text-[12px] font-semibold
                  transition-colors xl:px-3 xl:text-[13px]
                  ${
                    isResourceActive
                      ? 'text-brand-green'
                      : 'text-slate-600 hover:text-brand-green'
                  }
                `}
              >
                Resources
                <ChevronDown
                  size={14}
                  className="transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180"
                />
              </button>

              <DropdownMenu
                title="Resources"
                description="Explore useful college resources"
                items={resources}
                active={isResourceActive}
              />
            </div>

          </nav>

          {/* =================================================
              APPLY BUTTON
          ================================================= */}

          <Link
            href="/apply"
            className="
              hidden shrink-0 items-center justify-center gap-2
              rounded-full bg-brand-green px-4 py-2.5
              text-xs font-bold text-white shadow-sm
              transition-all duration-200
              hover:-translate-y-0.5 hover:bg-green-800 hover:shadow-md
              xl:flex
            "
          >
            Apply Now
            <span aria-hidden="true">→</span>
          </Link>

          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl border border-gray-200 text-brand-green
              transition hover:bg-brand-green/5
              lg:hidden
            "
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

        </div>

        {/* =====================================================
            MOBILE NAVIGATION
        ===================================================== */}

        {menuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-gray-100 bg-white shadow-xl lg:hidden"
          >
            <nav
              aria-label="Mobile navigation"
              className="container-shell flex max-h-[calc(100dvh-90px)] flex-col gap-1 overflow-y-auto py-4"
            >

              {/* MAIN LINKS */}

              {links.map((link) => {
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`
                      flex items-center justify-between rounded-lg
                      px-4 py-3 text-sm font-semibold transition
                      ${
                        active
                          ? 'bg-brand-green/10 text-brand-green'
                          : 'text-slate-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {link.label}

                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                    )}
                  </Link>
                );
              })}

              {/* MOBILE PORTAL DROPDOWN */}

              <button
                type="button"
                onClick={() => {
                  setPortalOpen((prev) => !prev);
                  setResourceOpen(false);
                }}
                aria-expanded={portalOpen}
                className={`
                  flex items-center justify-between rounded-lg
                  px-4 py-3 text-sm font-semibold transition
                  ${
                    isPortalActive
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'text-slate-700 hover:bg-gray-50'
                  }
                `}
              >
                Portal Login

                <ChevronDown
                  size={17}
                  className={`transition-transform ${portalOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {portalOpen && (
                <div className="ml-4 space-y-1 border-l-2 border-brand-green/20 pl-3">
                  {logins.map((login) => {
                    const Icon = login.icon;
                    const active = isActive(login.href);

                    return (
                      <Link
                        key={login.href}
                        href={login.href}
                        className={`
                          flex items-center gap-3 rounded-lg px-3 py-3
                          transition
                          ${
                            active
                              ? 'bg-brand-green/10 text-brand-green'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-brand-green'
                          }
                        `}
                      >
                        <div
                          className={`
                            flex h-9 w-9 shrink-0 items-center justify-center
                            rounded-lg
                            ${active ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500'}
                          `}
                        >
                          <Icon size={17} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            {login.label}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {login.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* MOBILE RESOURCES DROPDOWN */}

              <button
                type="button"
                onClick={() => {
                  setResourceOpen((prev) => !prev);
                  setPortalOpen(false);
                }}
                aria-expanded={resourceOpen}
                className={`
                  flex items-center justify-between rounded-lg
                  px-4 py-3 text-sm font-semibold transition
                  ${
                    isResourceActive
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'text-slate-700 hover:bg-gray-50'
                  }
                `}
              >
                Resources

                <ChevronDown
                  size={17}
                  className={`transition-transform ${resourceOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {resourceOpen && (
                <div className="ml-4 space-y-1 border-l-2 border-brand-green/20 pl-3">
                  {resources.map((resource) => {
                    const Icon = resource.icon;
                    const active = isActive(resource.href);

                    return (
                      <Link
                        key={resource.href}
                        href={resource.href}
                        className={`
                          flex items-center gap-3 rounded-lg px-3 py-3
                          transition
                          ${
                            active
                              ? 'bg-brand-green/10 text-brand-green'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-brand-green'
                          }
                        `}
                      >
                        <div
                          className={`
                            flex h-9 w-9 shrink-0 items-center justify-center
                            rounded-lg
                            ${active ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-500'}
                          `}
                        >
                          <Icon size={17} />
                        </div>

                        <div>
                          <p className="text-sm font-semibold">
                            {resource.label}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {resource.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* MOBILE LOCATION */}

              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 px-4 pt-4 text-xs text-gray-500">
                <MapPin size={15} className="text-brand-green" />
                Ambwere Plaza, Kitale
              </div>

              {/* MOBILE APPLY BUTTON */}

              <Link
                href="/apply"
                className="
                  mt-3 flex items-center justify-center gap-2
                  rounded-full bg-brand-green px-5 py-3.5
                  text-sm font-bold text-white
                  transition hover:bg-green-800
                "
              >
                Apply Now
                <span aria-hidden="true">→</span>
              </Link>

              {/* MOBILE CONTACT */}

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-4">
                <a
                  href="tel:+254142068933"
                  className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3 text-xs font-medium text-gray-600"
                >
                  <Phone size={14} />
                  Call Us
                </a>

                <a
                  href="mailto:admin@shifahmedicalcollege.co.ke"
                  className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 p-3 text-xs font-medium text-gray-600"
                >
                  <Mail size={14} />
                  Email Us
                </a>
              </div>

            </nav>
          </div>
        )}

      </div>
    </header>
  );
}
