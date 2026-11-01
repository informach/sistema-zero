import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { enviada } from '../src/lib/aula-enviada'
import { bffAnswer } from '../src/lib/bff'
import { lessonPathOf } from '../src/lib/lesson-address'
import type { PaginaDoPalco } from '../src/lib/pagina'
import { safeReturn } from '../src/lib/safe-return'
import { staffFromClaims } from '../src/lib/staff'
import { agir, type JogoDaAula, ocupado, VERBOS } from '../src/lib/verbos'

/** Uma página do palco com o Estúdio aberto: pré-visualização de 800 × 600 e blocos achados. */
const pagina = (patch: Partial<PaginaDoPalco> = {}): PaginaDoPalco => ({
  previa: () => ({ width: 800, height: 600 }),
  areaPronta: () => true,
  campo: () => ({
    alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 },
    tipo: 'menu',
    bloco: 'Deixar o sprite',
  }),
  perto: () => ({ seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 }),
  aberto: () => 'lista',
  encaixe: () => ({ seletor: '[data-palco-alvo="a2"]', u: 0.6, v: 0.2 }),
  rolagem: () => ({
    de: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.5 },
    para: { seletor: '[data-palco-alvo="a3"]', u: 0.4, v: 0.2 },
  }),
  temBotao: () => false,
  bloco: (texto, onde) => ({ seletor: `[data-palco-alvo="${onde}:${texto}"]`, u: 0.1, v: 0.5 }),
  abaixo: () => ({ seletor: '[data-palco-alvo="a5"]', u: 0.3, v: 0.6 }),
  ...patch,
})

/** O jogo pronto da Aula 1 do Cadê Todo Mundo, como o manifesto publica. */
const manifesto = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-1.manifesto.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { blocks: { key: string; content: { activity?: JogoDaAula } }[] }
const jogo = manifesto.blocks.find((b) => b.key === 'jogo-pronto')?.content.activity as JogoDaAula
const jogos = [jogo]

describe('verbos do palco', () => {
  test('achar toca no meio do esconderijo, pelo id ou pelo nome', () => {
    const [passo] = agir('achar arbusto', jogos)
    expect(passo).toEqual({
      fazer: 'clicar',
      alvo: {
        seletor: '.sz-project-play-stage',
        u: (56.5 + 161 / 2) / 640,
        v: (137 + 144 / 2) / 360,
      },
    })
    expect(agir('achar "nas pedras"', jogos)).toEqual(agir('achar pedras', jogos))
    expect(() => agir('achar lago', jogos)).toThrow(/arbusto, pedras, flores/)
  })

  test('apontar jogo aponta um ponto do palco, o meio sem números', () => {
    expect(agir('apontar jogo 75 26', jogos)[0]).toEqual({
      fazer: 'apontar',
      alvo: { seletor: '.sz-project-play-stage', u: 75 / 640, v: 26 / 360 },
    })
    expect(agir('apontar jogo', jogos)[0]).toMatchObject({ alvo: { u: 0.5, v: 0.5 } })
    expect(() => agir('apontar jogo', [])).toThrow(/jogo pronto/)
  })

  test('navegação, ampliação, livro e materiais pelos nomes da tela', () => {
    expect(agir('Próxima parte', jogos)).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Próxima parte' } },
    ])
    expect(agir('ampliar jogo', jogos)[0]).toMatchObject({ alvo: { texto: 'Ampliar jogo' } })
    expect(agir('voltar à aula', jogos)[0]).toMatchObject({ alvo: { texto: 'Voltar à aula' } })
    expect(agir('livro próxima', jogos)[0]).toMatchObject({ alvo: { rotulo: 'Próxima página' } })
    expect(() => agir('livro voar', jogos)).toThrow(/tela cheia/)
    expect(agir('apontar baixar', jogos)[0]).toMatchObject({ fazer: 'apontar' })
    expect(agir('tocar "Ligar a reação"', jogos)[0]).toMatchObject({
      alvo: { rotulo: 'Ligar a reação' },
    })
  })

  test('Estúdio: categorias em sequência, arrastar para baixo de um bloco, verificar e esperar', () => {
    expect(agir('categoria Jogo 2D > Sprites', jogos)).toEqual([
      { fazer: 'clicar', alvo: { bloco: { texto: 'Jogo 2D', area: 'toolbox' } } },
      { fazer: 'clicar', alvo: { bloco: { texto: 'Sprites', area: 'toolbox' } } },
    ])
    expect(agir('encaixar "mover" abaixo de "quando começar"', jogos)).toEqual([
      {
        fazer: 'arrastar',
        alvo: { bloco: { texto: 'mover', area: 'flyout' } },
        para: { bloco: { texto: 'quando começar', area: 'workspace', abaixo: true } },
      },
    ])
    const verificar = agir('verificar projeto', jogos)
    expect(verificar.map((p) => p.fazer)).toEqual(['clicar', 'esperar'])
    expect(verificar[1]).toMatchObject({ maximo: 180 })
  })

  test('um verbo desconhecido diz o que fazer; todo verbo listado tem exemplo que funciona', () => {
    expect(() => agir('voar', jogos)).toThrow(/Não conheço "voar"/)
    for (const v of VERBOS) expect(() => agir(v.exemplo, jogos, pagina())).not.toThrow()
  })

  test('pré-visualização: o jogo cabe inteiro, centrado, e o alvo vira o ponto certo', () => {
    // 640 × 360 numa prévia de 800 × 600: escala 1,25, 75 px de faixa em cima e embaixo.
    const [toque] = agir('tocar prévia arbusto', jogos, pagina())
    expect(toque).toEqual({
      fazer: 'clicar',
      alvo: {
        seletor: 'iframe[title="Pré-visualização"]',
        u: ((56.5 + 161 / 2) * 1.25) / 800,
        v: (75 + (137 + 144 / 2) * 1.25) / 600,
      },
    })
    expect(agir('apontar prévia 75 26', jogos, pagina())[0]).toMatchObject({ fazer: 'apontar' })
    // Sem a prévia ainda (o Estúdio acabou de expandir): espera ela aparecer e pergunta de novo.
    // Logo depois de expandir: os gestos de bloco esperam a área de trabalho.
    expect(agir('arrastar até "Ao iniciar"', jogos, pagina({ areaPronta: () => false }))).toEqual([
      {
        fazer: 'esperar',
        alvo: { seletor: 'svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable' },
        estado: 'aparecer',
        maximo: 30,
      },
      { fazer: 'continuar', acao: 'arrastar até "Ao iniciar"' },
    ])
    expect(agir('tocar prévia', jogos, pagina({ previa: () => null })).map((p) => p.fazer)).toEqual(
      ['esperar', 'continuar'],
    )
  })

  test('Estúdio: rolar, encaixar ao lado de fazer, trocar campo de menu e número', () => {
    expect(agir('arrastar até "Quando acontecer"', jogos, pagina())[0]).toMatchObject({
      fazer: 'arrastar',
    })
    expect(
      agir('arrastar até "Quando acontecer"', jogos, pagina({ rolagem: () => 'visivel' })),
    ).toEqual([
      // Já à vista: a mão só aponta, ao lado dele, no fundo da área (não em cima do bloco).
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
    expect(agir('encaixar "Deixar o sprite" em "Quando clicar ou tocar"', jogos, pagina())).toEqual(
      [
        {
          fazer: 'arrastar',
          alvo: { seletor: '[data-palco-alvo="paleta:Deixar o sprite"]', u: 0.1, v: 0.5 },
          para: { seletor: '[data-palco-alvo="a2"]', u: 0.6, v: 0.2 },
        },
        // Encaixado, a mão sai de cima do bloco (parada em cima, aparece a dica dele).
        { fazer: 'continuar', acao: 'afastar de "Deixar o sprite"' },
      ],
    )
    expect(agir('afastar de "Deixar o sprite"', jogos, pagina())).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
    expect(() =>
      agir('encaixar "Voar" em "Quando clicar ou tocar"', jogos, pagina({ bloco: () => null })),
    ).toThrow(/Abra a categoria/)
    expect(agir('encaixar "Somar 1" abaixo de "Deixar o sprite"', jogos, pagina())).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="paleta:Somar 1"]', u: 0.1, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a5"]', u: 0.3, v: 0.6 },
      },
      { fazer: 'continuar', acao: 'afastar de "Somar 1"' },
    ])
    expect(agir('apontar zappy', jogos, pagina())[0]).toMatchObject({ fazer: 'apontar' })
    expect(agir('trocar "jogador" por "escolhido"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 } },
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
      // Trocado, a mão sai de cima do bloco do campo.
      { fazer: 'continuar', acao: 'afastar de "Deixar o sprite"' },
    ])
    const numero = agir(
      'trocar "50" por "0"',
      jogos,
      pagina({
        campo: () => ({
          alvo: { seletor: '[data-palco-alvo="a4"]' },
          tipo: 'numero',
          bloco: 'Deixar o sprite',
        }),
      }),
    )
    expect(numero.map((p) => p.fazer)).toEqual(['clicar', 'digitar', 'tecla', 'continuar'])
    expect(numero[1]).toMatchObject({ texto: '0', substituir: true })
    // Um seletor do Estúdio herda do campo de texto: o robô clica e a página decide no que abriu.
    const outro = pagina({
      campo: () => ({
        alvo: { seletor: '[data-palco-alvo="a6"]' },
        tipo: 'outro',
        bloco: 'Deixar o sprite',
      }),
    })
    expect(agir('trocar "jogador" por "escolhido"', jogos, outro)).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a6"]' } },
      { fazer: 'continuar', acao: 'escolher "escolhido"' },
      { fazer: 'continuar', acao: 'afastar de "Deixar o sprite"' },
    ])
    expect(agir('escolher "escolhido"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
    ])
    expect(
      agir('escolher "Achei!"', jogos, pagina({ aberto: () => 'caixa' })).map((p) => p.fazer),
    ).toEqual(['digitar', 'tecla'])
    expect(() => agir('escolher "x"', jogos, pagina({ aberto: () => null }))).toThrow(/não abriu/)
    // Em duas falas: o clique no campo numa, a escolha na outra, e a mão sai do bloco no fim.
    expect(agir('abrir campo "jogador" em "Deixar o sprite"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 } },
    ])
    expect(agir('escolher "escolhido" em "Deixar o sprite"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
      { fazer: 'continuar', acao: 'afastar de "Deixar o sprite"' },
    ])
    expect(() => agir('abrir campo "x"', jogos, pagina({ campo: () => null }))).toThrow(
      /Não achei o campo/,
    )
    expect(() => agir('trocar "x" por "y"', jogos, pagina({ campo: () => null }))).toThrow(
      /Não achei o campo/,
    )
  })

  test('trocar um campo sem rótulo fixo não produz uma continuação inválida', () => {
    for (const tipo of ['numero', 'menu', 'outro'] as const) {
      const atual = pagina({
        campo: () => ({ alvo: { seletor: '[data-palco-alvo="sem-rotulo"]' }, tipo, bloco: '' }),
      })
      const passos = agir('trocar "50" por "0"', jogos, atual)
      for (const passo of passos)
        if (passo.fazer === 'continuar') expect(() => agir(passo.acao, jogos, atual)).not.toThrow()
      expect(passos).not.toContainEqual({ fazer: 'continuar', acao: 'afastar de ""' })
    }
  })

  test('enviar projeto confirma o envio, e reenviar confirma o reenvio', () => {
    expect(agir('enviar projeto', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Enviar meu projeto' } },
      { fazer: 'clicar', alvo: { papel: 'button', nome: 'Enviar', dentro: '[role="dialog"]' } },
    ])
    const denovo = agir('enviar projeto', jogos, pagina({ temBotao: () => true }))
    expect(denovo.map((p) => ('alvo' in p ? p.alvo : null))).toEqual([
      { texto: 'Enviar de novo' },
      { papel: 'button', nome: 'Reenviar', dentro: '[role="dialog"]' },
    ])
  })

  test('ocupado: Estúdio carregando, conferência em curso, livro preparando', () => {
    const doc = (hit: string | null, text = '') => ({
      body: { textContent: text } as HTMLElement,
      querySelector: (selector: string) =>
        selector === hit ? ({ offsetParent: {} } as unknown as Element) : null,
    })
    expect(ocupado(doc(null))).toBe(false)
    expect(ocupado(doc('[aria-busy="true"]'))).toBe(true)
    expect(ocupado(doc('.sz-lesson-objectives-action:disabled'))).toBe(true)
    expect(ocupado(doc(null, 'Carregando o livro 3D…'))).toBe(true)
  })
})

describe('rotas da aula no palco', () => {
  test('as escritas respondem sucesso sem ir à conta; só a conferência vai ao servidor', () => {
    expect(bffAnswer('POST', ['navigation'])).toEqual({ kind: 'json', status: 200, body: {} })
    expect(bffAnswer('POST', ['blocks', 'b1', 'learning-progress'])).toMatchObject({ status: 200 })
    expect(bffAnswer('POST', ['sections', 's1', 'project-check'])).toEqual({
      kind: 'project-check',
      sectionId: 's1',
    })
    expect(bffAnswer('POST', ['blocks', 'b1', 'studio-context'])).toEqual({
      kind: 'studio-context',
      blockId: 'b1',
    })
    const now = new Date('2026-11-01T12:00:00Z')
    expect(bffAnswer('POST', ['blocks', 'b1', 'studio-submission'], undefined, now)).toEqual({
      kind: 'json',
      status: 200,
      body: { submittedAt: '2026-11-01T12:00:00.000Z', gamification: null },
    })
  })

  test('o vídeo e o quiz recebem a resposta que a tela lê, sem guardar nada', () => {
    const now = new Date('2026-11-01T12:00:00Z')
    expect(
      bffAnswer(
        'POST',
        ['blocks', 'v1', 'learning-progress'],
        { revision: 'r1', answers: { watched: [[0, 10]] }, hintsUsed: 0, positionSeconds: 10 },
        now,
      ),
    ).toEqual({
      kind: 'json',
      status: 200,
      body: {
        blockId: 'v1',
        revision: 'r1',
        positionSeconds: 10,
        answers: { watched: [[0, 10]] },
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
        updatedAt: '2026-11-01T12:00:00.000Z',
      },
    })
    const quiz = bffAnswer('POST', ['blocks', 'q1', 'quiz-attempts'], { answers: { p1: ['a'] } })
    expect(quiz).toMatchObject({
      body: {
        passed: true,
        questions: [
          { questionId: 'p1', correct: true, correctChoiceIds: ['a'], explanation: null },
        ],
      },
    })
  })

  test('enviado=1 abre o Estúdio com o projeto já enviado, e só ele muda', () => {
    const now = new Date('2026-11-01T12:00:00Z')
    const lesson = {
      id: 'a',
      blocks: [
        { id: 'e', kind: 'studio', sortOrder: 1, content: {} },
        { id: 'v', kind: 'video', sortOrder: 2, content: {} },
      ],
    } as unknown as Parameters<typeof enviada>[0]
    const aula = enviada(lesson, now)
    expect(aula.blocks[0]?.studioState).toEqual({
      submitted: true,
      submittedAt: '2026-11-01T12:00:00.000Z',
    })
    expect(aula.blocks[1]).toBe(lesson.blocks[1])
    expect(lesson.blocks[0]?.studioState).toBeUndefined()
  })

  test('cada tomada começa do projeto inicial: nada enviado nem trazido', () => {
    expect(bffAnswer('GET', ['blocks', 'b1', 'studio-submission'])).toMatchObject({
      body: { project: null },
    })
    expect(bffAnswer('GET', ['blocks', 'b1', 'art-slots'])).toMatchObject({ body: { slots: [] } })
    // O certificado aparece pronto para baixar, e baixar entrega o PDF de exemplo.
    expect(bffAnswer('GET', ['blocks', 'c1', 'certificate'])).toMatchObject({
      body: { eligible: true, issued: false },
    })
    expect(bffAnswer('POST', ['blocks', 'c1', 'certificate'])).toEqual({ kind: 'certificate' })
    expect(bffAnswer('GET', ['blocks', 'b1', 'outra'])).toMatchObject({ status: 404 })
    expect(bffAnswer('DELETE', ['navigation'])).toMatchObject({ status: 404 })
  })
})

describe('entrada e endereço', () => {
  test('só a equipe ativa, sem impersonação nem sessão de perfil', () => {
    const base = { sub: 'u1', email: 'e@x', role: 'staff', status: 'active', typ: 'access' }
    expect(staffFromClaims(base)).toEqual({ id: 'u1', email: 'e@x', role: 'staff' })
    expect(staffFromClaims({ ...base, role: 'admin' })?.role).toBe('admin')
    expect(staffFromClaims({ ...base, role: 'student' })).toBeNull()
    expect(staffFromClaims({ ...base, status: 'suspended' })).toBeNull()
    expect(staffFromClaims({ ...base, act: { sub: 'a', mode: 'readonly' } })).toBeNull()
    expect(staffFromClaims({ ...base, kids: { kind: 'parent' } })).toBeNull()
    expect(staffFromClaims({ ...base, typ: 'refresh' })).toBeNull()
    expect(staffFromClaims({ ...base, typ: undefined })).toBeNull()
    expect(staffFromClaims({ ...base, desktop: { sessionId: 'd1' } })).toBeNull()
  })

  test('depois de entrar, volta só para um caminho do próprio palco', () => {
    const origin = 'https://palco.example'
    expect(safeReturn('/aulas/c/a?tomada=1', origin)).toBe('/aulas/c/a?tomada=1')
    const evils = ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'https://evil.com']
    for (const evil of evils) expect(safeReturn(evil, origin)).toBe('/')
  })

  test('o endereço de uma aula do Kids vira a mesma aula no palco', () => {
    expect(
      lessonPathOf('https://kids-staging.up.railway.app/cursos/cade-todo-mundo/aulas/abc-123?x=1'),
    ).toBe('/aulas/cade-todo-mundo/abc-123')
    expect(lessonPathOf('/cursos/c%C3%A1/aulas/a1')).toBe('/aulas/c%C3%A1/a1')
    expect(lessonPathOf('https://kids/cursos/x')).toBeNull()
  })
})
