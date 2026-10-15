# Implementação e reviews do TUI

## B11 — Integrações da equipe: revisão do núcleo

Implementados OTP/refresh/logout no cofre, fachada auth com sessão vigente e RBAC atual, delegação HMAC restrita ao auth, recibos de mensagens por ator, leituras de helpdesk/KB/Studio e resposta com confirmação humana. O build Studio usa o contrato comum extraído para core, artefato imutável e segredo exclusivamente no servidor. GitHub lê PR/checks/runs e cria rascunho preso ao SHA revisado; Telegram envia somente a chats configurados. Ambos têm ledger persistente com reconciliação explícita.

Revisão corrigiu a aceitação silenciosa de uma mesma chave de mensagem com payload diferente, incluindo corrida de inserts; a possibilidade de trocar credencial entre conferência da conexão e dispatch; a perda de logs em erro de compilação Studio; e a finalização de PR sem sinalizar mudança de SHA durante sua criação. Nenhum token novo foi colocado no journal ou no contexto do modelo.

Evidência de regressão: 405 testes passaram, 1.259 asserções, 46 arquivos, 4,11 s, abrangendo unit/integration do auth, unit do messaging, configuração real do gateway, Studio e novos adapters. Fixtures usam HTTP real local e journal SQLite para provar revogação com JWT ainda válido, refresh serializado, 202 distinto de entrega, recibo isolado por ator, conflito de destino, SHA alterado e envio aceito com resposta perdida após reinício. Typechecks novos foram executados; um teste de messaging exigiu parse explícito de JSON unknown, corrigido em seguida.

Documentação: integrations.md. Pendente de B12: comandos de conexão no fluxo de UX, verificações globais finais, distribuição e medições. Serviços externos não foram acionados: não houve envio real, publicação de PR, build remoto ou deploy; essas capacidades dependem de credenciais/configuração e permanecem sem homologação externa. A nova fachada de backend precisa ser implantada no ambiente escolhido antes do uso real. Essa implantação não faz parte do merge local solicitado.

Base: staging `7981caf7a4fb6773ebb804405bf7ad6f6551814f`. Worktree isolada: `sistema-zero-tui`; branch `feat/tui-integrado`.

O trabalho de outras iniciativas foi preservado em suas worktrees. Durante esta implementação, staging recebeu commits de Molda e Studio Pro; a integração local deve preservar esses commits e validar novamente os contratos compartilhados.

## B00 — Fundação de compatibilidade

- Bun 1.3.11, OpenTUI 0.3.0, Codex 0.162.1, Claude Code 2.1.299, Docker Server 29.6.2 disponíveis nesta máquina.
- Cofre `Bun.secrets` testado com segredo sintético e remoção posterior; sem fallback em texto puro.
- `codex app-server --stdio` é suportado na versão instalada; preferir transporte padrão documentado.
- Instalação filtrada do TUI com lockfile congelado concluída na worktree.
- Provas de processo/isolamento, renderer empacotado, clientes e carga são adicionadas às suítes dos lotes que produzem essas capacidades. Não serão anunciadas como homologadas apenas por haver executável instalado.
- Metas de performance permanecem metas; medições primitivas são registradas separadamente.

## Estado dos lotes

| Lote | Estado |
|---|---|
| B00 | Primitivas, versões e instalação externa verificadas; suporte externo limitado pela matriz publicada |
| B01 | Núcleo, journal, IPC autenticado, ownership e release independente implementados |
| B02 | Jornada local verificada com provedor determinístico; smoke OpenRouter real pendente |
| B03 | Jornada de correção, checks, processos, WIP, ConPTY e limites de saída verificados |
| B04 | Contexto, memória, análise TS/JS e pesquisa implementados; review abaixo |
| B05 | Coding, retomada e cancelamento verificados nos dois clientes pelo dispatcher |
| B06 | MCP HTTP/stdio, OAuth local, paridade, configuração CLI e painel implementados |
| B07 | Ambientes, serviços e recuperação verificados em Windows/Docker; hardening de quotas fica explícito abaixo |
| B08 | Browser, transferências, preview/reporter e viewer local verificados |
| B09 | Equipes, WIP isolado, integração serial, revisão e recuperação verificados |
| B10 | DSL, 100 nós, agendas IANA e recuperação implementados e exercitados |
| B11 | Fachadas auth/messaging e adapters implementados; implantação/homologação externa pendentes |
| B12 | UX, pacote, upgrade, quotas e F1–F7 exercitados; aceite de memória e avaliação comparativa ainda abertos |

Review de cada lote registra comandos, resultados, correções e limitações. O merge local ocorre depois do review final e dos checks do conjunto integrado.

## Review B01 — Núcleo e distribuição inicial

Implementados `agent-core`, `agent-runtime`, SQLite em worker, exclusividade de perfil pelo listener, autenticação mútua com segredo no cofre, frames limitados, idempotência de execução, eventos paginados, perguntas persistidas, cancelamento e recovery. A UI e o CLI usam o mesmo runtime. Help não importa o renderer.

Corrigidos durante o review: transição repetida de cancelamento, crescimento ilimitado de filas IPC/worker, colisão de identidade de efeitos, duplicação de submit e layout sem conteúdo no scrollbox. O runtime falha fechado quando o worker não confirma a escrita. Estado terminal não volta a running.

Distribuição: `bun run --filter '@sistemazero/tui' build` e `bun scripts/tui-release/verify.ts` passaram em diretório externo `Sistema Zero instalação ...`, com espaços/Unicode, instalação nova de dependências, help e doctor conectando ao supervisor empacotado e encerramento pelo comando autenticado. Prova de renderer em teste OpenTUI passou; teste interativo de todos os terminais não está implícito nisso.

Pendências de homologação: Windows usa named pipe do Node com autenticação HMAC; ACL explícita por SID ainda não foi provada. Unix não está homologado. Backup/upgrade e preferência legada serão fechados no hardening, sem reduzir o critério de release.

## Review B02 — Motor e orçamento

Stream SSE validado, limites de eventos/texto/argumentos, término obrigatório antes de dispatch, catálogo, escolha explícita de modelo, reserva transacional, custo desconhecido mantido na reserva e artefatos para resultados grandes. Teste de jornada lê arquivo real, persiste efeitos e entrega resposta terminal. Provider determinístico é fixture de protocolo; não é evidência de acesso real ao OpenRouter.

Corrigidos: histórico consultava somente os primeiros 100 eventos e perdia a resposta final; agora consulta o último evento do tipo desejado. Efeitos terminalizados não podem ser sobrescritos. Duas reservas concorrentes não ultrapassam o teto local.

Pendências: smoke real, reconciliação do custo perdido por geração e carga completa. Teto local é controle de despacho e reserva conservadora; cobrança do provedor após cancelamento deve permanecer visível, nunca ser anunciada como custo zero.

## Review B03 — Edição, processos e WIP

Patch valida todo o conjunto antes de escrever, verifica hash novamente por arquivo, substitui texto literalmente e registra checkpoint antes do primeiro efeito. Restore recusa alterações externas. Operação de vários arquivos não é anunciada como transação atômica de filesystem.

Windows: processos iniciam suspensos e entram em Job Object antes de executar; job encerra descendentes, inclusive quando o supervisor fecha stdin. Helper compilado uma vez por hash e reutilizado. Testes passaram com argumentos contendo espaços/aspas, ambiente sem segredo sintético herdado, excesso de stdout e árvore de três processos encerrada por timeout. Ensaio de `git --version`: cold 1727 ms, warm 177–231 ms nesta máquina; não representa operações Git complexas nem benchmark do app inteiro.

Fixture de coding: teste real falha antes, patch corrige `a-b` para `a+b`, execução autorizada de `bun test` passa, Plan recusa a mesma escrita. Fixture Git preserva índice original e inclui conteúdo staged/unstaged/untracked no fork. Snapshot recusa symlinks/submódulos ainda não homologados, com mensagem explícita.

Pendências: PTY interativo, integração serial de patches de equipe (B09), recuperação detalhada de checkpoints após kill e fixtures de pressão completas. Nenhum desses itens é marcado concluído por haver apenas um adapter ou um teste unitário.

## Review B04 — Contexto e pesquisa

Contexto aplica regras por diretório, catálogo de skills por metadados e relevância, mapa de scripts/pacotes e memórias com origem. Hashes identificam as fontes; itens omitidos continuam consultáveis por ferramentas. Leitura do contexto deste monorepo respeitou 32 KB; não se carregam corpos de todas as skills no prompt. O watcher invalida o índice e a ausência/falha do watcher força rescan.

Memória usa FTS5, paginação, validade, tombstones e correção com controle de versão. Exportação paginada gera artefato verificado. Compactação arquiva evidências longas preservando restrições, mensagens do usuário e referências. TS/JS usa o Language Service oficial em worker limitado; não é um servidor LSP genérico para todas as linguagens.

Pesquisa tem Brave Search configurável pelo cofre e fetch HTTPS com resolução DNS fixada, bloqueio de endereços privados e revalidação por redirect. Fetch público real passou. Brave não tem credencial configurada nesta prova e não recebe alegação de smoke real. Uma falha nativa do Bun ao combinar BlockList IPv4/IPv6 foi isolada; políticas por família mantêm o bloqueio sem a combinação que causa o crash.

Hooks explícitos em .sistemazero/hooks.json reutilizam a execução de processos, exigem comando completo revisável e hash do manifesto. Descoberta não executa; Plan nega; alteração do manifesto invalida execução. Suite B04: 5 testes, 36 expectativas, 0 falhas. Uma execução concorrente anterior sofreu timeout durante pressão de carga; repetição isolada passou em 765 ms e a suíte final em 3,28 s. Isso permanece distinto das metas de benchmark B12.

## Review B05 — Clientes oficiais, em andamento

Codex 0.162.1 via app-server e Claude Code 2.1.299 via Agent SDK 0.3.299 usam login oficial de assinatura. Status real confirmado por projeção sem email/token. Env de API não é herdado. Login/logout do CLI invocam somente os comandos oficiais. Retomada é por identificador nativo próprio de sessão/workspace; não se converte histórico privado entre motores.

Os dois clientes corrigiram uma fixture real de subtração indevida, executaram seu teste e retomaram a sessão para explicar a alteração. Um processo independente validou o arquivo e o teste. Review identificou MCPs herdados no Codex e aprovação de arquivo sem diff: corrigidos com configuração somente do processo, verificação de catálogo vazio e associação do item/diff ao pedido. Repetição Codex passou sem tools MCP. Configuração pessoal em disco não foi editada. O sandbox nativo apresentou erro de ACL de runtime em uso na primeira prova; não se reduziu isolamento para contornar essa falha.

Pedidos nativos concorrentes são serializados na fila de perguntas persistida. Frames, filas, stdout e prazos são limitados. Encerramento sem resultado terminal confirmado fica incerto no journal. Tools internas dependem da política nativa; não são falsamente apresentadas como interceptadas pelo dispatcher. Prova de cancelamento dos dois clientes e certificação dos limites continuam abertas.

### Complemento B05 / review B06

O modo padrão agora expõe o registry do Sistema Zero por MCP de duração limitada ao run. Ferramentas nativas de execução/escrita ficam desabilitadas; a aprovação, o journal e o cancelamento dessas operações pertencem ao dispatcher. O sandbox de leitura do Codex permanece ativo. O modo nativo integral foi usado como comparação e continua sujeito à falha de ACL do runtime Codex observada nesta máquina.

Coding e retomada com a ponte gerenciada passaram nos dois clientes oficiais; teste independente confirmou o resultado. Cancelamento encerrou dois processos da fixture: Codex 59 ms; Claude 806 ms na repetição após ajuste da política. São ensaios individuais, não percentis nem metas de carga.

MCP consome HTTP/stdio com descoberta paginada, até quatro conexões lazily, schemas selecionados/versionados e validação AJV em worker com deadline. OAuth usa metadata oficial, PKCE, estado de uso único e callback loopback; tokens ficam no cofre. A fixture OAuth usa servidor local; provedores externos ainda dependem de configuração/credenciais reais.

Exportação HTTP autentica e vincula cada cliente ao run; stdio cria Tasks da mesma capability no supervisor e suporta elicitation quando o cliente a declara. Clientes sem elicitation podem responder às perguntas pela API/TUI. CLI tool também usa a mesma Task. A prova stdio lê arquivo real pelo dispatcher, persiste o run e não expõe execução em Plan.

Review corrigiu sessões HTTP múltiplas (necessárias ao Codex), schemas de entrada com defaults erroneamente obrigatórios, isolamento da validação de regex, cache após troca de segredo e concorrência de efeitos externos incertos. Dois invocations idênticos não repetem um efeito incerto; a reconciliação exige evidência explícita. Alterar definição invalida digest de autorização; identidade estável da operação mantém a retenção do efeito incerto.

Suítes MCP e de processos passaram; typecheck dos três pacotes e TUI passou. Falhas conhecidas de rede/daemon são expostas, sem retry cego de mutações. Restam a consolidação das telas de configuração no B12 e homologação de servidores OAuth externos quando configurados.

## Review B07 — Ambientes e serviços

Leases têm intenção idempotente, geração, proprietário/sessão, revisão de origem, template/digest e prazo. Provisionamento é registrado antes do primeiro recurso. Shutdown, timeout e reconciliação revogam novos usos, drenam operações próprias e param o ambiente. Destruição exige exportar as mudanças e revalidar o conteúdo; o workspace local original não é removido. Worktrees partem do snapshot com WIP.

Containers usam imagem fixada por digest, usuário não root, filesystem raiz somente leitura, capabilities removidas, rede desabilitada por padrão, limites de CPU/RAM/PIDs, tmpfs limitado e logs rotacionados. Apenas a cópia própria do workspace recebe mount. Portas de preview exigem seleção explícita de rede bridge e são publicadas em loopback. Identidade da instalação compõe nome/labels; exec usa o ID inspecionado, não um nome reutilizável.

Templates locais são versionados e descobertos sem executar scripts. Imagem/lockfiles/SO/arquitetura formam a identidade de cache; imagens e artefatos são reutilizados por digest. Não existe instalação silenciosa de dependências nem warm pool. O template Bun Linux 1.3.11 foi homologado com a imagem local; outros templates exigem sua própria prova.

Serviços compartilham o gerenciador de processos e o lease. A readiness exige HTTP e ownership real da porta: ascendência de processos com datas de criação no Windows; mapping/ID/labels no Docker. Serviço externo já ouvindo não é adotado nem parado. Estado terminal não pode voltar a ready por corrida da readiness. Logs são limitados; stdout estruturado não se mistura com diagnóstico stderr nas consultas de controle.

Provas: container preservou WIP, excluiu .env, executou com UID 1000 e recusou escrita na raiz; exportou o patch e foi removido. Timeout parou o container com descendente e revogou a geração. Serviço HTTP em container respondeu e parar o serviço revogou o ambiente. Outra fixture matou o processo dono após provisionar: a nova instância identificou o órfão pelas labels, parou, exportou e removeu. Serviço Windows recusou porta externa, verificou a própria, permitiu check paralelo e preservou o servidor externo no encerramento.

Tempos individuais de criação com imagem instalada: 913 ms isolado; 2.950 ms concorrendo com testes de processos/Git. Não são percentis. Typecheck dos três pacotes e TUI passou; regressões de processos, WIP e MCP continuam na suíte.

Limites explícitos: suporte local de ownership de portas foi provado no Windows, não em Unix. Limites do container não equivalem a quota física do bind mount de workspace; exportação é limitada, mas quota de armazenamento por perfil e política de retenção ainda pertencem ao hardening B12. Clientes oficiais permanecem no host e operam o container por capabilities; não se anuncia login de assinatura dentro da imagem. Telas e controles de sessão são consolidados no B12; CLI aceita --session para reutilizar a identidade.

## Review B08 — Browser, preview e evidência

Worker Playwright separado em Node 22+, carregado sob demanda e encerrado pelo mesmo ownership de processos. O sandbox Chromium permanece ativo. A prova mínima isolou o travamento do handshake em Bun 1.3.11; Node 24.15.0 abriu o mesmo browser. Release inclui entrypoint Node separado e dependência fixada. Perfis por conta e login humano não usam o browser pessoal.

Revisão encontrou e corrigiu: navegação em contexto Build não podia ser classificada como leitura, pois scripts podem enviar requisições; token do viewer não pode entrar nas tools do agente; captura sem reporter não prova saúde nem versão servida; imports de Playwright não podem aumentar o startup do supervisor; callbacks após encerramento não podem reativar sessão. Também passou a validar schemas antes de aprovar/despachar efeitos e a diferenciar rejeição comprovadamente anterior ao dispatch de resultado externo incerto.

Testes reais: observação/ação/screenshot, recusa de revisão DOM antiga, isolamento de porta local estrangeira, extração, upload/download e bloqueio de POST em Plan. Preview com serviço próprio validou reporter, ausência de reporter, repetição, limite de tentativas e invalidação por edição posterior. Viewer rejeitou falta de token, origem estrangeira e referência não concedida; HTML arbitrário foi servido como download, nunca documento ativo. Protocolo bidirecional nativo continuou passando após extração do transporte compartilhado. Typechecks de core/runtime/integrations passaram.

O grupo transferências+preview passou com 3 testes/22 asserções em 10,58 s; o grupo browser/proxy/protocolo passou com 4 testes/16 asserções em 4,52 s. São tempos de suíte, não benchmark de interação. A prova de pacote instalado, retenção global, limites de memória do browser e telas ficam na homologação B12. Não há promessa de automação de login/2FA; a entrada é humana. Extensões Stagehand/remotas permanecem opcionais, sem segundo loop de execução.

## Review B09 — Equipes e integração

Task DAG validado (IDs, dependências, ciclos e um revisor final alcançando todas as tarefas). Uma equipe coordenada ativa por perfil; os filhos usam os mesmos dois slots do supervisor. Até seis descendentes agentes e profundidade dois, com redução de capabilities e orçamento OpenRouter compartilhado no escritor transacional. Nenhum grant amplo é herdado por nome; aprovações continuam vinculadas aos argumentos/workspace.

Escritores recebem worktrees com HEAD+WIP. Resultados são integrados serialmente numa worktree própria; hashes divergentes bloqueiam a equipe e preservam os arquivos. Reviewer recebe a fonte combinada e pode executar somente checks declarados/revisados, além de leituras e handoff. Mudanças de fonte feitas pelo reviewer não são integradas. Aplicação ao workspace original exige revisão atual e base original ainda válida, cria checkpoint e para/exporta o ambiente de integração. Handoffs completos ficam por ArtifactRef; o prompt recebe resumo limitado.

Mailbox tem deduplicação, tamanho limitado e geração verificada no mesmo commit da escrita. Resultado atrasado não obtém ownership novo. Reinício marca uma integração inacabada como interrompida, preservando handoffs, worktrees e checkpoints; não reexecuta efeitos. Retomar trabalho interrompido exige reconciliar e preparar nova tarefa a partir dos artefatos preservados; não existe retry geral silencioso.

Review corrigiu: fila do filho só é liberada depois do registro durável de ownership; consultas paginadas/last/search não emitem alterações e não provocam ciclos de polling; fechamento repetido do store é idempotente e uso após fechamento falha imediatamente; cancelamento de tarefa sem executor ativo chega a canceled; checkpoints agora suportam binários por ArtifactRef e criação segura de diretórios pais. Snapshot recusa subdiretório de repositório e revalida o conjunto de arquivos.

Evidências: dois escritores simultâneos, WIP/untracked preservado, revisor lendo ambas as alterações, edição externa recusando aplicação, integração de escritores conflitantes bloqueada, relatório com geração antiga recusado, orçamento concorrente de irmãos sem exceder teto, redução de permissões, profundidade/quantidade limitadas, restauração binária e recovery de registro persistido sem replay. Grupo específico: 6 testes/47 asserções em 8,64 s. Regressão geral após integração: 41 testes/217 asserções em 49,93 s; typechecks dos quatro pacotes passaram. Teste adicional de recovery: 1 teste/4 asserções em 0,52 s.

Pendente de B12: UX da equipe/perguntas dos filhos, benchmark F5 com provedor real e comparação de custo/tempo, e fault injection do processo completo durante aplicação (o teste acima reabre estado persistido controlado). Custo de assinatura dos clientes oficiais continua estimativa, não faturamento API com teto monetário garantido. Equipe não é isolamento de SO; processos locais aprovados mantêm as permissões do usuário.
# B10 — Receitas e agendamentos: revisão do núcleo

Implementados compilador com schemas JSON puros e digests estáveis, referências sem eval, snapshots imutáveis, execução pelo dispatcher/scheduler existente, espera persistente, condição, foreach, orçamento compartilhado e ledger de agendamentos IANA. Quatro receitas reais são compiladas contra o registry nos testes.

Revisão corrigiu três falhas: metadados internos do Zod alteravam o digest após persistência; campos opcionais undefined quebravam canonicalização; agentes podiam encerrar com efeitos desconhecidos. O supervisor agora impede sucesso nesse último caso, e o workflow exige reconciliação humana de todos os efeitos antes de aceitar um output verificado. Cancelamento local não depende de um slot livre e drena os filhos.

Evidências: suíte de compilação, workflows e agendamentos passou com 5 testes/41 asserções antes da revisão adicional; workflow.test passou novamente com 2 testes/23 asserções após adicionar o caso de agente com resposta final e efeito incerto. Testes exercitam SQLite, dispatcher, reinício do supervisor, não repetição de efeito aceito com resposta perdida, success:false, foreach, horário inexistente/repetido, catch-up, deduplicação e desabilitação. Typecheck do runtime passou antes da última ampliação de teste; rechecagem global na entrega.

Pendente de B12: telas, benchmark F5/F7, fault injection de processo completo e avaliação de adoção. Agendamentos são locais e dependem do supervisor em execução; não há daemon do sistema instalado. Browser aberto por receita que falha é encerrado pelos limites de sessão; não há finally genérico na DSL. Não anunciar homologação externa a partir das fixtures.


## B12 — fechamento em andamento

Implementado até esta revisão intermediária:

- TUI com painéis reais, navegação por teclado, foco, resize, Unicode, temas do perfil, modo monocromático, editor externo sem shell, anexos de texto limitados, histórico por cursor, exportação em partes e fork com contexto congelado. Testes do renderer em 80×24, 120×40 e 200×60 passaram.
- Snapshot de sessão inclui tarefas filhas e apenas perguntas pendentes. Long polling separado dos deltas, cancelamento de requests IPC e proteção contra respostas tardias de outra sessão. O tail lê páginas limitadas sem reconstruir 100 mil eventos.
- Recuperação de serviços não impede montar a interface; execução só é liberada após recuperação. Catálogo específico por backend, incluindo `supportedModels()` do SDK Claude; troca de backend limpa seleção incompatível.
- Retenção de artefatos no mesmo journal SQLite, schema 5 com backup antes da migração. Quota de 5 GiB, reserva transacional, contador incremental, gravação com sync/rename, leitores em blocos, coleta após 30 dias com tombstone e proteção de owners ativos. Artefatos legados e sem owner são preservados fixados. Checks de quota, retenção, corrupção e leitura de faixas passaram.
- Checkpoints recuperam estado por hash após interrupção, identificam edição externa e não a sobrescrevem. Temporários passam a constar no journal; verificação final revalida os arquivos. Backups de checkpoints parciais ficam fixados.
- Jobs Windows limitam memória e processos; browser usa 2 GiB/32 processos. Testes reais de processo, árvore e Chromium passaram após a mudança.
- Diretório do perfil e named pipe recebem ACL privada no Windows; a ACL do pipe é lida e validada antes de liberar o handshake. Teste IPC autenticado passou. O mecanismo usa as APIs de segurança Win32, não depende de supor que a ACL padrão é privada. [Referência Microsoft](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights).
- MCP valida schema antes da aprovação/dispatch, oferece disable/logout e encerra sessões HTTP. Cache de itens do Codex tem teto de 4 MB. Inspeção de imagem Docker solicita apenas campos necessários em stdout estruturado.
- OpenRouter persiste o ID da geração cedo; reconciliação consulta o custo daquela mesma geração e mantém reserva desconhecida quando não há ID. [API oficial](https://openrouter.ai/docs/api/api-reference/generations/get-generation). Respostas finais grandes viram artefatos.

Complemento do fechamento: ConPTY real com stdin/resize/cancelamento; quota de logs de 1 GiB com reserva antecipada e retenção; oito leitores e um processo pesado por workspace; catálogo progressivo de até 24 schemas; artefatos de coordenadores associados à raiz; painéis paginados de checkpoints/grants; fix da corrida de primeiro input e layout de perguntas em terminal pequeno. IPC normaliza identidade física do perfil e adquire mutex Windows antes do named pipe. Isso evita o crash reproduzido de Bun 1.3.11 ao escutar um pipe ocupado; a segunda instância é recusada antes do bind.

A distribuição inclui lockfile transitivo, manifestos por plataforma e instalador com releases imutáveis, exclusão mútua, backup SQLite e ponteiro atômico. A prova de interrupção/rollback e instalação fora do repositório passou com SQLite, AJV, TS, OpenTUI/WASM, ConPTY e Chromium reais. O helper Windows passa a ser compilado no build; a medição antes/depois fica no relatório de desempenho.

Regressão intermediária consolidada: 63 testes/392 asserções/46 arquivos, zero falhas. Depois foram adicionados casos de geração truncada com reserva desconhecida e proteção de artefatos por workflow filho: 5 testes/26 asserções passaram no grupo afetado. O relatório final registra a última execução após integrar staging.

F1–F7, ciclo de 100 tarefas e 1.000 amostras de cancelamento/dispatch produziram artefatos reproduzíveis; veja [desempenho](performance.md). F5 usa executores sintéticos sobre infraestrutura real, sem alegar comparação de raciocínio de modelos. O perfil de CPU/heap e a tentativa de `--smol` não demonstraram redução suficiente de RSS; a opção não foi adotada.

Critérios ainda não encerrados: RSS combinado de UI+supervisor ≤300 MiB; quota física do workspace em container; fault injection real de disco cheio e de cada fronteira de patch; comparação controlada de 30 tarefas com repetições/avaliação independente; inferência OpenRouter e integrações de negócio externas quando configuradas. São limitações de aceite, não testes fictícios ou autorização para anunciá-las como prontas. E01–E03 permanecem extensões fora do núcleo local.
