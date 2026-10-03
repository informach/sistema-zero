import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ARQUIVO_DA_CENA = resolve(import.meta.dir, '../src/components/scene-activity.tsx')

/**
 * O console v2 (30/09/2026): dois painéis dentro de um deck. À esquerda o MUNDO com o que ele diz de
 * si (a faixa, o palco, o pé do mundo com as ferramentas do mundo e a frase da situação); à direita a
 * CONVERSA e a AÇÃO (o Zappy, a pista, "Sua vez", o que ela já descobriu com as ações da descoberta, e
 * o retorno). A ordem do DOM também vale no celular e na leitura assistiva.
 */
describe('a experiência aproxima cada coisa do que ela mexe', () => {
  const ramoDaExperiencia = () => {
    const fonte = readFileSync(ARQUIVO_DA_CENA, 'utf8')
    const inicioDoPalpite = fonte.indexOf('{previsaoPendente && palpite ? (')
    const fimDoPalpite = fonte.indexOf('</SceneConsole>', inicioDoPalpite)
    const inicioDaExperiencia = fonte.indexOf('<SceneConsole>', fimDoPalpite)
    return fonte.slice(inicioDaExperiencia, fonte.indexOf('</SceneConsole>', inicioDaExperiencia))
  }

  test('mostra faixa, cena, situação, instrução, pista, controles, descobertas e retorno nessa ordem', () => {
    const ramo = ramoDaExperiencia()

    const hud = ramo.indexOf('{hudDaCena}')
    const cena = ramo.indexOf('<ConsoleMundo>')
    const situacao = ramo.indexOf('<LugarReservado')
    const instrucao = ramo.indexOf('<ConsoleFala>{blocoDaInstrucao}</ConsoleFala>')
    const pista = ramo.indexOf('{hintText && !conclusao &&')
    const controles = ramo.indexOf('{pranchaDaCena}')
    const descobertas = ramo.indexOf('<SceneDescobertas')
    const palpiteAnterior = ramo.indexOf('{palpite &&')
    const conclusao = ramo.indexOf('{!revisita && conclusao &&')

    expect(hud).toBeGreaterThan(-1)
    expect(hud).toBeLessThan(cena)
    // ⚠️ A frase da situação é o narrador do MUNDO e mora logo abaixo dele (decisão dela de 30/09).
    expect(cena).toBeLessThan(situacao)
    expect(situacao).toBeLessThan(instrucao)
    expect(instrucao).toBeLessThan(pista)
    expect(pista).toBeLessThan(controles)
    expect(controles).toBeLessThan(descobertas)
    expect(descobertas).toBeLessThan(palpiteAnterior)
    expect(descobertas).toBeLessThan(conclusao)
  })

  test('as ferramentas do MUNDO ficam no painel do mundo; as da DESCOBERTA, na lista de descobertas', () => {
    const ramo = ramoDaExperiencia()
    const fimDoVisual = ramo.indexOf('</ConsoleVisual>')
    const desfazer = ramo.indexOf('{desfazer}')
    const recomecar = ramo.indexOf('{recomecar}')
    const inicioDasDescobertas = ramo.indexOf('<SceneDescobertas')
    const fimDasDescobertas = ramo.indexOf('</SceneDescobertas>')
    const umaPista = ramo.indexOf('{umaPista}')
    const conferir = ramo.indexOf('{conferirOuContinuar}')

    expect(desfazer).toBeGreaterThan(-1)
    expect(desfazer).toBeLessThan(fimDoVisual)
    expect(recomecar).toBeGreaterThan(-1)
    expect(recomecar).toBeLessThan(fimDoVisual)
    expect(umaPista).toBeGreaterThan(inicioDasDescobertas)
    expect(umaPista).toBeLessThan(fimDasDescobertas)
    expect(conferir).toBeGreaterThan(inicioDasDescobertas)
    expect(conferir).toBeLessThan(fimDasDescobertas)
  })

  test('em uma vez e sempre, configura as ações antes de avançar o passo', () => {
    const fonte = readFileSync(ARQUIVO_DA_CENA, 'utf8')
    const inicio = fonte.indexOf('const pranchaDaCena = (')
    const ramo = fonte.slice(inicio, fonte.indexOf('\n\n  return (', inicio))

    const execucaoAntes = ramo.indexOf("{m !== 'once-vs-always' && controlesDaExecucao}")
    const configuracao = ramo.indexOf('<LessonSceneControls')
    const execucaoDepois = ramo.indexOf("{m === 'once-vs-always' && controlesDaExecucao}")

    expect(inicio).toBeGreaterThan(-1)
    expect(execucaoAntes).toBeGreaterThan(-1)
    expect(execucaoAntes).toBeLessThan(configuracao)
    expect(configuracao).toBeLessThan(execucaoDepois)
  })
})
