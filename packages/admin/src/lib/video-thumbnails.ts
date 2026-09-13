export interface VideoThumbnail {
  id: string
  url: string | null
  active: boolean
  type: string
}
export interface VideoThumbnails {
  current: VideoThumbnail | null
  pictures: VideoThumbnail[]
  page: number
  hasMore: boolean
}

export function thumbnailFileError(file: { type: string; size: number }): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return 'Formato inválido. Envie JPG ou PNG.'
  if (file.size > 5 * 1024 * 1024) return 'Imagem excede o limite de 5 MB.'
  if (!file.size) return 'A imagem está vazia.'
  return null
}
