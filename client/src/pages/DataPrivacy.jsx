import React from 'react';
import { Link } from 'react-router-dom';

const DataPrivacy = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-black uppercase tracking-widest mb-8">
                <i className="ri-arrow-left-line" /> Back to Home
            </Link>

            <div className="bg-white border-2 border-black rounded-sm shadow-[6px_6px_0px_#0D0D0D] p-8 md:p-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-sm flex items-center justify-center">
                        <i className="ri-database-2-line text-white text-xl" />
                    </div>
                    <h1 className="text-3xl font-black text-black tracking-tight">Data Privacy Rules</h1>
                </div>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest mb-8">Last updated: MARCH 2026</p>

                <div className="space-y-8 text-sm text-neutral-700 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-black text-black mb-3">1. What Data We Store</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-neutral-100">
                                        <th className="border-2 border-neutral-200 px-4 py-2 text-left font-bold text-black">Data Type</th>
                                        <th className="border-2 border-neutral-200 px-4 py-2 text-left font-bold text-black">Purpose</th>
                                        <th className="border-2 border-neutral-200 px-4 py-2 text-left font-bold text-black">Visible To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Name, Roll No, Email</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Account identification & communication</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Event organizers (upon registration)</td>
                                    </tr>
                                    <tr className="bg-neutral-50">
                                        <td className="border-2 border-neutral-200 px-4 py-2">Branch, Year, Program</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Eligibility verification</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Event organizers (upon registration)</td>
                                    </tr>
                                    <tr>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Social Profiles</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Optional networking information</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Event organizers (upon registration)</td>
                                    </tr>
                                    <tr className="bg-neutral-50">
                                        <td className="border-2 border-neutral-200 px-4 py-2">Custom Form Responses</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Event-specific data collection</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Respective event organizer only</td>
                                    </tr>
                                    <tr>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Payment Transaction IDs</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Payment verification & audit</td>
                                        <td className="border-2 border-neutral-200 px-4 py-2">Platform admin only</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">2. Data Storage & Security</h2>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li>All data is stored in secure MongoDB databases with encryption at rest.</li>
                            <li>Passwords are hashed using industry-standard algorithms and never stored in plain text.</li>
                            <li>HTTPS encryption is used for all data transmission.</li>
                            <li>Access to the database is restricted to authorized personnel only.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">3. Data Access by Event Organizers</h2>
                        <div className="bg-brand-50 border-2 border-brand-300 rounded-sm p-4 mb-3">
                            <p className="text-brand-800 font-bold text-sm"><i className="ri-alert-line mr-1" /> For Club Heads</p>
                            <p className="text-brand-700 text-xs mt-1">You may only use participant data for the purpose of managing your event. Sharing, selling, or misusing participant data is strictly prohibited and may result in account termination.</p>
                        </div>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li>Club heads can view registrant information only for their own events.</li>
                            <li>Data export (Excel) is provided for event management purposes only.</li>
                            <li>Club heads must not retain participant data beyond the event lifecycle.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">4. Data Retention</h2>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li>Account data is retained as long as your account is active.</li>
                            <li>Event registration data is retained for record-keeping and audit purposes.</li>
                            <li>You may request deletion of your account and all associated data at any time.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">5. Third-Party Services</h2>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li><strong>Manual Verification:</strong> Payment reference details are securely shared with and verified directly by the organizing clubs.</li>
                            <li>We do not sell or share your data with any other third-party services for marketing purposes.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">6. Your Data Rights</h2>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li><strong>Right to Access:</strong> View your data through your profile page.</li>
                            <li><strong>Right to Correction:</strong> Update your information via profile settings.</li>
                            <li><strong>Right to Deletion:</strong> Request complete account and data removal.</li>
                            <li><strong>Right to Portability:</strong> Request an export of your personal data.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-black text-black mb-3">7. Contact</h2>
                        <p>For any data privacy concerns, contact our data protection team at <a href="mailto:contact.nikhim@gmail.com" className="text-brand-600 font-bold hover:underline">contact.nikhim@gmail.com</a>.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DataPrivacy;
