import { useEffect, useState } from "react";
import { useToast } from "./ToastProvider.jsx";

function emptySkuRow() {
  return { id: null, skuCode: "", statementAmount: "" };
}

function stmtInputValue(total) {
  const n = Number(total);
  return Number.isFinite(n) && n >= 0.01 ? String(Math.round(n * 100) / 100) : "";
}

export default function EditProductGroupModal({ open, group, onClose, onSave, submitting }) {
  const { showToast } = useToast();
  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [skuRows, setSkuRows] = useState([]);

  useEffect(() => {
    if (!open || !group) return;
    setProductName(group.productName ?? "");
    setPurchasePrice(String(group.purchasePrice ?? ""));
    setSkuRows(
      group.skus.length
        ? group.skus.map((s) => ({
            id: s.id,
            skuCode: s.skuCode ?? "",
            statementAmount: stmtInputValue(s.statementTotal),
            quantityInStock: Number(s.quantityInStock ?? 0),
            quantityPurchased: Number(s.quantityPurchased ?? 0),
          }))
        : [emptySkuRow()]
    );
  }, [open, group]);

  if (!open || !group) return null;

  function setSkuAt(index, patch) {
    setSkuRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addSkuRow() {
    setSkuRows((prev) => [...prev, emptySkuRow()]);
  }

  function removeSkuRow(index) {
    setSkuRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedRows = skuRows
      .map((r) => ({
        id: r.id,
        skuCode: String(r.skuCode ?? "").trim(),
        statementAmount: String(r.statementAmount ?? "").trim(),
        quantityInStock: Number(r.quantityInStock) || 0,
        quantityPurchased: Number(r.quantityPurchased) || 0,
      }))
      .filter((r) => r.skuCode.length > 0);

    if (!trimmedRows.length) {
      showToast("कम से कम एक SKU ID भरें", "error");
      return;
    }

    await onSave({
      productName: productName.trim(),
      purchasePrice: Number(purchasePrice),
      skuRows: trimmedRows,
    });
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-group-title"
    >
      <div className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="edit-group-title" className="text-lg font-semibold text-slate-900">
              Update product
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Product name, purchase price, SKU + Stmt (₹)।</p>
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
              <input required value={productName} onChange={(e) => setProductName(e.target.value)} className={inputClass} />
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

            <div className="border-t border-slate-100 pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">SKU IDs</span>
                <button
                  type="button"
                  onClick={addSkuRow}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  + SKU जोड़ें
                </button>
              </div>
              <ul className="space-y-3">
                {skuRows.map((row, index) => (
                  <li key={row.id != null ? `id-${row.id}` : `new-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {row.id != null ? `SKU #${row.id}` : "नया SKU"}
                      </span>
                      {skuRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkuRow(index)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          हटाएँ
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
                        SKU name / ID *
                        <input
                          required={index === 0}
                          value={row.skuCode}
                          onChange={(e) => setSkuAt(index, { skuCode: e.target.value })}
                          className={`font-mono text-sm ${inputClass}`}
                          placeholder="SKU code"
                        />
                      </label>
                      <label className="w-full text-sm font-medium text-slate-700 sm:w-32">
                        Stmt ₹
                        <input
                          min={0}
                          step="0.01"
                          type="number"
                          value={row.statementAmount}
                          onChange={(e) => setSkuAt(index, { statementAmount: e.target.value })}
                          placeholder="—"
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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
