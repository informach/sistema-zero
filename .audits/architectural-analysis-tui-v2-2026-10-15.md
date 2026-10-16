# Revisão arquitetural V2 — Sistema Zero TUI e cinco referências

Data: 15/10/2026. Escopo: reanálise estática, reprodução isolada de comportamentos e revisão da proposta. Nenhuma implementação do produto foi alterada.

## Veredito

A direção da proposta anterior é coerente: OpenTUI como interface, runtime local próprio, OpenRouter como provedor inicial e clientes oficiais como executores opcionais. Ela ainda não era suficientemente executável. Os principais problemas eram lotes grandes, desempenho tratado tarde, estados de execução pouco discriminados e ausência de uma matriz que ligasse cada capacidade a entrega, falhas e aceite.

Os cinco projetos são referências úteis, mas **a união de seus códigos não constitui um motor profissional de agentes**. Eles têm persistência, autenticação, versões de SDK e premissas de execução diferentes. A integração recomendada compartilha contratos, eventos, política, orçamento, artefatos e recuperação; adapta as capacidades sobre essa base.

Ainda não há evidência de que o produto resultante supere o Claude Code. Há uma hipótese plausível para o trabalho da equipe: diminuir o esforço entre investigar, editar, validar no navegador e operar os serviços do Sistema Zero. A decisão de adoção depende de ensaios comparáveis, com qualidade, tempo, custo e intervenção humana.

## Cobertura e evidência

As revisões locais foram comparadas novamente com `git ls-remote origin HEAD`; todas coincidem com o HEAD remoto consultado nesta revisão.

| Repositório | Commit examinado | Arquivos JS/TS inventariados | Linhas | Observação |
|---|---|---:|---:|---|
| Nightcode | `255883f130d350541e806f2431e7df32369f24bf` | 60 | 4.726 | CLI, servidor e contratos |
| Browser Automation App | `7b7ae9755f239c60f33d1edcefbde0a251a3fb02` | 133 | 10.976 | Inclui 5 arquivos de referência de skills |
| AI Teammates | `de32f461cc9e0ddf4c5087af07c65cf06df7d683` | 267 | 32.021 | Inclui 103 arquivos de referência de skills |
| Sendkit | `e4f47cb77bcd4dddcb1af483ec014e654740ee74` | 9 | 370 | Pacotes core, CLI, MCP e configuração |
| Sandbox | `ac18750e06d7678ca8a215fc61cb91e1e5709b50` | 142 | 19.462 | Inclui 18 arquivos JS do runtime embarcado |

Inventário estrutural: **611 arquivos / 67.555 linhas**, sendo 503 arquivos fora das referências de skills. As diferenças em relação às contagens anteriores vêm da inclusão explícita dessas referências, não de mudanças nos commits. Não foram encontrados testes por nomes/diretórios convencionais nem arquivos convencionais de licença nesses commits. Isso não prova inexistência de testes privados ou de uma autorização separada de uso.

Todos os arquivos JS/TS foram percorridos por AST para imports, exports, tamanho, hashes e diagnóstico sintático. Não apareceram ciclos no grafo estático resolvido. Não se conclui que todo export sem importador seja código morto: Next, Trigger, bibliotecas públicas, seeds e código gerado têm consumidores fora desse grafo. A auditoria anterior do Sandbox já separou componentes UI não alcançados de APIs do runtime consumidas por geração.

Leitura semântica concentrada nos caminhos completos de chat, tools, persistência, workflow, handoff, memória, sandbox, preview, billing, auth e distribuição. Isso é diferente de certificar semanticamente cada linha de UI vendorizada. O TUI local foi confrontado com esses caminhos e com as fronteiras relevantes de marketing-desktop, dev runner, messaging, auth e Studio Runtime; não se trata de uma auditoria de todo o monorepo.

- [Inventário por arquivo](tui-review-v2-2026-10-15/files.csv), [grafo e metadados](tui-review-v2-2026-10-15/structure.json), [script do inventário](tui-review-v2-2026-10-15/inventory.cjs).
- [Seis reproduções adicionais](tui-review-v2-2026-10-15/repro.json), [harness](tui-review-v2-2026-10-15/repro.ts).
- [Oito grupos de evidências Sandbox, executados novamente](sandbox-tui-repro-evidence-2026-10-15.json), [harness Sandbox](repro-sandbox-tui-2026-10-15.ts).
- [Auditoria inicial](architectural-analysis-tui-2026-10-15.md) e [auditoria aprofundada Sandbox](architectural-analysis-sandbox-tui-2026-10-15.md) continuam como evidência complementar; a proposta V2 prevalece para decisões e lotes.

## 1. Nightcode

**Aproveitar:** separação CLI/servidor/shared, identidade das sessões, catálogo de modelos, modos Plan/Build, streaming, apresentação de tools e consumo. A interação de terminal é uma referência direta para finalizar o frontend existente.

**Não transplantar:** servidor obrigatório com Clerk/Polar, armazenamento da conversa inteira em um JSON mutável, pressuposto de Bash/grep no host e execução de tools diretamente acoplada ao callback da UI.

Achados de alta confiança:

1. **Substituição literal incorreta.** `local-tools.ts:143` usa `String.replace(oldString, newString)`. O segundo argumento interpreta `$&` e outras sequências. A reprodução pede `hello $&` e obtém `hello WORLD`. O tool reporta sucesso. O futuro patch engine precisa preservar literalmente o conteúdo, além de validar hash/base e tamanho final.
2. **Truncamento não limita memória.** `readFile` lê o arquivo todo antes de cortar; grep/bash capturam toda saída antes de limitar o resultado. A reprodução entrega 2.000.000 bytes ao leitor para retornar 10.000 caracteres. Isso prova a ordem das operações, não mede o pico de RSS do aplicativo.
3. **Parar chat não demonstra parar tools.** `use-chat.ts:68–71` dispara execução assíncrona sem sinal de cancelamento. Matar apenas o processo pai não prova encerramento da árvore. Nosso supervisor precisa de ownership, cancelamento transitivo e estado de drenagem.
4. **Persistência e escalabilidade limitadas.** O servidor recompõe/valida o histórico e salva o JSON completo no fim; abortos e concorrência requerem tratamento próprio. A listagem não tem paginação. O cliente envia poucas mensagens recentes, portanto seria incorreto afirmar que ele retransmite todo histórico em cada rodada; o processamento completo acontece no servidor.
5. **Interface cresce com o histórico.** A tela monta a lista de mensagens inteira. Isso identifica uma oportunidade de paginação/virtualização, mas não constitui benchmark do renderer OpenTUI.
6. **Fronteira de filesystem insuficiente para isolamento.** Resolução lexical não cobre junction/symlink nem a atuação de shell. `process.env` inteiro expõe mais contexto do que cada processo necessita. Modo Plan precisa ser política transversal, não apenas uma lista de tools.

Referências fixadas: [tools](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/cli/src/lib/local-tools.ts), [chat cliente](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/cli/src/hooks/use-chat.ts), [chat servidor](https://github.com/code-with-antonio/nightcode/blob/255883f130d350541e806f2431e7df32369f24bf/packages/server/src/routes/chat.ts).

## 2. Browser Automation App

**Aproveitar:** registry de nós, schemas, observe/act/extract/agent, dependências entre etapas, inspeção de outputs, browser aberto sob demanda e compartilhado por execução, replay ligado ao run.

**Adaptação:** execução local Playwright; Stagehand opcional no mesmo ambiente/sessão homologada; workflow imutável compilado e executado pelo nosso scheduler. Canvas e Liveblocks não são necessários para uma equipe que compartilha receitas no Git.

Achados de alta confiança:

1. **Resultado negativo pode virar sucesso.** `nodes/agent.ts` devolve `success:false/completed:false`; `run-workflow.ts:143–159` registra `done` se não houver exceção. A reprodução executa essas funções originais com Stagehand/Trigger substituídos em memória e confirma a divergência. Resultado de domínio precisa ser discriminado; transporte bem-sucedido não significa objetivo atingido.
2. **Referência ausente desaparece.** `interpolate.ts` transforma caminhos inexistentes em string vazia. A reprodução de `recipient={{ lookup.email }}` retorna `recipient=`. Para operações externas isso deve falhar antes do envio; campos opcionais precisam de fallback declarado.
3. **Grafo não equivale a scheduler completo.** A implementação executa serialmente nós que participam de alguma aresta; não limita por alcançabilidade ao trigger. Ausência de executor vira `done`, comportamento adequado apenas para um tipo de trigger explicitamente conhecido. A validação precisa rejeitar nós desconhecidos, referências inválidas e ilhas executáveis.
4. **Versão e replay.** O job carrega o workflow salvo pelo ID durante a execução. Alterar a receita entre disparo e leitura pode alterar o que será executado. Fixar hash/versão e inputs no despacho resolve essa ambiguidade.
5. **Pressão de metadata.** O código republica o array completo de steps/outputs em cada avanço. O volume potencial cresce com etapas e resultados; o SDK pode agrupar envios, portanto não foi medido tráfego quadrático real. Usar eventos incrementais e artefatos paginados.
6. **Cleanup e retries.** `close()` não está em um `finally` cobrindo todo o ciclo. Retries de workflow não distinguem adequadamente um envio já aceito de uma leitura repetível. Cada efeito precisa da sua política de reconciliação.

Referências: [runner](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/tasks/run-workflow.ts), [agent](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/nodes/agent.ts), [interpolação](https://github.com/code-with-antonio/browser-automation-app/blob/7b7ae9755f239c60f33d1edcefbde0a251a3fb02/features/workflows/lib/interpolate.ts).

## 3. AI Teammates

**Aproveitar:** perfis/especialistas, conversa persistente, transferência de responsabilidade, memória, ferramentas de terminal/arquivos/desktop, inicialização preguiçosa e cache de promises com invalidação em falha. Screenshots comprimidos e consulta de display paralela são boas decisões locais.

**Adaptação:** perfis não são processos permanentes; handoff vira Task persistida com orçamento, ownership, input e output. Escritores paralelos usam worktrees separados. Memória ganha consulta, origem, revisão, validade e isolamento por usuário/projeto. Desktop fica em ambiente isolado.

Achados:

1. **Memória deixa de recuperar conteúdo novo — reproduzido.** `recall` corta os primeiros 20.000 caracteres; `remember` adiciona ao final. Depois desse limite, novas decisões não aparecem em recall. A reprodução confirma a nota nova invisível. Limitar resultado sem busca/compactação não resolve crescimento.
2. **Handoff é troca de bot no loop.** O histórico contém a chamada e sua nota, mas não há um job durável separado com aceite, lease e pacote de entrega. Não afirmar que a nota é totalmente perdida: ela está nos argumentos da tool. Não confundir esse mecanismo com uma equipe de coding paralela.
3. **Arquivos e comandos são truncados após obtenção completa**, como no Nightcode. Screenshots base64 em mensagens ampliam persistência e contexto; o nosso histórico deve usar referências a artefatos com materialização apenas na chamada do modelo que precisa da imagem.
4. **Uso inclui infraestrutura.** `trigger/usage.ts` mede sandboxes por amostragem de cinco minutos, com chave idempotente por timestamp e parada por orçamento. É uma capacidade pertinente que merece cobertura explícita: recursos podem continuar custando sem gerar tokens. A amostra não equivale a duração exata ou fatura do provedor.
5. **Quota e consultas no caminho crítico.** Consulta de plano/uso e membros é parte do runtime SaaS. Localmente, reservar orçamento transacional e usar metadados com validade; reconciliar com o provedor fora da renderização. Não copiar dependência de billing para abrir cada ferramenta.
6. **Versões incompatíveis com as outras referências.** AI SDK 7/Trigger 4.7.3/Daytona 0.222.0 neste projeto não podem ser misturados indiscriminadamente com AI SDK 6 ou os SDKs do Sandbox. Fixar e testar uma combinação no novo motor.

Referências: [tools](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/lib/sandbox-tools.ts), [chat](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/trigger/chat.ts), [uso de sandboxes](https://github.com/code-with-antonio/ai-teammates/blob/de32f461cc9e0ddf4c5087af07c65cf06df7d683/trigger/usage.ts).

## 4. Sendkit

**Aproveitar:** operação tipada única, schemas de entrada/saída, API de biblioteca, CLI e MCP sobre o mesmo core; credencial injetada pelo servidor, não exigida como argumento de tool do modelo. Este é o melhor padrão de composição das cinco referências.

**Limite de escopo:** a operação implementada é envio de mensagem Telegram. Não é uma plataforma completa de campanhas, email, fila e notificações. No Sistema Zero já existe messaging; usá-lo quando atender ao canal/template.

Achados:

1. `fetch` do envio não recebe `AbortSignal`/deadline; a reprodução captura os argumentos com rede substituída. Não houve envio real.
2. Não há protocolo completo de intenção, chave idempotente e reconciliação de aceitação incerta. Repetir automaticamente o POST pode duplicar mensagem.
3. Configuração local usa JSON em disco; mode `0600` não prova ACL adequada no Windows. Token em opção de CLI pode aparecer no histórico/processos. No novo app, cofre e entrada segura.
4. O MCP remoto admite token no path; URLs e desafios podem transportar segredo. Usar referências de credencial e autenticação de escopo limitado. A exposição concreta depende da infraestrutura de logs/proxy; não foi demonstrada exploração.
5. Server/transport por request no modo stateless é uma escolha de desenho, não um gargalo comprovado. Só otimizar depois de medir.

Referência: [operação core](https://github.com/code-with-antonio/sendkit/blob/e4f47cb77bcd4dddcb1af483ec014e654740ee74/packages/core/src/operations.ts), [repositório fixado](https://github.com/code-with-antonio/sendkit/tree/e4f47cb77bcd4dddcb1af483ec014e654740ee74).

## 5. Sandbox

**Aproveitar:** ambiente persistente por projeto, seed versionável, upload em lote, inicialização sob demanda, readiness, preview temporário, perguntas persistidas antes do próximo turno, uso idempotente por resposta e observabilidade de provisionamento.

**Adaptação principal:** EnvironmentManager separado de modelo/backend; PreviewSession ligada a revisão; diagnóstico devolvido ao agente dentro de orçamento; validação independente pelo browser. O original registra erro de preview no Sentry — isso não é ainda um ciclo automático confiável de reproduzir, corrigir e revalidar.

Revisão das evidências anteriores, confirmadas novamente pelo harness:

- Resultado de `replace_text` pode exceder o limite de leitura; validar tamanho final e trabalhar por patch/faixa.
- Erro de transporte em stat vira “arquivo inexistente”; preservar categorias de erro.
- Duas substituições concorrentes podem perder uma alteração no adapter em memória; faltam precondições/lock no chamador. Não se afirma que o ensaio reproduziu a implementação interna da Daytona.
- Arquivos descritos como protegidos no prompt continuam deletáveis pela tool; proteção deve existir no executor/ambiente.
- Execução isolada da tool com sinal já abortado ainda escreve; isso prova ausência de verificação na função, não o comportamento do scheduler externo.
- Remover query da URL não remove token no hostname; redação deve cobrir URL inteira e dados de erro.
- UI pode exibir `done` para output textual que comunica erro. O contrato de resultado deve governar todos os clientes.
- Criação grava ID depois de seed, deixando janela de órfão; labels permitem limpeza, mas faltam intenção durável, coordenação da criação e coletor periódico. Deleção precisa tratar not-found de modo diferente de indisponibilidade.

O runtime Three.js é um template de domínio, não a fundação de execução do terminal. Studio/Molda já cobrem edição/atividades; reaproveitar seus contratos, não incorporar outra engine ao core do TUI.

Referências: [tools](https://github.com/code-with-antonio/sandbox/blob/ac18750e06d7678ca8a215fc61cb91e1e5709b50/lib/games/tools.ts), [ambientes](https://github.com/code-with-antonio/sandbox/blob/ac18750e06d7678ca8a215fc61cb91e1e5709b50/lib/daytona/utils.ts), [chat](https://github.com/code-with-antonio/sandbox/blob/ac18750e06d7678ca8a215fc61cb91e1e5709b50/trigger/chat.ts), [análise detalhada](architectural-analysis-sandbox-tui-2026-10-15.md).

## 6. Situação real do Sistema Zero

`packages/tui` ainda é uma estrutura visual de 16 arquivos / 1.476 linhas: submit sem implementação, comandos incompletos, status fixo, preferências em namespace Nightcode e bin declarado sem arquivo correspondente. Build/typecheck/lint anteriores passaram, mas isso não demonstra chat, execução de ferramentas, distribuição ou interatividade real.

| Fronteira existente | Reuso coerente | Limite observado |
|---|---|---|
| `marketing-desktop/src/main` | Descoberta de executável, ambiente filtrado, processo sem shell e transporte RPC | Claude sem tools; Codex read-only/ephemeral; servidor rejeita aprovação interativa. São provas de transporte, não adapters de coding prontos |
| `scripts/dev.ts` | Inventário, PID, logs, ciclo de vida por serviço | Definir um único dono por processo; não criar supervisor concorrente para os mesmos serviços |
| `packages/auth` | OTP por email, verify, refresh, logout e me já expostos pelo gateway | Reutilizar platform main e RBAC; não é OAuth/device flow; revogar refresh não prova invalidação imediata de JWT |
| `packages/messaging` | Outbox, chave idempotente e status | `202` é aceitação; envio/consulta são S2S com HMAC no gateway. Criar operação autorizada por usuário no backend, sem distribuir HMAC no desktop |
| Helpdesk | KB, investigação e rascunhos | Preservar aprovação humana das respostas |
| Studio Runtime/Core | Manifestos, hashes, validade, evidência de revisão | Serviço especializado não vira shell geral; não distribuir token interno no desktop |
| Skills locais | Descoberta progressiva e conhecimento da equipe | Não enviar todos os corpos ao modelo a cada turno; instrução textual não cria permissão |

Há amplo trabalho não commitado fora do TUI. A implementação futura deve preservar esse contexto. Worktree criada apenas de HEAD não contém o trabalho atual; snapshots seletivos precisam registrar base, arquivos alterados e novos relevantes.

## 7. Correções exigidas na proposta

| Lacuna anterior | Correção V2 | Lotes |
|---|---|---|
| Performance concentrada no fim | Fixtures, budgets e coleta desde a fundação; aceite em toda entrega | B00–B12 |
| Estado genérico de run | Task/Run/Step/Effect separados; canceling, blocked e unknown explícitos | B01–B03 |
| Lote de coding absorvia vários subsistemas | Separar filesystem/processos, contexto, clientes, MCP e isolamento | B03–B07 |
| Compatibilidade de clientes implícita | Matriz por versão e ambiente; capabilities certificadas | B00, B05 |
| Streaming poderia dominar DB/UI | Deltas agrupados, escrita de efeito durável, paginação e pressão de saída | B01–B03 |
| Multiagente como lista de perfis | Scheduler único, orçamento reservado, lease, mailbox e integração serial | B09 |
| Workflow excessivamente genérico | Compilação tipada, versão imutável, calendário/DST e repetição limitada | B10 |
| Integração empresarial tratada como chamada HTTP | Identidade staff, preparo/aprovação, enqueue/entrega e reconciliação | B11 |
| Ausência de pesquisa web explícita | Search/fetch com fontes, limites e política de rede | B04 |
| "Completo" pouco verificável | Matriz de capacidades e três marcos utilizáveis; extensões opcionais separadas | B00–B12, E01–E03 |

## 8. Riscos de desempenho prioritários

Confiança alta sobre a existência do padrão; impacto no novo produto ainda deve ser medido:

1. Histórico integral processado e renderizado: paginação e projeções incrementais.
2. stdout/arquivos/imagens sem limites antes da alocação: streaming, quotas e artefatos.
3. SDKs pesados carregados para abrir chat: import dinâmico, capacidades sob demanda.
4. SQLite síncrono concorrendo com cancelamento: escritor dedicado e transações curtas; medir Windows com WAL/durabilidade reais.
5. Múltiplos agentes disputando CPU, browser e quota: pools por recurso e preferência à interação humana.
6. Contexto maior que o necessário e retry cego: seleção de trechos, cache válido e contabilização de tentativas.
7. Polling/índice contínuo consumindo máquina ociosa: watchers com exclusões, debounce e pausa sob carga.
8. Provisionar sandbox/browser toda rodada: lease e reuso por versão/conta, sem compartilhar sessão mutável entre escritores.

Não foram executados benchmarks de um runtime que ainda não existe. As metas da [especificação de desempenho](../docs/plans/2026-10-15-tui-desempenho.md) são propostas de aceite, não resultados obtidos.

## 9. Limites da verificação

As seis novas reproduções e os oito grupos Sandbox passaram sem rede nos adapters. Testam funções originais com dependências substituídas; não certificam SDKs, serviços externos ou exploração em produção. O inventário não executa código dos repositórios. Não foram feitas chamadas pagas a modelos, sessões remotas, envio de mensagens ou deploys.

A documentação oficial confirma caminhos de integração, não a homologação da combinação instalada. O transporte local usa `codex app-server --stdio` no WIP, enquanto a documentação atual descreve stdio por padrão/`--listen stdio://`: um exemplo concreto de por que flags e schemas devem ser certificados por versão antes do reuso. [App Server](https://learn.chatgpt.com/docs/app-server).

**Resultado:** proposta revisada, critérios mais fortes e evidência adicional. Prontidão operacional e superioridade de desempenho permanecem objetivos a demonstrar durante os lotes.
