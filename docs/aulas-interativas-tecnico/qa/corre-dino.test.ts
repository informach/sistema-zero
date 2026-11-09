import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateLearning,
  gradeLearningQuiz,
  isLearningManifest,
} from '../../../packages/core/src/learning'
import {
  initialExperiment,
  packExperiment,
  sceneEmitsSound,
  sceneStart,
  stepExperiment,
} from '../../../packages/core/src/learning/scene'
import { freeExplorationPaths } from '../../../packages/core/tests/fixtures/free-exploration-paths'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { participacoes } from './avatares-video'
import { etapasDino, ORDEM_DINO, projetoDino } from './corre-dino-etapas'
import { type Block, courseProjects } from './corre-dino-projetos-qa'
import { problemasPedagogicos } from './diretrizes-pedagogicas'
import {
  aulasDino,
  ehExperiencia,
  falasSecao,
  gerarManifestoDino,
  type SecaoDino,
  semChamados,
  telaSecao,
} from './gerar-corre-dino'
import { concordanciasErradas, PALAVRAS_DA_ESCOLA } from './palavras-da-escola'

/**
 * O que também se ouve no vídeo e fica fora de `falasSecao`: a fala da criança (Debinha ou Dedé)
 * e a resposta curta da professora antes de retomar. Passam pelos mesmos guardas da narração
 * (revisão de 10/10/2026: "Já colocamos a explosão e a tremida!" escapou porque só `falasSecao`
 * era conferida e porque o guarda do "nós" não olhava o verbo).
 */
const vozesDoAvatar = (section: SecaoDino): string[] =>
  participacoes(section).flatMap((p) => (p.reply ? [p.speech, p.reply] : [p.speech]))

/**
 * O "nós" escondido no verbo ("colocamos", "fizemos", "conseguimos", "achávamos"). "Vamos" fica,
 * porque é o convite da voz "a gente / vamos" (Diretrizes, seção 6); os outros são nomes e
 * adjetivos que só terminam igual.
 */
const NAO_E_NOS = new Set(['vamos', 'ramos', 'próximos', 'últimos', 'mínimos', 'máximos'])
const primeiraDoPlural = (texto: string): string[] =>
  [...texto.matchAll(/(?<!\p{L})\p{L}+(?:amos|emos|imos)(?!\p{L})/giu)]
    .map((m) => m[0])
    .filter((palavra) => !NAO_E_NOS.has(palavra.toLowerCase()))
/** "A gente fez", "a gente já colocou": a autoria do jogo é de quem faz a aula, na voz "você". */
const A_GENTE_FEZ = /\ba gente\s+(?:já\s+)?(?:fez|pôs|\p{L}+(?:ou|eu|iu))(?!\p{L})/iu
/**
 * "Clique em" nos botões e "toque" no jogo, nunca "aperte" (Diretrizes, seção 6). O verbo só
 * aparece dentro de rótulos reais: o bloco Quando apertar…, os botões das experiências e as frases
 * que a criança escreve no jogo (a dica da abertura e a descrição para o leitor de tela).
 */
const ROTULOS_COM_APERTAR =
  /Quando apertar (?:Espaço|a tecla|qualquer tecla ou tocar na tela)|Quando a tecla Espaço é apertada|Na hora em que a tecla foi apertada|Apertar (?:Espaço|Enter|a tecla)|Aperte qualquer tecla ou toque (?:na tela para começar|para jogar de novo)|pule os cactos apertando espaço/g
const apertarForaDosRotulos = (texto: string): string[] =>
  texto.replace(ROTULOS_COM_APERTAR, '').match(/(?<!\p{L})apert\p{L}*/giu) ?? []

const stages = etapasDino()
const manifests = ORDEM_DINO.map((slug) => {
  const value: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../aulas-interativas/inventor/corre-dino/corre-dino-${slug}.manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${slug}`)
  return value
})
const walk = (value: unknown): Block[] => {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(walk)
  const record = value as Record<string, unknown>
  return [
    ...(typeof record.type === 'string' ? [value as Block] : []),
    ...Object.values(record).flatMap(walk),
  ]
}

test('os 13 marcos continuam iguais ao jogo original independente dos critérios', () => {
  const originals = courseProjects()
  for (let i = 1; i <= 13; i++) {
    expect(stages[i]).toEqual(originals[i])
    expect(projetoDino(i).blocksState).toEqual(stages[i]!.blocksState)
  }
})

for (const [index, manifest] of manifests.entries())
  test(`${manifest.lessonSlug}: continuidade, paleta, geração estável e critérios praticáveis`, () => {
    expect(gerarManifestoDino(aulasDino[index]!, index)).toEqual(manifest)
    expect(problemasPedagogicos(manifest, true)).toEqual([])
    const studio = manifest.blocks.find((b) => b.key === 'projeto')?.content
    if (studio?.kind !== 'studio') throw new Error('Projeto ausente')
    expect(studio.initialProject).toEqual(projetoDino(index))
    expect(studio.chain).toBe('corre-dino')
    expect(studio.allowedModes).toEqual(['blocks'])
    for (const block of walk(stages[index + 1])) expect(studio.allowBlocks).toContain(block.type)
    for (const section of manifest.sections) {
      const checks = section.completion?.projectChecks ?? []
      const sample = structuredClone(stages[index + 1]!)
      // O contorno existe só enquanto se confere a área; não pertence ao programa entregue.
      if (checks.some((c) => c.id === 'raio-x')) {
        const draw = walk(sample).find((b) => b.type === 'sz_g2d_draw_sprite')!
        draw.next = {
          block: {
            type: 'sz_g2d_draw_hitbox',
            fields: { SPRITE: 'dino' },
            ...(draw.next ? { next: draw.next } : {}),
          },
        }
      }
      expect(
        evaluateStudioSectionProject(checks, sample).filter((c) => !c.passed),
        section.key,
      ).toEqual([])
    }
    const last = manifest.sections.at(-1)!
    expect(last.intent).toBe('delivery')
    expect(last.completion?.blockIds).toContain('projeto')
    expect(
      evaluateStudioSectionProject(last.completion!.projectChecks!, stages[index]!).some(
        (c) => !c.passed,
      ),
    ).toBe(true)
    if (index === 1 || index === 12) {
      const withoutDescription = structuredClone(stages[index + 1]!)
      const description = walk(withoutDescription).find(
        (b) => b.type === 'sz_g2d_set_stage_description',
      )!
      description.fields!.DESCRIPTION = ''
      expect(
        evaluateStudioSectionProject(last.completion!.projectChecks!, withoutDescription).some(
          (c) => !c.passed,
        ),
        'o envio também exige a descrição que acabou de ser ensinada',
      ).toBe(true)
    }
    expect(studio.showcase?.enabled).toBe(index === 12)
  })

test('os cinco quizzes são isolados, explicam o erro e permitem corrigir', () => {
  const lessons: number[] = []
  for (const [i, manifest] of manifests.entries())
    for (const block of manifest.blocks) {
      const quiz = block.content
      if (quiz?.kind !== 'quiz') continue
      lessons.push(i + 1)
      const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctChoiceIds]))
      expect(quiz.passingScore).toBe(100)
      expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
      const section = manifest.sections.find((s) => s.blockKeys.includes(block.key))!
      expect(section.blockKeys).toHaveLength(2)
      expect(section.workspaceKey).toBeNull()
      for (const question of quiz.questions) {
        expect(question.explanation?.length).toBeGreaterThan(30)
        for (const choice of question.choices.filter(
          (c) => !question.correctChoiceIds.includes(c.id),
        ))
          expect(gradeLearningQuiz(quiz, { ...answers, [question.id]: [choice.id] }).passed).toBe(
            false,
          )
      }
    }
  expect(lessons).toEqual([3, 6, 9, 11, 13])
})

test('a abertura é jogável e o caderno aparece uma vez, com consulta opcional', () => {
  const first = manifests[0]!
  const play = first.blocks.find((b) => b.key === 'jogo-pronto')?.content
  if (play?.kind !== 'interactive' || play.activity.type !== 'project-play')
    throw new Error('Jogo pronto ausente')
  expect(play.activity.project).toEqual(projetoDino(13))
  expect(play.activity.completion).toBe('participation')
  expect(first.sections[1]!.blockKeys).toContain('caderno')
  expect(first.sections[1]!.completion?.blockIds).not.toContain('caderno')
  expect(
    manifests.flatMap((m) => m.blocks).filter((b) => b.content?.kind === 'materials'),
  ).toHaveLength(1)
  expect(first.blocks.find((b) => b.key === 'caderno')?.content).toMatchObject({
    title: 'Passo a passo do projeto: Corre, Dino!',
  })
})

// Vocabulário do curso (Diretrizes, seção 6): a régua única do repo (`palavras-da-escola.ts`),
// a mesma do validador de roteiros e de vocabulario-crianca.test.ts. Os passos do Passo a passo do projeto
// (`caderno`) viram PDF, fora desses guardas; por isso são conferidos aqui, junto com títulos,
// Zappy, falas e critérios. Neste curso também sai "tarefa" (revisão de 06/10/2026): a régua
// comum a deixa passar por causa do cartão do Pensa ("Concluir tarefa").
test('linguagem comum nas falas, no Zappy e no Passo a passo do projeto', () => {
  for (const aula of aulasDino) {
    expect(aula.title).not.toMatch(PALAVRAS_DA_ESCOLA)
    for (const section of aula.sections)
      for (const texto of [
        section.title,
        section.bridge,
        ...falasSecao(section),
        ...vozesDoAvatar(section),
        ...(section.caderno ?? []),
        ...(section.checks ?? []).map((check) => check.label),
      ]) {
        const id = `${aula.slug}/${section.key}`
        expect(texto, id).not.toMatch(PALAVRAS_DA_ESCOLA)
        expect(texto, id).not.toMatch(/\btarefas?\b/i)
        expect(concordanciasErradas(texto), id).toEqual([])
      }
  }
  // Diretrizes, seção 5: o mapa é apresentado à criança e as escolhas são convite.
  const mapa = aulasDino[0]!.sections[1]!
  expect(mapa.title).toBe('Seu passo a passo do projeto')
  const fala = falasSecao(mapa).join(' ')
  expect(fala).toStartWith('Olha aqui: este é o seu Passo a passo do projeto!')
  expect(fala).toContain(
    'Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser.',
  )
  expect(`${fala} ${mapa.bridge}`).not.toMatch(/não precisa/i)
})

// O jogo pronto continua um exemplo na primeira pessoa (Diretrizes, seção 2): ordens para quem assiste
// só depois de "Agora é a sua vez".
const ordemParaQuemAssiste =
  /(?:^|[.!?:]\s+)(?:Clique|Toque|Leve|Mude|Observe|Compare|Deixe|Escolha|Aumente|Coloque|Troque|Ligue|Desligue|Aproxime|Escreva|Espere|Volte|Teste|Use|Acompanhe|Mantenha|Aperte|Diminua|Pule|Repita|Continue|Faça|Veja|Sorteie|Jogue|Experimente|Mexa)\b/
// O molde do convite (decisão da responsável, 02/11/2026, o do Cadê): o vídeo explica o conceito, dá
// uma analogia, diz o conceito no jogo da criança e devolve a pergunta; o fim é UM convite de uma frase
// (o que investigar, "Agora você vai investigar …", como no exemplo aprovado e nos outros cursos) e o
// fecho comum. A investigação é da criança e quem acompanha cada teste é o Zappy.
const FIM_DA_EXPERIENCIA =
  /^Agora você vai investigar [^.!?]+\. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser\. Quando terminar, clique em Próxima parte\.$/
const DEVOLVE = 'O que você acha? Isso você vai testar na experiência.'
// Proibido no vídeo da experiência: o tour pelos controles ("Olha aqui: nesta experiência, este
// botão…", "aqui você vê…"), os nomes dos botões ditos como gesto ("clique em…", "escolha…") e a
// sequência de testes ("primeiro… depois…", "faça… e depois…", "teste mais duas coisas", "nas duas
// vezes", "Repare em três coisas").
const TOUR =
  /Olha aqui|nesta experiência,|aqui você vê|\b(?:este|estes|esta|estas)\s+(?:outros?|botão|botões|campos?|listas?|régua|controles?|caixa|contador|números?|pergunta|marcador|linha)\b|\bclique em (?!Próxima parte\.$)|\b(?:escolha|aperte|toque em)\b/i
const SEQUENCIA_DE_TESTES =
  /\bprimeiro\b[^.]*\bdepois\b|\bfaça\b[^.]*\be depois\b|\bteste mais\b|\bnas duas vezes\b|\bdepois,? teste\b|(?:^|[.!?;:]\s+)por último\b|Repare em (?:duas|três) coisas|\bdepois clique\b/i
// A experiência trabalha só a IDEIA (01/11/2026): nada de bloco, área do Estúdio, regra nem código.
const ESTUDIO_NA_EXPERIENCIA =
  /\b(?:blocos?|Ao iniciar|Enquanto estiver rodando|Quando acontecer|A cada quadro do jogo|regras?|comandos?|código|Se o estado|então|senão|Estúdio|peças?)\b/i
test('experiências: conceito, analogia, o jogo dela e um convite, sem tour nem roteiro de testes (02/11/2026)', () => {
  let total = 0
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      if (!ehExperiencia(section) || section.activity?.activity.type !== 'experimentation') continue
      total++
      const id = `${aula.slug}/${section.key}`
      const a = section.activity
      if (a.activity.type !== 'experimentation') throw new Error(id)
      const fala = falasSecao(section)
      const video = fala.slice(0, -1).join(' ')
      expect(a.activity.setup?.freeExploration, id).toBe(true)
      expect(fala.at(-1), id).toMatch(FIM_DA_EXPERIENCIA)
      // A ordem do molde: conceito e analogia, o conceito no jogo dela, a pergunta devolvida e o convite.
      expect(fala.length, id).toBeGreaterThanOrEqual(5)
      expect(fala.at(-2), id).toBe(DEVOLVE)
      expect(fala.at(-3), id).toMatch(/^(?:No|O) seu jogo\b/)
      expect(fala.slice(0, -3).join(' '), id).not.toMatch(/\bseu jogo\b/i)
      expect(fala.slice(1, -3).join(' '), id).toMatch(/(?<!\p{L})(?:Sabe|Lembra|É como)(?!\p{L})/u)
      // No máximo UMA pergunta do avatar, logo depois do conceito no jogo e antes da devolução.
      const avatar = participacoes(section)
      expect(avatar.length, id).toBeLessThanOrEqual(1)
      for (const p of avatar) {
        expect(fala.at(-3)?.endsWith(p.after), id).toBe(true)
        expect(p.speech, id).toMatch(/\?$/)
        expect(p.reply, id).toBeUndefined()
      }
      for (const t of [...fala, ...vozesDoAvatar(section)]) {
        expect(t, id).not.toMatch(TOUR)
        expect(t, id).not.toMatch(SEQUENCIA_DE_TESTES)
      }
      expect(video, id).not.toMatch(
        /Esta é (?:uma|a mesma) experiência|faça esses mesmos testes|Vou te mostrar|\beu\b/,
      )
      // A pergunta que anteciparia a descoberta é devolvida à criança.
      expect(fala.join(' '), id).toContain('Isso você vai testar na experiência.')
      // Cena muda (a once-vs-always só escreve "♪ N vezes"): a fala não promete um som real.
      if (!sceneEmitsSound(a.activity.scene))
        expect([video, ...vozesDoAvatar(section)].join(' '), id).not.toMatch(/som toca/i)
      // Ponte, instrução, metas e pistas: só a ideia, com os botões da tela livre.
      const goals = a.activity.setup?.goals ?? []
      const copy = a.activity.setup?.goalCopy ?? {}
      expect(goals.length, id).toBeGreaterThan(0)
      expect(Object.keys(copy).sort(), id).toEqual([...goals].sort())
      expect(a.hints, id).toHaveLength(3)
      const textos = [
        section.bridge,
        a.instructions,
        ...a.hints,
        ...Object.values(copy).flatMap((c) => [c.label ?? '', c.pedido ?? '']),
        ...fala,
        ...vozesDoAvatar(section),
      ]
      for (const t of textos) expect(t, id).not.toMatch(ESTUDIO_NA_EXPERIENCIA)
      // A ponte convida à investigação e não repete a instrução.
      expect(section.bridge, id).not.toContain(a.instructions)
      // O convite é uma frase só, sem um imperativo misturado ("e descubra…", "e chegue…").
      expect(fala.at(-1), id).not.toMatch(
        /\b(?:e|depois) (?:descubra|chegue|termine|compare|observe|teste|veja)\b/,
      )
      // A instrução da página: o que comparar (e, no máximo, uma frase de contexto) e o fecho do Cadê,
      // sem sequência de cliques nem "termine com…".
      expect(a.instructions, id).toMatch(
        /^Compare [^.!?]+\.(?: [^.!?]+\.)? O Zappy te mostra o que testar, e você pode repetir quando quiser\.$/,
      )
      expect(a.instructions, id).not.toMatch(SEQUENCIA_DE_TESTES)
      for (const t of [a.instructions, section.bridge])
        expect(t, id).not.toMatch(/\btermine com\b/i)
      // A ponte: uma frase do que investigar, a ordem livre e o Zappy.
      expect(section.bridge, id).toMatch(
        /^Sua vez! Investigue [^.!?]+\. O Zappy te mostra o que testar, e você pode repetir quando quiser\. Quando terminar, clique em Próxima parte\.$/,
      )
      // O Passo a passo imprime só a instrução: a experiência não tem mais passos próprios.
      expect(section.caderno, id).toBeUndefined()
      // A nota de tela só amplia a experiência, mostra a cena parada e o Zappy: nada de apontar ou
      // clicar nos controles, nem gesto dentro da experiência.
      const tela = telaSecao(section)
      expect(tela, id).toContain('[ampliar experiência]')
      expect(tela, id).toContain('mostrar a cena parada')
      expect(tela, id).toContain('[apontar zappy]')
      expect(tela, id).not.toMatch(/\[apontar "|\[(?:clicar|tocar|escolher|arrastar|abrir)\b/)
      expect(tela, id).not.toMatch(/Olha aqui|apontar os (?:botões|números|jeitos|impulsos|sinais)/)
      expect(tela, id).toContain('Não fazer os testes pela criança')
      expect(tela, id).not.toMatch(/quem faz os testes é o narrador|Demonstração/)
      if (/meme/i.test(tela))
        for (const regra of [
          'desenho nosso',
          'sem foto de pessoa real',
          'sem cobrir a experiência',
        ])
          expect(tela, id).toContain(regra)
    }
  expect(total).toBe(24)
})

test('jogo pronto: um exemplo só, na primeira pessoa, e a vez passa no fim', () => {
  const abertura = aulasDino[0]!.sections[0]!
  expect(abertura.play).toBe(true)
  const falas = falasSecao(abertura)
  // Diretrizes, seção 6: a autoria é da criança e o convite é junto.
  expect(falas[0]).toStartWith('Oi! Você vai construir um jogo chamado Corre, Dino!')
  expect(falas[0]).toEndWith(
    'Antes de montar o seu, vamos ver como ele funciona nesta versão pronta.',
  )
  expect(falas[1]).toStartWith('Olha aqui: ')
  expect([...falas.slice(0, -1), ...vozesDoAvatar(abertura)].join(' ')).not.toMatch(
    ordemParaQuemAssiste,
  )
  expect(falas.at(-1)).toStartWith('Agora é a sua vez: jogue')
  expect(falas.at(-1)).toEndWith('Quando terminar, clique em Próxima parte.')
  expect(abertura.caderno?.join(' ')).toContain('Clique na área do jogo para começar.')
})

test('montagens seguem no imperativo e a publicação comemora com o link', () => {
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      expect([...falasSecao(section), ...vozesDoAvatar(section)].join(' ')).not.toMatch(
        /mexa e veja/i,
      )
      if (!section.checks?.length) continue
      expect(section.caderno, section.key).toBeUndefined()
    }
  const entrega = aulasDino[12]!.sections.at(-1)!
  expect(entrega.publish).toBe(true)
  const fala = falasSecao(entrega).join(' ')
  expect(fala).toContain('O resumo do projeto já vem preenchido. Deixe como está.')
  // Um parágrafo por momento e a ajuda de um adulto (Diretrizes, seção 5; revisão de 02/11/2026).
  expect(falasSecao(entrega).length).toBeGreaterThanOrEqual(5)
  expect(fala).toContain('Se precisar, peça ajuda a um adulto.')
  expect(fala).not.toContain('as regras que fazem essas partes')
  // O Passo a passo não aponta gestos do vídeo.
  for (const aula of aulasDino)
    for (const section of aula.sections)
      for (const paragrafo of falasSecao(section, 'mapa'))
        expect(paragrafo, section.key).not.toMatch(/Tá vendo\?|Olha aqui:|Olha só:|Repare:/)
  expect(semChamados('Olhe o jogo. Tá vendo? Nada acontece.')).toBe('Olhe o jogo. Nada acontece.')
  expect(fala).not.toContain('título')
  expect(fala).toContain(
    'Seu jogo está no Mural! Agora você, sua família e seus amigos podem jogar o jogo que você criou. Clique em Copiar link de jogar',
  )
  expect(fala).toEndWith(
    'Depois de copiar o link, clique em Fechar. Por último, clique em Concluir aula.',
  )
})

// Diretrizes, seção 6 (06/10/2026): a ponte do Zappy convida e termina na ação de saída, a montagem
// que aplica uma experiência começa pela retomada no próprio jogo, e "então" é só o encaixe do Se.
test('falas conversam: ponte com convite e saída, retomada no jogo e sem "então" de ligação', () => {
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      const id = `${aula.slug}/${section.key}`
      const ponte = section.bridge
      expect(ponte, id).toMatch(/(?:Próxima parte|Concluir aula)\.$/)
      for (const fala of [
        ponte,
        ...falasSecao(section),
        ...vozesDoAvatar(section),
        ...(section.caderno ?? []),
      ]) {
        expect(fala, id).not.toMatch(/(?:^|[.!?,;:]\s*)então\b/i)
        expect(fala, id).not.toMatch(/\b(?:nós|nosso|nossa|montamos)\b/i)
        // "estamos jogando agora?" é a pergunta escrita na tela do placar (aula 11), citada como está.
        expect(primeiraDoPlural(fala.replaceAll('estamos jogando agora?', '')), id).toEqual([])
        expect(fala, id).not.toMatch(A_GENTE_FEZ)
        expect(fala, id).not.toContain('—')
        expect(apertarForaDosRotulos(fala), id).toEqual([])
      }
      // O mapa segue o modelo aprovado do Cadê: apresenta o mapa e termina na saída.
      if (section.materials) continue
      const convite =
        ehExperiencia(section) || section.play
          ? /^Sua vez! /
          : section.questions || section.final
            ? /^Hora de [^!]+! /
            : /^Agora [^!]+! /
      expect(ponte, id).toMatch(convite)
      if (section.checks?.length && !section.final)
        expect(ponte, id).toContain('Verificar projeto e, em seguida, em Próxima parte.')
      if (section.final) expect(ponte, id).toContain('Enviar meu projeto')
      // O botão real do quiz (kids-quiz.tsx): Responder! e, se faltar acerto, Tentar de novo!
      if (section.questions) expect(ponte, id).toContain('clicar em Responder!')
      // Conferência uma vez só (Diretrizes, seção 6): depois do teste, como caminho da correção, ou
      // logo depois da montagem quando não há teste visível.
      if (section.checks?.length && !section.final) {
        const listas =
          falasSecao(section)
            .join(' ')
            .match(/confira se ficou assim/gi) ?? []
        expect(listas.length, id).toBeLessThanOrEqual(1)
      }
    }
})

// A retomada é uma ponte, não um segundo vídeo da experiência (Diretrizes, 06/10/2026, à noite):
// primeiro o problema no jogo da criança, com um chamado adequado ao efeito e o porquê; depois a lembrança, como
// solução; e o anúncio uma vez só, colado ao primeiro passo. Sem teste quando o efeito ainda não
// aparece no jogo. Teto de 50 palavras, para a versão longa não voltar.
const RETOMADA_SEM_TESTE = new Set([
  'aula-01/criar-dino',
  'aula-02/descrever-jogo',
  'aula-03/aplicar-gravidade',
  'aula-05/grupo-e-relogio',
  'aula-05/criar-cactos',
  'aula-06/faxina',
  'aula-07/relogio',
  'aula-11/caixinha-dos-pontos',
  'aula-13/numero-que-manda',
  'aula-13/relogio-da-dificuldade',
  'aula-13/acelerador-e-freio',
])
const LEMBRA = /^Lembra d(?:a|as duas) experiências?\b/
test('retomadas curtas: o problema, a lembrança e um anúncio só', () => {
  const palavras = (texto: string) => texto.split(/\s+/).filter(Boolean).length
  let total = 0
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      const id = `${aula.slug}/${section.key}`
      const falas = section.speech ?? []
      const lembra = falas.findIndex((f) => LEMBRA.test(f))
      if (!section.checks?.length || lembra < 0 || lembra > 1) continue
      total++
      const retomada = falas.slice(0, lembra + 1)
      const texto = retomada.join(' ')
      if (RETOMADA_SEM_TESTE.has(id)) {
        expect(lembra, id).toBe(0)
        expect(texto, id).not.toContain('Tá vendo?')
      } else {
        expect(lembra, id).toBe(1)
        // O pulo desta retomada ainda não tem som: chamar a escuta, sem pedir para vê-lo.
        if (id === 'aula-04/som-no-pulo') {
          expect(falas[0], id).toContain('Percebeu?')
          expect(falas[0], id).not.toContain('Tá vendo?')
        } else {
          expect(falas[0], id).toContain('Tá vendo?')
        }
        expect(falas[0], id).toMatch(/\b(?:porque|por isso)\b/)
      }
      // O anúncio fecha a lembrança, uma vez só, e diz o que vai ser montado.
      expect(falas[lembra], id).toMatch(/Agora [^.!?]*\b(?:vai|vamos)\b[^.!?]*!$/)
      expect(texto.match(/\bAgora\b/g)?.length, id).toBe(1)
      expect(texto, id).not.toMatch(/Por isso, vamos|Então, vamos|É como|Na vida/)
      expect(palavras(texto), id).toBeLessThanOrEqual(50)
    }
  // 31 desde 02/11/2026: a criação do Dino retoma as duas experiências antes dela ("Lembra das duas
  // experiências"); 11 delas só lembram, porque o efeito ainda não aparece no jogo.
  expect(total).toBe(31)
  // O lembrete de arrastar um espaço vazio fica só na primeira montagem e na aula 7, quando o
  // projeto cresce; cada passo já diz "Deixe à vista…".
  const lembrete = aulasDino.flatMap((aula) =>
    aula.sections
      .filter((s) => s.speech?.some((f) => f.startsWith('Antes de pegar cada bloco')))
      .map((s) => `${aula.slug}/${s.key}`),
  )
  expect(lembrete).toEqual(['aula-01/area-e-tela', 'aula-07/embrulhar'])
})

// Rótulos como aparecem na tela (Diretrizes, seção 2), conferidos no Studio em 06/10/2026: o + que
// cria "senão se" é o de senão se (ifElseMutator.ts), o sorteio é "um número de 1 a 6"
// (blockCatalogFundamentals.ts), a conta aparece como 0 + 0 (o nome "Conta matemática" é do
// catálogo do admin), a colisão diz "chamar o sprite de" e a limpeza do grupo diz "(chamado …)".
test('falas citam os rótulos que a criança vê', () => {
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      const id = `${aula.slug}/${section.key}`
      const texto = [
        section.bridge,
        ...falasSecao(section),
        ...vozesDoAvatar(section),
        ...(section.caderno ?? []),
      ].join(' ')
      expect(texto, id).not.toMatch(/\+ ao lado de senão/)
      // Lido em voz alta (P11, 02/11/2026): "x maior que 0" e "o estado do jogo é", sem símbolos soltos.
      expect(texto, id).not.toMatch(
        /x > 0|velocidade > -9|é \?|\(velocidade fica|\(lugar fica|um segundo e quase meio/,
      )
      // P6: "quadro" é a imagem do jogo; o bloco é A cada quadro do jogo.
      expect(texto, id).not.toMatch(/(?:dentro|fora) do quadro|Se do quadro|solte dentro do quadro/)
      expect(texto, id).not.toMatch(/um número entre|mínimo \d|máximo \d/)
      expect(texto, id).not.toContain('Conta matemática')
      expect(texto, id).not.toMatch(/apelido|campo de item/)
      // O toque só faz o Dino pular na parte de cima da tela (arcadeKitsDino.ts, controlDino).
      expect(texto, id).not.toMatch(/um toque na tela/)
    }
})

// D1 (02/11/2026): sem a troca temporária do estado para jogando. A montagem tem um caminho só, e a
// aula 7 termina com o jogo esperando em inicio; a partida começa na aula 8.
test('fase 7: sem trocar o estado para jogando e voltar, e o envio confere o estado inicio', () => {
  const fase7 = aulasDino[6]!
  for (const key of ['embrulhar', 'relogio', 'entrega']) {
    const section = fase7.sections.find((s) => s.key === key)!
    const texto = [section.bridge, ...falasSecao(section)].join(' ')
    expect(texto, key).not.toMatch(
      /por um momento|de volta para inicio|troque o estado|para jogando\. Teste/i,
    )
    expect(
      section.checks?.map((c) => c.id),
      key,
    ).toContain('cena-inicial')
  }
  expect(fase7.sections.find((s) => s.key === 'embrulhar')!.bridge).toContain(
    'deixe o estado em inicio',
  )
})

// P10 (02/11/2026): a área fica em 80 e os pontos, em 1 segundo, sem escolha opcional na montagem.
test('P10: sem valor opcional na montagem da área e dos pontos', () => {
  for (const aula of aulasDino)
    for (const section of aula.sections) {
      const texto = [
        section.bridge,
        ...falasSecao(section),
        ...(section.checks ?? []).map((c) => c.label),
      ].join(' ')
      expect(texto, `${aula.slug}/${section.key}`).not.toMatch(
        /Se quiser, (?:teste|você pode escolher)|você pode escolher um (?:valor|intervalo)|(?:porcentagem|intervalo) que você escolheu|O intervalo é seu|Vale qualquer número de 70/,
      )
    }
})

// D3 (02/11/2026): a régua dos negativos vem logo antes da velocidade sorteada, com as mesmas chaves.
test('D3: a régua dos negativos fica na aula 12, entre o lugar e a velocidade', () => {
  expect(aulasDino[11]!.sections.map((s) => s.key)).toEqual([
    'sorteio-tira-na-hora',
    'lugar-diferente',
    'regua-negativos',
    'velocidade-propria',
    'entrega',
  ])
  const regua = aulasDino[11]!.sections[2]!
  expect(regua.videoKey).toBe('video-regua-negativos')
  expect(regua.activityKey).toBe('experiencia-number-line')
  expect(aulasDino[12]!.sections.some((s) => s.key === 'regua-negativos')).toBe(false)
  const m12 = manifests[11]!
  const m13 = manifests[12]!
  for (const key of ['video-regua-negativos', 'fala-regua-negativos', 'experiencia-number-line']) {
    expect(m12.blocks.map((b) => b.key)).toContain(key)
    expect(m13.retireBlockKeys).toContain(key)
  }
  const fala13 = aulasDino[12]!.sections.flatMap((s) => falasSecao(s)).join(' ')
  expect(fala13).not.toMatch(/segunda parte desta aula/)
  expect(fala13).toContain('Lembra da régua da aula anterior?')
  expect(falasSecao(aulasDino[11]!.sections[3]!).join(' ')).toContain(
    'Tirar 1 é o mesmo que somar -1.',
  )
})

for (const manifest of manifests)
  for (const block of manifest.blocks) {
    const content = block.content
    if (content?.kind !== 'interactive' || content.activity.type !== 'experimentation') continue
    test(`${manifest.lessonSlug}/${block.key}: a instrução escrita conclui a experiência`, () => {
      if (content.activity.type !== 'experimentation') throw new Error('Cena ausente')
      expect(content.prediction).toBeUndefined()
      expect(content.checkpoint).toBeUndefined()
      expect(content.semPerguntaFinal).toBe(true)
      expect(evaluateLearning(content, {}).passed).toBe(false)
      const start = sceneStart(content.activity)
      let session = initialExperiment(start)
      // Exploração livre (02/11/2026): o caminho de sucesso da cena, o mesmo dos testes do core.
      const actions = freeExplorationPaths[content.activity.scene]
      if (!actions) throw new Error(`Percurso ausente: ${content.activity.scene}`)
      for (const action of actions) session = stepExperiment(start, session, action).session
      const result = evaluateLearning(content, {
        sceneCheckpoint: packExperiment(content.activity.scene, session),
      })
      expect(result.passed, JSON.stringify(result)).toBe(true)
    })
  }
