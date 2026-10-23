import { useHostChrome as useSharedHostChrome } from '@sistemazero/member-shell/components/creator/use-host-chrome'
import { backToSection } from './nav'

export {
  HostChromeAnnouncer,
  useCloudSyncState,
} from '@sistemazero/member-shell/components/creator/use-host-chrome'

export function useHostChrome(options: Parameters<typeof useSharedHostChrome>[0]) {
  return useSharedHostChrome({ ...options, resolveBack: backToSection })
}
