import { describe, expect, test } from 'bun:test'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { ValidationError } from '@sistemazero/core/errors'
import { StudioArquipelagoRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { ManifestoDeDesafiosSchema } from '../../../arquipelago-contracts/src/desafios'
import { ArquipelagoRuntimeService } from '../../src/application/arquipelago/arquipelago-runtime.service'
import { AccessDeniedError } from '../../src/domain/entitlement/entitlement.errors'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { loadStudioAuthoringPolicy } from '../../src/infrastructure/config/studio-authoring-policy'

/**
 * C02b (30/10/2026): o ambiente Python do Estúdio de desafio do jogo, com o catálogo PUBLICADO
 * (o mesmo seletor de staging e produção) e a política de runtime de verdade. O projeto aberto é o
 * inicial do Recife com o id do rascunho, como o diálogo do jogo abre.
 */
const CATALOGO_PUBLICADO = '022e5b54bce19be4a83b90fad0049b8d951e0d88d9e9cdb2eb6a896bf17544d8'
const RASCUNHO = 'arquipelago-desafio-rascunho'
const DESAFIO = '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b'
const JOGADOR = '0b7c5a1e-2d3f-4a5b-8c6d-7e8f9a0b1c2d'
const CONTA = '1c8d6b2f-3e4a-4b5c-9d7e-8f9a0b1c2d3e'

async function cenario() {
  const manifesto = ManifestoDeDesafiosSchema.parse(
    await Bun.file(
      new URL(
        '../../../../docs/desafios-do-jogo/recife/recife-python.manifesto.json',
        import.meta.url,
      ),
    ).json(),
  )
  const inicial = manifesto.desafios[0]?.conteudo.projetoInicial as StudioProjectDocument
  const autoria = await loadStudioAuthoringPolicy({
    STUDIO_AUTHORING_POLICY_SHA256: CATALOGO_PUBLICADO,
  })
  if (!autoria) throw new Error('Catálogo publicado ausente')
  const configuracao = autoria.describe()
  const politica = await createStudioRuntimePolicy(
    configuracao,
    createStudioRuntimeHosts(configuracao.catalog, [
      { runtime: inicial.runtime, origin: 'https://runtime.example' },
    ]),
  )
  const aberto = { ...structuredClone(inicial), id: RASCUNHO } as StudioProjectDocument
  const subject = studioRuntimeSubject(aberto)
  const pedido = {
    operation: 'analyze' as const,
    revision: await sha256Hex(canonicalJson(subject)),
    subject,
    context: {
      kind: 'arquipelago' as const,
      audience: 'kids' as const,
      desafioId: DESAFIO,
      revisao: 3,
      projectId: RASCUNHO,
    },
  }
  const servico = new ArquipelagoRuntimeService(politica, () => 1_000)
  const entrada = {
    requester: JOGADOR,
    accountId: CONTA,
    audience: 'kids' as const,
    projetoInicial: inicial,
    pedido,
  }
  return { inicial, servico, pedido, entrada }
}

describe('ArquipelagoRuntimeService', () => {
  test('autoriza analisar e executar o inicial do desafio, sem exportar nem publicar', async () => {
    const { servico, entrada, pedido, inicial } = await cenario()
    for (const operation of ['analyze', 'execute'] as const) {
      const decisao = await servico.autorizar({ ...entrada, pedido: { ...pedido, operation } })
      expect(StudioArquipelagoRuntimeDecisionSchema.parse(decisao)).toEqual(decisao)
      expect(decisao.actor).toEqual({ userId: JOGADOR, accountId: CONTA })
      expect(decisao.context).toEqual(pedido.context)
      expect(decisao.operation).toBe(operation)
      expect(decisao.runtime).toEqual(inicial.runtime)
      // Analisar só concede editar; executar concede executar e pausar (regra da política).
      expect(decisao.capabilities).toContain(operation === 'analyze' ? 'edit' : 'execute')
      expect(decisao.capabilities.every((c) => ['edit', 'execute', 'pause'].includes(c))).toBe(true)
      expect(decisao.grantedExtensionIds).toEqual(inicial.installedExtensions.map(({ id }) => id))
      expect(decisao.frame.url).toBe(
        `https://runtime.example/v1/runtimes/${inicial.runtime.manifestSha256}/frame.html`,
      )
      expect(decisao.expiresAt - decisao.issuedAt).toBe(30_000)
    }
  })

  test('recusa outro público, outro ambiente, outro projeto e pedido malformado', async () => {
    const { servico, entrada, pedido } = await cenario()
    await expect(servico.autorizar({ ...entrada, audience: 'adult' })).rejects.toBeInstanceOf(
      AccessDeniedError,
    )
    // Uma extensão que o inicial não tem (o Raylib 3D, que a release aprova) não passa.
    const comExtensaoAMais = {
      ...pedido,
      subject: {
        ...pedido.subject,
        installedExtensions: [
          ...pedido.subject.installedExtensions,
          { id: 'python-raylib-3d', version: '1.0.0' },
        ],
      },
    }
    await expect(
      servico.autorizar({ ...entrada, pedido: comExtensaoAMais }),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    const antigo = {
      ...pedido,
      subject: {
        ...pedido.subject,
        runtime: {
          ...pedido.subject.runtime,
          releaseId: '2026-10-30-c02-qa',
          manifestSha256: 'e99427f77021904702977f086ff9f9476607d91039da736251c074fe735a3f7a',
        },
      },
    }
    await expect(servico.autorizar({ ...entrada, pedido: antigo })).rejects.toBeInstanceOf(
      AccessDeniedError,
    )
    const outroProjeto = { ...pedido, context: { ...pedido.context, projectId: 'outro-projeto' } }
    await expect(servico.autorizar({ ...entrada, pedido: outroProjeto })).rejects.toBeInstanceOf(
      ValidationError,
    )
    const terminal = { ...pedido, operation: 'python-repl' }
    await expect(servico.autorizar({ ...entrada, pedido: terminal })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  test('recusa desafio que não é Python clássico e serviço sem política', async () => {
    const { servico, entrada, inicial } = await cenario()
    const vale = ManifestoDeDesafiosSchema.parse(
      await Bun.file(
        new URL(
          '../../../../docs/desafios-do-jogo/vale/vale-texto.manifesto.json',
          import.meta.url,
        ),
      ).json(),
    )
    await expect(
      servico.autorizar({ ...entrada, projetoInicial: vale.desafios[0]?.conteudo.projetoInicial }),
    ).rejects.toBeInstanceOf(AccessDeniedError)
    await expect(
      servico.autorizar({ ...entrada, projetoInicial: { ...inicial, runtime: 'quebrado' } }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      new ArquipelagoRuntimeService(undefined).autorizar(entrada),
    ).rejects.toBeInstanceOf(AccessDeniedError)
  })
})
