import { BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/**
 * Produto comprado, mas criação livre ainda não conquistada.
 *
 * `reason="level"` é a Faísca (o nível ainda não abre o Estúdio livre). `reason="no-blocks"` é
 * quem já tem o nível, mas nenhum curso concluído deu ferramenta ainda: para essa criança o
 * "Acenda sua Faísca primeiro!" seria falso, porque ela já passou da Faísca.
 */
export function KidsJourneyLockedStudio({ reason = 'level' }: { reason?: 'level' | 'no-blocks' }) {
  const semBlocos = reason === 'no-blocks'
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Próxima conquista"
      chipIcon={Sparkles}
      title={semBlocos ? 'Suas ferramentas vêm das aventuras' : 'Acenda sua Faísca primeiro!'}
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ir para as aventuras
        </Link>
      }
      footnote="Nas fases, você continua usando o Estúdio normalmente para aprender e praticar."
    >
      {semBlocos ? (
        <p>
          O Estúdio livre usa as ferramentas que você ganha ao terminar uma aventura e publicar o
          projeto no Mural. Termine a próxima aventura para ganhar as primeiras.
        </p>
      ) : (
        <p>
          Termine a sua primeira aventura e publique o projeto no Mural. Depois disso, o Estúdio
          livre abre com as ferramentas que você já aprendeu a usar.
        </p>
      )}
    </KidsRecado>
  )
}

/** O recado de quem já tem o nível e ainda não ganhou ferramenta (tela SEM props do `ToolRouteRecado`). */
export function KidsStudioWithoutTools() {
  return <KidsJourneyLockedStudio reason="no-blocks" />
}
