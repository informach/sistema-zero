'use client'

import type { Project, StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { type RefObject, useState } from 'react'
import { StudioEmbed } from '@/components/studio/studio-embed'

/**
 * O gabarito nasce como CÓPIA do projeto inicial, com id próprio: os dois editores do formulário
 * não podem dividir o mesmo projeto (o Estúdio guarda o estado por id).
 */
export function solutionFrom(initial: Project): Project {
  const nome = initial.name?.trim() || 'Projeto da aula'
  return { ...initial, id: crypto.randomUUID(), name: `${nome} (gabarito)` }
}

/**
 * O GABARITO da professora, logo abaixo do projeto inicial (18/10/2026). É a versão pronta, como
 * fica quando a criança cumpre tudo. Nunca chega à criança: o members a tira da aula do aluno. Serve
 * para o "Testar agora" dos objetivos da parte e para a publicação recusar um objetivo obrigatório
 * que nem o gabarito cumpre.
 */
export function StudioSolutionField({
  solution,
  handleRef,
  onCreate,
  onRemove,
  onChange,
}: {
  solution: Project | null
  handleRef: RefObject<StudioHandle | null>
  onCreate: () => void
  onRemove: () => void
  onChange: () => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">Gabarito (só a equipe vê)</legend>
      <p className="text-xs text-muted-foreground">
        Monte aqui o projeto pronto, como fica quando a criança cumpre tudo. Ele nunca chega à
        criança. Com ele, o "Testar agora" dos objetivos da parte confere se cada objetivo pode ser
        cumprido, e a publicação recusa um objetivo obrigatório que nem o gabarito cumpre.
      </p>
      {solution ? (
        <>
          <StudioEmbed
            key={`solution:${solution.id}`}
            initialProject={solution}
            defaultName="Gabarito"
            handleRef={handleRef}
            onChange={onChange}
            hideKindChooser
            className="h-[28rem]"
            features={{ terminal: false, ai: false, professional: true, export: false }}
          />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmRemove(true)}
            >
              Remover o gabarito
            </Button>
          </div>
          <ConfirmDialog
            open={confirmRemove}
            title="Remover o gabarito?"
            message="O projeto pronto deste bloco é apagado. Os objetivos da parte continuam, mas o Testar agora deixa de conferir se dá para cumpri-los."
            confirmText="Remover"
            confirmVariant="destructive"
            onConfirm={() => {
              setConfirmRemove(false)
              onRemove()
            }}
            onClose={() => setConfirmRemove(false)}
          />
        </>
      ) : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onCreate}>
            Criar o gabarito a partir do projeto inicial
          </Button>
        </div>
      )}
    </fieldset>
  )
}
