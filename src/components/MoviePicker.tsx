"use client";

import { useEffect, useMemo, useState } from "react";

type FilterOption = { name: string; count: number };
type FiltersData = {
  total: number;
  genres: FilterOption[];
  decades: FilterOption[];
  ratings: FilterOption[];
};

type PickResponse = {
  pick: {
    Id: string;
    Name: string;
    Overview?: string;
    ProductionYear?: number;
    Genres?: string[];
    CommunityRating?: number;
    OfficialRating?: string;
    RunTimeTicks?: number;
    imageUrl?: string | null;
  } | null;
  matchedCount?: number;
  message?: string;
  groups?: {
    byGenre: Record<string, number>;
    byDecade: Record<string, number>;
    byRating: Record<string, number>;
  };
  error?: string;
};

function formatRuntime(ticks?: number) {
  if (!ticks) return null;
  const minutes = Math.round(ticks / 600000000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function MoviePicker() {
  const [filters, setFilters] = useState<FiltersData | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [decade, setDecade] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");

  const [picking, setPicking] = useState(false);
  const [result, setResult] = useState<PickResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jellyfin/filters", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load filters");
        if (!cancelled) setFilters(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const canPick = !!filters && filters.total > 0;

  const groupedSummary = useMemo(() => {
    if (!result?.groups) return null;
    const top = (obj: Record<string, number>, n = 6) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
    return {
      genres: top(result.groups.byGenre),
      decades: top(result.groups.byDecade),
      ratings: top(result.groups.byRating),
    };
  }, [result]);

  async function pick() {
    setPicking(true);
    setError(null);
    try {
      const res = await fetch("/api/jellyfin/pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genres: selectedGenres.length ? selectedGenres : undefined,
          decade: decade || undefined,
          minRating: minRating ? Number(minRating) : undefined,
        }),
      });
      const data: PickResponse = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to pick a movie");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick");
    } finally {
      setPicking(false);
    }
  }

  function reset() {
    setSelectedGenres([]);
    setDecade("");
    setMinRating("");
    setResult(null);
  }

  if (loadingFilters) {
    return <div className="text-zinc-500">Loading your Jellyfin library…</div>;
  }

  if (error && !filters) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-medium">Could not connect to Jellyfin</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
        <p className="mt-2 text-sm opacity-80">
          Check <code>JELLYFIN_SERVER_URL</code> and <code>JELLYFIN_API_KEY</code> in your environment.
        </p>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">What are you in the mood for?</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Answer a few questions and I&apos;ll pick a movie from your library
            {filters ? ` (${filters.total} movies found)` : ""}.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              1. Genres <span className="font-normal text-zinc-400">(choose any)</span>
            </label>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-auto rounded-lg border border-zinc-100 p-2 dark:border-zinc-800">
              {filters?.genres.map((g) => {
                const active = selectedGenres.includes(g.name);
                return (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => toggleGenre(g.name)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    }`}
                    title={`${g.count} movies`}
                  >
                    {g.name} <span className="opacity-60">{g.count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">2. Decade</label>
              <select
                value={decade}
                onChange={(e) => setDecade(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Any decade</option>
                {filters?.decades.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} ({d.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-800 dark:text-zinc-200">3. Minimum rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Any rating</option>
                <option value="8">8+ (great)</option>
                <option value="7">7+ (good)</option>
                <option value="6">6+ (decent)</option>
                <option value="5">5+ (watchable)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={pick}
              disabled={!canPick || picking}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {picking ? "Picking…" : result?.pick ? "Pick another" : "Pick a movie"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your pick</h2>
          {!result && <p className="text-sm text-zinc-500">Answer the questions and hit “Pick a movie”.</p>}
          {result && !result.pick && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.message || "No movies match your filters."}</p>
          )}
          {result?.pick && (
            <div className="space-y-4">
              {result.pick.imageUrl && (
                <img
                  src={result.pick.imageUrl}
                  alt=""
                  className="aspect-[2/3] w-full max-w-[220px] rounded-xl object-cover shadow"
                />
              )}
              <div>
                <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {result.pick.Name}
                  {result.pick.ProductionYear ? (
                    <span className="ml-2 text-lg font-normal text-zinc-500">({result.pick.ProductionYear})</span>
                  ) : null}
                </h3>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.pick.CommunityRating != null && <span>★ {result.pick.CommunityRating.toFixed(1)}</span>}
                  {result.pick.OfficialRating && <span>{result.pick.OfficialRating}</span>}
                  {formatRuntime(result.pick.RunTimeTicks) && <span>{formatRuntime(result.pick.RunTimeTicks)}</span>}
                </div>
                {result.pick.Genres?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.pick.Genres.map((g) => (
                      <span key={g} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {g}
                      </span>
                    ))}
                  </div>
                ) : null}
                {result.pick.Overview && (
                  <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{result.pick.Overview}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {groupedSummary && result?.matchedCount != null && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Matched movies grouped by metadata
            </h3>
            <p className="mb-4 text-xs text-zinc-500">{result.matchedCount} movies match your answers.</p>
            <div className="space-y-3 text-sm">
              <GroupBlock title="By genre" entries={groupedSummary.genres} />
              <GroupBlock title="By decade" entries={groupedSummary.decades} />
              <GroupBlock title="By rating" entries={groupedSummary.ratings} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function GroupBlock({ title, entries }: { title: string; entries: [string, number][] }) {
  if (!entries.length) return null;
  return (
    <div>
      <div className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">{title}</div>
      <ul className="space-y-0.5 text-zinc-600 dark:text-zinc-400">
        {entries.map(([name, count]) => (
          <li key={name} className="flex justify-between gap-4">
            <span className="truncate">{name}</span>
            <span className="tabular-nums text-zinc-400">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
