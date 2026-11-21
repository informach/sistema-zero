import { Button } from '@sistemazero/molda/ui'
import type {
  PerfilDePublicacao,
  VersaoPublicada,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { Loader2 } from 'lucide-react'
import { type JSX, type Ref, useEffect, useId, useRef, useState } from 'react'
import { PublicacaoDesatualizada, type PublicacoesDeCenariosHost } from '../publicacoes'

export type ListaDeVersoes =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; versoes: readonly VersaoPublicada[] }
  | { tipo: 'erro'; mensagem: string }
export type EstadoDaVolta =
  | { tipo: 'parado' }
  | { tipo: 'confirmando'; id: string; aceite: boolean }
  | { tipo: 'voltando'; id: string }
  | { tipo: 'erro'; id: string; mensagem: string; mudou: boolean }
  | { tipo: 'feito'; de: number; para: number }
/** A operação da última tentativa: repetir o mesmo pedido usa o mesmo id. */
export interface OperacaoDaVolta {
  chave: string
  id: string
}

const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const quando = (iso: string) => {
  const data = new Date(iso)
  return Number.isNaN(data.getTime()) ? '' : DATA.format(data)
}
const seletorDo = (atributo: string, id: string) => `[${atributo}="${id}"]`

/**
 * Põe no ar o conteúdo de uma versão guardada, como versão nova. Tentar de novo depois de uma
 * falha repete a MESMA operação (o servidor devolve a versão já criada, sem outra); conflito
 * com outra publicação vira `mudou`, para a tela pedir uma lista nova antes de tentar.
 */
export async function executarVolta(
  porta: PublicacoesDeCenariosHost,
  alvo: { ilha: PerfilDePublicacao['ilha']; versao: VersaoPublicada; noAr: VersaoPublicada },
  anterior: OperacaoDaVolta | null,
  sinal?: AbortSignal,
  novoId: () => string = () => crypto.randomUUID(),
): Promise<{ estado: EstadoDaVolta; operacao: OperacaoDaVolta | null }> {
  const { ilha, versao, noAr } = alvo
  const chave = JSON.stringify([ilha, versao.id, noAr.versao])
  const operacao = anterior?.chave === chave ? anterior : { chave, id: novoId() }
  try {
    const r = await porta.voltarParaVersao(
      {
        perfil: { tipo: 'arquipelago-v2', ilha },
        versaoEsperada: noAr.versao,
        operacaoId: operacao.id,
        versao,
      },
      sinal,
    )
    return {
      estado: { tipo: 'feito', de: versao.versao, para: r.publicacao.versao },
      operacao: null,
    }
  } catch (erro) {
    sinal?.throwIfAborted()
    return {
      estado: {
        tipo: 'erro',
        id: versao.id,
        mudou: erro instanceof PublicacaoDesatualizada,
        mensagem:
          erro instanceof Error ? erro.message : 'Não consegui voltar para esta versão agora.',
      },
      operacao,
    }
  }
}

/** A lista desenhada a partir do estado: sem efeitos, para a tela e os testes. */
export function ListaDasVersoes({
  nomeDaIlha,
  cenarioAberto,
  lista,
  volta,
  bloqueado,
  caixa,
  aoAbrir,
  aoMarcar,
  aoDesistir,
  aoVoltar,
  aoConferirDeNovo,
}: {
  nomeDaIlha: string
  cenarioAberto?: string
  lista: ListaDeVersoes
  volta: EstadoDaVolta
  /** Publicando ou gerando: nada volta enquanto isso. */
  bloqueado: boolean
  caixa?: Ref<HTMLElement>
  aoAbrir(v: VersaoPublicada): void
  aoMarcar(v: VersaoPublicada, aceite: boolean): void
  aoDesistir(v: VersaoPublicada): void
  aoVoltar(v: VersaoPublicada): void
  aoConferirDeNovo(v: VersaoPublicada): void
}): JSX.Element {
  const titulo = useId()
  const noAr = lista.tipo === 'pronto' ? lista.versoes.find((v) => v.atual) : undefined
  const ocupado = volta.tipo === 'voltando'
  return (
    <section
      ref={caixa}
      className="mcn-publicar-versoes"
      aria-labelledby={titulo}
      aria-busy={lista.tipo === 'carregando' || ocupado}
    >
      <h4 id={titulo} className="mcn-publicar-versoes-titulo">
        Versões publicadas nesta ilha
      </h4>
      {lista.tipo === 'carregando' ? (
        <p role="status" className="text-mld-muted text-sm">
          Conferindo as versões…
        </p>
      ) : null}
      {lista.tipo === 'erro' ? (
        <p role="alert" className="text-mld-danger text-sm">
          {lista.mensagem}
        </p>
      ) : null}
      {lista.tipo === 'pronto' && !lista.versoes.length ? (
        <p className="text-mld-muted text-sm">{nomeDaIlha} ainda não tem versões publicadas.</p>
      ) : null}
      {lista.tipo === 'pronto' && lista.versoes.length ? (
        <ol className="mcn-publicar-versoes-lista">
          {lista.versoes.map((v) => {
            const daqui = 'id' in volta && volta.id === v.id ? volta : null
            const data = quando(v.publicadaEm)
            return (
              <li key={v.id} className="mcn-publicar-versao" data-atual={v.atual || undefined}>
                <div className="mcn-publicar-versao-linha">
                  <span className="mcn-publicar-versao-nome">
                    <strong>Versão {v.versao}</strong>
                    {v.atual ? <span className="mcn-publicar-no-ar">No ar</span> : null}
                  </span>
                  <span className="mcn-publicar-versao-detalhe">
                    Revisão {v.fonte.revisao}{' '}
                    {v.fonte.cenario === cenarioAberto ? 'deste cenário' : 'de outro cenário'}
                    {data ? (
                      <>
                        {' · '}
                        <time dateTime={v.publicadaEm}>{data}</time>
                      </>
                    ) : null}
                  </span>
                  {v.atual || daqui ? null : (
                    <Button
                      size="compact"
                      data-voltar={v.id}
                      disabled={bloqueado || ocupado || !noAr}
                      onClick={() => aoAbrir(v)}
                    >
                      Voltar para esta versão
                      <span className="sr-only"> (versão {v.versao})</span>
                    </Button>
                  )}
                </div>
                {daqui && noAr ? (
                  <div className="mcn-publicar-versao-confirmar">
                    <label className="mcn-opcao">
                      <input
                        type="checkbox"
                        data-confirmar={v.id}
                        checked={daqui.tipo === 'confirmando' ? daqui.aceite : true}
                        disabled={daqui.tipo !== 'confirmando'}
                        onChange={(ev) => aoMarcar(v, ev.target.checked)}
                      />
                      <span>
                        Confirmo voltar {nomeDaIlha} para o conteúdo da versão {v.versao}.
                        <small>
                          Ele entra no ar como versão {noAr.versao + 1}. As outras versões continuam
                          guardadas.
                        </small>
                      </span>
                    </label>
                    {daqui.tipo === 'voltando' ? (
                      <p
                        role="status"
                        aria-live="polite"
                        className="flex items-center gap-2 font-semibold text-sm"
                      >
                        <Loader2
                          aria-hidden="true"
                          className="size-4 animate-spin motion-reduce:animate-none"
                        />
                        Voltando para a versão {v.versao}…
                      </p>
                    ) : null}
                    {daqui.tipo === 'erro' ? (
                      <p role="alert" className="font-semibold text-mld-danger text-sm">
                        {daqui.mensagem}
                      </p>
                    ) : null}
                    <div className="mcn-publicar-versao-acoes">
                      <Button
                        variant="ghost"
                        size="compact"
                        disabled={daqui.tipo === 'voltando'}
                        onClick={() => aoDesistir(v)}
                      >
                        Cancelar
                      </Button>
                      {daqui.tipo === 'erro' && daqui.mudou ? (
                        <Button
                          variant="primary"
                          size="compact"
                          onClick={() => aoConferirDeNovo(v)}
                        >
                          Atualizar a lista
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="compact"
                          disabled={
                            bloqueado ||
                            daqui.tipo === 'voltando' ||
                            (daqui.tipo === 'confirmando' && !daqui.aceite)
                          }
                          onClick={() => aoVoltar(v)}
                        >
                          {daqui.tipo === 'erro' ? 'Tentar de novo' : 'Voltar agora'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      ) : null}
      {volta.tipo === 'feito' ? (
        <p role="status" tabIndex={-1} data-volta-feita="" className="mcn-publicar-versao-feito">
          Pronto! O conteúdo da versão {volta.de} está no ar como versão {volta.para}.
        </p>
      ) : null}
    </section>
  )
}

/**
 * As versões guardadas da ilha, a que está no ar primeiro. "Voltar para esta versão" pede a
 * mesma confirmação da publicação e põe o conteúdo dela no ar como uma versão nova.
 */
export default function VersoesDaIlha({
  porta,
  ilha,
  nomeDaIlha,
  cenarioAberto,
  recarga,
  bloqueado,
  aoMudar,
  aoOcupar,
}: {
  porta: PublicacoesDeCenariosHost
  ilha: PerfilDePublicacao['ilha']
  nomeDaIlha: string
  cenarioAberto?: string
  /** Muda quando a tela confere o destino de novo. */
  recarga: number
  bloqueado: boolean
  /** A versão no ar mudou: a tela confere o destino da publicação de novo. */
  aoMudar(): void
  aoOcupar(ocupado: boolean): void
}): JSX.Element {
  const [lista, setLista] = useState<ListaDeVersoes>({ tipo: 'carregando' }),
    [releitura, setReleitura] = useState(0),
    [volta, setVolta] = useState<EstadoDaVolta>({ tipo: 'parado' })
  const operacao = useRef<OperacaoDaVolta | null>(null),
    controle = useRef<AbortController | null>(null),
    caixa = useRef<HTMLElement | null>(null),
    focarEm = useRef<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: recarga e releitura pedem nova leitura
  useEffect(() => {
    const c = new AbortController()
    setLista((antes) => (antes.tipo === 'pronto' ? antes : { tipo: 'carregando' }))
    void porta.listarVersoes({ tipo: 'arquipelago-v2', ilha }, c.signal).then(
      (lidas) => {
        if (!c.signal.aborted) setLista({ tipo: 'pronto', versoes: lidas.versoes })
      },
      (erro) => {
        if (!c.signal.aborted)
          setLista({
            tipo: 'erro',
            mensagem:
              erro instanceof Error ? erro.message : 'Não consegui conferir as versões agora.',
          })
      },
    )
    return () => c.abort()
  }, [porta, ilha, recarga, releitura])
  useEffect(
    () => () => {
      controle.current?.abort()
    },
    [],
  )
  // O foco acompanha a ação: abre na confirmação, volta ao botão ao cancelar e vai ao recado
  // quando a versão volta ao ar.
  useEffect(() => {
    const id = focarEm.current
    if (!id) return
    focarEm.current = null
    caixa.current
      ?.querySelector<HTMLElement>(
        volta.tipo === 'feito'
          ? '[data-volta-feita]'
          : seletorDo(volta.tipo === 'parado' ? 'data-voltar' : 'data-confirmar', id),
      )
      ?.focus()
  })
  const voltar = async (v: VersaoPublicada) => {
    const noAr = lista.tipo === 'pronto' ? lista.versoes.find((x) => x.atual) : undefined
    if (!noAr || noAr.id === v.id || bloqueado || volta.tipo === 'voltando') return
    const c = new AbortController()
    controle.current?.abort()
    controle.current = c
    setVolta({ tipo: 'voltando', id: v.id })
    aoOcupar(true)
    try {
      const r = await executarVolta(porta, { ilha, versao: v, noAr }, operacao.current, c.signal)
      operacao.current = r.operacao
      focarEm.current = v.id
      setVolta(r.estado)
      if (r.estado.tipo === 'feito') {
        setReleitura((n) => n + 1)
        aoMudar()
      }
    } catch {
      // Interrompida ao sair da tela ou trocar de ilha: nada a mostrar.
    } finally {
      if (controle.current === c) {
        controle.current = null
        aoOcupar(false)
      }
    }
  }
  return (
    <ListaDasVersoes
      caixa={caixa}
      nomeDaIlha={nomeDaIlha}
      cenarioAberto={cenarioAberto}
      lista={lista}
      volta={volta}
      bloqueado={bloqueado}
      aoAbrir={(v) => {
        focarEm.current = v.id
        setVolta({ tipo: 'confirmando', id: v.id, aceite: false })
      }}
      aoMarcar={(v, aceite) => setVolta({ tipo: 'confirmando', id: v.id, aceite })}
      aoDesistir={(v) => {
        focarEm.current = v.id
        setVolta({ tipo: 'parado' })
      }}
      aoVoltar={(v) => void voltar(v)}
      aoConferirDeNovo={(v) => {
        focarEm.current = v.id
        operacao.current = null
        setVolta({ tipo: 'parado' })
        setReleitura((n) => n + 1)
        aoMudar()
      }}
    />
  )
}
