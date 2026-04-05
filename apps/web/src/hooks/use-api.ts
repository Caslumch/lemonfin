"use client";

import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { api } from "@/lib/api";

export function useApi() {
  const { data: session } = useSession();
  const token = (session as unknown as { accessToken?: string })?.accessToken;

  const fetchApi = useCallback(
    <T = unknown>(path: string, options?: RequestInit) =>
      api<T>(path, { ...options, token }),
    [token],
  );

  return { fetchApi, token };
}
