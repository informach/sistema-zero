# Review da proposta do Estúdio Pro

Data: 15/10/2026. Documento revisado: [proposta v2](2026-10-15-polaris-estudio-pro-proposta.md).

## Parecer

A primeira proposta tinha uma direção arquitetural adequada — evoluir o Pro sobre a base existente — mas ainda não era suficiente para orientar a implementação de um editor para crianças de 9 a 14 anos. Faltavam decisões sobre organização, aprendizagem, materiais, operações de arquivos, estado dos painéis e diferenças entre os hosts do Studio.

A versão 2 corrige essas lacunas de desenho, reordena as entregas e identifica os contratos que precisam evoluir. Não certifica compatibilidade operacional: código, testes de integração e validação com alunos ainda não foram realizados para os recursos propostos.

## Achados e correções

Severidade descreve o risco de implementar a proposta original literalmente; não significa que todos os pontos sejam defeitos atuais do produto.

| ID | Severidade | Lacuna identificada | Evidência/implicação | Correção na v2 |
| --- | --- | --- | --- | --- |
| R01 | Alta | IA ocupava quase toda a prioridade | Navegação, compreensão e recuperação são necessárias também sem IA | Objetivos encontrar/experimentar/aprender; editor e materiais nas primeiras entregas, seções 1–3 e 12 |
| R02 | Alta | Público de 9–14 anos não orientava decisões concretas | Idade não determina experiência; presets obrigatórios podem limitar autonomia | Ajuda progressiva opcional, linguagem concreta, preservação de código real e avaliação por experiência, seções 2 e 13 |
| R03 | Alta | Três disposições eram propostas sem integração com os painéis existentes | Shell, guia, ActivityPanel, Zappy e modos de autoria já disputam espaço | Uma área de trabalho, uma região auxiliar e revisão temporária; composição e foco explícitos, seção 4 |
| R04 | Alta | Reorganização poderia desmontar editor/runtime/construtor | O painel mantém controlador de execução e cleanup; layout estreito possui transições com remontagem | Separar controle de apresentação, uma instância por Studio e teste de continuidade, seções 4 e 9 |
| R05 | Alta | Renomear/mover não previa atualização de referências | Reprodução confirmou que `renameProNode` muda caminho e mantém import antigo | Serviço semântico, revisão documental, hashes, sincronização e undo; arraste depende dessa base, seção 5 |
| R06 | Alta | Refatoração parecia apenas uma melhoria de interface | Protocolo atual do worker não oferece símbolos, referências ou renomeação | Estender protocolo, serviço, cliente e sessão; explicitar cobertura de JS/TS e limites de outros formatos, seções 5–6 |
| R07 | Alta | Organização de materiais não definia fonte de verdade | `Project.assets`, manifesto e projeção no runtime já possuem responsabilidades próprias | Uma biblioteca e um pipeline; sem duplicar binários na árvore textual, seções 5 e 7 |
| R08 | Alta | “Editar seleção” podia sugerir precisão de caracteres inexistente | Tutor usa colunas; construtor v1 usa linhas/hash e parser de chaves estritas | Mostrar linhas reais; colunas e aceite de ampliação exigem contratos versionados, seção 8 |
| R09 | Alta | Exclusão visual de contexto podia prometer privacidade não aplicada | Ferramentas podem ter acesso ao snapshot além dos anexos | Distinguir anexo e leitura; exclusão só quando aplicada no servidor e ferramentas, seção 8 |
| R10 | Alta | Hosts tratados como se tivessem capacidades uniformes | Tutor e taskSession são de StudioEditor; StudioLesson é distinto; host Pro tem gate anterior à montagem | Matriz por host, observer/handoff e runtime; não remover gates ou importar backend no Studio, seção 9 |
| R11 | Média | “Persistir layout” era amplo e impreciso | Já há settings e auto-save de certas proporções; abas e árvore têm estado local | Schema por escopo/projeto/superfície, instância viva isolada e comportamento none/custom, seção 9 |
| R12 | Alta | Persistência era confundível com transação | Flush espera escritores; não torna memória, IndexedDB, nuvem e runtime atomicamente consistentes | Separar aplicação documental, recibo durável e sincronização; recuperar falhas, seções 5, 8 e 9 |
| R13 | Alta | Executor durável estava descrito sem fechar entrega/retry/ownership | Job persistido não garante entrega à fila; retry não garante cobrança única | Agendamento recuperável, reconciliação, leases, autorização de serviço, cancelamento e migração, seção 10 |
| R14 | Média | Novas threads e GitHub tinham prioridade excessiva | História atual é paginada por projeto; thread exige contrato e migração; GitHub acrescenta conceitos | Melhorar histórico primeiro e separar iniciativas posteriores, seções 8 e 11 |
| R15 | Média | Validação tinha foco em fluxos de IA e poucas regressões | Mudanças atravessam arquivos, material, hosts, isolamento e acessibilidade | Matriz de 18 áreas, cenários reais e pesquisa com diferentes níveis de experiência, seção 13 |

## Evidências mais importantes

### Renomeação reproduzida

Foi chamada a função original de [proTree.ts](../../packages/studio/src/state/proTree.ts), em memória, com Bun. A árvore continha `src/config.ts` e `src/main.ts`, que importava `./config`. Após renomear para `src/rules.ts`, o resultado preservou:

```json
{
  "src/main.ts": {
    "kind": "file",
    "content": "import { speed } from \"./config\";\nconsole.log(speed);"
  },
  "src/rules.ts": {
    "kind": "file",
    "content": "export const speed = 3;"
  }
}
```

O antigo caminho saiu da árvore e o import continuou igual. [ProFileTree](../../packages/studio/src/components/code/ProFileTree.tsx) chama a action do store; [projectStore](../../packages/studio/src/state/projectStore.ts) delega para essa função sem reescrever imports. A reprodução prova esse caso isolado; não mede sua frequência em uso nem substitui um teste completo da UI.

### Serviço semântico e seleção

O [protocolo do worker](../../packages/studio/src/monaco/pro/protocol.ts) expõe diagnósticos, completions, hover, definições e formatação. A declaração TypeScript instalada contém `getNavigationTree`, `findRenameLocations` e `getEditsForFileRename`, mas a existência dessas APIs não significa integração pronta no Monaco do Pro.

O [contrato do tutor](../../packages/core/src/studio/pro-tutor.ts) inclui colunas e versão. O [contrato de assistência](../../packages/core/src/studio/pro-assistance.ts) define seleção por `path`, `startLine`, `endLine` e `sourceHash`, com validação estrita de chaves. Adicionar colunas somente na interface quebraria a compatibilidade ou não teria o efeito prometido.

### Layout, materiais e hosts

O [Shell](../../packages/studio/src/components/layout/Shell.tsx) já compõe painéis e usa uma chave de auto-save derivada de `useId`; isso não constitui por si só retomada estável de todo workspace por perfil/projeto. O [construtor](../../packages/studio/src/components/tutor/ProBuilderPanel.tsx) guarda `AbortController` e coordena `advance`; movê-lo entre árvores de componentes exige preservar seu ciclo de vida.

[proAssetPaths](../../packages/studio/src/core/proAssetPaths.ts) define `public/studio-assets`; [proAssets](../../packages/studio/src/core/proAssets.ts) deriva o bundle dos materiais. Uma nova pasta de assets gerida separadamente entraria em conflito com esse contrato.

Os [tipos públicos](../../packages/studio/src/studio/types.ts) distinguem StudioEditor de StudioLesson, além de persistência, acesso e callbacks. O [host Pro](../../packages/member-shell/src/components/studio/studio-pro-editor.tsx) verifica capacidade antes de montar o editor. A revisão mantém essas fronteiras.

### Revisões e execução

O [diff](../../packages/studio/src/components/tutor/ProRevisionDiff.tsx) usa modelos `plaintext` e altura fixa `h-72`, fundamentando a melhoria de legibilidade. A [aplicação de revisão](../../packages/studio/src/state/proRevision.ts) e a [persistência de revisão](../../packages/studio/src/state/projectStorageRevision.ts) já fornecem primitivas de consistência que devem sustentar as novas interações.

Os [limites do construtor](../../packages/core/src/studio/pro-builder.ts) confirmam três chamadas de IA, três validações, prazo de cinco minutos, lease de 150 segundos e retenção de sete dias/até dez jobs por conta. A proposta não presume que um executor durável aumente esses limites automaticamente.

## O que mudou na recomendação

O primeiro recorte passa a ser busca/navegação, orientação dos arquivos nos kits, materiais acessíveis e problemas acionáveis. Corrigir a renomeação é pré-condição para promover mover/arrastar. Em seguida entram retomada do workspace, revisão confortável e pedido contextual, preservando o estado do Zappy. Execução independente da aba fica em uma entrega própria.

As melhorias aproveitam Monaco e os serviços atuais; mantêm os caminhos reais dos projetos; não criam uma segunda biblioteca, um segundo sistema de tarefas ou outro backend de jobs. A nova organização interna separa apresentação, comandos, serviço semântico e operações documentais sem impor uma reorganização cosmética de todo o pacote.

## Validação desta revisão

- Leitura dos contratos e chamadas citados, incluindo limites efetivos e diferenças entre os hosts.
- Reprodução isolada da renomeação na função original, sem alterar fontes ou projetos do usuário.
- Revisão cruzada entre proposta, dependências, etapas e critérios de aceite.
- Conferência automatizada de links locais, estrutura das seções e integridade textual dos documentos.

Não foram executados build, suites de aplicação, serviços externos ou QA de navegador para os novos recursos, pois esta entrega altera somente documentação. A matriz de testes da proposta é trabalho de implementação futuro. As referências externas orientam decisões; não comprovam eficácia pedagógica deste produto.

## Pendências delimitadas para implementação

Antes de cada entrega correspondente, detalhar e verificar a política proposta de undo estrutural e remapeamento de modelos, a cobertura TS/JS da refatoração, a API opcional de preferências para embeds e o contrato versionado de aceite de ampliação de escopo. Validar também a escolha do executor e sua autorização de serviço. Essas decisões estão vinculadas a etapas e critérios de saída; não podem ser improvisadas nos componentes.

Também é necessário testar a disposição e a linguagem com crianças. Fonte inicial de 15 px, proporções e densidade de controles são hipóteses de design que devem respeitar escolhas existentes e ser ajustadas pela observação, não conclusões derivadas apenas da idade.
