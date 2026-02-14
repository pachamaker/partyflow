export function ResultsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-secondary/70 p-6">
      <h1 className="text-3xl font-bold">Results</h1>
      <p className="text-slate-200">Итоги партии и очки команд.</p>
      <ul className="space-y-2 text-slate-100">
        <li className="rounded bg-white/10 p-3">Team A: 0</li>
        <li className="rounded bg-white/10 p-3">Team B: 0</li>
      </ul>
    </section>
  )
}
