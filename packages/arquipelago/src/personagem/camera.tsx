import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { PAINEL_DE_CONSTRUIR } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import { useToque } from '../estado/preferencias'
import { GRUPOS_DO_RAIO_DA_CAMERA } from '../mundo/grupos'
import { vistaDaLuneta } from '../mundo/luneta-medidas'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  CONTROLE_DA_CAMERA as C,
  CAMERA_NO_ALTO,
  DISTANCIA_MINIMA_DA_CAMERA,
  FOLGA_DA_CAMERA,
  GRUA_DA_CAMERA,
  RAIO_DA_SONDA_DA_CAMERA,
  VOLTA_DA_CAMERA,
} from '../mundo/medidas'
import {
  distanciaDaCamera,
  giroMaisCurto,
  limitarPosicaoDaCamera,
  pesoNoAlto,
  rodaEmPixels,
  zoomDaPinca,
} from '../sistemas/camera'
import {
  giroComVoltaSozinha,
  METROS_DA_DISTANCIA,
  MULTIPLICADOR_DA_RAPIDEZ,
} from '../sistemas/conforto'
import { ilhaDaLuneta, PAINEL_DA_LUNETA } from '../sistemas/luneta'
import {
  criarPesos,
  type Enquadramento,
  metrosDeAntecipacao,
  misturarPerfis,
  PERFIS_DE_CAMERA,
  passoDosPesos,
  perfilDaVez,
} from '../sistemas/perfis-de-camera'

const IDENTIDADE = { x: 0, y: 0, z: 0, w: 1 }
/** Do ponto que a câmera olha (a cabeça) até o peito do avatar. */
const ALTURA_DO_PEITO = 0.7
/**
 * No cipó a câmera olha para um ponto entre o corpo e o meio do cipó (`movimento.foco`), e segue
 * mais devagar: o balanço passa pela tela sem a câmera correr atrás dele. Com menos movimento
 * pedido no sistema, ela olha só para o meio do cipó e fica quase parada.
 */
const FOCO_NO_CIPO = 0.55
const FOCO_NO_CIPO_COM_MENOS_MOVIMENTO = 1
/** O quanto a câmera fica mais lenta para seguir no cipó (6 por segundo no chão). */
const SEGUIR_NO_CIPO = 2.5
/**
 * Na conversa (`pedidos.conversa` com um painel aberto), a câmera olha para o meio das duas
 * cabeças e vai para trás e para o lado da criança (`LADO_NA_CONVERSA` do caminho dela até quem
 * fala, do lado de fora da ilha), mais perto e mais baixa (o perfil `conversa`,
 * `sistemas/perfis-de-camera.ts`): as duas aparecem, como nos jogos de conversa. Com menos
 * movimento pedido no sistema, ela só muda o ponto que olha e não gira.
 */
const LADO_NA_CONVERSA = 1.1
const DISTANCIA_NA_CONVERSA = PERFIS_DE_CAMERA.conversa.distancia?.maxima ?? 5
/** O ângulo da câmera na conversa: baixo, quase na altura dos olhos. */
const INCLINACAO_NA_CONVERSA = PERFIS_DE_CAMERA.conversa.inclinacao?.fixa ?? 0.2
const RAPIDEZ_NA_CONVERSA = 2.5
/** O ponto que ela olha fica abaixo das cabeças: as duas sobem na tela, acima da caixa de conversa. */
const ABAIXO_NA_CONVERSA = 0.7
/** A rapidez (por segundo) com que a câmera vai para as costas de quem escorrega. */
const CAMERA_NO_ESCORREGADOR = 2.5
/** A rapidez com que o olhar vai à frente e volta (por segundo): devagar, sem balançar nas curvas. */
const SEGUIR_A_ANTECIPACAO = 2
/** Guarda que a pessoa já mexeu na câmera (a dica do Zappy não volta). */
const CHAVE_DA_DICA = 'arquipelago:camera-dica'

function lerDica(): boolean {
  try {
    return localStorage.getItem(CHAVE_DA_DICA) === '1'
  } catch {
    return false
  }
}

function gravarDica() {
  try {
    localStorage.setItem(CHAVE_DA_DICA, '1')
  } catch {
    // Sem armazenamento (aba anônima): a dica só pode voltar na próxima vez.
  }
}

/**
 * Câmera em terceira pessoa. Arrastar (mouse ou dedo fora dos botões) gira em volta do avatar e
 * sobe ou desce o ângulo; a roda, a pinça e as teclas + e - aproximam (`CONTROLE_DA_CAMERA`); dois
 * cliques ou dois toques põem a câmera nas costas dela. Dentro de casa ela sobe e chega mais perto, para ver o quarto todo.
 * Fora de casa, um raio do avatar até ela contra o que é sólido (troncos, paredes, chão) a traz
 * para perto quando bate, e lá no alto (deques e pontes) ela desce o ângulo para mostrar o caminho.
 */
export function Camera() {
  const { rastro, movimento, loja, pedidos, controle } = useJogo()
  const toque = useToque()
  const dentro = useEstado((s) => s.dentroDeCasa)
  const construindo = useEstado((s) => s.painelAberto === PAINEL_DE_CONSTRUIR)
  const naLuneta = useEstado((s) => s.painelAberto === PAINEL_DA_LUNETA)
  const jornada = useEstado((s) => s.jornada)
  const tamanho = useThree((s) => s.size)
  const vista = useMemo(
    () => vistaDaLuneta(ilhaDaLuneta(jornada), tamanho.width / tamanho.height),
    [jornada, tamanho.width, tamanho.height],
  )
  const antesDaLuneta = useRef({
    ativa: false,
    posicao: new Vector3(),
    giro: new Quaternion(),
    campo: 55,
  })
  const conforto = lojaDoConforto(loja)
  // Menos movimento: o pedido do aparelho ou a preferência do jogo (`sistemas/conforto.ts`).
  const aparelhoPedeMenos = useReducedMotion()
  const jogoPedeMenos = useConforto(conforto, (s) => s.conforto.menosMovimento)
  const menosMovimento = aparelhoPedeMenos || jogoPedeMenos
  const noCipo = useRef(0)
  /** O peso de cada perfil (exploração, casa, conversa, percurso), trocando aos poucos. */
  const pesos = useRef(criarPesos(dentro ? 'casa' : 'exploracao')).current
  const enquadramento = useRef<Enquadramento>({ inclinacao: 0, distancia: 0, antecipar: 0 }).current
  /** Para onde o olhar vai à frente do corpo (percurso), suavizado. */
  const adiante = useRef({ x: 0, z: 0 })
  /** O lado da conversa: 1 à esquerda de quem olha a criança por trás, −1 à direita. */
  const ladoDaConversa = useRef<1 | -1 | null>(null)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const distanciaDePartida = METROS_DA_DISTANCIA[conforto.getState().conforto.distancia]
  const distancia = useRef(distanciaDePartida)
  /** A distância pedida (roda, pinça, teclas); `distancia` chega nela aos poucos. */
  const distanciaPedida = useRef(distanciaDePartida)
  /** Segundos sem a pessoa mexer na câmera (para a volta sozinha, se ligada). */
  const semMexer = useRef(0)
  /** Voltando para as costas do avatar (dois cliques): o giro e a inclinação de chegada. */
  const volta = useRef<{ giro: number; inclinacao: number } | null>(null)
  const mexeu = useRef(lerDica())
  const alvo = useRef(new Vector3())
  const desejada = useRef(new Vector3())
  const { world, rapier } = useRapier()
  const sonda = useRef(new rapier.Ball(RAIO_DA_SONDA_DA_CAMERA))
  const atual = useRef(9)
  const noAlto = useRef(0)
  const subida = useRef(0)
  const lado = useRef(1)
  const arrastandoAgora = useRef(false)
  /** O último pedido de recentralizar já atendido (tecla C, analógico direito). */
  const recentrarVisto = useRef(controle.recentrar)

  useEffect(() => {
    if (construindo || naLuneta) return
    const el = gl.domElement
    const dedos = new Map<number, { x: number; y: number }>()
    let pinca: { separacao: number; distancia: number } | null = null
    let ultimoToque = { em: 0, x: 0, y: 0 }
    const separacao = () => {
      const [a, b] = [...dedos.values()]
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
    }
    const marcarQueMexeu = () => {
      if (mexeu.current) return
      mexeu.current = true
      gravarDica()
    }
    const desce = (e: PointerEvent) => {
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
      el.setPointerCapture(e.pointerId)
      volta.current = null
      if (dedos.size === 2) {
        // Dois dedos: pinça (aproximar e afastar), sem girar.
        pinca = { separacao: separacao(), distancia: distanciaPedida.current }
        arrastandoAgora.current = false
        return
      }
      arrastandoAgora.current = true
      // Dois toques (ou cliques) rápidos no mesmo lugar: a câmera volta para as costas.
      const agora = performance.now()
      const perto =
        Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < C.doisToquesPixels
      if (agora - ultimoToque.em < C.doisToquesMs && perto) {
        volta.current = { giro: rastro.direcao + Math.PI, inclinacao: C.inclinacaoDeVolta }
        ultimoToque = { em: 0, x: 0, y: 0 }
      } else ultimoToque = { em: agora, x: e.clientX, y: e.clientY }
    }
    const move = (e: PointerEvent) => {
      const antes = dedos.get(e.pointerId)
      if (!antes) return
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinca && dedos.size >= 2) {
        distanciaPedida.current = zoomDaPinca(
          pinca.distancia,
          pinca.separacao,
          separacao(),
          C.distanciaMinima,
          C.distanciaMaxima,
        )
        marcarQueMexeu()
        return
      }
      const dx = e.clientX - antes.x
      const dy = e.clientY - antes.y
      if (dx === 0 && dy === 0) return
      const { rapidez, inverterVertical } = conforto.getState().conforto
      const k = MULTIPLICADOR_DA_RAPIDEZ[rapidez]
      semMexer.current = 0
      rastro.giro -= dx * C.giroPorPixel * k
      rastro.inclinacao = MathUtils.clamp(
        rastro.inclinacao + dy * C.inclinacaoPorPixel * k * (inverterVertical ? -1 : 1),
        C.inclinacaoMinima,
        C.inclinacaoMaxima,
      )
      if (Math.abs(dx) + Math.abs(dy) > 2) marcarQueMexeu()
    }
    const sobe = (e: PointerEvent) => {
      dedos.delete(e.pointerId)
      if (dedos.size < 2) pinca = null
      // Soltou um dos dois dedos: o outro volta a girar a partir de onde está.
      arrastandoAgora.current = dedos.size === 1
    }
    const roda = (e: WheelEvent) => {
      e.preventDefault()
      volta.current = null
      semMexer.current = 0
      distanciaPedida.current = MathUtils.clamp(
        distanciaPedida.current + rodaEmPixels(e.deltaY, e.deltaMode) * C.rodaPorPixel,
        C.distanciaMinima,
        C.distanciaMaxima,
      )
      marcarQueMexeu()
    }
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest?.('input, textarea, select, [contenteditable=true]')) return
      const mais = e.code === 'Equal' || e.code === 'NumpadAdd'
      const menos = e.code === 'Minus' || e.code === 'NumpadSubtract'
      if (!mais && !menos) return
      distanciaPedida.current = MathUtils.clamp(
        distanciaPedida.current + (mais ? -C.passoDaTecla : C.passoDaTecla),
        C.distanciaMinima,
        C.distanciaMaxima,
      )
      marcarQueMexeu()
    }
    el.addEventListener('pointerdown', desce)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', sobe)
    el.addEventListener('pointercancel', sobe)
    el.addEventListener('wheel', roda, { passive: false })
    window.addEventListener('keydown', tecla)
    return () => {
      el.removeEventListener('pointerdown', desce)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', sobe)
      el.removeEventListener('pointercancel', sobe)
      el.removeEventListener('wheel', roda)
      window.removeEventListener('keydown', tecla)
    }
  }, [gl, rastro, conforto, construindo, naLuneta])

  // Mudou a distância nas preferências: a câmera vai até ela (a roda e a pinça seguem valendo).
  useEffect(
    () =>
      conforto.subscribe((s, antes) => {
        if (s.conforto.distancia !== antes.conforto.distancia)
          distanciaPedida.current = METROS_DA_DISTANCIA[s.conforto.distancia]
      }),
    [conforto],
  )

  // Uma vez, se a pessoa ainda não mexeu na câmera: o Zappy conta como.
  useEffect(() => {
    if (mexeu.current) return
    const t = setTimeout(() => {
      if (mexeu.current) return
      loja
        .getState()
        .dizer(
          toque
            ? 'Arraste a tela com um dedo para girar a câmera. Com dois dedos, chegue mais perto ou mais longe.'
            : 'Arraste a tela com o mouse para girar a câmera. A rodinha chega mais perto ou mais longe.',
        )
      mexeu.current = true
      gravarDica()
    }, C.dicaDepoisDeMs)
    return () => clearTimeout(t)
  }, [loja, toque])

  useFrame((_, dt) => {
    // Uma única dona da câmera por quadro. O Construir cuida do alvo, controles e suavização.
    if (loja.getState().painelAberto === PAINEL_DE_CONSTRUIR) return
    const perfilAtual = perfilDaVez({
      luneta: loja.getState().painelAberto === PAINEL_DA_LUNETA,
      conversa: loja.getState().painelAberto !== null && pedidos.conversa !== null,
      dentroDeCasa: dentro,
      correndoPercurso: movimento.corrida !== null,
      escorregando: movimento.modo === 'escorregar',
    })
    const antesL = antesDaLuneta.current
    if (perfilAtual === 'luneta' && camera instanceof PerspectiveCamera) {
      if (!antesL.ativa) {
        antesL.ativa = true
        antesL.posicao.copy(camera.position)
        antesL.giro.copy(camera.quaternion)
        antesL.campo = camera.fov
      }
      // Corte para a vista óptica, sem viajar através do mundo ou mexer no rastro do corpo.
      camera.position.set(vista.posicao.x, vista.posicao.y, vista.posicao.z)
      camera.lookAt(vista.alvo.x, vista.alvo.y, vista.alvo.z)
      camera.fov += (vista.campo - camera.fov) * (menosMovimento ? 1 : 1 - Math.exp(-dt * 10))
      camera.updateProjectionMatrix()
      return
    }
    if (antesL.ativa && camera instanceof PerspectiveCamera) {
      antesL.ativa = false
      camera.position.copy(antesL.posicao)
      camera.quaternion.copy(antesL.giro)
      camera.fov = antesL.campo
      camera.updateProjectionMatrix()
      return
    }
    // O analógico direito do controle físico gira e inclina, como arrastar.
    const prefs = conforto.getState().conforto
    semMexer.current += dt
    if (controle.cameraX !== 0 || controle.cameraY !== 0) {
      const k = MULTIPLICADOR_DA_RAPIDEZ[prefs.rapidez]
      volta.current = null
      semMexer.current = 0
      rastro.giro -= controle.cameraX * C.giroDoAnalogico * k * dt
      rastro.inclinacao = MathUtils.clamp(
        rastro.inclinacao +
          controle.cameraY * C.inclinacaoDoAnalogico * k * (prefs.inverterVertical ? -1 : 1) * dt,
        C.inclinacaoMinima,
        C.inclinacaoMaxima,
      )
      if (!mexeu.current) {
        mexeu.current = true
        gravarDica()
      }
    }
    // Tecla C ou clique no analógico direito: de volta para as costas (como os dois cliques).
    if (controle.recentrar !== recentrarVisto.current) {
      recentrarVisto.current = controle.recentrar
      volta.current = { giro: rastro.direcao + Math.PI, inclinacao: C.inclinacaoDeVolta }
    }
    // No escorregador a câmera vai para as costas (quem desce vê a pista à frente), a não ser que a
    // pessoa esteja girando ou tenha pedido menos movimento.
    if (movimento.modo === 'escorregar' && !arrastandoAgora.current && !menosMovimento) {
      rastro.giro +=
        giroMaisCurto(rastro.giro, rastro.direcao + Math.PI) *
        (1 - Math.exp(-dt * CAMERA_NO_ESCORREGADOR))
    }
    // Com a preferência ligada, andando sem mexer na câmera, ela volta sozinha para as costas.
    if (!volta.current && movimento.modo === 'chao' && !arrastandoAgora.current) {
      rastro.giro = giroComVoltaSozinha(
        rastro.giro,
        rastro.direcao,
        prefs,
        rastro.velocidade,
        semMexer.current,
        dt,
      )
    }
    // Zoom suave até o pedido.
    distancia.current +=
      (distanciaPedida.current - distancia.current) * (1 - Math.exp(-dt * C.suavizarZoom))
    // Voltando para as costas (dois cliques): giro e ângulo andam juntos até chegar.
    const v = volta.current
    if (v) {
      const kv = 1 - Math.exp(-dt * C.voltaParaAsCostas)
      const falta = giroMaisCurto(rastro.giro, v.giro)
      rastro.giro += falta * kv
      rastro.inclinacao += (v.inclinacao - rastro.inclinacao) * kv
      if (Math.abs(falta) < 0.01 && Math.abs(v.inclinacao - rastro.inclinacao) < 0.01)
        volta.current = null
    }
    // No cipó, o alvo vai aos poucos para perto do meio do cipó e a câmera segue mais devagar.
    const foco =
      movimento.modo === 'cipo'
        ? menosMovimento
          ? FOCO_NO_CIPO_COM_MENOS_MOVIMENTO
          : FOCO_NO_CIPO
        : 0
    noCipo.current += (foco - noCipo.current) * (1 - Math.exp(-dt * 4))
    const f = noCipo.current
    const k = 1 - Math.exp(-dt * (6 - SEGUIR_NO_CIPO * Math.min(1, f / FOCO_NO_CIPO)))
    let ax = rastro.x + (movimento.foco.x - rastro.x) * f
    let ay = rastro.y + 0.9 + (movimento.foco.y - rastro.y - 0.9) * f
    let az = rastro.z + (movimento.foco.z - rastro.z) * f
    // O perfil da vez (`sistemas/perfis-de-camera.ts`) e a troca aos poucos.
    const fala = loja.getState().painelAberto !== null ? pedidos.conversa : null
    passoDosPesos(pesos, perfilAtual, dt)
    misturarPerfis(pesos, rastro.inclinacao, distancia.current, enquadramento)
    // Antecipando (percurso): a câmera olha um pouco à frente de quem anda, para onde ela vai. Só
    // o olhar vai à frente; a câmera e a sonda continuam saindo do corpo.
    const frente =
      !menosMovimento && movimento.modo === 'chao'
        ? metrosDeAntecipacao(enquadramento.antecipar, rastro.velocidade)
        : 0
    const ka = 1 - Math.exp(-dt * SEGUIR_A_ANTECIPACAO)
    adiante.current.x += (Math.sin(rastro.direcao) * frente - adiante.current.x) * ka
    adiante.current.z += (Math.cos(rastro.direcao) * frente - adiante.current.z) * ka
    // Na conversa: o ponto vai para o meio das duas cabeças e a câmera para o lado da criança.
    const w = pesos.conversa
    if (fala) {
      ax += ((fala.x + rastro.x) / 2 - ax) * w
      ay += ((fala.y + rastro.y + 0.9) / 2 - ay) * w
      az += ((fala.z + rastro.z) / 2 - az) * w
    }
    alvo.current.x += (ax - alvo.current.x) * k
    alvo.current.y += (ay - alvo.current.y) * k
    alvo.current.z += (az - alvo.current.z) * k
    // Lá no alto, o ângulo desce e a câmera chega perto (passa por baixo das copas).
    const alto = pesoNoAlto(rastro.y - 0.9 - ALTURA_DA_TERRA, CAMERA_NO_ALTO.acimaDoChao)
    noAlto.current += (alto - noAlto.current) * k
    const n = dentro ? 0 : noAlto.current
    // O ângulo e a distância do perfil; lá no alto, por cima, o ângulo desce e a câmera chega perto.
    let inclinacao = MathUtils.lerp(
      enquadramento.inclinacao,
      Math.min(enquadramento.inclinacao, CAMERA_NO_ALTO.inclinacaoMaxima),
      n,
    )
    const dist = MathUtils.lerp(
      enquadramento.distancia,
      Math.min(enquadramento.distancia, CAMERA_NO_ALTO.distanciaMaxima),
      n,
    )
    // Uma bolinha lançada até a câmera (não um raio fino): o que é sólido no caminho a puxa para
    // perto, sem raspar a quina de um tronco nem deixar o corpo do avatar escondido atrás dele.
    // Dentro de casa o telhado sai e a vista de cima é a de sempre.
    const lancar = (incl: number, giro = rastro.giro, comprimento = dist) => {
      const direcao = {
        x: Math.sin(giro) * Math.cos(incl),
        y: Math.sin(incl),
        z: Math.cos(giro) * Math.cos(incl),
      }
      // Da cabeça e do peito: um tronco que esconde só o corpo também conta.
      let livre = comprimento
      for (const abaixo of [0, ALTURA_DO_PEITO]) {
        const de = { x: alvo.current.x, y: alvo.current.y - abaixo, z: alvo.current.z }
        const bateu = world.castShape(
          de,
          IDENTIDADE,
          direcao,
          sonda.current,
          0,
          comprimento + FOLGA_DA_CAMERA,
          // Começar encostado num tronco (escalando, ou de pé junto dele) e se afastar não é
          // bater: só conta o que entra mais no sólido. Com `true`, a bolinha que já sai
          // encostando parava na hora para qualquer lado e a câmera ia para dentro da cabeça.
          false,
          rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS,
          GRUPOS_DO_RAIO_DA_CAMERA,
        )
        if (bateu) livre = Math.min(livre, bateu.time_of_impact - FOLGA_DA_CAMERA)
      }
      return livre
    }
    // Na conversa a câmera vai para um lado da criança (escolhido uma vez por conversa); o giro
    // anda aos poucos até lá.
    if (!fala) ladoDaConversa.current = null
    else if (!menosMovimento) {
      const atras = Math.atan2(fala.x - rastro.x, fala.z - rastro.z) + Math.PI
      if (ladoDaConversa.current === null) {
        // O lado de fora da ilha (longe do miolo), a não ser que a sonda o ache tapado e o
        // outro não.
        const longe = (sentido: 1 | -1) => {
          const g = atras + sentido * LADO_NA_CONVERSA
          const x = rastro.x + Math.sin(g) * DISTANCIA_NA_CONVERSA - fala.miolo.x
          const z = rastro.z + Math.cos(g) * DISTANCIA_NA_CONVERSA - fala.miolo.z
          return x * x + z * z
        }
        const fora = longe(1) >= longe(-1) ? 1 : -1
        const outro = fora === 1 ? -1 : 1
        const livre = (sentido: 1 | -1) =>
          dentro ? dist : lancar(INCLINACAO_NA_CONVERSA, atras + sentido * LADO_NA_CONVERSA)
        const tapado = DISTANCIA_NA_CONVERSA * GRUA_DA_CAMERA.tapada
        ladoDaConversa.current = livre(fora) < tapado && livre(outro) >= tapado ? outro : fora
      }
      const lado = atras + ladoDaConversa.current * LADO_NA_CONVERSA
      rastro.giro += giroMaisCurto(rastro.giro, lado) * (1 - Math.exp(-dt * RAPIDEZ_NA_CONVERSA))
    }
    // Tapada de perto (o tronco atrás, no deque): primeiro a câmera gira para o lado livre, como
    // nos jogos de terceira pessoa (o controle gira junto, a frente continua sendo a da tela);
    // sem lado livre, sobe por cima do ombro. Os dois andam aos poucos, e o raio final é o da
    // posição em que a câmera está de verdade.
    let alvoDaSubida = 0
    const tapada = !dentro && lancar(inclinacao) < dist * GRUA_DA_CAMERA.tapada
    let girou = false
    if (tapada && !arrastandoAgora.current) {
      for (const angulo of GRUA_DA_CAMERA.giros) {
        for (const sentido of [lado.current, -lado.current]) {
          const giro = rastro.giro + sentido * angulo
          if (lancar(inclinacao, giro) < dist * GRUA_DA_CAMERA.basta) continue
          const passo = Math.min(angulo, GRUA_DA_CAMERA.giroPorSegundo * dt)
          rastro.giro += sentido * passo
          lado.current = sentido
          girou = true
          break
        }
        if (girou) break
      }
    }
    if (tapada && !girou) {
      let melhor = lancar(inclinacao)
      for (const extra of GRUA_DA_CAMERA.subidas) {
        const livreAqui = lancar(Math.min(inclinacao + extra, GRUA_DA_CAMERA.inclinacaoMaxima))
        if (livreAqui > melhor + GRUA_DA_CAMERA.ganhoMinimo) {
          melhor = livreAqui
          alvoDaSubida = extra
        }
      }
    }
    subida.current += (alvoDaSubida - subida.current) * k
    inclinacao = Math.min(
      inclinacao + subida.current,
      Math.max(inclinacao, GRUA_DA_CAMERA.inclinacaoMaxima),
    )
    const dx = Math.sin(rastro.giro) * Math.cos(inclinacao)
    const dy = Math.sin(inclinacao)
    const dz = Math.cos(rastro.giro) * Math.cos(inclinacao)
    const livre = dentro ? dist : lancar(inclinacao)
    const antes = atual.current
    atual.current = distanciaDaCamera(
      antes,
      dist,
      livre,
      dt,
      VOLTA_DA_CAMERA,
      DISTANCIA_MINIMA_DA_CAMERA,
    )
    desejada.current.set(
      alvo.current.x + dx * atual.current,
      alvo.current.y + dy * atual.current,
      alvo.current.z + dz * atual.current,
    )
    // Não entra no chão.
    const chao = alturaDaIlha(desejada.current.x, desejada.current.z) + 0.6
    if (desejada.current.y < chao) desejada.current.y = chao
    // Encostando numa parede, vai direto (seguir devagar passaria por dentro dela).
    if (atual.current < antes - 0.01) camera.position.copy(desejada.current)
    else camera.position.lerp(desejada.current, k)
    // Dois destinos livres podem ter uma parede no meio da interpolação. A elevação
    // pelo chão também muda a direção: conferir a posição final, depois de ambos.
    if (!dentro) {
      const cx = camera.position.x - alvo.current.x
      const cy = camera.position.y - alvo.current.y
      const cz = camera.position.z - alvo.current.z
      const comprimento = Math.hypot(cx, cy, cz)
      if (comprimento > 0) {
        const seguro = lancar(Math.atan2(cy, Math.hypot(cx, cz)), Math.atan2(cx, cz), comprimento)
        limitarPosicaoDaCamera(alvo.current, camera.position, seguro)
      }
    }
    // Na conversa ela olha um pouco abaixo das cabeças (a sonda continua saindo delas).
    camera.lookAt(
      alvo.current.x + adiante.current.x,
      alvo.current.y - ABAIXO_NA_CONVERSA * pesos.conversa,
      alvo.current.z + adiante.current.z,
    )
  })
  return null
}
