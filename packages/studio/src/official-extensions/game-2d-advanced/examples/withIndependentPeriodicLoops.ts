import type { ExtensionExample } from '#extensions'
import type { JSStatement } from '#ir'

function isAdvancedPeriodicLoop(
  statement: JSStatement,
): statement is Extract<JSStatement, { type: 'gk:everySeconds' }> {
  return statement.type === 'gk:everySeconds'
}

/** Eleva “A cada N segundos” para uma raiz de loop própria. */
export function withIndependentPeriodicLoops(example: ExtensionExample): ExtensionExample {
  const lifted: JSStatement[] = []
  const roots = example.ir.behavior.loops.map((root): JSStatement => {
    if (root.type !== 'gk:onUpdate') return root
    const periodic = root.body.filter(isAdvancedPeriodicLoop)
    if (periodic.length === 0) return root
    lifted.push(...periodic)
    return { ...root, body: root.body.filter((statement) => !isAdvancedPeriodicLoop(statement)) }
  })
  return {
    ...example,
    ir: { ...example.ir, behavior: { ...example.ir.behavior, loops: [...roots, ...lifted] } },
  }
}
