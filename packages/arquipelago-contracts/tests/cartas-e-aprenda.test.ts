import { describe, expect, test } from 'bun:test'
import {
  aprendaIssoEm,
  aprendaODesafio,
  CARTAS_LUMI,
  type CurriculoDeBlocos,
  CurriculoDeBlocosSchema,
  cartaConquistada,
  JogadorDosMembrosSchema,
  linguagemDoProjeto,
} from '../src'

describe('cartões dos Lumis', () => {
  test('ids únicos; cada bloco libera no máximo um cartão; só controle depende de bloco', () => {
    expect(new Set(CARTAS_LUMI.map((c) => c.id)).size).toBe(CARTAS_LUMI.length)
    const blocos = CARTAS_LUMI.flatMap((c) => (c.bloco ? [c.bloco] : []))
    expect(new Set(blocos).size).toBe(blocos.length)
    for (const c of CARTAS_LUMI) expect(c.bloco === null).toBe(c.tipo !== 'controle')
  })

  test('cartão do jogo vale para todos; o de controle só com o bloco; equipe vê todos', () => {
    const regar = CARTAS_LUMI.find((c) => c.id === 'regar')
    const repetir = CARTAS_LUMI.find((c) => c.id === 'repetir')
    if (!regar || !repetir) throw new Error('catálogo sem os cartões esperados')
    expect(cartaConquistada(regar, new Set())).toBe(true)
    expect(cartaConquistada(repetir, new Set())).toBe(false)
    expect(cartaConquistada(repetir, new Set(['sz_js_repeat']))).toBe(true)
    expect(cartaConquistada(repetir, 'todos')).toBe(true)
  })
})

const curso = (n: number, posto: string | null, blocos: string[], titulo = `Curso ${n}`) => ({
  courseId: `00000000-0000-4000-8000-00000000000${n}`,
  titulo,
  slug: `curso-${n}`,
  posto,
  papel: posto ? 'base2d' : null,
  blocos,
})
const curriculo: CurriculoDeBlocos = {
  versao: 1,
  cursos: [
    curso(1, 'hacker', ['sz_js_repeat'], 'Zebra'),
    curso(2, null, ['sz_js_repeat']),
    curso(3, 'coder', ['sz_js_repeat', 'sz_js_if_else']),
    curso(4, 'hacker', ['sz_js_repeat'], 'Abelha'),
    curso(5, 'coder', ['outro']),
  ],
  catalogo: [{ type: 'sz_js_repeat', rotulo: 'Repetir vezes', categoria: 'Programação' }],
}

describe('Aprenda isso em', () => {
  test('cursos que liberam o bloco, do posto mais cedo, por título, sem posto por último', () => {
    expect(aprendaIssoEm('sz_js_repeat', curriculo).map((c) => c.slug)).toEqual([
      'curso-3',
      'curso-4',
      'curso-1',
      'curso-2',
    ])
    expect(aprendaIssoEm('nenhum', curriculo)).toEqual([])
  })

  test('formatos do Members são estritos', () => {
    expect(CurriculoDeBlocosSchema.safeParse(curriculo).success).toBe(true)
    expect(JogadorDosMembrosSchema.safeParse({ posicao: 1, total: 8, blocos: [] }).success).toBe(
      true,
    )
    expect(JogadorDosMembrosSchema.safeParse({ posicao: 0, total: 8, blocos: [] }).success).toBe(
      false,
    )
  })
})

describe('A3 e A24: a linguagem do desafio e o curso dele', () => {
  test('a linguagem sai do projeto inicial; sem marca, blocos', () => {
    expect(linguagemDoProjeto({ mode: 'blocks', programmingLanguage: 'javascript' })).toBe('blocos')
    expect(linguagemDoProjeto({ mode: 'bridge', programmingLanguage: 'python' })).toBe('python')
    expect(linguagemDoProjeto({ mode: 'bridge', programmingLanguage: 'javascript' })).toBe('texto')
    expect(linguagemDoProjeto({ mode: 'code', kind: 'pro' })).toBe('pro')
    expect(linguagemDoProjeto({ files: {} })).toBe('blocos')
    expect(linguagemDoProjeto(null)).toBe('blocos')
  })

  test('em blocos, o curso mais adiantado entre os blocos; na linguagem, o curso-base do posto', () => {
    const c: CurriculoDeBlocos = {
      versao: 1,
      cursos: [curso(1, 'coder', ['a']), curso(2, 'hacker', ['b']), curso(3, 'explorer', ['a'])],
      catalogo: [],
      cursosBase: [
        {
          posto: 'explorer',
          courseId: '00000000-0000-4000-8000-000000000009',
          titulo: 'Base do Explorador',
          slug: 'base',
        },
      ],
    }
    expect(
      aprendaODesafio({ linguagem: 'blocos', posto: 'explorer', blocos: ['a', 'b'] }, c).map(
        (x) => x.titulo,
      ),
    ).toEqual(['Curso 2'])
    expect(aprendaODesafio({ linguagem: 'blocos', posto: 'coder', blocos: ['z'] }, c)).toEqual([])
    expect(
      aprendaODesafio({ linguagem: 'python', posto: 'explorer', blocos: [] }, c).map(
        (x) => x.titulo,
      ),
    ).toEqual(['Base do Explorador'])
    expect(aprendaODesafio({ linguagem: 'pro', posto: 'champion', blocos: [] }, c)).toEqual([])
    expect(CurriculoDeBlocosSchema.safeParse(c).success).toBe(true)
    expect(
      JogadorDosMembrosSchema.safeParse({
        posicao: 4,
        total: 8,
        blocos: [],
        cursosBase: ['explorer'],
      }).success,
    ).toBe(true)
  })
})
