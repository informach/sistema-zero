import {
  alinharObjetos,
  type ComandoDeCenario,
  type DocumentoDeCenario,
  distribuirObjetos,
  type EixoDeComposicao,
  repetirObjetos,
  sortearTransformacoes,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import { type JSX, useState } from 'react'
import { novoIdAleatorio } from '../acoes'
import { CampoNumero } from './Painel'

/** Ferramentas da seleção, dentro do painel aprovado. Todas gravam um único lote desfazível. */
export function Organizar({
  documento,
  selecao,
  executar,
  medir,
}: {
  documento: DocumentoDeCenario
  selecao: readonly string[]
  executar(comandos: ComandoDeCenario[]): void
  medir?(id: string): VolumeDeComposicao | null
}): JSX.Element {
  const [eixo, setEixo] = useState<EixoDeComposicao>('x')
  const [copias, setCopias] = useState(3),
    [passo, setPasso] = useState(3)
  const [tipo, setTipo] = useState<'fila' | 'circulo'>('fila')
  const [centroX, setCentroX] = useState(0),
    [centroZ, setCentroZ] = useState(0),
    [arco, setArco] = useState(360)
  const [semente, setSemente] = useState(1234),
    [giro, setGiro] = useState(180)
  const [min, setMin] = useState(0.9),
    [max, setMax] = useState(1.1)
  const [erro, setErro] = useState<string | null>(null)
  const acao = (preparar: (doc: DocumentoDeCenario) => ComandoDeCenario[]) => {
    try {
      // Documentos antigos ganham medidas conferidas a partir do GLB real do palco.
      // A atualização e a operação formam o mesmo lote; nenhuma gravação escondida ao abrir.
      const doc = structuredClone(documento),
        comandos: ComandoDeCenario[] = []
      const ids = new Set(selecao)
      const modelos = new Set(doc.instancias.filter((o) => ids.has(o.id)).map((o) => o.modelo))
      for (const id of modelos) {
        const m = doc.modelos.find((m) => m.id === id)!
        const volume = m.volume ?? medir?.(id)
        if (!m.volume && volume) {
          m.volume = volume
          comandos.push({ tipo: 'modelo.definir', modelo: m })
        }
      }
      executar([...comandos, ...preparar(doc)])
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui organizar a seleção')
    }
  }
  const botao = (texto: string, aoTocar: () => void, desabilitado = false) => (
    <button
      type="button"
      className="sz-tool-pill sz-tool-pill--outline"
      disabled={desabilitado}
      onClick={aoTocar}
    >
      {texto}
    </button>
  )
  return (
    <div className="mcn-painel-corpo">
      <fieldset className="mcn-grupo">
        <legend>Organizar seleção</legend>
        <label className="mcn-campo">
          <span>Eixo</span>
          <select value={eixo} onChange={(e) => setEixo(e.target.value as EixoDeComposicao)}>
            <option value="x">X · largura</option>
            <option value="y">Y · altura</option>
            <option value="z">Z · profundidade</option>
          </select>
        </label>
        <div className="mcn-acoes-composicao">
          {(['inicio', 'centro', 'fim'] as const).map((lado) => (
            <button
              key={lado}
              type="button"
              className="sz-tool-pill sz-tool-pill--outline"
              disabled={selecao.length < 2}
              onClick={() => acao((doc) => alinharObjetos(doc, selecao, eixo, lado))}
            >
              {lado === 'inicio'
                ? 'Alinhar início'
                : lado === 'fim'
                  ? 'Alinhar fim'
                  : 'Alinhar centro'}
            </button>
          ))}
        </div>
        <div className="mcn-acoes-composicao">
          {botao(
            'Centros iguais',
            () => acao((doc) => distribuirObjetos(doc, selecao, eixo, 'centros')),
            selecao.length < 3,
          )}
          {botao(
            'Vãos iguais',
            () => acao((doc) => distribuirObjetos(doc, selecao, eixo, 'vaos')),
            selecao.length < 3,
          )}
        </div>
      </fieldset>
      <fieldset className="mcn-grupo">
        <legend>Repetir</legend>
        <label className="mcn-campo">
          <span>Disposição</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as 'fila' | 'circulo')}>
            <option value="fila">Em fila</option>
            <option value="circulo">Em círculo</option>
          </select>
        </label>
        <CampoNumero
          rotulo="Novas cópias"
          valor={copias}
          min={1}
          max={Math.max(1, Math.floor(450 / selecao.length))}
          passo={1}
          aoMudar={(n) => setCopias(Math.round(n))}
        />
        {tipo === 'fila' ? (
          <CampoNumero rotulo="Passo entre cópias" sufixo="m" valor={passo} aoMudar={setPasso} />
        ) : (
          <>
            <div className="mcn-linha">
              <CampoNumero rotulo="Centro X" valor={centroX} aoMudar={setCentroX} />
              <CampoNumero rotulo="Centro Z" valor={centroZ} aoMudar={setCentroZ} />
            </div>
            <CampoNumero
              rotulo="Arco"
              sufixo="°"
              valor={arco}
              min={1}
              max={360}
              passo={15}
              aoMudar={setArco}
            />
          </>
        )}
        {botao('Criar repetição', () =>
          acao((doc) => {
            const novos = Array.from({ length: copias * selecao.length }, novoIdAleatorio)
            return repetirObjetos(
              doc,
              selecao,
              tipo === 'fila'
                ? {
                    tipo,
                    copias,
                    deslocamento: {
                      x: eixo === 'x' ? passo : 0,
                      y: eixo === 'y' ? passo : 0,
                      z: eixo === 'z' ? passo : 0,
                    },
                  }
                : {
                    tipo,
                    copias,
                    centro: { x: centroX, z: centroZ },
                    arco: (arco * Math.PI) / 180,
                    girar: true,
                  },
              novos,
            )
          }),
        )}
      </fieldset>
      <fieldset className="mcn-grupo">
        <legend>Variar giro e tamanho</legend>
        <CampoNumero
          rotulo="Semente"
          valor={semente}
          min={0}
          max={4294967295}
          passo={1}
          aoMudar={(n) => setSemente(Math.round(n))}
        />
        <CampoNumero
          rotulo="Variação do giro"
          sufixo="°"
          valor={giro}
          min={0}
          max={180}
          passo={15}
          aoMudar={setGiro}
        />
        <div className="mcn-linha">
          <CampoNumero
            rotulo="Fator mínimo"
            valor={min}
            min={0.01}
            max={100}
            passo={0.05}
            aoMudar={setMin}
          />
          <CampoNumero
            rotulo="Fator máximo"
            valor={max}
            min={0.01}
            max={100}
            passo={0.05}
            aoMudar={setMax}
          />
        </div>
        {botao('Aplicar variação', () =>
          acao((doc) =>
            sortearTransformacoes(doc, selecao, semente, {
              giro: (giro * Math.PI) / 180,
              tamanhoMin: min,
              tamanhoMax: max,
            }),
          ),
        )}
      </fieldset>
      {erro ? (
        <p role="alert" className="text-sm text-mld-danger">
          {erro}
        </p>
      ) : null}
    </div>
  )
}
