import React, { useEffect, useRef } from 'react';

const ColumnExportModal = ({
  open,
  title = 'Export Events',
  subtitle = 'Choose the information you want to include in your CSV file.',
  columns,
  selectedColumns,
  onSelectedColumnsChange,
  onClose,
  onExport,
  isExporting,
  error,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isExporting) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, isExporting, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 dark:bg-black/75 px-3 py-4 backdrop-blur-sm transition-all" role="presentation">
      <div ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="column-export-title" className="flex max-h-[min(640px,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl outline-none dark:border-[#303030] dark:bg-[#181818] transition-colors">
        <div className="flex items-center justify-between gap-4 border-b border-[#F0F0F0] px-6 py-4 dark:border-[#2A2A2A]">
          <div>
            <h2 id="column-export-title" className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] leading-tight">{title}</h2>
            <p className="mt-0.5 text-xs text-[#888888] dark:text-[#808080]">{subtitle}</p>
          </div>
          <button type="button" aria-label="Close export dialog" disabled={isExporting} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors disabled:opacity-50 cursor-pointer" title="Close"><i className="ri-close-line text-lg" /></button>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-[#F0F0F0] px-6 py-3 dark:border-[#2A2A2A]">
          <div className="flex gap-2">
            <button type="button" onClick={() => onSelectedColumnsChange(columns.map(column => column.key))} className="rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] px-3 py-1.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] transition-colors cursor-pointer">Select All</button>
            <button type="button" onClick={() => onSelectedColumnsChange([])} className="rounded-xl border border-[#E5E5E5] dark:border-[#303030] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] px-3 py-1.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] transition-colors cursor-pointer">Clear All</button>
          </div>
          <span className="text-xs font-semibold text-[#888888] dark:text-[#808080]">{selectedColumns.length} of {columns.length} selected</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {columns.map(column => {
              const checked = selectedColumns.includes(column.key);
              return <label key={column.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2 hover:bg-[#FFF7ED] dark:hover:bg-[#2A1A0F] transition-colors"><input type="checkbox" checked={checked} onChange={() => onSelectedColumnsChange(checked ? selectedColumns.filter(key => key !== column.key) : [...selectedColumns, column.key])} className="h-4 w-4 accent-[#F97316] rounded cursor-pointer" /><span className="text-xs sm:text-[13px] font-bold text-[#111111] dark:text-[#F5F5F5]">{column.label}</span></label>;
            })}
          </div>
        </div>
        {error && <p role="alert" className="px-6 pb-2 text-xs font-semibold text-rose-600">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] px-6 py-4 dark:border-[#2A2A2A] bg-transparent dark:bg-[#181818]">
          <button type="button" disabled={isExporting} onClick={onClose} className="rounded-xl border border-[#E5E5E5] bg-transparent hover:bg-[#F5F5F5] dark:bg-[#222222] dark:hover:bg-[#2A2A2A] px-4 py-2.5 text-xs font-bold text-[#111111] dark:text-[#F5F5F5] disabled:opacity-50 dark:border-[#303030] transition-colors cursor-pointer">Cancel</button>
          <button type="button" disabled={isExporting || selectedColumns.length === 0} onClick={onExport} className="rounded-xl bg-[#F97316] hover:bg-[#EA580C] dark:bg-[#FB923C] dark:hover:bg-[#F97316] dark:text-[#111111] px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"><i className={isExporting ? 'ri-loader-4-line animate-spin text-sm' : 'ri-download-2-line text-sm'} />{isExporting ? 'Exporting...' : 'Export CSV'}</button>
        </div>
      </div>
    </div>
  );
};

export default ColumnExportModal;
