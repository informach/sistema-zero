import { describe, expect, it } from 'bun:test'
import { buildAudioRuntime } from '../audioBridge'
import { buildInputBridgeRuntime, buildInputRuntime } from '../inputBridge'
import { buildLoopGuardRuntime } from '../loopGuard'
import { buildModalGuardRuntime } from '../modalGuard'
import { buildPermissionGuardRuntime } from '../permissionGuard'
import { buildScriptSourceGuardRuntime } from '../scriptSourceGuard'
import { buildSnapshotBridgeRuntime } from '../snapshotBridge'
import { buildStorageBridgeRuntime } from '../storageBridge'

/**
 * ⚠️⚠️ Todo bridge do preview é uma STRING de JavaScript montada num template
 * literal — e uma string que não compila só se descobre EM PRODUÇÃO, no
 * navegador da criança, porque o TypeScript não olha dentro dela.
 *
 * O gatilho mais comum aqui é a crase crua num comentário em português, escrita
 * no reflexo do markdown (o hábito de citar `assim`). Ela FECHA o template. Isso
 * já aconteceu QUATRO vezes neste pacote — a quarta enquanto eu escrevia a nota
 * sobre a terceira, e duas delas chegaram à tela da usuária pelo HMR.
 *
 * ⭐ A régua NÃO é contar crases: os bridges têm vários templates legítimos, e
 * um par de crases dentro de um comentário pode até deixar o arquivo parseável
 * mudando o SENTIDO do código. A régua é a que importa de verdade: **o runtime
 * gerado tem que ser JavaScript válido**. `new Function` compila sem executar,
 * então isto é barato e não depende de DOM.
 */

const RUNTIMES: Array<[string, () => string]> = [
  [
    'snapshotBridge',
    () => buildSnapshotBridgeRuntime({ parentOrigin: 'https://x.test', projectId: 'p1' }),
  ],
  [
    'snapshotBridge (sem projeto)',
    () => buildSnapshotBridgeRuntime({ parentOrigin: 'https://x.test' }),
  ],
  ['storageBridge', () => buildStorageBridgeRuntime()],
  ['audioBridge', () => buildAudioRuntime()],
  ['inputBridge', () => buildInputRuntime()],
  ['inputBridge (bridge)', () => buildInputBridgeRuntime()],
  ['loopGuard', () => buildLoopGuardRuntime()],
  ['modalGuard', () => buildModalGuardRuntime()],
  ['permissionGuard', () => buildPermissionGuardRuntime()],
  ['scriptSourceGuard', () => buildScriptSourceGuardRuntime()],
]

describe('runtimes injetados no preview são JS válido', () => {
  for (const [nome, montar] of RUNTIMES) {
    it(`${nome} compila`, () => {
      const fonte = montar()
      expect(fonte.length).toBeGreaterThan(0)
      // Compila sem rodar. Erro de sintaxe (crase crua, aspas, escape) lança aqui.
      expect(() => new Function('window', 'document', 'parent', fonte)).not.toThrow()
    })
  }

  it('⭐ a régua MORDE: runtime com sintaxe quebrada reprova', () => {
    // Anti-vácuo: sem isto, um `new Function` que nunca lançasse deixaria os dez
    // testes acima passando por não fazerem nada.
    expect(() => new Function(';(function(){ var a = ; })();')).toThrow()
    expect(() => new Function('return "sobrou uma aspa')).toThrow()
  })
})
