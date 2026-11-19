import { Matrix4, Mesh } from 'three'
import { prepararAguaCompilada, prepararAguaUniforme } from './agua'
import {
  gravarFontesFisicas,
  gravarSuperficieComum,
  type SuperficiesDaCompilacao,
} from './chao-caminhos'
import { dividirParteEstatica } from './geometria'
import { cederDuranteCompilacao, type MontagemDaCompilacao } from './montagem'
import { particionarAguaHorizontalCompilada, particionarOceanoCompilado } from './oceano'

export async function compilarAguasDaCena(s: SuperficiesDaCompilacao, saida: MontagemDaCompilacao) {
  const aguas = new Map(s.preparada.aguas.map((a) => [a.id, a]))
  for (const f of s.aguas.superficies()) {
    saida.sinal.throwIfAborted()
    if (!f.lamina) {
      await gravarSuperficieComum(f, 'agua', saida)
      continue
    }
    const agua = aguas.get(f.id),
      acabamento = f.acabamento
    if (!agua || !acabamento)
      throw Error('A lâmina precisa dos parâmetros e do material da água correspondente.')
    const partes =
      agua.tipo === 'mar'
        ? particionarOceanoCompilado(f, s.preparada.documento.base)
        : agua.tipo === 'cachoeira'
          ? [{ geometria: f.geometria.clone(), matriz: f.matriz.clone(), uniforme: false }]
          : particionarAguaHorizontalCompilada(f)
    try {
      for (const p of partes) {
        const menores = dividirParteEstatica(
          { geometria: p.geometria, matriz: new Matrix4() },
          new Matrix4(),
        )
        try {
          for (const geometria of menores) {
            const fonte = {
                geometria,
                matriz: p.matriz,
                acabamento,
                ...(agua.tipo === 'cachoeira' ? { larguraDaQueda: agua.largura } : {}),
              },
              pronta = p.uniforme
                ? prepararAguaUniforme(fonte, saida.sinal)
                : await prepararAguaCompilada(fonte, saida.sinal)
            try {
              saida.adicionar(
                await saida.gravar(new Mesh(pronta.geometria, pronta.material), 'agua'),
                p.matriz,
                f.id,
                'agua',
              )
            } finally {
              pronta.descartar()
            }
            await cederDuranteCompilacao(saida.sinal)
          }
        } finally {
          for (const g of menores) g.dispose()
        }
      }
    } finally {
      for (const p of partes) p.geometria.dispose()
    }
    // Receitas de água já usam coordenadas mundiais; o enquadramento lógico não depende do primeiro setor.
    saida.ancora(f.id, new Matrix4())
  }
  await gravarFontesFisicas(s.aguas.fontesDoTeste(), 'agua', saida)
}
