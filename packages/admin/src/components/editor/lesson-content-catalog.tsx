'use client'

import { Input } from '@sistemazero/ui/input'
import { useState } from 'react'
import { LESSON_BLOCK_KINDS, type LessonBlockKind } from '@/lib/types'
import { LessonBlockKindBadge, lessonBlockKindLabel } from './lesson-block-kind'

const descriptions: Record<LessonBlockKind, string> = {
  video: 'Explicar, demonstrar ou orientar com vídeo e capa.',
  dialogue: 'Dar uma instrução curta com o balão e a expressão do Zappy.',
  interactive: 'Escolher uma cena para explorar, demonstrar ou resolver uma atividade.',
  studio: 'Criar um jogo na aula ou receber um projeto da galeria.',
  pinta: 'Desenhar na aula ou receber desenhos da galeria.',
  rich_text: 'Escrever e formatar texto, com imagens e links.',
  ebook: 'Ler o livro 3D e baixar o caderno em PDF.',
  quiz: 'Criar perguntas, respostas, comentários e nota de aprovação.',
  image: 'Mostrar uma imagem com legenda e descrição.',
  audio: 'Ouvir uma gravação ou orientação.',
  embed: 'Inserir uma experiência em HTML, sem progresso próprio.',
  certificate: 'Configurar o certificado de conclusão do curso.',
  coming_soon: 'Apresentar uma aula que ainda está em produção.',
}

export function LessonContentCatalog({
  audience,
  onSelect,
}: {
  audience: 'kids' | 'adult'
  onSelect: (kind: LessonBlockKind) => void
}) {
  const [search, setSearch] = useState('')
  const preferred: LessonBlockKind[] =
    audience === 'kids'
      ? ['video', 'dialogue', 'interactive', 'studio', 'pinta']
      : ['rich_text', 'video', 'interactive', 'studio', 'pinta']
  const ordered = [...preferred, ...LESSON_BLOCK_KINDS.filter((kind) => !preferred.includes(kind))]
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
  const items = ordered.filter((kind) =>
    normalize(`${lessonBlockKindLabel(kind)} ${kind} ${descriptions[kind]}`).includes(
      normalize(search),
    ),
  )
  return (
    <div className="space-y-4">
      <Input
        aria-label="Buscar tipo de conteúdo"
        placeholder="Buscar vídeo, Zappy, livro, quiz…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onSelect(kind)}
            className="space-y-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <LessonBlockKindBadge kind={kind} />
            <span className="block text-sm text-muted-foreground">{descriptions[kind]}</span>
          </button>
        ))}
      </div>
      {!items.length && (
        <p className="text-sm text-muted-foreground">
          Nenhum conteúdo encontrado. Tente outro nome.
        </p>
      )}
    </div>
  )
}
