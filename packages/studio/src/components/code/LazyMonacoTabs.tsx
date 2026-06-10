import { lazy } from 'react'

export const MonacoTabs = lazy(() =>
  import('#monaco').then((module) => ({ default: module.MonacoTabs })),
)
