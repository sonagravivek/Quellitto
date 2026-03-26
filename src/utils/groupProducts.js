/**
 * Catalog group की stable key (Purchase / Today order dropdown value).
 */
export function catalogGroupKeyString(g) {
  if (!g?.skus?.length) return "";
  return g.skus
    .map((s) => s.id)
    .sort((a, b) => a - b)
    .join("-");
}

/**
 * Same DB rows (one per SKU) को एक catalog "product" लाइन में जोड़ता है —
 * जो एक साथ add हुए हों (same name, category, supplier, prices, date).
 */
export function groupProductsForTable(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];

  const catalogKey = (p) =>
    [
      String(p.productName ?? "").trim(),
      String(p.category ?? "").trim(),
      String(p.supplierName ?? "").trim(),
      String(Number(p.purchasePrice)),
      String(Number(p.sellingPrice)),
      String(p.purchaseDate ?? "").slice(0, 10),
    ].join("\t");

  const m = new Map();
  for (const p of rows) {
    const k = catalogKey(p);
    if (!m.has(k)) {
      m.set(k, {
        productName: p.productName,
        category: p.category,
        supplierName: p.supplierName,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        purchaseDate: p.purchaseDate,
        notes: p.notes,
        skus: [],
      });
    }
    m.get(k).skus.push({
      id: p.id,
      skuCode: p.skuCode,
      quantityInStock: p.quantityInStock,
      quantityPurchased: p.quantityPurchased,
      statementTotal: p.statementTotal ?? 0,
    });
  }

  return [...m.values()]
    .map((g) => ({
      ...g,
      /** Shared pool: हर SKU पर वही कुल stock; यहाँ कुल physical qty (sum नहीं) */
      totalStock: g.skus.length
        ? Math.max(...g.skus.map((s) => Number(s.quantityInStock || 0)))
        : 0,
    }))
    .sort((a, b) => String(a.productName).localeCompare(String(b.productName)));
}
