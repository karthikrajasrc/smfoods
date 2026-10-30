import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import { ProductGridSkeleton } from "../components/ui/Loading";
import ScrollReveal from "../components/ui/ScrollReveal";
import type { Product } from "../data/products";
import { apiRequest } from "../lib/api";

type Sort = "featured" | "price-asc" | "price-desc";
interface CatalogCategory { id: string; name: string; slug: string }

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<Sort>("featured");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const active = params.get("category") ?? "all";

  useEffect(() => {
    let activeRequest = true;
    setLoading(true);
    setError("");
    Promise.all([
      apiRequest<{ products: Product[] }>(active === "all" ? "/products" : `/products?category=${encodeURIComponent(active)}`),
      apiRequest<{ categories: CatalogCategory[] }>("/categories"),
    ])
      .then(([productResult, categoryResult]) => {
        if (!activeRequest) return;
        setProducts(productResult.products);
        setCategories(categoryResult.categories);
      })
      .catch((cause: unknown) => {
        if (activeRequest) setError(cause instanceof Error ? cause.message : "Could not load products.");
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => { activeRequest = false; };
  }, [active]);

  const chips = [{ label: "All", key: "all" }, ...categories.map((category) => ({ label: category.name, key: category.slug }))];
  const list = useMemo(() => {
    if (sort === "price-asc") return [...products].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...products].sort((a, b) => b.price - a.price);
    return products;
  }, [products, sort]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <ScrollReveal>
        <h1 className="text-3xl font-bold text-paddy sm:text-4xl">Products</h1>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                aria-pressed={active === c.key}
                onClick={() => (c.key === "all" ? setParams({}) : setParams({ category: c.key }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${active === c.key ? "border-paddy bg-paddy text-white" : "border-line bg-white hover:border-paddy"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="flex max-w-full items-center gap-2 text-xs sm:text-sm">
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="max-w-[65vw] rounded-full border border-line bg-white px-3 py-1.5 sm:max-w-none sm:px-4 sm:py-2">
              <option value="featured">Featured</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>
        </div>
      </ScrollReveal>

      {loading ? (
        <div className="mt-8"><ProductGridSkeleton /></div>
      ) : error ? (
        <p role="alert" className="mt-16 text-center text-red-700">{error}</p>
      ) : list.length === 0 ? (
        <p className="mt-16 text-center text-muted">{active === "all" ? "No products are available right now." : "No products in this category yet. Try another one."}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {list.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
