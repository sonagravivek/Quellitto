import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatCard from "../components/StatCard.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { getDashboardStats } from "../services/api.js";
import { useToast } from "../components/ToastProvider.jsx";
import { apiErrorMessage, formatCurrency, formatNumber } from "../utils/format.js";

export default function Dashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getDashboardStats();
        if (!cancelled && res.success) setStats(res.data);
      } catch (e) {
        if (!cancelled) showToast(apiErrorMessage(e, "Dashboard load failed"), "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  if (loading) return <LoadingSpinner label="Loading dashboard…" />;

  const threshold = stats?.lowStockThreshold ?? 10;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Products, stock quantity, inventory value (purchase cost), और low-stock count।
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/products/new"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Add product
          </Link>
          <Link
            to="/purchase"
            className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Purchase add करें
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total products"
          value={formatNumber(stats?.totalProducts ?? 0)}
          hint="Catalog लाइनें (SKU count नहीं)"
        />
        <StatCard
          title="Total stock qty"
          value={formatNumber(stats?.totalStockQuantity ?? 0)}
          hint="सभी products का stock"
          accent="emerald"
        />
        <StatCard
          title="Inventory value"
          value={formatCurrency(stats?.totalInventoryValue ?? 0)}
          hint="Stock × purchase price"
        />
        <StatCard
          title="Low stock"
          value={formatNumber(stats?.lowStockCount ?? 0)}
          hint={`Below ${threshold} units`}
          accent="amber"
        />
      </div>
    </div>
  );
}
