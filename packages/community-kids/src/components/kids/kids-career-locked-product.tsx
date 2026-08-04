import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { levelInfo } from '@/lib/level-info'
import { KidsMascot } from './mascot'

/**
 * Tela de produto COMPRADO que ainda não abriu porque falta subir na carreira —
 * irmã do `KidsLockedProduct`, e deliberadamente DIFERENTE dele.
 *
 * ⚠️ **Nunca mencione compra aqui.** Quem vê esta tela já pagou: repetir o CTA da
 * assinatura (como faz a tela de "não liberado") diria a uma família que ela não
 * comprou o que comprou. O caminho daqui é a carreira, então o CTA são os cursos.
 *
 * O nome do degrau sai do `levelInfo` (fonte única dos rótulos em PT) em vez de
 * ficar escrito na mão — mudar a barra em `CREATIVE_APPS_MIN_LEVEL` reescreve a
 * copy junto, sem deixar "Inventor(a)" fossilizado em três telas.
 */
export function KidsCareerLockedProduct({
  title,
  intro,
  minLevelSlug,
}: {
  title: string
  intro: string
  minLevelSlug: string
}) {
  // `levelInfo` cai em Faísca para slug desconhecido — nunca devolve vazio.
  const level = levelInfo(minLevelSlug)
  const levelName = level.label
  const LevelIcon = level.icon
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-10 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <span
        className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 font-bold text-sm"
        style={{
          color: level.colorVar,
          background: `color-mix(in oklch, ${level.colorVar} 12%, transparent)`,
        }}
      >
        <LevelIcon className="size-4" /> Abre no {levelName}
      </span>
      <h1 className="mt-3 sz-display text-2xl">{title} está quase chegando!</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{intro}</p>
      <p className="mt-3 max-w-md text-muted-foreground">
        Ele abre quando você chegar no nível <strong>{levelName}</strong>. Continue nos cursos e
        publicando os seus projetos — falta pouco!
      </p>
      <Link
        href="/cursos"
        className="sz-btn-gradient mt-6 inline-flex h-11 items-center gap-2 px-6"
      >
        <BookOpen className="size-4" /> Ver a minha carreira
      </Link>
    </section>
  )
}
