import {
  groupDrawersByFamily,
  type StudioDrawer,
} from '@sistemazero/member-shell/server/studio-unlocks'
import { ChevronDown, Wrench } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { familyLabel } from '@/lib/studio-family'

/**
 * "Minhas ferramentas" (/perfil): as GAVETAS da caixa de ferramentas do Estúdio que a
 * criança já conquistou nos cursos.
 *
 * É a cara visível do currículo (08/2026): bônus entrega ao concluir; curso com posição
 * entrega ao concluir e publicar no Mural. Os blocos ensinados ficam para sempre. Mostrar
 * GAVETA em vez de lista de
 * blocos é o que torna a recompensa legível — "ganhei 💥 Colisões" é uma conquista;
 * "ganhei 6 blocos" não é.
 *
 * Sem nenhuma ferramenta a seção some: quem ainda não conquistou nenhuma usa o Estúdio
 * pelo perfil do nível, e prometer uma lista vazia só desanimaria.
 *
 * ⚠️⚠️ AGRUPADO POR FAMÍLIA, e não por acaso. A lista era uma fileira só de pílulas, e isso
 * quebrava de dois jeitos ao mesmo tempo:
 *
 *  1. **Crescia sem limite.** Um Construtor(a) já tem 16 gavetas com UMA extensão liberada;
 *     com Jogo 3D e Jogo 2D Avançado a fileira passa de 40.
 *  2. **Misturava gavetas homônimas.** Nome de gaveta se REPETE entre extensões — `🔊 Som`
 *     existe em quatro famílias, `🎨 Aparência` e `🔤 Texto` em três (12 nomes colidem no
 *     catálogo real, cobrindo 176 blocos). Lado a lado, sem o topo do caminho, elas eram
 *     indistinguíveis.
 *
 * O `<details>`/`<summary>` é NATIVO de propósito: dá teclado, leitor de tela e o estado
 * aberto/fechado sem uma linha de JS, então esta seção continua sendo Server Component.
 * Trocar por um acordeão em `'use client'` custaria hidratação por uma coisa que o HTML
 * já faz.
 *
 * Não aparece nas telas-modelo de 11/09/2026, mas é conteúdo: fica, na mesma roupa dos
 * cartões da carreira (cartão branco, ladrilho azul, linhas claras sem borda).
 */
export function MyTools({
  drawers,
  studioOwned,
  className,
}: {
  drawers: readonly StudioDrawer[]
  /** Estúdio Completo comprado (produto à parte)? Só então o atalho aparece. */
  studioOwned: boolean
  className?: string
}) {
  if (drawers.length === 0) return null
  const total = drawers.reduce((sum, drawer) => sum + drawer.count, 0)
  const families = groupDrawersByFamily(drawers)

  return (
    <section aria-label="Minhas ferramentas" className={cn('kids-carta p-5 md:p-6', className)}>
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="kids-marca grid size-11 shrink-0 place-items-center rounded-[0.75rem]"
        >
          <Wrench className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="sz-display text-xl md:text-[1.375rem]">Minhas ferramentas</h2>
          <p className="mt-1 font-medium text-[0.8125rem] text-muted-foreground">
            {drawers.length === 1
              ? `Você conquistou 1 gaveta com ${total} ${total === 1 ? 'bloco' : 'blocos'} no seu Estúdio.`
              : `Você conquistou ${drawers.length} gavetas com ${total} blocos no seu Estúdio.`}
          </p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-2">
        {families.map((group, index) => (
          <li key={group.family}>
            <details
              /* A primeira (a mais cheia) já vem aberta: a criança vê conquista de cara em
                 vez de uma fileira de caixas fechadas. As outras ficam a um toque. */
              open={index === 0}
              className="group rounded-[1.25rem] bg-background"
            >
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-[1.25rem] px-4 py-2 font-extrabold text-[0.9375rem] [&::-webkit-details-marker]:hidden">
                <span className="truncate">{familyLabel(group.family)}</span>{' '}
                {/* ⚠️ O espaço acima é LOAD-BEARING: sem ele o texto acessível do resumo sai
                    grudado ("Jogo 2D13 gavetas") e o leitor de tela lê "2D13" como um só token. */}
                <span className="flex shrink-0 items-center gap-2 font-semibold text-muted-foreground text-xs">
                  {group.drawerCount === 1 ? '1 gaveta' : `${group.drawerCount} gavetas`}
                  {' · '}
                  {group.blockCount === 1 ? '1 bloco' : `${group.blockCount} blocos`}
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </span>
              </summary>
              <ul className="flex flex-wrap gap-2 px-4 pt-1 pb-4">
                {group.drawers.map((drawer) => (
                  <li
                    key={drawer.key}
                    className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 font-bold text-sm ring-1 ring-border ring-inset"
                  >
                    {drawer.label}
                    <span className="kids-marca rounded-full px-2 py-0.5 font-extrabold text-xs">
                      {drawer.count}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>

      {studioOwned ? (
        <Link href="/estudio" prefetch={false} className="sz-btn-gradient mt-5 px-6">
          Abrir o Estúdio
        </Link>
      ) : null}
    </section>
  )
}
