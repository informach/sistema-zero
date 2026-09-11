import type { JSX } from 'react'
import {
  IconAlert,
  IconCloud,
  IconCloudDownload,
  IconCloudOff,
  IconCloudUpload,
  type IconProps,
} from '#ui'
import type { StudioHostChromeStatus } from '../../studio/host-chrome'

/**
 * O ícone do selo de nuvem do host por estado (o vocabulário do `lib/host-chrome.ts` do kids).
 * UM mapa para a lista de projetos e para a barra do editor: os dois desenham o mesmo selo.
 */
export const HOST_STATUS_ICON: Record<
  StudioHostChromeStatus['icon'],
  (props: IconProps) => JSX.Element
> = {
  upload: IconCloudUpload,
  download: IconCloudDownload,
  cloud: IconCloud,
  offline: IconCloudOff,
  alert: IconAlert,
}
