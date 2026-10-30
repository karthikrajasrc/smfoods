import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, Search, User, X } from "lucide-react";
import { MdOutlineShoppingCart } from "react-icons/md";
import { navLinks, site } from "../../data/site";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../lib/api";

interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
}

const iconBtn = "grid h-10 w-10 place-items-center text-black transition hover:text-paddy";
const linkCls = ({ isActive }: { isActive: boolean }) =>
  `py-2 text-[15px] font-semibold uppercase tracking-wide transition hover:text-paddy ${isActive ? "text-paddy" : "text-black"}`;

export default function Header() {
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrame = useRef<number | null>(null);
  const { count: cartCount } = useCart();
  const { user } = useAuth();
  const [categories, setCategories] = useState<HeaderCategory[]>([]);
  const [categoryError, setCategoryError] = useState("");

  const closeMenu = useCallback(() => {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    setMenuVisible(false);
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 300;
    closeTimer.current = setTimeout(() => {
      setMenuMounted(false);
      closeTimer.current = null;
    }, duration);
  }, []);

  const openMenu = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setMenuMounted(true);
    animationFrame.current = requestAnimationFrame(() => {
      setMenuVisible(true);
      animationFrame.current = null;
    });
  }, []);

  useEffect(() => {
    if (!menuMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMenu, menuMounted]);

  useEffect(() => () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
  }, []);

  useEffect(() => {
    apiRequest<{ categories: HeaderCategory[] }>("/categories")
      .then(({ categories: result }) => setCategories(result))
      .catch((cause: unknown) => setCategoryError(cause instanceof Error ? cause.message : "Could not load categories."));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto grid h-20 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:gap-4 sm:px-4 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <div className="flex items-center gap-2">
          <button type="button" className={`${iconBtn} lg:hidden`} aria-label="Open menu" aria-controls="mobile-navigation" aria-expanded={menuMounted} onClick={openMenu}>
            <Menu />
          </button>
          <span className="hidden lg:block">
            <Link to="/" className="shrink-0" aria-label={`${site.name} home`}>
              <img src={site.logo} alt={site.name} className="h-10 w-auto sm:h-12 md:h-14" />
            </Link>
          </span>
        </div>

        <Link to="/" className="shrink-0 lg:hidden" aria-label={`${site.name} home`}>
          <img src={site.logo} alt={site.name} className="h-10 w-auto sm:h-12" />
        </Link>

        <nav className="hidden items-center gap-14 lg:flex" aria-label="Main">
          <NavLink to="/" end className={linkCls}>Home</NavLink>
          <div className="group relative">
            <NavLink to="/products" className={linkCls}>Products</NavLink>
            <ul className="invisible absolute left-1/2 top-full w-56 -translate-x-1/2 bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link to={`/products?category=${encodeURIComponent(c.slug)}`} className="block px-3 py-2 hover:bg-brand-soft hover:text-paddy">{c.name}</Link>
                </li>
              ))}
              {categoryError && <li className="px-3 py-2 text-sm text-red-700">{categoryError}</li>}
            </ul>
          </div>
          {navLinks.slice(2).map((l) => (
            <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1">
          <Link to="/account" className={`${iconBtn} hidden sm:grid`} aria-label="Account"><User size={24} /></Link>
          {user?.isAdmin && <Link to="/admin" className="hidden text-sm font-semibold text-paddy lg:block">Admin</Link>}
          <Link to="/cart" className={`${iconBtn} relative`} aria-label={`Cart, ${cartCount} items`}>
            <MdOutlineShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-amber px-1 text-xs font-bold text-white">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>

      {menuMounted && (
        <div id="mobile-navigation" className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className={`absolute inset-0 bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${menuVisible ? "opacity-100" : "opacity-0"}`}
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div className={`absolute left-0 top-0 flex h-[100dvh] w-80 max-w-[85%] flex-col gap-1 overflow-y-auto bg-white p-4 shadow-xl transition-transform duration-300 ease-in-out motion-reduce:transition-none sm:p-5 ${menuVisible ? "translate-x-0" : "-translate-x-full"}`}>
            <div className="mb-3 flex items-center justify-between">
              <img src={site.logo} alt={site.name} className="h-10 w-auto sm:h-12" />
              <button type="button" className={iconBtn} aria-label="Close menu" onClick={closeMenu}><X /></button>
            </div>
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} onClick={closeMenu} className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-brand-soft sm:py-3 sm:text-base">{l.label}</Link>
            ))}
            <Link to="/account" onClick={closeMenu} className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-brand-soft sm:py-3 sm:text-base">Account</Link>
            {user?.isAdmin && <Link to="/admin" onClick={closeMenu} className="px-3 py-2.5 text-sm font-semibold uppercase tracking-wide hover:bg-brand-soft sm:py-3 sm:text-base">Admin</Link>}
            <p className="mt-2 px-3 text-xs font-semibold text-muted sm:mt-3 sm:text-sm">Shop by category</p>
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${encodeURIComponent(c.slug)}`} onClick={closeMenu} className="px-3 py-2 text-sm hover:bg-brand-soft sm:text-base">{c.name}</Link>
            ))}
            {categoryError && <p role="alert" className="px-3 py-2 text-xs text-red-700 sm:text-sm">{categoryError}</p>}
            <Link to="/cart" onClick={closeMenu} className="mt-auto shrink-0 bg-paddy px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider text-white sm:text-base">Cart ({cartCount})</Link>
          </div>
        </div>
      )}
    </header>
  );
}
