import { criarClienteDaOficina, lerAcessoDaOficina } from './cliente'
import { criarContexto, executarFerramenta, FERRAMENTAS } from './ferramentas'

/**
 * CLI da oficina de cenários: as MESMAS ferramentas do MCP, uma por chamada.
 *
 *   bun run cli <ferramenta> '<argumentos em JSON>'
 *   bun run cli ajuda
 *
 * Acesso pelo ambiente: MOLDA_CENARIOS_APP (obrigatório), MOLDA_CENARIOS_TOKEN, ou
 * MOLDA_CENARIOS_GATEWAY + MOLDA_CENARIOS_EMAIL + MOLDA_CENARIOS_SENHA.
 */

export function ajuda(): string {
  return [
    "Uso: bun run cli <ferramenta> '<argumentos em JSON>'",
    '',
    ...FERRAMENTAS.map((f) => `  ${f.name.padEnd(20)} ${f.description.split('. ')[0]}.`),
    '',
    'Guia completo: docs/molda-cenarios-agentes.md',
  ].join('\n')
}

if (import.meta.main) {
  const [nome, json] = process.argv.slice(2)
  if (!nome || nome === 'ajuda' || nome === '--help') {
    console.log(ajuda())
    process.exit(nome ? 0 : 1)
  }
  let argumentos: unknown = {}
  try {
    argumentos = json ? JSON.parse(json) : {}
  } catch {
    console.error('Os argumentos precisam ser um JSON válido.')
    process.exit(2)
  }
  const { host } = criarClienteDaOficina(lerAcessoDaOficina())
  const r = await executarFerramenta(criarContexto(host), nome, argumentos)
  if (r.ok) console.log(JSON.stringify(r.valor, null, 2))
  else {
    console.error(JSON.stringify(r.erro, null, 2))
    process.exit(1)
  }
}
