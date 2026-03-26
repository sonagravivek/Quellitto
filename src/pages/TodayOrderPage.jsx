import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { useToast } from "../components/ToastProvider.jsx";
import { getProducts, getTodayOrders, submitTodayOrders } from "../services/api.js";
import { apiErrorMessage, formatNumber } from "../utils/format.js";
import { catalogGroupKeyString, groupProductsForTable } from "../utils/groupProducts.js";

function emptyLine() {
  return { productId: "", quantity: "1" };
}

function findGroupByKey(productGroups, groupKey) {
  if (!groupKey) return null;
  return productGroups.find((g) => catalogGroupKeyString(g) === groupKey) ?? null;
}

function findGroupContainingProductId(productGroups, productId) {
  if (!Number.isFinite(productId) || productId < 1) return null;
  return (
    productGroups.find((g) => g.skus?.some((s) => Number(s.id) === productId)) ?? null
  );
}

/** Same catalog की कई lines → quantities जोड़कर एक बार expand */
function mergedGroupQuantities(lines, productGroups) {
  const map = new Map();
  for (const row of lines) {
    const pid = Math.floor(Number(row.productId));
    const q = Math.floor(Number(row.quantity));
    const g = findGroupContainingProductId(productGroups, pid);
    if (!g?.skus?.length || !Number.isFinite(q) || q < 1) continue;
    const key = catalogGroupKeyString(g);
    map.set(key, (map.get(key) || 0) + q);
  }
  return map;
}

/** लॉग में दिखाने वाली SKU: हर group के लिए user की पहली चुनी हुई id */
function pickedProductIdByGroupKey(lines, productGroups) {
  const map = new Map();
  for (const row of lines) {
    const pid = Math.floor(Number(row.productId));
    const g = findGroupContainingProductId(productGroups, pid);
    if (!g?.skus?.length) continue;
    const key = catalogGroupKeyString(g);
    if (!map.has(key)) map.set(key, pid);
  }
  return map;
}

/** साझा पूल: हर catalog line की qty एक बार कुल stock से घटती है; सभी SKU पर वही संख्या रहती है */
function TodayOrderSubmitSummary({ lines, productGroups }) {
  const merged = mergedGroupQuantities(lines, productGroups);
  let totalPoolUnits = 0;
  for (const [, q] of merged) {
    totalPoolUnits += q;
  }
  if (merged.size === 0) return null;
  return (
    <p className="text-sm font-medium text-slate-700">
      Submit पर <strong>कुल physical stock</strong> से <span className="text-brand-700">{totalPoolUnits}</span> unit घटेंगी;
      उसी product की सभी SKU लाइनों पर <strong>वही बचा हुआ stock</strong> दिखेगा।
    </p>
  );
}

export default function TodayOrderPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [todayRows, setTodayRows] = useState([]);
  const [todayDate, setTodayDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    const res = await getProducts();
    if (res.success) setProducts(res.data || []);
  }, []);

  const loadTodayLog = useCallback(async () => {
    const res = await getTodayOrders();
    if (res.success) {
      setTodayRows(res.data || []);
      if (res.date) setTodayDate(res.date);
    }
  }, []);

  const init = useCallback(async () => {
    try {
      await Promise.all([loadProducts(), loadTodayLog()]);
    } catch (e) {
      showToast(apiErrorMessage(e, "Load failed"), "error");
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadTodayLog, showToast]);

  useEffect(() => {
    init();
  }, [init]);

  const productGroups = useMemo(() => groupProductsForTable(products), [products]);

  function setLineAt(index, field, value) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const merged = mergedGroupQuantities(lines, productGroups);
    const pickedByKey = pickedProductIdByGroupKey(lines, productGroups);
    const items = [];
    for (const [key, q] of merged) {
      const g = findGroupByKey(productGroups, key);
      if (!g?.skus?.length) continue;
      const logProductId = pickedByKey.get(key);
      if (!logProductId) continue;
      for (const s of g.skus) {
        const id = Math.floor(Number(s.id));
        if (id >= 1) {
          items.push({ productId: id, quantity: q, logProductId });
        }
      }
    }

    if (!items.length) {
      showToast("कम से कम एक पंक्ति में SKU चुनें और quantity भरें", "error");
      return;
    }

    let totalPoolDeduct = 0;
    for (const [, q] of merged) {
      totalPoolDeduct += q;
    }
    const logLineCount = merged.size;

    setSubmitting(true);
    try {
      const res = await submitTodayOrders({ items });
      if (res.success) {
        showToast(
          `Order लगा — kul ${totalPoolDeduct} unit कुल stock se ghate; log में ${logLineCount} line`,
          "success"
        );
        setLines([emptyLine()]);
        await loadProducts();
        await loadTodayLog();
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Save failed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading…" />;

  const selectClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Today order</h1>
        <p className="mt-1 text-slate-600">
          <strong>साझा कुल stock:</strong> कोई भी SKU चुनो — नीचे की <strong>Quantity</strong> एक बार कुल inventory से घटेगी; उसी product की{" "}
          <strong>सभी SKU</strong> पर <strong>वही बचा हुआ stock</strong> दिखेगा। उदाहरण: कुल 50, <code>bottle1</code> पर order 10 → कुल 40;{" "}
          <code>bottle1</code> और <code>bottle2</code> दोनों 40।
        </p>
        {todayDate ? (
          <p className="mt-2 text-sm font-medium text-brand-700">तारीख (server): {todayDate}</p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Order lines</h2>
          <button
            type="button"
            onClick={addLine}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            + Line
          </button>
        </div>

        {products.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-slate-600">
            कोई product नहीं — पहले <strong>Add product</strong> से catalog बनाएँ।
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map((row, index) => {
              const pid = Math.floor(Number(row.productId));
              const selectedGroup =
                Number.isFinite(pid) && pid >= 1
                  ? findGroupContainingProductId(productGroups, pid)
                  : null;
              return (
              <li
                key={index}
                className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-end"
              >
                <div className="min-w-0 flex-1 space-y-1">
                <label className="block text-sm font-medium text-slate-700">
                  SKU
                  <select
                    required={index === 0}
                    value={row.productId === "" ? "" : String(row.productId)}
                    onChange={(e) => setLineAt(index, "productId", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">— चुनें —</option>
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.skuCode} · {p.productName} (stock {formatNumber(p.quantityInStock)})
                      </option>
                    ))}
                  </select>
                </label>
                {selectedGroup && selectedGroup.skus.length > 1 ? (
                  <p className="text-xs text-slate-500">
                    साझा पूल — SKU: {selectedGroup.skus.map((s) => s.skuCode).join(", ")} — नीचे की qty <strong>कुल</strong> से घटेगी, सभी पर
                    वही stock
                  </p>
                ) : null}
                </div>
                <label className="w-full text-sm font-medium text-slate-700 sm:w-44">
                  Quantity (कुल से घटेगा)
                  <input
                    required={index === 0}
                    min={1}
                    type="number"
                    value={row.quantity}
                    onChange={(e) => setLineAt(index, "quantity", e.target.value)}
                    className={selectClass}
                  />
                </label>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 sm:shrink-0"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="hidden w-20 sm:block" />
                )}
              </li>
            );
            })}
          </ul>
        )}

        <TodayOrderSubmitSummary lines={lines} productGroups={productGroups} />

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={submitting || products.length === 0}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Applying…" : "Submit — stock घटाएँ"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">आज की logged lines</h2>
        <p className="text-sm text-slate-600">
          लॉग में <strong>चुनी हुई SKU</strong> और घटाई गई <strong>कुल quantity</strong> दिखती है। Inventory में वही रकम एक बार साझा पूल से
          घटती है; सभी SKU लाइनों पर वही बचा stock।
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3 sm:px-6">Time</th>
                  <th className="px-4 py-3 sm:px-6">SKU</th>
                  <th className="px-4 py-3 sm:px-6">Product</th>
                  <th className="px-4 py-3 text-right sm:px-6">Qty removed</th>
                  <th className="px-4 py-3 text-right sm:px-6">Current stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {todayRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      आज अभी कोई today-order entry नहीं।
                    </td>
                  </tr>
                ) : (
                  todayRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 text-xs sm:px-6">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs sm:px-6 sm:text-sm">{r.skuCode}</td>
                      <td className="px-4 py-3 sm:px-6">{r.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums sm:px-6">{r.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums sm:px-6">
                        {formatNumber(r.currentStock)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
