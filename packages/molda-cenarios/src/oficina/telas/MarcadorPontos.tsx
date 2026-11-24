import type { ConfiguracaoDeMarcador } from '@sistemazero/molda-cenarios-core/v2'
import { useState } from 'react'
import type { useJogo } from '../useJogo'
import { CampoVetor } from './CamposDoJogo'

/** Mesmas alças dos caminhos; a tabela mostra controles locais, nunca amostras derivadas. */
export function MarcadorPontos({
  jogo: t,
  aoCapturar,
}: {
  jogo: ReturnType<typeof useJogo>
  aoCapturar(): void
}) {
  const [pagina, setPagina] = useState(0),
    m = t.rascunho,
    c = m?.configuracao
  if (!m || !(c?.tipo === 'rota' || (c?.tipo === 'zona' && c.forma.tipo === 'poligono')))
    return null
  const pontos = c.tipo === 'rota' ? c.pontos : c.forma.tipo === 'poligono' ? c.forma.pontos : [],
    inicio = Math.min(pagina, Math.max(0, Math.ceil(pontos.length / 12) - 1)) * 12
  const mudar = (indice: number, valor: { x: number; y: number; z: number }) => {
    const configuracao: ConfiguracaoDeMarcador =
      c.tipo === 'rota'
        ? { ...c, pontos: c.pontos.map((p, i) => (i === indice ? valor : p)) }
        : {
            ...c,
            forma: {
              ...c.forma,
              tipo: 'poligono',
              pontos: pontos.map((p, i) =>
                i === indice ? { x: valor.x, z: valor.z } : { x: p.x, z: p.z },
              ),
              altura: c.forma.tipo === 'poligono' ? c.forma.altura : 2,
            },
          }
    t.mudar({ ...m, configuracao })
  }
  return (
    <details className="mcn-grupo" open>
      <summary>Controles · {pontos.length}</summary>
      <p className="text-sm text-mld-muted">
        Mova as alças no cenário ou ajuste os pontos relativos à raiz. A zona mantém sua base no
        mesmo plano.
      </p>
      <div className="mcn-caminho-acoes">
        {(['mover', 'adicionar', 'inserir', 'remover'] as const).map((modo) => (
          <button
            key={modo}
            type="button"
            className="sz-tool-btn"
            aria-pressed={t.capturando && t.modo === modo}
            onClick={() => {
              t.capturar(modo)
              aoCapturar()
            }}
          >
            {
              {
                mover: 'Mover pontos',
                adicionar: 'Acrescentar ponto',
                inserir: 'Inserir ponto',
                remover: 'Remover ponto',
              }[modo]
            }
          </button>
        ))}
        {t.capturando ? (
          <button type="button" className="sz-tool-btn" onClick={() => t.setCapturando(false)}>
            Terminar captura
          </button>
        ) : null}
      </div>
      {c.tipo === 'rota' ? (
        <>
          <label className="mcn-opcao">
            <input
              type="checkbox"
              checked={c.fechada}
              onChange={(e) => t.mudar({ ...m, configuracao: { ...c, fechada: e.target.checked } })}
            />
            Fechar a rota
          </label>
          <label className="mcn-opcao">
            <input
              type="checkbox"
              checked={c.seguirTerreno}
              onChange={(e) =>
                t.mudar({ ...m, configuracao: { ...c, seguirTerreno: e.target.checked } })
              }
            />
            Acompanhar o terreno
          </label>
        </>
      ) : null}
      {pontos.slice(inicio, inicio + 12).map((p, i) => (
        <CampoVetor
          // biome-ignore lint/suspicious/noArrayIndexKey: os campos editam posições numeradas; não há IDs de controles no contrato autoral
          key={inicio + i}
          rotulo={`Ponto ${inicio + i + 1}`}
          eixos={c.tipo === 'zona' ? ['x', 'z'] : ['x', 'y', 'z']}
          valor={{ ...p, y: 'y' in p && typeof p.y === 'number' ? p.y : 0 }}
          aoMudar={(v) => mudar(inicio + i, v)}
        />
      ))}
      {pontos.length > 12 ? (
        <div className="mcn-caminho-acoes">
          <button
            type="button"
            className="sz-tool-btn"
            disabled={inicio === 0}
            onClick={() => setPagina(inicio / 12 - 1)}
          >
            Pontos anteriores
          </button>
          <span>
            {inicio + 1}–{Math.min(inicio + 12, pontos.length)} de {pontos.length}
          </span>
          <button
            type="button"
            className="sz-tool-btn"
            disabled={inicio + 12 >= pontos.length}
            onClick={() => setPagina(inicio / 12 + 1)}
          >
            Próximos pontos
          </button>
        </div>
      ) : null}
    </details>
  )
}
