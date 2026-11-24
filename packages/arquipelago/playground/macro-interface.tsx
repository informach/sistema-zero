import { type ComponentProps, useState } from 'react'
import { useEstado } from '../src/estado/contexto'
import type { SituacaoDoPiloto } from '../src/mundo/faisca/piloto'
import { CORPO } from '../src/sistemas/corpo'
import type { LugarDaFaiscaId } from '../src/sistemas/faisca'
import { ROTAS_DA_FAISCA } from '../src/sistemas/faisca'
import {
  ARQUIPELAGO,
  conexaoDaIlha,
  DISTRITOS_DA_FAISCA,
} from '../src/sistemas/geografia-do-arquipelago'
import type { MedicaoDePercurso } from '../src/sistemas/medicao-de-percurso'
import type { EstadoDaPonte } from '../src/sistemas/ponte-do-arquipelago'
import { RITMOS_DA_AVENTURA, ritmoDaAventura } from '../src/sistemas/ritmo-da-aventura'
import { MapaDaFaisca } from './faisca-mapa'

const PONTE_DO_BOSQUE = conexaoDaIlha('bosque')

export interface MedidaMacro {
  x: number
  y: number
  z: number
  ilha: string
  fps: number
  chamadas: number
  triangulos: number
  geometrias: number
  texturas: number
  setores: number
  distanciaCamera: number
  giroCamera: number
  nadando: boolean
}

function BotaoMacro({ onClick, ...props }: ComponentProps<'button'>) {
  return (
    <button
      {...props}
      onClick={(event) => {
        onClick?.(event)
        if (event.detail > 0) event.currentTarget.blur()
      }}
    />
  )
}
export function InterfaceMacro({
  publicacao,
  medida,
  ponte,
  erro,
  pausado,
  aoPausar,
  aoReconstruir,
  aoIr,
  aoReiniciar,
  noite,
  aoNoite,
  arte,
  aoTentarArte,
  visitados,
  aoVoltar,
  medicao,
  aoMedirRota,
}: {
  publicacao?: { ilha: string; versao: number }
  medida: MedidaMacro
  ponte: EstadoDaPonte
  erro: string | null
  pausado: boolean
  aoPausar: () => void
  aoReconstruir: () => void
  aoIr: (id: string) => void
  aoReiniciar: () => void
  noite: boolean
  aoNoite: () => void
  arte: SituacaoDoPiloto
  aoTentarArte: () => void
  visitados: readonly string[]
  aoVoltar: (id: LugarDaFaiscaId) => void
  medicao: MedicaoDePercurso | null
  aoMedirRota: (id: string) => void
}) {
  const [mapa, setMapa] = useState(false)
  const conversando = useEstado((s) => s.painelAberto === 'faisca-iris')
  const [local, setLocal] = useState(true)
  const formatar = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
  const nome = ARQUIPELAGO.find((i) => i.id === medida.ilha)?.nome ?? 'Travessia'
  return (
    <div className="macro-interface" style={{ visibility: conversando ? 'hidden' : undefined }}>
      <header
        className="macro-topo"
        data-arte={arte.estado}
        data-publicacao={publicacao ? `${publicacao.ilha}:${publicacao.versao}` : undefined}
      >
        <div>
          <strong>Faísca V2 · proposta artística em avaliação</strong>
          <span>
            {nome} · escala nativa · arte{' '}
            {arte.estado === 'pronto' ? `${arte.modelos} modelos prontos` : arte.estado}
            {publicacao && ` · publicação ${publicacao.versao} · ensaio local`}
          </span>
        </div>
        <BotaoMacro type="button" onClick={() => setMapa(!mapa)} aria-expanded={mapa}>
          Mapa
        </BotaoMacro>
        <BotaoMacro type="button" onClick={aoNoite} disabled={arte.estado === 'carregando'}>
          {noite ? 'Ver de dia' : 'Ver à noite'}
        </BotaoMacro>
        <BotaoMacro type="button" onClick={aoPausar}>
          {pausado ? 'Continuar' : 'Pausar'}
        </BotaoMacro>
      </header>
      {erro ? (
        <div className="macro-erro" role="alert">
          {erro}{' '}
          <BotaoMacro type="button" onClick={aoReiniciar}>
            Recomeçar ensaio
          </BotaoMacro>
        </div>
      ) : null}
      {arte.estado === 'erro' ? (
        <div className="macro-erro" role="alert">
          {arte.erro}{' '}
          <BotaoMacro type="button" onClick={aoTentarArte}>
            Tentar carregar a arte
          </BotaoMacro>
        </div>
      ) : null}
      {mapa ? (
        <section className="macro-mapa" aria-label="Mapa do novo arquipélago">
          <div className="macro-pontos">
            <BotaoMacro type="button" onClick={() => setLocal(true)}>
              Faísca
            </BotaoMacro>
            <BotaoMacro type="button" onClick={() => setLocal(false)}>
              Arquipélago
            </BotaoMacro>
          </div>
          {local ? (
            <MapaDaFaisca
              x={medida.x}
              z={medida.z}
              visitados={visitados}
              aoVoltar={(id) => {
                setMapa(false)
                aoVoltar(id)
              }}
            />
          ) : (
            <>
              <h2>Sete territórios, seis conexões</h2>
              <svg
                viewBox="-1040 -1040 2080 2080"
                role="img"
                aria-label="Faísca no centro, com seis ilhas ao redor"
              >
                {ARQUIPELAGO.slice(1).map((i) => (
                  <line
                    key={i.id}
                    x1={0}
                    y1={0}
                    x2={i.centro.x}
                    y2={i.centro.z}
                    stroke={i.id === 'bosque' && ponte === 'aberta' ? '#eac669' : '#8eaaa9'}
                    strokeWidth="6"
                    strokeDasharray={i.id === 'bosque' && ponte === 'aberta' ? undefined : '18 14'}
                  />
                ))}
                {ARQUIPELAGO.map((i) => (
                  <g key={i.id}>
                    <circle
                      cx={i.centro.x}
                      cy={i.centro.z}
                      r={i.raio}
                      fill={i.cor}
                      fillOpacity=".65"
                      stroke="#e0e9df"
                      strokeWidth="3"
                    />
                    <text
                      x={i.centro.x}
                      y={i.centro.z - 16}
                      textAnchor="middle"
                      fill="white"
                      fontSize="34"
                    >
                      {i.nome}
                    </text>
                    <text
                      x={i.centro.x}
                      y={i.centro.z + 32}
                      textAnchor="middle"
                      fill="#ecf1dd"
                      fontSize="28"
                    >
                      {i.raio * 2} m
                    </text>
                  </g>
                ))}
                <circle
                  cx={medida.x}
                  cy={medida.z}
                  r={14}
                  fill="#ffe381"
                  stroke="#263e47"
                  strokeWidth="5"
                />
              </svg>
              <p>Os círculos mostram envelopes de estudo. Os terrenos têm costas próprias.</p>
            </>
          )}
          <BotaoMacro type="button" onClick={() => setMapa(false)}>
            Fechar mapa
          </BotaoMacro>
        </section>
      ) : null}
      <details className="macro-painel" open={false}>
        <summary>Medidas e pontos de teste</summary>
        <p>
          WASD ou setas · Shift corre · Espaço pula · E usa · arrastar gira · roda aproxima. Toque
          no chão para caminhar.
        </p>
        <dl>
          <dt>Altura do avatar</dt>
          <dd>{formatar(CORPO.medidas.height)} m · escala 1</dd>
          <dt>Andar / correr</dt>
          <dd>
            {formatar(CORPO.andar)} / {formatar(CORPO.correr)} m/s
          </dd>
          <dt>Ponte do Bosque</dt>
          <dd>
            {formatar(PONTE_DO_BOSQUE.comprimento)} × {PONTE_DO_BOSQUE.largura} m
          </dd>
          <dt>Posição</dt>
          <dd>
            {formatar(medida.x)}, {formatar(medida.y)}, {formatar(medida.z)} m
          </dd>
          <dt>Quadros</dt>
          <dd>{medida.fps} / s</dd>
          <dt>Distância da câmera</dt>
          <dd>{medida.distanciaCamera.toFixed(2)} m</dd>
          <dt>Giro da câmera</dt>
          <dd>{medida.giroCamera.toFixed(3)} rad</dd>
          <dt>Nadando</dt>
          <dd>{medida.nadando ? 'sim' : 'não'}</dd>
          <dt>Setores com física</dt>
          <dd>{medida.setores}</dd>
          <dt>Chamadas de desenho</dt>
          <dd>{medida.chamadas}</dd>
          <dt>Triângulos</dt>
          <dd>{formatar(medida.triangulos)}</dd>
          <dt>Geometrias</dt>
          <dd>{medida.geometrias}</dd>
          <dt>Texturas</dt>
          <dd>{medida.texturas}</dd>
        </dl>
        <fieldset>
          <legend>Ritmo de exploração</legend>
          <div className="macro-pontos">
            {Object.entries(RITMOS_DA_AVENTURA).map(([id, r]) => (
              <BotaoMacro
                key={id}
                type="button"
                aria-pressed={
                  ritmoDaAventura(new URLSearchParams(location.search).get('ritmo')) === id
                }
                onClick={() => {
                  const url = new URL(location.href)
                  url.searchParams.set('ritmo', id)
                  location.href = url.href
                }}
              >
                {r.nome} · {r.andar.toFixed(1)} / {r.correr.toFixed(1)}
              </BotaoMacro>
            ))}
          </div>
        </fieldset>
        <details>
          <summary>Medir um percurso com o avatar</summary>
          <p>
            A ferramenta posiciona na saída. Caminhe até o destino; o relógio conta só o tempo ativo
            e o deslocamento real. Atalhos de ferramenta cancelam a medida.
          </p>
          <div className="macro-pontos">
            {ROTAS_DA_FAISCA.filter((r) => r.tipo === 'cotidiano').map((r) => (
              <BotaoMacro
                type="button"
                key={r.id}
                onClick={() => aoMedirRota(r.id)}
                disabled={arte.estado === 'carregando'}
              >
                {r.nome}
              </BotaoMacro>
            ))}
          </div>
          {medicao ? (
            <p role="status">
              Percurso {medicao.estado} · {medicao.metros.toFixed(1)} m ·{' '}
              {medicao.segundos.toFixed(1)} s
            </p>
          ) : null}
        </details>
        <p>
          Salvamento deste ensaio: posição local em terra e estado da ponte. Nenhum progresso de
          conta é concedido.
        </p>
        <div className="macro-pontos">
          {DISTRITOS_DA_FAISCA.map((d) => (
            <BotaoMacro
              key={d.id}
              type="button"
              onClick={() => aoIr(d.id)}
              disabled={arte.estado === 'carregando'}
            >
              {d.nome}
            </BotaoMacro>
          ))}
          <BotaoMacro
            type="button"
            onClick={() => aoIr('ponte')}
            disabled={arte.estado === 'carregando'}
          >
            Cabeceira da ponte
          </BotaoMacro>
          {ponte === 'aberta' ? (
            <BotaoMacro
              type="button"
              onClick={() => aoIr('bosque-chegada')}
              disabled={arte.estado === 'carregando'}
            >
              Chegada do Bosque
            </BotaoMacro>
          ) : null}
          <BotaoMacro type="button" onClick={aoReiniciar}>
            Recomeçar ensaio
          </BotaoMacro>
        </div>
      </details>
      <section className="macro-conexao" aria-label="Primeira conexão">
        <strong>Faísca → Bosque</strong>
        <span>
          {ponte === 'aberta'
            ? 'Ponte reconstruída'
            : ponte === 'reconstruindo'
              ? 'Reconstruindo os módulos…'
              : 'Ponte partida'}
        </span>
        {ponte !== 'aberta' ? (
          <BotaoMacro type="button" disabled={ponte === 'reconstruindo'} onClick={aoReconstruir}>
            Reconstruir para testar
          </BotaoMacro>
        ) : null}
      </section>
    </div>
  )
}

export const ESTILOS_MACRO = [
  '.macro-interface{position:absolute;inset:0;pointer-events:none;color:#f6f1df;font:14px/1.4 system-ui,sans-serif}.macro-interface *{box-sizing:border-box}.macro-interface button,.macro-interface details,.macro-mapa{pointer-events:auto}.macro-interface button{min-height:44px;border:1px solid #667b73;border-radius:9px;padding:8px 13px;background:#203b43;color:#f9f1d6;font:600 13px system-ui;cursor:pointer}.macro-interface button:focus-visible{outline:3px solid #ffd36d;outline-offset:3px}.macro-interface button:disabled{opacity:.55;cursor:default}',
  '.macro-topo{position:absolute;left:14px;right:14px;top:14px;display:flex;gap:8px;align-items:center;pointer-events:none}.macro-topo>div{margin-right:auto;background:#213d45e8;padding:10px 15px;border-radius:12px}.macro-topo strong,.macro-topo span{display:block}.macro-topo span{font-size:12px;color:#c5d3c5}',
  '.macro-painel{position:absolute;left:14px;bottom:14px;width:min(380px,calc(100vw - 28px));max-height:65vh;overflow:auto;border-radius:12px;padding:13px;background:#213d45ed}.macro-painel summary{font-weight:700;cursor:pointer;min-height:24px}.macro-painel p{font-size:12px;color:#d4dfce}.macro-painel dl{display:grid;grid-template-columns:1fr 1fr;gap:4px}.macro-painel dd{margin:0;text-align:right}.macro-pontos{display:flex;flex-wrap:wrap;gap:6px}',
  '.macro-conexao{position:absolute;right:14px;bottom:14px;padding:14px;background:#213d45ed;border-radius:12px;display:flex;flex-direction:column;gap:5px}.macro-conexao span{font-size:12px;color:#d4dfce}.macro-mapa{position:absolute;z-index:3;top:85px;right:14px;padding:16px;background:#193640f5;border-radius:14px;width:min(520px,calc(100vw - 28px));max-height:75vh;overflow:auto}.macro-mapa h2{font-size:17px;margin:0}.macro-mapa svg{width:100%;max-height:55vh}.macro-mapa p{font-size:12px}.macro-erro{position:absolute;z-index:4;top:85px;left:14px;max-width:400px;background:#753a2f;padding:12px;border-radius:10px;pointer-events:auto}',
  '@media(max-width:650px){.macro-topo{flex-wrap:wrap;top:8px;left:8px;right:8px}.macro-topo>div{width:100%;padding:7px 10px}.macro-topo strong{font-size:13px}.macro-topo span{font-size:11px}.macro-topo button{font-size:12px;padding:5px 10px}.macro-conexao{top:120px;bottom:auto;right:8px;max-width:165px;padding:9px}.macro-conexao strong{font-size:12px}.macro-painel{bottom:8px;left:8px;width:auto;max-width:calc(100vw - 16px)}.macro-painel[open]{width:calc(100vw - 16px);max-height:48vh}.macro-mapa{top:120px;right:8px}.macro-erro{top:120px}}',
].join('\n')
