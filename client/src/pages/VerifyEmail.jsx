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
        <div className="min-h-screen bg-cn-bg text-cn-text flex flex-col items-center justify-center px-4 py-8 sm:px-6">
            

            <div className="w-full max-w-[420px] bg-cn-surface border border-cn-border rounded-2xl p-6 sm:p-8 shadow-xs text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-cn-blue-500/10 dark:bg-cn-blue-500/20 text-cn-blue-600 dark:text-cn-blue-400 flex items-center justify-center mb-4">
                            <Loader2 className="w-6 h-6 animate-spin stroke-[2.2]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cn-text">
                            Verifying your email
                        </h1>
                        <p className="text-xs sm:text-sm text-cn-text-muted mt-2 leading-relaxed">
                            Please wait while we confirm your account.
                        </p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-cn-teal-500/15 dark:bg-cn-teal-500/20 text-cn-teal-600 dark:text-cn-teal-400 flex items-center justify-center mb-4 border border-cn-teal-500/30">
                            <CheckCircle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cn-text">
                            Email verified
                        </h1>
                        <p className="text-xs sm:text-sm text-cn-text-secondary mt-2 leading-relaxed">
                            {message || 'Your email address has been successfully verified.'}
                        </p>
                       
                        <Link
                            to="/login"
                            className="w-full mt-6 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        >
                            Continue to Login
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 r text-danger-600 dark:text-danger-400 flex items-center justify-center mb-4">
                            <XCircle className="w-16 h-16 stroke-[2.2]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cn-text">
                            Verification failed
                        </h1>
                        <p className="text-xs sm:text-sm text-cn-text-secondary mt-2 leading-relaxed">
                            {message || 'The verification link is invalid or has expired.'}
                        </p>
                        
                        <div className="w-full mt-6 pt-4 border-t border-cn-border-subtle">
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cn-blue-600 dark:text-cn-blue-400 hover:text-cn-blue-700 dark:hover:text-cn-blue-300 transition-colors group"
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
