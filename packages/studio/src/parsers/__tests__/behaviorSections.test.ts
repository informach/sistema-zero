import 'blockly/blocks'
import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { buildWorkspaceStateFromIR } from '#blockly'
import { SZIRV2Schema } from '#ir'
import { ensureBlocklyInitialized } from '../../blockly/setup'
import { parseProjectFilesWithDiagnostics } from '../project'

const FILES = {
  'index.html': '',
  'style.css': '',
  'script.js': `// Meus moldes
let configuracao = 3;
function prepararReceita() {
  console.log(configuracao);
}
console.log("comando deslocado");
document.addEventListener("click", () => {
  console.log("evento");
});
setInterval(() => {
  console.log("laço");
}, 1000);
// Ao iniciar
class Receita {}
let partida = 1;
// Quando acontecer
console.log("também é início");
// Enquanto estiver rodando
console.log("continua sendo início");`,
} as const

describe('seções de comportamento do projeto', () => {
  it('usa o marcador só para raízes multiárea e roteia as estritas pelo contrato', () => {
    const result = parseProjectFilesWithDiagnostics(FILES)

    expect(result.ir.behavior.molds?.map((statement) => statement.type)).toEqual([
      'var',
      'funcDecl',
      'classDecl',
    ])
    expect(result.ir.behavior.start.map((statement) => statement.type)).toEqual([
      'consoleLog',
      'var',
      'consoleLog',
      'consoleLog',
    ])
    expect(result.ir.behavior.events.map((statement) => statement.type)).toEqual(['event'])
    expect(result.ir.behavior.loops.map((statement) => statement.type)).toEqual(['setInterval'])
  })

  it('toda IR aceita pelo parser valida e carrega num workspace real', () => {
    const result = parseProjectFilesWithDiagnostics(FILES)
    const validated = SZIRV2Schema.safeParse(result.ir)
    if (!validated.success) {
      throw new Error(validated.error.issues.map((issue) => issue.message).join('\n'))
    }

    ensureBlocklyInitialized()
    const workspace = new Blockly.Workspace()
    try {
      expect(() =>
        Blockly.serialization.workspaces.load(
          buildWorkspaceStateFromIR(validated.data) as unknown as Record<string, unknown>,
          workspace,
        ),
      ).not.toThrow()
    } finally {
      workspace.dispose()
    }
  })
})
