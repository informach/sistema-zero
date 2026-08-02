import { describe, expect, it } from 'bun:test'
import { behaviorStatements, type JSStatement } from '#ir'
import { BATALHA_MONSTRINHOS_SOURCE as SOURCE } from '../__gen_batalhaMonstrinhos'
import { collectTypes } from '../__gen_dinoCorredor'
import { batalhaMonstrinhosExample } from '../examples'
import { gameTwoDManifest } from '../manifest'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

/**
 * Drift do exemplo "Batalha de Monstrinhos" — o degrau BÁSICO da família
 * Pokemon-style Battle (Clear Code). A IR embutida em examples/clearcode/batalhaMonstrinhos.ts
 * foi GERADA pelo parser real a partir do SOURCE (que mora no
 * __gen_batalhaMonstrinhos.ts, importado aqui para que fonte e teste NUNCA
 * possam divergir). O preparo do palco (setupStage + setStageDescription) é
 * injetado pelo wrapper `beginnerGameExample` e conferido à parte.
 */

setupGameTwoDExampleTests()

describe('Exemplo Batalha de Monstrinhos — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-2d', () => {
    expect(gameTwoDManifest.examples).toContain(batalhaMonstrinhosExample)
    expect(batalhaMonstrinhosExample.ir.extensions).toEqual([{ extensionId: 'game-2d' }])
    expect(batalhaMonstrinhosExample.name).toBe('Batalha de Monstrinhos')
    expect(batalhaMonstrinhosExample.experience).toBe('game')
  })

  registerExampleContractTests({
    example: batalhaMonstrinhosExample,
    source: SOURCE,
    stage: { width: 480, height: 300, bg: '#28325a' },
  })

  it('exercita a mecânica prometida do degrau básico', () => {
    const types = collectTypes(behaviorStatements(batalhaMonstrinhosExample.ir))
    for (const t of [
      'g2d:afterSeconds', // ⭐ one-shot: libera os comandos 2s depois do início
      'g2d:everySeconds', // a vez do inimigo é uma raiz periódica própria
      'g2d:defineShape', // monstrinhos 100% desenhados por código
      'g2d:createShapeSprite',
      'g2d:setHealth', // vida dos DOIS lados
      'g2d:changeHealth', // dano e cura (dano negativo)
      'g2d:getHealth', // barras leem a vida real
      'g2d:getMaxHealth',
      'g2d:drawBar', // barra de vida dos dois monstrinhos
      'g2d:drawLabel', // o menu de golpes DESENHADO na tela
      'g2d:healthDepleted', // vida zerada troca a cena
      'g2d:randomChance', // o inimigo sorteia o golpe
      'g2d:randomBetween',
      'g2d:blinkSprite', // feedback no atingido
      'g2d:shake',
      'g2d:playFx',
      'g2d:setScene',
      'g2d:sceneIs',
      'g2d:showScreen',
      'g2d:restart',
      'event', // menu por teclas 1/2/3 = evento GENÉRICO de teclado
      'eventProp',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    // Sem movimento: é uma batalha parada, como no estudo original.
    expect(types.has('g2d:topDown')).toBe(false)
    expect(types.has('g2d:platformer')).toBe(false)
    expect(types.has('g2d:move4')).toBe(false)
  })

  it('menu por teclas: 1/2/3 comparadas com a tecla do evento, opções escritas na tela', () => {
    const raw = JSON.stringify(behaviorStatements(batalhaMonstrinhosExample.ir))
    expect(raw).toContain('"type":"eventProp","prop":"key"')
    for (const key of ['1', '2', '3']) {
      expect(raw).toContain(`{"type":"str","value":"${key}"}`)
    }
    // As opções ficam DESENHADAS (o game-2d não tem menus navegáveis); a
    // Poção é um PLACAR (drawScore) que mostra quantas restam.
    expect(raw).toContain('1 Faísca (fogo, dano x2 na planta)')
    expect(raw).toContain('2 Jato (água, dano x1)')
    expect(raw).toContain('"label":"3 Poção (cura 5) x","value":{"type":"var","name":"pocoes"}')
  })

  it('poção limitada: 3 por partida, decremento no uso e aviso sem gastar o turno', () => {
    const raw = JSON.stringify(behaviorStatements(batalhaMonstrinhosExample.ir))
    // O estoque nasce com 3 no "Ao iniciar" (reiniciar repõe).
    expect(raw).toContain('"type":"var","name":"pocoes","value":{"type":"num","value":3}')
    // O uso é guardado por "se pocoes > 0" e gasta 1 (pocoes = pocoes - 1).
    expect(raw).toContain(
      '"op":">","left":{"type":"var","name":"pocoes"},"right":{"type":"num","value":0}',
    )
    expect(raw).toContain(
      '"name":"pocoes","value":{"type":"binop","op":"-","left":{"type":"var","name":"pocoes"},"right":{"type":"num","value":1}}',
    )
    // Sem poção: só a mensagem muda — o ramo senão NÃO passa o turno ao rival.
    expect(raw).toContain('As poções acabaram! Use a Faísca ou o Jato')
    const keydown = behaviorStatements(batalhaMonstrinhosExample.ir).find(
      (statement) => statement.type === 'event',
    )
    const potionBranch = JSON.stringify(keydown).match(/"else":\[(.*?)\]/)
    expect(potionBranch).not.toBeNull()
    expect(potionBranch?.[1] ?? '').not.toContain('"inimigo"')
  })

  it('tabela de vantagem em ses: fogo x2, água x1, e a poção cura sem passar do máximo', () => {
    const raw = JSON.stringify(behaviorStatements(batalhaMonstrinhosExample.ir))
    // dano = forca * 2 (fogo contra planta) e dano = forca * 1 (água).
    expect(raw).toContain(
      '"op":"*","left":{"type":"var","name":"forca"},"right":{"type":"num","value":2}',
    )
    expect(raw).toContain(
      '"op":"*","left":{"type":"var","name":"forca"},"right":{"type":"num","value":1}',
    )
    // Cura = dano negativo: changeHealth POSITIVO no próprio monstrinho (o
    // runtime clampa no máximo — utilities.ts — e o rótulo da tela avisa).
    expect(raw).toContain(
      '"type":"g2d:changeHealth","spriteVar":"meu","delta":{"type":"num","value":5}',
    )
  })

  it('turnos: afterSeconds só marca a abertura e uma raiz de 0,5s libera os comandos', () => {
    const loops = batalhaMonstrinhosExample.ir.behavior.loops
    // ⭐ O one-shot NÃO mexe no turno: só marca aberturaPronta = 1. Se ele
    // liberasse o turno direto, ficar na tela de título >2s consumiria o beat
    // (e um "se cena é jogando" no corpo viraria SOFTLOCK: one-shot consumido
    // no título sem liberar nada).
    const opening = loops.find(
      (statement): statement is Extract<JSStatement, { type: 'g2d:afterSeconds' }> =>
        statement.type === 'g2d:afterSeconds',
    )
    expect(opening).toBeDefined()
    const rawOpening = JSON.stringify(opening)
    expect(rawOpening).toContain('"name":"aberturaPronta","value":{"type":"num","value":1}')
    expect(rawOpening).not.toContain('"name":"turno"')
    expect(rawOpening).not.toContain('g2d:sceneIs')
    // Quem LIBERA é a raiz "A cada 0,5 segundos": cena jogando + aberturaPronta
    // + turno "espera" → turno = "jogador". Libera no que vier POR ÚLTIMO
    // (timer ou entrar na cena) e nunca trava.
    const everyRoots = loops.filter(
      (statement): statement is Extract<JSStatement, { type: 'g2d:everySeconds' }> =>
        statement.type === 'g2d:everySeconds',
    )
    const release = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":0.5}',
    )
    expect(release).toBeDefined()
    const rawRelease = JSON.stringify(release)
    expect(rawRelease).toContain('"type":"g2d:sceneIs","name":"jogando"')
    expect(rawRelease).toContain('"name":"aberturaPronta"')
    expect(rawRelease).toContain('{"type":"str","value":"espera"}')
    expect(rawRelease).toContain('"name":"turno","value":{"type":"str","value":"jogador"}')
    // O turno REPETIDO do inimigo NUNCA usa afterSeconds (é one-shot!): é uma
    // raiz "A cada 1,5 segundos" que só age quando turno == "inimigo".
    const enemyTurn = everyRoots.find(
      (statement) => JSON.stringify(statement.seconds) === '{"type":"num","value":1.5}',
    )
    expect(enemyTurn).toBeDefined()
    expect(enemyTurn?.seconds).toEqual({ type: 'num', value: 1.5 })
    const rawTurn = JSON.stringify(enemyTurn)
    expect(rawTurn).toContain('"type":"var","name":"turno"')
    expect(rawTurn).toContain('{"type":"str","value":"inimigo"}')
    // O golpe do inimigo é sorteado e devolve o turno ao jogador.
    expect(rawTurn).toContain('"type":"g2d:randomChance"')
    expect(rawTurn).toContain('"type":"g2d:randomBetween"')
    expect(rawTurn).toContain('"name":"turno","value":{"type":"str","value":"jogador"}')
    // Nenhuma cadência escondida dentro do "a cada quadro".
    const frameLoop = loops.find((statement) => statement.type === 'g2d:updateEachFrame')
    expect(frameLoop).toBeDefined()
    expect(collectTypes(frameLoop).has('g2d:everySeconds')).toBe(false)
    expect(collectTypes(frameLoop).has('g2d:afterSeconds')).toBe(false)
  })
})
