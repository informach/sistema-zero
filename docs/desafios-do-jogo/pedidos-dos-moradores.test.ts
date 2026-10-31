import { describe, expect, test } from 'bun:test'
import { criarManifesto as manifestoDoBosque } from './bosque/gerar-manifesto'
import { criarManifesto as manifestoDasNuvens } from './nuvens/gerar-manifesto'
import { dicasNaOrdemDaJornada, PEDIDOS_DOS_MORADORES } from './pedidos-dos-moradores'
import { criarManifesto as manifestoDoPico } from './pico/gerar-manifesto'
import { criarManifesto as manifestoDoRecife } from './recife/gerar-manifesto'
import { criarManifesto as manifestoDaSuaIlha } from './sua-ilha/gerar-manifesto'
import { criarManifesto as manifestoDoVale } from './vale/gerar-manifesto'

/**
 * As dicas na ordem da Jornada (lacunas, 01/11/2026): lembrar o objetivo, as pistas e, por último,
 * o texto técnico que mostra o caminho. Antes, a primeira dica era o texto técnico.
 */
describe('as dicas na ordem da Jornada', () => {
  test('o lembrete vem primeiro, o texto técnico por último, dentro do teto', () => {
    const tecnico = `${'Complete o evento. '.repeat(20)}Teste com -10.`
    const dicas = dicasNaOrdemDaJornada('A placa acende.', ['p1', 'p2', 'p3', 'p4'], tecnico)
    expect(dicas[0]).toBe('Lembre o objetivo: A placa acende.')
    expect(dicas.length).toBeLessThanOrEqual(5)
    expect(dicas.at(-1)).toContain('Teste com -10.')
    for (const d of dicas) expect(d.length).toBeLessThanOrEqual(300)
    // As pistas cedem lugar ao texto técnico, na ordem em que vieram.
    expect(dicas.slice(1, -2)).toEqual(['p1', 'p2'])
  })

  test('nos quadros de retomada e nos minijogos dos moradores, a primeira dica lembra o objetivo', () => {
    const retomadas = new Set(Object.keys(PEDIDOS_DOS_MORADORES))
    let vistos = 0
    for (const criar of [
      manifestoDoBosque,
      manifestoDoRecife,
      manifestoDoPico,
      manifestoDoVale,
      manifestoDasNuvens,
      manifestoDaSuaIlha,
    ])
      for (const d of criar('kids').desafios) {
        const deRetomada = [...retomadas].some((s) => d.slug.endsWith(s))
        if (!deRetomada && !d.conteudo.dicas[0]?.startsWith('Lembre o objetivo')) continue
        vistos++
        expect(d.conteudo.dicas[0]).toStartWith('Lembre o objetivo: ')
        // O texto técnico não abre as dicas.
        expect(d.conteudo.dicas[1]).not.toBe(d.conteudo.dicas.at(-1))
      }
    expect(vistos).toBeGreaterThanOrEqual(40)
  })
})
