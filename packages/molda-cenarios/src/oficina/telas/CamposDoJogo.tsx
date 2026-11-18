import { CampoNumero } from './Painel'

type Vetor = { x: number; y: number; z: number }
/** Coordenadas do mesmo inspector Molda, com unidades explícitas. */
export function CampoVetor({
  rotulo,
  valor,
  aoMudar,
  unidade = 'm',
  min,
  max,
  eixos = ['x', 'y', 'z'],
}: {
  rotulo: string
  valor: Vetor
  aoMudar(valor: Vetor): void
  unidade?: string
  min?: number
  max?: number
  eixos?: readonly ('x' | 'y' | 'z')[]
}) {
  return (
    <fieldset className="mcn-grupo">
      <legend>{rotulo}</legend>
      <div className="mcn-linha">
        {eixos.map((eixo) => (
          <CampoNumero
            key={eixo}
            rotulo={`${rotulo} ${eixo.toUpperCase()}`}
            valor={Number(valor[eixo].toFixed(4))}
            sufixo={unidade}
            passo={0.1}
            min={min}
            max={max}
            aoMudar={(n) => aoMudar({ ...valor, [eixo]: n })}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function CampoCor({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string
  valor: string
  aoMudar(valor: string): void
}) {
  return (
    <label className="mcn-campo">
      {rotulo}
      <input type="color" value={valor} onChange={(e) => aoMudar(e.target.value)} />
    </label>
  )
}
