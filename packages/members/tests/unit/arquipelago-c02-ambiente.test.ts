import { describe, expect, test } from 'bun:test'
import { PYTHON_PROJECT_MISSION_FEATURE } from '@sistemazero/core/studio/python-runtime-features'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { ManifestoDeDesafiosSchema } from '../../../arquipelago-contracts/src/desafios'
import { CURADORIA_DO_DESAFIO_PYTHON } from '../../src/application/arquipelago/arquipelago-objectives.service'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { loadStudioAuthoringPolicy } from '../../src/infrastructure/config/studio-authoring-policy'

/**
 * C02 (30/10/2026): os projetos Python do Recife e do Pico apontam para uma release que o
 * catálogo PUBLICADO aceita. `022e5b54…` é o `STUDIO_AUTHORING_POLICY_SHA256` de staging e
 * produção desde a onda de 29/10/2026; quando ele mudar, troque aqui e confira os manifestos.
 * A mesma autorização do `PythonProjectCheckerService` (executar com a curadoria do desafio e a
 * release com verificação de objetivos). A execução real é a do `desafios-python-smoke.ts`.
 */
const CATALOGO_PUBLICADO = '022e5b54bce19be4a83b90fad0049b8d951e0d88d9e9cdb2eb6a896bf17544d8'
const raiz = new URL('../../../../docs/desafios-do-jogo/', import.meta.url)
const ARQUIVOS = [
  'recife/recife-python',
  'recife/recife-python-adulto',
  'pico/pico-python',
  'pico/pico-python-adulto',
]

async function politica(projeto: StudioProjectDocument) {
  const autoria = await loadStudioAuthoringPolicy({
    STUDIO_AUTHORING_POLICY_SHA256: CATALOGO_PUBLICADO,
  })
  if (!autoria) throw new Error('Catálogo publicado ausente')
  const configuracao = autoria.describe()
  return createStudioRuntimePolicy(
    configuracao,
    createStudioRuntimeHosts(configuracao.catalog, [
      { runtime: projeto.runtime, origin: 'https://runtime.example' },
    ]),
  )
}

function autorizar(policy: Awaited<ReturnType<typeof politica>>, projeto: StudioProjectDocument) {
  const decisao = policy.authorize({
    project: studioRuntimeSubject(projeto),
    curation: CURADORIA_DO_DESAFIO_PYTHON,
    operation: 'execute',
    grantedCapabilities: ['edit', 'execute'],
  })
  return decisao.catalog.releases.find(
    (release) => release.manifestSha256 === projeto.runtime.manifestSha256,
  )
}

describe('C02: o ambiente Python dos desafios no catálogo publicado', () => {
  for (const arquivo of ARQUIVOS)
    test(arquivo, async () => {
      const manifesto = ManifestoDeDesafiosSchema.parse(
        await Bun.file(new URL(`${arquivo}.manifesto.json`, raiz)).json(),
      )
      expect(manifesto.desafios.length).toBeGreaterThan(0)
      for (const desafio of manifesto.desafios)
        for (const projeto of [desafio.conteudo.projetoInicial, desafio.conteudo.gabarito]) {
          const documento = projeto as StudioProjectDocument
          const release = autorizar(await politica(documento), documento)
          expect(release?.manifest.python?.features).toContain(PYTHON_PROJECT_MISSION_FEATURE)
        }
    })

  test('a release só da prova local é recusada', async () => {
    const manifesto = ManifestoDeDesafiosSchema.parse(
      await Bun.file(new URL('recife/recife-python.manifesto.json', raiz)).json(),
    )
    const original = manifesto.desafios[0]?.conteudo.gabarito as StudioProjectDocument
    const policy = await politica(original)
    const antigo = structuredClone(original) as StudioProjectDocument & {
      runtime: { releaseId: string; manifestSha256: string }
    }
    antigo.runtime = {
      ...antigo.runtime,
      releaseId: '2026-10-30-c02-qa',
      manifestSha256: 'e99427f77021904702977f086ff9f9476607d91039da736251c074fe735a3f7a',
    }
    expect(() => autorizar(policy, antigo)).toThrow()
  })
})
