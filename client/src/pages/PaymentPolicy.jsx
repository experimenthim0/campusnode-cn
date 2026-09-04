import React from 'react';
import { Link } from 'react-router-dom';

const PaymentPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white uppercase tracking-widest mb-8 transition-colors">
                <i className="ri-arrow-left-line" /> Back to Home
            </Link>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-8 md:p-12 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-500/10 dark:bg-green-500/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                        <i className="ri-bank-card-line text-xl" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">Payment Policy</h1>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest mb-8">Last updated: July 2026</p>

                <div className="space-y-8 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">1. Payment Processing</h2>
                        <p>All registration payments on CampusNode are conducted externally. Verification of these payments is managed manually by the organizing club's management. We support two primary methods of payment:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1.5">
                            <li><strong>Direct UPI Transfers:</strong> Payments can be scanned and processed via dynamically generated QR codes or direct mobile app deep links.</li>
                            <li><strong>Official College Portal:</strong> Redirect link to the official college portal where fees are settled externally.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">2. Transaction Verification</h2>
                        <p>To confirm your seat or team registration, you must provide proof of the transaction:</p>
                        <ul className="list-disc pl-6 mt-2 space-y-1.5">
                            <li><strong>For UPI Transactions:</strong> You are required to submit the official 12-digit UPI Transaction ID / UTR along with the account holder's name.</li>
                            <li><strong>For College Portal Payments:</strong> You must check the payment completion checkbox to signify portal checkout completion.</li>
                            <li>Clubs review these details on their dashboards to approve or waitlist registrations. Incorrect transaction details may result in cancellation.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">3. Data Security & Privacy</h2>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li>CampusNode does <strong>not</strong> process, request, or store credit card details, CVVs, netbanking passwords, or UPI PINs.</li>
                            <li>We only collect transaction reference numbers (Transaction IDs, Payer Names, and optional Remarks) for verification and bookkeeping purposes.</li>
                            <li>This verification data is shared exclusively with the respective event organizers and administrators.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">4. Refunds and Cancellations</h2>
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-250 dark:border-yellow-900/40 rounded-xl p-4 mb-4">
                            <p className="text-yellow-850 dark:text-yellow-400 font-semibold text-sm flex items-center gap-1.5">
                                <i className="ri-information-line" /> Important Notice
                            </p>
                            <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1 leading-relaxed">
                                CampusNode is a platform for listing and verifying events. We do not act as an escrow or payment gateway. All refund settlements are handled directly by the organizing club's management.
                            </p>
                        </div>
                        <ul className="list-disc pl-6 space-y-1.5">
                            <li>Refund rules for paid entries are at the sole discretion of the organizing club.</li>
                            <li>If an event is cancelled by the club, the organizers are responsible for processing refunds directly.</li>
                            <li>For disputes or refund requests, please contact the respective club leads or mail <a href="mailto:clubsetu@nikhim.me" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">clubsetu@nikhim.me</a>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">5. Failed Transactions</h2>
                        <p>If money was deducted from your account but your registration remains unverified, please check with the club coordinator first. You may also contact us at <a href="mailto:clubsetu@nikhim.me" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">clubsetu@nikhim.me</a> with your email, roll number, and transaction UTR receipt for assistance.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PaymentPolicy;
