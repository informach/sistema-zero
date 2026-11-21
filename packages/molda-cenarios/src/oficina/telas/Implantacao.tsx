import {
  type AvisoDeImplantacao,
  conferirImplantacao,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  TIPOS_DE_AVISO_DE_IMPLANTACAO,
  type TipoDeAvisoDeImplantacao,
} from '@sistemazero/molda-cenarios-core/v2'
import { CircleCheck, Crosshair } from 'lucide-react'
import { type JSX, useMemo } from 'react'
import { Dialogo } from '../pecas'

/** O nome de cada tipo de aviso, como a lista mostra. */
const TITULOS: Record<TipoDeAvisoDeImplantacao, string> = {
  'ator-repetido': 'Mais de uma Íris na ilha',
  'ator-invalido': 'Ator que o jogo não conhece',
  'placa-incompleta': 'Placa sem tudo o que precisa',
  'fisica-invalida': 'Física que o jogo não aceita',
  'raio-do-tronco-invalido': 'Tronco com medida fora do limite',
  'enterrada-invalida': 'Enterrado com valor fora do limite',
  'fundacao-invalida': 'Fundação com medidas trocadas',
  'transformacao-do-papel': 'Papel do jogo com giro ou tamanho que ele recusa',
  'solido-no-caminho': 'Sólido no meio do caminho',
  flutuando: 'Flutuando',
  enterrado: 'Enterrado demais',
  'quase-no-mesmo-plano': 'Quase no mesmo plano (pode piscar)',
}

export function agruparAvisos(avisos: readonly AvisoDeImplantacao[]) {
  const grupos = new Map<TipoDeAvisoDeImplantacao, AvisoDeImplantacao[]>()
  for (const a of avisos) grupos.set(a.tipo, [...(grupos.get(a.tipo) ?? []), a])
  return TIPOS_DE_AVISO_DE_IMPLANTACAO.filter((t) => grupos.has(t)).map((tipo) => ({
    tipo,
    titulo: TITULOS[tipo] ?? tipo,
    avisos: grupos.get(tipo)!,
  }))
}

/**
 * Confere a montagem antes de publicar: o que flutua, o que afunda, o que tranca a passagem, o
 * que pode piscar e os dados do jogo que ele recusaria. Tocar num aviso escolhe o objeto e leva a
 * câmera até ele.
 */
export function Implantacao({
  documento,
  fonte,
  nomeDe,
  aoMostrar,
  aoEscolherTodos,
  aoFechar,
}: {
  documento: DocumentoDeCenario
  /** As alturas do relevo carregado; sem elas, num cenário com relevo, a conferência espera. */
  fonte: FonteDeAlturas | undefined
  nomeDe(id: string): string
  aoMostrar(id: string): void
  aoEscolherTodos(ids: string[]): void
  aoFechar(): void
}): JSX.Element {
  const resultado = useMemo(() => {
    if (documento.base.tipo === 'terreno' && !fonte) return { esperando: true as const }
    try {
      return { avisos: conferirImplantacao(documento, fonte ?? null) }
    } catch (erro) {
      return { erro: erro instanceof Error ? erro.message : 'Não consegui conferir agora.' }
    }
  }, [documento, fonte])
  const grupos = 'avisos' in resultado && resultado.avisos ? agruparAvisos(resultado.avisos) : []
  const todos = [...new Set(grupos.flatMap((g) => g.avisos.map((a) => a.conjunto ?? a.id)))]

  return (
    <Dialogo titulo="Conferir a implantação" aoFechar={aoFechar}>
      <p>
        Antes de publicar, veja o que está flutuando, enterrado, no meio do caminho ou quase no
        mesmo plano de outra superfície. Toque num aviso para ir até o objeto.
      </p>
      {'esperando' in resultado ? (
        <p role="status">Esperando o relevo terminar de carregar.</p>
      ) : 'erro' in resultado ? (
        <p role="alert">{resultado.erro}</p>
      ) : grupos.length === 0 ? (
        <p role="status" className="mcn-implantacao-ok">
          <CircleCheck aria-hidden="true" className="size-5" />
          Tudo assentado. Nenhum aviso.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <strong>
              {todos.length} {todos.length === 1 ? 'objeto com aviso' : 'objetos com aviso'}
            </strong>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              onClick={() => aoEscolherTodos(todos)}
            >
              Escolher todos no palco
            </button>
          </div>
          {grupos.map((g) => (
            <section key={g.tipo} className="mcn-implantacao-grupo" aria-label={g.titulo}>
              <h3>
                {g.titulo} <span>({g.avisos.length})</span>
              </h3>
              <ul>
                {g.avisos.slice(0, 100).map((a) => (
                  <li key={`${a.tipo}:${a.id}:${a.campo ?? ''}`}>
                    <button
                      type="button"
                      className="mcn-implantacao-aviso"
                      onClick={() => aoMostrar(a.conjunto ?? a.id)}
                    >
                      <Crosshair aria-hidden="true" className="size-4" />
                      <span>
                        <strong>{nomeDe(a.conjunto ?? a.id)}</strong>
                        <span>{a.mensagem}</span>
                        {a.detalhe ? <small>{a.detalhe}</small> : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {g.avisos.length > 100 ? <p>E mais {g.avisos.length - 100}.</p> : null}
            </section>
          ))}
        </>
      )}
    </Dialogo>
  )
}
