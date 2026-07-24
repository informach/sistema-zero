import * as Blockly from 'blockly/core'
import { CANVAS3D_ADDON_MODULES, CANVAS3D_AUTO_ADDON_MODULE } from '../../three/canvas3dAddons'

export const ADDON_MODULE_VISIBILITY_EXTENSION = 'sz_addon_module_visibility'

function splitNames(raw: unknown): string[] {
  return `${raw ?? ''}`
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

/**
 * O caminho do arquivo é REDUNDANTE quando todo nome escolhido é um addon do
 * catálogo e o módulo é o canônico dele (ou o marcador "automático"/vazio) — o
 * gerador resolve sozinho. Nome fora da lista OU caminho divergente = a linha
 * carrega informação real e precisa aparecer.
 */
function moduleIsRedundant(namesRaw: unknown, moduleRaw: unknown): boolean {
  const names = splitNames(namesRaw)
  if (names.length === 0) return true
  const module = `${moduleRaw ?? ''}`.trim()
  return names.every((name) => {
    const canonical = CANVAS3D_ADDON_MODULES[name]
    if (!canonical) return false
    return module === '' || module === CANVAS3D_AUTO_ADDON_MODULE || module === canonical
  })
}

/**
 * Extensão do bloco "usar … da biblioteca" (`sz_t3d_import_named`): esconde a
 * linha "no arquivo …" enquanto o caminho é derivável do próprio addon (o caso
 * de sempre — a criança só ESCOLHE no picker e o caminho é ruído). A linha volta
 * quando o nome é desconhecido (addon custom digitado — ela informa o arquivo)
 * ou quando a Ponte trouxe um caminho não-canônico (fidelidade visível). Só
 * APRESENTAÇÃO: os campos `NAMES`/`MODULE` continuam serializados como sempre —
 * IR, round-trip e projetos salvos ficam intactos.
 */
export function registerAddonModuleVisibilityExtension(): void {
  if (Blockly.Extensions.isRegistered(ADDON_MODULE_VISIBILITY_EXTENSION)) return
  Blockly.Extensions.register(ADDON_MODULE_VISIBILITY_EXTENSION, function (this: Blockly.Block) {
    const namesField = this.getField('NAMES')
    const moduleField = this.getField('MODULE')
    if (!namesField || !moduleField) return
    const moduleInput = this.inputList.find((input) =>
      input.fieldRow.some((field) => field.name === 'MODULE'),
    )
    if (!moduleInput) return

    const update = (names: unknown, module: unknown): void => {
      const visible = !moduleIsRedundant(names, module)
      if (moduleInput.isVisible() === visible) return
      moduleInput.setVisible(visible)
      // Headless (testes/serialização) não renderiza — o flag basta.
      ;(this as { queueRender?: () => Promise<void> }).queueRender?.()
    }
    // Validators rodam em TODA escrita (picker, digitação, load da serialização) —
    // é o gancho que mantém a visibilidade em dia sem listener de workspace.
    namesField.setValidator((value) => {
      update(value, moduleField.getValue())
      return value
    })
    moduleField.setValidator((value) => {
      update(namesField.getValue(), value)
      return value
    })
    update(namesField.getValue(), moduleField.getValue())
  })
}
