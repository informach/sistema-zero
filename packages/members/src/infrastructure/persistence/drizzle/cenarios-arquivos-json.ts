import { type SQL, sql } from 'drizzle-orm'

// Caminhos estruturais conhecidos. Propriedades de usuário nunca fixam arquivos por acaso.
const camposDosObjetos = ['modelos[*].digest', 'texturas[*].digest'] as const
const camposDosConjuntos = camposDosObjetos.map((c) => `definicoesConjuntos[*].conteudo.${c}`)
const camposDoDocumento = [...camposDosObjetos, ...camposDosConjuntos, 'base.pecas[*].digest']
const camposDosComandos = [
  'modelo.digest',
  'textura.digest',
  'base.pecas[*].digest',
  ...camposDosObjetos.map((c) => `fragmento.${c}`),
  ...camposDosConjuntos.map((c) => `fragmento.${c}`),
  ...camposDosObjetos.map((c) => `definicao.conteudo.${c}`),
  ...camposDoDocumento.map((c) => `documento.${c}`),
]
const extrair = (valor: SQL, caminhos: readonly string[]) =>
  sql.join(
    caminhos.map((caminho) => sql`jsonb_path_query_array(${valor}, ${caminho}::jsonpath)`),
    sql` || `,
  )

export const digestsDoDocumentoJson = (documento: SQL): SQL =>
  extrair(
    documento,
    camposDoDocumento.map((c) => `$.${c}`),
  )
export const digestsDosComandosJson = (comandos: SQL): SQL =>
  extrair(
    comandos,
    camposDosComandos.map((c) => `$[*].${c}`),
  )
export const arrayDeDigestsSql = (json: SQL): SQL<string[]> =>
  sql<string[]>`array(select jsonb_array_elements_text(${json}))`
