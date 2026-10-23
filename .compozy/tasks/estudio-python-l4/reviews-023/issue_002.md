---
status: resolved
file: packages/studio/src/components/blocks/PythonBlocklyEditor.tsx
line: 361
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Vincular a restauração à oferta ainda vigente na store

## Review Comment

restore() usa a variável offer capturada na análise anterior sem conferir se ela ainda representa o rascunho atual da store. A assinatura acompanha somente mudanças de fonte. Um rascunho novo pode substituir o anterior mantendo a mesma fonte-base; nesse caso a oferta visual fica antiga. Clicar Restaurar carrega a oferta antiga e flush captura o projeto novo, sobrescrevendo seu rascunho por conteúdo antigo. discard() já compara generation, mas restore() não tinha essa guarda.

Reprodução independente no componente React com Blockly, store/controller/helper reais e parser simulado: montar com D1 pendente contendo valor2 sobre fonte1; publicar D2 com valor3 e a mesma fonte-base; clicar Restaurar. Resultado: source='(2)\n', pending=false e generation nova, perdendo D2. O usuário aprovou uma oferta que já deixou de ser a revisão vigente.

Conferir identidade/generation e fonte-base da oferta contra a store antes de carregar ou publicar. Vincular a restauração à revisão validada até o staging/CAS; se substituída, conservar o rascunho mais novo e atualizar a oferta ou informar a alteração.

## Triage

- Decision: `VALID`
- Notes: O implementador acrescentou conferência de autoria, fonte e generation antes de carregar a oferta. Se a oferta mudou, o componente reanalisa e apresenta a revisão vigente para uma nova decisão explícita. Revalidação independente confirmou a correção. Nenhuma implementação alterada pelo revisor.

## Verification

- Repetida a prova D1=valor2 substituído por D2=valor3 sobre fonte1: o primeiro clique preserva source='1\n', pending=true e exatamente a generation de D2.
- Depois de reapresentar a oferta, o segundo clique explicitamente publica D2: source='(3)\n', pending=false. D1 não substitui D2.
- Regressão permanente browser troca o rascunho incompleto12a por17b antes do clique, exige preservar generation nova no primeiro clique e mostrar17b no segundo, com fonte anterior mantida e pending=true.
- Verificação fresca das dependências: 23 testes, 87 verificações, zero falhas; Biome de cinco arquivos passou.
