import {
  type DocumentoDeCenario,
  type IluminacaoDeCenario,
  IluminacaoSchema,
  igual,
  type TexturaDoCenario,
} from '@sistemazero/molda-cenarios-core/v2'
import type { ComandoDePreviaDoAmbiente } from '@sistemazero/molda-cenarios-motor'

export interface RascunhoDeIluminacao {
  iluminacao: IluminacaoDeCenario
  texturas: TexturaDoCenario[]
}
export function comandosDoAmbiente(
  doc: DocumentoDeCenario,
  r: RascunhoDeIluminacao,
): ComandoDePreviaDoAmbiente[] {
  const resultado = IluminacaoSchema.safeParse(r.iluminacao)
  if (!resultado.success) {
    const erro = resultado.error.issues[0]
    throw Error(
      erro?.code === 'custom'
        ? erro.message
        : 'Confira as cores, direções e medidas da iluminação.',
    )
  }
  const iluminacao = resultado.data,
    ceu = iluminacao.ceu,
    comandos: ComandoDePreviaDoAmbiente[] = []
  if (ceu?.tipo === 'panorama') {
    const ref = r.texturas.find((t) => t.id === ceu.textura)
    if (ref && !doc.texturas?.some((t) => igual(t, ref)))
      comandos.push({ tipo: 'textura.definir', textura: ref })
  }
  if (!igual(doc.iluminacao, iluminacao)) comandos.push({ tipo: 'iluminacao.definir', iluminacao })
  return comandos
}
