import { NextResponse } from "next/server";
import { filterMovies, getImageUrl, getMovies, groupMovies, pickMovie, type MoviePickFilters } from "@/lib/jellyfin";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as MoviePickFilters;
    const movies = await getMovies();
    const filtered = filterMovies(movies, body);
    const picked = pickMovie(filtered);

    if (!picked) {
      return NextResponse.json({
        pick: null,
        message: "No movies match your filters.",
        matchedCount: 0,
        groups: { byGenre: {}, byDecade: {}, byRating: {} },
      });
    }

    // group matched movies for context
    const groups = groupMovies(filtered);
    const summarize = (g: Record<string, unknown[]>) =>
      Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v.length]));

    return NextResponse.json({
      pick: {
        ...picked,
        imageUrl: getImageUrl(picked),
      },
      matchedCount: filtered.length,
      groups: {
        byGenre: summarize(groups.byGenre),
        byDecade: summarize(groups.byDecade),
        byRating: summarize(groups.byRating),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
