import { useFrame } from '@react-three/fiber'
import {
  CapsuleCollider,
  type RapierCollider,
  type RapierRigidBody,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
} from '@react-three/rapier'
import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { useEffect, useMemo, useRef } from 'react'
import { type Group, MathUtils, type Matrix4, Vector3 } from 'three'
import { type LugarDeDescanso, useEstado, useJogo } from '../estado/contexto'
import { maisPerto } from '../mundo/interativos'
import {
  alturaDaIlha,
  CENTRO_DA_CASA,
  dentroDaCasa,
  GRAVIDADE,
  INICIO,
  NIVEL_DA_AGUA,
  PASSO_DA_FISICA,
  PORTA,
  QUARTO,
} from '../mundo/medidas'
import { comLanterna } from '../sistemas/borroes'
import { CIPO, type Ponto } from '../sistemas/cipo'
import type { CorpoQueEmpurra } from '../sistemas/cordas'
import { CORPO } from '../sistemas/corpo'
import { AVISO_DA_CORRENTEZA, CORRENTEZA } from '../sistemas/correnteza'
import type { EntradaDaLocomocao } from '../sistemas/locomocao'
import { mostrarAvatarNoMergulho } from '../sistemas/mergulho'
import {
  type AvisoDeModo,
  atenderPedido,
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  mudarModo,
} from '../sistemas/modos'
import { passoComColisao } from '../sistemas/modos/colisao'
import { inclinacaoNoDesenho } from '../sistemas/modos/equilibrio'
import { ritmo } from '../sistemas/necessidades'
import { comPatins, RAPIDEZ_DOS_PATINS } from '../sistemas/patins'
import { jogoPausado } from '../sistemas/pausa'
import { lugarLivreNoQuarto } from '../sistemas/ponto-de-partida'
import { falaDaSaida, saiuDaVisita } from '../sistemas/visitas'
import { AvatarDoJogo } from './avatar-do-jogo'
import {
  acharBracos,
  type BracosDoAvatar,
  CORDA_NO_CORPO,
  INCLINACAO_NO_CIPO,
  segurarACorda,
} from './bracos'

const MEIA_ALTURA = CORPO.meiaAltura
const RAIO = CORPO.raio
const DO_CENTRO_AO_PE = CORPO.doCentroAoPe
/** A folga que o controlador do Rapier deixa embaixo da cápsula (`CORPO.folga`). */
const FOLGA_DO_CONTROLADOR = CORPO.folga
/** Onde a corda passa no corpo, já girado (conta do desenho no cipó, sem alocar no quadro). */
const noCorpo = new Vector3()
/** Onde o corpo está no desenho deste quadro (suavizado entre dois passos da física). */
const centroDesenhado = new Vector3()
/** O corpo desenhado que as cordas enxergam (reescrito a cada quadro). */
const corpoDesenhado: CorpoQueEmpurra = {
  de: { x: 0, y: 0, z: 0 },
  ate: { x: 0, y: 0, z: 0 },
  raio: CORPO.desenho.raio,
  cabeca: { x: 0, y: 0, z: 0 },
  raioDaCabeca: CORPO.desenho.raioDaCabeca,
}
/** O ponto no meio do corpo a `altura` dos pés, no mundo (o desenho é filho do corpo em `centro`). */
function noMundo(saida: Ponto, altura: number, desenho: Matrix4, centro: Ponto): void {
  noCorpo.set(0, altura, 0).applyMatrix4(desenho)
  saida.x = centro.x + noCorpo.x
  saida.y = centro.y + noCorpo.y
  saida.z = centro.z + noCorpo.z
}
/** O quanto o avatar inclina para dentro da curva (radianos por radiano/segundo de giro). */
const INCLINACAO_NA_CURVA = 0.035
const INCLINACAO_MAXIMA = 0.14
/** O peso (kg) com que a criança empurra e pisa o que é dinâmico. */
const MASSA_DA_CRIANCA = 30
/**
 * Para onde ir quando o ponto pedido, dentro de casa, cai em cima de um móvel: o lugar livre mais
 * perto dele (ou a porta, com o quarto todo tomado). `null` quando o ponto já está livre.
 */
function lugarSeguro(
  quarto: QuartoDoJogo,
  pedido: { x: number; z: number },
): { x: number; y: number; z: number } | null {
  const noQuarto = { x: pedido.x - CENTRO_DA_CASA.x, z: pedido.z - CENTRO_DA_CASA.z }
  const livre = lugarLivreNoQuarto(quarto, noQuarto, QUARTO)
  if (livre === noQuarto) return null
  const x = livre ? CENTRO_DA_CASA.x + livre.x : CENTRO_DA_CASA.x + PORTA.x
  const z = livre ? CENTRO_DA_CASA.z + livre.z : CENTRO_DA_CASA.z + QUARTO.fundo / 2 + 1.2
  return { x, y: alturaDaIlha(x, z) + DO_CENTRO_AO_PE + 0.2, z }
}

/**
 * O personagem: corpo cinemático com o controlador de personagem do Rapier (sobe degrau,
 * escorrega em rampa, para na parede). O que o corpo faz em cada modo (chão e nado, cipó, escalada
 * do tronco, e os que as ilhas trouxerem) mora em `sistemas/modos`; aqui o modo ativo é ligado ao
 * Rapier (os controladores do chão e do cipó) e ao desenho (giro, inclinação, pés, `rastro`).
 */
export function Personagem() {
  const { controle, loja, rastro, interativos, pedidos, movimento } = useJogo()
  const calcados = useEstado((s) => comPatins(s.patins, s.salvamento.inventario))
  const lanterna = useEstado((s) => comLanterna(s.lanterna, s.salvamento.inventario))
  const { world, rapier } = useRapier()
  const corpo = useRef<RapierRigidBody>(null)
  const colisor = useRef<RapierCollider>(null)
  const visual = useRef<Group>(null)
  const usosAtendidos = useRef(controle.usar)
  const pulosAtendidos = useRef(controle.pulos)
  /** O que as animações leem (velocidade de verdade, chão, subida, nado), escrito a cada quadro. */
  const animacao = useRef<EntradaDaLocomocao>({
    velocidade: 0,
    noChao: true,
    velY: 0,
    nadando: false,
    especial: null,
  })
  /** O corpo como os modos o veem (`sistemas/modos`): um objeto só, mexido a cada passo. */
  const v = useRef(criarEstadoDoCorpo()).current
  /** O Zappy já avisou da correnteza desde que o jogo abriu. */
  const avisouDaCorrenteza = useRef(false)
  /** De 0 (de pé) a 1 (no assento ou no colchão), e o último lugar, para o desenho voltar suave. */
  const emDescanso = useRef(0)
  const ultimoDescanso = useRef<LugarDeDescanso | null>(null)

  const inicial = useMemo(() => {
    const { salvamento, quarto } = loja.getState()
    const p = salvamento.posicao
    if (p && !dentroDaCasa(p.x, p.z)) return p
    // Dentro de casa (o começo de sempre ou uma posição salva): os móveis podem ter mudado.
    const pedido = p ?? {
      x: INICIO.x,
      y: alturaDaIlha(INICIO.x, INICIO.z) + DO_CENTRO_AO_PE + 0.2,
      z: INICIO.z,
    }
    return lugarSeguro(quarto, pedido) ?? pedido
  }, [loja])

  // A criança mudou o quarto com o jogo aberto: se um móvel caiu em cima dela, ela sai para o lado.
  useEffect(
    () =>
      loja.subscribe((s, antes) => {
        if (s.quarto === antes.quarto || !dentroDaCasa(rastro.x, rastro.z)) return
        const seguro = lugarSeguro(s.quarto, rastro)
        if (seguro) pedidos.teleporte = seguro
      }),
    [loja, rastro, pedidos],
  )

  // Plataformas cinemáticas carregam o corpo. O bicho continua fora do caminho.
  const aceitaColisorDoMundo = useMemo(
    () => (colisor: RapierCollider) => {
      const corpo = colisor.parent()
      if (v.modo === 'barco' && (corpo?.userData as { barco?: boolean })?.barco) return false
      return (
        !corpo?.isKinematic() ||
        (corpo.userData as { plataformaDoMundo?: boolean } | undefined)?.plataformaDoMundo === true
      )
    },
    [v.modo],
  )
  const kcc = useMemo(() => {
    const c = world.createCharacterController(FOLGA_DO_CONTROLADOR)
    c.enableAutostep(CORPO.degrau, 0.25, true)
    c.enableSnapToGround(0.35)
    c.setMaxSlopeClimbAngle(MathUtils.degToRad(CORPO.sobeAte))
    c.setMinSlopeSlideAngle(MathUtils.degToRad(CORPO.escorregaAcimaDe))
    // Empurra o que é dinâmico (o tronco do lago) com o peso de uma criança: andando contra, ele
    // desliza; em pé numa ponta, ele afunda daquele lado.
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(MASSA_DA_CRIANCA)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kcc), [world, kcc])
  // No cipó, sem subir degrau nem grudar no chão: o balanço passa a `folgaDosPes` do chão, e o
  // grudar puxaria o corpo para baixo (o jogo acharia que bateu e frearia o balanço).
  const kccNoCipo = useMemo(() => {
    const c = world.createCharacterController(FOLGA_DO_CONTROLADOR)
    c.setApplyImpulsesToDynamicBodies(false)
    return c
  }, [world])
  useEffect(() => () => world.removeCharacterController(kccNoCipo), [world, kccNoCipo])

  // No cipó e no tronco os braços vão para cima, por cima da pose (os ossos aparecem quando o
  // avatar termina de carregar).
  const bracos = useRef<BracosDoAvatar | null>(null)
  /** Já procurou os ossos nesta ida ao cipó ou ao tronco (não procura de novo a cada quadro). */
  const procurouBracos = useRef(false)
  const depoisDaPose = useMemo(
    () => () => {
      const corpoVisivel = visual.current
      // No cipó as mãos miram a corda; no tronco o clipe "Escalar" já alterna as mãos na casca.
      if (v.modo !== 'cipo' || !corpoVisivel) return
      if (!bracos.current && !procurouBracos.current) {
        procurouBracos.current = true
        bracos.current = acharBracos(corpoVisivel)
      }
      if (bracos.current) segurarACorda(bracos.current, corpoVisivel)
    },
    [v],
  )

  // Quando o modo muda: a loja (a dica e os botões) e os braços (procuram os ossos de novo).
  const aviso = useMemo<AvisoDeModo>(
    () => (modo) => {
      procurouBracos.current = false
      movimento.modo = modo
      loja.getState().definirModo(modo)
      loja.getState().definirDescanso(modo === 'descanso' ? (v.descanso?.jeito ?? null) : null)
    },
    [movimento, loja, v],
  )

  /** O que chega a cada passo (um objeto só, reescrito: o laço da física não aloca). */
  const entrada = useRef<EntradaDoPasso>({
    dt: PASSO_DA_FISICA,
    agora: 0,
    parado: false,
    p: { x: 0, y: 0, z: 0 },
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
    patins: false,
    conversa: null,
    gravidade: GRAVIDADE,
    nivelDoMar: NIVEL_DA_AGUA,
  }).current

  // O movimento, a cada passo da física (sempre `PASSO_DA_FISICA`): o modo ativo
  // (`sistemas/modos`) diz o deslocamento e quem leva o corpo; aqui só se liga isso ao Rapier. Num
  // quadro longo o Rapier dá vários passos; num curto, nenhum.
  useBeforePhysicsStep(() => {
    const dt = PASSO_DA_FISICA
    const b = corpo.current
    const col = colisor.current
    if (!b || !col) return
    const estado = loja.getState()
    const agora = performance.now()
    const parado = jogoPausado(estado)

    if (pedidos.teleporte) {
      if (v.modo !== 'chao') mudarModo(v, 'chao', agora, aviso)
      b.setNextKinematicTranslation(pedidos.teleporte)
      v.velY = 0
      v.embalo.x = 0
      v.embalo.z = 0
      v.vel.x = 0
      v.vel.z = 0
      if (pedidos.olharPara !== null) {
        v.direcao = pedidos.olharPara
        // A câmera vai para as costas (ela olha para `-(sin g, cos g)`).
        rastro.giro = pedidos.olharPara + Math.PI
        if (visual.current) visual.current.rotation.y = pedidos.olharPara
        pedidos.olharPara = null
      }
      pedidos.teleporte = null
      return
    }
    if (pedidos.chaoChegando.size > 0 && v.modo !== 'barco') {
      v.velY = 0
      return
    }

    const p = b.translation()
    v.noModo += dt

    // Direção pedida, relativa ao giro da câmera.
    let ix = parado ? 0 : controle.eixoX
    let iz = parado ? 0 : controle.eixoZ
    const tam = Math.hypot(ix, iz)
    if (tam > 1) {
      ix /= tam
      iz /= tam
    }
    const g = rastro.giro
    const e = entrada
    e.agora = agora
    e.parado = parado
    e.p.x = p.x
    e.p.y = p.y
    e.p.z = p.z
    e.ix = ix
    e.iz = iz
    e.ladoX = Math.cos(g)
    e.ladoZ = -Math.sin(g)
    e.pedidoX = -Math.sin(g) * iz + e.ladoX * ix
    e.pedidoZ = -Math.cos(g) * iz + e.ladoZ * ix
    e.subir = !parado && controle.pular
    e.descer = !parado && controle.descer
    e.pulou = !parado && controle.pulos !== pulosAtendidos.current
    pulosAtendidos.current = controle.pulos
    e.usou = controle.usar !== usosAtendidos.current
    usosAtendidos.current = controle.usar
    e.correr = controle.correr
    e.ritmo = ritmo(estado.salvamento.necessidades)
    e.patins = comPatins(estado.patins, estado.salvamento.inventario)
    e.conversa = pedidos.conversa

    // Pedido de um interativo ("Pegar o cipó", "Escalar o tronco").
    const pedido = movimento.pedido
    movimento.pedido = null
    if (pedido && !parado) atenderPedido(v, pedido, movimento, e.p, agora, aviso)

    // O modo ativo; o cipó e o tronco somem com a ilha, e aí o corpo volta ao chão.
    let modo = MODOS[v.modo]
    if (!modo.valendo(v, movimento)) {
      mudarModo(v, 'chao', agora, aviso)
      modo = MODOS.chao
    }
    // Todo percurso consulta o mundo, inclusive escada, borda e escalada. Os guiados
    // usam o controlador sem snap/degrau; sensores e o bicho não bloqueiam o caminho.
    const gastouUsar = passoComColisao(
      modo,
      v,
      e,
      movimento,
      col,
      kcc,
      kccNoCipo,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS,
      aceitaColisorDoMundo,
      aviso,
    )
    b.setNextKinematicTranslation(v.prox)
    // Pegou um cipó ou grudou no tronco neste passo: no ar e na casca ela está sempre "andando".
    if (v.modo !== 'chao' && v.modo !== 'barco' && v.modo !== 'mergulho') v.velPedida = 1
    movimento.noChao = v.modo === 'chao' && v.noChao
    const usou = e.usou && !gastouUsar
    const prox = v.prox
    const nadando = v.nadando

    // O que as animações leem. Os passos, o balanço do corpo e a inclinação de quem corre vêm das
    // animações (`avatar-do-jogo`).
    const m = animacao.current
    // No chão, a velocidade no chão; no cipó o laço não anda pela distância; nos outros modos, a
    // do corpo (pela casca, pelo tronco caído), que toca os ciclos deles.
    // De patins o corpo desliza mais rápido com o mesmo passo das pernas (os pés deslizam).
    const passada = e.patins && !nadando ? RAPIDEZ_DOS_PATINS : 1
    const real =
      v.modo === 'chao'
        ? Math.hypot(prox.x - p.x, prox.z - p.z) / dt / passada
        : v.modo === 'cipo' || v.modo === 'barco'
          ? 0
          : Math.hypot(prox.x - p.x, prox.y - p.y, prox.z - p.z) / dt
    m.velocidade += (real - m.velocidade) * Math.min(1, dt * 14)
    m.noChao = v.modo !== 'chao' || v.noChao
    m.velY = v.velY
    m.nadando = nadando
    m.especial =
      v.modo === 'chao' || v.modo === 'barco' || v.modo === 'mergulho'
        ? null
        : v.modo === 'descanso'
          ? (v.descanso?.jeito ?? null)
          : v.modo
    m.subindo = v.modo === 'borda' ? v.subindoNaBorda : 0

    estado.definirLugar({ dentroDeCasa: dentroDaCasa(prox.x, prox.z), nadando })
    if (v.correnteza >= CORRENTEZA.aviso && !avisouDaCorrenteza.current) {
      avisouDaCorrenteza.current = true
      estado.dizer(AVISO_DA_CORRENTEZA)
    }
    // Na casa de um irmão (fase3-12) só se olha: nada do mundo oferece ação, e sair da ilha
    // central termina a visita (lá fora o jogo é dela e volta a gravar).
    if (estado.visita && !pedidos.teleporte && saiuDaVisita(prox.x, prox.z)) {
      const nome = estado.visita.nome
      estado.visitar(null)
      estado.dizer(falaDaSaida(nome))
    }
    estado.definirAlvo(
      parado || (v.modo !== 'chao' && v.modo !== 'mergulho') || estado.visita
        ? null
        : maisPerto(interativos, prox.x, prox.z, v.modo === 'mergulho'),
    )

    if (usou && (v.modo === 'chao' || v.modo === 'mergulho') && !parado) {
      const alvo = estado.alvo
      if (alvo) interativos.get(alvo.id)?.agir()
    }
  })

  // O desenho, a cada quadro: para onde o avatar olha (vira suave), a inclinação na curva, no cipó
  // e no nado, onde os pés encostam, o corpo que as cordas enxergam e o `rastro` (a câmera e o
  // Zappy seguem a posição suavizada, sem tremer entre passos).
  useFrame(({ camera }, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1)
    const vis = visual.current
    const corpoDoRapier = vis?.parent
    if (!vis || !corpoDoRapier) return
    corpoDoRapier.getWorldPosition(centroDesenhado)
    const centro = centroDesenhado
    if (jogoPausado(loja.getState())) {
      // A física fica suspensa; gestos feitos dentro dos painéis não viram pulo/uso na retomada.
      pulosAtendidos.current = controle.pulos
      usosAtendidos.current = controle.usar
      if (pedidos.conversa) {
        v.direcao = Math.atan2(pedidos.conversa.x - centro.x, pedidos.conversa.z - centro.z)
      }
    }
    const nadando = v.nadando
    const m = animacao.current
    let delta = v.direcao - vis.rotation.y
    delta = Math.atan2(Math.sin(delta), Math.cos(delta))
    const giro = delta * Math.min(1, dt * 12)
    vis.rotation.y += giro
    // No cipó o corpo pende junto com a corda (as mãos para o pivô); nadando, deita de bruços; na
    // cama, deita de costas.
    const deitada = v.modo === 'descanso' && v.descanso?.jeito === 'deitar'
    const inclinar =
      v.modo === 'cipo' && v.cipo
        ? -v.cipo.balanco.angulo - INCLINACAO_NO_CIPO
        : nadando
          ? 1.1
          : deitada
            ? -Math.PI / 2
            : 0
    vis.rotation.x = MathUtils.lerp(vis.rotation.x, inclinar, v.modo === 'cipo' ? 0.35 : 0.15)
    const curva =
      v.modo === 'chao' && !nadando
        ? MathUtils.clamp(
            (-giro / Math.max(dt, 1e-3)) * INCLINACAO_NA_CURVA * Math.min(1, m.velocidade / 3),
            -INCLINACAO_MAXIMA,
            INCLINACAO_MAXIMA,
          )
        : 0
    // No tronco caído, o corpo pende para o lado pedido (e volta sozinho, `sistemas/modos`).
    const deLado = v.modo === 'equilibrio' ? inclinacaoNoDesenho(v) : curva
    vis.rotation.z = MathUtils.lerp(vis.rotation.z, deLado, Math.min(1, dt * 8))
    // No chão, os pés no fim da cápsula. No cipó, o corpo pende das mãos: o ponto da corda no
    // corpo (ao lado do rosto) fica em cima das mãos, com o giro e a inclinação do balanço.
    v.noCipo += ((v.modo === 'cipo' ? 1 : 0) - v.noCipo) * Math.min(1, dt * 10)
    noCorpo.copy(CORDA_NO_CORPO).applyEuler(vis.rotation)
    const k = v.noCipo
    vis.position.set(
      -noCorpo.x * k,
      (-DO_CENTRO_AO_PE - FOLGA_DO_CONTROLADOR) * (1 - k) +
        (CIPO.maosAcimaDoCentro - noCorpo.y) * k,
      -noCorpo.z * k,
    )
    // Descansando, o desenho vai para o assento ou o colchão (o corpo do Rapier fica de pé ao
    // lado, fora do móvel): a origem do desenho (os pés no clipe) no lugar do descanso.
    const lugar = v.descanso
    if (lugar) {
      ultimoDescanso.current = lugar
      emDescanso.current += (1 - emDescanso.current) * Math.min(1, dt * 6)
    } else emDescanso.current += (0 - emDescanso.current) * Math.min(1, dt * 8)
    const d = emDescanso.current
    const ultimo = ultimoDescanso.current
    if (ultimo && d > 0.001) {
      vis.position.x += (ultimo.desenho.x - centro.x - vis.position.x) * d
      vis.position.y += (ultimo.desenho.y - centro.y - vis.position.y) * d
      vis.position.z += (ultimo.desenho.z - centro.z - vis.position.z) * d
    }
    const viagem = v.barco
    if (viagem && (viagem.fase === 'viagem' || viagem.fase === 'espera')) {
      vis.position.set(
        viagem.visual.x - centro.x,
        viagem.visual.y - centro.y,
        viagem.visual.z - centro.z,
      )
    }
    // O corpo desenhado, no mundo, para as cordas encostarem nele (o desenho é filho do corpo
    // do Rapier, que está em `centro`).
    vis.updateMatrix()
    noMundo(corpoDesenhado.de, CORPO.desenho.de, vis.matrix, centro)
    noMundo(corpoDesenhado.ate, CORPO.desenho.ate, vis.matrix, centro)
    noMundo(corpoDesenhado.cabeca, CORPO.desenho.cabeca, vis.matrix, centro)
    movimento.corpoDesenhado = corpoDesenhado

    // Em túneis a sonda pode aproximar a câmera até o corpo. Só o desenho some;
    // a cápsula, as animações e os comandos continuam iguais.
    vis.visible =
      v.modo !== 'mergulho' ||
      mostrarAvatarNoMergulho(
        Math.hypot(
          camera.position.x - centro.x,
          camera.position.y - centro.y,
          camera.position.z - centro.z,
        ),
        vis.visible,
      )
    rastro.x = centro.x
    rastro.y = centro.y
    rastro.z = centro.z
    rastro.direcao = v.direcao
    // O Zappy olha para onde ela vai: no cipó e no tronco ela está sempre "andando".
    rastro.velocidade = v.velPedida
  })

  return (
    <RigidBody
      ref={corpo}
      type="kinematicPosition"
      colliders={false}
      position={[inicial.x, inicial.y, inicial.z]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider ref={colisor} args={[MEIA_ALTURA, RAIO]} />
      <group
        ref={(g) => {
          visual.current = g
          // O giro primeiro e a inclinação no corpo: nadar e balançar inclinam para a frente dele.
          if (g) g.rotation.order = 'YXZ'
        }}
        position={[0, -DO_CENTRO_AO_PE - FOLGA_DO_CONTROLADOR, 0]}
      >
        <AvatarDoJogo
          movimento={animacao}
          depoisDaPose={depoisDaPose}
          comPatins={calcados}
          comLanterna={lanterna}
        />
      </group>
    </RigidBody>
  )
}
