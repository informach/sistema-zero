import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { bffAnswer } from '../src/lib/bff'
import { lessonPathOf } from '../src/lib/lesson-address'
import { staffFromClaims } from '../src/lib/staff'
import { agir, type JogoDaAula, ocupado, VERBOS } from '../src/lib/verbos'

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
    expect(agir('arrastar "mover" para "quando começar"', jogos)).toEqual([
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
    for (const v of VERBOS) expect(() => agir(v.exemplo, jogos)).not.toThrow()
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
    expect(bffAnswer('POST', ['blocks', 'b1', 'studio-submission'], now)).toEqual({
      kind: 'json',
      status: 200,
      body: { submittedAt: '2026-11-01T12:00:00.000Z', gamification: null },
    })
  })

  test('cada tomada começa do projeto inicial: nada enviado nem trazido', () => {
    expect(bffAnswer('GET', ['blocks', 'b1', 'studio-submission'])).toMatchObject({
      body: { project: null },
    })
    expect(bffAnswer('GET', ['blocks', 'b1', 'art-slots'])).toMatchObject({ body: { slots: [] } })
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
  })

  test('o endereço de uma aula do Kids vira a mesma aula no palco', () => {
    expect(
      lessonPathOf('https://kids-staging.up.railway.app/cursos/cade-todo-mundo/aulas/abc-123?x=1'),
    ).toBe('/aulas/cade-todo-mundo/abc-123')
    expect(lessonPathOf('/cursos/c%C3%A1/aulas/a1')).toBe('/aulas/c%C3%A1/a1')
    expect(lessonPathOf('https://kids/cursos/x')).toBeNull()
  })
})
