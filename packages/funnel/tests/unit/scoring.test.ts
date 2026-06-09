import { describe, expect, test } from 'bun:test'
import { computePerfil, type ScoringAnswers } from '../../src/lib/scoring'

// Pesos: P1=1, P3=1, P4=1, P5(trava)=2, P6=1, P8(mudanca)=2, P9=1.
// Mapa: ver lib/scoring.ts (verbatim do briefing).

describe('computePerfil', () => {
  test('todas as respostas A → ideia_parada (exceto P4=A → criando_no_escuro)', () => {
    // P1 A→ideia, P3 A→ideia, P4 A→criando(1), P5 A→ideia(2), P6 A→ideia, P8 A→ideia(2), P9 A→ideia(1)
    // ideia_parada = 1+1+2+1+2+1 = 8, criando_no_escuro = 1 → vence ideia_parada
    const a: ScoringAnswers = {
      segmento: 'A',
      relacao_ia: 'A',
      ja_quebrou: 'A',
      trava_principal: 'A',
      custo_principal: 'A',
      mudanca_desejada: 'A',
      proximo_passo: 'A',
    }
    expect(computePerfil(a)).toBe('ideia_parada')
  })

  test('respostas B → criando_no_escuro', () => {
    // P4 B→ideia(1); todas as outras B→criando. criando = 1+1+2+1+2+1 = 8 > ideia 1
    const b: ScoringAnswers = {
      segmento: 'B',
      relacao_ia: 'B',
      ja_quebrou: 'B',
      trava_principal: 'B',
      custo_principal: 'B',
      mudanca_desejada: 'B',
      proximo_passo: 'B',
    }
    expect(computePerfil(b)).toBe('criando_no_escuro')
  })

  test('respostas C → refem_ajustes (apesar de P3/P4=C → sem_criterio)', () => {
    // refem: P1 1, P5 2, P8 2, P9 1 = 6; sem_criterio: P3 1, P4 1, P6 1 = 3
    const c: ScoringAnswers = {
      segmento: 'C',
      relacao_ia: 'C',
      ja_quebrou: 'C',
      trava_principal: 'C',
      custo_principal: 'C',
      mudanca_desejada: 'C',
      proximo_passo: 'C',
    }
    expect(computePerfil(c)).toBe('refem_ajustes')
  })

  test('respostas D → sem_criterio', () => {
    // sem_criterio: P1 1, P5 2, P6 1, P8 2, P9 1 = 7; refem: P3 1, P4 1 = 2
    const d: ScoringAnswers = {
      segmento: 'D',
      relacao_ia: 'D',
      ja_quebrou: 'D',
      trava_principal: 'D',
      custo_principal: 'D',
      mudanca_desejada: 'D',
      proximo_passo: 'D',
    }
    expect(computePerfil(d)).toBe('sem_criterio')
  })

  test('P5 e P8 valem 2 (peso dobrado)', () => {
    // Só P5=B (criando, +2) e P8=A (ideia, +2): empate 2x2.
    // Desempate 1 = P5 → criando_no_escuro.
    const answers: ScoringAnswers = { trava_principal: 'B', mudanca_desejada: 'A' }
    expect(computePerfil(answers)).toBe('criando_no_escuro')
  })

  test('desempate 1: perfil da P5 (trava_principal) entre os empatados', () => {
    // ideia: P1 A(1) + P3 A(1) = 2; refem: P5 C(2) = 2 → empate.
    // Desempate 1: P5=C → refem_ajustes (está empatado).
    const answers: ScoringAnswers = { segmento: 'A', relacao_ia: 'A', trava_principal: 'C' }
    expect(computePerfil(answers)).toBe('refem_ajustes')
  })

  test('desempate 2: perfil da P1 quando o da P5 não está entre os empatados', () => {
    // ideia: P1 A(1)+P3 A(1)+P6 A(1) = 3; sem_criterio: P8 D(2)+P9 D(1) = 3 → empate em 3.
    // criando: P5 B(2) = 2 (NÃO empatado). Desempate 1 (P5=criando) não vale →
    // Desempate 2: P1=A → ideia_parada (empatado).
    const answers: ScoringAnswers = {
      segmento: 'A',
      relacao_ia: 'A',
      custo_principal: 'A',
      mudanca_desejada: 'D',
      proximo_passo: 'D',
      trava_principal: 'B',
    }
    expect(computePerfil(answers)).toBe('ideia_parada')
  })

  test('determinístico mesmo sem respostas (todos zerados → 1º da ordem canônica)', () => {
    expect(computePerfil({})).toBe('ideia_parada')
  })
})
