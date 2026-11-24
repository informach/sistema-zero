import { z } from 'zod'
import type { CampoDeAlturas, RegiaoDoCampo } from './campo-de-alturas'
import { ruidoFractal, suave } from './pinceis-de-terreno'

/**
 * Modelos prontos de terreno: o ponto de partida da aba Terreno e o comando de intenção
 * "gerar terreno por receita" dos agentes. A receita é um dado pequeno e validado; o relevo
 * sai sempre igual para a mesma receita e o mesmo tamanho de campo.
 */
const altura = z.number().finite().min(0).max(2000)
const semente = z.number().int().min(0).max(0x7fffffff)
export const ReceitaDeTerrenoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('plano'), altura: z.number().finite().min(-2000).max(2000) }).strict(),
  z
    .object({
      tipo: z.literal('ilha'),
      /** Ponto mais alto, acima do nível zero (o do mar). */
      altura,
      /** Quanto o fundo fica abaixo de zero em volta da ilha. Padrão: um terço da altura. */
      fundo: altura.optional(),
      /** 0 a 1: quanto a costa e as encostas fogem do círculo. Padrão 0,5. */
      irregularidade: z.number().finite().min(0).max(1).optional(),
      semente,
    })
    .strict(),
  z
    .object({
      tipo: z.literal('colinas'),
      altura,
      /** Tamanho em metros de uma colina. Padrão: um quarto do lado menor do terreno. */
      escala: z.number().finite().min(1).max(8192).optional(),
      semente,
    })
    .strict(),
  z
    .object({
      tipo: z.literal('vale'),
      /** Altura das encostas acima do fundo do vale, que fica em zero. */
      altura,
      /** Largura em metros do fundo plano. Padrão: um sexto do terreno. */
      largura: z.number().finite().min(1).max(8192).optional(),
      /** Eixo ao longo do qual o vale corre. Padrão `z`. */
      eixo: z.enum(['x', 'z']).optional(),
      semente,
    })
    .strict(),
])
export type ReceitaDeTerreno = z.infer<typeof ReceitaDeTerrenoSchema>

/** Regrava o campo inteiro pela receita e devolve a região total. */
export function aplicarReceitaDeTerreno(campo: CampoDeAlturas, entrada: unknown): RegiaoDoCampo {
  const r = ReceitaDeTerrenoSchema.parse(entrada)
  const largura = campo.colunas + 1,
    ladoX = campo.colunas * campo.passo,
    ladoZ = campo.linhas * campo.passo,
    cx = campo.origem.x + ladoX / 2,
    cz = campo.origem.z + ladoZ / 2,
    menor = Math.min(ladoX, ladoZ)
  const alturaEm = (x: number, z: number): number => {
    if (r.tipo === 'plano') return r.altura
    if (r.tipo === 'colinas') {
      const escala = r.escala ?? menor / 4
      return r.altura * (0.5 + 0.5 * ruidoFractal(x, z, { escala, oitavas: 4, semente: r.semente }))
    }
    if (r.tipo === 'ilha') {
      const fundo = r.fundo ?? r.altura / 3,
        irregular = r.irregularidade ?? 0.5,
        dx = (x - cx) / (ladoX / 2),
        dz = (z - cz) / (ladoZ / 2),
        costa = ruidoFractal(x, z, { escala: menor / 3, oitavas: 3, semente: r.semente }),
        // 0 no centro, 1 na borda do terreno; a costa ondula sem nunca encostar na borda.
        raio = Math.sqrt(dx * dx + dz * dz) * (1 + 0.3 * irregular * costa),
        perfil = suave(1 - raio / 0.9),
        encosta = ruidoFractal(x, z, { escala: menor / 8, oitavas: 4, semente: r.semente + 7 })
      return -fundo + (r.altura + fundo) * perfil * (1 + 0.25 * irregular * encosta * (1 - perfil))
    }
    const larguraDoFundo = r.largura ?? (r.eixo === 'x' ? ladoZ : ladoX) / 6,
      meio = r.eixo === 'x' ? cz : cx,
      lado = (r.eixo === 'x' ? ladoZ : ladoX) / 2,
      // O leito serpenteia de leve; o desvio some junto com a semente.
      desvio =
        ruidoFractal(r.eixo === 'x' ? x : z, 0, {
          escala: menor / 2,
          oitavas: 2,
          semente: r.semente,
        }) * larguraDoFundo,
      d = Math.abs((r.eixo === 'x' ? z : x) - meio - desvio) - larguraDoFundo / 2,
      subida = suave(d / Math.max(campo.passo, lado - larguraDoFundo / 2)),
      rugas = ruidoFractal(x, z, { escala: menor / 6, oitavas: 4, semente: r.semente + 3 })
    return r.altura * subida * (1 + 0.2 * rugas)
  }
  for (let iz = 0; iz <= campo.linhas; iz++)
    for (let ix = 0; ix <= campo.colunas; ix++)
      campo.alturas[iz * largura + ix] = Math.min(
        campo.max,
        Math.max(
          campo.min,
          alturaEm(campo.origem.x + ix * campo.passo, campo.origem.z + iz * campo.passo),
        ),
      )
  return { x0: 0, z0: 0, x1: campo.colunas, z1: campo.linhas }
}
