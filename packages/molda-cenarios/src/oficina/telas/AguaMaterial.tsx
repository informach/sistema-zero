import { ColorPicker } from '@sistemazero/molda/ui'
import type { AparenciaDaAgua } from '@sistemazero/molda-cenarios-core/v2'
import { CampoNumero } from './Painel'

export function AguaMaterial({
  valor: a,
  mudar,
}: {
  valor: AparenciaDaAgua
  mudar(a: AparenciaDaAgua): void
}) {
  const n = (
    rotulo: string,
    valor: number,
    min: number,
    max: number,
    passo: number,
    aoMudar: (v: number) => void,
    sufixo?: string,
  ) => (
    <CampoNumero {...{ rotulo, valor, min, max, passo, aoMudar, ...(sufixo ? { sufixo } : {}) }} />
  )
  return (
    <details className="mcn-grupo">
      <summary>Cor, transparência e movimento</summary>
      <div className="mcn-agua-material">
        <fieldset className="mcn-campo">
          <legend>Cor rasa</legend>
          <ColorPicker value={a.corRasa} onChange={(corRasa) => mudar({ ...a, corRasa })} />
        </fieldset>
        <fieldset className="mcn-campo">
          <legend>Cor profunda</legend>
          <ColorPicker
            value={a.corProfunda}
            onChange={(corProfunda) => mudar({ ...a, corProfunda })}
          />
        </fieldset>
        {n('Opacidade rasa', a.opacidadeRasa, 0, 1, 0.05, (opacidadeRasa) =>
          mudar({ ...a, opacidadeRasa }),
        )}
        {n('Opacidade profunda', a.opacidadeProfunda, 0, 1, 0.05, (opacidadeProfunda) =>
          mudar({ ...a, opacidadeProfunda }),
        )}
        {n(
          'Profundidade da cor',
          a.profundidadeDeCor,
          0.05,
          1000,
          0.25,
          (profundidadeDeCor) => mudar({ ...a, profundidadeDeCor }),
          'm',
        )}
        {n(
          'Altura das ondas',
          a.ondas.altura,
          0,
          0.5,
          0.01,
          (altura) => mudar({ ...a, ondas: { ...a.ondas, altura } }),
          'm',
        )}
        {n(
          'Comprimento das ondas',
          a.ondas.comprimento,
          0.25,
          100,
          0.25,
          (comprimento) => mudar({ ...a, ondas: { ...a.ondas, comprimento } }),
          'm',
        )}
        {n(
          'Velocidade das ondas',
          a.ondas.velocidade,
          0,
          10,
          0.1,
          (velocidade) => mudar({ ...a, ondas: { ...a.ondas, velocidade } }),
          'm/s',
        )}
        {n(
          'Largura da espuma',
          a.espuma.largura,
          0,
          10,
          0.1,
          (largura) => mudar({ ...a, espuma: { ...a.espuma, largura } }),
          'm',
        )}
        {n('Intensidade da espuma', a.espuma.intensidade, 0, 1, 0.05, (intensidade) =>
          mudar({ ...a, espuma: { ...a.espuma, intensidade } }),
        )}
        <fieldset className="mcn-campo">
          <legend>Cor da espuma</legend>
          <ColorPicker
            value={a.espuma.cor}
            onChange={(cor) => mudar({ ...a, espuma: { ...a.espuma, cor } })}
          />
        </fieldset>
      </div>
    </details>
  )
}
