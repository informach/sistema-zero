import { History, RotateCcw } from 'lucide-react'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import type { ControladorDaOficina } from '../controlador'
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
