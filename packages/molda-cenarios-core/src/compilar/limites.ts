/** Tetos de trabalho antes de ler/copiar buffers e tetos finais por destino. */
export const LIMITES_DA_EXPORTACAO = {
  arquivos: 8192,
  bytesDoPacote: 256 * 1024 * 1024,
  malha: {
    verticesPorParte: 65_000,
    indicesPorParte: 390_000,
    verticesDaFonte: 8_000_000,
    bytesDaFonte: 128 * 1024 * 1024,
    bytesDaSaida: 128 * 1024 * 1024,
    partes: 8192,
    atributos: 16,
  },
  studio: { malhas: 48, bytesPorModelo: 5 * 1024 * 1024, bytesDoProjeto: 24 * 1024 * 1024 },
  /** Numa cena com regiões, cada janela (região, vizinhas e o que é de todas) cabe nisto. */
  janela: { malhas: 48, bytesDecodificados: 128 * 1024 * 1024 },
} as const
