# Studio Pro — segunda revisão integral

Data: 16/10/2026. Base: staging local `40deaa90b`, limpa no início da revisão.
Branch isolada: `fix/studio-pro-evolution-review`. Nenhum arquivo local da
worktree original foi modificado ou copiado para esta entrega.

## Escopo e método

Releitura do diff completo da evolução desde `b030c443e`, incluindo os ajustes
do primeiro full review e os contratos chamados pelas novas interfaces:

- Documento, buffers Monaco, remapeamento/recuperação de arquivos e preferências.
- Abertura rápida, comandos por instância, busca, guias e navegação por símbolos.
- Diagnósticos, hashes de fonte e preparação de contexto para o Zappy.
- Materiais canônicos, paginação, exemplos revisados e busca de usos literais.
- Flush, escopo, snapshots, manifesto/lockfiles, ZIP e ciclo de vida do worker.
- Carregamento lazy de editor/preview/atividades, patch Monaco e budgets.
- Integrações de acesso, autoria/observação, builder e hosts Sistema Zero.

Os defeitos foram reproduzidos antes da correção. Testes adicionais controlam
promessas fora de ordem, disponibilidade da sessão, troca A → B → A e falhas
reais de rede no build de produção. Não foram introduzidos atrasos de correção,
silenciamento de erros, novos serviços ou aumentos dos limites de desempenho.

## Achados corrigidos

### 1. Símbolos não reagiam à disponibilidade da linguagem — P2

O painel dependia de um ref estável. Se fosse aberto antes do carregamento, ou
se o worker fosse reiniciado, a troca de `ref.current` não disparava a consulta.
A sessão agora chega à interface como estado reativo, mantendo o ref operacional
usado pelas alterações revisadas. Resultados também identificam sua sessão.

Provas: reprodução unitária inicialmente vazia; E2E com módulo atrasado;
E2E com falha e reinício de worker mantendo o painel aberto. A consulta continua
restrita ao arquivo ativo e não é refeita por edição de outro arquivo.

### 2. Referências aceitavam conclusão de pedidos antigos — P2

Duas buscas no mesmo documento podiam terminar fora de ordem. A resposta antiga
apagava a lista mais recente; erros atrasados também apareciam após navegação,
e uma busca pendente podia reabrir a lista já fechada.

Cada pedido agora tem identidade e escopo de documento/sessão. Sucesso e erro
verificam o mesmo dono; fechar a lista ou desmontar o painel invalida o pedido.
Testes cobrem ordem invertida, A → B → A, erro antigo e fechamento durante busca.

### 3. Cancelamento do download só era conferido depois do segundo flush — P2

Após a espera pelo filesystem, um download já cancelado ainda chamava os
buffers registrados naquele momento. Uma mudança durante o primeiro flush
também permitia iniciar a próxima etapa indevidamente.

Agora cada fronteira revalida cancelamento, projeto, lineage, escopo e adapter
antes de prosseguir. Não se interrompe à força um escritor que já está em voo.
Os testes exigem que as fases seguintes não sejam chamadas e preservam o caso
normal: buffer → filesystem → buffer → snapshot.

### 4. Falha ao carregar a linguagem deixava Problemas pendente — P2

A rejeição do import atualizava somente o aviso no editor. Problemas continuava
em “Analisando…”. O erro de inicialização agora publica o estado `error` e uma
nova inicialização publica `pending`.

O teste de recuperação também confirmou que repetir o import rejeitado não
recupera esse módulo na mesma página. Nesse caso, a interface explica que é
preciso salvar antes de recarregar; a edição permanece disponível e não há
recarga automática. Falhas do worker continuam oferecendo “Reiniciar análise”.
Os E2Es exigem diagnósticos reais após recarga e símbolos reais após reinício,
evitando aceitar apenas o desaparecimento transitório de uma mensagem.

## Preservação e desempenho

Não houve alteração no documento persistido, nos gates de acesso, no escritor
único do filesystem ou nos contratos de revisão/receipt. Zappy mantém conversa,
seleção, investigação, construção, revisão e aplicação explícita. Nenhuma
consulta de IA nova é disparada. O patch de ciclo de vida Monaco permanece
versionado; seu fluxo de paleta/localizar após fechar diff continua coberto.

Benchmark browser desta rodada, 78 arquivos e serviços controlados:

- Abertura p95: **1.057,33 ms**.
- Tecla até segundo frame p95: **34,82 ms**.
- Tecla com conversa Zappy aberta p95: **32,19 ms**.
- Alternância de layout p95: **168,87 ms**.
- ZIP: um worker descartável, com preservação dos buffers e cancelamento.

Os dois testes passaram nos mesmos limites anteriores. Os valores são medições
de laboratório; não equivalem a INP nem a testes físicos em computador de 8 GB.
Dados brutos em `round-2-browser-performance.json`.

O modo Código/Pro permanece em **17 arquivos / 443.393 B gzip** na medição de
entrada Vite, abaixo dos limites existentes. O grafo completo das cinco entradas
está em `round-2-bundle.json`; a medição não soma chunks compartilhados.

## Validação final antes da integração

- `bun test ./src`: **9.109 testes / 602 arquivos, zero falhas**, novamente
  executados após o último ajuste de produto (214,37 s).
- `bunx playwright test --config e2e/pro-workspace.config.ts`: **16 cenários**,
  incluindo os três novos casos de ciclo de vida e os fluxos de Zappy/builder.
- Configuração `e2e/pro-workspace-performance.config.ts`: **2 cenários**, aprovados.
- `bunx tsc --noEmit --pretty false`: exit 0, com heap de 8 GB.
- Biome sobre os **65 arquivos** de código/configuração alterados desde a base
  da evolução: sem erros ou ajustes. `git diff --check`: sem erros de whitespace.
- Member-shell: todos os `tests/studio-*.test.ts(x)`, **247 testes / 21 arquivos**.
- Kids: `tests/studio-*.test.ts(x)`, `pensa-studio-link`, `pensa-task-handoff` e
  `use-studio-task-session`, **99 testes / 13 arquivos** em execução combinada.
- `check:pro-kits` e `check:pro-typescript-libs`: fontes/locks dos kits e as
  **99 bibliotecas TypeScript 5.9.3**, com licença, conferidos.
- Os cinco budgets de entrada Vite passaram, sem aumentar limites.

Os quatro grupos de achados desta rodada foram tratados. A revisão final do
diff não deixou achados locais pendentes. Durante o fechamento, staging avançou
para `a524316ba`, com o merge das ofertas da Comunidade (`dce301c42`). O delta foi
conferido: apenas funil e documentação de marketing, sem mudanças no Studio,
hosts ou dependências. A integração preserva esse avanço, com verificação da
árvore de produto após o merge. Não envolve push ou deploy.

## Limites da revisão

Não houve deploy, push, inferência paga, ensaio com alunos ou teste no host Kids
autenticado. Os E2Es usam adapters controlados; os testes dos hosts verificam
suas integrações em ambiente de teste. As instalações independentes dos cinco
tipos de exportação pertencem à rodada anterior e não são apresentadas como
novas execuções. O empacotamento e o fluxo de download foram novamente testados.

O build ainda informa chunks maiores que 500 KB e o import de capa compartilhado
com ShareDialog. Esses avisos já existiam na base; os budgets verificáveis são
mantidos e não se atribui ao host Next a configuração de chunks do Vite local.
