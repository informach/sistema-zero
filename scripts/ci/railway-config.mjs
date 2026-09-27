import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const railwayCliVersion = '5.62.1'
export const railwayEnvironments = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
}
const applicationNames = new Set([
  'admin',
  'api-gateway',
  'auth',
  'catalog',
  'community',
  'community-kids',
  'fiscal',
  'funnel',
  'helpdesk',
  'helpdesk-app',
  'hub',
  'marketing',
  'marketing-app',
  'members',
  'messaging',
  'payments',
  'referrals',
])

export function validatePinnedPlan(plan, environment, tree) {
  if (!Object.hasOwn(railwayEnvironments, environment)) throw new Error('Ambiente desconhecido')
  if (
    plan.kind !== 'railway.config.plan' ||
    plan.version !== 1 ||
    plan.cliVersion !== railwayCliVersion
  ) {
    throw new Error('Formato ou versão do plano inesperados')
  }
  if (plan.environmentId !== railwayEnvironments[environment])
    throw new Error('Plano de outro ambiente')
  if (!/^[a-f0-9]{40}$/.test(tree) || plan.sourceTree !== tree)
    throw new Error('Árvore .railway divergente')
  if (!plan.configEtag || !plan.changeSetHash || !Array.isArray(plan.changeSet?.changes)) {
    throw new Error('Plano incompleto')
  }
  if (plan.destructive || plan.claim || plan.changeSet.partial)
    throw new Error('Operação não permitida no deploy automático')
  for (const change of plan.changeSet.changes) {
    const name = change.address?.replace(/^service\./, '')
    if (
      change.kind !== 'resource.update' ||
      change.severity !== 'safe' ||
      !change.address?.startsWith('service.') ||
      !applicationNames.has(name) ||
      !['build', 'deploy', 'source'].includes(change.field) ||
      !change.after
    ) {
      throw new Error(`Mudança fora do escopo automático: ${change.summary ?? change.kind}`)
    }
    // Alterações de origem não podem habilitar autodeploy em staging ou no Fiscal.
    if (
      change.field === 'source' &&
      (environment !== 'production' ||
        name === 'fiscal' ||
        change.after.type !== 'github' ||
        change.after.repo !== 'informach/sistema-zero' ||
        (change.after.branch && change.after.branch !== 'main') ||
        change.after.checkSuites !== true)
    ) {
      throw new Error('Origem ou gatilho de deploy inesperado')
    }
  }
  return plan.changeSet.changes.length
}

export function runConfig(command, environment, planPath) {
  if (
    !['plan', 'apply'].includes(command) ||
    !planPath ||
    !Object.hasOwn(railwayEnvironments, environment)
  ) {
    throw new Error(
      'Uso: node scripts/ci/railway-config.mjs <plan|apply> <staging|production> <plano.json>',
    )
  }
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
  if (git('status', '--porcelain', '--', '.railway'))
    throw new Error('A configuração precisa estar commitada e limpa')
  const tree = git('rev-parse', 'HEAD:.railway')
  const env = { ...process.env }
  // O secret existente é um token de conta, usado como Bearer no deploy legado.
  // A CLI chama esse tipo de credencial de RAILWAY_API_TOKEN.
  if (env.RAILWAY_API_TOKEN) delete env.RAILWAY_TOKEN
  const railway = (...args) => execFileSync('railway', args, { stdio: 'inherit', env })
  railway(
    'link',
    '--project',
    '415d5a1c-5f75-432c-8445-b395d0977ce3',
    '--environment',
    railwayEnvironments[environment],
  )
  if (command === 'plan') railway('config', 'plan', '--out', planPath)
  const plan = JSON.parse(readFileSync(planPath, 'utf8'))
  const changes = validatePinnedPlan(plan, environment, tree)
  console.log(`${environment}: plano validado, ${changes} alterações, árvore ${tree}`)
  if (command === 'apply') {
    railway('config', 'apply', '--plan', planPath, '--yes')
    railway('config', 'plan', '--detailed-exit-code')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runConfig(...process.argv.slice(2))
}
