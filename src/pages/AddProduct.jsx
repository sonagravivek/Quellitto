import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createProduct,
  deleteProduct,
  getProducts,
  syncProductBankStatementTotal,
  updateProduct,
} from "../services/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import AddProductModal from "../components/AddProductModal.jsx";
import EditProductGroupModal from "../components/EditProductGroupModal.jsx";
import { groupProductsForTable } from "../utils/groupProducts.js";
import { apiErrorMessage, formatCurrency, formatNumber } from "../utils/format.js";

export default function AddProduct() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupEditSaving, setGroupEditSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  /** टेबल में कई SKU होने पर — बटन से खुलने वाली लिस्ट */
  const [skuListPopupGroup, setSkuListPopupGroup] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      if (res.success) {
        const rows = Array.isArray(res.data) ? res.data : [];
        setGroups(groupProductsForTable(rows));
      }
    } catch (e) {
      showToast(apiErrorMessage(e, "Products load failed"), "error");
    } finally {
      setTableLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleModalSubmit(body) {
    const skuCodes = (body.skuCodes || []).map((s) => String(s).trim()).filter(Boolean);
    if (!skuCodes.length) {
      showToast("कम से कम एक SKU ID भरें", "error");
      return;
    }
    const uniq = new Set(skuCodes);
    if (uniq.size !== skuCodes.length) {
      showToast("SKU IDs डुप्लिकेट नहीं हो सकतीं", "error");
      return;
    }

    const stmt = body.statementAmounts;
    if (Array.isArray(stmt) && stmt.length !== skuCodes.length) {
      showToast("Bank statement amounts की गिनती SKU जितनी होनी चाहिए", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await createProduct({
        productName: body.productName,
        category: body.category,
        supplierName: body.supplierName,
        purchasePrice: body.purchasePrice,
        skuCodes,
        statementAmounts: Array.isArray(stmt) ? stmt : undefined,
      });
      if (res.success) {
        const n = res.count ?? skuCodes.length;
        const sc = res.statementLinesCreated ?? 0;
        showToast(
          sc > 0 ? `1 product · ${n} SKU · bank stmt ${sc} लाइन` : `1 product · ${n} SKU`,
          "success"
        );
        setModalOpen(false);
        await loadProducts();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Product add नहीं हो सका"), "error");
    } finally {
      setSaving(false);
    }
  }

  function parseStmtAmount(s) {
    const n = Number(String(s ?? "").trim());
    return Number.isFinite(n) && n >= 0.01 ? Math.round(n * 100) / 100 : null;
  }

  function rowUpdateBody(group, sp, row) {
    return {
      productName: sp.productName,
      category: group.category,
      supplierName: group.supplierName,
      purchasePrice: sp.purchasePrice,
      sellingPrice: group.sellingPrice,
      purchaseDate: group.purchaseDate,
      notes: group.notes ?? "",
      skuCode: row.skuCode,
      quantityInStock: row.quantityInStock,
      quantityPurchased: row.quantityPurchased,
    };
  }

  async function handleSaveGroupEdit({ productName, purchasePrice, skuRows }) {
    const group = editingGroup;
    if (!group) return;

    if (!skuRows.length) {
      showToast("कम से कम एक SKU ID भरें", "error");
      return;
    }
    const codes = skuRows.map((r) => r.skuCode);
    if (new Set(codes).size !== codes.length) {
      showToast("SKU IDs डुप्लिकेट नहीं हो सकतीं", "error");
      return;
    }

    const sp = { productName, purchasePrice };
    const origById = Object.fromEntries(group.skus.map((s) => [s.id, s]));
    const keptIds = new Set(skuRows.filter((r) => r.id != null).map((r) => r.id));
    const removed = group.skus.filter((s) => !keptIds.has(s.id));
    const existingRows = skuRows.filter((r) => r.id != null);
    const newRows = skuRows.filter((r) => r.id == null);

    setGroupEditSaving(true);
    try {
      for (const s of removed) {
        const res = await deleteProduct(s.id);
        if (!res.success) throw new Error("Delete failed");
      }

      for (const row of newRows) {
        const stmt = parseStmtAmount(row.statementAmount);
        const createRes = await createProduct({
          productName: sp.productName,
          category: group.category,
          supplierName: group.supplierName,
          purchasePrice: sp.purchasePrice,
          skuCodes: [row.skuCode],
          statementAmounts: [stmt],
        });
        if (!createRes.success || !createRes.data?.[0]?.id) {
          throw new Error(createRes.message || "Create failed");
        }
        const newId = createRes.data[0].id;
        const patchRes = await updateProduct(newId, rowUpdateBody(group, sp, row));
        if (!patchRes.success) throw new Error(patchRes.message || "Update new SKU failed");
        const syncRes = await syncProductBankStatementTotal(newId, stmt);
        if (!syncRes.success) throw new Error(syncRes.message || "Stmt sync failed");
      }

      const ts = Date.now();
      const needsTempPass = existingRows.some((r) => origById[r.id].skuCode !== r.skuCode);
      if (needsTempPass) {
        for (const row of existingRows) {
          if (origById[row.id].skuCode === row.skuCode) continue;
          const tempCode = `__TMP_GR_${row.id}_${ts}__`;
          const res = await updateProduct(row.id, {
            ...rowUpdateBody(group, sp, { ...row, skuCode: tempCode }),
          });
          if (!res.success) throw new Error(res.message || "Temp SKU rename failed");
        }
      }

      for (const row of existingRows) {
        const res = await updateProduct(row.id, rowUpdateBody(group, sp, row));
        if (!res.success) throw new Error(res.message || "Update failed");
        const stmt = parseStmtAmount(row.statementAmount);
        const syncRes = await syncProductBankStatementTotal(row.id, stmt);
        if (!syncRes.success) throw new Error(syncRes.message || "Stmt sync failed");
      }

      showToast("Product अपडेट हो गया", "success");
      setEditingGroup(null);
      await loadProducts();
    } catch (err) {
      showToast(apiErrorMessage(err, "Group update failed"), "error");
      await loadProducts();
    } finally {
      setGroupEditSaving(false);
    }
  }

  async function handleDeleteGroup(group) {
    const ok = window.confirm(
      `पूरा product हटाएँ "${group.productName}"?\n\nइस लाइन की सभी ${group.skus.length} SKU और उनकी purchases हट जाएँगी।`
    );
    if (!ok) return;
    try {
      for (const s of group.skus) {
        const res = await deleteProduct(s.id);
        if (!res.success) throw new Error("Delete failed");
      }
      showToast("सभी SKU हटा दिए गए", "success");
      await loadProducts();
    } catch (err) {
      showToast(apiErrorMessage(err, "Delete failed"), "error");
      await loadProducts();
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Products</h1>
          <p className="mt-1 text-slate-600">
            टेबल में 1 लाइन = 1 product; अंदर वही name/category/supplier/price वाली सारी SKU IDs।
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Add product
          </button>
          <Link
            to="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <Link
            to="/purchase"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Purchase
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Products (catalog)</h2>
          <button
            type="button"
            onClick={() => {
              setTableLoading(true);
              loadProducts();
            }}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Refresh
          </button>
        </div>

        {tableLoading ? (
          <LoadingSpinner label="Loading products…" />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">Product name</th>
                    <th className="min-w-[200px] px-4 py-3 sm:px-6">SKU IDs</th>
                    <th className="px-4 py-3 sm:px-6">Category</th>
                    <th className="px-4 py-3 sm:px-6">Supplier</th>
                    <th className="px-4 py-3 text-right sm:px-6">Purchase price</th>
                    <th className="px-4 py-3 text-right sm:px-6">Total stock</th>
                    <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {groups.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        अभी कोई product नहीं — <strong>Add product</strong> से जोड़ें।
                      </td>
                    </tr>
                  ) : (
                    groups.map((g) => (
                      <tr
                        key={g.skus
                          .map((s) => s.id)
                          .sort((a, b) => a - b)
                          .join("-")}
                        className="align-top hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-medium sm:px-6">{g.productName}</td>
                        <td className="px-4 py-3 sm:px-6">
                          {g.skus.length <= 1 ? (
                            g.skus.length === 1 ? (
                              <div className="rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-xs sm:text-sm">
                                {g.skus[0].skuCode}
                                <span className="ml-1 font-sans text-slate-500">
                                  ({formatNumber(g.skus[0].quantityInStock)})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSkuListPopupGroup(g)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-sm font-medium text-brand-700 shadow-sm hover:bg-brand-50"
                            >
                              {g.skus.length} SKUs देखें
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 sm:px-6">{g.category}</td>
                        <td className="px-4 py-3 sm:px-6">{g.supplierName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                          {formatCurrency(g.purchasePrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                          {formatNumber(g.totalStock)}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-6">
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingGroup(g)}
                              className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 hover:bg-brand-100"
                            >
                              Update
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(g)}
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
              </table>
            </div>
          </div>
        )}
      </section>

      <AddProductModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleModalSubmit}
        submitting={saving}
      />

      <EditProductGroupModal
        open={!!editingGroup}
        group={editingGroup}
        onClose={() => !groupEditSaving && setEditingGroup(null)}
        onSave={handleSaveGroupEdit}
        submitting={groupEditSaving}
      />

      {skuListPopupGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sku-list-popup-title"
          onClick={(e) => e.target === e.currentTarget && setSkuListPopupGroup(null)}
        >
          <div className="max-h-[min(80vh,480px)] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="sku-list-popup-title" className="text-lg font-semibold text-slate-900">
                  SKU IDs
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">{skuListPopupGroup.productName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSkuListPopupGroup(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="max-h-[min(60vh,360px)] space-y-2 overflow-y-auto px-5 py-4">
              {skuListPopupGroup.skus.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2.5"
                >
                  <span className="font-mono text-sm text-slate-900">{s.skuCode}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    stock {formatNumber(s.quantityInStock)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setSkuListPopupGroup(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
