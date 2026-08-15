'use client'

import '@sistemazero/pinta/styles.css'
import { Spinner } from '@sistemazero/ui/spinner'
import { type RefObject, useEffect, useState } from 'react'

type PintaModule = typeof import('@sistemazero/pinta/lesson')
type PintaComponent = PintaModule['PintaLesson']
type PintaHandle = import('@sistemazero/pinta/lesson').PintaHandle
/** O desenho já vem SANEADO de quem monta o embed (`sanitizePintaAsset` na borda). */
type PintaAsset = import('@sistemazero/pinta/lesson').PintaAsset

interface Props {
  /** Desenho que o editor abre — já criado pelo form (tipo + tamanho) ou o do bloco salvo. */
  initialAsset: PintaAsset
  /** Handle imperativo: o pai lê `getAsset()` ao salvar o bloco. */
  handleRef: RefObject<PintaHandle | null>
  className?: string
}

/**
 * Pinta embutido no painel — a professora DESENHA o ponto de partida da aula aqui.
 *
 * ⭐ `persistence="none"`: nada é gravado no navegador dela. O desenho vive no BLOCO, e quem o
 * captura é o `saveBlock` pelo `handleRef.getAsset()` — mesmo mecanismo do Estúdio.
 *
 * ⚠️ `features={{resize:true, export:true}}` de propósito, ao contrário da aula: aqui quem manda
 * no tamanho é a autora (é a tela que ela está definindo), e baixar serve para reaproveitar o
 * desenho em outra aula. Na criança as duas ficam desligadas.
 */
export function PintaEmbed({ initialAsset, handleRef, className = 'h-[36rem]' }: Props) {
  const [mod, setMod] = useState<PintaModule | null>(null)

  useEffect(() => {
    let active = true
    void import('@sistemazero/pinta/lesson').then((loaded) => {
      if (active) setMod(loaded)
    })
    return () => {
      active = false
    }
  }, [])

  const PintaLesson = mod?.PintaLesson as PintaComponent | undefined

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-muted ${className}`}>
      {PintaLesson ? (
        <PintaLesson
          handleRef={handleRef}
          initialAsset={initialAsset}
          persistence="none"
          features={{ resize: true, export: true }}
        />
      ) : (
        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
          <Spinner /> Carregando o Pinta...
        </div>
      )}
    </div>
  )
}
