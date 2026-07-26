import { describe, expect, it } from 'bun:test'
import { compileStatements, generateJS } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import {
  CORE_EXAMPLES,
  corridaInfinitaNaMaoExample,
  defesaDaTorreNaMaoExample,
  dinoNaMaoExample,
  dueloNaMaoExample,
  folioCanvasProceduralExample,
  gorilasNaMaoExample,
  invadersNaMaoExample,
  passeio3dNaMaoExample,
  plataformaVerticalNaMaoExample,
  portasDoCasteloNaMaoExample,
} from './core'

describe('CORE_EXAMPLES — Folio 3D procedural (Canvas 3D sem extensão)', () => {
  it('é válido, asset-free e usa apenas IR nativa', () => {
    expect(CORE_EXAMPLES).toContain(folioCanvasProceduralExample)
    expect(folioCanvasProceduralExample.ir.extensions).toEqual([])
    expect(folioCanvasProceduralExample.assets ?? []).toEqual([])
    expect(SZIRV2Schema.safeParse(folioCanvasProceduralExample.ir).success).toBe(true)

    const types = collectTypes(folioCanvasProceduralExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('terrainSetup')).toBe(true)
    expect(types.has('roadSetup')).toBe(true)
    expect(types.has('buildingSetup')).toBe(true)
    expect(types.has('physicsLiteSetup')).toBe(true)
  })

  it('gera Three.js e o kernel próprio sem Rapier/WASM', () => {
    const code = generateJS({ statements: behaviorStatements(folioCanvasProceduralExample.ir) })
    expect(code).toContain("import * as THREE from 'three'")
    expect(code).toContain('function createSZPhysicsLite')
    expect(code).not.toContain('Rapier')
    expect(code).not.toContain('WebAssembly')
  })
})

describe('CORE_EXAMPLES — passeio3dNaMaoExample (Passeio 3D na mão, com som)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(passeio3dNaMaoExample)
    expect(passeio3dNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(passeio3dNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado (rawJS/rawHTML) nem blocos de extensão', () => {
    const types = collectTypes(passeio3dNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('gera Three.js de verdade (na unha)', () => {
    const types = collectTypes(passeio3dNaMaoExample.ir)
    expect(types.has('importStar')).toBe(true)
    const code = generateJS({ statements: behaviorStatements(passeio3dNaMaoExample.ir) })
    expect(code).toContain("import * as THREE from 'three'")
  })

  it('embute os 2 sons dentro do orçamento de bundle (WAVs gerados ~3KB)', () => {
    const assets = passeio3dNaMaoExample.assets ?? []
    expect(assets.map((asset) => asset.name).sort()).toEqual(['buzina', 'motor'])
    for (const asset of assets) {
      expect(asset.kind, asset.name).toBe('audio')
      // WAVs PCM gerados por script (motor 2750, buzina 3282 chars) — teto real com folga.
      expect(asset.dataUrl.length, asset.name).toBeLessThan(4_000)
    }
  })
})

function collectTypes(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) for (const item of value) collectTypes(item, out)
  else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.type === 'string') out.add(obj.type)
    for (const v of Object.values(obj)) collectTypes(v, out)
  }
  return out
}

describe('CORE_EXAMPLES — gorilasNaMaoExample (na mão, sem extensão)', () => {
  it('está em CORE_EXAMPLES e não traz extensões', () => {
    expect(CORE_EXAMPLES).toContain(gorilasNaMaoExample)
    expect(gorilasNaMaoExample.ir.extensions).toEqual([])
  })

  it('tem IR válido contra o SZIRSchema', () => {
    expect(SZIRV2Schema.safeParse(gorilasNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado (rawJS/rawHTML) nem nenhum bloco g2d/g3d', () => {
    const types = collectTypes(gorilasNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa os blocos genéricos novos (SVG + estilo + modo escuro + tela cheia)', () => {
    const types = collectTypes(gorilasNaMaoExample.ir)
    for (const expected of [
      'element', // svg/g/path/circle (vetorial)
      'setStyle', // estilo por código (velocidade do moinho)
      'setProperty', // painel de HTML
      'systemDark', // cor do céu pelo modo do sistema
      'toggleFullscreen', // botão de tela cheia
      'animationLoop', // a cada quadro
      'canvasFillRect',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // o gerador produz o JS esperado (estilo do moinho, modo escuro)
    const code = compileStatements(behaviorStatements(gorilasNaMaoExample.ir), 0)
    expect(code).toContain('.style.animationDuration')
    expect(code).toContain("matchMedia('(prefers-color-scheme: dark)').matches")
    for (const event of ['pointerdown', 'pointermove', 'pointerup']) {
      expect(code).toContain(`canvas?.addEventListener("${event}"`)
      expect(code).not.toContain(`document.addEventListener("${event}"`)
      expect(code).not.toContain(`window.addEventListener("${event}"`)
    }
    expect(JSON.stringify(buildWorkspaceStateFromIR(gorilasNaMaoExample.ir))).not.toContain(
      'sz_adv_raw_js',
    )
  })
})

describe('CORE_EXAMPLES — invadersNaMaoExample (classes 100% núcleo)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(invadersNaMaoExample)
    expect(invadersNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(invadersNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(invadersNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa o vocabulário de classes do núcleo (o contrato do lote)', () => {
    const types = collectTypes(invadersNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Player/Projectile/Enemy/Wave/Game
      'newExpr', // new Player(this) / push(new Projectile())
      'arrayFilter', // this.enemies.filter(o => !o.markedForDeletion)
      'setThisProp', // compostas expandidas (this.x = this.x - this.speed)
      'memberCallExpr', // this.game.getProjetile()… chamadas em valor
      'event', // keydown/keyup no construtor + load
      'canvasSetup',
      'animationLoop',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // O fundo estrelado embutido é PEQUENO (regra do bundle) e o CSS o referencia.
    const asset = invadersNaMaoExample.assets?.[0]
    expect(asset?.name).toBe('background.png')
    expect((asset?.dataUrl.length ?? 0) < 2_000).toBe(true)
    const css = JSON.stringify(invadersNaMaoExample.ir.css)
    expect(css).toContain("url('background.png')")
  })
})

describe('CORE_EXAMPLES — plataformaVerticalNaMaoExample (plataforma 100% núcleo)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(plataformaVerticalNaMaoExample)
    expect(plataformaVerticalNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(plataformaVerticalNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(plataformaVerticalNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa o vocabulário de física/câmera do núcleo (sem asset)', () => {
    const types = collectTypes(plataformaVerticalNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block/Platform/Player
      'funcDecl', // overlap (colisão AABB) + updateCamera + animate
      'forRange', // varre blocos/plataformas
      'requestFrame', // o laço de quadro na mão
      'canvasSetup',
      'canvasFillRect', // herói e blocos são retângulos (asset-free)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(plataformaVerticalNaMaoExample.assets ?? []).toEqual([])
    // a câmera na mão (scale + translate) sobrevive no código gerado
    const code = compileStatements(behaviorStatements(plataformaVerticalNaMaoExample.ir), 0)
    expect(code).toContain('ctx.scale(scale, scale)')
    expect(code).toContain('ctx.translate(0 - camera.x, 0 - camera.y)')
  })
})

describe('CORE_EXAMPLES — portasDoCasteloNaMaoExample (platformer + passagem de fase)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(portasDoCasteloNaMaoExample)
    expect(portasDoCasteloNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(portasDoCasteloNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a física + o fade de passagem de fase na mão (globalAlpha), sem asset', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block/Player
      'funcDecl', // overlap + loadLevel + animate
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasGlobalAlpha', // o fade preto por cima, na mão (no lugar do gsap)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    expect(portasDoCasteloNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(portasDoCasteloNaMaoExample.ir), 0)
    expect(code).toContain('ctx.globalAlpha = fade')
    expect(code).toContain('loadLevel(nextLevel)')
  })
})

describe('CORE_EXAMPLES — defesaDaTorreNaMaoExample (tower defense na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(defesaDaTorreNaMaoExample)
    expect(defesaDaTorreNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(defesaDaTorreNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(defesaDaTorreNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a mira por distância + o caminho desenhado, sem asset', () => {
    const types = collectTypes(defesaDaTorreNaMaoExample.ir)
    for (const expected of [
      'classDecl',
      'funcDecl',
      'requestFrame',
      'canvasSetup',
      'canvasStroke',
      'event',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    expect(defesaDaTorreNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(defesaDaTorreNaMaoExample.ir), 0)
    expect(code).toContain('Math.hypot(ax - bx, ay - by)')
    expect(code).toContain('Math.atan2(target.y - this.y, target.x - this.x)')
  })
})

describe('CORE_EXAMPLES — dinoNaMaoExample (Dino runner Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(dinoNaMaoExample)
    expect(dinoNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(dinoNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(dinoNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa o motor do curso na mão (tempo real + timer + círculo), sem asset', () => {
    const types = collectTypes(dinoNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Player/Obstacle/Cloud/Game
      'newExpr', // new Obstacle(this) / new Cloud(this)
      'arrayFilter', // culling manual dos que saíram da tela
      'setThisProp', // o estado vive nos objetos
      'funcDecl', // animate(timeStamp) — o laço com TEMPO na mão
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'canvasFillRect', // dino/cacto/chão desenhados por código
      'canvasArc', // as nuvens do parallax
      'canvasFillText', // placar + telas de fim de jogo
      'mathBinary', // Math.hypot — colisão por círculo perdoadora
      'randomFloat', // intervalo de spawn sorteado
      'event', // keydown no construtor (pulo + Enter)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(dinoNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(dinoNaMaoExample.ir), 0)
    // delta time REAL: velocidades por milissegundo × dt.
    expect(code).toContain('const deltaTime = timeStamp - lastTime;')
    expect(code).toContain('this.y = this.y + this.vy * deltaTime;')
    // timer de spawn por ACUMULAÇÃO com intervalo sorteado.
    expect(code).toContain('this.obstacleTimer = this.obstacleTimer + deltaTime;')
    // círculo perdoador: raio reduzido (metade da altura × 0.6).
    expect(code).toContain('this.radius = this.height * 0.5 * 0.6;')
    expect(code).toContain('Math.hypot(dx, dy)')
  })
})

describe('CORE_EXAMPLES — corridaInfinitaNaMaoExample (Corrida Infinita 3D Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(corridaInfinitaNaMaoExample)
    expect(corridaInfinitaNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(corridaInfinitaNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(corridaInfinitaNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('gera Three.js CRU com o motor do curso na mão (esteira + pool + caixa×esfera), sem asset', () => {
    const types = collectTypes(corridaInfinitaNaMaoExample.ir)
    for (const expected of [
      'importStar', // import * as THREE from 'three' — o motor à mostra
      'newInstance', // new THREE.X(...) na unha (renderer/cena/câmera/meshes)
      'animationLoop', // o laço de quadro com THREE.Clock (dt)
      'forRange', // posicionar o pool escalonado (índice i preservado)
      'forEach', // varrer o pool a cada quadro
      'funcDecl', // bateu (colisão) + reiniciar
      'call', // if (bateu(obstaculo)) — chamada como VALOR
      'mathBinary', // Math.max/Math.min — o clamp caixa×esfera do curso
      'randomFloat', // sortear a pista na reciclagem
      'event', // keydown (pistas/pulo/Enter) + pointerdown (reiniciar)
      'setProperty', // HUD em DOM (tempo + contagem de objetos)
      'setStyle', // mostrar/esconder o aviso de fim de jogo
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% procedural (BoxGeometry + cores): nenhum asset embutido, sem GLB
    expect(corridaInfinitaNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(corridaInfinitaNaMaoExample.ir), 0)
    expect(code).toContain("import * as THREE from 'three'")
    // névoa que esconde o nascimento dos objetos ao longe
    expect(code).toContain('new THREE.Fog')
    // chão infinito ENCADEADO: 2 segmentos em esteira
    expect(code).toContain('chao1.position.z = chao1.position.z - 120;')
    expect(code).toContain('chao2.position.z = chao2.position.z - 120;')
    // pool manual: reciclar reposicionando (nunca criar/destruir em loop)
    expect(code).toContain('obstaculo.position.z = obstaculo.position.z - 84;')
    // colisão caixa×esfera literal do curso (clamp + raio reduzido perdoador)
    expect(code).toContain(
      'Math.max(obstaculo.position.x - 0.8, Math.min(px, obstaculo.position.x + 0.8))',
    )
    expect(code).toContain('dx * dx + dy * dy + dz * dz < raioHeroi * raioHeroi')
    // velocidade cresce com o tempo + placar de sobrevivência no HUD em DOM
    expect(code).toContain('velocidade = 12 + tempo * 0.5;')
    expect(code).toContain('document.getElementById("tempo").textContent = Math.floor(tempo);')
    // toque didático: contar os objetos da cena (vira sz_t3d_object_count na Ponte)
    expect(code).toContain('cena.children.length')
    expect(code).toContain('renderer.render(cena, camera);')
  })
})

describe('CORE_EXAMPLES — dueloNaMaoExample (luta 2 jogadores na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(dueloNaMaoExample)
    expect(dueloNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(dueloNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(dueloNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a caixa de golpe + barras de vida no canvas, sem asset', () => {
    const types = collectTypes(dueloNaMaoExample.ir)
    for (const expected of [
      'classDecl',
      'funcDecl',
      'requestFrame',
      'canvasSetup',
      'canvasFillRect',
      'canvasFillText',
      'event',
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    expect(dueloNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(dueloNaMaoExample.ir), 0)
    expect(code).toContain('p2.health = p2.health - 15')
  })
})
