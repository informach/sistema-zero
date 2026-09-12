import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type ExplorationActivity,
  experienceAnswers,
  initialExperience,
  stepExperience,
} from '../../../packages/core/src/learning'

const results = []
for (const mission of ['impulse', 'spawn', 'hitbox'] as const) {
  const activity: ExplorationActivity = { type: 'exploration', version: 3, mission }
  let session = initialExperience(activity)
  const times: number[] = []
  let maxBytes = 0
  for (let i = 0; i < 10000; i++) {
    const start = performance.now()
    session = stepExperience(
      activity,
      session,
      mission === 'hitbox'
        ? { type: 'move', distance: 20 + (i % 240) }
        : { type: 'advance', seconds: 0.04 },
    ).session
    times.push(performance.now() - start)
    if (i % 100 === 0)
      maxBytes = Math.max(
        maxBytes,
        new TextEncoder().encode(
          JSON.stringify(
            experienceAnswers(activity, {
              session,
              sequence: i + 1,
              sessionId: 'benchmark-session',
              segmentId: `benchmark-${i}`,
            }),
          ),
        ).byteLength,
      )
  }
  times.sort((a, b) => a - b)
  results.push({
    mission,
    commands: times.length,
    medianMs: times[5000],
    p95Ms: times[9500],
    maxCheckpointBytes: maxBytes,
  })
}
const result = {
  date: new Date().toISOString(),
  runtime: `Bun ${Bun.version}`,
  scope:
    'Local pure runtime only; excludes DOM, rendering, disk and network. Not device or child testing.',
  results,
}
writeFileSync(
  resolve(import.meta.dir, 'v6-runtime-benchmark.json'),
  `${JSON.stringify(result, null, 2)}\n`,
)
console.log(JSON.stringify(result, null, 2))
