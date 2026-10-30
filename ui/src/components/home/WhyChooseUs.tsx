import { CheckCircle2, CreditCard, Truck, Utensils } from "lucide-react";
import { MdOutlineShoppingCart } from "react-icons/md";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { whyUs } from "../../data/site";
import ScrollReveal from "../ui/ScrollReveal";

const icons: Record<(typeof whyUs)[number]["icon"], ReactNode> = {
  payment: <CreditCard size={30} className="text-[#f26a21]" />,
  methods: <Utensils size={30} className="text-[#2e9a2e]" />,
  fresh: <Truck size={30} className="text-[#f26a21]" />,
  quality: <CheckCircle2 size={30} className="text-[#3c9a12]" />,
};

export default function WhyChooseUs() {
  return (
    <ScrollReveal>
      <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:px-8">
      <div>
        <h2 className="text-2xl font-medium sm:text-3xl md:text-4xl">Why Choose Us?</h2>
        <p className="mt-3 text-sm text-muted sm:text-base">Our Vision is cascade the Tradition taste from Local routes to Global routes.</p>
        <ul className="mt-7 space-y-6 sm:mt-8 sm:space-y-7">
          {whyUs.map((w) => (
            <li key={w.title} className="flex items-start gap-4 sm:gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#f2f2f2] sm:h-16 sm:w-16">{icons[w.icon]}</span>
              <div className="pt-1">
                <h3 className="text-base font-medium sm:text-lg">{w.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted sm:text-base">{w.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <div className="flex aspect-square flex-col items-center justify-center bg-[#f1ebdc] p-4 text-center sm:p-8">
          <p className="font-display text-2xl font-bold leading-tight text-[#8a5a1c] sm:text-4xl">Pure, Golden Goodness from Our Tradition.</p>
          <p className="mt-3 text-sm text-[#3b3326] sm:text-lg">Authentic Flavor for Every Meal.</p>
          <Link to="/products" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e99a2b] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:brightness-95 sm:px-8 sm:text-xl">
            Shop Now <MdOutlineShoppingCart size={22} />
          </Link>
        </div>
        <img src="/images/gallery-1.jpg" alt="SM Foods pure cow ghee jar on a wooden table" className="aspect-square h-full w-full object-cover" />
        <img src="/images/gallery-3.jpg" alt="Golden ghee in a glass jar" className="aspect-square h-full w-full object-cover" />
        <img src="/images/gallery-2.jpg" alt="Close-up of SM Foods cow ghee" className="aspect-square h-full w-full object-cover" />
      </div>
      </section>
    </ScrollReveal>
  );
}
