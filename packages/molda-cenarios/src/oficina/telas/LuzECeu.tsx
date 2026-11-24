import type { IluminacaoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import type { EstadoDoAmbiente } from '@sistemazero/molda-cenarios-motor'
import { useState } from 'react'
import { useFerramentas } from '../faixas'
import type { Biblioteca, CenariosHost } from '../portas'
import type { SecaoDoAmbiente, useAmbiente } from '../useAmbiente'
import { CampoCor, CampoVetor } from './CamposDoJogo'
import { EscolherTextura } from './EscolherTextura'
import { CampoNumero } from './Painel'

/** A prévia responde aos controles; Guardar produz uma única operação autoral. */
export function LuzECeu({
  ambiente: t,
  host,
  bibliotecas,
  indisponivel,
  estado,
}: {
  ambiente: ReturnType<typeof useAmbiente>
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  indisponivel: boolean
  estado: EstadoDoAmbiente
}) {
  const [escolhendo, setEscolhendo] = useState(false),
    i = t.rascunho?.iluminacao
  const { pode } = useFerramentas()
  const mudar = (v: IluminacaoDeCenario) => {
    t.mudar(v)
  }
  const alternarSecao = (secao: SecaoDoAmbiente, aberta: boolean) =>
    t.setSecao((atual) => (aberta ? secao : atual === secao ? null : atual))
  const retirar = (chave: keyof Omit<IluminacaoDeCenario, 'hora'>) => {
    if (!i) return
    const novo = { ...i }
    delete novo[chave]
    mudar(novo)
  }
  return (
    <div className="mcn-painel-corpo mcn-luz">
      <h3>Luz e céu</h3>
      <p className="text-sm text-mld-muted">
        Veja as mudanças no cenário antes de guardar. A hora fornece o padrão; ajustes específicos
        podem ser restaurados.
      </p>
      {t.erro ? (
        <p role="alert" className="mcn-recusa">
          {t.erro}
        </p>
      ) : null}
      {t.mensagem ? (
        <p role="status" className="text-sm text-mld-muted">
          {t.mensagem}
        </p>
      ) : null}
      {[...new Set(estado.falhas)].map((f) => (
        <p key={f} role="alert" className="mcn-recusa">
          {f}
        </p>
      ))}
      <p className="text-sm text-mld-muted">
        {estado.luzes}/32 luzes · {estado.sombrasLocais}/4 sombras locais
        {estado.carregando ? ' · Carregando ambiente…' : ''}
      </p>
      {!i ? (
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--primary"
          disabled={indisponivel}
          onClick={() => t.abrir('sol')}
        >
          Ajustar iluminação
        </button>
      ) : (
        <>
          <fieldset className="mcn-grupo" disabled={indisponivel || t.aplicando}>
            <legend>Hora do cenário</legend>
            <CampoNumero
              rotulo="Hora"
              valor={i.hora}
              min={0}
              max={24}
              passo={0.25}
              sufixo="h"
              aoMudar={(hora) => mudar({ ...i, hora })}
            />
            {pode('luz.sol-e-ambiente') ? (
              <details
                className="mcn-grupo"
                open={t.secao === 'sol'}
                onToggle={(e) => {
                  alternarSecao('sol', e.currentTarget.open)
                }}
              >
                <summary>Sol e sombras</summary>
                {!i.sol ? (
                  <button
                    type="button"
                    className="sz-tool-btn"
                    onClick={() =>
                      mudar({
                        ...i,
                        sol: {
                          direcao: { x: -1, y: 2, z: 1 },
                          cor: '#fff1d8',
                          intensidade: 1.8,
                          sombra: true,
                        },
                      })
                    }
                  >
                    Personalizar o sol
                  </button>
                ) : (
                  <>
                    <CampoCor
                      rotulo="Cor do sol"
                      valor={i.sol.cor}
                      aoMudar={(cor) => mudar({ ...i, sol: { ...i.sol!, cor } })}
                    />
                    <CampoNumero
                      rotulo="Força do sol"
                      valor={i.sol.intensidade}
                      min={0}
                      max={100}
                      passo={0.1}
                      aoMudar={(intensidade) => mudar({ ...i, sol: { ...i.sol!, intensidade } })}
                    />
                    <CampoVetor
                      rotulo="Direção para o sol"
                      valor={i.sol.direcao}
                      unidade=""
                      aoMudar={(direcao) => mudar({ ...i, sol: { ...i.sol!, direcao } })}
                    />
                    <label className="mcn-opcao">
                      <input
                        type="checkbox"
                        checked={i.sol.sombra}
                        onChange={(e) =>
                          mudar({ ...i, sol: { ...i.sol!, sombra: e.target.checked } })
                        }
                      />
                      Projetar sombra do sol
                    </label>
                    <button type="button" className="sz-tool-btn" onClick={() => retirar('sol')}>
                      Usar sol da hora
                    </button>
                  </>
                )}
                {pode('luz.luzes-e-sombra') ? (
                  <details className="mcn-grupo">
                    <summary>Qualidade das sombras</summary>
                    <label className="mcn-campo">
                      Resolução da sombra do sol
                      <select
                        value={i.sombras?.resolucao ?? 1024}
                        onChange={(e) =>
                          mudar({
                            ...i,
                            sombras: {
                              alcance: i.sombras?.alcance ?? 80,
                              resolucao: Number(e.target.value) as 512 | 1024 | 2048,
                            },
                          })
                        }
                      >
                        {[512, 1024, 2048].map((r) => (
                          <option key={r} value={r}>
                            {r} px
                          </option>
                        ))}
                      </select>
                    </label>
                    <CampoNumero
                      rotulo="Alcance das sombras"
                      valor={i.sombras?.alcance ?? 80}
                      min={8}
                      max={512}
                      sufixo="m"
                      aoMudar={(alcance) =>
                        mudar({
                          ...i,
                          sombras: { resolucao: i.sombras?.resolucao ?? 1024, alcance },
                        })
                      }
                    />
                    <p className="text-sm text-mld-muted">
                      O hardware pode limitar a resolução. Aumentar alcance e resolução custa
                      recursos.
                    </p>
                    <button
                      type="button"
                      className="sz-tool-btn"
                      onClick={() => retirar('sombras')}
                    >
                      Restaurar sombras padrão
                    </button>
                  </details>
                ) : null}
              </details>
            ) : null}
            {pode('luz.sol-e-ambiente') ? (
              <details
                className="mcn-grupo"
                open={t.secao === 'ambiente'}
                onToggle={(e) => {
                  alternarSecao('ambiente', e.currentTarget.open)
                }}
              >
                <summary>Luz ambiente</summary>
                {!i.ambiente ? (
                  <button
                    type="button"
                    className="sz-tool-btn"
                    onClick={() =>
                      mudar({ ...i, ambiente: { ceu: '#c9e4ff', chao: '#5c654a', intensidade: 1 } })
                    }
                  >
                    Personalizar luz ambiente
                  </button>
                ) : (
                  <>
                    <CampoCor
                      rotulo="Luz vinda do céu"
                      valor={i.ambiente.ceu}
                      aoMudar={(ceu) => mudar({ ...i, ambiente: { ...i.ambiente!, ceu } })}
                    />
                    <CampoCor
                      rotulo="Luz refletida pelo chão"
                      valor={i.ambiente.chao}
                      aoMudar={(chao) => mudar({ ...i, ambiente: { ...i.ambiente!, chao } })}
                    />
                    <CampoNumero
                      rotulo="Força da luz ambiente"
                      valor={i.ambiente.intensidade}
                      min={0}
                      max={100}
                      passo={0.1}
                      aoMudar={(intensidade) =>
                        mudar({ ...i, ambiente: { ...i.ambiente!, intensidade } })
                      }
                    />
                    <button
                      type="button"
                      className="sz-tool-btn"
                      onClick={() => retirar('ambiente')}
                    >
                      Usar ambiente da hora
                    </button>
                  </>
                )}
              </details>
            ) : null}
            <details
              className="mcn-grupo"
              open={t.secao === 'ceu'}
              onToggle={(e) => {
                alternarSecao('ceu', e.currentTarget.open)
              }}
            >
              <summary>Céu</summary>
              <div className="mcn-caminho-acoes">
                <button type="button" className="sz-tool-btn" onClick={() => retirar('ceu')}>
                  Céu da hora
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  onClick={() => mudar({ ...i, ceu: { tipo: 'cor', cor: '#b8dcf2' } })}
                >
                  Cor do céu
                </button>
                <button type="button" className="sz-tool-btn" onClick={() => setEscolhendo(true)}>
                  Escolher panorama
                </button>
              </div>
              {i.ceu?.tipo === 'cor' ? (
                <CampoCor
                  rotulo="Cor de fundo do céu"
                  valor={i.ceu.cor}
                  aoMudar={(cor) => mudar({ ...i, ceu: { tipo: 'cor', cor } })}
                />
              ) : null}
              {i.ceu?.tipo === 'panorama' ? (
                <>
                  <p className="text-sm text-mld-muted">
                    Panorama da biblioteca ·{' '}
                    {estado.ceu === 'carregando'
                      ? 'carregando'
                      : estado.ceu === 'erro'
                        ? 'falha ao carregar'
                        : 'em prévia'}
                  </p>
                  <CampoNumero
                    rotulo="Giro do panorama"
                    valor={Number(((i.ceu.giro * 180) / Math.PI).toFixed(2))}
                    min={-360}
                    max={360}
                    sufixo="°"
                    passo={15}
                    aoMudar={(giro) => {
                      if (i.ceu?.tipo === 'panorama')
                        mudar({ ...i, ceu: { ...i.ceu, giro: (giro * Math.PI) / 180 } })
                    }}
                  />
                  <CampoNumero
                    rotulo="Intensidade do panorama"
                    valor={i.ceu.intensidade}
                    min={0}
                    max={10}
                    passo={0.1}
                    aoMudar={(intensidade) => {
                      if (i.ceu?.tipo === 'panorama')
                        mudar({ ...i, ceu: { ...i.ceu, intensidade } })
                    }}
                  />
                </>
              ) : null}
              <p className="text-sm text-mld-muted">
                Use uma imagem PNG ou WebP equiretangular 2:1, importada na biblioteca Chãos. Nenhum
                endereço externo é necessário.
              </p>
            </details>
            <details
              className="mcn-grupo"
              open={t.secao === 'nevoa'}
              onToggle={(e) => {
                alternarSecao('nevoa', e.currentTarget.open)
              }}
            >
              <summary>Névoa</summary>
              <div className="mcn-caminho-acoes">
                <button type="button" className="sz-tool-btn" onClick={() => retirar('nevoa')}>
                  Névoa padrão
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  onClick={() => mudar({ ...i, nevoa: { tipo: 'nenhuma' } })}
                >
                  Sem névoa
                </button>
                <button
                  type="button"
                  className="sz-tool-btn"
                  onClick={() =>
                    mudar({
                      ...i,
                      nevoa: { tipo: 'linear', cor: '#c9dce5', perto: 80, longe: 500 },
                    })
                  }
                >
                  Personalizar névoa
                </button>
              </div>
              {i.nevoa?.tipo === 'linear' ? (
                <>
                  <CampoCor
                    rotulo="Cor da névoa"
                    valor={i.nevoa.cor}
                    aoMudar={(cor) => {
                      if (i.nevoa?.tipo === 'linear') mudar({ ...i, nevoa: { ...i.nevoa, cor } })
                    }}
                  />
                  <CampoNumero
                    rotulo="Início da névoa"
                    valor={i.nevoa.perto}
                    min={0}
                    max={100000}
                    sufixo="m"
                    aoMudar={(perto) => {
                      if (i.nevoa?.tipo === 'linear') mudar({ ...i, nevoa: { ...i.nevoa, perto } })
                    }}
                  />
                  <CampoNumero
                    rotulo="Fim da névoa"
                    valor={i.nevoa.longe}
                    min={0.01}
                    max={100000}
                    sufixo="m"
                    aoMudar={(longe) => {
                      if (i.nevoa?.tipo === 'linear') mudar({ ...i, nevoa: { ...i.nevoa, longe } })
                    }}
                  />
                </>
              ) : null}
            </details>
          </fieldset>
          {t.preparando ? <p role="status">Preparando a iluminação…</p> : null}
          <button
            type="button"
            className="sz-tool-pill sz-tool-pill--primary"
            disabled={
              !t.previa ||
              t.preparando ||
              t.aplicando ||
              indisponivel ||
              Boolean(estado.falhas.length)
            }
            onClick={() => void t.aplicar()}
          >
            {t.aplicando ? 'Guardando…' : 'Guardar iluminação'}
          </button>
          <button type="button" className="sz-tool-btn" disabled={t.aplicando} onClick={t.cancelar}>
            Cancelar iluminação
          </button>
        </>
      )}
      {escolhendo ? (
        <EscolherTextura
          host={host}
          bibliotecas={bibliotecas}
          finalidade="panorama"
          aoFechar={() => setEscolhendo(false)}
          aoEscolher={(textura) => {
            t.usarPanorama(textura)
            setEscolhendo(false)
          }}
        />
      ) : null}
    </div>
  )
}
