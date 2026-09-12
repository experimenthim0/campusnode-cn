import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const TermsAndConditions = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-cn-bg text-cn-text py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-cn-text-muted hover:text-cn-text uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        <i className="ri-arrow-left-line text-sm" /> Back
                    </button>
                    <span className="text-[11px] font-mono font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Last updated: July 2026 · v2.0
                    </span>
                </div>

                {/* Hero / Title Section */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cn-blue-50 dark:bg-cn-blue-950/40 border border-cn-blue-200/60 dark:border-cn-blue-900/40 text-cn-blue-600 dark:text-cn-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <i className="ri-file-text-line text-sm" /> Terms of Service
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                        Terms <span className="text-brand-600">&amp;</span> Conditions
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-3 text-sm md:text-base leading-relaxed max-w-2xl">
                        Please review the rules and agreements governing your use of Campus<span className="text-brand-500 dark:text-brand-400 font-semibold">Node</span>, event registrations, and community interactions across NIT Jalandhar.
                    </p>
                </div>

                <div className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-cn-blue-500/10 dark:bg-cn-blue-500/15 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center text-2xl shrink-0">
                            <i className="ri-scales-3-line" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                                Agreement &amp; Code of Conduct
                            </h2>
                            <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                By creating an account or accessing events on CampusNode, you agree to comply with institutional policies, maintain honest event registrations, and treat fellow campus members with respect.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">

                    {/* Section 1: Acceptance */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">1</span>
                            Acceptance of Terms
                        </h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            By accessing, browsing, or registering for events via CampusNode, you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions. If you do not accept these terms, you should discontinue using the platform immediately.
                        </p>
                    </section>

                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">2</span>
                            User Accounts &amp; Student Credentials
                        </h2>
                        <ul className="space-y-2.5 text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
                            <li className="flex items-start gap-2.5">
                                <i className="ri-checkbox-circle-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Authentic Information:</strong> You must register using valid NITJ credentials (official email, roll number, department details).</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <i className="ri-checkbox-circle-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Account Security:</strong> You are responsible for keeping your account password secure. Sharing credentials or creating duplicate proxy accounts is prohibited.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <i className="ri-checkbox-circle-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Account Suspension:</strong> CampusNode reserves the right to restrict or terminate accounts violating institutional rules or community standards.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 3: Event Registration */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">3</span>
                            Event Registration &amp; Participation
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3">
                            <div className="p-4 rounded-xl bg-cn-surface-muted border border-cn-border-subtle">
                                <h3 className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <i className="ri-ticket-line text-cn-blue-600 dark:text-cn-blue-400" /> Attendance Commitment
                                </h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Registering for limited-seat workshops or contests is a commitment to attend. If you cannot make it, deregister promptly to free seats for waitlisted peers.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-cn-surface-muted border border-cn-border-subtle">
                                <h3 className="font-semibold text-xs text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <i className="ri-filter-3-line text-cn-blue-600 dark:text-cn-blue-400" /> Eligibility Criteria
                                </h3>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    Events may specify year or program requirements (e.g. BTech/MTech). Attempting to bypass eligibility filters will result in registration cancellation.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 4: Club Heads & Organizers */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">4</span>
                            Club Heads &amp; Event Organizers
                        </h2>
                        <ul className="space-y-2.5 text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
                            <li className="flex items-start gap-2.5">
                                <i className="ri-shield-check-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Content Accuracy:</strong> Club heads are solely responsible for ensuring event schedules, descriptions, venue details, and entry fees are accurate.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <i className="ri-shield-check-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Data Handling:</strong> Participant information must be used strictly for event execution and never disclosed to unauthorized parties.</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                                <i className="ri-shield-check-line text-cn-blue-600 dark:text-cn-blue-400 mt-0.5 shrink-0" />
                                <span><strong>Campus Guidelines:</strong> All published events must adhere strictly to NIT Jalandhar institutional rules and code of conduct.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 5: Prohibited Activities */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">5</span>
                            Prohibited Activities
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
                            <div className="p-3 bg-cn-surface-muted rounded-xl border border-cn-border-subtle flex items-center gap-2.5">
                                <i className="ri-forbid-2-line text-red-500 text-base shrink-0" />
                                <span>Creating fake events or spam content</span>
                            </div>
                            <div className="p-3 bg-cn-surface-muted rounded-xl border border-cn-border-subtle flex items-center gap-2.5">
                                <i className="ri-forbid-2-line text-red-500 text-base shrink-0" />
                                <span>Manipulating registration counts or payment references</span>
                            </div>
                            <div className="p-3 bg-cn-surface-muted rounded-xl border border-cn-border-subtle flex items-center gap-2.5">
                                <i className="ri-forbid-2-line text-red-500 text-base shrink-0" />
                                <span>Harassing organizers or fellow participants</span>
                            </div>
                            <div className="p-3 bg-cn-surface-muted rounded-xl border border-cn-border-subtle flex items-center gap-2.5">
                                <i className="ri-forbid-2-line text-red-500 text-base shrink-0" />
                                <span>Unauthorized commercial advertising or solicitation</span>
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Limitation of Liability */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">6</span>
                            Limitation of Liability
                        </h2>
                        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            CampusNode is provided on an "as is" and "as available" basis. While we strive to maintain uninterrupted uptime, we are not liable for unannounced event cancellations, venue schedule shifts, or third-party network interruptions.
                        </p>
                    </section>

                    {/* Section 7: Updates */}
                    <section className="bg-cn-surface border border-cn-border rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">7</span>
                            Modifications to Terms
                        </h2>
                        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            We reserve the right to modify or update these terms periodically. Continued platform usage following published revisions constitutes acceptance of the modified Terms &amp; Conditions.
                        </p>
                    </section>

                    {/* Section 8: Contact */}
                    <section className="bg-cn-surface-elevated text-cn-text border border-cn-border rounded-2xl p-6 md:p-8 shadow-md">
                        <h2 className="text-base font-bold mb-2 flex items-center gap-2">
                            <i className="ri-mail-line text-cn-blue-500 text-lg" /> Terms &amp; Policy Inquiries
                        </h2>
                        <p className="text-xs md:text-sm text-cn-text-muted leading-relaxed mb-4">
                            For questions regarding our terms of service, governance, or institutional inquiries:
                        </p>
                        <a
                            href="mailto:contact.nikhim@gmail.com"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:-translate-y-0.5"
                        >
                            <i className="ri-send-plane-line" /> Email CampusNode Team
                        </a>
                    </section>

                </div>

                <div className="mt-10 text-center text-xs text-neutral-400 dark:text-neutral-600">
                    <p>CampusNode · NIT Jalandhar Student Portal</p>
                </div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
