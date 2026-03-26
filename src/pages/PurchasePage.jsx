import { useCallback, useEffect, useMemo, useState } from "react";
import PurchaseFormModal from "../components/PurchaseFormModal.jsx";
import EditPurchaseModal from "../components/EditPurchaseModal.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import {
  createPurchase,
  deletePurchase,
  getProducts,
  getPurchases,
  updatePurchase,
} from "../services/api.js";
import { apiErrorMessage, formatCurrency, formatDateTime } from "../utils/format.js";
import { groupProductsForTable } from "../utils/groupProducts.js";

function purchaseLineTotal(row) {
  const q = Number(row.quantity);
  const u = Number(row.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
  return Math.round(q * u * 100) / 100;
}

export default function PurchasePage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [prodRes, purRes] = await Promise.all([getProducts(), getPurchases()]);
      if (prodRes.success) setProducts(prodRes.data || []);
      if (purRes.success) setRows(purRes.data || []);
    } catch (e) {
      showToast(apiErrorMessage(e, "Load failed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const productGroups = useMemo(() => groupProductsForTable(products), [products]);

  const purchaseSubtotal = useMemo(
    () => rows.reduce((sum, row) => sum + purchaseLineTotal(row), 0),
    [rows]
  );

  async function handleCreate(body) {
    setSubmitting(true);
    try {
      const res = await createPurchase(body);
      if (res.success) {
        const n = res.data?.count ?? 1;
        const q = body.quantityPurchased;
        showToast(
          n > 1
            ? `Saved · kul stock +${q} (${n} SKU synced) · ${formatCurrency(res.data.totalAmount)}`
            : `Saved · ${formatCurrency(res.data.totalAmount)} · stock +${q}`,
          "success"
        );
        setModalOpen(false);
        await loadAll();
      }
    } catch (e) {
      showToast(apiErrorMessage(e, "Could not save purchase"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePurchase(id, body) {
    setEditSubmitting(true);
    try {
      const res = await updatePurchase(id, body);
      if (res.success) {
        showToast("Purchase updated · Stock adjusted", "success");
        setEditingRow(null);
        await loadAll();
      }
    } catch (e) {
      showToast(apiErrorMessage(e, "Update failed"), "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeletePurchase(row) {
    const ok = window.confirm(
      `Delete this purchase?\n${row.productName} · ${row.quantityLabel ?? row.quantity} · ${formatCurrency(purchaseLineTotal(row))}\n\nStock में से यह quantity घट जाएगी।`
    );
    if (!ok) return;
    try {
      const res = await deletePurchase(row.id);
      if (res.success) {
        showToast("Purchase deleted", "success");
        await loadAll();
      }
    } catch (e) {
      showToast(apiErrorMessage(e, "Delete failed"), "error");
    }
  }

  if (loading) return <LoadingSpinner label="Loading…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Purchase</h1>
          <p className="mt-1 text-slate-600">Entries — Add / Edit / Delete (stock auto-adjust)</p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="self-start rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 sm:self-auto"
        >
          Add Purchase
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 sm:px-6">Date</th>
                <th className="px-4 py-3 sm:px-6">Product</th>
                <th className="px-4 py-3 text-right sm:px-6">Qty</th>
                <th className="px-4 py-3 text-right sm:px-6">Unit price</th>
                <th className="px-4 py-3 text-right sm:px-6">Amount</th>
                <th className="px-4 py-3 text-right sm:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    अभी कोई purchase नहीं — Add Purchase से entry बनाएँ।
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-4 py-3 sm:px-6">{formatDateTime(row.date)}</td>
                    <td className="px-4 py-3 sm:px-6">{row.productName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                      {row.quantityLabel ?? row.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums sm:px-6">
                      {formatCurrency(purchaseLineTotal(row))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                      <div className="flex flex-wrap justify-end gap-1">
                        {!row.isBatch ? (
                          <button
                            type="button"
                            onClick={() => setEditingRow(row)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(row)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-800 sm:px-6"
                  >
                    Subtotal
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold tabular-nums text-slate-900 sm:px-6">
                    {formatCurrency(purchaseSubtotal)}
                  </td>
                  <td className="px-4 py-3 sm:px-6" aria-hidden />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <PurchaseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        submitting={submitting}
        productGroups={productGroups}
      />

      <EditPurchaseModal
        open={!!editingRow}
        row={editingRow}
        onClose={() => !editSubmitting && setEditingRow(null)}
        onSave={handleSavePurchase}
        submitting={editSubmitting}
      />
    </div>
  );
}
