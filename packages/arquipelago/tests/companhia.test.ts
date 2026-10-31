import { describe, expect, test } from 'bun:test'
import {
  BICHOS_DO_BOSQUE,
  criarSalvamentoInicial,
  migrarDaV18,
  type Salvamento,
  type SalvamentoV18,
} from '@sistemazero/arquipelago-contracts'
import { adotar } from '../src/sistemas/bichos'
import {
  deixarOFilhoteNoVale,
  escolherCompanhia,
  falaDaCompanhia,
  opcoesDeCompanhia,
  podeEscolherCompanhia,
  quemAcompanha,
  rotuloDaCompanhia,
  rotuloDoPet,
} from '../src/sistemas/companhia'
import { adotarPelaCapi } from '../src/sistemas/conversa-da-capi'
import { OVO_NOVO } from '../src/sistemas/filhote-do-vale'

const AGORA = new Date('2026-10-30T12:00:00Z')

function comAdotado(s: Salvamento): Salvamento {
  const bichos = adotar({ ...s.bichos, achados: [...BICHOS_DO_BOSQUE] }, 'gato', 'Mingau')
  if (!bichos) throw new Error('não adotou')
  return { ...s, bichos }
}

describe('quem acompanha pela ilha (S01)', () => {
  test('sem adotado, o bichinho do quarto; sem nenhum, ninguém', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(quemAcompanha(s, 'pet-gato')).toBe('quarto')
    expect(quemAcompanha(s, null)).toBe(null)
    expect(podeEscolherCompanhia(s, 'pet-gato')).toBe(false)
  })

  test('com os dois, vale a escolha; sem o escolhido, quem houver', () => {
    const s = comAdotado(criarSalvamentoInicial(AGORA))
    expect(podeEscolherCompanhia(s, 'pet-cachorro')).toBe(true)
    expect(quemAcompanha(escolherCompanhia(s, 'adotado'), 'pet-cachorro')).toBe('adotado')
    expect(quemAcompanha(escolherCompanhia(s, 'quarto'), 'pet-cachorro')).toBe('quarto')
    // Escolheu o do quarto, mas o quarto ficou sem bichinho: o adotado vai.
    expect(quemAcompanha(escolherCompanhia(s, 'quarto'), null)).toBe('adotado')
    const mesma = escolherCompanhia(s, s.companhia)
    expect(mesma).toBe(s)
  })

  test('adotar pela Capi faz do bicho a companhia, como sempre foi', () => {
    const s = {
      ...criarSalvamentoInicial(AGORA),
      bichos: { ...criarSalvamentoInicial(AGORA).bichos, achados: ['gato' as const] },
    }
    const r = adotarPelaCapi(s, 'gato', 'Mingau')
    if (!('salvamento' in r)) throw new Error(r.motivo)
    expect(r.salvamento.companhia).toBe('adotado')
  })

  test('a V18 com bicho adotado continua com ele acompanhando', () => {
    const base = comAdotado(criarSalvamentoInicial(AGORA)) as unknown as Record<string, unknown>
    const { chaves: _c, segredos: _s, mapa: _m, companhia: _k, ...resto } = base
    expect(migrarDaV18({ ...resto, versao: 18 } as unknown as SalvamentoV18).companhia).toBe(
      'adotado',
    )
    const sem = criarSalvamentoInicial(AGORA) as unknown as Record<string, unknown>
    const { chaves: _c2, segredos: _s2, mapa: _m2, companhia: _k2, ...resto2 } = sem
    expect(migrarDaV18({ ...resto2, versao: 18 } as unknown as SalvamentoV18).companhia).toBe(
      'quarto',
    )
  })

  test('as falas e os rótulos seguem as regras dos textos da criança', () => {
    expect(rotuloDoPet('pet-passaro')).toBe('Passarinho do quarto')
    for (const t of [
      falaDaCompanhia('adotado', { adotado: 'Mingau', pet: 'pet-gato', filhote: null }),
      falaDaCompanhia('quarto', { adotado: 'Mingau', pet: 'pet-gato', filhote: null }),
    ]) {
      expect(t).not.toContain('—')
      expect(t).not.toContain('!')
    }
    expect(falaDaCompanhia('quarto', { adotado: 'Mingau', pet: 'pet-gato', filhote: null })).toBe(
      'O gato do quarto vai com você. Mingau espera em casa.',
    )
  })

  test('o filhote do Vale, nascido e com nome, pode ir junto e voltar ao Vale (A7)', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(opcoesDeCompanhia(s, 'pet-gato')).toEqual(['quarto'])
    const ovo = { ...s, vale: { ...s.vale, filhote: { ...OVO_NOVO } } }
    expect(opcoesDeCompanhia(ovo, 'pet-gato')).toEqual(['quarto'])
    const semNome = { ...s, vale: { ...s.vale, filhote: { ...OVO_NOVO, ovo: 3 } } }
    expect(opcoesDeCompanhia(semNome, 'pet-gato')).toEqual(['quarto'])
    const comNome = { ...s, vale: { ...s.vale, filhote: { ...OVO_NOVO, ovo: 3, nome: 'Rex' } } }
    expect(opcoesDeCompanhia(comNome, 'pet-gato')).toEqual(['quarto', 'filhote'])
    expect(podeEscolherCompanhia(comNome, 'pet-gato')).toBe(true)
    expect(quemAcompanha(comNome, 'pet-gato')).toBe('quarto')
    const comRex = escolherCompanhia(comNome, 'filhote')
    expect(quemAcompanha(comRex, 'pet-gato')).toBe('filhote')
    expect(quemAcompanha(comRex, null)).toBe('filhote')
    expect(deixarOFilhoteNoVale(comRex).companhia).toBe('quarto')
    const nomes = { adotado: null, pet: 'pet-gato', filhote: 'Rex' }
    expect(rotuloDaCompanhia('filhote', nomes)).toBe('Rex')
    expect(falaDaCompanhia('filhote', nomes)).toBe(
      'Rex vai com você. O gato do quarto espera no quarto.',
    )
    expect(falaDaCompanhia('quarto', nomes)).toBe(
      'O gato do quarto vai com você. Rex brinca no Vale.',
    )
  })
})
