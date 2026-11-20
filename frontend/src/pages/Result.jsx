import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { api, TRAIT_COLORS, axisTick, tooltipStyle } from '../api.js'
import { Card, Chip, GlassButton, PageSkeleton, Reveal, Segmented } from '../components/ui.jsx'
import { LargeTitle } from '../components/LargeTitle.jsx'
import TraitBars from '../components/TraitBars.jsx'
import Rings from '../components/Rings.jsx'
import MembershipBars from '../components/MembershipBars.jsx'
import ContributionBars from '../components/ContributionBars.jsx'
import CountUp from '../components/CountUp.jsx'

const ANSWER_WORD = ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree']

export default function Result() {
  const { sid } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('EXT')
  const [view, setView] = useState('rings')

  useEffect(() => {
    let alive = true
    api.result(sid).then((d) => { if (alive) { setData(d); setTab(d.traits[0].code) } }).catch((e) => alive && setErr(e.message))
    return () => { alive = false }
  }, [sid])

  const radarData = useMemo(() => data?.traits.map((t) => ({ trait: t.name, percentile: t.percentile, lo: t.pct_lo, hi: t.pct_hi })), [data])

  if (err) return (
    <div><p className="text-red-600">{err}</p><Link to="/" className="mt-3 inline-block text-accent underline">Start again</Link></div>
  )
  if (!data) return <PageSkeleton />

  const { traits, memberships, segment } = data
  const hasInt = data.intervals
  const t = traits.find((x) => x.code === tab)
  const rows = (data.explanation[tab] || []).slice(0, 8)
  const top = rows.slice(0, 2)
  const above = t.percentile >= 50
  const topP = memberships[0].p
  const canContinue = data.n_answers < data.max_questions

  return (
    <div className="space-y-4">
      <Reveal className="mb-4">
        <LargeTitle>Your results</LargeTitle>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">
          Estimated from {data.n_answers} questions.
          {data.accuracy.r2 != null && <> Typically that captures about <b><CountUp value={data.accuracy.r2 * 100} decimals={0} suffix="%" /></b> of what the full 50-question test would.</>}
        </p>
        {hasInt && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {data.confident
              ? <Chip tone="green">Precise estimate · typically ±{data.uncertainty.toFixed(2)} points</Chip>
              : <Chip tone="amber">Rough estimate · typically ±{data.uncertainty.toFixed(2)} points</Chip>}
            {canContinue && !data.confident && (
              <button onClick={() => nav('/quiz', { state: { sid } })} className="text-sm font-medium text-accent underline underline-offset-2">
                Answer more questions to narrow the range
              </button>
            )}
          </div>
        )}
      </Reveal>

      <div className="grid gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-3">
          <Card className="h-full" title="Your five traits"
            subtitle={hasInt ? 'Percentile among about 600,000 respondents. The paler arc is the likely range.' : 'Percentile among about 600,000 respondents.'}
            action={<Segmented id="view-seg" value={view} onChange={setView} options={[{ value: 'rings', label: 'Rings' }, { value: 'bars', label: 'Bars' }]} />}>
            {view === 'rings' ? <Rings traits={traits} /> : <TraitBars traits={traits} />}
          </Card>
        </Reveal>

        <Reveal className="md:col-span-3" delay={0.06}>
          <Card className="h-full" title="Shape of your profile" subtitle={hasInt ? 'Percentiles. Dashed lines show the likely range.' : 'Percentiles.'}>
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--grid)" />
                  <PolarAngleAxis dataKey="trait" tick={{ ...axisTick, fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  {hasInt && <Radar name="Upper range" dataKey="hi" stroke="#64d2ff" strokeDasharray="4 3" fill="none" animationDuration={900} dot={false} />}
                  {hasInt && <Radar name="Lower range" dataKey="lo" stroke="#64d2ff" strokeDasharray="4 3" fill="none" animationDuration={900} dot={false} />}
                  <Radar name="Percentile" dataKey="percentile" stroke="#007aff" strokeWidth={2} fill="#007aff" fillOpacity={0.28} animationDuration={900} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `${Math.round(v)}th percentile`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-4">
          <Card className="h-full" title={`Closest profile: ${segment.name}`}
            subtitle="Profiles are soft groupings. Most people sit between them, so memberships add up to 100%.">
            <div className="grid gap-6 md:grid-cols-2">
              <MembershipBars items={memberships} />
              <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <p>{segment.description}</p>
                <p className="mt-3 text-slate-500 dark:text-slate-400">
                  {topP >= 0.6
                    ? `You sit fairly clearly in this profile (${Math.round(topP * 100)}% membership).`
                    : `No single profile dominates (the best is ${Math.round(topP * 100)}%), which is common: personality is a continuum.`}
                  {hasInt && data.n_answers < 15 && ' With more answers the memberships get sharper.'}
                </p>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0.06}>
          <Card className="h-full" title="Precision">
            {hasInt ? (
              <>
                <p className="text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">±<CountUp value={data.uncertainty} /></p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">typical 90% range, in score points (1 to 5 scale)</p>
              </>
            ) : (
              <>
                <p className="text-5xl font-semibold tracking-tight text-slate-900 dark:text-white"><CountUp value={(data.accuracy.r2 ?? 0) * 100} decimals={0} suffix="%" /></p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">of the full test captured</p>
              </>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {hasInt && (data.confident ? <Chip tone="green">Precise</Chip> : <Chip tone="amber">Rough</Chip>)}
              {canContinue && !data.confident && <GlassButton onClick={() => nav('/quiz', { state: { sid } })}>Answer more</GlassButton>}
            </div>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-6">
          <Card title="Why did you get this result?"
            subtitle="For each trait: how far the estimate moves when one of your answers is removed. Bars to the right pushed it up, bars to the left pushed it down.">
            <div className="mb-5 inline-flex flex-wrap gap-1 rounded-[22px] bg-black/5 p-1 dark:bg-white/10">
              {traits.map((x) => (
                <button key={x.code} onClick={() => setTab(x.code)}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === x.code ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>
                  {tab === x.code && (
                    <motion.span layoutId="trait-pill" className="absolute inset-0 rounded-full shadow-sm" style={{ background: TRAIT_COLORS[x.code] }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative">{x.name}</span>
                </button>
              ))}
            </div>

            {top.length > 0 && (
              <p className="mb-4 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                Your {t.name.toLowerCase()} estimate is {above ? 'above' : 'below'} average. The answers that moved it most:{' '}
                {top.map((e, i) => <span key={e.item}>{i > 0 && ' and '}“{e.text}” (you said {ANSWER_WORD[e.answer - 1]})</span>)}.
              </p>
            )}
            <ContributionBars rows={rows} color={TRAIT_COLORS[tab]} />
            <p className="mt-4 text-xs text-slate-400">
              This explains how the model reached its estimate, not why you are the way you are. The effects do not simply add up,
              because the model also uses the way traits tend to go together.
            </p>
          </Card>
        </Reveal>

        <Reveal className="md:col-span-3">
          <Card className="h-full" title="How your estimate settled" subtitle="Scores after each answer: early guesses move a lot, later ones stabilise.">
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={data.trajectory} margin={{ left: -15, right: 8 }}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="n" tick={axisTick} />
                  <YAxis domain={[1, 5]} tick={axisTick} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {traits.map((x) => <Line key={x.code} type="monotone" dataKey={x.code} name={x.name} stroke={TRAIT_COLORS[x.code]} dot={false} strokeWidth={2.5} animationDuration={900} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Reveal>

        {hasInt && (
          <Reveal className="md:col-span-3" delay={0.06}>
            <Card className="h-full" title="How the uncertainty shrank" subtitle="Widest 90% range over the five traits (in score points) after each answer.">
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={data.trajectory} margin={{ left: -15, right: 8 }}>
                    <defs>
                      <linearGradient id="hwfill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007aff" stopOpacity={0.4} /><stop offset="100%" stopColor="#007aff" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="n" tick={axisTick} />
                    <YAxis tick={axisTick} domain={[0, 'auto']} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`±${Number(v).toFixed(2)}`, 'Widest range']} />
                    {data.tau != null && <ReferenceLine y={data.tau} stroke="#34c759" strokeDasharray="5 4" label={{ value: 'precise enough', fill: '#34c759', fontSize: 11, position: 'insideTopRight' }} />}
                    <Area type="monotone" dataKey="hw" stroke="#007aff" strokeWidth={2.5} fill="url(#hwfill)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Reveal>
        )}
      </div>

      <Reveal className="pt-4">
        <p className="text-xs text-slate-400">
          {data.stored ? 'Your anonymous answers were saved for research, as you agreed.' : 'Nothing from this session was saved.'}
          {' '}This is an estimate of self-reported Big-Five scores, not a diagnosis or a prediction of behaviour.
        </p>
        <GlassButton onClick={() => nav('/')} className="mt-4">Take it again</GlassButton>
      </Reveal>
    </div>
  )
}
