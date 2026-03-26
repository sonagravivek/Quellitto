import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function Navbar() {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-cyan-500 text-sm font-bold text-white">
            Q
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Quellitto</p>
            <p className="text-xs text-slate-500">Inventory</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            Dashboard
          </NavLink>
          <NavLink to="/purchase" className={linkClass}>
            Purchase
          </NavLink>
          <NavLink to="/products/new" className={linkClass}>
            Add product
          </NavLink>
          <NavLink to="/today-order" className={linkClass}>
            Today order
          </NavLink>
          <NavLink to="/sku-bank-statement" className={linkClass}>
            SKU bank stmt
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
