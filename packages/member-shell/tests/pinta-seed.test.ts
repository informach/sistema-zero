import { describe, expect, mock, test } from 'bun:test'
import { resolvePintaSeed } from '../src/lib/pinta-seed'

/**
 * A ordem de seed do bloco de Pinta. Três ramos e uma condição sutil — e o custo de errar é a
 * criança abrindo a aula com o desenho ERRADO (o da aula anterior por cima do trabalho desta).
 */

const PROFESSOR = { id: 'p', name: 'modelo' }
const MINHA = { id: 'm', name: 'minha entrega' }
const ANTERIOR = { id: 'a', name: 'aula anterior' }

const nunca = () => Promise.reject(new Error('não devia ter sido chamado'))

describe('resolvePintaSeed', () => {
  test('aula avulsa e sem entrega: abre com o desenho do professor, sem ir à rede', async () => {
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        submitted: false,
        loadSubmission: nunca,
        loadCarryover: nunca,
      }),
    ).toBe(PROFESSOR)
  })

  test('já entregou nesta aula: retoma a PRÓPRIA entrega', async () => {
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: 'heroi',
        submitted: true,
        loadSubmission: async () => MINHA,
        loadCarryover: nunca,
      }),
    ).toBe(MINHA)
  })

  test('em cadeia e sem entrega aqui: abre com o desenho da aula anterior', async () => {
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: 'heroi',
        submitted: false,
        loadSubmission: nunca,
        loadCarryover: async () => ANTERIOR,
      }),
    ).toBe(ANTERIOR)
  })

  test('🚨 entrega que FALHOU cai no professor, NUNCA na aula anterior', async () => {
    // A condição é "já enviou aqui?", não "consegui baixar?". Cair na cadeia num soluço de rede
    // traria o passo anterior por cima de um trabalho que existe — e o próximo envio o
    // sobrescreveria.
    const carryover = mock(async () => ANTERIOR)
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: 'heroi',
        submitted: true,
        loadSubmission: async () => null,
        loadCarryover: carryover,
      }),
    ).toBe(PROFESSOR)
    expect(carryover).not.toHaveBeenCalled()
  })

  test('cadeia que falhou (ou 1ª da cadeia) cai no desenho do professor', async () => {
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: 'heroi',
        submitted: false,
        loadSubmission: nunca,
        loadCarryover: async () => null,
      }),
    ).toBe(PROFESSOR)
  })

  test('cadeia só de espaços é aula avulsa (não vai à rede)', async () => {
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: '   ',
        submitted: false,
        loadSubmission: nunca,
        loadCarryover: nunca,
      }),
    ).toBe(PROFESSOR)
  })

  test('desmontou antes da 2ª ida: não busca a cadeia', async () => {
    const carryover = mock(async () => ANTERIOR)
    expect(
      await resolvePintaSeed({
        initialAsset: PROFESSOR,
        chain: 'heroi',
        submitted: false,
        loadSubmission: nunca,
        loadCarryover: carryover,
        aborted: () => true,
      }),
    ).toBe(PROFESSOR)
    expect(carryover).not.toHaveBeenCalled()
  })
})
