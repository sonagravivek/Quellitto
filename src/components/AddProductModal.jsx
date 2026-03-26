import { useEffect, useState } from "react";

export default function AddProductModal({ open, onClose, onSubmit, submitting }) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [skuRows, setSkuRows] = useState(() => [""]);

  useEffect(() => {
    if (!open) return;
    setProductName("");
    setCategory("");
    setSupplierName("");
    setPurchasePrice("");
    setSkuRows([""]);
  }, [open]);

  function setSkuAt(index, value) {
    setSkuRows((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addSkuRow() {
    setSkuRows((prev) => [...prev, ""]);
  }

  function removeSkuRow(index) {
    setSkuRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const skuCodes = skuRows.map((s) => String(s).trim()).filter(Boolean);
    await onSubmit({
      productName: productName.trim(),
      category: category.trim(),
      supplierName: supplierName.trim(),
      purchasePrice: Number(purchasePrice),
      skuCodes,
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
      <div className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="add-product-modal-title" className="text-lg font-semibold text-slate-900">
              Add product
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">एक नाम, कई SKU — category, supplier, price same।</p>
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
                <span className="text-sm font-medium text-slate-700">SKU IDs *</span>
                <button
                  type="button"
                  onClick={addSkuRow}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  + SKU add करें
                </button>
              </div>
              <ul className="mt-2 space-y-2">
                {skuRows.map((sku, index) => (
                  <li key={index} className="flex gap-2">
                    <input
                      required={index === 0}
                      value={sku}
                      onChange={(e) => setSkuAt(index, e.target.value)}
                      placeholder={`SKU ${index + 1}`}
                      className={`min-w-0 flex-1 font-mono text-sm ${inputClass}`}
                    />
                    {skuRows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSkuRow(index)}
                        className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                      >
                        Remove
                      </button>
                    ) : null}
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
