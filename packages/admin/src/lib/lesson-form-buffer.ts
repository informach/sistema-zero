/** Working form data is owned here; producers keep their File/SDK handles elsewhere. */
export type LessonFormSnapshot<T> = T extends object
  ? { readonly [K in keyof T]: LessonFormSnapshot<T[K]> }
  : T

const ownedObjects = new WeakSet<object>()

/** Only data descriptors enter a form. Inspecting them never invokes a field getter. */
function dataDescriptors(value: object) {
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key === 'symbol') throw new Error('O formulário não aceita campos Symbol.')
    const descriptor = descriptors[key]
    if (!descriptor || !('value' in descriptor))
      throw new Error('O formulário não aceita campo acessor.')
    if (!descriptor.enumerable && !(Array.isArray(value) && key === 'length'))
      throw new Error('O formulário não aceita campos de dados ocultos.')
  }
  return descriptors
}

function copyOwned(
  value: unknown,
  ancestors = new WeakSet<object>(),
  copies = new WeakMap<object, object>(),
): unknown {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint')
    throw new Error('O formulário contém um valor que precisa permanecer no seu produtor.')
  if (value === null || typeof value !== 'object') return value
  if (ancestors.has(value)) throw new Error('O formulário contém uma referência circular.')
  // Frozen external values may still contain mutable children. Trust only our own copies.
  if (ownedObjects.has(value)) return value
  const existing = copies.get(value)
  if (existing) return existing
  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
    throw new Error('Arquivo, SDK ou objeto especial não pode substituir os dados do formulário.')
  const descriptors = dataDescriptors(value)
  const copy: object = Array.isArray(value) ? [] : Object.create(prototype)
  copies.set(value, copy)
  ancestors.add(value)
  for (const [key, descriptor] of Object.entries(descriptors)) {
    const child: unknown = descriptor.value
    if (Array.isArray(value) && key === 'length') {
      Object.defineProperty(copy, key, { value: child })
      continue
    }
    Object.defineProperty(copy, key, {
      value: copyOwned(child, ancestors, copies),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  ancestors.delete(value)
  Object.freeze(copy)
  ownedObjects.add(copy)
  return copy
}

function ownInitial<T>(value: T): LessonFormSnapshot<T>
function ownInitial(value: unknown): unknown {
  return copyOwned(value)
}

/** Copy an already readonly-shaped candidate without recursively mapping its type again. */
function ownReplacement<T>(value: T): T
function ownReplacement(value: unknown): unknown {
  return copyOwned(value)
}

function assertFormRoot(value: unknown) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  )
    throw new Error('Os campos do formulário precisam ser um objeto simples.')
}

export interface LessonFormBuffer<T extends object> {
  readonly targetId: string
  /** Identity only. A current opening remains readable during owner handoff. */
  isCurrent(): boolean
  getSnapshot(): LessonFormSnapshot<T>
  subscribe(listener: () => void): () => void
  set(value: LessonFormSnapshot<T>): boolean
  update(updater: (current: LessonFormSnapshot<T>) => LessonFormSnapshot<T>): boolean
}

class OwnedLessonFormBuffer<T extends object> implements LessonFormBuffer<T> {
  private value: LessonFormSnapshot<T>
  private listeners = new Set<() => void>()

  constructor(
    readonly targetId: string,
    ownedInitial: LessonFormSnapshot<T>,
    private readonly canEdit: () => boolean,
    private readonly currentOpening: () => boolean,
  ) {
    this.value = ownedInitial
  }

  getSnapshot = () => this.value
  isCurrent = () => this.currentOpening()
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  set = (value: LessonFormSnapshot<T>) => this.update(() => value)
  update = (updater: (current: LessonFormSnapshot<T>) => LessonFormSnapshot<T>): boolean => {
    if (!this.canEdit()) return false
    const previous = this.value
    const candidate = updater(previous)
    if (!this.canEdit() || this.value !== previous) return false
    if (Object.is(candidate, previous)) return true
    assertFormRoot(candidate)
    // Unchanged branches belong to ownedObjects and are shared without traversing them.
    const next = ownReplacement(candidate)
    if (!this.canEdit() || this.value !== previous) return false
    this.value = next
    for (const listener of this.listeners) listener()
    return true
  }
}

/** One slot per form kind in the persistent owner. A closed opening is never reused,
 * even when the same targetId returns. Closing still requires the UI's capture protocol. */
export class LessonFormBufferSlot<T extends object> {
  private active: OwnedLessonFormBuffer<T> | null = null
  private listeners = new Set<() => void>()
  constructor(private readonly canEdit: () => boolean) {}

  /** Stable identity snapshot for presentation/capture; grants no write authority. */
  getCurrent = (): LessonFormBuffer<T> | null => this.active
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  open(targetId: string, initial: T): LessonFormBuffer<T> {
    if (this.active) throw new Error('Capture e feche o formulário atual antes de abrir outro.')
    assertFormRoot(initial)
    const owned = ownInitial(initial)
    if (this.active) throw new Error('Capture e feche o formulário atual antes de abrir outro.')
    return this.activate(targetId, owned)
  }

  /** Preserve owned bytes/view while replacing the write capability after resume or a
   * resource generation change. Only the owner controller holds this slot. */
  renew(opening: LessonFormBuffer<T>): LessonFormBuffer<T> {
    if (this.active !== opening) throw new Error('Este formulário não é mais a abertura ativa.')
    return this.activate(opening.targetId, opening.getSnapshot())
  }

  private activate(targetId: string, ownedInitial: LessonFormSnapshot<T>): LessonFormBuffer<T> {
    const opening: OwnedLessonFormBuffer<T> = new OwnedLessonFormBuffer(
      targetId,
      ownedInitial,
      () => this.active === opening && this.canEdit(),
      () => this.active === opening,
    )
    this.active = opening
    for (const listener of this.listeners) listener()
    return opening
  }

  close(opening: LessonFormBuffer<T>): boolean {
    if (this.active !== opening) return false
    this.active = null
    for (const listener of this.listeners) listener()
    return true
  }
}
