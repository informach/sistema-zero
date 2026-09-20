import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  blockCheckpoint,
  evaluateLearning,
  type InteractiveBlock,
  isInteractiveBlock,
  isLearningAnswers,
  isLearningFrameMessage,
  isLearningManifest,
  LEARNING_PROTOCOL,
  type LearningAnswers,
  publicInteractiveBlock,
  sectionCompletionIssues,
  validateLessonSections,
} from '../src/learning'
import {
  evaluateExperimentation,
  initialExperiment,
  initialScene,
  isSceneActivity,
  packExperiment,
  sceneStart,
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
    // ⚠️ Mudou de propósito (lote 2 do Raio-X): a frase virou voz de criança ("Ainda não é essa.
    // Olhe a cena de novo e tente outra."). O que o teste guarda é que ela diz que ERROU.
    expect(errou).toContain('não é essa')
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

  test('⚠️⚠️ a cena pede a descoberta E a regra: a evidência sozinha não fecha mais', () => {
    // O TERCEIRO tempo do ciclo (mexer, prever, ENUNCIAR) deixou de ser opcional em 15/09/2026:
    // a experimentação que não escreve pergunta herda a do modelo da cena, e é ela que dá a
    // palavra final. Antes, 44 dos 52 blocos dos cursos fechavam sem enunciar regra nenhuma.
    expect(evaluateLearning(experimento, {}).passed).toBe(false)
    const descobriu = { sceneCheckpoint: sessaoCompleta() }
    expect(evaluateLearning(experimento, descobriu).passed).toBe(false)
    expect(evaluateLearning(experimento, descobriu).feedback).toContain('escolha a frase')

    const pergunta = blockCheckpoint(experimento)
    if (!pergunta) throw new Error('a experimentação tem de herdar a pergunta do modelo')
    expect(
      evaluateLearning(experimento, { ...descobriu, checkpoint: pergunta.correctChoiceId }).passed,
    ).toBe(true)
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
  if (activity.type === 'html') answers.participated = true
  // ⚠️ Pelo RESOLVEDOR: a experimentação que não escreve pergunta herda a do MODELO da cena, e
  // é ela que o servidor cobra. O caminho de sucesso é o da criança, e ela responde a pergunta
  // que a TELA mostrou.
  const pergunta = blockCheckpoint(block)
  if (pergunta) answers.checkpoint = pergunta.correctChoiceId
  return answers
}

/**
 * O CENÁRIO declarado nos manifestos (18/09/2026).
 *
 * ⭐⭐ Toda cena de um curso mostra o JOGO daquele curso, e isso é declarado no manifesto em vez de
 * adivinhado pelo elenco de cada bloco. O levantamento que motivou a mudança: a `velocity` do
 * Desafio, cujo elenco é uma "pedra", caía no cenário do Jogo do Meu Jeito; e sete cenas de ateliê
 * do Meu Jeito caíam no Corre Dino, que é o padrão de quem não declara nada.
 */
describe('o cenário das cenas dos cursos', () => {
  /** ⚠️ Espelha o `CENARIO_DO_CURSO` da receita (`docs/aulas-interativas/qa/cenas-editorial.ts`). */
  const CENARIO_DO_CURSO: Record<string, string> = {
    'corre-dino': 'corre-dino',
    'desafio-primeiro-jogo': 'nave',
    'o-jogo-do-meu-jeito': 'meu-jeito',
  }

  const cenasDosCursos = () => {
    const achadas: { aula: string; chave: string; curso: string; cenario?: string }[] = []
    for (const pacote of PACOTES_ATUAIS) {
      const entradas: Array<{ path: string }> = JSON.parse(
        readFileSync(resolve(directory, pacote, 'catalogo.json'), 'utf8'),
      )
      for (const entrada of entradas) {
        const manifest: unknown = JSON.parse(
          readFileSync(resolve(directory, pacote, entrada.path, 'manifesto.json'), 'utf8'),
        )
        if (!isLearningManifest(manifest)) continue
        for (const bloco of manifest.blocks) {
          const conteudo = (bloco as { content?: { activity?: unknown } }).content
          const activity = conteudo?.activity
          if (!isSceneActivity(activity)) continue
          achadas.push({
            aula: `${pacote}/${entrada.path}`,
            chave: bloco.key,
            curso: manifest.courseSlug,
            cenario: activity.cenario,
          })
        }
      }
    }
    return achadas
  }

  test('a varredura ENCONTRA as cenas (anti-vácuo)', () => {
    // Sem isto, um filtro que parasse de casar deixaria os dois testes abaixo verdes e vazios.
    expect(cenasDosCursos().length).toBeGreaterThan(20)
  })

  test('⭐⭐ toda cena DECLARA o cenário: nenhuma depende de adivinhação', () => {
    const sem = cenasDosCursos()
      .filter((c) => c.cenario === undefined)
      .map((c) => `${c.aula} ${c.chave}`)
    expect(sem).toEqual([])
  })

  test('⭐⭐ e o cenário declarado é o do CURSO', () => {
    const erradas = cenasDosCursos()
      .filter((c) => c.cenario !== CENARIO_DO_CURSO[c.curso])
      .map((c) => `${c.aula} ${c.chave}: ${c.cenario} num curso ${c.curso}`)
    expect(erradas).toEqual([])
  })

  test('⚠️ o cenário DECLARADO vence a derivação pelo elenco', () => {
    // A `velocity` do Desafio tem uma "pedra" no elenco, e a pedra pertence ao Jogo do Meu Jeito.
    // Sem o campo declarado ela mostraria o mundo do outro curso — era o estado antes deste lote.
    const comPedraNoDesafio = cenasDosCursos().filter(
      (c) => c.curso === 'desafio-primeiro-jogo' && c.cenario === 'nave',
    )
    expect(comPedraNoDesafio.length).toBeGreaterThan(0)
    const desafio = PACOTES_ATUAIS.includes('desafio-primeiro-jogo-v6')
    expect(desafio).toBe(true)
  })
})
