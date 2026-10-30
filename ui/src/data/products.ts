export type Category = string;
export type PackageUnit = "kg" | "g" | "L" | "ml";

export interface ProductVariant {
  id: string;
  size: number;
  unit: PackageUnit;
  price: number;
  compareAtPrice?: number;
  stock: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  categoryName?: string;
  price: number;
  compareAtPrice?: number;
  images?: string[];
  variants?: ProductVariant[];
  variantId?: string;
  packageSize?: number;
  packageUnit?: "kg" | "g" | "L" | "ml";
  image: string;
  soldOut?: boolean;
  stock?: number;
  description?: string;
  featured?: boolean;
}

const img = (label: string) =>
  `https://placehold.co/600x600/e4f3f1/1e3d2f?text=${encodeURIComponent(label)}`;

// TODO: replace image with the real product images
export const products: Product[] = [
  { id: "1", slug: "pure-cow-ghee-1ltr", name: "Pure cow ghee", category: "ghee", price: 349, compareAtPrice: 389, image: img("Pure Cow Ghee") },
  { id: "2", slug: "natural-jaggery-powder", name: "Natural jaggery powder", category: "jaggery", price: 99, image: img("Jaggery"), soldOut: true },
  { id: "3", slug: "combo-2", name: "Combo 2: Pure cow ghee 3L + 1 kg Koppampatti seeraga samba", category: "combos", price: 1949, compareAtPrice: 2299, image: img("Combo 2") },
  { id: "4", slug: "raw-makhana-200g", name: "Raw makhana 200g", category: "snacks", price: 249, image: img("Makhana") },
  { id: "5", slug: "vaasanai-seeraga-samba-rice", name: "Vaasanai seeraga samba rice", category: "rice", price: 239, compareAtPrice: 260, image: img("Seeraga Samba") },
  { id: "6", slug: "karuppu-kavuni-rice-black-rice", name: "Karuppu kavuni rice (Chettinad)", category: "rice", price: 196, compareAtPrice: 1120, image: img("Karuppu Kavuni") },
  { id: "7", slug: "thooyamalli-rice", name: "Thooyamalli rice", category: "rice", price: 179, compareAtPrice: 210, image: img("Thooyamalli") },
  { id: "8", slug: "mappillai-samba-rice", name: "Mappillai samba rice", category: "rice", price: 179, compareAtPrice: 225, image: img("Mappillai Samba") },
  { id: "9", slug: "poongar-rice", name: "Poongar rice", category: "rice", price: 209, image: img("Poongar") },
  { id: "10", slug: "koppampatti-seeraga-samba", name: "Koppampatti seeraga samba", category: "rice", price: 242, compareAtPrice: 265, image: img("Koppampatti") },
  { id: "11", slug: "combo-1", name: "Combo 1: Pure cow ghee 1L + Vaasanai seeraga samba 1 kg", category: "combos", price: 839, compareAtPrice: 950, image: img("Combo 1") },
  { id: "12", slug: "combo-3", name: "Combo 3: Pure ghee 10L + 1L free", category: "combos", price: 5499, image: img("Combo 3") },
];

export const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const discountPercent = (p: Product) =>
  p.compareAtPrice ? Math.round(((p.compareAtPrice - p.price) / p.compareAtPrice) * 100) : 0;

export function cartLineId(product: Product) {
  return `${product.id}:${product.variantId ?? "default"}`;
}
