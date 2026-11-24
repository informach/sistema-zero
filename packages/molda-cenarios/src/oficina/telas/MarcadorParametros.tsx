import type { MarcadorDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { CampoCor, CampoVetor } from './CamposDoJogo'
import { CampoNumero } from './Painel'

export function MarcadorParametros({
  marcador: m,
  mudar,
  capturarCamera,
  verCamera,
  alturaDoAvatar,
}: {
  marcador: MarcadorDeCenario
  mudar(valor: MarcadorDeCenario): boolean
  capturarCamera(): void
  verCamera(): void
  alturaDoAvatar(): number
}) {
  const c = m.configuracao
  if (!c) return null
  return (
    <>
      {c.tipo === 'inicio' ? (
        <label className="mcn-opcao">
          <input
            type="checkbox"
            checked={c.principal}
            onChange={(e) => mudar({ ...m, configuracao: { ...c, principal: e.target.checked } })}
          />
          Início principal do Testar
        </label>
      ) : null}
      {c.tipo === 'zona' && c.forma.tipo === 'caixa' ? (
        <CampoVetor
          rotulo="Tamanho da zona"
          valor={c.forma.tamanho}
          min={0.01}
          max={10000}
          aoMudar={(tamanho) =>
            mudar({ ...m, configuracao: { ...c, forma: { tipo: 'caixa', tamanho } } })
          }
        />
      ) : null}
      {c.tipo === 'zona' && c.forma.tipo === 'esfera' ? (
        <CampoNumero
          rotulo="Raio da zona"
          valor={c.forma.raio}
          min={0.01}
          max={10000}
          sufixo="m"
          aoMudar={(raio) =>
            mudar({ ...m, configuracao: { ...c, forma: { tipo: 'esfera', raio } } })
          }
        />
      ) : null}
      {c.tipo === 'zona' && c.forma.tipo === 'poligono' ? (
        <CampoNumero
          rotulo="Altura da zona"
          valor={c.forma.altura}
          min={0.01}
          max={10000}
          sufixo="m"
          aoMudar={(altura) =>
            mudar({
              ...m,
              configuracao: {
                ...c,
                forma: {
                  ...c.forma,
                  tipo: 'poligono',
                  pontos: c.forma.tipo === 'poligono' ? c.forma.pontos : [],
                  altura,
                },
              },
            })
          }
        />
      ) : null}
      {c.tipo === 'regua' ? (
        <CampoVetor
          rotulo="Fim relativo da régua"
          valor={c.fim}
          aoMudar={(fim) => mudar({ ...m, configuracao: { ...c, fim } })}
        />
      ) : null}
      {c.tipo === 'escala' ? (
        <>
          <CampoNumero
            rotulo="Altura de referência"
            valor={c.altura}
            min={0.1}
            max={10}
            passo={0.01}
            sufixo="m"
            aoMudar={(altura) => mudar({ ...m, configuracao: { ...c, altura } })}
          />
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => mudar({ ...m, configuracao: { ...c, altura: alturaDoAvatar() } })}
          >
            Usar altura nativa do personagem
          </button>
        </>
      ) : null}
      {c.tipo === 'camera' ? (
        <>
          <div className="mcn-caminho-acoes">
            <button type="button" className="sz-tool-btn" onClick={capturarCamera}>
              Capturar vista atual
            </button>
            <button type="button" className="sz-tool-btn" onClick={verCamera}>
              Olhar por esta câmera
            </button>
          </div>
          <CampoNumero
            rotulo="Campo de visão"
            valor={c.campoDeVisao}
            min={15}
            max={100}
            sufixo="°"
            aoMudar={(campoDeVisao) => mudar({ ...m, configuracao: { ...c, campoDeVisao } })}
          />
          <details className="mcn-grupo">
            <summary>Alvo relativo da câmera</summary>
            <CampoVetor
              rotulo="Alvo da câmera"
              valor={c.alvo}
              aoMudar={(alvo) => mudar({ ...m, configuracao: { ...c, alvo } })}
            />
          </details>
        </>
      ) : null}
      {c.tipo === 'luz' ? (
        <>
          <CampoCor
            rotulo="Cor da luz"
            valor={c.luz.cor}
            aoMudar={(cor) => mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, cor } } })}
          />
          <CampoNumero
            rotulo="Intensidade da luz"
            valor={c.luz.intensidade}
            min={0}
            max={10000}
            aoMudar={(intensidade) =>
              mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, intensidade } } })
            }
          />
          <CampoNumero
            rotulo="Alcance da luz"
            valor={c.luz.alcance}
            min={0.1}
            max={10000}
            sufixo="m"
            aoMudar={(alcance) =>
              mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, alcance } } })
            }
          />
          <label className="mcn-opcao">
            <input
              type="checkbox"
              checked={c.luz.sombra}
              onChange={(e) =>
                mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, sombra: e.target.checked } } })
              }
            />
            Projetar sombra
          </label>
          <p className="text-sm text-mld-muted">
            Até 32 luzes locais, com sombra em até quatro. Sombras locais usam resolução de até 512
            px por face.
          </p>
          <details className="mcn-grupo">
            <summary>Propagação e direção</summary>
            <CampoNumero
              rotulo="Decaimento"
              valor={c.luz.decaimento}
              min={0}
              max={2}
              passo={0.1}
              aoMudar={(decaimento) =>
                mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, decaimento } } })
              }
            />
            {c.luz.tipo === 'foco' ? (
              <>
                <CampoVetor
                  rotulo="Alvo do foco"
                  valor={c.luz.alvo}
                  aoMudar={(alvo) => {
                    if (c.luz.tipo === 'foco')
                      mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, alvo } } })
                  }}
                />
                <CampoNumero
                  rotulo="Ângulo do foco"
                  valor={c.luz.angulo}
                  min={1}
                  max={89}
                  sufixo="°"
                  aoMudar={(angulo) => {
                    if (c.luz.tipo === 'foco')
                      mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, angulo } } })
                  }}
                />
                <CampoNumero
                  rotulo="Penumbra"
                  valor={c.luz.penumbra}
                  min={0}
                  max={1}
                  passo={0.05}
                  aoMudar={(penumbra) => {
                    if (c.luz.tipo === 'foco')
                      mudar({ ...m, configuracao: { ...c, luz: { ...c.luz, penumbra } } })
                  }}
                />
              </>
            ) : null}
          </details>
        </>
      ) : null}
    </>
  )
}
