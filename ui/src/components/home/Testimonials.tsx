import { useEffect, useState } from "react";
import { Leaf, Quote } from "lucide-react";
import { testimonials } from "../../data/site";
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
        className="px-4 py-16 lg:px-8"
        aria-roledescription="carousel"
        aria-label="Testimonials"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="mx-auto mb-10 max-w-[1400px] text-center sm:mb-12">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-paddy/15 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-paddy">
            <Leaf size={15} aria-hidden="true" />
            Good food, happy homes
          </p>
          <h2 className="font-display text-3xl font-bold text-paddy sm:text-4xl md:text-5xl">Kind words from our customers</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">A little love for the flavours and traditions we bring to your table.</p>
        </div>
        <div className="mx-auto grid max-w-[1400px] items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {visible.map((t, i) => (
            <ScrollReveal key={`${t.name}-${i}`} delay={i * 0.07} className={visibleClass[i]}>
              <figure className="group relative flex h-full min-h-64 flex-col overflow-hidden rounded-3xl border border-[#dce9d5] bg-white/90 p-6 shadow-[0_12px_35px_rgba(29,99,31,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(29,99,31,0.14)] sm:p-8">
                <div aria-hidden="true" className="absolute -right-10 -top-10 size-36 rounded-full bg-[#edf6e9] transition-transform duration-500 group-hover:scale-110" />
                <div className="relative flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#f1f8ed] px-3 py-1.5 text-xs font-semibold text-paddy">
                    <Leaf size={14} aria-hidden="true" />
                    Customer story
                  </span>
                  <Quote size={36} strokeWidth={1.5} className="text-paddy/25" aria-hidden="true" />
                </div>
                <blockquote className="relative mt-6 flex-1 font-display text-lg leading-8 text-ink sm:text-xl sm:leading-9">
                  “{t.text}”
                </blockquote>
                <figcaption className="relative mt-7 flex items-center gap-3 border-t border-[#e8eee4] pt-5">
                  <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-paddy text-sm font-bold tracking-wide text-white">
                    {t.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{t.name}</span>
                    <span className="mt-0.5 block text-sm text-muted">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </ScrollReveal>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-2.5" role="group" aria-label="Choose testimonial">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              type="button"
              aria-label={`Show testimonial from ${t.name}`}
              aria-current={i === start}
              onClick={() => setStart(i)}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-offset-4 ${i === start ? "w-8 bg-paddy" : "w-2.5 bg-paddy/25 hover:bg-paddy/50"}`}
            />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
