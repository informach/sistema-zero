/**
 * Versão de formato das criações do Pinta na nuvem (`creations.format_version`).
 *
 * O servidor nunca rebaixa a versão de um item e recusa quem declara menos do que o item já tem
 * (`CREATION_CLIENT_OUTDATED`). É o que impede um navegador com o Pinta antigo de baixar um mapa
 * novo, descartar o que não conhece e subir a versão cortada por cima.
 *
 * São três eixos, e este arquivo trata só do primeiro:
 * 1. a versão declarada à nuvem, POR TIPO de desenho (aqui);
 * 2. a versão do envelope `.pinta.json`, que só sobe quando o desenho precisa;
 * 3. o carimbo `schema` do próprio registro.
 *
 * A versão declarada é função do TIPO, nunca do conteúdo: se dependesse do conteúdo, apagar a
 * única camada nova de um mapa faria o próprio cliente atual declarar menos e ser recusado.
 */

/** A maior versão que este código sabe LER. Itens acima disso ficam intocados na nuvem. */
export const PINTA_MAX_READ_FORMAT_VERSION = 2

/**
 * A versão que mapas e conjuntos de peças DECLARAM ao subir.
 *
 * ⚠️⚠️ Este número só pode valer 2 em produção DEPOIS de o leitor (a trava de
 * `pinta-cloud-persistence.ts`, entregue num PR próprio) estar em produção. O servidor nunca
 * rebaixa a versão de um item: se o leitor e este gravador fossem ao ar juntos e houvesse
 * rollback, todo mapa ficaria recusado com 409.
 *
 * Com 2, o servidor recusa a subida de qualquer navegador que não declara versão (todo Pinta
 * anterior à trava). É o que impede o cliente antigo de regravar por cima de um mapa do formato
 * novo: ele não consegue LER o arquivo (o envelope é da versão 3) e, sem isto, subiria a cópia
 * velha que tem no aparelho.
 */
export const PINTA_MAP_WRITE_FORMAT_VERSION = 2

/** Tipos de desenho cujo formato evolui com o editor de cenários. */
const VERSIONED_KINDS: ReadonlySet<string> = new Set(['tilemap', 'tileset', 'vector-tileset'])

export function isPintaVersionedKind(kind: string): boolean {
  return VERSIONED_KINDS.has(kind)
}

/** A versão que um desenho deste tipo declara ao subir. */
export function pintaWriteFormatVersion(kind: string): number {
  return isPintaVersionedKind(kind) ? PINTA_MAP_WRITE_FORMAT_VERSION : 1
}

/** Este código consegue ler um item que a nuvem lista com esta versão? Ausente = 1. */
export function pintaCanReadFormatVersion(version: number | undefined | null): boolean {
  return (version ?? 1) <= PINTA_MAX_READ_FORMAT_VERSION
}
