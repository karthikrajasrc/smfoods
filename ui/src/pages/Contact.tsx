import { Mail, MapPin, Phone } from "lucide-react";
import Button from "../components/ui/Button";
import ScrollReveal from "../components/ui/ScrollReveal";
import { brandPhoneHref, useBrandContact } from "../context/BrandContactContext";

const field = "w-full rounded-xl border border-line bg-white px-4 py-3";

export default function Contact() {
  const { brandContact } = useBrandContact();
  return (
    <ScrollReveal className="mx-auto max-w-7xl">
    <div className="grid gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold text-paddy">Contact us</h1>
        <p className="mt-3 max-w-md text-muted">Questions about an order or a product? Send a message and we will reply soon.</p>
        <ul className="mt-8 space-y-4">
          <li className="flex gap-3"><Phone className="text-paddy" /><a href={brandPhoneHref(brandContact.phone)}>{brandContact.phone}</a></li>
          <li className="flex gap-3"><Mail className="text-paddy" /><a href={`mailto:${brandContact.email}`}>{brandContact.email}</a></li>
          <li className="flex gap-3"><MapPin className="shrink-0 text-paddy" />{brandContact.address}</li>
        </ul>
      </div>
      <form className="space-y-4 rounded-2xl border border-line bg-white p-6" onSubmit={(e) => { e.preventDefault(); console.log("TODO: send contact form"); }}>
        <div><label htmlFor="name" className="mb-1 block font-semibold">Name</label><input id="name" required className={field} /></div>
        <div><label htmlFor="email" className="mb-1 block font-semibold">Email</label><input id="email" type="email" required className={field} /></div>
        <div><label htmlFor="phone" className="mb-1 block font-semibold">Phone</label><input id="phone" type="tel" className={field} /></div>
        <div><label htmlFor="message" className="mb-1 block font-semibold">Message</label><textarea id="message" rows={5} required className={field} /></div>
        <Button type="submit">Send message</Button>
      </form>
    </div>
    </ScrollReveal>
  );
}
