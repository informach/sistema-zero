'use client'

import { createContext, useContext } from 'react'
import { ADULT_LESSON_COPY, type LessonCopy } from '../lib/lesson-copy'

/**
 * Qual vocabulário as telas de aula usam (ver `lib/lesson-copy`). O Kids envolve a área logada
 * com o dele; o adulto e o Admin ficam no padrão.
 */
const LessonCopyContext = createContext<LessonCopy>(ADULT_LESSON_COPY)

export const LessonCopyProvider = LessonCopyContext.Provider

export function useLessonCopy(): LessonCopy {
  return useContext(LessonCopyContext)
}
