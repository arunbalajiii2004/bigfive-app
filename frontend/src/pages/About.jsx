import { LargeTitle } from '../components/LargeTitle.jsx'
import { Card, Reveal } from '../components/ui.jsx'

const BLOCKS = [
  ['How it works', [
    'The full Big-Five questionnaire has 50 statements. A neural network was trained on about 600,000 real, cleaned responses to guess your five trait scores from only some of them.',
    'It learned by repeatedly hiding random answers and predicting the full scores anyway, so it works with whatever you have answered so far. The questions are asked in an order chosen to be the most informative first.',
  ]],
  ['What the ranges mean', [
    'Five networks are trained independently and their disagreement, plus the noise they expect, gives a 90% range for each score. It was checked on held-out data: the ranges cover the true score about as often as they claim.',
    'The range narrows as you answer. When every range is narrow enough the app tells you your estimate is precise. You can still keep going.',
  ]],
  ['How accurate is it?', [
    'With about 15 well-chosen questions the estimate captures roughly 83% of the variance of the full 50-question scores, and about 88% with 20. Picking the questions well matters a lot: random questions reach only about 73% at 15.',
    'Profiles are soft groupings, not types. Most people sit between two or more, which is why you see a percentage for each.',
  ]],
  ['Your data', [
    'Nothing is stored unless you tick the consent box on the first screen. If you do, only your anonymous answers and results are kept for research and for an aggregate dashboard. No name, email or IP address is collected.',
  ]],
  ['Limits', [
    'This estimates your self-reported Big-Five scores. It is not a clinical or diagnostic tool and it does not predict behaviour. The training data came from a self-selected online sample, so it does not represent everyone equally.',
  ]],
]

export default function About() {
  return (
    <div className="mx-auto max-w-2xl">
      <LargeTitle>About</LargeTitle>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">What is under the hood, in plain language.</p>
      <div className="mt-8 space-y-4">
        {BLOCKS.map(([title, paras], i) => (
          <Reveal key={title} delay={i * 0.03}>
            <Card title={title}>
              <div className="space-y-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                {paras.map((p) => <p key={p}>{p}</p>)}
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
