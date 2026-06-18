import { KidsSpaceSkeleton } from '@/components/kids/kids-space-skeleton'

// Fallback de Suspense da rota: o MESMO esqueleto que o client mostra no fetch — assim
// não pisca o esqueleto genérico (grade de cards) antes do esqueleto da parede. Mural = parede.
export default function MuralLoading() {
  return <KidsSpaceSkeleton isWall={true} />
}
