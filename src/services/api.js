import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.length > 0
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
    : "/api";

const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

export async function getDashboardStats() {
  const { data } = await api.get("/products/dashboard/stats");
  return data;
}

export async function getProducts() {
  const { data } = await api.get("/products");
  return data;
}

export async function createProduct(body) {
  const { data } = await api.post("/products", body);
  return data;
}

export async function getProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data;
}

export async function updateProduct(id, body) {
  const { data } = await api.put(`/products/${id}`, body);
  return data;
}

/** Stmt: सारी lines हटाकर एक credit; amount null / खाली = कोई stmt नहीं */
export async function syncProductBankStatementTotal(productId, amount) {
  const { data } = await api.put(`/products/${productId}/bank-statement-total`, {
    amount: amount == null || amount === "" ? null : Number(amount),
  });
  return data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function getPurchases() {
  const { data } = await api.get("/purchase");
  return data;
}

export async function createPurchase(body) {
  const { data } = await api.post("/purchase", body);
  return data;
}

export async function updatePurchase(id, body) {
  const { data } = await api.put(`/purchase/${id}`, body);
  return data;
}

export async function deletePurchase(id) {
  const { data } = await api.delete(`/purchase/${id}`);
  return data;
}

export async function getTodayOrders(params = {}) {
  const { data } = await api.get("/today-orders", { params });
  return data;
}

export async function submitTodayOrders(body) {
  const { data } = await api.post("/today-orders", body);
  return data;
}

export { api };
