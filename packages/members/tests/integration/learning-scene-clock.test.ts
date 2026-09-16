import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { InteractiveBlock } from '@sistemazero/core/learning'
import {
  initialDemonstration,
  readDemonstrationSession,
  SCENE_MODELS,
  SCENE_QUESTIONS,
  type SceneActivity,
  sceneSegmentAnswers,
  stepDemonstration,
} from '@sistemazero/core/learning/scene'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * ⚠️⚠️ O deploy do relógio de quadro fixo e a aba aberta (review do lote 4 do Raio-X, 16/09/2026).
 *
 * O player de antes do lote 4 decide a conclusão pelo motor DELE (um quadro por fatia). Na
 * experimentação ele mostrava "concluiu" enquanto o servidor novo gravava `passed:false`, e com a
 * assinatura igual nem reenviava. O player novo manda o marcador `sceneClock`; com
 * `SCENE_CLOCK_STRICT` o servidor recusa o antigo com 409, e ele cai no "Reabra a aula" que já
 * sabe mostrar. E a tolerância da demonstração passou a valer só para quem NÃO tem o marcador.
 */

const USER = '11111111-1111-1111-1111-111111111111'
const REVISION = '12345678901234567890123456789012'

function preparar(activity: SceneActivity, opcoes: { sceneClockStrict?: boolean } = {}) {
  const env = buildApp(opcoes)
  const course = seedSampleCourse(env.courses)
  grantLifetime(env.entitlements, { userId: USER, courseRef: course.slug })
  const lessonId = course.lessonIds[0] as string
  const blockId = randomUUID()
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: 'A cena',
    instructions: 'Mexa na cena.',
    hints: [],
    required: true,
    activity,
  }
  env.courses.blocks.push({
    id: blockId,
    lessonId,
    kind: 'interactive',
    content,
    sortOrder: 15,
    contentRevision: REVISION,
  })
  /**
   * Grava UM segmento. `marcador: false` é o player de antes do lote 4 (sem `sceneClock`);
   * `marcador: 1` é o player do lote 4, de antes da onda A do lote 5.
   */
  const gravar = (
    commands: unknown[],
    { marcador, segmentId = `segmento-${randomUUID()}`, baseSequence = 0 } = {
      marcador: true,
    } as { marcador: boolean | 1; segmentId?: string; baseSequence?: number },
  ) => {
    const answers = sceneSegmentAnswers({
      sessionId: 'sessao-relogio',
      segmentId,
      baseSequence,
      commands,
    })
    if (marcador === false) delete answers.sceneClock
    if (marcador === 1) answers.sceneClock = 1
    return env.app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${blockId}/learning-progress`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
          body: JSON.stringify({
            revision: REVISION,
            hintsUsed: 0,
            positionSeconds: null,
            answers,
          }),
        },
      ),
    )
  }
  /** A tentativa, com as respostas que o player ecoa (as do último progresso que voltou). */
  const tentar = (answers: unknown) =>
    env.app.handle(
      new Request(
        `http://localhost/members/lessons/${lessonId}/blocks/${blockId}/learning-attempts`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-auth-user-id': USER },
          body: JSON.stringify({ id: randomUUID(), revision: REVISION, hintsUsed: 0, answers }),
        },
      ),
    )
  return { gravar, tentar }
}

const codigo = async (resposta: Response) =>
  ((await resposta.json()) as { error?: { code?: string } }).error?.code

describe('⚠️⚠️ SCENE_CLOCK_STRICT: o player de antes do relógio cai no recado', () => {
  const ligarCondicao = [{ type: 'connect', port: 'condition', enabled: true }]

  test('desligada (o padrão), o segmento sem marcador continua aceito: é a janela do deploy', async () => {
    const { gravar } = preparar({ type: 'experimentation', scene: 'score' })
    expect((await gravar(ligarCondicao, { marcador: false })).status).toBe(200)
  })

  test('⚠️⚠️ ligada, a experimentação com relógio sem marcador é 409, e com marcador passa', async () => {
    const antigo = preparar({ type: 'experimentation', scene: 'score' }, { sceneClockStrict: true })
    const recusa = await antigo.gravar(ligarCondicao, { marcador: false })
    expect(recusa.status).toBe(409)
    expect(await codigo(recusa)).toBe('LEARNING_CONFLICT')

    const novo = preparar({ type: 'experimentation', scene: 'score' }, { sceneClockStrict: true })
    expect((await novo.gravar(ligarCondicao)).status).toBe(200)
  })

  test('ligada, a demonstração com relógio sem marcador também é recusada', async () => {
    const { gravar } = preparar(
      { type: 'demonstration', scene: 'velocity' },
      { sceneClockStrict: true },
    )
    const recusa = await gravar([{ type: 'start' }, { type: 'tick', seconds: 0.5 }], {
      marcador: false,
    })
    expect(recusa.status).toBe(409)
  })

  /**
   * ⚠️⚠️ Mudou de propósito (consertos do review da onda A do lote 5, A2): a onda A mudou metas de
   * cenas SEM relógio, e o marcador virou a versão das regras. Antes esta cena passava sem marcador.
   */
  test('⚠️⚠️ ligada, cena SEM relógio também recusa o player antigo, e o novo passa', async () => {
    const antigo = preparar(
      { type: 'experimentation', scene: 'coordinates' },
      { sceneClockStrict: true },
    )
    const mover = [{ type: 'place', x: 0, y: 150 }]
    expect((await antigo.gravar(mover, { marcador: false })).status).toBe(409)
    const novo = preparar(
      { type: 'experimentation', scene: 'coordinates' },
      { sceneClockStrict: true },
    )
    expect((await novo.gravar(mover)).status).toBe(200)
  })

  test('⚠️⚠️ ligada, o player do lote 4 (marcador 1) é recusado: as regras da onda A são outras', async () => {
    const { gravar } = preparar(
      { type: 'experimentation', scene: 'hitbox' },
      { sceneClockStrict: true },
    )
    const recusa = await gravar([{ type: 'move', distance: 130 }], { marcador: 1 })
    expect(recusa.status).toBe(409)
    expect(await codigo(recusa)).toBe('LEARNING_CONFLICT')
  })

  test('⚠️⚠️ ligada, o ▶ de uma aba antiga da random vira 409 (reabrir), e não o 400 "sem internet"', async () => {
    // O `advance` deixou de ser legal na `random`. Sem a recusa pelo marcador ANTES da validação dos
    // comandos, a aba antiga recebia 400 e o player dizia "Sem internet agora" para sempre.
    const { gravar } = preparar(
      { type: 'experimentation', scene: 'random' },
      { sceneClockStrict: true },
    )
    const recusa = await gravar([{ type: 'advance', seconds: 0.05 }], { marcador: 1 })
    expect(recusa.status).toBe(409)
  })

  test('⚠️⚠️ o reenvio de um segmento gravado sem marcador, agora COM ele, não vira conflito', async () => {
    // Um segmento gravado pelo player antigo, cuja resposta se perdeu; depois do F5 o player novo
    // reenvia o mesmo segmento do rascunho, agora com o marcador. O hash é o do segmento LIDO, e o
    // marcador fica fora dele: o servidor devolve o que já tinha gravado.
    const { gravar } = preparar({ type: 'experimentation', scene: 'score' })
    const segmentId = 'segmento-perdido'
    const primeiro = await gravar(ligarCondicao, { marcador: false, segmentId })
    expect(primeiro.status).toBe(200)
    const reenvio = await gravar(ligarCondicao, { marcador: true, segmentId })
    expect(reenvio.status).toBe(200)
    expect(await reenvio.json()).toEqual(await primeiro.json())
  })
})

describe('⚠️⚠️ a tolerância da demonstração vale só para o player ANTERIOR', () => {
  /**
   * O pior caso do review: um tique de 0,04 s na ÚLTIMA ação (um `advance` de 1 s) da última etapa.
   * O player antigo parava de mandar tique ali, e a tolerância marca "assistida" olhando o fim do
   * `advance`. O player novo continua mandando tique, então ele não precisa (e não pode ganhar) a
   * folga: sem o conserto, 13 demonstrações ficavam "assistidas" faltando quase toda a ação final.
   */
  function comandosAteOTiqueFinal() {
    const start = { scene: 'velocity' } as const
    const roteiro = SCENE_MODELS.velocity.script
    const ultima = roteiro.length - 1
    const comandos: unknown[] = [{ type: 'start' }]
    let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
      type: 'start',
    }).session
    for (let i = 0; i < 80; i++) {
      const naAcaoFinal =
        s.step === ultima && s.action === (roteiro[ultima]?.actions.length ?? 0) - 1
      const tique = naAcaoFinal ? 0.04 : 1
      comandos.push({ type: 'tick', seconds: tique })
      s = stepDemonstration(start, roteiro, s, { type: 'tick', seconds: tique }).session
      if (naAcaoFinal) break
      if (s.ready && s.step < ultima) {
        comandos.push({ type: 'next' })
        s = stepDemonstration(start, roteiro, s, { type: 'next' }).session
      }
    }
    // O cenário é real: estrito, falta quase todo o `advance` final.
    expect(s.viewed).toBe(false)
    expect(s.elapsed).toBeCloseTo(0.04, 9)
    expect(comandos.length).toBeLessThanOrEqual(100)
    return comandos
  }
  const assistida = async (resposta: Response) => {
    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as { answers: { sceneCheckpoint: unknown } }
    return readDemonstrationSession('velocity', corpo.answers.sceneCheckpoint)?.viewed
  }

  test('sem marcador (player antigo), o servidor tolera e marca assistida', async () => {
    const { gravar } = preparar({ type: 'demonstration', scene: 'velocity' })
    expect(await assistida(await gravar(comandosAteOTiqueFinal(), { marcador: false }))).toBe(true)
  })

  test('⚠️⚠️ com marcador (player novo), o mesmo tique NÃO marca assistida', async () => {
    const { gravar } = preparar({ type: 'demonstration', scene: 'velocity' })
    expect(await assistida(await gravar(comandosAteOTiqueFinal()))).toBe(false)
  })
})

/**
 * ⚠️⚠️ A demonstração que CRESCEU e o player publicado (consertos do review da onda B do lote 5, MÉDIO-5).
 *
 * As demonstrações sem roteiro próprio tocam o roteiro do MODELO, e o player publicado traz o roteiro dele
 * no pacote. Onde o lote 5 aumentou o roteiro (`frames` 4 → 5 partes, `fill-stroke` 2 → 3, `sheet-vs-sprite`
 * com a parte 3 de 1 para 4 ações; Aulas 3, 4 e 6 de O Jogo do Meu Jeito), o player antigo manda um `next`
 * a menos e menos tempo: ele vê tudo, o servidor para no meio, a tentativa volta `passed:false` e o player
 * antigo fica em "Guardando este resultado…" para sempre, sem 409 e sem recado. Agora o servidor recusa com
 * 409 a tentativa do player sem o marcador atual quando a cena NÃO fechou no servidor, e o player antigo
 * cai no "Reabra a aula" que ele já sabe mostrar.
 *
 * Os comandos abaixo são os que o player publicado manda, gerados com o motor e o roteiro de HEAD
 * (`a576350d`, o de `origin/staging`) em fatias de 0,05 s (o ▶ a 60 Hz junta três quadros até passar de
 * 0,04 s): `['tick', n]` são `n` tiques seguidos. Ele para quando o motor DELE marca `viewed`.
 */
const PLAYER_PUBLICADO: Record<string, (string | number)[][]> = {
  frames: [
    ['start'],
    ['tick', 10],
    ['next'],
    ['tick', 10],
    ['next'],
    ['tick', 60],
    ['next'],
    ['tick', 30],
  ],
  'fill-stroke': [['start'], ['tick', 10], ['next'], ['tick', 20]],
  'sheet-vs-sprite': [['start'], ['tick', 10], ['next'], ['tick', 10], ['next'], ['tick', 10]],
  // Roteiro que NÃO mudou de forma: o player antigo registra pela tolerância, e não pode virar 409.
  'onion-skin': [
    ['start'],
    ['tick', 20],
    ['next'],
    ['tick', 10],
    ['next'],
    ['tick', 10],
    ['next'],
    ['tick', 10],
  ],
}
const expandir = (rle: (string | number)[][] = []) =>
  rle.flatMap(([tipo, vezes]) =>
    tipo === 'tick'
      ? Array.from({ length: Number(vezes) }, () => ({ type: 'tick', seconds: 0.05 }))
      : [{ type: tipo }],
  )

describe('⚠️⚠️ o player publicado numa demonstração que cresceu cai no recado, e não fica guardando para sempre', () => {
  /** Grava os comandos em segmentos de até 100 (o teto do segmento) e devolve as últimas respostas. */
  async function tocar(
    gravar: ReturnType<typeof preparar>['gravar'],
    comandos: unknown[],
    marcador: boolean,
  ) {
    let answers: Record<string, unknown> = {}
    for (let base = 0; base < comandos.length; base += 100) {
      const resposta = await gravar(comandos.slice(base, base + 100), {
        marcador,
        baseSequence: base,
      })
      expect(resposta.status).toBe(200)
      answers = ((await resposta.json()) as { answers: Record<string, unknown> }).answers
    }
    return answers
  }

  for (const cena of ['frames', 'fill-stroke', 'sheet-vs-sprite'] as const)
    test(`${cena}: o player publicado viu tudo, o servidor não, e a tentativa é 409`, async () => {
      const { gravar, tentar } = preparar({ type: 'demonstration', scene: cena })
      const answers = await tocar(gravar, expandir(PLAYER_PUBLICADO[cena]), false)
      // O cenário é o do review: o servidor parou antes do fim do roteiro novo.
      expect(readDemonstrationSession(cena, answers.sceneCheckpoint)?.viewed).toBe(false)
      const recusa = await tentar(answers)
      expect(recusa.status).toBe(409)
      expect(await codigo(recusa)).toBe('LEARNING_CONFLICT')
    })

  test('onion-skin (roteiro igual): o player publicado continua registrando, sem 409', async () => {
    const { gravar, tentar } = preparar({ type: 'demonstration', scene: 'onion-skin' })
    const answers = await tocar(gravar, expandir(PLAYER_PUBLICADO['onion-skin']), false)
    const resposta = await tentar(answers)
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ attempt: { result: { passed: true } } })
  })

  test('o player novo (com marcador) tocando o roteiro NOVO até o fim registra', async () => {
    const start = { scene: 'frames' } as const
    const roteiro = SCENE_MODELS.frames.script
    const comandos: unknown[] = [{ type: 'start' }]
    let s = stepDemonstration(start, roteiro, initialDemonstration(start), {
      type: 'start',
    }).session
    for (let i = 0; i < 2000 && !s.viewed; i++) {
      const comando = s.ready
        ? ({ type: 'next' } as const)
        : ({ type: 'tick', seconds: 0.05 } as const)
      comandos.push(comando)
      s = stepDemonstration(start, roteiro, s, comando).session
    }
    const { gravar, tentar } = preparar({ type: 'demonstration', scene: 'frames' })
    const resposta = await tentar(await tocar(gravar, comandos, true))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ attempt: { result: { passed: true } } })
  })

  test('⚠️ o 409 é só do player sem marcador: o player novo no meio do roteiro recebe o "ainda não" de sempre', async () => {
    const { gravar, tentar } = preparar({ type: 'demonstration', scene: 'frames' })
    const answers = await tocar(gravar, expandir(PLAYER_PUBLICADO.frames), true)
    const resposta = await tentar(answers)
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({ attempt: { result: { passed: false } } })
  })

  test('⚠️⚠️ experimentação: o player publicado concluiu com as metas DELE, o servidor não, e é 409', async () => {
    // Na `coordinates` a onda A trocou `same-x` por `origin`: estes dois gestos fecham as três metas no
    // motor publicado (conferido com o motor de HEAD) e só duas no servidor novo.
    const gestos = [
      { type: 'place', x: 130, y: 150 },
      { type: 'place', x: 130, y: 170 },
    ]
    const pergunta = SCENE_QUESTIONS.coordinates.explain.correctChoiceId
    const antigo = preparar({ type: 'experimentation', scene: 'coordinates' })
    const doAntigo = await antigo.gravar(gestos, { marcador: false })
    const answers = ((await doAntigo.json()) as { answers: Record<string, unknown> }).answers
    const recusa = await antigo.tentar({ ...answers, checkpoint: pergunta })
    expect(recusa.status).toBe(409)
    expect(await codigo(recusa)).toBe('LEARNING_CONFLICT')

    // O mesmo caminho com o player novo é um "ainda não" comum: nada mudou de versão.
    const novo = preparar({ type: 'experimentation', scene: 'coordinates' })
    const doNovo = await novo.gravar(gestos)
    const deNovo = ((await doNovo.json()) as { answers: Record<string, unknown> }).answers
    const normal = await novo.tentar({ ...deNovo, checkpoint: pergunta })
    expect(normal.status).toBe(200)
    expect(await normal.json()).toMatchObject({ attempt: { result: { passed: false } } })
  })
})
