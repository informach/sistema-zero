import { authorize, type Run, type ToolDefinition } from '@sistemazero/agent-core'
import { z } from 'zod'
import type { Dispatcher } from '../execution/dispatcher'
import { tool } from './definition'

const basics = new Set([
  'capability_search',
  'file_read',
  'file_find',
  'directory_list',
  'text_search',
  'file_patch',
  'process_run',
  'project_checks',
  'project_check_run',
  'task_question',
  'context_rules',
  'artifact_read',
  'web_search',
  'web_fetch',
  'skills_list',
  'memory_search',
])
export function availableTools(dispatcher: Dispatcher, run: Run) {
  return [...dispatcher.tools.values()].filter((item) => authorize(run, item.definition) !== 'deny')
}
export function selectTools(dispatcher: Dispatcher, run: Run, discovered: string[]) {
  const available = availableTools(dispatcher, run)
  if (available.length <= 24) return available
  const selected = available.filter((item) => basics.has(item.definition.name))
  const terms = run.input.toLocaleLowerCase().match(/[\p{L}\p{N}_-]{4,}/gu) ?? []
  const score = (item: ToolDefinition) =>
    terms.reduce(
      (sum, term) =>
        sum +
        (item.definition.name.includes(term) ? 3 : 0) +
        (item.definition.description.toLocaleLowerCase().includes(term) ? 1 : 0),
      0,
    )
  const extra = available
    .filter((item) => !basics.has(item.definition.name))
    .sort((a, b) => {
      const left = discovered.indexOf(a.definition.name),
        right = discovered.indexOf(b.definition.name)
      return (
        (right < 0 ? 0 : 100 - right) - (left < 0 ? 0 : 100 - left) ||
        score(b) - score(a) ||
        a.definition.name.localeCompare(b.definition.name)
      )
    })
  return [...selected, ...extra.slice(0, 24 - selected.length)]
}
export function registerCatalog(dispatcher: Dispatcher) {
  dispatcher.register(
    tool(
      'capability_search',
      'Find capabilities by name/description (browser, team, workflow, environment, staff, MCP). Returns up to eight authorized names; their full schemas become available on the next model step. Discovery never expands permissions. Use offset for more.',
      'read',
      z.object({
        query: z.string().max(200),
        offset: z.number().int().min(0).max(10000).default(0),
      }),
      async (input, context) => {
        const terms = input.query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
        const candidates = availableTools(dispatcher, context.run)
          .filter((item) =>
            terms.every((term) =>
              (item.definition.name + ' ' + item.definition.description)
                .toLocaleLowerCase()
                .includes(term),
            ),
          )
          .sort((a, b) => a.definition.name.localeCompare(b.definition.name))
        return {
          tools: candidates.slice(input.offset, input.offset + 8).map((item) => ({
            name: item.definition.name,
            description: item.definition.description,
            effect: item.definition.effect,
          })),
          total: candidates.length,
          nextOffset: input.offset + 8 < candidates.length ? input.offset + 8 : undefined,
        }
      },
    ),
  )
}
