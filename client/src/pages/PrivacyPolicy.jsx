import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <button 
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        <i className="ri-arrow-left-line text-sm" /> Back
                    </button>
                    <span className="text-[11px] font-mono font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                        Last updated: July 2026 · v2.0
                    </span>
                </div>

                {/* Hero / Title Section */}
                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-orange-600 dark:text-orange-400 text-xs font-semibold uppercase tracking-wider mb-4">
                        <i className="ri-shield-keyhole-line text-sm" /> Legal &amp; Data Security
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                        Privacy <span className="text-orange-600">Policy</span>
                    </h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-3 text-sm md:text-base leading-relaxed max-w-2xl">
                        At Campus<span className="text-orange-600 font-semibold">Node</span>, we prioritize student data protection, transparency, and security across all features and event registrations.
                    </p>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-600/10 dark:bg-orange-500/15 text-orange-600 flex items-center justify-center text-2xl shrink-0">
                            <i className="ri-shield-check-line" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                                Our Privacy Commitment
                            </h2>
                            <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                We collect only the information necessary to facilitate event registrations, club activities, and campus communication. We do not sell student data to third parties, and all credentials are encrypted using industry standards.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">

                    {/* Section 1: Introduction */}
                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">1</span>
                            Introduction
                        </h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            Welcome to CampusNode ("we", "our", or "us"). This Privacy Policy outlines how your personal information is gathered, managed, and safeguarded when you access our web application, register for events, or participate in campus communities at NIT Jalandhar.
                        </p>
                    </section>

                    {/* Section 2: Data Collection Table */}
                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">2</span>
                            Information We Collect
                        </h2>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed">
                            We collect data that you provide voluntarily when setting up your profile or participating in events:
                        </p>

                        <div className="overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Category</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Details Collected</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Primary Purpose</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs md:text-sm">
                                        <tr>
                                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">Account Credentials</td>
                                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">Name, NITJ Email, Roll Number, Branch, Year, Program</td>
                                            <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">Student verification &amp; eligibility checks</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">Profile Links</td>
                                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">GitHub, LinkedIn, X (Twitter), Portfolio URL</td>
                                            <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">Optional developer/participant showcase</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">Event Responses</td>
                                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">Answers to custom questions created by organizers</td>
                                            <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">Event-specific team &amp; logistics management</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">Payment References</td>
                                            <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">Transaction UTR IDs, payment screenshots</td>
                                            <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">Manual payment verification by club heads</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Usage */}
                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">3</span>
                            How We Use Your Information
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {[
                                { icon: 'ri-calendar-check-line', text: 'Facilitating seamless event registration & attendance verification.' },
                                { icon: 'ri-money-dollar-circle-line', text: 'Enabling club heads to manually verify fee payments for paid events.' },
                                { icon: 'ri-notification-3-line', text: 'Sending timely event updates, venue shifts, or schedule changes.' },
                                { icon: 'ri-user-star-line', text: 'Allowing club heads to manage registered participants and teams.' },
                            ].map((item, index) => (
                                <div key={index} className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-800/60 flex items-start gap-3">
                                    <i className={`${item.icon} text-orange-600 text-lg mt-0.5 shrink-0`} />
                                    <span className="text-xs md:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">4</span>
                            Information Sharing &amp; Organizer Obligations
                        </h2>
                        
                        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300 font-bold text-xs uppercase tracking-wider mb-1">
                                <i className="ri-shield-flash-line text-orange-600" /> Organizer Data Scope
                            </div>
                            <p className="text-xs text-orange-900/80 dark:text-orange-200/80 leading-relaxed">
                                When you register for an event, authorized Club Heads can view your name, roll number, contact details, and submitted form answers solely for event coordination. Club Heads are strictly bound against exporting or distributing data outside the platform.
                            </p>
                        </div>

                        <ul className="space-y-2.5 text-xs md:text-sm text-neutral-600 dark:text-neutral-400">
                            <li className="flex items-start gap-2">
                                <i className="ri-checkbox-circle-fill text-orange-600 mt-0.5 shrink-0" />
                                <span><strong>No Third-Party Sales:</strong> We never sell, rent, or trade your personal data to commercial advertisers or data brokers.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="ri-checkbox-circle-fill text-orange-600 mt-0.5 shrink-0" />
                                <span><strong>Institutional Compliance:</strong> Information may be shared with institute administration only if explicitly mandated by campus authorities or legal inquiries.</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 5: Security */}
                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">5</span>
                            Data Security Standards
                        </h2>
                        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                            We employ modern technical measures including HTTPS encryption, secure session tokens, role-based database access, and password hashing to defend student accounts against unauthorized access.
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50">
                                HTTPS Encrypted
                            </div>
                            <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50">
                                Bcrypt Hashing
                            </div>
                            <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50">
                                Strict RBAC
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Rights */}
                    <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center">6</span>
                            Your Privacy Rights
                        </h2>
                        <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-3">
                            You maintain full control over your stored credentials and profile:
                        </p>
                        <ul className="space-y-2 text-xs md:text-sm text-neutral-600 dark:text-neutral-400 list-disc pl-5">
                            <li>View and update your academic details, social handles, and avatar via <Link to="/profile/edit" className="text-orange-600 font-semibold hover:underline">Profile Settings</Link>.</li>
                            <li>Request account deactivation or data removal by contacting system admins.</li>
                        </ul>
                    </section>

                    {/* Section 7: Contact */}
                    <section className="bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl p-6 md:p-8 shadow-md">
                        <h2 className="text-base font-bold mb-2 flex items-center gap-2">
                            <i className="ri-mail-line text-orange-500 text-lg" /> Questions &amp; Support
                        </h2>
                        <p className="text-xs md:text-sm text-neutral-400 leading-relaxed mb-4">
                            If you have concerns about data privacy or wish to report a security issue, reach out to our team directly:
                        </p>
                        <a 
                            href="mailto:contact.nikhim@gmail.com" 
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:-translate-y-0.5"
                        >
                            <i className="ri-send-plane-line" /> Contact Privacy Officer
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

export default PrivacyPolicy;
