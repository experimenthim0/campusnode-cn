import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import WysiwygMarkdownEditor from '../components/WysiwygMarkdownEditor';
import api from '../services/api';
import { updateEvent, getEventById } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import { EVENT_VENUES } from '../constants/eventVenues';
import { PROGRAM_LABELS, PROGRAM_OPTIONS, ALL_BRANCH_CODES } from '../constants/academicConstants';
import { MediaType } from '../types/index';
import EventFormStepper from '../components/EventFormStepper';
import ShimmerText from '../components/ShimmerText';
import AutosaveStatusBadge from '../components/AutosaveStatusBadge';
import { validateEventStep, validateAllEventSteps } from '../utils/eventValidation';
import {
  Eye,
  Save,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Upload,
  Clock,
  Calendar,
  MapPin,
  ExternalLink,
  Plus,
  Trash2,
  CreditCard,
  Sparkles
} from 'lucide-react';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const BRANCHES = ALL_BRANCH_CODES;

const EditEvent = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
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
        allowExternal: true,
        winners: [],
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

    // Validation & Stepper state
    const [fieldErrors, setFieldErrors] = useState({});
    const [stepErrors, setStepErrors] = useState({});
    const [completedSteps, setCompletedSteps] = useState([1, 2, 3, 4]);

    // Autosave state
    const [autosaveStatus, setAutosaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error' | 'idle'
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const isInitialMount = useRef(true);
    const saveSequenceRef = useRef(0);
    const autosaveTimerRef = useRef(null);
    const lastKnownUpdatedAtRef = useRef(null);
    const inFlightSaveRef = useRef(false);
    const lastSavedPayloadRef = useRef({});
    const isDirtyRef = useRef(false);

    // Sync step from query param (e.g. ?step=2 from Preview)
    useEffect(() => {
        const stepParam = parseInt(searchParams.get('step'), 10);
        if (stepParam >= 1 && stepParam <= 4) {
            setCurrentStep(stepParam);
        }
    }, [searchParams]);

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
        if (isNaN(date.getTime())) return '';
        const pad = (num) => String(num).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // Thoroughly erase any stale local draft, edit cache, or collision keys for this event across storage
    const purgeLocalEventData = useCallback((eventId = id) => {
        try {
            if (!eventId) return;
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.includes(eventId) || k.startsWith(`event_draft_${eventId}`) || k.startsWith(`edit_event_${eventId}`))) {
                    keysToRemove.push(k);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('Storage cleanup notice:', e);
        }
    }, [id]);

    // Authoritative event state applicator
    const applyEventToState = useCallback((event) => {
        if (!event) return;
        lastKnownUpdatedAtRef.current = event.updatedAt;
        const payMethod = event.paymentMethod || ((event.entryFee > 0 || event.registrationFee > 0) ? 'MANUAL_TRANSACTION' : 'FREE');
        const feeAmt = event.registrationFee ?? event.entryFee ?? 0;

        setFormData({
            title: event.title || '',
            description: event.description || '',
            venue: event.venue || '',
            startTime: toLocalISOString(event.startTime),
            endTime: toLocalISOString(event.endTime),
            totalSeats: event.totalSeats || '',
            entryFee: feeAmt,
            imageUrl: event.imageUrl || '',
            requiredFields: event.requiredFields || [],
            customFields: event.customFields || [],
            registrationDeadline: toLocalISOString(event.registrationDeadline),
            allowedPrograms: event.allowedPrograms || ['BTECH', 'MTECH', 'OTHER'],
            allowedYears: event.allowedYears || [],
            allowedBranches: event.allowedBranches || [],
            allowExternal: event.allowExternal !== undefined ? event.allowExternal : true,
            winners: event.winners || [],
            showWinner: event.showWinner || false,
            provideCertificate: event.provideCertificate || false,
            feedbackEnabled: event.feedbackEnabled !== undefined ? event.feedbackEnabled : true,
            allowWaitlist: event.allowWaitlist !== undefined ? event.allowWaitlist : true,
            registrationType: event.registrationType || 'individual',
            minTeamSize: event.minTeamSize || 1,
            maxTeamSize: event.maxTeamSize || 1,
            paymentMethod: payMethod,
            registrationFee: feeAmt,
            paymentInstructions: event.paymentInstructions || '',
            collegePaymentUrl: event.collegePaymentUrl || '',
            upiId: event.upiId || '',
            accountHolderName: event.accountHolderName || '',
            postRegistrationMessage: event.postRegistrationMessage || '',
        });

        if (event.sponsors && event.sponsors.length > 0) {
            setSponsors(event.sponsors.map(s => ({
                name: s.name,
                logoUrl: s.logoUrl,
                websiteUrl: s.websiteUrl || ''
            })));
        } else {
            setSponsors([]);
        }

        if (event.media && event.media.length > 0) {
            setMedia(event.media.map(m => ({
                url: m.url,
                type: m.type
            })));
        } else {
            setMedia([]);
        }

        setIsFree(payMethod === 'FREE');
        setIsUnlimited(!event.totalSeats || event.totalSeats === 0);
        setAllYears(!event.allowedYears || event.allowedYears.length === 0);
        setAllBranches(!event.allowedBranches || event.allowedBranches.length === 0);
        setReviewInfo({
            reviewStatus: event.reviewStatus,
            reviewComment: event.reviewComment,
            reviewedBy: event.reviewedBy,
        });

        // Compute step errors across all steps
        const vResult = validateAllEventSteps(
            {
                ...event,
                startTime: event.startTime,
                endTime: event.endTime,
                paymentMethod: payMethod,
                registrationFee: feeAmt,
            },
            {
                sponsors: event.sponsors || [],
                media: event.media || [],
                isUnlimited: !event.totalSeats || event.totalSeats === 0,
            }
        );
        setStepErrors(vResult.stepErrors);
        isDirtyRef.current = false;
    }, []);

    // Initial load: Fetch fresh event from server and purge any stale local cached data
    useEffect(() => {
        const fetchEvent = async () => {
            try {
                purgeLocalEventData(id);
                const res = await getEventById(id, { skipIncrement: true });
                applyEventToState(res.data);
            } catch (err) {
                showNotification(err.response?.data?.message || 'Failed to load event details', 'error');
                navigate('/events');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchEvent();
        }
    }, [id, navigate, showNotification, purgeLocalEventData, applyEventToState]);

    // Multi-device sync: When user switches back to this tab/window,
    // detect if another device updated the event and sync automatically.
    useEffect(() => {
        const handleSyncCheck = async () => {
            if (document.visibilityState !== 'visible' || !id || loading) return;
            try {
                // Erase local storage to avoid collisions
                purgeLocalEventData(id);

                const res = await getEventById(id, { skipIncrement: true });
                const serverEvent = res.data;
                if (!serverEvent?.updatedAt) return;

                const serverUpdatedTime = new Date(serverEvent.updatedAt).getTime();
                const localUpdatedTime = lastKnownUpdatedAtRef.current
                    ? new Date(lastKnownUpdatedAtRef.current).getTime()
                    : 0;

                // Server has newer changes saved from another device/session
                if (serverUpdatedTime > localUpdatedTime) {
                    if (!isDirtyRef.current) {
                        // User has no unsaved local typing in this tab -> auto-sync immediately
                        applyEventToState(serverEvent);
                        showNotification('Event data synchronized with latest changes.', 'info');
                    } else {
                        // User was actively typing in this tab -> notify non-intrusively
                        showNotification(
                            'A newer version of this event was saved on another device.',
                            'warning'
                        );
                    }
                }
            } catch (err) {
                console.warn('Cross-device sync check notice:', err.message);
            }
        };

        window.addEventListener('focus', handleSyncCheck);
        document.addEventListener('visibilitychange', handleSyncCheck);

        return () => {
            window.removeEventListener('focus', handleSyncCheck);
            document.removeEventListener('visibilitychange', handleSyncCheck);
        };
    }, [id, loading, showNotification, purgeLocalEventData, applyEventToState]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        isDirtyRef.current = true;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear field-level error when user edits
        if (fieldErrors[name]) {
            setFieldErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
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

    // Helper to construct normalized step-specific update payload
    // Note: expectedUpdatedAt is intentionally omitted so updates across multiple devices/sessions
    // are seamlessly accepted without triggering artificial 409 stale data conflicts.
    const buildStepPayload = useCallback((stepNumber = currentStep) => {
        const base = {};

        if (stepNumber === 1) {
            return {
                ...base,
                title: formData.title,
                description: formData.description,
                imageUrl: formData.imageUrl?.trim() || '',
            };
        }

        if (stepNumber === 2) {
            const sTime = formData.startTime ? new Date(formData.startTime) : null;
            const eTime = formData.endTime ? new Date(formData.endTime) : null;
            const dTime = formData.registrationDeadline ? new Date(formData.registrationDeadline) : null;

            return {
                ...base,
                venue: formData.venue || '',
                startTime: sTime && !isNaN(sTime.getTime()) ? sTime.toISOString() : undefined,
                endTime: eTime && !isNaN(eTime.getTime()) ? eTime.toISOString() : undefined,
                registrationDeadline: dTime && !isNaN(dTime.getTime()) ? dTime.toISOString() : null,
                allowedPrograms: formData.allowedPrograms,
                allowedYears: allYears ? [] : formData.allowedYears,
                allowedBranches: allBranches ? [] : formData.allowedBranches,
                allowExternal: Boolean(formData.allowExternal),
            };
        }

        if (stepNumber === 3) {
            const isFree = formData.paymentMethod === 'FREE';
            const fee = isFree ? 0 : Number(formData.registrationFee || 0);
            const collegeUrl = formData.paymentMethod === 'COLLEGE_PAYMENT' ? formData.collegePaymentUrl?.trim() : null;

            return {
                ...base,
                totalSeats: isUnlimited ? 0 : Number(formData.totalSeats || 0),
                allowWaitlist: isUnlimited ? false : Boolean(formData.allowWaitlist),
                registrationType: formData.registrationType || 'individual',
                minTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.minTeamSize || 1) : 1,
                maxTeamSize: (formData.registrationType === 'team' || formData.registrationType === 'both') ? Number(formData.maxTeamSize || 1) : 1,
                entryFee: fee,
                registrationFee: fee,
                paymentMethod: formData.paymentMethod,
                paymentInstructions: isFree ? null : (formData.paymentInstructions || null),
                collegePaymentUrl: collegeUrl || null,
                upiId: formData.paymentMethod === 'MANUAL_TRANSACTION' ? (formData.upiId || null) : null,
                accountHolderName: formData.paymentMethod === 'MANUAL_TRANSACTION' ? (formData.accountHolderName || null) : null,
                requiredFields: formData.requiredFields || [],
                customFields: formData.customFields || [],
                postRegistrationMessage: formData.postRegistrationMessage || null,
            };
        }

        if (stepNumber === 4) {
            const validSponsors = (sponsors || [])
                .filter(s => s && s.name && s.name.trim() && s.logoUrl && s.logoUrl.trim())
                .map(s => ({
                    name: s.name.trim(),
                    logoUrl: s.logoUrl.trim(),
                    websiteUrl: s.websiteUrl?.trim() || null,
                }));

            const validMedia = (media || [])
                .filter(m => m && m.url && m.url.trim())
                .map(m => ({
                    url: m.url.trim(),
                    type: m.type,
                }));

            return {
                ...base,
                sponsors: validSponsors,
                media: validMedia,
                provideCertificate: Boolean(formData.provideCertificate),
                certificateTemplate: formData.certificateTemplate || null,
                feedbackEnabled: formData.feedbackEnabled !== undefined ? Boolean(formData.feedbackEnabled) : true,
                winners: (formData.winners || []).map(({ error, ...rest }) => rest),
                showWinner: Boolean(formData.showWinner),
            };
        }

        return base;
    }, [formData, sponsors, media, isUnlimited, allYears, allBranches, currentStep]);

    // Independent main step saving function
    // Independent from autosave: can always be triggered manually by the user
    const handleSaveCurrentStep = async (stepNumber = currentStep) => {
        // Clear any pending debounced autosave so it doesn't double-fire
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }
        // Invalidate in-flight autosave callbacks so their catch/finally never interfere with manual save
        saveSequenceRef.current++;
        inFlightSaveRef.current = false;
        setIsSaving(true);
        setAutosaveStatus('saving');
        try {
            const payload = buildStepPayload(stepNumber);
            const res = await updateEvent(id, payload);
            if (res.data?.updatedAt) {
                lastKnownUpdatedAtRef.current = res.data.updatedAt;
            }
            lastSavedPayloadRef.current[stepNumber] = JSON.stringify(payload);
            isDirtyRef.current = false;

            // Erase any local storage keys for this event to avoid collisions
            purgeLocalEventData(id);

            setAutosaveStatus('saved');
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            showNotification(`Step ${stepNumber} changes saved.`, 'success');
            return true;
        } catch (err) {
            if (err.response?.status === 409 && err.response?.data?.conflict) {
                setFieldErrors(prev => ({
                    ...prev,
                    venue: err.response.data.message || 'Selected venue/time conflicts with another booking.'
                }));
            }
            setAutosaveStatus('error');
            showNotification(err.response?.data?.message || 'Failed to save changes.', 'error');
            return false;
        } finally {
            setIsSaving(false);
            inFlightSaveRef.current = false;
        }
    };

    // Debounced autosave (strictly non-intrusive background helper)
    // If autosave fails, it will NEVER block manual saving or form usage
    useEffect(() => {
        if (loading) return;
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // Record initial baseline payloads for all steps
            [1, 2, 3, 4].forEach(s => {
                const p = buildStepPayload(s);
                lastSavedPayloadRef.current[s] = JSON.stringify(p);
            });
            return;
        }

        // Basic sanity check before attempting autosave to avoid unnecessary 400s while user types
        const isStepReadyForAutosave = () => {
            if (currentStep === 1) {
                if (!formData.title || formData.title.trim().length < 3) return false;
            }
            if (currentStep === 2) {
                if (formData.startTime && formData.endTime) {
                    const start = new Date(formData.startTime);
                    const end = new Date(formData.endTime);
                    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return false;
                }
            }
            if (currentStep === 3) {
                if (formData.paymentMethod === 'COLLEGE_PAYMENT' && formData.collegePaymentUrl) {
                    if (!/^https?:\/\/.+/i.test(formData.collegePaymentUrl.trim())) return false;
                }
            }
            return true;
        };

        if (!isStepReadyForAutosave()) {
            return;
        }

        const payload = buildStepPayload(currentStep);
        const serialized = JSON.stringify(payload);

        // Don't save if step payload hasn't changed since last save
        if (lastSavedPayloadRef.current[currentStep] === serialized) {
            return;
        }

        setAutosaveStatus('saving');
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        const currentSeq = ++saveSequenceRef.current;
        autosaveTimerRef.current = setTimeout(async () => {
            if (inFlightSaveRef.current || isSaving) return;
            inFlightSaveRef.current = true;
            try {
                const savePayload = buildStepPayload(currentStep);
                const res = await updateEvent(id, savePayload);
                if (res.data?.updatedAt) {
                    lastKnownUpdatedAtRef.current = res.data.updatedAt;
                }
                lastSavedPayloadRef.current[currentStep] = JSON.stringify(savePayload);
                isDirtyRef.current = false;

                if (saveSequenceRef.current === currentSeq) {
                    setAutosaveStatus('saved');
                    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                }
            } catch (err) {
                if (saveSequenceRef.current === currentSeq) {
                    console.warn('Autosave background notice (non-blocking):', err.response?.data?.message || err.message);
                    // Autosave failure is purely informational and NEVER blocks the main form or main save
                    setAutosaveStatus('error');
                }
            } finally {
                inFlightSaveRef.current = false;
            }
        }, 1500);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [formData, sponsors, media, isUnlimited, allYears, allBranches, id, loading, buildStepPayload, currentStep]);

    // Step navigation: Forward validation & smooth step commit
    const handleNextStep = async (e) => {
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

            // Focus and scroll to first invalid field
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

        // Attempt background step commit when continuing without blocking navigation
        handleSaveCurrentStep(currentStep).catch(() => {});

        setCurrentStep(prev => Math.min(prev + 1, 4));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleGoToPreview = async () => {
        const result = validateEventStep(4, formData, {
            isDraft: false,
            isUnlimited,
            sponsors,
            media,
            allYears,
            allBranches,
        });

        if (!result.isValid) {
            setFieldErrors(result.errors);
            setStepErrors(prev => ({ ...prev, 4: true }));
            return;
        }

        // Commit step 4 before navigating to preview
        await handleSaveCurrentStep(4);
        navigate(`/events/${id}/preview`);
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

    // Direct step click navigation (organizer can click ANY step directly)
    const handleStepClick = (targetStep) => {
        if (targetStep === currentStep) return;
        setFieldErrors({});
        setCurrentStep(targetStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Helper for rendering inline error message
    const renderFieldError = (fieldName) => {
        if (!fieldErrors[fieldName]) return null;
        return (
            <p id={`${fieldName}-error`} className="text-xs text-rose-600 mt-1.5 flex items-center gap-1 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors[fieldName]}</span>
            </p>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cn-bg flex items-center justify-center">
                <ShimmerText text="Loading event..." className="text-[13px] font-bold uppercase tracking-widest" />
            </div>
        );
    }

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
                
                {/* Header with Title, Autosave Status, and Quick Preview Button */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
                            Edit Event
                        </h1>
                        <p className="text-xs md:text-sm text-neutral-500 mt-1">
                            Modify any section directly. Changes autosave automatically.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <AutosaveStatusBadge
                            status={autosaveStatus}
                            lastSavedTime={lastSavedTime}
                            onRetry={() => handleSaveCurrentStep(currentStep)}
                        />
                        <Link
                            to={`/events/${id}/preview`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 transition-colors shadow-xs cursor-pointer"
                        >
                            <Eye className="w-3.5 h-3.5 text-brand-600" />
                            Preview Event
                        </Link>
                    </div>
                </div>

                {/* Rejection / Review Feedback Notice Banner */}
                {reviewInfo?.reviewStatus === 'REJECTED' && (
                    <div className="mb-6 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/60 rounded-xl p-5 shadow-xs flex items-start gap-4">
                        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-600 shrink-0 mt-0.5">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2.5 py-0.5 rounded-full">
                                    Proposal Needs Revision
                                </span>
                                {reviewInfo.reviewedBy?.name && (
                                    <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                        Reviewed by: <strong>{reviewInfo.reviewedBy.name}</strong>
                                    </span>
                                )}
                            </div>
                            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100 mt-1">
                                Reviewer Feedback:
                            </h4>
                            <p className="text-sm text-rose-800 dark:text-rose-200 mt-1 bg-white/80 dark:bg-neutral-900/60 p-3 rounded-lg border border-rose-200 dark:border-rose-800/80">
                                {reviewInfo.reviewComment || "Please update the event details as requested and resubmit for approval."}
                            </p>
                            <div className="mt-3 flex items-center gap-3">
                                <Link
                                    to={`/events/${id}/preview`}
                                    className="inline-flex items-center text-xs font-semibold text-rose-700 dark:text-rose-300 underline hover:text-rose-900 cursor-pointer"
                                >
                                    View in Preview & Resubmit →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Compact, Validation-Aware Stepper */}
                <EventFormStepper
                    currentStep={currentStep}
                    onStepClick={handleStepClick}
                    completedSteps={completedSteps}
                    stepErrors={stepErrors}
                    isEditMode={true}
                />

                {/* Main Form Container */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                    
                    {/* STEP 1: Basic Details */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                        <i className="ri-file-text-line text-brand-600 text-base" />
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
                                <button
                                    type="button"
                                    onClick={() => handleSaveCurrentStep(1)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Save Step 1
                                </button>
                            </div>

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
                            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
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
                                <button
                                    type="button"
                                    onClick={() => handleSaveCurrentStep(2)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Save Step 2
                                </button>
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
                            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
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
                                <button
                                    type="button"
                                    onClick={() => handleSaveCurrentStep(3)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Save Step 3
                                </button>
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

                            {/* Payment Method Selector */}
                            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <label className={labelCls}>Payment Option <span className="text-brand-600">*</span></label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { id: 'FREE', title: 'Free Event', desc: 'No fee charged' },
                                        { id: 'MANUAL_TRANSACTION', title: 'UPI Verification', desc: 'Manual transaction ID check' },
                                        { id: 'COLLEGE_PAYMENT', title: 'College Portal', desc: 'Official payment gateway' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, paymentMethod: opt.id }));
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

                            {/* Paid Event Details */}
                            {formData.paymentMethod !== 'FREE' && (
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
                                            placeholder="e.g. 50"
                                        />
                                        {renderFieldError('registrationFee')}
                                    </div>

                                    {formData.paymentMethod === 'MANUAL_TRANSACTION' && (
                                        <>
                                            <div>
                                                <label className={labelCls}>UPI ID / Phone Number <span className="text-brand-600">*</span></label>
                                                <input
                                                    type="text"
                                                    name="upiId"
                                                    className={getFieldCls('upiId')}
                                                    value={formData.upiId}
                                                    onChange={handleChange}
                                                    placeholder="e.g. clubname@oksbi or 9876543210"
                                                />
                                                {renderFieldError('upiId')}
                                            </div>
                                            <div>
                                                <label className={labelCls}>Account Holder Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    name="accountHolderName"
                                                    className={inputCls}
                                                    value={formData.accountHolderName}
                                                    onChange={handleChange}
                                                    placeholder="e.g. John Doe (Club Treasurer)"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {formData.paymentMethod === 'COLLEGE_PAYMENT' && (
                                        <div>
                                            <label className={labelCls}>College Payment Portal URL <span className="text-brand-600">*</span></label>
                                            <input
                                                type="url"
                                                name="collegePaymentUrl"
                                                className={getFieldCls('collegePaymentUrl')}
                                                value={formData.collegePaymentUrl}
                                                onChange={handleChange}
                                                placeholder="https://payment.nitj.ac.in/..."
                                            />
                                            {renderFieldError('collegePaymentUrl')}
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelCls}>Payment Instructions</label>
                                        <textarea
                                            name="paymentInstructions"
                                            rows="2"
                                            className={inputCls}
                                            value={formData.paymentInstructions}
                                            onChange={handleChange}
                                            placeholder="Instructions shown to attendee during registration..."
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

                            {/* Post Registration Message */}
                            <div>
                                <label className={labelCls}>Post-Registration Success Message (Optional)</label>
                                <textarea
                                    name="postRegistrationMessage"
                                    rows="2"
                                    className={inputCls}
                                    value={formData.postRegistrationMessage}
                                    onChange={handleChange}
                                    placeholder="Message displayed to attendee after successfully registering (e.g. WhatsApp group link)..."
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Extras */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-between pb-5 border-b border-neutral-100 dark:border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-brand-600" />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-brand-600 uppercase tracking-widest leading-none mb-0.5">
                                            Step 4
                                        </span>
                                        <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                                            Extras & Event Settings
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSaveCurrentStep(4)}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 transition-colors cursor-pointer"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Save Step 4
                                </button>
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

                    {/* Independent Step Action Bar */}
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
                                    Cancel & Return
                                </Link>
                            )}
                        </div>

                        {/* Right actions: Save Step & Next/Preview */}
                        <div className="flex items-center space-x-3">
                            <AutosaveStatusBadge
                                status={autosaveStatus}
                                lastSavedTime={lastSavedTime}
                                onRetry={() => handleSaveCurrentStep(currentStep)}
                            />
                            {/* Explicit independent save for the current step */}
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveCurrentStep(currentStep)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                Save Changes
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
                                    type="button"
                                    disabled={isSaving}
                                    onClick={handleGoToPreview}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Go to Preview →
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditEvent;
