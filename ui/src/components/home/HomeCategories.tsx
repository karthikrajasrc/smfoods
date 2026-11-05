import { useEffect, useState } from "react";
import { Candy, Leaf, PackageCheck, ShoppingBag, Wheat } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const categoryOrder = ["ghee", "rice", "jaggery", "snacks"];
const categoryIcons = {
  rice: Wheat,
  jaggery: Candy,
  snacks: PackageCheck,
};

function GheeSpoonIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 54" fill="none" aria-hidden="true" className={className}>
      <path d="M18 22C25 17 34 9 40 4c2-2 5-1 6 1s1 5-2 7c-6 6-16 13-23 17l-5-7Z" fill="#f5a044" stroke="#fff4dd" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 19c6 3 9 9 6 15-2 6-9 9-15 7-6-2-9-8-7-14 2-6 9-10 16-8Z" fill="#e88f32" stroke="#fff4dd" strokeWidth="1.5" />
      <path d="M16 21c5 3 7 8 5 13-2 4-7 7-12 5-4-1-6-6-4-10 1-5 6-9 11-8Z" fill="#ffdf4f" />
      <path d="M8 34c3 0 6 0 9-1l1 7c0 5 3 9 1 12-2 3-7 2-9-1-3-4-1-9-2-13v-4Z" fill="#ffdf4f" />
      <path d="M16 38c2 6 3 10 1 13" stroke="#fff1a0" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PickleJarIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M8.5 3h7v2h-7zM9 5v2l-2.5 2.5v9A2.5 2.5 0 0 0 9 21h6a2.5 2.5 0 0 0 2.5-2.5v-9L15 7V5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 10h10M9.5 12.5l1.2 1.2-1.2 1.3m4-2.5 1.2 1.2-1.2 1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getTopCategories(categories: Category[]) {
  return [...categories]
    .sort((a, b) => {
      const aPriority = categoryOrder.indexOf(a.slug);
      const bPriority = categoryOrder.indexOf(b.slug);
      return (aPriority === -1 ? categoryOrder.length : aPriority) -
        (bPriority === -1 ? categoryOrder.length : bPriority) ||
        a.name.localeCompare(b.name);
    })
    .slice(0, 3);
}

export default function HomeCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<{ categories: Category[] }>("/categories")
      .then(({ categories: result }) => {
        if (active) {
          setCategories(getTopCategories(result));
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not load product categories.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const shortcuts = [
    { label: "Shop all", to: "/products", Icon: ShoppingBag, slug: "all" },
    { label: "Our combos", to: "/products?category=our-combos", Icon: PackageCheck, slug: "combos" },
    ...categories.map((category) => ({
      label: category.name,
      to: `/products?category=${encodeURIComponent(category.slug)}`,
      Icon: categoryIcons[category.slug as keyof typeof categoryIcons] ?? Leaf,
      slug: category.slug,
    })),
  ];

  return (
    <nav aria-label="Shop by collection" aria-busy={loading} className="relative z-10 mx-auto mt-3 max-w-[1400px] px-2 pb-1 pt-2 sm:mt-4 sm:px-6 sm:pb-3 sm:pt-3 lg:px-8">
      <div className="flex items-start justify-between gap-1 overflow-x-auto px-1 pb-1 sm:justify-center sm:gap-8 md:gap-12">
        {shortcuts.map(({ label, to, Icon, slug }) => (
          <Link
            key={label}
            to={to}
            className="group flex w-[62px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-24 sm:gap-2"
          >
            <span className="relative grid size-11 place-items-center rounded-full bg-ghee text-white shadow-sm ring-1 ring-black/5 transition duration-200 group-hover:scale-105 group-hover:shadow-md sm:size-[68px]">
              {slug === "ghee"
                ? <GheeSpoonIcon className="size-7 sm:size-9" />
                : slug === "pickles"
                  ? <PickleJarIcon className="size-5 sm:size-[29px]" />
                  : <>
                      <Icon size={20} strokeWidth={1.8} aria-hidden="true" className="sm:hidden" />
                      <Icon size={29} strokeWidth={1.8} aria-hidden="true" className="hidden sm:block" />
                    </>}
            </span>
            <span className="text-[11px] font-medium leading-tight text-ink transition group-hover:text-ghee sm:text-sm">
              {label}
            </span>
          </Link>
        ))}
        {loading && Array.from({ length: 3 }, (_, index) => (
          <div key={index} aria-hidden="true" className="flex w-[62px] shrink-0 flex-col items-center gap-1.5 sm:w-24 sm:gap-2">
            <span className="size-11 animate-pulse rounded-full bg-brand-soft sm:size-[68px]" />
            <span className="h-3 w-10 animate-pulse rounded bg-brand-soft sm:w-16" />
          </div>
        ))}
      </div>
      {error && <p role="status" className="mt-2 text-center text-xs text-muted">{error}</p>}
    </nav>
  );
}
