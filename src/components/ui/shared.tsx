import React from 'react';
import clsx from 'clsx';

interface PageHeaderProps {
  icon?: React.ElementType;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon size={32} className="text-brand-primary shrink-0" />
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  title?: string;
}

export function Card({ children, className, padding = true, title }: CardProps) {
  if (title) {
    return (
      <div className={clsx('bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col', className)}>
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-slate-800 shrink-0">
          {title}
        </div>
        <div className={clsx('flex-1', padding && 'p-5')}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-2xl border border-gray-100 shadow-sm', padding && 'p-5', className)}>
      {children}
    </div>
  );
}

interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  subtitle?: string;
}

const colorMap = {
  blue: 'text-blue-600',
  green: 'text-emerald-600',
  yellow: 'text-amber-600',
  red: 'text-red-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600',
};

export function StatsCard({ icon: Icon, label, value, color = 'blue', subtitle }: StatsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={clsx('flex items-center justify-center shrink-0', colorMap[color])}>
          <Icon size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate" title={label}>{label}</p>
          <p className="text-lg sm:text-xl font-bold text-slate-800 leading-tight truncate" title={String(value)}>{value}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5 truncate" title={subtitle}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'cancel' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ElementType;
}

const btnVariants = {
  primary: 'bg-brand-primary hover:bg-brand-dark text-white shadow-sm shadow-brand-primary/20',
  secondary: 'bg-white hover:bg-gray-50 text-slate-700 border border-gray-200',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 text-slate-600',
  cancel: 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600',
  outline: 'border border-brand-primary text-brand-primary hover:bg-brand-50',
};

const btnSizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
};

export function Btn({ variant = 'primary', size = 'md', icon: Icon, children, className, ...props }: BtnProps) {
  return (
    <button
      className={clsx('inline-flex items-center gap-2 font-medium transition-all', btnVariants[variant], btnSizes[size], className)}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  empty?: string;
}

export function Table({ headers, children, empty }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {children}
        </tbody>
      </table>
      {!children && empty && (
        <div className="py-16 text-center text-slate-400">
          <p className="text-sm">{empty}</p>
        </div>
      )}
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple';
}

const badgeColors = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-100',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  yellow: 'bg-amber-50 text-amber-700 border border-amber-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  gray: 'bg-gray-100 text-gray-600 border border-gray-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-100',
};

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', badgeColors[color])}>
      {children}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full max-h-full flex flex-col overflow-hidden animate-fade-in-up', maxWidth)}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0 bg-white z-10">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center w-8 h-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
}

export function InputField({ label, required, className, ...props }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        className={clsx(
          'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export function SelectField({ label, required, children, className, ...props }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        className={clsx(
          'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-slate-800',
          'focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
