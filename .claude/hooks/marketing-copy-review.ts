import { readFileSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { lintLightCopy } from '../../.agents/skills/revisao-copy/scripts/check-copy'

const PROJECT_ROOT = resolve(import.meta.dir, '../..')

function isInside(root: string, target: string): boolean {
  const local = relative(root, target)
  return local !== '' && local !== '..' && !local.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(local)
}

function context(message: string) {
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: message,
    },
  }
}

export function reviewEvent(event: unknown, root = PROJECT_ROOT) {
  if (!event || typeof event !== 'object') return null
  const input = event as Record<string, unknown>
  if (input.hook_event_name !== 'PostToolUse') return null
  if (!['Write', 'Edit', 'MultiEdit'].includes(String(input.tool_name))) return null
  const params = input.tool_input
  if (!params || typeof params !== 'object') return null
  const filePath = (params as Record<string, unknown>).file_path
  if (typeof filePath !== 'string' || !filePath) return null
  const cwd = typeof input.cwd === 'string' ? input.cwd : root
  const target = resolve(cwd, filePath)
  if (!isInside(root, target)) return null
  const local = relative(root, target).replace(/\\/g, '/').toLowerCase()
  const source = /^packages\/funnel\/src\/(content|funnels|components\/funnel|pages|islands)\/.+\.(astro|tsx|ts)$/u.test(local)
    || /^packages\/marketing\/src\/domain\/copy\/.+\.ts$/u.test(local)
    || /^packages\/marketing-app\/src\/(app|components)\/.+\.(tsx|ts)$/u.test(local)
  const document = /^docs\/marketing\/.+\.(md|txt)$/u.test(local)
    || /^docs\/(?:superpowers\/)?plans\/[^/]*(?:copy|pesquisa|funil)[^/]*\.md$/u.test(local)
  if (!source && !document) return null

  const reminder = 'Revise a copy alterada com a skill revisao-copy: voz local, argumento, evidência e coerência com a oferta. O hook não valida promessas nem conversão.'
  const cleanCopy = /^docs\/marketing\/.+\/copy\/[^/]+\.(md|txt)$/u.test(local)
  if (!cleanCopy) return context(reminder)

  try {
    // Verifica o arquivo completo após Edit e impede leitura fora do projeto via link.
    const realRoot = realpathSync(root)
    const realTarget = realpathSync(target)
    if (!isInside(realRoot, realTarget)) return null
    const issues = lintLightCopy(readFileSync(realTarget, 'utf8'))
    if (issues.length === 0) return context(`Sem ocorrências mecânicas no texto comercial. ${reminder}`)
    const details = issues.map((issue) => `${issue.rule}. ${issue.label}: ${issue.fix}`).join('\n')
    return context(`Ocorrências para revisar no texto comercial:\n${details}\n${reminder}`)
  } catch {
    return context(`Não foi possível ler o arquivo salvo; revisão mecânica não executada. ${reminder}`)
  }
}

if (import.meta.main) {
  try {
    const output = reviewEvent(JSON.parse(await Bun.stdin.text()))
    if (output) console.log(JSON.stringify(output))
  } catch {
    // Hook consultivo: entrada inválida não interrompe uma edição.
  }
}
