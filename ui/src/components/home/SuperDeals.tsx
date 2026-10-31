import { useEffect, useState } from "react";
import { LinkButton } from "../ui/Button";
import ProductCard from "../ui/ProductCard";
import { ProductGridSkeleton } from "../ui/Loading";
import type { Product } from "../../data/products";
import { apiRequest } from "../../lib/api";
import ScrollReveal from "../ui/ScrollReveal";

export default function SuperDeals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ products: Product[] }>("/products?featured=true")
      .then(({ products: featured }) => setProducts(featured))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load featured products."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollReveal>
      <section className="mx-auto max-w-[1400px] px-4 pb-12 pt-5 sm:pb-16 sm:pt-8 lg:px-8">
      <div className="mb-8 text-center sm:mb-10">
        <h2 className="text-2xl font-medium sm:text-3xl md:text-4xl">Super Deals</h2>
        <p className="mt-2 text-muted">Don't Miss Today's Featured Deals</p>
      </div>
      {loading ? <ProductGridSkeleton count={4} /> : error ? <p role="alert" className="text-center text-red-700">{error}</p> : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
      <div className="mt-10 text-center">
        <LinkButton to="/products" variant="dark">View all products</LinkButton>
      </div>
      </section>
    </ScrollReveal>
  );
}
