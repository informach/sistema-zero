'use client'

import { GameAdmin, type PecasDoAdmin } from '@sistemazero/arquipelago-admin'
import { usePlatform } from '@/components/admin/platform-provider'
import { setPlatform } from '@/components/admin/platform-store'
import { GameObjectivesEditor } from '@/components/editor/game-objectives-editor'
import { StudioEmbed } from '@/components/studio/studio-embed'

/** As peças do Admin que o painel do jogo usa (o pacote não importa o Admin). */
export function JogoClient({ canWrite }: { canWrite: boolean }) {
  const platform = usePlatform()
  const pecas: PecasDoAdmin = {
    publico: platform === 'kids' ? 'kids' : 'adulto',
    trocarPublico: (p) => setPlatform(p === 'kids' ? 'kids' : 'adult'),
    EditorDeObjetivos: GameObjectivesEditor,
    Estudio: StudioEmbed,
  }
  return <GameAdmin canWrite={canWrite} pecas={pecas} />
}
