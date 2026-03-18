"use client";

import { Input, Select, Textarea } from "@/components/ui/Input";
import type { CustomField } from "@/types";

interface DynamicFieldRendererProps {
  fields:   CustomField[];
  values:   Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  errors?:  Record<string, string>;
}

export function DynamicFieldRenderer({
  fields,
  values,
  onChange,
  errors = {},
}: DynamicFieldRendererProps) {
  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value    = values[field.id] ?? "";
        const errorKey = `custom_${field.id}`;

        switch (field.fieldType) {
          case "TEXT":
            return (
              <Input
                key={field.id}
                label={field.label}
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
                required={field.required}
                error={errors[errorKey]}
              />
            );

          case "NUMBER":
            return (
              <Input
                key={field.id}
                label={field.label}
                type="number"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
                required={field.required}
                error={errors[errorKey]}
              />
            );

          case "DATE":
            return (
              <Input
                key={field.id}
                label={field.label}
                type="date"
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
                required={field.required}
                error={errors[errorKey]}
              />
            );

          case "BOOLEAN":
            return (
              <div key={field.id} className="flex items-center justify-between p-4 bg-brand-elevated rounded-xl border border-brand-border">
                <div>
                  <p className="text-sm font-medium text-white">{field.label}</p>
                  {field.required && <p className="text-xs text-brand-accent">נדרש</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(field.id, value === "true" ? "false" : "true")}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    value === "true" ? "bg-brand-accent" : "bg-brand-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      value === "true" ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            );

          case "SELECT":
            return (
              <Select
                key={field.id}
                label={field.label}
                value={value}
                onChange={(e) => onChange(field.id, e.target.value)}
                required={field.required}
                error={errors[errorKey]}
                placeholder="בחר..."
                options={(field.options ?? []).map((opt: string) => ({ value: opt, label: opt }))}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
