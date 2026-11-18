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

/**
 * A maior versão que este código sabe LER. Itens acima disso ficam intocados na nuvem: a galeria
 * não baixa, não copia e não sobe por cima, e pede para atualizar a página.
 */
export const PINTA_MAX_READ_FORMAT_VERSION = 4

/**
 * A versão que mapas, conjuntos de peças e conjuntos DECLARAM ao subir.
 *
 * Histórico da entrega anterior (formato de nuvem 3, 18/11/2026):
 *
 * A regra do projeto é "a escrita fica um passo atrás da leitura": primeiro se publica um código
 * que LÊ a versão N, e só num deploy seguinte um código que GRAVA N. Assim, se o segundo deploy
 * for desfeito, o código que volta ainda lê tudo o que foi gravado.
 *
 * A entrega anterior NÃO cumpriu a regra: leitura 3 e escrita 3 saíram no MESMO deploy. Foi escolhido de
 * propósito, e os números não devem ser "consertados" sem ler o resto:
 *
 * - Produção (`main`) não tem trava nenhuma: não manda `formatVersion` e não confere a versão ao
 *   ler. Não existe em produção um código que leia 3 e grave menos, então não havia como publicar
 *   a leitura antes sem fazer um deploy só para isso.
 * - O cliente intermediário (só camadas), que já rodou em homologação, lê até 2 e declara 2. A
 *   cena completa precisa declarar MAIS que 2 para o servidor recusar aquele cliente
 *   (`CREATION_CLIENT_OUTDATED`): ele abriria um mapa com formas, terrenos ou conjuntos, cortaria
 *   o que não conhece e subiria o resto por cima.
 * - Homologação já tem itens gravados com 3. Baixar o número deixaria esses itens ilegíveis para
 *   o próprio código atual.
 *
 * O QUE ACONTECE NUM ROLLBACK para um código que lê menos que 3 (ou que não tem trava):
 *
 * - Todo item que ESTE código tocou fica com versão 3 no servidor, e o servidor nunca rebaixa.
 * - O código antigo COM trava (lê até 2) não baixa esses itens e toda subida deles leva 409 para
 *   sempre, até a página voltar a ter um código que leia 3. A criança vê o aviso de atualizar a
 *   página e continua editando a cópia local, que não sobe.
 * - O código antigo SEM trava (o de produção hoje) baixa o item, lê pelo sanitizador dele e
 *   descarta o que não conhece NA CÓPIA LOCAL. A subida dessa cópia cortada é recusada com 409,
 *   porque ela não declara versão (conta como 1). Isso depende de o SERVIDOR manter a recusa por
 *   `format_version` (migração 0075, que produção já tem); um rollback que tirasse a recusa do
 *   servidor deixaria a cópia cortada subir.
 * - Nos dois casos nada se perde NA NUVEM: o item fica inteiro na conta. As edições feitas
 *   durante o rollback ficam só no aparelho. Quando o código novo volta, a cópia local cortada
 *   não sobe por cima (`PintaFormatMemory` em `pinta-cloud-persistence.ts`).
 *
 * COMO SUBIR A VERSÃO DAQUI EM DIANTE (para o 4 e seguintes):
 *
 * 1. Deploy A: suba só `PINTA_MAX_READ_FORMAT_VERSION` para N, com o leitor de N pronto e
 *    testado. A escrita continua em N - 1. Publique e espere as abas antigas saírem de circulação
 *    (a galeria avisa e pede atualização).
 * 2. Deploy B: suba `PINTA_MAP_WRITE_FORMAT_VERSION` para N.
 * 3. Rollback de B volta para A, que lê N: nenhum item fica preso.
 *
 * O teste ao lado trava "leitura >= escrita" e os dois números de hoje, para que uma mudança
 * aqui seja sempre uma decisão e nunca um acidente.
 *
 * Esta revisão declara nuvem 4 para proteger documentos nativos/envelopes 5 (offsets fracionários).
 * O baseline completo lia e declarava nuvem 3, aceitava schema 4 e arredondava esses offsets sem
 * perder o carimbo. A memória 4→4 não percebia o corte. Com nuvem 4 ele não baixa nem sobrescreve
 * o item, inclusive durante uma reserva pendente: o backend recusa sua declaração 3.
 *
 * Nuvem 4 e documento 5 são eixos diferentes. Documentos ricos com coordenadas inteiras continuam
 * schema/envelope 4 e mapas só com camadas continuam 3. A declaração à nuvem continua por TIPO,
 * pois apagar a última fração não pode rebaixar um item já protegido na conta.
 * A publicação deve seguir o procedimento leitor antes do gravador acima; este código não faz
 * deploy. Um rollback para um cliente de nuvem 3 conserva os itens 4 na conta, mas o cliente antigo
 * fica bloqueado até ser atualizado. Nunca rebaixe os números para permitir que ele grave.
 */
export const PINTA_MAP_WRITE_FORMAT_VERSION = 4

/** Tipos de desenho cujo formato evolui com o editor de cenários. */
const VERSIONED_KINDS: ReadonlySet<string> = new Set([
  'tilemap',
  'tileset',
  'vector-tileset',
  'map-set',
])

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
