import { describe, expect, test } from 'bun:test'
import {
  aprendaIssoEm,
  CARTAS_LUMI,
  type CurriculoDeBlocos,
  CurriculoDeBlocosSchema,
  cartaConquistada,
  JogadorDosMembrosSchema,
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
