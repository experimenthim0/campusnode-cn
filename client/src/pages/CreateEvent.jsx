import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { createEvent } from '../services/eventService';
import { getClubs } from '../services/clubService';
import WysiwygMarkdownEditor from '../components/WysiwygMarkdownEditor';
import { EVENT_VENUES } from '../constants/eventVenues';
import { PROGRAM_LABELS, PROGRAM_OPTIONS, ALL_BRANCH_CODES } from '../constants/academicConstants';
import { MediaType } from '../types/index';
import EventFormStepper from '../components/EventFormStepper';
import AutosaveStatusBadge from '../components/AutosaveStatusBadge';
import { validateEventStep, validateAllEventSteps } from '../utils/eventValidation';
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Eye,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Sparkles,
  FileText,
  RotateCcw
} from 'lucide-react';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const BRANCHES = ALL_BRANCH_CODES;

const CreateEvent = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlClubId = searchParams.get('clubId');
    const { user } = useAuth();
    const { showNotification } = useNotification();

    const userId = user?.id || user?._id;
    const draftStorageKey = userId ? `campusnode:event-draft:${userId}` : null;

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
        createdBy: user?.id || user?._id,
        clubId: urlClubId || user?.clubId || user?.memberships?.find(m => m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR' || m.canEditEvents)?.clubId || user?.memberships?.[0]?.clubId || '',
        allowedPrograms: ['BTECH', 'MTECH', 'OTHER'],
        allowedYears: [],
        allowedBranches: [],
        allowExternal: true,
        showWinner: false,
        provideCertificate: false,
        feedbackEnabled: true,
        allowWaitlist: true,
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

    const [sponsors, setSponsors] = useState([]);
    const [media, setMedia] = useState([]);
    const [isFree, setIsFree] = useState(true);
    const [isUnlimited, setIsUnlimited] = useState(false);
    const [allYears, setAllYears] = useState(true);
    const [allBranches, setAllBranches] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [availableVenues, setAvailableVenues] = useState(EVENT_VENUES);
    const [availableClubs, setAvailableClubs] = useState([]);

    const eligibleClubs = useMemo(() => {
        if (user?.role === 'admin' || user?.role === 'SUPER_ADMIN') {
            return availableClubs;
        }
        if (user?.principalType === 'CLUB' || user?.role === 'club') {
            return [{ id: user.clubId || user._id, clubName: user.name || 'My Club' }];
        }
        return (user?.memberships || []).filter(
            m => m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR' || m.canEditEvents
        );
    }, [user, availableClubs]);

    useEffect(() => {
        if (urlClubId) {
            setFormData(prev => ({ ...prev, clubId: urlClubId }));
        } else if (!formData.clubId) {
            const defClub = user?.clubId || user?.memberships?.find(m => m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR' || m.canEditEvents)?.clubId || user?.memberships?.[0]?.clubId;
            if (defClub) {
                setFormData(prev => ({ ...prev, clubId: defClub }));
            }
        }
        if (user?.role === 'admin' || user?.role === 'SUPER_ADMIN') {
            getClubs().then(res => setAvailableClubs(res.data || [])).catch(() => {});
        }
    }, [user, urlClubId]);

    // Validation state
    const [fieldErrors, setFieldErrors] = useState({});
    const [stepErrors, setStepErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState([]);

    // Draft recovery state
    const [savedDraftPrompt, setSavedDraftPrompt] = useState(null);
    const [autosaveStatus, setAutosaveStatus] = useState('idle');
    const [lastSavedTime, setLastSavedTime] = useState(null);

    // Check for existing local draft on mount
    useEffect(() => {
        if (!draftStorageKey) return;
        try {
            const rawDraft = localStorage.getItem(draftStorageKey);
            if (rawDraft) {
                const parsed = JSON.parse(rawDraft);
                if (parsed && parsed.data && (parsed.data.title || parsed.data.description)) {
                    setSavedDraftPrompt({
                        data: parsed.data,
                        sponsors: parsed.sponsors || [],
                        media: parsed.media || [],
                        savedAt: parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently',
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to inspect local event draft:', e);
        }
    }, [draftStorageKey]);

    // Autosave to local storage (debounced)
    useEffect(() => {
        if (!draftStorageKey) return;
        if (formData.title || formData.description || formData.venue) {
            setAutosaveStatus('saving');
        }
        const timer = setTimeout(() => {
            if (formData.title || formData.description || formData.venue) {
                try {
                    const draftObj = {
                        data: formData,
                        sponsors,
                        media,
                        isUnlimited,
                        allYears,
                        allBranches,
                        timestamp: new Date().toISOString(),
                    };
                    localStorage.setItem(draftStorageKey, JSON.stringify(draftObj));
                    setAutosaveStatus('saved');
                    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                } catch (e) {
                    console.warn('Local draft autosave failed:', e);
                    setAutosaveStatus('error');
                }
            } else {
                setAutosaveStatus('idle');
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [formData, sponsors, media, isUnlimited, allYears, allBranches, draftStorageKey]);

    const restoreDraft = () => {
        if (!savedDraftPrompt) return;
        setFormData(prev => ({ ...prev, ...savedDraftPrompt.data }));
        if (savedDraftPrompt.sponsors) setSponsors(savedDraftPrompt.sponsors);
        if (savedDraftPrompt.media) setMedia(savedDraftPrompt.media);
        setSavedDraftPrompt(null);
        showNotification('Local draft restored!', 'success');
    };

    const discardDraft = () => {
        try {
            localStorage.removeItem(draftStorageKey);
        } catch (e) {
            console.warn('Failed to clear draft from storage:', e);
        }
        setSavedDraftPrompt(null);
        showNotification('Draft discarded.', 'info');
    };

    useEffect(() => {
        const fetchOpenVenues = async () => {
            try {
                const res = await api.get('/api/venues?openOnly=true');
                if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                    const fetchedVenues = res.data.map(v => typeof v === 'string' ? v : v.name);
                    setAvailableVenues([...new Set([...fetchedVenues, 'Online'])]);
                }
            } catch (err) {
                console.error("Failed to load open venues, falling back to static list:", err);
            }
        };
        fetchOpenVenues();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleBranchToggle = (branch) => {
        setFormData(prev => {
            const current = prev.allowedBranches || [];
            if (current.includes(branch)) {
                return { ...prev, allowedBranches: current.filter(b => b !== branch) };
            }
            return { ...prev, allowedBranches: [...current, branch] };
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size exceeds 5MB limit.', 'error');
            return;
        }
        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);
        try {
            const { data } = await api.post('/api/events/upload', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData(prev => ({ ...prev, imageUrl: data.secure_url }));
            showNotification('Poster uploaded successfully!', 'success');
        } catch (err) {
            showNotification(err.response?.data?.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleProgramToggle = (prog) => {
        setFormData(prev => {
            const current = prev.allowedPrograms;
            if (current.includes(prog)) {
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

    const addSponsor = () => {
        setSponsors(prev => [...prev, { name: '', logoUrl: '', websiteUrl: '' }]);
    };

    const removeSponsor = (index) => {
        setSponsors(prev => prev.filter((_, i) => i !== index));
    };

    const updateSponsor = (index, field, value) => {
        setSponsors(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addMedia = () => {
        setMedia(prev => [...prev, { url: '', type: MediaType.IMAGE }]);
    };

    const removeMedia = (index) => {
        setMedia(prev => prev.filter((_, i) => i !== index));
    };

    const updateMedia = (index, field, value) => {
        setMedia(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const buildPayload = useCallback((isDraftStatus = false) => {
        const effectiveClubId = formData.clubId || user?.clubId || user?.memberships?.find(m => m.role === 'CLUB_HEAD' || m.role === 'COORDINATOR' || m.canEditEvents)?.clubId || user?.memberships?.[0]?.clubId;
        return {
            ...formData,
            clubId: effectiveClubId,
            clubIds: effectiveClubId ? [effectiveClubId] : [],
            startTime: formData.startTime ? new Date(formData.startTime).toISOString() : null,
            endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
            registrationFee: formData.paymentMethod === 'FREE' ? 0 : Number(formData.registrationFee || 0),
            entryFee: formData.paymentMethod === 'FREE' ? 0 : Number(formData.registrationFee || 0),
            totalSeats: isUnlimited ? 0 : Number(formData.totalSeats || 0),
            registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : null,
            allowedYears: allYears ? [] : formData.allowedYears,
            allowedBranches: allBranches ? [] : formData.allowedBranches,
            allowExternal: Boolean(formData.allowExternal),
            allowWaitlist: isUnlimited ? false : Boolean(formData.allowWaitlist),
            registrationType: formData.registrationType || 'individual',
            minTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.minTeamSize || 1) : 1,
            maxTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.maxTeamSize || 1) : 1,
            sponsors: sponsors.map(s => ({ name: s.name, logoUrl: s.logoUrl, websiteUrl: s.websiteUrl || undefined })),
            media: media.map(m => ({ url: m.url, type: m.type })),
            paymentMethod: formData.paymentMethod,
            paymentInstructions: formData.paymentMethod === 'FREE'
                ? null
                : (formData.paymentMethod === 'MANUAL_TRANSACTION' && formData.upiId?.trim() && !formData.paymentInstructions?.includes(formData.upiId.trim())
                    ? (formData.paymentInstructions?.trim() ? `${formData.paymentInstructions.trim()}\nUPI ID: ${formData.upiId.trim()}` : `UPI ID: ${formData.upiId.trim()}`)
                    : (formData.paymentInstructions?.trim() || null)),
            collegePaymentUrl: formData.paymentMethod === 'COLLEGE_PAYMENT' ? (formData.collegePaymentUrl?.trim() || null) : null,
            accountHolderName: null,
            postRegistrationMessage: formData.postRegistrationMessage?.trim() || null,
            upiId: formData.paymentMethod === 'MANUAL_TRANSACTION' ? (formData.upiId?.trim() || null) : null,
            reviewStatus: isDraftStatus ? 'DRAFT' : 'PENDING',
            isDraft: isDraftStatus,
        };
    }, [formData, sponsors, media, isUnlimited, allYears, allBranches]);

    // Save as server draft
    const handleSaveServerDraft = async () => {
        if (!formData.title || formData.title.trim().length < 3) {
            setFieldErrors({ title: 'Event title must be at least 3 characters to save draft.' });
            setCurrentStep(1);
            return;
        }

        setIsSavingDraft(true);
        try {
            const payload = buildPayload(true);
            const res = await createEvent(payload);
            const created = res.data;
            try {
                localStorage.removeItem(draftStorageKey);
            } catch (e) {
                console.warn('Failed to clear draft key:', e);
            }
            showNotification('Draft created on server! Continuing in editor...', 'success');
            navigate(`/events/edit/${created.id || created._id}`);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to save server draft.', 'error');
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Step validation on Continue (validates ONLY current step)
    const handleNextStep = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const result = validateEventStep(currentStep, formData, {
            isDraft: false,
            isUnlimited,
            sponsors,
            media,
            allYears,
            allBranches,
        });

        if (!result.isValid) {
            setFieldErrors(result.errors);
            setStepErrors(prev => ({ ...prev, [currentStep]: true }));

            if (result.firstErrorField) {
                setTimeout(() => {
                    const el = document.querySelector(`[name="${result.firstErrorField}"]`) ||
                               document.getElementById(result.firstErrorField);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.focus();
                    }
                }, 50);
            }
            return;
        }

        setFieldErrors({});
        setStepErrors(prev => ({ ...prev, [currentStep]: false }));
        setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
        setCurrentStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setFieldErrors({});
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStepClick = (targetStep) => {
        if (targetStep === currentStep) return;
        setFieldErrors({});
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Final submission / go to preview
    const handleSubmit = async (e) => {
        if (e) {
            e.preventDefault();
        }

        if (isSubmitting) return;

        // If user presses Enter on steps 1-3, advance step instead of submitting early
        if (currentStep < 4) {
            handleNextStep(e);
            return;
        }

        // Validate all steps
        const vResult = validateAllEventSteps(formData, { sponsors, media, isUnlimited });
        if (!vResult.isValid) {
            setStepErrors(vResult.stepErrors);
            const firstBadStep = vResult.invalidSteps[0];
            if (firstBadStep) {
                setCurrentStep(firstBadStep.stepId);
                setFieldErrors(vResult.errorsByStep[firstBadStep.stepId]);
                showNotification(`Please complete all required fields in Step ${firstBadStep.stepId}.`, 'error');
            }
            return;
        }

        setIsSubmitting(true);
        try {
            // Create server Event in DRAFT status first so organizer can review on Preview page
            const payload = buildPayload(true);
            const res = await createEvent(payload);
            const created = res.data;
            try {
                localStorage.removeItem(draftStorageKey);
            } catch (e) {
                console.warn('Failed to clear draft key:', e);
            }
            showNotification('Event created! Opening preview...', 'success');
            navigate(`/events/${created.id || created._id}/preview`);
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to create event', 'error');
            setIsSubmitting(false);
        }
    };

    const renderFieldError = (fieldName) => {
        if (!fieldErrors[fieldName]) return null;
        return (
            <p id={`${fieldName}-error`} className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors[fieldName]}</span>
            </p>
        );
    };

    const inputCls =
        'w-full px-4 py-2.5 border border-neutral-200 dark:border-zinc-800 rounded-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/30 transition-all bg-cn-surface text-black dark:text-white placeholder:text-neutral-400';
    const labelCls =
        'block text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5';

    const getFieldCls = (fieldName) =>
        `${inputCls} ${fieldErrors[fieldName] ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-950/40' : ''}`;

    return (
        <div className="min-h-screen bg-cn-bg py-8 md:py-12 px-4 sm:px-6">
            {/* Fixed width & margin: eliminate ~384px gutter on desktop next to sidebar */}
            <div className="w-full max-w-5xl xl:max-w-6xl mx-auto md:mx-0 md:ml-6 lg:ml-10 pr-4 md:pr-8">

                {/* Header with Title and Autosave Status */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                            Create New Event
                        </h1>
                        <p className="text-xs md:text-sm text-neutral-500 mt-1">
                            Fill in details step-by-step. Draft saves automatically to your browser.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <AutosaveStatusBadge status={autosaveStatus} lastSavedTime={lastSavedTime} label="Locally saved" />
                        <button
                            type="button"
                            onClick={handleSaveServerDraft}
                            disabled={isSavingDraft}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer"
                        >
                            <Save className="w-3.5 h-3.5 text-brand-600" />
                            Save as Draft
                        </button>
                    </div>
                </div>

                {/* Restorable Draft Banner */}
                {savedDraftPrompt && (
                    <div className="mb-6 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center space-x-3">
                            <RotateCcw className="w-5 h-5 text-brand-600 shrink-0" />
                            <div>
                                <h4 className="text-xs font-bold text-brand-900 dark:text-brand-200 uppercase tracking-wider">
                                    Unsaved Draft Found
                                </h4>
                                <p className="text-xs text-brand-700 dark:text-brand-300">
                                    Found an unsaved local draft from {savedDraftPrompt.savedAt}
                                    {savedDraftPrompt.data.title ? ` ("${savedDraftPrompt.data.title}")` : ''}.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={restoreDraft}
                                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Restore Draft
                            </button>
                            <button
                                type="button"
                                onClick={discardDraft}
                                className="px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                )}

                {/* Compact, Validation-Aware Stepper */}
                <EventFormStepper
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    completedSteps={completedSteps}
                    stepErrors={stepErrors}
                    isEditMode={false}
                />

                {/* Main Form Container */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                    
                    {/* STEP 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest leading-none mb-0.5">
                                        Step 1
                                    </span>
                                    <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                        Basic Details
                                    </h2>
                                </div>
                            </div>

                            {/* Organizing Club Selection */}
                            {(eligibleClubs.length > 1 || user?.role === 'admin' || user?.role === 'SUPER_ADMIN') && (
                                <div>
                                    <label className={labelCls}>Organizing Club <span className="text-brand-600">*</span></label>
                                    <select
                                        name="clubId"
                                        className={getFieldCls('clubId')}
                                        value={formData.clubId}
                                        onChange={handleChange}
                                    >
                                        <option value="">Select Organizing Club</option>
                                        {eligibleClubs.map((m) => {
                                            const cid = m.clubId || m.id || m._id;
                                            const cname = m.club?.clubName || m.clubName || m.name;
                                            const roleTag = m.role ? ` (${m.role === 'CLUB_HEAD' ? 'Lead' : 'Coordinator'})` : '';
                                            return <option key={cid} value={cid}>{cname}{roleTag}</option>;
                                        })}
                                    </select>
                                    {renderFieldError('clubId')}
                                </div>
                            )}

                            {/* Event Title */}
                            <div>
                                <label className={labelCls}>Event Title <span className="text-brand-600">*</span></label>
                                <input
                                    type="text"
                                    name="title"
                                    className={getFieldCls('title')}
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter event title"
                                    aria-invalid={Boolean(fieldErrors.title)}
                                    aria-describedby={fieldErrors.title ? "title-error" : undefined}
                                />
                                {renderFieldError('title')}
                            </div>

                            {/* Description */}
                            <div>
                                <label className={labelCls}>Event Description</label>
                                <WysiwygMarkdownEditor
                                    value={formData.description}
                                    onChange={(markdown) => setFormData(prev => ({ ...prev, description: markdown }))}
                                    placeholder="Write a clear, engaging event description. Use the visual toolbar above to style headings, bold text, lists, and links..."
                                    minHeight="320px"
                                />
                                {renderFieldError('description')}
                            </div>

                            {/* Venue */}
                            <div>
                                <label className={labelCls}>Venue <span className="text-brand-600">*</span></label>
                                <select
                                    name="venue"
                                    className={getFieldCls('venue')}
                                    value={formData.venue}
                                    onChange={handleChange}
                                    aria-invalid={Boolean(fieldErrors.venue)}
                                >
                                    <option value="">Select Venue</option>
                                    {availableVenues.map((venue) => (
                                        <option key={venue} value={venue}>{venue}</option>
                                    ))}
                                </select>
                                {renderFieldError('venue')}
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
                                    className={`group flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 min-h-[140px] text-sm font-semibold text-neutral-400 cursor-pointer hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <i className="ri-loader-4-line text-2xl animate-spin text-brand-600" />
                                            <span>Uploading poster...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="ri-image-add-line text-4xl text-neutral-300 group-hover:text-brand-500 transition-colors" />
                                            <div className="text-center">
                                                <span className="text-brand-600 underline">Click to upload</span> or drag and drop
                                                <p className="text-xs text-neutral-400 mt-1">Supports PNG, JPG, JPEG, WEBP, GIF</p>
                                            </div>
                                        </>
                                    )}
                                </label>

                                {formData.imageUrl && (
                                    <div className="relative mt-4 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2 bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center">
                                        <img src={formData.imageUrl} alt="Poster Preview" className="max-h-64 object-contain rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                            className="absolute top-4 right-4 bg-black hover:bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors cursor-pointer"
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
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                    <Calendar className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest leading-none mb-0.5">
                                        Step 2
                                    </span>
                                    <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                        Schedule & Access
                                    </h2>
                                </div>
                            </div>

                            {/* Start & End Times */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Start Time <span className="text-brand-600">*</span></label>
                                    <input
                                        type="datetime-local"
                                        name="startTime"
                                        className={getFieldCls('startTime')}
                                        value={formData.startTime}
                                        onChange={handleChange}
                                    />
                                    {renderFieldError('startTime')}
                                </div>
                                <div>
                                    <label className={labelCls}>End Time <span className="text-brand-600">*</span></label>
                                    <input
                                        type="datetime-local"
                                        name="endTime"
                                        className={getFieldCls('endTime')}
                                        value={formData.endTime}
                                        onChange={handleChange}
                                    />
                                    {renderFieldError('endTime')}
                                </div>
                            </div>

                            {/* Registration Deadline */}
                            <div>
                                <label className={labelCls}>Registration Deadline <span className="text-neutral-400 font-normal">(optional)</span></label>
                                <input
                                    type="datetime-local"
                                    name="registrationDeadline"
                                    className={getFieldCls('registrationDeadline')}
                                    value={formData.registrationDeadline}
                                    onChange={handleChange}
                                />
                                <p className="text-[11px] text-neutral-400 mt-1">Leave empty to allow registration until event start.</p>
                                {renderFieldError('registrationDeadline')}
                            </div>

                            {/* Academic Programs */}
                            <div>
                                <label className={labelCls}>Allowed Academic Programs <span className="text-brand-600">*</span></label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {PROGRAM_OPTIONS.map((prog) => {
                                        const isSelected = formData.allowedPrograms.includes(prog);
                                        return (
                                            <button
                                                key={prog}
                                                type="button"
                                                onClick={() => handleProgramToggle(prog)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                                                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                                                }`}
                                            >
                                                {PROGRAM_LABELS[prog] || prog}
                                            </button>
                                        );
                                    })}
                                </div>
                                {renderFieldError('allowedPrograms')}
                            </div>

                            {/* Allowed Years */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={labelCls}>Allowed Academic Years</label>
                                    <label className="flex items-center space-x-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allYears}
                                            onChange={(e) => setAllYears(e.target.checked)}
                                            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Allow All Years</span>
                                    </label>
                                </div>
                                {!allYears && (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {YEARS.map((yr) => {
                                            const isSelected = formData.allowedYears.includes(yr);
                                            return (
                                                <button
                                                    key={yr}
                                                    type="button"
                                                    onClick={() => handleYearToggle(yr)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900'
                                                            : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                                                    }`}
                                                >
                                                    {yr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {renderFieldError('allowedYears')}
                            </div>

                            {/* Allowed Branches */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={labelCls}>Allowed Branches</label>
                                    <label className="flex items-center space-x-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allBranches}
                                            onChange={(e) => setAllBranches(e.target.checked)}
                                            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Allow All Branches</span>
                                    </label>
                                </div>
                                {!allBranches && (
                                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-40 overflow-y-auto p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                                        {BRANCHES.map((br) => {
                                            const isSelected = (formData.allowedBranches || []).includes(br);
                                            return (
                                                <button
                                                    key={br}
                                                    type="button"
                                                    onClick={() => handleBranchToggle(br)}
                                                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-neutral-900 text-white border-neutral-900'
                                                            : 'bg-white dark:bg-neutral-800 text-neutral-600 border-neutral-200'
                                                    }`}
                                                >
                                                    {br}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {renderFieldError('allowedBranches')}
                            </div>

                            {/* External Participation Checkbox */}
                            <div className="pt-2">
                                <label className="flex items-center space-x-2 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="allowExternal"
                                        checked={Boolean(formData.allowExternal)}
                                        onChange={(e) => setFormData(prev => ({ ...prev, allowExternal: e.target.checked }))}
                                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="font-semibold">Allow External (Non-Campus) Participants</span>
                                </label>
                                <p className="text-xs text-neutral-400 mt-0.5 ml-6">
                                    Enables students from other institutions to register with external credentials.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Registration & Payment */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                    <CreditCard className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest leading-none mb-0.5">
                                        Step 3
                                    </span>
                                    <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                        Registration & Payment
                                    </h2>
                                </div>
                            </div>

                            {/* Registration Type */}
                            <div>
                                <label className={labelCls}>Registration Mode <span className="text-brand-600">*</span></label>
                                <select
                                    name="registrationType"
                                    className={inputCls}
                                    value={formData.registrationType}
                                    onChange={handleChange}
                                >
                                    <option value="individual">Individual Registration</option>
                                    <option value="team">Team Only</option>
                                    <option value="both">Both Individual & Team</option>
                                </select>
                            </div>

                            {/* Team Size inputs */}
                            {(formData.registrationType === 'team' || formData.registrationType === 'both') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30">
                                    <div>
                                        <label className={labelCls}>Min Team Size</label>
                                        <input
                                            type="number"
                                            name="minTeamSize"
                                            min="1"
                                            className={getFieldCls('minTeamSize')}
                                            value={formData.minTeamSize}
                                            onChange={handleChange}
                                        />
                                        {renderFieldError('minTeamSize')}
                                    </div>
                                    <div>
                                        <label className={labelCls}>Max Team Size</label>
                                        <input
                                            type="number"
                                            name="maxTeamSize"
                                            min="1"
                                            className={getFieldCls('maxTeamSize')}
                                            value={formData.maxTeamSize}
                                            onChange={handleChange}
                                        />
                                        {renderFieldError('maxTeamSize')}
                                    </div>
                                </div>
                            )}

                            {/* Total Seats & Unlimited Option */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className={labelCls}>Total Seats</label>
                                    <label className="flex items-center space-x-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isUnlimited}
                                            onChange={(e) => {
                                                setIsUnlimited(e.target.checked);
                                                if (e.target.checked) setFormData(prev => ({ ...prev, totalSeats: 0 }));
                                            }}
                                            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span>Unlimited Seats</span>
                                    </label>
                                </div>
                                {!isUnlimited && (
                                    <input
                                        type="number"
                                        name="totalSeats"
                                        min="1"
                                        className={getFieldCls('totalSeats')}
                                        value={formData.totalSeats}
                                        onChange={handleChange}
                                        placeholder="e.g. 100"
                                    />
                                )}
                                {renderFieldError('totalSeats')}
                            </div>

                            {/* Waitlist Toggle */}
                            {!isUnlimited && (
                                <div>
                                    <label className="flex items-center space-x-2 text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="allowWaitlist"
                                            checked={Boolean(formData.allowWaitlist)}
                                            onChange={(e) => setFormData(prev => ({ ...prev, allowWaitlist: e.target.checked }))}
                                            className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <span className="font-semibold">Enable Waiting List</span>
                                    </label>
                                    <p className="text-xs text-neutral-400 mt-0.5 ml-6">
                                        Attendees can join a waitlist once seats are full.
                                    </p>
                                </div>
                            )}

                            {/* Payment Option Selector */}
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <label className={labelCls}>Payment Option <span className="text-brand-600">*</span></label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'FREE', title: 'Free Event', desc: 'No registration fee charged' },
                                        { id: 'MANUAL_TRANSACTION', title: 'Manual UPI Payment', desc: 'Direct UPI ID with QR code generation & UPI apps' },
                                        { id: 'COLLEGE_PAYMENT', title: 'College Payment Portal', desc: 'Official SBI Collect or College ERP payment URL' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    paymentMethod: opt.id,
                                                    upiId: opt.id === 'MANUAL_TRANSACTION' ? prev.upiId : '',
                                                    collegePaymentUrl: opt.id === 'COLLEGE_PAYMENT' ? prev.collegePaymentUrl : '',
                                                    registrationFee: opt.id === 'FREE' ? 0 : (prev.registrationFee || 50),
                                                }));
                                                setIsFree(opt.id === 'FREE');
                                            }}
                                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                                                formData.paymentMethod === opt.id
                                                    ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/20 ring-1 ring-brand-600'
                                                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                                            }`}
                                        >
                                            <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                                                {opt.title}
                                            </span>
                                            <span className="text-[11px] text-neutral-500 mt-0.5 block">
                                                {opt.desc}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paid Event Details: Manual UPI Payment */}
                            {formData.paymentMethod === 'MANUAL_TRANSACTION' && (
                                <div className="space-y-4 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30">
                                    <div>
                                        <label className={labelCls}>Registration Fee (₹) <span className="text-brand-600">*</span></label>
                                        <input
                                            type="number"
                                            name="registrationFee"
                                            min="1"
                                            className={getFieldCls('registrationFee')}
                                            value={formData.registrationFee}
                                            onChange={handleChange}
                                            placeholder="e.g. 100"
                                        />
                                        {renderFieldError('registrationFee')}
                                    </div>

                                    <div>
                                        <label className={labelCls}>Beneficiary UPI ID <span className="text-brand-600">*</span></label>
                                        <input
                                            type="text"
                                            name="upiId"
                                            className={getFieldCls('upiId')}
                                            value={formData.upiId}
                                            onChange={handleChange}
                                            placeholder="e.g. clubname@oksbi or 9876543210@paytm"
                                        />
                                        {renderFieldError('upiId')}
                                        <p className="text-[11px] text-neutral-400 mt-1">Used to generate dynamic QR codes and mobile UPI app links (GPay, PhonePe, Paytm, BHIM).</p>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Payment Instructions <span className="text-neutral-400 font-normal">(Optional)</span></label>
                                        <textarea
                                            name="paymentInstructions"
                                            rows="2"
                                            className={inputCls}
                                            value={formData.paymentInstructions}
                                            onChange={handleChange}
                                            placeholder="Additional guidelines shown to attendees during payment (e.g. category selection, transfer steps)..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Paid Event Details: College Payment Portal */}
                            {formData.paymentMethod === 'COLLEGE_PAYMENT' && (
                                <div className="space-y-4 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/30">
                                    <div>
                                        <label className={labelCls}>Registration Fee (₹) <span className="text-brand-600">*</span></label>
                                        <input
                                            type="number"
                                            name="registrationFee"
                                            min="1"
                                            className={getFieldCls('registrationFee')}
                                            value={formData.registrationFee}
                                            onChange={handleChange}
                                            placeholder="e.g. 100"
                                        />
                                        {renderFieldError('registrationFee')}
                                    </div>

                                    <div>
                                        <label className={labelCls}>Official College Payment Portal URL <span className="text-brand-600">*</span></label>
                                        <input
                                            type="text"
                                            name="collegePaymentUrl"
                                            className={getFieldCls('collegePaymentUrl')}
                                            value={formData.collegePaymentUrl}
                                            onChange={handleChange}
                                            placeholder="https://www.onlinesbi.sbi/sbicollect/..."
                                        />
                                        {renderFieldError('collegePaymentUrl')}
                                        <p className="text-[11px] text-neutral-400 mt-1">Attendees will see a direct button that opens this official portal in a new tab without closing their registration.</p>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Payment Instructions <span className="text-neutral-400 font-normal">(Optional)</span></label>
                                        <textarea
                                            name="paymentInstructions"
                                            rows="2"
                                            className={inputCls}
                                            value={formData.paymentInstructions}
                                            onChange={handleChange}
                                            placeholder="Guidelines for portal payment (e.g. select category, department name, fee head)..."
                                        />
                                    </div>
                                </div>
                            )}

                            

                            {/* Custom Registration Form Fields */}
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                            Custom Registration Questions
                                        </h3>
                                        <p className="text-xs text-neutral-400">
                                            Collect additional details (e.g. GitHub profile, dietary preference, T-shirt size).
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addCustomField}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Question
                                    </button>
                                </div>

                                {formData.customFields.map((cf, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-3 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-neutral-500">Question #{idx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeCustomField(idx)}
                                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="text"
                                                    placeholder="Question label (e.g. T-shirt Size)"
                                                    className={inputCls}
                                                    value={cf.label}
                                                    onChange={(e) => updateCustomField(idx, 'label', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <select
                                                    className={inputCls}
                                                    value={cf.type}
                                                    onChange={(e) => updateCustomField(idx, 'type', e.target.value)}
                                                >
                                                    <option value="text">Text Input</option>
                                                    <option value="textarea">Long Text</option>
                                                    <option value="select">Dropdown Options</option>
                                                    <option value="checkbox">Checkbox (Yes/No)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {cf.type === 'select' && (
                                            <div className="pl-2 border-l-2 border-brand-500 space-y-2 mt-2">
                                                <span className="text-[11px] font-semibold text-neutral-400 block">
                                                    Dropdown Choices:
                                                </span>
                                                {(cf.options || []).map((opt, oIdx) => (
                                                    <div key={oIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateCustomFieldOption(idx, oIdx, e.target.value)}
                                                            placeholder={`Option ${oIdx + 1}`}
                                                            className={inputCls}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeOptionFromField(idx, oIdx)}
                                                            className="text-neutral-400 hover:text-rose-600 cursor-pointer"
                                                        >
                                                            <i className="ri-delete-bin-line" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => addOptionToField(idx)}
                                                    className="text-xs text-brand-600 hover:underline font-semibold cursor-pointer"
                                                >
                                                    + Add Choice
                                                </button>
                                            </div>
                                        )}

                                        <label className="flex items-center space-x-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(cf.required)}
                                                onChange={(e) => updateCustomField(idx, 'required', e.target.checked)}
                                                className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span>Required answer</span>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            {/* Post-Registration Message / Links */}
                            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-1.5">
                                <label className={labelCls}>Post-Registration Message & Links (Optional)</label>
                                <textarea
                                    name="postRegistrationMessage"
                                    rows="2"
                                    className={inputCls}
                                    value={formData.postRegistrationMessage}
                                    onChange={handleChange}
                                    placeholder="e.g. Join the official participants WhatsApp group: https://chat.whatsapp.com/... for schedule and announcements."
                                />
                                <p className="text-[11px] text-neutral-400">
                                    Shown to participants immediately after successful registration (supports clickable WhatsApp/Discord links).
                                </p>
                            </div>
                        </div>
                                        )}

                    {/* STEP 4: Extras */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center gap-3 pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-brand-600" />
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest leading-none mb-0.5">
                                        Step 4
                                    </span>
                                    <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                        Extras & Settings
                                    </h2>
                                </div>
                            </div>

                            {/* Additional Settings Toggles */}
                            <div className="space-y-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
                                <label className="flex items-center justify-between text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer">
                                    <span className="font-semibold">Provide Certificates to Attendees</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.provideCertificate)}
                                        onChange={(e) => setFormData(prev => ({ ...prev, provideCertificate: e.target.checked }))}
                                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                    <span className="font-semibold">Enable Attendee Post-Event Feedback</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.feedbackEnabled)}
                                        onChange={(e) => setFormData(prev => ({ ...prev, feedbackEnabled: e.target.checked }))}
                                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </label>

                                <label className="flex items-center justify-between text-sm text-neutral-800 dark:text-neutral-200 cursor-pointer pt-2 border-t border-neutral-200 dark:border-neutral-700">
                                    <span className="font-semibold">Publicly Display Winners After Event</span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formData.showWinner)}
                                        onChange={(e) => setFormData(prev => ({ ...prev, showWinner: e.target.checked }))}
                                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </label>
                            </div>

                            {/* Sponsors Section */}
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                            Event Sponsors
                                        </h3>
                                        <p className="text-xs text-neutral-400">
                                            Add sponsor partner logos and links.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addSponsor}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Sponsor
                                    </button>
                                </div>

                                {sponsors.map((sp, sIdx) => (
                                    <div
                                        key={sIdx}
                                        className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-3 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-neutral-500">Sponsor #{sIdx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeSponsor(sIdx)}
                                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Sponsor Name"
                                                className={inputCls}
                                                value={sp.name}
                                                onChange={(e) => updateSponsor(sIdx, 'name', e.target.value)}
                                            />
                                            <input
                                                type="url"
                                                placeholder="Logo URL (https://...)"
                                                className={inputCls}
                                                value={sp.logoUrl}
                                                onChange={(e) => updateSponsor(sIdx, 'logoUrl', e.target.value)}
                                            />
                                            <input
                                                type="url"
                                                placeholder="Website URL (optional)"
                                                className={inputCls}
                                                value={sp.websiteUrl}
                                                onChange={(e) => updateSponsor(sIdx, 'websiteUrl', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Media Section */}
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                                            Media Gallery
                                        </h3>
                                        <p className="text-xs text-neutral-400">
                                            Highlight images and videos from previous iterations.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addMedia}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Media
                                    </button>
                                </div>

                                {media.map((m, mIdx) => (
                                    <div
                                        key={mIdx}
                                        className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 mb-3 bg-neutral-50/40 dark:bg-neutral-800/20 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-neutral-500">Media #{mIdx + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(mIdx)}
                                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2">
                                                <input
                                                    type="url"
                                                    placeholder="Media URL (https://...)"
                                                    className={inputCls}
                                                    value={m.url}
                                                    onChange={(e) => updateMedia(mIdx, 'url', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <select
                                                    className={inputCls}
                                                    value={m.type}
                                                    onChange={(e) => updateMedia(mIdx, 'type', e.target.value)}
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
                        </div>
                    )}

                    {/* Step Navigation Action Bar */}
                    <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                        {/* Left action: Back or Profile */}
                        <div>
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={handlePrevStep}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
                                </button>
                            ) : (
                                <Link
                                    to="/profile"
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </Link>
                            )}
                        </div>

                        {/* Right actions: Save Draft & Next/Preview */}
                        <div className="flex items-center space-x-3">
                            <AutosaveStatusBadge status={autosaveStatus} lastSavedTime={lastSavedTime} label="Draft saved" />
                            <button
                                type="button"
                                disabled={isSavingDraft}
                                onClick={handleSaveServerDraft}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save Draft
                            </button>

                            {currentStep < 4 ? (
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm cursor-pointer"
                                >
                                    Continue <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    {isSubmitting ? 'Creating Event...' : 'Preview Event →'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEvent;
