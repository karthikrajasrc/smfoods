import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

type BannerDevice = "desktop" | "mobile";

function getBannerDevice(): BannerDevice {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
    ? "mobile"
    : "desktop";
}

export default function Hero() {
  const [device, setDevice] = useState<BannerDevice>(getBannerDevice);
  const [images, setImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateDevice = (event: MediaQueryListEvent) => setDevice(event.matches ? "mobile" : "desktop");
    mediaQuery.addEventListener("change", updateDevice);
    return () => mediaQuery.removeEventListener("change", updateDevice);
  }, []);

  useEffect(() => {
    let active = true;
    setImages([]);
    setLoadedImages(new Set());
    setActiveIndex(0);
    setLoading(true);
    apiRequest<{ images: string[] }>(`/settings/banner?device=${device}`)
      .then(({ images: result }) => {
        if (!active) return;
        setImages(result);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        console.error("Could not load home banner images:", cause);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [device]);

  useEffect(() => {
    if (paused || images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % images.length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [images.length, paused]);

  useEffect(() => {
    setActiveIndex((index) => Math.max(0, Math.min(index, images.length - 1)));
  }, [images.length]);

  const bannerReady = images.length > 0 && loadedImages.has(images[activeIndex]);

  return (
    <section
      className="mx-5 mb-0 mt-4 overflow-hidden rounded-2xl sm:mb-1"
      aria-label="SM Foods promotional banners"
      aria-busy={loading || !bannerReady}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-brand-soft">
        <div
          className="relative aspect-[16/9] overflow-hidden md:aspect-[4/1]"
        >
          <div
            className="absolute inset-0 flex transition-transform duration-700 ease-in-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            aria-live="off"
          >
            {images.map((image, index) => (
              <img
                key={`${image}-${index}`}
                src={image}
                alt={`SM Foods promotional banner ${index + 1}`}
                fetchPriority={index === 0 ? "high" : "auto"}
                onLoad={() => setLoadedImages((loaded) => new Set(loaded).add(image))}
                onError={() => console.error(`Could not load home banner image: ${image}`)}
                className={`h-full w-full flex-none object-cover transition-opacity duration-200 ${loadedImages.has(image) ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
          {!bannerReady && (
            <div role="status" aria-label="Loading banner" className="absolute inset-0 animate-pulse bg-brand-soft" />
          )}
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
  );
}
