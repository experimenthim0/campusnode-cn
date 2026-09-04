import React from 'react';
import { DataTable, Th, Td, Modal, ModalField } from '../components/AdminUI';

const PayoutsTab = ({
    eventStats = [],
    modalOpen,
    setModalOpen,
    selectedClub,
    handleFetchPayoutInfo,
    handleConfirmPayout
}) => {
    const paidEvents = eventStats.filter(item => item.entryFee > 0);

    return (
        <>
            <DataTable>
                <thead>
                    <tr className="border-b border-neutral-200 dark:border-zinc-800">
                        <Th>Club Name</Th>
                        <Th>Event Title</Th>
                        <Th>Amount</Th>
                        <Th>Registrations</Th>
                        <Th>Deadline</Th>
                        <Th align="right">Action</Th>
                    </tr>
                </thead>
                <tbody>
                    {paidEvents.map((item, idx) => {
                        const displayClubName = (item.clubName && item.clubName !== 'Unknown' && item.clubName !== 'Unknown Club')
                            ? item.clubName
                            : (item.club?.clubName || 'ODSW');
                        return (
                            <tr key={idx} className="border-b border-neutral-100 dark:border-zinc-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                                <Td className="font-semibold text-black dark:text-white" title={displayClubName === 'ODSW' ? 'Office of DSW' : displayClubName}>{displayClubName}</Td>
                                <Td>{item.title}</Td>
                                <Td className="font-mono font-black text-brand-600 dark:text-brand-400 text-base">₹{item.totalCollected}</Td>
                                <Td>{item.regCount} students</Td>
                                <Td className="text-[11px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                                    {item.registrationDeadline 
                                        ? new Date(item.registrationDeadline).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                        : new Date(item.startTime).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
                                    }
                                </Td>
                                <Td align="right">
                                    {(() => {
                                        const deadline = item.registrationDeadline || item.startTime;
                                        const isLocked = new Date() < new Date(deadline);

                                        if (item.payoutStatus === 'COMPLETED') {
                                            return (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-green-200 dark:border-green-500/20">
                                                    <i className="ri-checkbox-circle-fill text-sm" />
                                                    Completed
                                                </span>
                                            );
                                        }

                                        if (isLocked) {
                                            return (
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-not-allowed">
                                                        <i className="ri-lock-2-line text-sm" />
                                                        Locked
                                                    </span>
                                                    <span className="text-[9px] font-medium text-neutral-300 dark:text-neutral-600 mt-1">After deadline</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button 
                                                onClick={() => handleFetchPayoutInfo(item.clubHeadId, item.eventId)}
                                                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-brand-600 dark:hover:bg-brand-600 dark:hover:text-white transition-colors cursor-pointer"
                                            >
                                                Make Payout
                                            </button>
                                        );
                                    })()}
                                </Td>
                            </tr>
                        );
                    })}
                    {paidEvents.length === 0 && (
                        <tr><td colSpan="6" className="px-5 py-16 text-center text-neutral-400 text-sm">No paid events found for payout.</td></tr>
                    )}
                </tbody>
            </DataTable>

            {/* Modal: Confirm Payout */}
            {modalOpen && selectedClub && (
                <Modal 
                    onClose={() => setModalOpen(false)} 
                    title="Confirm Payout Settlement" 
                    subtitle={`Club: ${selectedClub.clubName}`}
                >
                    <div className="space-y-4 pt-2">
                        <ModalField label="Account Holder" value={selectedClub.bankInfo?.accountHolderName} />
                        <ModalField label="Bank Name" value={selectedClub.bankInfo?.bankName} />
                        <ModalField label="Account Number" value={selectedClub.bankInfo?.accountNumber} mono />
                        <ModalField label="IFSC Code" value={selectedClub.bankInfo?.ifscCode} mono />
                        <ModalField label="UPI ID" value={selectedClub.bankInfo?.upiId} accent />

                        <div className="pt-4 flex justify-end gap-3">
                            <button 
                                onClick={() => setModalOpen(false)} 
                                className="px-4 py-2 bg-neutral-100 dark:bg-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmPayout} 
                                className="px-4 py-2 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-brand-500 transition-colors"
                            >
                                Confirm Payout Complete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

export default PayoutsTab;
