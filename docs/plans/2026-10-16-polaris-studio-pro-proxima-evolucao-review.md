# Review da próxima evolução do Studio Pro

16/10/2026 · Revisões 2 e 3 de produto, arquitetura e critérios de validação.

Resultado: a [proposta revisada](2026-10-16-polaris-studio-pro-proxima-evolucao.md) corrige o enquadramento do público, reduz o protagonismo de controles visuais, explicita a preservação do Zappy e estabelece desempenho como condição de entrega. Não é certificação de uma implementação futura nem auditoria exaustiva de todo o Sistema Zero.

A revisão 3 corrigiu uma conclusão factual incompleta da revisão 2 sobre exportação: `sourceExport` já oferece fonte para continuar no VS Code, com instruções próprias, e há scripts de prova de instalação/build de kits. A seção 7 foi reescrita para aperfeiçoar esse caminho. Os achados R17–R30 abaixo fecham os contratos operacionais adicionais. A staging avançou durante o review; a nova lista de mudanças foi conferida e a base final examinada é `b030c443e`.

## Base e método

- Código entregue em `77c7e43b7`, corrigido em `a6ab0b668`; staging local inicialmente `4db993ba8` e conferida ao final em `b030c443e0adf6fd7a6bf6c33702d63b949fca8c`. O avanço desta rodada contém arquivos de Marketing e seus relatórios, sem alteração dos caminhos Pro comparados.
- Comparação Git sem alterações entre essa entrega e a staging nos caminhos `packages/studio`, `packages/core/src/studio`, `packages/member-shell/src/components/studio`, `packages/member-shell/src/server/studio-builder.ts` e `packages/members/src/application/studio-pro`. Isso não afirma igualdade de todos os hosts ou de todo o monorepo.
- Leitura estática dos contratos e componentes citados abaixo; inspeção das suítes e budgets existentes, sem execução nova dessas suítes.
- Referências oficiais do VS Code e Monaco usadas para convenções de interface e limites de equivalência. Polaris permanece referência comparativa, não dependência proposta.
- Escopo desta rodada: documentação. Nenhum código de produto, configuração de runtime ou banco foi alterado; nenhum commit/merge foi feito.

## Achados e correções

Prioridade alta indica risco de orientar a implementação para o produto errado, perder capacidade ou aceitar regressão relevante. Prioridade média indica desenho insuficientemente preciso. “Corrigido” significa corrigido na proposta.

| ID | Prioridade | Achado e evidência | Correção na proposta |
| --- | --- | --- | --- |
| R01 | Alta | A idade recebeu peso excessivo como sinal de inexperiência. O [gate](../../packages/member-shell/src/lib/studio-tier.ts) deriva Pro da [jornada](../../packages/core/src/journey/catalog.ts), no posto Lenda | Seção 1 assume aluno avançado; idade orienta acessibilidade, tom e segurança |
| R02 | Alta | Priorização de tarefas/controles visuais poderia afastar a experiência da edição convencional | Seção 3 mantém arquivos, configurações, termos e comandos reais; inspector sai da primeira entrega |
| R03 | Média | A proposta podia reapresentar recursos entregues como novidades. [Navegador](../../packages/studio/src/modes/pro/workspace/ProNavigator.tsx), [layout](../../packages/studio/src/modes/pro/workspace/ProWorkspaceLayout.tsx) e [ferramentas](../../packages/studio/src/modes/pro/workspace/ProCodeTools.tsx) já oferecem parte importante da experiência | Tabela “Como é hoje” distingue preservação, reorganização e adição; Arquivos já é a visão inicial |
| R04 | Alta | “Preservar Zappy” não era um contrato verificável. [Painel](../../packages/studio/src/components/tutor/ZappyPanel.tsx) e [adapter](../../packages/studio/src/studio/tutor.ts) incluem muito além de conversa textual | Seção 4 inventaria 16 grupos, incluindo voz/leitura, histórico, feedback, referências, missão, decisões, créditos e capacidades opcionais do host |
| R05 | Alta | Mudar layout pode perder rascunho, duplicar pedido ou alterar retomada. O [construtor](../../packages/studio/src/components/tutor/ProBuilderPanel.tsx) possui proposta, evidências, revisão, execução durável e recuperação | Dono único de sessão; casos de falha, retorno tardio, reabertura e aplicação preservados; consultar estado não gera novamente |
| R06 | Alta | Limitar resultados não limita custo: [busca](../../packages/studio/src/modes/pro/workspace/search.ts) pode percorrer o projeto inteiro sem encontrar resultado | Seção 5 exige cenário sem resultados, índice incremental e medição de latência, não apenas quantidade de linhas exibidas |
| R07 | Alta | Painel oculto pode continuar calculando; símbolos invalidam pela árvore e a [sessão](../../packages/studio/src/monaco/pro/session.ts) prepara snapshots amplos | Processamento condicionado ao consumo, versões por arquivo e invalidação de dependentes; nenhuma troca de correção semântica por cache obsoleto |
| R08 | Alta | Cancelar a espera não interrompe necessariamente TypeScript síncrono; mover tudo para workers ainda pode criar fila e cópias excessivas | Seção 5 distingue descartar resposta, coalescer consulta e interromper trabalho; prioriza interação entre tarefas, limita caches e preserva operações mutáveis |
| R09 | Alta | Budgets de bundle e [teste dos kits](../../packages/studio/e2e/pro-kit-performance.spec.ts) não comprovam latência do editor com jogo/Zappy | Baseline de produção no host real, chunks lazy/workers e concorrência; metas propostas separadas de resultados medidos |
| R10 | Alta | Cota do construtor poderia virar limite artificial do editor. [Limites remotos](../../packages/core/src/studio/pro-limits.ts) diferem dos [locais](../../packages/studio/src/state/proTree.ts) | Fixtures dos dois portes, sem reduzir o projeto local ao tamanho aceito por um pedido remoto |
| R11 | Média | Atalhos convencionais podem conflitar com navegador/SO ou contornar revisão semântica | Registro compartilhado com contexto; F2 usa operação revisada; alternativas por menu/paleta e verificação Windows/macOS/ABNT2 |
| R12 | Alta | Parecer VS Code não garante continuidade externa; a revisão 2 examinou o caminho de deploy sem considerar suficientemente `sourceExport` | Correção factual em R17; seção 7 aperfeiçoa a exportação de fonte existente e suas provas, sem presumir scripts ou sobrescrever arquivos do aluno |
| R13 | Média | Histórico de operações pode ser interpretado como Git ou undo global | Limites explícitos de undo textual, operações e recuperação; Git, grupos e substituição multiarquivo recebem escopo próprio |
| R14 | Alta | Diagnóstico e usos de materiais podem parecer exaustivos sem cobertura suficiente | Preservar mensagem técnica; links de runtime somente com localização confiável; informar limites de usos dinâmicos; sourcemaps remotos em incremento próprio |
| R15 | Alta | Ausência de usuários Pro legados não elimina contratos com o restante do sistema | Seções 8 e 10 cobrem hosts opcionais, acesso, observador, clássico/Ponte, conversão, Pensa, materiais, publicação, runtime e adapters |
| R16 | Média | Organização de pastas poderia virar reestruturação ampla sem benefício demonstrado | Separação por responsabilidade e evolução por necessidade; kits diferentes mantêm estruturas adequadas, arquivos reais sempre acessíveis |

Todos esses achados receberam tratamento no desenho. O comportamento resultante ainda precisa passar pelos critérios de implementação da proposta.

## Revisão de coesão e dependências

O caminho principal é localizar um arquivo, editar, executar, investigar e revisar. Zappy acompanha esse caminho pelos três modos atuais; não é substituído por guias. Materiais e documentação contextual alimentam o mesmo projeto e os mesmos contratos, sem árvore, memória de decisões ou pipeline de exportação paralelos.

Desempenho vem antes da reorganização funcional: baseline → correções demonstradas → comandos/layout → diagnóstico/materiais → portabilidade e review integrado. Cada lote precisa conservar os fluxos dos anteriores. Inspector, Git e outras expansões não são dependências ocultas para concluir essa evolução.

A organização de comandos deve respeitar dois limites: um atalho não amplia a permissão de autoria e não cria uma segunda forma de aplicar edição sem revisão. A otimização deve respeitar outros dois: uma resposta antiga não pode ser aplicada ao documento novo e um recurso invisível pode manter sua sessão sem continuar todo o trabalho de apresentação.

## Preservação do Zappy

A matriz da seção 4 é critério de saída, não uma lista de recursos para reimplementar. A integração atual permanece a referência comportamental. Cobrir ao menos:

- Conversar, investigar e construir, incluindo seleção, parte e jogo inteiro; distinguir contexto consultado de alcance autorizado para editar.
- Notas, decisões, missão e contexto de Pensa, com proveniência e validação de revisões.
- Histórico paginado, alcance da busca, exclusão, referências, sugestões e feedback.
- Entrada por voz e leitura de resposta quando fornecidas pelo host, sem duplicar captura/reprodução ao mudar layout.
- Plano, critérios, validações e evidências; diff; experimentar; aplicar, descartar, desfazer e recuperar gravação.
- Retomada de pedido e job, cancelamento, retorno tardio e consulta de estado sem nova geração.
- Franquia, fonte de consumo e saldo desconhecido; separação entre contas, projetos, instâncias e modos.

Oportunidades de melhoria ficam na clareza do contexto, acesso às ações e custo de apresentação. Nenhuma delas autoriza remover uma capacidade, enfraquecer a revisão ou aumentar silenciosamente o consumo de IA.

## Decisões que dependem do lote de evidência

Não há motivo para inventar números de desempenho a partir de leitura estática. Permanecem decisões de engenharia com responsável, momento e critério claros:

| Decisão | Quando e como fechar | Condição de avanço |
| --- | --- | --- |
| Hardware de referência, ruído e budgets de abertura fria/memória/concorrência | Lote 0, responsável por performance, executando as fixtures e registrando ambiente/dados | Valores publicados antes da implementação funcional; acima do limite exige correção ou recorte explícito |
| Necessidade de worker adicional de busca | Lote 0/1, perfil da disputa com linguagem e custo das cópias | Adotar apenas com ganho medido e descarte/isolamento verificados |
| Quantidade de virtualização/cache | Lote 1, medir lista/histórico/diff nos portes previstos | Responsividade sem perda de acessibilidade, seleção, áudio ou estado |
| Combinação suportada de Node/scripts por kit | Inventariar no lote 0; comprovar no lote 4 | Instrução gerada corresponde ao manifesto; execução externa reproduzida |

As metas propostas de latência não são benchmarks obtidos. O teste isolado de CPU/frame também não representa promessa universal de FPS. Testes automatizados de interface não substituem a avaliação de transferência com alunos elegíveis.

## Achados adicionais da revisão 3

| ID | Prioridade | Evidência/lacuna | Tratamento no desenho |
| --- | --- | --- | --- |
| R17 | Alta | [sourceExport](../../packages/studio/src/export/sourceExport.ts) já gera ZIP para VS Code; [Topbar](../../packages/studio/src/components/layout/Topbar.tsx) já o oferece; há [prova de export dos kits](../../packages/studio/scripts/verify-pro-grid-export.ts) | Corrigida a descrição do estado atual; ampliar instrução por manifesto, avisos e cobertura, sem novo pipeline |
| R18 | Alta | [Host Pro](../../packages/member-shell/src/components/studio/studio-pro-editor.tsx) exige runtime local; [adapter remoto](../../packages/studio/src/studio/pro-runtime.tsx) atende outros hosts; tutor e terminal são opcionais | Seção 8.1 define matriz concreta; não oferecer capacidade ausente nem inventar fallback |
| R19 | Alta | [WebContainer](../../packages/studio/src/components/terminal/webContainerClient.ts) compartilha FS com posse exclusiva; stores isoladas não significam dois runtimes locais independentes | Preservar disputa/recusa e dono atual; descarte só do que pertence à instância |
| R20 | Alta | [Buffers](../../packages/studio/src/state/pendingEditorEdits.ts), [operações assíncronas](../../packages/studio/src/state/projectOperations.ts) e [sync FS](../../packages/studio/src/modes/pro/proFsSync.ts) possuem responsabilidades diferentes | Seção 8.2 estabelece barreiras, revalidação e captura consistente sem fila paralela, espera infinita ou mudança silenciosa de `getProject` |
| R21 | Alta | Incrementalidade sem regra de versão/ack pode produzir símbolos e diagnósticos antigos; a sessão atual já usa geração/model versions | Preservar e tornar explícita identidade de consulta e dependências; consultar revisão confirmada; não substituir revisão durável por contador local |
| R22 | Alta | “p95 de digitação” não definia evento inicial, apresentação final ou relação com INP | Seção 5.4 define instrumentação, interação pelo navegador e métricas separadas; spinner/handler rápido não comprovam conclusão |
| R23 | Alta | [ZIP](../../packages/studio/src/export/zip.ts) usa `zipSync` apesar da função assíncrona; otimização da tecla pode deslocar custo para save/export | Medir flush, materialização, compressão e cópias; corrigir mecanismo responsável se exceder budget, sem duplicar exportador |
| R24 | Média | [Painel de problemas](../../packages/studio/src/modes/pro/workspace/ProBottomPanel.tsx) calcula hash por diagnóstico, inclusive repetidos do mesmo arquivo | Incluir no perfil; possível cache por arquivo/versão mantendo descarte de resultado obsoleto |
| R25 | Alta | “Sem crescimento de recursos” pode condenar cache compartilhado legítimo ou ignorar memória de workers/iframe | Separar recursos exclusivos/retidos, aquecimento, contadores e bytes; dado indisponível não vira zero |
| R26 | Média | “Excluir segredos” parecia garantia universal mesmo para conteúdo arbitrário escrito pelo aluno | Definir fontes permitidas, preservar barreira de dados da plataforma e informar exclusões; não prometer detector universal nem modificar código silenciosamente |
| R27 | Média | Organização familiar não especificava integração visual, tradução e limites de dependência | Seção 8.4 fixa componentes/tokens/providers existentes, locale e adapters; Studio não depende de rotas/auth do host |
| R28 | Média | Avisos de exportação hoje ficam no console e estados de falha/painel oculto estavam genéricos | Resultado visível na ação; estados aguardando/parcial/falhou; nenhuma lista vazia ou falha de preferência simula sucesso |
| R29 | Alta | Disponibilidade ao abrir menu pode caducar antes da execução | Revalidar identidade/autoria/capacidade ao executar; manter autoridade no serviço/backend |
| R30 | Alta | Lotes citavam testes sem comprovar seleção, dependências compartilhadas ou reversão | Seções 9.1–9.2 ligam dono, entrega e provas existentes; verificar seleção/skips, integrar staging e preservar documento/jobs em reversão |

Estes achados são de precisão e completude da proposta, além de oportunidades estáticas de perfil. Nenhum custo foi quantificado nesta rodada; não classificar R23/R24 como regressões de performance já reproduzidas.

## Checklist da proposta consolidada

- Público avançado, idade, VS Code e Zappy: mantidos, sem redução de capacidades.
- Estado atual versus melhoria: export de fonte e provas existentes corrigidos; recursos entregues não viram backlog novo.
- Fluxos e propriedade: documento, buffer, FS, índice, preferência, sessão e job com responsabilidades explícitas.
- Integração: host local/remoto/mínimo, observação, duas instâncias, tema/locale e isolamento de preview.
- Desempenho: métricas definidas, fixtures versionadas, custos de save/export/linguagem incluídos, executor e regra de aprovação.
- Falhas: storage, quota, rede, worker, recurso ausente e resposta antiga com comportamento previsto.
- Execução: lotes com artefatos de review, testes reaproveitados, comparação com staging e recuperação sem migração implícita.

O lote 0 continua obrigatório para fixar números ainda dependentes do aparelho e de medição: abertura fria, memória, concorrência, inteligência de código, flush e exportação. Isso é um portão documentado, não uma alegação de especificação quantitativa já comprovada.

## Limites da conclusão consolidada

O review fecha as lacunas de direção, responsabilidade, dependência e aceitação identificadas nesta rodada. Não afirma ausência absoluta de problemas no código existente. A proposta está alinhada aos contratos examinados; compatibilidade integral, desempenho e benefício para o aluno só poderão ser comprovados após implementação e validação.

Não foram executados novos builds, testes de produto, inferências pagas ou sessões com alunos nesta revisão documental. Resultados de testes de entregas anteriores não foram reapresentados como validação desta proposta.
