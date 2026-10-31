import { describe, expect, test } from 'bun:test'
import {
  boasVindas,
  CENAS,
  chaveDaAbertura,
  DURACAO_DA_ABERTURA_MS,
  deveMostrarAbertura,
  inicioDaCena,
  LEITURAS_DA_ABERTURA,
  LINHAS_DA_CARTA,
  momentoDaAbertura,
  navegarLeitura,
} from '../src/sistemas/abertura'

describe('o roteiro da abertura', () => {
  test('oito cenas, uns 73 segundos, na ordem da história', () => {
    expect(CENAS.map((c) => c.id)).toEqual([
      'arquipelago',
      'iris',
      'sumiu',
      'cinza',
      'tempestade',
      'carta',
      'casa',
      'zappy',
    ])
    expect(DURACAO_DA_ABERTURA_MS).toBe(73_000)
  })

  test('a carta diz o que a proposta diz', () => {
    expect(LINHAS_DA_CARTA.join(' ')).toBe('A casa é sua. Acenda as cores.')
  })

  test('o Zappy só se apresenta na última cena, e o segredo do Farol fica para o diário', () => {
    for (const cena of CENAS.slice(0, -1))
      for (const f of cena.falas) {
        expect(f.quem).toBeUndefined()
        expect(f.texto).not.toContain('Zappy')
      }
    const ultima = CENAS[CENAS.length - 1]!
    expect(ultima.falas.at(-1)?.quem).toBe('Zappy')
    const tudo = CENAS.flatMap((c) => c.falas.map((f) => f.texto)).join(' ')
    expect(tudo).not.toMatch(/faísca/i)
  })

  test('as falas seguem as regras da casa (sem travessão, sem exclamação, sem começar perguntando)', () => {
    for (const cena of CENAS)
      for (const f of cena.falas) {
        expect(f.texto).not.toMatch(/[—!]/)
        expect(f.texto.trim().startsWith('¿')).toBe(false)
        expect(f.texto).not.toMatch(/^[^.]*\?/)
      }
  })
})

describe('onde a abertura está', () => {
  test('avança por todas as falas, incluindo a apresentação do Zappy, e permite voltar', () => {
    let tempo: number | null = 0
    const falas: string[] = []
    while (tempo !== null) {
      falas.push(momentoDaAbertura(tempo).fala.texto)
      tempo = navegarLeitura(tempo, 1)
    }
    expect(falas).toEqual(CENAS.flatMap((c) => c.falas.map((f) => f.texto)))
    expect(LEITURAS_DA_ABERTURA).toHaveLength(9)
    expect(navegarLeitura(0, -1)).toBe(0)
    expect(navegarLeitura(-10, -1)).toBe(0)
    expect(navegarLeitura(64_500, -1)).toBe(61_000)
    expect(navegarLeitura(62_000, 1)).toBe(64_500)
    expect(navegarLeitura(70_000, 1)).toBeNull()
  })
  test('cada instante cai numa cena, com a fala da vez', () => {
    expect(momentoDaAbertura(0).indice).toBe(0)
    expect(momentoDaAbertura(7999).indice).toBe(0)
    expect(momentoDaAbertura(8000).indice).toBe(1)
    const zappy = inicioDaCena(7)
    expect(momentoDaAbertura(zappy + 1000).fala.quem).toBeUndefined()
    expect(momentoDaAbertura(zappy + 4000).fala.quem).toBe('Zappy')
  })

  test('acaba depois da última cena e nunca sai da régua', () => {
    expect(momentoDaAbertura(DURACAO_DA_ABERTURA_MS - 1).acabou).toBe(false)
    expect(momentoDaAbertura(DURACAO_DA_ABERTURA_MS).acabou).toBe(true)
    expect(momentoDaAbertura(DURACAO_DA_ABERTURA_MS * 3).indice).toBe(CENAS.length - 1)
    expect(momentoDaAbertura(-500).indice).toBe(0)
  })

  test('pular uma cena vai para o começo da próxima', () => {
    expect(inicioDaCena(0)).toBe(0)
    expect(inicioDaCena(1)).toBe(8000)
    expect(momentoDaAbertura(inicioDaCena(5)).indice).toBe(5)
    expect(inicioDaCena(99)).toBe(DURACAO_DA_ABERTURA_MS)
  })
})

describe('quando a abertura aparece sozinha', () => {
  test('uma vez por perfil no aparelho', () => {
    expect(deveMostrarAbertura({ vista: false, jogoNovo: false, somenteLeitura: false })).toBe(true)
    expect(deveMostrarAbertura({ vista: true, jogoNovo: true, somenteLeitura: false })).toBe(false)
  })

  test('sem armazenamento, só num jogo novo', () => {
    expect(deveMostrarAbertura({ vista: null, jogoNovo: true, somenteLeitura: false })).toBe(true)
    expect(deveMostrarAbertura({ vista: null, jogoNovo: false, somenteLeitura: false })).toBe(false)
  })

  test('no acesso de suporte, nunca', () => {
    expect(deveMostrarAbertura({ vista: false, jogoNovo: true, somenteLeitura: true })).toBe(false)
  })

  test('a marca separa público e perfil', () => {
    expect(chaveDaAbertura('kids', 'p1')).not.toBe(chaveDaAbertura('adulto', 'p1'))
    expect(chaveDaAbertura('kids', 'p1')).not.toBe(chaveDaAbertura('kids', 'p2'))
  })

  test('a primeira fala do Zappy depois dela leva o nome', () => {
    expect(boasVindas('Ana')).toStartWith('Oi, Ana.')
  })
})
