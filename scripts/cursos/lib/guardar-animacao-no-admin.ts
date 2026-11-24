/**
 * Guarda a animação de um módulo no R2 do ambiente com o CÓDIGO DO PRÓPRIO ADMIN
 * (`storeModuleAnimation`, o mesmo do "Editar módulo" → enviar animação): valida o arquivo e o
 * pôster e grava os dois em `admin/module-animation/<uuid>/`. Nenhum curso muda aqui.
 *
 * Roda num processo filho com as variáveis do Admin do ambiente (só na memória) e
 * `--conditions=react-server` (neutraliza o `server-only`); quem chama é `animacao-do-modulo.ts`.
 * Entrada: o caminho do `.edi-animation.json` no argumento. Saída: uma linha `SZ_ANIMACAO=<json>`.
 */
import { readFileSync } from 'node:fs'

const arquivo = process.argv[2]
if (!arquivo) throw new Error('Informe o arquivo .edi-animation.json')
const { storeModuleAnimation } = await import('../../../packages/admin/src/server/module-animation')
const animacao = await storeModuleAnimation(new Uint8Array(readFileSync(arquivo)))
console.log(`SZ_ANIMACAO=${JSON.stringify(animacao)}`)
