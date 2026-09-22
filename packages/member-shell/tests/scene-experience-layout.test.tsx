import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ARQUIVO_DA_CENA = resolve(import.meta.dir, '../src/components/scene-activity.tsx')

/**
 * A criança primeiro reconhece o mundo, depois lê o convite para agir e encontra os controles.
 * O retorno vem depois da área de ação. A ordem do DOM também vale no celular e na leitura assistiva.
 */
describe('a experiência aproxima a instrução dos controles', () => {
  test('mostra HUD, cena, instrução, controles e retorno nessa ordem', () => {
    const fonte = readFileSync(ARQUIVO_DA_CENA, 'utf8')
    const inicioDoPalpite = fonte.indexOf('{previsaoPendente && palpite ? (')
    const fimDoPalpite = fonte.indexOf('</SceneConsole>', inicioDoPalpite)
    const inicioDaExperiencia = fonte.indexOf('<SceneConsole>', fimDoPalpite)
    const ramo = fonte.slice(
      inicioDaExperiencia,
      fonte.indexOf('</SceneConsole>', inicioDaExperiencia),
    )

    const hud = ramo.indexOf('{hudDaCena}')
    const cena = ramo.indexOf('<ConsoleMundo>')
    const instrucao = ramo.indexOf('<ConsoleFala>{blocoDaInstrucao}</ConsoleFala>')
    const pista = ramo.indexOf('{hintText && !conclusao &&')
    const controles = ramo.indexOf('{pranchaDaCena}')
    const palpiteAnterior = ramo.indexOf('{palpite &&')
    const conclusao = ramo.indexOf('{!revisita && conclusao &&')
    const situacao = ramo.indexOf('<LugarReservado')

    expect(hud).toBeGreaterThan(-1)
    expect(hud).toBeLessThan(cena)
    expect(cena).toBeLessThan(instrucao)
    expect(instrucao).toBeLessThan(pista)
    expect(pista).toBeLessThan(controles)
    expect(controles).toBeLessThan(palpiteAnterior)
    expect(controles).toBeLessThan(conclusao)
    expect(controles).toBeLessThan(situacao)
  })
})
