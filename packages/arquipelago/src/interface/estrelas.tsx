import { useEffect, useRef } from 'react'
import { useEstado, useJogo } from '../estado/contexto'
import { FALA_DA_LUNETA, FALA_DE_TODAS, FIGURAS, quantasAchadas } from '../sistemas/constelacoes'

/** O que o Zappy pode dizer dentro da vista: a instrução, cada figura achada e a última. */
const FALAS_DA_VISTA: ReadonlySet<string> = new Set([
  FALA_DA_LUNETA,
  FALA_DE_TODAS,
  ...FIGURAS.map((f) => f.fala),
  ...FIGURAS.map((f) => `${f.fala} ${FALA_DE_TODAS}`),
])

/** Os botões de mirar: para onde cada um empurra a mira (como o direcional). */
const SETAS = [
  { rotulo: 'Mirar para cima', simbolo: '▲', x: 0, z: 1, area: 'cima' },
  { rotulo: 'Mirar para a esquerda', simbolo: '◀', x: -1, z: 0, area: 'esq' },
  { rotulo: 'Mirar para a direita', simbolo: '▶', x: 1, z: 0, area: 'dir' },
  { rotulo: 'Mirar para baixo', simbolo: '▼', x: 0, z: -1, area: 'baixo' },
] as const

/**
 * A vista pela luneta do mirante das Nuvens (fase4-07): quantas constelações já acenderam, a mira
 * no meio, os botões de mirar (segurar move; o teclado e o controle também miram) e a fala do
 * Zappy. "Voltar" (ou Esc) fecha.
 */
export function VisorDasEstrelas() {
  const { loja, movimento } = useJogo()
  const achadas = useEstado((s) => quantasAchadas(s.salvamento.nuvens.constelacoes))
  // Na vista só falam a luneta e as figuras (uma dica de outra coisa, como a da câmera, espera).
  const fala = useEstado((s) => {
    const texto = s.dica?.texto
    return texto && FALAS_DA_VISTA.has(texto) ? texto : FALA_DA_LUNETA
  })
  const voltar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    voltar.current?.focus()
    return () => {
      if (anterior?.isConnected) anterior.focus()
    }
  }, [])
  const pedir = (x: number, z: number) => {
    if (!movimento.mira) return
    movimento.mira.pedidoX = x
    movimento.mira.pedidoZ = z
  }
  return (
    <section className="arq-luneta" aria-label="Vista pela luneta do mirante">
      <div className="arq-luneta-topo">
        <span className="arq-pilula">{`Constelações: ${achadas} de ${FIGURAS.length}`}</span>
        <button
          ref={voltar}
          className="arq-botao"
          type="button"
          onClick={() => loja.getState().abrirPainel(null)}
        >
          Voltar
        </button>
      </div>
      <span className="arq-mirante-mira" aria-hidden="true" />
      <div className="arq-mirante-setas">
        {SETAS.map((s) => (
          <button
            key={s.area}
            type="button"
            className={`arq-botao leve arq-mirante-${s.area}`}
            aria-label={s.rotulo}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              pedir(s.x, s.z)
            }}
            onPointerUp={() => pedir(0, 0)}
            onPointerCancel={() => pedir(0, 0)}
            onLostPointerCapture={() => pedir(0, 0)}
          >
            {s.simbolo}
          </button>
        ))}
      </div>
      <div className="arq-luneta-fala" role="status">
        <span className="arq-zappy" aria-hidden="true" />
        <p>
          <strong>Zappy</strong>
          <br />
          {fala}
        </p>
      </div>
    </section>
  )
}
