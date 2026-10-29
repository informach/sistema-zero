import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { ilhaDaLuneta } from '../sistemas/luneta'
import { useVoz } from './voz'

export function VisorDaLuneta() {
  const { loja } = useJogo()
  const voz = useVoz()
  const jornada = useEstado((s) => s.jornada)
  const ilha = ilhaDaLuneta(jornada)
  const voltar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    voltar.current?.focus()
    return () => {
      if (anterior?.isConnected) anterior.focus()
    }
  }, [])
  return (
    <section className="arq-luneta" aria-label="Vista pela luneta">
      <div className="arq-luneta-topo">
        <span className="arq-pilula">{ilha.nome}</span>
        <button
          ref={voltar}
          className="arq-botao"
          type="button"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Voltar
        </button>
      </div>
      <div className="arq-luneta-fala" role="status">
        <span className="arq-zappy" aria-hidden="true" />
        <p>
          <strong>Zappy</strong>
          <br />
          {voz.falaDaLuneta(ilha)}
        </p>
      </div>
    </section>
  )
}
