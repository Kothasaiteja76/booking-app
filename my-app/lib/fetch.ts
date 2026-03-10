import { useCallback, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_SERVER_URL?.replace(/\/$/, "");

const buildUrl = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url;
  if (API_BASE) return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  return url; // fallback to relative (Metro/host)
};

const parseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  // Prefer JSON when declared
  if (contentType.includes("application/json")) {
    return await response.json();
  }

  // Fallback: try text, then attempt JSON parse for text bodies
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const fetchAPI = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(buildUrl(url), {
      headers: { Accept: "application/json", ...(options?.headers || {}) },
      ...options,
    });

    const body = await parseBody(response);

    if (!response.ok) {
      const message =
        (body && (body.error || body.message)) ||
        `HTTP ${response.status} ${response.statusText}`;
      throw new Error(message);
    }

    // Normalize to { data: ... } so callers stay consistent
    if (body && typeof body === "object" && "data" in body) {
      return body as { data: unknown };
    }

    return { data: body };
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const useFetch = <T>(url: string, options?: RequestInit) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAPI(url, options);
      setData(result.data as T);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
