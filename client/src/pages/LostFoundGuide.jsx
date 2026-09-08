import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const LostFoundGuide = () => {
    const navigate = useNavigate();
    const { isDark } = useTheme();

    const sections = [
        {
            title: "General Scope & Guidelines",
            content: [
                "Only post items that were lost or found within the campus premises.",
                "Ensure titles are clear and descriptive (e.g., 'Blue Water Bottle at Library' instead of just 'Lost').",
                "Be honest and accurate in your descriptions — include location, time, and any unique identifying marks.",
                "Avoid posting duplicate entries for the same item.",
                "Each user is limited to 2 posts per day to prevent spam."
            ]
        },
        {
            title: "Reunited Items Policy",
            content: [
                "Once an item is marked as 'Reunited', it will remain visible on the platform for 24 hours as a success story.",
                "After 24 hours, reunited posts are automatically removed from the public feed.",
                "Reunited items appear with a reduced overlay so the original image stays visible as a reference.",
                "Only the original poster can mark their item as reunited.",
                "This policy helps keep the feed clean while celebrating successful reunifications."
            ]
        },
        {
            title: "Safety & Privacy",
            content: [
                "Never share sensitive personal information like bank details, home addresses, or ID numbers.",
                "Arrange item handovers in well-lit, public areas on campus (e.g., security desk, student center, library entrance).",
                "Verify the ownership of an item by asking for specific details not mentioned in the post.",
                "WhatsApp numbers shared in posts are optional and visible only to verified claimants.",
                "CampusNode does not store or share your contact information with third parties."
            ]
        },
        {
            title: "Enforcement & Punitive Measures",
            content: [
                "Fraudulent posts will be immediately flagged and removed upon receiving 3 or more community reports.",
                "Users attempting to scam others will face a 7-day suspension from the Lost & Found portal.",
                "Users reported for false claiming by a poster will have their account permanently restricted.",
                "Submitting 2 false reports will result in a 2-day suspension from the Lost & Found portal.",
                "Users submitting reports every day or abusing the system will be automatically blocked.",
                "Providing false contact information is grounds for a temporary suspension.",
                "Repeated violations of guidelines will lead to a total account block on CampusNode."
            ]
        },
        {
            title: "Prohibited Actions",
            content: [
                "Posting illegal, restricted, or contraband items.",
                "Using the platform for promotional, commercial, or advertising purposes.",
                "Harassing, threatening, or spamming users who have posted items.",
                "Impersonating authorities, staff, or other students.",
                "Filing false claims on items you know do not belong to you — this may result in permanent restriction.",
                "Attempting to manipulate the reporting system to get other users blocked."
            ]
        },
        {
            title: "Terms of Use",
            content: [
                "By using the Lost & Found feature, you agree to abide by all community guidelines listed on this page.",
                "CampusNode reserves the right to remove any post or restrict any account at its sole discretion.",
                "All interactions between users (claims, handovers, communications) are conducted at your own risk.",
                "CampusNode does not guarantee the return of any lost item or the accuracy of any posted information.",
                "These terms may be updated at any time. Continued use of the platform constitutes acceptance of the latest terms.",
                "Users must be verified members of the CampusNode community to post or claim items."
            ]
        }
    ];

    return (
        <div className="min-h-screen myfont bg-neutral-50 dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-100 transition-colors duration-300 pb-20">
            <div className="bg-white/80 dark:bg-zinc-900/80 border-b border-neutral-200/90 dark:border-zinc-800/90 sticky top-0 z-50 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-2xs"
                        aria-label="Go Back"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold tracking-tight uppercase text-neutral-900 dark:text-neutral-100">Rules & Regulations Directory</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
                {/* Hero / Document Identity */}
                <div className="mb-10">
                    <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
                        LOST & FOUND PORTAL REGULATIONS
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-3xl leading-relaxed">
                        This directory constitutes the formal operating rules and community guidelines governing the Lost & Found platform. Compliance with all sections documented herein is mandatory for all members of the CampusNode community.
                    </p>
                </div>

                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <div 
                            key={idx} 
                            className="bg-white dark:bg-zinc-900/80 border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl p-6 md:p-8 shadow-2xs"
                        >
                            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-wide border-b border-neutral-100 dark:border-zinc-800/80 pb-3 mb-5 uppercase">
                                Section {idx + 1}: {section.title}
                            </h3>
                            <ul className="space-y-4">
                                {section.content.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="text-neutral-900 dark:text-neutral-300 font-bold text-sm select-none shrink-0 min-w-[28px]">
                                            {idx + 1}.{i + 1}
                                        </span>
                                        <span className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Asymmetric Liability & Legal Disclaimer */}
                <div className="mt-12 p-6 md:p-8 rounded-2xl bg-white dark:bg-zinc-900/80 border border-neutral-200/90 dark:border-zinc-800/90 border-l-4 !border-l-brand-500 dark:!border-l-brand-400 shadow-2xs">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
                            Liability & Legal Disclaimer
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 block">No Liability</span>
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                                CampusNode acts solely as a communication platform. We are not responsible for any transactions, lost items, damages, or interactions between users.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 block">No Warranty</span>
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                                We do not guarantee the accuracy, completeness, or reliability of any information posted by users on this platform.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 block">User Responsibility</span>
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                                Users are solely responsible for verifying the identity of claimants and the authenticity of all claims before handing over any item.
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 block">Data Usage</span>
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                                Information collected through Lost & Found posts is used exclusively for facilitating item reunification and community safety. Please exercise caution.
                            </p>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-neutral-200 block">Appeals & Support</span>
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed">
                                If you believe your account was restricted falsely or you are unable to access the platform, reach out to the admin support team via email at{' '}
                                <a href="mailto:clubsetu@nikhim.me" className="underline font-semibold hover:text-brand-600 transition-colors">
                                    clubsetu@nikhim.me
                                </a>
                                .
                            </p>
                        </div>
                    </div>
                </div>

                {/* Last Updated */}
                <p className="text-center mt-10 text-xs text-gray-400 dark:text-neutral-600">
                    Last updated: July 2026 · CampusNode v2.0
                </p>
            </div>
        </div>
    );
};

export default LostFoundGuide;
