import { History, RotateCcw } from 'lucide-react'
import { type JSX, useCallback, useEffect, useRef, useState } from 'react'
import type { ControladorDaOficina } from '../controlador'
import { Chegando, Dialogo, Falhou } from '../pecas'
import type { CenariosHost, PaginaDeRevisoes } from '../portas'

const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function Versoes({
  host,
  cenarioId,
  revisaoAtual,
  controlador,
  aoFechar,
}: {
  host: CenariosHost
  cenarioId: string
  revisaoAtual: number
  controlador: ControladorDaOficina
  aoFechar(): void
}): JSX.Element {
  const [pagina, setPagina] = useState<PaginaDeRevisoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [restaurando, setRestaurando] = useState(false)
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
  const versao = (revisao: number, criadoEm?: string) => (
    <li key={revisao} className="mcn-versao">
      <History aria-hidden="true" className="size-5 text-mld-muted" />
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
  return (
    <Dialogo titulo="Versões do cenário" aoFechar={aoFechar}>
      <p>Você pode voltar a uma versão guardada. Depois, ainda pode desfazer essa volta.</p>
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
              .map((r) => versao(r.revisao, r.criadoEm))}
          </ul>
          {pagina.inicio !== null && !pagina.itens.some((r) => r.revisao === pagina.inicio) ? (
            <ul className="mcn-versoes">{versao(pagina.inicio)}</ul>
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
