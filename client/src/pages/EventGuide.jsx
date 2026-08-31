import React from 'react';
import { Link } from 'react-router-dom';

const EventGuide = () => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] py-12 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3 text-orange-600">
            <span className="block w-6 h-[1px] bg-orange-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Documentation</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Event <span className="text-orange-600">Creation</span> Guide
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl text-sm md:text-base leading-relaxed">
            Everything you need to know about creating and managing events on Campus<span className="text-orange-600 font-semibold">Node</span>. This guide covers our 4-step event creation wizard, eligibility restrictions, payment methods, custom forms, and extras.
          </p>
        </div>

        {/* Who can create */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
            <i className="ri-user-star-line text-orange-600 text-xl" />
            Who Can Create Events?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4 text-sm">
            Only registered <strong className="text-neutral-800 dark:text-neutral-200">Club Heads</strong> can create events on Campus<span className="text-orange-600 font-semibold">Node</span>. Each club head represents an official NITJ club and is responsible for managing their events, registrations, and payments.
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 rounded-xl p-4 text-xs md:text-sm text-orange-850 dark:text-orange-400 flex items-center gap-2">
            <i className="ri-information-line text-orange-600 text-base shrink-0" />
            <span>If you're a student who wants to create events, register as a Club Head with your club's official credentials.</span>
          </div>
        </section>

        {/* 4-Step Creation Workflow */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2.5">
            <i className="ri-git-commit-line text-orange-600 text-xl" />
            The 4-Step Event Creation Wizard
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
            Our event form is split into 4 structured steps for a seamless publishing experience. You can navigate back and forth or click step numbers to review your inputs.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                step: '01',
                title: 'Basic Details',
                desc: 'Set the event title, rich-text description, venue selection, and upload high-res event posters (up to 5MB).',
                icon: 'ri-file-list-line',
              },
              {
                step: '02',
                title: 'Timings & Access',
                desc: 'Configure start/end times, registration deadlines, and eligibility filters by Program (BTech, MTech, Other), Year, and Branch.',
                icon: 'ri-calendar-event-line',
              },
              {
                step: '03',
                title: 'Registration & Payments',
                desc: 'Set individual or team limits, seat capacities, pricing (Free or UPI Manual Payment), required profile links, and dynamic custom form questions.',
                icon: 'ri-ticket-2-line',
              },
              {
                step: '04',
                title: 'Extras & Publishing',
                desc: 'Enable winner showcases, automated digital certificates, sponsor logos, and additional media assets before final submission.',
                icon: 'ri-sparkles-line',
              },
            ].map((s) => (
              <div key={s.step} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800 rounded-xl relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl font-black text-neutral-200 dark:text-neutral-800 select-none">
                  {s.step}
                </span>
                <div className="flex items-center gap-2.5 mb-2 relative z-10">
                  <div className="w-8 h-8 bg-orange-100 dark:bg-orange-950/50 text-orange-600 rounded-lg flex items-center justify-center font-bold text-sm">
                    <i className={s.icon} />
                  </div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-sm">{s.title}</h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed relative z-10">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2.5">
            <i className="ri-layout-grid-line text-orange-600 text-xl" />
            Supported Event Types
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: 'ri-code-box-line',
                title: 'Hackathons & Team Challenges',
                desc: 'Enable team registrations with custom team sizes (e.g. 2-4 members), required GitHub repos, and tech stack questions.',
              },
              {
                icon: 'ri-presentation-line',
                title: 'Workshops & Bootcamps',
                desc: 'Technical/non-technical learning sessions with seat caps or open capacity, with certificates on completion.',
              },
              {
                icon: 'ri-trophy-line',
                title: 'Competitions & Contests',
                desc: 'Quizzes, debates, or esports with branch/year restrictions and winner showcase boards upon conclusion.',
              },
              {
                icon: 'ri-music-2-line',
                title: 'Cultural & Fest Events',
                desc: 'Open mic, talent shows, and fest activities with entry fees, custom payment QR instructions, and media galleries.',
              },
              {
                icon: 'ri-team-line',
                title: 'Club Meetups & Orientations',
                desc: 'Regular club orientation meetings with unlimited seats and free entry.',
              },
              {
                icon: 'ri-lightbulb-line',
                title: 'Guest Lectures & Webinars',
                desc: 'Keynote talks by industry experts with first-come-first-served registration caps.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800 rounded-xl hover:border-orange-500/25 hover:bg-white dark:hover:bg-neutral-900 transition-all duration-300">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/40 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className={`${item.icon} text-lg`} />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">{item.title}</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Fields Explained */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2.5">
            <i className="ri-file-list-3-line text-orange-600 text-xl" />
            Event Form Fields — Complete Reference
          </h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-md">
                  Step 1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Basic Details
                </span>
              </div>
              <div className="space-y-1">
                <FieldRow
                  name="Event Title"
                  required
                  type="Text Input"
                  desc="The headline name of your event. Keep it clear, impactful, and descriptive."
                  example="CodeSprint 3.0 — 24hr Campus Hackathon"
                />
                <FieldRow
                  name="Description"
                  type="Rich Text Editor"
                  desc="Detailed explanation formatted with rich text (bolding, lists, links, headers). Include rules, schedule, prizes, and contact details."
                  example="Use formatting for guidelines, eligibility, and timeline."
                />
                <FieldRow
                  name="Event Poster"
                  type="File Upload (Max 5MB)"
                  desc="Upload event posters directly from your computer (PNG, JPG, JPEG, WEBP, GIF). Features live image preview and one-click image removal."
                />
                <FieldRow
                  name="Venue"
                  required
                  type="Dropdown Select"
                  desc="Select campus location: Student Activity Centre, Snackers, IT Building - Lab 1, Central Lawn, Mega Ground, MBH Ground, OAT, CSH, VCH, Science Block, Community Center, NITJ Temple, LT, Online, Department Building, or Other."
                />
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-md">
                  Step 2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Timings & Access Restrictions
                </span>
              </div>
              <div className="space-y-1">
                <FieldRow
                  name="Start Time"
                  required
                  type="Date & Time"
                  desc="When the event officially begins. Used by CampusNode to compute event status (Upcoming, Live, or Ended)."
                />
                <FieldRow
                  name="End Time"
                  required
                  type="Date & Time"
                  desc="Must be after the Start Time. When reached, the event automatically switches to 'Ended'."
                />
                <FieldRow
                  name="Registration Deadline"
                  type="Date & Time"
                  desc="Optional. Closes registration prior to event start. Must be before or equal to Start Time. If left blank, registrations remain open until start time."
                />
                <FieldRow
                  name="Allowed Programs"
                  required
                  type="Checkboxes"
                  desc="Select eligible academic programs: BTECH, MTECH, or OTHER. At least one program must be selected."
                />
                <FieldRow
                  name="Allowed Years"
                  type="Checkboxes / Toggle"
                  desc="Toggle 'Allow All Years' or select specific batches (1st Year, 2nd Year, 3rd Year, 4th Year, 5th Year)."
                />
                <FieldRow
                  name="Allowed Branches"
                  type="Checkboxes / Toggle"
                  desc="Toggle 'Allow All Branches' or choose specific engineering branches (CSE, IT, ME, CH, IPE, ICE, ECE, EE, BT, TT, CE)."
                />
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-md">
                  Step 3
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Registration & Payment Settings
                </span>
              </div>
              <div className="space-y-1">
                <FieldRow
                  name="Registration Type"
                  required
                  type="Dropdown Select"
                  desc="Choose between Individual Registration, Team Registration, or Both (Individual & Team)."
                />
                <FieldRow
                  name="Team Size Limits"
                  required
                  type="Min / Max Number Inputs"
                  desc="Appears when Team or Both is selected. Set Minimum Team Size (≥1) and Maximum Team Size (≥ Min Size)."
                />
                <FieldRow
                  name="Total Seats"
                  required
                  type="Number Input / Toggle"
                  desc="Specify maximum participant seat capacity, or toggle 'Unlimited Seats' for open registration events."
                />
                <FieldRow
                  name="Payment Method"
                  required
                  type="Radio Option Cards"
                  desc="Select event monetization mode: Free (no fee), Manual Transaction (scan QR code / UPI ID and verify UTR Transaction ID), or College Portal (coming soon)."
                />
                <FieldRow
                  name="Registration Fee (₹)"
                  type="Currency Input"
                  desc="Required for paid events (must be greater than ₹0). Defines amount each registrant or team must pay."
                />
                <FieldRow
                  name="Manual Payment Setup"
                  type="UPI ID & Instructions"
                  desc="Provide your club's UPI ID / Phone Number (e.g. clubname@upi), Account Holder Name, and custom instructions for student payment verification."
                />
                <FieldRow
                  name="Required Student Info"
                  type="Checkboxes"
                  desc="Require registrants to have completed profile links before submitting: GitHub Profile, LinkedIn Profile, X (Twitter) Profile, or Portfolio URL."
                />
                <FieldRow
                  name="Custom Registration Fields"
                  type="Dynamic Field Builder"
                  desc="Create Google-Forms style custom questions (Label, Type: Text, Link/URL, Long Text, Dropdown options, and Required toggle)."
                />
              </div>
            </div>

            <div className="pt-5 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 dark:bg-orange-950/60 text-orange-600 rounded-md">
                  Step 4
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Extras & Media Assets
                </span>
              </div>
              <div className="space-y-1">
                <FieldRow
                  name="Display Results / Winners"
                  type="Toggle Checkbox"
                  desc="Enable to feature an interactive winners/results section on the public event card upon completion."
                />
                <FieldRow
                  name="Digital Certificates"
                  type="Toggle Checkbox"
                  desc="Enable downloadable digital participation and achievement certificates for registered attendees."
                />
                <FieldRow
                  name="Sponsors"
                  type="Dynamic Sponsor Builder"
                  desc="Add event sponsors with Sponsor Name, Logo URL (https://...), and optional Website Link."
                />
                <FieldRow
                  name="Media Gallery Assets"
                  type="Dynamic Media Builder"
                  desc="Attach supplementary media links (Image, Video, or Sponsor Logo URLs) to display on the event showcase."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Custom Field Types */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
            <i className="ri-magic-line text-orange-600 text-xl" />
            Custom Registration Field Types
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
            Custom fields let you collect tailored information from students during registration. Here are the available field types:
          </p>
          <div className="overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Type</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Use Case</th>
                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
                  <tr>
                    <td className="px-5 py-3.5 font-semibold text-neutral-800 dark:text-neutral-200">Text</td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">Short single-line answers</td>
                    <td className="px-5 py-3.5 text-neutral-400 dark:text-neutral-500 italic">Team Name, Valorant Riot ID</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 font-semibold text-neutral-800 dark:text-neutral-200">Link / URL</td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">Validated HTTP/HTTPS web links</td>
                    <td className="px-5 py-3.5 text-neutral-400 dark:text-neutral-500 italic">GitHub Project Repo, Figma Design Link</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 font-semibold text-neutral-800 dark:text-neutral-200">Long Text</td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">Multi-line text area for details</td>
                    <td className="px-5 py-3.5 text-neutral-400 dark:text-neutral-500 italic">Project pitch summary, Why join us?</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3.5 font-semibold text-neutral-800 dark:text-neutral-200">Dropdown</td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-400">Select from custom options list</td>
                    <td className="px-5 py-3.5 text-neutral-400 dark:text-neutral-500 italic">T-Shirt Size (S, M, L, XL), Domain Choice</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="bg-neutral-900 text-white rounded-2xl p-6 md:p-8 mb-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16" />
          
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2.5 text-white relative z-10">
            <i className="ri-lightbulb-line text-amber-400 text-xl" />
            Pro Tips for Event Organizers
          </h2>
          <ul className="space-y-4 text-sm text-neutral-300 relative z-10">
            {[
              'Upload a clear 16:9 poster (under 5MB) for optimal display on mobile and desktop event cards.',
              'Set a registration deadline at least 2-3 hours prior to event start time to prepare participant lists.',
              'For manual UPI payments, double-check your UPI ID and provide precise instructions on where students can upload UTR numbers.',
              'Utilize team registrations for hackathons and set realistic min/max team bounds (e.g., 2 to 4 members).',
              'Enable "Digital Certificates" in Step 4 so attendees can download verified certificates after your event concludes.',
              'Add sponsor logos and links in Step 4 to highlight industry partners and improve event credibility.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <i className="ri-arrow-right-s-line text-orange-500 mt-0.5 flex-shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </div>
  );
};

/* Helper component for field rows */
const FieldRow = ({ name, required, type, desc, example }) => (
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 py-4 border-b border-neutral-100/70 dark:border-neutral-800/70">
    <div className="sm:w-48 flex-shrink-0">
      <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">{name}</span>
      {required && <span className="text-orange-600 ml-0.5">*</span>}
      <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mt-1">{type}</span>
    </div>
    <div className="flex-grow">
      <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{desc}</p>
      {example && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1.5 italic">
          Example: {example}
        </p>
      )}
    </div>
  </div>
);

export default EventGuide;
