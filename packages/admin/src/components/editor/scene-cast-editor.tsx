'use client'

import {
  castText,
  DEFAULT_CAST,
  type SceneActivity,
  type SceneActor,
  type SceneCast,
  sceneModelFor,
} from '@sistemazero/core/learning/scene'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useId } from 'react'

/**
 * Quem está no palco desta cena.
 *
 * As catorze cenas ensinam conceitos que os três cursos repetem, mas o texto delas só falava de
 * Dino e de cacto — então o Desafio do Primeiro Jogo e O Jogo do Meu Jeito não podiam usar
 * nenhuma. Aqui o professor troca os NOMES; o motor, as metas e a avaliação são os mesmos.
 *
 * ⚠️ O gênero é campo, não detalhe: é ele que faz "Faça o Dino aparecer" virar "Faça a nave
 * aparecer" em vez de "Faça o nave aparecer". A régua do português vive no core (`cast.ts`).
 */

const PAPEIS: { chave: keyof SceneCast; rotulo: string; ajuda: string }[] = [
  { chave: 'hero', rotulo: 'Personagem', ajuda: 'Quem a criança controla. De fábrica: o Dino.' },
  { chave: 'obstacle', rotulo: 'Obstáculo', ajuda: 'O que atrapalha. De fábrica: o cacto.' },
  {
    chave: 'scenery',
    rotulo: 'Cenário',
    ajuda: 'O que entra na conta das camadas. De fábrica: a floresta.',
  },
]

export function SceneCastEditor({
  activity,
  onChange,
}: {
  activity: SceneActivity
  onChange: (activity: SceneActivity) => void
}) {
  const id = useId()
  const cast = activity.cast ?? {}
  const ativo = Boolean(cast.hero || cast.obstacle || cast.scenery)

  function trocar(papel: keyof SceneCast, mudanca: Partial<SceneActor> | null) {
    const atual = cast[papel]
    const proximo: SceneCast = { ...cast }
    if (mudanca === null) delete proximo[papel]
    else {
      const nome = (mudanca.name ?? atual?.name ?? '').trim()
      // ⚠️ Nome vazio APAGA o papel em vez de gravar um ator sem nome: o guard do core recusaria
      // a atividade inteira, e o professor levaria "complete os campos" sem saber qual.
      if (!nome) delete proximo[papel]
      else
        proximo[papel] = {
          name: nome,
          gender: mudanca.gender ?? atual?.gender ?? 'm',
          ...(mudanca.plural?.trim() || atual?.plural
            ? { plural: (mudanca.plural ?? atual?.plural ?? '').trim() || undefined }
            : {}),
        }
    }
    const limpo = proximo.hero || proximo.obstacle || proximo.scenery ? proximo : undefined
    onChange({ ...activity, cast: limpo })
  }

  const vestido = sceneModelFor(activity)

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Quem está no palco</p>
      <p className="text-xs text-muted-foreground">
        A cena é a mesma; mudam os nomes que a criança lê. Deixe em branco para manter o elenco do
        Corre Dino.
      </p>
      {/* ⚠️ Dito aqui, e não escondido numa doc: o elenco troca o TEXTO, não o desenho. Sem
          este aviso o professor descobre depois de publicar, com a criança lendo "nave" ao lado
          de um dinossauro desenhado. */}
      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        O desenho da cena continua o mesmo: o elenco troca os nomes no texto, nas pistas e nas
        descobertas. Use quando o conceito é o que importa; quando a figura atrapalhar, prefira uma
        cena própria.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {PAPEIS.map(({ chave, rotulo, ajuda }) => {
          const ator = cast[chave]
          return (
            <div key={chave} className="space-y-2 rounded-xl border border-border p-3">
              <Field label={rotulo} htmlFor={`${id}-${chave}`} hint={ajuda}>
                <Input
                  id={`${id}-${chave}`}
                  maxLength={24}
                  placeholder={DEFAULT_CAST[chave].name}
                  value={ator?.name ?? ''}
                  onChange={(e) => trocar(chave, { name: e.target.value })}
                />
              </Field>
              <Select
                aria-label={`Gênero de ${rotulo.toLowerCase()}`}
                disabled={!ator}
                value={ator?.gender ?? DEFAULT_CAST[chave].gender}
                onChange={(e) => trocar(chave, { gender: e.target.value === 'f' ? 'f' : 'm' })}
              >
                <option value="m">o {ator?.name || DEFAULT_CAST[chave].name}</option>
                <option value="f">a {ator?.name || DEFAULT_CAST[chave].name}</option>
              </Select>
              <Input
                aria-label={`Plural de ${rotulo.toLowerCase()}`}
                maxLength={28}
                disabled={!ator}
                placeholder={ator ? `${ator.name}s` : 'plural automático'}
                value={ator?.plural ?? ''}
                onChange={(e) => trocar(chave, { plural: e.target.value })}
              />
            </div>
          )
        })}
      </div>
      {ativo && (
        /* A prévia é o que dispensa o professor de imaginar o resultado da troca de artigo. */
        <div className="rounded-xl bg-muted/40 p-3 text-sm">
          <p className="font-medium">{vestido.title}</p>
          <p className="text-muted-foreground">{vestido.instruction}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Fecha em: {vestido.goals.map((g) => g.label).join('; ')}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Primeira pista: {castText(vestido.hints[0], activity.cast)}
          </p>
        </div>
      )}
    </div>
  )
}
