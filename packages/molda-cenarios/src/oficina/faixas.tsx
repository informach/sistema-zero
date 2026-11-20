import {
  type AbaDaOficina,
  FAMILIAS_DA_OFICINA,
  type FamiliaDaOficina,
  type FamiliaDaOficinaId,
} from '@sistemazero/molda-cenarios-core/v2'
import { createContext, type JSX, type ReactNode, useContext, useMemo } from 'react'

/**
 * As faixas de ferramentas do lado da tela, no mesmo formato do Molda (`MoldaToolAccess`): o host
 * traduz a jornada numa lista FECHADA de famílias liberadas e, se quiser, diz quando as outras
 * abrem (a frase vem pronta do host: a oficina nunca monta frase com nome de posto). Ausente =
 * tudo liberado (a equipe, o playground e os testes).
 *
 * Trancar tira a AUTORIA: o controle que cria ou muda aquilo some; o cenário que já usa a família
 * abre, testa e exporta intacto. O servidor confere o mesmo catálogo no lote.
 */
export interface AcessoAsFerramentas {
  allow: readonly string[]
  upcoming?: readonly { when: string; families: readonly string[] }[]
}

export interface LeitorDeFerramentas {
  /** A família está liberada para criar e mudar. */
  pode(id: FamiliaDaOficinaId): boolean
  /** O host mandou uma lista (existe alguma trava). */
  restrito: boolean
  /** O que vem depois NAQUELA aba, na ordem do host; grupos vazios somem. */
  porVir(aba: AbaDaOficina): { quando: string; familias: FamiliaDaOficina[] }[]
}

const POR_ID: ReadonlyMap<string, FamiliaDaOficina> = new Map(
  FAMILIAS_DA_OFICINA.map((f) => [f.id, f]),
)

const TUDO: LeitorDeFerramentas = { pode: () => true, restrito: false, porVir: () => [] }

export function lerAcessoAsFerramentas(
  acesso: AcessoAsFerramentas | undefined,
): LeitorDeFerramentas {
  if (!acesso) return TUDO
  const liberadas = new Set(acesso.allow)
  const grupos = (acesso.upcoming ?? []).map((g) => ({
    quando: g.when,
    familias: g.families.flatMap((id) => {
      const f = POR_ID.get(id)
      return f && !liberadas.has(f.id) ? [f] : []
    }),
  }))
  return {
    pode: (id) => liberadas.has(id),
    restrito: true,
    porVir: (aba) =>
      grupos
        .map((g) => ({ quando: g.quando, familias: g.familias.filter((f) => f.aba === aba) }))
        .filter((g) => g.familias.length > 0),
  }
}

const Contexto = createContext<LeitorDeFerramentas>(TUDO)

export function FerramentasDaOficina({
  acesso,
  children,
}: {
  acesso: AcessoAsFerramentas | undefined
  children: ReactNode
}): JSX.Element {
  const leitor = useMemo(() => lerAcessoAsFerramentas(acesso), [acesso])
  return <Contexto.Provider value={leitor}>{children}</Contexto.Provider>
}

export function useFerramentas(): LeitorDeFerramentas {
  return useContext(Contexto)
}

/**
 * "Ferramentas que vêm por aí": uma linha no fim do painel de cada aba que conta o que abre
 * depois e quando, sem controle nenhum dentro. Some quando nada daquela aba está trancado.
 */
export function FerramentasPorVir({ aba }: { aba: AbaDaOficina }): JSX.Element | null {
  const grupos = useFerramentas().porVir(aba)
  if (!grupos.length) return null
  return (
    <details className="mcn-por-vir mcn-painel-corpo">
      <summary>Ferramentas que vêm por aí</summary>
      {grupos.map((g) => (
        <div key={g.quando}>
          <p className="mcn-por-vir-quando">{g.quando}</p>
          <ul>
            {g.familias.map((f) => (
              <li key={f.id}>{f.rotulo}</li>
            ))}
          </ul>
        </div>
      ))}
    </details>
  )
}
