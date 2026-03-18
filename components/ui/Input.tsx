"use client";

import { cn } from "@/lib/utils";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
          {props.required && <span className="text-brand-accent mr-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={cn(
          "input-base px-3 py-2 text-sm",
          error && "border-brand-error focus:border-brand-error",
          className,
        )}
      />
      {error && <p className="text-xs text-brand-error">{error}</p>}
      {hint  && !error && <p className="text-xs text-brand-text-dim">{hint}</p>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        {...props}
        className={cn(
          "input-base px-3 py-2 text-sm resize-none",
          error && "border-brand-error",
          className,
        )}
      />
      {error && <p className="text-xs text-brand-error">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string;
  error?:   string;
  options:  { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/80">
          {label}
          {props.required && <span className="text-brand-accent mr-1">*</span>}
        </label>
      )}
      <select
        id={inputId}
        {...props}
        className={cn(
          "input-base px-3 py-2 text-sm cursor-pointer",
          error && "border-brand-error",
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-brand-error">{error}</p>}
    </div>
  );
}
