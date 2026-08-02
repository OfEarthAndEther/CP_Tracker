import './App.css'

import { InsightsSummary } from './components/dashboard/InsightsSummary'

function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(15,23,42,0.9),_rgba(2,6,23,1)_55%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-cyan-200/80">
            CP_Tracker Stage 5
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Analytics &amp; Insights Engine
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Spaced repetition, blind-spot detection, and topic mastery views built on the
                normalized Supabase schema.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              <p className="font-semibold">Live analytics</p>
              <p className="mt-1 text-cyan-100/80">Fetches from the route handler when a session is available.</p>
            </div>
          </div>
        </header>

        <InsightsSummary />
      </div>
    </main>
  )
}

export default App
