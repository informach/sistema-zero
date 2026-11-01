import { Baloo_2, Nunito } from 'next/font/google'

// The same families as Kids; files are requested only when the lesson skin uses them.
export const lessonDisplayFont = Baloo_2({
  subsets: ['latin'],
  variable: '--font-baloo',
  preload: false,
})
export const lessonBodyFont = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  preload: false,
})
