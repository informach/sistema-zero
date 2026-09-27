import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  blockCheckpoint,
  type InteractiveBlock,
  isLearningAnswers,
  type LearningAnswers,
} from '@sistemazero/core/learning'
import { readExperimentSession, sceneSegmentAnswers } from '@sistemazero/core/learning/scene'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * ⚠️⚠️ O servidor rejoga a cena a partir do MESMO começo que o player (review do lote 1 do Raio-X).
 *
 * O `sceneStartOf` do serviço montava o começo à mão com a cena e o impulso, e esquecia o CASO do
 * professor (`setup`). O servidor avaliava a experimentação no mundo de fábrica enquanto a criança
 * mexia no caso: no Dia 1 do Desafio (obrigatório) a nave começa em 300, 40, a criança tocava no
 * "+" do y, via a nave descer e o cartão de conclusão — e a tentativa gravada saía `passed:false`.
 */

const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'
const DOCS = resolve(import.meta.dir, '../../../../docs/aulas-interativas/aulas')

type Json = Record<string, unknown>
function blocoDoManifesto(caminho: string, chave: string): InteractiveBlock {
  const doc = JSON.parse(readFileSync(resolve(DOCS, caminho), 'utf8')) as { blocks: Json[] }
  const bloco = doc.blocks.find((b) => b.key === chave)
  if (!bloco?.content) throw new Error(`Bloco ${chave} não encontrado em ${caminho}`)
  return bloco.content as unknown as InteractiveBlock
}

/** Todos os blocos de cena com caso (`setup`) nos manifestos atuais. */
function _blocosComCaso(): { onde: string; content: InteractiveBlock }[] {
  const arquivos: string[] = []
  const varrer = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const p = join(dir, nome)
      if (statSync(p).isDirectory()) varrer(p)
      else if (nome.endsWith('.json')) arquivos.push(p)
    }
  }
  varrer(DOCS)
  const achados: { onde: string; content: InteractiveBlock }[] = []
  const procurar = (valor: unknown, onde: string) => {
    if (!valor || typeof valor !== 'object') return
    const v = valor as Json
    const a = v.activity as Json | undefined
    if (v.kind === 'interactive' && a?.setup) achados.push({ onde, content: v as never })
    for (const filho of Object.values(v)) procurar(filho, onde)
  }
  for (const arquivo of arquivos) procurar(JSON.parse(readFileSync(arquivo, 'utf8')), arquivo)
  return achados
}

function preparar(content: InteractiveBlock) {
  const env = buildApp()
  const course = seedSampleCourse(env.courses)
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const lessonId = course.lessonIds[0] as string
  const blockId = randomUUID()
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'interactive',
    content,
    sortOrder: 15,
    contentRevision: REVISION,
  })
  const path = `/members/lessons/${lessonId}/blocks/${blockId}`
  const request = (sufixo: string, method: string, body: unknown) =>
    env.app.handle(
      new Request(`http://localhost${path}${sufixo}`, {
        method,
        headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
        body: JSON.stringify(body),
      }),
    )
  /** Grava UM segmento e devolve as respostas que o servidor guardou. */
  const gravar = async (commands: unknown[]): Promise<LearningAnswers> => {
    const answers = sceneSegmentAnswers({
      sessionId: 'sessao-caso',
      segmentId: `segmento-${randomUUID()}`,
      baseSequence: 0,
      commands,
    })
    const resposta = await request('/learning-progress', 'PUT', {
      revision: REVISION,
      hintsUsed: 0,
      positionSeconds: null,
      answers,
    })
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { answers?: unknown }
    if (!isLearningAnswers(corpo.answers)) throw new Error('Resposta de progresso inválida')
    return corpo.answers
  }
  const tentar = async (answers: LearningAnswers) => {
    const resolvida = blockCheckpoint(content)
    const resposta = await request('/learning-attempts', 'POST', {
      id: randomUUID(),
      revision: REVISION,
      hintsUsed: 0,
      answers: { ...answers, ...(resolvida ? { checkpoint: resolvida.correctChoiceId } : {}) },
    })
    expect(resposta.status).toBe(200)
    return ((await resposta.json()) as { attempt: { result: { passed: boolean } } }).attempt.result
  }
  return { gravar, tentar }
}

describe('⚠️⚠️ o servidor abre a cena no CASO do professor, como o player', () => {
  const dia1 = () =>
    blocoDoManifesto('nave-contra-asteroides-dia-1.manifesto.json', 'experiencia-coordenadas')

  test('Dia 1 de Nave Contra Asteroides: o percurso dos três objetivos conclui no caso do professor', async () => {
    const content = dia1()
    expect(content.activity.type).toBe('experimentation')
    const { gravar, tentar } = preparar(content)
    // O gesto que a criança faz na tela: a nave está em 400, 40 e o "+" do y anda 20.
    // ⚠️ Mudou de propósito (lote 5 do Raio-X, G1): o caso do Dia 1 passou a abrir a tela do tamanho
    // do Desafio (800 por 480), com a nave no meio dela, em x 400 (era 300 numa tela de 480).
    const respostas = await gravar([
      { type: 'place', x: 500, y: 40 },
      { type: 'place', x: 500, y: 60 },
      { type: 'place', x: 0, y: 0 },
    ])
    const sessao = readExperimentSession('coordinates', respostas.sceneCheckpoint)
    expect(sessao?.state.place).toMatchObject({ x: 0, y: 0 })
    expect(sessao?.state.evidence.discoveries).toEqual(
      expect.arrayContaining(['right', 'down', 'origin']),
    )
    expect((await tentar(respostas)).passed).toBe(true)
  })

  test('Dia 1 de Nave Contra Asteroides: um toque só, calculado no mundo de FÁBRICA, não conclui', async () => {
    // Era o que o servidor antigo aceitava: a nave em 110, 150 e o "+" do y indo a 170. Do caso
    // (400, 40) esse mesmo comando muda os DOIS eixos, e mexer nos dois não diz qual fez o quê.
    const { gravar, tentar } = preparar(dia1())
    const respostas = await gravar([{ type: 'place', x: 110, y: 170 }])
    expect(
      readExperimentSession('coordinates', respostas.sceneCheckpoint)?.state.evidence.discoveries,
    ).toEqual([])
    expect((await tentar(respostas)).passed).toBe(false)
  })
})
