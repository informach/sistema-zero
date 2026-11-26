'use client'

import { type RefObject, useEffect } from 'react'

/**
 * A barra de abas fixa do celular diz à aula quanto ela mede (`--sz-lesson-tabs-height`, no
 * `<html>`). O rodapé fixo da aula (`.sz-lesson-nav-immersive`, no `creator-theme.css` do ui)
 * fica com o `bottom` nessa altura, logo acima das abas, e o `<main>` da aula reserva a mesma
 * medida. Mede o elemento de verdade (ícone, rótulo, borda e a área segura do aparelho), por
 * `ResizeObserver`; escondida (`md:hidden`) ela mede 0, e no `md` o tema já põe o rodapé no pé.
 *
 * ⚠️⚠️ O valor reserva do tema (`3.5rem` + área segura) só vale até este efeito rodar. Ele
 * errava a barra do Kids (ícone de 32px + rótulo + borda dão ~65px, não 56) e, numa moldura SEM
 * abas (a aula dos cursos para pais, a sala ao vivo do adulto), deixava o rodapé solto 56px acima
 * do pé da tela, com a aula passando por baixo. Moldura sem abas declara `0px` no `<main>` da aula.
 */
export function useLessonTabsHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const barra = ref.current
    if (!barra || typeof ResizeObserver === 'undefined') return
    const raiz = document.documentElement
    const publicar = () =>
      raiz.style.setProperty(
        '--sz-lesson-tabs-height',
        `${Math.ceil(barra.getBoundingClientRect().height)}px`,
      )
    publicar()
    const observador = new ResizeObserver(publicar)
    observador.observe(barra)
    return () => {
      observador.disconnect()
      raiz.style.removeProperty('--sz-lesson-tabs-height')
    }
  }, [ref])
}
