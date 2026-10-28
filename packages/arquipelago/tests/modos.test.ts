import { describe, expect, test } from 'bun:test'
import type { CipoVivo, ModoDoCorpo, TroncoVivo } from '../src/estado/contexto'
import type { Ponto } from '../src/sistemas/cipo'
import { criarBalanco } from '../src/sistemas/cipo'
import { criarPontos } from '../src/sistemas/cordas'
import { CORPO } from '../src/sistemas/corpo'
import { ESCALADA } from '../src/sistemas/escalada'
import {
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  type EstadoDoCorpo,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { BORDA } from '../src/sistemas/modos/borda'
import {
  decidirNado,
  ENTRAR_NO_NADO,
  SAIR_DO_NADO,
  superficieDaAgua,
} from '../src/sistemas/modos/chao'
import { PASSO_PARA_FORA_DO_TRONCO } from '../src/sistemas/modos/escalada'

const dt = 1 / 60

function entrada(p: Ponto, extra: Partial<EntradaDoPasso> = {}): EntradaDoPasso {
  return {
    dt,
    agora: 10_000,
    parado: false,
    p: { ...p },
    ix: 0,
    iz: 0,
    pedidoX: 0,
    pedidoZ: 0,
    ladoX: 1,
    ladoZ: 0,
    pulou: false,
    usou: false,
    correr: false,
    ritmo: 1,
    conversa: null,
    gravidade: 24,
    nivelDoMar: 0,
    ...extra,
  }
}

function cipoEm(pivo: Ponto, id = 'cipo-1'): CipoVivo {
  const corda = 4
  const { pontos, antes } = criarPontos(pivo, corda)
  return {
    id,
    pivo,
    corda,
    pegada: 3,
    balanco: criarBalanco(),
    seguro: false,
    pontos,
    antes,
    chao: 0,
    esperandoOCorpoSair: false,
    soltoEm: Number.NEGATIVE_INFINITY,
  }
}

const troncoEm = (x: number, z: number): TroncoVivo => ({
  id: 'tronco',
  tronco: {
    base: { x, y: 0, z },
    topo: { x, y: 6, z },
    raioBase: 0.6,
    raioTopo: 0.4,
  },
})

function mundo(extra: Partial<MundoDoMovimento> = {}): MundoDoMovimento {
  return {
    cipos: [],
    troncos: [],
    aguas: [],
    equilibrios: [],
    escadas: [],
    escorregadores: [],
    bordas: [],
    foco: { x: 0, y: 0, z: 0 },
    ...extra,
  }
}

/** Um passo inteiro, como o personagem faz, com o controlador movendo livre (sem paredes). */
function passo(
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  m: MundoDoMovimento,
  pisou: boolean,
  avisos: ModoDoCorpo[] = [],
) {
  // Como no personagem: o tempo no modo anda antes do passo.
  c.noModo += e.dt
  const modo = MODOS[c.modo]
  const controlador = modo.passo(c, e, m)
  const mov = controlador === 'direto' ? null : { ...c.desloc }
  return modo.depois(c, e, m, mov, pisou, (novo) => avisos.push(novo))
}

describe('os modos de movimento', () => {
  test('no chão parado, a gravidade puxa e pisar zera a queda', () => {
    const c = criarEstadoDoCorpo()
    const p = { x: 0, y: 3, z: 0 }
    passo(c, entrada(p), mundo(), false)
    expect(c.velY).toBeCloseTo(-24 * dt, 9)
    expect(c.prox.y).toBeLessThan(p.y)
    passo(c, entrada(c.prox), mundo(), true)
    expect(c.velY).toBe(0)
    expect(c.noChao).toBe(true)
  })

  test('o nado tem folga entre entrar e sair', () => {
    expect(decidirNado(false, true, ENTRAR_NO_NADO - 0.01)).toBe(false)
    expect(decidirNado(false, true, ENTRAR_NO_NADO + 0.01)).toBe(true)
    // Nadando, só sai pisando com a cintura fora da água por `SAIR_DO_NADO`.
    expect(decidirNado(true, true, 0)).toBe(true)
    expect(decidirNado(true, false, -1)).toBe(true)
    expect(decidirNado(true, true, -SAIR_DO_NADO - 0.01)).toBe(false)
    const lago = { x: 0, z: 0, raioX: 3, raioZ: 2, giro: 0, y: 1.2 }
    expect(superficieDaAgua([lago], 0, 1, 0)).toBe(1.2)
    expect(superficieDaAgua([lago], 0, 5, 0)).toBe(0)
  })

  test('na água funda o corpo nada e boia, sem pular', () => {
    const c = criarEstadoDoCorpo()
    c.noChao = true
    // O pé 1,5 m abaixo da água: a cintura bem dentro.
    const p = { x: 0, y: -1.5 + CORPO.doCentroAoPe, z: 0 }
    passo(c, entrada(p, { pulou: true }), mundo(), true)
    expect(c.nadando).toBe(true)
    expect(c.velY).toBeGreaterThan(0)
  })

  test('pedir o cipó entra nele, segura a corda e a câmera olha para o meio dela', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    const avisos: ModoDoCorpo[] = []
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0.5, y: 1, z: 0 }, 0, (n) =>
      avisos.push(n),
    )
    expect(c.modo).toBe('cipo')
    expect(c.cipo).toBe(cipo)
    expect(cipo.seguro).toBe(true)
    expect(avisos).toEqual(['cipo'])
    expect(m.foco.y).toBeLessThan(cipo.pivo.y)
  })

  test('pular do cipó solta com a velocidade do balanço e não pega de novo na hora', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0, y: 2, z: 0 }, 0, () => {})
    for (let i = 0; i < 30; i++) passo(c, entrada(c.prox, { pedidoZ: 1, agora: i * 16 }), m, false)
    const avisos: ModoDoCorpo[] = []
    const gastou = passo(c, entrada(c.prox, { pulou: true, agora: 1000 }), m, false, avisos)
    expect(gastou).toBe(true)
    expect(c.modo).toBe('chao')
    expect(avisos).toEqual(['chao'])
    expect(cipo.seguro).toBe(false)
    expect(cipo.soltoEm).toBe(1000)
    expect(c.velY).toBe(c.embalo.y)
    expect(c.velY).toBeGreaterThan(0)
  })

  test('o cipó que some com a ilha deixa de valer', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    atenderPedido(c, { tipo: 'cipo', id: 'cipo-1' }, m, { x: 0, y: 2, z: 0 }, 0, () => {})
    expect(MODOS.cipo.valendo(c, m)).toBe(true)
    m.cipos = []
    expect(MODOS.cipo.valendo(c, m)).toBe(false)
  })

  test('caindo perto da corda, as mãos pegam o cipó', () => {
    const c = criarEstadoDoCorpo()
    const cipo = cipoEm({ x: 0, y: 5, z: 0 })
    const m = mundo({ cipos: [cipo] })
    // As mãos (0,3 acima do centro) bem ao lado da corda, no ar.
    passo(c, entrada({ x: 0.2, y: 2.5, z: 0 }, { agora: 5000 }), m, false)
    expect(c.modo).toBe('cipo')
  })

  test('empurrando o tronco no chão por um tempo, o corpo gruda; usar solta para fora', () => {
    const c = criarEstadoDoCorpo()
    const t = troncoEm(0, 0)
    const m = mundo({ troncos: [t] })
    // Encostado na casca (raio 0,6 mais o do corpo), pedindo para o tronco (−x).
    const p = { x: 0.6 + CORPO.raio + 0.02, y: CORPO.doCentroAoPe, z: 0 }
    let agora = 0
    for (let k = 0; k * dt < ESCALADA.esperaParaGrudar + 3 * dt && c.modo === 'chao'; k++) {
      agora += 16
      passo(c, entrada(p, { pedidoX: -1, ix: -1, agora }), m, true)
      c.prox.x = p.x
      c.prox.z = p.z
    }
    expect(c.modo).toBe('escalada')
    expect(c.tronco).toBe(t)
    const gastou = passo(c, entrada(c.prox, { usou: true, agora: agora + 500 }), m, false)
    expect(gastou).toBe(true)
    expect(c.modo).toBe('chao')
    expect(Math.hypot(c.embalo.x, c.embalo.z)).toBeCloseTo(PASSO_PARA_FORA_DO_TRONCO, 6)
  })

  test('pular do tronco solta sem gastar o usar', () => {
    const c = criarEstadoDoCorpo()
    const t = troncoEm(0, 0)
    const m = mundo({ troncos: [t] })
    atenderPedido(c, { tipo: 'tronco', id: 'tronco' }, m, { x: 1, y: 2, z: 0 }, 0, () => {})
    expect(c.modo).toBe('escalada')
    const gastou = passo(c, entrada(c.prox, { pulou: true, agora: 500 }), m, false)
    expect(gastou).toBe(false)
    expect(c.modo).toBe('chao')
    expect(c.velY).toBeGreaterThan(0)
  })
})

describe('o equilíbrio no tronco caído', () => {
  const eixo = { id: 'tronco-caido', a: { x: 0, y: 0.36, z: 0 }, b: { x: 0, y: 0.36, z: 4 } }
  const centroNoTampo = 0.36 + CORPO.doCentroAoPe + CORPO.folga

  function noTronco() {
    const c = criarEstadoDoCorpo()
    const m = mundo({ equilibrios: [eixo] })
    // Andando ao longo do tronco, já pisando no tampo: entra.
    c.noChao = true
    const p = { x: 0, y: centroNoTampo, z: 1 }
    passo(c, entrada(p, { pedidoZ: 1, iz: 1 }), m, true)
    return { c, m }
  }

  test('andando ao longo do tampo entra; de través não', () => {
    const { c } = noTronco()
    expect(c.modo).toBe('equilibrio')
    const de = criarEstadoDoCorpo()
    de.noChao = true
    passo(
      de,
      entrada({ x: 0, y: centroNoTampo, z: 1 }, { pedidoX: 1, ix: 1 }),
      mundo({ equilibrios: [eixo] }),
      true,
    )
    expect(de.modo).toBe('chao')
  })

  test('preso ao eixo: pedir de lado inclina e não tira do tronco', () => {
    const { c, m } = noTronco()
    let agora = 0
    for (let i = 0; i < 20; i++) {
      agora += 16
      passo(c, entrada(c.prox, { pedidoX: 0.7, pedidoZ: 0.7, agora }), m, true)
    }
    expect(c.modo).toBe('equilibrio')
    expect(c.prox.x).toBeCloseTo(0, 6)
    expect(Math.abs(c.balanco)).toBeGreaterThan(0.1)
    // Sem pedir o lado, a inclinação volta sozinha.
    for (let i = 0; i < 40; i++) passo(c, entrada(c.prox, { agora: 400 + i * 16 }), m, true)
    expect(Math.abs(c.balanco)).toBeLessThan(0.01)
  })

  test('vai de ponta a ponta na velocidade do equilíbrio e sai andando na ponta', () => {
    const { c, m } = noTronco()
    for (let i = 0; i < 600 && c.modo === 'equilibrio'; i++) {
      passo(c, entrada(c.prox, { pedidoZ: 1, iz: 1, agora: i * 16 }), m, true)
    }
    expect(c.modo).toBe('chao')
    expect(c.prox.z).toBeCloseTo(4, 1)
    // Saiu andando (a velocidade do tronco virou a do chão).
    expect(c.vel.z).toBeGreaterThan(1)
  })

  test('pular sai para a frente; pedir o lado com força por um tempo desce para aquele lado', () => {
    const pulando = noTronco()
    passo(pulando.c, entrada(pulando.c.prox, { pulou: true }), pulando.m, true)
    expect(pulando.c.modo).toBe('chao')
    expect(pulando.c.velY).toBe(CORPO.pulo)

    const { c, m } = noTronco()
    for (let i = 0; i < 70 && c.modo === 'equilibrio'; i++) {
      passo(c, entrada(c.prox, { pedidoX: 1, ix: 1, agora: i * 16 }), m, true)
    }
    expect(c.modo).toBe('chao')
    // Desceu para +x (o lado pedido) com um passinho.
    expect(c.embalo.x).toBeGreaterThan(0)
  })
})

describe('a escada reta', () => {
  // Escada de 3 m: o deque fica para −z (a saída) e quem sobe fica em +z, de frente para −z.
  const escada = {
    id: 'escada',
    base: { x: 0, y: 0, z: 0 },
    topo: { x: 0, y: 3, z: 0 },
    saida: { x: 0, y: 3, z: -1 },
    largura: 0.7,
  }
  const centroNoChao = CORPO.doCentroAoPe

  test('andando contra ela embaixo pega, sobe e sai em cima no deque', () => {
    const c = criarEstadoDoCorpo()
    const m = mundo({ escadas: [escada] })
    c.noChao = true
    const p = { x: 0, y: centroNoChao, z: 0.5 }
    for (let i = 0; i < 20 && c.modo === 'chao'; i++) {
      passo(c, entrada(p, { pedidoZ: -1, iz: 1, agora: i * 16 }), m, true)
      c.prox.x = p.x
      c.prox.z = p.z
    }
    expect(c.modo).toBe('escada')
    for (let i = 0; i < 400 && c.modo === 'escada'; i++) {
      passo(c, entrada(c.prox, { iz: 1, agora: 1000 + i * 16 }), m, false)
    }
    expect(c.modo).toBe('chao')
    // Saiu em cima, no ponto de saída do deque.
    expect(c.prox.z).toBeCloseTo(-1, 2)
    expect(c.prox.y - CORPO.doCentroAoPe - CORPO.folga).toBeCloseTo(3, 2)
  })

  test('do deque, andando para fora no alto, desce por ela e solta embaixo', () => {
    const c = criarEstadoDoCorpo()
    const m = mundo({ escadas: [escada] })
    c.noChao = true
    const p = { x: 0, y: 3 + centroNoChao, z: -0.5 }
    passo(c, entrada(p, { pedidoZ: 1, iz: -1, agora: 0 }), m, true)
    expect(c.modo).toBe('escada')
    expect(c.naEscada).toBeCloseTo(3, 6)
    for (let i = 0; i < 400 && c.modo === 'escada'; i++) {
      passo(c, entrada(c.prox, { iz: -1, agora: 1000 + i * 16 }), m, false)
    }
    expect(c.modo).toBe('chao')
    expect(c.prox.y - CORPO.doCentroAoPe - CORPO.folga).toBeCloseTo(0, 2)
  })

  test('pular solta para trás, longe da escada', () => {
    const c = criarEstadoDoCorpo()
    const m = mundo({ escadas: [escada] })
    c.noChao = false
    // No ar encostado nela: pega na hora.
    passo(c, entrada({ x: 0, y: 1.5, z: 0.5 }, { pedidoZ: -1, iz: 1 }), m, false)
    expect(c.modo).toBe('escada')
    passo(c, entrada(c.prox, { pulou: true, agora: 500 }), m, false)
    expect(c.modo).toBe('chao')
    expect(c.embalo.z).toBeGreaterThan(0)
    expect(c.velY).toBeGreaterThan(0)
  })
})

describe('o escorregador', () => {
  // A pista do Bosque, reta: 5,6 m de chão descendo 4 m em curva suave (12 trechos).
  const pontos = Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    return { x: 5.6 * t, y: 0.2 + 4 * (1 - (3 * t * t - 2 * t * t * t)), z: 0 }
  })
  const pista = { id: 'escorregador', pontos, largura: 1 }

  function descer(pedidoZ = 0) {
    const c = criarEstadoDoCorpo()
    const m = mundo({ escorregadores: [pista] })
    c.noChao = true
    // Pisando no alto da pista, andando para ela.
    passo(
      c,
      entrada({ x: 0.2, y: (pontos[0]?.y ?? 0) + CORPO.doCentroAoPe, z: 0 }, { pedidoX: 1, ix: 1 }),
      m,
      true,
    )
    let passos = 0
    let maisDeLado = 0
    while (c.modo === 'escorregar' && passos < 1200) {
      passo(c, entrada(c.prox, { pedidoZ, agora: passos * 16 }), m, false)
      maisDeLado = Math.max(maisDeLado, Math.abs(c.prox.z))
      passos++
    }
    return { c, segundos: passos / 60, maisDeLado }
  }

  test('pisando no alto senta e desce até o fim, sempre no mesmo tempo, e sai correndo', () => {
    const a = descer()
    const b = descer()
    expect(a.segundos).toBeGreaterThan(1)
    expect(a.segundos).toBeLessThan(3)
    expect(b.segundos).toBe(a.segundos)
    expect(a.c.modo).toBe('chao')
    expect(a.c.prox.x).toBeCloseTo(5.6, 0)
    // No fim a velocidade virou passo no chão.
    expect(a.c.vel.x).toBeGreaterThan(2)
  })

  test('pedir o lado mexe dentro da pista, sem passar da borda', () => {
    const { maisDeLado } = descer(1)
    expect(maisDeLado).toBeGreaterThan(0.1)
    expect(maisDeLado).toBeLessThan(pista.largura / 2)
  })
})

describe('agarrar a borda', () => {
  // Quina a 2,6 m de x −1,3 a 1,3 em z = 0; o alto fica para +z e quem pendura fica em −z.
  const borda = {
    id: 'borda',
    a: { x: -1.3, y: 2.6, z: 0 },
    b: { x: 1.3, y: 2.6, z: 0 },
    fora: { x: 0, y: 2.6, z: -1 },
  }
  const embaixoDaQuina = { x: 0, y: 2.6 - BORDA.maosAcimaDoCentro, z: -0.3 }

  function pendurado() {
    const c = criarEstadoDoCorpo()
    const m = mundo({ bordas: [borda] })
    c.noChao = false
    c.velY = -1
    passo(c, entrada(embaixoDaQuina), m, false)
    for (let i = 0; i < 30 && c.modo === 'borda'; i++) {
      passo(c, entrada(c.prox, { agora: 10_100 + i * 16 }), m, false)
    }
    return { c, m }
  }

  test('caindo com as mãos na quina agarra e fica pendurado rente à parede', () => {
    const { c } = pendurado()
    expect(c.modo).toBe('borda')
    expect(c.prox.z).toBeCloseTo(-BORDA.daParede, 6)
    expect(c.prox.y).toBeCloseTo(2.6 - BORDA.maosAcimaDoCentro, 6)
    expect(c.velY).toBe(0)
  })

  test('subindo no pulo passa direto, e longe da quina não agarra', () => {
    const m = mundo({ bordas: [borda] })
    const subindo = criarEstadoDoCorpo()
    subindo.velY = 5
    passo(subindo, entrada(embaixoDaQuina), m, false)
    expect(subindo.modo).toBe('chao')
    const longe = criarEstadoDoCorpo()
    longe.velY = -1
    passo(longe, entrada({ ...embaixoDaQuina, y: 1 }), m, false)
    expect(longe.modo).toBe('chao')
    const naPonta = criarEstadoDoCorpo()
    naPonta.velY = -1
    passo(naPonta, entrada({ ...embaixoDaQuina, x: 1.25 }), m, false)
    expect(naPonta.modo).toBe('chao')
  })

  test('pedindo para a parede sobe e fica de pé em cima, para dentro da quina', () => {
    const { c, m } = pendurado()
    let passos = 0
    for (; passos < 200 && c.modo === 'borda'; passos++) {
      passo(c, entrada(c.prox, { pedidoZ: 1, iz: 1, agora: 11_000 + passos * 16 }), m, false)
    }
    expect(c.modo).toBe('chao')
    expect(c.noChao).toBe(true)
    // Meio segundo de subida (mais um passo para pedir).
    expect(passos / 60).toBeLessThan(BORDA.subida + 0.1)
    expect(c.prox.z).toBeCloseTo(BORDA.paraDentro, 6)
    expect(c.prox.y - CORPO.doCentroAoPe - CORPO.folga).toBeCloseTo(2.6, 6)
  })

  test('pedindo para longe da parede solta e não pega de novo na hora', () => {
    const { c, m } = pendurado()
    passo(c, entrada(c.prox, { pedidoZ: -1, iz: -1, agora: 11_000 }), m, false)
    expect(c.modo).toBe('chao')
    expect(c.soltouDaBorda).toBe(11_000)
    c.velY = -1
    passo(c, entrada(embaixoDaQuina, { agora: 11_200 }), m, false)
    expect(c.modo).toBe('chao')
    c.velY = -1
    passo(
      c,
      entrada(embaixoDaQuina, { agora: 11_000 + BORDA.esperaParaPegarDeNovo * 1000 + 50 }),
      m,
      false,
    )
    expect(c.modo).toBe('borda')
  })

  test('pular sai para longe da parede e para cima', () => {
    const { c, m } = pendurado()
    passo(c, entrada(c.prox, { pulou: true, agora: 11_000 }), m, false)
    expect(c.modo).toBe('chao')
    expect(c.embalo.z).toBeCloseTo(-BORDA.pulo.paraFora, 6)
    expect(c.velY).toBe(BORDA.pulo.paraCima)
  })

  test('os lados andam pela quina, sem passar das pontas', () => {
    const { c, m } = pendurado()
    const antes = c.naBorda
    for (let i = 0; i < 60; i++) {
      passo(c, entrada(c.prox, { pedidoX: 1, ix: 1, agora: 11_000 + i * 16 }), m, false)
    }
    expect(c.modo).toBe('borda')
    expect(c.naBorda - antes).toBeCloseTo(BORDA.deLado, 1)
    for (let i = 0; i < 600; i++) {
      passo(c, entrada(c.prox, { pedidoX: 1, ix: 1, agora: 12_000 + i * 16 }), m, false)
    }
    expect(c.naBorda).toBeCloseTo(2.6 - BORDA.longeDaPonta, 6)
    expect(c.prox.x).toBeCloseTo(1.3 - BORDA.longeDaPonta, 6)
  })
})
