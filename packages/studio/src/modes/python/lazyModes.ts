import { createElement, lazy } from 'react'
import type { IDEMode } from '#core'

const importClassic = () => import('./PythonClassicMode')
const importCode = () => import('./PythonCodeMode')

export const PythonClassicMode = lazy(() =>
  importClassic().then((module) => ({ default: module.PythonClassicMode })),
)
export const PythonCodeMode = lazy(() =>
  importCode().then((module) => ({ default: module.PythonCodeMode })),
)

export function PythonMode({ mode }: { mode: IDEMode }) {
  return mode === 'code'
    ? createElement(PythonCodeMode)
    : createElement(PythonClassicMode, { mode })
}

/** Keep Python's dependency/preload graph outside the initial JavaScript project list. */
export function prefetchPythonMode(mode: IDEMode | undefined) {
  void (mode === 'code' ? importCode() : importClassic())
}
