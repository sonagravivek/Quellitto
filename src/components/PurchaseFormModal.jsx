import { useEffect, useMemo, useState } from "react";

export default function PurchaseFormModal({ open, onClose, onSubmit, submitting, products }) {
  const [productId, setProductId] = useState("");
  const [quantityPurchased, setQuantityPurchased] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuantityPurchased("1");
    if (products.length) {
      const first = products[0];
      setProductId(String(first.id));
      setPurchasePrice(String(first.purchasePrice ?? ""));
    } else {
      setProductId("");
      setPurchasePrice("");
    }
  }, [open, products]);

  const totalAmount = useMemo(() => {
    const q = Number(quantityPurchased);
    const pr = Number(purchasePrice);
    if (!Number.isFinite(q) || !Number.isFinite(pr)) return 0;
    return Math.round(q * pr * 100) / 100;
  }, [quantityPurchased, purchasePrice]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!productId) return;
    await onSubmit({
      productId: Number(productId),
      quantityPurchased: Number(quantityPurchased),
      purchasePrice: Number(purchasePrice),
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="purchase-modal-title" className="text-lg font-semibold text-slate-900">
              Add purchase
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Stock बढ़ेगा और product की purchase price set होगी।</p>
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

        {products.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-600">कोई product नहीं — पहले database / seed से products जोड़ें।</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <label className="block text-sm font-medium text-slate-700">
              Product
              <select
                required
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x) => String(x.id) === e.target.value);
                  if (p) setPurchasePrice(String(p.purchasePrice ?? ""));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} — {p.skuCode} (stock {p.quantityInStock})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Quantity
              <input
                required
                min={1}
                type="number"
                value={quantityPurchased}
                onChange={(e) => setQuantityPurchased(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Purchase price (per unit)
              <input
                required
                min={0}
                step="0.01"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </label>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium text-slate-700">Line total</p>
              <p className="text-xl font-semibold text-slate-900 tabular-nums">
                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalAmount)}
              </p>
            </div>
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
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
