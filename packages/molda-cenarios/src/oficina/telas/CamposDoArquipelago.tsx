import {
  type CamposDoArquipelago as Campos,
  gravarCamposDoArquipelago,
  LIMITES_DO_ARQUIPELAGO,
  lerCamposDoArquipelago,
  type MudancasNoArquipelago,
  TIPOS_DE_FISICA_DO_ARQUIPELAGO,
  type TipoDeFisicaDoArquipelago,
  validarCamposDoArquipelago,
} from '@sistemazero/molda-cenarios-core/v2'
import { type JSX, useId } from 'react'
import { CampoNumero, CampoTexto } from './Painel'

type Propriedades = Record<string, string | number | boolean>

const NOMES_DA_FISICA: Record<TipoDeFisicaDoArquipelago, string> = {
  nenhuma: 'Nenhuma (atravessa)',
  caixa: 'Caixa',
  tronco: 'Tronco (cilindro)',
  ponte: 'Ponte (piso)',
  escada: 'Escada',
  malha: 'Malha',
  solo: 'Solo',
}
const FUNDACAO_INICIAL = { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 1, z: 0.5 } }
const PLACA_INICIAL = { texto: 'Praça', destino: 'praca', via: { x: 0, z: 0 } }

/**
 * Os dados que o jogo do Arquipélago lê de cada objeto publicado, em campos prontos: física,
 * enterrado de propósito, fundação, placa e a Íris. Gravam as mesmas chaves `arquipelago.*` que o
 * jogo interpreta; as regras ficam no núcleo, conferidas contra o jogo por um teste de contrato.
 */
export function CamposDoArquipelago({
  propriedades,
  aoGuardar,
  desligado,
}: {
  propriedades: Propriedades | undefined
  aoGuardar(propriedades: Propriedades): void
  desligado?: boolean
}): JSX.Element {
  const id = useId()
  const campos: Campos = lerCamposDoArquipelago(propriedades)
  const avisos = validarCamposDoArquipelago(propriedades)
  const mudar = (mudancas: MudancasNoArquipelago) =>
    aoGuardar(gravarCamposDoArquipelago(propriedades ?? {}, mudancas) as Propriedades)

  return (
    <details className="mcn-grupo mcn-arquipelago" open={Object.keys(campos).length > 0}>
      <summary>No Arquipélago</summary>
      <fieldset disabled={desligado} className="mcn-arquipelago-campos">
        <label htmlFor={`${id}-fisica`} className="mcn-campo">
          <span>Física no jogo</span>
          <select
            id={`${id}-fisica`}
            value={campos.fisica?.tipo ?? ''}
            onChange={(e) =>
              mudar({
                fisica: e.target.value
                  ? {
                      ...campos.fisica,
                      tipo: e.target.value as TipoDeFisicaDoArquipelago,
                    }
                  : null,
              })
            }
          >
            <option value="">A da colisão do objeto</option>
            {TIPOS_DE_FISICA_DO_ARQUIPELAGO.map((t) => (
              <option key={t} value={t}>
                {NOMES_DA_FISICA[t]}
              </option>
            ))}
          </select>
        </label>
        {campos.fisica?.tipo === 'tronco' ? (
          <CampoNumero
            rotulo="Raio do tronco"
            valor={campos.fisica.raioDoTronco ?? 0.23}
            passo={0.01}
            min={0.01}
            max={LIMITES_DO_ARQUIPELAGO.raioDoTronco}
            sufixo="m"
            aoMudar={(raioDoTronco) => mudar({ fisica: { ...campos.fisica, raioDoTronco } })}
          />
        ) : null}

        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={campos.enterrada !== undefined}
            onChange={(e) => mudar({ enterrada: e.target.checked ? 0.3 : null })}
          />
          Enterrado de propósito
        </label>
        {campos.enterrada !== undefined ? (
          <CampoNumero
            rotulo="Quanto da altura fica no chão"
            valor={campos.enterrada}
            passo={0.05}
            min={0}
            max={1}
            aoMudar={(enterrada) => mudar({ enterrada })}
          />
        ) : null}

        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={campos.fundacao !== undefined}
            onChange={(e) => mudar({ fundacao: e.target.checked ? FUNDACAO_INICIAL : null })}
          />
          Fundação sólida (caixa)
        </label>
        {campos.fundacao ? (
          <div className="mcn-arquipelago-fundacao">
            {(['min', 'max'] as const).map((canto) => (
              <div key={canto} className="mcn-linha">
                {(['x', 'y', 'z'] as const).map((eixo) => (
                  <CampoNumero
                    key={eixo}
                    rotulo={`${canto === 'min' ? 'De' : 'Até'} ${eixo.toUpperCase()}`}
                    valor={campos.fundacao![canto][eixo]}
                    passo={0.1}
                    sufixo="m"
                    aoMudar={(v) =>
                      mudar({
                        fundacao: {
                          ...campos.fundacao!,
                          [canto]: { ...campos.fundacao![canto], [eixo]: v },
                        },
                      })
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        ) : null}

        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={campos.placa !== undefined}
            onChange={(e) => mudar({ placa: e.target.checked ? PLACA_INICIAL : null })}
          />
          Placa com texto
        </label>
        {campos.placa ? (
          <>
            <CampoTexto
              rotulo="O que a placa diz"
              valor={campos.placa.texto}
              maximo={LIMITES_DO_ARQUIPELAGO.textoDaPlaca}
              aoMudar={(texto) => mudar({ placa: { ...campos.placa!, texto } })}
            />
            <CampoTexto
              rotulo="Para onde aponta (lugar)"
              valor={campos.placa.destino}
              maximo={LIMITES_DO_ARQUIPELAGO.destinoDaPlaca}
              aoMudar={(destino) => mudar({ placa: { ...campos.placa!, destino } })}
            />
            <div className="mcn-linha">
              {(['x', 'z'] as const).map((eixo) => (
                <CampoNumero
                  key={eixo}
                  rotulo={`Por onde ${eixo.toUpperCase()}`}
                  valor={campos.placa!.via[eixo]}
                  sufixo="m"
                  aoMudar={(v) =>
                    mudar({ placa: { ...campos.placa!, via: { ...campos.placa!.via, [eixo]: v } } })
                  }
                />
              ))}
            </div>
          </>
        ) : null}

        <label className="mcn-marcar">
          <input
            type="checkbox"
            checked={campos.ator === 'iris'}
            onChange={(e) => mudar({ ator: e.target.checked ? 'iris' : null })}
          />
          Esta é a Íris (uma por ilha)
        </label>
      </fieldset>
      {avisos.length ? (
        <ul className="mcn-arquipelago-avisos" role="alert">
          {avisos.map((a) => (
            <li key={`${a.tipo}:${a.chave}`}>{a.mensagem}</li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}
