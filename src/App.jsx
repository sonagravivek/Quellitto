import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PurchasePage from "./pages/PurchasePage.jsx";
import AddProduct from "./pages/AddProduct.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/purchase" element={<PurchasePage />} />
        <Route path="/products/new" element={<AddProduct />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
