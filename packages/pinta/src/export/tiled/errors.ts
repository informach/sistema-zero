/**
 * Erro com frase pronta para a criança. Só estas mensagens chegam à tela; qualquer outro erro
 * (um bug, um JSON quebrado) vira uma frase geral em quem chama. Mora num arquivo pequeno para a
 * galeria poder reconhecê-lo sem carregar o importador inteiro.
 */
export class TiledImportError extends Error {
  override name = 'TiledImportError'
}
