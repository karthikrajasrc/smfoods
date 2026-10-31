import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { site } from "../data/site";
import { apiRequest } from "../lib/api";

export interface BrandContact {
  phone: string;
  email: string;
  address: string;
}

const defaultBrandContact: BrandContact = {
  phone: site.phone,
  email: site.email,
  address: site.address,
};

const BrandContactContext = createContext<{
  brandContact: BrandContact;
  setBrandContact: (contact: BrandContact) => void;
} | null>(null);

export function BrandContactProvider({ children }: { children: ReactNode }) {
  const [brandContact, setBrandContact] = useState(defaultBrandContact);

  useEffect(() => {
    let active = true;
    apiRequest<{ brandContact: BrandContact }>("/settings")
      .then(({ brandContact: savedContact }) => {
        if (active) setBrandContact(savedContact);
      })
      .catch((cause: unknown) => {
        console.error("Could not load brand contact settings:", cause);
      });
    return () => { active = false; };
  }, []);

  return (
    <BrandContactContext.Provider value={{ brandContact, setBrandContact }}>
      {children}
    </BrandContactContext.Provider>
  );
}

export function useBrandContact() {
  const context = useContext(BrandContactContext);
  if (!context) throw new Error("useBrandContact must be used within a BrandContactProvider.");
  return context;
}

export function brandPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function brandWhatsAppHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
