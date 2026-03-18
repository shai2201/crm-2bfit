"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { DynamicFieldRenderer } from "@/components/custom-fields/DynamicFieldRenderer";
import type { ClientFormData, CustomField } from "@/types";
import { User, Heart, Sliders, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  clientId?:   string;            // if editing
  customFields: CustomField[];    // fetched from DB
}

type Section = "basic" | "health" | "custom";

export function ClientForm({ initialData, clientId, customFields }: ClientFormProps) {
  const router  = useRouter();
  const isEdit  = Boolean(clientId);

  const [form, setForm] = useState<ClientFormData>({
    email:             initialData?.email             ?? "",
    firstName:         initialData?.firstName         ?? "",
    lastName:          initialData?.lastName          ?? "",
    phone:             initialData?.phone             ?? "",
    birthDate:         initialData?.birthDate         ?? "",
    gender:            initialData?.gender            ?? "",
    notes:             initialData?.notes             ?? "",
    role:              initialData?.role              ?? "TRAINEE",
    hasConditions:     initialData?.hasConditions     ?? false,
    conditions:        initialData?.conditions        ?? "",
    injuries:          initialData?.injuries          ?? "",
    medications:       initialData?.medications       ?? "",
    physicianApproval: initialData?.physicianApproval ?? false,
    customFields:      initialData?.customFields      ?? {},
  });

  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section>("basic");

  function set<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function setCustomField(fieldId: string, value: string) {
    setForm((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldId]: value },
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "שם פרטי נדרש";
    if (!form.lastName.trim())  e.lastName  = "שם משפחה נדרש";
    if (!form.email.trim())     e.email     = "מייל נדרש";
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "מייל לא תקין";
    // Required custom fields
    customFields.forEach((cf) => {
      if (cf.required && !form.customFields[cf.id]) {
        e[`custom_${cf.id}`] = `${cf.label} נדרש`;
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const url    = isEdit ? `/api/clients/${clientId}` : "/api/clients";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "שגיאה בשמירה");
      }

      router.push("/dashboard/clients");
      router.refresh();
    } catch (err) {
      setErrors({ _global: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "basic",  label: "פרטים אישיים",  icon: User   },
    { id: "health", label: "הצהרת בריאות",  icon: Heart  },
    { id: "custom", label: "שדות מותאמים",  icon: Sliders },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 bg-brand-elevated rounded-xl p-1 border border-brand-border">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              section === s.id
                ? "bg-brand-accent text-black"
                : "text-brand-text-muted hover:text-white",
            )}
          >
            <s.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Global error */}
      {errors._global && (
        <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-3 text-sm text-brand-error">
          {errors._global}
        </div>
      )}

      {/* ── SECTION: Basic ────────────────────────────────────────── */}
      {section === "basic" && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="שם פרטי"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              error={errors.firstName}
              required
              placeholder="ישראל"
            />
            <Input
              label="שם משפחה"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              error={errors.lastName}
              required
              placeholder="ישראלי"
            />
          </div>

          <Input
            label="כתובת מייל"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
            required
            placeholder="israel@example.com"
            disabled={isEdit}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="מספר טלפון"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="050-0000000"
            />
            <Input
              label="תאריך לידה"
              type="date"
              value={form.birthDate}
              onChange={(e) => set("birthDate", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="מגדר"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              placeholder="בחר..."
              options={[
                { value: "male",   label: "זכר"  },
                { value: "female", label: "נקבה" },
                { value: "other",  label: "אחר"  },
              ]}
            />
            <Select
              label="תפקיד"
              value={form.role}
              onChange={(e) => set("role", e.target.value as ClientFormData["role"])}
              options={[
                { value: "TRAINEE", label: "מתאמן" },
                { value: "COACH",   label: "מאמן"  },
                { value: "ADMIN",   label: "אדמין" },
              ]}
            />
          </div>

          <Textarea
            label="הערות"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="הערות כלליות על הלקוח..."
          />
        </div>
      )}

      {/* ── SECTION: Health ───────────────────────────────────────── */}
      {section === "health" && (
        <div className="space-y-5 animate-fade-in">
          <div className="bg-brand-warning/5 border border-brand-warning/20 rounded-xl px-4 py-3 text-sm text-brand-warning">
            ⚠️ מידע רפואי זה חסוי ומשמש לצרכי בטיחות בלבד.
          </div>

          {/* Has conditions toggle */}
          <div className="flex items-center justify-between p-4 bg-brand-elevated rounded-xl border border-brand-border">
            <div>
              <p className="text-sm font-medium text-white">קיימות בעיות רפואיות</p>
              <p className="text-xs text-brand-text-muted mt-0.5">האם למתאמן יש מגבלות רפואיות?</p>
            </div>
            <button
              type="button"
              onClick={() => set("hasConditions", !form.hasConditions)}
              className={cn(
                "relative w-11 h-6 rounded-full transition-colors",
                form.hasConditions ? "bg-brand-accent" : "bg-brand-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                  form.hasConditions ? "right-0.5" : "left-0.5",
                )}
              />
            </button>
          </div>

          {form.hasConditions && (
            <Textarea
              label="תיאור מצב רפואי"
              value={form.conditions}
              onChange={(e) => set("conditions", e.target.value)}
              placeholder="תאר את הבעיות הרפואיות..."
            />
          )}

          <Textarea
            label="פציעות עבר"
            value={form.injuries}
            onChange={(e) => set("injuries", e.target.value)}
            placeholder="פציעות רלוונטיות (ברך, גב, כתף...)..."
          />

          <Textarea
            label="תרופות קבועות"
            value={form.medications}
            onChange={(e) => set("medications", e.target.value)}
            placeholder="שמות תרופות אם רלוונטי..."
          />

          <div className="flex items-center gap-3 p-4 bg-brand-elevated rounded-xl border border-brand-border">
            <input
              type="checkbox"
              id="physicianApproval"
              checked={form.physicianApproval}
              onChange={(e) => set("physicianApproval", e.target.checked)}
              className="w-4 h-4 accent-brand-accent"
            />
            <label htmlFor="physicianApproval" className="text-sm text-white cursor-pointer">
              קיב/ה אישור רופא לפעילות גופנית
            </label>
          </div>
        </div>
      )}

      {/* ── SECTION: Custom Fields ────────────────────────────────── */}
      {section === "custom" && (
        <div className="space-y-5 animate-fade-in">
          {customFields.length === 0 ? (
            <div className="text-center py-12 text-brand-text-muted">
              <Sliders className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין שדות מותאמים עדיין.</p>
              <a
                href="/dashboard/settings/custom-fields"
                className="text-sm text-brand-accent hover:underline mt-1 block"
              >
                הוסף שדות בהגדרות ←
              </a>
            </div>
          ) : (
            <DynamicFieldRenderer
              fields={customFields}
              values={form.customFields}
              onChange={setCustomField}
              errors={errors}
            />
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4 border-t border-brand-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
        >
          ביטול
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? "שמור שינויים" : "צור לקוח"}
        </Button>
      </div>
    </form>
  );
}
