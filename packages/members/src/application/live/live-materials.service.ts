import { ValidationError } from '@sistemazero/core/errors'
import type { LiveMaterial } from '@sistemazero/core/live'
import type { LiveMaterialRecord, LiveMaterialsPort } from '../../domain/ports/live-materials.port'

const TYPES = new Set([
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])
export class LiveMaterialsService {
  constructor(
    private readonly repository: LiveMaterialsPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  async register(input: Omit<LiveMaterialRecord, 'createdAt'>) {
    if (
      !TYPES.has(input.contentType) ||
      !Number.isInteger(input.sizeBytes) ||
      input.sizeBytes < 1 ||
      input.sizeBytes > 8 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(input.sha256) ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(input.fileName) ||
      input.storageKey !== `live/materials/${input.id}/${input.fileName}` ||
      !input.title.trim() ||
      input.title.length > 200
    )
      throw new ValidationError('Material inválido. Envie o arquivo pela área de materiais.')
    const previous = await this.repository.find(input.id)
    if (previous) {
      if (
        previous.sha256 !== input.sha256 ||
        previous.storageKey !== input.storageKey ||
        previous.uploadedBy !== input.uploadedBy ||
        previous.sizeBytes !== input.sizeBytes
      )
        throw new ValidationError('Identificador de material já utilizado.')
      return this.summary(previous)
    }
    const record = { ...input, title: input.title.trim(), createdAt: this.clock().toISOString() }
    await this.repository.create(record)
    return this.summary(record)
  }
  private summary(input: LiveMaterial): LiveMaterial {
    return {
      id: input.id,
      title: input.title,
      fileName: input.fileName,
      storageKey: input.storageKey,
    }
  }
  async validate(materials: LiveMaterial[]) {
    for (const material of materials) {
      const saved = await this.repository.find(material.id)
      if (
        !saved ||
        saved.storageKey !== material.storageKey ||
        saved.fileName !== material.fileName
      )
        throw new ValidationError('Envie os materiais da oficina antes de salvar o roteiro.')
    }
  }
}
