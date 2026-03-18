"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td, EmptyRow } from "@/components/ui/Table";
import { formatPrice } from "@/lib/utils";
import { Plus, Pencil, Trash2, ShoppingBag, Eye, EyeOff } from "lucide-react";
import type { Product, ProductFormData, ProductType } from "@/types";
import { useRouter } from "next/navigation";

const PRODUCT_TYPES: { value: ProductType; label: string; color: string }[] = [
  { value: "PERSONAL_TRAINING", label: "אימון אישי",       color: "accent" },
  { value: "GROUP_SESSION",     label: "שיעור קבוצתי",     color: "info"   },
  { value: "MEMBERSHIP_PLAN",   label: "מנוי",              color: "warning"},
  { value: "NUTRITION_PLAN",    label: "תוכנית תזונה",     color: "accent" },
  { value: "OTHER",             label: "אחר",               color: "neutral"},
];

const EMPTY_FORM: ProductFormData = {
  name:        "",
  description: "",
  type:        "PERSONAL_TRAINING",
  price:       "",
  currency:    "ILS",
};

interface ProductManagerProps {
  products: Product[];
}

export function ProductManager({ products: initial }: ProductManagerProps) {
  const router             = useRouter();
  const [products, setProducts] = useState<Product[]>(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form,    setForm]    = useState<ProductFormData>(EMPTY_FORM);
  const [errors,  setErrors]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    setForm({
      name:        product.name,
      description: product.description ?? "",
      type:        product.type,
      price:       product.price,
      currency:    product.currency,
    });
    setErrors({});
    setModalOpen(true);
  }

  function setF<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = "שם נדרש";
    if (!form.price)        e.price = "מחיר נדרש";
    if (isNaN(Number(form.price)) || Number(form.price) < 0) e.price = "מחיר לא תקין";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const url    = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "שגיאה");
      }

      const saved: Product = await res.json().then((d) => d.data);
      setProducts((prev) =>
        editProduct
          ? prev.map((p) => (p.id === editProduct.id ? saved : p))
          : [saved, ...prev],
      );
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      setErrors({ _global: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק מוצר זה?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(product: Product) {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });
      if (!res.ok) throw new Error();
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p)),
      );
    } catch {
      alert("שגיאה בעדכון");
    }
  }

  const typeInfo = (type: ProductType) => PRODUCT_TYPES.find((t) => t.value === type);

  // Group products by type for display
  const totalRevenuePotential = products
    .filter((p) => p.isActive)
    .reduce((sum, p) => sum + Number(p.price), 0);

  return (
    <>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-text-muted">
              {products.filter((p) => p.isActive).length} מוצרים פעילים
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            מוצר חדש
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRODUCT_TYPES.slice(0, 4).map((type) => {
            const count = products.filter((p) => p.type === type.value && p.isActive).length;
            return (
              <div key={type.value} className="card p-4">
                <p className="text-xs text-brand-text-muted">{type.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Product table */}
        <Table>
          <Thead>
            <tr>
              <Th>מוצר</Th>
              <Th>סוג</Th>
              <Th>מחיר</Th>
              <Th>מטבע</Th>
              <Th>סטטוס</Th>
              <Th className="text-center">פעולות</Th>
            </tr>
          </Thead>
          <Tbody>
            {products.length === 0 ? (
              <EmptyRow colSpan={6} message="אין מוצרים. צור את הראשון!" />
            ) : (
              products.map((product) => {
                const type = typeInfo(product.type);
                return (
                  <Tr key={product.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-elevated rounded-xl">
                          <ShoppingBag className="w-4 h-4 text-brand-text-muted" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-brand-text-dim truncate max-w-[200px]">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>

                    <Td>
                      <Badge variant={(type?.color as "accent" | "info" | "warning" | "neutral") ?? "neutral"}>
                        {type?.label ?? product.type}
                      </Badge>
                    </Td>

                    <Td>
                      <span className="text-brand-accent font-semibold text-sm">
                        {formatPrice(Number(product.price), product.currency)}
                      </span>
                    </Td>

                    <Td>
                      <span className="text-sm text-brand-text-muted">{product.currency}</span>
                    </Td>

                    <Td>
                      <Badge variant={product.isActive ? "accent" : "neutral"}>
                        {product.isActive ? "פעיל" : "מושבת"}
                      </Badge>
                    </Td>

                    <Td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleActive(product)}
                          className="p-1.5 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                        >
                          {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(product)}
                          className="p-1.5 rounded-lg text-brand-text-dim hover:text-white hover:bg-brand-elevated transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deleting === product.id}
                          className="p-1.5 rounded-lg text-brand-text-dim hover:text-brand-error hover:bg-brand-elevated transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editProduct ? `עריכת מוצר: ${editProduct.name}` : "מוצר חדש"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {errors._global && (
            <div className="bg-brand-error/10 border border-brand-error/30 rounded-xl px-4 py-3 text-sm text-brand-error">
              {errors._global}
            </div>
          )}

          <Input
            label="שם המוצר"
            value={form.name}
            onChange={(e) => setF("name", e.target.value)}
            error={errors.name}
            required
            placeholder="אימון אישי - חבילת 10"
          />

          <Textarea
            label="תיאור"
            value={form.description}
            onChange={(e) => setF("description", e.target.value)}
            placeholder="תיאור קצר של המוצר או השירות..."
          />

          <Select
            label="סוג מוצר"
            value={form.type}
            onChange={(e) => setF("type", e.target.value as ProductType)}
            options={PRODUCT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="מחיר"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setF("price", e.target.value)}
              error={errors.price}
              required
              placeholder="450"
            />
            <Select
              label="מטבע"
              value={form.currency}
              onChange={(e) => setF("currency", e.target.value)}
              options={[
                { value: "ILS", label: "₪ שקל" },
                { value: "USD", label: "$ דולר" },
                { value: "EUR", label: "€ יורו" },
              ]}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              ביטול
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {editProduct ? "שמור שינויים" : "צור מוצר"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
