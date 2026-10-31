import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartLineId, formatPrice } from "../data/products";
import { useCart } from "../context/CartContext";
import ScrollReveal from "../components/ui/ScrollReveal";

export default function Cart() {
  const { items, total, setQuantity, remove } = useCart();

  return (
    <ScrollReveal>
      <section className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-paddy">Your cart</h1>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted">Your cart is empty.</p>
          <Link to="/products" className="mt-6 inline-flex rounded bg-paddy px-6 py-3 font-semibold text-white hover:bg-paddy-soft">Browse products</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white px-4 shadow-sm sm:px-6">
            {items.map(({ product, quantity }) => {
              const compareAtPrice = product.compareAtPrice ?? product.price;
              const hasDiscount = compareAtPrice > product.price;
              const discount = hasDiscount
                ? Math.round(((compareAtPrice - product.price) / compareAtPrice) * 100)
                : 0;
              return (
              <article key={cartLineId(product)} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 py-4 sm:flex sm:items-center sm:gap-4 sm:py-5">
                <img src={product.images?.[0] ?? product.image} alt="" className="row-span-1 h-16 w-16 rounded bg-brand-soft object-cover sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product.slug}`} className="font-semibold hover:text-paddy">{product.name}</Link>
                  {product.packageSize && product.packageUnit && <p className="text-sm text-muted">{product.packageSize} {product.packageUnit}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm sm:hidden">
                    {hasDiscount && <s className="text-xs text-muted">{formatPrice(compareAtPrice * quantity)}</s>}
                    <span className="font-semibold text-ink">{formatPrice(product.price * quantity)}</span>
                    {hasDiscount && <>
                      <span className="text-xs font-medium text-paddy">Save {formatPrice((compareAtPrice - product.price) * quantity)}</span>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-paddy">{discount}% off</span>
                    </>}
                  </div>
                  <div className="mt-1 hidden flex-wrap items-center gap-x-2 gap-y-1 text-sm sm:flex">
                    <span className="font-semibold text-ink">{formatPrice(product.price)} each</span>
                    {hasDiscount && (
                      <>
                        <s className="text-muted">{formatPrice(compareAtPrice)} each</s>
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-paddy">{discount}% off</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2 sm:contents">
                  <div className="flex w-fit items-center rounded border border-line">
                    <button
                      type="button"
                      onClick={() => setQuantity(cartLineId(product), quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label={`Decrease quantity of ${product.name}`}
                      className="rounded-l p-2 text-muted hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>
                    <span aria-label={`Quantity: ${quantity}`} className="min-w-8 text-center">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(cartLineId(product), quantity + 1)}
                      disabled={quantity >= 50}
                      aria-label={`Increase quantity of ${product.name}`}
                      className="rounded-r p-2 text-muted hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="hidden w-28 shrink-0 text-right sm:block">
                  {hasDiscount && (
                    <s className="block text-xs text-muted">{formatPrice(compareAtPrice * quantity)}</s>
                  )}
                  <p className="font-semibold">{formatPrice(product.price * quantity)}</p>
                  {hasDiscount && (
                    <p className="text-xs font-medium text-paddy">Save {formatPrice((compareAtPrice - product.price) * quantity)}</p>
                  )}
                  </div>
                  <button type="button" onClick={() => remove(cartLineId(product))} aria-label={`Remove ${product.name}`} className="rounded p-2 text-muted hover:bg-red-50 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
            })}
          </div>
          <div className="ml-auto mt-8 max-w-sm rounded-2xl border border-line bg-white p-5 shadow-sm">
            <p className="flex justify-between text-lg font-semibold"><span>Subtotal</span><span>{formatPrice(total)}</span></p>
            <p className="mt-2 text-sm text-muted">Delivery charge is calculated based on your state at checkout.</p>
            <Link to="/checkout" className="mt-6 block rounded bg-paddy px-6 py-3 text-center font-semibold uppercase tracking-wide text-white hover:bg-paddy-soft">Continue to checkout</Link>
          </div>
        </>
      )}
      </section>
    </ScrollReveal>
  );
}
