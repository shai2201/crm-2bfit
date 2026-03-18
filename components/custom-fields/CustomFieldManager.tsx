"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";
import { getFieldTypeLabel } from "@/lib/utils";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import type { CustomField, CustomFieldFormData, FieldType, TargetObject } from "@/types";
import { useRouter } from "next/navigation";

interface CustomFieldManagerProps {
  fields: CustomField[];
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "TEXT",    label: "טקסט חופשי" },
  { value: "NUMBER",  label: "מספר" },
  { value: "DATE",    label: "תאריך" },
  { value: "BOOLEAN", label: "כן / לא" },
  { value: "SELECT",  label: "בחירה מרשימה" },
];

const TARGET_OBJECTS: { value: TargetObject; label: string }[] = [
  { value: "USER",            label: "לקוח / מתאמן" },
  { value: "SESSION",         label: "שיעור" },
  { value: "MEMBERSHIP",      label: "מנוי" },
  { value: "WORKOUT_BOOKLET", label: "חוברת אימון" },
];

const EMPTY_FORM: CustomFieldFormData = {
  name:         "",
  label:        "",
  fieldType:    "TEXT",
  options:      "",
  targetObject: "USER",
  required:     false,
  order:        0,
};

export function CustomFieldManager({ fields: initialFields }: CustomFieldManagerProps) {
  const router            = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fields,    setFields]    = useState<CustomField[]>(initialFields);
  const [modalOpen, setModalOpen] = useState(false);
  const [editField, setEditField] = useState<CustomField | null>(null);
  const [form,      setForm]      = useState<CustomFieldFormData>(EMPTY_FORM);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(false);
  const [deleting,  setDeleting]  = useState<string | null>(null);

  function openCreate() {
    setEditField(null);
    setForm({ ...EMPTY_FORM, order: fields.length });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(field: CustomField) {
    setEditField(field);
    setForm({
      name:         field.name,
      label:        field.label,
      fieldType:    field.fieldType,
      options:      (field.options ?? []).join(", "),
      targetObject: field.targetObject,
      required:     field.required,
      order:        field.order,
    });
    setErrors({});
    setModalOpen(true);
  }

  function setF<K extends keyof CustomFieldFormData>(key: K, value: CustomFieldFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  // Auto-generate internal name from label
  function handleLabelChange(label: string) {
    setF("label", label);
    if (!editField) {
      const name = label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_\u0590-\u05ff]/g, "");
      setF("name", name);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "תווית נדרשת";
    if (!form.name.trim())  e.name  = "מזהה פנימי נדרש";
    if (form.fieldType === "SELECT" && !form.options.trim()) {
      e.options = "הזן אפשרויות (מופרדות בפסיק)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const payload = {
      ...form,
      options: form.fieldType === "SELECT"
        ? form.options.split(",").map((o) => o.trim()).filter(Boolean)
        : null,
    };

    try {
      const url    = editField ? `/api/custom-fields/${editField.id}` : "/api/custom-fields";
      const method = editField ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "שגיאה");
      }

      const saved: CustomField = await res.json().then((d) => d.data);
      setFields((prev) =>
        editField
          ? prev.map((f) => (f.id === editField.id ? saved : f))
          : [...prev, saved],
      );
      setModalOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setErrors({ _global: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(field: CustomField) {
    try {
      const res = await fetch(`/api/custom-fields/${field.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !field.isActive }),
      });
      if (!res.ok) throw new Error();
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, isActive: !f.isActive } : f)),
      );
    } catch {
      alert("שגיאה בעדכון");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק שדה זה? כל הערכים שנשמרו יאבדו.")) return;
    setDeleting(id);
    try {
      await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
      setFields((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  const targetLabel = (t: TargetObject) =>
    TARGET_OBJECTS.find((o) => o.value === t)?.label ?? t;

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">שדות מותאמים אישית</h2>
            <p className="text-sm text-brand-text-muted mt-0.5">
              הוסף שדות דינמיים לכל אובייקט במערכת
            </p>
          </div>
          <Button onClick={openCreate} size="md">
            <Plus className="w-4 h-4" />
            שדה חדש
          </Button>
        </div>

        {/* Info banner */}
        <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl px-4 py-3">
          <p className="text-sm text-brand-accent font-medium">💡 כיצד זה עובד?</p>
          <p className="text-xs text-brand-text-muted mt-1">
            שדות שתוסיף כאן יופיעו אוטומטית בטפסים הרלוונטיים (לקוחות, שיעורים, מנויים) ויישמרו בבסיס הנתונים עבור כל ישות.
          </p>
        </div>

        {/* Table */}
        <Table>
          <Thead>
            <tr>
              <Th></Th>
              <Th>תווית / מזהה</Th>
              <Th>סוג שדה</Th>
              <Th>מיועד ל</Th>
              <Th>נדרש</Th>
              <Th>סטטוס</Th>
              <Th className="text-center">פעולות</Th>
            </tr>
          </Thead>
          <Tbody>
            {fields.length === 0 ? (
              <EmptyRow colSpan={7} message="אין שדות מותאמים עדיין. צור את הראשון!" />
            ) : (
              fields.map((field) => (
                <Tr key={field.id}>
                  {/* Drag handle (visual only) */}
                  <Td className="w-8">
                    <GripVertical className="w-4 h-4 text-brand-text-dim cursor-grab" />
                  </Td>

                  {/* Label + name */}
                  <Td>
                    <p className="font-medium text-white text-sm">{field.label}</p>
                    <p className="text-xs text-brand-text-dim font-mono">{field.name}</p>
                    {field.fieldType === "SELECT" && field.options && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {(field.options as string[]).slice(0, 3).map((o) => (
                          <span key={o} className="text-[10px] bg-brand-elevated border border-brand-border rounded px-1.5 py-0.5 text-brand-text-muted">
                            {o}
                          </span>
                        ))}
                        {(field.options as string[]).length > 3 && (
                          <span className="text-[10px] text-brand-text-dim">
                            +{(field.options as string[]).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </Td>

                  {/* Type */}
                  <Td>
                    <Badge variant="info">{getFieldTypeLabel(field.fieldType)}</Badge>
                  </Td>

                  {/* Target */}
                  <Td>
                    <span className="text-sm text-brand-text-muted">{targetLabel(field.targetObject)}</span>
                  </Td>

                  {/* Required */}
                  <Td>
                    {field.required ? (
                      <Badge variant="accent">נדרש</Badge>
                    ) : (
                      <span className="text-xs text-brand-text-dim">אופציונלי</span>
                    )}
                  </Td>

                  {/* Status */}
                  <Td>
                    <Badge variant={field.isActive ? "accent" : "neutral"}>
                      {field.isActive ? "פעיל" : "מושבת"}
                    </Badge>
                  </Td>

                  {/* Actions */}
                  <Td className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => toggleActive(field)}
                        title={field.isActive ? "השבת" : "הפעל"}
                        className="p-1.5 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                      >
                        {field.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(field)}
                        className="p-1.5 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(field.id)}
                        disabled={deleting === field.id}
                        className="p-1.5 rounded-lg text-brand-text-dim hover:text-brand-error hover:bg-brand-elevated transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editField ? `עריכת שדה: ${editField.label}` : "שדה מותאם חדש"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errors._global && (
            <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-3 text-sm text-brand-error">
              {errors._global}
            </div>
          )}

          <Input
            label="תווית (מה הלקוח/אדמין יראה)"
            value={form.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            error={errors.label}
            required
            placeholder="לדוגמה: מידת חולצה"
          />

          <Input
            label="מזהה פנימי (אנגלית/ספרות/קו_תחתי)"
            value={form.name}
            onChange={(e) => setF("name", e.target.value)}
            error={errors.name}
            required
            placeholder="shirt_size"
            hint="נוצר אוטומטית מהתווית. אל תשנה אחרי שמירה ראשונה."
            disabled={Boolean(editField)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="סוג שדה"
              value={form.fieldType}
              onChange={(e) => setF("fieldType", e.target.value as FieldType)}
              options={FIELD_TYPES}
              required
            />
            <Select
              label="מיועד לאובייקט"
              value={form.targetObject}
              onChange={(e) => setF("targetObject", e.target.value as TargetObject)}
              options={TARGET_OBJECTS}
              required
            />
          </div>

          {/* Options - only for SELECT */}
          {form.fieldType === "SELECT" && (
            <Input
              label="אפשרויות (מופרדות בפסיק)"
              value={form.options}
              onChange={(e) => setF("options", e.target.value)}
              error={errors.options}
              required
              placeholder="S, M, L, XL, XXL"
              hint="כל ערך יופיע כאפשרות בתפריט הנפתח"
            />
          )}

          <Input
            label="סדר תצוגה"
            type="number"
            value={String(form.order)}
            onChange={(e) => setF("order", Number(e.target.value))}
            hint="מספר נמוך יותר = מוצג ראשון"
          />

          {/* Required toggle */}
          <div className="flex items-center justify-between p-4 bg-brand-elevated rounded-xl border border-brand-border">
            <div>
              <p className="text-sm font-medium text-white">שדה חובה</p>
              <p className="text-xs text-brand-text-muted">האם חובה למלא שדה זה?</p>
            </div>
            <button
              type="button"
              onClick={() => setF("required", !form.required)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.required ? "bg-brand-accent" : "bg-brand-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  form.required ? "right-0.5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          {/* Preview */}
          <div className="border border-brand-border rounded-xl p-4 bg-brand-elevated">
            <p className="text-xs text-brand-text-dim mb-3 font-semibold uppercase tracking-wider">
              תצוגה מקדימה
            </p>
            <div className="pointer-events-none opacity-80">
              {form.fieldType === "TEXT" && (
                <Input label={form.label || "תווית השדה"} placeholder="הזן ערך..." />
              )}
              {form.fieldType === "NUMBER" && (
                <Input label={form.label || "תווית השדה"} type="number" placeholder="0" />
              )}
              {form.fieldType === "DATE" && (
                <Input label={form.label || "תווית השדה"} type="date" />
              )}
              {form.fieldType === "BOOLEAN" && (
                <div className="flex items-center justify-between p-3 bg-brand-surface rounded-xl border border-brand-border">
                  <span className="text-sm text-white">{form.label || "תווית השדה"}</span>
                  <div className="w-11 h-6 rounded-full bg-brand-border relative">
                    <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </div>
              )}
              {form.fieldType === "SELECT" && (
                <Select
                  label={form.label || "תווית השדה"}
                  placeholder="בחר..."
                  options={form.options
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean)
                    .map((o) => ({ value: o, label: o }))}
                  value=""
                  onChange={() => {}}
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {editField ? "שמור שינויים" : "צור שדה"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
