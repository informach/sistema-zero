import { Box3, PCFShadowMap, PerspectiveCamera, Vector3, WebGLRenderer } from 'three'
import { PersonagemDoTeste } from '../teste/personagem'
import { SessaoDoTeste } from '../teste/sessao'
import type { ComandoDoTeste, EntradaDoTeste, EstadoDoTeste } from '../teste/tipos'
import { carregarCenaDoEndereco } from './runtime-http'
import type { CenaNoThree } from './runtime-three'

export interface OpcoesDaExploracao {
  canvas: HTMLCanvasElement
  endereco: string | URL
  sinal: AbortSignal
  aoEstado?: (estado: EstadoDoTeste) => void
  aoErro: (erro: unknown) => void
}

/** Exemplo distribuído: mesmos movimento, câmera, colisão e figura neutra do Testar.
 * Não incorpora avatar privado, progresso, recompensas ou regras do jogo. */
export async function iniciarExploracaoDoCenario(opcoes: OpcoesDaExploracao) {
  const { canvas, sinal } = opcoes
  sinal.throwIfAborted()
  const janela = canvas.ownerDocument.defaultView
  if (!janela) throw Error('O canvas precisa estar em uma janela.')
  const renderer = new WebGLRenderer({ canvas, antialias: true }),
    camera = new PerspectiveCamera(50, 1, 0.02, 12000),
    alvo = new Vector3()
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  let cena: CenaNoThree | undefined,
    sessao: SessaoDoTeste | undefined,
    personagem: PersonagemDoTeste | undefined,
    observador: ResizeObserver | undefined,
    descartado = false,
    quadro = 0,
    ultimo = janela.performance.now()
  const descartar = () => {
    if (descartado) return
    descartado = true
    sinal.removeEventListener('abort', descartar)
    janela.cancelAnimationFrame(quadro)
    observador?.disconnect()
    if (sessao) sessao.descartar()
    else personagem?.descartar()
    cena?.descartar()
    renderer.dispose()
    renderer.forceContextLoss()
  }
  try {
    cena = await carregarCenaDoEndereco(opcoes.endereco, sinal, {
      maxTextura: renderer.capabilities.maxTextureSize,
    })
    sinal.throwIfAborted()
    const pronto = cena,
      inicio =
        pronto.dados.marcadores.find(
          (m) => m.configuracao?.tipo === 'inicio' && m.configuracao.principal,
        ) ?? pronto.dados.marcadores.find((m) => m.configuracao?.tipo === 'inicio'),
      posicao = inicio
        ? new Vector3(inicio.posicao.x, inicio.posicao.y, inicio.posicao.z)
        : new Vector3()
    if (!inicio) {
      const volume = new Box3()
      for (const n of pronto.dados.nos) {
        volume.expandByPoint(new Vector3(n.volume.min.x, n.volume.min.y, n.volume.min.z))
        volume.expandByPoint(new Vector3(n.volume.max.x, n.volume.max.y, n.volume.max.z))
      }
      if (!volume.isEmpty()) {
        volume.getCenter(posicao)
        posicao.y =
          pronto.colisoes.rastrear(
            new Vector3(posicao.x, volume.max.y + 2, posicao.z),
            new Vector3(posicao.x, volume.min.y - 2, posicao.z),
          )?.ponto.y ?? posicao.y
      }
    }
    const config = { modo: 'terceira' as const, altura: 1.16, giroInicial: inicio?.giro ?? 0 }
    personagem = new PersonagemDoTeste(null, config)
    sessao = new SessaoDoTeste(
      canvas,
      camera,
      pronto.cena,
      pronto.colisoes,
      personagem,
      posicao,
      config,
      (estado) => opcoes.aoEstado?.(estado),
      () => {},
      pronto.agua.nivel,
    )
    const teste = sessao
    const redimensionar = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      renderer.setPixelRatio(Math.min(2, janela.devicePixelRatio || 1))
      renderer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    observador = new ResizeObserver(redimensionar)
    observador.observe(canvas)
    redimensionar()
    const desenhar = (agora: number) => {
      if (descartado) return
      const delta = Math.max(0, Math.min(0.1, (agora - ultimo) / 1000))
      ultimo = agora
      try {
        teste.quadro()
        pronto.atualizar(
          teste.estado().pausado ? 0 : delta,
          janela.matchMedia('(prefers-reduced-motion: reduce)').matches,
        )
        teste.foco(alvo)
        pronto.quadro(camera, alvo)
        renderer.render(pronto.cena, camera)
        quadro = janela.requestAnimationFrame(desenhar)
      } catch (erro) {
        descartar()
        opcoes.aoErro(erro)
      }
    }
    sinal.throwIfAborted()
    sinal.addEventListener('abort', descartar, { once: true })
    quadro = janela.requestAnimationFrame(desenhar)
    return {
      nome: pronto.dados.nome,
      revisao: pronto.dados.fonte.revisao,
      estado: () => teste.estado(),
      comandar(comando: ComandoDoTeste) {
        if (!descartado) teste.comandar(comando)
      },
      entrada(entrada: Partial<EntradaDoTeste>) {
        if (!descartado) teste.entrada(entrada)
      },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}
