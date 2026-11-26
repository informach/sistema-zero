/** Metros, Y acima e frente +Z. size é XYZ, nunca a ordem dims da arte. */
export type MoradaVector = [number, number, number]
export interface MoradaCollider {
  center: MoradaVector
  size: MoradaVector
  part?: string
}
export interface MoradaSlot {
  id: string
  center: MoradaVector
  size: MoradaVector
  part?: string
}
export interface MoradaInteraction {
  id: string
  type: 'door' | 'slide'
  axis: MoradaVector
  amount: number
}
export interface MoradaMaterial {
  name: string
  map?: string
  emissiveMap?: string
}
/** O vão onde a arte desenhou uma janela ou porta: a parede com o vão e o índice dele. */
export interface MoradaInsertOpening {
  wall: string
  index: number
}

export interface MoradaPiece {
  id: string
  label: string
  category: string
  kind: 'furniture' | 'construction' | 'pet'
  group: string
  file: string
  thumb: string
  size: MoradaVector
  min: MoradaVector
  max: MoradaVector
  mount: 'floor' | 'wall' | 'ceiling' | 'support'
  colliders: MoradaCollider[]
  collisionMeshes: string[]
  /** Ocupação grosseira derivada das malhas para navegação; a física usa o GLB original. */
  navigationColliders?: MoradaCollider[]
  slots: MoradaSlot[]
  interactions: MoradaInteraction[]
  materials: MoradaMaterial[]
  colors: string[]
  tags: string[]
  triangles: number
  animations: { id: string; duration: number; loop: boolean }[]
  points: Record<string, { position: MoradaVector; direction?: MoradaVector; part?: string }>
  species?: 'cat' | 'dog'
}
export interface MoradaCatalog {
  version: 1
  source: { commit: string; generatedAt: string }
  pieces: Record<string, MoradaPiece>
  textures: Record<string, { id: string; label: string; kind: string; file: string }>
  palette: Record<string, { index: number; hex: string }>
  files: string[]
}
export interface MoradaInstance {
  id: string
  pieceId: string
  position: MoradaVector
  rotation: number
  /** Posição relativa ao cômodo; sem cômodo, relativa ao lote. */
  roomId?: string
  /** Com pai, a posição é relativa ao slot do pai. */
  parentId?: string
  slotId?: string
  colors?: Record<string, string>
  materials?: Record<string, { color?: string; texture?: string }>
  /** Referência de função; o serviço do jogo confere a conquista correspondente. */
  behavior?: string
}
export interface MoradaRoom {
  id: string
  label: string
  origin: MoradaVector
  size: [number, number]
  lighting?: 'dia' | 'tarde' | 'noite' | 'neon-rosa' | 'neon-ciano' | 'festa'
}
export interface MoradaHouse {
  /** Importações de conteúdo legado já concluídas; não concedem progresso. */
  migrations?: Array<'arquipelago-functions-v1'>
  version: 1
  roomId: string
  lot: { size: [number, number] }
  rooms: MoradaRoom[]
  instances: MoradaInstance[]
  pet: string | null
}
