import type { FormularioDeAgua } from '../agua-formulario'
import { CampoNumero } from './Painel'

export function AguaPontos({
  formulario: f,
  mudar,
}: {
  formulario: FormularioDeAgua
  mudar(p: FormularioDeAgua['pontos']): void
}) {
  const maximo = f.tipo === 'rio' ? 128 : f.tipo === 'represa' ? 3 : f.tipo === 'lago' ? 1 : 2
  const nome = (i: number) =>
    f.tipo === 'represa'
      ? ['Ponta A', 'Ponta B', 'Montante'][i]
      : f.tipo === 'cachoeira'
        ? ['Topo', 'Base'][i]
        : f.tipo === 'lago'
          ? 'Baixada'
          : i === 0
            ? 'Nascente'
            : i === f.pontos.length - 1
              ? 'Foz'
              : `Ponto ${i + 1}`
  return (
    <details className="mcn-grupo" open>
      <summary>
        Pontos · {f.pontos.length}
        {f.tipo !== 'rio' ? `/${maximo}` : ''}
      </summary>
      <p className="text-sm text-mld-muted">
        Coordenadas em metros.{' '}
        {f.tipo === 'rio' ? 'Ordem: nascente → foz. O leito é amostrado no relevo.' : null}
      </p>
      <div className="mcn-agua-pontos">
        {f.pontos.map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: os campos representam posições ordenadas da curva; CampoNumero sincroniza o valor ao remover um ponto
          <div className="mcn-agua-ponto" key={i}>
            <strong>{nome(i)}</strong>
            {(['x', ...(f.tipo === 'cachoeira' ? ['y'] : []), 'z'] as ('x' | 'y' | 'z')[]).map(
              (eixo) => (
                <CampoNumero
                  key={eixo}
                  rotulo={`${nome(i)} ${eixo.toUpperCase()}`}
                  valor={p[eixo]}
                  min={-100000}
                  max={100000}
                  passo={0.25}
                  aoMudar={(v) =>
                    mudar(f.pontos.map((q, j) => (j === i ? { ...q, [eixo]: v } : q)))
                  }
                />
              ),
            )}
            <button
              type="button"
              className="sz-tool-btn"
              aria-label={`Remover ${nome(i)}`}
              onClick={() => mudar(f.pontos.filter((_, j) => j !== i))}
            >
              Remover ponto
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="sz-tool-btn"
        disabled={f.pontos.length >= maximo}
        onClick={() => mudar([...f.pontos, { x: 0, y: 0, z: 0 }])}
      >
        Adicionar por coordenadas
      </button>
    </details>
  )
}
