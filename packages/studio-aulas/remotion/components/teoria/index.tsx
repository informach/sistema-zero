import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

// Biblioteca REUTILIZÁVEL de ilustrações de teoria. Construída uma vez, usada em
// toda aula (é o que substitui "desenhar de novo no Premiere"). São animações
// simples e claras para a criança; refináveis com arte do Pinta depois.

type Params = Record<string, string | number> | undefined

const CorFundo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Baloo 2, Nunito, system-ui, sans-serif',
    }}
  >
    {children}
  </AbsoluteFill>
)

const Legenda: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ position: 'absolute', bottom: 60, color: '#fff', fontSize: 40, fontWeight: 800 }}>
    {texto}
  </div>
)

function pingue(frame: number, periodo: number): number {
  return Math.sin((frame / periodo) * Math.PI * 2)
}

const Sprite: React.FC<{ params: Params }> = ({ params }) => {
  const frame = useCurrentFrame()
  const y = -Math.abs(pingue(frame, 30)) * 60
  const nome = String(params?.nome ?? 'sprite')
  return (
    <CorFundo>
      <div style={{ transform: `translateY(${y}px)`, fontSize: 140 }}>👾</div>
      <Legenda texto={`Isto é um ${nome}`} />
    </CorFundo>
  )
}

const Colisao: React.FC<{ params: Params }> = ({ params }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const meio = durationInFrames / 2
  const dx = interpolate(frame, [0, meio], [-220, -20], { extrapolateRight: 'clamp' })
  const bateu = frame >= meio
  const flash = bateu
    ? interpolate(frame, [meio, meio + 8], [1, 0], { extrapolateRight: 'clamp' })
    : 0
  const a = String(params?.a ?? 'nave')
  const b = String(params?.b ?? 'inimigo')
  return (
    <CorFundo>
      <div style={{ position: 'relative', width: 600, height: 200 }}>
        <div style={{ position: 'absolute', left: 300 + dx, top: 40, fontSize: 100 }}>🚀</div>
        <div style={{ position: 'absolute', right: 300 + dx, top: 40, fontSize: 100 }}>☄️</div>
        {flash > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 250,
              top: 20,
              fontSize: 140,
              opacity: flash,
            }}
          >
            💥
          </div>
        )}
      </div>
      <Legenda texto={`Quando ${a} encosta em ${b}: colisão!`} />
    </CorFundo>
  )
}

const Variavel: React.FC<{ params: Params }> = ({ params }) => {
  const frame = useCurrentFrame()
  const valor = Math.floor(interpolate(frame, [0, 90], [0, 10], { extrapolateRight: 'clamp' }))
  const nome = String(params?.nome ?? 'pontos')
  return (
    <CorFundo>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          background: '#1f2937',
          border: '6px solid #22d3ee',
          borderRadius: 24,
          padding: '32px 56px',
          color: '#fff',
        }}
      >
        <div style={{ fontSize: 36, opacity: 0.8 }}>{nome}</div>
        <div style={{ fontSize: 120, fontWeight: 900 }}>{valor}</div>
      </div>
      <Legenda texto="Uma variável guarda um valor que muda" />
    </CorFundo>
  )
}

const Condicional: React.FC = () => {
  const frame = useCurrentFrame()
  const verdadeiro = Math.floor(frame / 45) % 2 === 0
  const cor = (ativo: boolean) => (ativo ? '#34d399' : '#374151')
  return (
    <CorFundo>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 160,
            height: 160,
            transform: 'rotate(45deg)',
            background: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{ transform: 'rotate(-45deg)', color: '#111', fontWeight: 900, fontSize: 30 }}
          >
            se?
          </span>
        </div>
        <div style={{ display: 'flex', gap: 60 }}>
          <div style={{ color: cor(verdadeiro), fontSize: 40, fontWeight: 800 }}>✔ então</div>
          <div style={{ color: cor(!verdadeiro), fontSize: 40, fontWeight: 800 }}>✘ senão</div>
        </div>
      </div>
      <Legenda texto="Condicional: se algo é verdade, faça isto" />
    </CorFundo>
  )
}

const Loop: React.FC = () => {
  const frame = useCurrentFrame()
  const ang = (frame * 6) % 360
  const voltas = Math.floor((frame * 6) / 360)
  return (
    <CorFundo>
      <div style={{ position: 'relative', width: 220, height: 220 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '10px dashed #a78bfa',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 100,
            top: 100,
            fontSize: 60,
            transform: `rotate(${ang}deg) translate(110px) rotate(-${ang}deg)`,
          }}
        >
          🔁
        </div>
      </div>
      <Legenda texto={`Loop: repete de novo (voltas: ${voltas})`} />
    </CorFundo>
  )
}

const CoordenadasXY: React.FC = () => {
  const frame = useCurrentFrame()
  const x = interpolate(frame, [0, 120], [0, 300], { extrapolateRight: 'clamp' })
  const y = Math.abs(pingue(frame, 40)) * 160
  return (
    <CorFundo>
      <div style={{ position: 'relative', width: 460, height: 320, color: '#fff' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 400,
            height: 4,
            background: '#fff',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 4,
            height: 260,
            background: '#fff',
          }}
        />
        <div style={{ position: 'absolute', left: 405, bottom: -8, fontSize: 30 }}>X</div>
        <div style={{ position: 'absolute', left: -10, top: -30, fontSize: 30 }}>Y</div>
        <div
          style={{
            position: 'absolute',
            left: x,
            bottom: y,
            width: 34,
            height: 34,
            marginLeft: -4,
            marginBottom: -4,
            borderRadius: '50%',
            background: '#22d3ee',
          }}
        />
      </div>
      <Legenda texto="X = esquerda/direita, Y = cima/baixo" />
    </CorFundo>
  )
}

const REGISTRO: Record<string, React.FC<{ params: Params }>> = {
  sprite: Sprite,
  colisao: Colisao,
  variavel: Variavel,
  condicional: () => <Condicional />,
  loop: () => <Loop />,
  'coordenadas-xy': () => <CoordenadasXY />,
}

export const Teoria: React.FC<{ nome: string; params?: Params }> = ({ nome, params }) => {
  const Comp = REGISTRO[nome]
  if (!Comp) return null
  return <Comp params={params} />
}
