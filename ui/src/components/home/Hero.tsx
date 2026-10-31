import { useEffect, useState } from "react";
import ScrollReveal from "../ui/ScrollReveal";
import { apiRequest } from "../../lib/api";

export default function Hero() {
  const [images, setImages] = useState<string[]>(["/images/hero-products.jpg"]);
  const [mobileImages, setMobileImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ heroImages: string[]; heroMobileImages: string[] }>("/settings")
      .then(({ heroImages, heroMobileImages }) => {
        if (!active) return;
        if (heroImages.length > 0) setImages(heroImages);
        setMobileImages(heroMobileImages);
      })
      .catch((cause: unknown) => console.error("Could not load home banner images:", cause));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (paused || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [images.length, paused]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, images.length - 1));
  }, [images.length]);

  return (
    <ScrollReveal>
      <section
        className="mx-5 mb-0 mt-4 overflow-hidden rounded-2xl sm:mb-1"
        aria-label="SM Foods promotional banners"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
        }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white">
        <div
          className="flex aspect-[16/9] transition-transform duration-700 ease-in-out motion-reduce:transition-none md:aspect-[4/1]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          aria-live="off"
        >
          {images.map((image, index) => (
            <picture key={`${image}-${index}`} className="block h-full w-full flex-none">
              {mobileImages[index] && <source media="(max-width: 767px)" srcSet={mobileImages[index]} />}
              <img
                src={image}
                alt={`SM Foods promotional banner ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </picture>
          ))}
        </div>

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" aria-label="Choose a banner">
            {images.map((image, index) => (
              <button
                key={`${image}-indicator`}
                type="button"
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => setActiveIndex(index)}
                className={`size-2.5 rounded-full border border-white shadow-sm transition ${index === activeIndex ? "bg-white" : "bg-white/45 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
        </div>
      </section>
    </ScrollReveal>
  );
}
