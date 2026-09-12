import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail, 
  User, 
  Lightbulb, 
  MessageSquare,
  HelpCircle,
  Bug,
  Handshake,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Users
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbh0efq5670_uTsHNXei5ItQS-JYhNIsoaM2DkfTchaumsn1nrTPRfgCukN5dISMnJ/exec";

const CATEGORIES = [
  { id: 'suggestion', label: 'Suggestion & Feedback', icon: Lightbulb, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' },
  { id: 'questions', label: 'General Questions', icon: HelpCircle, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40' },
  { id: 'support', label: 'Platform Support', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40' },
  { id: 'bugs', label: 'Bug Report', icon: Bug, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40' },
  { id: 'partnerships', label: 'Partnerships & Collaboration', icon: Handshake, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40' },
  { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck, color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/40' },
];

const Contact = () => {
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'suggestion',
    subject: '',
    suggestion: '',
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    document.title = "Contact Us & Suggestions | CampusNode";
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || storedUser.name || '',
          email: prev.email || storedUser.email || '',
        }));
      }
    } catch (err) {
      console.warn('[Contact] Could not parse stored user:', err);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategorySelect = (categoryId) => {
    setFormData((prev) => ({ ...prev, category: categoryId }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Please enter your name';
    }
    if (!formData.email.trim()) {
      errors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    if (!formData.suggestion.trim()) {
      errors.suggestion = 'Please describe your inquiry or suggestion';
    } else if (formData.suggestion.trim().length < 5) {
      errors.suggestion = 'Content should be at least 5 characters long';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('submitting');
    setErrorMessage('');

    const targetUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || DEFAULT_SCRIPT_URL;

    try {
      const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      const nameVal = formData.name.trim();
      const emailVal = formData.email.trim();
      const selectedCategoryObj = CATEGORIES.find(c => c.id === formData.category);
      const categoryLabel = selectedCategoryObj ? selectedCategoryObj.label : formData.category;
      const subjectVal = formData.subject.trim();
      const contentVal = formData.suggestion.trim();

      const compositeContent = `[${categoryLabel}]${subjectVal ? ` ${subjectVal}: ` : ' '}${contentVal}`;

      const params = new URLSearchParams();
      params.append('timestamp', timestamp);
      params.append('name', nameVal);
      params.append('email', emailVal);
      params.append('category', categoryLabel);
      params.append('subject', subjectVal);
      params.append('suggestion', compositeContent);
      params.append('description', compositeContent);
      params.append('description/suggestion', compositeContent);

      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      setStatus('success');
      showNotification('Thank you! Your message has been sent.', 'success');
    } catch (err) {
      console.error('[Contact] Failed to submit form:', err);
      setStatus('error');
      setErrorMessage('Failed to send your message. Please try again or email us directly.');
      showNotification('Submission failed. Please try again.', 'error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setFormData((prev) => ({
      ...prev,
      subject: '',
      suggestion: '',
      category: 'suggestion',
    }));
    setFormErrors({});
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950/50 text-neutral-900 dark:text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Get in touch
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-4 leading-tight">
            Talk to a human.
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed">
            Questions, support, privacy, bugs, partnerships — one inbox, read by people who build <span className="font-semibold text-neutral-900 dark:text-white">Campusnode</span>.
          </p>
        </div>

        {/* Club Inquiries Notice Banner */}
        <div className="mb-10 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Looking for club events, recruitments, or permissions?
              </h3>
              <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                <strong className="font-bold underline">For club related queries contact that club only.</strong> Each club manages their own events, workshops, and registrations independently.
              </p>
            </div>
          </div>
          <Link
            to="/clubs"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-amber-900/80 hover:bg-amber-100 dark:hover:bg-amber-800/80 border border-amber-300 dark:border-amber-700/80 px-4 py-2 rounded-xl transition-all duration-200 shrink-0 shadow-2xs hover:shadow-xs"
          >
            Find Clubs & Leads <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Main Grid: Form + Direct Channels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Form Container (2 Columns) */}
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs">
            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">
                  Message Delivered!
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-8 leading-relaxed">
                  Thank you for reaching out. Your feedback and query has been routed straight to our development team. We review every single note.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                  >
                    Send Another Note
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                    Send us a message or suggestion
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                    Have an idea to improve CampusNode, discovered a glitch, or want to partner with us? Let us know below.
                  </p>
                </div>

                {/* Query Category Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2.5">
                    What is this regarding?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl text-left border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'border-brand-600 dark:border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 shadow-2xs'
                              : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-neutral-400'}`} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Your Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-neutral-50/50 dark:bg-neutral-950/50 border transition-all ${
                          formErrors.name
                            ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-neutral-200/80 dark:border-neutral-800 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                        } outline-none`}
                      />
                    </div>
                    {formErrors.name && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                      Your Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="student@nitj.ac.in"
                        className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm bg-neutral-50/50 dark:bg-neutral-950/50 border transition-all ${
                          formErrors.email
                            ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-neutral-200/80 dark:border-neutral-800 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                        } outline-none`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Subject / Short Title <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Idea for calendar sync / Question about certificates"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-neutral-50/50 dark:bg-neutral-950/50 border border-neutral-200/80 dark:border-neutral-800 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>

                {/* Detailed Description / Suggestion */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Description / Details <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    name="suggestion"
                    value={formData.suggestion}
                    onChange={handleChange}
                    placeholder="Provide details, suggestions, steps to reproduce a bug, or questions you have..."
                    className={`w-full p-3.5 rounded-xl text-sm bg-neutral-50/50 dark:bg-neutral-950/50 border transition-all resize-none ${
                      formErrors.suggestion
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                        : 'border-neutral-200/80 dark:border-neutral-800 focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
                    } outline-none`}
                  />
                  {formErrors.suggestion && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" /> {formErrors.suggestion}
                    </p>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending to CampusNode…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Sidebar / Direct Contact Channels */}
          <div className="space-y-4">

            {/* Email Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Direct Email
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
                Prefer to write an email directly from your client? Feel free to ping our core team.
              </p>
              <a
                href="mailto:clubsetu@nikhim.me"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                clubsetu@nikhim.me <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Club Specific Inquiries */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Club & Event Queries
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3 leading-relaxed">
                Need to reach club coordinators or event managers? Contact that club directly on their club profile.
              </p>
              <Link
                to="/clubs"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                Explore Student Clubs <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Links Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
                Helpful Resources
              </h3>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    to="/faq"
                    className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-between"
                  >
                    <span>Frequently Asked Questions</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/team"
                    className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-between"
                  >
                    <span>Meet the CampusNode Team</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contribute"
                    className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-between"
                  >
                    <span>Contribute to CampusNode</span>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                  </Link>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Contact;
