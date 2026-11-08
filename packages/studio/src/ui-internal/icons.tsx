import type { JSX, ReactNode } from 'react'

/**
 * Ícones inline (SVG, `stroke="currentColor"`) no mesmo padrão do ThemeToggle —
 * o pacote NÃO depende de lucide-react de propósito (é consumido como TS source;
 * inline é mais leve e recolorível pelo tema). Paths no estilo Lucide (MIT).
 */
export interface IconProps {
  className?: string
  size?: number
}

function Base({
  className,
  size = 16,
  children,
}: IconProps & { children: ReactNode }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function IconSave(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
      <path d="M7 3v4a1 1 0 0 0 1 1h7" />
    </Base>
  )
}

export function IconShare(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </Base>
  )
}

export function IconLink(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Base>
  )
}

export function IconCheckCircle(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </Base>
  )
}

export function IconEye(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  )
}

export function IconEyeOff(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </Base>
  )
}

export function IconDownload(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </Base>
  )
}

export function IconPuzzle(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 19.61a2.414 2.414 0 0 1-3.414 0l-1.683-1.682a1 1 0 0 0-1.68.473 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L10.3 6.61a2.414 2.414 0 0 1 3.414 0z" />
    </Base>
  )
}

export function IconImage(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Base>
  )
}

export function IconSparkles(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </Base>
  )
}

export function IconGrid(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </Base>
  )
}

/** Painel esquerdo ABERTO com seta para fechar (menu visível → "Esconder menu"). */
export function IconPlus(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </Base>
  )
}

export function IconCamera(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </Base>
  )
}

export function IconFolderOpen(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" />
    </Base>
  )
}

export function IconChevronDown(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  )
}

/** Os blocos do filtro "Blocos" (o `blocks` do Lucide: três quadrados e um solto). */
export function IconBlocks(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <path d="M10 21V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H3" />
    </Base>
  )
}

export function IconCode(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </Base>
  )
}

export function IconGamepad(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </Base>
  )
}

export function IconArrowLeft(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Base>
  )
}

export function IconPanelLeftClose(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </Base>
  )
}

/** Painel esquerdo com seta para abrir (menu escondido → "Mostrar menu"). */
export function IconPanelLeftOpen(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </Base>
  )
}

export function IconGraduation(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </Base>
  )
}

export function IconFolder(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </Base>
  )
}

export function IconTerminal(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </Base>
  )
}

export function IconMessageSquare(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Base>
  )
}

export function IconSun(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </Base>
  )
}

export function IconMoon(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </Base>
  )
}

/** Reticências (⋯) — pontos cheios, então usa `fill` em vez de `stroke`. */
export function IconMore({ className, size = 16 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

/** Setas circulares (sincronizar/atualizar) — estilo Lucide "refresh-cw". */
export function IconRefresh(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </Base>
  )
}

/* Ícones do cabeçalho da lista (07/09/2026): "Importar", a lupa da busca e o selo de nuvem
   do host ("Guardado na sua conta"), no estilo Lucide como os demais. */

export function IconUpload(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M12 3v12" />
      <path d="m17 8-5-5-5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </Base>
  )
}

export function IconSearch(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  )
}

export function IconCloud(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </Base>
  )
}

export function IconCloudUpload(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M12 13v8" />
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="m8 17 4-4 4 4" />
    </Base>
  )
}

export function IconCloudDownload(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M12 13v8l-4-4" />
      <path d="m12 21 4-4" />
      <path d="M4.393 15.269A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.436 8.284" />
    </Base>
  )
}

export function IconCloudOff(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m2 2 20 20" />
      <path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" />
      <path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" />
    </Base>
  )
}

/* Ícones da barra do editor (11/09/2026, a tela-modelo do Estúdio): o lápis da pílula do nome,
   o visto do "Salvo", as setas da Ponte e a bolinha do "não salvo". */

export function IconPencil(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </Base>
  )
}

export function IconCheck(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  )
}

/** Desfazer e refazer da barra: o "undo-2" e o "redo-2" do Lucide. */
export function IconUndo(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
    </Base>
  )
}

export function IconRedo(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
    </Base>
  )
}

/** A Ponte (blocos ⇄ código): o "arrow-left-right" do Lucide. */
export function IconArrowLeftRight(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M8 3 4 7l4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Base>
  )
}

/** Bolinha cheia ("Alterações não salvas"): usa `fill`, como o `IconMore`. */
export function IconDot({ className, size = 16 }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="5" />
    </svg>
  )
}

/** Triângulo de alerta (Lucide "triangle-alert"). */
export function IconAlert(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Base>
  )
}

/* Os materiais e os destinos do menu "⋯" (18/09/2026). Antes, som e modelo 3D não
   tinham ícone nenhum (moravam dentro de "Imagens") e os TRÊS jeitos de o jogo sair
   daqui dividiam o mesmo `IconDownload` — indistinguíveis na mesma lista. */

/** Alto-falante com ondas (Lucide "volume-2") — os sons do projeto. */
export function IconSpeaker(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </Base>
  )
}

/** Caixa em perspectiva (Lucide "box") — os modelos 3D e os céus 360°. */
export function IconBox(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </Base>
  )
}

/** Globo (Lucide "globe") — publicar o jogo na internet. */
export function IconGlobe(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </Base>
  )
}

/** Folha com seta saindo (Lucide "file-output") — levar o projeto para o Estúdio Completo. */
export function IconFileOutput(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M4 7V4a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2h-2" />
      <path d="M2 15h10" />
      <path d="m9 18 3-3-3-3" />
    </Base>
  )
}

/** Computador (Lucide "laptop") — baixar o código para abrir no computador. */
export function IconLaptop(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M2 20h20" />
    </Base>
  )
}

/** Triângulo de tocar (Lucide "play", preenchido) — o Rodar do Pro. */
export function IconPlay(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path
        d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"
        fill="currentColor"
        stroke="none"
      />
    </Base>
  )
}

/** Quadrado de parar (Lucide "square", preenchido) — o Parar do Pro. */
export function IconStop(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" stroke="none" />
    </Base>
  )
}

/** Livro aberto (Lucide "book") — os Guias do projeto Pro. */
export function IconBook(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </Base>
  )
}

/** Folha de arquivo (Lucide "file") — um arquivo do projeto sem tipo conhecido. */
export function IconFile(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </Base>
  )
}

/** Paleta (Lucide "palette") — o arquivo de estilo (CSS). */
export function IconPalette(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z" />
    </Base>
  )
}

/** Janela de página (Lucide "app-window") — o arquivo HTML. */
export function IconWindow(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </Base>
  )
}

/** Cadeado (Lucide "lock") — os arquivos de configuração do projeto. */
export function IconLock(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Base>
  )
}

/** Varinha (Lucide "wand") — "Arrumar código". */
export function IconWand(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
      <path d="m14 7 3 3" />
    </Base>
  )
}

/** Duas colunas (Lucide "columns-2") — "Lado a lado". */
export function IconColumns(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </Base>
  )
}

/** Cantos abertos (Lucide "maximize") — tela cheia. */
export function IconMaximize(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </Base>
  )
}

/** Lista (Lucide "list") — o Mapa do arquivo. */
export function IconList(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" />
    </Base>
  )
}

/** Teclado (Lucide "keyboard") — Atalhos do teclado. */
export function IconKeyboard(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
    </Base>
  )
}

/** Lâmpada (Lucide "lightbulb") — a dica de um problema. */
export function IconBulb(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </Base>
  )
}

/** Alvo (Lucide "target") — "Onde isto é usado". */
export function IconTarget(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Base>
  )
}

/** Seta para a direita (Lucide "arrow-right") — "Ir para a linha N". */
export function IconArrowRight(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Base>
  )
}

/** Avião de papel (Lucide "send") — "Responder". */
export function IconSend(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </Base>
  )
}

/** Lixeira (Lucide "trash-2") — "Apagar…". */
export function IconTrash(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Base>
  )
}

/** Duas folhas (Lucide "copy") — "Copiar". */
export function IconCopy(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <rect x="8" y="8" width="14" height="14" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Base>
  )
}

/** Seta para cima (Lucide "chevron-up"). */
export function IconChevronUp(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m18 15-6-6-6 6" />
    </Base>
  )
}

/** Seta para a direita pequena (Lucide "chevron-right") — pasta fechada. */
export function IconChevronRight(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m9 18 6-6-6-6" />
    </Base>
  )
}

/** Seta para a esquerda pequena (Lucide "chevron-left") — "Todos os guias". */
export function IconChevronLeft(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m15 18-6-6 6-6" />
    </Base>
  )
}

/** Fechar (Lucide "x"). */
export function IconX(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Base>
  )
}

/** Nota musical (Lucide "music") — os sons do projeto. */
export function IconMusic(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </Base>
  )
}

/** Informação (Lucide "info"). */
export function IconInfo(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Base>
  )
}

/** Pincel (Lucide "brush") — "Desenhar no Pinta". */
export function IconBrush(p: IconProps): JSX.Element {
  return (
    <Base {...p}>
      <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
      <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
    </Base>
  )
}
