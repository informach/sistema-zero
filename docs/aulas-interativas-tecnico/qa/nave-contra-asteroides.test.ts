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
  type SceneAction,
  sceneStart,
  stepExperiment,
} from '../../../packages/core/src/learning/scene'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { asteroidsExample } from '../../../packages/studio/src/official-extensions/game-2d/examples/arcade'
import { participacoes } from './avatares-video'
import { problemasPedagogicos } from './diretrizes-pedagogicas'
import {
  aulasNave,
  falasSecao,
  gerarManifestoNave,
  type SecaoNave,
} from './gerar-nave-contra-asteroides'
import { etapasNave, ORDEM_NAVE, projetoNave } from './nave-contra-asteroides-etapas'
import { courseProjects } from './nave-contra-asteroides-projetos-qa'

const stages = etapasNave()
const manifests = ORDEM_NAVE.map((slug) => {
  const value: unknown = JSON.parse(
    readFileSync(
      resolve(
        import.meta.dir,
        `../../aulas-interativas/construtor/nave-contra-asteroides/nave-contra-asteroides-${slug}.manifesto.json`,
      ),
      'utf8',
    ),
  )
  if (!isLearningManifest(value)) throw new Error(`Manifesto inválido: ${slug}`)
  return value
})

test('os cinco marcos e a base final são exatamente os originais', () => {
  const original = courseProjects()
  for (const [old, current] of [
    [1, 2],
    [2, 3],
    [3, 5],
    [4, 7],
    [5, 9],
  ])
    expect(stages[current!]).toEqual(original[old!])
})

for (const [index, m] of manifests.entries()) {
  test(`${m.lessonSlug}: geração estável, continuidade, paleta e critérios praticáveis`, () => {
    expect(gerarManifestoNave(aulasNave[index]!, index)).toEqual(m)
    expect(problemasPedagogicos(m, true)).toEqual([])
    const studio = m.blocks.find((b) => b.key === 'projeto')?.content
    if (studio?.kind !== 'studio') throw new Error('Projeto ausente')
    expect(studio.chain).toBe('nave-contra-asteroides')
    expect(studio.initialProject).toEqual(projetoNave(index))
    const used = [...JSON.stringify(stages[index + 1]).matchAll(/"type":"(sz_[^"]+)"/g)].map(
      (m) => m[1],
    )
    for (const type of used) expect(studio.allowBlocks).toContain(type)
    for (const section of m.sections) {
      const checks = section.completion?.projectChecks ?? []
      expect(
        evaluateStudioSectionProject(checks, stages[index + 1]!).filter((c) => !c.passed),
        section.key,
      ).toEqual([])
    }
    const finalChecks = m.sections.at(-1)!.completion!.projectChecks!
    expect(finalChecks.length).toBeGreaterThan(0)
    expect(evaluateStudioSectionProject(finalChecks, stages[index]!).some((c) => !c.passed)).toBe(
      true,
    )
    expect(studio.showcase?.enabled).toBe(index === 8)
  })
}

test('as revisões corrigem erros com explicações; só acontecem após conteúdo ensinado', () => {
  const indexes: number[] = []
  manifests.forEach((m, i) => {
    for (const b of m.blocks) {
      if (b.content?.kind !== 'quiz') continue
      indexes.push(i + 1)
      const quiz = b.content
      const answers = Object.fromEntries(quiz.questions.map((q) => [q.id, q.correctChoiceIds]))
      expect(gradeLearningQuiz(quiz, answers).passed).toBe(true)
      for (const q of quiz.questions) {
        expect(q.explanation?.length).toBeGreaterThan(30)
        const wrong = q.choices.find((c) => !q.correctChoiceIds.includes(c.id))!
        expect(gradeLearningQuiz(quiz, { ...answers, [q.id]: [wrong.id] }).passed).toBe(false)
      }
    }
  })
  expect(indexes).toEqual([2, 5, 7, 9])
})

test('a etapa da abertura espera Enter e preserva movimento, tiros e asteroides depois de começar', () => {
  const project = projetoNave(8)
  const g = exampleHarness({ ...asteroidsExample, ir: project.ir! }, () => 0.1)
  for (let i = 0; i < 100; i++) g.nextFrame()
  g.fireKey('Space')
  g.fireKey('Space', 'keyup')
  expect(g.api.sceneIs('inicio')).toBe(true)
  expect(g.groups.every((group) => group.items.length === 0)).toBe(true)
  g.fireKey('Enter')
  g.fireKey('Enter', 'keyup')
  expect(g.api.sceneIs('jogando')).toBe(true)
  g.fireKey('Space')
  g.fireKey('Space', 'keyup')
  expect(g.groups[0]!.items).toHaveLength(1)
  for (let i = 0; i < 45; i++) g.nextFrame()
  expect(g.groups[1]!.items.length).toBeGreaterThan(0)
  const ship = g.sprites.at(-1)!
  const before = ship.x
  g.fireKey('ArrowRight')
  g.nextFrame()
  g.fireKey('ArrowRight', 'keyup')
  expect(ship.x).toBeGreaterThan(before)
  g.fireKey('Enter')
  g.fireKey('Enter', 'keyup')
  expect(g.api.sceneIs('jogando')).toBe(true)
})

// O molde do Cadê (decisão da responsável, 02/11/2026): o vídeo explica o conceito, dá uma analogia,
// diz o nome no jogo dela e termina num convite de UMA frase, com o fecho combinado. A investigação é
// da criança e quem acompanha cada teste é o Zappy, dentro da experiência.
const FIM_DA_EXPERIENCIA =
  /^Agora você vai investigar [^.!?]+\. Você escolhe por onde começar e pode repetir os testes\. O Zappy ajuda a observar as diferenças\. Quando terminar, clique em Próxima parte\.$/
// Nada de tour pelos controles: "Olha aqui: nesta experiência", "este botão", "esta régua"...
const TOUR =
  /Olha aqui|nesta experiência|\baqui você vê\b|\b(?:este|estes|esta|estas) (?:botão|botões|campo|campos|lista|régua|caixa|faixa|tira|contador|controles?|números?)\b/i
// Nada de roteiro de testes: "primeiro… depois…", "faça… e depois…", "Nas duas vezes"...
const ROTEIRO_DE_TESTES =
  /\bPrimeiro,|\bnas duas vezes\b|\bteste mais (?:uma|duas|três)\b|\bfaça [^.]* e depois\b|\bdepois,? (?:teste|faça|clique|compare)\b|\bRepare em (?:duas|três) coisas\b/i
const PERGUNTA_DEVOLVIDA = 'O que você acha? Isso você vai testar na experiência.'
const ESCOLHA_DA_ORDEM = 'Você escolhe a ordem e pode repetir quando quiser.'
// A experiência trabalha só a IDEIA (01/11/2026): nada de bloco, área do Estúdio, regra nem código.
const ESTUDIO_NA_EXPERIENCIA =
  /\b(?:blocos?|Ao iniciar|Enquanto estiver rodando|Quando acontecer|A cada quadro do jogo|regras?|comandos?|código|Se o estado|então|senão|Estúdio)\b/i
// O vídeo não narra uma sequência de cliques: só aponta os controles e convida.
const SEQUENCIA = /\b(?:depois clique|clique em [^.]*\. Depois|e clique em [^.]* de novo)\b/i

test('experiências: ideia, convite e controles reais, sem blocos nem resultado antes do teste (02/11/2026)', () => {
  let experiencias = 0
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      const experiencia = s.activity?.activity.type === 'experimentation'
      if (!experiencia && !s.play) continue
      const id = `${aula.slug}/${s.key}`
      const fala = s.speech ?? []
      const video = fala.slice(0, -1).join(' ')
      if (experiencia) {
        experiencias++
        const a = s.activity!
        if (a.activity.type !== 'experimentation') throw new Error(id)
        expect(a.activity.setup?.freeExploration, id).toBe(true)
        expect(fala.at(-1), id).toMatch(FIM_DA_EXPERIENCIA)
        expect(fala.join(' '), id).not.toMatch(TOUR)
        expect(fala.join(' '), id).not.toMatch(ROTEIRO_DE_TESTES)
        expect(video, id).not.toMatch(SEQUENCIA)
        // A pergunta do avatar fica (uma) e volta para a criança, igual ao molde.
        if (s.avatar) {
          expect(participacoes(s), id).toHaveLength(1)
          expect(fala, id).toContain(PERGUNTA_DEVOLVIDA)
        }
        // Na tela: só ampliar a experiência e mostrar a cena parada, sem apontar os controles dela.
        expect(s.screen, id).toContain('[ampliar experiência]')
        expect(s.screen, id).not.toMatch(/\[apontar "/)
        expect(s.screen, id).not.toMatch(TOUR)
        expect(video, id).not.toMatch(
          /Esta é (?:uma|a mesma) experiência|faça esses mesmos testes|Vou te mostrar/,
        )
        // A pergunta que anteciparia a descoberta é devolvida à criança.
        expect(fala.join(' '), id).toContain('Isso você vai testar na experiência.')
        // Ponte, instrução, metas e pistas: só a ideia, com os botões da tela livre.
        const goals = a.activity.setup?.goals ?? []
        const copy = a.activity.setup?.goalCopy ?? {}
        expect(Object.keys(copy).sort(), id).toEqual([...goals].sort())
        expect(a.hints, id).toHaveLength(3)
        const textos = [
          s.bridge,
          a.instructions,
          ...a.hints,
          ...Object.values(copy).flatMap((c) => [c.label ?? '', c.pedido ?? '']),
          ...fala,
          ...participacoes(s).flatMap((p) => [p.speech, p.reply ?? '']),
        ]
        for (const t of textos) expect(t, id).not.toMatch(ESTUDIO_NA_EXPERIENCIA)
        // A ponte convida à investigação e não repete a instrução.
        expect(s.bridge, id).not.toContain(a.instructions)
        expect(s.bridge, id).toMatch(
          /^Sua vez! Investigue [^.!?]+\. Você escolhe a ordem dos testes, e o Zappy sugere o que observar\. Quando terminar, clique em Próxima parte\.$/,
        )
        // A instrução diz o que comparar, numa frase, e devolve a ordem à criança: sem sequência.
        expect(a.instructions, id).toMatch(/^Compare [^.!?]+\. /)
        expect(a.instructions, id).toEndWith(ESCOLHA_DA_ORDEM)
        expect(
          a.instructions.split(/[.!?](?:\s|$)/).filter((f) => f.trim()),
          id,
        ).toHaveLength(2)
        expect(a.instructions, id).not.toMatch(ROTEIRO_DE_TESTES)
        expect(a.instructions, id).not.toMatch(/\bDepois\b|\bClique em\b/)
      } else {
        // Três vozes (06/10/2026): a autoria é dela e o convite é junto.
        expect(fala[0], id).toStartWith(
          'Oi! Você vai construir um jogo chamado Nave Contra Asteroides. Nesse jogo, a nave atira nas pedras que caem do espaço, e cada acerto vale um ponto.',
        )
        expect(fala[0], id).toContain(
          'Você ganha ao chegar a 26 pontos e perde se as três vidas acabarem.',
        )
        expect(fala[0], id).toEndWith(
          'Antes de montar o seu, vamos ver como ele funciona nesta versão pronta.',
        )
        expect(fala.at(-1), id).toMatch(
          /^Agora é a sua vez: jogue .*Quando terminar, clique em Próxima parte\.$/,
        )
        expect(video.match(/Olha aqui: /g), id).toHaveLength(1)
        expect(video, id).not.toContain('Agora é a sua vez')
      }
      // A nota de tela segue a receita da ESPEC-ROTEIRO §9.8: os gestos são da gravação.
      expect(s.screen, id).not.toMatch(/sem antecipar|sem realizar|Não executar|pela pessoa/)
      if (/meme/i.test(s.screen ?? ''))
        for (const regra of [
          'desenho nosso',
          'sem foto de pessoa real nem meme da internet',
          '2 a 3 segundos',
          'sem cobrir a experiência',
        ])
          expect(s.screen, id).toContain(regra)
    }
  // 21 desde 02/11/2026: o tamanho do passinho (Dia 1) e a meta do jogo (Dia 5) viraram experiências.
  expect(experiencias).toBe(21)
})

/**
 * O que a criança ouve no vídeo além da professora: a fala do avatar e a resposta curta da
 * professora a ele (`reply`). Os guardas de fala valem para esses trechos também (revisão de
 * 10/10/2026: "apertar" tinha passado só na voz do avatar).
 */
const falasDosAvatares = (s: SecaoNave): string[] =>
  participacoes(s).flatMap((a) => [a.speech, ...(a.reply ? [a.reply] : [])])

test('falas para a criança: sem o nome interno da parte e com a publicação comemorada', () => {
  const falas = aulasNave.flatMap((a) =>
    a.sections.flatMap((s) => [s.bridge, ...falasSecao(s), ...falasDosAvatares(s)]),
  )
  expect(falas.filter((f) => /mexa e veja/i.test(f))).toEqual([])
  const publicacao = aulasNave.flatMap((a) => a.sections).filter((s) => s.publish)
  expect(publicacao).toHaveLength(1)
  const fala = falasSecao(publicacao[0]!).join(' ')
  expect(fala).toContain('O resumo do projeto já vem preenchido. Deixe como está.')
  expect(fala).toContain('Seu jogo está no Mural!')
  expect(fala).toContain('Clique em Copiar link de jogar')
  expect(fala).toMatch(/clique em Fechar\. Por último, clique em Concluir aula\.$/)
  expect(fala).not.toContain('Confira o título')
})

test('falas para a criança: botões da aula pelo nome novo e o Mapa como convite (06/10/2026)', () => {
  const verificacao =
    'Funcionou? Clique em Verificar projeto. Se faltar alguma coisa, corrija os blocos e clique novamente.'
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      if (!s.checks?.length) continue
      const id = `${aula.slug}/${s.key}`
      // Com a publicação, o fecho ganha um parágrafo por momento (02/11/2026): verificar e enviar,
      // convite, Compartilhar e link e saída. O fecho é lido do parágrafo da verificação em diante.
      const falas = falasSecao(s)
      const inicio = falas.findIndex((p) => p.startsWith(verificacao))
      expect(inicio, id).toBe(falas.length - (s.publish ? 4 : 1))
      const fim = falas.slice(inicio).join(' ')
      expect(fim, id).toStartWith(verificacao)
      expect(fim, id).not.toContain('espere aparecer Salvo')
      if (!s.final)
        expect(fim, id).toEndWith('Quando aparecer Objetivo cumprido!, clique em Próxima parte.')
      else {
        expect(fim, id).toContain(
          'Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.',
        )
        expect(fim, id).toEndWith(
          s.publish
            ? 'Por último, clique em Concluir aula.'
            : 'Quando aparecer Projeto enviado!, clique em Concluir aula.',
        )
      }
    }
  const mapa = aulasNave[0]!.sections.find((s) => s.materials)!
  const falaDoMapa = [mapa.bridge, ...(mapa.speech ?? [])].join(' ')
  expect(mapa.title).toBe('Seu passo a passo do projeto')
  expect(mapa.speech?.[0]).toStartWith('Olha, aqui está o Passo a passo do projeto.')
  expect(falaDoMapa).toContain(
    'Se quiser, você pode ler aqui mesmo. E, se preferir, também pode clicar em Baixar para guardar o material e consultar onde quiser.',
  )
  expect(falaDoMapa).not.toMatch(/não precisa/i)
})

// Régua de 06/10/2026 (Diretrizes, seção 6): pontes que convidam e terminam na saída, retomadas
// que testam no próprio jogo e conversa sem "então" de ligação, porque o Se tem o encaixe então.
const SAIDA = /(?:clique em Próxima parte|clique em Concluir aula)\.$/
const CONVITE = /^(?:Sua vez!|Agora\b[^.!?]*!|Hora d[eo]\b[^.!?]*!)/
// Efeito invisível no jogo: a retomada só lembra a experiência, sem inventar teste.
// Na faxina (02/11/2026), o tiro que sai da tela continua no grupo sem nada mudar na tela: atirar no
// jogo "mostrava" os tiros sumindo e sugeria o contrário da experiência.
const RETOMADA_SEM_TESTE = new Set([
  'primeira-nave/criar-nave',
  'dia-2/tiro-da-nave',
  'dia-2/faxina',
])

test('pontes do Zappy: convidam e terminam na ação de saída (06/10/2026)', () => {
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      const id = `${aula.slug}/${s.key}`
      expect(s.bridge, id).toMatch(SAIDA)
      // O Mapa repete a ponte aprovada no Cadê e no Farol: "Este é o seu Passo a passo do projeto!".
      if (s.materials) expect(s.bridge, id).toStartWith('Este é o seu Passo a passo do projeto!')
      else expect(s.bridge, id).toMatch(CONVITE)
      if (s.activity?.activity.type === 'experimentation' || s.play)
        expect(s.bridge, id).toStartWith('Sua vez!')
      if (s.checks?.length)
        expect(s.bridge, id).toContain(
          s.final
            ? 'clique em Verificar projeto e envie o seu projeto.'
            : 'clique em Verificar projeto. Depois, clique em Próxima parte.',
        )
    }
})

// A retomada é uma ponte, não um segundo vídeo da experiência: umas 50 palavras (Diretrizes, §2,
// 06/10/2026, à noite). O teto impede a volta da versão longa, que tinha de 60 a 99.
const TETO_DA_RETOMADA = 55
const LEMBRANCA = /\bLembra d[ao]s? [^?]*experiências?\b[^?]*\?/

test('retomadas: primeiro o problema no seu jogo, depois a lembrança e um anúncio só (06/10/2026)', () => {
  let retomadas = 0
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      const fala = s.speech ?? []
      // A lembrança abre a retomada sem teste ou vem logo depois do teste no jogo da criança.
      const i = fala.slice(0, 2).findIndex((p) => LEMBRANCA.test(p))
      if (i < 0) continue
      const id = `${aula.slug}/${s.key}`
      retomadas++
      const retomada = fala.slice(0, i + 1).join(' ')
      // O anúncio vem uma vez só, no fim da lembrança, colado ao primeiro passo da montagem.
      expect(fala[i], id).toMatch(/Agora a gente vai [^.!?]*\bseu jogo\b[^.!?]*!$/)
      expect(retomada.match(/Agora a gente vai/g), id).toHaveLength(1)
      expect(retomada, id).not.toMatch(/\bvamos\b/)
      expect(fala[i + 1] ?? '', id).not.toMatch(/^(?:Por isso|Para [^,.!?]*|Agora), vamos\b/)
      expect(retomada, id).not.toMatch(/clique em Anterior/i)
      expect(retomada.split(/\s+/).length, id).toBeLessThanOrEqual(TETO_DA_RETOMADA)
      if (RETOMADA_SEM_TESTE.has(id)) {
        // Efeito invisível: só a lembrança e o anúncio, sem inventar teste.
        expect(i, id).toBe(0)
        expect(retomada, id).not.toContain('Tá vendo?')
        continue
      }
      // Primeiro o problema: o teste no jogo dela, com "Tá vendo?" e o porquê numa frase só.
      expect(i, id).toBe(1)
      expect(fala[0], id).toMatch(/\bseu jogo\b[^?]*\. Tá vendo\? [^.!?]*\bporque\b[^.!?]*\.$/)
    }
  // 21 desde 02/11/2026: as quatro montagens divididas ganharam retomadas próprias; 22 com a dos
  // finais, que retoma a meta do jogo (Dia 5).
  expect(retomadas).toBe(22)
})

test('conferência: uma lista só por montagem e, com teste, depois dele (06/10/2026)', () => {
  let depoisDoTeste = 0
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      if (s.activity || s.play) continue
      const id = `${aula.slug}/${s.key}`
      for (const meio of ['video', 'mapa'] as const) {
        const fala = falasSecao(s, meio)
        const listas = fala.filter((p) => /confira se ficou assim/i.test(p))
        expect(listas.length, `${id} (${meio})`).toBeLessThanOrEqual(1)
        // Quando a lista é o caminho da correção, ela vem depois do teste e manda voltar aos blocos.
        const k = fala.findIndex((p) => /volte aos blocos e confira se ficou assim/.test(p))
        if (k < 0) continue
        if (meio === 'video') depoisDoTeste++
        expect(fala.slice(0, k).join(' '), `${id} (${meio})`).toMatch(
          /\b(?:teste|Teste|olhe|Olhe|Olha só|olha só|clique na área do jogo)\b/,
        )
      }
    }
  expect(depoisDoTeste).toBeGreaterThan(15)
})

test('mapa e rótulos: o Mapa não aponta para o vídeo e o som do disparo é tiro grande (06/10/2026)', () => {
  const chamado = /(?:^|[.!?:]\s)(?:Olha aqui|Olha só:|Tá vendo\?|Repare)/
  let montagens = 0
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      if (s.activity || s.play || s.materials || !s.speech?.length) continue
      montagens++
      for (const p of falasSecao(s, 'mapa')) expect(p, `${aula.slug}/${s.key}`).not.toMatch(chamado)
    }
  expect(montagens).toBeGreaterThan(20)
  // "tiro" no menu do Tocar efeito é o laser; o disparo do jogo original é "shoot", o tiro grande.
  const falas = aulasNave.flatMap((a) => a.sections.flatMap((s) => falasSecao(s))).join(' ')
  expect(falas).toContain('No menu, escolha tiro grande.')
  expect(falas).not.toMatch(/Tocar efeito tiro(?! grande)/)
  expect(falas).not.toMatch(/\+ ao lado de senão se/)
  // A frase de achar o lugar fora da tela fica na primeira montagem e na da área nova.
  expect(falas.match(/arrastar um espaço vazio entre os blocos/g)).toHaveLength(2)
})

/**
 * "Clique em" nos botões e "toque em" no jogo, nunca "aperte" nem "apertar" (Diretrizes, seção 6).
 * Só ficam de fora os rótulos que a criança lê na tela: o bloco Quando apertar a tecla, os botões
 * Apertar a tecla e Apertar Enter das experiências e a dica "Aperte Enter para…", que ela mesma
 * escreve no jogo. Com maiúscula, como na tela: "eu apertar a tecla" na fala continua barrado.
 */
const ROTULOS_COM_APERTAR =
  /\bQuando apertar a tecla\b|\bApertar (?:a tecla|Enter)\b|\bAperte Enter para\b/g
const APERTAR = /\bapert(?:e|em|o|a|am|ar|ando|ou|ei)\b/gi
// Três vozes (Diretrizes, seção 6): "a gente" e "o seu jogo", nunca o "nós" de sala de aula.
const NOS_DE_SALA = /\b(?:nós|nosso|nossa|nossos|nossas|montamos)\b/i

test('conversa: sem "então" de ligação, sem "aperte" e sem troque e volte na entrega (06/10/2026)', () => {
  for (const aula of aulasNave)
    for (const s of aula.sections) {
      const id = `${aula.slug}/${s.key}`
      // A fala do avatar e a resposta da professora a ele também são ouvidas (10/10/2026).
      const falas = [
        s.bridge,
        ...falasSecao(s),
        ...falasDosAvatares(s),
        ...(s.questions ?? []).flatMap((q) => [q.prompt, ...q.choices.map((c) => c.label)]),
      ].join(' ')
      // "então" só como o encaixe do bloco Se: "dentro do então", "no então desse senão se".
      expect(falas.match(/(?<!\b(?:do|no|o|desse|dessa)\s)\bent[ãa]o\b/gi), id).toBeNull()
      expect(falas.replace(ROTULOS_COM_APERTAR, '').match(APERTAR), id).toBeNull()
      expect(falas, id).not.toMatch(NOS_DE_SALA)
      expect(falas, id).not.toContain('—')
    }
  // Achado M1: a entrega da chuva de pedras não manda trocar 40 por 80 e voltar.
  const chuva = aulasNave.find((a) => a.slug === 'chuva-de-asteroides')!.sections.at(-1)!
  expect(chuva.title).toBe('Teste e envie a sua chuva de pedras')
  expect(falasSecao(chuva).join(' ')).not.toMatch(/\b80\b/)
  // Achado B4: "parte" agora é a parte; o pedaço do evento Enter que fica não se chama parte.
  const enter = aulasNave.find((a) => a.slug === 'dia-5')!.sections.find((s) => s.key === 'enter')!
  expect(enter.speech?.join(' ')).toContain('e esse pedaço fica como está.')
  expect(enter.speech?.join(' ')).not.toContain('Vamos manter essa parte')
})

const seconds = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 }))
const quadros = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 / 30 }))
// Caminhos reproduzem os controles pedidos nas falas, sem usar as rotas genéricas de QA.
const spokenRoutes: Record<string, SceneAction[]> = {
  'primeira-nave/experiencia-areas': [
    { type: 'place-in-area', card: 'move', area: 'start' },
    ...seconds(6),
    { type: 'place-in-area', card: 'move', area: 'loop' },
    ...seconds(6),
  ],
  'dia-2/experiencia-tres-areas': [
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...seconds(3),
    { type: 'trigger' },
    { type: 'place-in-area', card: 'event', area: 'loop' },
    ...seconds(3),
  ],
  'dia-4/experiencia-uma-vez': [
    { type: 'place-in-area', card: 'lives', area: 'start' },
    ...seconds(3),
    { type: 'place-in-area', card: 'lives', area: 'loop' },
    ...seconds(3),
  ],
  // A câmera lenta do Farol, com a nave (02/11/2026): passinhos, parada e velocidade de verdade.
  'dia-1/experiencia-seta-e-velocidade': [
    { type: 'walk-pace', pace: 'lenta' },
    { type: 'hold-arrow', held: true },
    ...quadros(2),
    { type: 'hold-arrow', held: false },
    ...quadros(1),
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    ...quadros(45),
  ],
  // O tamanho do passinho (02/11/2026): os dois passinhos, dois quadros seguidos em câmera lenta.
  'dia-1/experiencia-tamanho-do-passinho': [
    { type: 'walk-pace', pace: 'lenta' },
    { type: 'walk-speed', speed: 1 },
    { type: 'hold-arrow', held: true },
    ...quadros(2),
    { type: 'walk-speed', speed: 3 },
    ...quadros(2),
  ],
  // A beirada do Farol, com a nave: sai sem o limite, volta com o limite ligado e fica na beirada.
  'dia-1/experiencia-limite-da-tela': [
    { type: 'hold-arrow', held: true },
    ...quadros(80),
    { type: 'keep-on-screen', enabled: true },
    ...quadros(2),
    { type: 'keep-on-screen', enabled: false },
    { type: 'keep-on-screen', enabled: true },
    ...quadros(1),
  ],
  world: [{ type: 'create' }, { type: 'connect', port: 'draw', enabled: true }],
  'draw-loop': [
    { type: 'advance', seconds: 0.5 },
    { type: 'loop', on: true },
    { type: 'advance', seconds: 1 },
    { type: 'erase', on: true },
    { type: 'advance', seconds: 0.5 },
  ],
  layers: [
    { type: 'layer', front: true },
    { type: 'layer', front: false },
    { type: 'layer', front: true },
  ],
  velocity: [
    { type: 'velocity', vx: 0, vy: -9 },
    { type: 'advance', seconds: 0.6 },
    { type: 'velocity', vx: 0, vy: 9 },
    { type: 'advance', seconds: 0.6 },
  ],
  spawn: [
    ...seconds(1),
    { type: 'connect', port: 'timer', enabled: true },
    ...seconds(4),
    { type: 'interval', seconds: 20 / 30 },
    ...seconds(3),
  ],
  random: [
    { type: 'sample', kind: 'position', unit: 0.1, guided: false },
    { type: 'sample', kind: 'position', unit: 0.8, guided: false },
    ...seconds(2),
  ],
  coordinates: [
    { type: 'place', x: 500, y: 40 },
    { type: 'place', x: 500, y: 120 },
    { type: 'place', x: 0, y: 0 },
  ],
  'fixed-vs-read': [
    { type: 'shoot' },
    { type: 'place', x: 640, y: 0 },
    { type: 'shoot' },
    { type: 'value-source', source: 'read' },
    { type: 'shoot' },
    { type: 'place', x: 200, y: 0 },
    { type: 'shoot' },
    { type: 'box-marks', on: true },
    { type: 'shoot' },
  ],
  cleanup: [...seconds(6), { type: 'connect', port: 'cleanup', enabled: true }, ...seconds(2)],
  // Na tela livre, trocar a escolha depois de o tempo andar recomeça a trombada (sem `reset`).
  'collision-pair': [
    { type: 'command-target', subject: 'shot', target: 'group' },
    { type: 'command-target', subject: 'rock', target: 'group' },
    ...seconds(1),
    { type: 'command-target', subject: 'shot', target: 'alias' },
    { type: 'command-target', subject: 'rock', target: 'alias' },
    ...seconds(3),
  ],
  variable: [
    { type: 'store', value: 1 },
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
    { type: 'change', by: 1 },
  ],
  // Trocar a proteção recomeça as batidas (tela livre): sem `reset` entre os testes.
  invincibility: [0, 45, 15].flatMap(
    (frames) =>
      [
        { type: 'shield', frames },
        { type: 'advance-to' },
        { type: 'advance-to' },
        { type: 'advance-to' },
      ] as SceneAction[],
  ),
  // Caso pedra-40-quadros: na abertura, a peça dentro do Se espera "uns quatro segundos".
  'game-state': [
    ...seconds(3),
    { type: 'connect', port: 'condition', enabled: true },
    ...seconds(4),
    { type: 'start', input: 'tap' },
    ...seconds(3),
  ],
  // A meta do jogo (Dia 5, 02/11/2026): os dois sinais até a vitória e a placa no meio da partida.
  'score-goal': [
    { type: 'goal-op', op: '>=' },
    { type: 'goal-hit' },
    { type: 'goal-hit' },
    { type: 'goal-hit' },
    { type: 'goal-op', op: '>' },
    { type: 'goal-hit' },
    { type: 'goal-hit' },
    { type: 'goal-hit' },
    { type: 'goal-hit' },
    { type: 'goal-restart' },
    { type: 'goal-hit' },
    { type: 'goal-edit' },
  ],
  restart: [
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
    ...seconds(3),
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
  ],
}
for (const m of manifests)
  for (const b of m.blocks) {
    const c = b.content
    if (c?.kind !== 'interactive' || c.activity.type !== 'experimentation') continue
    test(`${m.lessonSlug}/${b.key}: a instrução narrada conclui ${c.activity.scene}`, () => {
      if (c.activity.type !== 'experimentation') throw new Error('Cena ausente')
      const start = sceneStart(c.activity)
      let session = initialExperiment(start)
      const actions = spokenRoutes[`${m.lessonSlug}/${b.key}`] ?? spokenRoutes[c.activity.scene]
      if (!actions) throw new Error(`Percurso não revisado: ${c.activity.scene}`)
      for (const action of actions) session = stepExperiment(start, session, action).session
      const result = evaluateLearning(c, {
        sceneCheckpoint: packExperiment(c.activity.scene, session),
      })
      expect(result.passed, JSON.stringify(result)).toBe(true)
    })
  }
