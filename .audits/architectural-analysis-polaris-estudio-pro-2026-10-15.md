# Análise técnica comparativa: Polaris e Estúdio Pro

Data: 15/10/2026. Objetivo: fundamentar a [proposta de melhorias do Pro](../docs/plans/2026-10-15-polaris-estudio-pro-proposta.md).

## Escopo e método

Inventário do Polaris; leitura dos fluxos de editor, assistência, persistência, preview, jobs e GitHub; comparação com os módulos correspondentes do Estúdio Pro. Busca de chamadas e contratos para distinguir recursos existentes de oportunidades. Reprodução em memória de `buildFileTree`, importada do repositório original com Bun. Consulta de documentação oficial para as alternativas técnicas.

Inventário novo: 196 arquivos; 174 arquivos `.ts`, `.tsx`, `.js` ou `.jsx` fora de `_generated`; nenhum arquivo de teste convencional localizado e nenhum arquivo LICENSE/COPYING. Arquivos `.mjs` não entram nessa contagem de fontes. A ausência de testes foi apurada por diretórios `test`, `tests`, `__tests__`, `e2e` e sufixos `.test.*`/`.spec.*`, não por uma busca vaga pela palavra “spec”.

Não se trata de auditoria exaustiva de todos os exports, nem de certificação operacional ou de segurança. Não foram contadas linhas “removíveis” nem classificados componentes genéricos como mortos apenas pela ausência de imports. Serviços externos e UI não foram executados. Relatórios já presentes em `.audits/polaris-2026-10-15` foram consultados como contexto; a reprodução descrita abaixo foi executada novamente nesta análise.

## Constatações no Polaris

Os caminhos nesta seção são relativos a `C:/Users/tocha/Downloads/polaris-main/polaris-main`.

### 1. A documentação subestima o que está implementado

**Confiança alta, leitura direta.** `README.md:204` declara ausência de agente que modifica arquivos, cancelamento, conversas anteriores, preview e GitHub. Há implementações em `src/features/conversations/inngest/process-message.ts:29`, `src/features/preview/hooks/use-webcontainer.ts`, nas rotas de cancelamento e nas pastas de GitHub. É necessário orientar a avaliação pelo código.

### 2. Interações úteis e relativamente isoladas

**Confiança alta, leitura direta.** Edição contextual: `src/features/editor/extensions/quick-edit/index.ts:178`. Sugestão em linha: `src/features/editor/extensions/suggestion/index.ts:200`. Abas temporárias/fixadas: `src/features/editor/store/use-editor-store.ts`; cliques correspondentes em `src/features/projects/components/file-explorer/tree.tsx:111`. Busca de projetos: `src/features/projects/components/projects-command-dialog.tsx:40`.

Esses fluxos são boas referências para implementar os comportamentos no Monaco e nos stores do Pro. Não exigem portar Convex, Clerk ou o editor CodeMirror.

### 3. A montagem da árvore depende da ordem dos registros

**Confirmado por execução isolada.** `src/features/preview/utils/file-tree.ts:38` atribui uma pasta vazia mesmo quando um filho anterior já criou essa pasta. Testados os mesmos dois registros em ordens opostas:

```json
{
  "parentFirstKeepsChild": true,
  "childFirstKeepsChild": false,
  "binaryIncluded": false
}
```

O teste chamou a função original com uma pasta `src`, um filho `main.ts` e um arquivo `sprite.png` representado por `storageId`. O terceiro resultado decorre do filtro em `file-tree.ts:39`: esse caminho não monta binários. O teste prova o comportamento da função com essas entradas; não mede a frequência com que uma consulta real produz a ordem problemática.

O sync em `use-webcontainer.ts` escreve arquivos de texto existentes, ignora conteúdo vazio e não reconcilia remoções nesse efeito. Para o Pro, manter a reconciliação e o tratamento de materiais já próprios do produto.

### 4. O autosave tem uma janela de perda ao trocar de arquivo

**Confiança alta na leitura; não reproduzido em browser.** Em `src/features/editor/components/editor-view.tsx:13`, a gravação é adiada 1.500 ms. O cleanup em `:28` cancela o timer ao trocar a aba/desmontar sem descarregar a edição pendente. O novo editor é montado por ID do arquivo. Consequência inferida: trocar de arquivo antes da gravação pode perder o conteúdo digitado.

Além disso, `code-editor.tsx:37` usa `initialValue` somente na montagem e não sincroniza alterações remotas no documento já aberto. Uma atualização do agente no mesmo ID pode deixar texto exibido e persistido divergentes. Não importar esse ciclo de sincronização para o Pro.

### 5. A edição rápida não vincula a resposta à revisão original

**Confiança alta na leitura; concorrência não reproduzida em browser.** `quick-edit/index.ts:8` guarda a instância do editor em variável de módulo. Em `:98`, captura o intervalo; depois da chamada assíncrona, em `:120`, escreve nesse intervalo usando a referência global atual. Não há conferência equivalente ao hash e à versão do documento do Pro.

O módulo de sugestões também compartilha timer/controlador em variáveis globais e envia o documento inteiro (`suggestion/index.ts:54`, `:82`). É referência de interação, mas o Pro deve manter estado por instância e descartar respostas obsoletas. Não atribuir a esse código isolamento adequado para múltiplos editores.

### 6. Há uma lacuna de autorização no caminho de mensagens

**Confiança alta na leitura do caminho; sem exploração de serviço.** `src/app/api/messages/route.ts:17` exige usuário autenticado, mas usa `conversationId` recebido para consultar `api.system.getConversationById`. A query em `convex/system.ts:17` valida apenas uma chave interna e retorna a conversa, sem comparar o proprietário do projeto com o usuário. A rota utiliza o projeto encontrado para cancelar mensagens e criar novos registros.

As operações normais de arquivos em `convex/files.ts` verificam proprietário; portanto, o achado é específico ao caminho privilegiado analisado, não uma afirmação de ausência global de autorização. A ferramenta `update-file.ts` e `convex/system.ts:188` também não vinculam o ID de arquivo ao projeto do job nessa fronteira.

Implicação para adoção: preservar autorização de ator/perfil/projeto em cada operação e o escopo imutável do job do Sistema Zero. Nenhuma requisição foi enviada a um backend Polaris.

### 7. O agente escreve diretamente nos arquivos persistidos

**Confiança alta.** `src/features/conversations/inngest/tools/update-file.ts` chama a mutation de atualização de arquivo. O fluxo principal executa uma rede de agente com até vinte iterações (`process-message.ts:175`) e grava a resposta ao terminar (`:217`). Não foi localizado nesse fluxo um equivalente ao pipeline Pro de revisão base → proposta → validação → experiência → aplicação.

O processamento é disparado por Inngest e tem cancelamento, mas isso não comprova execução exatamente uma vez de todos os efeitos. A chamada principal `network.run(message)` merece validação própria antes de se atribuir a todo o laço as garantias de persistência/repetição dos steps. A proposta aproveita o conceito de execução no servidor, não transfere garantias não demonstradas.

### 8. Componentes de IA não comprovam funcionalidade integrada

**Confiança alta sobre o fluxo lido.** `conversation-sidebar.tsx:173` mostra `Thinking...` durante o processamento e depois a resposta persistida. Não foi encontrada ali uma trilha detalhada de chamadas e validações. A propriedade visual `status="streaming"` não demonstra transmissão incremental do conteúdo. O terminal em `preview-terminal.tsx` usa `disableStdin: true`.

### 9. GitHub amplia interoperabilidade, mas não equivale a Git completo

**Confiança alta.** Importação em `src/features/projects/inngest/import-github-repo.ts`; exportação em `export-to-github.ts`. O import tenta `main` e `master`; o export cria um repositório novo. Não atribuir seleção arbitrária de branch, gerenciamento de conflitos ou sincronização bidirecional a esses fluxos. A importação de binários existe, enquanto a montagem local citada no achado 3 os ignora.

## Evidências correspondentes no Estúdio Pro

| Área | Evidência | Conclusão |
| --- | --- | --- |
| Seleção contextual | [ProCodeEditor](../packages/studio/src/modes/pro/ProCodeEditor.tsx), ações a partir da linha 121 | Explicar e investigar já existem; alterar diretamente é uma nova entrada para o construtor |
| Escopo da alteração | [pro-assistance](../packages/core/src/studio/pro-assistance.ts) | Seleção, parte e jogo já fazem parte do contrato |
| Revisão e aplicação | [ProBuilderPanel](../packages/studio/src/components/tutor/ProBuilderPanel.tsx), diff 881, experimentar 904, aplicar 930 | Melhorar apresentação, preservando capacidades existentes |
| Espaço do diff | [ProRevisionDiff](../packages/studio/src/components/tutor/ProRevisionDiff.tsx) | Modelos plaintext, inline e altura fixa; há espaço concreto para melhorar a leitura |
| Continuidade | `ProBuilderPanel.tsx:225` e [rota](../packages/member-shell/src/routes/studio-builder.ts), linha 209 | O navegador solicita avanços e a rota repassa o sinal da requisição |
| Persistência do job | [contrato](../packages/core/src/studio/pro-builder.ts), [serviço](../packages/members/src/application/studio-pro/studio-builder.service.ts), [repositório](../packages/members/src/infrastructure/persistence/drizzle/studio-builder.repository.ts) | Já existem checkpoints/leases; a melhoria é execução independente da interface |
| Orçamento/retenção | `pro-builder.ts:8` | Três chamadas de modelo, três validações, sete dias de retenção e dez registros por conta |
| Contexto e ferramentas | [studio-builder-tools](../packages/member-shell/src/server/studio-builder-tools.ts) | Consultas limitadas de arquivos, busca, materiais e dependências; hashes e propostas estruturadas |
| Histórico de conversa | [ZappyPanel](../packages/studio/src/components/tutor/ZappyPanel.tsx), linhas 204 e 451 | Histórico e paginação já existem; assuntos distintos seriam uma evolução |
| Estado da área de trabalho | [ProCodeMode](../packages/studio/src/modes/pro/ProCodeMode.tsx), linha 58; [ProFileTree](../packages/studio/src/components/code/ProFileTree.tsx) | Abas e pastas recolhidas são estado dos componentes nos caminhos lidos |
| Runtime/validação | [Worker](../packages/studio-runtime/src/index.ts), checagens a partir da linha 299 | Tipos, build, playtest e captura estão implementados |
| Preview remoto | [ProPreview](../packages/studio/src/modes/pro/ProPreview.tsx) e [host completo](../packages/member-shell/src/components/studio/studio-pro-editor.tsx) | A capacidade remota existe no pacote, mas o host completo bloqueia por capacidade WebContainer e não passa runtime remoto |
| Portabilidade | [exportProject](../packages/studio/src/export/exportProject.ts) | ZIP já existe; GitHub é expansão, não criação de exportação do zero |

## Decisões sugeridas

1. Implementar as interações do Polaris sobre Monaco, stores por instância e adapters atuais.
2. Priorizar edição contextual, busca de arquivos e revisão ampliada.
3. Acrescentar coordenação durável no servidor preservando o estado de domínio existente.
4. Separar conversas duradouras de jobs operacionais com retenção curta.
5. Adiar GitHub bidirecional, autocomplete automático e autoria móvel até haver recorte e demanda claros.

## Verificação e limites

- Reprodução executada com Bun sobre a função original, sem banco, rede ou credenciais: três resultados registrados acima.
- Referências de arquivos e símbolos conferidas no código local.
- Não foram executados build/lint nem suítes dos produtos; não houve mudança em código executável.
- Autorização, autosave e concorrência foram avaliados por leitura; seus impactos foram explicitamente classificados como inferências onde aplicável.
- Não foram usados dados de uso, métricas reais de custo ou testes com alunos. Priorização é julgamento de produto apoiado na arquitetura observada.

Documentação consultada: [Cloudflare Workflows](https://developers.cloudflare.com/workflows/get-started/guide/), para persistência e retomada por etapa; [Monaco InlineCompletionsProvider](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.languages.InlineCompletionsProvider.html), para sugestões em linha; [WebContainer headers](https://webcontainers.io/guides/configuring-headers), para os requisitos de isolamento de origem. As escolhas de arquitetura na proposta são recomendações desta análise, não prescrições dessas fontes.
