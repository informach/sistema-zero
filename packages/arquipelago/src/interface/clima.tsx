import { useEstado, useJogo } from '../estado/contexto'
import {
  CLIMAS,
  climaLiberado,
  FALA_DO_CLIMA,
  NOMES_DOS_CLIMAS,
  SIMBOLOS_DOS_CLIMAS,
} from '../sistemas/clima'

/**
 * A escolha do clima da sua ilha no menu (fase4-08): sol, nublado ou chuva. Aparece com a Ilha
 * das Nuvens aberta (a Iriê ensina). Vale na sessão; numa visita, a ilha é do irmão e não muda.
 */
export function ClimaDaSuaIlha() {
  const { loja } = useJogo()
  const liberado = useEstado((s) => climaLiberado(s.jornada))
  const clima = useEstado((s) => s.salvamento.clima)
  const visitando = useEstado((s) => s.visita !== null)
  if (!liberado || visitando) return null
  return (
    <section className="arq-conforto" aria-label="Clima da sua ilha">
      <h3 className="arq-menu-titulo">Clima da sua ilha</h3>
      <fieldset className="arq-escolha">
        <legend>Tempo</legend>
        {CLIMAS.map((c) => (
          <button
            key={c}
            type="button"
            className="arq-botao leve"
            aria-pressed={clima === c}
            onClick={() => {
              const s = loja.getState()
              if (s.salvamento.clima === c) return
              s.escolherClima(c)
              s.dizer(FALA_DO_CLIMA[c])
            }}
          >
            <span aria-hidden="true">{SIMBOLOS_DOS_CLIMAS[c]}</span> {NOMES_DOS_CLIMAS[c]}
          </button>
        ))}
      </fieldset>
    </section>
  )
}
