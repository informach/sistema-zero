'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import {
  facesAVista,
  MESH_POINTS,
  PICK_BOXES,
  quantos,
  scenePickLetter,
  scenePickPath,
} from '@sistemazero/core/learning/scene'
import {
  type CameraPerspectiva,
  COR_DO_EIXO,
  caminhoDe,
  cuboComPerspectiva,
  cuboGirado,
  type FaceNaTela,
  girar,
  naTelaSemPerspectiva,
  type Ponto3,
  projetorPerspectiva,
  SombraNoChao,
  TomDaFace,
} from './scene-3d'
import { SceneCanvas, Texto } from './scene-canvas'

/**
 * Os palcos da PORTA DO 3D (lote 5 do Raio-X, 16/09/2026): `axis-z`, `camera-3d`, `mesh` e `pick-ray`.
 * Saíram do `scene-engine-stages` junto com o redesenho, e desenham TODOS pela mesma régua
 * (`scene-3d.tsx`): uma projeção, um cubo convexo de faces de verdade, a sombra no chão e os eixos nas
 * cores do Estúdio. ⚠️ Nenhum desses palcos desenha papel do elenco (`SCENE_ROLES` vazio): o 3D aqui é
 * sobre o espaço, não sobre quem está nele.
 */

/* ── axis-z ──────────────────────────────────────────────────────────────────────────────── */

/**
 * A câmera da `axis-z`: um pouco à direita e acima, olhando para o meio do chão. ⚠️ Com perspectiva de
 * propósito: o cubo ENCOLHE indo para o fundo (z negativo) e cresce vindo para a frente, e é isso que
 * faz o z e o y ficarem diferentes a olho (os dois faziam o quadrado subir na tela).
 */
const CAMERA_DO_EIXO: CameraPerspectiva = {
  olho: { x: 60, y: 210, z: 380 },
  alvo: { x: 0, y: 30, z: -20 },
  foco: 400,
  centro: { x: 280, y: 150 },
}
/** Metade do lado do cubo, nas unidades do espaço. */
const MEIO_DO_CUBO = 16
/**
 * O chão: os ladrilhos vão de −160 a 160 nos dois eixos, de 40 em 40.
 * ⚠️ MAIOR que o alcance dos deslizantes (−120 a 120) (consertos do review da onda B do lote 5): com o
 * chão do mesmo tamanho, o cubo pousado no canto ficava com metade fora dele, a sombra sumia embaixo e
 * o desenho lia "no ar" enquanto a frase dizia "no chão". A borda da frente passa do quadro: o chão
 * continua para fora da tela, e é isso que ele é.
 */
const LADRILHOS = [-160, -120, -80, -40, 0, 40, 80, 120, 160] as const
const BORDA_DO_CHAO = 160

/** O cubo no espaço, a sombra dele no chão e os três eixos. ⚠️ Aqui o y cresce para CIMA. */
export function AxisZStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, z } = state.space
  const projetar = projetorPerspectiva(CAMERA_DO_EIXO)
  const viu = (meta: string) => state.evidence.discoveries.includes(meta)
  const faces = cuboComPerspectiva({ x, y: y + MEIO_DO_CUBO, z }, MEIO_DO_CUBO, CAMERA_DO_EIXO)
  const chao = projetar({ x, y: 0, z })
  const base = projetar({ x, y, z })
  const linha = (a: Ponto3, b: Ponto3) => {
    const p = projetar(a)
    const q = projetar(b)
    return `M${p.px.toFixed(1)} ${p.py.toFixed(1)}L${q.px.toFixed(1)} ${q.py.toFixed(1)}`
  }
  /**
   * ⚠️⚠️ As letras do y e do z só DEPOIS de a criança ver (review do lote 2): o "y" na ponta do eixo que
   * sobe, embaixo do véu, respondia a previsão. É a mesma régua da faixa e da bancada. O "x" fica.
   */
  const eixos = [
    { nome: 'x', de: { x: -140, y: 0, z: 0 }, ate: { x: 150, y: 0, z: 0 }, viu: true },
    { nome: 'y', de: { x: 0, y: 0, z: 0 }, ate: { x: 0, y: 150, z: 0 }, viu: viu('up') },
    { nome: 'z', de: { x: 0, y: 0, z: -140 }, ate: { x: 0, y: 0, z: 150 }, viu: viu('depth') },
  ] as const
  const cuboEsombra = (
    <>
      {/* ⭐ A SOMBRA sempre à vista, maior que o cubo e clarinha. ⚠️ 1,8 × o meio (consertos do review
          da onda B do lote 5): com 1,5 ela sumia embaixo do cubo pousado, e o cubo parecia flutuar. */}
      <SombraNoChao x={x} z={z} raio={MEIO_DO_CUBO * 1.8} camera={CAMERA_DO_EIXO} />
      {y > 0 && (
        <path
          className="stroke-scene-ink-soft"
          d={`M${chao.px.toFixed(1)} ${chao.py.toFixed(1)}L${base.px.toFixed(1)} ${base.py.toFixed(1)}`}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}
      {/* ⚠️ Cor de PAPELÃO, e não o azul (consertos do review da onda B do lote 5): azul é a cor do eixo z,
          e o cubo parecia parte dele. */}
      <g data-cubo={`${x},${y},${z}`} data-escala={base.escala.toFixed(3)}>
        {faces.map((face) => (
          <g key={face.lado}>
            <path
              className="fill-scene-stone stroke-scene-stone-dark"
              d={caminhoDe(face.pontos)}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <TomDaFace face={face} />
          </g>
        ))}
      </g>
    </>
  )
  return (
    <SceneCanvas
      cast={cast}
      titulo="O cubo no espaço, com a sombra dele no chão"
      descricao={`O cubo está em x ${x}, y ${y}, z ${z}. ${y > 0 ? 'O cubo está no ar, e a sombra fica no chão, embaixo.' : 'O cubo está no chão, em cima da sombra.'}${z >= 40 ? ' Perto assim, o cubo aparece maior.' : z <= -40 ? ' Longe assim, o cubo aparece menor.' : ''}`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "a altura é o y" respondia a previsão.
    >
      {/* O chão em ladrilhos: é o que mostra o fundo e a frente sem escrever nada. */}
      <g data-chao>
        {LADRILHOS.map((n) => (
          <g key={`ladrilho-${n}`}>
            <path
              className="stroke-scene-grid"
              d={linha({ x: n, y: 0, z: -BORDA_DO_CHAO }, { x: n, y: 0, z: BORDA_DO_CHAO })}
              strokeWidth="1.5"
            />
            <path
              className="stroke-scene-grid"
              d={linha({ x: -BORDA_DO_CHAO, y: 0, z: n }, { x: BORDA_DO_CHAO, y: 0, z: n })}
              strokeWidth="1.5"
            />
          </g>
        ))}
      </g>
      {/*
        ⚠️ A ORDEM de desenho é a da profundidade: com o cubo no FUNDO (z negativo) os eixos, que moram em
        z 0, passam NA FRENTE dele. Sem isso o cubo no fundo cobria o eixo que sobe, como se estivesse na
        frente dele.
      */}
      {z < 0 && cuboEsombra}
      {eixos.map((eixo) => {
        const ponta = projetar(eixo.ate)
        const cor = COR_DO_EIXO[eixo.nome]
        return (
          <g key={eixo.nome} data-eixo={eixo.nome}>
            <path className={cor.traco} d={linha(eixo.de, eixo.ate)} strokeWidth="2.5" />
            <circle className={cor.tinta} cx={ponta.px} cy={ponta.py} r={4} />
            {eixo.viu && (
              <Texto
                className={cor.tinta}
                x={ponta.px + 8}
                y={ponta.py + (eixo.nome === 'y' ? 4 : 16)}
                tamanho={15}
                fontWeight="800"
              >
                {eixo.nome}
              </Texto>
            )}
          </g>
        )
      })}
      {z >= 0 && cuboEsombra}
      {/*
        ⚠️⚠️ SEM o rótulo "fundo (z negativo)" (consertos do review da onda B do lote 5). O cubo alcança
        qualquer canto do chão, e no passo 3 do próprio roteiro o texto cortava o fio e ficava em cima da
        sombra, que é o que a instrução manda olhar. O sentido do z mora na faixa e na bancada ("z
        (negativo é o fundo)"), que se revelam na mesma meta.
      */}
    </SceneCanvas>
  )
}

/* ── camera-3d ───────────────────────────────────────────────────────────────────────────── */

/**
 * ⭐⭐ LADOS OPOSTOS TÊM A MESMA COR (lote 5 do Raio-X): frente e trás azuis, esquerda e direita laranja,
 * em cima e embaixo verde-escuro. Nunca aparecem duas faces da mesma cor ao mesmo tempo, então contar
 * cores é contar lados, e o cubo é UM objeto (antes as cores trocavam sem coerência e dois lados
 * vizinhos saíam da mesma cor).
 * ⚠️ A folha ESCURA, e não a grama (review do lote 2): de frente a grama quase sumia no papel.
 */
const COR_DO_LADO: Record<FaceNaTela['eixo'], string> = {
  z: 'fill-scene-a',
  x: 'fill-scene-b',
  y: 'fill-scene-leaf',
}
/** A volta em graus (8 lugares) e a altura (por baixo, no meio, por cima). */
const VOLTA_EM_GRAUS = 45
const ALTURA_EM_GRAUS: Record<number, number> = { 0: -32, 1: 0, 2: 32 }
const NOME_DA_ALTURA: Record<number, string> = { 0: 'por baixo', 1: 'no meio', 2: 'por cima' }
/** Metade do lado do cubo da `camera-3d`, e o olho a oito meios de distância (perspectiva leve). */
const MEIO_DO_CUBO_DA_CAMERA = 68
const FOCO_DA_CAMERA = MEIO_DO_CUBO_DA_CAMERA * 8

/**
 * A câmera no MAPA: um corpo retangular com a lente virada para o cubo (consertos do review da onda B
 * do lote 5). Era um círculo com um triângulo, que lia como alfinete de mapa ou uma gota.
 */
function CameraNoMapa({ x, y, angulo }: { x: number; y: number; angulo: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angulo.toFixed(1)})`}>
      <rect className="fill-scene-ink" x={-12} y={-8} width={17} height={16} rx={3} />
      <path className="fill-scene-ink" d="M5 -4L14 -8V8L5 4Z" />
      <circle className="fill-scene-card" cx={-4} cy={0} r={3.5} />
    </g>
  )
}

/** O cubo visto de onde a câmera está, e a câmera no mapa visto de cima. */
export function Camera3dStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { yaw, pitch } = state.orbit
  const faces = cuboGirado(
    { x: 210, y: 150 },
    MEIO_DO_CUBO_DA_CAMERA,
    yaw * VOLTA_EM_GRAUS,
    ALTURA_EM_GRAUS[pitch] ?? 0,
    FOCO_DA_CAMERA,
  )
  const vistas = facesAVista(yaw, pitch)
  // O mapa de cima: o cubo no meio, a câmera andando na roda (a volta 1 fica embaixo, de frente).
  const mapa = { x: 452, y: 112, raio: 56 }
  const angulo = (yaw * VOLTA_EM_GRAUS * Math.PI) / 180
  const camera = {
    x: mapa.x + Math.sin(angulo) * mapa.raio,
    y: mapa.y + Math.cos(angulo) * mapa.raio,
  }
  // A câmera aponta para o cubo: a lente vira para o centro do mapa.
  const paraOCubo = (Math.atan2(mapa.y - camera.y, mapa.x - camera.x) * 180) / Math.PI
  return (
    <SceneCanvas
      cast={cast}
      titulo="O cubo visto de onde a câmera está, e a câmera vista de cima"
      // ⚠️ A descrição CONTA as cores: é o que quem não enxerga recebe no lugar do desenho. Para quem
      // vê, a contagem saiu do desenho e da faixa (é a tarefa da cena).
      descricao={`A câmera está na volta ${yaw + 1} de 8, ${NOME_DA_ALTURA[pitch] ?? 'no meio'}. Daqui ${vistas === 1 ? 'aparece' : 'aparecem'} ${quantos(vistas, 'cor', 'cores')}.`}
      rodape="Lados opostos têm a mesma cor."
    >
      {(palco) => (
        <>
          {/* ⭐ Uma sombra achatada embaixo do cubo (consertos do review da onda B do lote 5): junto com a
          perspectiva leve, é o que faz o cubo ler como um objeto e não como cartas. ⚠️ Olhando por
          BAIXO não há chão entre a câmera e o cubo, e a sombra mentiria. */}
          {pitch !== 0 && (
            <ellipse
              data-sombra-do-cubo
              className="fill-scene-ink"
              cx={210}
              cy={286}
              rx={84}
              ry={9}
              opacity={0.14}
            />
          )}
          <g data-cubo data-lados={faces.map((f) => f.lado).join(' ')}>
            {faces.map((face) => (
              <path key={face.lado} className={COR_DO_LADO[face.eixo]} d={caminhoDe(face.pontos)} />
            ))}
            {/* As arestas por cima, na cor do papel: é o que faz as faces lerem como um objeto só. */}
            {faces.map((face) => (
              <path
                key={`aresta-${face.lado}`}
                className="stroke-scene-card"
                d={caminhoDe(face.pontos)}
                fill="none"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            ))}
          </g>
          {/* ⭐ O MAPA DE CIMA: a câmera é um objeto do mundo, e anda em volta do cubo. */}
          <g data-mapa data-volta={yaw + 1}>
            <rect
              className="fill-scene-card stroke-scene-card-line"
              x={mapa.x - 88}
              y={16}
              width={176}
              height={196}
              rx={14}
              strokeWidth="1.5"
            />
            <Texto
              className="fill-scene-ink-soft"
              x={mapa.x}
              y={36}
              textAnchor="middle"
              tamanho={12}
              fontWeight="700"
            >
              vista de cima
            </Texto>
            <circle
              className="stroke-scene-grid"
              cx={mapa.x}
              cy={mapa.y}
              r={mapa.raio}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * VOLTA_EM_GRAUS * Math.PI) / 180
              return (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: os oito lugares da volta, em ordem.
                  key={`lugar-${i}`}
                  className="fill-scene-grid"
                  cx={mapa.x + Math.sin(a) * mapa.raio}
                  cy={mapa.y + Math.cos(a) * mapa.raio}
                  r={3}
                />
              )
            })}
            {/* O cubo de cima: frente (embaixo) e trás azuis, os lados laranja. */}
            <rect
              className="fill-scene-grid"
              x={mapa.x - 16}
              y={mapa.y - 16}
              width={32}
              height={32}
            />
            <path
              className="stroke-scene-a"
              d={`M${mapa.x - 16} ${mapa.y + 16}H${mapa.x + 16}M${mapa.x - 16} ${mapa.y - 16}H${mapa.x + 16}`}
              strokeWidth="5"
            />
            <path
              className="stroke-scene-b"
              d={`M${mapa.x - 16} ${mapa.y - 16}V${mapa.y + 16}M${mapa.x + 16} ${mapa.y - 16}V${mapa.y + 16}`}
              strokeWidth="5"
            />
            <g data-camera-no-mapa>
              <CameraNoMapa x={camera.x} y={camera.y} angulo={paraOCubo} />
            </g>
            {/* ⚠️ A legenda NOMEIA a figura (consertos do review da onda B do lote 5): sem nome, ela lia como
            um alfinete de mapa. Fica no pé do mapa, e não colada à câmera, que dá a volta inteira. */}
            <g data-legenda-da-camera>
              <CameraNoMapa x={mapa.x - 30} y={196} angulo={0} />
              <Texto
                className="fill-scene-ink"
                x={mapa.x - 12}
                y={201}
                tamanho={13}
                fontWeight="700"
              >
                câmera
              </Texto>
            </g>
          </g>
          {/* A altura: três pontinhos, o de agora cheio. */}
          <g data-alturas data-altura={pitch}>
            {[2, 1, 0].map((altura, i) => (
              <g key={`nivel-${altura}`}>
                {/* ⚠️ As linhas se afastam com a LETRA (conserto "letra no celular"): de 20 em 20, na letra
                de 12px, "por cima", "no meio" e "por baixo" se encostavam. */}
                <circle
                  className={altura === pitch ? 'fill-scene-ink' : 'fill-scene-grid'}
                  cx={mapa.x - 70}
                  cy={236 + i * Math.max(20, palco.letra(12) + 4)}
                  r={6}
                />
                <Texto
                  className={altura === pitch ? 'fill-scene-ink' : 'fill-scene-ink-soft'}
                  x={mapa.x - 56}
                  y={241 + i * Math.max(20, palco.letra(12) + 4)}
                  tamanho={12}
                  fontWeight={altura === pitch ? '700' : '400'}
                >
                  {NOME_DA_ALTURA[altura]}
                </Texto>
              </g>
            ))}
          </g>
        </>
      )}
    </SceneCanvas>
  )
}

/* ── mesh ────────────────────────────────────────────────────────────────────────────────── */

/**
 * O MODELO low poly: um cristal de seis lados, com uma ponta em cima e outra embaixo. Os pontos têm
 * alturas e distâncias um pouco diferentes, para parecer uma pedra de jogo e não um sólido de livro.
 * ⚠️ São `MESH_POINTS` (8) pontos: a faixa escreve o número do core, e o teste confere.
 */
const PONTOS_DO_MODELO: readonly Ponto3[] = [
  { x: 0, y: 96, z: 0 },
  { x: 0, y: -84, z: 0 },
  ...[70, 60, 76, 64, 74, 58].map((raio, i) => {
    const a = ((i * 60 + 12) * Math.PI) / 180
    return { x: Math.cos(a) * raio, y: [14, 4, 18, -2, 10, 6][i] ?? 0, z: Math.sin(a) * raio }
  }),
]
/** As faces em triângulos NA superfície: as de cima ligam a ponta de cima, as de baixo a de baixo. */
const FACES_DO_MODELO: readonly [number, number, number][] = Array.from({ length: 6 }, (_, i) => {
  const a = 2 + i
  const b = 2 + ((i + 1) % 6)
  return [
    [0, a, b],
    [1, b, a],
  ] as [number, number, number][]
}).flat()
/** As linhas da malha: cada aresta das faces, uma vez. */
const LINHAS_DO_MODELO: readonly [number, number][] = [
  ...new Map(
    FACES_DO_MODELO.flatMap(([a, b, c]) =>
      (
        [
          [a, b],
          [b, c],
          [c, a],
        ] as [number, number][]
      ).map(
        ([p, q]) => [p < q ? `${p}-${q}` : `${q}-${p}`, [Math.min(p, q), Math.max(p, q)]] as const,
      ),
    ),
  ).values(),
] as [number, number][]
/**
 * As faces que levam uma manchinha da pele: ela gira junto e mostra que a pele é pintada NAS faces.
 * ⚠️ A mancha é um TRIANGULINHO no miolo da face, e não uma bolinha: bolinha na pele lia como um dos
 * pontos aparecendo por baixo, justo na cena que pergunta se há pontos embaixo da pele.
 */
const MANCHAS = [0, 3, 6, 9] as const
/** O miolo de uma face: o mesmo triângulo, encolhido para perto do centro dele. */
const miolo = (pontos: readonly { px: number; py: number }[]) => {
  const cx = pontos.reduce((s, p) => s + p.px, 0) / pontos.length
  const cy = pontos.reduce((s, p) => s + p.py, 0) / pontos.length
  return pontos.map((p) => ({ px: cx + (p.px - cx) * 0.42, py: cy + (p.py - cy) * 0.42 }))
}
/** A pele no degrau do meio: transparente o bastante para os pontos aparecerem embaixo. */
const PELE_NA_METADE = 0.38
/** O modelo é visto um pouco de cima, para as faces de cima também aparecerem. */
const INCLINACAO = 16

const menosV = (a: Ponto3, b: Ponto3): Ponto3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })

/** O modelo com a pele, a pele transparente, ou só os pontos e as linhas. */
export function MeshStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { see, yaw } = state.model
  const centro = { x: 280, y: 146 }
  const girados = PONTOS_DO_MODELO.map((p) => girar(p, yaw * VOLTA_EM_GRAUS, INCLINACAO))
  const naTela = girados.map((p) => naTelaSemPerspectiva(p, centro, 1.25))
  const faces = FACES_DO_MODELO.map(([a, b, c], indice) => {
    const pa = girados[a] as Ponto3
    const u = menosV(girados[b] as Ponto3, pa)
    const v = menosV(girados[c] as Ponto3, pa)
    // ⚠️ A normal é conferida contra o CENTRO do modelo: aponta para fora sempre, qualquer que seja a
    // ordem dos pontos na lista.
    let normal = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x }
    const meio = {
      x: (pa.x + (girados[b] as Ponto3).x + (girados[c] as Ponto3).x) / 3,
      y: (pa.y + (girados[b] as Ponto3).y + (girados[c] as Ponto3).y) / 3,
      z: (pa.z + (girados[b] as Ponto3).z + (girados[c] as Ponto3).z) / 3,
    }
    if (normal.x * meio.x + normal.y * meio.y + normal.z * meio.z < 0)
      normal = { x: -normal.x, y: -normal.y, z: -normal.z }
    const tamanho = Math.hypot(normal.x, normal.y, normal.z) || 1
    const luz = (normal.x * -0.35 + normal.y * 0.8 + normal.z * 0.48) / tamanho
    return {
      indice,
      pontos: [naTela[a], naTela[b], naTela[c]] as { px: number; py: number }[],
      visivel: normal.z > 0,
      sombra: Math.max(0, 0.55 - Math.max(0, luz) * 0.55),
      meio,
      fundo: meio.z,
    }
  })
  const frente = faces.filter((f) => f.visivel).sort((a, b) => a.fundo - b.fundo)
  const pontoNaFrente = girados.map((p) => p.z >= -8)
  const linhaNaFrente = ([a, b]: [number, number]) =>
    faces.some(
      (f) =>
        f.visivel &&
        FACES_DO_MODELO[f.indice]?.includes(a) &&
        FACES_DO_MODELO[f.indice]?.includes(b),
    )
  const pele = see === 'nada' ? 1 : see === 'metade' ? PELE_NA_METADE : 0
  const mostraPontos = see !== 'nada'
  return (
    <SceneCanvas
      cast={cast}
      titulo={
        see === 'tudo'
          ? 'O modelo em pontos e linhas'
          : see === 'metade'
            ? 'O modelo com a pele transparente'
            : 'O modelo com a pele'
      }
      descricao={
        see === 'nada'
          ? `O modelo aparece com a pele colorida, na volta ${yaw + 1} de 8.`
          : see === 'metade'
            ? `A pele está transparente, e dá para ver ${quantos(MESH_POINTS, 'ponto', 'pontos')} ligados por linhas embaixo dela. Volta ${yaw + 1} de 8.`
            : `Sem a pele: ${quantos(MESH_POINTS, 'ponto', 'pontos')} ligados por linhas, formando faces. Volta ${yaw + 1} de 8.`
      }
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "Os pontos existem sempre" era a resposta da previsão.
    >
      <ellipse className="fill-scene-grid" cx={280} cy={262} rx={110} ry={14} opacity={0.6} />
      {mostraPontos && (
        <g data-malha>
          {LINHAS_DO_MODELO.map(([a, b]) => {
            const p = naTela[a]
            const q = naTela[b]
            if (!p || !q) return null
            const naFrente = linhaNaFrente([a, b])
            return (
              <path
                key={`linha-${a}-${b}`}
                className="stroke-scene-a"
                d={`M${p.px.toFixed(1)} ${p.py.toFixed(1)}L${q.px.toFixed(1)} ${q.py.toFixed(1)}`}
                strokeWidth={naFrente ? 2.5 : 1.5}
                strokeDasharray={naFrente ? undefined : '4 4'}
                opacity={naFrente ? 1 : 0.4}
              />
            )
          })}
          {naTela.map((p, i) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: os pontos do modelo são fixos, em ordem.
              key={`ponto-${i}`}
              data-ponto={pontoNaFrente[i] ? 'frente' : 'tras'}
              className="fill-scene-a stroke-scene-card"
              cx={p.px}
              cy={p.py}
              r={pontoNaFrente[i] ? 6 : 4.5}
              strokeWidth="1.5"
              opacity={pontoNaFrente[i] ? 1 : 0.4}
            />
          ))}
        </g>
      )}
      {pele > 0 && (
        <g data-pele={see} opacity={pele}>
          {frente.map((face) => (
            <g key={`face-${face.indice}`}>
              <path className="fill-scene-b" d={caminhoDe(face.pontos)} />
              <path className="fill-scene-ink" d={caminhoDe(face.pontos)} opacity={face.sombra} />
              {(MANCHAS as readonly number[]).includes(face.indice) && (
                <path
                  data-mancha
                  className="fill-scene-b-ink"
                  d={caminhoDe(miolo(face.pontos))}
                  opacity={0.45}
                />
              )}
            </g>
          ))}
        </g>
      )}
    </SceneCanvas>
  )
}

/* ── pick-ray ────────────────────────────────────────────────────────────────────────────── */

/** A tela do jogador: as caixas estão nestas coordenadas (as do motor, `PICK_BOXES`). */
const TELA_DO_JOGADOR = { w: 480, h: 270 } as const
/** O ponto para onde o fundo das caixas foge: o meio da tela, onde o olho do jogador está. */
const FUGA = { x: 240, y: 135 } as const
/** A profundidade de cada caixa na vista de lado: 1 é a mais perto do olho. */
const NA_VISTA_DE_LADO: Record<number, { x: number; w: number }> = {
  1: { x: 150, w: 60 },
  2: { x: 250, w: 60 },
  3: { x: 350, w: 84 },
}
type Caixa = (typeof PICK_BOXES)[keyof typeof PICK_BOXES]
/** As caixas na ordem de desenhar: a mais longe primeiro, para a da frente ficar por cima. */
const CAIXAS_DO_FUNDO_PARA_A_FRENTE: readonly Caixa[] = Object.values(PICK_BOXES).sort(
  (a, b) => b.z - a.z,
)

/**
 * Uma caixa vista pelo jogador: a face da frente no lugar do motor e um fundo que foge para o meio da
 * tela, para ler como uma caixa, e não como um retângulo chapado.
 */
function CaixaDoJogador({ caixa, acesa }: { caixa: Caixa; acesa: boolean }) {
  const fundo = 0.1 + caixa.z * 0.03
  const encolher = (px: number, py: number) => ({
    px: px + (FUGA.x - px) * fundo,
    py: py + (FUGA.y - py) * fundo,
  })
  const frente = [
    { px: caixa.x, py: caixa.y },
    { px: caixa.x + caixa.w, py: caixa.y },
    { px: caixa.x + caixa.w, py: caixa.y + caixa.h },
    { px: caixa.x, py: caixa.y + caixa.h },
  ]
  const tras = frente.map((p) => encolher(p.px, p.py))
  const lados = frente.map((p, i) => {
    const j = (i + 1) % 4
    return [p, frente[j], tras[j], tras[i]] as { px: number; py: number }[]
  })
  return (
    <g data-caixa={caixa.letra} data-acesa={acesa || undefined}>
      {lados.map((lado, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: os quatro lados da caixa, em ordem.
          key={`lado-${i}`}
          className={
            acesa ? 'fill-scene-a-wash stroke-scene-a' : 'fill-scene-grid stroke-scene-line'
          }
          d={caminhoDe(lado)}
          strokeWidth="1.5"
        />
      ))}
      <path
        className={acesa ? 'fill-scene-a stroke-scene-a' : 'fill-scene-card stroke-scene-line'}
        d={caminhoDe(frente)}
        strokeWidth="2"
      />
      {/*
        ⚠️ A letra no canto de CIMA da face, e não no meio: o meio da caixa A fica atrás da B, e o meio da
        caixa mirada fica embaixo da cruz da mira. Nos dois casos a letra sumia.
      */}
      <Texto
        className={acesa ? 'fill-scene-card' : 'fill-scene-ink'}
        x={caixa.x + 12}
        y={caixa.y + 26}
        tamanho={20}
        fontWeight="800"
      >
        {caixa.letra}
      </Texto>
    </g>
  )
}

/**
 * ⭐⭐ Duas vistas da MESMA cena (lote 5 do Raio-X): o que o jogador vê, com a mira em cruz, e a cena vista
 * de lado, com a reta saindo do olho e parando na primeira caixa. A reta desenhada na tela do jogador
 * cruzava a caixa de trás antes de chegar na da frente, o contrário do que a cena ensina; de lado, as
 * duas no caminho aparecem em fila e a reta para na mais perto.
 * ⚠️ As duas vistas COEXISTEM no mundo (a régua do modo comparação do `SceneCanvas`).
 */
export function PickRayStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, hit } = state.ray
  const caminho = scenePickPath(x, y)
  const primeira = caminho[0]
  const naReta = (c: Caixa) => x >= c.x && x <= c.x + c.w
  const paradaEm = primeira ? (NA_VISTA_DE_LADO[PICK_BOXES_Z(primeira)]?.x ?? 440) : 460
  /**
   * ⚠️⚠️ De lado, SÓ as caixas que a linha da mira cruza para os lados (consertos do review da onda B do
   * lote 5). A vista achata o "para os lados": as outras ficavam clarinhas e tracejadas, mas NO MEIO do
   * caminho da reta, e mirando na caixa sozinha a reta vermelha passava por dentro da B antes de parar
   * na C. Era o desenho de "Ela atravessa", a resposta errada da pergunta final. Com o filtro, uma caixa
   * desenhada que não está no caminho fica acima ou abaixo da reta, nunca atravessada.
   */
  const deLado = Object.values(PICK_BOXES).filter(naReta)
  const lado = (
    <g data-vista-de-lado>
      <path className="stroke-scene-grid" d="M92 10V260" strokeWidth="2" strokeDasharray="3 5" />
      <Texto className="fill-scene-ink-soft" x={98} y={22} tamanho={12}>
        tela
      </Texto>
      {deLado.map((c) => {
        const p = NA_VISTA_DE_LADO[c.z] ?? { x: 400, w: 60 }
        const noCaminho = caminho.includes(c.id)
        const acesa = hit === c.id
        return (
          <g key={c.letra} data-caixa-de-lado={c.letra} data-no-caminho={noCaminho || undefined}>
            <rect
              className={
                acesa
                  ? 'fill-scene-a stroke-scene-a'
                  : noCaminho
                    ? 'fill-scene-a-wash stroke-scene-a'
                    : 'fill-scene-card stroke-scene-line'
              }
              x={p.x}
              y={c.y}
              width={p.w}
              height={c.h}
              rx={6}
              strokeWidth="2"
            />
            <Texto
              className={acesa ? 'fill-scene-card' : 'fill-scene-ink'}
              x={p.x + p.w / 2}
              y={c.y + c.h / 2 + 7}
              textAnchor="middle"
              tamanho={20}
              fontWeight="800"
            >
              {c.letra}
            </Texto>
          </g>
        )
      })}
      {/*
        A reta: do olho até a primeira caixa. ⚠️ SEM o tracejado dali em diante (consertos do review da onda
        B do lote 5): ele passava pelas letras das caixas de trás e desenhava a reta seguindo em frente, que
        é a resposta errada. Sem caixa, a reta vai até o fim e ganha a ponta de seta.
      */}
      <path
        data-reta
        className={primeira ? 'stroke-scene-alert' : 'stroke-scene-ink'}
        d={`M42 ${y}H${paradaEm}`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {!primeira && <path className="fill-scene-ink" d={`M470 ${y}l-12 -7v14Z`} />}
      {/* O olho do jogador, na altura da mira. */}
      <g data-olho>
        <path
          className="fill-scene-card stroke-scene-ink"
          d={`M14 ${y}q14 -12 28 0q-14 12 -28 0Z`}
          strokeWidth="2"
        />
        <circle className="fill-scene-ink" cx={28} cy={y} r={4} />
      </g>
    </g>
  )
  const jogador = (
    <g data-vista-do-jogador>
      {/* ⚠️ Com folga nas bordas: encostada, a moldura do palco cortava a borda de baixo da tela. */}
      <rect
        className="fill-scene-card stroke-scene-card-line"
        x={6}
        y={4}
        width={TELA_DO_JOGADOR.w - 12}
        height={TELA_DO_JOGADOR.h - 12}
        rx={10}
        strokeWidth="2"
      />
      {CAIXAS_DO_FUNDO_PARA_A_FRENTE.map((c) => (
        <CaixaDoJogador key={c.letra} caixa={c} acesa={hit === c.id} />
      ))}
      {/* A mira em cruz. */}
      <g data-mira className={hit ? 'stroke-scene-alert' : 'stroke-scene-ink'}>
        <circle cx={x} cy={y} r={11} fill="none" strokeWidth="3" />
        <path
          d={`M${x - 20} ${y}H${x - 6}M${x + 6} ${y}H${x + 20}M${x} ${y - 20}V${y - 6}M${x} ${y + 6}V${y + 20}`}
          strokeWidth="3"
        />
      </g>
    </g>
  )
  const letras = caminho.map(scenePickLetter)
  return (
    <SceneCanvas
      cast={cast}
      titulo="As caixas e a reta da mira"
      descricao={
        primeira
          ? `A reta saiu do seu olho e parou na caixa ${letras[0]}.`
          : 'A reta não encontrou nenhuma caixa.'
      }
      // ⚠️⚠️ EMPILHADAS em qualquer largura (consertos do review da onda B do lote 5): lado a lado, numa
      // janela de computador com a coluna da cena em 600px, as duas vistas ficavam em escala 0,54 ("tela"
      // com 6,5px, o olho do tamanho de uma letra). As duas são deitadas (480 × 270), e uma embaixo da
      // outra ficam perto do tamanho de fábrica. ⚠️ Não resolver com `@container` no palco: contenção na
      // aula prende o "Expandir" do Estúdio.
      empilhar
      comparacao={[
        {
          titulo: 'O que você vê',
          descricao: primeira
            ? `A mira está em cima da caixa ${letras[0]}, que acendeu.`
            : 'A mira está num lugar sem caixa.',
          desenho: jogador,
          view: TELA_DO_JOGADOR,
        },
        {
          // ⚠️ "A linha da mira, de lado", e não "A mesma cena": a vista mostra só o que a linha cruza.
          titulo: 'A linha da mira, de lado',
          descricao:
            caminho.length > 1
              ? `De lado, ${quantos(caminho.length, 'caixa fica', 'caixas ficam')} em fila na linha da mira, e a reta para na caixa ${letras[0]}, a mais perto do olho.`
              : primeira
                ? `De lado, a reta sai do olho e para na caixa ${letras[0]}.`
                : 'De lado, a reta sai do olho e vai até o fim sem bater em nada.',
          desenho: lado,
          view: TELA_DO_JOGADOR,
        },
      ]}
    />
  )
}

/** A profundidade da caixa pelo id que o estado guarda. */
function PICK_BOXES_Z(id: number): number {
  return Object.values(PICK_BOXES).find((c) => c.id === id)?.z ?? 3
}

/** A exportação da projeção usada nos testes do palco, para conferir a régua sem desenhar. */
export { CAMERA_DO_EIXO, projetorPerspectiva as projecaoDoEixo }
