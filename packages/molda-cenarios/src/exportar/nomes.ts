/** Nome de download, sem caminhos, controles ou nomes reservados do sistema. */
export function nomeDoArquivoExportado(nome: string, revisao: number, destino: 'three' | 'glb') {
  const base =
    nome
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'cenario'
  return `cenario-${base}-r${revisao}.${destino === 'three' ? 'zip' : 'glb'}`
}
