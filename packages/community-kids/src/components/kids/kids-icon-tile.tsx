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
  active = false,
  className,
}: {
  icon: LucideIcon
  /** Semente da cor (o href do destino, por exemplo). */
  seed: string
  active?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
        tileTheme(seed),
        className,
      )}
      style={{
        backgroundColor: active
          ? 'var(--unit)'
          : 'color-mix(in oklab, var(--unit) 14%, transparent)',
        color: active ? 'var(--unit-fg)' : 'var(--unit)',
      }}
    >
      <Icon className="size-5" />
    </span>
  )
}
