import { resolve } from 'node:path'
import { criarClienteDaOficina, lerAcessoDaOficina, RecusaDaOficina } from './cliente'

/**
 * CLI da oficina de cenários (Molda › Cenários), para a equipe e para agentes sem MCP.
 * Fala com a plataforma pelo gateway, nas mesmas rotas da edição à mão.
 */
const USO = `Comandos:
  espacos
  bibliotecas <espaço>
  modelos <biblioteca> [busca]
  mundos <espaço>
  criar-mundo <espaço> <nome>
  cenarios <mundo>
  criar-cenario <mundo> <nome>
  cenario <cenário>
  duplicar <cenário>
  editar <cenário> <lote.json>     (lote.json: { "revisaoEsperada": 3, "comandos": [...] })

Acesso: MOLDA_CENARIOS_URL (o gateway) e MOLDA_CENARIOS_EMAIL + MOLDA_CENARIOS_SENHA
de uma conta da equipe, ou MOLDA_CENARIOS_TOKEN.`

const [acao, alvo, extra] = process.argv.slice(2)
const mostrar = (valor: unknown) => console.log(JSON.stringify(valor, null, 2))
const exigir = (valor: string | undefined, oque: string): string => {
  if (!valor) throw Error(`Informe ${oque}\n\n${USO}`)
  return valor
}

try {
  if (!acao || acao === 'ajuda') {
    console.log(USO)
  } else {
    const cliente = criarClienteDaOficina(lerAcessoDaOficina())
    switch (acao) {
      case 'espacos':
        mostrar(await cliente.espacos())
        break
      case 'bibliotecas':
        mostrar(await cliente.bibliotecas(exigir(alvo, 'o espaço')))
        break
      case 'modelos':
        mostrar(
          await cliente.modelos(exigir(alvo, 'a biblioteca'), {
            ...(extra ? { busca: extra } : {}),
            limite: 100,
          }),
        )
        break
      case 'mundos':
        mostrar(await cliente.mundos(exigir(alvo, 'o espaço')))
        break
      case 'criar-mundo':
        mostrar(await cliente.criarMundo(exigir(alvo, 'o espaço'), exigir(extra, 'o nome')))
        break
      case 'cenarios':
        mostrar(await cliente.cenarios(exigir(alvo, 'o mundo')))
        break
      case 'criar-cenario':
        mostrar(await cliente.criarCenario(exigir(alvo, 'o mundo'), exigir(extra, 'o nome')))
        break
      case 'cenario':
        mostrar(await cliente.cenario(exigir(alvo, 'o cenário')))
        break
      case 'duplicar':
        mostrar(await cliente.duplicar(exigir(alvo, 'o cenário')))
        break
      case 'editar': {
        const lote = await Bun.file(resolve(exigir(extra, 'o arquivo do lote'))).json()
        mostrar(
          await cliente.editar(
            exigir(alvo, 'o cenário'),
            lote.revisaoEsperada,
            lote.comandos,
            lote.operacaoId,
          ),
        )
        break
      }
      default:
        throw Error(`Não conheço "${acao}"\n\n${USO}`)
    }
  }
} catch (falha) {
  if (falha instanceof RecusaDaOficina)
    console.error(
      JSON.stringify(
        { erro: falha.message, codigo: falha.codigo, ...(falha.detalhes ?? {}) },
        null,
        2,
      ),
    )
  else console.error(falha instanceof Error ? falha.message : String(falha))
  process.exitCode = 1
}
