# Segunda revisão completa — Studio Pro

16/10/2026. Revisão solicitada após a entrega. Implementação examinada: commit `77c7e43b7`, seus testes e integrações, sobre a staging local atualizada `b37fc3f72`. Trabalho isolado na branch `fix/studio-workspace-review`.

## Achados e correções

| Prioridade | Problema comprovado | Correção e prova |
| --- | --- | --- |
| P2 | Uma indisponibilidade temporária bloqueava novas propostas até desmontar o construtor. Fechar/reabrir o painel agora conserva a instância, e `Consultar estado` não repetia a consulta de disponibilidade. | A consulta tem ciclo independente, cancelamento e guardas de projeto/perfil. `Consultar estado` permite refazê-la sem apagar o rascunho, recriar um job ou interferir na consulta já pendente. Teste reproduziu o botão permanentemente desabilitado e passou após a correção. |
| P2 | Renomear a extensão preservava o buffer, mas também a linguagem antiga. Um `.ts` renomeado para `.js` continuava TypeScript; diagnósticos antigos podiam continuar num `.txt`. | A operação atualiza a linguagem pelo caminho novo e limpa os marcadores antigos, mantendo a identidade do model. Teste Chromium reproduziu TypeScript em `.js`; agora comprova TS → JS → texto, recuperação para JS e manutenção do mesmo buffer. |
| P2 | Busca, mapa e referências calculavam linhas considerando somente LF. A busca também convertia o texto para minúsculas antes de calcular a coluna, o que deslocava posições após caracteres como `İ`. | LF, CRLF e CR são reconhecidos. A busca literal ignora caixa diretamente no texto original, com os caracteres especiais escapados; o mapa e as referências compartilham a mesma conversão de posição. Testes comprovam linhas e colunas, incluindo Unicode e busca literal. |
| P3 | A seta para a esquerda numa pasta raiz recolhida podia focalizar uma pasta irmã: `src` era tratado como se seu pai fosse `sr`. | A navegação para o pai exige um separador de caminho. Teste reproduziu foco em `sr` e agora conserva o foco em `src`. |

Todos os achados acima tiveram reprodução antes da correção. Não foram desativados testes, relaxadas asserções ou introduzidas flags de compatibilidade.

## Escopo conferido

- Workspace: preferências por projeto/perfil, restauração assíncrona, abas temporárias, busca, árvore, layout contínuo, painéis inferiores e navegação por teclado. Inspeção das capturas desktop e estreita produzidas pelos testes.
- Monaco: buffers e caminhos lógicos, refatoração semântica, imports fechados, diagnósticos, descarte dos modelos de comparação e integração com desfazer/recuperar.
- Documento e materiais: revisão da base, proteção contra troca de projeto/perfil/adapter, observação sem autoria, aplicação atômica, recibos pendentes, recuperação de binários/capa e limites de histórico. Preferências continuam separadas do documento exportável.
- Zappy: envio explícito, preservação do rascunho, alcance por linhas, versão/hash da proposta, polling, cancelamento, histórico e recuperação. A restrição de alcance permanece validada no Core, executor, Members, BFF e aplicação local.
- Execução durável: fila Postgres, leases, concorrência, prazo, reinício, encerramento, autenticação de serviço, proxy Kids/Gateway e fechamento financeiro sem outra inferência.
- Integrações: editor clássico, conversão, aulas, Pensa, materiais Pinta/Molda, exportação/publicação e isolamento entre instâncias, nas suítes afetadas e contratos existentes.

Esta revisão não muda schema, serviços externos ou o escopo aprovado do produto. GitHub, colaboração simultânea, IA em linha e autoria completa em celular continuam fora desta entrega.

## Verificação

| Verificação | Resultado |
| --- | --- |
| Studio: `bun test src/components src/core src/modes src/monaco src/state src/studio src/export src/preview` | 1.439 passaram, 8.616 asserções, 160 arquivos |
| member-shell: testes `studio*.test.ts(x)` e `*zappy*.test.ts` | 273 passaram, 1.147 asserções, 23 arquivos |
| Core: `bun test src/studio` | 10 passaram, 32 asserções |
| Members: ledger, conta e builder em Postgres dedicado + coordenador | 27 passaram, 116 asserções |
| Gateway: configuração e ambiente | 63 passaram, 218 asserções |
| Kids: vocabulário e proxy do executor | 17 passaram, 100 asserções |
| Chromium: `bunx playwright test --config e2e/pro-workspace.config.ts` | 8 passaram; builds Vite de produção, Monaco real e StrictMode |
| Saída e reabertura de projeto, incluídas na suíte Studio | Chromium e WebKit passaram |
| Typecheck | Core, Studio, member-shell, Members, Gateway e Community Kids passaram |
| Biome | 10 arquivos alterados passaram |
| Diff | `git diff --check` passou |

Total: 1.829 testes nas áreas revisadas e 8 cenários de navegador. O teste novo da árvore também passou novamente após corrigir uma opção de tipagem do Testing Library detectada pelo compilador. Logs locais ficam em `.cache` e não entram no commit.

A primeira execução ampla teve um timeout no teste das declarações reais do Three.js (6,36 s para um teto de 5 s), durante outras verificações. O arquivo passou isoladamente (teste em 1,47 s) e a suíte ampla passou na repetição completa (63,85 s). Nenhum timeout ou asserção foi alterado. Permanecem os avisos de tamanho dos chunks Monaco/imports e avisos `act` de testes existentes; os cenários de navegador revisados não registraram erros de página.

## Conclusão

Não restam achados identificados nesta revisão sem correção. O diff final foi conferido novamente após os testes. A staging local permaneceu em `b37fc3f72` durante a validação e estava limpa antes da integração. As alterações pendentes do checkout original não foram incluídas. O PostgreSQL dedicado da revisão foi encerrado após os testes.

## Limites da evidência

Os testes de IA usam respostas controladas; não houve chamada paga de modelo nem homologação com crianças. A configuração URL/segredo e a migration de execução durável continuam requisitos de implantação descritos no [ADR](../../docs/architecture/studio-pro-builder-coordinator.md). Esta tarefa faz somente commit e merge local, sem push ou deploy.
