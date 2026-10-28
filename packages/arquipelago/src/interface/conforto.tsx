import { lojaDoConforto, useConforto } from '../estado/conforto'
import { useJogo } from '../estado/contexto'
import type { Conforto } from '../sistemas/conforto'

const RAPIDEZ: readonly { valor: Conforto['rapidez']; rotulo: string }[] = [
  { valor: 'devagar', rotulo: 'Devagar' },
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'rapida', rotulo: 'Rápida' },
]
const DISTANCIA: readonly { valor: Conforto['distancia']; rotulo: string }[] = [
  { valor: 'perto', rotulo: 'Perto' },
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'longe', rotulo: 'Longe' },
]

/**
 * O conforto da câmera, no menu (`sistemas/conforto.ts`): rapidez, distância, inverter para cima e
 * para baixo, voltar sozinha para as costas (desligada por padrão) e menos movimento. Muda na hora e
 * fica guardado no aparelho.
 */
export function PreferenciasDeConforto() {
  const { loja } = useJogo()
  const conforto = lojaDoConforto(loja)
  const atual = useConforto(conforto, (s) => s.conforto)
  const mudar = conforto.getState().mudar

  return (
    <section className="arq-conforto" aria-label="Conforto da câmera">
      <h3 className="arq-menu-titulo">Conforto da câmera</h3>
      <fieldset className="arq-escolha">
        <legend>Rapidez ao girar</legend>
        {RAPIDEZ.map((o) => (
          <button
            key={o.valor}
            type="button"
            className="arq-botao leve"
            aria-pressed={atual.rapidez === o.valor}
            onClick={() => mudar({ rapidez: o.valor })}
          >
            {o.rotulo}
          </button>
        ))}
      </fieldset>
      <fieldset className="arq-escolha">
        <legend>Distância</legend>
        {DISTANCIA.map((o) => (
          <button
            key={o.valor}
            type="button"
            className="arq-botao leve"
            aria-pressed={atual.distancia === o.valor}
            onClick={() => mudar({ distancia: o.valor })}
          >
            {o.rotulo}
          </button>
        ))}
      </fieldset>
      <label className="arq-marcar">
        <input
          type="checkbox"
          checked={atual.inverterVertical}
          onChange={(e) => mudar({ inverterVertical: e.target.checked })}
        />
        Inverter para cima e para baixo
      </label>
      <label className="arq-marcar">
        <input
          type="checkbox"
          checked={atual.voltaSozinha}
          onChange={(e) => mudar({ voltaSozinha: e.target.checked })}
        />
        A câmera volta sozinha para as costas quando ando
      </label>
      <label className="arq-marcar">
        <input
          type="checkbox"
          checked={atual.menosMovimento}
          onChange={(e) => mudar({ menosMovimento: e.target.checked })}
        />
        Menos movimento da câmera
      </label>
    </section>
  )
}
