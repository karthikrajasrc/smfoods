import { Check, Minus, Plus } from "lucide-react";
import { MdOutlineShoppingCart } from "react-icons/md";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ui/ProductCard";
import { ImageWithLoader, LoadingState, ProductGridSkeleton } from "../components/ui/Loading";
import { useCart } from "../context/CartContext";
import ScrollReveal from "../components/ui/ScrollReveal";
import { formatPrice, type Product } from "../data/products";
import { apiRequest } from "../lib/api";

function formatPackageSize(size: number, unit: string) {
  const formattedUnit = unit === "L" ? (size > 1 ? "LTRS" : "LTR") : unit.toUpperCase();
  return `${size} ${formattedUnit}`;
}

export default function ProductDetails() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { add, items: cartItems } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedError, setRelatedError] = useState("");
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<{ products: Product[] }>(`/products?slug=${encodeURIComponent(slug)}`)
      .then(({ products }) => {
        if (!active) return;
        const found = products[0] ?? null;
        setProduct(found);
        const availableVariant = found?.variants?.find((variant) => variant.stock > 0);
        setSelectedVariantId(availableVariant?.id ?? found?.variants?.[0]?.id ?? "");
        setSelectedImage(0);
        setQuantity(1);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load this product.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    let active = true;
    setRelatedLoading(true);
    setRelatedError("");
    apiRequest<{ products: Product[] }>(
      `/products?category=${encodeURIComponent(product.category)}&excludeSlug=${encodeURIComponent(product.slug)}&limit=4`,
    )
      .then(({ products }) => {
        if (active) setRelatedProducts(products.slice(0, 4));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setRelatedProducts([]);
        setRelatedError(cause instanceof Error ? cause.message : "Could not load related products.");
      })
      .finally(() => {
        if (active) setRelatedLoading(false);
      });
    return () => { active = false; };
  }, [product]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((variant) => variant.id === selectedVariantId),
    [product, selectedVariantId],
  );
  const images = product?.images?.length ? product.images : product ? [product.image] : [];
  const stock = selectedVariant?.stock ?? product?.stock ?? 0;
  const price = selectedVariant?.price ?? product?.price ?? 0;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product?.compareAtPrice;
  const soldOut = stock < 1;
  const addedToCart = Boolean(product && cartItems.some((item) =>
    item.product.id === product.id && item.product.variantId === selectedVariant?.id,
  ));

  function addToCart(goToCheckout: boolean) {
    if (!product || soldOut || (product.variants?.length && !selectedVariant)) return;
    add({
      ...product,
      variantId: selectedVariant?.id,
      packageSize: selectedVariant?.size ?? product.packageSize,
      packageUnit: selectedVariant?.unit ?? product.packageUnit,
      price,
      compareAtPrice,
      stock,
      soldOut: false,
    }, quantity);
    if (goToCheckout) {
      navigate("/checkout");
      return;
    }
  }

  if (loading) return <LoadingState label="Loading product…" className="min-h-[50vh]" />;
  if (error) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-center text-red-700">{error}</p>;
  if (!product) return <section className="mx-auto max-w-7xl px-4 py-20 text-center"><h1 className="text-3xl font-semibold">Product not found</h1><Link to="/products" className="mt-5 inline-block text-paddy underline">Browse all products</Link></section>;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link to="/" className="hover:text-paddy">Home</Link><span aria-hidden="true">›</span>
        <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="text-ghee hover:underline">{product.categoryName ?? product.category}</Link>
        <span aria-hidden="true">›</span><span className="truncate text-ink">{product.name}</span>
      </nav>

      <ScrollReveal>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.9fr)] lg:gap-16">
        <section aria-label="Product images" className={images.length > 1 ? "grid content-start gap-4 sm:grid-cols-[88px_minmax(0,1fr)]" : "block"}>
          {images.length > 1 && <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
            {images.map((image, index) => ({ image, index })).filter(({ index }) => index !== selectedImage).map(({ image, index }) => <button key={`${image}-${index}`} type="button" onClick={() => setSelectedImage(index)} aria-label={`View product image ${index + 1}`} aria-pressed={false} className="h-20 w-20 shrink-0 overflow-hidden border-2 border-transparent sm:h-24 sm:w-full">
              <ImageWithLoader src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>)}
          </div>}
          <div className={`aspect-square overflow-hidden bg-brand-soft ${images.length > 1 ? "order-1 sm:order-2 sm:aspect-[1.05/1]" : ""}`}>
            <ImageWithLoader src={images[selectedImage] ?? product.image} alt={product.name} className="h-full w-full object-contain" />
          </div>
        </section>

        <section className="py-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold md:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-baseline gap-3">
                {compareAtPrice && compareAtPrice > price && <s className="text-lg text-muted">{formatPrice(compareAtPrice)}</s>}
                <p className="text-2xl font-semibold text-ghee">{formatPrice(price)}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-y border-line py-6">
            {product.variants?.length ? <>
              <p className="text-xs font-semibold uppercase tracking-widest">Size</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.variants.map((variant) => <button key={variant.id} type="button" disabled={variant.stock < 1} aria-pressed={selectedVariantId === variant.id} onClick={() => { setSelectedVariantId(variant.id); setQuantity(1); }} className={`min-w-24 border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedVariantId === variant.id ? "border-ink bg-white" : "border-line hover:border-ink"}`}>
                  {formatPackageSize(variant.size, variant.unit)}
                </button>)}
              </div>
            </> : <p className="text-sm text-muted">{product.packageSize && product.packageUnit ? formatPackageSize(product.packageSize, product.packageUnit) : "Standard size"}</p>}

            <div className="mt-6 flex items-center gap-3 text-sm">
              {soldOut
                ? <span className="font-semibold text-red-700">Sold out</span>
                : stock <= 10
                  ? <span className="font-semibold text-red-600">Only {stock} left in stock</span>
                  : <span className="text-muted">In stock</span>}
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex h-14 items-center border border-line">
                <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity" className="grid h-full w-12 place-items-center disabled:opacity-40"><Minus size={16} /></button>
                <span aria-live="polite" className="min-w-10 text-center">{quantity}</span>
                <button type="button" disabled={quantity >= Math.min(stock, 50)} onClick={() => setQuantity((value) => Math.min(stock, 50, value + 1))} aria-label="Increase quantity" className="grid h-full w-12 place-items-center disabled:opacity-40"><Plus size={16} /></button>
              </div>
              <button type="button" disabled={soldOut} onClick={() => addToCart(false)} aria-live="polite" className={`flex h-10 min-h-0 flex-1 items-center justify-center gap-1.5 px-2 text-xs font-bold uppercase tracking-wide text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:px-3 sm:text-sm ${addedToCart ? "bg-paddy" : "bg-amber-500 hover:bg-amber-600"}`}>{addedToCart ? <Check size={15} /> : <MdOutlineShoppingCart size={15} />} {addedToCart ? "Added to cart" : "Add to cart"}</button>
            </div>
            <button type="button" disabled={soldOut} onClick={() => addToCart(true)} className="mt-5 min-h-14 w-full bg-black px-6 font-bold uppercase tracking-widest text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">Buy it now</button>
          </div>
        </section>
      </div>
      </ScrollReveal>
      <ScrollReveal>
      <div className="mt-10 grid items-stretch gap-8 md:mt-12 md:grid-cols-2">
        <section aria-labelledby="product-description" className="rounded border border-line bg-white p-5 md:p-8">
          <h2 id="product-description" className="text-xl font-semibold">Description</h2>
          {product.description
            ? <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
            : <p className="mt-4 text-muted">No description available.</p>}
        </section>
        <section aria-labelledby="related-products-heading" className="rounded border border-line bg-white p-5 md:p-8">
          <h2 id="related-products-heading" className="text-xl font-semibold">Related products</h2>
          {relatedLoading ? (
            <div className="mt-5"><ProductGridSkeleton count={4} /></div>
          ) : relatedError ? (
            <p role="alert" className="mt-4 text-sm text-red-700">{relatedError}</p>
          ) : relatedProducts.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct.id} product={relatedProduct} />)}
            </div>
          ) : (
            <p className="mt-4 text-muted">No related products are available in this category yet.</p>
          )}
        </section>
      </div>
      </ScrollReveal>
    </main>
  );
}
