import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bus, MapPin } from 'lucide-react';
import { InstagramIcon } from './ui/instagram';
import { LinkedinIcon } from './ui/linkedin';
import { TwitterIcon } from './ui/twitter';
import Section from './layout/Section';

// Campus background image configuration using provided images
const CAMPUS_SLIDES = [
  {
    id: 'mainbuilding',
    name: 'Main Building',
    tag: 'Administrative Block',
    src: '/mainbuilding.jpeg',
    position: 'center 46%',
  },
  {
    id: 'csh',
    name: 'Central Seminar Hall',
    tag: 'CSH & Campus Core',
    src: '/csh.jpeg',
    position: 'center 48%',
  },
  {
    id: 'mainbld',
    name: 'Campus Avenue',
    tag: 'Institute Main Drive',
    src: '/mainbld.jpeg',
    position: 'center 58%',
  },
];

const HomeFooter = () => {
  const currentYear = new Date().getFullYear();
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Preload images on mount for instantaneous, flicker-free switching
  useEffect(() => {
    CAMPUS_SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });
  }, []);

  // Smooth auto-cycling every 2 seconds continuously
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % CAMPUS_SLIDES.length);
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const quickLinks = [
    { label: 'Events', to: '/events' },
    { label: 'Clubs', to: '/clubs' },
    { label: 'Club Directory', to: '/clubs/directory' },
    { label: 'Event Guide', to: '/event-guide' },
    { label: 'FAQ', to: '/faq' },
    { label: 'Verify Certificate', to: '/verify/certificate' },
  ];

  const otherLinks = [
    { label: 'Contact', to: '/contact' },
    { label: 'Team', to: '/team' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Payment Policy', to: '/payment-policy' },
    { label: 'About You', to: '/access-telemetry' },
  ];

  const currentSlide = CAMPUS_SLIDES[activeSlideIndex];

  return (
    <footer className="bg-cn-bg text-cn-text border-t border-cn-border transition-colors duration-300 overflow-hidden">
      {/* Upper Navigation Section */}
      <Section className="py-12 sm:py-12 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/nitjlogo.png" alt="NITJ Logo" className="w-11 h-12 shrink-0 select-none" />
              <span className="font-light text-[24px] tracking-wider text-cn-text leading-none select-none logofont">
                Cam<span className="uppercase text-[18px] font-medium">P</span>usnode
              </span>
            </div>
            <div>
              <p className="text-[13px] text-cn-text-muted mt-3 leading-relaxed max-w-sm">
                The centralized campus platform for Dr. B. R. Ambedkar National Institute of Technology Jalandhar.
              </p>
              <p className="text-[13px] text-cn-text-muted mt-3">
                Have any questions or suggestion?{' '}
                <br />
                <Link
                  to="/contact"
                  className="text-brand-600 dark:text-brand-400 hover:underline font-medium cursor-pointer"
                >
                  Send us a suggestion
                </Link>{' '}
                or email at{' '}
                <a
                  href="mailto:clubsetu@nikhim.me"
                  className="text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  clubsetu@nikhim.me
                </a>
              </p>
            </div>
          </div>

          {/* Links column */}
          <div className="flex justify-start gap-16 sm:gap-28 md:justify-end">
            {/* Quick Links */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-cn-text-secondary mb-5">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-[14px] text-cn-text-secondary hover:text-brand-600 transition-colors font-medium dark:hover:text-brand-400 inline-flex items-center gap-1.5"
                    >
                      {link.showIcon && <Bus className="w-4 h-4 text-brand-600 dark:text-brand-500 shrink-0" />}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other Links */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-cn-text-secondary mb-5">
                Other Links
              </h4>
              <ul className="space-y-3">
                {otherLinks.map((link) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-[13px] text-cn-text-secondary hover:text-brand-600 transition-colors font-medium dark:hover:text-brand-400"
                      >
                        {link.label}
                      </Link>
                    ) : link.onClick ? (
                      <button
                        onClick={link.onClick}
                        className="text-[13px] text-cn-text-secondary hover:text-brand-600 transition-colors font-medium cursor-pointer dark:hover:text-brand-400 border-none bg-transparent p-0 text-left"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <a
                        href={link.href}
                        target={link.href?.startsWith('http') ? '_blank' : undefined}
                        rel={link.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="text-[13px] text-cn-text-secondary hover:text-brand-600 transition-colors font-medium cursor-pointer dark:hover:text-brand-400"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Grand Typographic Showcase Banner (Sarvam-inspired masked text with changing campus backgrounds) */}
      <div
        className="hidden sm:block relative w-full border-t border-cn-border/60 bg-gradient-to-b from-transparent via-cn-surface/20 to-cn-surface/50 pb-2 transition-colors select-none"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Subtle landmark indicator & interactive selectors */}
         

          {/* Masked Typographic Banner Container */}
          <div className="relative w-full overflow-hidden flex items-center justify-center py-0 sm:py-0">
            {/* Natural Document Flow Placeholder to give the container responsive proportional height without shift */}
            <span
              className="invisible select-none logofont pointer-events-none w-full text-center font-black tracking-[-0.04em] leading-[0.82] block text-[15.5vw] sm:text-[14.5vw] md:text-[14vw] lg:text-[13.5vw]"
             
              aria-hidden="true"
            >
              cam<span className='text-[10.5vw] uppercase'>P</span>usnode
            </span>

            {/* Crossfading Clipped Campus Image Layers */}
            {CAMPUS_SLIDES.map((slide, index) => {
              const isActive = index === activeSlideIndex;
              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out pointer-events-none ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                  aria-hidden={!isActive}
                >
                  <span
                    className="w-full logofont text-center font-black tracking-[-0.04em] leading-[0.82] block select-none lowercase transition-transform duration-5000 ease-out will-change-transform drop-shadow-[0_4px_24px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_6px_28px_rgba(0,0,0,0.45)] text-[15.5vw] sm:text-[14.5vw] md:text-[14vw] lg:text-[13.5vw]"
                    style={{
                      
                      backgroundImage: `url('${slide.src}')`,
                      backgroundPosition: slide.position,
                      backgroundSize: 'cover',
                      backgroundRepeat: 'no-repeat',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: 'contrast(1.08) saturate(1.15) brightness(1.02)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1.0)',
                    }}
                  >
                    cam<span className='uppercase text-[9.5vw]'>P</span>usnode
                  </span>
                </div>
              );
            })}
          </div>


          

     
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
