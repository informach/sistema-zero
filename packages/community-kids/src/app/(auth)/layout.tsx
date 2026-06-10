import { AuthSplitShell } from '@/components/kids/auth-split-shell'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthSplitShell>{children}</AuthSplitShell>
}
