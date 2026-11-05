import { ArrowRight } from "lucide-react";
import { MdOutlineShoppingCart } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { brandWhatsAppHref, useBrandContact } from "../../context/BrandContactContext";
import { WhatsAppIcon } from "../ui/Icons";

export default function FloatingActions() {
  const { items } = useCart();
  const productCount = items.length;
  const { pathname } = useLocation();
  const { brandContact } = useBrandContact();
  const showCartBar = productCount > 0 && pathname !== "/cart" && pathname !== "/checkout";

  return (
    <>
      {showCartBar && (
        <Link
          to="/cart"
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex min-h-16 max-w-xl items-center justify-between gap-3 rounded-full bg-paddy px-5 py-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition hover:bg-paddy-soft focus-visible:outline-offset-4 md:bottom-5 md:rounded-2xl"
          aria-label={`${productCount} ${productCount === 1 ? "product" : "products"} in cart. View cart.`}
          aria-live="polite"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">
              <MdOutlineShoppingCart size={20} className="text-paddy" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{productCount} {productCount === 1 ? "product" : "products"} added to cart</span>
              <span className="block text-xs text-white/85">View cart</span>
            </span>
          </span>
          <ArrowRight size={22} className="shrink-0" aria-hidden="true" />
        </Link>
      )}
      <a
        href={brandWhatsAppHref(brandContact.phone)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with SM Foods on WhatsApp"
        className={`fixed right-5 z-40 grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_4px_18px_rgba(0,0,0,0.25)] transition hover:scale-105 hover:bg-[#1fbd5b] focus-visible:outline-offset-4 ${showCartBar ? "bottom-24 md:bottom-5" : "bottom-5"}`}
      >
        <WhatsAppIcon size={30} />
      </a>
    </>
  );
}
