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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] transition-colors">
        
        {/* Clean Standard Header */}
        <div className="px-6 py-4 border-b border-[#F0F0F0] dark:border-[#2A2A2A] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#111111] dark:text-[#F5F5F5] leading-tight">
                Announce / Manage Winners
              </h3>
              <p className="text-xs text-[#888888] dark:text-[#808080] font-normal truncate max-w-md mt-0.5">
                {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#555555] dark:text-[#B5B5B5]">
          {/* Public Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#FFF7ED] dark:bg-[#2A1A0F] border border-orange-200/60 dark:border-orange-900/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-[#F97316] dark:text-[#FB923C] shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-[#111111] dark:text-[#F5F5F5]">
                  Show Winners on Public Event Page
                </h4>
                <p className="text-xs text-[#555555] dark:text-[#B5B5B5]">
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
              <div className="w-11 h-6 bg-[#E5E5E5] dark:bg-[#303030] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#111111] dark:text-[#F5F5F5]">
                Winners Leaderboard
              </h4>
              <p className="text-xs text-[#888888] dark:text-[#808080]">
                {isTeamEvent
                  ? 'Enter Leader Roll No / Name to identify team'
                  : 'Enter Student Roll No to auto-fill details'}
              </p>
            </div>
            <button
              type="button"
              onClick={addWinner}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Winner
            </button>
          </div>

          {/* Winner Cards */}
          <div className="space-y-3">
            {winners.map((winner, index) => (
              <div
                key={index}
                className="p-4 bg-[#FAFAFA] dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#303030] rounded-xl relative group transition-all"
              >
                <button
                  type="button"
                  onClick={() => removeWinner(index)}
                  className="absolute top-3 right-3 p-1.5 text-[#888888] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  title="Remove winner"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-[70px_1fr_1fr] gap-3 pr-8 sm:pr-0 items-start">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-1 block">
                      Rank
                    </label>
                    <input
                      type="number"
                      value={winner.rank}
                      onChange={e => updateWinner(index, 'rank', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] text-xs font-bold outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-1 block">
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
                      className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] text-xs font-medium outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-1 block">
                      {isTeamEvent ? 'Team Name' : 'Winner Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={isTeamEvent ? 'Identified Team Name' : 'Identified Name'}
                      value={winner.name || ''}
                      onChange={e => updateWinner(index, 'name', e.target.value)}
                      className="w-full px-3.5 py-2 border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl bg-white dark:bg-[#181818] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] text-xs font-medium outline-none focus:border-[#F97316] dark:focus:border-[#FB923C] transition-colors"
                    />

                    {/* Team Members Tag Display */}
                    {winner.members && winner.members.length > 0 && (() => {
                      const raw = Array.isArray(winner.members)
                        ? winner.members.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean)
                        : [typeof winner.members === 'string' ? winner.members : winner.members?.name].filter(Boolean);
                      const uniqueM = Array.from(new Set(raw));
                      if (uniqueM.length === 0) return null;
                      return (
                        <div className="mt-2 p-2 bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-xl text-xs flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#888888] dark:text-[#808080] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[#111111] dark:text-[#F5F5F5]">Members: </span>
                            <span className="text-[#555555] dark:text-[#B5B5B5]">{uniqueM.join(', ')}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {winner.error && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">
                        {winner.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {winners.length === 0 && (
              <div className="text-center py-8 px-4 border border-dashed border-[#E5E5E5] dark:border-[#303030] rounded-xl">
                <Trophy className="w-8 h-8 text-[#888888] dark:text-[#808080] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[#888888] dark:text-[#808080] font-medium">
                  No winners added yet. Click "+ Add Winner" to declare results.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#F0F0F0] dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] border border-[#E5E5E5] dark:border-[#303030] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
