import { useEffect, useState } from "react";

function emptyRow() {
  return { sku: "", statementAmount: "" };
}

export default function AddProductModal({ open, onClose, onSubmit, submitting }) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [skuRows, setSkuRows] = useState(() => [emptyRow()]);

  useEffect(() => {
    if (!open) return;
    setProductName("");
    setCategory("");
    setSupplierName("");
    setPurchasePrice("");
    setSkuRows([emptyRow()]);
  }, [open]);

  function setRowAt(index, patch) {
    setSkuRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addSkuRow() {
    setSkuRows((prev) => [...prev, emptyRow()]);
  }

  function removeSkuRow(index) {
    setSkuRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const rows = skuRows
      .map((r) => ({
        sku: String(r.sku ?? "").trim(),
        statementAmount: r.statementAmount,
      }))
      .filter((r) => r.sku.length > 0);

    const skuCodes = rows.map((r) => r.sku);
    const statementAmounts = rows.map((r) => {
      const n = Number(r.statementAmount);
      return Number.isFinite(n) && n >= 0.01 ? Math.round(n * 100) / 100 : null;
    });

    await onSubmit({
      productName: productName.trim(),
      category: category.trim(),
      supplierName: supplierName.trim(),
      purchasePrice: Number(purchasePrice),
      skuCodes,
      statementAmounts,
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-modal-title"
    >
      <div className="relative max-h-[min(90vh,720px)] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="add-product-modal-title" className="text-lg font-semibold text-slate-900">
              Add product
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              हर SKU के साथ चाहें तो bank statement amount (₹) — खाली छोड़ें अगर नहीं चाहिए।
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

        <form onSubmit={handleSubmit} className="flex max-h-[calc(90vh-8rem)] flex-col">
          <div className="space-y-4 overflow-y-auto px-5 py-5">
            <label className="block text-sm font-medium text-slate-700">
              Product name *
              <input
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className={inputClass}
              />
            </label>

            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">SKU IDs * + Bank stmt (₹)</span>
                <button
                  type="button"
                  onClick={addSkuRow}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  + SKU add करें
                </button>
              </div>
              <ul className="mt-2 space-y-3">
                {skuRows.map((row, index) => (
                  <li key={index} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                        SKU ID *
                        <input
                          required={index === 0}
                          value={row.sku}
                          onChange={(e) => setRowAt(index, { sku: e.target.value })}
                          placeholder={`SKU ${index + 1}`}
                          className={`font-mono text-sm ${inputClass}`}
                        />
                      </label>
                      <label className="w-full text-sm font-medium text-slate-700 sm:w-36">
                        Stmt ₹
                        <input
                          min={0}
                          step="0.01"
                          type="number"
                          value={row.statementAmount}
                          onChange={(e) => setRowAt(index, { statementAmount: e.target.value })}
                          placeholder="—"
                          className={inputClass}
                        />
                      </label>
                      {skuRows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSkuRow(index)}
                          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 sm:mb-0"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="hidden sm:block sm:w-20" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Category *
              <input required value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Supplier *
              <input
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Purchase price (₹) *
              <input
                required
                min={0}
                step="0.01"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className={inputClass}
              />
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
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
