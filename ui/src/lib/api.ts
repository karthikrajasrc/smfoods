const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const pendingGetRequests = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const canDeduplicate = (!options.method || options.method === "GET")
    && !options.body
    && !options.headers
    && !options.signal;
  const url = `${apiBase}${path}`;
  if (canDeduplicate) {
    const pendingRequest = pendingGetRequests.get(url);
    if (pendingRequest) return pendingRequest as Promise<T>;
  }

  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const request = (async () => {
    const response = await fetch(url, {
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
  })();

  if (canDeduplicate) {
    pendingGetRequests.set(url, request);
    void request.then(
      () => {
        if (pendingGetRequests.get(url) === request) pendingGetRequests.delete(url);
      },
      () => {
        if (pendingGetRequests.get(url) === request) pendingGetRequests.delete(url);
      },
    );
  }
  return request;
}
