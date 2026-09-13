import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { updateEvent } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import { Trophy, Plus, Trash2, X, Check, Loader2, Award, Users, AlertCircle, Search, CheckCircle2 } from 'lucide-react';

const WinnerModal = ({ isOpen, onClose, event, onWinnersUpdated }) => {
  const { showNotification } = useNotification();
  const [showWinner, setShowWinner] = useState(false);
  const [winners, setWinners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSuggestions, setCandidateSuggestions] = useState({});
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const searchTimeoutRef = useRef({});

  const eventId = event?.id || event?._id;
  const isTeamEvent = event?.registrationType === 'team' || event?.registrationType === 'both';

  // Fetch participant count and initial candidates from server
  const fetchCandidatesSummary = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoadingCandidates(true);
      const res = await api.get(`/api/events/${eventId}/winner-candidates`);
      setTotalParticipants(res.data?.totalParticipants ?? 0);
    } catch (err) {
      console.error('Failed to fetch winner candidates summary:', err);
      // If error, fallback to event's registeredCount if available
      setTotalParticipants(event?.registeredCount ?? 0);
    } finally {
      setLoadingCandidates(false);
    }
  }, [eventId, event?.registeredCount]);

  useEffect(() => {
    if (isOpen && event) {
      setShowWinner(event.showWinner ?? false);
      setWinners(
        Array.isArray(event.winners) && event.winners.length > 0
          ? event.winners.map((w, idx) => ({
              rank: w.rank || idx + 1,
              rollNo: w.rollNo || w.leaderRollNo || '',
              name: w.name || '',
              studentId: w.studentId || '',
              teamId: w.teamId || '',
              members: w.members || [],
              leaderName: w.leaderName || '',
              error: null,
            }))
          : []
      );
      fetchCandidatesSummary();
    } else {
      setCandidateSuggestions({});
      setActiveDropdownIndex(null);
    }
  }, [isOpen, event, fetchCandidatesSummary]);

  if (!isOpen || !event) return null;

  const hasZeroParticipation = totalParticipants === 0;

  const addWinner = () => {
    if (hasZeroParticipation) return;
    setWinners(prev => [
      ...prev,
      {
        rank: prev.length + 1,
        rollNo: '',
        name: '',
        studentId: '',
        teamId: '',
        members: [],
        leaderName: '',
        error: null,
      }
    ]);
  };

  const removeWinner = (index) => {
    setWinners(prev => prev.filter((_, i) => i !== index));
    setActiveDropdownIndex(null);
  };

  const updateWinner = (index, field, value) => {
    setWinners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Search candidates strictly for this event
  const searchEventCandidates = async (index, queryVal) => {
    if (!queryVal || !queryVal.trim()) {
      setCandidateSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }

    try {
      const res = await api.get(
        `/api/events/${eventId}/winner-candidates?query=${encodeURIComponent(queryVal.trim())}`
      );
      const matches = res.data?.candidates || [];
      setCandidateSuggestions(prev => ({ ...prev, [index]: matches }));
      setActiveDropdownIndex(index);
    } catch (err) {
      setCandidateSuggestions(prev => ({ ...prev, [index]: [] }));
    }
  };

  const handleInputChange = (index, val) => {
    updateWinner(index, 'rollNo', val);

    // Clear previous debounce timer
    if (searchTimeoutRef.current[index]) {
      clearTimeout(searchTimeoutRef.current[index]);
    }

    if (val.trim().length >= 1) {
      searchTimeoutRef.current[index] = setTimeout(() => {
        searchEventCandidates(index, val);
      }, 250);
    } else {
      setCandidateSuggestions(prev => ({ ...prev, [index]: [] }));
      setActiveDropdownIndex(null);
    }
  };

  const handleSelectCandidate = (index, candidate) => {
    setWinners(prev => {
      const updated = [...prev];
      if (candidate.type === 'team') {
        updated[index] = {
          ...updated[index],
          teamId: candidate.teamId || candidate.id,
          name: candidate.name,
          rollNo: candidate.leaderRollNo || candidate.rollNo || '',
          leaderName: candidate.leaderName || '',
          members: candidate.members || [],
          error: null,
        };
      } else {
        updated[index] = {
          ...updated[index],
          studentId: candidate.studentId || candidate.id,
          name: candidate.name,
          rollNo: candidate.rollNo || '',
          branch: candidate.branch || '',
          members: [],
          leaderName: '',
          error: null,
        };
      }
      return updated;
    });

    setActiveDropdownIndex(null);
    setCandidateSuggestions(prev => ({ ...prev, [index]: [] }));
  };

  const handleInputBlur = async (index, queryVal) => {
    // Delay hiding dropdown so clicks register
    setTimeout(async () => {
      setActiveDropdownIndex(null);

      if (!queryVal || !queryVal.trim()) return;
      const current = winners[index];
      if (current?.name && (current?.studentId || current?.teamId)) return;

      // Validate that the query matches an actual event participant
      try {
        const res = await api.get(
          `/api/events/${eventId}/winner-candidates?query=${encodeURIComponent(queryVal.trim())}`
        );
        const candidates = res.data?.candidates || [];

        const exactMatch = candidates.find(c => {
          const qLower = queryVal.trim().toLowerCase();
          if (c.type === 'team') {
            return (
              c.name?.toLowerCase() === qLower ||
              c.leaderRollNo?.toLowerCase() === qLower ||
              c.leaderEmail?.toLowerCase() === qLower
            );
          }
          return (
            c.rollNo?.toLowerCase() === qLower ||
            c.email?.toLowerCase() === qLower ||
            c.name?.toLowerCase() === qLower
          );
        });

        if (exactMatch) {
          handleSelectCandidate(index, exactMatch);
        } else if (candidates.length === 1) {
          handleSelectCandidate(index, candidates[0]);
        } else {
          setWinners(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              name: '',
              error: isTeamEvent
                ? 'Team or leader is not registered for this event.'
                : 'Student did not participate in this event.',
            };
            return updated;
          });
        }
      } catch (err) {
        setWinners(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            name: '',
            error: 'Failed to verify participant for this event.',
          };
          return updated;
        });
      }
    }, 250);
  };

  const handleSave = async () => {
    if (hasZeroParticipation && winners.length > 0) {
      showNotification('Cannot announce winners for an event with zero participants.', 'error');
      return;
    }

    const hasErrors = winners.some(w => w.error);
    if (hasErrors) {
      showNotification('Please resolve invalid participant errors before saving.', 'error');
      return;
    }

    const incomplete = winners.some(w => !w.name || !w.name.trim());
    if (incomplete) {
      showNotification('All declared winners must have a valid participant name.', 'error');
      return;
    }

    setSaving(true);
    try {
      const sanitizedWinners = winners.map(({ error, suggestions, showSuggestions, loadingLookup, ...rest }) => rest);

      const res = await updateEvent(eventId, {
        winners: sanitizedWinners,
        showWinner,
      });

      showNotification('Winners updated successfully!', 'success');
      if (onWinnersUpdated) onWinnersUpdated(res.data);
      onClose();
    } catch (err) {
      console.error('Save winners error:', err);
      showNotification(err.response?.data?.message || 'Failed to update winners', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (rank === 2) return 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30';
    if (rank === 3) return 'text-amber-700 bg-amber-700/10 border-amber-700/30';
    return 'text-brand-500 bg-brand-500/10 border-brand-500/20';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-cn-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-cn-text leading-tight">
                Announce / Manage Winners
              </h3>
              <p className="text-xs text-cn-text-muted font-normal truncate max-w-md mt-0.5">
                {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-secondary hover:text-cn-text hover:bg-cn-surface-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-cn-text-secondary">
          
          {/* Zero Participation Banner */}
          {hasZeroParticipation && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Zero Participation Warning
                </h5>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  This event has zero registered participants. Winners cannot be declared or published until students or teams register for this event.
                </p>
              </div>
            </div>
          )}

          {/* Public Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-brand-50 dark:bg-brand-950/40 border border-brand-200/60 dark:border-brand-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-brand-500 dark:text-brand-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-cn-text">
                  Show Winners on Public Event Page
                </h4>
                <p className="text-xs text-cn-text-secondary">
                  Feature the leaderboard banner on the main event card and details page.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={showWinner}
                onChange={e => setShowWinner(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-cn-border dark:bg-cn-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-cn-text flex items-center gap-2">
                <span>Winners Leaderboard</span>
                {totalParticipants !== null && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cn-surface-muted dark:bg-cn-surface-elevated text-cn-text-muted border border-cn-border dark:border-cn-border-subtle">
                    {totalParticipants} eligible {isTeamEvent ? 'teams' : 'participants'}
                  </span>
                )}
              </h4>
              <p className="text-xs text-cn-text-muted">
                {isTeamEvent
                  ? 'Search registered teams by team name or leader roll number'
                  : 'Search attendees by student roll number or name'}
              </p>
            </div>
            <button
              type="button"
              onClick={addWinner}
              disabled={hasZeroParticipation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-neutral-900 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Add Winner
            </button>
          </div>

          {/* Winner Cards */}
          <div className="space-y-3">
            {winners.map((winner, index) => (
              <div
                key={index}
                className="p-4 bg-cn-surface-muted dark:bg-cn-surface-elevated border border-cn-border dark:border-cn-border-subtle rounded-xl relative group transition-all"
              >
                <button
                  type="button"
                  onClick={() => removeWinner(index)}
                  className="absolute top-3 right-3 p-1.5 text-cn-text-muted hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Remove winner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-[70px_1fr_1fr] gap-3 pr-8 sm:pr-0 items-start">
                  {/* Rank */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-1 block">
                      Rank
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        value={winner.rank}
                        onChange={e => updateWinner(index, 'rank', Number(e.target.value))}
                        className="w-full px-3 py-2 border border-cn-border dark:border-cn-border-subtle rounded-xl bg-cn-surface dark:bg-cn-surface-card text-cn-text text-xs font-bold outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Search Candidate Input with Live Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-1 block flex items-center justify-between">
                      <span>{isTeamEvent ? 'Leader Roll No / Team' : 'Participant Roll No / Name'}</span>
                      <Search className="w-3 h-3 text-cn-text-muted" />
                    </label>
                    <input
                      type="text"
                      placeholder={isTeamEvent ? 'Search registered team / leader...' : 'Search participant roll no...'}
                      value={winner.rollNo || ''}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onFocus={() => {
                        if (candidateSuggestions[index]?.length > 0) {
                          setActiveDropdownIndex(index);
                        }
                      }}
                      onBlur={e => handleInputBlur(index, e.target.value)}
                      className={`w-full px-3.5 py-2 border rounded-xl bg-cn-surface dark:bg-cn-surface-card text-cn-text placeholder-cn-text-muted text-xs font-medium outline-none transition-colors ${
                        winner.error ? 'border-danger-500 focus:border-danger-500' : 'border-cn-border dark:border-cn-border-subtle focus:border-brand-500'
                      }`}
                    />

                    {/* Autocomplete Dropdown */}
                    {activeDropdownIndex === index && candidateSuggestions[index]?.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-cn-border-subtle">
                        {candidateSuggestions[index].map((candidate, cIdx) => (
                          <div
                            key={cIdx}
                            onMouseDown={() => handleSelectCandidate(index, candidate)}
                            className="p-2.5 hover:bg-brand-50 dark:hover:bg-brand-950/40 cursor-pointer transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-cn-text">
                                {candidate.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/60 text-brand-600 dark:text-brand-300 font-semibold">
                                {candidate.type === 'team' ? 'Team' : candidate.status || 'Verified'}
                              </span>
                            </div>
                            <div className="text-[11px] text-cn-text-muted mt-0.5 truncate">
                              {candidate.type === 'team'
                                ? `Leader: ${candidate.leaderName || 'N/A'} (${candidate.leaderRollNo || 'N/A'})`
                                : `Roll No: ${candidate.rollNo || 'External'} · ${candidate.branch || ''}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Confirmed Name Display */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-cn-text-muted mb-1 block flex items-center gap-1">
                      <span>{isTeamEvent ? 'Identified Team Name' : 'Verified Participant'}</span>
                      {winner.name && !winner.error && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder={isTeamEvent ? 'Selected Team Name' : 'Verified Attendee Name'}
                      value={winner.name || ''}
                      className="w-full px-3.5 py-2 border border-cn-border dark:border-cn-border-subtle rounded-xl bg-cn-surface/60 dark:bg-cn-surface-card/60 text-cn-text placeholder-cn-text-muted text-xs font-semibold outline-none cursor-default"
                    />

                    {/* Team Members Tag Display */}
                    {winner.members && winner.members.length > 0 && (() => {
                      const raw = Array.isArray(winner.members)
                        ? winner.members.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean)
                        : [typeof winner.members === 'string' ? winner.members : winner.members?.name].filter(Boolean);
                      const uniqueM = Array.from(new Set(raw));
                      if (uniqueM.length === 0) return null;
                      return (
                        <div className="mt-2 p-2 bg-cn-surface dark:bg-cn-surface-card border border-cn-border dark:border-cn-border-subtle rounded-xl text-xs flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cn-text-muted shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-cn-text">Members: </span>
                            <span className="text-cn-text-secondary">{uniqueM.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {winner.error && (
                      <p className="text-[11px] text-danger-500 font-semibold mt-1">
                        {winner.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {winners.length === 0 && (
              <div className="text-center py-8 px-4 border border-dashed border-cn-border dark:border-cn-border-subtle rounded-xl">
                <Trophy className="w-8 h-8 text-cn-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-cn-text-muted font-medium">
                  {hasZeroParticipation
                    ? 'No participants registered yet. Winner declaration will be available once attendees register.'
                    : 'No winners added yet. Click "+ Add Winner" to declare results from event attendees.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-cn-border-subtle bg-transparent dark:bg-cn-surface-card flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-cn-text bg-transparent hover:bg-cn-surface-muted border border-cn-border dark:border-cn-border-subtle rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || (hasZeroParticipation && winners.length > 0)}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 dark:bg-brand-400 dark:hover:bg-brand-500 dark:text-neutral-900 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save Winners
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
