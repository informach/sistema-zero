import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Cor por DESTINO, escrita à mão.
 *
 * A primeira versão derivava a cor de um hash do href, e com quatro temas para
 * cinco destinos a casa dos pombos garantia colisão: Início e Comunidade caíam
 * os dois no verde, justamente nas duas telas que a criança mais alterna. Um mapa
 * literal é mais longo e não mente — e o gradiente entra como quinto tema.
 */
const TEMA_POR_DESTINO: Record<string, string> = {
  '/': 'kids-unit-cyan',
  '/cursos': 'kids-unit-lime',
  // "Criar" é o destino mais empolgante do menu e leva o gradiente da marca, o
  // mesmo que os chips de "Crie" e "Brinque" na aula usam.
  '/criar': 'kids-unit-grad',
  '/comunidade': 'kids-unit-rosa',
  '/perfil': 'kids-unit-verde',
}

/** Cor estável por DESTINO: a criança memoriza cor + forma antes de ler o rótulo. */
export function tileTheme(seed: string): string {
  return TEMA_POR_DESTINO[seed] ?? 'kids-unit-cyan'
}

/**
 * Ladrilho colorido atrás de um ícone de traço. Generaliza o que o painel de
 * missões já fazia com emoji, e é o maior ganho de cor por linha escrita do lote:
 * o menu, a barra de abas e os cards de ferramenta passam a ter cor sem nenhum
 * asset novo.
 *
 * ⚠️ Ele ENCOLHE o ícone (24px para 20px) de propósito: quem passa a carregar a
 * presença é o ladrilho, e a restrição do lote é não engrossar nada.
 */
export function KidsIconTile({
  icon: Icon,
  seed,
  tone,
  active = false,
  size = 'sm',
  className,
}: {
  icon: LucideIcon
  /** Semente da cor (o href do destino). Ignorada quando `tone` vem preenchido. */
  seed?: string
  /**
   * Cor EXPLÍCITA, para quando o ladrilho não é de navegação: a assinatura da
   * oficina (`--tool-*`) no card do Criar, o ouro no cabeçalho da página. Passa a
   * cor de fundo e a tinta que vai por cima dela — as duas, sempre, porque a cor de
   * fundo com tinta miúda por cima costuma reprovar AA (ver o comentário dos
   * `--tool-*` no globals).
   */
  tone?: { fundo: string; tinta: string }
  active?: boolean
  /** `sm` é o do menu (32px); `md` é o das faixas (48px, o `.ci` do funil). */
  size?: 'sm' | 'md'
  className?: string
}) {
  const grande = size === 'md'
  const cores = tone
    ? // Ladrilho de assinatura: no estado normal ele é o LAVADO da cor (para o
      // ícone poder ser a própria cor); `active` inverte e o ícone fica branco.
      active
      ? { backgroundColor: tone.fundo, color: '#fff' }
      : {
          backgroundColor: `color-mix(in oklab, ${tone.fundo} 16%, transparent)`,
          color: tone.tinta,
        }
    : {
        backgroundColor: active
          ? 'var(--unit)'
          : 'color-mix(in oklab, var(--unit) 14%, transparent)',
        color: active ? 'var(--unit-fg)' : 'var(--unit)',
      }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center transition-colors',
        grande ? 'size-12 rounded-2xl' : 'size-8 rounded-lg',
        tone ? undefined : tileTheme(seed ?? ''),
        className,
      )}
      style={cores}
    >
      <Icon className={grande ? 'size-6' : 'size-5'} />
    </span>
  )
}
