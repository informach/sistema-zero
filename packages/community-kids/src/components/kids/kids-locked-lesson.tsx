import { Lock } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

/**
 * Recado gentil quando a criança tenta abrir uma aula travada (members → 423):
 * a trilha libera uma aula de cada vez (estilo Duolingo). Sem erro feio — mascote
 * + botão de volta pra trilha.
 */
export function KidsLockedLesson({ courseSlug }: { courseSlug: string }) {
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      // Copy DESCRITIVA, não uma ordem: quando a aula anterior tem o bloco "em breve"
      // ela ainda não pode ser concluída, e um "conclua a aula anterior" mandaria a
      // criança fazer algo impossível — que lê como "eu fiz alguma coisa errada".
      chip="Uma aula de cada vez"
      chipIcon={Lock}
      title="Aula bloqueada"
      actions={
        <Link href={`/cursos/${encodeURIComponent(courseSlug)}`} className="sz-btn-gradient">
          Voltar ao curso
        </Link>
      }
    >
      <p>Esta aula abre quando a anterior for concluída. 🚀 Dá uma olhadinha nela!</p>
    </KidsRecado>
  )
}
