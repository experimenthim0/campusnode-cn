import React from 'react';
import { X } from 'lucide-react';

export const StatCard = ({ label, value, subtext, icon: Icon, accent, className = "" }) => (
    <div className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
        accent 
            ? "bg-black dark:bg-white border-black dark:border-white shadow-sm" 
            : "bg-white dark:bg-[#0c0c0c] border-neutral-200/90 dark:border-zinc-800/90 shadow-xs hover:border-neutral-300 dark:hover:border-zinc-700"
    } ${className}`}>
        <div className="flex items-center justify-between gap-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                {label}
            </p>
            {Icon && (
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    accent 
                        ? "bg-white/10 dark:bg-black/10 text-white dark:text-black" 
                        : "bg-neutral-100 dark:bg-zinc-800/80 text-neutral-500 dark:text-neutral-400"
                }`}>
                    <Icon size={14} strokeWidth={2.2} />
                </div>
            )}
        </div>
        
        <div className="mt-3">
            <p className={`text-2xl lg:text-3xl font-black tracking-tight leading-none ${
                accent ? "text-orange-500 dark:text-orange-600" : "text-black dark:text-white"
            }`}>
                {value}
            </p>
            {subtext && (
                <p className={`text-[11px] mt-1.5 font-medium leading-tight line-clamp-1 ${
                    accent ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400 dark:text-neutral-500"
                }`}>
                    {subtext}
                </p>
            )}
        </div>
    </div>
);

/** DataTable wrapper */
export const DataTable = ({ children }) => (
    <div className="bg-white dark:bg-[#0c0c0c] border border-neutral-200/90 dark:border-zinc-800/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100 dark:divide-zinc-800/60">{children}</table>
        </div>
    </div>
);

export const Th = ({ children, align = "left", className = "" }) => (
    <th className={`px-4 lg:px-5 py-3.5 text-${align} text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500 bg-neutral-50/60 dark:bg-zinc-900/40 select-none ${className}`}>
        {children}
    </th>
);

/** Table body cell */
export const Td = ({ children, align = "left", className = "" }) => (
    <td className={`px-4 lg:px-5 py-3.5 whitespace-nowrap text-sm text-neutral-700 dark:text-neutral-300 text-${align} ${className}`}>
        {children}
    </td>
);

/** Event type / pricing badge */
export const TypeBadge = ({ isPaid, fee }) => (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
        isPaid
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-zinc-700'
    }`}>
        {isPaid ? (fee ? `Paid (₹${fee})` : 'Paid') : 'Free'}
    </span>
);

/** Entry registration requirement badge */
export const EntryBadge = ({ registrationType }) => {
    const isOpen = registrationType === 'none';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
            isOpen
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
        }`}>
            {isOpen ? 'Open Entry' : 'Reg. Required'}
        </span>
    );
};

export const FormInput = ({ name, type = "text", placeholder, required }) => (
    <input 
        name={name} 
        type={type} 
        placeholder={placeholder} 
        required={required} 
        className="px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-zinc-800 rounded-xl text-[13px] focus:border-orange-600 dark:focus:border-orange-500 outline-none transition-colors placeholder:text-neutral-400 dark:placeholder:text-neutral-600" 
    />
);

export const FilterSelect = ({ children, value, onChange, className = "" }) => (
    <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 px-3 bg-white dark:bg-[#0c0c0c] border border-neutral-200/90 dark:border-zinc-800 rounded-xl text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 focus:border-orange-600 dark:focus:border-orange-500 outline-none transition-colors cursor-pointer ${className}`}
    >
        {children}
    </select>
);

export const Modal = ({ onClose, title, subtitle, children }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-sm px-4" onClick={onClose}>
        <div className="bg-white dark:bg-[#181818] border border-[#E5E5E5] dark:border-[#303030] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl transition-colors" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex justify-between items-center border-b border-[#F0F0F0] dark:border-[#2A2A2A]">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#111111] dark:text-[#F5F5F5] tracking-tight">{title}</h3>
                    {subtitle && <p className="text-xs text-[#888888] dark:text-[#808080] font-normal mt-0.5">{subtitle}</p>}
                </div>
                <button 
                    onClick={onClose} 
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[#555555] dark:text-[#B5B5B5] hover:text-[#111111] dark:hover:text-[#F5F5F5] hover:bg-[#F5F5F5] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                    title="Close"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="px-6 py-5 text-[#555555] dark:text-[#B5B5B5]">{children}</div>
        </div>
    </div>
);

export const ModalField = ({ label, value, mono, accent }) => (
    <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#888888] dark:text-[#808080] mb-1">{label}</label>
        <p className={`font-semibold text-sm border-b border-[#F0F0F0] dark:border-[#2A2A2A] pb-1.5 ${
            mono ? "font-mono" : ""
        } ${accent ? "text-[#F97316] dark:text-[#FB923C]" : "text-[#111111] dark:text-[#F5F5F5]"}`}>
            {value || 'N/A'}
        </p>
    </div>
);

export const ModalFormField = ({ label, name, type = "text", defaultValue, placeholder, required }) => (
    <div>
        <label className="block text-xs font-bold text-[#111111] dark:text-[#F5F5F5] mb-1.5">{label}</label>
        <input 
            name={name} 
            type={type} 
            defaultValue={defaultValue} 
            placeholder={placeholder} 
            required={required} 
            className="w-full px-3.5 py-2.5 bg-white dark:bg-[#222222] border border-[#E5E5E5] dark:border-[#3A3A3A] rounded-xl text-xs sm:text-[13px] text-[#111111] dark:text-[#F5F5F5] placeholder-[#888888] dark:placeholder-[#808080] focus:border-[#F97316] dark:focus:border-[#FB923C] outline-none transition-colors" 
        />
    </div>
);

