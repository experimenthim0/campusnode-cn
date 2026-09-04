import React from 'react';
import { Radio, Bell, Send } from 'lucide-react';
import { DataTable, Th, Td, Modal } from '../components/AdminUI';

const BroadcastsTab = ({
    broadcasts = [],
    loadingBroadcasts,
    events = [],
    broadcastModalOpen,
    setBroadcastModalOpen,
    broadcastForm,
    setBroadcastForm,
    sendingBroadcast,
    handleSendBroadcast
}) => {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-start gap-3">
                <Radio size={20} className="shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider">Real-Time Broadcast Engine</h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                        Broadcast announcements are dispatched instantly via WebSocket live feeds and recorded in student notification feeds.
                    </p>
                </div>
            </div>

            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>#</Th>
                        <Th>Broadcast Title & Message</Th>
                        <Th>Target Audience</Th>
                        <Th>Sender</Th>
                        <Th align="right">Date & Time</Th>
                    </tr>
                </thead>
                <tbody>
                    {broadcasts.map((b, idx) => (
                        <tr key={b._id || b.id || idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                            <Td className="text-neutral-400 dark:text-neutral-600 font-mono font-medium">{idx + 1}</Td>
                            <Td className="max-w-md">
                                <p className="font-bold text-black dark:text-white text-sm">{b.title}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">{b.message}</p>
                            </Td>
                            <Td>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-zinc-700">
                                    <Radio size={11} className="text-brand-500" />
                                    {b.recipientStudentId ? 'Direct Student' : 'All Students'}
                                </span>
                            </Td>
                            <Td className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                                {b.sender?.name || b.sender?.clubName || 'Admin'}
                            </Td>
                            <Td align="right" className="text-xs text-neutral-400 font-mono">
                                {new Date(b.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </Td>
                        </tr>
                    ))}
                    {broadcasts.length === 0 && !loadingBroadcasts && (
                        <tr>
                            <td colSpan="5" className="px-5 py-16 text-center text-neutral-400 text-sm">
                                No broadcast history found. Click "New Broadcast" to send your first message.
                            </td>
                        </tr>
                    )}
                </tbody>
            </DataTable>

            {/* Modal: Broadcast Creation */}
            {broadcastModalOpen && (
                <Modal 
                    onClose={() => setBroadcastModalOpen(false)} 
                    title="Send Broadcast Announcement" 
                    subtitle="Dispatch announcements to all students or event participants"
                >
                    <form onSubmit={handleSendBroadcast} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-2">Target Audience</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                                    broadcastForm.targetType === 'ALL_STUDENTS' 
                                        ? 'border-brand-500 bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] font-bold' 
                                        : 'border-[#E5E5E5] dark:border-[#303030] bg-[#FAFAFA] dark:bg-[#222222] text-[#555555] dark:text-[#B5B5B5]'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="targetType" 
                                        value="ALL_STUDENTS" 
                                        checked={broadcastForm.targetType === 'ALL_STUDENTS'}
                                        onChange={() => setBroadcastForm(prev => ({ ...prev, targetType: 'ALL_STUDENTS' }))}
                                        className="hidden" 
                                    />
                                    <Radio size={16} />
                                    <span className="text-xs">All Students</span>
                                </label>

                                <label className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                                    broadcastForm.targetType === 'REGISTERED_STUDENTS' 
                                        ? 'border-brand-500 bg-[#FFF7ED] dark:bg-[#2A1A0F] text-[#F97316] dark:text-[#FB923C] font-bold' 
                                        : 'border-[#E5E5E5] dark:border-[#303030] bg-[#FAFAFA] dark:bg-[#222222] text-[#555555] dark:text-[#B5B5B5]'
                                }`}>
                                    <input 
                                        type="radio" 
                                        name="targetType" 
                                        value="REGISTERED_STUDENTS" 
                                        checked={broadcastForm.targetType === 'REGISTERED_STUDENTS'}
                                        onChange={() => setBroadcastForm(prev => ({ ...prev, targetType: 'REGISTERED_STUDENTS' }))}
                                        className="hidden" 
                                    />
                                    <Bell size={16} />
                                    <span className="text-xs">Event Participants</span>
                                </label>
                            </div>
                        </div>

                        {broadcastForm.targetType === 'REGISTERED_STUDENTS' && (
                            <div>
                                <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Select Event</label>
                                <select
                                    value={broadcastForm.eventId}
                                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, eventId: e.target.value }))}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                                >
                                    <option value="">-- Choose an Event --</option>
                                    {events.map(e => {
                                        const club = (e.clubName && e.clubName !== 'Unknown' && e.clubName !== 'Unknown Club')
                                            ? e.clubName
                                            : (e.club?.clubName || 'ODSW');
                                        return (
                                            <option key={e.id || e.eventId} value={e.id || e.eventId}>
                                                {e.eventName || e.title} ({club})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Broadcast Title</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Registration Extended for TechFest 2026"
                                value={broadcastForm.title}
                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                                required
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">Message Content</label>
                            <textarea 
                                rows={4}
                                placeholder="Write your broadcast message here..."
                                value={broadcastForm.message}
                                onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                                required
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors"
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-[#F0F0F0] dark:border-[#2A2A2A]">
                            <button
                                type="button"
                                onClick={() => setBroadcastModalOpen(false)}
                                className="px-4 py-2.5 bg-transparent hover:bg-[#F5F5F5] text-[#111111] border border-[#E5E5E5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] dark:text-[#F5F5F5] dark:border-[#303030] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={sendingBroadcast}
                                className="px-5 py-2.5 bg-[#F97316] hover:bg-[#EA580C] text-white dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                            >
                                <Send size={14} />
                                <span>{sendingBroadcast ? 'Dispatching...' : 'Send Broadcast'}</span>
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default BroadcastsTab;
