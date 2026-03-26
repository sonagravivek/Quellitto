import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import {
  createSkuBankStatementLine,
  deleteSkuBankStatementLine,
  getProducts,
  getSkuBankStatement,
  updateSkuBankStatementLine,
} from "../services/api.js";
import { apiErrorMessage, formatCurrency } from "../utils/format.js";

function formatDateOnly(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  if (s.length !== 10) return s;
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

export default function SkuBankStatementPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [header, setHeader] = useState(null);
  const [lines, setLines] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingStmt, setLoadingStmt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [form, setForm] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    debit: "",
    credit: "",
    narration: "",
    bankReference: "",
  });

  const loadProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      if (res.success) {
        const rows = Array.isArray(res.data) ? res.data : [];
        rows.sort((a, b) => String(a.skuCode).localeCompare(String(b.skuCode)));
        setProducts(rows);
      }
    } catch (e) {
      showToast(apiErrorMessage(e, "Products load failed"), "error");
    } finally {
      setLoadingProducts(false);
    }
  }, [showToast]);

  const loadStatement = useCallback(
    async (pid) => {
      if (!pid) {
        setHeader(null);
        setLines([]);
        return;
      }
      setLoadingStmt(true);
      try {
        const res = await getSkuBankStatement(Number(pid));
        if (res.success && res.data) {
          setHeader(res.data.product);
          setLines(res.data.lines || []);
        }
      } catch (e) {
        showToast(apiErrorMessage(e, "Statement load failed"), "error");
        setHeader(null);
        setLines([]);
      } finally {
        setLoadingStmt(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadStatement(productId);
  }, [productId, loadStatement]);

  function uf(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    const pid = Number(productId);
    if (!pid) {
      showToast("पहले SKU चुनें", "error");
      return;
    }
    const debit = Number(form.debit) || 0;
    const credit = Number(form.credit) || 0;
    if (debit <= 0 && credit <= 0) {
      showToast("Debit या credit में राशि भरें", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSkuBankStatementLine({
        productId: pid,
        entryDate: form.entryDate,
        debit,
        credit,
        narration: form.narration.trim(),
        bankReference: form.bankReference.trim(),
      });
      if (res.success) {
        showToast("लाइन जोड़ी गई", "success");
        setForm((f) => ({
          ...f,
          debit: "",
          credit: "",
          narration: "",
          bankReference: "",
        }));
        await loadStatement(productId);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Save failed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(line) {
    const ok = window.confirm(`यह लाइन हटाएँ?\n${formatDateOnly(line.entryDate)} · ${formatCurrency(line.debit)} / ${formatCurrency(line.credit)}`);
    if (!ok) return;
    try {
      const res = await deleteSkuBankStatementLine(line.id);
      if (res.success) {
        showToast("हटा दिया", "success");
        await loadStatement(productId);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Delete failed"), "error");
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    const debit = Number(editing.debit) || 0;
    const credit = Number(editing.credit) || 0;
    if (debit <= 0 && credit <= 0) {
      showToast("Debit या credit में राशि भरें", "error");
      return;
    }
    setEditSaving(true);
    try {
      const res = await updateSkuBankStatementLine(editing.id, {
        entryDate: editing.entryDate,
        debit,
        credit,
        narration: String(editing.narration ?? "").trim(),
        bankReference: String(editing.bankReference ?? "").trim(),
      });
      if (res.success) {
        showToast("अपडेट हो गया", "success");
        setEditing(null);
        await loadStatement(productId);
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Update failed"), "error");
    } finally {
      setEditSaving(false);
    }
  }

  if (loadingProducts) {
    return <LoadingSpinner label="Loading…" />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">SKU bank statement</h1>
          <p className="mt-1 text-slate-600">
            हर SKU के लिए बैंक स्टेटमेंट लाइनें (तारीख, debit/credit, विवरण, reference) सेट करें। Balance = क्रेडिट − डेबिट (क्रम से)।
          </p>
        </div>
        <Link
          to="/products/new"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Products
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          SKU चुनें *
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={inputClass}
          >
            <option value="">— चुनें —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.skuCode} · {p.productName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {productId && (
        <>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">नई लाइन</h2>
            <p className="mt-1 text-sm text-slate-500">
              {header ? (
                <>
                  <span className="font-mono font-semibold text-slate-800">{header.skuCode}</span> · {header.productName}
                </>
              ) : (
                "…"
              )}
            </p>
            <form onSubmit={handleAdd} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                तारीख *
                <input required type="date" value={form.entryDate} onChange={(e) => uf({ entryDate: e.target.value })} className={inputClass} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Debit (₹)
                <input min={0} step="0.01" type="number" value={form.debit} onChange={(e) => uf({ debit: e.target.value })} className={inputClass} placeholder="0" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Credit (₹)
                <input min={0} step="0.01" type="number" value={form.credit} onChange={(e) => uf({ credit: e.target.value })} className={inputClass} placeholder="0" />
              </label>
              <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                Narration
                <input value={form.narration} onChange={(e) => uf({ narration: e.target.value })} className={inputClass} placeholder="जैसे: NEFT supplier" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bank ref / UTR
                <input value={form.bankReference} onChange={(e) => uf({ bankReference: e.target.value })} className={`font-mono ${inputClass}`} />
              </label>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
                >
                  {submitting ? "Saving…" : "लाइन जोड़ें"}
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Statement</h2>
            {loadingStmt ? (
              <LoadingSpinner label="Loading statement…" />
            ) : lines.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
                अभी कोई लाइन नहीं — ऊपर से पहली लाइन जोड़ें।
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-4 py-3 sm:px-6">Date</th>
                        <th className="px-4 py-3 text-right sm:px-6">Debit</th>
                        <th className="px-4 py-3 text-right sm:px-6">Credit</th>
                        <th className="px-4 py-3 text-right sm:px-6">Balance</th>
                        <th className="px-4 py-3 sm:px-6">Narration</th>
                        <th className="px-4 py-3 sm:px-6">Ref</th>
                        <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/80">
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6">{formatDateOnly(line.entryDate)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                            {Number(line.debit) > 0 ? formatCurrency(line.debit) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                            {Number(line.credit) > 0 ? formatCurrency(line.credit) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums sm:px-6">
                            {formatCurrency(line.runningBalance)}
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 sm:px-6" title={line.narration}>
                            {line.narration || "—"}
                          </td>
                          <td className="max-w-[120px] truncate font-mono text-xs sm:px-6" title={line.bankReference}>
                            {line.bankReference || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({
                                  id: line.id,
                                  entryDate: String(line.entryDate).slice(0, 10),
                                  debit: String(line.debit ?? ""),
                                  credit: String(line.credit ?? ""),
                                  narration: line.narration ?? "",
                                  bankReference: line.bankReference ?? "",
                                })
                              }
                              className="mr-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(line)}
                              className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-900">लाइन एडिट</h2>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3 px-5 py-4">
              <label className="block text-sm font-medium text-slate-700">
                तारीख *
                <input
                  required
                  type="date"
                  value={editing.entryDate}
                  onChange={(e) => setEditing((x) => ({ ...x, entryDate: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Debit (₹)
                  <input
                    min={0}
                    step="0.01"
                    type="number"
                    value={editing.debit}
                    onChange={(e) => setEditing((x) => ({ ...x, debit: e.target.value }))}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Credit (₹)
                  <input
                    min={0}
                    step="0.01"
                    type="number"
                    value={editing.credit}
                    onChange={(e) => setEditing((x) => ({ ...x, credit: e.target.value }))}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Narration
                <input
                  value={editing.narration}
                  onChange={(e) => setEditing((x) => ({ ...x, narration: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bank ref
                <input
                  value={editing.bankReference}
                  onChange={(e) => setEditing((x) => ({ ...x, bankReference: e.target.value }))}
                  className={`font-mono ${inputClass}`}
                />
              </label>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => !editSaving && setEditing(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
