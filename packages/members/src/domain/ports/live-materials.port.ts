import type { LiveMaterial } from '@sistemazero/core/live'

export interface LiveMaterialRecord extends LiveMaterial {
  contentType: string
  sizeBytes: number
  sha256: string
  uploadedBy: string
  createdAt: string
}
export interface LiveMaterialsPort {
  find(id: string): Promise<LiveMaterialRecord | null>
  create(input: LiveMaterialRecord): Promise<void>
}
