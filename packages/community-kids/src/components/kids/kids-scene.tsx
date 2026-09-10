import { cn } from '@/lib/cn'

/**
 * As cenas de ilustração vindas das páginas de oferta (recortes WebP com alfa).
 * O estoque do kids tinha só poses do Zappy e medalhões — nenhuma cena —, e é a
 * cena que faz a faixa parecer uma página feita para criança em vez de um painel.
 *
 * ⚠️ Acabamento herdado do funil: recorte NUNCA ganha `border-radius` nem
 * `box-shadow`, porque a sombra retangular entrega que a figura é uma caixa. Só
 * `drop-shadow`, que segue o contorno do alfa — é o que a `.kids-recorte` faz.
 * Print de tela é a exceção e usa moldura; não há print nenhum aqui.
 *
 * Cada cena declara o tamanho INTRÍNSECO do arquivo para o navegador reservar a
 * proporção antes de baixar (sem isso a faixa pula quando a imagem chega).
 */
export type SceneName = 'criar' | 'vitoria' | 'criando' | 'zappy-final' | 'alivio'

const CENAS: Record<SceneName, { src: string; w: number; h: number; alt: string }> = {
  criar: {
    src: '/ilustra/criar.webp',
    w: 940,
    h: 1366,
    alt: 'Duas crianças criando um jogo no computador com o Zappy',
  },
  vitoria: {
    src: '/ilustra/vitoria.webp',
    w: 1000,
    h: 943,
    alt: 'Crianças comemorando um jogo publicado',
  },
  criando: {
    src: '/ilustra/criando.webp',
    w: 880,
    h: 581,
    alt: 'Criança montando o próprio jogo',
  },
  'zappy-final': {
    src: '/ilustra/zappy-final.webp',
    w: 520,
    h: 530,
    alt: 'Zappy acenando',
  },
  alivio: {
    src: '/ilustra/alivio.webp',
    w: 520,
    h: 746,
    alt: 'Zappy tranquilizando',
  },
}

export function KidsScene({
  name,
  className,
  decorative = true,
}: {
  name: SceneName
  className?: string
  /**
   * Cena que só ILUSTRA o texto ao lado fica `aria-hidden` (o padrão). Passe
   * `false` quando a cena for a única coisa que comunica algo na tela.
   */
  decorative?: boolean
}) {
  const cena = CENAS[name]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cena.src}
      alt={decorative ? '' : cena.alt}
      aria-hidden={decorative || undefined}
      width={cena.w}
      height={cena.h}
      draggable={false}
      className={cn('kids-recorte h-auto select-none object-contain', className)}
    />
  )
}
