import { ColorPicker } from '@sistemazero/molda/ui'
import type {
  EncaixeDeModeloDeCaminho,
  VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import { useState } from 'react'
import { caminhoComPeca } from '../caminho-formulario'
import type { Biblioteca, CenariosHost } from '../portas'
import type { useCaminhos } from '../useCaminhos'
import { EscolherTextura } from './EscolherTextura'
import { CampoNumero } from './Painel'

export function CaminhoAcabamento({
  caminhos: t,
  host,
  bibliotecas,
  aoEscolherModelo,
  medir,
}: {
  caminhos: ReturnType<typeof useCaminhos>
  host: CenariosHost
  bibliotecas: readonly Biblioteca[]
  aoEscolherModelo(): void
  medir(id: string): VolumeDeComposicao | null
}) {
  const [escolhendoTextura, setEscolhendoTextura] = useState(false),
    c = t.rascunho
  if (!c) return null
  const modelo = t.definicoes.modelos.find((m) => m.id === c.acabamento),
    volume = modelo ? (medir(modelo.id) ?? modelo.volume) : null,
    textura = t.definicoes.texturas.find((r) => r.id === c.aparencia?.textura?.id),
    e = c.encaixeModelo,
    eixo = e?.eixo ?? 'x',
    transversal = eixo === 'x' ? 'z' : 'x'
  const mudarEncaixe = (patch: Partial<EncaixeDeModeloDeCaminho>) =>
    t.mudar({ ...c, encaixeModelo: { eixo, ...e, ...patch } })
  return (
    <details className="mcn-grupo" open>
      <summary>Peça e acabamento</summary>
      <p className="text-sm font-semibold text-mld-text">
        {modelo?.nome ?? (c.acabamento ? 'Peça do cenário' : 'Acabamento simples')}
      </p>
      <button type="button" className="sz-tool-btn" onClick={aoEscolherModelo}>
        Escolher peça na biblioteca
      </button>
      <label className="mcn-campo">
        Peça do cenário
        <select
          value={c.acabamento ?? ''}
          onChange={(ev) => {
            const m = t.definicoes.modelos.find((m) => m.id === ev.target.value) ?? null
            t.mudar(
              caminhoComPeca(
                c,
                m ? { ...m, ...(!m.volume && medir(m.id) ? { volume: medir(m.id)! } : {}) } : null,
              ),
            )
          }}
        >
          <option value="">Acabamento simples</option>
          {t.definicoes.modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome ?? m.modelo}
            </option>
          ))}
        </select>
      </label>
      {c.acabamento ? (
        <>
          {volume ? (
            <p className="text-sm text-mld-muted">
              Peça medida: {(volume.max.x - volume.min.x).toFixed(2)} ×{' '}
              {(volume.max.y - volume.min.y).toFixed(2)} ×{' '}
              {(volume.max.z - volume.min.z).toFixed(2)} m (X, Y, Z).
            </p>
          ) : null}
          <p className="text-sm text-mld-muted">
            Confira o eixo e o contato com o chão na prévia. O valor inicial de altura usa a base da
            peça; numa ponte, ajuste para o piso das cabeceiras.
          </p>
          <label className="mcn-campo">
            Eixo do comprimento
            <select
              value={eixo}
              onChange={(ev) => {
                const encaixe = { ...e, eixo: ev.target.value as 'x' | 'z' }
                delete encaixe.inicioLocal
                delete encaixe.fimLocal
                delete encaixe.centroTransversalLocal
                t.mudar({ ...c, encaixeModelo: encaixe })
              }}
            >
              <option value="x">X</option>
              <option value="z">Z</option>
            </select>
          </label>
          <CampoNumero
            rotulo={
              c.tipo === 'ponte' ? 'Altura local do piso nas cabeceiras' : 'Altura local da base'
            }
            valor={(c.tipo === 'ponte' ? e?.pisoLocal : e?.baseLocal) ?? volume?.min.y ?? 0}
            min={volume?.min.y ?? -100000}
            max={volume?.max.y ?? 100000}
            passo={0.01}
            sufixo="m"
            aoMudar={(v) => mudarEncaixe(c.tipo === 'ponte' ? { pisoLocal: v } : { baseLocal: v })}
          />
          {volume ? (
            <>
              <label className="mcn-opcao-encaixe">
                Medir trecho útil da peça
                <input
                  type="checkbox"
                  checked={e?.inicioLocal !== undefined}
                  onChange={(ev) => {
                    const encaixe = { eixo, ...e }
                    if (ev.target.checked) {
                      encaixe.inicioLocal = volume.min[eixo]
                      encaixe.fimLocal = volume.max[eixo]
                    } else {
                      delete encaixe.inicioLocal
                      delete encaixe.fimLocal
                    }
                    t.mudar({ ...c, encaixeModelo: encaixe })
                  }}
                />
              </label>
              {e?.inicioLocal !== undefined ? (
                <>
                  <CampoNumero
                    rotulo="Início local do trecho útil"
                    valor={e.inicioLocal}
                    min={volume.min[eixo]}
                    max={volume.max[eixo]}
                    passo={0.01}
                    sufixo="m"
                    aoMudar={(inicioLocal) => mudarEncaixe({ inicioLocal })}
                  />
                  <CampoNumero
                    rotulo="Fim local do trecho útil"
                    valor={e.fimLocal!}
                    min={volume.min[eixo]}
                    max={volume.max[eixo]}
                    passo={0.01}
                    sufixo="m"
                    aoMudar={(fimLocal) => mudarEncaixe({ fimLocal })}
                  />
                </>
              ) : null}
              <CampoNumero
                rotulo="Centro transversal local"
                valor={
                  e?.centroTransversalLocal ??
                  (volume.min[transversal] + volume.max[transversal]) / 2
                }
                min={volume.min[transversal]}
                max={volume.max[transversal]}
                passo={0.01}
                sufixo="m"
                aoMudar={(centroTransversalLocal) => mudarEncaixe({ centroTransversalLocal })}
              />
            </>
          ) : null}
        </>
      ) : null}
      <label className="mcn-opcao-encaixe">
        Colorir superfície
        <input
          type="checkbox"
          checked={Boolean(c.aparencia?.cor)}
          onChange={(ev) => {
            const aparencia = { ...c.aparencia }
            if (ev.target.checked) aparencia.cor = '#b88d63'
            else delete aparencia.cor
            t.mudar({ ...c, aparencia })
          }}
        />
      </label>
      {c.aparencia?.cor ? (
        <fieldset className="mcn-campo">
          <legend>Cor da superfície</legend>
          <ColorPicker
            value={c.aparencia.cor}
            onChange={(cor) => t.mudar({ ...c, aparencia: { ...c.aparencia, cor } })}
          />
        </fieldset>
      ) : null}
      <p className="text-sm text-mld-muted">
        Textura: {textura?.nome ?? (c.aparencia?.textura ? 'Textura aplicada' : 'Original da peça')}
      </p>
      <button type="button" className="sz-tool-btn" onClick={() => setEscolhendoTextura(true)}>
        Escolher textura
      </button>
      {c.aparencia?.textura ? (
        <>
          <CampoNumero
            rotulo="Repetição da textura"
            valor={c.aparencia.textura.repeticaoMetros}
            min={0.1}
            max={100}
            passo={0.1}
            sufixo="m"
            aoMudar={(repeticaoMetros) =>
              t.mudar({
                ...c,
                aparencia: {
                  ...c.aparencia,
                  textura: { ...c.aparencia!.textura!, repeticaoMetros },
                },
              })
            }
          />
          <button
            type="button"
            className="sz-tool-btn"
            onClick={() => {
              const aparencia = { ...c.aparencia }
              delete aparencia.textura
              t.mudar({ ...c, aparencia })
            }}
          >
            Restaurar textura original
          </button>
        </>
      ) : null}
      {escolhendoTextura ? (
        <EscolherTextura
          host={host}
          bibliotecas={bibliotecas}
          aoFechar={() => setEscolhendoTextura(false)}
          aoEscolher={(r) => {
            setEscolhendoTextura(false)
            t.usarTextura(r)
          }}
        />
      ) : null}
    </details>
  )
}
