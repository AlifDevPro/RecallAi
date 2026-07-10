"use client";

import { useEffect, useState } from "react";
import type { Contributor } from "@/lib/data/contributors";

type UseContributorsResult = {
  contributors: Contributor[];
  loading: boolean;
  error: string | null;
};

export function useContributors(range: "week" | "month" | "all" = "all"): UseContributorsResult {
  const [contributors, setContributors] = useState<Contributor[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContributors(null);
    setError(null);

    fetch(`/api/public/contributors?range=${range}`)
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as {
          contributors?: Contributor[];
          error?: string;
        };
        if (!r.ok) throw new Error(d.error ?? "Failed to load contributors");
        return d.contributors ?? [];
      })
      .then((list) => {
        if (!cancelled) setContributors(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load contributors");
          setContributors([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  return {
    contributors: contributors ?? [],
    loading: contributors === null,
    error,
  };
}
