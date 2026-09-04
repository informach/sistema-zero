/**
 * Grade de MODELOS PRONTOS (passo "Modelos prontos" do Criar novo): cada cartão
 * mostra a miniatura isométrica REAL do modelo (montado uma vez, sem WebGL) +
 * título e descrição. Escolher leva ao passo do nome com o nome sugerido.
 */
import type { JSX } from 'react'
import { useMemo } from 'react'
import { COPY } from '../../core/copy'
import { MOLDA_TEMPLATES, type MoldaTemplate } from '../../templates/catalog'
import { IsoModelThumb } from './thumbs'

export function TemplatePicker({
  onPick,
}: {
  onPick: (template: MoldaTemplate) => void
}): JSX.Element {
  const entries = useMemo(
    () => MOLDA_TEMPLATES.map((template) => ({ template, built: template.build() })),
    [],
  )
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map(({ template, built }) => {
        const info = COPY.templates.items[template.id]
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onPick(template)}
            aria-label={COPY.a11y.templateCard(info.title)}
            className="mld-pop flex min-h-11 flex-col items-stretch gap-2 rounded-2xl border-2 border-mld-border bg-mld-surface p-3 text-left transition hover:border-mld-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent"
          >
            <span className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-mld-bg p-1">
              <IsoModelThumb model={built} label={info.title} />
            </span>
            <span className="mld-display block text-base leading-tight text-mld-text">
              {info.title}
            </span>
            <span className="block text-xs text-mld-text-soft">{info.description}</span>
          </button>
        )
      })}
    </div>
  )
}
