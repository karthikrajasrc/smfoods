import { useEffect, useState } from "react";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { policies, quickLinks, site } from "../../data/site";
import { apiRequest } from "../../lib/api";
import { WhatsAppIcon } from "../ui/Icons";
import ScrollReveal from "../ui/ScrollReveal";

interface FooterCategory {
  id: string;
  name: string;
  slug: string;
}

const Heading = ({ children }: { children: string }) => (
  <h3 className="mb-4 text-xl font-medium sm:mb-6 sm:text-2xl">{children}</h3>
);
const link = "block py-2 text-sm text-white hover:underline sm:text-base";
const social = "grid h-11 w-11 place-items-center rounded-full border-2 border-white/90 text-white transition hover:bg-white/10";

export default function Footer() {
  const [categories, setCategories] = useState<FooterCategory[]>([]);

  useEffect(() => {
    let active = true;
    apiRequest<{ categories: FooterCategory[] }>("/categories")
      .then(({ categories: result }) => {
        if (active) setCategories(result.slice(0, 5));
      })
      .catch((cause: unknown) => {
        console.error("Could not load footer categories.", cause);
      });
    return () => { active = false; };
  }, []);

  return (
    <ScrollReveal>
    <footer className="bg-[#0d6d22] text-white">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr] lg:gap-8 lg:px-10">
        <div className="lg:pr-6">
          <div className="flex w-full max-w-[300px] items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
            <img src={site.logo} alt={site.name} className="h-16 w-full object-contain sm:h-[100px]" />
          </div>
          <p className="mt-4 text-base font-medium leading-relaxed italic text-white/90 sm:text-lg">SM Foods brings you pure, natural, and quality food products made with care. From wholesome traditional ingredients to healthy snacks, we bring authentic taste and goodness to every home.</p>
        </div>

        <nav aria-label="Quick links" className="lg:pl-6">
          <Heading>Quick Links</Heading>
          {quickLinks.map((l) => <Link key={l.to} to={l.to} className={`${link} uppercase`}>{l.label}</Link>)}
        </nav>

        <nav aria-label="Categories" className="lg:pl-4">
          <Heading>Category</Heading>
          {categories.map((category) => <Link key={category.id} to={`/products?category=${encodeURIComponent(category.slug)}`} className={link}>{category.name}</Link>)}
        </nav>

        <nav aria-label="Policies" className="lg:pl-4">
          <Heading>Policies</Heading>
          {policies.map((l) => <Link key={l.to} to={l.to} className={link}>{l.label}</Link>)}
        </nav>

        <address className="not-italic lg:pl-6">
          <Heading>Follow Us</Heading>
          <a href={`tel:${site.phone.replace(/\s/g, "")}`} className={`${link} flex items-center gap-3`}><Phone size={18} className="shrink-0" />{site.phone}</a>
          <a href={`mailto:${site.email}`} className={`${link} flex items-center gap-3 break-all`}><Mail size={18} className="shrink-0" />{site.email}</a>
          <p className="flex gap-3 py-2 text-sm sm:text-base"><MapPin size={18} className="mt-1 shrink-0" />{site.address}</p>
          <div className="mt-4 flex gap-3">
            <a href={site.facebook} aria-label="Facebook" target="_blank" className={social}><Facebook size={20} /></a>
            <a href={site.instagram} aria-label="Instagram" target="_blank" className={social}><Instagram size={20} /></a>
            <a href={site.whatsapp} aria-label="WhatsApp" target="_blank" className={social}><WhatsAppIcon size={20} /></a>
          </div>
        </address>
      </div>

      <div className="border-t border-white/60 flex w-full items-center justify-center text-center gap-4 px-4 py-6 sm:flex-row lg:px-10">
          <p className="text-center text-xs font-semibold sm:text-sm">© Copyright {new Date().getFullYear()} | Smfoods. Powered by SMFoods.</p>
      </div>
    </footer>
    </ScrollReveal>
  );
}
