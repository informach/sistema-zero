import { KidsSpaceSkeleton } from '@/components/kids/kids-space-skeleton'

// Fallback de Suspense da rota: o MESMO esqueleto que o client mostra no fetch — assim
// não pisca o esqueleto genérico (grade de cards) antes do esqueleto do fórum. Clube = fórum.
export default function ClubeLoading() {
  return <KidsSpaceSkeleton isWall={false} />
}
