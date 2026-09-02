import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail as verifyEmailApi } from '../services/authService';
import { CheckCircle, XCircle, ArrowLeftIcon, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('loading'); 
    const [message, setMessage] = useState('');

    useEffect(() => {
        const doVerify = async () => {
            try {
                const res = await verifyEmailApi(token);
                setStatus('success');
                setMessage(res.data.message);
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed');
            }
        };

        if (token) {
            doVerify();
        }
    }, [token]);

    return (
        <div className="min-h-screen bg-neutral-50/70 dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8 sm:px-6">
            

            <div className="w-full max-w-[420px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xs text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500 flex items-center justify-center mb-4">
                            <Loader2 className="w-6 h-6 animate-spin stroke-[2.2]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Verifying your email
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                            Please wait while we confirm your account.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-500 flex items-center justify-center mb-4">
                            <CheckCircle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Email verified
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                            {message || 'Your email address has been successfully verified.'}
                        </p>
                       
                        <Link
                            to="/login"
                            className="w-full mt-6 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                        >
                            Continue to Login
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 r text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                            <XCircle className="w-16 h-16 stroke-[2.2]" />
</div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Verification failed
                        </h1>
                        <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                            {message || 'The verification link is invalid or has expired.'}
                        </p>
                        
                        <div className="w-full mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors group"
                            >
                                <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                <span>Back to Login</span>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
