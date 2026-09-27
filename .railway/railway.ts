import { readdirSync, readFileSync } from 'node:fs'
import {
  type BuildConfig,
  type DeployConfig,
  defineRailway,
  github,
  image,
  postgres,
  project,
  service,
  volume,
} from 'railway/iac'
import { preservedVariables } from './variables.ts'

const projectId = '415d5a1c-5f75-432c-8445-b395d0977ce3'
const environmentIds: Record<string, string> = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
}

const rootServices = new Set([
  'catalog',
  'payments',
  'api-gateway',
  'auth',
  'messaging',
  'community',
  'funnel',
  'members',
  'admin',
  'community-kids',
])

const productionDomains: Record<string, Array<{ domain: string; port?: number }>> = {
  admin: [{ domain: 'admin.sistemazero.com.br' }],
  community: [{ domain: 'comunidade.sistemazero.com.br', port: 3007 }],
  'community-kids': [{ domain: 'kids.sistemazero.com.br', port: 3008 }],
  funnel: [{ domain: 'sistemazero.com.br', port: 4321 }],
  'marketing-app': [{ domain: 'marketing.sistemazero.com.br', port: 3012 }],
  'helpdesk-app': [{ domain: 'atendimento.sistemazero.com.br', port: 3014 }],
}

export default defineRailway((ctx) => {
  const environment = ctx.environment ?? ''
  if (ctx.projectId !== projectId || environmentIds[environment] !== ctx.environmentId) {
    throw new Error('Selecione staging ou production do projeto sistema-zero antes de aplicar')
  }
  const production = environment === 'production'
  const directory = new URL('./services/', import.meta.url)
  const apps = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const name = file.slice(0, -5)
      const config = JSON.parse(readFileSync(new URL(file, directory), 'utf8')) as {
        build: BuildConfig
        deploy: DeployConfig
      }
      return service(name, {
        // Staging publica pelo CI. O Fiscal mantém seu deploy manual em produção.
        source: github('informach/sistema-zero', {
          ...(rootServices.has(name) ? { rootDirectory: '/' } : {}),
          ...(production && name !== 'fiscal' ? { branch: 'main', checkSuites: true } : {}),
        }),
        build: config.build,
        deploy: config.deploy,
        replicas: { 'us-west2': 1 },
        domains: production ? productionDomains[name] : undefined,
        env: preservedVariables(environment, name),
      })
    })

  // Recursos já existentes. Não há criação, troca de imagem ou mudança de volume.
  const database = postgres('Postgres', { region: 'us-west2' })
  database.networking = { privateNetworkEndpoint: 'postgres' }
  const volumeConfig = {
    alerts: { usage: { '80': {}, '95': {}, '100': {} } },
    allowOnlineResize: true,
    region: 'us-west2',
    sizeMB: 50000,
  }
  const postgresVolume = volume('postgres-volume', volumeConfig)
  const evolutionVolume = volume('evolution-api-volume', volumeConfig)
  const evolution = service('evolution-api', {
    source: image('evoapicloud/evolution-api:v2.3.7'),
    replicas: { 'us-west2': 1 },
    volumeMounts: { '/evolution/instances': evolutionVolume },
    env: preservedVariables(environment, 'evolution-api'),
  })

  return project('sistema-zero', {
    resources: [...apps, database, evolution, postgresVolume, evolutionVolume],
  })
})
