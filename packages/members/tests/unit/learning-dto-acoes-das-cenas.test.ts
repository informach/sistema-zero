import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type InteractiveBlock, isInteractiveBlock } from '@sistemazero/core/learning'
import {
  isSceneAction,
  SCENE_IDS,
  SCENE_PORTS,
  type SceneAction,
  type SceneId,
  sceneScript,
} from '@sistemazero/core/learning/scene'
import { Elysia, getSchemaValidator, t } from 'elysia'
import { InteractiveBlockSchema } from '../../src/interfaces/http/learning.dtos'

/**
 * ⚠️⚠️ Toda AÇÃO de cena que o conteúdo usa atravessa a borda do members sem ser recusada nem PODADA
 * (full review de 16/09/2026, M10).
 *
 * O `learning-dto-conformance.test.ts` confere ~16 blocos escritos à mão, e ação nova do core precisa
 * entrar no TypeBox (`learning.dtos.ts`) no mesmo commit. A lista à mão não cobra isso: uma ação nova
 * que ninguém lembrou de pôr num bloco de exemplo passava. Aqui a lista é GERADA: o roteiro de fábrica
 * das 45 cenas, cada porta ligada e desligada, e as ações dos casos e roteiros dos manifestos v6. Cada
 * uma precisa passar no validador da borda e VOLTAR IGUAL de uma rota com o corpo tipado (o `normalize`
 * do Elysia apaga campo não declarado em silêncio).
 */

const validador = getSchemaValidator(InteractiveBlockSchema)
const app = new Elysia().post('/', ({ body }) => body, {
  body: t.Object({ content: InteractiveBlockSchema }),
})

/** Um bloco de demonstração que carrega as ações como roteiro autoral de uma etapa só. */
function blocoCom(scene: SceneId, actions: SceneAction[]): InteractiveBlock {
  return {
    kind: 'interactive',
    title: 'Ações da cena',
    instructions: 'Olhe a cena.',
    hints: [],
    required: false,
    activity: {
      type: 'demonstration',
      scene,
      script: [{ id: 'etapa', caption: 'A cena mexe.', actions }],
    },
  }
}

/** As ações conhecidas de cada cena: o roteiro de fábrica, as portas e os manifestos v6. */
function acoesConhecidas(): Map<SceneId, SceneAction[]> {
  const porCena = new Map<SceneId, SceneAction[]>(SCENE_IDS.map((scene) => [scene, []]))
  const somar = (scene: SceneId, acao: unknown) => {
    if (isSceneAction(acao, scene)) porCena.get(scene)?.push(acao)
  }
  // As cenas de experimentação novas ainda não têm roteiro de fábrica nem porta.
  // Seus controles são ações reais e precisam atravessar a mesma borda tipada.
  const acoesDosControles: SceneAction[] = [
    { type: 'value-source', source: 'read' },
    { type: 'place-in-area', card: 'paint', area: 'start' },
    { type: 'command-target', subject: 'shot', target: 'group' },
    { type: 'shield', frames: 15 },
    { type: 'step-value', value: -5 },
    { type: 'name-field', name: 'nave' },
    { type: 'nudge', piece: 'crater', amount: 4 },
    { type: 'birth-every', frames: 20 },
    { type: 'export-file' },
    { type: 'publish' },
    { type: 'skin', theme: 'sea' },
  ]
  for (const scene of SCENE_IDS) {
    for (const acao of acoesDosControles) somar(scene, acao)
    for (const passo of sceneScript({ type: 'demonstration', scene }))
      for (const acao of passo.actions) somar(scene, acao)
    for (const port of SCENE_PORTS)
      for (const enabled of [true, false]) somar(scene, { type: 'connect', port, enabled })
  }
  const docs = resolve(import.meta.dir, '../../../../docs/aulas-interativas')
  for (const curso of readdirSync(docs).filter((d) => d.endsWith('-v6'))) {
    for (const aula of readdirSync(resolve(docs, curso), { withFileTypes: true })) {
      if (!aula.isDirectory()) continue
      let texto: string
      try {
        texto = readFileSync(resolve(docs, curso, aula.name, 'manifesto.json'), 'utf8')
      } catch {
        continue
      }
      const visitar = (valor: unknown): void => {
        if (Array.isArray(valor)) {
          for (const item of valor) visitar(item)
          return
        }
        if (typeof valor !== 'object' || valor === null) return
        const registro = valor as Record<string, unknown>
        const atividade = registro.activity as Record<string, unknown> | undefined
        if (
          typeof atividade?.scene === 'string' &&
          (SCENE_IDS as readonly string[]).includes(atividade.scene)
        ) {
          const scene = atividade.scene as SceneId
          const setup = atividade.setup as { actions?: unknown[] } | undefined
          for (const acao of setup?.actions ?? []) somar(scene, acao)
          const roteiro = atividade.script as { actions?: unknown[] }[] | undefined
          for (const passo of roteiro ?? [])
            for (const acao of passo.actions ?? []) somar(scene, acao)
        }
        for (const filho of Object.values(registro)) visitar(filho)
      }
      visitar(JSON.parse(texto))
    }
  }
  return porCena
}

describe('toda ação de cena conhecida atravessa a borda do members', () => {
  const porCena = acoesConhecidas()

  test('⚠️ a varredura não passa vazia: todas as cenas e dezenas de tipos de ação', () => {
    const tipos = new Set([...porCena.values()].flat().map((a) => a.type))
    for (const scene of SCENE_IDS) expect(porCena.get(scene)?.length, scene).toBeGreaterThan(0)
    expect(tipos.size).toBeGreaterThan(50)
  })

  for (const scene of SCENE_IDS)
    test(`${scene}: o validador aceita e a rota tipada devolve cada ação igual`, async () => {
      const acoes = porCena.get(scene) ?? []
      // Uma etapa tem no máximo 16 ações: em lotes, cada bloco válido também no domínio.
      for (let i = 0; i < acoes.length; i += 16) {
        const bloco = blocoCom(scene, acoes.slice(i, i + 16))
        expect(validador.Check(bloco), `${scene}: ${JSON.stringify(acoes.slice(i, i + 16))}`).toBe(
          true,
        )
        const resposta = await app.handle(
          new Request('http://members.test/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ content: bloco }),
          }),
        )
        expect(resposta.status).toBe(200)
        const devolvido = (await resposta.json()) as { content: InteractiveBlock }
        expect(devolvido.content).toEqual(bloco)
      }
    })

  test('⚠️ anti-vácuo: ação desconhecida é recusada e campo a mais é podado pela rota', async () => {
    expect(validador.Check(blocoCom('world', [{ type: 'voar' } as unknown as SceneAction]))).toBe(
      false,
    )
    const comExtra = blocoCom('world', [
      { type: 'create', campoQueNaoExiste: 1 } as unknown as SceneAction,
    ])
    const resposta = await app.handle(
      new Request('http://members.test/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: comExtra }),
      }),
    )
    expect(resposta.status).toBe(200)
    const devolvido = (await resposta.json()) as { content: InteractiveBlock }
    expect(JSON.stringify(devolvido.content)).not.toContain('campoQueNaoExiste')
    // Sem relação com a borda: o domínio também recusa a ação desconhecida.
    expect(
      isInteractiveBlock(blocoCom('world', [{ type: 'voar' } as unknown as SceneAction])),
    ).toBe(false)
  })
})
