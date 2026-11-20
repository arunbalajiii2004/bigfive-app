import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, TRAIT_COLORS, axisTick, tooltipStyle } from '../api.js'
import { Card, GlassButton, PageSkeleton, PrimaryButton, Reveal } from '../components/ui.jsx'
import { LargeTitle } from '../components/LargeTitle.jsx'
import CountUp from '../components/CountUp.jsx'

function Kpi({ label, children, hint }) {
  return (
    <div className="glass glass-lift p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{children}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Login({ onToken }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  async function submit(e) {
    e.preventDefault(); setErr('')
    try { const r = await api.adminLogin(pw); sessionStorage.setItem('adminToken', r.token); onToken(r.token) }
    catch (e2) { setErr(e2.message) }
  }
  return (
    <form onSubmit={submit} className="glass mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold">Admin login</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus
        className="mt-4 w-full rounded-2xl border border-black/10 bg-white/60 px-4 py-2.5 outline-none transition focus:border-accent dark:border-white/10 dark:bg-white/10" />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <PrimaryButton type="submit" className="mt-4 w-full">Log in</PrimaryButton>
    </form>
  )
}


export default function Admin() {
  const [token, setToken] = useState(sessionStorage.getItem('adminToken') || '')
  const [includeDemo, setIncludeDemo] = useState(true)
  const [stats, setStats] = useState(null)
  const [sel, setSel] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    try { setStats(await api.adminStats(token, includeDemo)); setErr('') }
    catch (e) { if (e.status === 401) { sessionStorage.removeItem('adminToken'); setToken('') } else setErr(e.message) }
  }, [token, includeDemo])

  useEffect(() => { if (token) load() }, [token, load])

  if (!token) return <Login onToken={setToken} />
  if (!stats) return err ? <p className="text-red-600">{err}</p> : <PageSkeleton />

  async function act(fn) { setBusy(true); try { await fn(); await load() } catch (e) { setErr(e.message) } finally { setBusy(false) } }

  const seg = stats.segments[sel]
  const segRadar = stats.traits.map((t, i) => ({ trait: t.name, value: seg.avg_traits[i] ?? 0 }))
  const sizeData = stats.segments.map((s) => ({ name: `S${s.id}`, full: s.name, count: s.count }))
  const hasUnc = stats.avg_half_width != null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LargeTitle>Admin dashboard</LargeTitle>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-[#007aff]" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} /> Include demo data</label>
          <GlassButton disabled={busy} onClick={() => act(() => api.adminSeed(token, 500))}>{busy ? 'Working…' : 'Seed 500 demo sessions'}</GlassButton>
          <GlassButton disabled={busy} onClick={() => act(() => api.adminClearDemo(token))}>Clear demo data</GlassButton>
          <button onClick={() => { sessionStorage.removeItem('adminToken'); setToken('') }} className="text-slate-500 underline">Log out</button>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {stats.demo_sessions > 0 && includeDemo && (
        <p className="rounded-2xl bg-amber-500/15 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          {stats.demo_sessions} of these sessions are simulated demo data, not real people. Untick “Include demo data” to see real sessions only.
        </p>
      )}

      <Reveal>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Sessions"><CountUp value={stats.total_sessions} decimals={0} /></Kpi>
          <Kpi label="Completed" hint="Reached results"><CountUp value={stats.completed} decimals={0} /></Kpi>
          <Kpi label="Completion"><CountUp value={stats.completion_rate * 100} decimals={0} suffix="%" /></Kpi>
          <Kpi label="Avg questions" hint="Completed sessions">{stats.avg_questions != null ? <CountUp value={stats.avg_questions} decimals={1} /> : '–'}</Kpi>
          <Kpi label="Avg uncertainty" hint="± score points">{hasUnc ? <CountUp value={stats.avg_half_width} /> : '–'}</Kpi>
          <Kpi label="Precise at finish" hint="Range under threshold">{stats.confident_share != null ? <CountUp value={stats.confident_share * 100} decimals={0} suffix="%" /> : '–'}</Kpi>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <Card title="Segment sizes" subtitle="Completed sessions per segment (most likely profile)." className="h-full">
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={sizeData}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={axisTick} /><YAxis allowDecimals={false} tick={axisTick} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--grid)', opacity: 0.4 }} formatter={(v) => [v, 'Sessions']} labelFormatter={(l, p) => p?.[0]?.payload.full || l} />
                  <Bar dataKey="count" fill="#007aff" radius={6} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Where people drop off" subtitle="Sessions that reached each question." className="h-full">
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={stats.funnel}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="question" tick={axisTick} /><YAxis allowDecimals={false} tick={axisTick} />
                  <Tooltip {...tooltipStyle} />
                  <Area dataKey="sessions" stroke="#007aff" fill="#64d2ff" fillOpacity={0.5} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card title="Segment playbook" subtitle="Click a segment. Messaging lines are hypotheses to A/B test, not proven rules: personality-targeted messaging shows real but modest effects.">
          <div className="mb-4 flex flex-wrap gap-2">
            {stats.segments.map((s, i) => (
              <button key={s.id} onClick={() => setSel(i)}
                className={`rounded-full px-4 py-1.5 text-left text-sm transition ${sel === i ? 'bg-accent text-white shadow-md shadow-[#007aff]/30' : 'bg-black/5 text-slate-700 hover:bg-black/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'}`}>
                <b>S{s.id}</b> · {s.count} sessions ({Math.round(s.observed_share * 100)}%)
              </button>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={segRadar} outerRadius="70%">
                  <PolarGrid stroke="var(--grid)" /><PolarAngleAxis dataKey="trait" tick={axisTick} />
                  <PolarRadiusAxis domain={[1, 5]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#007aff" fill="#007aff" fillOpacity={0.35} animationDuration={600} />
                  <Tooltip {...tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <motion.div key={seg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <h3 className="text-lg font-semibold">{seg.name}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{seg.description}</p>
              <h4 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Messaging hypotheses</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
                {seg.messaging.length ? seg.messaging.map((m) => <li key={m}>{m}</li>) : <li>Balanced profile: test general-audience messaging first.</li>}
              </ul>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Suggested test: send this segment two message variants (this angle vs a neutral control) and compare click or conversion rates before relying on it.
              </p>
            </motion.div>
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <Card title="Sessions per day" subtitle="Started vs completed." className="h-full">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={stats.daily}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ ...axisTick, fontSize: 10 }} tickFormatter={(d) => d.slice(5)} /><YAxis allowDecimals={false} tick={axisTick} />
                  <Tooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="started" stroke="#94a3b8" dot={false} animationDuration={800} /><Line dataKey="completed" stroke="#007aff" dot={false} animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card title="Trait distributions" subtitle="Completed sessions by trait score (1 to 5, bins of 0.5)." className="h-full">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={stats.trait_hist}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="bin" tick={axisTick} /><YAxis allowDecimals={false} tick={axisTick} /><Tooltip {...tooltipStyle} /><Legend wrapperStyle={{ fontSize: 11 }} />
                  {stats.traits.map((t) => <Line key={t.code} dataKey={t.code} name={t.name} stroke={TRAIT_COLORS[t.code]} dot={false} animationDuration={800} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
      </div>

      {stats.hw_by_n.length > 0 && (
        <Reveal>
          <Card title="Uncertainty vs questions answered" subtitle="Average 90% range (± score points) for sessions that finished after n questions. It should fall as n grows.">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={stats.hw_by_n}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="n" tick={axisTick} /><YAxis domain={[0, 'auto']} tick={axisTick} />
                  <Tooltip {...tooltipStyle} formatter={(v, name) => [name === 'sessions' ? v : `±${Number(v).toFixed(2)}`, name === 'sessions' ? 'Sessions' : 'Avg range']} />
                  <Line dataKey="avg_half_width" stroke="#007aff" strokeWidth={2} dot animationDuration={800} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>
      )}

      <Reveal>
        <Card title="Using this data responsibly">
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Only sessions where the person ticked the consent box are stored, and nothing identifying (name, email, IP) is collected.</li>
            <li>This dashboard is aggregate-only. There is no view of an individual&apos;s answers or profile.</li>
            <li>Use segments to choose tone and message, not to exclude, price-discriminate against, or manipulate people.</li>
            <li>Real segments from a small user base are noisy. Treat differences as hypotheses and test them.</li>
          </ul>
        </Card>
      </Reveal>
    </div>
  )
}
