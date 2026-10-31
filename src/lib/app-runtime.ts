import { queryOptions, useSuspenseQuery, type QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { getSnapshotFn, type FormFields } from "@/lib/app.functions";
import { setCurrentSnapshot } from "@/lib/db";

let router: AnyRouter | null = null;
let queryClient: QueryClient | null = null;

/** Called once from the root route so client-side actions can refresh and navigate. */
export function registerRuntime(r: AnyRouter, q: QueryClient) {
  router = r;
  queryClient = q;
}

export const snapshotQuery = queryOptions({
  queryKey: ["snapshot"],
  queryFn: () => getSnapshotFn(),
  staleTime: 60_000,
  gcTime: 10 * 60_000,
});

/** Loads the signed-in person's data and makes it readable through `@/lib/db`. */
export function useSnapshot() {
  const { data } = useSuspenseQuery(snapshotQuery);
  setCurrentSnapshot(data);
  return data;
}

/** Re-reads the person's data after a change. */
export async function refresh() {
  if (queryClient) await queryClient.invalidateQueries({ queryKey: ["snapshot"] });
}

export function go(href: string) {
  if (router) void router.navigate({ href });
}

export function toFields(formData: FormData): FormFields {
  const out: FormFields = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}
