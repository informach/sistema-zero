/**
 * Os ícones do HUD e do menu: traço arredondado de 2 px num quadro de 24, na cor do texto
 * (`currentColor`). Sempre enfeite (`aria-hidden`): o nome fica no botão ou no texto ao lado.
 */
const CAMINHOS = {
  fome: 'M12 7c-1.5-2.5-6-2.6-7 1.5-.9 3.6 1.4 8.8 4.2 10.3 1.1.6 2 .3 2.8-.2.8.5 1.7.8 2.8.2 2.8-1.5 5.1-6.7 4.2-10.3-1-4.1-5.5-4-7-1.5ZM12 7c0-2 1-3.5 3-4',
  energia: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  diversao: 'M12 3a6 6 0 0 0-6 6c0 3.3 2.7 6 6 7 3.3-1 6-3.7 6-7a6 6 0 0 0-6-6ZM12 16v5M10 21h4',
  moeda:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  foto: 'M4 8h3l2-3h6l2 3h3v11H4V8ZM12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  casa: 'M3 11 12 4l9 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  martelo: 'M14 4l6 6-2 2-6-6 2-2ZM12 6 4 14l2 4 4 2 8-8',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  nublado: 'M7 18h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 9.5 4.3 4.3 0 0 0 7 18Z',
  chuva:
    'M7 15h10a4 4 0 0 0 .6-8A5.5 5.5 0 0 0 7 6.5 4.3 4.3 0 0 0 7 15ZM8 18l-1 3M12 18l-1 3M16 18l-1 3',
  lua: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  ampulheta: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  inicio: 'M3 11 12 4l9 7M6 9.5V20h12V9.5',
  diario: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4ZM5 17a3 3 0 0 1 3-3h11M9 8h6',
  album: 'M4 5h16v14H4V5ZM4 15l5-4 4 3 3-2 4 3M15.5 8.5a1 1 0 1 0 0 .1',
  caderno: 'M6 3h12v18H6V3ZM9 3v18M12 8h4M12 12h4',
  mapa: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6ZM9 4v14M15 6v14',
  familia:
    'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20c0-3 2.2-5 5-5s5 2 5 5M13.5 20c.2-2.4 1.4-4 3.5-4s3.5 1.6 3.8 4',
  conforto:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2.2.2-1.3-1.5.4-2.2-3-1-1 2h-1.8l-1-2-3 1 .4 2.2L6.2 8.2 4 8l-1 3 2 1v2l-2 1 1 3 2.2-.2 1.3 1.5-.4 2.2 3 1 1-2h1.8l1 2 3-1-.4-2.2 1.3-1.5L20 16l1-3-2-1v-2Z',
  sair: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  mochila: 'M8 7V5a4 4 0 0 1 8 0v2M5 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11H5V9ZM9 13h6',
  pinta:
    'M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-1.8 0-1.3-1-1.4-1-2.7 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  molda: 'M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3ZM12 12l8-4.5M12 12 4 7.5M12 12v9',
  estudio: 'M9 4h3a2 2 0 1 1 4 0h3v5a2 2 0 1 1 0 4v6h-6a2 2 0 1 0-4 0H4v-6a2 2 0 1 0 0-4V4h5Z',
  seta: 'M5 12h14M13 6l6 6-6 6',
  parar: 'M7 7h10v10H7V7Z',
  pular: 'M5 12h4V6l10 6-10 6v-6',
} as const

export type NomeDoIcone = keyof typeof CAMINHOS

export function Icone({ nome, tamanho = 20 }: { nome: NomeDoIcone; tamanho?: number }) {
  return (
    <svg
      className="arq-icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  )
}
