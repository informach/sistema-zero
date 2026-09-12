'use client'

import {
  Award,
  BookOpen,
  Brush,
  Clock,
  Code2,
  FileText,
  Film,
  FlaskConical,
  Globe,
  ImageIcon,
  ListChecks,
  type LucideIcon,
  MessageCircle,
  Volume2,
} from 'lucide-react'
import type { LessonBlockContent } from '@/lib/types'

const kinds: Record<LessonBlockContent['kind'], { label: string; icon: LucideIcon }> = {
  rich_text: { label: 'Texto', icon: FileText },
  dialogue: { label: 'Fala do Zappy', icon: MessageCircle },
  video: { label: 'Vídeo', icon: Film },
  interactive: { label: 'Exploração interativa', icon: FlaskConical },
  studio: { label: 'Estúdio', icon: Code2 },
  pinta: { label: 'Pinta', icon: Brush },
  quiz: { label: 'Quiz', icon: ListChecks },
  ebook: { label: 'Livro 3D / PDF', icon: BookOpen },
  image: { label: 'Imagem', icon: ImageIcon },
  audio: { label: 'Áudio', icon: Volume2 },
  embed: { label: 'HTML', icon: Globe },
  certificate: { label: 'Certificado', icon: Award },
  coming_soon: { label: 'Em produção', icon: Clock },
}
export function LessonBlockKindBadge({ kind }: { kind: LessonBlockContent['kind'] }) {
  const { label, icon: Icon } = kinds[kind]
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  )
}
