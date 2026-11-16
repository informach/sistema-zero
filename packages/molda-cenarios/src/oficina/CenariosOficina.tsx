import { type JSX, lazy, type ReactNode, Suspense, useEffect, useState } from 'react'
import { Chegando, Falhou, useCarga } from './pecas'
import type { CenariosHost } from './portas'
import { Biblioteca } from './telas/Biblioteca'
import { Inicio } from './telas/Inicio'
import { Jogo } from './telas/Jogo'

// O editor traz o motor 3D junto: só é baixado quando um cenário abre.
const Oficina = lazy(() => import('./telas/Oficina'))

export type RotaDosCenarios =
  | { tela: 'inicio'; aba: 'jogos' | 'bibliotecas' }
  | { tela: 'jogo'; jogoId: string }
  | { tela: 'biblioteca'; bibliotecaId: string; voltarAoJogo?: string }
  | { tela: 'oficina'; jogoId: string; cenarioId: string }

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
 * Molda Cenários: a oficina de cenários 3D. Jogos com os seus cenários, bibliotecas de modelos
 * e o editor. Tudo o que é dado vem do `host`.
 */
export function CenariosOficina({
  host,
  tema = 'light',
  rotaInicial = { tela: 'inicio', aba: 'jogos' },
  espacoInicial,
  aoNavegar,
  cabecalho,
}: CenariosOficinaProps): JSX.Element {
  const espacos = useCarga(() => host.espacos(), [host])
  const [rota, setRota] = useState<RotaDosCenarios>(rotaInicial)
  const [espacoId, setEspacoId] = useState<string | null>(espacoInicial ?? null)
  const espaco = espacos.dados?.find((e) => e.id === espacoId) ?? espacos.dados?.[0] ?? null

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
          jogoId={rota.jogoId}
          cenarioId={rota.cenarioId}
          tema={tema}
          aoVoltar={() => {
            espacos.recarregar()
            setRota({ tela: 'jogo', jogoId: rota.jogoId })
          }}
        />
      </Suspense>,
    )

  if (rota.tela === 'jogo')
    return raiz(
      <Jogo
        host={host}
        jogoId={rota.jogoId}
        espacoId={espaco.id}
        aoVoltar={() => setRota({ tela: 'inicio', aba: 'jogos' })}
        aoAbrirCenario={(cenarioId) => setRota({ tela: 'oficina', jogoId: rota.jogoId, cenarioId })}
        aoAbrirBiblioteca={(bibliotecaId) =>
          setRota({ tela: 'biblioteca', bibliotecaId, voltarAoJogo: rota.jogoId })
        }
      />,
    )

  if (rota.tela === 'biblioteca')
    return raiz(
      <Biblioteca
        host={host}
        bibliotecaId={rota.bibliotecaId}
        espacoId={espaco.id}
        aoVoltar={() => {
          espacos.recarregar()
          setRota(
            rota.voltarAoJogo
              ? { tela: 'jogo', jogoId: rota.voltarAoJogo }
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
      aoAbrirJogo={(jogoId) => setRota({ tela: 'jogo', jogoId })}
      aoAbrirBiblioteca={(bibliotecaId) => setRota({ tela: 'biblioteca', bibliotecaId })}
      cabecalho={cabecalho}
    />,
  )
}
