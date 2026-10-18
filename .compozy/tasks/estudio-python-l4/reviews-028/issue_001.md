---
status: resolved
file: packages/studio/src/modes/python/PythonCodeMode.tsx
line: 22
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Excluir o terminal JavaScript dos modos Python

## Review Comment

A nova composição Pro Python reutiliza NarrowPanels, cujo useVisibleBottomTabs oferece Terminal sempre que mode é code, config.terminal e showTerminal estão ativos. Os padrões de resolveStudioConfig({professional:true}) e da store deixam ambos ativos. O painel terminal ainda é o lazy Terminal JavaScript/WebContainer, não pertence à composição Python fonte+preview desta fatia.

Prova independente com React real, createStudioStores, documento validado Python Pro e o hook real produziu `{projectLanguage:'python',projectKind:'pro',projectMode:'code',showTerminal:true,tabs:[console,terminal]}`. A fixture bridge configura terminal:false e portanto não detecta o padrão público. Tabs mantém todos os painéis montados; não basta evitar selecionar essa aba. O mesmo filtro também é compartilhado pelo BottomPanel wide.

Terminal projeta o documento Python para id/files nulos, mas ainda oferece Carregar terminal real. Seu handler pode carregar WebContainer e montar o template web vazio via fallback clássico. Isso mistura ambientes e entrega uma ação incompatível; não se trata de exigir o terminal Python ainda planejado para L5.

Filtrar o terminal JavaScript pela linguagem no ponto comum de seleção/dispatch, preservando a preferência para quando o aluno voltar a JavaScript. Cobrir o padrão professional:true e a troca JavaScript→Python→JavaScript; não mascarar o caso desligando terminal globalmente no harness.

## Triage

- Decision: `VALID`
- Notes: Implementador acrescentou a linguagem ao filtro compartilhado de bottomTabs.tsx. Fixture bridge agora usa resolveStudioConfig({professional:true}) sem desligar terminal; spec exige ausência da aba em Python. Revalidação independente confirmou a correção. Nenhuma implementação alterada pelo revisor.

## Verification

- Prova React real com stores e documentos validados: Python Pro, defaults professional:true/showTerminal:true → somente Console. Sequência Python→JavaScript→Python→JavaScript → [console], [console,terminal], [console], [console,terminal].
- A mesma prova desliga a preferência de Terminal em JavaScript, passa por Python e volta: a preferência continua desligada, sem ser reescrita pelo filtro.
- `bun test src/components/layout/BottomPanel.test.tsx src/studio/config.test.ts src/components/settings/SettingsDrawer.test.tsx src/python/blocks/authoring.test.ts src/python/blocks/selection.test.ts`: 29 pass, 0 fail, 219 expect() calls. Dois avisos React de Suspense fora de act na suíte BottomPanel; sem falhas. A reprodução direta não emitiu avisos.
- Revisor não iniciou WebContainer/browser, build ou TSC, e não revisou a reorganização de bundles ainda em andamento.
