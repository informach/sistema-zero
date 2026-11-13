'use client'

import type { MoldeDoVestuario } from '@sistemazero/arquipelago-contracts'
import { avatarFileUrl } from '@sistemazero/core/avatar'
import {
  Camera,
  Check,
  CloudOff,
  Eye,
  Loader2,
  Lock,
  RefreshCw,
  Shuffle,
  Undo2,
  X,
} from 'lucide-react'
import type { ComponentType } from 'react'
import {
  AVATAR_FILTERS,
  AVATAR_TAB_GROUPS,
  type AvatarShopItem,
  avatarItemLabel,
  avatarPoses,
  avatarTabGroupOf,
  isAvatarItemWorn,
} from '../../../lib/avatar-pack'
import type { AvatarReturnPath } from '../../../lib/avatar-return'
import { cn } from '../../../lib/cn'
import { KidsBackButton, KidsMascot, ZappyCoin } from '../presentation'
import { AVATAR_MESSAGES, type CosmeticsSkin } from '../skin'
import { AvatarScene } from './avatar-scene'
import type { AdultAvatarConfiguratorProps } from './configurator-adult'
import { SeasonalAvatarChoices } from './seasonal-choices'
import { type AvatarEditor, type SaveStatus, useAvatarEditor } from './use-avatar-editor'

/** Uma escolha na grade: a miniatura do pack (ou a bolinha da cor do corpo, ou o "Nenhum"). */
function ItemTile({
  item,
  worn,
  disabled,
  confirming,
  onSelect,
}: {
  item: AvatarShopItem
  worn: boolean
  disabled: boolean
  /** Peça paga vestida de prévia, esperando o 2º toque. */
  confirming: boolean
  onSelect: () => void
}) {
  const daFesta = !item.owned && item.tier === 'festa'
  if (item.swatch) {
    return (
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        aria-label={item.label.replace(/^Corpo /, 'Cor ')}
        title={item.label.replace(/^Corpo /, '')}
        aria-pressed={worn}
        className={cn(
          'grid aspect-square place-items-center rounded-full border-4 shadow-sm transition-transform active:scale-90',
          worn ? 'border-foreground ring-2 ring-foreground/30' : 'border-card',
        )}
        style={{ backgroundColor: item.swatch }}
      >
        {worn ? (
          <Check
            className="size-5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]"
            strokeWidth={3}
          />
        ) : null}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={
        daFesta
          ? `${item.label}, vem da festa do Arquipélago`
          : item.owned
            ? item.label
            : `${item.label}, ${item.price} moedas`
      }
      title={item.label}
      aria-pressed={worn}
      className={cn(
        'relative grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 bg-muted/40 transition-[background-color,border-color,box-shadow,opacity] disabled:opacity-60',
        worn ? 'border-primary ring-2 ring-primary/40' : 'border-border',
      )}
    >
      {item.kind === 'none' ? (
        <span className="flex flex-col items-center gap-0.5 font-bold text-[0.7rem] text-muted-foreground">
          <X className="size-6" />
          Nenhum
        </span>
      ) : item.thumb ? (
        <img
          src={avatarFileUrl(item.thumb)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-contain p-1"
        />
      ) : (
        <span className="line-clamp-2 px-1 text-center font-bold text-[0.7rem] text-muted-foreground">
          {item.label}
        </span>
      )}
      {item.kind === 'set' ? (
        <span className="absolute inset-x-1 top-1 truncate rounded-full bg-card/90 px-1 text-center font-bold text-[0.65rem]">
          {item.label}
        </span>
      ) : null}
      {!item.owned ? (
        <span
          className={cn(
            'absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-1 py-0.5 font-bold text-[0.68rem] shadow',
            confirming ? 'bg-primary text-primary-foreground' : 'bg-(--kids-lime-tint)',
          )}
        >
          <Lock className="size-3" />{' '}
          {daFesta ? 'Da festa' : confirming ? `Comprar? ${item.price}` : item.price}
        </span>
      ) : null}
    </button>
  )
}

/** O que a tela mostra no lugar do antigo "Salvar": o avatar se guarda sozinho. */
function SaveBadge({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-card/90 px-4 font-bold text-destructive text-sm shadow-md"
      >
        <CloudOff className="size-5" /> <span className="hidden sm:inline">Não salvou. </span>
        Tentar de novo
      </button>
    )
  }
  const conteudo: Record<Exclude<SaveStatus, 'error'>, { icon: React.ReactNode; text: string }> = {
    saved: { icon: <Check className="size-5" strokeWidth={3} />, text: 'Salvo' },
    waiting: { icon: <Loader2 className="size-5 animate-spin" />, text: 'Salvando…' },
    saving: { icon: <Loader2 className="size-5 animate-spin" />, text: 'Salvando…' },
    preview: { icon: <Eye className="size-5" />, text: 'Só experimentando' },
  }
  const { icon, text } = conteudo[status]
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-full px-4 font-bold text-sm shadow-md',
        status === 'saved'
          ? 'bg-(--kids-lime-tint) text-foreground'
          : status === 'preview'
            ? 'bg-card/90 text-muted-foreground'
            : 'bg-card/90 text-foreground',
      )}
    >
      {icon}
      <span className={status === 'saved' ? '' : 'hidden sm:inline'}>{text}</span>
    </span>
  )
}

/** A pergunta da primeira vez: que peças mostrar. Dá para trocar no alto do painel. */
function FilterQuestion({ onChoose }: { onChoose: AvatarEditor['chooseFilter'] }) {
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="avatar-filtro-titulo"
      className="flex flex-col items-center gap-3 rounded-3xl border-2 border-primary/40 bg-card p-5 text-center"
    >
      <KidsMascot expression="happy" className="size-20" />
      <h2
        id="avatar-filtro-titulo"
        className="[font-family:var(--font-display)] font-extrabold text-xl leading-tight"
      >
        Quais peças você quer ver?
      </h2>
      <div className="grid w-full grid-cols-3 gap-2">
        {AVATAR_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChoose(f.id)}
            className="min-h-14 rounded-2xl bg-primary px-2 font-bold text-primary-foreground text-base shadow-md transition-transform active:scale-95"
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm">Dá para trocar quando quiser, aqui no painel.</p>
    </div>
  )
}

/**
 * O "Meu avatar" (tela cheia no celular): o boneco do pack ao vivo + a loja por abas, com o filtro
 * menina/menino/todas, as regras à vista e o salvar sozinho (`use-avatar-editor.ts`). Duas abas de
 * modo: **Personalizar** e **Cabine de fotos** (pose + a foto de corpo inteiro).
 *
 * `skin="adult"` (comunidade adulta) usa a MESMA lógica com outra tela (`configurator-adult.tsx`).
 * ⚠️ A tela adulta chega por `adultView` (ver `configurator-adult-entry.tsx`), nunca por import
 * daqui: importada aqui, ela iria no pacote do Kids, que nunca a desenha.
 */
export function AvatarConfigurator({
  dark,
  returnTo,
  skin = 'kids',
  adultView: AdultView,
  onReturn,
  festa,
}: {
  dark: boolean
  returnTo: AvatarReturnPath
  skin?: CosmeticsSkin
  adultView?: ComponentType<AdultAvatarConfiguratorProps>
  /** Fluxo embutido: volta à ferramenta chamadora (o jogo), dizendo se algo foi gravado. */
  onReturn?: (saved: boolean) => void
  festa?: MoldeDoVestuario['festa']
}) {
  const editor = useAvatarEditor({ messages: AVATAR_MESSAGES[skin] })
  const { state, loadState, mode, status, tab, catalog } = editor

  // Sair = gravar o que falta e só então navegar. Navegação DURA (não `router.push`): a foto nova
  // aparece no menu e na barra, que moram no layout e não são relidos numa navegação SPA.
  const exitAvatar = async () => {
    if (editor.busy || editor.photoBusy) return
    const saved = await editor.finishBeforeExit()
    if (onReturn) onReturn(saved)
    else window.location.assign(returnTo)
  }
  const exitLabel = onReturn
    ? 'Voltar ao jogo'
    : returnTo === '/'
      ? 'Voltar ao início'
      : 'Voltar ao meu perfil'
  const onEmbeddedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onReturn) {
      e.preventDefault()
      void exitAvatar()
    }
  }
  const seasonalChoices = festa ? (
    <SeasonalAvatarChoices
      festa={festa}
      owned={editor.owned}
      disabled={Boolean(editor.busy)}
      onSelect={editor.chooseById}
    />
  ) : null

  if (skin === 'adult' && AdultView) {
    return (
      <AdultView
        editor={editor}
        returnTo={returnTo}
        onExit={() => void exitAvatar()}
        embedded={Boolean(onReturn)}
        seasonalChoices={seasonalChoices}
        dark={dark}
      />
    )
  }

  if (loadState === 'error') {
    return (
      <div
        onKeyDown={onEmbeddedKeyDown}
        className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1"
      >
        <div className="relative z-10 flex items-center justify-between gap-2 p-4">
          <KidsBackButton onClick={() => void exitAvatar()} label={exitLabel} variant="overlay" />
        </div>
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div className="flex max-w-sm flex-col items-center gap-3">
            <KidsMascot expression="thinking" className="size-24" />
            <p className="font-semibold">Não consegui carregar seu avatar.</p>
            <button
              type="button"
              onClick={editor.retry}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-bold text-primary-foreground"
            >
              <RefreshCw className="size-4" /> Tentar de novo
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeGroup = avatarTabGroupOf(tab.id)
  const tabChip = (t: (typeof activeGroup.tabs)[number]) => (
    <button
      key={t.id}
      type="button"
      onClick={() => editor.chooseTab(t.id)}
      aria-pressed={t.id === tab.id}
      className={cn(
        'min-h-10 shrink-0 rounded-full px-3 font-semibold text-sm transition-colors',
        t.id === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {t.label}
    </button>
  )
  const askFilter = state !== null && editor.filter === null
  const poses = avatarPoses(catalog)

  return (
    <div
      onKeyDown={onEmbeddedKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:flex-1"
    >
      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <KidsBackButton onClick={() => void exitAvatar()} label={exitLabel} variant="overlay" />
          <h1 className="sr-only [font-family:var(--font-display)] font-extrabold text-2xl leading-none md:not-sr-only md:px-1">
            Meu avatar
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-(--kids-lime-tint) px-3 py-1.5 [font-family:var(--font-display)] font-bold text-sm shadow-md">
            <ZappyCoin className="size-4" /> {editor.coinsUnlimited ? '∞' : editor.balance}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={editor.randomize}
            disabled={!state || Boolean(editor.busy) || askFilter}
            aria-label="Surpreenda-me"
            title="Surpreenda-me"
            className="inline-flex size-11 items-center justify-center gap-2 rounded-full bg-card/90 font-bold text-foreground text-sm shadow-md backdrop-blur transition-transform active:scale-90 disabled:opacity-50 md:w-auto md:px-4"
          >
            <Shuffle className="size-5" />
            <span className="hidden md:inline">Surpreenda-me</span>
          </button>
          {mode === 'photo' ? (
            <button
              type="button"
              onClick={() => void editor.takePhoto()}
              disabled={!state || editor.photoBusy || status === 'preview'}
              aria-label="Tirar foto"
              className="sz-btn-gradient inline-flex h-11 items-center gap-2 rounded-full px-4 font-bold text-primary-foreground text-sm shadow-md transition-transform active:scale-95 disabled:opacity-60"
            >
              {editor.photoBusy ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Camera className="size-5" />
              )}
              <span className="hidden sm:inline">Tirar foto</span>
            </button>
          ) : state ? (
            <SaveBadge status={status} onRetry={editor.retrySave} />
          ) : null}
        </div>
      </div>

      {seasonalChoices}
      {/* Corpo: com 45rem de área, o 3D à esquerda e o painel à direita (só a grade rola);
          abaixo disso, o 3D em cima e o painel embaixo. A régua mede o CONTÊINER (o menu do Kids
          aparece a partir do `md` e pode ser recolhido). */}
      <div className="@container/avatar flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col @min-[45rem]/avatar:flex-row @min-[45rem]/avatar:gap-4 @min-[45rem]/avatar:px-4 @min-[45rem]/avatar:pb-4">
          <div
            className="relative min-h-0 flex-1 @min-[45rem]/avatar:overflow-hidden @min-[45rem]/avatar:rounded-3xl @min-[45rem]/avatar:border-2 @min-[45rem]/avatar:border-border"
            role="img"
            aria-label="Pré-visualização 3D do seu avatar"
          >
            {state ? (
              <AvatarScene
                slots={editor.slots}
                onReady={editor.onReady}
                dark={dark}
                mode={mode}
                pose={mode === 'photo' ? editor.pose : undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <KidsMascot expression="thinking" className="size-24 animate-pulse" />
              </div>
            )}
          </div>

          <section
            aria-label="Escolhas do avatar"
            className="relative z-10 flex flex-col gap-3 rounded-t-3xl bg-card/95 p-4 shadow-2xl backdrop-blur @min-[45rem]/avatar:w-[21.25rem] @min-[45rem]/avatar:min-h-0 @min-[45rem]/avatar:shrink-0 @min-[45rem]/avatar:rounded-3xl @min-[45rem]/avatar:border-2 @min-[45rem]/avatar:border-border @min-[45rem]/avatar:bg-card @min-[45rem]/avatar:shadow-none @min-[62.5rem]/avatar:w-[25rem]"
          >
            {askFilter ? (
              <FilterQuestion onChoose={editor.chooseFilter} />
            ) : (
              <>
                <div className="order-last grid grid-cols-2 gap-2 @min-[45rem]/avatar:order-first">
                  {(
                    [
                      ['customize', '🎨 Personalizar'],
                      ['photo', '📸 Cabine de fotos'],
                    ] as const
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => editor.setMode(m)}
                      aria-pressed={mode === m}
                      className={cn(
                        'rounded-2xl py-3 font-bold text-sm transition-colors',
                        mode === m
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'customize' ? (
                  <CustomizePanel editor={editor} activeGroup={activeGroup} tabChip={tabChip} />
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-center font-semibold text-muted-foreground text-xs @min-[45rem]/avatar:text-left @min-[45rem]/avatar:text-sm">
                      Escolha a pose e clique em <strong>Tirar foto</strong> lá em cima 📸
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-subtle @min-[45rem]/avatar:flex-wrap @min-[45rem]/avatar:overflow-visible">
                      {poses.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => editor.setPose(p.id)}
                          aria-pressed={editor.pose === p.id}
                          className={cn(
                            'shrink-0 rounded-full px-4 py-2 font-semibold text-sm transition-colors',
                            editor.pose === p.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function CustomizePanel({
  editor,
  activeGroup,
  tabChip,
}: {
  editor: AvatarEditor
  activeGroup: ReturnType<typeof avatarTabGroupOf>
  tabChip: (t: ReturnType<typeof avatarTabGroupOf>['tabs'][number]) => React.ReactNode
}) {
  const { tab, kinds, kind, items, pending, notice, catalog } = editor
  return (
    <>
      {/* O filtro: menina, menino ou todas (o rosto, o cabelo, a barba e o vestido seguem ele). */}
      <div role="group" aria-label="Mostrar peças de" className="flex items-center gap-2">
        <span className="shrink-0 font-bold text-muted-foreground text-xs">Peças de</span>
        <div className="grid flex-1 grid-cols-3 rounded-full bg-muted p-1">
          {AVATAR_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => editor.chooseFilter(f.id)}
              aria-pressed={editor.filter === f.id}
              className={cn(
                'min-h-9 rounded-full font-bold text-sm transition-colors',
                editor.filter === f.id ? 'bg-card text-foreground shadow' : 'text-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* As abas em três grupos: ao lado do 3D, todas à vista; no celular, o grupo em cima e as
          abas dele embaixo. */}
      <div className="hidden flex-col gap-2 @min-[45rem]/avatar:flex">
        {AVATAR_TAB_GROUPS.map((group) => (
          <div
            key={group.id}
            role="group"
            aria-label={group.label}
            className="flex items-start gap-2"
          >
            <span
              aria-hidden="true"
              className="w-16 shrink-0 pt-2.5 font-bold text-muted-foreground text-xs"
            >
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">{group.tabs.map(tabChip)}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 @min-[45rem]/avatar:hidden">
        <div role="group" aria-label="Partes do avatar" className="grid grid-cols-3 gap-1.5">
          {AVATAR_TAB_GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                if (group.id !== activeGroup.id) editor.chooseTab(group.tabs[0]?.id ?? 'cabelo')
              }}
              aria-pressed={group.id === activeGroup.id}
              className={cn(
                'min-h-10 rounded-full border-2 px-3 font-bold text-sm transition-colors',
                group.id === activeGroup.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              {group.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-subtle">
          {activeGroup.tabs.map(tabChip)}
        </div>
      </div>

      {/* Os tipos dentro da aba (chapéu, sobre o cabelo, capuz; camiseta, camisa…). */}
      {kinds.length > 1 ? (
        <div
          role="group"
          aria-label={`Tipos de ${tab.label.toLowerCase()}`}
          className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-subtle @min-[45rem]/avatar:flex-wrap @min-[45rem]/avatar:overflow-visible"
        >
          {kinds.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => editor.chooseKind(k.id)}
              aria-pressed={k.id === kind?.id}
              className={cn(
                'min-h-9 shrink-0 rounded-full border-2 px-3 font-semibold text-xs transition-colors',
                k.id === kind?.id
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* As regras à vista: o que a escolha tirou, com o desfazer. */}
      {notice ? (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-2xl bg-muted px-3 py-2"
        >
          <p className="text-sm">
            Para vestir <strong>{notice.chosen}</strong>, saiu:{' '}
            {notice.removed.length > 3
              ? `${notice.removed.slice(0, 3).join(', ')} e mais ${notice.removed.length - 3}`
              : notice.removed.join(', ')}
            .
          </p>
          <button
            type="button"
            onClick={editor.undoNotice}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-card px-3 font-bold text-xs shadow"
          >
            <Undo2 className="size-4" /> Desfazer
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          'grid max-h-[26vh] auto-rows-max content-start gap-2 overflow-y-auto scrollbar-subtle @min-[45rem]/avatar:max-h-none @min-[45rem]/avatar:min-h-0 @min-[45rem]/avatar:flex-1 @min-[45rem]/avatar:p-1',
          tab.id === 'corpo'
            ? 'grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-3'
            : 'grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]',
        )}
      >
        {items.map((item) => (
          <ItemTile
            key={item.id}
            item={item}
            worn={isAvatarItemWorn(catalog, item, tab, editor.slots)}
            disabled={Boolean(editor.busy)}
            confirming={pending?.id === item.id}
            onSelect={() => editor.choose(item)}
          />
        ))}
      </div>

      {/* A compra (a peça já está vestida de prévia), colada nas peças. */}
      {pending ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-(--kids-lime-tint) px-4 py-2.5"
        >
          <p className="font-semibold text-sm">
            {pending.tier === 'festa'
              ? 'Esta peça vem da festa do Arquipélago. Na época da festa, ela chega pelo jogo.'
              : pending.kind === 'set'
                ? 'Gostou da fantasia? Ela está vestida de prévia!'
                : 'Gostou? Está vestido de prévia!'}{' '}
            <span className="text-muted-foreground">({avatarItemLabel(catalog, pending.id)})</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={editor.cancelBuy}
              disabled={Boolean(editor.busy)}
              className="sz-btn-gradient sz-btn-contorno h-11 px-4 text-sm"
            >
              Deixar para depois
            </button>
            {pending.tier === 'festa' ? null : (
              <button
                type="button"
                onClick={() => editor.choose(pending)}
                disabled={Boolean(editor.busy)}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground text-sm"
              >
                <ZappyCoin className="size-4" /> Comprar por {pending.price}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
