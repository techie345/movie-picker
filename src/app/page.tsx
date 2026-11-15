import MoviePicker from "@/components/MoviePicker";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 font-sans dark:bg-black sm:px-8">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Jellyfin</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Movie Picker
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
            Connects to your Jellyfin server, asks a few questions about what you want to watch, and picks an option
            from matching movies grouped by metadata.
          </p>
        </header>
        <MoviePicker />
      </main>
    </div>
  );
}
