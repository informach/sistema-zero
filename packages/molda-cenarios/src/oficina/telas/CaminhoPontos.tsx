import type { CapturaDeCaminho } from '@sistemazero/molda-cenarios-motor'
import type { useCaminhos } from '../useCaminhos'
import { CampoNumero } from './Painel'

export function CaminhoPontos({
  caminhos: t,
  aoCapturar,
}: {
  caminhos: ReturnType<typeof useCaminhos>
  aoCapturar(): void
}) {
  const c = t.rascunho
  if (!c) return null
  const fechada = c.tipo === 'praca' || c.fechada === true,
    minimo = fechada ? 3 : 2,
    indice = t.selecionado ?? (c.pontos.length ? 0 : null),
    ponto = indice === null ? null : c.pontos[indice],
    maximo = c.tipo === 'ponte' ? 2 : Math.max(128, c.pontos.length),
    nome = (i: number) =>
      c.tipo === 'ponte'
        ? `Cabeceira ${i === 0 ? 'A' : 'B'}`
        : fechada
          ? `Ponto ${i + 1}`
          : i === 0
            ? 'Início'
            : i === c.pontos.length - 1
              ? 'Fim'
              : `Ponto ${i + 1}`
  const modos: readonly [CapturaDeCaminho['modo'], string][] = [
    ['adicionar', 'Adicionar'],
    ['mover', 'Mover'],
    ['inserir', 'Inserir'],
    ['remover', 'Remover'],
  ]
  return (
    <details className="mcn-grupo" open>
      <summary>
        Pontos · {c.pontos.length}
        {c.tipo === 'ponte' ? '/2' : ''}
      </summary>
      <p className="text-sm text-mld-muted">
        {fechada ? 'Circuito fechado. O último ponto se liga ao primeiro.' : 'Ordem: início → fim.'}{' '}
        Coordenadas em metros.
      </p>
      <fieldset className="mcn-caminho-acoes border-0 p-0">
        <legend className="sr-only">Editar pontos no cenário</legend>
        {modos.map(([modo, rotulo]) => (
          <button
            key={modo}
            type="button"
            className="sz-tool-btn"
            aria-pressed={t.capturando && t.modo === modo}
            disabled={
              t.preparando ||
              ((modo === 'inserir' || modo === 'adicionar') && c.pontos.length >= maximo) ||
              (modo === 'remover' && c.pontos.length <= minimo)
            }
            onClick={() => {
              t.capturar(modo)
              aoCapturar()
            }}
          >
            {rotulo}
          </button>
        ))}
      </fieldset>
      <button
        type="button"
        className="sz-tool-btn"
        disabled={t.preparando}
        onClick={() => {
          if (t.capturando) t.setCapturando(false)
          else {
            t.capturar()
            aoCapturar()
          }
        }}
      >
        {t.capturando ? 'Pausar pontos' : 'Escolher pontos no cenário'}
      </button>
      {t.capturando ? (
        <p role="status" className="text-sm text-mld-muted">
          Toque para escolher. Arraste uma alça para mover. Arrastar no vazio gira a vista. Escape
          cancela o arraste; Delete respeita o mínimo de pontos.
        </p>
      ) : null}
      {ponto && indice !== null ? (
        <>
          <label className="mcn-campo">
            Ponto para editar
            <select value={indice} onChange={(e) => t.setSelecionado(Number(e.target.value))}>
              {c.pontos.map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: opções sem estado representam os índices ordenados da curva
                <option key={`${c.id}/${i}`} value={i}>
                  {nome(i)}
                </option>
              ))}
            </select>
          </label>
          {(['x', 'z'] as const).map((eixo) => (
            <CampoNumero
              key={`${indice}/${eixo}`}
              rotulo={`${nome(indice)} ${eixo.toUpperCase()}`}
              valor={ponto[eixo]}
              min={-100000}
              max={100000}
              passo={0.25}
              sufixo="m"
              aoMudar={(valor) =>
                t.mudar({
                  ...c,
                  pontos: c.pontos.map((p, i) => (i === indice ? { ...p, [eixo]: valor } : p)),
                })
              }
            />
          ))}
          <button
            type="button"
            className="sz-tool-btn"
            disabled={c.pontos.length <= minimo}
            onClick={() => t.mudar({ ...c, pontos: c.pontos.filter((_, i) => i !== indice) })}
          >
            Remover {nome(indice)}
          </button>
        </>
      ) : null}
      <div className="mcn-caminho-acoes">
        <button
          type="button"
          className="sz-tool-btn"
          disabled={c.pontos.length >= maximo}
          onClick={() => {
            t.mudar({ ...c, pontos: [...c.pontos, { x: 0, z: 0 }] })
            t.setSelecionado(c.pontos.length)
          }}
        >
          Adicionar por coordenadas
        </button>
        <button
          type="button"
          className="sz-tool-btn"
          disabled={!c.pontos.length}
          onClick={() => t.mudar({ ...c, pontos: [] })}
        >
          Limpar pontos do rascunho
        </button>
      </div>
    </details>
  )
}
