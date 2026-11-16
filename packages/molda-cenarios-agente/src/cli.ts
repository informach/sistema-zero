import { resolve } from 'node:path'
import { PedidoDeViewportSchema } from '@sistemazero/molda-cenarios-core'
import { criarClienteCenarios, lerAcesso } from './cliente'

const [acao, alvo, arquivo] = process.argv.slice(2),
  cliente = criarClienteCenarios(await lerAcesso())
switch (acao) {
  case 'projetos':
    console.log(JSON.stringify(await cliente.projetos(), null, 2))
    break
  case 'sessoes':
    console.log(JSON.stringify(await cliente.sessoes(), null, 2))
    break
  case 'projeto':
    if (!alvo) throw Error('Informe o projeto')
    console.log(JSON.stringify(await cliente.projeto(alvo), null, 2))
    break
  case 'catalogo': {
    if (!alvo) throw Error('Use catalogo <projeto> [busca]')
    const p = await cliente.projeto(alvo),
      c = await cliente.catalogo(p.documento.catalogo.id, p.documento.catalogo.digest)
    console.log(
      JSON.stringify(
        c
          .filter(
            (m) =>
              !arquivo ||
              `${m.nome} ${m.origem} ${m.caminho}`.toLowerCase().includes(arquivo.toLowerCase()),
          )
          .slice(0, 100),
        null,
        2,
      ),
    )
    break
  }
  case 'executar': {
    if (!alvo || !arquivo) throw Error('Use executar <sessão> <arquivo.json> [captura.png]')
    const pedido = PedidoDeViewportSchema.parse(await Bun.file(resolve(arquivo)).json()),
      r = await cliente.executar(alvo, pedido),
      imagem = r.dados?.imagem
    if (typeof imagem === 'string' && imagem.startsWith('data:image/png;base64,')) {
      const saida = process.argv[5]
      if (!saida) throw Error('Informe o arquivo PNG de saída')
      await Bun.write(
        resolve(saida),
        Buffer.from(imagem.slice('data:image/png;base64,'.length), 'base64'),
      )
      delete r.dados!.imagem
    }
    console.log(JSON.stringify(r, null, 2))
    if (!r.ok) process.exitCode = 1
    break
  }
  default:
    throw Error(
      'Comandos: projetos | sessoes | projeto <id> | catalogo <projeto> [busca] | executar <sessão> <pedido.json> [captura.png]',
    )
}
