import { useEffect, useState } from "react";
import { testimonials } from "../../data/site";
import { WhatsAppIcon } from "../ui/Icons";
import ScrollReveal from "../ui/ScrollReveal";

const visibleClass = ["flex", "hidden md:flex", "hidden lg:flex"];

export default function Testimonials() {
  const n = testimonials.length;
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return;
    const id = setInterval(() => setStart((s) => (s + 1) % n), 5000);
    return () => clearInterval(id);
  }, [paused, n]);

  const visible = [0, 1, 2].map((k) => testimonials[(start + k) % n]);

  return (
    <ScrollReveal>
      <section
        className="bg-white px-4 py-16 lg:px-8"
        aria-roledescription="carousel"
        aria-label="Testimonials"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
      <h2 className="mb-12 text-center text-4xl font-medium md:text-5xl">Testimonials</h2>
      <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((t, i) => (
          <ScrollReveal key={`${t.name}-${i}`} delay={i * 0.07} className={visibleClass[i]}>
          <figure className="flex h-full flex-col bg-white px-8 py-10 shadow-[0_6px_20px_rgba(0,0,0,0.12)]">
            <WhatsAppIcon size={64} className="mx-auto text-[#5dcc6e]" />
            <figcaption className="mt-8">
              <p className="text-base font-bold tracking-[0.2em]">{t.name}</p>
              <p className="mt-1 text-base text-[#bdbdbd]">{t.role}</p>
            </figcaption>
            <blockquote className="mt-4 text-lg leading-8">{t.text}</blockquote>
          </figure>
          </ScrollReveal>
        ))}
      </div>
      <div className="mt-10 flex justify-center gap-3" role="group" aria-label="Choose testimonial">
        {testimonials.map((t, i) => (
          <button
            key={t.name}
            type="button"
            aria-label={`Show testimonial from ${t.name}`}
            aria-current={i === start}
            onClick={() => setStart(i)}
            className={`h-3 w-3 rounded-full transition ${i === start ? "bg-amber" : "bg-[#d9d9d9]"}`}
          />
        ))}
      </div>
      </section>
    </ScrollReveal>
  );
}
