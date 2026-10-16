export function phaserSources(id: string): Record<string, string> {
  const platform = id === 'phaser-platformer'
  return {
    'src/config.ts': platform
      ? `
export const config = { mode: 'platformer', title: 'Trilha das sementes', speed: 250, jump: 570, gravity: 1100, width: 2400,
  platforms: [{ x: 200, y: 410, w: 400 }, { x: 670, y: 380, w: 360 }, { x: 1100, y: 350, w: 360 }, { x: 1530, y: 380, w: 360 }, { x: 1990, y: 410, w: 440 }],
  seeds: [{ x: 280, y: 360 }, { x: 670, y: 330 }, { x: 1100, y: 300 }, { x: 1530, y: 330 }, { x: 2050, y: 360 }], waves: 3, maxTargets: 24, maxLights: 24,
} as const
`
      : `
export const config = { mode: 'arcade', title: 'Patrulha das estrelas', speed: 300, waves: 3, maxTargets: 24, maxLights: 24, width: 800, jump: 570, gravity: 1100,
  platforms: [] as { x: number; y: number; w: number }[], seeds: [] as { x: number; y: number }[],
} as const
`,
    'src/game.ts': `
import Phaser from 'phaser'
import { config } from './config'
import type { GameUI } from './ui'
import type { GameInput } from './input'
import type { GameController } from './contracts'

export function createGame(ui: GameUI, input: GameInput): GameController {
  // Phaser owns rendering/physics; the Studio UI owns menu and input lifetimes.
  const platform = String(config.mode) === 'platformer'
  class GameScene extends Phaser.Scene {
    player!: Phaser.Physics.Arcade.Sprite
    targets!: Phaser.Physics.Arcade.Group
    projectiles!: Phaser.Physics.Arcade.Group
    seeds!: Phaser.Physics.Arcade.StaticGroup
    score = 0
    wave = 0
    missed = 0
    cooldown = 0
    elapsed = 0
    unsubscribe?: () => void
    constructor() { super('game') }
    create() {
      const graphics = this.make.graphics({ x: 0, y: 0 })
      if (!this.textures.exists('player')) {
        graphics.fillStyle(0x64e2c6).fillRoundedRect(0,0,28,32,7).fillStyle(0x142e3c).fillRect(6,8,5,5).fillRect(18,8,5,5)
        graphics.generateTexture('player',28,32); graphics.clear()
        graphics.fillStyle(0xffce6a).fillCircle(10,10,9).lineStyle(2,0xffffff).strokeCircle(10,10,5)
        graphics.generateTexture('seed',20,20); graphics.clear()
        graphics.fillStyle(0xc6a1ef).fillRoundedRect(0,0,30,24,7).lineStyle(2,0xffffff).strokeRect(10,7,10,10)
        graphics.generateTexture('target',30,24); graphics.clear()
        graphics.fillStyle(0xeaffb1).fillRoundedRect(0,0,6,16,3)
        graphics.generateTexture('light',6,16); graphics.clear()
        graphics.fillStyle(0x4e9182).fillRect(0,0,64,20).fillStyle(0x9cdd9c).fillRect(0,0,64,5)
        graphics.generateTexture('ground',64,20)
      }
      graphics.destroy()
      this.cameras.main.setBackgroundColor('#19364b')
      // Distant layers have different scroll factors, independent of collision bodies.
      const scenery: Phaser.GameObjects.Shape[] = []
      for (let i = 0; i < 14; i++) {
        scenery.push(this.add.circle(i*190,130+(i%3)*45,65,0x244b5a).setScrollFactor(.15))
        scenery.push(this.add.triangle(i*220,365,0,0,90,-160,180,0,0x326f70).setScrollFactor(.45))
      }
      this.physics.world.setBounds(0,0,config.width,520, true,true,true,false)
      this.cameras.main.setBounds(0,0,config.width,450)
      this.player = this.physics.add.sprite(90,340,'player').setCollideWorldBounds(true).setSize(22,28).setOffset(3,4)
      this.targets = this.physics.add.group({ maxSize: config.maxTargets, allowGravity: false, immovable: true })
      this.projectiles = this.physics.add.group({ maxSize: config.maxLights, allowGravity: false })
      this.projectiles.createMultiple({ key: 'light', repeat: config.maxLights-1, active: false, visible: false })
      for (const light of this.projectiles.getChildren()) (light as Phaser.Physics.Arcade.Sprite).disableBody(true,true)
      this.seeds = this.physics.add.staticGroup()
      if (platform) {
        const ground = this.physics.add.staticGroup()
        for (const item of config.platforms) {
          const tile = ground.create(item.x,item.y,'ground') as Phaser.Physics.Arcade.Sprite
          tile.setDisplaySize(item.w,20).refreshBody()
        }
        for (const seed of config.seeds) this.seeds.create(seed.x,seed.y,'seed')
        this.physics.add.collider(this.player,ground)
        this.physics.add.overlap(this.player,this.seeds,(_player, seed) => {
          if (!(seed instanceof Phaser.Physics.Arcade.Sprite) || !seed.active || ui.phase !== 'playing') return
          seed.disableBody(true,true); this.score++; ui.tone(760)
          if (this.score === config.seeds.length) ui.finish(true,'Todas as sementes reunidas. A trilha floresceu!',this.score)
        })
        this.player.setGravityY(config.gravity)
        this.cameras.main.startFollow(this.player,true,.12,.12)
        this.cameras.main.setDeadzone(100,70)
      } else {
        this.physics.add.overlap(this.projectiles,this.targets,(light,target) => {
          if (!(light instanceof Phaser.Physics.Arcade.Sprite) || !(target instanceof Phaser.Physics.Arcade.Sprite) || !light.active || !target.active || ui.phase !== 'playing') return
          light.disableBody(true,true); target.disableBody(true,true); this.score += 10; ui.tone()
        })
      }
      const idle = () => { if (ui.phase !== 'playing') this.game.loop.sleep() }
      this.unsubscribe = ui.onPhase(phase => { input.clear(); if (phase === 'playing') { this.physics.world.resume(); this.game.loop.resetDelta(); this.game.loop.wake() } else { this.physics.world.pause(); this.game.loop.sleep() } })
      const redraw = () => { if (ui.phase !== 'playing') { this.game.loop.wake(); this.game.events.once('postrender', idle) } }
      const stopQuality = ui.onQuality(() => { for (const shape of scenery) shape.setVisible(!ui.reducedQuality); redraw() })
      const observer = new ResizeObserver(redraw); observer.observe(ui.stage)
      const cleanup = () => { this.unsubscribe?.(); this.unsubscribe = undefined; stopQuality(); observer.disconnect(); this.game.events.off('postrender', idle); this.events.off('shutdown',cleanup); this.events.off('destroy',cleanup) }
      this.events.once('shutdown',cleanup); this.events.once('destroy',cleanup)
      ui.onReset(() => this.resetGame())
      this.resetGame(); this.physics.world.pause()
      this.game.events.once('postrender',idle)
    }
    resetGame() {
      this.score = 0; this.wave = 0; this.missed = 0; this.elapsed = 0; this.cooldown = 0; input.clear()
      this.player.enableBody(true,platform ? 90 : 400,platform ? 340 : 400,true,true).setVelocity(0,0)
      for (const light of this.projectiles.getChildren()) (light as Phaser.Physics.Arcade.Sprite).disableBody(true,true)
      this.targets.clear(true,true)
      for (const seed of this.seeds.getChildren()) (seed as Phaser.Physics.Arcade.Sprite).enableBody(false,0,0,true,true)
      if (!platform) this.spawnWave()
    }
    spawnWave() {
      this.wave++
      const count = Math.min(config.maxTargets, 8 + this.wave*4)
      this.targets.clear(true,true)
      for (let i = 0; i < count; i++) this.targets.create(100+(i%8)*80,55+Math.floor(i/8)*40,'target')
    }
    update(_time: number, milliseconds: number) {
      input.poll()
      if (ui.phase !== 'playing' || !this.player) return
      const dt = Math.min(.05,milliseconds/1000); this.elapsed += dt; this.cooldown -= dt
      this.player.setVelocityX((Number(input.down('right'))-Number(input.down('left')))*config.speed)
      if (platform) {
        if ((input.take('action') || input.take('up')) && (this.player.body as Phaser.Physics.Arcade.Body).blocked.down) this.player.setVelocityY(-config.jump)
        if (this.player.y > 500) ui.finish(false,'Você saiu da trilha. Reinicie e tente outro salto!',this.score)
      } else {
        this.player.setVelocityY((Number(input.down('down'))-Number(input.down('up')))*config.speed)
        this.player.y = Phaser.Math.Clamp(this.player.y,280,425)
        if (input.down('action') && this.cooldown <= 0) {
          const light = this.projectiles.getFirstDead(false) as Phaser.Physics.Arcade.Sprite | null
          if (light) { light.enableBody(true,this.player.x,this.player.y-20,true,true).setVelocity(0,-480); this.cooldown = .18 }
        }
        for (const object of this.projectiles.getChildren()) { const light = object as Phaser.Physics.Arcade.Sprite; if (light.active && light.y < -20) light.disableBody(true,true) }
        for (const object of this.targets.getChildren()) {
          const target = object as Phaser.Physics.Arcade.Sprite
          if (!target.active) continue
          target.setVelocity(Math.cos(this.elapsed*1.2)*24,10+this.wave*4)
          if (target.y > 440) { target.disableBody(true,true); this.missed++ }
        }
        if (this.missed >= 3) ui.finish(false,'Três estrelas escaparam. Tente outra patrulha!',this.score)
        else if (this.targets.countActive(true) === 0) { if (this.wave >= config.waves) ui.finish(true,'Você iluminou todas as ondas!',this.score); else this.spawnWave() }
      }
      ui.hud(platform ? 'Sementes: ' + this.score + '/' + config.seeds.length : 'Pontos: ' + this.score + ' · Onda: ' + this.wave + '/' + config.waves + ' · Escaparam: ' + this.missed + '/3')
    }
  }
  const game = new Phaser.Game({ type: Phaser.AUTO, parent: ui.stage, width: 800, height: 450, backgroundColor: '#19364b', antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: true, fps: 60 } },
    fps: { target: 60 }, audio: { noAudio: true }, scene: GameScene,
  })
  game.events.once('ready', () => { game.canvas.tabIndex = 0; game.canvas.setAttribute('aria-label', config.title + '. Controles descritos abaixo do jogo.') })
  let disposed = false
  return {
    inspect() {
      const scene = !disposed && game.isBooted ? game.scene.getScene('game') as GameScene | undefined : undefined
      const objects = platform ? scene?.seeds : scene?.targets
      return { engine: 'phaser', phase: ui.phase, score: scene?.score ?? 0, goal: platform ? config.seeds.length : config.waves, wave: scene?.wave ?? 0, missed: scene?.missed ?? 0,
        ...(scene?.player?.body ? { player: { x: scene.player.x, y: scene.player.y, grounded: (scene.player.body as Phaser.Physics.Arcade.Body).blocked.down } } : {}),
        targets: objects?.getChildren().filter(object => object.active).map(object => { const sprite = object as Phaser.Physics.Arcade.Sprite; return { x: sprite.x, y: sprite.y } }) ?? [],
      }
    },
    dispose() { if (disposed) return; disposed = true; game.destroy(true); if (game.isBooted) game.loop.wake() },
  }
}
`,
    'src/main.ts': `import { createProgress } from './progress'\nimport { config } from './config'\nimport { createUI } from './ui'\nimport { createInput } from './input'\nimport { createGame } from './game'\nimport { manageLifetime, exposeGameInspection } from './lifecycle'\nconst ui = createUI(config.title, ${JSON.stringify(platform ? '← → ou A/D movem; ↑, Espaço ou Ação saltam. Reúna as cinco sementes sem cair. Esc pausa.' : 'Setas ou WASD movem; segure Espaço ou Ação para lançar luzes. Complete três ondas antes de três estrelas escaparem. Esc pausa.')})\nconst input = createInput(ui.controls, () => ui.phase === 'playing', ${JSON.stringify(platform ? { left: '← Esquerda', right: 'Direita →', up: 'Pular ↑', action: 'Pular' } : { left: '← Esquerda', right: 'Direita →', up: '↑ Cima', down: '↓ Baixo', action: 'Lançar luz' })})\nconst stopProgress = createProgress(ui, ${JSON.stringify(id)})\nconst game = createGame(ui,input)\nconst stopInspection = exposeGameInspection(game); manageLifetime(() => { stopInspection(); game.dispose(); stopProgress(); input.destroy(); ui.destroy() })\n`,
  }
}
