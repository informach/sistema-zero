'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/** Item arrastável dentro de um `SortableContext` (espelha o hook da referência). */
export function useSortableItem(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return { attributes, listeners, setNodeRef, style, isDragging }
}
