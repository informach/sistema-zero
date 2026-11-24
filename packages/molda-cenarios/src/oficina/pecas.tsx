import { Button } from '@sistemazero/molda/ui'
import { Loader2, Plus } from 'lucide-react'
import {
  type FormEvent,
  type JSX,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { COPY } from './copy'

/** Lê dados do host com os três estados de sempre: chegando, pronto e falhou. */
export function useCarga<T>(
  buscar: (sinal: AbortSignal) => Promise<T>,
  dependencias: readonly unknown[],
): { dados: T | null; falhou: boolean; carregando: boolean; recarregar(): void } {
  const [estado, setEstado] = useState<{ dados: T | null; falhou: boolean; carregando: boolean }>({
    dados: null,
    falhou: false,
    carregando: true,
  })
  const [volta, setVolta] = useState(0)
  const buscarAtual = useRef(buscar)
  buscarAtual.current = buscar
  // biome-ignore lint/correctness/useExhaustiveDependencies: quem chama diz do que a busca depende
  useEffect(() => {
    let vivo = true
    const controle = new AbortController()
    setEstado((atual) => ({ ...atual, carregando: true, falhou: false }))
    buscarAtual.current(controle.signal).then(
      (dados) => vivo && setEstado({ dados, falhou: false, carregando: false }),
      () => vivo && setEstado((atual) => ({ ...atual, falhou: true, carregando: false })),
    )
    return () => {
      vivo = false
      controle.abort()
    }
  }, [...dependencias, volta])
  const recarregar = useCallback(() => setVolta((v) => v + 1), [])
  return { ...estado, recarregar }
}

export function Chegando({ texto }: { texto?: string }): JSX.Element {
  return (
    <p role="status" className="mcn-chegando">
      <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
      {texto ?? 'Carregando'}
    </p>
  )
}

export function Falhou({ aoTentar, texto }: { aoTentar(): void; texto?: string }): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="font-semibold text-base text-mld-muted">{texto ?? COPY.inicio.falhou}</p>
      <button type="button" className="sz-tool-pill sz-tool-pill--primary" onClick={aoTentar}>
        {COPY.inicio.tentar}
      </button>
    </div>
  )
}

/** O cartão amarelo que abre a grade: criar um mundo, um cenário ou uma biblioteca. */
export function CartaoNovo({
  titulo,
  dica,
  aoCriar,
}: {
  titulo: string
  dica: string
  aoCriar(): void
}): JSX.Element {
  return (
    <button
      type="button"
      className="sz-tool-card sz-tool-card--new min-h-40 w-full flex-1"
      onClick={aoCriar}
    >
      <span className="sz-tool-new-dot" aria-hidden="true">
        <Plus />
      </span>
      <span className="sz-tool-card-title text-base">{titulo}</span>
      <span className="font-semibold text-mld-muted text-xs">{dica}</span>
    </button>
  )
}

export function Dialogo({
  titulo,
  aoFechar,
  children,
  className,
}: {
  titulo: string
  aoFechar(): void
  children: ReactNode
  className?: string
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  const idDoTitulo = useId()
  useEffect(() => {
    const dialogo = ref.current
    const focoAnterior =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (dialogo && !dialogo.open) dialogo.showModal()
    return () => {
      if (dialogo?.open) dialogo.close()
      if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true })
    }
  }, [])
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: o toque no fundo é um atalho; pelo teclado, Esc fecha
    <dialog
      ref={ref}
      className={`mcn-dialogo ${className ?? ''}`}
      aria-labelledby={idDoTitulo}
      onClose={() => {
        // close é enfileirado: o diálogo pode ter reaberto antes do evento,
        // inclusive quando StrictMode repete o ciclo de efeitos.
        if (ref.current && !ref.current.open) aoFechar()
      }}
      onCancel={(evento) => {
        evento.preventDefault()
        aoFechar()
      }}
      onClick={(evento) => {
        // Toque fora do cartão (no fundo escuro) fecha.
        if (evento.target === ref.current) aoFechar()
      }}
    >
      <div className="mcn-dialogo-cartao">
        <h2 id={idDoTitulo} className="mcn-dialogo-titulo">
          {titulo}
        </h2>
        {children}
      </div>
    </dialog>
  )
}

/** Pergunta um nome (criar ou mudar). Devolve o nome aparado, nunca vazio. */
export function DialogoDeNome({
  titulo,
  inicial,
  acao,
  aoConfirmar,
  aoFechar,
  children,
  nomeFixo = false,
}: {
  titulo: string
  inicial: string
  acao: string
  aoConfirmar(nome: string): Promise<void> | void
  aoFechar(): void
  children?: ReactNode
  nomeFixo?: boolean
}): JSX.Element {
  const [nome, setNome] = useState(inicial)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const idDoCampo = useId()
  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const limpo = nome.trim()
    if (!limpo) {
      setErro(COPY.nome.vazio)
      return
    }
    setOcupado(true)
    try {
      await aoConfirmar(limpo)
      aoFechar()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : COPY.inicio.falhou)
      setOcupado(false)
    }
  }
  return (
    <Dialogo
      titulo={titulo}
      aoFechar={() => {
        if (!ocupado) aoFechar()
      }}
    >
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <label htmlFor={idDoCampo} className="mcn-campo">
          <span>{COPY.nome.rotulo}</span>
          <input
            id={idDoCampo}
            // biome-ignore lint/a11y/noAutofocus: o diálogo existe para este campo
            autoFocus
            value={nome}
            disabled={ocupado || nomeFixo}
            maxLength={120}
            autoComplete="off"
            onChange={(evento) => {
              setNome(evento.target.value)
              setErro(null)
            }}
            onFocus={(evento) => evento.target.select()}
            aria-invalid={erro ? true : undefined}
          />
        </label>
        {children ? (
          <fieldset disabled={ocupado} className="contents">
            {children}
          </fieldset>
        ) : null}
        {erro ? (
          <p role="alert" className="font-semibold text-mld-danger text-sm">
            {erro}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={aoFechar} disabled={ocupado}>
            {COPY.nome.cancelar}
          </Button>
          <Button variant="primary" type="submit" disabled={ocupado} aria-busy={ocupado}>
            {acao}
          </Button>
        </div>
      </form>
    </Dialogo>
  )
}

export function DialogoDeApagar({
  titulo,
  texto,
  aoConfirmar,
  aoFechar,
}: {
  titulo: string
  texto: string
  aoConfirmar(): Promise<void> | void
  aoFechar(): void
}): JSX.Element {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  return (
    <Dialogo
      titulo={titulo}
      aoFechar={() => {
        if (!ocupado) aoFechar()
      }}
    >
      <p className="text-base text-mld-text">{texto}</p>
      {erro ? (
        <p role="alert" className="mt-3 font-semibold text-mld-danger text-sm">
          {erro}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={aoFechar} disabled={ocupado}>
          {COPY.nome.cancelar}
        </Button>
        <Button
          variant="danger"
          disabled={ocupado}
          aria-busy={ocupado}
          onClick={async () => {
            setOcupado(true)
            try {
              await aoConfirmar()
              aoFechar()
            } catch (falha) {
              setErro(falha instanceof Error ? falha.message : COPY.inicio.falhou)
              setOcupado(false)
            }
          }}
        >
          {COPY.nome.apagar}
        </Button>
      </div>
    </Dialogo>
  )
}

/** A imagem de um cartão, com o desenho de reserva quando ainda não há retrato. */
export function Capa({
  endereco,
  reserva,
  ajuste = 'cobrir',
}: {
  endereco: string | null
  reserva: ReactNode
  ajuste?: 'cobrir' | 'conter'
}): JSX.Element {
  const [quebrou, setQuebrou] = useState(false)
  return endereco && !quebrou ? (
    <img
      src={endereco}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setQuebrou(true)}
      className={`size-full ${ajuste === 'conter' ? 'object-contain' : 'object-cover'}`}
    />
  ) : (
    <span aria-hidden="true" className="mcn-capa-reserva">
      {reserva}
    </span>
  )
}
