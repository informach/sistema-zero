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
  'live-recorder',
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
  // A CLI marca claim também para a definição única do projeto, sem mudanças.
  // Partials nomeadas não fazem parte deste repositório.
  if (plan.destructive || plan.changeSet.partial)
    throw new Error('Operação não permitida no deploy automático')
  for (const change of plan.changeSet.changes) {
    const name = change.address?.replace(/^service\./, '')
    if (
      change.kind !== 'resource.update' ||
      change.severity !== 'safe' ||
      !change.address?.startsWith('service.') ||
      !applicationNames.has(name) ||
      !['build', 'deploy'].includes(change.field) ||
      !change.after
    ) {
      throw new Error(`Mudança fora do escopo automático: ${change.summary ?? change.kind}`)
    }
  }
  return plan.changeSet.changes.length
}

export function runConfig(command, environment, planPath, exec = execFileSync) {
  if (
    !['plan', 'apply', 'check'].includes(command) ||
    !planPath ||
    !Object.hasOwn(railwayEnvironments, environment)
  ) {
    throw new Error(
      'Uso: node scripts/ci/railway-config.mjs <plan|apply|check> <staging|production> <plano.json>',
    )
  }
  const git = (...args) => exec('git', args, { encoding: 'utf8' }).trim()
  if (git('status', '--porcelain', '--', '.railway'))
    throw new Error('A configuração precisa estar commitada e limpa')
  const tree = git('rev-parse', 'HEAD:.railway')
  const env = { ...process.env }
  // IaC must use the explicit link below, not the application's runtime context.
  // CLI 5.62.1 clears linked.environment_name when ENVIRONMENT_ID overrides it;
  // the TypeScript evaluator then receives ctx.environment=null despite link.
  // These IDs remain in the parent for rollout ports; only this child is scoped.
  for (const key of ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_SERVICE_ID'])
    delete env[key]
  // O SDK usa `_` como executável para conferir a CLI. No runner ele pode
  // apontar para bash/node; sem a variável, o SDK resolve railway pelo PATH.
  delete env._
  // O secret existente é um token de conta, usado como Bearer no deploy legado.
  // A CLI chama esse tipo de credencial de RAILWAY_API_TOKEN.
  if (env.RAILWAY_API_TOKEN) delete env.RAILWAY_TOKEN
  const railway = (...args) => exec('railway', args, { stdio: 'inherit', env })
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
  if (environment === 'production' && command !== 'plan') validateProductionRolloutPlan(plan)
  console.log(`${environment}: plano validado, ${changes} alterações, árvore ${tree}`)
  if (command === 'apply' || command === 'check') {
    // Na CLI 5.62.1, claim=true ainda envia uma aplicação com changes=[].
    // O deploy de aplicações não deve reaplicar a posse de toda a infraestrutura.
    if (changes > 0 && command === 'apply') railway('config', 'apply', '--plan', planPath, '--yes')
    else console.log(`${environment}: sem alterações; conferindo o estado remoto sem apply`)
    // Inclusive no plano vazio: uma divergência surgida depois do plano bloqueia o deploy.
    railway('config', 'plan', '--detailed-exit-code')
  }
}

/** CLI config apply can deploy every changed service before the backend barrier. */
export function validateProductionRolloutPlan(plan) {
  if (
    plan.environmentId !== railwayEnvironments.production ||
    !Array.isArray(plan.changeSet?.changes)
  )
    throw new Error('Plano de produção inválido')
  if (plan.changeSet.changes.length !== 0)
    throw new Error(
      'Plano real não vazio exige onda operacional de configuração por fase; nenhum apply permitido',
    )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runConfig(...process.argv.slice(2))
}
