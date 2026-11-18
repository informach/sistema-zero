import { aneisSeCruzam, pontoNoPoligono } from '../poligonos'
import { poligonoSimples } from '../validacao'
import type { AguaDeCenario } from './documento'

/** A prévia e o documento aceitam os mesmos anéis antes de gerar qualquer malha. */
export function errosDaTopologiaDaAgua(a: AguaDeCenario): string[] {
  if (a.tipo !== 'lago' && a.tipo !== 'represa') return []
  const erros: string[] = []
  if (!poligonoSimples(a.contorno) || !poligonoSimples(a.recorte))
    erros.push(`Contorno de água inválido: ${a.id}`)
  const ilhas = a.ilhas ?? []
  for (let i = 0; i < ilhas.length; i++) {
    const ilha = ilhas[i]!
    if (
      !poligonoSimples(ilha) ||
      !pontoNoPoligono(ilha[0]!, a.contorno) ||
      aneisSeCruzam(ilha, a.contorno)
    ) {
      erros.push(`Ilha fora da margem ou inválida: ${a.id}`)
      break
    }
    if (
      ilhas
        .slice(0, i)
        .some(
          (outra) =>
            aneisSeCruzam(ilha, outra) ||
            pontoNoPoligono(ilha[0]!, outra) ||
            pontoNoPoligono(outra[0]!, ilha),
        )
    ) {
      erros.push(`Ilhas de água sobrepostas: ${a.id}`)
      break
    }
  }
  return erros
}
