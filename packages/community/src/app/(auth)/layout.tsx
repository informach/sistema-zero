import { AuthSplitShell } from '@/components/community/auth-split-shell'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthSplitShell>{children}</AuthSplitShell>
}
