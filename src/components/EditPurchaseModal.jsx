import { useEffect, useState } from "react";

export default function EditPurchaseModal({ open, row, onClose, onSave, submitting }) {
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setQuantity(String(row.quantity ?? "1"));
    setUnitPrice(String(row.unitPrice ?? ""));
  }, [open, row]);

  if (!open || !row) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(row.id, {
      quantityPurchased: Number(quantity),
      purchasePrice: Number(unitPrice),
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-purchase-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="edit-purchase-title" className="text-lg font-semibold text-slate-900">
              Edit purchase
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {row.productName} · <span className="font-mono text-xs">{row.skuCode}</span>
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <label className="block text-sm font-medium text-slate-700">
            Quantity *
            <input
              required
              min={1}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Unit purchase price (₹) *
            <input
              required
              min={0}
              step="0.01"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className={inputClass}
            />
          </label>
          <p className="text-xs text-slate-500">Stock और product purchase price इसी के हिसाब से adjust होंगे।</p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
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
