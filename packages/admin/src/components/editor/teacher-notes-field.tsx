'use client'

import { TEACHER_NOTES_MAX } from '@sistemazero/core/learning'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId } from 'react'

/**
 * "Anotações da professora" de uma parte da aula de curso AO VIVO: o lembrete de quem conduz
 * ("mostrar o bloco de colisão, desenhar a seta no sprite"). Só a professora vê, na sala do
 * encontro; a criança nunca recebe o campo (o members o tira da view do aluno).
 */
export function TeacherNotesField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
      <label htmlFor={id} className="block font-medium">
        Anotações desta parte (só quem conduz vê)
      </label>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Só quem conduz o encontro vê, na sala, junto desta parte. As crianças nunca veem.
      </p>
      <Textarea
        id={id}
        aria-describedby={`${id}-hint ${id}-count`}
        value={value}
        maxLength={TEACHER_NOTES_MAX}
        rows={4}
        placeholder="Ex.: mostrar o bloco de colisão e desenhar a seta no sprite."
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-count`} className="text-right text-xs text-muted-foreground">
        {value.length} de {TEACHER_NOTES_MAX} caracteres
      </p>
    </div>
  )
}
