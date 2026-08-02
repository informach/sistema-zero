import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements } from '#generators'
import { behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { MUNDO_PROFISSIONAL_SOURCE as SOURCE } from '../__gen_mundoProfissional'
import { gameKit3DBlocks } from '../blocks'
import { mundoDeBlocosProfissionalExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { collectTypes, stripIds } from './testUtils'

/**
 * Drift do exemplo "Mundo de Blocos Profissional" — o construtor estilo
 * Minecraft do motor avançado. A IR embutida em examples.ts foi GERADA pelo
 * parser real a partir do SOURCE (que mora no __gen_mundoProfissional.ts,
 * importado aqui para que fonte e teste NUNCA possam divergir).
 *
 * ⭐ A ADAPTAÇÃO do spike está carimbada aqui: um jogo de CONSTRUÇÃO por mouse
 * NÃO PODE usar camera_fps (o pointer lock congela o mouse interno e mataria
 * groundPoint/pick). Este exemplo é 3ª pessoa (cameraFollow, mouse livre).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

describe('Exemplo Mundo de Blocos Profissional — drift contra o parser real', () => {
  it('está registrado no manifest e é da extensão game-3d-advanced', () => {
    expect(gameKit3DExamples).toContain(mundoDeBlocosProfissionalExample)
    expect(mundoDeBlocosProfissionalExample.ir.extensions).toEqual([
      { extensionId: 'game-3d-advanced' },
    ])
  })

  it('parseJS(SOURCE) ≡ IR embutida (zero rawJS/memberCall)', () => {
    const parsed = stripIds(parseExampleLifecycleSource(SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(mundoDeBlocosProfissionalExample.ir)) as JSStatement[],
    )
  })

  it('⭐ adaptação do spike: construção por mouse LIVRE em 3ª pessoa — camera_fps BANIDA', () => {
    const types = collectTypes(behaviorStatements(mundoDeBlocosProfissionalExample.ir))
    expect(types.has('g3k:cameraFps')).toBe(false)
    expect(types.has('g3k:moveFps')).toBe(false)
    // A câmera é a que segue (mouse livre) e o herói anda como plataforma.
    expect(types.has('g3k:cameraFollow')).toBe(true)
    expect(types.has('g3k:platformerKeys')).toBe(true)
  })

  it('colocar bloco: mousePressed + groundPoint arredondado para a grade com Math.round do núcleo', () => {
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:mousePressed', 'g3k:groundPoint', 'g3k:spawn', 'g3k:makeSolid']) {
      expect(types.has(t)).toBe(true)
    }
    // A célula sai da matemática do NÚCLEO (arredondar), não de bloco novo.
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"round"')
    // Os 3 moldes de bloco escolhidos pelas teclas 1/2/3.
    for (const mold of ['"grama"', '"pedra"', '"madeira"']) {
      expect(raw).toContain(mold)
    }
    expect(types.has('g3k:keyPressed')).toBe(true)
  })

  it('remover: modo reciclar (X alterna) = UM pick SEM molde + cascata isMold + recycle', () => {
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:pick', 'g3k:isMold', 'g3k:recycle']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const nome of ['"reciclar"', '"construir"']) {
      expect(raw).toContain(nome)
    }
    // Regressão do full review (Lote C): eram TRÊS pick() por molde, e um
    // clique reciclava até 3 blocos ATRAVÉS de oclusão (um por molde). Agora é
    // UM pick sem molde (o primeiro sob o mouse) filtrado por isMold — herói,
    // muralha e árvore caem no vazio.
    const picks = [...raw.matchAll(/"type":"g3k:pick"/g)]
    expect(picks.length).toBe(1)
    expect(raw).toContain('"mold":""')
  })

  it('guarda de alcance: só planta com a célula a até 3 do herói (clique no céu = nada)', () => {
    // groundPoint devolve 0 nos DOIS eixos quando o raio não corta o chão
    // (clique no céu/acima do horizonte) — sem a guarda, nascia um bloco
    // fantasma na origem, com som e poeira, gastando o teto de 30.
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const raw = JSON.stringify(statements)
    expect(raw).toContain('"fn":"abs"')
    expect(raw).toContain('"op":"<="')
    // O alcance de 3 cobre a célula do herói e as vizinhas (grade de 2 em 2).
    expect(raw).toContain('{"type":"num","value":3}')
  })

  it('nenhum texto visível usa travessão', () => {
    expect(JSON.stringify(mundoDeBlocosProfissionalExample.ir)).not.toContain('—')
    expect(mundoDeBlocosProfissionalExample.name).not.toContain('—')
    expect(mundoDeBlocosProfissionalExample.description ?? '').not.toContain('—')
  })

  it('teto de blocos: o mundo lota em 200 entidades, então o exemplo limita a 30 e avisa', () => {
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const types = collectTypes(statements)
    expect(types.has('g3k:countAlive')).toBe(true)
    expect(types.has('g3k:say')).toBe(true)
    const raw = JSON.stringify(statements)
    expect(raw).toContain('30')
    expect(raw).toContain('lotou')
  })

  it('geração procedural com semente: muralha + árvores compostas (tronco + copa)', () => {
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of ['g3k:setSeed', 'g3k:randomBetween', 'g3k:defineMold', 'g3k:part']) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    for (const mold of ['"muralha"', '"arvore"']) {
      expect(raw).toContain(mold)
    }
  })

  it('objetivo verificável: pousar acima de y 2.2 (topo da muralha) vence', () => {
    const statements = behaviorStatements(mundoDeBlocosProfissionalExample.ir)
    const types = collectTypes(statements)
    for (const t of [
      'g3k:posOf',
      'g3k:onGround',
      'g3k:setState',
      'g3k:setScreenText',
      'g3k:hudText',
    ]) {
      expect(types.has(t)).toBe(true)
    }
    const raw = JSON.stringify(statements)
    expect(raw).toContain('2.2')
    for (const screen of ['"menu"', '"vitoria"']) {
      expect(raw).toContain(screen)
    }
  })

  it('⭐ o acaso do exemplo passa TODO pelo sorteio do kit (a semente não pode mentir)', () => {
    const types = collectTypes(behaviorStatements(mundoDeBlocosProfissionalExample.ir))
    expect(types.has('randomInt')).toBe(false)
    expect(types.has('randomFloat')).toBe(false)
    expect(JSON.stringify(behaviorStatements(mundoDeBlocosProfissionalExample.ir))).not.toContain(
      'Math.random',
    )
  })

  it('100% procedural: nenhum modelo .glb nas peças', () => {
    const raw = JSON.stringify(behaviorStatements(mundoDeBlocosProfissionalExample.ir))
    expect(raw).not.toContain('"shape":"modelo"')
    const models = [...raw.matchAll(/"model":"([^"]*)"/g)].map((m) => m[1])
    expect(models.length).toBeGreaterThan(0)
    expect(models.every((m) => m === '')).toBe(true)
  })

  it('fixpoint textual: gerar → parsear → gerar é byte-estável', () => {
    const code1 = compileStatements(
      stripIds(behaviorStatements(mundoDeBlocosProfissionalExample.ir)) as JSStatement[],
      0,
    )
    const reparsed = stripIds(parseJS(code1)) as JSStatement[]
    const code2 = compileStatements(reparsed, 0)
    expect(code2).toBe(code1)
  })

  it('round-trip por blocos: IR → workspace → IR devolve a mesma IR', () => {
    const state = buildWorkspaceStateFromIR(
      mundoDeBlocosProfissionalExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      const rebuilt = stripIds(behaviorStatements(buildIRFromWorkspace(ws)))
      expect(rebuilt).toEqual(stripIds(behaviorStatements(mundoDeBlocosProfissionalExample.ir)))
    } finally {
      ws.dispose()
    }
  })
})

import { gameKit3DExamples } from '../exampleCatalog'
