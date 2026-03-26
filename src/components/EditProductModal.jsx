import { useEffect, useState } from "react";

function dateInputValue(v) {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function EditProductModal({ open, product, onClose, onSave, submitting }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open || !product) return;
    setForm({
      productName: product.productName ?? "",
      skuCode: product.skuCode ?? "",
      category: product.category ?? "",
      supplierName: product.supplierName ?? "",
      purchasePrice: String(product.purchasePrice ?? ""),
      sellingPrice: String(product.sellingPrice ?? ""),
      quantityInStock: String(product.quantityInStock ?? "0"),
      quantityPurchased: String(product.quantityPurchased ?? "0"),
      purchaseDate: dateInputValue(product.purchaseDate),
      notes: product.notes ?? "",
    });
  }, [open, product]);

  if (!open || !product) return null;

  function u(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(product.id, {
      productName: form.productName.trim(),
      skuCode: form.skuCode.trim(),
      category: form.category.trim(),
      supplierName: form.supplierName.trim(),
      purchasePrice: Number(form.purchasePrice),
      sellingPrice: Number(form.sellingPrice),
      quantityInStock: Number(form.quantityInStock) || 0,
      quantityPurchased: Number(form.quantityPurchased) || 0,
      purchaseDate: form.purchaseDate,
      notes: form.notes.trim() || "",
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-product-title"
    >
      <div className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="edit-product-title" className="text-lg font-semibold text-slate-900">
              Edit product
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">SKU: {product.skuCode}</p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-8rem)] flex-col">
          <div className="space-y-3 overflow-y-auto px-5 py-5">
            <label className="block text-sm font-medium text-slate-700">
              Product name *
              <input required value={form.productName} onChange={(e) => u("productName", e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              SKU ID *
              <input required value={form.skuCode} onChange={(e) => u("skuCode", e.target.value)} className={`font-mono ${inputClass}`} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Category *
                <input required value={form.category} onChange={(e) => u("category", e.target.value)} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Supplier *
                <input required value={form.supplierName} onChange={(e) => u("supplierName", e.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Purchase price (₹) *
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.purchasePrice}
                  onChange={(e) => u("purchasePrice", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Selling price (₹) *
                <input
                  required
                  min={0}
                  step="0.01"
                  type="number"
                  value={form.sellingPrice}
                  onChange={(e) => u("sellingPrice", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Stock qty
                <input
                  min={0}
                  type="number"
                  value={form.quantityInStock}
                  onChange={(e) => u("quantityInStock", e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Total purchased (lifetime)
                <input
                  min={0}
                  type="number"
                  value={form.quantityPurchased}
                  onChange={(e) => u("quantityPurchased", e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Purchase date *
              <input required type="date" value={form.purchaseDate} onChange={(e) => u("purchaseDate", e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Notes
              <textarea rows={2} value={form.notes} onChange={(e) => u("notes", e.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
