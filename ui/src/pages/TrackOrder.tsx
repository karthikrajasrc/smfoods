import { useEffect, useState, type FormEvent } from "react";
import { PackageSearch, Phone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiRequest } from "../lib/api";
import ScrollReveal from "../components/ui/ScrollReveal";
import { formatPrice } from "../data/products";

interface TrackedOrder {
  _id?: string;
  orderNumber?: string;
  status: string;
  amount: number;
  currency: string;
  trackingUrl?: string;
  trackingNumber?: string;
  dispatchedAt?: string;
  createdAt: string;
  items?: Array<{ name: string; quantity: number; packageSize?: number; packageUnit?: string }>;
}

interface TrackingLookup {
  method: "order" | "phone";
  value: string;
  email?: string;
  refresh: number;
}

interface CheckoutTrackingPrefill {
  orderNumber: string;
  email: string;
}

const statusLabels: Record<string, string> = {
  pending: "Payment pending",
  paid: "Order placed — getting ready",
  processing: "Preparing for dispatch",
  shipped: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refund_pending: "Refund processing",
  refund_failed: "Refund failed — please contact support",
  refunded: "Refunded",
};

const completedStatuses = new Set(["delivered", "cancelled", "refunded", "refund_failed"]);

export default function TrackOrder() {
  const location = useLocation();
  const initial = location.state as CheckoutTrackingPrefill | null;
  const [method, setMethod] = useState<"order" | "phone">("order");
  const [orderNumber, setOrderNumber] = useState(initial?.orderNumber ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState("");
  const [lookup, setLookup] = useState<TrackingLookup | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lookup) return;
    let active = true;
    const refresh = async () => {
      try {
        if (lookup.method === "phone") {
          const result = await apiRequest<{ orders: TrackedOrder[] }>(
            `/orders/track/phone?phone=${encodeURIComponent(lookup.value)}`,
          );
          if (active) setOrders(result.orders);
        } else {
          const result = await apiRequest<{ order: TrackedOrder }>(
            `/orders/track?orderNumber=${encodeURIComponent(lookup.value)}&email=${encodeURIComponent(lookup.email ?? "")}`,
          );
          if (active) setOrders([result.order]);
        }
        if (active) setError("");
      } catch (cause) {
        if (active) {
          setOrders([]);
          setError(cause instanceof Error ? cause.message : "Could not load matching orders.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();

    const shouldPoll = lookup.method === "phone" || !orders.some((order) => completedStatuses.has(order.status));
    if (!shouldPoll) return () => { active = false; };

    const interval = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [lookup, orders[0]?.status]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOrders([]);
    setLoading(true);
    setLookup((current) => method === "order"
      ? { method, value: orderNumber.trim().toUpperCase(), email: email.trim().toLowerCase(), refresh: (current?.refresh ?? 0) + 1 }
      : { method, value: phone, refresh: (current?.refresh ?? 0) + 1 });
  }

  function refreshOrders() {
    setLoading(true);
    setError("");
    setLookup((current) => current ? { ...current, refresh: current.refresh + 1 } : current);
  }

  function changeMethod(nextMethod: "order" | "phone") {
    setMethod(nextMethod);
    setLookup(null);
    setOrders([]);
    setError("");
    setLoading(false);
  }

  return (
    <ScrollReveal>
    <section className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-bold text-paddy">Track your order</h1>
      <p className="mt-2 text-muted">Look up an order by its order number or list your active orders using your checkout phone number.</p>

      <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-white/70 p-1.5 shadow-sm" role="tablist" aria-label="Order lookup method">
        <button type="button" role="tab" aria-selected={method === "order"} onClick={() => changeMethod("order")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors sm:text-base ${method === "order" ? "bg-paddy text-white shadow-sm" : "text-muted hover:bg-brand-soft"}`}><PackageSearch size={18} aria-hidden="true" />Order number</button>
        <button type="button" role="tab" aria-selected={method === "phone"} onClick={() => changeMethod("phone")} className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-colors sm:text-base ${method === "phone" ? "bg-paddy text-white shadow-sm" : "text-muted hover:bg-brand-soft"}`}><Phone size={18} aria-hidden="true" />Phone number</button>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-md sm:p-6">
        {method === "order" ? (
          <>
            <label className="text-sm font-medium">Order number
              <input required pattern="SM-[0-9]{2}-(?:[A-Za-z0-9]{4}|[0-9]{5,})" placeholder="SM-26-1000" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 uppercase shadow-sm focus:border-paddy" />
            </label>
            <label className="text-sm font-medium">Email used at checkout
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 shadow-sm focus:border-paddy" />
            </label>
          </>
        ) : (
          <label className="text-sm font-medium">Phone number used at checkout
            <input required type="tel" inputMode="tel" maxLength={24} value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 shadow-sm focus:border-paddy" />
            <span className="mt-1 block text-xs font-normal text-muted">Enter it exactly as provided when placing the order, including country code and spacing.</span>
          </label>
        )}
        <button type="submit" disabled={loading} className="rounded-xl bg-paddy px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-paddy-soft disabled:opacity-60">{loading ? "Looking up orders…" : method === "order" ? "Track order" : "Find my orders"}</button>
      </form>

      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
      {lookup?.method === "phone" && !loading && !error && orders.length === 0 && <p role="status" className="mt-5 rounded-xl border border-line bg-white p-4 text-muted shadow-sm">No active orders were found for that exact phone number.</p>}

      {orders.length > 0 && (
        <div className="mt-6 space-y-4">
          {lookup?.method === "phone" && <h2 className="text-xl font-semibold">Your active orders ({orders.length})</h2>}
          {orders.map((order) => (
            <article key={order.orderNumber ?? order._id ?? order.createdAt} className="rounded-lg bg-brand-soft p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="break-all text-lg font-semibold">Order {order.orderNumber ?? order._id}</h2>
                  <p className="mt-1 text-sm text-muted">Placed {new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <p className="font-semibold">{formatPrice(order.amount)}</p>
              </div>
              <p className="mt-4 font-semibold text-paddy">{statusLabels[order.status] ?? order.status}</p>
              {order.items && <ul className="mt-3 list-inside list-disc text-sm text-muted">{order.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}{item.packageSize && item.packageUnit ? ` (${item.packageSize} ${item.packageUnit})` : ""} × {item.quantity}</li>)}</ul>}
              {(order.status === "shipped" || order.status === "delivered") && (order.trackingUrl || order.trackingNumber) && (
                <div className="mt-4 border-t border-line pt-4 text-sm">
                  <p className="font-semibold">Shipment dispatched</p>
                  {order.trackingNumber && <p className="mt-1">Tracking ID: <span className="font-semibold">{order.trackingNumber}</span></p>}
                  {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all rounded bg-white px-2 py-1 font-semibold text-paddy underline decoration-2 underline-offset-2">{order.trackingUrl}</a>}
                  {order.dispatchedAt && <p className="mt-1 text-muted">Dispatched {new Date(order.dispatchedAt).toLocaleString()}</p>}
                </div>
              )}
              {lookup?.method === "order" && !completedStatuses.has(order.status) && <p className="mt-4 text-xs text-muted">Status refreshes automatically.</p>}
            </article>
          ))}
          {lookup?.method === "phone" && <button type="button" disabled={loading} onClick={refreshOrders} className="rounded border border-line px-4 py-2 text-sm font-semibold hover:border-paddy disabled:opacity-60">{loading ? "Refreshing…" : "Refresh orders"}</button>}
        </div>
      )}
      <Link to="/products" className="mt-6 inline-block text-sm text-paddy underline">Continue shopping</Link>
    </section>
    </ScrollReveal>
  );
}
