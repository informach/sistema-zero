import { afterEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import {
  defesaDaTorreExample,
  guardiaoDoPortalExample,
  parkourDoVulcaoExample,
  quadraMalucaExample,
  saltoNasNuvensExample,
  tiroAoAlvoExample,
} from '../examples'
import { type KitApi, loadExampleKit } from './kitHarness'

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

function stripIds<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripIds) as unknown as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === '__id') continue
      out[k] = stripIds(v)
    }
    return out as T
  }
  return value
}

/** O MESMO JS que o preview roda: gerado da IR embutida pelo gerador real. */
function jsDoExemplo(example: { ir: { js: unknown } }): string {
  return compileStatements(stripIds(example.ir.js) as JSStatement[], 0)
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
  it('⭐ Defesa da Torre: as torres defendem SOZINHAS até a vitória', async () => {
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
      window.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: (v.x + 1) / 2, clientY: (1 - v.y) / 2 }),
      )
      window.dispatchEvent(new MouseEvent('pointerup'))
      return true
    }
    for (let i = 0; i < 740 && api.state() === 'jogando'; i++) {
      if (!clicarNo('dourado')) clicarNo('alvo')
      step(1)
    }
    expect(api.state()).toBe('vitoria') // 12 pontos antes dos 25 s
    expect(tituloDaTela(stage, 'vitoria')).toBe('Olho de águia!')
  })
})
