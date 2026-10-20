import { comunidadeAdultoContinuarUrl } from '@sistemazero/member-shell/lib/adult-links'
import { ArrowRight } from 'lucide-react'

/**
 * O cartão de Cursos para quem tem o No Comando da IA e ainda não tem a Comunidade (a condição é
 * `showNciContinuityCard`, de `lib/continuity`). A oferta é página EXTERNA (funil): outra aba.
 */
export function NciContinuityCard() {
  return (
    <section
      aria-label="Comunidade dos Criadores"
      className="sz-card flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-6 md:p-7"
    >
      <p className="m-0 min-w-0 flex-[1_1_22rem]">
        Você já tem o No Comando da IA. Com a Comunidade, os cursos adultos abrem nesta mesma conta,
        e as ferramentas do Estúdio abrem conforme você avança nas etapas.
      </p>
      <a
        href={comunidadeAdultoContinuarUrl('cursos-nci')}
        target="_blank"
        rel="noopener noreferrer"
        className="sz-btn flex-none"
      >
        Ver como continuar
        <ArrowRight aria-hidden />
      </a>
    </section>
  )
}
