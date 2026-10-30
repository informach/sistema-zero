import { expect, test } from 'bun:test'
import {
  type CurriculoDeBlocos,
  ProblemaDoDesafioSchema,
  type TipoDeDesafio,
} from '@sistemazero/arquipelago-contracts'
import { analisarRepertorio } from '../../src/domain/repertorio-do-desafio'

const curso = (papel: string | null, posto: string | null = 'coder') => ({
  courseId: '11111111-1111-4111-8111-111111111111',
  titulo: 'Curso publicado',
  slug: 'curso-publicado',
  posto,
  papel,
  blocos: ['sz_js_if_else'],
})
const curriculo = (cursos: CurriculoDeBlocos['cursos']): CurriculoDeBlocos => ({
  versao: 1,
  cursos,
  catalogo: [{ type: 'sz_js_if_else', rotulo: 'Se e senão', categoria: 'Lógica' }],
})
const analisar = (c: CurriculoDeBlocos, tipo: TipoDeDesafio = 'quadro-das-cores') =>
  analisarRepertorio(['sz_js_if_else'], c, { ilha: 'bosque', tipo })

test('curso publicado ausente ou bloco desconhecido não é só aviso', () => {
  expect(analisar(curriculo([])).problemas.map((p) => p.codigo)).toEqual(['BLOCO_SEM_CURSO'])
  expect(
    analisar({ ...curriculo([curso('base2d')]), catalogo: [] }).problemas.map((p) => p.codigo),
  ).toEqual(['BLOCO_DESCONHECIDO'])
})

test('mensagem com o maior rótulo permitido cabe no contrato de publicação', () => {
  const c = curriculo([curso('power')])
  c.catalogo[0]!.rotulo = 'A'.repeat(300)
  for (const problema of analisar(c).problemas)
    expect(ProblemaDoDesafioSchema.safeParse(problema).success).toBe(true)
})
test('posto futuro, desconhecido e sem posto não cabem na ilha atual', () => {
  for (const posto of ['hacker', 'inventado', null]) {
    const r = analisar(curriculo([curso('base2d', posto)]))
    expect(r.problemas.map((p) => p.codigo)).toEqual(['CURSO_DEPOIS_DA_ILHA'])
    expect(r.cobertura[0]?.avisos).toContain('curso-depois-da-ilha')
  }
})
test('quadros usam bases ou missão do mesmo posto ou anteriores', () => {
  for (const papel of ['base2d', 'base3d', 'mission']) {
    for (const posto of ['noob', 'coder'])
      expect(analisar(curriculo([curso(papel, posto)])).problemas).toEqual([])
  }
})
test('Poderes, extras e Maestrias não viram exigência universal de cor', () => {
  for (const papel of [
    'power',
    'extra',
    'mastery-nucleus',
    'mastery-workshop',
    'mastery-project',
    null,
    'desconhecido',
  ]) {
    expect(analisar(curriculo([curso(papel)])).problemas.map((p) => p.codigo)).toEqual([
      'QUADRO_DEPENDE_DE_OPCIONAL',
    ])
  }
})
test('uma base alternativa válida basta; base futura não legitima Poder obrigatório', () => {
  expect(analisar(curriculo([curso('power'), curso('base3d', 'noob')])).problemas).toEqual([])
  expect(
    analisar(curriculo([curso('power'), curso('base3d', 'hacker')])).problemas.map((p) => p.codigo),
  ).toEqual(['QUADRO_DEPENDE_DE_OPCIONAL'])
})
test('desafio do dia e pedido podem aplicar Poder escolhido, mas não curso futuro ou ausente', () => {
  for (const tipo of ['desafio-do-dia', 'pedido-de-morador'] as const) {
    expect(analisar(curriculo([curso('power')]), tipo).problemas).toEqual([])
    expect(analisar(curriculo([curso('power', 'hacker')]), tipo).problemas[0]?.codigo).toBe(
      'CURSO_DEPOIS_DA_ILHA',
    )
    expect(analisar(curriculo([]), tipo).problemas[0]?.codigo).toBe('BLOCO_SEM_CURSO')
  }
})
