import { expect, test } from 'bun:test'
import { type LessonFormBuffer, LessonFormBufferSlot } from '../src/lib/lesson-form-buffer'

type Form = { title: string; choices: string[]; project: { id: string; files: { main: string } } }
const initial = (): Form => ({
  title: 'Inicial',
  choices: ['A'],
  project: { id: 'stable', files: { main: 'original' } },
})

test('adopted form values do not borrow mutable SDK or widget references', () => {
  const source = initial()
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const buffer = slot.open('block', source)
  source.choices.push('external mutation')
  source.project.files.main = 'external code'
  expect(buffer.getSnapshot().choices).toEqual(['A'])
  expect(buffer.getSnapshot().project.files.main).toBe('original')
  expect(Object.isFrozen(source.project)).toBe(false)

  const widgetChoices = ['B']
  const sdkProject = { id: 'stable', files: { main: 'new code' } }
  buffer.update((previous) => ({ ...previous, choices: widgetChoices, project: sdkProject }))
  widgetChoices.push('late mutation')
  sdkProject.files.main = 'late code'
  expect(buffer.getSnapshot().choices).toEqual(['B'])
  expect(buffer.getSnapshot().project.files.main).toBe('new code')
  expect(Object.isFrozen(widgetChoices)).toBe(false)
  expect(Object.isFrozen(sdkProject)).toBe(false)
})

test('snapshot is current before subscribers can begin handoff and reject the next gesture', () => {
  let editable = true
  const buffer = new LessonFormBufferSlot<Form>(() => editable).open('block', initial())
  let observed = ''
  buffer.subscribe(() => {
    observed = buffer.getSnapshot().title
    editable = false
  })
  expect(buffer.update((previous) => ({ ...previous, title: 'Accepted' }))).toBe(true)
  expect(buffer.update((previous) => ({ ...previous, title: 'Rejected' }))).toBe(false)
  expect(observed).toBe('Accepted')
  expect(buffer.getSnapshot().title).toBe('Accepted')
})

test('A to B to A never reactivates a setter from the first opening', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const firstA = slot.open('A', initial())
  const oldSetter = firstA.set
  expect(() => slot.open('B', initial())).toThrow('feche')
  expect(slot.close(firstA)).toBe(true)
  const b = slot.open('B', { ...initial(), title: 'B' })
  expect(oldSetter({ ...initial(), title: 'wrong B' })).toBe(false)
  expect(b.getSnapshot().title).toBe('B')
  slot.close(b)
  const secondA = slot.open('A', { ...initial(), title: 'Current A' })
  expect(oldSetter({ ...initial(), title: 'wrong A' })).toBe(false)
  expect(slot.close(firstA)).toBe(false)
  expect(secondA.getSnapshot().title).toBe('Current A')
})

test('resume or resource renewal conserves owned bytes while retiring previous setters', () => {
  const slot = new LessonFormBufferSlot<Form>(() => true)
  const before = slot.open('same-block', initial())
  const snapshot = before.getSnapshot()
  const resumed = slot.renew(before)
  expect(resumed.getSnapshot()).toBe(snapshot)
  expect(before.update((value) => ({ ...value, title: 'old callback' }))).toBe(false)
  expect(slot.close(before)).toBe(false)
  expect(resumed.update((value) => ({ ...value, title: 'current callback' }))).toBe(true)
  expect(resumed.getSnapshot().project).toBe(snapshot.project)
  expect(() => slot.renew(before)).toThrow('abertura ativa')
})

test('a refused updater cannot mutate the previous snapshot or a nested array in place', () => {
  let editable = true
  const buffer = new LessonFormBufferSlot<Form>(() => editable).open('block', initial())
  const previous = buffer.getSnapshot()
  let mutated = true
  const accepted = buffer.update((value) => {
    mutated = Reflect.set(value.choices, '0', 'wrong')
    editable = false
    return { ...value, title: 'refused' }
  })
  expect(mutated).toBe(false)
  expect(accepted).toBe(false)
  expect(buffer.getSnapshot()).toBe(previous)
  expect(buffer.getSnapshot().choices).toEqual(['A'])
})

test('a reentrant intent wins without an older updater replacing it afterward', () => {
  const buffer = new LessonFormBufferSlot<Form>(() => true).open('block', initial())
  const accepted = buffer.update((value) => {
    buffer.set({ ...value, title: 'newer intent' })
    return { ...value, title: 'older intent' }
  })
  expect(accepted).toBe(false)
  expect(buffer.getSnapshot().title).toBe('newer intent')
})

test('special producer objects and cycles are refused without publishing a partial replacement', () => {
  const slot = new LessonFormBufferSlot<{ title: string; producer: Date | null }>(() => true)
  const buffer = slot.open('block', { title: 'kept', producer: null })
  const previous = buffer.getSnapshot()
  const special = new Date()
  expect(() => buffer.set({ title: 'refused', producer: special })).toThrow('objeto especial')
  expect(buffer.getSnapshot()).toBe(previous)
  expect(Object.isFrozen(special)).toBe(false)

  type Node = { title: string; child?: Node }
  const cycle: Node = { title: 'cycle' }
  cycle.child = cycle
  const cyclicSlot = new LessonFormBufferSlot<Node>(() => true)
  expect(() => cyclicSlot.open('block', cycle)).toThrow('circular')
  expect(Object.isFrozen(cycle)).toBe(false)
  delete cycle.child
  expect(cyclicSlot.open('block', cycle).getSnapshot().title).toBe('cycle')
})

test('Symbol fields cannot bypass copying and freezing of an external widget payload', () => {
  const key = Symbol('external field')
  type SymbolForm = { title: string; [key]?: { choices: string[] } }
  const buffer = new LessonFormBufferSlot<SymbolForm>(() => true).open('block', { title: 'kept' })
  const previous = buffer.getSnapshot()
  const external = { choices: ['owned by widget'] }
  expect(() => buffer.set({ title: 'refused', [key]: external })).toThrow('Symbol')
  external.choices.push('late mutation')
  expect(buffer.getSnapshot()).toBe(previous)
  expect(Object.isFrozen(external)).toBe(false)
})

test('an initial getter cannot open B during adoption and have A silently replace it', () => {
  const slot = new LessonFormBufferSlot<{ title: string }>(() => true)
  let reads = 0
  const maliciousInitial = {
    get title() {
      reads++
      slot.open('B', { title: 'B must not be replaced' })
      return 'A'
    },
  }
  expect(() => slot.open('A', maliciousInitial)).toThrow('acessor')
  expect(reads).toBe(0)
  expect(slot.open('B', { title: 'B' }).getSnapshot().title).toBe('B')
})

test('a varying getter cannot smuggle an external field into the owned snapshot', () => {
  const buffer = new LessonFormBufferSlot<Form>(() => true).open('block', initial())
  const previous = buffer.getSnapshot()
  const external: string[] = ['external']
  let reads = 0
  const candidate = {
    ...previous,
    get choices() {
      return ++reads === 1 ? external : previous.choices
    },
  }
  expect(() => buffer.set(candidate)).toThrow('acessor')
  expect(reads).toBe(0)
  expect(Object.isFrozen(external)).toBe(false)
  external.push('still mutable by widget')
  expect(buffer.getSnapshot()).toBe(previous)
})

test('nested accessors and shallow-frozen external values cannot borrow mutable children', () => {
  type Nested = { field: { choices: string[] } }
  const slot = new LessonFormBufferSlot<Nested>(() => true)
  let reads = 0
  expect(() =>
    slot.open('block', {
      field: {
        get choices() {
          reads++
          return ['wrong']
        },
      },
    }),
  ).toThrow('acessor')
  expect(reads).toBe(0)
  const external = Object.freeze({ choices: ['widget'] })
  const buffer = slot.open('block', { field: external })
  external.choices.push('widget still owns this')
  expect(buffer.getSnapshot().field.choices).toEqual(['widget'])
  expect(Object.isFrozen(external.choices)).toBe(false)
})

test('opening rechecks the slot after descriptor inspection reenters through a producer proxy', () => {
  const slot = new LessonFormBufferSlot<{ title: string }>(() => true)
  let currentB: LessonFormBuffer<{ title: string }> | undefined
  const initialA = new Proxy(
    { title: 'A' },
    {
      ownKeys(target) {
        currentB = slot.open('B', { title: 'B' })
        return Reflect.ownKeys(target)
      },
    },
  )
  expect(() => slot.open('A', initialA)).toThrow('feche')
  expect(currentB?.getSnapshot().title).toBe('B')
  expect(currentB?.update((value) => ({ ...value, title: 'B remains current' }))).toBe(true)
})
