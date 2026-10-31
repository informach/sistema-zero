import type { ReactNode } from 'react'
import arquipelago from '../assets/abertura/arquipelago.webp'
import carta from '../assets/abertura/carta.webp'
import casa from '../assets/abertura/casa.webp'
import cinza from '../assets/abertura/cinza.webp'
import iris from '../assets/abertura/iris.webp'
import sumiu from '../assets/abertura/sumiu.webp'
import tempestade from '../assets/abertura/tempestade.webp'
import zappy from '../assets/abertura/zappy.webp'
import { type IdDaCena, LINHAS_DA_CARTA } from '../sistemas/abertura'

/**
 * As cenas da abertura são o jogo de verdade (pedido dela, 29/10/2026: "prints reais do jogo"):
 * imagens tiradas no próprio jogo por `playground/capturar-abertura.ts`, com o mesmo arquipélago,
 * a mesma sala do Farol, o barco, a chave, a carta, a casa e o Zappy que a criança vai encontrar.
 * Num quadro de 960 por 540; a imagem passa um pouco das bordas para o `arq-ab-fundo` deslizar sem
 * mostrar o fim. Por cima, só o que mexe: a névoa que chega, o clarão do raio e as palavras da
 * carta. Com menos movimento, nada desliza. Só enfeite: a descrição de cada uma fica no
 * `aria-label` da tela (`CENAS` em `sistemas/abertura.ts`).
 */
const url = (caminho: string) => new URL(caminho, import.meta.url).href

function Foto({ src }: { src: string }) {
  return (
    <image
      href={url(src)}
      x="-30"
      y="-17"
      width="1020"
      height="574"
      preserveAspectRatio="xMidYMid slice"
      className="arq-ab-fundo"
    />
  )
}

function Cinza() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab4-nevoa" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C9CED6" stopOpacity="0" />
          <stop offset="0.35" stopColor="#C9CED6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#B7BCC6" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <Foto src={cinza} />
      <rect
        x="420"
        y="-40"
        width="620"
        height="620"
        fill="url(#arq-ab4-nevoa)"
        className="arq-ab-nevoa"
      />
    </>
  )
}

function Tempestade() {
  return (
    <>
      <Foto src={tempestade} />
      <rect
        x="-60"
        y="-40"
        width="1080"
        height="620"
        fill="#FFF3B0"
        opacity="0.22"
        className="arq-ab-raio"
      />
    </>
  )
}

function Carta() {
  return (
    <>
      <Foto src={carta} />
      <g className="arq-ab-sobe">
        {LINHAS_DA_CARTA.map((linha, i) => (
          <text
            key={linha}
            x="480"
            y={92 + i * 52}
            textAnchor="middle"
            className="arq-ab-letra arq-ab-carta"
            fontSize="44"
          >
            {linha}
          </text>
        ))}
      </g>
    </>
  )
}

export const PINTURAS: Readonly<Record<IdDaCena, () => ReactNode>> = {
  arquipelago: () => <Foto src={arquipelago} />,
  iris: () => <Foto src={iris} />,
  sumiu: () => <Foto src={sumiu} />,
  cinza: Cinza,
  tempestade: Tempestade,
  carta: Carta,
  casa: () => <Foto src={casa} />,
  zappy: () => <Foto src={zappy} />,
}
