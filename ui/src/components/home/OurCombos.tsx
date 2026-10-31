import { useEffect, useState } from "react";
import ProductCard from "../ui/ProductCard";
import { ProductGridSkeleton } from "../ui/Loading";
import type { Product } from "../../data/products";
import { apiRequest } from "../../lib/api";
import ScrollReveal from "../ui/ScrollReveal";

export default function OurCombos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ products: Product[] }>("/products?combos=true")
      .then(({ products: combos }) => setProducts(combos))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load combo products."))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !error && products.length === 0) return null;

  return (
    <ScrollReveal>
      <section className="mx-auto max-w-[1400px] px-4 py-6 sm:py-6 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-medium sm:text-3xl md:text-4xl">Our Combos</h2>
          <p className="mt-2 text-muted">Discover our handpicked product combos</p>
        </div>
        {loading ? <ProductGridSkeleton count={4} /> : error ? <p role="alert" className="text-center text-red-700">{error}</p> : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </ScrollReveal>
  );
}
