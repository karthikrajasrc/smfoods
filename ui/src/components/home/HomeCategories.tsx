import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  iconImage?: string;
}

const categoryOrder = ["ghee", "rice", "jaggery", "snacks"];

function sortCategories(categories: Category[]) {
  return [...categories]
    .sort((a, b) => {
      const aPriority = categoryOrder.indexOf(a.slug);
      const bPriority = categoryOrder.indexOf(b.slug);
      return (aPriority === -1 ? categoryOrder.length : aPriority) -
        (bPriority === -1 ? categoryOrder.length : bPriority) ||
        a.name.localeCompare(b.name);
    });
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
          setCategories(sortCategories(result));
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

  return (
    <nav aria-label="Shop by collection" aria-busy={loading} className="relative z-10 mx-auto mt-3 max-w-[1400px] px-2 pb-1 pt-2 sm:mt-4 sm:px-6 sm:pb-3 sm:pt-3 lg:px-8">
      <div className="flex items-start justify-between gap-1 overflow-x-auto px-1 pb-1 sm:justify-center sm:gap-8 md:gap-12">
        {categories.map(({ id, name, slug, iconImage }) => (
          <Link
            key={id}
            to={`/products?category=${encodeURIComponent(slug)}`}
            className="group flex w-[62px] shrink-0 flex-col items-center gap-1.5 text-center sm:w-24 sm:gap-2"
          >
            <span className="relative grid size-11 place-items-center overflow-hidden rounded-full bg-ghee text-white shadow-sm ring-1 ring-black/5 transition duration-200 group-hover:scale-105 group-hover:shadow-md sm:size-[68px]">
              {iconImage
                ? <img src={iconImage} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
                : <span aria-hidden="true" className="text-lg font-semibold sm:text-2xl">{name.charAt(0).toUpperCase()}</span>}
            </span>
            <span className="text-[11px] font-medium leading-tight text-ink transition group-hover:text-ghee sm:text-sm">
              {name}
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
