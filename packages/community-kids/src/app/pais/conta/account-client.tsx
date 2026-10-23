'use client'

import { useState } from 'react'
import { ParentPasswordChange } from '@/components/kids/profile-management'
import { AiTransparencyNotice, FamilyAiCredits } from '../_components/ai-credits-card'
import { AmbassadorCard } from '../_components/ambassador-card'
import { ParentShell } from '../_components/parent-shell'
import { ParentPageTitle, ParentSection } from '../_components/parent-ui'
import { ParentSubscriptions, PasswordCard, PurchaseHistory } from '../_components/purchase-history'
import { StudioOpenRouterCard } from '../_components/studio-openrouter-card'

/**
 * A Conta (11/10/2026): assinatura, créditos do Zappy e do Pensa, compras, senha e indicação num lugar só. Antes
 * eram botões soltos no topo da área dos pais (Compras, Trocar senha) e cartões no fim dela.
 */
export function AccountClient({ parentName }: { parentName?: string }) {
  const [password, setPassword] = useState(false)
  return (
    <ParentShell active="conta" parentName={parentName}>
      <ParentPageTitle
        title="Conta"
        text="Assinatura, compras, créditos do Zappy e do Pensa, e a segurança da sua conta."
      />
      {/* Duas colunas que se acomodam quando um cartão some (sem assinatura, equipe sem teto de
          créditos): a da esquerda é o dinheiro, a da direita o uso e a segurança. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* "Minhas compras" é o nome que os Termos de Uso e as páginas de venda dão ao lugar do
            cancelamento: o título precisa continuar existindo nesta página. */}
        <ParentSection title="Minhas compras" id="parents-my-purchases" className="min-w-0">
          <ParentSubscriptions />
          <PurchaseHistory />
        </ParentSection>
        <aside className="flex flex-col gap-6">
          <FamilyAiCredits />
          <AiTransparencyNotice />
          <StudioOpenRouterCard />
          <PasswordCard onChange={() => setPassword(true)} />
        </aside>
      </div>
      <AmbassadorCard />
      {password ? <ParentPasswordChange onCancel={() => setPassword(false)} /> : null}
    </ParentShell>
  )
}
