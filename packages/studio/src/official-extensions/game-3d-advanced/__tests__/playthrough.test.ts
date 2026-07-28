import { afterEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { generateJS } from '#generators'
import type { BehaviorIR } from '#ir'
import {
  aLendaDoHeroiProfissionalExample,
  cacaEstelarProfissionalExample,
  cercoNaBaseProfissionalExample,
  chefaoDasSombrasExample,
  defesaDaTorreExample,
  guardiaoDoPortalExample,
  labirintoDosRobosProfissionalExample,
  mundoDeBlocosProfissionalExample,
  parkourDoVulcaoExample,
  patrulhaEspacialProfissionalExample,
  quadraMalucaExample,
  reunirRebanhoProfissionalExample,
  saltoNasNuvensExample,
  tiroAoAlvoExample,
} from '../examples'
import { type KitApi, loadExampleKit } from './kitHarness'
import { stripIds } from './testUtils'

/**
 * ⭐ A REDE QUE FALTAVA (a lição R17 do gêmeo 2D, aplicada ao 3D) — testes que
 * JOGAM os exemplos até o fim, em vez de testar o setup.
 *
 * O que a suíte via até aqui: drift dos exemplos (parse/geração, sem executar),
 * e sistemas ISOLADOS jogando quadros de verdade (runtime/direction/model). O
 * que NINGUÉM via: o exemplo INTEIRO — o mesmo JS do preview — chegando a
 * 'vitoria'/'fim'. Foi exatamente nesse vão que o Kit Monstrinhos do 2D levou
 * TRÊS softlocks a produção com a suíte verde.
 *
 * Aqui cada exemplo roda o JS GERADO da própria IR embutida (a composição dos
 * drift tests) e é jogado como a criança joga: clicando o botão do menu,
 * apertando tecla de verdade e deixando os quadros correrem.
 *
 *   softlock  →  `state()` nunca sai de 'jogando' dentro do teto de quadros
 *                (exceção de gancho é ENGOLIDA pelo guard() de propósito — o
 *                teto é a medida honesta);
 *   'carregando' eterno  →  o loader lança (gate de assets regrediu).
 *
 * Estratégia por exemplo: Torre e Guardião jogam SOZINHOS (FSM/timer); nos de
 * plataforma o WASD às cegas não navega um 3D, então o teste dirige o caminho
 * REAL de coleta por teleporte (`place` re-indexa a grade na hora): o pickup do
 * Salto é o forEachNear do gancho DO EXEMPLO, e as gemas/bolas passam pela
 * máquina de gatilho de ENTRADA do motor. Teclado entra num smoke à parte.
 */

/** O MESMO JS que o preview roda: gerado da IR embutida pelo gerador real. */
function jsDoExemplo(example: { ir: { behavior: BehaviorIR } }): string {
  return generateJS({
    behavior: stripIds(example.ir.behavior),
    lifecycle: 'game-3d-advanced',
  })
}

/** Clica o botão principal de uma tela pronta (o caminho da criança). */
function apertarBotaoDe(stage: Element, screen: string): void {
  const btn = stage.querySelector(`[data-szg3k-screen="${screen}"] button`) as {
    click?: () => void
    dispatchEvent?: (ev: Event) => void
  } | null
  if (!btn) throw new Error(`sem botão na tela "${screen}"`)
  if (btn.click) btn.click()
  else btn.dispatchEvent?.(new Event('click'))
}

/** Painel de tela ativo? (é o que a criança VÊ por cima do jogo.) */
function telaAtiva(stage: Element, screen: string): boolean {
  const el = stage.querySelector(`[data-szg3k-screen="${screen}"]`)
  return !!el && (el as Element).classList.contains('szg3k-active')
}

function tituloDaTela(stage: Element, screen: string): string {
  return (
    stage.querySelector(`[data-szg3k-screen="${screen}"] h1, [data-szg3k-screen="${screen}"] h2`)
      ?.textContent ?? ''
  )
}

/** Anda 1 quadro por vez até `done()`; devolve os quadros usados, ou -1 se travou. */
function stepUntil(step: (n: number) => void, done: () => boolean, maxFrames: number): number {
  for (let i = 1; i <= maxFrames; i++) {
    step(1)
    if (done()) return i
  }
  return -1
}

function primeiroVivo(api: KitApi, mold: string): unknown {
  let found: unknown = null
  api.forEachAlive(mold, (e) => {
    if (!found) found = e
  })
  return found
}

function tecla(name: string, key: string): void {
  window.dispatchEvent(new KeyboardEvent(name, { key }))
}

// Palcos e runtimes acumulam no happy-dom — o pagehide aciona o disposeAll de
// TODOS os carregados até aqui (loop desligado, palco removido do DOM).
afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

describe('g3k — JOGAR os exemplos até o fim (não só abrir)', () => {
  it('⭐ Defesa da Torre Profissional: as torres defendem SOZINHAS até a vitória', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(defesaDaTorreExample))
    expect(api.state()).toBe('menu')
    // O exemplo NÃO semeia — a semente do teste vale porque o reset do
    // setState (pools/fábricas/tempo) NÃO mexe no RNG.
    api.setSeed(1)
    apertarBotaoDe(stage, 'menu') // "Defender"
    expect(api.state()).toBe('jogando')

    // 15 abatidos → 'vitoria'. O cristal morrendo daria 'fim' — asserir
    // 'vitoria' prova que as torres DEFENDEM, não só que o jogo acaba.
    const quadros = stepUntil(step, () => api.state() !== 'jogando', 2400)
    expect(quadros).toBeGreaterThan(0) // -1 = softlock
    expect(api.state()).toBe('vitoria')
    expect(telaAtiva(stage, 'vitoria')).toBe(true)
    expect(tituloDaTela(stage, 'vitoria')).toBe('O cristal sobreviveu!')
  })

  it('⭐ Reunir o Rebanho Profissional: guiar o rebanho ao curral vence', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(reunirRebanhoProfissionalExample))
    expect(api.state()).toBe('menu')
    api.setSeed(1)
    apertarBotaoDe(stage, 'menu') // "Pastorear"
    expect(api.state()).toBe('jogando')

    // O pastor fica na posição inicial FIXA (0,1,8) — o teste não aperta tecla.
    // Então dirige o REBANHO por teleporte (place re-indexa na hora, como nos de
    // plataforma): cada bichinho é levado ao pastor (a vizinhança do gancho DO
    // EXEMPLO o põe em "seguindo") e depois solto no curral (a zona o entrega).
    // Chegar a 'vitoria' prova que o laço reunir→entregar FECHA (não trava).
    step(15) // os bichinhos saem de "parado" e entram em "vagando" (stateTimer 0,2 s)

    let venceu = false
    for (let i = 0; i < 240 && !venceu; i++) {
      let alvo: unknown = null
      api.forEachAlive('bicho', (b) => {
        if (!alvo && api.entityStateIs(b, 'vagando')) alvo = b
      })
      if (alvo) {
        api.place(alvo, 0, 0.5, 8) // encosta no pastor → vira "seguindo"
        step(1)
        api.place(alvo, 16, 0.5, 16) // solta no curral → entregue (+1 ponto)
        step(1)
      } else {
        step(2) // deixa o trickle nascer e amadurecer para "vagando"
      }
      if (api.state() !== 'jogando') venceu = true
    }

    expect(venceu).toBe(true) // false = softlock (reunir/entregar não fecha)
    expect(api.state()).toBe('vitoria')
    expect(telaAtiva(stage, 'vitoria')).toBe(true)
    expect(tituloDaTela(stage, 'vitoria')).toBe('Rebanho reunido!')
  })

  it('⭐ Salto nas Nuvens: tecla REAL move, cair volta ao menu, moedas dão vitória', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(saltoNasNuvensExample))
    apertarBotaoDe(stage, 'menu') // "Pular"
    expect(api.state()).toBe('jogando')

    // (a) smoke de teclado: o platformerKeys do gancho DO EXEMPLO vê o W real.
    let heroi = primeiroVivo(api, 'heroi')
    expect(heroi).not.toBeNull()
    step(4) // pousa na plataforma de baixo
    tecla('keydown', 'w')
    step(3)
    const vx = api.velocityOf(heroi, 'x')
    const vz = api.velocityOf(heroi, 'z')
    expect(vx * vx + vz * vz).toBeGreaterThan(1)
    tecla('keyup', 'w')

    // (b) derrota: despencar abaixo de y=-12 volta ao menu (regra do exemplo).
    api.place(heroi, 0, -20, 0)
    step(2)
    expect(api.state()).toBe('menu')
    expect(telaAtiva(stage, 'menu')).toBe(true)

    // (c) vitória: partida NOVA (o reset recicla os slots — recapturar!), e o
    // caminho real de coleta: o forEachNear(1.4) do gancho do herói.
    apertarBotaoDe(stage, 'menu')
    expect(api.state()).toBe('jogando')
    heroi = primeiroVivo(api, 'heroi')
    const moedas: Array<[number, number, number]> = [
      [7, 3, -2],
      [-7, 4.5, 2],
      [0, 6, -8],
    ]
    let vivas = 3
    for (const [x, y, z] of moedas) {
      api.place(heroi, x, y, z)
      step(3)
      vivas -= 1
      expect(api.countAlive('moeda')).toBe(vivas)
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Você juntou tudo!')
  })

  it('⭐ Parkour do Vulcão: as gemas são ZONAS — a máquina de entrada fecha o jogo', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(parkourDoVulcaoExample))
    apertarBotaoDe(stage, 'menu') // "Escalar"
    expect(api.state()).toBe('jogando')

    // derrota primeiro (mesma regra do Salto: y < -12 → menu)
    let heroi = primeiroVivo(api, 'heroi')
    api.place(heroi, 0, -20, 0)
    step(2)
    expect(api.state()).toBe('menu')

    // vitória: cada gema é um makeTrigger + onOverlap — o pickup passa pelo
    // disparo de ENTRADA do motor (o carimbo _inKey), não por distância crua.
    apertarBotaoDe(stage, 'menu')
    heroi = primeiroVivo(api, 'heroi')
    const gemas: Array<[number, number, number]> = [
      [0, 4.5, 12],
      [-8, 7, 0],
      [9, 5, -6],
    ]
    let vivas = 3
    for (const [x, y, z] of gemas) {
      api.place(heroi, x, y, z)
      step(3)
      vivas -= 1
      expect(api.countAlive('gema')).toBe(vivas)
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Você pegou todas!')
  })

  it('⭐ Quadra Maluca: bolas quicando (física por TIPO) são apanhadas até a vitória', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(quadraMalucaExample))
    apertarBotaoDe(stage, 'menu') // "Jogar"
    expect(api.state()).toBe('jogando')

    // 3 s sem ninguém apertar nada: NENHUMA bola pode "se pegar" sozinha (bola
    // caindo através de bola disparava o gancho da zona — o exemplo agora
    // filtra o "quem" com o "é do molde?", o isValidTarget do curso).
    step(90)
    expect(api.countAlive('bola')).toBe(5)
    const heroi = primeiroVivo(api, 'heroi')
    // Persegue a primeira bola viva por teleporte; a bola é zona (gatilho).
    // 5 apanhadas → 'vitoria' (pegou >= 5 no gancho do exemplo).
    for (let i = 0; i < 40 && api.countAlive('bola') > 0; i++) {
      const bola = primeiroVivo(api, 'bola')
      if (!bola) break
      api.place(heroi, api.posOf(bola, 'x'), api.posOf(bola, 'y'), api.posOf(bola, 'z'))
      step(2)
    }
    expect(api.countAlive('bola')).toBe(0)
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Pegou todas!')
  })

  it('⭐ Guardião do Portal: parado o portal CAI; defendendo, o cronômetro fecha em vitória', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(guardiaoDoPortalExample))
    apertarBotaoDe(stage, 'menu') // "Guardar"
    expect(api.state()).toBe('jogando')
    // O bloco novo do exemplo: a barra de vida do portal está de pé.
    step(2)
    expect(stage.querySelectorAll('.szg3k-bar').length).toBe(1)

    // (a) derrota JOGÁVEL (o review achou a tela "O portal caiu..." como código
    // morto — nada machucava o portal): parado num canto, o guardião não
    // intercepta ninguém e os invasores derrubam o portal.
    let heroi = primeiroVivo(api, 'guardiao')
    api.place(heroi, -25, 1, -25)
    const derrota = stepUntil(step, () => api.state() !== 'jogando', 900)
    expect(derrota).toBeGreaterThan(0)
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('O portal caiu...')

    // (b) vitória DEFENDENDO: encostar no invasor o recicla (forEachNear 1.6 do
    // exemplo) — o teste teleporta o guardião para cima do invasor mais velho a
    // cada quadro, e o cronômetro fecha os 30 s.
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    heroi = primeiroVivo(api, 'guardiao')
    for (let i = 0; i < 940 && api.state() === 'jogando'; i++) {
      const inv = primeiroVivo(api, 'invasor')
      if (inv) api.place(heroi, api.posOf(inv, 'x'), api.posOf(inv, 'y'), api.posOf(inv, 'z'))
      step(1)
      if (i === 300) {
        // Meio da partida: o relógio anda, o HUD mostra, a fábrica produz.
        expect(api.timeLeft()).toBeGreaterThan(19)
        expect(api.timeLeft()).toBeLessThan(21)
        const hud = stage.querySelector('.szg3k-hud-top-left')?.textContent ?? ''
        expect(hud.startsWith('Faltam:')).toBe(true)
      }
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('O portal resistiu!')
  })

  it('⭐ Tiro ao Alvo: o CLIQUE acerta quem está sob o mouse até a vitória (point-and-click)', async () => {
    const { api, step, stage, renderers } = await loadExampleKit(jsDoExemplo(tiroAoAlvoExample))
    apertarBotaoDe(stage, 'menu') // "Valendo!"
    expect(api.state()).toBe('jogando')

    // A tela PRÓPRIA de dica abre com H e fecha no botão dela (createScreen/
    // addButton/showScreen/hideScreens — a família que nenhum exemplo cobria).
    tecla('keydown', 'h')
    step(1)
    tecla('keyup', 'h')
    expect(telaAtiva(stage, 'dica')).toBe(true)
    apertarBotaoDe(stage, 'dica') // "Entendi!" → hideScreens
    expect(telaAtiva(stage, 'dica')).toBe(false)

    // A lente de mira por código: C troca o FOV 50 → 30, V devolve 50. (Caçar
    // com a lente NORMAL: na de mira o cone é estreito e meio mundo sai da tela.)
    tecla('keydown', 'c')
    step(1)
    tecla('keyup', 'c')
    expect(renderers[0]?.camera?.fov).toBe(30)
    tecla('keydown', 'v')
    step(1)
    tecla('keyup', 'v')
    expect(renderers[0]?.camera?.fov).toBe(50)

    // Caça por CLIQUE: projeta o alvo vivo na tela com a câmera REAL e despacha
    // o pointerdown ali (o rect do canvas no happy-dom é 0×0 → o rastreador cai
    // em width/height 1, então clientX = (ndc+1)/2). O exemplo faz o resto:
    // mousePressed → pick → gaveta "valor" → recycle → emit("acertou").
    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    const clicarNo = (mold: string): boolean => {
      const alvo = primeiroVivo(api, mold)
      const cam = renderers[0]?.camera
      if (!alvo || !cam) return false
      const v = new THREE.Vector3(
        api.posOf(alvo, 'x'),
        api.posOf(alvo, 'y') + 1.5, // o prato fica no topo do poste
        api.posOf(alvo, 'z'),
      )
      v.project(cam)
      // Fora da tela (atrás da câmera ou além da borda): não adianta clicar —
      // espere o alvo fugir sozinho e o próximo nascer à vista.
      if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) return false
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: (v.x + 1) / 2,
          clientY: (1 - v.y) / 2,
        }),
      )
      window.dispatchEvent(new PointerEvent('pointerup'))
      return true
    }
    for (let i = 0; i < 740 && api.state() === 'jogando'; i++) {
      if (!clicarNo('dourado')) clicarNo('alvo')
      step(1)
    }
    expect(api.state()).toBe('vitoria') // 12 pontos antes dos 25 s
    expect(tituloDaTela(stage, 'vitoria')).toBe('Olho de águia!')
  })

  it('⭐ O Chefão das Sombras: clicar no chefão o derrota nas 3 fases (onHurt + spawnRing + heal)', async () => {
    const { api, step, stage, renderers } = await loadExampleKit(
      jsDoExemplo(chefaoDasSombrasExample),
    )
    apertarBotaoDe(stage, 'menu') // "Enfrentar"
    expect(api.state()).toBe('jogando')

    // Os DOIS blocos novos de barra de vida (chefão + herói) sobem.
    step(2)
    expect(stage.querySelectorAll('.szg3k-bar').length).toBe(2)

    // Point-and-click no chefão (mesma projeção do Tiro): o chefão fica parado no
    // centro, então o clique sempre acha. Os i-frames gastam o dano a 1 acerto/
    // 0,5 s e o onHurt cura 8 duas vezes (as fases), então ~120 quadros vencem.
    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    const clicarNoChefao = (): boolean => {
      const alvo = primeiroVivo(api, 'chefao')
      const cam = renderers[0]?.camera
      if (!alvo || !cam) return false
      const v = new THREE.Vector3(api.posOf(alvo, 'x'), api.posOf(alvo, 'y'), api.posOf(alvo, 'z'))
      v.project(cam)
      if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) return false
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: (v.x + 1) / 2,
          clientY: (1 - v.y) / 2,
        }),
      )
      window.dispatchEvent(new PointerEvent('pointerup'))
      return true
    }
    let viuFaseAvancada = false
    for (let i = 0; i < 900 && api.state() === 'jogando'; i++) {
      clicarNoChefao()
      step(1)
      const hud = stage.querySelector('.szg3k-hud-top-left')?.textContent ?? ''
      if (hud.includes('Fase 2') || hud.includes('Fase 3')) viuFaseAvancada = true
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Sombra derrotada!')
    // Provou que o onHurt trocou de fase lendo a vida DURANTE a luta (não só o fim).
    expect(viuFaseAvancada).toBe(true)
  })

  it('⭐ Labirinto dos Robôs Profissional: a FSM patrulha→persegue→ataca; o tiro do FPS derrota; limpar tudo vence', async () => {
    const { api, step, stage } = await loadExampleKit(
      jsDoExemplo(labirintoDosRobosProfissionalExample),
    )
    expect(api.state()).toBe('menu')
    apertarBotaoDe(stage, 'menu') // "Entrar"
    expect(api.state()).toBe('jogando')
    expect(api.countAlive('vigia')).toBe(3)
    expect(api.countAlive('tanque')).toBe(2)

    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    // ⭐ Veredito do spike: o gatilho do FPS é o CLIQUE (mousePressed funciona
    // sob pointer lock) — sem pick, o teste só precisa despachar o pointerdown.
    const atirar = (): void => {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      window.dispatchEvent(new PointerEvent('pointerup'))
    }
    // Estaciona todo robô que NÃO é o alvo num canto longe (>9 do herói): o
    // duelo fica determinístico e ninguém fura a linha de tiro do teste.
    const estacionarOutros = (alvo: unknown): void => {
      const outros: unknown[] = []
      for (const mold of ['vigia', 'tanque']) {
        api.forEachAlive(mold, (e) => {
          if (e !== alvo) outros.push(e)
        })
      }
      for (const o of outros) api.place(o, 14, 0, 14)
    }

    // (a) moveFps: tecla REAL move o herói em 1ª pessoa (WASD relativo ao olhar).
    let heroi = primeiroVivo(api, 'heroi')
    expect(heroi).not.toBeNull()
    step(4)
    tecla('keydown', 'w')
    step(3)
    const vx = api.velocityOf(heroi, 'x')
    const vz = api.velocityOf(heroi, 'z')
    expect(vx * vx + vz * vz).toBeGreaterThan(1)
    tecla('keyup', 'w')

    // (b) FSM: o robô nasce em 'parado' e o stateTimer o leva a 'patrulhar'.
    const umVigia = primeiroVivo(api, 'vigia')
    step(12)
    expect(api.stateOf(umVigia)).toBe('patrulhar')

    // (c) herói a menos de 9 → 'perseguir' (a 2ª etapa do cérebro).
    api.place(umVigia, 0, 0, -9)
    api.place(heroi, 0, 0, -3)
    step(3)
    expect(api.stateOf(umVigia)).toBe('perseguir')

    // (d) TIRO: o mesh do herói vira com setYaw (é o MESMO giro que o pointer
    // lock faria) e spawnFrom+moveForward levam o projétil até o vigia. Duas
    // balas com i-frames de 0,5 s entre elas derrubam os 20 de vida.
    for (let i = 0; i < 300 && api.countAlive('vigia') === 3; i++) {
      api.place(umVigia, 0, 0, -9)
      estacionarOutros(umVigia)
      api.place(heroi, 0, 0, -3)
      api.setYaw(heroi, 180) // a frente +Z do herói aponta para -Z (o robô)
      if (i % 20 === 0) atirar()
      step(1)
    }
    expect(api.countAlive('vigia')).toBe(2)
    step(1)
    expect(stage.querySelector('.szg3k-hud-top-right')?.textContent).toBe('Robôs: 4')

    // (e) ATACAR: encostar liga a 3ª etapa e o dano do tanque é 15 (data-driven).
    // ⚠️ O tanque saiu de (d) ESTACIONADO no mesmo canto dos vigias — este
    // playthrough pegou exatamente isso na 1ª rodada (um vigia parado ao lado
    // roubava o golpe por 8). Traz o alvo para um ponto limpo ANTES do duelo.
    const tanque = primeiroVivo(api, 'tanque')
    api.place(tanque, 0, 0, -9)
    estacionarOutros(tanque)
    const vidaAntes = api.healthOf(heroi)
    api.place(heroi, 0, 0, -9)
    step(6)
    expect(api.stateOf(tanque)).not.toBe('patrulhar')
    expect(api.healthOf(heroi)).toBe(vidaAntes - 15)

    // (f) derrota JOGÁVEL: grudado no tanque, os golpes de 1,2 s zeram a vida.
    for (let i = 0; i < 400 && api.state() === 'jogando'; i++) {
      estacionarOutros(tanque)
      api.place(heroi, api.posOf(tanque, 'x'), 0, api.posOf(tanque, 'z'))
      step(1)
    }
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('Os robôs venceram...')

    // (g) partida nova: caçar os 5 robôs no duelo pinado até a vitória.
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    heroi = primeiroVivo(api, 'heroi')
    for (let i = 0; i < 1600 && api.state() === 'jogando'; i++) {
      const alvo = primeiroVivo(api, 'vigia') ?? primeiroVivo(api, 'tanque')
      if (alvo) {
        api.place(alvo, 0, 0, -9)
        estacionarOutros(alvo)
        api.place(heroi, 0, 0, -3)
        api.setYaw(heroi, 180)
        if (i % 20 === 0) atirar()
      }
      step(1)
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Labirinto limpo!')
  })

  it('⭐ Mundo de Blocos Profissional: o clique planta bloco SÓLIDO na grade, dá para SUBIR nele, e o topo da muralha vence', async () => {
    const { api, step, stage, renderers } = await loadExampleKit(
      jsDoExemplo(mundoDeBlocosProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu') // "Construir"
    expect(api.state()).toBe('jogando')
    expect(api.countAlive('muralha')).toBe(3)
    expect(api.countAlive('arvore')).toBe(3) // a geração semeada plantou o cenário

    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    // Projeta um PONTO do mundo com a câmera real e clica ali (o rect do canvas
    // no happy-dom é 0×0 → o rastreador cai em width/height 1, então
    // clientX = (ndc+1)/2 — a mesma receita do Tiro ao Alvo).
    const clicarNoPonto = (x: number, y: number, z: number): void => {
      const cam = renderers[0]?.camera
      if (!cam) throw new Error('sem câmera viva')
      const v = new THREE.Vector3(x, y, z)
      v.project(cam)
      if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) {
        throw new Error('o ponto do teste saiu da tela — reposicione o clique')
      }
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: (v.x + 1) / 2,
          clientY: (1 - v.y) / 2,
        }),
      )
      window.dispatchEvent(new PointerEvent('pointerup'))
    }

    // (a) andar: platformerKeys com tecla real (3ª pessoa, mouse LIVRE).
    const heroi = primeiroVivo(api, 'heroi')
    expect(heroi).not.toBeNull()
    tecla('keydown', 'w')
    step(3)
    const vx = api.velocityOf(heroi, 'x')
    const vz = api.velocityOf(heroi, 'z')
    expect(vx * vx + vz * vz).toBeGreaterThan(1)
    tecla('keyup', 'w')

    // (b) plantar: clique no chão → groundPoint + arredondar → célula (4, 6).
    // ⭐ Guarda de alcance (Lote C): só planta com a célula a até 3 do herói,
    // então o teste ANDA até perto da célula antes de clicar (como a criança).
    api.place(heroi, 4, 0, 4)
    step(90) // a câmera que segue converge antes de qualquer mira de clique
    clicarNoPonto(4, 0, 6)
    step(2)
    expect(api.countAlive('grama')).toBe(1)
    const bloco = primeiroVivo(api, 'grama')
    expect(api.posOf(bloco, 'x')).toBeCloseTo(4, 5)
    expect(api.posOf(bloco, 'z')).toBeCloseTo(6, 5)

    // (c) ⭐ o bloco plantado é SÓLIDO: cair de cima pousa no TOPO (~1,2), não no
    // chão. ⚠️ Gotcha que ESTE playthrough pegou: o place() não limpa o grounded
    // do pouso anterior, e o cérebro roda ANTES da física — teleportar para
    // y > 2,2 dispara a vitória com o grounded VELHO. Por isso o pingo é BAIXO
    // (y 2,0 < 2,2): um quadro de queda limpa o grounded antes de qualquer coisa.
    api.place(heroi, 4, 2, 6)
    step(30)
    expect(api.state()).toBe('jogando') // pousar no bloco (1,2) NÃO vence
    expect(api.onGround(heroi)).toBe(true)
    expect(api.posOf(heroi, 'y')).toBeGreaterThan(1)
    expect(api.posOf(heroi, 'y')).toBeLessThan(1.5)

    // (d) tecla 2 troca o tipo (HUD mostra) e o clique planta PEDRA noutra célula.
    tecla('keydown', '2')
    step(1)
    tecla('keyup', '2')
    step(1)
    expect(stage.querySelector('.szg3k-hud-bottom-left')?.textContent).toBe('Bloco: pedra (1 2 3)')
    api.place(heroi, 2, 0, 4) // a guarda de alcance pede o herói perto da célula (2, 2)
    step(60) // a câmera re-converge (o herói teleportou)
    clicarNoPonto(2, 0, 2)
    step(2)
    expect(api.countAlive('pedra')).toBe(1)
    expect(stage.querySelector('.szg3k-hud-top-left')?.textContent).toBe('Blocos: 2 de 30')

    // (e) X liga o modo reciclar e o clique NO bloco (pick ÚNICO sem molde +
    // cascata isMold, Lote C) recolhe SÓ o bloco da frente sob o mouse.
    api.place(heroi, -4, 0, -6) // sai de cima do alvo
    step(60)
    tecla('keydown', 'x')
    step(1)
    tecla('keyup', 'x')
    step(1)
    expect(stage.querySelector('.szg3k-hud-top-right')?.textContent).toBe(
      'Modo: reciclar (X troca)',
    )
    clicarNoPonto(2, 0.6, 2) // o MIOLO do bloco de pedra (o mais próximo da câmera)
    step(2)
    expect(api.countAlive('pedra')).toBe(0)
    expect(api.countAlive('grama')).toBe(1) // o pick é o PRIMEIRO sob o mouse: só o clicado saiu

    // (f) objetivo: pousar no topo da muralha (y 2,4 > 2,2) vence. O pingo baixo
    // limpa o grounded velho (mesmo gotcha do (c)); só o POUSO de verdade no
    // topo pode disparar a vitória.
    api.place(heroi, 0, 1.5, -8)
    step(2)
    expect(api.state()).toBe('jogando')
    api.place(heroi, 0, 6, 10)
    step(2)
    expect(api.state()).toBe('jogando') // no ar sobre a muralha ainda NÃO venceu
    const quadros = stepUntil(step, () => api.state() !== 'jogando', 120)
    expect(quadros).toBeGreaterThan(0)
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Chegou ao topo!')
  })

  it('⭐ Patrulha Espacial Profissional: o cooldown segura o gatilho, a morte é DRAMÁTICA (morrendo não machuca nem conta duplo), 3 batidas perdem e 20 abates vencem', async () => {
    const { api, step, stage } = await loadExampleKit(
      jsDoExemplo(patrulhaEspacialProfissionalExample),
    )
    expect(api.state()).toBe('menu')
    apertarBotaoDe(stage, 'menu') // "Patrulhar"
    expect(api.state()).toBe('jogando')

    // (a) keyDown REAL move a nave no eixo X (clamp na gaveta + place).
    let nave = primeiroVivo(api, 'nave')
    expect(nave).not.toBeNull()
    step(2)
    tecla('keydown', 'a')
    step(6)
    tecla('keyup', 'a')
    expect(api.posOf(nave, 'x')).toBeLessThan(-0.5)

    // (b) ⭐ COOLDOWN de 0,4 s: três apertos de espaço em 3 quadros = UM laser
    // só (a lição do Lote C: sem a trava, cliques afobados gastam tiros à toa).
    const atirar = (): void => {
      tecla('keydown', ' ')
      step(1)
      tecla('keyup', ' ')
    }
    atirar()
    expect(api.countAlive('laser')).toBe(1)
    atirar()
    atirar()
    expect(api.countAlive('laser')).toBe(1)
    // Sem acertar nada, o laser se recolhe sozinho (stateTimer 1,6 s → recycle).
    const sumiu = stepUntil(step, () => api.countAlive('laser') === 0, 90)
    expect(sumiu).toBeGreaterThan(0)

    // Estacionar meteoros VIVOS num canto alto (x 20 nunca alcança a nave, que
    // é clampada em ±9) deixa cada probe determinístico.
    const estacionar = (menos: unknown): void => {
      api.forEachAlive('meteoro', (m) => {
        if (m !== menos && api.stateOf(m) === 'parado') api.place(m, 20, 8, 58)
      })
    }
    const alvoParado = (): unknown => {
      let found: unknown = null
      api.forEachAlive('meteoro', (m) => {
        if (!found && api.stateOf(m) === 'parado') found = m
      })
      return found
    }

    // (c) ⭐ MORTE DRAMÁTICA: pina um meteoro na frente da nave e acerta o
    // laser. O meteoro NÃO some: entra no estado "morrendo".
    let alvo: unknown = null
    for (let i = 0; i < 300 && !alvo; i++) {
      step(1)
      alvo = alvoParado()
    }
    expect(alvo).not.toBeNull()
    for (let i = 0; i < 120 && api.stateOf(alvo) !== 'morrendo'; i++) {
      estacionar(alvo)
      if (api.stateOf(alvo) === 'parado') {
        api.place(alvo, api.posOf(nave, 'x'), api.posOf(nave, 'y'), api.posOf(nave, 'z') + 6)
      }
      if (i % 15 === 0) atirar()
      else step(1)
    }
    expect(api.stateOf(alvo)).toBe('morrendo')
    expect(stage.querySelector('.szg3k-hud-top-right')?.textContent).toBe('Meteoros: 1 de 20')

    // (d) ⭐ o meteoro morrendo NÃO machuca: jogado em cima da nave, a vida não
    // mexe (o gancho da zona filtra por entityStateIs "parado").
    const vidaAntes = api.healthOf(nave)
    api.place(alvo, api.posOf(nave, 'x'), api.posOf(nave, 'y'), api.posOf(nave, 'z'))
    step(1)
    expect(api.stateOf(alvo)).toBe('morrendo') // ainda dentro da janela de 0,25 s
    expect(api.healthOf(nave)).toBe(vidaAntes)
    expect(api.state()).toBe('jogando')

    // (e) ⭐ e não conta ponto duplo: a janela fecha, o meteoro explode e some,
    // e o placar continua valendo UM abate só.
    step(12)
    expect(api.exists(alvo)).toBe(false)
    expect(stage.querySelector('.szg3k-hud-top-right')?.textContent).toBe('Meteoros: 1 de 20')
    expect(api.healthOf(nave)).toBe(vidaAntes)

    // (f) derrota JOGÁVEL: meteoros VIVOS na cara da nave. Cada batida tira 1
    // das 3 vidas (i-frames de 0,5 s entre elas) até a tela de fim.
    for (let i = 0; i < 900 && api.state() === 'jogando'; i++) {
      const vivo = alvoParado()
      if (vivo) {
        api.place(vivo, api.posOf(nave, 'x'), api.posOf(nave, 'y'), api.posOf(nave, 'z'))
      }
      step(1)
    }
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('A nave caiu...')

    // (g) partida nova: caça pinada (alvo na frente, resto estacionado, tiro a
    // cada 15 quadros > cooldown) até os 20 abates fecharem em vitória.
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    nave = primeiroVivo(api, 'nave')
    for (let i = 0; i < 3200 && api.state() === 'jogando'; i++) {
      const caca = alvoParado()
      if (caca) {
        estacionar(caca)
        api.place(caca, api.posOf(nave, 'x'), api.posOf(nave, 'y'), api.posOf(nave, 'z') + 6)
      }
      if (i % 15 === 0) atirar()
      else step(1)
    }
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Patrulha cumprida!')
  })

  it('⭐ A Lenda do Herói Profissional: monstros derrubam o herói parado; caçar 10 com a espada vence', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(aLendaDoHeroiProfissionalExample))
    expect(api.state()).toBe('menu')
    apertarBotaoDe(stage, 'menu') // "Começar a aventura"
    expect(api.state()).toBe('jogando')

    // As barras de vida (herói + monstro) sobem: o combate está de pé.
    step(2)
    expect(stage.querySelectorAll('.szg3k-bar').length).toBeGreaterThanOrEqual(1)

    // (a) derrota JOGÁVEL: o herói parado, sem atacar, com um monstro grudado. O
    // cérebro do monstro (vagando→perseguindo por nearest+touches) o leva a
    // encostar, e os golpes de contato (hurt 1 com i-frames) zeram os 6 corações
    // até a tela de fim. Prova que o dano ao herói NÃO é código morto.
    let heroi = primeiroVivo(api, 'heroi')
    expect(heroi).not.toBeNull()
    for (let i = 0; i < 900 && api.state() === 'jogando'; i++) {
      api.place(heroi, 0, 1, 0)
      const m = primeiroVivo(api, 'monstro')
      if (m) api.place(m, 0, 0.6, 0)
      step(1)
    }
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('O herói caiu...')

    // (b) vitória CAÇANDO: partida nova. Fixa o alvo no alcance da ESPADA (2,5 <
    // 3 do golpe, mas fora dos 1,6 do dano de contato) e estaciona os outros num
    // canto, para o herói bater sem apanhar. Segurar a espada (espaço) abate cada
    // monstro; 10 abates (onEntityDeath) fecham em vitória. Chegar lá prova que o
    // laço caçar→abater FECHA (não trava) e que o herói não morre no alcance certo.
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    heroi = primeiroVivo(api, 'heroi')
    tecla('keydown', ' ') // a espada fica erguida
    for (let i = 0; i < 2400 && api.state() === 'jogando'; i++) {
      const alvo = primeiroVivo(api, 'monstro')
      if (alvo) {
        api.forEachAlive('monstro', (m) => {
          if (m !== alvo) api.place(m, 24, 0.6, 24)
        })
        api.place(alvo, 0, 0.6, 0)
        api.place(heroi, 2.5, 1, 0)
      }
      step(1)
    }
    tecla('keyup', ' ')
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Herói lendário!')
  })

  it('⭐ Caça Estelar Profissional: as naves inimigas derrubam a nave parada; abater 10 vence', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(cacaEstelarProfissionalExample))
    expect(api.state()).toBe('menu')
    apertarBotaoDe(stage, 'menu') // "Decolar"
    expect(api.state()).toBe('jogando')

    // As barras de vida (nave + caça) sobem: o combate está de pé.
    step(2)
    expect(stage.querySelectorAll('.szg3k-bar').length).toBeGreaterThanOrEqual(1)

    // (a) derrota JOGÁVEL: a nave parada e as caças entrando/saindo em cima dela.
    // A zona de acerto (makeTrigger + onOverlap) fere a nave a cada ENTRADA (os
    // i-frames espaçam), e os 5 escudos zeram até a tela de fim. Prova que o dano
    // à nave NÃO é código morto.
    let nave = primeiroVivo(api, 'nave')
    expect(nave).not.toBeNull()
    for (let i = 0; i < 1500 && api.state() === 'jogando'; i++) {
      api.place(nave, 0, 1, 0)
      api.forEachAlive('caca', (c) => {
        if (i % 2 === 0) api.place(c, 0, 1, 0)
        else api.place(c, 30, 1, 30)
      })
      step(1)
    }
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('Nave abatida...')

    // (b) vitória CAÇANDO: partida nova. Fixa a nave parada encarando +Z, pina UMA
    // caça logo à frente (no caminho do tiro) e estaciona as outras longe. Segurar
    // o gatilho (espaço) faz o tiro (spawnFrom + moveForward) acertar; dois tiros
    // (com i-frames) derrubam cada caça e 10 abates fecham em vitória. Chegar lá
    // prova que o laço caçar→abater FECHA (não trava).
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    nave = primeiroVivo(api, 'nave')
    tecla('keydown', ' ') // o gatilho fica preso
    for (let i = 0; i < 3200 && api.state() === 'jogando'; i++) {
      api.place(nave, 0, 1, 0)
      api.setYaw(nave, 0) // encara +Z (a frente do molde), o tiro voa nessa direção
      const alvo = primeiroVivo(api, 'caca')
      if (alvo) {
        api.forEachAlive('caca', (c) => {
          if (c !== alvo) api.place(c, 30, 1, 30)
        })
        api.place(alvo, 0, 1, 2) // na frente da nave, no caminho do tiro
      }
      step(1)
    }
    tecla('keyup', ' ')
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Ás dos céus!')
  })

  it('⭐ Cerco na Base Profissional: os aliens derrubam o guarda parado; carregar e abater 12 vence', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(cercoNaBaseProfissionalExample))
    expect(api.state()).toBe('menu')
    apertarBotaoDe(stage, 'menu') // "Defender"
    expect(api.state()).toBe('jogando')
    step(2)

    // (a) derrota JOGÁVEL: o guarda parado, sem atirar, com um alien grudado nele.
    // O cérebro do alien (parado→avancando por nearest+seekPoint) o leva a encostar,
    // e o dano de contato (hurt 1 com i-frames) zera as 6 vidas até a tela de fim.
    let guarda = primeiroVivo(api, 'heroi')
    expect(guarda).not.toBeNull()
    for (let i = 0; i < 1500 && api.state() === 'jogando'; i++) {
      api.place(guarda, 0, 1, 0)
      const a = primeiroVivo(api, 'alien')
      if (a) api.place(a, 0, 0.5, 0)
      step(1)
    }
    expect(api.state()).toBe('fim')
    expect(tituloDaTela(stage, 'fim')).toBe('A base caiu...')

    // (b) vitória ATIRANDO: partida nova. Fixa o guarda encarando +Z, pina UM alien
    // à frente (no caminho do tiro) e estaciona os outros longe. O ciclo CARREGA
    // (segura o espaço ~1 s) e SOLTA para disparar o tiro FORTE (carga >= 0,8 →
    // 10 de dano = abate o alien de 8 num tiro). A munição recarrega no ritmo do
    // disparo, então não acaba. 12 abates fecham em vitória.
    apertarBotaoDe(stage, 'fim') // "Tentar de novo"
    expect(api.state()).toBe('jogando')
    guarda = primeiroVivo(api, 'heroi')
    for (let i = 0; i < 4000 && api.state() === 'jogando'; i++) {
      api.place(guarda, 0, 1, 0)
      api.setYaw(guarda, 0) // encara +Z; o tiro voa nessa direção
      const alvo = primeiroVivo(api, 'alien')
      if (alvo) {
        api.forEachAlive('alien', (a) => {
          if (a !== alvo) api.place(a, 30, 0.5, 30)
        })
        api.place(alvo, 0, 0.5, 3) // à frente, no caminho do tiro
      }
      if (i % 80 < 60) {
        tecla('keydown', ' ') // segurando: carrega o blaster
      } else {
        tecla('keyup', ' ') // soltou: dispara o tiro forte
      }
      step(1)
    }
    tecla('keyup', ' ')
    expect(api.state()).toBe('vitoria')
    expect(tituloDaTela(stage, 'vitoria')).toBe('Base salva!')
  })
})
