import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  compactarResultado,
  criarSalvamentoInicial,
  PERCURSOS,
  resultadoDoPercurso,
} from '@sistemazero/arquipelago-contracts'
import { ALTURA_DA_TERRA, FAROL } from '../src/mundo/medidas'
import { PARADAS_DO_FAROL, subidaDoFarolNoMundo } from '../src/mundo/subida-do-farol'
import { percursosDoAlbum } from '../src/sistemas/album'
import { podeSubirOFarol } from '../src/sistemas/final-do-farol'
import {
  FALTA_O_PLANADOR_NO_FAROL,
  PERCURSO_DO_FAROL,
  PERCURSOS_DO_JOGO,
} from '../src/sistemas/percurso'
import { pegarPlanador } from '../src/sistemas/planador'
import { carregarGlb } from './ajuda-colisores'

/**
 * A subida final por fora do Farol no jogo (E04, a Lenda): o percurso `farol-subida` lido das
 * âncoras do `farol.glb`, com a escada, as quinas, o equilíbrio e o vento registrados no mundo.
 */
describe('a subida do Farol no jogo', () => {
  test('o percurso tem as cinco paradas, a varanda na chegada e os cinco vagalumes', async () => {
    const raiz = await carregarGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'mundo', 'farol.glb'),
    )
    const subida = subidaDoFarolNoMundo(raiz)
    if (!subida) throw new Error('sem a subida')
    expect(subida.pontos.deques).toHaveLength(PARADAS_DO_FAROL - 1)
    expect(subida.pontos.vagalumes).toHaveLength(PERCURSO_DO_FAROL.vagalumes)
    // A chegada é a varanda, lá no alto, e cada parada sobe em relação à de antes.
    const alturas = [subida.pontos.largada, ...subida.pontos.deques, subida.pontos.chegada].map(
      (p) => p.y,
    )
    expect(subida.pontos.chegada.y).toBe(Math.max(...alturas))
    expect(subida.escadas).toHaveLength(1)
    expect(subida.bordas).toHaveLength(2)
    expect(subida.equilibrios).toHaveLength(1)
    expect(subida.corrente?.topo).toBeGreaterThan(subida.corrente?.base ?? 0)
    // No mundo, em volta do pé do Farol.
    const l = subida.pontos.largada
    expect(Math.hypot(l.x - FAROL.x, l.z - FAROL.z)).toBeLessThan(8)
    expect(l.y).toBeGreaterThanOrEqual(ALTURA_DA_TERRA - 0.5)
  })

  test('só na Lenda e em casa; o resultado vai ao salvamento em tupla e ao álbum', () => {
    expect(podeSubirOFarol(7)).toBe(false)
    expect(podeSubirOFarol(8)).toBe(true)
    expect(podeSubirOFarol(8, true)).toBe(false)
    expect(PERCURSOS).toContain('farol-subida')
    expect(PERCURSOS_DO_JOGO['farol-subida']).toBe(PERCURSO_DO_FAROL)
    const resultado = {
      estrelas: { chegada: true, tempo: false, vagalumes: true },
      melhorTempoMs: 52_000,
    }
    const s = {
      ...criarSalvamentoInicial(new Date()),
      percursos: { 'farol-subida': compactarResultado(resultado) },
    }
    expect(resultadoDoPercurso(s.percursos, 'farol-subida')).toEqual(resultado)
    const doFarol = percursosDoAlbum(s).itens.find((p) => p.id === 'farol-subida')
    expect(doFarol?.estrelas.map((e) => e.ganhou)).toEqual([true, false, true])
    expect(PERCURSO_DO_FAROL.falaDoComeco).not.toMatch(/[—–!]/)
  })
})

describe('o que a subida do Farol pede antes da largada (lacunas, 01/11/2026)', () => {
  test('sem o planador, a largada diz o que falta e aponta a escada de dentro', () => {
    const sem = criarSalvamentoInicial(new Date())
    const fala = PERCURSO_DO_FAROL.exige(sem)
    expect(fala).toBe(FALTA_O_PLANADOR_NO_FAROL)
    expect(fala).toContain('planador')
    expect(fala).toContain('escada de dentro')
    // Fala de criança: sem travessão, sem exclamação e sem abrir com pergunta.
    expect(fala).not.toMatch(/[—–!?]/)
    expect(PERCURSO_DO_FAROL.exige(pegarPlanador(sem))).toBeNull()
  })

  test('os outros percursos largam sem pedir nada', () => {
    const sem = criarSalvamentoInicial(new Date())
    for (const config of Object.values(PERCURSOS_DO_JOGO))
      if (config.id !== 'farol-subida') expect(config.exige?.(sem) ?? null).toBeNull()
  })
})
