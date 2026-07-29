export type ProgrammingReferenceKind = 'variable' | 'list' | 'class' | 'function'

export interface ProgrammingReferenceField {
  field: string
  kind: ProgrammingReferenceKind
  when?: { field: string; equals: string }
  unlessPresent?: string
}

const variableReference = (field: string): ProgrammingReferenceField => ({
  field,
  kind: 'variable',
})
const listReference = (field: string): ProgrammingReferenceField => ({ field, kind: 'list' })
const classReference = (field: string): ProgrammingReferenceField => ({ field, kind: 'class' })
const functionReference = (field: string): ProgrammingReferenceField => ({
  field,
  kind: 'function',
})
const variableTarget = (field: string): ProgrammingReferenceField => ({
  field,
  kind: 'variable',
  when: { field: 'targetKind', equals: 'var' },
})

/** Campos-string que consomem símbolos no IR da categoria Programação. */
export const PROGRAMMING_REFERENCE_FIELDS: Readonly<
  Record<string, readonly ProgrammingReferenceField[]>
> = {
  arrayPush: [listReference('arrayVar')],
  arrayRemove: [listReference('arrayVar')],
  arraySplice: [listReference('arrayVar')],
  arrayLength: [listReference('arrayVar')],
  arrayMap: [listReference('arrayVar')],
  index: [listReference('arrayVar')],
  arrayLast: [listReference('arrayVar')],
  arrayFind: [listReference('arrayVar')],
  shuffle: [listReference('arrayVar')],
  propAccess: [variableReference('objectVar')],
  callMethodExpr: [variableReference('objectVar')],
  datasetGet: [variableReference('objectVar')],
  classContains: [variableTarget('targetId')],
  newExpr: [
    { ...classReference('className'), unlessPresent: 'namespace' },
    variableReference('namespace'),
  ],
  call: [functionReference('name')],
  forOf: [listReference('iterableVar')],
  event: [variableTarget('target')],
  setProperty: [variableTarget('targetId')],
  getProperty: [variableTarget('targetId')],
  setStyle: [variableTarget('targetId')],
  setAttribute: [variableTarget('targetId')],
  getAttribute: [variableTarget('targetId')],
  appendChild: [variableReference('parentVar'), variableReference('childVar')],
  objectAssign: [variableReference('targetVar'), variableReference('sourceVar')],
  setDataset: [variableTarget('targetId')],
  classOp: [variableTarget('targetId')],
  callFunction: [functionReference('name')],
  requestFrame: [functionReference('fn')],
  classDecl: [classReference('superClass')],
  newInstance: [
    { ...classReference('className'), unlessPresent: 'namespace' },
    variableReference('namespace'),
  ],
  callMethod: [variableReference('objectVar')],
  eventHandler: [variableTarget('target'), functionReference('handlerName')],
  setProp: [variableReference('objectVar')],
  setTimeoutCall: [functionReference('fn')],
}
