import React from 'react';

const FAQ = () => {
  return (
    <div className="min-h-screen bg-neutral-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-8 text-center">Frequently Asked Questions</h1>
        
        <div className="space-y-6">
          
          {/* Email Verification Issues */}
          <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                <i className="ri-mail-close-line text-brand-600 text-lg"></i>
              </div>
              <h2 className="text-lg font-bold text-neutral-800">
                I didn't receive the verification email.
              </h2>
            </div>
            <p className="text-neutral-600 text-sm leading-relaxed pl-11">
              First, please check your <strong>Spam</strong> or <strong>Junk</strong> folder. Emails from CampusNode sometimes land there. 
              If you still can't find it, ensure you entered your email correctly during registration. 
              Note that students must use their <strong>NITJ college email</strong> (ending in <code>@nitj.ac.in</code>).
            </p>
          </div>

          <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                <i className="ri-error-warning-line text-red-500 text-lg"></i>
              </div>
              <h2 className="text-lg font-bold text-neutral-800">
                "Connection Refused" or "Localhost" error when verifying email.
              </h2>
            </div>
            <p className="text-neutral-600 text-sm leading-relaxed pl-11">
              If you click the verification link and see an error about <code>localhost</code> or <code>connection refused</code>, it means the link was generated incorrectly. 
              We have recently fixed this issue. Please try registering again or contact a club head to manually help you if the issue persists.
            </p>
          </div>

          {/* Event Issues */}
          <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <i className="ri-calendar-event-line text-blue-500 text-lg"></i>
              </div>
              <h2 className="text-lg font-bold text-neutral-800">
                "Event Not Found" error.
              </h2>
            </div>
            <div className="text-neutral-600 text-sm leading-relaxed pl-11">
              <p>This error usually appears if:</p>
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>The event has been <strong>deleted</strong> by the club head.</li>
                <li>The event link is incorrect or broken.</li>
                <li>The event ID in the URL is invalid.</li>
              </ul>
              <p className="mt-3">
                Please go back to the <a href="/events" className="text-brand-600 font-bold hover:underline">Events Feed</a> to find the correct event.
              </p>
            </div>
          </div>

          {/* Login Issues */}
          <div className="bg-white border border-neutral-200 p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <i className="ri-login-circle-line text-purple-500 text-lg"></i>
              </div>
              <h2 className="text-lg font-bold text-neutral-800">
                I cannot login to my account.
              </h2>
            </div>
            <p className="text-neutral-600 text-sm leading-relaxed pl-11">
              Ensure you have verified your email address. You cannot log in until your email is verified. 
              Also, double-check that you are selecting the correct role (<strong>Student</strong> vs <strong>Club Head</strong>) on the login page.
            </p>
          </div>

          {/* Contact Support */}
          <div className="bg-brand-50/60 border border-brand-100 p-6 rounded-xl shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
              <i className="ri-question-line text-brand-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-850 mb-1">
                Still have questions?
              </h2>
              <p className="text-brand-700 text-sm leading-relaxed">
                Reach out to us at <a href="mailto:clubsetu@nikhim.me" className="font-semibold underline hover:text-brand-900 transition-colors">clubsetu@nikhim.me</a> or contact your respective Club Head.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FAQ;
