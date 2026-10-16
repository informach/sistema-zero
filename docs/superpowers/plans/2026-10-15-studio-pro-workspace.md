# Studio Pro Workspace Implementation Plan

> Execução autorizada pelo usuário em lotes nesta sessão, usando `executing-plans`; revisão após cada lote e revisão completa antes dos commits e merge local em staging.

**Goal:** Entregar a evolução do editor Pro aprovada, incluindo navegação, operações semânticas, materiais, revisão contextual e construção independente da aba.
**Architecture:** O documento e os materiais mantêm seus donos atuais. Um workspace por instância coordena navegação e apresentação; o serviço TypeScript calcula operações semânticas; aplicação documental e jobs mantêm guardas de autoria/revisão e persistência explícita.
**Tech Stack:** React 19, Monaco 0.52, TypeScript 5.9.3, Zustand 5, Bun, Postgres/Drizzle, runtime Cloudflare existente.
**Spec:** `docs/plans/2026-10-15-polaris-estudio-pro-proposta.md`, versão 2, com as decisões abaixo prevalecendo sobre premissas antigas.

## Restrições globais e base

- Base: staging local `1e5b0debc`, worktree `sistema-zero-studio-pro-workspace`, branch `feat/studio-pro-workspace`.
- Durante a revisão final, incorporada staging `7c820700b` por fast-forward do worktree isolado e reaplicação das alterações próprias. Conflito de texto do antigo `advance` resolvido preservando o polling e o vocabulário novo; nenhuma alteração pendente dos demais worktrees foi movida.
- O Pro não tem usuários nem dados em staging/produção: atualizar contratos diretamente, sem suporte paralelo ao protocolo antigo, migrações de preferências inexistentes ou rollout por flags artificiais.
- Staging já retirou flags dos kits e incorporou revisões de Pensa/Zappy, publicação, captura e runtime. Não reintroduzir flags removidas.
- Preservar integrações vivas de classic, aulas, Pensa/Pinta/Molda e autoria; ausência de usuários Pro não autoriza quebrar estes consumidores.
- Alterações locais em outros worktrees pertencem a outros trabalhos. Reavaliar staging e suas alterações antes do merge; sem stash/reset indiscriminado.
- Escopo implementado: seções 1–10 da proposta e verificação correspondente. Iniciativas explicitamente adiadas na seção 11 (GitHub, threads, IA em linha, multiplayer e autoria móvel) continuam fora deste escopo.
- Sem implantar infraestrutura nem fazer push. Commit e merge apenas locais, após revisão final.

## Direção visual aplicada

Crianças de 9–14 anos encontram uma regra, experimentam e observam o jogo. Vocabulário: jogo, personagem, regra, material, tentativa, dica. A assinatura é o caminho curto entre arquivo explicado, alteração e jogo experimentável. Manter os tokens reais `sz-bg`, `sz-panel`, `sz-fg`, `sz-accent`, `sz-border`, `sz-error`, estados de sucesso/aviso e os temas existentes. Tipografia e espaçamento seguem o Studio, fonte Pro inicial 15 px quando não escolhida; controles por teclado e foco visível. Substituir excesso de abas por exploração temporária, ferramentas sempre abertas por regiões recolhíveis e instruções genéricas por papéis dos arquivos/receitas compatíveis.

## Lote 1 — Workspace, navegação e orientação

Arquivos: criar `src/modes/pro/workspace/model.ts`, `search.ts`, `storage.ts`, `useProWorkspace.ts`; modificar `ProCodeMode.tsx`, `ProFileTree.tsx`, `MonacoTabs.tsx`; adicionar catálogo de papéis em `packages/core/src/studio/pro-templates.ts` ou módulo puro vizinho.

Interfaces centrais:
```ts
interface ProWorkspaceState {
  openFiles: string[]
  activeFile: string
  temporaryFile: string | null
  collapsed: string[]
  sidebar: 'files' | 'search'
  query: string
}
type ProSearchResult = { path: string; line: number; column: number; text: string }
```

- [x] Implementar operações puras de abrir temporário/fixar/fechar/reconciliar/remapear, busca limitada por nome/conteúdo e validação de preferências.
- [x] Testar que editar fixa a aba antes de outra abertura; árvore removida filtra abas; busca retorna linhas corretas e limita resultados.
- [x] Integrar busca, caminho clicável, ações de materiais, expansão controlada e papéis compatíveis na interface real.
- [x] Persistir preferências fora do documento por escopo/projeto; memória em hosts sem persistência; restauração não sobrescreve interação que já ocorreu.
- [x] Revisar diff, executar testes do lote e registrar evidência em `.audits/studio-pro-workspace-2026-10-15/reviews.md`.

Teste representativo:
```ts
expect(openWorkspaceFile(openWorkspaceFile(empty, 'a.ts'), 'b.ts').openFiles).toEqual(['b.ts'])
expect(openWorkspaceFile(pinWorkspaceFile(openWorkspaceFile(empty, 'a.ts'), 'a.ts'), 'b.ts').openFiles).toEqual(['a.ts', 'b.ts'])
```

## Lote 2 — Refatoração, símbolos e recuperação

Arquivos: `monaco/pro/languageService.ts`, `protocol.ts`, `session.ts`, `workers/pro-language.worker.ts`; criar `state/proWorkspaceOperations.ts`; integrar árvore e workspace; ampliar testes do serviço e operações.

- [x] Expor símbolos, referências, renomeação de símbolo e `getEditsForFileRename` através do worker tipado.
- [x] Calcular preview com base textual atual, mapa de caminhos e edições do serviço; validar limites, colisões e autoria.
- [x] Aplicar uma operação documental com comparação de base; sincronizar buffers/modelos/abas e guardar inversa condicionada.
- [x] Implementar mover, renomear e excluir recuperável com confirmação; navegação por símbolos e voltar.
- [x] Testar renomeação com import entre pastas, colisões, alteração concorrente, observer, undo após edição e limites de formatos.
- [x] Revisar e registrar evidência antes do próximo lote.

Teste representativo:
```ts
service.update({ 'src/main.ts': 'import { speed } from "./config"', 'src/config.ts': 'export const speed = 3' })
const edits = service.renameFile('src/config.ts', 'src/settings.ts')
expect(edits.some(file => file.path === 'src/main.ts')).toBe(true)
```

## Lote 3 — Disposição estável, problemas e materiais

Arquivos: `components/layout/Shell.tsx`, `modes/pro/ProCodeMode.tsx`, `ProCodeEditor.tsx`, `components/tutor/ZappyPanel.tsx`, `components/assets/ProAssetPaths.tsx`, `components/console/ConsolePanel.tsx` e componentes focados no workspace.

- [x] Manter uma árvore de componentes Pro estável ao mudar largura/disposição; código e preview ocultos permanecem montados enquanto o projeto está aberto.
- [x] Expor ampliar código/jogo, problemas acionáveis, ações de navegação e fonte Pro com preferência preservada.
- [x] Usar a mesma biblioteca de materiais, mostrar exemplos determinísticos por engine e permitir inserção explícita/revisável com autoria.
- [x] Preservar guia do host, ciclo de vida do Zappy e distinção painel desktop/diálogo estreito.
- [x] Testar montagem estável, foco, tamanho, origem dos diagnósticos, materiais e regressões classic/aula.
- [x] Revisar diff e interação no navegador; registrar evidência.

## Lote 4 — Pedido contextual e revisão confortável

Arquivos: `ProCodeEditor.tsx`, `studio/tutor.ts`, `ZappyPanel.tsx`, `ProBuilderPanel.tsx`, `ProRevisionDiff.tsx`, contratos e validadores de assistência/aplicação.

- [x] Adicionar pedir mudança junto a explicar/investigar, campo contextual e atalho limitado ao editor ativo.
- [x] Capturar seleção/linhas/hash antes de sair do editor; preservar rascunho; explicar o alcance real enviado.
- [x] Identificar mudanças fora do alcance; exigir pedido amplo explícito ou aceite vinculado à identidade da proposta e validado na aplicação.
- [x] Ampliar diff, destacar linguagem, resumir efeito e separar evidência automática de critério manual; manter aplicação completa e recuperação existentes.
- [x] Testar seleção desatualizada, troca de projeto, escopo, cota indisponível, proposta/preview divergentes e falha de save.
- [x] Revisar e registrar evidência.

## Lote 5 — Construção independente da aba

Arquivos: contratos builder em Core; executor/rotas em member-shell; serviço/repositório de jobs em Members; integração de executor do servidor e sua configuração operacional; `ProBuilderPanel.tsx`.

- [x] Escolher a coordenação durável a partir dos serviços já disponíveis e documentar o protocolo de serviço antes de editar o fluxo. A decisão deve permitir retomada após reinício e resolver autenticação sem guardar sessão de navegador.
- [x] Persistir intenção de execução junto do job; despachar/reconciliar com identidade idempotente e ownership único; reaproveitar leases e ledger atuais.
- [x] Remover a dependência de `advance` da UI; consultar estado com polling limitado e cancelamento de domínio.
- [x] Impedir efeitos após cancelamento/expiração e repetição ambígua de chamadas pagas; manter snapshot imutável e limites 3+3.
- [x] Testar falha de entrega, reinício, concorrência, perda de lease, cancelamento durante validação e reconexão da UI.
- [x] Revisar frontend, contrato, servidor e persistência em conjunto; registrar evidência em `.audits/studio-pro-workspace-2026-10-15/batch5.md`.

## Lote 6 — Full review, validação e integração local

- [x] Conferir todos os requisitos dos lotes 1–5 contra o diff real; corrigir achados.
- [x] Executar typecheck dos pacotes afetados, suites relevantes, check de formatação, build do playground e cenários e2e de autoria/navegação/layout/acessibilidade.
- [x] Validar fixtures de kit Canvas, 3D, React, convertido e customizado; isolamento por instância/perfil, observer e exportação.
- [x] Documentar evidências e limites externos (pesquisa com crianças e implantação não fazem parte de um merge local).
- [x] Reconsultar staging. Incorporar novos commits se necessário, resolver conflitos e repetir verificações afetadas.
- [x] Criar commits do trabalho revisado; fazer merge na staging local preservando alterações de outros trabalhos e verificar ancestry/status.

Implementação: `77c7e43b7`. Merge local em staging: `835ea35e2`. A árvore do merge é idêntica à implementação validada e a ancestry foi confirmada. O diff das cinco alterações pendentes de outros trabalhos em staging conservou exatamente o mesmo SHA-256 antes/depois do merge. Relatório completo: `.audits/studio-pro-workspace-2026-10-15/full-review.md`. Sem push ou deploy.

Comandos base (executar a partir do pacote correspondente):
```powershell
bun test src/modes/pro/workspace
bun test src/monaco/pro src/state/proWorkspaceOperations.test.ts
bun run typecheck
bun run check
bun run e2e --project=chromium
```
Os caminhos exatos de e2e e checks adicionais serão registrados junto da evidência de cada lote, conforme a superfície efetivamente alterada.
