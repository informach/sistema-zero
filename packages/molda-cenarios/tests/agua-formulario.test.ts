import { expect, test } from 'bun:test'
import {
  abrirEdicaoDeTerreno,
  type BaseDeTerreno,
  prepararOperacaoDeAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import {
  editarAguaSemRecalcular,
  formularioDaAguaExistente,
  formularioDeAgua,
  intencaoDoFormulario,
} from '../src/oficina/agua-formulario'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: 0, z: 0 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -20,
  max: 40,
  fundo: 10,
  pecas: [],
}
test('formulários geram as cinco intenções com pontos e unidades documentais', () => {
  for (const tipo of ['mar', 'lago', 'rio', 'represa', 'cachoeira'] as const) {
    const f = formularioDeAgua(tipo)
    f.pontos = [
      { x: 8, y: 10, z: 32 },
      { x: 56, y: 6, z: 32 },
      { x: 20, y: 10, z: 20 },
    ]
    f.nivel = 11
    expect(intencaoDoFormulario(f).tipo).toBe(tipo)
    if (tipo === 'cachoeira') expect(intencaoDoFormulario(f).nado).toBe(false)
  }
  expect(() => intencaoDoFormulario(formularioDeAgua('rio'))).toThrow('Escolha 2 pontos')
  expect(() => intencaoDoFormulario({ ...formularioDeAgua('mar'), nivel: Infinity })).toThrow()
})
test('editar aparência/correnteza conserva amostras e não reescava nem grava relevo', () => {
  const operacao = prepararOperacaoDeAgua(
    { id: 'rio', nome: 'Rio' },
    {
      tipo: 'rio',
      pontos: [
        { x: 8, z: 32 },
        { x: 56, z: 32 },
      ],
      largura: 4,
      profundidade: 2,
    },
    abrirEdicaoDeTerreno(base, new Map()),
  )
  const f = formularioDaAguaExistente(operacao.agua)
  expect(f.profundidade).toBe(2)
  expect(f.pontos).toHaveLength(2)
  f.correnteza = 2
  f.aparencia.corRasa = '#69b8c4'
  const editada = editarAguaSemRecalcular(operacao.agua, f)
  expect(editada.terreno).toBeUndefined()
  expect(editada.regioes).toEqual({})
  if (editada.agua.tipo !== 'rio' || operacao.agua.tipo !== 'rio') throw Error('Esperava rio')
  expect(editada.agua.pontos).toEqual(operacao.agua.pontos)
  expect(editada.agua.correnteza).toBe(2)
  expect(operacao.agua.correnteza).toBe(1)
  const denso = {
    ...operacao.agua,
    controle: undefined,
    pontos: Array.from({ length: 256 }, (_, i) => ({ x: i / 4, y: 10 - i / 256, z: 32 })),
  }
  const semControles = formularioDaAguaExistente(denso)
  expect(semControles.pontos).toEqual([])
  expect(editarAguaSemRecalcular(denso, semControles).agua).toEqual(denso)
})
test('lago importado conserva modelo, encaixe e anéis ao mudar nível/material', () => {
  const a = prepararOperacaoDeAgua(
    { id: 'lago', nome: 'Lago' },
    { tipo: 'lago', ponto: { x: 32, z: 32 }, nivel: 11 },
    abrirEdicaoDeTerreno(base, new Map()),
  ).agua
  if (a.tipo !== 'lago') throw Error('Esperava lago')
  a.modelo = 'modelo'
  a.encaixeModelo = { nivelLocal: 1.4, materiaisDaAgua: ['agua'], materiaisSolidos: ['margem'] }
  a.giro = 0.7
  a.escala = 2
  a.origemPreenchimento = { x: 1, z: 2 }
  const f = formularioDaAguaExistente(a)
  expect(f.pontos[0]!.x).toBeCloseTo(32 + 2 * (Math.cos(0.7) + 2 * Math.sin(0.7)))
  expect(f.pontos[0]!.z).toBeCloseTo(32 + 2 * (-Math.sin(0.7) + 2 * Math.cos(0.7)))
  f.nivel = 12
  const r = editarAguaSemRecalcular(a, f)
  expect(r.agua).toMatchObject({
    modelo: a.modelo,
    encaixeModelo: a.encaixeModelo,
    contorno: a.contorno,
    nivel: 12,
  })
  expect(a.nivel).toBe(11)
})
