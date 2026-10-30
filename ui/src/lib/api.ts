const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status}).`, response.status);
  }
  return data as T;
}
