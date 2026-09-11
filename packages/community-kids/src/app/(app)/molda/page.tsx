import { isPrivilegedRole } from '@sistemazero/member-shell/lib/studio-tier'
import { meetsThreeDCreationLevel } from '@sistemazero/member-shell/server/creative-apps-access'
import { KidsCareerLockedMolda } from '@/components/kids/kids-career-locked-molda'
import { KidsLockedMolda } from '@/components/kids/kids-locked-molda'
import { KidsMoldaUnavailable } from '@/components/kids/kids-molda-unavailable'
import { MoldaClient } from '@/components/kids/molda-client'
import { careerHorizon } from '@/lib/career-horizon'
import {
  moldaPreviewLevel,
  moldaToolAccessFor,
  moldaToolAccessRestricted,
} from '@/lib/molda-tool-access'
import { canOpenPensaStudioTask } from '@/lib/pensa-capabilities'
import { checkMoldaAccessReadonly, getGamificationReadonly, listCatalog } from '@/server/members'
import { getSession } from '@/server/session'

export const dynamic = 'force-dynamic'

/**
 * Quanto a oficina espera o catálogo além das outras buscas. O horizonte só muda o texto de
 * "Ferramentas que vêm por aí", então um catálogo lento não pode segurar a criança na porta:
 * passado o prazo, o aviso sai sem nome de posto.
 */
const CATALOG_WAIT_MS = 1500

async function catalogWithin<T>(catalog: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms)
  })
  try {
    return await Promise.race([catalog, late])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Molda — produto vendável (igual ao Pinta): a oficina 3D onde a criança monta
 * modelos low poly, pinta texturas e cria céus 360° para os jogos 3D do Estúdio.
 * O gate é resolvido no SERVIDOR (sem acesso → o app nem carrega); os DADOS são
 * locais ao navegador (IndexedDB por perfil) — zero backend próprio.
 *
 * São 4 estados: indisponível, sem o produto, produto comprado mas carreira abaixo
 * do Explorador(a) de Mundos, e acesso completo. A mesma ida também resolve o Estúdio
 * (`studioOwned` do adapter: atalho e dica do "Trazer do Molda").
 *
 * ⚠️ O Molda abre no Explorador(a) de Mundos (`THREE_D_CREATION_MIN_LEVEL`, decisão dela
 * 05/09/2026): é o posto que ganha o kit Jogo 3D no Estúdio, o consumidor do que a
 * oficina produz — NÃO no Construtor(a) do Pinta nem no Inventor(a) da IA.
 *
 * Dentro da oficina, as ferramentas de profissional abrem por posto (`moldaToolAccessFor`):
 * a mesma ida resolve o `toolAccess` do adapter. `?nivel=explorer` mostra à EQUIPE a
 * oficina daquele posto (a conta dela resolve tudo liberado).
 */
export default async function MoldaPage({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string | string[] }>
}) {
  // `session.id` = o PERFIL ativo (kids) → a galeria do Molda usa o MESMO
  // namespace do IndexedDB do /estudio e do /pinta. Sessão e parâmetros são locais.
  const [session, { nivel }] = await Promise.all([getSession(), searchParams])
  const preview = moldaPreviewLevel(nivel, session?.role)
  // O horizonte do catálogo: a oficina não promete posto que o mapa ainda esconde. Só serve
  // para quem terá ferramenta trancada, então a equipe (fora da prévia) nem pergunta, e a busca
  // corre junto com as outras sem segurar a página: ver `catalogWithin`.
  const catalog =
    isPrivilegedRole(session?.role) && !preview ? null : listCatalog().catch(() => null)
  const [res, gam] = await Promise.all([
    checkMoldaAccessReadonly(),
    getGamificationReadonly().catch(() => null),
  ])
  if (res.status !== 200) return <KidsMoldaUnavailable />
  const hasAccess = res.body?.access?.molda === true
  if (!hasAccess) return <KidsLockedMolda />
  if (gam?.status !== 200) return <KidsMoldaUnavailable />
  if (!meetsThreeDCreationLevel(gam.body?.level?.slug, session?.role)) {
    return <KidsCareerLockedMolda />
  }
  const studioAvailable = canOpenPensaStudioTask({
    studioProductOwned: res.body?.access?.['estudio-completo'] === true,
    levelSlug: gam.body?.level?.slug,
    role: session?.role,
  })
  const levelSlug = preview ?? gam.body?.level?.slug
  const role = preview ? undefined : session?.role
  const restricted = moldaToolAccessRestricted({ levelSlug, role })
  const catalogRes = restricted && catalog ? await catalogWithin(catalog, CATALOG_WAIT_MS) : null
  // Catálogo desconhecido (falhou ou demorou) não promete posto nenhum: `null` vira a frase do
  // mapa em todas as faixas trancadas.
  const courses = catalogRes?.status === 200 ? (catalogRes.body?.courses ?? []) : null
  const toolAccess = moldaToolAccessFor({
    levelSlug,
    role,
    horizon: courses ? careerHorizon(courses) : null,
  })
  return (
    <MoldaClient
      key={session?.id ?? 'local'}
      viewerId={session?.id ?? null}
      studioAvailable={studioAvailable}
      toolAccess={toolAccess ?? null}
    />
  )
}
