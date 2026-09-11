import { BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/** Produto comprado, mas criação livre ainda não conquistada pela carreira. */
export function KidsCareerLockedStudio() {
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Próxima conquista"
      chipIcon={Sparkles}
      title="Acenda sua Faísca primeiro!"
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ir para os cursos
        </Link>
      }
      footnote="Nas aulas, você continua usando o Estúdio normalmente para aprender e praticar."
    >
      <p>
        Termine o seu primeiro curso e publique o projeto no Mural. Depois disso, o Estúdio livre
        abre com as ferramentas que você já aprendeu a usar.
      </p>
    </KidsRecado>
  )
}
