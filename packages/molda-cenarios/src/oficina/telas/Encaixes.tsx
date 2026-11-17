import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type EncaixeDeComposicao,
  type FonteDeAlturas,
  girarObjetosNaVertical,
  levarObjetosAoAndar,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import { type JSX, useState } from 'react'
import { comMedidasConferidas } from '../acoes'
import { CampoNumero } from './Painel'

/** Preferências da vista; só os botões de aplicar à seleção geram edição autoral. */
export function Encaixes({
  documento,
  selecao,
  valor,
  aoMudar,
  ligado,
  aoLigar,
  executar,
  medir,
  fonte,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  valor: EncaixeDeComposicao
  aoMudar(valor: EncaixeDeComposicao): void
  ligado: boolean
  aoLigar(ligado: boolean): void
  executar(comandos: ComandoDeCenario[]): void
  medir(id: string): VolumeDeComposicao | null
  fonte?: FonteDeAlturas
}): JSX.Element {
  const [erro, setErro] = useState<string | null>(null)
  const acao = (preparar: (d: DocumentoDeCenario) => ComandoDeCenario[]) => {
    try {
      executar(comMedidasConferidas(documento, selecao, medir, preparar))
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui aplicar o encaixe')
    }
  }
  return (
    <details className="mcn-grupo">
      <summary>Grade e encaixes</summary>
      <div className="mcn-painel-corpo">
        <label className="mcn-opcao-encaixe">
          <span>Encaixes ligados</span>
          <input type="checkbox" checked={ligado} onChange={(e) => aoLigar(e.target.checked)} />
        </label>
        <label className="mcn-opcao-encaixe">
          <span>Grade de posição</span>
          <input
            type="checkbox"
            checked={valor.grade !== null}
            onChange={(e) => aoMudar({ ...valor, grade: e.target.checked ? 0.5 : null })}
          />
        </label>
        {valor.grade !== null ? (
          <CampoNumero
            rotulo="Passo da grade"
            sufixo="m"
            valor={valor.grade}
            min={0.05}
            max={100}
            passo={0.25}
            aoMudar={(grade) => aoMudar({ ...valor, grade })}
          />
        ) : null}
        <label className="mcn-opcao-encaixe">
          <span>Encaixe de giro</span>
          <input
            type="checkbox"
            checked={valor.angulo !== null}
            onChange={(e) => aoMudar({ ...valor, angulo: e.target.checked ? 90 : null })}
          />
        </label>
        {valor.angulo !== null ? (
          <CampoNumero
            rotulo="Passo do giro"
            sufixo="°"
            valor={valor.angulo}
            min={0.1}
            max={180}
            passo={15}
            aoMudar={(angulo) => aoMudar({ ...valor, angulo })}
          />
        ) : null}
        <fieldset className="mcn-grupo">
          <legend>Origem modular</legend>
          {(['x', 'y', 'z'] as const).map((e) => (
            <CampoNumero
              key={e}
              rotulo={`Origem ${e.toUpperCase()}`}
              sufixo="m"
              valor={valor.origem[e]}
              min={-100000}
              max={100000}
              aoMudar={(n) => aoMudar({ ...valor, origem: { ...valor.origem, [e]: n } })}
            />
          ))}
        </fieldset>
        <label className="mcn-opcao-encaixe">
          <span>Colocar no andar</span>
          <input
            type="checkbox"
            checked={valor.andar !== null}
            onChange={(e) =>
              aoMudar({ ...valor, andar: e.target.checked ? { altura: 3, nivel: 0 } : null })
            }
          />
        </label>
        {valor.andar ? (
          <>
            <CampoNumero
              rotulo="Altura entre andares"
              sufixo="m"
              valor={valor.andar.altura}
              min={0.1}
              max={100}
              aoMudar={(altura) =>
                aoMudar({ ...valor, andar: { altura, nivel: valor.andar!.nivel } })
              }
            />
            <CampoNumero
              rotulo="Andar"
              valor={valor.andar.nivel}
              min={-100}
              max={100}
              passo={1}
              aoMudar={(nivel) =>
                aoMudar({
                  ...valor,
                  andar: { altura: valor.andar!.altura, nivel: Math.round(nivel) },
                })
              }
            />
            <p className="text-sm">
              Plano a {Number((valor.origem.y + valor.andar.nivel * valor.andar.altura).toFixed(3))}{' '}
              m. A aplicação à seleção substitui seu apoio pelo plano do andar.
            </p>
            <button
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={!selecao.length}
              onClick={() =>
                acao((d) =>
                  levarObjetosAoAndar(
                    d,
                    selecao,
                    valor.origem.y + valor.andar!.nivel * valor.andar!.altura,
                    fonte,
                  ),
                )
              }
            >
              Levar seleção ao andar
            </button>
          </>
        ) : null}
        <label className="mcn-opcao-encaixe">
          <span>Encaixar nas superfícies</span>
          <input
            type="checkbox"
            checked={valor.superficie}
            onChange={(e) => aoMudar({ ...valor, superficie: e.target.checked })}
          />
        </label>
        <p className="text-sm">
          A superfície real tem prioridade sobre a grade. Ao mover, o objeto procura apoio sob sua
          base.
        </p>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={!selecao.length}
          onClick={() => acao((d) => girarObjetosNaVertical(d, selecao, Math.PI / 2))}
        >
          Girar seleção 90°
        </button>
        {erro ? (
          <p role="alert" className="text-sm text-mld-danger">
            {erro}
          </p>
        ) : null}
      </div>
    </details>
  )
}
