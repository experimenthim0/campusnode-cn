import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bus } from 'lucide-react';
import {InstagramIcon} from './ui/instagram';
import { LinkedinIcon } from './ui/linkedin';
import {TwitterIcon} from './ui/twitter';
import ScrollReveal from './ScrollReveal';
import ContactModal from './ContactModal';
import Section from './layout/Section';

const HomeFooter = () => {
  const currentYear = new Date().getFullYear();
  const [isContactOpen, setIsContactOpen] = useState(false);

  
  const quickLinks = [
    { label: 'Events', to: '/events' },
    { label: 'Clubs', to: '/clubs' },
    // { label: 'Event Timer', to: '/event-timer' },
    // { label: 'Bus Tracker', to: '/bus-tracker'},
    { label: 'Event Guide', to: '/event-guide' },
    { label: 'L&F Guide', to: '/lost-found/guide' },
    { label: 'FAQ', to: '/faq' },
  ];

  const otherLinks = [
    // { label: 'NITJ Website', href: 'https://nitj.ac.in' },
    { label: 'Contact', onClick: () => setIsContactOpen(true) },
    { label: 'Team', to: '/team' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Payment Policy', to: '/payment-policy' },
  ];

  return (
    <footer className="bg-[#fafafa] dark:bg-[#0c0c0c] text-neutral-900 dark:text-white border-t border-neutral-200 dark:border-neutral-800 transition-colors duration-300">
      <Section className="py-12 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-15">

          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/nitjlogo.png" alt="NITJ Logo" className="w-11 h-12"/>
              <span className="font-light text-[24px] tracking-wider text-black dark:text-neutral-200 leading-none select-none logofont">
                Campus<span className="text-brand-600 dark:text-brand-500">Node</span>
              </span>
            </div>
            <div className=''>
             <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-4">
              Have any questions or suggestion?{' '}
              <br/>
              <button 
                onClick={() => setIsContactOpen(true)} 
                className="text-brand-500 hover:underline font-medium cursor-pointer"
              >
                Send us a suggestion
              </button>
              {' '}or email at{' '}
              <a href="mailto:clubsetu@nikhim.me" className="text-brand-500 hover:underline font-medium">
                clubsetu@nikhim.me
              </a>
            </p>
        </div>
          </div>
     
     <div className='flex justify-start gap-20 sm:gap-50  '>
          {/* Quick Links */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-700 dark:text-neutral-400 mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-[14px] text-neutral-800 dark:text-neutral-400 hover:text-brand-600 transition-colors font-medium dark:hover:text-brand-500 inline-flex items-center gap-1.5"
                  >
                    {link.showIcon && <Bus className="w-4 h-4 text-brand-600 dark:text-brand-500 shrink-0" />}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          
        
        <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-700 dark:text-neutral-400 mb-5">
              Other Links
            </h4>
            <ul className="space-y-3">
              {otherLinks.map((link) => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-[13px] text-neutral-800 dark:text-neutral-400 hover:text-brand-600 transition-colors font-medium dark:hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  ) : link.onClick ? (
                    <button
                      onClick={link.onClick}
                      className="text-[13px] text-neutral-800 dark:text-neutral-400 hover:text-brand-600 transition-colors font-medium cursor-pointer dark:hover:text-brand-600 border-none bg-transparent p-0 text-left"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <a
                      href={link.href}
                      className="text-[13px] text-neutral-800 dark:text-neutral-400 hover:text-brand-600 transition-colors font-medium cursor-pointer dark:hover:text-brand-600"
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

      {/* Custom Contact & Suggestion Modal */}
      <ContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </footer>
  );
};

export default HomeFooter;
