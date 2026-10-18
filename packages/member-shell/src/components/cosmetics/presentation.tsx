'use client'

import { ArrowLeft, Coins, Gamepad2, Loader2, UserRound } from 'lucide-react'
import { type ComponentType, createContext, type PropsWithChildren, useContext } from 'react'
import { cn } from '../../lib/cn'

type MascotProps = { expression?: 'thinking' | 'celebrating' | 'sleeping'; className?: string }
type CoinProps = { className?: string }
type AvatarProps = { photoUrl?: string | null; size?: 'lg'; className?: string }
type BackProps = { label: string; onClick: () => void; variant?: 'overlay' }
export interface CosmeticsPresentation {
  Mascot: ComponentType<MascotProps>
  Coin: ComponentType<CoinProps>
  Avatar: ComponentType<AvatarProps>
  BackButton: ComponentType<BackProps>
}
const Context = createContext<CosmeticsPresentation>({
  Mascot: ({ className, expression }) =>
    expression === 'thinking' ? (
      <Loader2 aria-hidden="true" className={cn('size-8 motion-safe:animate-spin', className)} />
    ) : (
      <Gamepad2 aria-hidden="true" className={className} />
    ),
  Coin: ({ className }) => <Coins aria-hidden="true" className={cn('size-4', className)} />,
  Avatar: ({ photoUrl, className }) =>
    photoUrl ? (
      <img src={photoUrl} alt="Seu avatar" className={cn('rounded-full', className)} />
    ) : (
      <UserRound aria-label="Seu avatar" className={className} />
    ),
  BackButton: ({ label, onClick }) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full bg-card/90 text-foreground shadow-sm"
    >
      <ArrowLeft className="size-5" />
    </button>
  ),
})
export function CosmeticsPresentationProvider({
  value,
  children,
}: PropsWithChildren<{ value: CosmeticsPresentation }>) {
  return <Context.Provider value={value}>{children}</Context.Provider>
}
// Compatibility names stay inside the extracted renderers; the host supplies their presentation.
export function KidsMascot(props: MascotProps) {
  const { Mascot } = useContext(Context)
  return <Mascot {...props} />
}
export function ZappyCoin(props: CoinProps) {
  const { Coin } = useContext(Context)
  return <Coin {...props} />
}
export function KidsAvatar(props: AvatarProps) {
  const { Avatar } = useContext(Context)
  return <Avatar {...props} />
}
export function KidsBackButton(props: BackProps) {
  const { BackButton } = useContext(Context)
  return <BackButton {...props} />
}
