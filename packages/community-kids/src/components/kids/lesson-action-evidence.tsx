'use client'

import type { PlatformActionResult } from '@sistemazero/core/learning'
import dynamic from 'next/dynamic'
import { Component, type ReactNode } from 'react'

class AvatarEvidenceBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p role="status" className="p-4 text-sm">
        Seu avatar foi verificado! A prévia não abriu neste aparelho.
      </p>
    ) : (
      this.props.children
    )
  }
}

const AvatarPreview = dynamic(
  () => import('./avatar3d/avatar-scene').then((module) => module.AvatarScene),
  { ssr: false, loading: () => <p role="status">Preparando seu avatar…</p> },
)
const ready = () => {}
export function LessonActionEvidence({ result }: { result: PlatformActionResult }) {
  if (result.avatarSlots)
    return (
      <figure className="space-y-2">
        <div className="h-64 overflow-hidden rounded-2xl bg-muted">
          <AvatarEvidenceBoundary>
            <AvatarPreview slots={result.avatarSlots} onReady={ready} dark={false} />
          </AvatarEvidenceBoundary>
        </div>
        <figcaption className="text-center text-sm">Este é o avatar que você salvou.</figcaption>
      </figure>
    )
  return null
}
