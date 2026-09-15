// Open Food Facts client.
//
// Barcode lookup and text search run on different infrastructure at OFF, and
// barcode is markedly more reliable — so the UI treats scanning as the primary
// path and text search as the fallback.
//
// No API key, no quota. OFF asks that clients identify themselves via
// User-Agent, but browsers forbid setting that header, so we can't from the
// client. If you ever move these calls server-side, set it there.

const UK = "https://uk.openfoodfacts.org";
const WORLD = "https://world.openfoodfacts.org";

const FIELDS = "code,product_name,brands,quantity,serving_size,serving_quantity,nutriments";

// OFF data is crowd-sourced: any field can be missing on any product.
// Anything without a usable calorie figure is dropped rather than shown as zero.
export function mapProduct(p) {
  const n = p?.nutriments || {};
  const kcal = n["energy-kcal_100g"] ?? (n["energy_100g"] != null ? n["energy_100g"] / 4.184 : null);
  if (kcal == null || !p.product_name) return null;

  const round = (v) => Math.round((v ?? 0) * 10) / 10;

  return {
    code: p.code,
    name: [p.brands?.split(",")[0]?.trim(), p.product_name].filter(Boolean).join(" ").slice(0, 60),
    quantity: p.quantity || "",
    servingG: Number(p.serving_quantity) || null,
    servingLabel: p.serving_size || "",
    per100: {
      calories: round(kcal),
      protein: round(n.proteins_100g),
      carbs: round(n.carbohydrates_100g),
      fat: round(n.fat_100g),
    },
  };
}

export const scale = (per100, grams) => ({
  calories: (per100.calories * grams) / 100,
  protein: (per100.protein * grams) / 100,
  carbs: (per100.carbs * grams) / 100,
  fat: (per100.fat * grams) / 100,
});

async function getJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`);
  return res.json();
}

export async function lookupBarcode(code) {
  const data = await getJSON(`${WORLD}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`);
  if (data.status !== 1) return { notFound: true };
  const mapped = mapProduct(data.product);
  return mapped ? { product: mapped } : { noNutrition: true };
}

// Full-text search isn't in the v2 API — the legacy cgi endpoint is still
// the only way to do it. Using the UK host filters to UK products.
export async function searchFoods(query) {
  const url =
    `${UK}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    `&search_simple=1&action=process&json=1&page_size=25&fields=${FIELDS}`;
  const data = await getJSON(url);
  return (data.products || []).map(mapProduct).filter(Boolean).slice(0, 12);
}
