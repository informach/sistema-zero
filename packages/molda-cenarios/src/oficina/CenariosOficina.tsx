import { type JSX, lazy, type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import { BIBLIOTECA_MOLDA_ID } from './moldes'
import { Chegando, Falhou, useCarga } from './pecas'
import type { CenariosHost } from './portas'
import { Biblioteca } from './telas/Biblioteca'
import { Inicio } from './telas/Inicio'
import { Moldes } from './telas/Moldes'
import { Mundo } from './telas/Mundo'

// O editor traz o motor 3D junto: só é baixado quando um cenário abre.
const Oficina = lazy(() => import('./telas/Oficina'))

export type RotaDosCenarios =
  | { tela: 'inicio'; aba: 'mundos' | 'bibliotecas' }
  | { tela: 'mundo'; mundoId: string }
  | { tela: 'biblioteca'; bibliotecaId: string; voltarAoMundo?: string }
  | {
      tela: 'oficina'
      mundoId: string
      cenarioId: string
      conjuntoId?: string
      retorno?: RotaDosCenarios
    }

export interface CenariosOficinaProps {
  host: CenariosHost
  tema?: 'light' | 'dark'
  /** Onde a ferramenta abre. O host pode guardar a rota no endereço da página. */
  rotaInicial?: RotaDosCenarios
  espacoInicial?: string
  aoNavegar?(rota: RotaDosCenarios, espacoId: string): void
  /** Botões do host no cabeçalho das telas de lista (menu, voltar). */
  cabecalho?: ReactNode
}

/**
 * Molda Cenários: a oficina de cenários 3D. Mundos com os seus cenários, bibliotecas de modelos
 * e o editor. Tudo o que é dado vem do `host`.
 */
export function CenariosOficina({
  host,
  tema = 'light',
  rotaInicial = { tela: 'inicio', aba: 'mundos' },
  espacoInicial,
  aoNavegar,
  cabecalho,
}: CenariosOficinaProps): JSX.Element {
  const espacos = useCarga(() => host.espacos(), [host])
  const [rota, setRota] = useState<RotaDosCenarios>(rotaInicial)
  const rotaAtual = useRef(rota),
    hostAtual = useRef(host),
    vivo = useRef(true)
  rotaAtual.current = rota
  hostAtual.current = host
  // biome-ignore lint/correctness/useExhaustiveDependencies: trocar o host encerra as respostas da conexão anterior
  useEffect(() => {
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [host])
  const [espacoId, setEspacoId] = useState<string | null>(espacoInicial ?? null)
  const espaco = espacos.dados?.find((e) => e.id === espacoId) ?? espacos.dados?.[0] ?? null
  const espacoAtual = useRef(espaco?.id)
  espacoAtual.current = espaco?.id

  const editarConjunto = async (id: string) => {
    const origem = rotaAtual.current
    let retorno: RotaDosCenarios | undefined = origem,
      niveis = 0
    while (retorno?.tela === 'oficina') {
      niveis++
      retorno = retorno.retorno
    }
    if (niveis >= 8)
      throw new Error('Volte a uma das oficinas anteriores antes de abrir outro conjunto')
    const espacoDeOrigem = espacoAtual.current
    const edicao = await host.editarConjuntoNaOficina(id)
    if (
      !vivo.current ||
      hostAtual.current !== host ||
      rotaAtual.current !== origem ||
      espacoAtual.current !== espacoDeOrigem
    )
      return
    setRota({
      tela: 'oficina',
      mundoId: edicao.mundo.id,
      cenarioId: edicao.cenario.resumo.id,
      conjuntoId: id,
      retorno: origem,
    })
  }

  useEffect(() => {
    if (espaco) aoNavegar?.(rota, espaco.id)
  }, [rota, espaco, aoNavegar])

  const raiz = (conteudo: ReactNode) => (
    <div
      data-molda-theme={tema}
      className="mcn-raiz flex min-h-0 flex-1 flex-col bg-mld-bg text-mld-text"
    >
      {conteudo}
    </div>
  )

  if (espacos.falhou)
    return raiz(
      <div className="mcn-centro">
        <Falhou aoTentar={espacos.recarregar} />
      </div>,
    )
  if (!espaco)
    return raiz(
      <div className="mcn-centro">
        <Chegando />
      </div>,
    )

  if (rota.tela === 'oficina')
    return raiz(
      <Suspense
        fallback={
          <div className="mcn-centro">
            <Chegando />
          </div>
        }
      >
        <Oficina
          host={host}
          espacoId={espaco.id}
          mundoId={rota.mundoId}
          cenarioId={rota.cenarioId}
          conjuntoId={rota.conjuntoId}
          aoEditarConjunto={editarConjunto}
          tema={tema}
          moldesDisponiveis={espaco.tipo === 'conta' && Boolean(host.molda)}
          aoVoltar={() => {
            espacos.recarregar()
            setRota(
              rota.retorno ??
                (rota.conjuntoId
                  ? { tela: 'inicio', aba: 'bibliotecas' }
                  : { tela: 'mundo', mundoId: rota.mundoId }),
            )
          }}
        />
      </Suspense>,
    )

  if (rota.tela === 'mundo')
    return raiz(
      <Mundo
        host={host}
        mundoId={rota.mundoId}
        espacoId={espaco.id}
        moldesDisponiveis={espaco.tipo === 'conta' && Boolean(host.molda)}
        aoVoltar={() => setRota({ tela: 'inicio', aba: 'mundos' })}
        aoAbrirCenario={(cenarioId) =>
          setRota({ tela: 'oficina', mundoId: rota.mundoId, cenarioId })
        }
        aoAbrirBiblioteca={(bibliotecaId) =>
          setRota({ tela: 'biblioteca', bibliotecaId, voltarAoMundo: rota.mundoId })
        }
      />,
    )

  if (
    rota.tela === 'biblioteca' &&
    rota.bibliotecaId === BIBLIOTECA_MOLDA_ID &&
    host.molda &&
    espaco.tipo === 'conta'
  )
    return raiz(
      <Moldes
        fonte={host.molda}
        aoAbrirCopias={async () => {
          const b = await host.obterBibliotecaDoMolda(espaco.id)
          setRota({ tela: 'biblioteca', bibliotecaId: b.id })
        }}
        aoVoltar={() =>
          setRota(
            rota.voltarAoMundo
              ? { tela: 'mundo', mundoId: rota.voltarAoMundo }
              : { tela: 'inicio', aba: 'bibliotecas' },
          )
        }
      />,
    )

  if (rota.tela === 'biblioteca')
    return raiz(
      <Biblioteca
        host={host}
        bibliotecaId={rota.bibliotecaId}
        espacoId={espaco.id}
        aoEditarConjunto={editarConjunto}
        aoVoltar={() => {
          espacos.recarregar()
          setRota(
            rota.voltarAoMundo
              ? { tela: 'mundo', mundoId: rota.voltarAoMundo }
              : { tela: 'inicio', aba: 'bibliotecas' },
          )
        }}
      />,
    )

  return raiz(
    <Inicio
      host={host}
      espacos={espacos.dados ?? []}
      espaco={espaco}
      aoTrocarEspaco={setEspacoId}
      aba={rota.aba}
      aoTrocarAba={(aba) => setRota({ tela: 'inicio', aba })}
      aoAbrirMundo={(mundoId) => setRota({ tela: 'mundo', mundoId })}
      aoAbrirBiblioteca={(bibliotecaId) => setRota({ tela: 'biblioteca', bibliotecaId })}
      cabecalho={cabecalho}
    />,
  )
}
