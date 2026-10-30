import { Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { cartLineId, discountPercent, formatPrice, type Product } from "../../data/products";
import { useCart } from "../../context/CartContext";
import { ImageWithLoader } from "./Loading";

interface Props { product: Product }

export default function ProductCard({ product }: Props) {
  const { add, items } = useCart();
  const reduceMotion = useReducedMotion();
  const availableVariant = product.variants?.filter((variant) => variant.stock > 0).sort((a, b) => a.price - b.price)[0];
  const displayedProduct = availableVariant ? {
    ...product,
    variantId: availableVariant.id,
    packageSize: availableVariant.size,
    packageUnit: availableVariant.unit,
    price: availableVariant.price,
    compareAtPrice: availableVariant.compareAtPrice,
    stock: availableVariant.stock,
  } : product;
  const off = discountPercent(displayedProduct);
  const soldOut = product.variants?.length
    ? !availableVariant
    : product.soldOut || product.stock === 0;
  const addedToCart = items.some((item) => cartLineId(item.product) === cartLineId(displayedProduct));

  return (
    <motion.article
      className="group flex min-w-0 flex-col overflow-hidden rounded-md bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -48px 0px" }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative aspect-square overflow-hidden bg-brand-soft">
        <Link to={`/products/${product.slug}`} aria-label={product.name}>
          <ImageWithLoader src={product.images?.[0] ?? product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        </Link>
        {off > 0 && !product.soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-ghee px-2.5 py-1 text-xs font-bold text-ink sm:left-3 sm:top-3 sm:px-3 sm:text-sm">-{off}%</span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white sm:left-3 sm:top-3 sm:px-3 sm:text-sm">Sold out</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <h3 className="line-clamp-2 text-base font-medium leading-tight sm:text-lg sm:leading-snug">
          <Link to={`/products/${product.slug}`} className="hover:text-paddy-soft">{product.name}</Link>
        </h3>
        {product.variants?.length ? <p className="-mt-1 text-xs text-muted sm:text-sm">{product.variants.length} sizes available</p> : product.packageSize && product.packageUnit && <p className="-mt-1 text-xs text-muted sm:text-sm">{product.packageSize} {product.packageUnit}</p>}
        <div className="mt-auto">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-paddy sm:text-xl">{product.variants?.length ? "From " : ""}{formatPrice(displayedProduct.price)}</span>
            {displayedProduct.compareAtPrice && <s className="text-xs text-muted sm:text-sm">{formatPrice(displayedProduct.compareAtPrice)}</s>}
          </p>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => add(displayedProduct)}
            aria-label={addedToCart ? `${product.name} added to cart` : `Add ${product.name} to cart`}
            aria-live="polite"
            className={`mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-lg px-1 py-0 text-xs font-bold text-white transition-colors focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2 sm:text-sm ${addedToCart ? "bg-paddy" : "bg-ghee hover:bg-amber-600"}`}
          >
            {soldOut ? "Sold out" : addedToCart ? <><Check size={14} aria-hidden="true" /> Added to cart</> : "Add to cart"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
