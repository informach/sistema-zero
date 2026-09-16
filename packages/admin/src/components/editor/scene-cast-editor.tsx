'use client'

import {
  actorFigure,
  castText,
  DEFAULT_CAST,
  SCENE_FIGURE_NAMES,
  SCENE_FIGURES,
  SCENE_ROLES,
  type SceneActivity,
  type SceneActor,
  type SceneCast,
  type SceneFigure,
  type SceneRole,
  sceneModelFor,
  sceneTargets,
  sceneWorld,
} from '@sistemazero/core/learning/scene'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { useId } from 'react'

/**
 * Quem está no palco desta cena.
 *
 * As catorze cenas ensinam conceitos que os três cursos repetem, mas o texto delas só falava de
 * Dino e de cacto — então o Desafio do Primeiro Jogo e O Jogo do Meu Jeito não podiam usar
 * nenhuma. Aqui o professor troca os NOMES; o motor, as metas e a avaliação são os mesmos.
 *
 * ⚠️ O gênero é campo, não detalhe: é ele que faz "Faça o Dino aparecer" virar "Faça a nave
 * aparecer" em vez de "Faça o nave aparecer". A régua do português vive no core (`cast.ts`).
 *
 * ⭐ Desde o Raio-X (lote 3, 16/09/2026) o elenco troca também o DESENHO: cada papel tem uma
 * figura, e "Pelo nome" (sem `figure` no manifesto) deixa o core decidir pelo nome. É o padrão de
 * propósito: os manifestos publicados não têm o campo e já se desenham certo.
 */

/** Como o professor lê cada figura na lista. A ordem é a do core. */
const NOME_DA_FIGURA: Record<SceneFigure, string> = {
  dino: 'Dino',
  cacto: 'Cacto',
  floresta: 'Floresta',
  nave: 'Nave',
  asteroide: 'Asteroide',
  pedra: 'Pedra',
  tiro: 'Tiro',
  chama: 'Chama',
}
/** O valor do `<select>` que quer dizer "sem `figure`: o core decide pelo nome". */
const PELO_NOME = ''
const ehFigura = (valor: string): valor is SceneFigure =>
  (SCENE_FIGURES as readonly string[]).includes(valor)

const PAPEIS: { chave: SceneRole; rotulo: string; ajuda: string }[] = [
  { chave: 'hero', rotulo: 'Personagem', ajuda: 'Quem a criança controla. De fábrica: o Dino.' },
  { chave: 'obstacle', rotulo: 'Obstáculo', ajuda: 'O que atrapalha. De fábrica: o cacto.' },
  {
    chave: 'scenery',
    rotulo: 'Cenário',
    ajuda: 'O que entra na conta das camadas. De fábrica: a floresta.',
  },
]

/** Os papéis como o aviso os escreve. */
const PAPEL_NA_FRASE: Record<SceneRole, { o: string; ao: string; exemplo: string }> = {
  hero: { o: 'o personagem', ao: 'ao personagem', exemplo: 'nave' },
  obstacle: { o: 'o obstáculo', ao: 'ao obstáculo', exemplo: 'asteroide' },
  scenery: { o: 'o cenário', ao: 'ao cenário', exemplo: 'chama' },
}
/** As figuras do Corre Dino, e o que a criança veria de cada uma no céu de estrelas. */
const DA_TERRA: Partial<Record<SceneFigure, string>> = {
  dino: 'o Dino',
  cacto: 'um cacto',
  floresta: 'uma árvore',
}

/** "A, B e C". */
const lista = (itens: string[]) =>
  itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`

/** O nome como fica guardado: sem espaço nas pontas e sem espaço dobrado no meio. */
const aparado = (texto: string) => texto.trim().replace(/\s+/g, ' ')

/**
 * Os avisos de um elenco que leva a cena ao espaço deixando algum papel DESENHADO com a figura
 * da terra (review do lote 3).
 *
 * ⚠️⚠️ `{obstacle: asteroide}` na `spawn` punha o Dino no céu de estrelas, e `{hero: nave}` na
 * `lives` punha um cacto verde lá. O palco não pode resolver sozinho: o TEXTO continua dizendo
 * "cacto" (o `castText` usa o nome de fábrica), e trocar só o desenho para asteroide criaria outra
 * mentira. Quem conserta é o professor, dando um nome ao papel, e ele precisa saber que precisa.
 */
function avisosDoEspaco(activity: SceneActivity): string[] {
  const papeis = SCENE_ROLES[activity.scene]
  if (sceneWorld(activity.cast, activity.scene) !== 'espaco') return []
  const doEspaco = papeis.map((p) => actorFigure(activity.cast, p)).find((f) => !(f in DA_TERRA))
  const quem = doEspaco ? NOME_DA_FIGURA[doEspaco].toLowerCase() : 'uma figura do espaço'
  return papeis.flatMap((papel) => {
    const figura = actorFigure(activity.cast, papel)
    const naTerra = DA_TERRA[figura]
    if (!naTerra) return []
    const { o, ao, exemplo } = PAPEL_NA_FRASE[papel]
    return activity.cast?.[papel]
      ? [
          `Esta cena desenha ${o} como ${NOME_DA_FIGURA[figura]}. Com ${quem} no elenco, escolha outro nome ou desenho (por exemplo, ${exemplo}), senão a criança vê ${naTerra} no espaço.`,
        ]
      : [
          `Esta cena desenha ${o}. Com ${quem} no elenco, dê um nome ${ao} (por exemplo, ${exemplo}), senão a criança vê ${naTerra} no espaço.`,
        ]
  })
}

export function SceneCastEditor({
  activity,
  onChange,
}: {
  activity: SceneActivity
  onChange: (activity: SceneActivity) => void
}) {
  const id = useId()
  const cast = activity.cast ?? {}
  const ativo = Boolean(cast.hero || cast.obstacle || cast.scenery)

  function trocar(
    papel: SceneRole,
    mudanca:
      | (Partial<Omit<SceneActor, 'figure'>> & { figure?: SceneFigure | typeof PELO_NOME })
      | null,
  ) {
    const atual = cast[papel]
    const proximo: SceneCast = { ...cast }
    if (mudanca === null) delete proximo[papel]
    else {
      // ⚠️⚠️ O nome é guardado COMO DIGITADO, e só é aparado ao SAIR do campo (`aparar`). Aparar a
      // cada tecla comia o espaço antes de a próxima letra chegar: digitar "nave espacial" gravava
      // "naveespacial", que não diz figura nenhuma, e o palco desenhava o Dino (review do lote 3).
      // Colar funcionava; digitar, não.
      const nome = mudanca.name ?? atual?.name ?? ''
      const plural = mudanca.plural ?? atual?.plural
      // ⚠️⚠️ A figura ATRAVESSA a troca de nome, de gênero e de plural: sem isso, corrigir uma
      // letra do nome apagava em silêncio a figura escolhida e a nave voltava a ser um Dino.
      const figura = mudanca.figure === undefined ? atual?.figure : mudanca.figure || undefined
      // ⚠️ Nome vazio APAGA o papel em vez de gravar um ator sem nome: o guard do core recusaria
      // a atividade inteira, e o professor levaria "complete os campos" sem saber qual.
      if (!nome.trim()) delete proximo[papel]
      else
        proximo[papel] = {
          name: nome,
          gender: mudanca.gender ?? atual?.gender ?? 'm',
          ...(plural?.trim() ? { plural } : {}),
          ...(figura ? { figure: figura } : {}),
        }
    }
    const limpo = proximo.hero || proximo.obstacle || proximo.scenery ? proximo : undefined
    onChange({ ...activity, cast: limpo })
  }

  /** Ao sair do campo: tira os espaços das pontas (e os dobrados) do nome e do plural. */
  function aparar(papel: SceneRole) {
    const ator = cast[papel]
    if (!ator) return
    const nome = aparado(ator.name)
    const plural = ator.plural === undefined ? undefined : aparado(ator.plural)
    if (nome !== ator.name || plural !== ator.plural)
      trocar(papel, { name: nome, plural: plural ?? '' })
  }

  const vestido = sceneModelFor(activity)
  /** A figura que cada papel teria SEM `figure`: é o que a opção "Pelo nome" promete. */
  const semFigura: SceneCast = Object.fromEntries(
    Object.entries(cast).map(([papel, ator]) => [papel, ator && { ...ator, figure: undefined }]),
  )
  const pelosNomes = {
    hero: actorFigure(semFigura, 'hero'),
    obstacle: actorFigure(semFigura, 'obstacle'),
    scenery: actorFigure(semFigura, 'scenery'),
  }
  // ⚠️ Só os papéis que ESTA cena desenha (review do lote 3): a prévia dizia "Nave, Cacto e
  // Floresta, no espaço" para qualquer cena, inclusive as que não desenham ninguém.
  const papeisDaCena = SCENE_ROLES[activity.scene]
  const mundo = sceneWorld(activity.cast, activity.scene)
  const avisos = ativo ? avisosDoEspaco(activity) : []

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Quem está no palco</p>
      <p className="text-xs text-muted-foreground">
        A cena é a mesma; mudam os nomes que a criança lê e o desenho de cada papel. Deixe em branco
        para manter o elenco do Corre Dino.
      </p>
      {/* ⚠️ A lista de nomes sai do CORE (`SCENE_FIGURE_NAMES`, review do lote 3): escrita à mão
          ela listava seis e esquecia meteoro, rocha, laser, fogo, dinossauro, árvore e mata. */}
      <div className="space-y-1 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <p>
          O elenco troca os nomes e o desenho. Em "Pelo nome", a figura sai do nome escrito; o que o
          nome não disser fica com o desenho do Corre Dino.
        </p>
        <ul className="grid gap-x-4 sm:grid-cols-2">
          {SCENE_FIGURES.map((figura) => (
            <li key={figura}>
              <span className="font-medium text-foreground">{NOME_DA_FIGURA[figura]}</span>:{' '}
              {SCENE_FIGURE_NAMES[figura].join(', ')}
            </li>
          ))}
        </ul>
        <p>
          Nave, asteroide ou tiro no palco levam a cena para o espaço. Pedra e chama também, a menos
          que o elenco tenha um Dino, um cacto ou uma floresta escritos.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PAPEIS.map(({ chave, rotulo, ajuda }) => {
          const ator = cast[chave]
          return (
            <div key={chave} className="space-y-2 rounded-xl border border-border p-3">
              <Field label={rotulo} htmlFor={`${id}-${chave}`} hint={ajuda}>
                <Input
                  id={`${id}-${chave}`}
                  maxLength={24}
                  placeholder={DEFAULT_CAST[chave].name}
                  value={ator?.name ?? ''}
                  onChange={(e) => trocar(chave, { name: e.target.value })}
                  onBlur={() => aparar(chave)}
                />
              </Field>
              <Select
                aria-label={`Gênero de ${rotulo.toLowerCase()}`}
                disabled={!ator}
                value={ator?.gender ?? DEFAULT_CAST[chave].gender}
                onChange={(e) => trocar(chave, { gender: e.target.value === 'f' ? 'f' : 'm' })}
              >
                <option value="m">o {ator?.name || DEFAULT_CAST[chave].name}</option>
                <option value="f">a {ator?.name || DEFAULT_CAST[chave].name}</option>
              </Select>
              <Input
                aria-label={`Plural de ${rotulo.toLowerCase()}`}
                maxLength={28}
                disabled={!ator}
                placeholder={ator ? `${aparado(ator.name)}s` : 'plural automático'}
                value={ator?.plural ?? ''}
                onChange={(e) => trocar(chave, { plural: e.target.value })}
                onBlur={() => aparar(chave)}
              />
              <Select
                aria-label={`Desenho de ${rotulo.toLowerCase()}`}
                disabled={!ator}
                value={ator?.figure ?? PELO_NOME}
                onChange={(e) =>
                  trocar(chave, { figure: ehFigura(e.target.value) ? e.target.value : PELO_NOME })
                }
              >
                {/* "Pelo nome" diz O QUE o nome dá hoje: é o desenho que a criança vai ver. */}
                <option value={PELO_NOME}>Pelo nome ({NOME_DA_FIGURA[pelosNomes[chave]]})</option>
                {SCENE_FIGURES.map((f) => (
                  <option key={f} value={f}>
                    {NOME_DA_FIGURA[f]}
                  </option>
                ))}
              </Select>
            </div>
          )
        })}
      </div>
      {ativo && (
        /* A prévia é o que dispensa o professor de imaginar o resultado da troca de artigo. */
        <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {papeisDaCena.length === 0
              ? 'Esta cena não desenha o elenco: mudam só os nomes nos textos.'
              : `No palco: ${lista(papeisDaCena.map((p) => NOME_DA_FIGURA[actorFigure(activity.cast, p)]))}, ${
                  mundo === 'espaco' ? 'no espaço' : 'no mundo do Corre Dino'
                }.`}
          </p>
          {avisos.map((aviso) => (
            <p
              key={aviso}
              className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
            >
              {aviso}
            </p>
          ))}
          <div>
            <p className="font-medium">{vestido.title}</p>
            <p className="text-muted-foreground">{vestido.instruction}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {/* Só o que ESTA atividade cobra: sem caso, as metas só de caso ficam de fora. */}
              Fecha em:{' '}
              {vestido.goals
                .filter((g) => sceneTargets(activity).includes(g.id))
                .map((g) => g.label)
                .join('; ')}
              .
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Primeira pista: {castText(vestido.hints[0], activity.cast)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
