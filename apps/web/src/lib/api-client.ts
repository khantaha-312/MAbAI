"use client";

import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiError {
  status: number;
  message: string;
  body?: unknown;
}

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;

    }
    const err: ApiError = {
      status: res.status,
      message: (body as any)?.message ?? res.statusText ?? "Request failed",
      body,
    };
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useApiClient() {
  const { getToken } = useAuth();

  async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    return request<T>(path, token, options);
  }

  return {
    get: <T>(path: string) => call<T>(path, { method: "GET" }),
    post: <T>(path: string, body?: unknown) =>
      call<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
    put: <T>(path: string, body?: unknown) =>
      call<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
    delete: <T>(path: string) => call<T>(path, { method: "DELETE" }),
  };
}