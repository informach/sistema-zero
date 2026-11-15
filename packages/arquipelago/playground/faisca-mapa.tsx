import { CORPO } from '../src/sistemas/corpo'
import {
  comprimentoDaRota,
  DISTRITOS_DA_FAISCA,
  LUGAR_DA_FAISCA,
  type LugarDaFaiscaId,
  ligarCabeceiras,
  ROTAS_DA_FAISCA,
} from '../src/sistemas/faisca'
import {
  ARQUIPELAGO,
  alturaDoArquipelago,
  conexaoDaIlha,
  ilhaDoArquipelago,
  raioDoContorno,
} from '../src/sistemas/geografia-do-arquipelago'

const rotas = [
  ...ROTAS_DA_FAISCA,
  ...ligarCabeceiras(ARQUIPELAGO.slice(1).map((i) => conexaoDaIlha(i.id))),
]
const contorno = Array.from({ length: 120 }, (_, i) => {
  const a = (i * Math.PI * 2) / 120,
    r = raioDoContorno(ilhaDoArquipelago('sua-ilha'), a)
  return `${Math.cos(a) * r},${Math.sin(a) * r}`
}).join(' ')
export function MapaDaFaisca({
  x,
  z,
  visitados,
  aoVoltar,
}: {
  x: number
  z: number
  visitados: readonly string[]
  aoVoltar: (id: LugarDaFaiscaId) => void
}) {
  return (
    <>
      <h2>Faísca · caminhos e descobertas</h2>
      <svg
        viewBox="-280 -280 560 560"
        role="img"
        aria-label="Os seis distritos, anel, atalhos e saídas da Faísca"
      >
        <polygon points={contorno} fill="#728b55" fillOpacity=".35" stroke="#b2c8a4" />
        {DISTRITOS_DA_FAISCA.map((d, i) => (
          <g key={d.id}>
            <circle cx={d.x} cy={d.z} r={d.raio} fill={d.cor} fillOpacity=".28" />
            <text x={d.x} y={d.z - d.raio + 7} textAnchor="middle" fill="white" fontSize="17">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
        {rotas.map((r) => (
          <polyline
            key={r.id}
            points={r.pontos.map((p) => `${p.x},${p.z}`).join(' ')}
            fill="none"
            stroke={r.tipo === 'atalho' ? '#91bca7' : '#ebd1a0'}
            strokeWidth={r.tipo === 'cotidiano' ? 2.5 : 1.1}
            strokeDasharray={r.tipo === 'atalho' ? '3 3' : undefined}
          />
        ))}
        {rotas
          .filter((r) => r.tipo === 'cabeceira')
          .map((r) => {
            const p = r.pontos.at(-1)!
            return <circle key={r.id} cx={p.x} cy={p.z} r="4" fill="#eab759" />
          })}
        {Object.entries(LUGAR_DA_FAISCA).map(([id, p]) => (
          <circle
            key={id}
            cx={p.x}
            cy={p.z}
            r={visitados.includes(id) ? 3 : 1.8}
            fill={visitados.includes(id) ? '#fff4a8' : '#acbdad'}
          />
        ))}
        <circle cx={x} cy={z} r="4" fill="#ffdf56" stroke="#1c3736" strokeWidth="1.5" />
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
        {DISTRITOS_DA_FAISCA.map((d, i) => (
          <span key={d.id}>
            {String.fromCharCode(65 + i)} · {d.nome}
          </span>
        ))}
      </div>
      <p>
        As três direções da praça: Campos, Pátio e Costa. Pontos claros são lugares descobertos.
      </p>
      <div className="macro-pontos">
        {(['casa', 'praca', 'horta', 'patio', 'costa', 'farol', 'bosque'] as const)
          .filter((id) => visitados.includes(id))
          .map((id) => (
            <button
              className="arq-botao leve"
              key={id}
              type="button"
              onClick={(e) => {
                e.currentTarget.blur()
                aoVoltar(id)
              }}
            >
              Voltar:{' '}
              {id === 'casa'
                ? 'porta da Morada'
                : id === 'patio'
                  ? 'Pátio'
                  : id === 'horta'
                    ? 'horta da Íris'
                    : id}
            </button>
          ))}
      </div>
      <details>
        <summary>Distâncias e tempos de referência</summary>
        <table>
          <thead>
            <tr>
              <th>Rota</th>
              <th>Metros</th>
              <th>A pé</th>
            </tr>
          </thead>
          <tbody>
            {ROTAS_DA_FAISCA.filter((r) => r.tipo === 'cotidiano').map((r) => {
              const m = comprimentoDaRota(r.pontos, alturaDoArquipelago)
              return (
                <tr key={r.id}>
                  <td>{r.nome}</td>
                  <td>{m.toFixed(1)}</td>
                  <td>{Math.round(m / CORPO.andar)} s</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </details>
    </>
  )
}
