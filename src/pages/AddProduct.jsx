import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createProduct, deleteProduct, getProducts, updateProduct } from "../services/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import AddProductModal from "../components/AddProductModal.jsx";
import EditProductModal from "../components/EditProductModal.jsx";
import { apiErrorMessage, formatCurrency, formatNumber } from "../utils/format.js";

export default function AddProduct() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const res = await getProducts();
      if (res.success) setProducts(res.data || []);
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
    const skuCodes = body.skuCodes.filter(Boolean);
    if (!skuCodes.length) {
      showToast("कम से कम एक SKU ID भरें", "error");
      return;
    }
    const uniq = new Set(skuCodes);
    if (uniq.size !== skuCodes.length) {
      showToast("SKU IDs डुप्लिकेट नहीं हो सकतीं", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await createProduct({ ...body, skuCodes });
      if (res.success) {
        const n = res.count ?? res.data?.length ?? skuCodes.length;
        showToast(`${n} SKU add हो गईं`, "success");
        setModalOpen(false);
        await loadProducts();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Product add नहीं हो सका"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(id, body) {
    setEditSaving(true);
    try {
      const res = await updateProduct(id, body);
      if (res.success) {
        showToast("Product updated", "success");
        setEditingProduct(null);
        await loadProducts();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Update failed"), "error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(p) {
    const ok = window.confirm(
      `Delete "${p.productName}" (${p.skuCode})?\n\nइस SKU से जुड़ी सभी purchase entries भी हट जाएँगी।`
    );
    if (!ok) return;
    try {
      const res = await deleteProduct(p.id);
      if (res.success) {
        showToast("Product deleted", "success");
        await loadProducts();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Delete failed"), "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Products</h1>
          <p className="mt-1 text-slate-600">Catalog — Add / Edit / Delete</p>
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
                    <th className="px-4 py-3 sm:px-6">SKU ID</th>
                    <th className="px-4 py-3 sm:px-6">Category</th>
                    <th className="px-4 py-3 sm:px-6">Supplier</th>
                    <th className="px-4 py-3 text-right sm:px-6">Purchase price</th>
                    <th className="px-4 py-3 text-right sm:px-6">Stock</th>
                    <th className="px-4 py-3 text-right sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                        अभी कोई product नहीं — <strong>Add product</strong> से जोड़ें।
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 sm:px-6">{p.productName}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs sm:px-6 sm:text-sm">
                          {p.skuCode}
                        </td>
                        <td className="px-4 py-3 sm:px-6">{p.category}</td>
                        <td className="px-4 py-3 sm:px-6">{p.supplierName}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                          {formatCurrency(p.purchasePrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                          {formatNumber(p.quantityInStock)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6">
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-200"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
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

      <EditProductModal
        open={!!editingProduct}
        product={editingProduct}
        onClose={() => !editSaving && setEditingProduct(null)}
        onSave={handleSaveEdit}
        submitting={editSaving}
      />
    </div>
  );
}
