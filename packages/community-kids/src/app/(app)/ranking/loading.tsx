export default function RankingLoading() {
  return (
    <div className="w-full animate-pulse space-y-6" role="status" aria-label="Carregando ranking">
      <div className="space-y-3">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-10 w-80 max-w-full rounded bg-muted" />
        <div className="h-5 w-full max-w-xl rounded bg-muted" />
      </div>
      <div className="h-14 rounded-2xl bg-muted" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-52 rounded-2xl bg-muted" />
        <div className="h-52 rounded-2xl bg-muted" />
        <div className="h-52 rounded-2xl bg-muted" />
      </div>
      <div className="h-16 rounded-2xl bg-muted" />
      <div className="h-16 rounded-2xl bg-muted" />
    </div>
  )
}
