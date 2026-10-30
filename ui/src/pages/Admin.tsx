import { useCallback, useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { Navigate } from "react-router-dom";
import { ButtonLoading, LoadingState } from "../components/ui/Loading";
import ScrollReveal from "../components/ui/ScrollReveal";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../data/products";
import { apiRequest } from "../lib/api";

interface AdminCategory {
  _id: string;
  name: string;
  slug: string;
}

interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: { _id: string; name: string; slug: string };
  price: number;
  compareAtPrice?: number;
  images?: string[];
  variants?: Array<{ _id: string; size: number; unit: "kg" | "g" | "L" | "ml"; price: number; compareAtPrice?: number; stock: number }>;
  packageSize?: number;
  packageUnit?: "kg" | "g" | "L" | "ml";
  image: string;
  stock: number;
  featured: boolean;
  showInCombos: boolean;
  active: boolean;
}

interface AdminOrder {
  _id: string;
  orderNumber?: string;
  customer: { name: string; email: string; phone: string; whatsappPhone?: string; whatsappOptIn?: boolean; address: string; city: string; state: string; postalCode: string; country: string };
  items: Array<{ name: string; quantity: number; packageSize?: number; packageUnit?: "kg" | "g" | "L" | "ml" }>;
  amount: number;
  subtotal?: number;
  deliveryCharge?: number;
  status: string;
  paymentStatus: string;
  whatsappConfirmationStatus?: string;
  trackingUrl?: string;
  trackingNumber?: string;
  dispatchedAt?: string;
  createdAt: string;
}

type AdminTab = "products" | "categories" | "orders" | "delivery" | "home-banner";
type Unit = "kg" | "g" | "L" | "ml";
interface DispatchDetails { orderId: string; trackingUrl: string; trackingNumber: string }
interface PendingConfirmation {
  message: string;
  successMessage: string;
  action: () => Promise<void>;
}
interface ProductForm {
  name: string;
  description: string;
  categoryId: string;
  featured: boolean;
  showInCombos: boolean;
  active: boolean;
  images: string[];
  variants: Array<{ _id?: string; size: string; unit: Unit; price: string; compareAtPrice: string; stock: string }>;
}

const emptyProduct = (): ProductForm => ({
  name: "",
  description: "",
  categoryId: "",
  images: [],
  variants: [],
  featured: false,
  showInCombos: false,
  active: true,
});

function recordId(product: AdminProduct) {
  return product._id;
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("products");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderNameInput, setOrderNameInput] = useState("");
  const [orderFromInput, setOrderFromInput] = useState("");
  const [orderToInput, setOrderToInput] = useState("");
  const [orderFilters, setOrderFilters] = useState({ name: "", from: "", to: "" });
  const [deliveryCharges, setDeliveryCharges] = useState<Array<{ state: string; amount: string }>>([]);
  const [homeBannerImages, setHomeBannerImages] = useState<string[]>([]);
  const [homeBannerFiles, setHomeBannerFiles] = useState<File[]>([]);
  const [homeBannerPreviews, setHomeBannerPreviews] = useState<string[]>([]);
  const [homeBannerMobileImages, setHomeBannerMobileImages] = useState<string[]>([]);
  const [homeBannerMobileFiles, setHomeBannerMobileFiles] = useState<Array<File | null>>([]);
  const [homeBannerMobilePreviews, setHomeBannerMobilePreviews] = useState<Array<string | null>>([]);
  const [dispatchDetails, setDispatchDetails] = useState<DispatchDetails | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState<boolean | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError("");
    const orderQuery = new URLSearchParams({ page: String(orderPage), limit: "10" });
    if (orderFilters.name) orderQuery.set("name", orderFilters.name);
    if (orderFilters.from) orderQuery.set("from", orderFilters.from);
    if (orderFilters.to) orderQuery.set("to", orderFilters.to);
    const [categoryResult, productResult, orderResult, uploadStatus, deliveryResult, bannerResult] = await Promise.all([
      apiRequest<{ categories: AdminCategory[] }>("/admin/categories"),
      apiRequest<{ products: AdminProduct[] }>("/admin/products"),
      apiRequest<{ orders: AdminOrder[]; pages: number; total: number }>(`/admin/orders?${orderQuery}`),
      apiRequest<{ configured: boolean }>("/admin/uploads/status"),
      apiRequest<{ deliveryCharges: Array<{ state: string; amount: number }> }>("/admin/delivery-charge"),
      apiRequest<{ heroImages: string[]; heroMobileImages: string[] }>("/admin/home-banner"),
    ]);
    setCategories(categoryResult.categories);
    setProducts(productResult.products);
    setOrders(orderResult.orders);
    setOrderPages(orderResult.pages);
    setOrderTotal(orderResult.total);
    setCloudinaryConfigured(uploadStatus.configured);
    setDeliveryCharges(deliveryResult.deliveryCharges.map(({ state, amount }) => ({ state, amount: String(amount) })));
    setHomeBannerImages(bannerResult.heroImages);
    setHomeBannerMobileImages(bannerResult.heroMobileImages);
  }, [orderFilters, orderPage]);

  useEffect(() => {
    if (imageFiles.length === 0) {
      setImagePreviews([]);
      return;
    }
    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [imageFiles]);

  useEffect(() => {
    if (homeBannerFiles.length === 0) {
      setHomeBannerPreviews([]);
      return;
    }
    const previews = homeBannerFiles.map((file) => URL.createObjectURL(file));
    setHomeBannerPreviews(previews);
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [homeBannerFiles]);

  useEffect(() => {
    const previews = homeBannerMobileFiles.map((file) => file ? URL.createObjectURL(file) : null);
    setHomeBannerMobilePreviews(previews);
    return () => previews.forEach((preview) => {
      if (preview) URL.revokeObjectURL(preview);
    });
  }, [homeBannerMobileFiles]);

  useEffect(() => {
    if (user?.isAdmin) {
      void refresh()
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load admin data."))
        .finally(() => setDataLoading(false));
    }
  }, [user, refresh]);

  if (loading) return <LoadingState label="Checking administrator access…" className="min-h-[40vh]" />;
  if (!user) return <Navigate to="/account" replace />;
  if (!user.isAdmin) return <section className="mx-auto max-w-3xl px-4 py-20"><h1 className="text-3xl font-bold text-paddy">Administrator access required</h1><p className="mt-3 text-muted">This Google account is not on the administrator allowlist.</p></section>;
  if (dataLoading) return <LoadingState label="Loading your dashboard…" className="min-h-[40vh]" />;

  const bannerSlots = Array.from({ length: homeBannerImages.length + homeBannerFiles.length }, (_, index) => ({
    index,
    desktopImage: homeBannerImages[index] ?? homeBannerPreviews[index - homeBannerImages.length],
    mobileImage: homeBannerMobilePreviews[index] ?? homeBannerMobileImages[index] ?? "",
  }));

  function runAction(action: () => Promise<void>, successMessage: string, confirmationMessage: string) {
    setPendingConfirmation({ action, successMessage, message: confirmationMessage });
  }

  async function confirmAction() {
    if (!pendingConfirmation) return;
    const confirmation = pendingConfirmation;
    setPendingConfirmation(null);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await confirmation.action();
      await refresh();
      setMessage(confirmation.successMessage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (productForm.images.length + imageFiles.length > 5) {
      setError("A product can have up to 5 images total: 1 main image and 4 side thumbnails.");
      return;
    }
    if (productForm.images.length === 0 && imageFiles.length === 0) {
      setError("Add at least one product image.");
      return;
    }
    if (productForm.variants.length === 0) {
      setError("Add at least one package size variant.");
      return;
    }
    runAction(async () => {
      let images = productForm.images;
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("images", file));
        const upload = await apiRequest<{ images: Array<{ url: string }> }>("/admin/uploads/product-image", {
          method: "POST",
          body: formData,
        });
        images = [...images, ...upload.images.map((image) => image.url)];
      }
      const variants = productForm.variants.map((variant) => ({
        ...(variant._id ? { _id: variant._id } : {}),
        size: Number(variant.size),
        unit: variant.unit,
        price: Number(variant.price),
        compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
        stock: Number(variant.stock),
      }));
      const firstVariant = variants[0];
      const payload = {
        name: productForm.name,
        description: productForm.description,
        categoryId: productForm.categoryId,
        featured: productForm.featured,
        showInCombos: productForm.showInCombos,
        active: productForm.active,
        images,
        image: images[0],
        variants,
        price: firstVariant.price,
        compareAtPrice: firstVariant.compareAtPrice,
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
      };
      await apiRequest(editingProduct ? `/admin/products/${editingProduct}` : "/admin/products", {
        method: editingProduct ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setProductForm(emptyProduct());
      setImageFiles([]);
      setEditingProduct(null);
    }, editingProduct ? "Product updated." : "Product added.", editingProduct ? "Save these product changes?" : "Add this product to the storefront?");
  }

  function editProduct(product: AdminProduct) {
    setEditingProduct(recordId(product));
    setProductForm({
      name: product.name,
      description: product.description || "",
      categoryId: product.category._id,
      images: product.images?.length ? product.images : [product.image],
      variants: product.variants?.length
        ? product.variants.map((variant) => ({
          _id: variant._id,
          size: String(variant.size),
          unit: variant.unit,
          price: String(variant.price),
          compareAtPrice: variant.compareAtPrice ? String(variant.compareAtPrice) : "",
          stock: String(variant.stock),
        }))
        : product.packageSize && product.packageUnit
          ? [{ size: String(product.packageSize), unit: product.packageUnit, price: String(product.price), compareAtPrice: product.compareAtPrice ? String(product.compareAtPrice) : "", stock: String(product.stock) }]
          : [],
      featured: product.featured,
      showInCombos: product.showInCombos ?? false,
      active: product.active,
    });
    setImageFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAction(async () => {
      await apiRequest(editingCategory ? `/admin/categories/${editingCategory}` : "/admin/categories", {
        method: editingCategory ? "PATCH" : "POST",
        body: JSON.stringify({ name: categoryForm.name }),
      });
      setCategoryForm({ name: "" });
      setEditingCategory(null);
    }, editingCategory ? "Category updated." : "Category added.", editingCategory ? "Save these category changes?" : "Add this category?");
  }

  function submitDeliveryCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const configuredCharges = deliveryCharges.map(({ state, amount }) => ({ state, amount: Number(amount) }));
    runAction(async () => {
      await apiRequest<{ deliveryCharges: Array<{ state: string; amount: number }> }>("/admin/delivery-charge", {
        method: "PATCH",
        body: JSON.stringify({ deliveryCharges: configuredCharges }),
      });
    }, "Delivery charges updated for all states and union territories.", "Save delivery charges for all states and union territories?");
  }

  function submitHomeBanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (homeBannerImages.length + homeBannerFiles.length > 3) {
      setError("The home banner can have up to 3 images.");
      return;
    }
    runAction(async () => {
      let images = homeBannerImages;
      if (homeBannerFiles.length > 0) {
        const formData = new FormData();
        homeBannerFiles.forEach((file) => formData.append("images", file));
        const upload = await apiRequest<{ images: Array<{ url: string }> }>("/admin/uploads/banner-image", {
          method: "POST",
          body: formData,
        });
        images = [...images, ...upload.images.map((image) => image.url)];
      }
      const mobileImages = Array.from({ length: images.length }, (_, index) => homeBannerMobileImages[index] ?? "");
      const mobileFileSlots = homeBannerMobileFiles.flatMap((file, index) => file ? [index] : []);
      if (mobileFileSlots.length > 0) {
        const formData = new FormData();
        mobileFileSlots.forEach((index) => {
          const file = homeBannerMobileFiles[index];
          if (file) formData.append("images", file);
        });
        const upload = await apiRequest<{ images: Array<{ url: string }> }>("/admin/uploads/banner-image", {
          method: "POST",
          body: formData,
        });
        upload.images.forEach((image, uploadIndex) => {
          mobileImages[mobileFileSlots[uploadIndex]] = image.url;
        });
      }
      const saved = await apiRequest<{ heroImages: string[]; heroMobileImages: string[] }>("/admin/home-banner", {
        method: "PATCH",
        body: JSON.stringify({ heroImages: images, heroMobileImages: mobileImages }),
      });
      setHomeBannerImages(saved.heroImages);
      setHomeBannerMobileImages(saved.heroMobileImages);
      setHomeBannerFiles([]);
      setHomeBannerMobileFiles([]);
    }, "Home banner updated.", "Save these desktop and mobile banner images?");
  }

  function removeBannerSlide(index: number) {
    if (index < homeBannerImages.length) {
      setHomeBannerImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    } else {
      const newImageIndex = index - homeBannerImages.length;
      setHomeBannerFiles((current) => current.filter((_, itemIndex) => itemIndex !== newImageIndex));
    }
    setHomeBannerMobileImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setHomeBannerMobileFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateOrder(id: string, status: string, shipment?: { trackingUrl: string; trackingNumber: string }) {
    const order = orders.find((item) => item._id === id);
    const confirmationMessages: Record<string, string> = {
      shipped: "Dispatch this order with the provided tracking link and tracking ID?",
      delivered: "Mark this order as delivered?",
      cancelled: "Cancel this order? If it has been paid, a refund will be requested from Razorpay.",
      refunded: "Request a full refund for this order?",
    };
    runAction(async () => {
      await apiRequest(`/admin/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...shipment }),
      });
    }, status === "refunded" || (status === "cancelled" && order?.paymentStatus !== "created")
      ? "Refund request submitted to Razorpay."
      : status === "cancelled" ? "Order cancelled." : "Order updated.", confirmationMessages[status] ?? `Change this order to ${status}?`);
  }

  function retryWhatsAppConfirmation(id: string) {
    runAction(async () => {
      await apiRequest(`/admin/orders/${id}/whatsapp-confirmation`, { method: "POST" });
    }, "WhatsApp confirmation sent.", "Retry sending this order confirmation to the customer's opted-in WhatsApp number?");
  }

  function applyOrderFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrderPage(1);
    setOrderFilters({
      name: orderNameInput.trim(),
      from: orderFromInput,
      to: orderToInput,
    });
  }

  function clearOrderFilters() {
    setOrderNameInput("");
    setOrderFromInput("");
    setOrderToInput("");
    setOrderPage(1);
    setOrderFilters({ name: "", from: "", to: "" });
  }

  function submitDispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dispatchDetails) return;
    const { orderId, trackingUrl, trackingNumber } = dispatchDetails;
    setDispatchDetails(null);
    updateOrder(orderId, "shipped", {
      trackingUrl: trackingUrl.trim(),
      trackingNumber: trackingNumber.trim(),
    });
  }

  return (
    <ScrollReveal>
    <section className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-ghee">SM Foods</p>
          <h1 className="font-display text-4xl font-bold text-paddy">Admin dashboard</h1>
          <p className="mt-2 break-all text-muted">Signed in as {user.email}</p>
        </div>
        <button type="button" onClick={() => void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not refresh data."))} className="rounded border border-line px-4 py-2 font-semibold hover:border-paddy">Refresh</button>
      </header>

      {(error || message) && <p role={error ? "alert" : "status"} className={`mt-6 rounded p-4 ${error ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"}`}>{error || message}</p>}
      {cloudinaryConfigured === false && <p role="status" className="mt-4 rounded bg-amber-50 p-4 text-amber-900">Cloudinary is not configured. Add your Cloudinary cloud name, API key, and API secret to <code>api/.env</code>, then restart the API to enable product and banner image uploads.</p>}

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-line" aria-label="Admin sections">
        {(["products", "categories", "orders", "delivery", "home-banner"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 font-semibold capitalize ${tab === value ? "border-paddy text-paddy" : "border-transparent text-muted"}`}>{value === "home-banner" ? "Home banner" : value}</button>
        ))}
      </nav>

      {tab === "products" && (
        <div className="mt-8 space-y-8">
          <form onSubmit={submitProduct} className="rounded-lg border border-line p-5">
            <h2 className="text-xl font-semibold">{editingProduct ? "Edit product" : "Add product"}</h2>
            <div className="mt-5 grid gap-4">
              <label className="text-sm font-medium">Name<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="mt-1 w-full rounded border border-line p-2" /></label>
              <label className="text-sm font-medium">Category<select required value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })} className="mt-1 w-full rounded border border-line bg-white p-2"><option value="">Select category</option>{categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
              <div className="space-y-3 rounded border border-line p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Package sizes, prices & stock</h3><button type="button" onClick={() => setProductForm((current) => ({ ...current, variants: [...current.variants, { size: "", unit: "kg", price: "", compareAtPrice: "", stock: "0" }] }))} className="text-sm font-semibold text-paddy underline">Add size</button></div>
                {productForm.variants.length === 0 && <p className="text-sm text-muted">Add at least one size, such as 500 ml, 1 L, or 1 kg.</p>}
                {productForm.variants.map((variant, index) => (
                  <fieldset key={variant._id ?? index} className="rounded border border-line p-3">
                    <legend className="px-1 text-sm font-medium">Size option {index + 1}</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm">Size<input required type="number" min="0.01" max="10000" step="0.01" value={variant.size} onChange={(event) => setProductForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, size: event.target.value } : item) }))} className="mt-1 w-full rounded border border-line p-2" /></label>
                      <label className="text-sm">Unit<select value={variant.unit} onChange={(event) => setProductForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, unit: event.target.value as Unit } : item) }))} className="mt-1 w-full rounded border border-line bg-white p-2"><option value="kg">kg</option><option value="g">g</option><option value="L">liters (L)</option><option value="ml">ml</option></select></label>
                      <label className="text-sm">Price (₹)<input required type="number" min="1" step="1" value={variant.price} onChange={(event) => setProductForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item) }))} className="mt-1 w-full rounded border border-line p-2" /></label>
                      <label className="text-sm">Compare price<input type="number" min="1" step="1" value={variant.compareAtPrice} onChange={(event) => setProductForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, compareAtPrice: event.target.value } : item) }))} className="mt-1 w-full rounded border border-line p-2" /></label>
                      <label className="text-sm">Stock<input required type="number" min="0" step="1" value={variant.stock} onChange={(event) => setProductForm((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, stock: event.target.value } : item) }))} className="mt-1 w-full rounded border border-line p-2" /></label>
                    </div>
                    <button type="button" onClick={() => setProductForm((current) => ({ ...current, variants: current.variants.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-3 text-sm text-red-700 underline">Remove size</button>
                  </fieldset>
                ))}
                <p className="text-xs text-muted">Each size has its own price and inventory. Use unique size/unit combinations.</p>
              </div>
              <label className="text-sm font-medium">Product images
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  const remaining = Math.max(0, 5 - productForm.images.length - imageFiles.length);
                  if (files.length > remaining) {
                    setError(`Only ${remaining} more image(s) can be added. Products can have 5 images total.`);
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setImageFiles((current) => [...current, ...files]);
                  event.target.value = "";
                }} className="mt-1 block w-full rounded border border-line p-2 text-sm" />
                <span className="mt-1 block text-xs font-normal text-muted">Up to 5 images total: the first is the main image and the remaining 4 appear as side thumbnails. JPEG, PNG, or WebP; maximum 5 MB each.</span>
              </label>
              {(productForm.images.length > 0 || imagePreviews.length > 0) && <div className="flex flex-wrap gap-3">
                {productForm.images.map((image, index) => <div key={image} className="relative w-28 rounded border border-line p-2">
                  <img src={image} alt={`Product gallery image ${index + 1}`} className={`aspect-square w-full rounded bg-brand-soft object-contain p-1 ${index === 0 ? "ring-2 ring-paddy" : ""}`} />
                  <span className="mt-2 block text-center text-xs font-medium">{index === 0 ? "Main image" : `Thumbnail ${index}`}</span>
                  {index !== 0 && <button type="button" onClick={() => setProductForm((current) => ({ ...current, images: [image, ...current.images.filter((value) => value !== image)] }))} className="mt-1 block w-full text-center text-xs text-paddy underline">Make main</button>}
                  <button type="button" onClick={() => setProductForm((current) => ({ ...current, images: current.images.filter((value) => value !== image) }))} aria-label={`Remove product image ${index + 1}`} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-line bg-white text-ink shadow hover:bg-red-50 hover:text-red-700"><X size={15} /></button>
                </div>)}
                {imagePreviews.map((preview, index) => <div key={preview} className="relative w-28 rounded border border-dashed border-line p-2">
                  <img src={preview} alt={`New product image ${index + 1}`} className="aspect-square w-full rounded bg-brand-soft object-contain p-1" />
                  <span className="mt-2 block text-center text-xs font-medium">{productForm.images.length + index === 0 ? "Main image" : `Thumbnail ${productForm.images.length + index}`}</span>
                  <button type="button" onClick={() => setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove new product image ${index + 1}`} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-line bg-white text-ink shadow hover:bg-red-50 hover:text-red-700"><X size={15} /></button>
                </div>)}
              </div>}
              <label className="text-sm font-medium">Description<textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} rows={3} className="mt-1 w-full rounded border border-line p-2" /></label>
              <div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} />Feature on home page</label>
                <p className="mt-1 text-xs text-muted">When enabled, this product appears in the home page featured products section, as long as it is active in the storefront.</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.showInCombos} onChange={(e) => setProductForm({ ...productForm, showInCombos: e.target.checked })} />Show in Our Combos section</label>
                <p className="mt-1 text-xs text-muted">When enabled, this active product appears in the Our Combos section below Super Deals.</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })} />Active in storefront</label>
                <p className="mt-1 text-xs text-muted">When enabled, shoppers can see and buy this product. Turn it off to hide it without deleting it.</p>
              </div>
              <div className="flex gap-3">
                <button disabled={busy || categories.length === 0 || cloudinaryConfigured !== true} className="rounded bg-paddy px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? <ButtonLoading>Uploading and saving…</ButtonLoading> : editingProduct ? "Save changes" : "Add product"}</button>
                {editingProduct && <button type="button" onClick={() => { setEditingProduct(null); setProductForm(emptyProduct()); setImageFiles([]); }} className="rounded border border-line px-4 py-3">Cancel</button>}
              </div>
            </div>
          </form>

          <div>
          <h2 className="mb-3 text-xl font-semibold">All products ({products.length})</h2>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-brand-soft"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => (
                  <tr key={product._id} className={!product.active ? "opacity-50" : ""}>
                    <td className="p-3"><span className="font-semibold">{product.name}</span><span className="block text-xs text-muted">{product.variants?.length ? `${product.variants.length} size option${product.variants.length === 1 ? "" : "s"} · ` : ""}{product.active ? "Active" : "Hidden"}</span></td>
                    <td className="p-3">{product.category?.name ?? "—"}</td><td className="p-3">{product.variants?.length ? `From ${formatPrice(Math.min(...product.variants.map((variant) => variant.price)))}` : formatPrice(product.price)}</td><td className="p-3">{product.stock}</td>
                    <td className="p-3"><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => editProduct(product)} className="text-paddy underline disabled:opacity-50">Edit</button>{product.active && <button type="button" disabled={busy} onClick={() => runAction(async () => { await apiRequest(`/admin/products/${product._id}`, { method: "DELETE" }); }, "Product hidden from storefront.", `Hide ${product.name} from the storefront?`)} className="text-red-700 underline disabled:opacity-50">{busy ? <ButtonLoading>Working…</ButtonLoading> : "Hide"}</button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {tab === "categories" && (
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(260px,0.7fr)_1.3fr]">
          <form onSubmit={submitCategory} className="rounded-lg border border-line p-5">
            <h2 className="text-xl font-semibold">{editingCategory ? "Edit category" : "Add category"}</h2>
            <label className="mt-5 block text-sm font-medium">Name<input required minLength={2} value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="mt-1 w-full rounded border border-line p-2" /></label>
            <div className="mt-5 flex gap-3"><button disabled={busy} className="rounded bg-paddy px-5 py-3 font-semibold text-white">{busy ? <ButtonLoading>Saving…</ButtonLoading> : editingCategory ? "Save category" : "Add category"}</button>{editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setCategoryForm({ name: "" }); }} className="rounded border border-line px-4">Cancel</button>}</div>
          </form>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {categories.map((category) => <li key={category._id} className="flex items-center justify-between gap-4 p-4"><p className="font-semibold">{category.name}</p><div className="flex gap-3"><button type="button" disabled={busy} onClick={() => { setEditingCategory(category._id); setCategoryForm({ name: category.name }); }} className="text-paddy underline disabled:opacity-50">Edit</button><button type="button" disabled={busy} onClick={() => runAction(async () => { await apiRequest(`/admin/categories/${category._id}`, { method: "DELETE" }); }, "Category deleted.", `Delete the ${category.name} category?`)} className="text-red-700 underline disabled:opacity-50">{busy ? <ButtonLoading>Working…</ButtonLoading> : "Delete"}</button></div></li>)}
          </ul>
        </div>
      )}

      {tab === "delivery" && (
        <form onSubmit={submitDeliveryCharge} className="mt-8 rounded-lg border border-line p-5">
          <h2 className="text-xl font-semibold">Delivery charges by state / union territory</h2>
          <p className="mt-2 text-sm text-muted">Set delivery charges in Indian rupees. The selected state’s rate is added to each new order and saved with it.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deliveryCharges.map(({ state, amount }, index) => (
              <label key={state} className="text-sm font-medium">{state}
                <span className="mt-1 flex items-center rounded border border-line px-3 focus-within:border-paddy">
                  <span className="text-muted">₹</span>
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000000"
                    step="1"
                    value={amount}
                    onChange={(event) => setDeliveryCharges((current) => current.map((charge, chargeIndex) =>
                      chargeIndex === index ? { ...charge, amount: event.target.value } : charge,
                    ))}
                    className="w-full border-0 p-2 outline-none"
                  />
                </span>
              </label>
            ))}
          </div>
          <button type="submit" disabled={busy || deliveryCharges.length === 0} className="mt-5 rounded bg-paddy px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? <ButtonLoading>Saving…</ButtonLoading> : "Save all delivery charges"}</button>
        </form>
      )}
      {tab === "home-banner" && (
        <form onSubmit={submitHomeBanner} className="mt-8 max-w-4xl rounded-lg border border-line p-5">
          <h2 className="text-xl font-semibold">Home banner images</h2>
          <p className="mt-2 text-sm text-muted">Add up to 3 desktop slides. For each slide, you can optionally upload a separate image optimized for mobile screens. If no mobile image is set, the desktop image is used. JPEG, PNG, and WebP files up to 5 MB each are supported.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bannerSlots.map(({ index, desktopImage, mobileImage }) => (
              <article key={`banner-${index}`} className="rounded border border-line p-3">
                <img src={desktopImage} alt={`Desktop home banner ${index + 1}`} className="aspect-video w-full rounded object-cover" />
                <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">Desktop banner {index + 1}</span>
                  <button type="button" disabled={busy} onClick={() => removeBannerSlide(index)} className="text-red-700 underline disabled:opacity-50">Remove slide</button>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-sm font-semibold">Mobile image</p>
                  {mobileImage
                    ? <img src={mobileImage} alt={`Mobile home banner ${index + 1}`} className="mt-2 aspect-[3/4] max-h-56 w-full rounded object-cover" />
                    : <p className="mt-1 text-xs text-muted">Using the desktop image on mobile.</p>}
                  <label className="mt-2 block text-sm font-medium">{mobileImage ? "Replace mobile image" : "Upload mobile image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setHomeBannerMobileFiles((current) => {
                            const updated = [...current];
                            updated[index] = file;
                            return updated;
                          });
                          setError("");
                        }
                        event.target.value = "";
                      }}
                      className="mt-1 block w-full rounded border border-line p-2 text-xs"
                    />
                  </label>
                  {mobileImage && <button type="button" disabled={busy} onClick={() => {
                    setHomeBannerMobileImages((current) => current.map((image, itemIndex) => itemIndex === index ? "" : image));
                    setHomeBannerMobileFiles((current) => current.map((file, itemIndex) => itemIndex === index ? null : file));
                  }} className="mt-2 text-sm text-red-700 underline disabled:opacity-50">Use desktop image on mobile</button>}
                </div>
              </article>
            ))}
          </div>
          {homeBannerImages.length + homeBannerFiles.length < 3 && (
            <label className="mt-5 block text-sm font-medium">Add banner images
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  const remaining = Math.max(0, 3 - homeBannerImages.length - homeBannerFiles.length);
                  if (files.length > remaining) {
                    setError(`Only ${remaining} more banner image(s) can be added.`);
                    event.target.value = "";
                    return;
                  }
                  setError("");
                  setHomeBannerFiles((current) => [...current, ...files]);
                  event.target.value = "";
                }}
                className="mt-1 block w-full rounded border border-line p-2 text-sm"
              />
            </label>
          )}
          {homeBannerImages.length === 0 && homeBannerFiles.length === 0 && <p className="mt-4 text-sm text-muted">No custom images are saved. The default SM Foods banner will remain visible until images are added.</p>}
          <button type="submit" disabled={busy} className="mt-5 rounded bg-paddy px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? <ButtonLoading>Saving…</ButtonLoading> : "Save home banner"}</button>
        </form>
      )}

      {tab === "orders" && (
        <div className="mt-8 space-y-5">
          <form onSubmit={applyOrderFilters} className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end">
            <label className="text-sm font-medium">Customer name
              <input type="search" value={orderNameInput} onChange={(event) => setOrderNameInput(event.target.value)} placeholder="Search customer name" className="mt-1 w-full rounded border border-line px-3 py-2" />
            </label>
            <label className="text-sm font-medium">From date
              <input type="date" value={orderFromInput} max={orderToInput || undefined} onChange={(event) => setOrderFromInput(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2" />
            </label>
            <label className="text-sm font-medium">To date
              <input type="date" value={orderToInput} min={orderFromInput || undefined} onChange={(event) => setOrderToInput(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2" />
            </label>
            <button type="submit" className="rounded bg-paddy px-4 py-2 font-semibold text-white hover:bg-paddy-soft">Apply filters</button>
            <button type="button" onClick={clearOrderFilters} className="rounded border border-line px-4 py-2 font-semibold hover:border-paddy">Clear</button>
          </form>
          <div className="flex items-center justify-between gap-4 text-sm text-muted">
            <p>{orderTotal} total order{orderTotal === 1 ? "" : "s"}</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={orderPage <= 1} onClick={() => setOrderPage((page) => page - 1)} className="rounded border border-line px-3 py-2 disabled:opacity-40">Previous</button>
              <span>Page {orderPage} of {Math.max(orderPages, 1)}</span>
              <button type="button" disabled={orderPage >= orderPages} onClick={() => setOrderPage((page) => page + 1)} className="rounded border border-line px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
          {orders.length === 0 && <p className="rounded border border-line p-6 text-muted">No orders yet.</p>}
          {orders.map((order) => {
            const options = order.paymentStatus === "refund_pending" || ["cancelled", "refunded"].includes(order.status)
              ? []
              : order.paymentStatus === "refund_failed"
                ? ["cancelled"]
                : order.paymentStatus === "created"
                  ? order.status === "pending" ? ["cancelled"] : []
                  : order.paymentStatus === "paid"
                    ? order.status === "paid" ? ["shipped", "cancelled"]
                      : order.status === "processing" ? ["shipped", "cancelled"]
                        : order.status === "shipped" || order.status === "delivered" ? ["delivered", "cancelled"]
                          : []
                    : [];
            const actionLabels: Record<string, string> = {
              shipped: "Dispatch order",
              delivered: "Mark delivered",
              cancelled: "Cancel order",
              refunded: "Cancel order",
            };
            return (
              <article key={order._id} className="rounded-lg border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><h2 className="break-all font-semibold">Order {order.orderNumber ?? order._id}</h2><p className="mt-1 text-sm text-muted">{new Date(order.createdAt).toLocaleString()} · {order.status} · payment {order.paymentStatus}</p></div>
                  <div className="text-right"><p className="text-xl font-bold text-paddy">{formatPrice(order.amount)}</p><p className="mt-1 text-xs text-muted">Items {formatPrice(order.subtotal ?? order.amount)} · Delivery {formatPrice(order.deliveryCharge ?? 0)}</p></div>
                </div>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                  <div><p className="font-semibold">{order.customer.name}</p><p>{order.customer.email}</p><p>Phone number: {order.customer.phone}</p>{order.customer.whatsappPhone && <p className="font-semibold text-paddy">WhatsApp number: {order.customer.whatsappPhone}</p>}<p>{order.customer.address}, {order.customer.city}, {order.customer.state} {order.customer.postalCode}, {order.customer.country}</p></div>
                  <ul className="list-inside list-disc">{order.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}{item.packageSize && item.packageUnit ? ` (${item.packageSize} ${item.packageUnit})` : ""} × {item.quantity}</li>)}</ul>
                </div>
                {order.paymentStatus === "paid" && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted"><p>WhatsApp confirmation: {{
                  sent: "Accepted by WhatsApp",
                  failed: "Failed — check API configuration/logs",
                  not_configured: "Not sent — WhatsApp API is not configured",
                  not_opted_in: "Not sent — customer did not opt in",
                  sending: "Sending",
                }[order.whatsappConfirmationStatus ?? "pending"] ?? "Pending"}</p>{order.customer.whatsappOptIn && ["failed", "not_configured"].includes(order.whatsappConfirmationStatus ?? "") && <button type="button" disabled={busy} onClick={() => retryWhatsAppConfirmation(order._id)} className="font-semibold text-paddy underline underline-offset-2">Retry WhatsApp</button>}</div>}
                {order.status === "shipped" || order.status === "delivered" ? <div className="mt-4 rounded bg-brand-soft p-3 text-sm"><p className="font-semibold">Shipment details</p>{order.trackingNumber && <p className="mt-1">Tracking ID: <span className="font-semibold">{order.trackingNumber}</span></p>}{order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all font-semibold text-paddy underline underline-offset-2">{order.trackingUrl}</a>}</div> : null}
                {options.length > 0 && <label className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium">Manage order<select value="" onChange={(event) => {
                  const status = event.target.value;
                  if (status === "shipped") {
                    setDispatchDetails({ orderId: order._id, trackingUrl: "", trackingNumber: "" });
                  } else if (status === "cancelled") {
                    updateOrder(order._id, status);
                  } else if (status && status !== "cancelled") {
                    updateOrder(order._id, status);
                  }
                }} disabled={busy} className="rounded border border-line bg-white px-3 py-2"><option value="">Choose action</option>{options.map((status) => <option key={status} value={status}>{actionLabels[status] ?? status}</option>)}</select></label>}
              </article>
            );
          })}
          {dispatchDetails && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation">
              <form onSubmit={submitDispatch} role="dialog" aria-modal="true" aria-labelledby="dispatch-heading" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 id="dispatch-heading" className="text-xl font-semibold">Dispatch order</h2>
                <p className="mt-2 text-sm text-muted">Enter the tracking ID and shipment link. The customer can view both after dispatch.</p>
                <label className="mt-5 block text-sm font-medium">Tracking ID
                  <input required minLength={2} maxLength={120} autoFocus value={dispatchDetails.trackingNumber} onChange={(event) => setDispatchDetails((current) => current && ({ ...current, trackingNumber: event.target.value }))} className="mt-1 w-full rounded border border-line px-3 py-2" />
                </label>
                <label className="mt-4 block text-sm font-medium">Tracking link
                  <input required type="url" pattern="https://.*" maxLength={2048} value={dispatchDetails.trackingUrl} onChange={(event) => setDispatchDetails((current) => current && ({ ...current, trackingUrl: event.target.value }))} className="mt-1 w-full rounded border border-line px-3 py-2" placeholder="https://…" />
                </label>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" disabled={busy} onClick={() => setDispatchDetails(null)} className="rounded border border-line px-4 py-2">Cancel</button>
                  <button type="submit" disabled={busy} className="rounded bg-paddy px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? <ButtonLoading>Saving…</ButtonLoading> : "Save and dispatch"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4" role="presentation">
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-heading" aria-describedby="confirmation-message" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="confirmation-heading" className="text-xl font-semibold">Confirm action</h2>
            <p id="confirmation-message" className="mt-3 text-muted">{pendingConfirmation.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setPendingConfirmation(null)} className="rounded border border-line px-4 py-2">Go back</button>
              <button type="button" disabled={busy} onClick={() => void confirmAction()} className="rounded bg-paddy px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? <ButtonLoading>Working…</ButtonLoading> : "Confirm"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
    </ScrollReveal>
  );
}
