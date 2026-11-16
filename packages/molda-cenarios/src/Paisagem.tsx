import { Button } from '@sistemazero/molda/ui'
import type {
  ComandoDeCenario,
  DocumentoDeCenario,
  ModeloDeCatalogo,
} from '@sistemazero/molda-cenarios-core'
import { useState } from 'react'
import type { EstadoDeViewport } from './portas'

export function Paisagem({
  doc,
  viewport,
  catalogo,
  editar,
  selecionar,
  bloqueado,
}: {
  doc: DocumentoDeCenario
  viewport: EstadoDeViewport
  catalogo: readonly ModeloDeCatalogo[]
  editar: (c: ComandoDeCenario[]) => void
  selecionar: (id: string) => void
  bloqueado: boolean
}) {
  const [erro, setErro] = useState<string | null>(null)
  const id = viewport.selecionados[0]?.split('#ponto:')[0],
    caminho = doc.caminhos.find((p) => p.id === id),
    agua = doc.aguas.find((a) => a.id === id)
  const pontos = (
    ps: readonly { x: number; z: number }[],
    aplicar: (ps: { x: number; z: number }[]) => void,
  ) => (
    <label>
      Pontos X, Z · um por linha
      <textarea
        key={`${id}:${JSON.stringify(ps)}`}
        rows={6}
        defaultValue={ps.map((p) => `${p.x}, ${p.z}`).join('\n')}
        disabled={bloqueado}
        onBlur={(e) => {
          try {
            const linhas = e.target.value.trim().split('\n'),
              novos = linhas.map((l) => {
                const partes = l.split(',').map(Number)
                if (partes.length !== 2 || partes.some((n) => !Number.isFinite(n)))
                  throw Error('Use X, Z em cada linha')
                return { x: partes[0]!, z: partes[1]! }
              })
            if (JSON.stringify(novos) !== JSON.stringify(ps)) aplicar(novos)
            setErro(null)
          } catch (e) {
            setErro(String(e))
          }
        }}
      />
    </label>
  )
  const numero = (nome: string, v: number, alterar: (v: number) => void) => (
    <label>
      {nome}
      <input
        key={`${id}:${nome}:${v}`}
        type="number"
        step="0.1"
        defaultValue={v}
        disabled={bloqueado}
        onBlur={(e) => {
          const n = Number(e.target.value)
          if (e.target.value.trim() && Number.isFinite(n) && n !== v) alterar(n)
        }}
      />
    </label>
  )
  const definirCaminho = (v: Partial<NonNullable<typeof caminho>>) => {
    if (caminho) editar([{ tipo: 'caminho.definir', caminho: { ...caminho, ...v } }])
  }
  const definirAgua = (v: Partial<NonNullable<typeof agua>>) => {
    if (agua) editar([{ tipo: 'agua.definir', agua: { ...agua, ...v } }])
  }
  return (
    <section className="mce-paisagem">
      {erro && <p role="alert">{erro}</p>}
      {(viewport.ferramenta === 'caminho' || caminho) && (
        <>
          <h3>Caminhos e praças</h3>
          <select
            aria-label="Caminho"
            value={caminho?.id ?? ''}
            onChange={(e) => selecionar(e.target.value)}
          >
            <option value="">Escolha um caminho</option>
            {doc.caminhos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          {caminho && (
            <>
              {numero('Largura · metros', caminho.largura, (v) => definirCaminho({ largura: v }))}
              <label>
                Acabamento
                <select
                  value={caminho.acabamento}
                  disabled={bloqueado || caminho.bloqueado}
                  onChange={(e) => definirCaminho({ acabamento: e.target.value })}
                >
                  {catalogo
                    .filter((m) => /caminho_(terra|lajes)_reto|trilha_terra_reta/.test(m.caminho))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                </select>
              </label>
              {pontos(caminho.pontos, (p) => definirCaminho({ pontos: p }))}
              <p>Os pontos também aparecem no viewport. Arraste um ponto com a ferramenta Mover.</p>
              <Button
                size="compact"
                variant="danger"
                disabled={bloqueado || caminho.bloqueado}
                onClick={() => editar([{ tipo: 'caminho.remover', id: caminho.id }])}
              >
                Excluir caminho
              </Button>
            </>
          )}
          <Button
            size="compact"
            disabled={bloqueado}
            onClick={() => {
              const modelo = catalogo.find((m) => m.caminho.includes('caminho_lajes_reto'))
              if (!modelo) return
              const novo = `caminho-${crypto.randomUUID()}`
              editar([
                {
                  tipo: 'caminho.definir',
                  caminho: {
                    id: novo,
                    nome: 'Novo caminho',
                    grupo: null,
                    bloqueado: false,
                    oculto: false,
                    acabamento: modelo.id,
                    largura: 2.4,
                    tipo: 'trilha',
                    pontos: [
                      { x: 0, z: 155 },
                      { x: 10, z: 155 },
                    ],
                  },
                },
              ])
              selecionar(novo)
            }}
          >
            Novo caminho
          </Button>
        </>
      )}
      {(viewport.ferramenta === 'agua' || agua) && (
        <>
          <h3>Água e margens</h3>
          <select
            aria-label="Lago"
            value={agua?.id ?? ''}
            onChange={(e) => selecionar(e.target.value)}
          >
            <option value="">Escolha uma água</option>
            {doc.aguas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          {agua && (
            <>
              {numero('Centro X', agua.centro.x, (x) =>
                definirAgua({ centro: { ...agua.centro, x } }),
              )}
              {numero('Centro Z', agua.centro.z, (z) =>
                definirAgua({ centro: { ...agua.centro, z } }),
              )}
              {numero('Nível da água', agua.nivel, (nivel) => definirAgua({ nivel }))}
              {numero('Escala do conjunto', agua.escala, (escala) => definirAgua({ escala }))}
              {numero('Giro · graus', (agua.giro * 180) / Math.PI, (g) =>
                definirAgua({ giro: (g * Math.PI) / 180 }),
              )}
              <p>
                O conjunto mantém modelo, margem, recorte e área de nado vinculados. A ponte é um
                objeto separado: confira seus apoios após alterar o lago.
              </p>
              <details>
                <summary>Contorno de nado</summary>
                {pontos(agua.contorno, (contorno) => definirAgua({ contorno }))}
              </details>
              <details>
                <summary>Recorte do terreno</summary>
                {pontos(agua.recorte, (recorte) => definirAgua({ recorte }))}
              </details>
            </>
          )}
        </>
      )}
      {viewport.ferramenta === 'terreno' && (
        <p>
          Escolha o pincel e clique no terreno para aplicar um carimbo. Desfazer remove a última
          operação sem alterar o terreno original.
        </p>
      )}
    </section>
  )
}
