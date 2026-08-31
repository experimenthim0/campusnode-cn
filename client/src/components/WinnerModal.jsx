import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { updateEvent } from '../services/eventService';
import { useNotification } from '../context/NotificationContext';
import { Trophy, Plus, Trash2, X, Check, Loader2, Award, Users } from 'lucide-react';

const WinnerModal = ({ isOpen, onClose, event, onWinnersUpdated }) => {
  const { showNotification } = useNotification();
  const [showWinner, setShowWinner] = useState(false);
  const [winners, setWinners] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setShowWinner(event.showWinner ?? false);
      setWinners(
        Array.isArray(event.winners) && event.winners.length > 0
          ? event.winners.map((w, idx) => ({
              rank: w.rank || idx + 1,
              rollNo: w.rollNo || '',
              name: w.name || '',
              members: w.members || [],
              leaderName: w.leaderName || '',
              error: null
            }))
          : []
      );
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const eventId = event.id || event._id;
  const isTeamEvent = event.registrationType === 'team' || event.registrationType === 'both';

  const addWinner = () => {
    setWinners(prev => [
      ...prev,
      {
        rank: prev.length + 1,
        rollNo: '',
        name: '',
        members: [],
        leaderName: '',
        error: null
      }
    ]);
  };

  const removeWinner = (index) => {
    setWinners(prev => prev.filter((_, i) => i !== index));
  };

  const updateWinner = (index, field, value) => {
    setWinners(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleWinnerLookup = async (index, queryVal) => {
    if (!queryVal || !queryVal.trim()) return;
    if (isTeamEvent) {
      try {
        const res = await api.get(
          `/api/teams/event/${eventId}/lookup-leader?query=${encodeURIComponent(queryVal.trim())}`
        );
        const { teamName, members, leaderName } = res.data;

        setWinners(prev => {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            name: teamName,
            members: members || [],
            leaderName: leaderName || '',
            error: null
          };
          return updated;
        });
        return;
      } catch (err) {
        // Fallback to student lookup
      }
    }

    try {
      const res = await api.get(
        `/api/users/lookup/${encodeURIComponent(queryVal.trim())}`
      );
      const { name, branch } = res.data;
      const displayName = branch ? `${name} (${branch})` : name;

      setWinners(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          name: displayName,
          members: [],
          leaderName: '',
          error: null
        };
        return updated;
      });
    } catch (err) {
      setWinners(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          name: '',
          members: [],
          leaderName: '',
          error: isTeamEvent ? 'No registered team or student found.' : 'Student not found.'
        };
        return updated;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sanitizedWinners = winners.map(({ error, ...rest }) => rest);

      const res = await updateEvent(eventId, {
        winners: sanitizedWinners,
        showWinner
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Trophy className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Announce / Manage Winners</h3>
              <p className="text-xs text-amber-100 font-medium truncate max-w-md">
                {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Public Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Show Winners on Public Event Page
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
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
              <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                Winners Leaderboard
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {isTeamEvent
                  ? 'Enter Leader Roll No / Name to identify team'
                  : 'Enter Student Roll No to auto-fill details'}
              </p>
            </div>
            <button
              type="button"
              onClick={addWinner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all cursor-pointer hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" /> Add Winner
            </button>
          </div>

          {/* Winner Cards */}
          <div className="space-y-3">
            {winners.map((winner, index) => (
              <div
                key={index}
                className="p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/60 rounded-xl relative group transition-all"
              >
                <button
                  type="button"
                  onClick={() => removeWinner(index)}
                  className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Remove winner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-[70px_1fr_1fr] gap-3 pr-8 sm:pr-0 items-start">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1 block">
                      Rank
                    </label>
                    <input
                      type="number"
                      value={winner.rank}
                      onChange={e => updateWinner(index, 'rank', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1 block">
                      {isTeamEvent ? 'Leader Roll No / Name' : 'Roll Number'}
                    </label>
                    <input
                      type="text"
                      placeholder={isTeamEvent ? 'Enter Leader Roll No / Name' : 'e.g. 21103001'}
                      value={winner.rollNo || ''}
                      onChange={e => {
                        const val = e.target.value;
                        updateWinner(index, 'rollNo', val);
                        if (val.trim().length >= 3) {
                          handleWinnerLookup(index, val);
                        }
                      }}
                      onBlur={e => handleWinnerLookup(index, e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-medium outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1 block">
                      {isTeamEvent ? 'Team Name' : 'Winner Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={isTeamEvent ? 'Identified Team Name' : 'Identified Name'}
                      value={winner.name || ''}
                      onChange={e => updateWinner(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-medium outline-none focus:border-orange-500"
                    />

                    {/* Team Members Tag Display */}
                    {winner.members && winner.members.length > 0 && (() => {
                      const raw = Array.isArray(winner.members)
                        ? winner.members.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean)
                        : [typeof winner.members === 'string' ? winner.members : winner.members?.name].filter(Boolean);
                      const uniqueM = Array.from(new Set(raw));
                      if (uniqueM.length === 0) return null;
                      return (
                        <div className="mt-2 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-neutral-900 dark:text-white">Members: </span>
                            <span className="text-neutral-600 dark:text-neutral-400">{uniqueM.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {winner.error && (
                      <p className="text-[10px] text-rose-500 font-semibold mt-1">
                        {winner.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {winners.length === 0 && (
              <div className="text-center py-8 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
                <Trophy className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  No winners added yet. Click "+ Add Winner" to declare results.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
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
