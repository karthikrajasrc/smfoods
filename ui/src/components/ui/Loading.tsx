import { useState, type ReactNode } from "react";
import { ImageOff } from "lucide-react";

export function ImageWithLoader({
  src,
  alt,
  className,
  loading,
}: {
  src: string;
  alt: string;
  className: string;
  loading?: "eager" | "lazy";
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;

  return (
    <span className="relative block h-full w-full overflow-hidden">
      {!loaded && !failed && <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-brand-soft" />}
      {failed && (
        <span
          role="img"
          aria-label={alt ? `${alt} image unavailable` : "Image unavailable"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-brand-soft text-muted"
        >
          <ImageOff size={28} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-xs">Image unavailable</span>
        </span>
      )}
      {!failed && (
        <img
          key={src}
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={`${className} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}

export function LoadingState({
  label = "Loading…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center gap-3 text-sm text-muted ${className}`}>
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-paddy/20 border-t-paddy" />
      <span>{label}</span>
    </div>
  );
}

export function ButtonLoading({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
      {children}
    </span>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products" aria-busy="true" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-md bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="aspect-square animate-pulse bg-brand-soft" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-4/5 animate-pulse rounded bg-brand-soft" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-brand-soft" />
            <div className="h-8 w-1/2 animate-pulse rounded bg-brand-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}
