import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { stagingJourney, uuidPattern } from '../release/kids-journey-bootstrap.mjs'
import { railwayReadQuery } from './railway-read-query.mjs'

export const ARQUIPELAGO_SERVICE_ID = 'ee19a264-7708-471a-adf9-c9db1cfdb9a2'
const SHA = /^[a-f0-9]{40}$/

/** Um serviço novo só pode ser iniciado sem histórico; uma tentativa inconclusa exige revisão. */
export async function classifyArquipelagoInventory(data, sha, isAncestor) {
  if (!SHA.test(sha)) throw new Error('SHA de staging inválido')
  const active = data?.serviceInstance?.activeDeployments
  const pending = data?.pending
  const history = data?.history
  if (
    !Array.isArray(active) ||
    !Array.isArray(pending?.edges) ||
    pending.pageInfo?.hasNextPage !== false ||
    !Array.isArray(history?.edges) ||
    typeof history.pageInfo?.hasNextPage !== 'boolean'
  )
    throw new Error('Inventário do Arquipélago incompleto')
  if (pending.edges.length) throw new Error('Já existe deployment do Arquipélago em andamento')
  if (active.length === 0) {
    if (history.edges.length || history.pageInfo.hasNextPage)
      throw new Error('Primeira implantação exige revisão do histórico')
    return 'initial'
  }
  if (active.length !== 1) throw new Error('Deploy ativo do Arquipélago não é único')
  const current = active[0]
  if (
    !uuidPattern.test(current?.id ?? '') ||
    current.status !== 'SUCCESS' ||
    current.projectId !== stagingJourney.project ||
    current.environmentId !== stagingJourney.environment ||
    current.serviceId !== ARQUIPELAGO_SERVICE_ID ||
    !SHA.test(current.meta?.commitHash ?? '') ||
    !(await isAncestor(current.meta.commitHash, sha))
  )
    throw new Error('Deploy ativo do Arquipélago não é verificável')
  return `ready:${current.id}`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sha = process.argv[2]
  const input = {
    projectId: stagingJourney.project,
    environmentId: stagingJourney.environment,
    serviceId: ARQUIPELAGO_SERVICE_ID,
  }
  const data = await railwayReadQuery(
    'query($s:String!,$e:String!,$pending:DeploymentListInput!,$history:DeploymentListInput!){serviceInstance(serviceId:$s,environmentId:$e){activeDeployments{id status projectId environmentId serviceId meta}} pending:deployments(input:$pending,first:1){edges{node{id}} pageInfo{hasNextPage}} history:deployments(input:$history,first:1){edges{node{id}} pageInfo{hasNextPage}}}',
    {
      s: ARQUIPELAGO_SERVICE_ID,
      e: stagingJourney.environment,
      pending: {
        ...input,
        status: { notIn: ['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED', 'SKIPPED'] },
      },
      history: input,
    },
    { token: process.env.RAILWAY_TOKEN, deadline: performance.now() + 60_000 },
  )
  const result = await classifyArquipelagoInventory(data, sha, async (oldSha, newSha) => {
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', oldSha, newSha], { stdio: 'ignore', timeout: 5_000 })
      return true
    } catch {
      return false
    }
  })
  console.log(result)
}
