import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  encaixarNaVizinha,
  type FonteDeAlturas,
  type PontoDeEncaixe,
} from '@sistemazero/molda-cenarios-core/v2'
import { type JSX, useEffect, useState } from 'react'
import { CampoNumero } from './Painel'

/** O máximo que o documento guarda por modelo. */
const PONTOS_POR_MODELO = 16

const graus = (d: PontoDeEncaixe['direcao']) => {
  const g = Math.round((Math.atan2(d.x, d.z) * 180) / Math.PI)
  return g < 0 ? g + 360 : g
}
const direcaoDe = (g: number) => {
  const r = (g * Math.PI) / 180
  return { x: Math.round(Math.sin(r) * 1e6) / 1e6, z: Math.round(Math.cos(r) * 1e6) / 1e6 }
}

/**
 * Os pontos de encaixe da peça escolhida: o botão "Encaixar na vizinha" e a correção à mão dos
 * pontos do modelo (que valem para todas as peças dele). Sem pontos escritos, a lista mostra os
 * que a geometria deu; mexer em um deles grava todos no modelo.
 */
export function PontosDeEncaixe({
  documento,
  id,
  executar,
  fonte,
  pontosDaGeometria,
  aoRealcar,
  desligado,
}: {
  documento: DocumentoDeCenario
  id: string
  executar(comandos: ComandoDeCenario[]): void
  fonte?: FonteDeAlturas
  pontosDaGeometria(modeloId: string): PontoDeEncaixe[] | null
  aoRealcar(id: string | null): void
  desligado: boolean
}): JSX.Element | null {
  const [aviso, setAviso] = useState<string | null>(null)
  const peca = documento.instancias.find((o) => o.id === id)
  const modelo = peca && documento.modelos.find((m) => m.id === peca.modelo)
  // O palco redesenha as bolinhas a cada mudança da peça; aqui só se liga e desliga o realce.
  useEffect(() => {
    aoRealcar(id)
    return () => aoRealcar(null)
  }, [id, aoRealcar])
  if (!peca || !modelo) return null
  const daGeometria = pontosDaGeometria(modelo.id)
  const escritos = modelo.encaixes
  const pontos = escritos ?? daGeometria ?? []
  const tentar = (fazer: () => void) => {
    try {
      fazer()
      setAviso(null)
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não consegui mudar os pontos de encaixe')
    }
  }
  const gravar = (novos: PontoDeEncaixe[] | null) =>
    tentar(() => {
      const { encaixes: _, ...semPontos } = modelo
      executar([
        { tipo: 'modelo.definir', modelo: novos ? { ...semPontos, encaixes: novos } : semPontos },
      ])
    })
  const mudar = (i: number, ponto: PontoDeEncaixe) =>
    gravar(pontos.map((p, j) => (j === i ? ponto : p)))
  const volume = modelo.volume
  const novo = (): PontoDeEncaixe => ({
    posicao: { x: 0, y: volume?.max.y ?? 0, z: volume?.max.z ?? 0.5 },
    direcao: { x: 0, z: 1 },
    largura: Math.max(0.1, volume ? volume.max.x - volume.min.x : 1),
  })
  return (
    <div className="mcn-encaixe-pontos">
      <button
        type="button"
        className="sz-tool-pill"
        disabled={desligado || !pontos.length}
        onClick={() =>
          tentar(() => {
            const r = encaixarNaVizinha(documento, id, (m) => pontosDaGeometria(m.id), fonte)
            if (!r)
              throw Error('Nenhuma peça vizinha com uma ponta de frente para esta, a até 3 m.')
            executar([{ tipo: 'instancia.atualizar', id, alteracoes: r.alteracoes }])
          })
        }
      >
        Encaixar na vizinha
      </button>
      <details className="mcn-encaixe-pontos-lista">
        <summary className="mcn-encaixe-pontos-resumo">
          Pontos de encaixe deste modelo ({pontos.length})
        </summary>
        <p className="text-sm">
          {escritos
            ? 'Escritos à mão. Valem para todas as peças deste modelo.'
            : daGeometria
              ? 'Achados na geometria. Mudar um deles grava todos à mão, para todas as peças deste modelo.'
              : 'O modelo ainda está carregando.'}{' '}
          Medidas do próprio modelo; a direção é para onde a ponta olha (0° é a frente).
        </p>
        {pontos.map((p, i) => (
          <fieldset
            className="mcn-encaixe-ponto"
            key={`${p.posicao.x},${p.posicao.y},${p.posicao.z},${p.direcao.x},${p.direcao.z}`}
          >
            <legend className="mcn-encaixe-ponto-titulo">Ponto {i + 1}</legend>
            {(['x', 'y', 'z'] as const).map((eixo) => (
              <CampoNumero
                key={eixo}
                rotulo={eixo === 'y' ? 'Altura' : eixo.toUpperCase()}
                valor={Math.round(p.posicao[eixo] * 1000) / 1000}
                passo={0.05}
                sufixo="m"
                desligado={desligado}
                aoMudar={(v) => mudar(i, { ...p, posicao: { ...p.posicao, [eixo]: v } })}
              />
            ))}
            <CampoNumero
              rotulo="Direção"
              valor={graus(p.direcao)}
              passo={15}
              min={0}
              max={359}
              sufixo="°"
              desligado={desligado}
              aoMudar={(v) => mudar(i, { ...p, direcao: direcaoDe(v) })}
            />
            <CampoNumero
              rotulo="Largura"
              valor={Math.round(p.largura * 1000) / 1000}
              passo={0.1}
              min={0.05}
              max={100}
              sufixo="m"
              desligado={desligado}
              aoMudar={(v) => mudar(i, { ...p, largura: v })}
            />
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline mcn-encaixe-ponto-tirar"
              disabled={desligado}
              onClick={() => gravar(pontos.filter((_, j) => j !== i))}
            >
              Tirar este ponto
            </button>
          </fieldset>
        ))}
        <div className="mcn-encaixe-pontos-acoes">
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--outline"
            disabled={desligado || pontos.length >= PONTOS_POR_MODELO}
            onClick={() => gravar([...pontos, novo()])}
          >
            Somar ponto
          </button>
          {escritos ? (
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={desligado}
              onClick={() => gravar(null)}
            >
              Voltar aos pontos da geometria
            </button>
          ) : null}
        </div>
      </details>
      {aviso ? (
        <p role="alert" className="text-sm text-mld-danger">
          {aviso}
        </p>
      ) : null}
    </div>
  )
}
