import { connectDatabase } from "./db.js";
import { Category } from "./models/Category.js";
import { Product } from "./models/Product.js";

const categoryData = [
  { name: "Ghee", slug: "ghee" },
  { name: "Rice", slug: "rice" },
  { name: "Combos", slug: "combos" },
  { name: "Natural Jaggery", slug: "jaggery" },
  { name: "Makhana", slug: "snacks" },
];

const productData = [
  { slug: "pure-cow-ghee-1ltr", name: "Pure cow ghee", category: "ghee", price: 349, compareAtPrice: 389, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Pure%20Cow%20Ghee", stock: 100, featured: true },
  { slug: "natural-jaggery-powder", name: "Natural jaggery powder", category: "jaggery", price: 99, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Jaggery", stock: 0, featured: true },
  { slug: "combo-2", name: "Combo 2: Pure cow ghee 3L + 1 kg Koppampatti seeraga samba", category: "combos", price: 1949, compareAtPrice: 2299, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Combo%202", stock: 100, featured: true },
  { slug: "raw-makhana-200g", name: "Raw makhana 200g", category: "snacks", price: 249, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Makhana", stock: 100, featured: true },
  { slug: "vaasanai-seeraga-samba-rice", name: "Vaasanai seeraga samba rice", category: "rice", price: 239, compareAtPrice: 260, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Seeraga%20Samba", stock: 100, featured: true },
  { slug: "karuppu-kavuni-rice-black-rice", name: "Karuppu kavuni rice (Chettinad)", category: "rice", price: 196, compareAtPrice: 1120, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Karuppu%20Kavuni", stock: 100, featured: true },
  { slug: "thooyamalli-rice", name: "Thooyamalli rice", category: "rice", price: 179, compareAtPrice: 210, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Thooyamalli", stock: 100, featured: true },
  { slug: "mappillai-samba-rice", name: "Mappillai samba rice", category: "rice", price: 179, compareAtPrice: 225, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Mappillai%20Samba", stock: 100, featured: true },
  { slug: "poongar-rice", name: "Poongar rice", category: "rice", price: 209, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Poongar", stock: 100 },
  { slug: "koppampatti-seeraga-samba", name: "Koppampatti seeraga samba", category: "rice", price: 242, compareAtPrice: 265, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Koppampatti", stock: 100 },
  { slug: "combo-1", name: "Combo 1: Pure cow ghee 1L + Vaasanai seeraga samba 1 kg", category: "combos", price: 839, compareAtPrice: 950, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Combo%201", stock: 100 },
  { slug: "combo-3", name: "Combo 3: Pure ghee 10L + 1L free", category: "combos", price: 5499, image: "https://placehold.co/600x600/e4f3f1/1e3d2f?text=Combo%203", stock: 100 },
];

try {
  await connectDatabase();
  for (const category of categoryData) {
    await Category.updateOne({ slug: category.slug }, { $setOnInsert: category }, { upsert: true });
  }
  if ((await Product.countDocuments()) === 0) {
    const categories = await Category.find().lean();
    const categoryIds = new Map(categories.map((category) => [category.slug, category._id]));
    await Product.insertMany(productData.map(({ category, ...product }) => ({
      ...product,
      showInCombos: category === "combos",
      category: categoryIds.get(category),
    })));
    console.info(`Seeded ${productData.length} catalog products.`);
  } else {
    console.info("Catalog already contains products; skipped product seed.");
  }
} finally {
  const mongoose = await import("mongoose");
  await mongoose.default.disconnect();
}
