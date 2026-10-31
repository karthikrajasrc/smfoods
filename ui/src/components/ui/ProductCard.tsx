import { Check, Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cartLineId, discountPercent, formatPrice, type Product } from "../../data/products";
import { useCart } from "../../context/CartContext";
import { ImageWithLoader } from "./Loading";

interface Props { product: Product }

export default function ProductCard({ product }: Props) {
  const { add, items, setQuantity } = useCart();
  const reduceMotion = useReducedMotion();
  const availableVariants = product.variants?.filter((variant) => variant.stock > 0) ?? [];
  const initialVariant = [...availableVariants].sort((a, b) => a.price - b.price)[0];
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id);
  const selectedVariant = availableVariants.find((variant) => variant.id === selectedVariantId) ?? initialVariant;
  const displayedProduct = selectedVariant ? {
    ...product,
    variantId: selectedVariant.id,
    packageSize: selectedVariant.size,
    packageUnit: selectedVariant.unit,
    price: selectedVariant.price,
    compareAtPrice: selectedVariant.compareAtPrice,
    stock: selectedVariant.stock,
  } : product;
  const off = discountPercent(displayedProduct);
  const soldOut = product.variants?.length
    ? !selectedVariant
    : product.soldOut || product.stock === 0;
  const lineId = cartLineId(displayedProduct);
  const cartItem = items.find((item) => cartLineId(item.product) === lineId);
  const quantity = cartItem?.quantity ?? 0;
  const maxQuantity = Math.min(50, displayedProduct.stock ?? 50);

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
        {product.variants?.length ? (
          <div className="-mt-1 flex flex-wrap gap-1.5" role="group" aria-label={`Choose a size for ${product.name}`}>
            {product.variants.map((variant) => {
              const isSelected = variant.id === selectedVariant?.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={variant.stock < 1}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 sm:px-2.5 sm:text-xs ${isSelected ? "border-paddy bg-paddy text-white" : "border-line bg-white text-ink hover:border-paddy"}`}
                >
                  {variant.size} {variant.unit}
                </button>
              );
            })}
          </div>
        ) : product.packageSize && product.packageUnit && <p className="-mt-1 text-xs text-muted sm:text-sm">{product.packageSize} {product.packageUnit}</p>}
        <div className="mt-auto">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-bold text-paddy sm:text-xl">{formatPrice(displayedProduct.price)}</span>
            {displayedProduct.compareAtPrice && <s className="text-xs text-muted sm:text-sm">{formatPrice(displayedProduct.compareAtPrice)}</s>}
          </p>
          {quantity > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <span aria-live="polite" className="inline-flex h-9 min-w-0 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-paddy px-2 text-[11px] font-bold leading-none text-white sm:flex-1 sm:px-3 sm:text-sm">
                <Check size={12} aria-hidden="true" />
                Added
              </span>
              <div className="flex h-9 shrink-0 items-center rounded-lg border border-line bg-white sm:min-w-0 sm:flex-1 sm:justify-between sm:px-2">
                <button
                  type="button"
                  onClick={() => setQuantity(lineId, quantity - 1)}
                  aria-label={`Decrease ${product.name} ${displayedProduct.packageSize ?? ""} ${displayedProduct.packageUnit ?? ""} quantity`}
                  className="grid h-full w-7 place-items-center text-ink hover:bg-brand-soft sm:w-auto sm:flex-1"
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span aria-label={`Quantity: ${quantity}`} className="min-w-5 text-center text-xs font-semibold sm:min-w-6 sm:text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => add(displayedProduct)}
                  disabled={quantity >= maxQuantity}
                  aria-label={`Increase ${product.name} ${displayedProduct.packageSize ?? ""} ${displayedProduct.packageUnit ?? ""} quantity`}
                  className="grid h-full w-7 place-items-center text-ink hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:flex-1"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={soldOut}
              onClick={() => add(displayedProduct)}
              aria-label={soldOut ? `${product.name} sold out` : `Add ${product.name} to cart`}
              className="mt-3 flex h-8 w-full items-center justify-center rounded-lg bg-ghee px-1 py-0 text-xs font-bold text-white transition-colors hover:bg-amber-600 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2 sm:text-sm"
            >
              {soldOut ? "Sold out" : "Add to cart"}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
