/**
 * A proposta automática de cada peça nova: para quem aparece (menina, menino ou os dois) e quanto
 * custa. É a régua de `docs/plans/2026-11-13-avatar-novo-precos.md`.
 *
 * Vale só para a PRIMEIRA vez que a peça entra no catálogo, que a marca como `review`. Depois, o
 * que estiver escrito no catálogo manda: quem corrige um preço ou uma marca à mão não perde a
 * correção na migração seguinte.
 */
import type {
  AvatarAudience,
  AvatarPriceBand,
  AvatarTier,
} from '../../packages/core/src/avatar/types'
import type { ItemDaArte } from './arte'

export interface Proposta {
  audience: AvatarAudience
  tier: AvatarTier
  price: number
  band?: AvatarPriceBand
}

/** O nome curto, sem o prefixo da categoria nem o `_pacote`, é o que as regras leem. */
const PREFIXO = /^(cabelo|roupa_cima|roupa_inteira|calcado|oculos|chapeu|calca|costas)_/
export function nomeCurto(id: string): string {
  return id.replace(/_pacote$/, '').replace(PREFIXO, '')
}

/** O básico de cada categoria, para montar um avatar completo sem moeda nenhuma. */
const GRATIS: Record<string, readonly string[]> = {
  cabelos: [
    'curto_castanho',
    'curto_escuro_1',
    'curto_loiro_1',
    'ondulado_escuro',
    'chanel_castanho',
    'ondulado_castanho',
    'cacheado_curto',
    'solto_sob_chapeu',
  ],
  chapeus: ['bone_branco_bolinhas', 'gorro_cinza', 'palha_claro'],
  oculos: ['redondos_cinza', 'azuis'],
  acessorios_rosto: ['bigode_01', 'brincos_argola'],
  roupas_cima: [
    'camiseta_branca',
    'camiseta_vermelha',
    'camiseta_rosa',
    'camiseta_roxa',
    'regata_branca',
    'camisa_azul_clara',
  ],
  roupas_inteiras: ['jardineira_azul', 'vestido_azul'],
  calcas: ['azul_clara', 'marrom', 'vermelha'],
  bermudas: ['bermuda_branca'],
  meias: ['meias_curtas'],
  sapatos: ['tenis_branco', 'tenis_preto', 'chinelo_amarelo'],
  luvas: ['luvas_cinza'],
}

type Regra = readonly [RegExp, AvatarPriceBand, number]

/** Por categoria, a primeira regra que casa com o nome curto vale. */
const FAIXAS: Record<string, readonly Regra[]> = {
  cabelos: [
    [/arco_iris|cacheado_rosa|orelhinhas|peruca/, 'raro', 120],
    [
      /cachos_longos|coque_alto|coque_faixa|coque_crespo|maria_chiquinha|trancas_nago|dreadlocks|topete|cacheado_grisalho|black_power/,
      'especial',
      90,
    ],
    [/./, 'comum', 60],
  ],
  chapeus: [
    [
      /capuz_|abobora|saco_papel|escafandro|mascara_gas|televisao|caixa_brinquedo|boia_|galinha_assada|sapo|caranguejo|caracol|peixe_lanterna|dinossauro|cogumelo|desentupidor|bobo|gelatina|cerveja/,
      'raro',
      150,
    ],
    [
      /capacete_|cartola|coroa|capelo|sombreiro|elmo|tiara_|cone_transito|guarda_chuva|helice|orelhas_gato|cauboi/,
      'especial',
      100,
    ],
    [/./, 'comum', 70],
  ],
  oculos: [
    [/pixelados|persiana|lupa|tapa_olho|viseira/, 'raro', 120],
    [/aviador|gatinho|coracao|esqui|3d/, 'especial', 90],
    [/./, 'comum', 60],
  ],
  acessorios_rosto: [
    [/fones|mascara|nariz_palhaco|chupeta|dentes_vampiro/, 'especial', 90],
    [/barba/, 'especial', 70],
    [/./, 'comum', 50],
  ],
  roupas_cima: [
    [/couro_tachas|universitaria|um_ombro|maio|sueter_estrela/, 'raro', 110],
    [/jaqueta|casaco|casaquinho|colete_franjas/, 'especial', 90],
    [/camisa_|colete|moletom|sueter/, 'comum', 70],
    [/./, 'comum', 50],
  ],
  roupas_inteiras: [[/./, 'especial', 110]],
  calcas: [
    [
      /rasgada|joelheiras|remendada|listrada|bolinhas|faixa|cinto|saia_longa|cargo|meias/,
      'especial',
      80,
    ],
    [/./, 'comum', 60],
  ],
  bermudas: [[/./, 'comum', 50]],
  meias: [[/./, 'comum', 40]],
  sapatos: [
    [/bota|pantufa/, 'especial', 90],
    [/tenis|sapato|mocassim/, 'comum', 70],
    [/./, 'comum', 50],
  ],
  luvas: [
    [/listradas|sem_dedos/, 'especial', 70],
    [/./, 'comum', 50],
  ],
  costas: [[/./, 'raro', 120]],
}

/** Categoria que a régua ainda não conhece (a arte criou uma nova): preço do meio, a conferir. */
const FAIXA_PADRAO: Regra = [/./, 'especial', 90]

/** Só o óbvio: rosto e cabelo como o pack marca, barba e bigode, vestido e saia. */
export function publicoDaPeca(item: ItemDaArte): AvatarAudience {
  const nome = nomeCurto(item.id)
  if (item.pasta === 'rostos') return item.genero === 'feminino' ? 'girl' : 'boy'
  if (item.pasta === 'cabelos') {
    if (/arco_iris|dreadlocks|cacheado_curto|crespo|trancas|black_power/.test(nome)) return 'both'
    if (/maria_chiquinha|rabo_cavalo|coque_baixo|solto_sob_chapeu/.test(nome)) return 'girl'
    const original = item.original ?? ''
    return original.includes('Female') ? 'girl' : original.includes('Male') ? 'boy' : 'both'
  }
  if (item.pasta === 'acessorios_rosto' && /bigode|barba/.test(nome)) return 'boy'
  if (/vestido|saia|maio|top_rosa/.test(nome)) return 'girl'
  return 'both'
}

export function proporPeca(item: ItemDaArte): Proposta {
  const audience = publicoDaPeca(item)
  const nome = nomeCurto(item.id)
  // Identidade é de graça: a cor do corpo e o rosto. As orelhas entram sozinhas com o corpo.
  if (item.pasta === 'orelhas') return { audience, tier: 'auto', price: 0 }
  if (item.pasta === 'corpos' || item.pasta === 'rostos')
    return { audience, tier: 'free', price: 0 }
  // Parte de fantasia não se compra sozinha: quem tem preço é o conjunto.
  if (item.pasta === 'fantasias') return { audience, tier: 'set', price: 0 }
  if (item.premio_da_festa) return { audience, tier: 'festa', price: 0 }
  if (GRATIS[item.pasta]?.includes(nome)) return { audience, tier: 'free', price: 0 }
  const [, band, price] =
    (FAIXAS[item.pasta] ?? []).find(([padrao]) => padrao.test(nome)) ?? FAIXA_PADRAO
  return { audience, tier: 'coins', price, band }
}

/** O conjunto de fantasia custa pelo número de partes: 200 com 2, 250 com 3 ou 4, 300 com 5 ou 6. */
export function precoDoConjunto(partes: number): number {
  return partes <= 2 ? 200 : partes <= 4 ? 250 : 300
}
