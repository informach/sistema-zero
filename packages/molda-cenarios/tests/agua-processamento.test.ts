import { expect, test } from 'bun:test'
import { abrirEdicaoDeTerreno, type BaseDeTerreno } from '@sistemazero/molda-cenarios-core/v2'
import { processarAgua } from '../src/oficina/agua-processamento'
import { buffersDoEstado } from '../src/oficina/terreno-processamento'

const base: BaseDeTerreno = {
  tipo: 'terreno',
  cobertura: 'grade',
  origem: { x: 0, z: 0 },
  colunas: 64,
  linhas: 64,
  passo: 1,
  min: -10,
  max: 40,
  fundo: 5,
  pecas: [],
}
test('protocolo de água devolve descritor sem malha e transfere apenas as cópias de escavação', () => {
  const estado = abrirEdicaoDeTerreno(base, new Map()),
    r = processarAgua({
      identidade: { id: 'r', nome: 'Rio' },
      intencao: {
        tipo: 'rio',
        pontos: [
          { x: 10, z: 20 },
          { x: 50, z: 20 },
        ],
        largura: 3,
        profundidade: 1,
      },
      estado,
    })
  expect(r.agua.tipo).toBe('rio')
  expect(r.terreno).toBeDefined()
  expect(r.terreno).not.toBe(estado)
  expect(buffersDoEstado(r.terreno ?? null)).toHaveLength(3)
  expect(estado.campo.alturas.every((h) => h === 5)).toBe(true)
  const mar = processarAgua({
    identidade: { id: 'm', nome: 'Mar' },
    intencao: { tipo: 'mar', nivel: 0 },
    estado: null,
  })
  expect(mar.agua.tipo).toBe('mar')
  expect(buffersDoEstado(mar.terreno ?? null)).toEqual([])
})
test('preparo recusa medidas inválidas e buffers compartilhados antes da transferência', () => {
  expect(() =>
    processarAgua({
      identidade: { id: 'a', nome: 'Água' },
      intencao: { tipo: 'rio', pontos: [], largura: -1 },
      estado: null,
    }),
  ).toThrow()
  const estado = abrirEdicaoDeTerreno(base, new Map())
  estado.campo.alturas = new Float64Array(new SharedArrayBuffer(estado.campo.alturas.byteLength))
  expect(() => buffersDoEstado(estado)).toThrow('cópia independente')
})
