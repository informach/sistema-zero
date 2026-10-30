import { useMemo } from 'react'
import { lojaDaConstrucao, obraDe, useConstrucao } from '../estado/construcao'
import { useEstado, useJogo } from '../estado/contexto'
import {
  aconchegoDosComodos,
  aconchegoNaCelula,
  NIVEIS_DE_ACONCHEGO,
} from '../sistemas/construcao/aconchego'
import { loteDaCasa } from '../sistemas/construcao/lote'

/** Inspeção calculada por edição, sem relógio, escrita no jogo ou leitura da plataforma. */
export function PainelDeAconchego() {
  const { loja } = useJogo()
  const construcao = lojaDaConstrucao(loja)
  const onde = useConstrucao(construcao, (s) => s.onde)
  const cabana = useConstrucao(construcao, (s) => s.cabana)
  const celula = useConstrucao(construcao, (s) => s.celulaObservada)
  const obra = useEstado((s) => obraDe(s, onde))
  const projetos = useEstado((s) => s.salvamento.projetos)
  const quarto = useEstado((s) => s.quarto)
  const jornada = useEstado((s) => s.jornada)
  const lote = onde === 'casa' ? loteDaCasa(jornada) : cabana?.lote
  const comodos = useMemo(
    () =>
      obra && lote
        ? aconchegoDosComodos(obra, lote, projetos, onde === 'casa' ? quarto : undefined)
        : [],
    [obra, lote, projetos, quarto, onde],
  )
  const c = aconchegoNaCelula(comodos, celula) ?? (celula === null ? comodos[0] : undefined)
  return (
    <section id="arq-aconchego" className="arq-aconchego" aria-label="Aconchego do cômodo">
      <div className="arq-aconchego-topo">
        <label>
          <span>Aconchego</span>
          <select
            aria-label="Cômodo observado"
            value={c?.comodo.id ?? ''}
            onChange={(e) =>
              construcao
                .getState()
                .observarComodo(
                  comodos.find((v) => v.comodo.id === e.target.value)?.comodo.celulas[0] ?? null,
                )
            }
          >
            <option value="" disabled>
              Escolha um cômodo
            </option>
            {comodos.map((v, i) => (
              <option key={v.comodo.id} value={v.comodo.id}>
                {v.comodo.quarto ? 'Meu quarto' : `Cômodo ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="arq-botao leve"
          aria-label="Fechar aconchego"
          onClick={() => construcao.getState().mostrarAconchego(false)}
        >
          Fechar
        </button>
      </div>
      {c ? (
        <div aria-live="polite" aria-atomic="true">
          <p className="arq-aconchego-nivel">
            <span aria-hidden="true">
              {'★'.repeat(c.estrelas)}
              {'☆'.repeat(NIVEIS_DE_ACONCHEGO.length - c.estrelas)}
            </span>{' '}
            <strong>{c.nivel}</strong> <small>{c.total} pontos</small>
          </p>
          <dl>
            <div>
              <dt>Variedade</dt>
              <dd>{c.variedade}</dd>
            </div>
            <div>
              <dt>Luz</dt>
              <dd>{c.luz}</dd>
            </div>
            <div>
              <dt>Plantas</dt>
              <dd>{c.plantas}</dd>
            </div>
            <div>
              <dt>Capricho</dt>
              <dd>{c.capricho}</dd>
            </div>
            <div>
              <dt>Feito por você</dt>
              <dd>+{c.feitoPorVoce}</dd>
            </div>
          </dl>
          <p className="arq-aconchego-dica">{c.dica}</p>
        </div>
      ) : (
        <p>Toque dentro de um cômodo fechado com Olhar para ver o aconchego.</p>
      )}
    </section>
  )
}
