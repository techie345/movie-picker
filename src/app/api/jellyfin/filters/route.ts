import { NextResponse } from "next/server";
import { getMovies, groupMovies } from "@/lib/jellyfin";

export async function GET() {
  try {
    const movies = await getMovies();
    const groups = groupMovies(movies);
    const genres = Object.keys(groups.byGenre).sort((a, b) =>
      a.localeCompare(b)
    );
    const decades = Object.keys(groups.byDecade)
      .filter((d) => d !== "Unknown")
      .sort();
    if (groups.byDecade.Unknown) decades.push("Unknown");

    return NextResponse.json({
      total: movies.length,
      genres: genres.map((g) => ({ name: g, count: groups.byGenre[g].length })),
      decades: decades.map((d) => ({ name: d, count: groups.byDecade[d].length })),
      ratings: Object.entries(groups.byRating)
        .map(([name, list]) => ({ name, count: list.length }))
        .sort((a, b) => b.name.localeCompare(a.name)),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
