import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../data/products";
import { useCart } from "../context/CartContext";
import { apiRequest } from "../lib/api";
import ScrollReveal from "../components/ui/ScrollReveal";
import { ButtonLoading } from "../components/ui/Loading";

interface StateDeliveryCharge {
  state: string;
  amount: number;
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: Pick<CheckoutCustomer, "name" | "email" | "phone">;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const initialCustomer: CheckoutCustomer = {
  name: "",
  email: "",
  phone: "",
  whatsappPhone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the secure payment form."));
    document.body.appendChild(script);
  });
  if (!window.Razorpay) throw new Error("The payment form did not initialize.");
}

export default function Checkout() {
  const { items, total, clear } = useCart();
  const [customer, setCustomer] = useState(initialCustomer);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<{ id: string; number: string; email: string } | null>(null);
  const [orderProgress, setOrderProgress] = useState<{
    status: string;
    trackingUrl?: string;
    trackingNumber?: string;
    dispatchedAt?: string;
  } | null>(null);
  const [orderProgressError, setOrderProgressError] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState<StateDeliveryCharge[] | null>(null);
  const [deliveryError, setDeliveryError] = useState("");
  const selectedDeliveryCharge = deliveryCharges?.find(({ state }) => state === customer.state)?.amount ?? null;

  useEffect(() => {
    let active = true;
    apiRequest<{ deliveryCharges: StateDeliveryCharge[] }>("/settings")
      .then(({ deliveryCharges: charges }) => {
        if (active) setDeliveryCharges(charges);
      })
      .catch((cause: unknown) => {
        if (active) setDeliveryError(cause instanceof Error ? cause.message : "Could not load the delivery charge.");
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!completedOrder) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const { order } = await apiRequest<{ order: NonNullable<typeof orderProgress> }>(
          `/orders/${encodeURIComponent(completedOrder.id)}/status?email=${encodeURIComponent(completedOrder.email)}`,
        );
        if (active) {
          setOrderProgress(order);
          setOrderProgressError("");
        }
      } catch (cause) {
        if (active) setOrderProgressError(cause instanceof Error ? cause.message : "Could not refresh order status.");
      }
    };
    void refreshStatus();
    if (orderProgress && ["delivered", "cancelled", "refunded", "refund_failed"].includes(orderProgress.status)) {
      return () => { active = false; };
    }
    const interval = window.setInterval(() => void refreshStatus(), 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [completedOrder, orderProgress?.status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDeliveryCharge === null) {
      setError(deliveryError || "Select a state to calculate its delivery charge.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await loadRazorpay();
      const created = await apiRequest<{
        orderId: string;
        amount: number;
        subtotal: number;
        deliveryCharge: number;
        total: number;
        currency: string;
        razorpayOrderId: string;
        keyId: string;
      }>("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({
            productId: product.id,
            ...(product.variantId ? { variantId: product.variantId } : {}),
            quantity,
          })),
          customer: {
            ...customer,
            whatsappPhone: whatsappSameAsPhone ? customer.phone : customer.whatsappPhone,
            whatsappOptIn,
          },
        }),
      });
      if (created.subtotal !== total) {
        setError("A product price changed while you were checking out. Review your cart and try again.");
        setBusy(false);
        return;
      }
      if (created.deliveryCharge !== selectedDeliveryCharge) {
        setDeliveryCharges((current) => current?.map((charge) =>
          charge.state === customer.state ? { ...charge, amount: created.deliveryCharge } : charge,
        ) ?? null);
        setError("The delivery charge for this state was updated. Review the new total and try again.");
        setBusy(false);
        return;
      }

      const gateway = new window.Razorpay!({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        name: "SM Foods",
        description: "Order payment",
        order_id: created.razorpayOrderId,
        prefill: { name: customer.name, email: customer.email, phone: customer.phone },
        theme: { color: "#1d631f" },
        modal: { ondismiss: () => setBusy(false) },
        handler: (payment) => {
          void apiRequest<{ orderId: string; orderNumber: string; status: string }>("/orders/verify-payment", {
            method: "POST",
            body: JSON.stringify({ ...payment, orderId: created.orderId }),
          }).then(({ orderId, orderNumber }) => {
            clear();
            setCompletedOrder({ id: orderId, number: orderNumber, email: customer.email });
          }).catch((cause: unknown) => {
            setError(cause instanceof Error ? cause.message : "Payment verification failed. Contact support before retrying.");
          }).finally(() => setBusy(false));
        },
      });
      gateway.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setBusy(false);
    }
  }

  if (completedOrder) {
    const statusLabels: Record<string, string> = {
      paid: "Order placed — getting ready",
      processing: "Preparing for dispatch",
      shipped: "Dispatched",
      delivered: "Delivered",
      cancelled: "Cancelled",
      refund_pending: "Refund processing",
      refund_failed: "Refund failed — please contact support",
      refunded: "Refunded",
    };
    return (
      <ScrollReveal><section className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-paddy">Thank you for your order!</h1>
        <p className="mt-4 text-muted">Your payment was confirmed. Your order number is <strong>{completedOrder.number}</strong>.</p>
        <div className="mx-auto mt-6 max-w-lg rounded-lg bg-brand-soft p-5 text-left">
          <h2 className="text-lg font-semibold">Order status</h2>
          {orderProgress
            ? <p className="mt-2 font-medium text-paddy">{statusLabels[orderProgress.status] ?? orderProgress.status}</p>
            : <p role={orderProgressError ? "alert" : "status"} className="mt-2 text-sm text-muted">{orderProgressError || "Loading your order status…"}</p>}
          {(orderProgress?.status === "shipped" || orderProgress?.status === "delivered") && (orderProgress.trackingUrl || orderProgress.trackingNumber) && (
            <div className="mt-4 border-t border-line pt-4 text-sm">
              <p className="font-semibold">Shipment dispatched</p>
              {orderProgress.trackingNumber && <p className="mt-1">Tracking ID: <span className="font-semibold">{orderProgress.trackingNumber}</span></p>}
              {orderProgress.trackingUrl && <a href={orderProgress.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all rounded bg-white px-2 py-1 font-semibold text-paddy underline decoration-2 underline-offset-2">{orderProgress.trackingUrl}</a>}
              {orderProgress.dispatchedAt && <p className="mt-1 text-muted">Dispatched {new Date(orderProgress.dispatchedAt).toLocaleString()}</p>}
            </div>
          )}
          {orderProgress && !["delivered", "cancelled", "refunded", "refund_failed"].includes(orderProgress.status) && <p className="mt-3 text-xs text-muted">This status refreshes automatically.</p>}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/track-order" state={{ orderNumber: completedOrder.number, email: completedOrder.email }} className="inline-flex rounded border border-paddy px-6 py-3 font-semibold text-paddy">Track your order</Link>
          <Link to="/products" className="inline-flex rounded bg-paddy px-6 py-3 font-semibold text-white">Continue shopping</Link>
        </div>
      </section></ScrollReveal>
    );
  }

  if (items.length === 0) {
    return (
      <ScrollReveal><section className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-paddy">Your cart is empty</h1>
        <Link to="/products" className="mt-8 inline-flex rounded bg-paddy px-6 py-3 font-semibold text-white">Browse products</Link>
      </section></ScrollReveal>
    );
  }

  const fields: Array<{ key: Exclude<keyof CheckoutCustomer, "whatsappPhone">; label: string; autocomplete: string }> = [
    { key: "name", label: "Full name", autocomplete: "name" },
    { key: "email", label: "Email", autocomplete: "email" },
    { key: "phone", label: "Phone", autocomplete: "tel" },
    { key: "address", label: "Address", autocomplete: "street-address" },
    { key: "city", label: "City", autocomplete: "address-level2" },
    { key: "state", label: "State / region", autocomplete: "address-level1" },
    { key: "postalCode", label: "Postal code", autocomplete: "postal-code" },
    { key: "country", label: "Country", autocomplete: "country-name" },
  ];

  return (
    <ScrollReveal>
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.4fr_0.8fr]">
      <div>
        <h1 className="font-display text-4xl font-bold text-paddy">Guest checkout</h1>
        <p className="mt-2 text-muted">No account is needed to place an order.</p>
        {(error || deliveryError) && <p role="alert" className="mt-5 rounded bg-red-50 p-4 text-red-800">{error || deliveryError}</p>}
        <form id="checkout-form" onSubmit={submit} className="checkout-form mt-8 grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-md sm:grid-cols-2 sm:p-6">
          {fields.map((field) => (
            <Fragment key={field.key}>
              {field.key === "address" && (
                <div className="sm:col-start-2">
                  <label htmlFor="whatsapp-phone" className="block text-sm font-medium">WhatsApp number</label>
                  <input
                    id="whatsapp-phone"
                    required
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Enter exactly 10 digits."
                    autoComplete="tel"
                    value={whatsappSameAsPhone ? customer.phone : customer.whatsappPhone}
                    disabled={whatsappSameAsPhone}
                    onChange={(event) => setCustomer((current) => ({ ...current, whatsappPhone: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 focus:border-paddy disabled:bg-gray-100"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={whatsappSameAsPhone}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setWhatsappSameAsPhone(checked);
                        if (!checked) {
                          setCustomer((current) => ({ ...current, whatsappPhone: current.phone }));
                        }
                      }}
                      className="size-4 accent-paddy"
                    />
                    Use same phone number
                  </label>
                  <label className="mt-2 flex items-start gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={whatsappOptIn}
                      onChange={(event) => setWhatsappOptIn(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-paddy"
                    />
                    <span>I agree to receive my order confirmation and order updates on WhatsApp. This is optional.</span>
                  </label>
                </div>
              )}
              <div className={field.key === "address" ? "sm:col-span-2" : ""}>
                <label className="block text-sm font-medium">
                  <span className="mb-1 block">{field.label}</span>
                  {field.key === "state" ? (
                    <select
                      required
                      autoComplete={field.autocomplete}
                      value={customer.state}
                      disabled={!deliveryCharges}
                      onChange={(event) => setCustomer((current) => ({ ...current, state: event.target.value }))}
                      className="w-full rounded-xl border border-line bg-white px-3 py-3 focus:border-paddy disabled:bg-gray-100"
                    >
                      <option value="">Select your state / union territory</option>
                      {deliveryCharges?.map(({ state }) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  ) : (
                    <input
                      required
                      autoComplete={field.autocomplete}
                      type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"}
                      inputMode={field.key === "phone" ? "numeric" : undefined}
                      pattern={field.key === "phone" ? "[0-9]{10}" : undefined}
                      maxLength={field.key === "phone" ? 10 : undefined}
                      title={field.key === "phone" ? "Enter exactly 10 digits." : undefined}
                      value={customer[field.key]}
                      readOnly={field.key === "country"}
                      onChange={(event) => setCustomer((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="w-full rounded-xl border border-line bg-white px-3 py-3 focus:border-paddy read-only:bg-gray-100"
                    />
                  )}
                </label>
                {field.key === "phone" && <span className="mt-1 block text-xs text-muted">Enter a 10-digit mobile number without spaces or country code.</span>}
              </div>
            </Fragment>
          ))}
        </form>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-6 shadow-md lg:mt-[7rem]">
        <h2 className="text-xl font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {items.map(({ product, quantity }) => (
            <li key={`${product.id}:${product.variantId ?? "default"}`} className="flex justify-between gap-4 text-sm">
              <span className="min-w-0 break-words">{product.name}{product.packageSize && product.packageUnit ? ` (${product.packageSize} ${product.packageUnit})` : ""} × {quantity}</span><span className="shrink-0">{formatPrice(product.price * quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex justify-between border-t border-line pt-4 text-sm"><span>Subtotal</span><span>{formatPrice(total)}</span></p>
        <p className="mt-2 flex justify-between text-sm"><span>Delivery{customer.state ? ` (${customer.state})` : ""}</span><span>{selectedDeliveryCharge === null ? (deliveryError ? "Unavailable" : customer.state ? "Loading…" : "Select a state") : formatPrice(selectedDeliveryCharge)}</span></p>
        <p className="mt-3 flex justify-between border-t border-line pt-3 font-bold"><span>Total</span><span>{selectedDeliveryCharge === null ? "—" : formatPrice(total + selectedDeliveryCharge)}</span></p>
        <Link to="/cart" className="mt-5 inline-block text-sm text-paddy underline">Return to cart</Link>
        <button form="checkout-form" disabled={busy || selectedDeliveryCharge === null} type="submit" className="mt-6 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-paddy px-5 py-3 font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-paddy-soft disabled:opacity-60">
          {busy ? <span className="mx-auto"><ButtonLoading>Starting secure payment…</ButtonLoading></span> : <>
            <span>Pay {formatPrice(total + (selectedDeliveryCharge ?? 0))}</span>
            <span className="flex shrink-0 items-center -space-x-1.5" aria-label="Accepted payment methods">
              <span className="relative grid size-8 place-items-center overflow-hidden rounded-full border-2 border-paddy bg-white p-1">
                <img src="/images/payments/google-pay.png" alt="Google Pay" className="size-full object-contain" />
              </span>
              <span className="relative z-10 grid size-8 place-items-center overflow-hidden rounded-full border-2 border-paddy bg-white p-1">
                <img src="/images/payments/paytm.png" alt="Paytm" className="size-full object-contain" />
              </span>
              <span className="relative z-20 grid size-8 place-items-center overflow-hidden rounded-full border-2 border-paddy bg-white p-1">
                <img src="/images/payments/phonepe.png" alt="PhonePe" className="size-full object-contain" />
              </span>
              <span className="relative z-30 grid size-8 place-items-center overflow-hidden rounded-full border-2 border-paddy bg-white p-1">
                <img src="/images/payments/bhim.png" alt="BHIM" className="size-full object-contain" />
              </span>
            </span>
          </>}
        </button>
      </aside>
    </section>
    </ScrollReveal>
  );
}
