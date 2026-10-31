import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartLineId, type Product } from "../data/products";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "smfoods-cart";

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Stored cart is not a list.");
    return parsed.filter((item): item is CartItem =>
      typeof item?.product?.id === "string" &&
      typeof item?.product?.name === "string" &&
      typeof item?.product?.price === "number" &&
      Number.isInteger(item?.quantity) &&
      item.quantity > 0
    );
  } catch (error) {
    console.warn("Could not restore saved cart; starting with an empty cart.", error);
    localStorage.removeItem(storageKey);
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    add(product, quantity = 1) {
      setItems((current) => {
        const key = cartLineId(product);
        const existing = current.find((item) => cartLineId(item.product) === key);
        if (existing) {
          return current.map((item) => cartLineId(item.product) === key
            ? { product, quantity: Math.min(50, item.quantity + quantity) }
            : item);
        }
        return [...current, { product, quantity: Math.min(50, quantity) }];
      });
    },
    setQuantity(productId, quantity) {
      setItems((current) => quantity < 1
        ? current.filter((item) => cartLineId(item.product) !== productId)
        : current.map((item) => cartLineId(item.product) === productId
          ? { ...item, quantity: Math.min(50, quantity) }
          : item));
    },
    remove(productId) {
      setItems((current) => current.filter((item) => cartLineId(item.product) !== productId));
    },
    clear() {
      setItems([]);
    },
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider.");
  return context;
}
