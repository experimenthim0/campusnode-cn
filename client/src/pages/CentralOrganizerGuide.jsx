import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  QrCode,
  Users,
  Award,
  Bell,
  BarChart3,
  Calendar,
  Layers,
  FileText,
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  History,
  Lock,
  PlusCircle,
} from "lucide-react";

const CentralOrganizerGuide = () => {
  return (
    <div className="min-h-screen bg-cn-bg py-12 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <Link
            to="/central-organizer"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline mb-4"
          >
            <ArrowLeft size={14} /> Back to Central Organizer Dashboard
          </Link>
          <div className="flex items-center gap-2 mb-2 text-brand-600">
            <span className="block w-6 h-[1px] bg-brand-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Official Manual</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
            Central Organizer <span className="text-brand-600">Dashboard Guide</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2 max-w-2xl text-sm md:text-base leading-relaxed">
            Complete operational manual for managing institute-level events under the Dean Student Welfare (DSW) office, delegating staff, linking co-hosting clubs, and running on-ground logistics.
          </p>
        </div>

        {/* Section 1: DSW Institutional Account Architecture */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white font-bold text-base">
            <Building2 className="text-brand-600" size={20} />
            <h2>1. DSW Institutional Account Architecture</h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-xs sm:text-sm">
            Central Events (e.g., Freshers' Induction, Utkansh, Bharat Dhwani, Hackathons, Youth Festivals) represent institute-wide functions under the <strong className="text-neutral-900 dark:text-neutral-100">Dean Student Welfare (DSW) Office</strong> (<code className="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-1.5 py-0.5 rounded text-xs">odsw@nitj.ac.in</code>).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <p className="text-[11px] font-bold text-neutral-900 dark:text-white">Institutional Entity</p>
              <p className="text-[11px] text-neutral-500 mt-1">Events are owned by DSW, decoupled from any single student or club login.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <p className="text-[11px] font-bold text-neutral-900 dark:text-white">Scoped Student Delegation</p>
              <p className="text-[11px] text-neutral-500 mt-1">Students retain their normal student account while receiving granular DSW permissions.</p>
            </div>
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <p className="text-[11px] font-bold text-neutral-900 dark:text-white">Cross-Scope Isolation</p>
              <p className="text-[11px] text-neutral-500 mt-1">Central Organizers cannot alter club memberships, and clubs cannot alter central events.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Creating & Managing Central Events */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white font-bold text-base">
            <Calendar className="text-brand-600" size={20} />
            <h2>2. Creating & Publishing Events (Events Tab)</h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-xs sm:text-sm">
            Central organizers with <strong className="text-neutral-800 dark:text-neutral-200">Manage Events</strong> capability can draft, edit, publish, and delete events directly from the dashboard:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 list-disc pl-5">
            <li><strong>Eligibility Filters:</strong> Restrict participation by academic year (1st, 2nd, 3rd, 4th year) and engineering branch, or leave open institute-wide.</li>
            <li><strong>Registration Deadlines & Venues:</strong> Set automated cutoff times and assign campus venues (Auditorium, Open Air Theatre, IT Labs).</li>
            <li><strong>Publishing Status:</strong> Events remain in Draft mode until published to the campus feed.</li>
          </ul>
        </section>

        {/* Section 3: Event Staff Delegation Matrix */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white font-bold text-base">
            <Users className="text-brand-600" size={20} />
            <h2>3. Event Staff Delegation (Staff Tab)</h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
            Organizers can invite registered students as on-ground operators. Staff members use their own CampusNode account to access the <Link to="/event-staff" className="text-brand-600 hover:underline font-semibold">Event Staff Portal</Link>.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <QrCode size={15} className="text-brand-600" />
                Attendance Operator
              </div>
              <p className="text-[11px] text-neutral-500">
                Grants high-speed camera QR code scanner and roll-number check-in tools to register student arrivals.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <FileText size={15} className="text-brand-600" />
                Registration Operator
              </div>
              <p className="text-[11px] text-neutral-500">
                Allows inspecting attendee lists, verifying student identification, and handling on-spot registrations.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <Award size={15} className="text-brand-600" />
                Certificate Operator
              </div>
              <p className="text-[11px] text-neutral-500">
                Authorizes generating and issuing digitally verifiable certificates to verified attendees.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <Bell size={15} className="text-brand-600" />
                Announcement Operator
              </div>
              <p className="text-[11px] text-neutral-500">
                Allows broadcasting push notifications and venue/schedule updates directly to registered students.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <BarChart3 size={15} className="text-brand-600" />
                Analytics Viewer
              </div>
              <p className="text-[11px] text-neutral-500">
                Provides read-only access to live participation charts, branch breakdowns, and check-in rates.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
              <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-xs mb-1">
                <Calendar size={15} className="text-brand-600" />
                Event Manager
              </div>
              <p className="text-[11px] text-neutral-500">
                Assists the lead organizer with schedules, logistics, and coordinating on-ground operations.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Participating Clubs Co-Hosting */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white font-bold text-base">
            <Layers className="text-brand-600" size={20} />
            <h2>4. Co-Hosting with Student Clubs (Clubs Tab)</h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-xs sm:text-sm">
            Central events can be co-hosted with multiple registered student clubs (e.g. Fine Arts Club, Music Society, Robotics Club):
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 list-disc pl-5">
            <li>Select any active club from the dropdown to link them as an official collaborating organizer.</li>
            <li>Collaborating clubs are displayed on the public event page with their official badge and branding.</li>
            <li>Central authority remains securely with the DSW account.</li>
          </ul>
        </section>

        {/* Section 5: Audit & Accountability */}
        <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5 text-neutral-900 dark:text-white font-bold text-base">
            <History className="text-brand-600" size={20} />
            <h2>5. Institutional Audit Logs (Audit Tab)</h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-xs sm:text-sm">
            Every critical action within the Central Organizer workspace is permanently recorded in the immutable audit log:
          </p>
          <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-500 space-y-1.5">
            <p>• <strong>Staff Invitations & Revocations:</strong> Tracks which organizer granted or revoked operator capabilities.</p>
            <p>• <strong>Event Updates & Publishing:</strong> Records changes in dates, venues, or status.</p>
            <p>• <strong>Club Co-Host Links:</strong> Records linking and unlinking of participating student clubs.</p>
          </div>
        </section>

        <div className="text-center pt-4">
          <Link
            to="/central-organizer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
          >
            Open Central Organizer Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CentralOrganizerGuide;

