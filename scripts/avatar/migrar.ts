/**
 * Migra peças do avatar da arte para a plataforma: prepara o arquivo, envia ao bucket e registra a
 * peça no catálogo (`packages/core/src/avatar/catalog.generated.ts`).
 *
 *   bun run avatar:migrar --tudo --destino r2             (tudo o que é novo ou mudou)
 *   bun run avatar:migrar <id> <id> --destino r2          (só essas peças)
 *   bun run avatar:migrar --tudo --destino pasta:<pasta>  (ensaio: grava numa pasta, não no bucket)
 *   bun run avatar:migrar --so-esqueleto --destino r2      (só o esqueleto e as animações do jogo;
 *                                                          peças, conjuntos e regras ficam como estão)
 *   … --ref <ref>   outra referência do git da arte      … --sem-buscar   não traz do remoto antes
 *
 * O que fica como estava: preço, marca de menina ou menino e o que mais alguém tenha acertado à mão
 * numa peça que já estava no catálogo. A proposta automática vale só na primeira entrada, marcada
 * como `review`. Peça que saiu da arte não é apagada: fica `retired`.
 *
 * Depois de rodar, o catálogo mudado é um commit de dados como outro qualquer.
 */
import type { AvatarCatalog, AvatarPartEntry } from '../../packages/core/src/avatar/types'
import { Arte, buscarDaArte, type ItemDaArte, REF_PADRAO } from './arte'
import { type Balde, chaveNoBucket, comBalde } from './balde'
import {
  CLIPES_DO_CONFIGURADOR,
  CLIPES_DO_JOGO,
  comparar,
  encaixesDaArte,
  esqueletoMudou,
  gravarCatalogo,
  lerCatalogo,
  REPOSITORIO_DA_ARTE,
  regrasDoCatalogo,
} from './catalogo'
import { digital, medirClipes, prepararEsqueleto, prepararPeca } from './glb'
import { precoDoConjunto, proporPeca } from './proposta'

/** Cada envio é um processo do wrangler (uns 4 s): oito de cada vez. */
const EM_PARALELO = 8

/**
 * Os arquivos que já estão no bucket. O nome leva a impressão digital do conteúdo, então o que o
 * catálogo cita já foi enviado e não muda: não precisa ir de novo. Também não repete o que já foi
 * nesta mesma rodada (a textura, que é a mesma em quase todas as peças).
 */
function arquivosJaEnviados(catalogo: AvatarCatalog): Set<string> {
  const ja = new Set<string>(Object.values(catalogo.base.textures))
  if (catalogo.base.skeleton.file) ja.add(catalogo.base.skeleton.file)
  if (catalogo.base.skeleton.game?.file) ja.add(catalogo.base.skeleton.game.file)
  for (const p of Object.values(catalogo.parts)) {
    ja.add(p.file)
    ja.add(p.thumb)
  }
  return ja
}

function criarEnvio(balde: Balde, ja: Set<string>) {
  const emCurso = new Map<string, Promise<void>>()
  return async (arquivo: string, bytes: Uint8Array): Promise<boolean> => {
    if (ja.has(arquivo)) return false
    const andando = emCurso.get(arquivo)
    if (andando) {
      await andando
      return false
    }
    const envio = balde.gravar(chaveNoBucket(arquivo), bytes)
    emCurso.set(arquivo, envio)
    await envio
    ja.add(arquivo)
    return true
  }
}

async function emLotes<T>(itens: readonly T[], fazer: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0
  await Promise.all(
    Array.from({ length: Math.min(EM_PARALELO, itens.length) }, async () => {
      while (proximo < itens.length) {
        const item = itens[proximo++]
        if (item !== undefined) await fazer(item)
      }
    }),
  )
}

function argumentos(args: readonly string[]) {
  const ids: string[] = []
  let destino = ''
  let ref = REF_PADRAO
  let tudo = false
  let soEsqueleto = false
  let buscar = true
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? ''
    if (a === '--tudo') tudo = true
    else if (a === '--so-esqueleto') soEsqueleto = true
    else if (a === '--sem-buscar') buscar = false
    else if (a === '--destino') destino = args[++i] ?? ''
    else if (a === '--ref') ref = args[++i] ?? ''
    else if (a.startsWith('--')) throw new Error(`Opção desconhecida: ${a}`)
    else ids.push(a)
  }
  if (!destino) throw new Error('Falta --destino r2 (ou pasta:<caminho> para ensaiar).')
  if (soEsqueleto && (tudo || ids.length > 0))
    throw new Error('--so-esqueleto não vai junto com --tudo nem com ids de peças.')
  if (!soEsqueleto && tudo === ids.length > 0)
    throw new Error('Diga --tudo ou os ids das peças, não os dois.')
  return { ids, destino, ref, tudo, soEsqueleto, buscar }
}

export async function migrar(args: readonly string[], hoje = new Date()) {
  const { ids, destino, ref, tudo, soEsqueleto, buscar } = argumentos(args)
  if (buscar) buscarDaArte()
  const arte = new Arte(ref)
  const catalogo: AvatarCatalog = lerCatalogo()
  const regras = arte.regras()
  const comparacao = comparar(arte, catalogo)
  const naArte = new Map(arte.pecas().map((p) => [p.id, p]))
  // O dia de São Paulo, não o do UTC (à noite o UTC já virou).
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(hoje)

  let escolhidas: ItemDaArte[]
  if (soEsqueleto) escolhidas = []
  else if (tudo) escolhidas = [...comparacao.novas, ...comparacao.mudaram]
  else {
    escolhidas = ids.map((id) => {
      const item = naArte.get(id)
      if (!item) throw new Error(`A arte não tem a peça ${id} em ${ref}.`)
      return item
    })
  }

  const substituidas = new Set(Object.keys(regras.substituicoes?.pares ?? {}))
  const conjuntoDaParte = new Map<string, string>()
  for (const fantasia of regras.fantasias)
    for (const { peca } of fantasia.pecas) conjuntoDaParte.set(peca, fantasia.id)

  let enviados = 0
  // No ensaio numa pasta, tudo é gravado de novo: a pasta começa vazia.
  const ja = destino === 'r2' ? arquivosJaEnviados(catalogo) : new Set<string>()
  await comBalde(destino, async (balde) => {
    const enviar = criarEnvio(balde, ja)
    // 1. O esqueleto: o da plataforma (clipes do configurador), o do jogo (as animações de
    //    locomoção) e o contrato do personagem (ossos em repouso, encaixes, medidas dos clipes).
    const esqueleto = arte.esqueleto()
    const caminhoDoEsqueleto = `esqueleto/${esqueleto.arquivo}`
    if (esqueletoMudou(arte, catalogo, esqueleto.arquivo)) {
      const origem = arte.ler(caminhoDoEsqueleto)
      const pronto = await prepararEsqueleto(origem, CLIPES_DO_CONFIGURADOR)
      const arquivo = `base/esqueleto.${digital(pronto.glb)}.glb`
      if (await enviar(arquivo, pronto.glb)) enviados += 1
      const doJogo = await prepararEsqueleto(origem, CLIPES_DO_JOGO)
      const arquivoDoJogo = `base/animacoes-do-jogo.${digital(doJogo.glb)}.glb`
      if (await enviar(arquivoDoJogo, doJogo.glb)) enviados += 1
      const medidas = await medirClipes(origem, CLIPES_DO_JOGO)
      const daArte = new Map(esqueleto.animacoes.map((a) => [a.id, a]))
      // A altura: a medida da arte (desde o `jogo1`) ou a caixa do corpo padrão do pack (o topo da
      // cabeça; o osso Head fica na base dela).
      const corpoPadrao = naArte.get(regras.padrao.pecas.corpo ?? '')
      const altura = esqueleto.medidas_corpo?.altura_m ?? corpoPadrao?.caixa?.max[1]
      if (!altura) throw new Error('A arte não tem a altura do corpo padrão.')
      catalogo.base.skeleton = {
        file: arquivo,
        blob: arte.blob(caminhoDoEsqueleto),
        clips: pronto.clipes,
        catalogBlob: arte.blob('esqueleto/catalogo.json'),
        bones: Object.fromEntries(
          esqueleto.lista_ossos.map((o) => [o.nome, { parent: o.pai, head: o.cabeca }]),
        ),
        sockets: encaixesDaArte(esqueleto),
        height: Math.round(altura * 1000) / 1000,
        game: {
          file: arquivoDoJogo,
          clips: CLIPES_DO_JOGO.map((id) => {
            const a = daArte.get(id)
            if (!a) throw new Error(`O catálogo do esqueleto da arte não tem a animação ${id}.`)
            // A passada e a subida que a arte mediu valem; sem elas, as medidas daqui no `Hips`.
            return {
              id,
              duration: a.duracao_s,
              loop: a.laco,
              stride: a.passada_m ?? medidas[id]?.passada ?? 0,
              rise: a.subida_m ?? medidas[id]?.subida ?? 0,
              frames: a.quadros ?? 0,
              feet: (a.pes ?? []).map((p) => ({
                foot: p.pe === 'esq' ? ('left' as const) : ('right' as const),
                on: p.toca,
                off: p.sai,
              })),
            }
          }),
        },
      }
      console.log(`esqueleto: ${arquivo} (${Math.round(pronto.glb.byteLength / 1024)} KB)`)
      console.log(
        `animações do jogo: ${arquivoDoJogo} (${Math.round(doJogo.glb.byteLength / 1024)} KB)`,
      )
    }

    // 2. As peças.
    await emLotes(escolhidas, async (item) => {
      const caminhoDoGlb = `${item.pasta}/${item.arquivo}`
      const caminhoDaMiniatura = `${item.pasta}/${item.miniatura}`
      const pronta = await prepararPeca(arte.ler(caminhoDoGlb))
      const miniatura = arte.ler(caminhoDaMiniatura)
      const arquivo = `pecas/${item.id}.${digital(pronta.glb)}.glb`
      const thumb = `miniaturas/${item.id}.${digital(miniatura)}.webp`
      for (const textura of pronta.texturas) {
        const nome = `base/textura.${textura.digital}.${textura.extensao}`
        if (await enviar(nome, textura.bytes)) enviados += 1
        catalogo.base.textures[textura.digital] = nome
      }
      if (await enviar(arquivo, pronta.glb)) enviados += 1
      if (await enviar(thumb, miniatura)) enviados += 1

      const antes = catalogo.parts[item.id]
      const editorial = antes
        ? {
            audience: antes.audience,
            tier: antes.tier,
            price: antes.price,
            ...(antes.band ? { band: antes.band } : {}),
            ...(antes.review ? { review: true as const } : {}),
          }
        : { ...proporPeca(item), review: true as const }
      const conjunto = conjuntoDaParte.get(item.id)
      const entrada: AvatarPartEntry = {
        slot: item.slot,
        // O rascunho do pack não tem grupo (fica escondido): vale o encaixe.
        group: item.grupo ?? item.slot,
        label: item.rotulo,
        ...editorial,
        file: arquivo,
        thumb,
        tris: item.tris,
        ...(item.cor_amostra ? { swatch: item.cor_amostra } : {}),
        ...(item.orelhas ? { ears: item.orelhas } : {}),
        ...(item.conjunto && item.expressao
          ? { face: { set: item.conjunto, expression: item.expressao } }
          : {}),
        ...(conjunto ? { set: conjunto } : {}),
        ...(item.festa ? { festa: item.festa } : {}),
        ...(item.rascunho || substituidas.has(item.id) ? { hidden: true as const } : {}),
        origin: {
          blob: arte.blob(caminhoDoGlb),
          thumbBlob: arte.blob(caminhoDaMiniatura),
          commit: arte.commit,
          migratedAt: dia,
        },
      }
      catalogo.parts[item.id] = entrada
      console.log(`${antes ? 'atualizada' : 'nova'}: ${item.id}`)
    })
  })

  if (soEsqueleto) {
    gravarCatalogo(catalogo)
    console.log(`
Só o esqueleto: ${enviados} arquivos enviados.`)
    return { migradas: 0, enviados, total: Object.keys(catalogo.parts).length }
  }

  // 3. Quem saiu da arte fica, aposentada. Quem voltou deixa de estar.
  for (const [id, entrada] of Object.entries(catalogo.parts)) {
    if (!naArte.has(id) && !entrada.retired) {
      catalogo.parts[id] = { ...entrada, retired: true }
      console.log(`aposentada: ${id}`)
    } else if (naArte.has(id) && entrada.retired) {
      const { retired: _fora, ...resto } = entrada
      catalogo.parts[id] = resto
    }
  }

  // 4. Os conjuntos de fantasia e as regras, sempre da versão lida.
  for (const fantasia of regras.fantasias) {
    const antes = catalogo.sets[fantasia.id]
    catalogo.sets[fantasia.id] = {
      label: fantasia.rotulo,
      parts: fantasia.pecas.map(({ slot, peca }) => ({ slot, part: peca })),
      tier: antes?.tier ?? 'coins',
      price: antes?.price ?? precoDoConjunto(fantasia.pecas.length),
      ...(antes ? (antes.review ? { review: true as const } : {}) : { review: true as const }),
    }
  }
  catalogo.rules = regrasDoCatalogo(regras)
  catalogo.source = {
    repo: REPOSITORIO_DA_ARTE,
    ref,
    commit: arte.commit,
    syncedAt: dia,
    rulesBlob: arte.blob('regras.json'),
  }
  gravarCatalogo(catalogo)

  const total = Object.keys(catalogo.parts).length
  console.log(
    `\n${escolhidas.length} peças migradas, ${enviados} arquivos enviados, ${total} no catálogo.`,
  )
  return { migradas: escolhidas.length, enviados, total }
}

if (import.meta.main) await migrar(process.argv.slice(2))
