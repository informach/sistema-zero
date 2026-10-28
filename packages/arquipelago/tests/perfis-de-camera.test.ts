import { describe, expect, test } from 'bun:test'
import {
  ANTECIPACAO_MAXIMA,
  aplicarPerfil,
  criarPesos,
  metrosDeAntecipacao,
  misturarPerfis,
  NOMES_DOS_PERFIS,
  PERFIS_DE_CAMERA,
  passoDosPesos,
  perfilDaVez,
  TROCA_DE_PERFIL,
} from '../src/sistemas/perfis-de-camera'

const nada = { conversa: false, dentroDeCasa: false, correndoPercurso: false }

describe('os perfis da câmera', () => {
  test('a conversa vem antes da casa, a casa antes do percurso e o resto é exploração', () => {
    expect(perfilDaVez(nada)).toBe('exploracao')
    expect(perfilDaVez({ ...nada, correndoPercurso: true })).toBe('percurso')
    expect(perfilDaVez({ ...nada, correndoPercurso: true, dentroDeCasa: true })).toBe('casa')
    expect(perfilDaVez({ conversa: true, dentroDeCasa: true, correndoPercurso: true })).toBe(
      'conversa',
    )
  })

  test('a exploração não mexe no que a pessoa escolheu', () => {
    expect(aplicarPerfil(PERFIS_DE_CAMERA.exploracao, 0.4, 12)).toEqual({
      inclinacao: 0.4,
      distancia: 12,
    })
  })

  test('cada perfil ajusta só o que precisa', () => {
    // Em casa: sobe até 0,95 e chega até 8, mas não abaixa quem já está mais alto e perto.
    expect(aplicarPerfil(PERFIS_DE_CAMERA.casa, 0.4, 12)).toEqual({
      inclinacao: 0.95,
      distancia: 8,
    })
    expect(aplicarPerfil(PERFIS_DE_CAMERA.casa, 1.1, 6)).toEqual({ inclinacao: 1.1, distancia: 6 })
    // Na conversa o ângulo é sempre o mesmo.
    expect(aplicarPerfil(PERFIS_DE_CAMERA.conversa, 1.1, 12).inclinacao).toBe(0.2)
    // No percurso abre: perto vira 11, longe fica.
    expect(aplicarPerfil(PERFIS_DE_CAMERA.percurso, 0.4, 6).distancia).toBe(11)
    expect(aplicarPerfil(PERFIS_DE_CAMERA.percurso, 0.4, 15).distancia).toBe(15)
  })

  test('a troca chega a 95% em meio segundo, sem salto, e os pesos somam 1', () => {
    const pesos = criarPesos('exploracao')
    const dt = 1 / 60
    let primeiro = 0
    for (let t = 0; t < TROCA_DE_PERFIL - dt / 2; t += dt) {
      passoDosPesos(pesos, 'casa', dt)
      if (primeiro === 0) primeiro = pesos.casa
      const soma = NOMES_DOS_PERFIS.reduce((a, n) => a + pesos[n], 0)
      expect(soma).toBeCloseTo(1, 9)
    }
    expect(primeiro).toBeLessThan(0.15)
    expect(pesos.casa).toBeGreaterThan(0.94)
    expect(pesos.casa).toBeLessThan(0.96)
  })

  test('a mistura vai do enquadramento de um perfil ao do outro', () => {
    const pesos = criarPesos('exploracao')
    expect(misturarPerfis(pesos, 0.4, 12)).toEqual({ inclinacao: 0.4, distancia: 12, antecipar: 0 })
    pesos.exploracao = 0.5
    pesos.conversa = 0.5
    const meio = misturarPerfis(pesos, 0.4, 12)
    expect(meio.inclinacao).toBeCloseTo(0.3, 9)
    expect(meio.distancia).toBeCloseTo(8.5, 9)
    const percurso = misturarPerfis(criarPesos('percurso'), 0.4, 6)
    expect(percurso.antecipar).toBe(PERFIS_DE_CAMERA.percurso.antecipar ?? 0)
  })

  test('a antecipação cresce com a velocidade e tem limite', () => {
    expect(metrosDeAntecipacao(0.4, 0)).toBe(0)
    expect(metrosDeAntecipacao(0.4, 2.5)).toBeCloseTo(1, 9)
    expect(metrosDeAntecipacao(0.4, 50)).toBe(ANTECIPACAO_MAXIMA)
  })
})
