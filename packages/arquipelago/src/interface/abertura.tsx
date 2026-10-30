import { useReducedMotion } from '@sistemazero/avatar-quarto/use-reduced-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { lojaDaAbertura, marcarAberturaVista } from '../estado/abertura'
import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import { useToque } from '../estado/preferencias'
import {
  boasVindas,
  CENAS,
  inicioDaCena,
  momentoDaAbertura,
  PAINEL_DA_ABERTURA,
  SAIDA_DA_ABERTURA_MS,
  SEGURAR_PARA_PULAR_MS,
} from '../sistemas/abertura'
import { salvamentoPausado } from '../sistemas/pausa'
import { PINTURAS } from './abertura-cenas'
import { comecarPassosSozinho } from './primeiros-passos'

/** Teclas que a abertura toma para si (o personagem por baixo não pula nem anda com elas). */
const TECLAS_DA_ABERTURA = new Set(['Space', 'Enter', 'NumpadEnter', 'ArrowRight'])

/** Uma pausa maior que esta no relógio (aba escondida) não conta: a abertura espera. */
const PAUSA_DO_RELOGIO_MS = 500

/**
 * Quem pulou segurando Espaço pode continuar segurando depois que a abertura fecha: o Espaço fica
 * com ela até ser solto, para o personagem não pular sozinho logo de cara.
 */
function engolirEspacoAteSoltar() {
  const limpar = () => {
    window.removeEventListener('keydown', engolir, { capture: true })
    window.removeEventListener('keyup', engolir, { capture: true })
    window.removeEventListener('blur', limpar)
  }
  const engolir = (e: KeyboardEvent) => {
    if (e.code !== 'Space') return
    e.preventDefault()
    e.stopImmediatePropagation()
    if (e.type === 'keyup') limpar()
  }
  window.addEventListener('keydown', engolir, { capture: true })
  window.addEventListener('keyup', engolir, { capture: true })
  window.addEventListener('blur', limpar, { once: true })
}

/**
 * A abertura "O Cinza": o livro ilustrado que conta a história, uma pintura por cena, com a legenda
 * sempre ligada. Um toque (ou Enter, ou a seta para a direita) passa para a próxima cena; segurar
 * Espaço (ou o botão) pula tudo; Esc fecha (pelo HUD, como todo painel). No fim, a tela entra pela
 * janela acesa e o jogo aparece. Quem abre é o `jogo.tsx` (primeira vez) ou o diário (rever):
 * só a primeira vez termina com a marca de vista e a fala do Zappy. Fechada à força (a tela do
 * tempo, o salvamento parado), ela não conta como vista e volta na próxima vez.
 */
export function Abertura() {
  const { loja, plataforma, rastro, controle } = useJogo()
  const toque = useToque()
  const aparelhoPedeMenos = useReducedMotion()
  const jogoPedeMenos = useConforto(lojaDoConforto(loja), (s) => s.conforto.menosMovimento)
  const menosMovimento = aparelhoPedeMenos || jogoPedeMenos
  const [indice, setIndice] = useState(0)
  const [falaDaVez, setFalaDaVez] = useState(0)
  const [saindo, setSaindo] = useState(false)
  const [segurando, setSegurando] = useState(false)
  /** O instante (relógio da página) em que a abertura "começou", contando os saltos de cena. */
  const comeco = useRef(performance.now())
  const segurouEm = useRef<number | null>(null)
  const espacoApertado = useRef(false)
  const saiu = useRef(false)
  const timerDaSaida = useRef<ReturnType<typeof setTimeout> | null>(null)
  const palco = useRef<HTMLButtonElement>(null)
  const pular = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    palco.current?.focus({ preventScroll: true })
    return () => {
      if (timerDaSaida.current !== null) clearTimeout(timerDaSaida.current)
    }
  }, [])

  const sair = useCallback(() => {
    if (saiu.current) return
    saiu.current = true
    setSaindo(true)
    lojaDaAbertura(loja).getState().sair()
    timerDaSaida.current = setTimeout(() => {
      if (loja.getState().painelAberto === PAINEL_DA_ABERTURA) loja.getState().abrirPainel(null)
    }, SAIDA_DA_ABERTURA_MS)
  }, [loja])

  const proxima = useCallback(() => {
    if (saiu.current) return
    const agora = momentoDaAbertura(performance.now() - comeco.current)
    if (agora.indice >= CENAS.length - 1) {
      sair()
      return
    }
    comeco.current = performance.now() - inicioDaCena(agora.indice + 1)
  }, [sair])

  // O relógio da abertura: só muda o React quando a cena ou a fala mudam.
  useEffect(() => {
    let quadro = 0
    let antes = performance.now()
    const passo = () => {
      const agora = performance.now()
      // Aba escondida (sem quadros): o tempo parado não conta, a cena continua de onde estava.
      if (agora - antes > PAUSA_DO_RELOGIO_MS) comeco.current += agora - antes
      antes = agora
      const m = momentoDaAbertura(agora - comeco.current)
      setIndice(m.indice)
      setFalaDaVez(CENAS[m.indice]!.falas.indexOf(m.fala))
      if (m.acabou) sair()
      if (segurouEm.current !== null && agora - segurouEm.current >= SEGURAR_PARA_PULAR_MS) {
        segurouEm.current = null
        setSegurando(false)
        sair()
      }
      quadro = requestAnimationFrame(passo)
    }
    passo()
    return () => cancelAnimationFrame(quadro)
  }, [sair])

  // Segurar Espaço pula; Enter e a seta passam a cena. Pega antes do teclado do personagem.
  useEffect(() => {
    const desce = (e: KeyboardEvent) => {
      if (!TECLAS_DA_ABERTURA.has(e.code)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.code === 'Space') espacoApertado.current = true
      if (e.repeat) return
      if (e.code === 'Space') {
        segurouEm.current = performance.now()
        setSegurando(true)
      } else if (e.target === pular.current) sair()
      else proxima()
    }
    const sobe = (e: KeyboardEvent) => {
      if (!TECLAS_DA_ABERTURA.has(e.code)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (e.code === 'Space') {
        espacoApertado.current = false
        segurouEm.current = null
        setSegurando(false)
      }
    }
    window.addEventListener('keydown', desce, { capture: true })
    window.addEventListener('keyup', sobe, { capture: true })
    return () => {
      window.removeEventListener('keydown', desce, { capture: true })
      window.removeEventListener('keyup', sobe, { capture: true })
    }
  }, [proxima, sair])

  // Só uma transição real do painel conta como fechamento. Desmontar a página, trocar perfil
  // ou o ciclo de efeitos do StrictMode não equivale a terminar/pular a história.
  useEffect(() => {
    let fechou = false
    return loja.subscribe((s, antes) => {
      if (
        fechou ||
        antes.painelAberto !== PAINEL_DA_ABERTURA ||
        s.painelAberto === PAINEL_DA_ABERTURA
      )
        return
      fechou = true
      const abertura = lojaDaAbertura(loja)
      const { origem } = abertura.getState()
      abertura.getState().abrir('rever')
      if (espacoApertado.current) engolirEspacoAteSoltar()
      const aForca = s.tempoPausado || s.tempoAcabou || salvamentoPausado(s.salvamentoSituacao)
      if (aForca || origem !== 'primeira') return
      marcarAberturaVista(plataforma.publico, plataforma.perfil.id)
      // Os primeiros passos começam aqui; a fala 1 deles já é a boas-vindas.
      if (comecarPassosSozinho({ loja, plataforma, rastro, controle }, true)) return
      if (!s.salvamento.casa.portaNova && !s.visita)
        s.dizer(boasVindas(plataforma.perfil.primeiroNome))
    })
  }, [loja, plataforma, rastro, controle])

  const cena = CENAS[indice]!
  const fala = cena.falas[Math.max(0, falaDaVez)] ?? cena.falas[0]!
  const Pintura = PINTURAS[cena.id]
  const soltar = () => {
    segurouEm.current = null
    setSegurando(false)
  }
  const classes = ['arq-abertura']
  if (menosMovimento) classes.push('parada')
  if (saindo) classes.push('saindo')
  return (
    <div
      className={classes.join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Abertura: O Cinza"
      style={{ ['--arq-ab-saida' as string]: `${SAIDA_DA_ABERTURA_MS}ms` }}
    >
      <button
        ref={palco}
        type="button"
        className="arq-abertura-palco"
        aria-label={`Próxima cena (${indice + 1} de ${CENAS.length})`}
        onClick={proxima}
      >
        <svg
          key={cena.id}
          className={`arq-abertura-pintura arq-ab-${cena.id}`}
          viewBox="0 0 960 540"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          style={{ ['--arq-ab-duracao' as string]: `${cena.duracaoMs}ms` }}
        >
          <Pintura />
        </svg>
      </button>
      <div className="arq-abertura-faixa cima" aria-hidden="true" />
      <div className="arq-abertura-faixa baixo" aria-hidden="true" />
      <div className="arq-abertura-legenda" aria-live="polite">
        <span className="arq-sr">{cena.descricao}</span>
        {fala.quem ? <b className="arq-abertura-quem">{fala.quem}</b> : null}
        <p key={`${cena.id}-${falaDaVez}`}>{fala.texto}</p>
      </div>
      <div className="arq-abertura-progresso" aria-hidden="true">
        {CENAS.map((c, i) => (
          <i key={c.id} className={i < indice ? 'vista' : i === indice ? 'agora' : undefined} />
        ))}
      </div>
      <button
        ref={pular}
        type="button"
        className={`arq-abertura-pular${segurando ? ' segurando' : ''}`}
        style={{ ['--arq-ab-segurar' as string]: `${SEGURAR_PARA_PULAR_MS}ms` }}
        aria-label="Pular a abertura (segure)"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          segurouEm.current = performance.now()
          setSegurando(true)
        }}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onLostPointerCapture={soltar}
        onClick={(e) => {
          // Sem ponteiro (leitor de tela, tecla de acessibilidade), um clique já pula.
          if (e.detail === 0) sair()
        }}
      >
        <span className="arq-abertura-anel" aria-hidden="true" />
        {toque ? 'Segure para pular' : 'Segure Espaço para pular'}
      </button>
    </div>
  )
}
