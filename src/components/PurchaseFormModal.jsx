import { useEffect, useMemo, useState } from "react";
import { catalogGroupKeyString } from "../utils/groupProducts.js";
import { formatNumber } from "../utils/format.js";

export default function PurchaseFormModal({ open, onClose, onSubmit, submitting, productGroups }) {
  const [groupKey, setGroupKey] = useState("");
  const [quantityPurchased, setQuantityPurchased] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuantityPurchased("1");
    if (productGroups.length) {
      const first = productGroups[0];
      setGroupKey(catalogGroupKeyString(first));
      setPurchasePrice(String(first.purchasePrice ?? ""));
    } else {
      setGroupKey("");
      setPurchasePrice("");
    }
  }, [open, productGroups]);

  const selectedGroup = useMemo(
    () => productGroups.find((g) => catalogGroupKeyString(g) === groupKey),
    [productGroups, groupKey]
  );

  const totalAmount = useMemo(() => {
    const q = Number(quantityPurchased);
    const pr = Number(purchasePrice);
    if (!Number.isFinite(q) || !Number.isFinite(pr) || !selectedGroup?.skus?.length) return 0;
    return Math.round(q * pr * 100) / 100;
  }, [quantityPurchased, purchasePrice, selectedGroup]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedGroup?.skus?.length) return;
    const q = Math.floor(Number(quantityPurchased));
    if (!Number.isFinite(q) || q < 1) return;
    const productIds = selectedGroup.skus
      .map((s) => Math.floor(Number(s.id)))
      .filter((id) => id >= 1);
    if (productIds.length !== selectedGroup.skus.length) return;
    await onSubmit({
      productIds,
      quantityPurchased: q,
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
            <p className="mt-0.5 text-sm text-slate-500">
              <strong>Quantity = कुल stock</strong> (साझा पूल)। 2 SKU हों तो भी कुल 50 बोतलें = 50; दोनों SKU लाइनों पर{" "}
              <strong>वही संख्या</strong> दिखेगी। राशि = qty × price (SKU की गिनती से गुणा नहीं)।
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

        {productGroups.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-600">कोई product नहीं — पहले Add product से catalog बनाएँ।</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <label className="block text-sm font-medium text-slate-700">
              Product (catalog)
              <select
                required
                value={groupKey}
                onChange={(e) => {
                  const k = e.target.value;
                  setGroupKey(k);
                  const g = productGroups.find((x) => catalogGroupKeyString(x) === k);
                  if (g) setPurchasePrice(String(g.purchasePrice ?? ""));
                }}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {productGroups.map((g) => {
                  const k = catalogGroupKeyString(g);
                  const n = g.skus.length;
                  return (
                    <option key={k} value={k}>
                      {g.productName} — stock {formatNumber(g.totalStock)}
                      {n > 1 ? ` (${n} SKUs)` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            {selectedGroup && selectedGroup.skus.length > 1 ? (
              <p className="text-xs text-slate-500">
                SKUs: {selectedGroup.skus.map((s) => s.skuCode).join(", ")}
              </p>
            ) : null}
            <label className="block text-sm font-medium text-slate-700">
              Quantity (कुल — सभी SKU पर वही दिखेगा)
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
              <p className="font-medium text-slate-700">Stock कैसे बढ़ेगा</p>
              <p className="mt-1 text-slate-600">
                कुल inventory <strong className="text-slate-900">+{formatNumber(Number(quantityPurchased) || 0)}</strong>{" "}
                {selectedGroup && selectedGroup.skus.length > 1 ? (
                  <>
                    — {selectedGroup.skus.length} SKU IDs पर <strong>वही</strong> कुल दिखेगा (साझा पूल)।
                  </>
                ) : (
                  <> unit।</>
                )}
              </p>
              <p className="mt-2 font-medium text-slate-700">राशि (qty × price)</p>
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
