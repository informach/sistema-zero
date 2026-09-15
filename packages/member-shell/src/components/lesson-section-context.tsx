'use client'

import { createContext, useContext } from 'react'

/**
 * O que a SEÇÃO já disse, para o bloco não repetir.
 *
 * ⚠️⚠️ Nasceu de uma tela real: a Aula 1 do Corre Dino mostrava o título "Criar e mostrar são a
 * mesma coisa?" no cabeçalho da seção E de novo no cartão da cena, com um Zappy falando na
 * coluna da esquerda e um segundo Zappy dentro do cartão. Quatro elementos para dizer duas
 * coisas, antes de a criança chegar no que importa.
 *
 * ⚠️ É contexto, e não prop, de propósito: entre a seção e o bloco há o `renderBlocks` de CADA
 * app (kids e adulto), e uma prop nova teria que atravessar os dois — que é justamente o tipo de
 * encanamento que não se faz por um detalhe de apresentação. O bloco pergunta; quem não tem
 * seção em volta recebe o vazio e desenha como sempre. ⚠️ O ensaio de autoria do admin TEM o
 * provider (ele renderiza o `LessonSections` inteiro, e é o que se quer: ele mostra ao professor
 * o que a criança vê). Quem fica sem é a prévia de um bloco só, no `learning-builder`.
 */
export interface LessonSectionInfo {
  /** O título que o cabeçalho da seção já mostrou. */
  titulo: string
  /** A seção já tem um balão de fala (o Zappy) num bloco próprio? */
  temDialogo: boolean
}

const LessonSectionContext = createContext<LessonSectionInfo | null>(null)
export const LessonSectionProvider = LessonSectionContext.Provider
export const useLessonSection = () => useContext(LessonSectionContext)

/** O bloco deve repetir o próprio título? Não, quando a seção já disse a mesma coisa. */
export function tituloJaDito(titulo: string, secao: LessonSectionInfo | null): boolean {
  if (!secao) return false
  const limpa = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ')
  return limpa(titulo) === limpa(secao.titulo)
}
