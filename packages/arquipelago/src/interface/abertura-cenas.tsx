import type { ReactNode } from 'react'
import { type IdDaCena, LINHAS_DA_CARTA } from '../sistemas/abertura'

/**
 * As pinturas da abertura, em papel recortado (camadas com sombra), num quadro de 960 por 540.
 * Cada cena tem o `fundo` (desliza devagar) e a `frente` (desliza um pouco mais), e o CSS dá o
 * movimento (`arq-ab-*`); com menos movimento, nada desliza. Só enfeite: a descrição de cada uma
 * fica no `aria-label` da tela (`CENAS` em `sistemas/abertura.ts`).
 */

function Papel({ id, cor, opacidade }: { id: string; cor: string; opacidade: number }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor={cor} floodOpacity={opacidade} />
    </filter>
  )
}

function Arquipelago() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab1-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD9A0" />
          <stop offset="0.55" stopColor="#9FD8E8" />
          <stop offset="1" stopColor="#2E8FB3" />
        </linearGradient>
        <radialGradient id="arq-ab1-luz" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF4B8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFC93C" stopOpacity="0" />
        </radialGradient>
        <Papel id="arq-ab1-papel" cor="#0B2A40" opacidade={0.35} />
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="url(#arq-ab1-ceu)" />
        <ellipse cx="480" cy="360" rx="560" ry="210" fill="#2B86AE" />
        <ellipse cx="480" cy="372" rx="430" ry="150" fill="#3AA0C4" />
      </g>
      <g className="arq-ab-frente">
        <g filter="url(#arq-ab1-papel)">
          <ellipse cx="190" cy="330" rx="62" ry="22" fill="#3F9A4F" />
          <ellipse cx="300" cy="420" rx="66" ry="22" fill="#F39FB8" />
          <ellipse cx="660" cy="420" rx="66" ry="22" fill="#2FB3C4" />
          <ellipse cx="770" cy="330" rx="62" ry="22" fill="#CFE6F5" />
          <path d="M740 330l30-46 30 46Z" fill="#E9F4FB" />
          <ellipse cx="640" cy="280" rx="56" ry="18" fill="#D9A35B" />
          <path d="M622 278l18-30 18 30Z" fill="#B5482E" />
          <ellipse cx="320" cy="270" rx="58" ry="18" fill="#B9A9F0" />
          <ellipse cx="480" cy="360" rx="96" ry="32" fill="#7BC67E" />
          <rect x="500" y="276" width="20" height="82" rx="4" fill="#F4F0E6" />
          <rect x="500" y="296" width="20" height="10" fill="#D9534F" />
          <rect x="500" y="320" width="20" height="10" fill="#D9534F" />
          <rect x="496" y="262" width="28" height="18" rx="4" fill="#FFE27A" />
          <path d="M494 262h32l-16-16Z" fill="#D9534F" />
          <rect x="440" y="336" width="36" height="22" rx="3" fill="#FFF8E7" />
          <path d="M436 338h44l-22-16Z" fill="#C0392B" />
        </g>
        <g className="arq-ab-pulsa">
          <circle cx="510" cy="270" r="150" fill="url(#arq-ab1-luz)" />
          <g stroke="#FFF4B8" strokeWidth="6" strokeLinecap="round" opacity="0.55">
            <path d="M510 270 L190 318" />
            <path d="M510 270 L770 318" />
            <path d="M510 270 L320 258" />
            <path d="M510 270 L640 268" />
            <path d="M510 270 L300 408" />
            <path d="M510 270 L660 408" />
          </g>
        </g>
      </g>
    </>
  )
}

/** A sala do Farol (a janela, as paredes, o chão e a mesa): colorida com a Íris, cinza sem ela. */
function SalaDoFarol({
  ceu,
  parede,
  moldura,
  mesa,
  children,
}: {
  ceu: string
  parede: string
  moldura: string
  mesa: string
  children: ReactNode
}) {
  return (
    <>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill={parede} />
        <rect x="80" y="70" width="800" height="330" rx="20" fill={ceu} />
        <g stroke={moldura} strokeWidth="16">
          <path d="M346 70v330M614 70v330M80 236h800" />
        </g>
        <rect
          x="80"
          y="70"
          width="800"
          height="330"
          rx="20"
          fill="none"
          stroke={moldura}
          strokeWidth="18"
        />
      </g>
      <g className="arq-ab-frente">
        <rect x="-60" y="420" width="1080" height="160" fill={moldura} />
        <rect x="200" y="400" width="420" height="26" rx="6" fill={mesa} />
        {children}
      </g>
    </>
  )
}

function Iris() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab2-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B3F8F" />
          <stop offset="1" stopColor="#F2A877" />
        </linearGradient>
        <radialGradient id="arq-ab2-lampada" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE9A6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFB547" stopOpacity="0" />
        </radialGradient>
        <Papel id="arq-ab2-papel" cor="#1A1030" opacidade={0.4} />
      </defs>
      <SalaDoFarol ceu="url(#arq-ab2-ceu)" parede="#5A3A4C" moldura="#3C2534" mesa="#7A4E3A">
        <circle cx="300" cy="360" r="190" fill="url(#arq-ab2-lampada)" className="arq-ab-pulsa" />
        <g filter="url(#arq-ab2-papel)">
          <rect
            x="120"
            y="96"
            width="84"
            height="66"
            rx="4"
            fill="#FFF8E7"
            transform="rotate(-6 162 129)"
          />
          <path
            d="M134 140q20-30 40 0t40 0"
            stroke="#3F9A4F"
            strokeWidth="5"
            fill="none"
            transform="rotate(-6 162 129)"
          />
          <rect
            x="224"
            y="116"
            width="76"
            height="60"
            rx="4"
            fill="#FFF8E7"
            transform="rotate(5 262 146)"
          />
          <circle cx="262" cy="146" r="18" fill="#FF8A65" transform="rotate(5 262 146)" />
          <rect
            x="652"
            y="262"
            width="80"
            height="62"
            rx="4"
            fill="#FFF8E7"
            transform="rotate(-4 692 293)"
          />
          <path d="M664 312l22-30 22 30Z" fill="#5AA9FF" transform="rotate(-4 692 293)" />
          <rect
            x="752"
            y="250"
            width="78"
            height="64"
            rx="4"
            fill="#FFF8E7"
            transform="rotate(7 791 282)"
          />
          <path
            d="M766 296c12-26 40-26 52 0"
            stroke="#B07CFF"
            strokeWidth="6"
            fill="none"
            transform="rotate(7 791 282)"
          />
          <rect
            x="300"
            y="384"
            width="120"
            height="20"
            rx="3"
            fill="#FFF8E7"
            transform="rotate(-3 360 394)"
          />
          <path d="M470 470c0-70 20-120 70-130 50 10 70 60 70 130Z" fill="#2B2440" />
          <circle cx="540" cy="306" r="34" fill="#2B2440" />
          <circle cx="566" cy="282" r="18" fill="#2B2440" />
          <path d="M498 388l-60 6" stroke="#2B2440" strokeWidth="18" strokeLinecap="round" />
          <rect x="254" y="356" width="18" height="44" rx="4" fill="#C9A15A" />
          <circle cx="263" cy="350" r="16" fill="#FFE27A" />
        </g>
      </SalaDoFarol>
    </>
  )
}

function Sumiu() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab3-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5D6276" />
          <stop offset="1" stopColor="#A9A6A2" />
        </linearGradient>
        <Papel id="arq-ab3-papel" cor="#15141C" opacidade={0.4} />
      </defs>
      <SalaDoFarol ceu="url(#arq-ab3-ceu)" parede="#4A4550" moldura="#2F2B34" mesa="#5B5450">
        <g filter="url(#arq-ab3-papel)">
          <rect x="254" y="356" width="18" height="44" rx="4" fill="#77706A" />
          <circle cx="263" cy="350" r="16" fill="#8A847C" />
          <path d="M340 404c40-4 80 4 120 0" stroke="#A9A6A2" strokeWidth="4" fill="none" />
          <g className="arq-ab-cai">
            <rect
              x="150"
              y="150"
              width="84"
              height="66"
              rx="4"
              fill="#E9E5DC"
              transform="rotate(-24 192 183)"
            />
            <path
              d="M164 194q20-30 40 0"
              stroke="#8E8E9A"
              strokeWidth="5"
              fill="none"
              transform="rotate(-24 192 183)"
            />
            <rect
              x="720"
              y="170"
              width="78"
              height="64"
              rx="4"
              fill="#E9E5DC"
              transform="rotate(30 759 202)"
            />
            <path
              d="M736 216c12-26 40-26 52 0"
              stroke="#8E8E9A"
              strokeWidth="6"
              fill="none"
              transform="rotate(30 759 202)"
            />
          </g>
          <g className="arq-ab-cai devagar">
            <rect
              x="380"
              y="200"
              width="78"
              height="60"
              rx="4"
              fill="#E9E5DC"
              transform="rotate(18 419 230)"
            />
            <circle cx="419" cy="230" r="16" fill="#A9A6A2" transform="rotate(18 419 230)" />
            <rect
              x="560"
              y="290"
              width="80"
              height="62"
              rx="4"
              fill="#E9E5DC"
              transform="rotate(-38 600 321)"
            />
          </g>
          <rect
            x="290"
            y="330"
            width="70"
            height="54"
            rx="4"
            fill="#E9E5DC"
            transform="rotate(52 325 357)"
          />
        </g>
        <g stroke="#E9E5DC" strokeWidth="3" strokeLinecap="round" opacity="0.5">
          <path d="M210 110c10 10 0 20 10 30" />
          <path d="M430 160c-10 10 0 20-10 30" />
          <path d="M640 250c10 10 0 20 10 30" />
        </g>
      </SalaDoFarol>
    </>
  )
}

function Cinza() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab4-ceu" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9FD8E8" />
          <stop offset="0.45" stopColor="#B9C2C6" />
          <stop offset="1" stopColor="#8E8E9A" />
        </linearGradient>
        <linearGradient id="arq-ab4-mar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3AA0C4" />
          <stop offset="0.5" stopColor="#6E8C99" />
          <stop offset="1" stopColor="#6B6E78" />
        </linearGradient>
        <Papel id="arq-ab4-papel" cor="#1F2430" opacidade={0.35} />
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="url(#arq-ab4-ceu)" />
        <rect x="-60" y="250" width="1080" height="330" fill="url(#arq-ab4-mar)" />
      </g>
      <g className="arq-ab-frente">
        <g filter="url(#arq-ab4-papel)">
          <ellipse cx="150" cy="330" rx="70" ry="24" fill="#3F9A4F" />
          <circle cx="132" cy="306" r="18" fill="#2E7D3E" />
          <circle cx="162" cy="300" r="22" fill="#358C45" />
          <ellipse cx="330" cy="400" rx="76" ry="24" fill="#F39FB8" />
          <rect x="306" y="366" width="26" height="22" rx="3" fill="#FFF8E7" />
          <path d="M302 368h34l-17-14Z" fill="#E86A8E" />
          <ellipse cx="520" cy="330" rx="74" ry="24" fill="#9AA6A3" />
          <circle cx="504" cy="306" r="18" fill="#8E9693" />
          <ellipse cx="700" cy="410" rx="78" ry="24" fill="#A3A1A6" />
          <ellipse cx="840" cy="320" rx="70" ry="22" fill="#B1AFB4" />
          <path d="M810 320l30-48 30 48Z" fill="#C2C0C4" />
        </g>
      </g>
      <g className="arq-ab-nevoa">
        <g fill="#ECEAEF" opacity="0.92">
          <circle cx="600" cy="300" r="70" />
          <circle cx="680" cy="250" r="90" />
          <circle cx="780" cy="280" r="110" />
          <circle cx="900" cy="230" r="120" />
          <circle cx="640" cy="420" r="80" />
          <circle cx="760" cy="460" r="100" />
          <circle cx="900" cy="440" r="120" />
          <circle cx="1020" cy="340" r="130" />
        </g>
        <g fill="#D6D3DA" opacity="0.85">
          <circle cx="560" cy="360" r="46" />
          <circle cx="580" cy="250" r="40" />
          <circle cx="540" cy="460" r="50" />
        </g>
        <g fill="#5E5A66">
          <circle cx="640" cy="330" r="7" />
          <circle cx="666" cy="330" r="7" />
        </g>
      </g>
    </>
  )
}

function Tempestade() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab5-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#11173A" />
          <stop offset="1" stopColor="#2C3A6B" />
        </linearGradient>
        <Papel id="arq-ab5-papel" cor="#05060F" opacidade={0.5} />
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="url(#arq-ab5-ceu)" />
        <g fill="#1B2350">
          <ellipse cx="180" cy="110" rx="220" ry="60" />
          <ellipse cx="520" cy="80" rx="240" ry="70" />
          <ellipse cx="860" cy="120" rx="220" ry="60" />
        </g>
        <g className="arq-ab-raio">
          <path d="M640 60l-40 110h40l-60 130 110-160h-46l40-80Z" fill="#FFF3B0" />
          <rect x="-60" y="-40" width="1080" height="620" fill="#FFF3B0" opacity="0.18" />
        </g>
        <g
          stroke="#9AB4E6"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.55"
          className="arq-ab-chuva"
        >
          <path d="M60 140l-14 40M140 200l-14 40M230 120l-14 40M320 220l-14 40M410 150l-14 40M500 230l-14 40M720 160l-14 40M800 230l-14 40M880 150l-14 40M560 140l-14 40M260 260l-14 40M840 300l-14 40" />
        </g>
        <path d="M-60 360q100-40 200 0t200 0 200 0 200 0 200 0 200 0V580H-60Z" fill="#1F3D6E" />
      </g>
      <g className="arq-ab-frente">
        <g className="arq-ab-balanca" filter="url(#arq-ab5-papel)">
          <path d="M380 360h200l-30 50H410Z" fill="#B5482E" />
          <rect x="470" y="300" width="6" height="64" fill="#5A3B2E" />
          <path d="M476 300l50 48h-50Z" fill="#E9E1CF" />
          <path d="M432 362c0-26 10-40 24-40s24 14 24 40Z" fill="#F5C443" />
          <circle cx="456" cy="314" r="14" fill="#F5C443" />
        </g>
        <path d="M-60 400q100-40 200 0t200 0 200 0 200 0 200 0 200 0V580H-60Z" fill="#284E86" />
        <path d="M-60 440q100-30 200 0t200 0 200 0 200 0 200 0 200 0V580H-60Z" fill="#335E9B" />
      </g>
    </>
  )
}

function Carta() {
  return (
    <>
      <defs>
        <radialGradient id="arq-ab6-fundo" cx="0.5" cy="0.45" r="0.7">
          <stop offset="0" stopColor="#5B6A8F" />
          <stop offset="1" stopColor="#1E2546" />
        </radialGradient>
        <filter id="arq-ab6-papel" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#05060F" floodOpacity="0.45" />
        </filter>
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="url(#arq-ab6-fundo)" />
      </g>
      <g className="arq-ab-frente arq-ab-sobe" filter="url(#arq-ab6-papel)">
        <path d="M150 460c40-60 120-70 170-40l40 80H150Z" fill="#C98E6A" />
        <path d="M810 460c-40-60-120-70-170-40l-40 80h210Z" fill="#C98E6A" />
        <g transform="rotate(-3 480 265)">
          <rect x="300" y="120" width="360" height="290" rx="6" fill="#FFF3D6" />
          <path d="M300 230h360" stroke="#E6D6AE" strokeWidth="2" />
          {LINHAS_DA_CARTA.map((linha, i) => (
            <text
              key={linha}
              x="480"
              y={178 + i * 44}
              textAnchor="middle"
              className="arq-ab-letra"
              fill="#3A2A1A"
              fontSize="34"
            >
              {linha}
            </text>
          ))}
        </g>
        <g transform="rotate(18 700 400)">
          <circle cx="700" cy="400" r="26" fill="none" stroke="#E2B14A" strokeWidth="12" />
          <rect x="722" y="394" width="110" height="12" rx="4" fill="#E2B14A" />
          <rect x="800" y="404" width="12" height="22" rx="2" fill="#E2B14A" />
          <rect x="818" y="404" width="10" height="16" rx="2" fill="#E2B14A" />
        </g>
      </g>
    </>
  )
}

function Casa() {
  return (
    <>
      <defs>
        <linearGradient id="arq-ab7-ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6F7486" />
          <stop offset="1" stopColor="#A7A8AE" />
        </linearGradient>
        <radialGradient id="arq-ab7-janela" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFE9A6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFC93C" stopOpacity="0" />
        </radialGradient>
        <Papel id="arq-ab7-papel" cor="#1E1F26" opacidade={0.4} />
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="url(#arq-ab7-ceu)" />
        <path d="M-60 400q270-50 540-20t540 10V580H-60Z" fill="#8A8C86" />
      </g>
      <g className="arq-ab-frente">
        <g filter="url(#arq-ab7-papel)">
          <rect x="610" y="110" width="70" height="300" rx="8" fill="#C9C7C2" />
          <rect x="610" y="160" width="70" height="22" fill="#9C9994" />
          <rect x="610" y="230" width="70" height="22" fill="#9C9994" />
          <rect x="600" y="80" width="90" height="40" rx="6" fill="#77746F" />
          <path d="M594 80h102l-51-40Z" fill="#8A8682" />
          <rect x="330" y="270" width="230" height="150" rx="6" fill="#B4B2AD" />
          <path d="M314 276h262l-131-96Z" fill="#8A8682" />
          <rect x="420" y="340" width="44" height="80" rx="4" fill="#7E7B76" />
          <rect x="362" y="300" width="44" height="40" rx="4" fill="#8F8C87" />
          <rect x="486" y="300" width="50" height="44" rx="4" fill="#FFD27A" />
          <path d="M486 300h50v44h-50Z" fill="none" stroke="#7A5A2E" strokeWidth="4" />
          <path d="M511 300v44M486 322h50" stroke="#7A5A2E" strokeWidth="3" />
          <rect x="490" y="326" width="18" height="14" fill="#E86A8E" />
          <rect x="514" y="304" width="18" height="16" fill="#5AA9FF" />
        </g>
        <circle cx="511" cy="322" r="90" fill="url(#arq-ab7-janela)" className="arq-ab-pulsa" />
        <g fill="#9A9893">
          <circle cx="220" cy="400" r="40" />
          <rect x="214" y="400" width="12" height="40" fill="#7E7B76" />
          <circle cx="780" cy="410" r="34" />
        </g>
      </g>
    </>
  )
}

function Zappy() {
  return (
    <>
      <defs>
        <radialGradient id="arq-ab8-luz" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF7C2" stopOpacity="1" />
          <stop offset="0.35" stopColor="#FFC93C" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFC93C" stopOpacity="0" />
        </radialGradient>
        <Papel id="arq-ab8-papel" cor="#2A1630" opacidade={0.35} />
      </defs>
      <g className="arq-ab-fundo">
        <rect x="-60" y="-40" width="1080" height="620" fill="#F7C9D4" />
        <rect x="-60" y="360" width="1080" height="220" fill="#D9A37A" />
      </g>
      <g className="arq-ab-frente">
        <g filter="url(#arq-ab8-papel)">
          <rect x="90" y="110" width="200" height="150" rx="10" fill="#9FD8E8" />
          <path d="M190 110v150M90 185h200" stroke="#FFF8E7" strokeWidth="8" />
          <rect x="640" y="280" width="250" height="110" rx="14" fill="#5AA9FF" />
          <rect x="640" y="250" width="70" height="60" rx="12" fill="#FFF8E7" />
          <ellipse cx="470" cy="440" rx="230" ry="44" fill="#B07CFF" />
          <ellipse cx="470" cy="440" rx="160" ry="28" fill="#FFD84F" />
          <rect
            x="360"
            y="120"
            width="70"
            height="90"
            rx="6"
            fill="#FFF8E7"
            transform="rotate(-6 395 165)"
          />
          <circle cx="395" cy="160" r="20" fill="#6CD06A" transform="rotate(-6 395 165)" />
          <rect
            x="450"
            y="130"
            width="70"
            height="90"
            rx="6"
            fill="#FFF8E7"
            transform="rotate(5 485 175)"
          />
          <path d="M462 196l22-36 22 36Z" fill="#FF8A65" transform="rotate(5 485 175)" />
        </g>
        <g className="arq-ab-vagalume">
          <circle cx="560" cy="270" r="150" fill="url(#arq-ab8-luz)" className="arq-ab-pisca" />
          <ellipse cx="560" cy="276" rx="22" ry="17" fill="#1C2245" />
          <circle cx="560" cy="250" r="16" fill="#1C2245" />
          <circle cx="554" cy="248" r="4" fill="#FFF8E7" />
          <circle cx="567" cy="248" r="4" fill="#FFF8E7" />
          <path
            d="M552 236c-6-12-4-18 2-22M568 236c6-12 4-18-2-22"
            stroke="#1C2245"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx="546"
            cy="268"
            rx="16"
            ry="9"
            fill="#DDE7FF"
            opacity="0.8"
            transform="rotate(-30 546 268)"
          />
          <ellipse
            cx="574"
            cy="268"
            rx="16"
            ry="9"
            fill="#DDE7FF"
            opacity="0.8"
            transform="rotate(30 574 268)"
          />
          <ellipse cx="560" cy="292" rx="14" ry="11" fill="#FFF3B0" />
        </g>
      </g>
    </>
  )
}

export const PINTURAS: Readonly<Record<IdDaCena, () => ReactNode>> = {
  arquipelago: Arquipelago,
  iris: Iris,
  sumiu: Sumiu,
  cinza: Cinza,
  tempestade: Tempestade,
  carta: Carta,
  casa: Casa,
  zappy: Zappy,
}
