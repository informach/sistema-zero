# Comparação arquitetural: Polaris e próxima evolução do Studio Pro

16/10/2026. Análise estática para fundamentar a [proposta complementar](../docs/plans/2026-10-16-polaris-studio-pro-proxima-evolucao.md).

Atualização de produto em 16/10: a proposta foi revisada para alunos que concluíram a jornada, com convenções transferíveis ao VS Code, desempenho como condição de entrega e preservação explícita das capacidades do Zappy. Guias são opcionais e inspector visual foi adiado. O [review da proposta](../docs/plans/2026-10-16-polaris-studio-pro-proxima-evolucao-review.md) prevalece sobre prioridades pedagógicas sugeridas nesta comparação; os achados estáticos do Polaris abaixo mantêm seu escopo original. A nova conferência dos caminhos Pro na staging `4db993ba8` não encontrou diferenças em relação à entrega revisada.

Precisão acrescentada na revisão 3: o Studio já oferece [exportação de fonte para VS Code](../packages/studio/src/export/sourceExport.ts), distinta do deploy, e provas de instalação/build de kits. A evolução proposta aperfeiçoa instruções, avisos, cobertura e custo desse fluxo; não cria uma capacidade de exportação inexistente. A revisão também explicita posse exclusiva do runtime local, sincronização e capacidades por host.

Base final da revisão 3: staging `b030c443e`. O avanço desde `4db993ba8` foi inspecionado e se restringe a Marketing e seus relatórios; o diff dos caminhos Pro comparados permanece vazio. As bases históricas abaixo registram quando a comparação original foi feita.

## Escopo e base

Polaris: `C:/Users/tocha/Downloads/polaris-main/polaris-main`, sem metadados Git no diretório examinado. Inventário em `src/` e `convex/`: 178 arquivos; 56 em `src/features/`. Esses números são inventário, não uma afirmação de leitura integral de cada componente genérico ou arquivo gerado.

Sistema Zero: staging local inicialmente `7de6b2a69` e novamente conferido em `3511cd6c6` ao final, incluindo a entrega Pro `77c7e43b7` e correções `a6ab0b668`. Os avanços depois de `a3ce614c0` examinados correspondem ao Helpdesk e ao Instagram/Marketing. Conferidos os módulos centrais do Studio, Core Studio, integração do host e aplicação do builder, sem diferenças nesses caminhos em relação à entrega revisada.

Leitura dos fluxos de editor, abas, seleção/IA, persistência, preview, mensagens, ferramentas do agente e GitHub; comparação com workspace, linguagem, receitas, materiais, revisão e coordenação do Pro. Não é auditoria exaustiva de exports, código morto ou segurança de ambos os produtos. Nenhum componente genérico foi classificado como morto apenas por não participar dos fluxos examinados.

## Achados no Polaris

Caminhos desta tabela são relativos ao diretório Polaris informado acima. Confiança alta sobre o comportamento escrito no código; impactos de corrida e exploração de autorização não foram reproduzidos contra um serviço.

| Constatação | Evidência | Implicação para adoção |
| --- | --- | --- |
| README não representa todos os módulos presentes | `README.md:7` e `:202`; agente em `src/features/conversations/inngest/process-message.ts`; preview e GitHub em `src/features/` | Usar o código como base da comparação; não chamar esses recursos de ausentes |
| Navegação temporária/fixada é uma boa referência | `src/features/editor/store/use-editor-store.ts` | O Studio já entregou esse comportamento; aperfeiçoar descoberta e orientação |
| Edição pendente pode ser perdida ao trocar aba | `src/features/editor/components/editor-view.tsx:13`, `:28`, `:53`: debounce de 1500 ms, cancelamento sem flush e editor remontado por arquivo | Preservar filas e flush do Studio. Perda é inferida do caminho, sem reprodução nova em browser |
| Documento aberto não acompanha atualização remota pelo mesmo ciclo | `src/features/editor/components/code-editor.tsx`: `initialValue` só na montagem, efeito por linguagem | Reatividade do banco não basta para colaboração ou sincronização do buffer |
| Quick edit usa referência global e intervalo capturado antes da resposta | `src/features/editor/extensions/quick-edit/index.ts:8`, `:98`, `:118` | Não copiar aplicação sem identidade de editor/revisão e conferência de conflito |
| Sugestões compartilham timer/abort e são disparadas após 300 ms | `src/features/editor/extensions/suggestion/index.ts:54`; payload inclui documento inteiro | Estado deve ser por instância. Custo/frequência e benefício infantil não foram medidos; não priorizar ghost text automático |
| Sync do preview ignora conteúdo vazio e não reconcilia remoções nesse efeito | `src/features/preview/hooks/use-webcontainer.ts:144`, `:152`, `:155` | Reaproveitar a reconciliação bidirecional do Pro, não este loop de escrita |
| Fluxo de mensagens autentica usuário, mas não verifica propriedade antes de usar API privilegiada | `src/app/api/messages/route.ts:17`, `:36`; cancelamento em `src/app/api/messages/cancel/route.ts:16`, `:36`; queries em `convex/system.ts` validam chave interna | Lacuna específica de autorização nos caminhos lidos. Preservar vínculo ator/perfil/projeto no Sistema Zero |
| Tools de arquivo por ID não recebem o projeto como escopo obrigatório | `src/features/conversations/inngest/tools/update-file.ts`; `convex/system.ts:175`, `:188` | Não delegar isolamento de projetos apenas ao prompt do agente |
| Agente modifica documento persistido diretamente | Tool `update-file.ts` chama mutation; `process-message.ts:178` permite até 20 iterações | Manter geração de candidato, evidências, revisão e aplicação explícita do Studio |
| Importação GitHub escolhe main/master e limpa antes de concluir importação | `src/features/projects/inngest/import-github-repo.ts` | Recurso exige desenho próprio de snapshot, falha e branch. Sua existência não torna integração pronta para reutilização |

As operações normais de arquivos em `convex/files.ts` verificam `ownerId`; o achado sobre mensagens não significa ausência de autorização no produto inteiro. Nenhum backend externo foi acessado. Não há estimativa de impacto em usuários reais.

## Oportunidades verificadas no Studio atual

| Evidência | Oportunidade delimitada |
| --- | --- |
| `ProNavigator.tsx:36` limita a três guias; referências abrem arquivos | Catálogo pesquisável e navegação até símbolo/propriedade; reutilizar `pro-game-knowledge.ts` |
| `ProCodeTools.tsx:133` concentra ações da paleta; layout e navegador possuem suas ações | Melhorar hierarquia e compartilhar descritores de ações quando houver múltiplas superfícies |
| `ProWorkspaceLayout.tsx` conserva componentes e usa a área direita para tutor/preview | Tornar alternância mais explícita sem refazer ciclo de vida |
| `ProBottomPanel.tsx:25` tem dicas por código; runtime em `:158` mostra stack | Evoluir ações e identidade de execução; distinguir erro com fonte conhecida de stack sem mapa |
| `packages/studio-runtime/src/contracts.ts` gera `sourcemap: false` | Links para fontes de runtime remoto exigem projeto adicional; não são um ajuste simples de UI |
| `ProAssetPaths.tsx` oferece caminho, ID e exemplo revisado | Apresentação visual e descoberta de usos; integração específica de kit onde houver contrato |
| `pro-kits/canvas-survival/src/config.ts` tem campos e validação | Piloto de parâmetros visuais escritos no código por edição sintática e revisão existente |
| `ProOperationReview.tsx` recupera operações condicionadas à revisão | Melhorar explicação/retomada sem prometer histórico integral de versões |

## Critérios usados para revisar a proposta

1. Não duplicar recursos já entregues ou infraestrutura existente.
2. Separar dado canônico, preferência e índice derivado.
3. Reconhecer limites de código arbitrário e ausência de localização confiável.
4. Manter operações revisadas, autoria, persistência e isolamento por instância.
5. Usar ajuda progressiva para a faixa de 9–14 anos, com validação de uso ainda pendente.
6. Fazer novos controles obedecerem à validação do kit e mostrarem o código real.
7. Vincular cada lote a cenários verificáveis e revisar antes de ampliar.

## Verificação e limites

Referências e contratos conferidos por leitura e busca local; diff do staging conferido. A análise anterior de 15/10 foi consultada como histórico, distinguindo seus resultados da inspeção atual. Nenhum build, teste de execução, serviço pago de IA ou estudo com crianças foi rodado nesta tarefa. Não se reivindica compatibilidade integral comprovada, teste de invasão ou auditoria exaustiva.

Somente estes documentos foram acrescentados em worktree separado. Código executável, checkout original com alterações pendentes e staging não foram modificados. A proposta não foi implementada, commitada ou integrada por esta análise.
