import { readFileSync } from 'node:fs'

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const paths = []
function walk(value) {
  if (!value || typeof value !== 'object') return
  if (value.name === 'startup-trace-1' && value.path) paths.push(value.path)
  for (const item of Object.values(value)) walk(item)
}
walk(report)
for (const path of paths) {
  const events = JSON.parse(readFileSync(path, 'utf8')).traceEvents
  const groups = new Map()
  for (const event of events) {
    if (event.name !== 'ProfileChunk') continue
    const key = `${event.pid}/${event.id}`
    if (!groups.has(key)) groups.set(key, { nodes: new Map(), time: new Map() })
    const group = groups.get(key)
    const data = event.args.data
    for (const node of data.cpuProfile.nodes ?? []) group.nodes.set(node.id, node)
    for (const [index, sample] of (data.cpuProfile.samples ?? []).entries())
      group.time.set(sample, (group.time.get(sample) ?? 0) + (data.timeDeltas[index] ?? 0))
  }
  console.log(
    JSON.stringify({
      path,
      groups: [...groups].map(([id, group]) => ({
        id,
        ms: [...group.time.values()].reduce((a, b) => a + b, 0) / 1000,
        jsParents: (() => {
          const totals = new Map()
          for (const [leaf, us] of group.time) {
            let node = group.nodes.get(leaf)
            while (node && (node.callFrame.codeType !== 'JS' || !node.callFrame.url))
              node = group.nodes.get(node.parent)
            if (!node) continue
            const key = `${node.callFrame.functionName}:${node.callFrame.url}:${node.callFrame.columnNumber}`
            totals.set(key, (totals.get(key) ?? 0) + us)
          }
          return [...totals].sort((a, b) => b[1] - a[1]).slice(0, 10)
        })(),
        top: [...group.time]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([node, us]) => ({ us, frame: group.nodes.get(node)?.callFrame })),
      })),
    }),
  )
}
