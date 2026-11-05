import { Router } from "express";
import { z } from "zod";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({ active: true }).select("name slug iconImage").sort({ name: 1 }).lean();
    res.json({
      categories: categories.map((category) => ({
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        iconImage: category.iconImage,
      })),
    });
  }),
);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      category: z.string().optional(),
      slug: z.string().optional(),
      excludeSlug: z.string().optional(),
      featured: z.enum(["true", "false"]).optional(),
      combos: z.enum(["true", "false"]).optional(),
      limit: z.coerce.number().int().min(1).max(1000).optional(),
    });
    const query = querySchema.parse(req.query);
    const filter: Record<string, unknown> = { active: true };
    if (query.category) {
      const category = await Category.findOne({ slug: query.category, active: true }).select("_id").lean();
      if (!category) {
        res.json({ products: [] });
        return;
      }
      filter.category = category._id;
    }
    if (query.slug) filter.slug = query.slug;
    if (query.excludeSlug) filter.slug = { $ne: query.excludeSlug };
    if (query.featured === "true") filter.featured = true;
    if (query.combos === "true") filter.showInCombos = true;

    const productQuery = Product.find(filter)
      .populate("category", "name slug")
      .sort({ featured: -1, createdAt: -1 });
    if (query.limit !== undefined) {
      productQuery.limit(query.limit);
    }
    const products = await productQuery.lean();
    res.json({
      products: products.map((product) => {
        const category = product.category as unknown as { _id: { toString(): string }; name: string; slug: string };
        const startingVariant = product.variants?.reduce(
          (lowest, variant) => variant.price < lowest.price ? variant : lowest,
        );
        return {
          id: product._id.toString(),
          slug: product.slug,
          name: product.name,
          description: product.description,
          category: category.slug,
          categoryId: category._id.toString(),
          categoryName: category.name,
          price: startingVariant?.price ?? product.price,
          compareAtPrice: startingVariant?.compareAtPrice ?? product.compareAtPrice,
          images: product.images?.length ? product.images : [product.image],
          variants: product.variants?.map((variant) => ({
            id: variant._id.toString(),
            size: variant.size,
            unit: variant.unit,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            stock: variant.stock,
          })) ?? [],
          packageSize: product.packageSize,
          packageUnit: product.packageUnit,
          image: product.image,
          stock: product.stock,
          soldOut: product.stock < 1,
          featured: product.featured,
          showInCombos: product.showInCombos,
        };
      }),
    });
  }),
);

export default router;
