import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyEmail as verifyEmailApi } from '../services/authService';
import { CheckCircle, XCircle, ArrowLeftIcon } from 'lucide-react';
import ShimmerText from '../components/ShimmerText';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-6">
            <div className="max-w-md w-full space-y-8 p-7 bg-white rounded-xl shadow-lg">
                <div className="text-center">
                    {status === 'loading' && (
                        <div className="flex flex-col items-center py-6">
                            <ShimmerText text="Verifying your email..." className="text-xl font-bold" />
                            <p className="mt-3 text-sm text-gray-500">Please wait while we confirm your account.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center">
                           
                              <img src="/Success popup.svg" alt=""  className='h-40 w-40'/>
                            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verified!</h2>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                           
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center">
                            <XCircle className="h-16 w-16 text-orange-500" />
                            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verification Failed</h2>
                            <p className="mt-2 text-sm text-gray-600">{message}</p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="font-medium text-orange-600 hover:text-orange-500 flex flex-row "
                                >
                                    <ArrowLeftIcon className="mr-2" size={24} />
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
