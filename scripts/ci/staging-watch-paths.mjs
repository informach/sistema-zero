import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { railwayEnvironments, validatePinnedPlan } from './railway-config.mjs'

// IDs fixos pertencem ao mesmo projeto e ao staging já conferido pelo pipeline.
const serviceIds = {
  'service.admin': 'e00eca0b-5323-4424-9b58-fdb073cfce82',
  'service.community': '9df1b493-4cea-4b36-bec8-7299f054c17d',
  'service.community-kids': 'fc8a1b29-ac14-4dc9-a7b3-03d497b8bf4f',
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Somente listas de caminhos dos três aplicativos; nunca inclui source, segredos ou deploy. */
export function watchPathsPatch(plan, config, tree) {
  validatePinnedPlan(plan, 'staging', tree)
  const services = {}
  for (const change of plan.changeSet.changes) {
    const id = serviceIds[change.address]
    if (!id && !['service.auth', 'service.members'].includes(change.address)) continue
    const before = change.before
    const after = change.after
    if (
      !id ||
      change.field !== 'build' ||
      change.kind !== 'resource.update' ||
      change.severity !== 'safe' ||
      !before ||
      !after ||
      !Array.isArray(change.details) ||
      change.details.length !== 1 ||
      !change.details[0].startsWith('build.watchPatterns (') ||
      !Array.isArray(before.watchPatterns) ||
      !Array.isArray(after.watchPatterns) ||
      !after.watchPatterns.every((pattern) => typeof pattern === 'string') ||
      before.builder !== after.builder ||
      before.dockerfilePath !== after.dockerfilePath ||
      !same(config.services?.[id]?.build?.watchPatterns, before.watchPatterns) ||
      config.services?.[id]?.build?.builder !== before.builder ||
      config.services?.[id]?.build?.dockerfilePath !== before.dockerfilePath ||
      services[id]
    )
      throw new Error('Plano de caminhos não é exclusivo, conhecido ou atual')
    services[id] = { build: { watchPatterns: after.watchPatterns } }
  }
  return { services }
}

export async function reconcileWatchPaths(plan, config, tree, ports) {
  const patch = watchPathsPatch(plan, config, tree)
  const ids = Object.keys(patch.services)
  await ports.assertIdle()
  if (!ids.length) return { count: 0 }
  // O histórico pode demorar a ser consultado: reconfira a base imediatamente antes do POST.
  const fresh = watchPathsPatch(plan, await ports.config(), tree)
  if (!same(fresh, patch)) throw new Error('Plano mudou antes da atualização dos caminhos')
  // Uma única mutação explícita: o Railway não deve lançar aplicações nesta fase.
  const id = await ports.commit({
    environmentId: railwayEnvironments.staging,
    patch,
    skipDeploys: true,
  })
  if (typeof id !== 'string' || !id)
    throw new Error('Railway não confirmou a alteração dos caminhos')
  ports.acknowledged?.(id)
  await ports.wait(id)
  await ports.assertIdle()
  const actual = await ports.config()
  for (const serviceId of ids) {
    if (
      !same(
        actual.services?.[serviceId]?.build?.watchPatterns,
        patch.services[serviceId].build.watchPatterns,
      )
    )
      throw new Error('Caminhos divergiram após a confirmação do Railway')
  }
  return { count: ids.length, patchId: id }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = { ...process.env }
  for (const key of ['RAILWAY_PROJECT_ID', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_SERVICE_ID', '_'])
    delete env[key]
  if (env.RAILWAY_API_TOKEN) delete env.RAILWAY_TOKEN
  const cli = (...args) => {
    try {
      return execFileSync(env.RAILWAY_CLI_EXECUTABLE || 'railway', args, {
        encoding: 'utf8',
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
      })
    } catch {
      // stdout de `environment config` pode conter variáveis: não reproduzir a exceção bruta.
      throw new Error('Não foi possível consultar ou alterar a configuração do Railway')
    }
  }
  const api = (query, variables) =>
    JSON.parse(cli('api', query, '--variables', JSON.stringify(variables), '--compact')).data
  const config = () =>
    JSON.parse(cli('environment', 'config', '--environment', railwayEnvironments.staging, '--json'))
  const tree = execFileSync('git', ['rev-parse', 'HEAD:.railway'], { encoding: 'utf8' }).trim()
  if (execFileSync('git', ['status', '--porcelain', '--', '.railway'], { encoding: 'utf8' }).trim())
    throw new Error('Configuração Railway não está limpa')
  const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  const result = await reconcileWatchPaths(plan, config(), tree, {
    async assertIdle() {
      const staged = api('query($id:String!){environmentStagedChanges(environmentId:$id){id}}', {
        id: railwayEnvironments.staging,
      })
      if (staged?.environmentStagedChanges?.id !== '<empty>')
        throw new Error('Há uma alteração de staging aguardando revisão')
      let after = null
      for (let page = 0; page < 20; page++) {
        const data = api(
          'query($id:String!,$after:String){environmentPatches(environmentId:$id,first:100,after:$after){pageInfo{hasNextPage endCursor} edges{node{status appliedAt}}}}',
          { id: railwayEnvironments.staging, after },
        )
        const patches = data?.environmentPatches
        if (
          !patches ||
          !Array.isArray(patches.edges) ||
          typeof patches.pageInfo?.hasNextPage !== 'boolean'
        )
          throw new Error('Não foi possível conferir as alterações em andamento')
        if (
          patches.edges.some(
            ({ node }) =>
              node?.status === 'APPLYING' || (node?.status === 'COMMITTED' && !node.appliedAt),
          )
        )
          throw new Error('Há uma alteração de staging ainda em andamento')
        if (!patches.pageInfo.hasNextPage) return
        if (!patches.pageInfo.endCursor || patches.pageInfo.endCursor === after)
          throw new Error('Paginação de alterações incompleta')
        after = patches.pageInfo.endCursor
      }
      throw new Error('Histórico de alterações excedeu o limite da conferência')
    },
    async commit(input) {
      return api(
        'mutation($environmentId:String!,$patch:EnvironmentConfig,$skipDeploys:Boolean){environmentPatchCommit(environmentId:$environmentId,patch:$patch,skipDeploys:$skipDeploys)}',
        input,
      )?.environmentPatchCommit
    },
    acknowledged(id) {
      console.log(`Railway confirmou a operação ${id}; aguardando conclusão sem repetir a mutação`)
    },
    async wait(id) {
      const deadline = Date.now() + 120_000
      while (Date.now() < deadline) {
        // O retorno da mutação é o ID do workflow, não o ID do patch da configuração.
        let item
        try {
          item = api('query($id:String!){workflowStatus(workflowId:$id){status}}', {
            id,
          })?.workflowStatus
        } catch {
          // Consulta somente leitura: aguardar indisponibilidade transitória nunca repete o POST.
          await new Promise((resolve) => setTimeout(resolve, 2_000))
          continue
        }
        if (item?.status === 'Complete') return
        if (item?.status === 'Error') throw new Error('Railway não aplicou os caminhos')
        if (!['Running', 'NotFound'].includes(item?.status))
          throw new Error('Estado inesperado da operação')
        await new Promise((resolve) => setTimeout(resolve, 2_000))
      }
      throw new Error('Tempo esgotado aguardando os caminhos do Railway')
    },
    async config() {
      return config()
    },
  })
  console.log(`Staging: ${result.count} caminhos de build reconciliados sem disparar deploys`)
}
