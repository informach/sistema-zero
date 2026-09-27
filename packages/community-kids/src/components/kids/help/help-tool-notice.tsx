import type { CreativeToolId, ToolAvailability } from '@sistemazero/core/journey'
import { ExternalLink, Info } from 'lucide-react'
import Link from 'next/link'
import { HELP_TOOL_INFO } from '@/lib/help-collections'

/**
 * O aviso FACTUAL sobre a ferramenta de que o tutorial fala (decisão de produto: a ajuda é
 * neutra; ofertas e decisões de compra ficam com os responsáveis). Três casos, nenhum com
 * pedido de compra:
 *  - liberada: o atalho "Abrir o Pinta";
 *  - ainda não incluída neste perfil: a frase diz isso e nada mais;
 *  - abre mais adiante na jornada: idem.
 * A régua é a MESMA do menu (`creativeToolAvailability`, resolvida no servidor); a página só
 * mostra o que ela respondeu. `unavailable` (a consulta falhou) não mostra nada: um soluço de
 * rede não pode dizer à criança que ela não tem a ferramenta.
 */
export function HelpToolNotice({
  tool,
  state,
}: {
  tool: CreativeToolId
  state: ToolAvailability | null
}) {
  const info = HELP_TOOL_INFO[tool]
  if (!state || state === 'unavailable') return null
  if (state === 'available') {
    return (
      <p className="sz-help-tool-notice flex flex-wrap items-center gap-3 text-foreground text-sm">
        <span>Este passo a passo é do {info.label}.</span>
        <Link
          href={info.href}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground text-sm shadow-[0_3px_0_color-mix(in_oklch,var(--primary)_55%,black)] transition-[transform,filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-[2px]"
        >
          Abrir o {info.label}
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      </p>
    )
  }
  const motivo =
    state === 'career-locked'
      ? `O ${info.label} abre mais adiante na sua jornada.`
      : `O ${info.label} ainda não está liberado neste perfil.`
  return (
    <p className="sz-help-tool-notice flex items-start gap-3 rounded-2xl bg-(--band-creme) px-4 py-3 text-foreground text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        {motivo} Você pode ler o passo a passo mesmo assim, para quando ele estiver liberado.
      </span>
    </p>
  )
}
