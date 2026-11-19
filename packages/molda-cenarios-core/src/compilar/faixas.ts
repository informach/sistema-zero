import type { CenaCompilada } from './schema'

/** Índice de picking de um nó já conferido. Não depende de glTF, Three ou do editor. */
export function criarConsultaDeEntidadesDoNo(no: CenaCompilada['nos'][number]) {
  const temFaixas = Boolean(no.faixas),
    entidade = no.entidade
  const porMalha = new Map<string, NonNullable<typeof no.faixas>>()
  for (const f of no.faixas ?? []) {
    const fs = porMalha.get(f.malha) ?? []
    fs.push({ ...f })
    porMalha.set(f.malha, fs)
  }
  for (const fs of porMalha.values()) fs.sort((a, b) => a.primeiroTriangulo - b.primeiroTriangulo)
  return (malha: string, triangulo: number): string | null => {
    if (!Number.isSafeInteger(triangulo) || triangulo < 0) return null
    if (!temFaixas) return entidade
    const fs = porMalha.get(malha)
    if (!fs) return null
    let de = 0,
      ate = fs.length - 1
    while (de <= ate) {
      const meio = Math.floor((de + ate) / 2),
        f = fs[meio]!
      if (triangulo < f.primeiroTriangulo) ate = meio - 1
      else if (triangulo >= f.primeiroTriangulo + f.triangulos) de = meio + 1
      else return f.entidade
    }
    return null
  }
}
