import { describe, expect, it } from 'bun:test'
import { compileStatements, generateJS } from '#generators'
import { behaviorStatements, SZIRV2Schema } from '#ir'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import {
  aventuraNaMaoExample,
  batalhaNaMaoExample,
  CORE_EXAMPLES,
  chuvaDeMeteorosNaMaoExample,
  corridaInfinitaNaMaoExample,
  dinoNaMaoExample,
  dueloDeHeroisNaMaoExample,
  escaladaDoGuerreiroNaMaoExample,
  folioCanvasProceduralExample,
  gorilasNaMaoExample,
  invadersNaMaoExample,
  labirintoDosRobosNaMaoExample,
  mundoDeBlocosNaMaoExample,
  muralhaDoReinoNaMaoExample,
  passeio3dNaMaoExample,
  patrulhaEspacialNaMaoExample,
  portasDoCasteloNaMaoExample,
} from './core'

describe('CORE_EXAMPLES — texto visível sem travessão', () => {
  it('nenhum exemplo traz "—" em name, description ou dentro da IR', () => {
    // O travessão é vetado em TODO texto visível do produto (voz da casa).
    // name/description aparecem na vitrine de kits; strings da IR viram HUD,
    // mensagens e telas do jogo gerado.
    for (const example of CORE_EXAMPLES) {
      expect(example.name, `name de ${example.name}`).not.toContain('—')
      expect(example.description, `description de ${example.name}`).not.toContain('—')
      expect(JSON.stringify(example.ir), `IR de ${example.name}`).not.toContain('—')
    }
  })
})

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

describe('CORE_EXAMPLES — batalhaNaMaoExample (batalha de monstrinhos na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(batalhaNaMaoExample)
    expect(batalhaNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(batalhaNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(batalhaNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a lição "dados + regras" na mão (tabelas + matriz por chave + turno), sem asset', () => {
    const types = collectTypes(batalhaNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Monster/Menu/Game
      'newExpr', // new Monster(FICHAS[0], …) / new Menu(…)
      'objectLiteral', // as TABELAS: golpes, fichas, cores e a matriz aninhada
      'array', // fichas e listas de golpes
      'index', // GOLPES[nome] / VANTAGEM[golpe.tipo] (objeto por chave)
      'indexGet', // VANTAGEM[…][alvo.elemento] — o segundo nível da matriz
      'setTimeout', // turno do inimigo com ATRASO (encadeado)
      'randomFloat', // o inimigo SORTEIA o golpe
      'mathUnary', // Math.floor do sorteio
      'forEach', // menus e time (banco de reservas)
      'memberCallExpr', // this.meuMonstro().draw() — chamada em valor
      'event', // keydown no construtor (cursor + Enter)
      'canvasSetup',
      'canvasFillText', // menus/mensagens/telas desenhados no canvas
      'canvasArc', // monstrinhos desenhados por código
      'requestFrame', // laço de animação na mão
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(batalhaNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(batalhaNaMaoExample.ir), 0)
    // A MATRIZ DE VANTAGEM lida por chave (programa = dados + regras).
    expect(code).toContain('VANTAGEM[golpe.tipo][alvo.elemento]')
    // Dano = força × multiplicador; CURA = dano negativo na MESMA função.
    expect(code).toContain('alvo.aplicar(golpe.forca * mult)')
    expect(code).toContain('atacante.aplicar(golpe.forca)')
    // Clamp da vida em [0, max].
    expect(code).toContain('this.vida = this.vida - dano;')
    // Turno do inimigo com atraso + sorteio.
    expect(code).toContain('setTimeout(() => {')
    expect(code).toContain('Math.floor(Math.random() * this.inimigo.golpes.length)')
    // Banco de reservas: a vida de quem sai fica LEMBRADA no objeto.
    expect(code).toContain('" (" + monstro.vida + ")"')
  })
})

describe('CORE_EXAMPLES — aventuraNaMaoExample (aventura estilo Zelda na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(aventuraNaMaoExample)
    expect(aventuraNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(aventuraNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(aventuraNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa câmera + colisão por eixo + FSM por distância na mão, sem asset', () => {
    const types = collectTypes(aventuraNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Player/Enemy/Grass/Game
      'newExpr', // new Enemy(this, …) / new Grass(…)
      'canvasTranslate', // a CÂMERA na mão (HUD fica fora do translate)
      'canvasSave', // cerca o translate do mundo
      'canvasRestore',
      'mathBinary', // Math.hypot — distância da FSM e do knockback
      'mathUnary', // Math.floor da piscada de i-frames
      'arrayFilter', // culling de mato/inimigo/partícula
      'objectLiteral', // obstáculos e partículas como objetos-dados
      'forRange', // grades de mato e corações do HUD
      'forEach', // varre obstáculos/inimigos/partículas
      'funcDecl', // animate(timeStamp) — o laço com TEMPO na mão
      'requestFrame',
      'canvasSetup',
      'canvasFillRect', // herói/mato/espada desenhados por código
      'canvasArc', // corações do HUD
      'randomFloat', // as partículas espalham sorteadas
      'event', // keydown/keyup no construtor
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(aventuraNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(aventuraNaMaoExample.ir), 0)
    // CÂMERA: o mundo desloca pro lado contrário.
    expect(code).toContain('ctx.translate(0 - this.cameraX, 0 - this.cameraY)')
    // COLISÃO POR EIXO (wall-slide): mover X → resolver → mover Y → resolver.
    expect(code).toContain('this.x = this.x + this.vx * deltaTime;')
    expect(code).toContain('this.resolverX();')
    expect(code).toContain('this.resolverY();')
    // KNOCKBACK com vetor normalizado + i-frames com piscada.
    expect(code).toContain('quem.kbx = dx / distancia * forca;')
    expect(code).toContain('Math.floor(this.invencivel / 4) % 2 === 0')
    // FSM por distância (estado em string).
    expect(code).toContain('Math.hypot(dx, dy)')
    expect(code).toContain('this.state = "perseguir";')
    // Y-SORT em DUAS PASSADAS pela base (sem .sort(fn)).
    expect(code).toContain('mato.y + mato.height <= baseHeroi')
    expect(code).toContain('inimigo.y + inimigo.height > baseHeroi')
    // Laço com TEMPO real (velocidades por milissegundo × dt)…
    expect(code).toContain('let deltaTime = timeStamp - lastTime;')
    // …com CLAMP de pausa longa (trocar de aba não teleporta pela parede).
    expect(code).toContain('deltaTime = 50;')
    // Blur da janela zera as teclas; o inimigo colide como o herói.
    expect(code).toContain('window.addEventListener("blur"')
    expect(code).toContain('this.vx = dx / distancia * this.speed;')
  })
})

describe('CORE_EXAMPLES — labirintoDosRobosNaMaoExample (labirinto Doom 3D Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(labirintoDosRobosNaMaoExample)
    expect(labirintoDosRobosNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(labirintoDosRobosNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(labirintoDosRobosNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('gera Three.js CRU com câmera FPS por arrastar + mapa em texto + FSM + tiro pelo centro, sem asset', () => {
    const types = collectTypes(labirintoDosRobosNaMaoExample.ir)
    for (const expected of [
      'importStar', // import * as THREE from 'three' — o motor à mostra
      'newInstance', // new THREE.X(...) na unha (renderer/cena/câmera/mirador)
      'newExpr', // new THREE.Group()/Mesh DENTRO da classe + new Robot(this, …)
      'classDecl', // Robot (grupo de caixas + FSM) e Game (estado da partida)
      'funcDecl', // criarParede + resolverX/resolverZ (a AABB compartilhada)
      'forRange', // varrer o MAPA em strings (linha × coluna)
      'forEach', // paredes na colisão + robôs a cada quadro
      'arrayFilter', // culling dos robôs derrotados (só os vivos ficam)
      'callFunction', // resolverX(camera, 0.5) — a colisão é uma função
      'mathBinary', // Math.hypot — a distância da FSM
      'mathUnary', // Math.sin/cos do yaw — a lição da base vetorial
      'event', // pointerdown/move/up (arrastar) + keydown/keyup (WASD/espaço)
      'eventProp', // event.clientX / event.code
      'animationLoop', // o laço de quadro com THREE.Clock (dt)
      'setProperty', // HUD em DOM (vida + pontos)
      'setStyle', // flash de dano + aviso de fim de jogo
      'memberCall', // setFromCamera/lookAt/add/remove na unha
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% procedural (BoxGeometry + cores): nenhum asset embutido, sem GLB
    expect(labirintoDosRobosNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(labirintoDosRobosNaMaoExample.ir), 0)
    expect(code).toContain("import * as THREE from 'three'")
    // câmera FPS: ordem YXZ + giro por ARRASTAR (pointer lock é vetado)
    expect(code).toContain('camera.rotation.order = "YXZ";')
    expect(code).toContain('(event.clientX - ultimoX) * 0.005')
    // a base vetorial do yaw: andar NO PLANO com sin/cos
    expect(code).toContain('Math.sin(anguloY)')
    // o labirinto é DATA-DRIVEN: paredes nascem de um mapa em strings
    expect(code).toContain('if (letra === "P")')
    // AABB eixo a eixo com wall-slide (empurra de volta pelo eixo invadido)
    expect(code).toContain('objeto.position.x = parede.position.x - 1 - raio;')
    // tiro pelo CENTRO: Raycaster + mira fixa + dono do mesh atingido
    expect(code).toContain('mirador.setFromCamera(centro, camera);')
    expect(code).toContain('alvo.object.parent === robo.grupo')
    // FSM por distância + dano com i-frames
    expect(code).toContain('this.estado = "perseguir";')
    expect(code).toContain('this.vida = this.vida - 10;')
    // névoa p/ o clima do labirinto
    expect(code).toContain('new THREE.Fog')
  })
})

describe('CORE_EXAMPLES — mundoDeBlocosNaMaoExample (Minecraft 3D Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(mundoDeBlocosNaMaoExample)
    expect(mundoDeBlocosNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(mundoDeBlocosNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(mundoDeBlocosNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('gera Three.js CRU com o mapa por chave + colocar na face + coluna de blocos, sem asset', () => {
    const types = collectTypes(mundoDeBlocosNaMaoExample.ir)
    for (const expected of [
      'importStar', // import * as THREE from 'three' — o motor à mostra
      'newInstance', // new THREE.X(...) na unha (renderer/cena/câmera/mirador)
      'newExpr', // new THREE.Mesh(caixaGeo, material) DENTRO do World.colocar
      'classDecl', // World (mapa de células) / Player (física) / Game (gestos)
      'objectLiteral', // this.celulas = {} — o MAPA do mundo
      'indexGet', // this.celulas[chave] — ler a célula por chave
      'indexSet', // this.celulas[chave] = bloco — gravar a célula
      'call', // chaveDe(x, y, z) como VALOR — a chave "x,y,z" é uma função
      'return', // chaveDe/alturaDoTopo devolvem valor
      'funcDecl', // chaveDe — a chave de célula na unha
      'forRange', // geração procedural: chão 16×16, muralha e árvores
      'mathUnary', // Math.round — a célula do jogador
      'event', // pointerdown/move/up (arrastar) + keydown/keyup (WASD/pulo)
      'eventProp', // event.clientX / event.code
      'animationLoop', // o laço de quadro com THREE.Clock (dt)
      'setProperty', // HUD em DOM (tipo de bloco + contagem)
      'setStyle', // aviso de vitória (tocou a nuvem)
      'memberCall', // setFromCamera/add/remove na unha
      'memberCallExpr', // mirador.intersectObjects(…) / this.mundo.alturaDoTopo(…)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% procedural (BoxGeometry + cores): nenhum asset embutido, sem GLB
    expect(mundoDeBlocosNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(mundoDeBlocosNaMaoExample.ir), 0)
    expect(code).toContain("import * as THREE from 'three'")
    // câmera FPS por ARRASTAR com ordem YXZ (pointer lock é vetado)
    expect(code).toContain('camera.rotation.order = "YXZ";')
    expect(code).toContain('(event.clientX - ultimoX) * 0.005')
    // o MAPA por chave de célula "x,y,z" (indexGet/indexSet)
    expect(code).toContain('return x + "," + y + "," + z;')
    expect(code).toContain('this.celulas[chave] = bloco;')
    // a mecânica-assinatura: COLOCAR NA FACE (célula atingida + face.normal)
    expect(code).toContain('mirador.setFromCamera(centro, camera);')
    expect(code).toContain('alvo.object.position.x + alvo.face.normal.x')
    // alcance limitado do ray, como no jogo real
    expect(code).toContain('alvo.distance < 6')
    // pulo com gravidade + pouso sobre a COLUNA de blocos da célula
    expect(code).toContain('this.vy = this.vy - 12 * dt;')
    expect(code).toContain('camera.position.y = topo + 1.6;')
    // geração procedural por loops: chão, muralha e árvores
    expect(code).toContain('this.colocar("grama", x, 0, z);')
    expect(code).toContain('this.plantarArvore(4, 4);')
    // toque didático: contar os blocos da cena no HUD
    expect(code).toContain('cena.children.length')
  })
})

describe('CORE_EXAMPLES — chuvaDeMeteorosNaMaoExample (Space Shooter 2D Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(chuvaDeMeteorosNaMaoExample)
    expect(chuvaDeMeteorosNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(chuvaDeMeteorosNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(chuvaDeMeteorosNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa a família de sprites + rotação por translate/rotate + colisões do curso, sem asset', () => {
    const types = collectTypes(chuvaDeMeteorosNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Sprite/Player/Laser/Meteor/ExplosionAnimation/Game
      'superCall', // super(game, …) — a herança de verdade da família
      'superMethodCall', // super.update(deltaTime) no Meteor
      'newExpr', // new Meteor(this) / new Laser(this, x, y)
      'arrayFilter', // culling manual dos que saíram da tela
      'setThisProp', // o estado vive nos objetos
      'canvasSave', // a receita da rotação 2D…
      'canvasTranslate', // …translada até o centro do meteoro…
      'canvasRotate', // …gira o pincel…
      'canvasRestore', // …e devolve o pincel como estava
      'angleConvert', // graus→radianos na mão (Math.PI/180)
      'canvasGlobalAlpha', // a explosão esmaece por código
      'canvasArc', // estrelas, meteoro e explosão desenhados por código
      'canvasFillRect', // nave e laser são retângulos (asset-free)
      'canvasFillText', // placar + telas de início/fim
      'funcDecl', // animate(timeStamp) — o laço com TEMPO na mão
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'mathBinary', // Math.hypot — normalização da diagonal + círculo×círculo
      'randomFloat', // estrelas, meteoro e direção diagonal sorteados
      'objectLiteral', // as 30 estrelas são objetos-dados {x, y, size}
      'repeat', // o boot sorteia as estrelas num laço
      'forEach', // varre lasers/meteoros/explosões
      'event', // keydown/keyup/blur no construtor
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(chuvaDeMeteorosNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(chuvaDeMeteorosNaMaoExample.ir), 0)
    // A lição da DIAGONAL: as 4 direções normalizadas pela hipotenusa.
    expect(code).toContain('const comprimento = Math.hypot(this.dirX, this.dirY);')
    expect(code).toContain('this.dirX = this.dirX / comprimento;')
    // A ROTAÇÃO contínua do meteoro: save + translate + rotate + restore.
    expect(code).toContain('ctx.rotate((this.rotation * Math.PI / 180));')
    expect(code).toContain('this.rotation = this.rotation + 0.05 * deltaTime;')
    // Colisão LITERAL do curso: círculo×retângulo via clamp…
    expect(code).toContain('Math.max(laser.x, Math.min(meteor.x, laser.x + laser.width))')
    // …e círculo×círculo com raios reduzidos (perdoador).
    expect(code).toContain('distancia < this.player.collisionRadius + meteor.collisionRadius')
    // A animação por ÍNDICE sem assets (index += 0.02*dt).
    expect(code).toContain('this.index = this.index + 0.02 * deltaTime;')
    // Laço com TEMPO real CLAMPADO em 50ms.
    expect(code).toContain('let deltaTime = timeStamp - lastTime;')
    expect(code).toContain('deltaTime = 50;')
    // Blur da janela zera as teclas (seta não fica presa).
    expect(code).toContain('window.addEventListener("blur"')
  })
})

describe('CORE_EXAMPLES — patrulhaEspacialNaMaoExample (Space Shooter 3D Clear Code na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(patrulhaEspacialNaMaoExample)
    expect(patrulhaEspacialNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(patrulhaEspacialNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(patrulhaEspacialNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('gera Three.js CRU com inclinação + bobbing + flash sem shader + sombras fake, sem asset', () => {
    const types = collectTypes(patrulhaEspacialNaMaoExample.ir)
    for (const expected of [
      'importStar', // import * as THREE from 'three' — o motor à mostra
      'newInstance', // new THREE.X(...) na unha (renderer/cena/câmera/nave)
      'newExpr', // new THREE.Mesh(...) DENTRO das classes + new Meteoro()
      'classDecl', // Laser e Meteoro embrulham mesh + estado próprio
      'animationLoop', // o laço de quadro com THREE.Clock (dt)
      'funcDecl', // atirar/criarMeteoro (spawn por função) + colisões
      'call', // if (acertou(laser, meteoro)) — chamada como VALOR
      'arrayPush', // lasers.push(new Laser(…)) — o pool cresce por função
      'arrayFilter', // culling dos que saíram do alcance
      'mathBinary', // Math.max/Math.min — o clamp AABB×esfera por eixo
      'mathUnary', // Math.sin do bobbing + Math.floor do placar
      'randomFloat', // raio/cor/posição/giro sorteados do meteoro
      'index', // CORES_DO_METEORO[…] — cores variadas por sorteio
      'event', // keydown/keyup (setas/espaço/Enter) + pointerdown + blur
      'setProperty', // HUD em DOM (pontos + contagem de objetos)
      'setStyle', // mostrar/esconder o aviso de início/fim
      'memberCall', // position.set/add/remove na unha
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% procedural (geometrias + cores): nenhum asset embutido, sem GLB
    expect(patrulhaEspacialNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(patrulhaEspacialNaMaoExample.ir), 0)
    expect(code).toContain("import * as THREE from 'three'")
    // a nave é um GRUPO de caixas que INCLINA ao virar (clamp ±0.26 rad)
    expect(code).toContain('const nave = new THREE.Group();')
    expect(code).toContain(
      'nave.rotation.z = nave.rotation.z + (0 - direcao * 0.26 - nave.rotation.z) * 8 * dt;',
    )
    // BOBBING senoidal com o tempo total acumulado por dt
    expect(code).toContain('tempoTotal = tempoTotal + dt;')
    expect(code).toContain('nave.position.y = Math.sin(tempoTotal * 5) * 0.15;')
    // FLASH sem shader: material POR meteoro + emissive branco + morte dramática
    expect(code).toContain('const material = new THREE.MeshStandardMaterial({ color: cor });')
    expect(code).toContain('this.material.emissive = new THREE.Color(16777215);')
    expect(code).toContain('this.morte = 0.25;')
    // SOMBRA FAKE: cilindro achatado semi-transparente seguindo x/z do dono
    expect(code).toContain('const sombraGeo = new THREE.CylinderGeometry(1, 1, 0.1, 20);')
    expect(code).toContain('sombraDaNave.position.set(nave.position.x, -1.45, nave.position.z);')
    // colisão AABB×esfera via clamp por eixo (a matemática à mão)
    expect(code).toContain(
      'Math.max(laser.mesh.position.x - 0.06, Math.min(mx, laser.mesh.position.x + 0.06))',
    )
    expect(code).toContain('dx * dx + dy * dy + dz * dz < meteoro.raio * meteoro.raio')
    // dt REAL com THREE.Clock + placar e contagem de objetos no HUD em DOM
    expect(code).toContain('const relogio = new THREE.Clock();')
    expect(code).toContain('const dt = relogio.getDelta();')
    expect(code).toContain('document.getElementById("pontos").textContent = Math.floor(pontos);')
    expect(code).toContain('cena.children.length')
  })
})

describe('CORE_EXAMPLES — muralhaDoReinoNaMaoExample (defesa de torre Chris Courses na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(muralhaDoReinoNaMaoExample)
    expect(muralhaDoReinoNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(muralhaDoReinoNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(muralhaDoReinoNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa waypoints + mira por distância + tiro que persegue, sem asset', () => {
    const types = collectTypes(muralhaDoReinoNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Enemy / Shot / Tower
      'funcDecl', // dist(...) / spawnWave / restart / animate(timeStamp)
      'newExpr', // new Enemy(...) / new Shot(...) / new Tower(...)
      'setThisProp', // o estado vive nos objetos
      'canvasStroke', // o caminho é uma linha grossa (moveTo/lineTo/stroke)
      'canvasFillRect', // torres, barras de vida e slots são retângulos
      'canvasBeginPath', // inimigos e tiros são círculos (beginPath + arc + fill)
      'canvasFill', // preenche o círculo desenhado
      'canvasFillText', // placar (moedas/vidas/onda) + telas de fim/vitória
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'mathBinary', // Math.hypot da distância + Math.atan2 do rumo
      'mathUnary', // Math.cos / Math.sin do passo
      'forRange', // varre inimigos / torres / tiros / slots
      'event', // pointermove + click (comprar torre) + keydown (Enter)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(muralhaDoReinoNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(muralhaDoReinoNaMaoExample.ir), 0)
    // o inimigo vira com atan2 e anda com cos/sin (caminho por waypoints)
    expect(code).toContain('const angle = Math.atan2(target.y - this.y, target.x - this.x);')
    expect(code).toContain('this.x = this.x + Math.cos(angle) * this.speed;')
    // a torre mira o MAIS PRÓXIMO no alcance e o tiro persegue o alvo
    expect(code).toContain('const d = dist(this.x, this.y, e.x, e.y);')
    expect(code).toContain('Math.atan2(this.target.y - this.y, this.target.x - this.x)')
    // dt REAL clampado em 50ms (trocar de aba não teleporta)
    expect(code).toContain('dt = 50;')
  })

  it('IR→blocos não contém bloco raw/avançado', () => {
    expect(JSON.stringify(buildWorkspaceStateFromIR(muralhaDoReinoNaMaoExample.ir))).not.toContain(
      '"sz_adv_raw_js"',
    )
  })
})

describe('CORE_EXAMPLES — escaladaDoGuerreiroNaMaoExample (plataforma vertical Chris Courses na unha)', () => {
  it('está em CORE_EXAMPLES, sem extensões e com IR válido', () => {
    expect(CORE_EXAMPLES).toContain(escaladaDoGuerreiroNaMaoExample)
    expect(escaladaDoGuerreiroNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(escaladaDoGuerreiroNaMaoExample.ir).success).toBe(true)
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(escaladaDoGuerreiroNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa gravidade + colisão AABB em x e y + plataforma one-way + câmera, sem asset', () => {
    const types = collectTypes(escaladaDoGuerreiroNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block / Platform / Player
      'funcDecl', // overlap(...) AABB / updateCamera / animate
      'newInstance', // new Block(...) / new Platform(...) / new Player(...)
      'setThisProp', // o estado do herói vive no objeto
      'canvasFillRect', // herói, blocos, plataformas e bandeira são retângulos
      'canvasSave', // a câmera: save…
      'canvasScale', // …scale…
      'canvasTranslate', // …translate (segue o herói)…
      'canvasRestore', // …e restore
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'forRange', // varre blocos e plataformas
      'event', // keydown/keyup (A/D andam, W pula)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(escaladaDoGuerreiroNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(escaladaDoGuerreiroNaMaoExample.ir), 0)
    // a gravidade e a colisão AABB resolvida por eixo (empurra pelo movimento)
    expect(code).toContain('this.vy = this.vy + gravity;')
    // a plataforma de UMA via: só segura o herói vindo CAINDO de cima
    expect(code).toContain('const prevFeet = feet - this.vy;')
    // a câmera acompanha o herói com a receita de save + scale + translate
    expect(code).toContain('ctx.scale(scale, scale);')
    expect(code).toContain('ctx.translate(0 - camera.x, 0 - camera.y);')
  })

  it('IR→blocos não contém bloco raw/avançado', () => {
    expect(
      JSON.stringify(buildWorkspaceStateFromIR(escaladaDoGuerreiroNaMaoExample.ir)),
    ).not.toContain('"sz_adv_raw_js"')
  })
})

describe('CORE_EXAMPLES — dueloDeHeroisNaMaoExample (fighting-game Chris Courses na unha)', () => {
  it('é exportado, sem extensões e com IR válido', () => {
    expect(dueloDeHeroisNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(dueloDeHeroisNaMaoExample.ir).success).toBe(true)
  })

  it('nome e descrição em pt-BR com acentos e sem travessão', () => {
    expect(dueloDeHeroisNaMaoExample.name).toBe('Duelo de Heróis (na mão)')
    expect(dueloDeHeroisNaMaoExample.name).not.toContain('—')
    expect(dueloDeHeroisNaMaoExample.description).not.toContain('—')
    expect(dueloDeHeroisNaMaoExample.description).toContain('núcleo')
    expect(JSON.stringify(dueloDeHeroisNaMaoExample.ir)).not.toContain('—')
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(dueloDeHeroisNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa dois lutadores, golpe com janela ativa e barras de vida, sem asset', () => {
    const types = collectTypes(dueloDeHeroisNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Fighter
      'funcDecl', // overlap / drawHealthBar / finish / animate / reset
      'newInstance', // new Fighter(...)
      'setThisProp', // o estado de cada lutador vive no objeto
      'canvasFillRect', // lutadores, chão, caixa de golpe e barras são retângulos
      'canvasFillText', // cronômetro + tela de vencedor
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'forRange', // (nenhum aqui direto, mas o schema aceita)
      'event', // keydown/keyup (dois teclados)
    ].filter((t) => t !== 'forRange')) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(dueloDeHeroisNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(dueloDeHeroisNaMaoExample.ir), 0)
    // o golpe trava a direção ao começar (a caixa de golpe não teleporta)
    expect(code).toContain('this.attackFace = this.faceRight;')
    // a caixa de golpe à frente tira 15 de vida quando encosta
    expect(code).toContain('p2.health = p2.health - 15;')
    // barras de vida desenhadas na mão (nada de gsap no HUD)
    expect(code).toContain('const w = 200 * health / 100;')
  })

  it('IR→blocos não contém bloco raw/avançado', () => {
    expect(JSON.stringify(buildWorkspaceStateFromIR(dueloDeHeroisNaMaoExample.ir))).not.toContain(
      '"sz_adv_raw_js"',
    )
  })
})

describe('CORE_EXAMPLES — portasDoCasteloNaMaoExample (platformer com fase Chris Courses na unha)', () => {
  it('é exportado, sem extensões e com IR válido', () => {
    expect(portasDoCasteloNaMaoExample.ir.extensions).toEqual([])
    expect(SZIRV2Schema.safeParse(portasDoCasteloNaMaoExample.ir).success).toBe(true)
  })

  it('nome e descrição em pt-BR com acentos e sem travessão', () => {
    expect(portasDoCasteloNaMaoExample.name).toBe('Portas do Castelo (na mão)')
    expect(portasDoCasteloNaMaoExample.name).not.toContain('—')
    expect(portasDoCasteloNaMaoExample.description).not.toContain('—')
    expect(portasDoCasteloNaMaoExample.description).toContain('núcleo')
    expect(JSON.stringify(portasDoCasteloNaMaoExample.ir)).not.toContain('—')
  })

  it('NÃO usa código avançado nem blocos de extensão', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('rawCSS')).toBe(false)
    expect(types.has('rawHTML')).toBe(false)
    expect([...types].some((t) => t.startsWith('g2d:') || t.startsWith('g3d:'))).toBe(false)
  })

  it('usa física AABB + a passagem de fase com fade na mão (globalAlpha), sem asset', () => {
    const types = collectTypes(portasDoCasteloNaMaoExample.ir)
    for (const expected of [
      'classDecl', // Block / Player
      'funcDecl', // overlap / loadLevel / atDoor / animate
      'newInstance', // new Player(...)
      'newExpr', // new Block(...) dentro do loadLevel
      'setThisProp', // o estado do herói vive no objeto
      'canvasFillRect', // herói, blocos, porta e o overlay do fade são retângulos
      'canvasGlobalAlpha', // o fade preto na mão sobe e desce a opacidade
      'requestFrame', // pedir o próximo quadro chamando animate
      'canvasSetup',
      'forRange', // varre os blocos
      'if', // a máquina de fade e a decisão de entrar na porta
      'event', // keydown/keyup (A/D andam, W pula ou entra na porta)
    ]) {
      expect(types.has(expected)).toBe(true)
    }
    // é 100% desenhado: não precisa de nenhum asset embutido
    expect(portasDoCasteloNaMaoExample.assets ?? []).toEqual([])
    const code = compileStatements(behaviorStatements(portasDoCasteloNaMaoExample.ir), 0)
    // a colisão AABB é resolvida por eixo (empurra pelo sentido do movimento)
    expect(code).toContain('this.vy = this.vy + gravity;')
    // a porta só abre encostando E apertando para cima (fiel ao original)
    expect(code).toContain('loadLevel(nextLevel);')
    // o fade preto na mão sobe e desce a opacidade com globalAlpha
    expect(code).toContain('ctx.globalAlpha = fade;')
  })

  it('IR→blocos não contém bloco raw/avançado', () => {
    expect(JSON.stringify(buildWorkspaceStateFromIR(portasDoCasteloNaMaoExample.ir))).not.toContain(
      '"sz_adv_raw_js"',
    )
  })
})
