import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../services/api';
import { updateEvent, getEventById } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import { EVENT_VENUES } from '../constants/eventVenues';
import { PROGRAM_LABELS, PROGRAM_OPTIONS, ALL_BRANCH_CODES } from '../constants/academicConstants';
import { MediaType } from '../types/index';
import EventFormStepper from '../components/EventFormStepper';
import ShimmerText from '../components/ShimmerText';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const BRANCHES = ALL_BRANCH_CODES;

const EditEvent = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showNotification } = useNotification();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        venue: '',
        startTime: '',
        endTime: '',
        totalSeats: '',
        entryFee: 0,
        imageUrl: '',
        requiredFields: [],
        customFields: [],
        registrationDeadline: '',
        allowedPrograms: ['BTECH', 'MTECH', 'OTHER'],
        allowedYears: [],
        allowedBranches: [],
        winners: [],
        showWinner: false,
        provideCertificate: false,
        registrationType: 'individual',
        minTeamSize: 1,
        maxTeamSize: 1,
        paymentMethod: 'FREE',
        registrationFee: 0,
        paymentInstructions: '',
        collegePaymentUrl: '',
        upiId: '',
        accountHolderName: '',
        postRegistrationMessage: '',
    });
    const isEventCompleted = formData.endTime && new Date(formData.endTime) < new Date();
    const [sponsors, setSponsors] = useState([]);
    const [media, setMedia] = useState([]);
    const [sponsorErrors, setSponsorErrors] = useState([]);
    const [mediaErrors, setMediaErrors] = useState([]);
    const [isFree, setIsFree] = useState(true);
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [allYears, setAllYears] = useState(true);
    const [allBranches, setAllBranches] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [availableVenues, setAvailableVenues] = useState(EVENT_VENUES);
    const [reviewInfo, setReviewInfo] = useState(null);

    useEffect(() => {
        const fetchOpenVenues = async () => {
            try {
                const res = await api.get('/api/venues?openOnly=true');
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    const fetchedNames = res.data.map(v => typeof v === 'string' ? v : v.name);
                    setAvailableVenues(prev => {
                        const venues = [...fetchedNames, 'Online'];
                        if (formData.venue && !venues.includes(formData.venue)) {
                            venues.push(formData.venue);
                        }
                        return [...new Set(venues)];
                    });
                }
            } catch (err) {
                console.error("Failed to load open venues, falling back to static list:", err);
            }
        };
        fetchOpenVenues();
    }, [formData.venue]);

    const handleBranchToggle = (branch) => {
        setFormData(prev => {
            const current = prev.allowedBranches || [];
            if (current.includes(branch)) {
                return { ...prev, allowedBranches: current.filter(b => b !== branch) };
            }
            return { ...prev, allowedBranches: [...current, branch] };
        });
    };

    const toLocalISOString = (dateObj) => {
        if (!dateObj) return '';
        const date = new Date(dateObj);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    useEffect(() => {
        const fetchEvent = async () => {
             try {
                const res = await getEventById(id);
                const event = res.data;
                if (event) {
                    const start = toLocalISOString(event.startTime);
                    const end = toLocalISOString(event.endTime);
                    const unlimited = !event.totalSeats || event.totalSeats === 0;
                    const yearArr = event.allowedYears || [];
                    const branchArr = event.allowedBranches || [];
                    setFormData({
                        title: event.title,
                        description: event.description || '',
                        venue: event.venue,
                        startTime: start,
                        endTime: end,
                        totalSeats: unlimited ? '' : event.totalSeats,
                        entryFee: event.entryFee || 0,
                        imageUrl: event.imageUrl || '',
                        requiredFields: event.requiredFields || [],
                        customFields: event.customFields || [],
                        registrationDeadline: event.registrationDeadline ? toLocalISOString(event.registrationDeadline) : '',
                        allowedPrograms: event.allowedPrograms || ['BTECH', 'MTECH', 'OTHER'],
                        allowedYears: yearArr,
                        allowedBranches: branchArr,
                        winners: event.winners || [],
                        showWinner: event.showWinner || false,
                        provideCertificate: event.provideCertificate || false,
                        registrationType: event.registrationType || 'individual',
                        minTeamSize: event.minTeamSize || 1,
                        maxTeamSize: event.maxTeamSize || 1,
                        paymentMethod: event.paymentMethod || 'FREE',
                        registrationFee: event.registrationFee || event.entryFee || 0,
                        paymentInstructions: event.paymentInstructions || '',
                        collegePaymentUrl: event.collegePaymentUrl || '',
                        upiId: event.upiId || '',
                        accountHolderName: event.accountHolderName || '',
                        postRegistrationMessage: event.postRegistrationMessage || '',
                    });
                    setIsFree(!event.paymentMethod || event.paymentMethod === 'FREE');
                    setIsUnlimited(unlimited);
                    setAllYears(yearArr.length === 0);
                    setAllBranches(branchArr.length === 0);
                    setSponsors(event.sponsors || []);
                    setMedia(event.media || []);
                    setSponsorErrors((event.sponsors || []).map(() => ({})));
                    setMediaErrors((event.media || []).map(() => ({})));
                    setReviewInfo({
                        reviewStatus: event.reviewStatus,
                        reviewComment: event.reviewComment,
                        reviewedBy: event.reviewedBy,
                    });
                } else {
                    showNotification('Event not found', 'error');
                    navigate('/profile');
                }
                setLoading(false);
            } catch (err) {
                showNotification('Failed to fetch event details', 'error');
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size exceeds 5MB limit.', 'error');
            return;
        }
        setUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('image', file);
            const { data } = await api.post('/api/events/upload', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
            showNotification('Image uploaded successfully!', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleRequiredFieldsChange = (e) => {
        const value = e.target.value;
        const checked = e.target.checked;
        if (checked) {
            setFormData({ ...formData, requiredFields: [...formData.requiredFields, value] });
        } else {
            setFormData({ ...formData, requiredFields: formData.requiredFields.filter(field => field !== value) });
        }
    };

    const handleProgramToggle = (prog) => {
        setFormData(prev => {
            const current = prev.allowedPrograms;
            if (current.includes(prog)) {
                if (current.length <= 1) return prev;
                return { ...prev, allowedPrograms: current.filter(p => p !== prog) };
            }
            return { ...prev, allowedPrograms: [...current, prog] };
        });
    };

    const handleYearToggle = (year) => {
        setFormData(prev => {
            const current = prev.allowedYears;
            if (current.includes(year)) {
                return { ...prev, allowedYears: current.filter(y => y !== year) };
            }
            return { ...prev, allowedYears: [...current, year] };
        });
    };

    // ── Custom Fields Handlers ──────────────────────────────────────────
    const addCustomField = () => {
        setFormData(prev => ({
            ...prev,
            customFields: [...prev.customFields, { label: '', type: 'text', required: false, options: [] }]
        }));
    };

    const removeCustomField = (index) => {
        setFormData(prev => ({
            ...prev,
            customFields: prev.customFields.filter((_, i) => i !== index)
        }));
    };

    const updateCustomField = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.customFields];
            updated[index] = { ...updated[index], [field]: value };
            if (field === 'type' && value !== 'select') {
                updated[index].options = [];
            }
            return { ...prev, customFields: updated };
        });
    };

    const updateCustomFieldOption = (fieldIndex, optIndex, value) => {
        setFormData(prev => {
            const updated = [...prev.customFields];
            const opts = [...(updated[fieldIndex].options || [])];
            opts[optIndex] = value;
            updated[fieldIndex] = { ...updated[fieldIndex], options: opts };
            return { ...prev, customFields: updated };
        });
    };

    const addOptionToField = (fieldIndex) => {
        setFormData(prev => {
            const updated = [...prev.customFields];
            updated[fieldIndex] = { ...updated[fieldIndex], options: [...(updated[fieldIndex].options || []), ''] };
            return { ...prev, customFields: updated };
        });
    };

    const removeOptionFromField = (fieldIndex, optIndex) => {
        setFormData(prev => {
            const updated = [...prev.customFields];
            updated[fieldIndex] = { ...updated[fieldIndex], options: updated[fieldIndex].options.filter((_, i) => i !== optIndex) };
            return { ...prev, customFields: updated };
        });
    };

    // ── Sponsor Handlers ───────────────────────────────────────────────
    const addSponsor = () => {
        setSponsors(prev => [...prev, { name: '', logoUrl: '', websiteUrl: '' }]);
        setSponsorErrors(prev => [...prev, {}]);
    };

    const removeSponsor = (index) => {
        setSponsors(prev => prev.filter((_, i) => i !== index));
        setSponsorErrors(prev => prev.filter((_, i) => i !== index));
    };

    const updateSponsor = (index, field, value) => {
        setSponsors(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // ── Media Handlers ─────────────────────────────────────────────────
    const addMedia = () => {
        setMedia(prev => [...prev, { url: '', type: MediaType.IMAGE }]);
        setMediaErrors(prev => [...prev, {}]);
    };

    const removeMedia = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
        setMediaErrors(prev => prev.filter((_, i) => i !== index));
    };

    const updateMedia = (index, field, value) => {
        setMedia(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    // ── Validation ─────────────────────────────────────────────────────
    const URL_PATTERN = /^https?:\/\/.+/;

    const validateSponsorsAndMedia = () => {
        let valid = true;
        const newSponsorErrors = sponsors.map(s => {
            const errs = {};
            if (!s.name.trim()) errs.name = 'Sponsor name is required.';
            if (!URL_PATTERN.test(s.logoUrl)) errs.logoUrl = 'Logo URL must be a valid URL (https://...).';
            if (Object.keys(errs).length) valid = false;
            return errs;
        });
        const newMediaErrors = media.map(m => {
            const errs = {};
            if (!URL_PATTERN.test(m.url)) errs.url = 'Media URL must be a valid URL (https://...).';
            if (Object.keys(errs).length) valid = false;
            return errs;
        });
        setSponsorErrors(newSponsorErrors);
        setMediaErrors(newMediaErrors);
        return valid;
    };

    // ── Step Validation ───────────────────────────────────────────────
    const validateStep1 = () => {
        if (!formData.title || !formData.title.trim()) {
            return 'Event Title is required.';
        }
        if (!formData.venue) {
            return 'Please select a Venue.';
        }
        return null;
    };

    const validateStep2 = () => {
        if (!formData.startTime) {
            return 'Start Time is required.';
        }
        if (!formData.endTime) {
            return 'End Time is required.';
        }
        const start = new Date(formData.startTime);
        const end = new Date(formData.endTime);
        if (start >= end) {
            return 'End time must be after start time.';
        }
        if (formData.registrationDeadline && new Date(formData.registrationDeadline) > start) {
            return 'Registration deadline cannot be after event start time.';
        }
        if (!formData.allowedPrograms || formData.allowedPrograms.length === 0) {
            return 'At least one program must be allowed.';
        }
        if (!allYears && (!formData.allowedYears || formData.allowedYears.length === 0)) {
            return 'Please select at least one allowed year or enable "Allow All Years".';
        }
        if (!allBranches && (!formData.allowedBranches || formData.allowedBranches.length === 0)) {
            return 'Please select at least one allowed branch or enable "Allow All Branches".';
        }
        return null;
    };

    const validateStep3 = () => {
        if (formData.registrationType === 'team' || formData.registrationType === 'both') {
            const min = Number(formData.minTeamSize || 1);
            const max = Number(formData.maxTeamSize || 1);
            if (min < 1) {
                return 'Minimum team size must be at least 1.';
            }
            if (max < min) {
                return 'Maximum team size cannot be less than minimum team size.';
            }
        }
        if (!isUnlimited) {
            const seats = Number(formData.totalSeats);
            if (!formData.totalSeats || seats < 1) {
                return 'Total seats must be specified or select Unlimited Seats.';
            }
        }
        if (formData.paymentMethod !== 'FREE') {
            const fee = Number(formData.registrationFee || 0);
            if (fee <= 0) {
                return 'Registration fee must be greater than 0 for paid events.';
            }
            if (formData.paymentMethod === 'MANUAL_TRANSACTION' && !formData.upiId?.trim()) {
                return 'UPI ID / Phone Number is required for Manual Transaction Verification.';
            }
            if (formData.paymentMethod === 'COLLEGE_PAYMENT' && (!formData.collegePaymentUrl?.trim() || !URL_PATTERN.test(formData.collegePaymentUrl.trim()))) {
                return 'Valid College Payment Portal URL (https://...) is required.';
            }
        }
        for (let i = 0; i < formData.customFields.length; i++) {
            if (!formData.customFields[i].label?.trim()) {
                return `Custom field #${i + 1} is missing a field label.`;
            }
        }
        return null;
    };

    const validateStep4 = () => {
        if (!validateSponsorsAndMedia()) {
            return 'Please fix the sponsor and media errors before submitting.';
        }
        return null;
    };

    const validateCurrentStep = (stepNumber) => {
        switch (stepNumber) {
            case 1:
                return validateStep1();
            case 2:
                return validateStep2();
            case 3:
                return validateStep3();
            case 4:
                return validateStep4();
            default:
                return null;
        }
    };

    const handleNextStep = () => {
        const err = validateCurrentStep(currentStep);
        if (err) {
            showNotification(err, 'error');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStepClick = (targetStep) => {
        if (targetStep === currentStep) return;

        if (targetStep > currentStep) {
            for (let s = currentStep; s < targetStep; s++) {
                const err = validateCurrentStep(s);
                if (err) {
                    showNotification(err, 'error');
                    setCurrentStep(s);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
            }
        }

        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Winners Handlers ────────────────────────────────────────────────
    const addWinner = () => {
        setFormData(prev => ({
            ...prev,
            winners: [...prev.winners, { rank: prev.winners.length + 1, name: '', rollNo: '', members: [], leaderName: '', error: null }]
        }));
    };

    const removeWinner = (index) => {
        setFormData(prev => ({
            ...prev,
            winners: prev.winners.filter((_, i) => i !== index)
        }));
    };

    const updateWinner = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.winners];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, winners: updated };
        });
    };

    const handleWinnerLookup = async (index, queryVal) => {
        if (!queryVal || !queryVal.trim()) return;
        const isTeamEvent = formData.registrationType === 'team' || formData.registrationType === 'both';
        const token = localStorage.getItem('token');

        if (isTeamEvent) {
            try {
                const res = await api.get(
                    `/api/teams/event/${id}/lookup-leader?query=${encodeURIComponent(queryVal.trim())}`
                );
                const { teamName, members, leaderName } = res.data;

                setFormData(prev => {
                    const updated = [...prev.winners];
                    updated[index] = {
                        ...updated[index],
                        name: teamName,
                        members: members || [],
                        leaderName: leaderName || '',
                        error: null
                    };
                    return { ...prev, winners: updated };
                });
                return;
            } catch (err) {
                // Fallback to student roll number lookup below
            }
        }

        try {
            const res = await api.get(
                `/api/users/lookup/${encodeURIComponent(queryVal.trim())}`
            );
            const { name, branch } = res.data;
            const displayName = branch ? `${name}(${branch})` : name;

            setFormData(prev => {
                const updated = [...prev.winners];
                updated[index] = {
                    ...updated[index],
                    name: displayName,
                    members: [],
                    leaderName: '',
                    error: null
                };
                return { ...prev, winners: updated };
            });
        } catch (err) {
            setFormData(prev => {
                const updated = [...prev.winners];
                updated[index] = {
                    ...updated[index],
                    name: '',
                    members: [],
                    leaderName: '',
                    error: isTeamEvent ? 'No registered team or student found.' : 'Student not found.'
                };
                return { ...prev, winners: updated };
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all steps before submitting
        const step1Err = validateStep1();
        if (step1Err) { setCurrentStep(1); showNotification(step1Err, 'error'); return; }
        const step2Err = validateStep2();
        if (step2Err) { setCurrentStep(2); showNotification(step2Err, 'error'); return; }
        const step3Err = validateStep3();
        if (step3Err) { setCurrentStep(3); showNotification(step3Err, 'error'); return; }
        const step4Err = validateStep4();
        if (step4Err) { setCurrentStep(4); showNotification(step4Err, 'error'); return; }

        const payload = {
            ...formData,
            startTime: new Date(formData.startTime).toISOString(),
            endTime: new Date(formData.endTime).toISOString(),
            entryFee: formData.paymentMethod === 'FREE' ? 0 : Number(formData.registrationFee || 0),
            registrationFee: formData.paymentMethod === 'FREE' ? 0 : Number(formData.registrationFee || 0),
            totalSeats: isUnlimited ? 0 : Number(formData.totalSeats),
            registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : null,
            allowedYears: allYears ? [] : formData.allowedYears,
            allowedBranches: allBranches ? [] : formData.allowedBranches,
            registrationType: formData.registrationType || 'individual',
            minTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.minTeamSize || 1) : 1,
            maxTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.maxTeamSize || 1) : 1,
            winners: (formData.winners || []).map(({ error, ...rest }) => rest),
            sponsors: sponsors.map(s => ({ name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl || undefined })),
            media: media.map(m => ({ url: m.url, type: m.type })),
            paymentMethod: formData.paymentMethod,
            paymentInstructions: formData.paymentMethod === 'FREE' ? null : formData.paymentInstructions,
            collegePaymentUrl: formData.paymentMethod === 'COLLEGE_PAYMENT' ? formData.collegePaymentUrl : null,
            upiId: formData.paymentMethod === 'MANUAL_TRANSACTION' ? formData.upiId : null,
            accountHolderName: formData.paymentMethod === 'MANUAL_TRANSACTION' ? formData.accountHolderName : null,
            postRegistrationMessage: formData.postRegistrationMessage || null,
        };

        setIsSaving(true);
        try {
            await updateEvent(id, payload);
            showNotification('Event updated successfully!', 'success');
            navigate('/my-events');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to update event', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
                <ShimmerText text="Loading event..." className="text-[13px] font-bold uppercase tracking-widest" />
            </div>
        );
    }

    const inputCls =
        'w-full px-4 py-2 border-2 border-neutral-200 dark:border-zinc-800 rounded-lg focus:border-orange-600 focus:outline-none transition-colors bg-white dark:bg-[#0a0a0a] text-black dark:text-white';
    const labelCls =
        'block text-sm font-bold tracking-wide text-black dark:text-white mb-2';

    return (
        <div className="min-h-screen bg-neutral-50 py-8 md:py-12 px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    {/* <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors mb-4 cursor-pointer"
                    >
                        <i className="ri-arrow-left-line text-lg" /> Back to Profile
                    </button> */}
                    <h1 className="text-3xl md:text-5xl font-black text-black tracking-wide">Edit Event</h1>
                    <p className="text-neutral-500 mt-2 font-medium">Refine your event details and registration requirements step-by-step.</p>
                </div>

                {/* Rejection / Review Feedback Notice Banner */}
                {reviewInfo?.reviewStatus === 'REJECTED' && (
                    <div className="mb-6 bg-rose-50 border-2 border-rose-200 rounded-xl p-5 shadow-xs flex items-start gap-4">
                        <div className="p-2.5 bg-rose-100 rounded-lg text-rose-600 shrink-0">
                            <i className="ri-error-warning-fill text-2xl" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-black uppercase tracking-widest text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                                    Proposal Needs Revision
                                </span>
                                {reviewInfo.reviewedBy?.name && (
                                    <span className="text-[11px] font-bold text-rose-600">
                                        Reviewed by: {reviewInfo.reviewedBy.name}
                                    </span>
                                )}
                            </div>
                            <h4 className="text-sm font-bold text-rose-900 mt-1">Reviewer Feedback:</h4>
                            <p className="text-sm font-semibold text-rose-700 mt-1 bg-white/70 p-3 rounded-lg border border-rose-200">
                                {reviewInfo.reviewComment || "No specific feedback comment provided. Please check timings, fees, and requirements before resubmitting."}
                            </p>
                            <p className="text-xs text-rose-600 mt-2">
                                Please make the necessary modifications in the form below and save your changes.
                            </p>
                        </div>
                    </div>
                )}
                
                {/* Stepper Component */}
                <EventFormStepper currentStep={currentStep} onStepClick={handleStepClick} />

                <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-300 rounded-lg p-6 md:p-10 space-y-8">
                    
                    {/* STEP 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-step-fadeIn">
                            <div className="border-b border-neutral-200 pb-3">
                                <h2 className="text-xl font-bold text-black uppercase tracking-wide flex items-center gap-2">
                                    <i className="ri-file-list-line text-orange-600" /> Step 1: Basic Details
                                </h2>
                                <p className="text-xs text-neutral-500 mt-1">Refine event title, description, venue and poster.</p>
                            </div>

                            {/* Event Title */}
                            <div>
                                <label className={labelCls}>Event Title <span className="text-orange-600">*</span></label>
                                <input type="text" name="title" className={inputCls}
                                    value={formData.title} onChange={handleChange} placeholder="Enter event title" />
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelCls}>Description</label>
                                <div className="rounded-xl overflow-hidden border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a]">
                                    <ReactQuill theme="snow" value={formData.description} onChange={(val) => setFormData({ ...formData, description: val })} className="quill-editor" />
                                </div>
                            </div>

                            {/* Venue */}
                            <div>
                                <label className={labelCls}>Venue <span className="text-orange-600">*</span></label>
                                <select name="venue" className={inputCls} value={formData.venue} onChange={handleChange}>
                                    <option value="">Select Venue</option>
                                    {availableVenues.map((venue) => (
                                        <option key={venue} value={venue}>{venue}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Event Poster Upload */}
                            <div>
                                <label className={labelCls}>Event Poster <span className="text-neutral-400 font-normal">(max 5 MB)</span></label>
                                <input 
                                    type="file" 
                                    id="poster-upload" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    className="hidden" 
                                />
                                <label
                                    htmlFor="poster-upload"
                                    className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-300 rounded-sm p-6 text-sm font-semibold text-neutral-500 cursor-pointer hover:border-orange-600 hover:text-orange-600 hover:bg-neutral-50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <i className="ri-loader-4-line text-2xl animate-spin text-orange-600" />
                                            <span>Uploading poster...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="ri-image-add-line text-3xl" />
                                            <div className="text-center">
                                                <span className="text-orange-600 underline">Click to upload</span> or drag and drop
                                                <p className="text-xs text-neutral-400 mt-1">Supports PNG, JPG, JPEG, WEBP, GIF</p>
                                            </div>
                                        </>
                                    )}
                                </label>

                                {formData.imageUrl && (
                                    <div className="relative mt-4 border-2 border-neutral-200 rounded-sm p-2 bg-neutral-50 flex flex-col items-center">
                                        <img src={formData.imageUrl} alt="Poster Preview" className="max-h-64 object-contain rounded-sm" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                            className="absolute top-4 right-4 bg-black hover:bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer"
                                            title="Remove Image"
                                        >
                                            <i className="ri-close-line text-lg" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Timings & Access */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-step-fadeIn">
                            <div className="border-b border-neutral-200 pb-3">
                                <h2 className="text-xl font-bold text-black uppercase tracking-wide flex items-center gap-2">
                                    <i className="ri-calendar-event-line text-orange-600" /> Step 2: Timings & Access
                                </h2>
                                <p className="text-xs text-neutral-500 mt-1">Adjust event start/end schedule, deadline and eligibility criteria.</p>
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={labelCls}>Start Time <span className="text-orange-600">*</span></label>
                                    <input type="datetime-local" name="startTime" className={inputCls}
                                        value={formData.startTime} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <label className={labelCls}>End Time <span className="text-orange-600">*</span></label>
                                    <input type="datetime-local" name="endTime" className={inputCls}
                                        value={formData.endTime} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Registration Deadline */}
                            <div>
                                <label className={labelCls}>Registration Deadline</label>
                                <input type="datetime-local" name="registrationDeadline" className={inputCls}
                                    value={formData.registrationDeadline} onChange={handleChange} />
                                <p className="text-xs text-neutral-500 mt-1">Optional: If left blank, registrations stay open until start time.</p>
                            </div>

                            {/* Registration Restrictions Card */}
                            <div className="bg-neutral-50 dark:bg-neutral-950 p-6 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Registration Restrictions</h3>
                                    <p className="text-xs text-neutral-500 mt-1">Restrict event registration to specific programs, years, or branches.</p>
                                </div>

                                {/* Allowed Programs */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Allowed Programs <span className="text-orange-600">*</span></label>
                                    <div className="flex flex-wrap gap-5 mt-1">
                                        {PROGRAM_OPTIONS.map((prog) => (
                                            <label key={prog} className="inline-flex items-center cursor-pointer gap-2 select-none">
                                                <input type="checkbox" className="w-4 h-4 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                                    checked={formData.allowedPrograms.includes(prog)}
                                                    onChange={() => handleProgramToggle(prog)} />
                                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{PROGRAM_LABELS[prog]}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <hr className="border-neutral-200 dark:border-neutral-855" />

                                {/* Allowed Years */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Allowed Years</label>
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center cursor-pointer gap-2 select-none">
                                            <input type="checkbox" className="w-4 h-4 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                                checked={allYears} onChange={() => {
                                                    setAllYears(!allYears);
                                                    if (!allYears) setFormData(prev => ({ ...prev, allowedYears: [] }));
                                                }} />
                                            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Allow All Years</span>
                                        </label>
                                    </div>
                                    {!allYears && (
                                        <div className="flex flex-wrap gap-4 mt-2 p-3 bg-white dark:bg-neutral-905 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                                            {YEARS.map(year => (
                                                <label key={year} className="inline-flex items-center cursor-pointer gap-2 select-none">
                                                    <input type="checkbox" className="w-4 h-4 accent-orange-600 border-neutral-300 rounded focus:ring-orange-600"
                                                        checked={formData.allowedYears.includes(year)}
                                                        onChange={() => handleYearToggle(year)} />
                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{year}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <hr className="border-neutral-200 dark:border-neutral-855" />

                                {/* Allowed Branches */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Allowed Branches</label>
                                    <div className="flex items-center gap-4">
                                        <label className="inline-flex items-center cursor-pointer gap-2 select-none">
                                            <input type="checkbox" className="w-4 h-4 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                                checked={allBranches} onChange={() => {
                                                    setAllBranches(!allBranches);
                                                    if (!allBranches) setFormData(prev => ({ ...prev, allowedBranches: [] }));
                                                }} />
                                            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Allow All Branches</span>
                                        </label>
                                    </div>
                                    {!allBranches && (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-2 p-3 bg-white dark:bg-neutral-905 border border-neutral-200 dark:border-neutral-800 rounded-xl">
                                            {BRANCHES.map(branch => (
                                                <label key={branch} className="inline-flex items-center cursor-pointer gap-2 select-none">
                                                    <input type="checkbox" className="w-4 h-4 accent-orange-600 border-neutral-300 rounded focus:ring-orange-600"
                                                        checked={(formData.allowedBranches || []).includes(branch)}
                                                        onChange={() => handleBranchToggle(branch)} />
                                                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{branch}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Registration & Payments */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-step-fadeIn">
                            <div className="border-b border-neutral-200 pb-3">
                                <h2 className="text-xl font-bold text-black uppercase tracking-wide flex items-center gap-2">
                                    <i className="ri-ticket-2-line text-orange-600" /> Step 3: Registration & Payments
                                </h2>
                                <p className="text-xs text-neutral-500 mt-1">Configure registration format, capacity, payment methods, and custom questions.</p>
                            </div>

                            {/* Registration Type */}
                            <div>
                                <label className={labelCls}>Registration Type <span className="text-orange-600">*</span></label>
                                <select name="registrationType" className={inputCls} value={formData.registrationType} onChange={handleChange}>
                                    <option value="individual">Individual Registration</option>
                                    <option value="team">Team Registration</option>
                                    <option value="both">Both (Individual & Team)</option>
                                </select>
                            </div>

                            {/* Team Size Configurations (conditional) */}
                            {(formData.registrationType === 'team' || formData.registrationType === 'both') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-neutral-50 border border-neutral-200 rounded-sm">
                                    <div>
                                        <label className={labelCls}>Minimum Team Size <span className="text-orange-600">*</span></label>
                                        <input type="number" name="minTeamSize" min="1" className={inputCls}
                                            value={formData.minTeamSize} onChange={handleChange} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Maximum Team Size <span className="text-orange-600">*</span></label>
                                        <input type="number" name="maxTeamSize" min="1" className={inputCls}
                                            value={formData.maxTeamSize} onChange={handleChange} />
                                    </div>
                                </div>
                            )}

                            {/* Seats & Fee Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                {/* Total Seats */}
                                <div className="space-y-4">
                                    <label className={labelCls}>Seat Availability <span className="text-orange-600">*</span></label>
                                    <div className="flex items-center gap-3">
                                        <input type="checkbox" id="unlimited-check" className="w-5 h-5 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                            checked={isUnlimited} onChange={() => {
                                                setIsUnlimited(!isUnlimited);
                                                if (!isUnlimited) setFormData({ ...formData, totalSeats: '' });
                                            }} />
                                        <label htmlFor="unlimited-check" className="text-sm font-medium uppercase tracking-widest text-neutral-700 cursor-pointer">Unlimited Seats</label>
                                    </div>
                                    {!isUnlimited && (
                                        <input type="number" name="totalSeats" min="1" className={inputCls}
                                            value={formData.totalSeats} onChange={handleChange} placeholder="Capacity" />
                                    )}
                                </div>
                            </div>

                            {/* Payment Settings */}
                            <div className="bg-neutral-50 border border-neutral-300 rounded-sm p-6 space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-black uppercase tracking-wider">Payment Settings</h3>
                                    <p className="text-xs text-neutral-600 mt-1">Choose how users pay for event registration.</p>
                                </div>

                                {/* Payment Method Option Selector */}
                                <div>
                                    <label className={labelCls}>Payment Method <span className="text-orange-600">*</span></label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <label className={`flex flex-col p-4 border-2 rounded-sm cursor-pointer transition-all ${formData.paymentMethod === 'FREE' ? 'border-orange-600 bg-orange-50/30' : 'border-neutral-200 hover:border-neutral-400 bg-white'}`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="FREE"
                                                    checked={formData.paymentMethod === 'FREE'}
                                                    onChange={() => setFormData({ ...formData, paymentMethod: 'FREE', registrationFee: 0 })}
                                                    className="w-4 h-4 accent-orange-600"
                                                />
                                                <span className="text-sm font-bold text-black">Free</span>
                                            </div>
                                            <span className="text-xs text-neutral-500 mt-2">No entry fee required to join the event.</span>
                                        </label>

                                        <label className={`flex flex-col p-4 border-2 rounded-sm cursor-pointer transition-all ${formData.paymentMethod === 'MANUAL_TRANSACTION' ? 'border-orange-600 bg-orange-50/30' : 'border-neutral-200 hover:border-neutral-400 bg-white'}`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="MANUAL_TRANSACTION"
                                                    checked={formData.paymentMethod === 'MANUAL_TRANSACTION'}
                                                    onChange={() => setFormData({ ...formData, paymentMethod: 'MANUAL_TRANSACTION' })}
                                                    className="w-4 h-4 accent-orange-600"
                                                />
                                                <span className="text-sm font-bold text-black">Manual Transaction</span>
                                            </div>
                                            <span className="text-xs text-neutral-500 mt-2">Users scan your QR code/UPI ID and submit Transaction ID.</span>
                                        </label>

                                        <label className={`flex flex-col p-4 border-2 rounded-sm cursor-pointer transition-all ${formData.paymentMethod === 'COLLEGE_PAYMENT' ? 'border-orange-600 bg-orange-50/30' : 'border-neutral-200 hover:border-neutral-400 bg-white'}`}>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="COLLEGE_PAYMENT"
                                                    checked={formData.paymentMethod === 'COLLEGE_PAYMENT'}
                                                    onChange={() => setFormData({ ...formData, paymentMethod: 'COLLEGE_PAYMENT' })}
                                                    className="w-4 h-4 accent-orange-600 cursor-pointer"
                                                />
                                                <span className="text-sm font-bold text-black">College Portal</span>
                                            </div>
                                            <span className="text-xs text-neutral-500 mt-2">Direct users to official college payment portal URL.</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Registration Fee Input (Conditional) */}
                                {formData.paymentMethod !== 'FREE' && (
                                    <div>
                                        <label className={labelCls}>Registration Fee (₹) <span className="text-orange-600">*</span></label>
                                        <input
                                            type="number"
                                            name="registrationFee"
                                            min="1"
                                            className={inputCls}
                                            placeholder="Enter amount in ₹"
                                            value={formData.registrationFee}
                                            onChange={handleChange}
                                        />
                                    </div>
                                )}

                                {/* Manual Transaction Verification Fields (Conditional) */}
                                {formData.paymentMethod === 'MANUAL_TRANSACTION' && (
                                    <div className="space-y-4 border-t border-neutral-200 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelCls}>UPI ID / Phone Number <span className="text-orange-600">*</span></label>
                                                <input
                                                    type="text"
                                                    name="upiId"
                                                    className={inputCls}
                                                    placeholder="e.g. name@upi or 9876543210"
                                                    value={formData.upiId}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Account Holder Name</label>
                                                <input
                                                    type="text"
                                                    name="accountHolderName"
                                                    className={inputCls}
                                                    placeholder="e.g. Club Secretary or Club Account Name"
                                                    value={formData.accountHolderName}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelCls}>Custom Payment Instructions</label>
                                            <textarea
                                                name="paymentInstructions"
                                                rows="3"
                                                className={`${inputCls} resize-y`}
                                                placeholder="Add custom instructions for the user (e.g. Please scan the QR code, pay via GPay/PhonePe/Paytm, and paste the 12-digit UTR/Transaction ID below.)"
                                                value={formData.paymentInstructions}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* College Payment Portal Fields (Conditional) */}
                                {formData.paymentMethod === 'COLLEGE_PAYMENT' && (
                                    <div className="space-y-4 border-t border-neutral-200 pt-4">
                                        <div>
                                            <label className={labelCls}>College Payment Portal URL <span className="text-orange-600">*</span></label>
                                            <input
                                                type="url"
                                                name="collegePaymentUrl"
                                                className={inputCls}
                                                placeholder="https://payments.college.ac.in/event-fee"
                                                value={formData.collegePaymentUrl}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Custom Payment Instructions <span className="text-neutral-400 font-normal">(optional)</span></label>
                                            <textarea
                                                name="paymentInstructions"
                                                rows="3"
                                                className={`${inputCls} resize-y`}
                                                placeholder="Add custom instructions for payment on the college portal."
                                                value={formData.paymentInstructions}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Post-Registration Message */}
                            <div>
                                <label className={labelCls}>
                                    Post-Registration Message <span className="text-neutral-400 font-normal">(optional)</span>
                                </label>
                                <p className="text-xs text-neutral-500 mb-2">Show a WhatsApp group link, Discord invite, or any instructions after successful registration.</p>
                                <textarea
                                    name="postRegistrationMessage"
                                    rows="3"
                                    className={`${inputCls} resize-y`}
                                    placeholder="e.g. Join our WhatsApp group: https://chat.whatsapp.com/... or Follow the next steps at..."
                                    value={formData.postRegistrationMessage}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Required Student Information */}
                            <div>
                                <label className={labelCls}>Required Student Information</label>
                                <p className="text-xs text-neutral-500 mb-3">Select which profile fields students must complete before registering</p>
                                <div className="space-y-2">
                                    {[
                                        { value: 'githubProfile', label: 'GitHub Profile' },
                                        { value: 'linkedinProfile', label: 'LinkedIn Profile' },
                                        { value: 'xProfile', label: 'X (Twitter) Profile' },
                                        { value: 'portfolioUrl', label: 'Portfolio URL' }
                                    ].map(field => (
                                        <label key={field.value} className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" value={field.value}
                                                checked={formData.requiredFields.includes(field.value)}
                                                onChange={handleRequiredFieldsChange}
                                                className="w-4 h-4 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600" />
                                            <span className="text-sm text-neutral-700">{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Registration Fields Builder */}
                            <div>
                                <label className={labelCls}>
                                    Custom Registration Fields
                                </label>
                                <p className="text-xs text-neutral-500 mb-4">Add custom fields that students must fill during registration (like Google Forms)</p>

                                <div className="space-y-4">
                                    {formData.customFields.map((cf, idx) => (
                                        <div key={idx} className="border-2 border-neutral-200 rounded-sm p-4 relative bg-neutral-50">
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(idx)}
                                                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                                                title="Remove field"
                                            >
                                                <i className="ri-delete-bin-line text-lg" />
                                            </button>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Field Label <span className="text-orange-600">*</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Team Name, GitHub Repo..."
                                                        value={cf.label}
                                                        onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Field Type</label>
                                                    <select
                                                        value={cf.type}
                                                        onChange={(e) => updateCustomField(idx, 'type', e.target.value)}
                                                        className={inputCls}
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="url">Link / URL</option>
                                                        <option value="textarea">Long Text</option>
                                                        <option value="select">Dropdown</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <label className="inline-flex items-center gap-2 mt-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={cf.required}
                                                    onChange={(e) => updateCustomField(idx, 'required', e.target.checked)}
                                                    className="w-4 h-4 text-orange-600 border-neutral-300 rounded focus:ring-orange-600 cursor-pointer"
                                                />
                                                <span className="text-sm text-neutral-600">Required</span>
                                            </label>

                                            {cf.type === 'select' && (
                                                <div className="mt-3 pl-4 border-l-2 border-orange-300">
                                                    <p className="text-xs font-bold text-neutral-600 mb-2">Dropdown Options</p>
                                                    {(cf.options || []).map((opt, optIdx) => (
                                                        <div key={optIdx} className="flex items-center gap-2 mb-2">
                                                            <input
                                                                type="text"
                                                                placeholder={`Option ${optIdx + 1}`}
                                                                value={opt}
                                                                onChange={(e) => updateCustomFieldOption(idx, optIdx, e.target.value)}
                                                                className="flex-1 px-3 py-2 border-2 border-neutral-200 rounded-sm text-sm focus:border-orange-600 focus:outline-none transition-colors"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOptionFromField(idx, optIdx)}
                                                                className="text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                                                            >
                                                                <i className="ri-close-line text-lg" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => addOptionToField(idx)}
                                                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-1 cursor-pointer"
                                                    >
                                                        <i className="ri-add-line" /> Add Option
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addCustomField}
                                    className="mt-4 w-full py-3 border-2 border-dashed border-neutral-300 rounded-sm text-sm font-bold text-neutral-500 hover:border-orange-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <i className="ri-add-circle-line text-lg" /> Add Custom Field
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Extras & Publishing */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-step-fadeIn">
                            <div className="border-b border-neutral-200 pb-3">
                                <h2 className="text-xl font-bold text-black uppercase tracking-wide flex items-center gap-2">
                                    <i className="ri-sparkles-line text-orange-600" /> Step 4: Extras & Publishing
                                </h2>
                                <p className="text-xs text-neutral-500 mt-1">Configure result display, digital certificates, sponsors, media assets, and winners.</p>
                            </div>

                            {/* Status Toggles Grid (Display Results & Digital Certificates) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Show Winners Toggle */}
                                <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-sm cursor-pointer hover:border-neutral-400 transition-colors select-none">
                                    <input
                                        type="checkbox"
                                        name="showWinner"
                                        checked={formData.showWinner}
                                        onChange={(e) => setFormData({ ...formData, showWinner: e.target.checked })}
                                        className="w-4 h-4 mt-0.5 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-black tracking-wide">Display Results / Winners</span>
                                        <p className="text-xs text-neutral-500 mt-1">Show winners on the event card after completion.</p>
                                    </div>
                                </label>

                                {/* Provide Certificate Toggle */}
                                <label className="flex items-start gap-3 p-4 border border-neutral-200 rounded-sm cursor-pointer hover:border-neutral-400 transition-colors select-none">
                                    <input
                                        type="checkbox"
                                        name="provideCertificate"
                                        checked={formData.provideCertificate}
                                        onChange={(e) => setFormData({ ...formData, provideCertificate: e.target.checked })}
                                        className="w-4 h-4 mt-0.5 accent-orange-600 cursor-pointer border-neutral-300 rounded focus:ring-orange-600"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold text-black tracking-wide">Digital Certificates</span>
                                        <p className="text-xs text-neutral-500 mt-1">Enable downloadable certificates for participants after the event ends.</p>
                                    </div>
                                </label>
                            </div>

                            {/* Sponsors */}
                            <div>
                                <label className={labelCls}>Sponsors</label>
                                <p className="text-xs text-neutral-500 mb-4">Add sponsors for this event (optional)</p>
                                <div className="space-y-4">
                                    {sponsors.map((s, idx) => (
                                        <div key={idx} className="border-2 border-neutral-200 rounded-sm p-4 relative bg-neutral-50">
                                            <button
                                                type="button"
                                                onClick={() => removeSponsor(idx)}
                                                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                                                title="Remove sponsor"
                                            >
                                                <i className="ri-delete-bin-line text-lg" />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Sponsor Name <span className="text-orange-600">*</span></label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Acme Corp"
                                                        value={s.name}
                                                        onChange={(e) => updateSponsor(idx, 'name', e.target.value)}
                                                        className={inputCls}
                                                    />
                                                    {sponsorErrors[idx]?.name && (
                                                        <p className="text-xs text-red-600 mt-1">{sponsorErrors[idx].name}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Logo URL <span className="text-orange-600">*</span></label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://example.com/logo.png"
                                                        value={s.logoUrl}
                                                        onChange={(e) => updateSponsor(idx, 'logoUrl', e.target.value)}
                                                        className={inputCls}
                                                    />
                                                    {sponsorErrors[idx]?.logoUrl && (
                                                        <p className="text-xs text-red-600 mt-1">{sponsorErrors[idx].logoUrl}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 pr-10">
                                                <label className="text-xs font-bold text-neutral-600 mb-1 block">Website URL <span className="text-neutral-400 font-normal">(optional)</span></label>
                                                <input
                                                    type="url"
                                                    placeholder="https://sponsor-website.com"
                                                    value={s.websiteUrl}
                                                    onChange={(e) => updateSponsor(idx, 'websiteUrl', e.target.value)}
                                                    className={inputCls}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addSponsor}
                                    className="mt-4 w-full py-3 border-2 border-dashed border-neutral-300 rounded-sm text-sm font-bold text-neutral-500 hover:border-orange-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <i className="ri-add-circle-line text-lg" /> Add Sponsor
                                </button>
                            </div>

                            {/* Media */}
                            <div>
                                <label className={labelCls}>Media</label>
                                <p className="text-xs text-neutral-500 mb-4">Add images, videos, or sponsor logos for this event (optional)</p>
                                <div className="space-y-4">
                                    {media.map((m, idx) => (
                                        <div key={idx} className="border-2 border-neutral-200 rounded-sm p-4 relative bg-neutral-50">
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(idx)}
                                                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors cursor-pointer"
                                                title="Remove media"
                                            >
                                                <i className="ri-delete-bin-line text-lg" />
                                            </button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-10">
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Media URL <span className="text-orange-600">*</span></label>
                                                    <input
                                                        type="url"
                                                        placeholder="https://example.com/media.jpg"
                                                        value={m.url}
                                                        onChange={(e) => updateMedia(idx, 'url', e.target.value)}
                                                        className={inputCls}
                                                    />
                                                    {mediaErrors[idx]?.url && (
                                                        <p className="text-xs text-red-600 mt-1">{mediaErrors[idx].url}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-neutral-600 mb-1 block">Type</label>
                                                    <select
                                                        value={m.type}
                                                        onChange={(e) => updateMedia(idx, 'type', e.target.value)}
                                                        className={inputCls}
                                                    >
                                                        <option value={MediaType.IMAGE}>Image</option>
                                                        <option value={MediaType.VIDEO}>Video</option>
                                                        <option value={MediaType.SPONSOR_LOGO}>Sponsor Logo</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addMedia}
                                    className="mt-4 w-full py-3 border-2 border-dashed border-neutral-300 rounded-sm text-sm font-bold text-neutral-500 hover:border-orange-600 hover:text-orange-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <i className="ri-add-circle-line text-lg" /> Add Media
                                </button>
                            </div>

                            {/* Winners Section Note */}
                            <div className="mt-6  dark:bg-amber-950/20  p-5 rounded-2xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 text-orange-600">
                                        <i className="ri-trophy-line text-xl" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-neutral-900 ">
                                            Winner Announcement Tool
                                        </h4>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                            Winners can now be announced and edited directly from the event card on your <strong>My Events</strong> or <strong>Club Events</strong> page using the Three-Dot action menu.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dynamic Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t-2 border-neutral-100">
                        {currentStep === 1 ? (
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors font-black text-xs rounded-full tracking-widest order-2 sm:order-1 border-0 outline-none cursor-pointer"
                            >
                                Discard Changes
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="flex-1 px-6 py-3 bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors font-black text-xs rounded-full tracking-widest order-2 sm:order-1 border-0 outline-none cursor-pointer flex items-center justify-center gap-2"
                            >
                                <i className="ri-arrow-left-line text-sm" /> Back
                            </button>
                        )}

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="flex-1 px-6 py-3 bg-black hover:bg-orange-600 text-white font-black text-xs rounded-full tracking-widest transition-all order-1 sm:order-2 border-0 outline-none cursor-pointer flex items-center justify-center gap-2"
                            >
                                Next Step <i className="ri-arrow-right-line text-sm" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSaving}
                                className={`flex-1 px-6 py-3 text-white font-black text-xs rounded-full tracking-widest transition-all active:translate-x-1 active:translate-y-1 active:shadow-none order-1 sm:order-2 border-0 outline-none cursor-pointer ${
                                    isSaving ? 'bg-neutral-400 cursor-not-allowed shadow-none' : 'bg-black hover:bg-orange-600'
                                }`}
                            >
                                {isSaving ? 'Syncing...' : 'Update Event Details'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditEvent;
