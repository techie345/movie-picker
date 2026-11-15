import { Jellyfin } from "@jellyfin/sdk";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api";
import type { BaseItemDto } from "@jellyfin/sdk/lib/generated-client/models";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models/base-item-kind";
import { ItemFields } from "@jellyfin/sdk/lib/generated-client/models/item-fields";
import { ItemSortBy } from "@jellyfin/sdk/lib/generated-client/models/item-sort-by";
import { SortOrder } from "@jellyfin/sdk/lib/generated-client/models/sort-order";

export type JellyfinMovie = {
  Id: string;
  Name: string;
  Overview?: string;
  ProductionYear?: number;
  Genres?: string[];
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  ImageTags?: { Primary?: string };
};

export type MoviePickFilters = {
  genres?: string[];
  decade?: string; // e.g. "1990s", "2000s"
  minRating?: number;
};

function getConfig() {
  const baseUrl = process.env.JELLYFIN_SERVER_URL?.replace(/\/$/, "");
  const apiKey = process.env.JELLYFIN_API_KEY;
  const userId = process.env.JELLYFIN_USER_ID;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Missing Jellyfin configuration. Set JELLYFIN_SERVER_URL and JELLYFIN_API_KEY."
    );
  }

  return { baseUrl, apiKey, userId };
}

function createJellyfinApi() {
  const { baseUrl, apiKey } = getConfig();
  const jellyfin = new Jellyfin({
    clientInfo: { name: "Movie Picker", version: "0.1.0" },
    deviceInfo: { name: "Movie Picker Server", id: "movie-picker-server" },
  });
  return jellyfin.createApi(baseUrl, apiKey);
}

function toMovie(item: BaseItemDto): JellyfinMovie | null {
  if (!item.Id || !item.Name) return null;
  return {
    Id: item.Id,
    Name: item.Name,
    Overview: item.Overview ?? undefined,
    ProductionYear: item.ProductionYear ?? undefined,
    Genres: item.Genres ?? undefined,
    CommunityRating: item.CommunityRating ?? undefined,
    OfficialRating: item.OfficialRating ?? undefined,
    RunTimeTicks: item.RunTimeTicks ?? undefined,
    ImageTags: item.ImageTags as { Primary?: string } | undefined,
  };
}

export async function getMovies(): Promise<JellyfinMovie[]> {
  const { userId } = getConfig();
  const api = createJellyfinApi();
  const libraryApi = getLibraryApi(api);

  const { data } = await libraryApi.getItems({
    userId: userId || undefined,
    includeItemTypes: [BaseItemKind.Movie],
    recursive: true,
    fields: [ItemFields.Genres, ItemFields.Overview],
    sortBy: [ItemSortBy.SortName],
    sortOrder: [SortOrder.Ascending],
  });

  return (data.Items ?? [])
    .map(toMovie)
    .filter((m): m is JellyfinMovie => m !== null);
}

export function getImageUrl(movie: JellyfinMovie): string | null {
  const baseUrl = process.env.JELLYFIN_SERVER_URL?.replace(/\/$/, "");
  if (!baseUrl || !movie.ImageTags?.Primary) return null;
  return `${baseUrl}/Items/${movie.Id}/Images/Primary?maxHeight=450&tag=${movie.ImageTags.Primary}`;
}

export function deriveDecade(year?: number): string | null {
  if (!year) return null;
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}

export function ratingBucket(rating?: number): string {
  if (rating == null) return "Unrated";
  if (rating >= 8) return "8+";
  if (rating >= 7) return "7-7.9";
  if (rating >= 6) return "6-6.9";
  if (rating >= 5) return "5-5.9";
  return "Below 5";
}

export function groupMovies(movies: JellyfinMovie[]) {
  const byGenre: Record<string, JellyfinMovie[]> = {};
  const byDecade: Record<string, JellyfinMovie[]> = {};
  const byRating: Record<string, JellyfinMovie[]> = {};

  for (const m of movies) {
    for (const g of m.Genres?.length ? m.Genres : ["Unknown"]) {
      (byGenre[g] ??= []).push(m);
    }
    const dec = deriveDecade(m.ProductionYear) ?? "Unknown";
    (byDecade[dec] ??= []).push(m);
    const rb = ratingBucket(m.CommunityRating);
    (byRating[rb] ??= []).push(m);
  }

  return { byGenre, byDecade, byRating };
}

export function filterMovies(movies: JellyfinMovie[], filters: MoviePickFilters) {
  return movies.filter((m) => {
    if (filters.genres?.length) {
      const mg = new Set(m.Genres ?? []);
      if (!filters.genres.some((g) => mg.has(g))) return false;
    }
    if (filters.decade) {
      if (deriveDecade(m.ProductionYear) !== filters.decade) return false;
    }
    if (filters.minRating != null) {
      if ((m.CommunityRating ?? 0) < filters.minRating) return false;
    }
    return true;
  });
}

export function pickMovie(movies: JellyfinMovie[]): JellyfinMovie | null {
  if (!movies.length) return null;
  const idx = Math.floor(Math.random() * movies.length);
  return movies[idx];
}
