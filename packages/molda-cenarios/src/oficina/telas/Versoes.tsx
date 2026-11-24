import { Download, FileUp, History, RotateCcw } from 'lucide-react'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import type { ControladorDaOficina } from '../controlador'
import {
  type DocumentoAberto,
  lerDocumentoParaAbrir,
  nomeDoArquivoDoDocumento,
  textoDoDocumento,
} from '../documento-json'
import { Capa, Chegando, Dialogo, Falhou } from '../pecas'
import type { CenariosHost, PaginaDeRevisoes } from '../portas'
import type { FotoDaRevisao } from '../useRetratos'

const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function Versoes({
  host,
  cenarioId,
  revisaoAtual,
  controlador,
  aoFechar,
  fotoRecente,
}: {
  host: CenariosHost
  cenarioId: string
  revisaoAtual: number
  controlador: ControladorDaOficina
  aoFechar(): void
  fotoRecente?: FotoDaRevisao | null
}): JSX.Element {
  const [pagina, setPagina] = useState<PaginaDeRevisoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [restaurando, setRestaurando] = useState(false)
  const [ampliada, setAmpliada] = useState<{
    revisao: number
    endereco: string
    falhou?: boolean
  } | null>(null)
  const [aberto, setAberto] = useState<DocumentoAberto | null>(null)
  const [abrindo, setAbrindo] = useState(false)
  const escolherArquivo = useRef<HTMLInputElement>(null)
  const baixarDocumento = () => {
    const { documento } = controlador.getState()
    const url = URL.createObjectURL(
      new Blob([textoDoDocumento(documento)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = nomeDoArquivoDoDocumento(documento.nome, revisaoAtual)
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const lerArquivo = async (arquivo: File) => {
    const idDoCenario = controlador.getState().documento.id
    setAberto(lerDocumentoParaAbrir(await arquivo.text(), idDoCenario))
  }
  const abrirDocumento = async () => {
    if (!aberto?.ok || abrindo) return
    setAbrindo(true)
    const aceito = controlador.executar([
      { tipo: 'cenario.restaurar', documento: aberto.documento },
    ])
    if (!aceito) {
      setAbrindo(false)
      setAberto({ ok: false, motivo: 'A oficina está ocupada. Tente de novo em instantes.' })
      return
    }
    // A gravação é conferida no servidor: modelo ou peça do relevo fora do espaço é recusado.
    const fim = Date.now() + 30_000
    while (Date.now() < fim && controlador.getState().salvamento === 'guardando')
      await new Promise((r) => setTimeout(r, 100))
    if (!vivo.current) return
    setAbrindo(false)
    const { recusa, salvamento } = controlador.getState()
    if (salvamento === 'guardado') aoFechar()
    else
      setAberto({
        ok: false,
        motivo:
          recusa ??
          (salvamento === 'desatualizado'
            ? 'O cenário mudou em outro lugar. Feche e abra de novo antes de abrir o documento.'
            : 'Não consegui guardar o documento agora. Tente de novo.'),
      })
  }
  const vivo = useRef(true)
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])
  const consulta = useRef(0)
  const buscar = useCallback(
    async (antes?: number) => {
      const vez = ++consulta.current
      setCarregando(true)
      setErro(false)
      try {
        const proxima = await host.listarRevisoes(cenarioId, antes)
        if (vivo.current && consulta.current === vez)
          setPagina((p) => ({
            ...proxima,
            itens: antes === undefined ? proxima.itens : [...(p?.itens ?? []), ...proxima.itens],
          }))
      } catch {
        if (vivo.current && consulta.current === vez) setErro(true)
      } finally {
        if (vivo.current && consulta.current === vez) setCarregando(false)
      }
    },
    [host, cenarioId],
  )
  useEffect(() => {
    void buscar()
  }, [buscar])
  const restaurar = async () => {
    if (confirmando === null || restaurando) return
    setRestaurando(true)
    await controlador.restaurar(confirmando)
    if (!vivo.current) return
    setRestaurando(false)
    if (controlador.getState().salvamento === 'guardado') aoFechar()
    else setErro(true)
  }
  const versao = (revisao: number, criadoEm?: string, miniatura?: string | null) => {
    const endereco = fotoRecente?.revisao === revisao ? fotoRecente.endereco : (miniatura ?? null)
    return (
      <li key={revisao} className="mcn-versao">
        <button
          type="button"
          className="mcn-versao-retrato"
          disabled={!endereco}
          aria-label={
            endereco ? `Ver retrato da versão ${revisao}` : `Versão ${revisao} sem retrato`
          }
          onClick={() => {
            if (endereco) setAmpliada({ revisao, endereco })
          }}
        >
          <Capa key={endereco} endereco={endereco} reserva={<History />} ajuste="conter" />
        </button>
        <div>
          <strong>{revisao === 0 ? 'Versão inicial' : `Versão ${revisao}`}</strong>
          {criadoEm ? <time dateTime={criadoEm}>{data.format(new Date(criadoEm))}</time> : null}
        </div>
        {revisao === revisaoAtual ? (
          <span>Atual</span>
        ) : (
          <button
            type="button"
            className="sz-tool-pill"
            disabled={restaurando}
            onClick={() => setConfirmando(revisao)}
            aria-label={`Voltar à versão ${revisao}`}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            Voltar
          </button>
        )}
      </li>
    )
  }
  return (
    <Dialogo
      titulo="Versões do cenário"
      aoFechar={() => {
        if (!restaurando) aoFechar()
      }}
    >
      <p>Você pode voltar a uma versão guardada. Depois, ainda pode desfazer essa volta.</p>
      <section className="mcn-documento-json" aria-label="Documento do cenário em arquivo">
        <p>
          O documento guarda onde cada coisa está, sem copiar os modelos. Baixe para guardar uma
          cópia, ou abra um documento para continuar dele.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="sz-tool-pill" onClick={baixarDocumento}>
            <Download aria-hidden="true" className="size-4" />
            Baixar documento (.json)
          </button>
          <button
            type="button"
            className="sz-tool-pill"
            disabled={abrindo || restaurando}
            onClick={() => escolherArquivo.current?.click()}
          >
            <FileUp aria-hidden="true" className="size-4" />
            Abrir documento
          </button>
          <input
            ref={escolherArquivo}
            type="file"
            accept="application/json,.json"
            hidden
            aria-hidden="true"
            tabIndex={-1}
            onChange={(evento) => {
              const arquivo = evento.target.files?.[0]
              evento.target.value = ''
              if (arquivo) void lerArquivo(arquivo)
            }}
          />
        </div>
        {aberto && !aberto.ok ? <p role="alert">{aberto.motivo}</p> : null}
        {aberto?.ok ? (
          <div className="mcn-confirmar-versao">
            <strong>
              Abrir o documento “{aberto.nome}”, com {aberto.objetos}{' '}
              {aberto.objetos === 1 ? 'objeto' : 'objetos'}?
            </strong>
            <span>Ele toma o lugar do cenário de agora. Depois, ainda dá para desfazer.</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="sz-tool-pill"
                disabled={abrindo}
                onClick={() => setAberto(null)}
              >
                Continuar como está
              </button>
              <button
                type="button"
                className="sz-tool-pill sz-tool-pill--primary"
                disabled={abrindo}
                onClick={() => void abrirDocumento()}
              >
                {abrindo ? 'Guardando…' : 'Abrir este documento'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
      {ampliada ? (
        <figure className="mcn-retrato-ampliado">
          {ampliada.falhou ? (
            <p role="alert">Não consegui abrir este retrato.</p>
          ) : (
            <img
              src={ampliada.endereco}
              alt={`Retrato guardado da versão ${ampliada.revisao}`}
              onError={() => setAmpliada((atual) => (atual ? { ...atual, falhou: true } : null))}
            />
          )}
          <figcaption>Versão {ampliada.revisao}</figcaption>
          <button type="button" className="sz-tool-pill" onClick={() => setAmpliada(null)}>
            Fechar retrato
          </button>
        </figure>
      ) : null}
      {confirmando !== null ? (
        <div className="mcn-confirmar-versao">
          <strong>Voltar à versão {confirmando}?</strong>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="sz-tool-pill"
              disabled={restaurando}
              onClick={() => setConfirmando(null)}
            >
              Continuar como está
            </button>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--primary"
              disabled={restaurando}
              onClick={() => void restaurar()}
            >
              {restaurando ? 'Guardando…' : 'Voltar a esta versão'}
            </button>
          </div>
        </div>
      ) : null}
      {erro ? (
        <Falhou
          texto={controlador.getState().recusa ?? 'Não consegui abrir as versões agora.'}
          aoTentar={() => void buscar()}
        />
      ) : null}
      {pagina ? (
        <>
          <ul className="mcn-versoes">
            {pagina.itens
              .filter((r) => pagina.inicio !== null && r.revisao >= pagina.inicio)
              .map((r) => versao(r.revisao, r.criadoEm, r.miniatura))}
          </ul>
          {pagina.inicio !== null && !pagina.itens.some((r) => r.revisao === pagina.inicio) ? (
            <ul className="mcn-versoes">
              {versao(pagina.inicio, undefined, pagina.retratoInicial)}
            </ul>
          ) : null}
          {pagina.proximo !== null ? (
            <button
              type="button"
              className="sz-tool-pill"
              disabled={carregando}
              onClick={() => void buscar(pagina.proximo!)}
            >
              Ver mais versões
            </button>
          ) : null}
          {!pagina.itens.length ? <p>A primeira mudança guardada vai aparecer aqui.</p> : null}
        </>
      ) : null}
      {carregando ? <Chegando /> : null}
    </Dialogo>
  )
}
