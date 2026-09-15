import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { LearningAnswers } from '../src/learning'
import {
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isLearningAnswers,
  isLearningFrameMessage,
  isLearningManifest,
  LEARNING_PROTOCOL,
  migrateLegacyActivity,
  migrateLegacyInteractiveBlock,
  publicInteractiveBlock,
  sectionCompletionIssues,
  validateLessonSections,
} from '../src/learning'
import {
  evaluateExperimentation,
  initialDemonstration,
  initialExperiment,
  initialScene,
  packDemonstration,
  packExperiment,
  sceneModel,
  sceneStart,
  stepDemonstration,
  stepExperiment,
} from '../src/learning/scene'
import { scenePaths } from './fixtures/exploration-paths'

const section = {
  id: 'section',
  title: 'Aula',
  objective: 'Criar',
  intent: 'application' as const,
  blockIds: ['a'],
  workspaceBlockId: null,
  externalTool: null,
  pendingMedia: [],
}
const experimento: InteractiveBlock = {
  kind: 'interactive',
  title: 'Faça o Dino aparecer',
  instructions: 'Crie o Dino e ligue o desenho.',
  required: true,
  hints: [],
  activity: { type: 'experimentation', scene: 'world' },
}
/** O que o servidor guardaria depois de a criança cumprir as duas metas de `world`. */
function sessaoCompleta() {
  const start = { scene: 'world' } as const
  let s = initialExperiment(start)
  s = stepExperiment(start, s, { type: 'create' }).session
  s = stepExperiment(start, s, { type: 'connect', port: 'draw', enabled: true }).session
  return packExperiment('world', s)
}
/** O que o servidor guardaria de quem assistiu ao roteiro de `world` até o fim. */
function demonstracaoVista() {
  const start = { scene: 'world' } as const
  const script = sceneModel('world').script
  let s = stepDemonstration(start, script, initialDemonstration(start), { type: 'start' }).session
  for (let i = 0; i < 600 && !s.viewed; i++) {
    s = stepDemonstration(start, script, s, { type: 'tick', seconds: 0.1 }).session
    if (s.ready && s.step < script.length - 1)
      s = stepDemonstration(start, script, s, { type: 'next' }).session
  }
  return packDemonstration('world', s)
}
describe('learning contracts', () => {
  test('⚠️ a cena aceita pergunta anexa, e as duas respostas viajam em chaves DIFERENTES', () => {
    // A proibição existia porque `answers.checkpoint` guardaria a alternativa escolhida E os
    // pedaços da sessão da cena ao mesmo tempo. A sessão mudou para `answers.sceneCheckpoint`,
    // a colisão acabou, e a pergunta é o terceiro tempo do ciclo: mexer, prever, enunciar.
    expect(isInteractiveBlock(experimento)).toBe(true)
    const comPergunta = {
      ...experimento,
      checkpoint: {
        prompt: 'Por quê?',
        choices: [
          { id: 'a', label: 'Uma' },
          { id: 'b', label: 'Outra' },
        ],
        correctChoiceId: 'a',
        explanation: 'Porque sim.',
      },
    }
    expect(isInteractiveBlock(comPergunta)).toBe(true)
    if (!isInteractiveBlock(comPergunta)) throw new Error('bloco inválido')
    const sessao = sessaoCompleta()
    // A descoberta sozinha não fecha mais: falta enunciar a regra.
    expect(evaluateLearning(comPergunta, { sceneCheckpoint: sessao }).passed).toBe(false)
    expect(evaluateLearning(comPergunta, { sceneCheckpoint: sessao, checkpoint: 'b' }).passed).toBe(
      false,
    )
    expect(evaluateLearning(comPergunta, { sceneCheckpoint: sessao, checkpoint: 'a' }).passed).toBe(
      true,
    )
    // ⚠️ E a resposta certa NÃO substitui a descoberta: sem a sessão, a pergunta não aprova.
    expect(evaluateLearning(comPergunta, { checkpoint: 'a' }).passed).toBe(false)
    // ⚠️ Errar e não ter respondido dão recados DIFERENTES. Davam o mesmo, e quem tinha
    // escolhido a frase errada lia "agora escolha a frase" — nenhum sinal de que errou, e o
    // caminho natural era reler e reescolher a mesma opção.
    const semResposta = evaluateLearning(comPergunta, { sceneCheckpoint: sessao }).feedback
    const errou = evaluateLearning(comPergunta, {
      sceneCheckpoint: sessao,
      checkpoint: 'b',
    }).feedback
    expect(errou).not.toBe(semResposta)
    expect(errou).toContain('não é a frase')
    // ⚠️ E o gabarito continua sem sair do servidor: o recado diz que não é essa, nunca qual é.
    expect(errou).not.toContain('Uma')
    expect(errou).not.toContain('Porque sim')
  })
  test('⚠️⚠️ missão VAZIA reprova, em vez de passar com evidência zero', () => {
    // O filtro por `targets` cruza a lista do caso com as metas do modelo. Uma meta renomeada no
    // catálogo esvaziaria essa lista em todo manifesto que a cita — e `find` numa lista vazia
    // devolve `undefined`, que o avaliador lia como "não falta nada".
    const vazia = evaluateExperimentation(
      'tilemap',
      initialScene({ scene: 'tilemap' }),
      true,
      undefined,
      ['meta-que-sumiu-do-catalogo'],
    )
    expect(vazia.passed).toBe(false)
    expect(vazia.feedback).toContain('sem descobertas para cobrar')
  })

  test('a cena é aprovada pela evidência que ela mesma guarda', () => {
    expect(evaluateLearning(experimento, {}).passed).toBe(false)
    expect(evaluateLearning(experimento, { sceneCheckpoint: sessaoCompleta() }).passed).toBe(true)
    // Pacote corrompido não aprova nem finge que está tudo bem.
    expect(evaluateLearning(experimento, { sceneCheckpoint: ['{lixo'] }).passed).toBe(false)
  })
  test('an essential HTML claim requires its independent native checkpoint', () => {
    const block: InteractiveBlock = {
      ...experimento,
      activity: { type: 'html', html: '<button>Explorar</button>' },
      checkpoint: {
        prompt: 'Conclusão?',
        choices: [
          { id: 'correct', label: 'Sim' },
          { id: 'other', label: 'Outra' },
        ],
        correctChoiceId: 'correct',
        explanation: 'Observe a relação.',
      },
    }
    expect(evaluateLearning(block, { participated: true, passed: true }).passed).toBe(false)
    expect(evaluateLearning(block, { checkpoint: 'correct' }).passed).toBe(false)
    expect(evaluateLearning(block, { participated: true, checkpoint: 'correct' }).passed).toBe(true)
    expect(publicInteractiveBlock(block).checkpoint).not.toHaveProperty('correctChoiceId')
    expect(isInteractiveBlock({ ...block, checkpoint: undefined })).toBe(false)
  })
  test('⚠️ atividade de forma desconhecida não conclui com um "participei" do cliente', () => {
    // Um bloco gravado antes desta reescrita (uma sequência, uma previsão) não tem como ser
    // avaliado. Aceitar `{participated:true}` daria o bloco obrigatório por cumprido sem
    // ninguém ter respondido nada.
    const legado = { ...experimento, activity: { type: 'sequence' } } as unknown as InteractiveBlock
    const r = evaluateLearning(legado, { participated: true })
    expect(r.passed).toBe(false)
    expect(r.participated).toBe(false)
  })

  test('⚠️ a projeção pública poda campo que não pertence à forma da atividade', () => {
    // A projeção roda sobre o conteúdo CRU do banco, sem passar pelo guard: uma linha antiga
    // pode carregar um gabarito, e copiá-la inteira mandaria a resposta para a criança.
    const comGabarito = {
      ...experimento,
      activity: { type: 'experimentation', scene: 'world', solution: ['a', 'b'] },
    } as unknown as InteractiveBlock
    const publico = publicInteractiveBlock(comGabarito)
    expect(publico.activity).not.toHaveProperty('solution')
    expect(publico.activity).toMatchObject({ type: 'experimentation', scene: 'world' })
  })

  test('quem nunca abriu a demonstração não consta como participante', () => {
    const demo = {
      ...experimento,
      activity: { type: 'demonstration', scene: 'world' },
    } as InteractiveBlock
    expect(evaluateLearning(demo, {}).participated).toBe(false)
    expect(evaluateLearning(demo, {}).passed).toBe(false)
  })

  test('untrusted frames cannot use another instance, oversized or invalid state', () => {
    expect(isLearningAnswers({ constructor: { nested: 'bad' } })).toBe(false)
    expect(isLearningAnswers({ value: Number.NaN })).toBe(false)
    expect(isLearningAnswers({ text: 'a'.repeat(8001) })).toBe(false)
    expect(
      isLearningFrameMessage(
        { protocol: LEARNING_PROTOCOL, instance: 'other', event: 'participated' },
        'mine',
      ),
    ).toBe(false)
    expect(
      isLearningFrameMessage(
        {
          protocol: LEARNING_PROTOCOL,
          instance: 'mine',
          event: 'participated',
          state: { nested: { notNumber: true } },
        },
        'mine',
      ),
    ).toBe(false)
    expect(
      isLearningFrameMessage(
        { protocol: LEARNING_PROTOCOL, instance: 'mine', event: 'resize', height: Infinity },
        'mine',
      ),
    ).toBe(false)
  })
  test('a block belongs to exactly one section and an embedded workspace must exist', () => {
    expect(validateLessonSections([section], [{ id: 'a', kind: 'rich_text' }])).toBeNull()
    expect(
      validateLessonSections(
        [section, { ...section, id: 'other' }],
        [{ id: 'a', kind: 'rich_text' }],
      ),
    ).not.toBeNull()
    expect(
      validateLessonSections(
        [{ ...section, workspaceBlockId: 'a' }],
        [{ id: 'a', kind: 'rich_text' }],
      ),
    ).not.toBeNull()
  })
})

const directory = resolve(import.meta.dir, '../../../docs/aulas-interativas')
const catalog: Array<{ course: string; path: string; clips: number }> = JSON.parse(
  readFileSync(resolve(directory, 'catalogo.json'), 'utf8'),
)
describe('the 27 adapted lessons', () => {
  test('covers the complete curriculum once', () => {
    expect(catalog).toHaveLength(27)
    expect(new Set(catalog.map((lesson) => lesson.path)).size).toBe(27)
    expect(catalog.filter((lesson) => lesson.course === 'corre-dino')).toHaveLength(13)
    expect(catalog.filter((lesson) => lesson.course === 'o-jogo-do-meu-jeito')).toHaveLength(8)
  })
  for (const entry of catalog)
    test(entry.path, () => {
      const manifest: unknown = JSON.parse(
        readFileSync(resolve(directory, entry.path, 'manifesto.json'), 'utf8'),
      )
      expect(isLearningManifest(manifest)).toBe(true)
      if (!isLearningManifest(manifest)) throw new Error('Invalid authored manifest')
      expect(manifest.version).toBe(entry.course === 'corre-dino' ? 4 : 3)
      expect(
        sectionCompletionIssues(
          manifest.sections.map((s) => ({
            ...s,
            id: s.key,
            blockIds: s.blockKeys,
            workspaceBlockId: s.workspaceKey,
          })),
          manifest.blocks.map((b) => ({
            id: b.key,
            content:
              'content' in b
                ? b.content
                : 'existing' in b
                  ? { kind: b.existing.kind }
                  : { kind: 'video' },
          })),
        ),
      ).toEqual([])
      expect(manifest.sections.flatMap((section) => section.pendingMedia)).toHaveLength(0)
      const videos = manifest.blocks.filter((block) => 'plannedVideo' in block)
      expect(videos).toHaveLength(entry.clips)
      for (const video of videos)
        expect(
          manifest.sections.filter((section) => section.blockKeys.includes(video.key)),
        ).toHaveLength(1)
      expect(readFileSync(resolve(directory, entry.path, 'roteiro.md'), 'utf8')).toContain(
        'Narração revisada',
      )
      if (entry.course === 'o-jogo-do-meu-jeito') {
        expect(manifest.sections.every((section) => section.workspaceKey === null)).toBe(true)
        expect(manifest.sections.some((section) => section.externalTool !== null)).toBe(true)
        expect(
          manifest.blocks.some(
            (block) => 'existing' in block && ['studio', 'pinta'].includes(block.existing.kind),
          ),
        ).toBe(false)
      }
      for (const entryBlock of manifest.blocks) {
        if (!('content' in entryBlock) || entryBlock.content.kind !== 'interactive') continue
        const block = entryBlock.content
        expect(evaluateLearning(block, {}).passed).toBe(false)
        const answers: LearningAnswers = {}
        const activity = block.activity
        // ⚠️ O caminho de sucesso é expresso como AÇÕES da criança, nunca como um "passou"
        // que o cliente manda pronto. É o que separa evidência de autodeclaração.
        if (activity.type === 'experimentation') {
          const start = { scene: activity.scene, initialImpulse: activity.initialImpulse }
          let sessao = initialExperiment(start)
          for (const action of scenePaths[activity.scene])
            sessao = stepExperiment(start, sessao, action).session
          answers.sceneCheckpoint = packExperiment(activity.scene, sessao)
        }
        if (activity.type === 'demonstration') {
          const start = { scene: activity.scene }
          const script = activity.script ?? sceneModel(activity.scene).script
          let sessao = stepDemonstration(start, script, initialDemonstration(start), {
            type: 'start',
          }).session
          for (let i = 0; i < 600 && !sessao.viewed; i++) {
            sessao = stepDemonstration(start, script, sessao, {
              type: 'tick',
              seconds: 0.1,
            }).session
            if (sessao.ready && sessao.step < script.length - 1)
              sessao = stepDemonstration(start, script, sessao, { type: 'next' }).session
          }
          answers.sceneCheckpoint = packDemonstration(activity.scene, sessao)
        }
        if (activity.type === 'html') answers.participated = true
        if (block.checkpoint) answers.checkpoint = block.checkpoint.correctChoiceId
        expect(evaluateLearning(block, answers).passed).toBe(true)
      }
    })
})

/**
 * Os pacotes ATUAIS — os que a professora importa hoje.
 *
 * ⚠️ Só o pacote histórico tinha rede. Os 27 manifestos das revisões atuais, que são os que
 * carregam as 28 cenas, não passavam por teste nenhum: uma mudança de contrato os quebraria em
 * silêncio e só apareceria na hora de importar uma aula. Cada pacote tem catálogo próprio.
 */
const PACOTES_ATUAIS = ['corre-dino-v6', 'desafio-primeiro-jogo-v6', 'o-jogo-do-meu-jeito-v6']
describe('os pacotes atuais das aulas', () => {
  for (const pacote of PACOTES_ATUAIS) {
    const entradas: Array<{ path: string; sections: number }> = JSON.parse(
      readFileSync(resolve(directory, pacote, 'catalogo.json'), 'utf8'),
    )
    test(`${pacote}: o catálogo e as pastas contam a mesma coisa`, () => {
      expect(entradas.length).toBeGreaterThan(0)
      expect(new Set(entradas.map((e) => e.path)).size).toBe(entradas.length)
      // ⚠️ O nome deste teste prometia isto e não fazia: ele lia o catálogo e conferia o
      // catálogo. Uma aula no disco fora do `catalogo.json` simplesmente não era testada, e o
      // laço abaixo continuava verde cobrindo menos — o silêncio mais caro que existe aqui.
      const noDisco = readdirSync(resolve(directory, pacote), { withFileTypes: true })
        .filter(
          (e) => e.isDirectory() && existsSync(resolve(e.parentPath, e.name, 'manifesto.json')),
        )
        .map((e) => e.name)
        .sort()
      expect(entradas.map((e) => e.path).sort()).toEqual(noDisco)
    })
    for (const entrada of entradas)
      test(`${pacote}/${entrada.path}`, () => {
        const manifest: unknown = JSON.parse(
          readFileSync(resolve(directory, pacote, entrada.path, 'manifesto.json'), 'utf8'),
        )
        expect(isLearningManifest(manifest)).toBe(true)
        if (!isLearningManifest(manifest)) throw new Error('Manifesto inválido')
        expect(manifest.sections).toHaveLength(entrada.sections)
        expect(
          sectionCompletionIssues(
            manifest.sections.map((s) => ({
              ...s,
              id: s.key,
              blockIds: s.blockKeys,
              workspaceBlockId: s.workspaceKey,
            })),
            manifest.blocks.map((b) => ({
              id: b.key,
              content:
                'content' in b
                  ? b.content
                  : 'existing' in b
                    ? { kind: b.existing.kind }
                    : { kind: 'video' },
            })),
          ),
        ).toEqual([])
        // Nenhuma pendência de mídia em texto: cada trecho a gravar é um cartão, numa seção só.
        expect(manifest.sections.flatMap((section) => section.pendingMedia)).toHaveLength(0)
        for (const video of manifest.blocks.filter((block) => 'plannedVideo' in block))
          expect(
            manifest.sections.filter((section) => section.blockKeys.includes(video.key)),
          ).toHaveLength(1)
        for (const entryBlock of manifest.blocks) {
          if (!('content' in entryBlock) || entryBlock.content.kind !== 'interactive') continue
          const block = entryBlock.content
          // ⚠️ Nada passa de graça, e tudo TEM caminho de passar. As duas metades importam: um
          // bloco que nunca fecha trava a seção; um que já nasce fechado não pede nada da criança.
          expect(evaluateLearning(block, {}).passed).toBe(false)
          expect(evaluateLearning(block, caminhoDeSucesso(block)).passed).toBe(true)
          // ⚠️ Sem esta metade, a pergunta passava de graça no teste: o caminho de sucesso
          // devolve o próprio `correctChoiceId` e o avaliador o compara consigo mesmo. Aqui as
          // OUTRAS alternativas precisam reprovar — é o que pega um gabarito apontando para um
          // id que não está na lista (nada fecha) ou para mais de uma alternativa.
          if (block.checkpoint)
            for (const escolha of block.checkpoint.choices)
              if (escolha.id !== block.checkpoint.correctChoiceId)
                expect(
                  evaluateLearning(block, { checkpoint: escolha.id }).passed,
                  `${entrada.path}: ${escolha.id}`,
                ).toBe(false)
        }
      })
  }
})

/**
 * As 14 demonstrações.
 *
 * ⚠️ Elas não moram em manifesto nem em catálogo — vivem soltas num arquivo à parte, para a
 * professora escolher quais quer na aula. O resultado é que eram os únicos blocos do
 * repositório sem teste algum, e o ramo de demonstração do caminho de sucesso era código morto.
 * Foi ali que se escondeu um estado que o próprio motor produzia e o próprio validador recusava.
 */
describe('as demonstrações da cena', () => {
  const arquivo: unknown = JSON.parse(
    readFileSync(resolve(directory, 'corre-dino-v6/demonstracoes-opcionais.json'), 'utf8'),
  )
  const blocos: InteractiveBlock[] = []
  const varrer = (v: unknown) => {
    if (!v || typeof v !== 'object') return
    if (isInteractiveBlock(v) && v.activity.type === 'demonstration') blocos.push(v)
    for (const filho of Object.values(v)) varrer(filho)
  }
  varrer(arquivo)

  test('são catorze, e todas são blocos válidos', () => {
    expect(blocos).toHaveLength(14)
    expect(
      new Set(blocos.map((b) => b.activity.type === 'demonstration' && b.activity.scene)).size,
    ).toBe(14)
  })

  for (const bloco of blocos) {
    const cena = bloco.activity.type === 'demonstration' ? bloco.activity.scene : 'world'
    test(`${cena}: quem assiste até o fim CONCLUI`, () => {
      expect(evaluateLearning(bloco, {}).passed).toBe(false)
      const resultado = evaluateLearning(bloco, caminhoDeSucesso(bloco))
      // ⚠️ A mensagem importa tanto quanto o booleano: "esta demonstração mudou, abra de novo"
      // é o que a criança lia depois de assistir tudo, e recomeçar reproduzia o mesmo estado.
      expect(resultado.feedback, cena).not.toContain('mudou')
      expect(resultado.passed, cena).toBe(true)
    })
  }
})

/** As respostas que a criança teria depois de cumprir o bloco, cada tipo do seu jeito. */
function caminhoDeSucesso(block: InteractiveBlock): LearningAnswers {
  const answers: LearningAnswers = {}
  const activity = block.activity
  if (activity.type === 'experimentation') {
    // ⚠️ `sceneStart` e não um objeto à mão: ele leva o CASO do professor (`setup`), e sem isso o
    // teste montaria a sessão no mundo de fábrica enquanto o servidor avalia outro. Um caso que
    // torna a missão inalcançável passaria batido — e o defeito só apareceria com a criança nele.
    const start = sceneStart(activity)
    let sessao = initialExperiment(start)
    for (const action of scenePaths[activity.scene])
      sessao = stepExperiment(start, sessao, action).session
    answers.sceneCheckpoint = packExperiment(activity.scene, sessao)
  }
  if (activity.type === 'demonstration') {
    const start = sceneStart(activity)
    const script = activity.script ?? sceneModel(activity.scene).script
    let sessao = stepDemonstration(start, script, initialDemonstration(start), {
      type: 'start',
    }).session
    for (let i = 0; i < 600 && !sessao.viewed; i++) {
      sessao = stepDemonstration(start, script, sessao, { type: 'tick', seconds: 0.1 }).session
      if (sessao.ready && sessao.step < script.length - 1)
        sessao = stepDemonstration(start, script, sessao, { type: 'next' }).session
    }
    answers.sceneCheckpoint = packDemonstration(activity.scene, sessao)
  }
  if (activity.type === 'html') answers.participated = true
  if (block.checkpoint) answers.checkpoint = block.checkpoint.correctChoiceId
  return answers
}

/**
 * ⚠️⚠️ Os blocos que JÁ ESTAVAM gravados quando a reescrita tirou os seis tipos antigos.
 *
 * O plano dizia "nada foi usado por ninguém" e isso não valia para o ambiente dela: a aula 1 do
 * Corre Dino tinha blocos do modelo anterior. Sem migração eles param de poder ser SALVOS, e aí
 * a aula trava inteira — o editor desabilita o botão com o bloco inválido, e importar um roteiro
 * novo por cima também não funciona, porque a importação salva o bloco aberto antes de começar.
 */
describe('os blocos do modelo anterior', () => {
  const base = {
    kind: 'interactive' as const,
    title: 'Faça o Dino aparecer',
    instructions: 'Crie o Dino e ligue o desenho.',
    hints: ['Olhe os bastidores.'],
    required: true,
  }

  test('⚠️ o contrato de HOJE recusa todos eles — é por isso que a migração existe', () => {
    for (const activity of [
      { type: 'exploration', version: 3, mission: 'world', mode: 'explore' },
      { type: 'exploration', version: 2, mission: 'layers' },
      { type: 'prediction', options: ['a'] },
      { type: 'sequence', steps: ['a', 'b'] },
      { type: 'simulation', scenario: 'x' },
      { type: 'comparison', left: 'a', right: 'b' },
      { type: 'experiment', variable: 'x' },
    ])
      expect(isInteractiveBlock({ ...base, activity }), activity.type).toBe(false)
  })

  test('⚠️⚠️ a PREVISÃO nunca muda o veredito, em nenhum dos quatro tipos', () => {
    // É a razão de ela ser campo PRÓPRIO e não a pergunta de verificação: o palpite de antes não
    // vale nota. Se um dia o avaliador olhar para `answers.prediction`, errar o palpite passa a
    // reprovar a atividade — e a cena estaria ensinando a criança a não arriscar.
    const previsao = {
      prompt: 'O que você acha que vai acontecer?',
      choices: [
        { id: 'certa', label: 'Uma coisa' },
        { id: 'errada', label: 'Outra coisa' },
      ],
      correctChoiceId: 'certa',
    }
    const casos: Array<{ bloco: InteractiveBlock; respostas: LearningAnswers }> = [
      {
        bloco: { ...experimento, prediction: previsao },
        respostas: { sceneCheckpoint: sessaoCompleta() },
      },
      {
        bloco: {
          ...experimento,
          activity: { type: 'demonstration', scene: 'world' },
          prediction: previsao,
        },
        respostas: { sceneCheckpoint: demonstracaoVista() },
      },
      {
        bloco: {
          ...experimento,
          activity: { type: 'question' },
          prediction: previsao,
          checkpoint: {
            prompt: 'E agora?',
            choices: [
              { id: 'a', label: 'Uma' },
              { id: 'b', label: 'Outra' },
            ],
            correctChoiceId: 'a',
            explanation: 'Porque sim.',
          },
        },
        respostas: { checkpoint: 'a' },
      },
      {
        bloco: {
          ...experimento,
          // ⚠️ `required: false` aqui não é detalhe: experiência em HTML essencial EXIGE pergunta
          // de verificação (a participação é autodeclarada pelo iframe), e o guard recusa sem ela.
          required: false,
          activity: { type: 'html', html: '<p>oi</p>' },
          prediction: previsao,
        },
        respostas: { participated: true },
      },
    ]
    for (const { bloco, respostas } of casos) {
      expect(isInteractiveBlock(bloco), bloco.activity.type).toBe(true)
      const semPalpite = evaluateLearning(bloco, respostas)
      expect(semPalpite.passed, bloco.activity.type).toBe(true)
      for (const palpite of ['certa', 'errada', 'inventado']) {
        const r = evaluateLearning(bloco, { ...respostas, prediction: palpite })
        expect(r, `${bloco.activity.type} com palpite ${palpite}`).toEqual(semPalpite)
      }
    }
  })

  test('exploração vira a cena de mesmo nome, e o modo escolhe entre as duas irmãs', () => {
    expect(migrateLegacyActivity({ type: 'exploration', version: 3, mission: 'spawn' })).toEqual({
      type: 'experimentation',
      scene: 'spawn',
    })
    expect(
      migrateLegacyActivity({ type: 'exploration', version: 3, mission: 'spawn', mode: 'demo' }),
    ).toEqual({ type: 'demonstration', scene: 'spawn' })
  })

  test('⚠️ missão que não é cena não inventa uma: vira pergunta, que a professora resolve', () => {
    expect(migrateLegacyActivity({ type: 'exploration', mission: 'inexistente' })).toEqual({
      type: 'question',
    })
  })

  test('os cinco sem equivalente viram pergunta, preservando enunciado e gabarito', () => {
    const checkpoint = {
      prompt: 'O que vem primeiro?',
      choices: [
        { id: 'a', label: 'Preparar' },
        { id: 'b', label: 'Desenhar' },
      ],
      correctChoiceId: 'a',
      explanation: 'Preparar vem antes.',
    }
    const migrado = migrateLegacyInteractiveBlock({
      ...base,
      activity: { type: 'sequence', steps: ['a', 'b'] },
      checkpoint,
    })
    expect(migrado?.activity).toEqual({ type: 'question' })
    expect(migrado?.checkpoint).toEqual(checkpoint)
    expect(migrado?.title).toBe(base.title)
  })

  test('⚠️ todo bloco migrado sai no modelo de AGORA — nenhum fica no antigo', () => {
    const atuais = ['demonstration', 'experimentation', 'question', 'html']
    for (const activity of [
      { type: 'exploration', version: 3, mission: 'world', mode: 'explore' },
      { type: 'exploration', version: 3, mission: 'gravity', mode: 'demo' },
      { type: 'prediction', options: ['a'] },
      { type: 'sequence', steps: ['a', 'b'] },
      { type: 'simulation', scenario: 'x' },
      { type: 'comparison', left: 'a', right: 'b' },
      { type: 'experiment', variable: 'x' },
    ]) {
      const migrado = migrateLegacyInteractiveBlock({ ...base, activity })
      expect(migrado, activity.type).not.toBeNull()
      expect(atuais.includes(migrado?.activity.type ?? ''), activity.type).toBe(true)
    }
  })

  test('a exploração migrada já é PUBLICÁVEL — é a conversão fiel, não sobra nada a preencher', () => {
    for (const mission of ['world', 'gravity', 'spawn']) {
      const migrado = migrateLegacyInteractiveBlock({
        ...base,
        activity: { type: 'exploration', version: 3, mission },
      })
      expect(isInteractiveBlock(migrado), mission).toBe(true)
    }
  })

  test('⚠️ os cinco sem gabarito saem INCOMPLETOS de propósito: rascunho aceita, publicar não', () => {
    // O guarda estrito é da publicação. Migrar para "válido" exigiria INVENTAR a pergunta que a
    // professora não escreveu — e é ela quem decide se completa ou apaga o bloco.
    const migrado = migrateLegacyInteractiveBlock({
      ...base,
      activity: { type: 'prediction', options: ['a'] },
    })
    expect(migrado?.activity).toEqual({ type: 'question' })
    expect(isInteractiveBlock(migrado)).toBe(false)
  })

  test('bloco que já é do modelo de agora não é tocado', () => {
    for (const activity of [
      { type: 'experimentation', scene: 'world' },
      { type: 'demonstration', scene: 'layers' },
      { type: 'question' },
      { type: 'html', html: '<p>oi</p>' },
    ])
      expect(migrateLegacyActivity(activity), activity.type).toBeNull()
  })
})
