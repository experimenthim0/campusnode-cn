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
      <div ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="column-export-title" className="flex max-h-[min(640px,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cn-border bg-cn-surface shadow-2xl outline-none transition-colors">
        <div className="flex items-center justify-between gap-4 border-b border-cn-border-subtle px-6 py-4">
          <div>
            <h2 id="column-export-title" className="text-base sm:text-lg font-bold text-cn-text leading-tight">{title}</h2>
            <p className="mt-0.5 text-xs text-cn-text-muted">{subtitle}</p>
          </div>
          <button type="button" aria-label="Close export dialog" disabled={isExporting} onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-cn-text-muted hover:text-cn-text hover:bg-cn-surface-muted transition-colors disabled:opacity-50 cursor-pointer" title="Close"><i className="ri-close-line text-lg" /></button>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-cn-border-subtle px-6 py-3">
          <div className="flex gap-2">
            <button type="button" onClick={() => onSelectedColumnsChange(columns.map(column => column.key))} className="rounded-xl border border-cn-border bg-transparent hover:bg-cn-surface-muted px-3 py-1.5 text-xs font-bold text-cn-text transition-colors cursor-pointer">Select All</button>
            <button type="button" onClick={() => onSelectedColumnsChange([])} className="rounded-xl border border-cn-border bg-transparent hover:bg-cn-surface-muted px-3 py-1.5 text-xs font-bold text-cn-text transition-colors cursor-pointer">Clear All</button>
          </div>
          <span className="text-xs font-semibold text-cn-text-muted">{selectedColumns.length} of {columns.length} selected</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {columns.map(column => {
              const checked = selectedColumns.includes(column.key);
              return <label key={column.key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"><input type="checkbox" checked={checked} onChange={() => onSelectedColumnsChange(checked ? selectedColumns.filter(key => key !== column.key) : [...selectedColumns, column.key])} className="h-4 w-4 accent-brand-600 rounded cursor-pointer" /><span className="text-xs sm:text-[13px] font-bold text-cn-text">{column.label}</span></label>;
            })}
          </div>
        </div>
        {error && <p role="alert" className="px-6 pb-2 text-xs font-semibold text-danger-600">{error}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-cn-border-subtle px-6 py-4 bg-transparent">
          <button type="button" disabled={isExporting} onClick={onClose} className="rounded-xl border border-cn-border bg-transparent hover:bg-cn-surface-muted px-4 py-2.5 text-xs font-bold text-cn-text disabled:opacity-50 transition-colors cursor-pointer">Cancel</button>
          <button type="button" disabled={isExporting || selectedColumns.length === 0} onClick={onExport} className="rounded-xl bg-brand-600 hover:bg-brand-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:cursor-not-allowed disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5"><i className={isExporting ? 'ri-loader-4-line animate-spin text-sm' : 'ri-download-2-line text-sm'} />{isExporting ? 'Exporting...' : 'Export CSV'}</button>
        </div>
      </div>
    </div>
  );
};

export default ColumnExportModal;
