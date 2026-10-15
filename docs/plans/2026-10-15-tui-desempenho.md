# Sistema Zero TUI — desempenho, limites e avaliação

Data: 15/10/2026. Especificação de aceite da proposta V2. **Nenhuma meta abaixo é um resultado já medido do futuro runtime.**

## 1. O que deve ficar rápido

O objetivo é reduzir o tempo até uma entrega correta, mantendo o terminal responsivo. Medir separadamente startup, interação, espera de fila, contexto, primeira resposta do provedor, tools, validação e tempo humano. Tokens por segundo isoladamente não medem produtividade.

O custo por resultado aceito soma todas as tentativas, revisão, tokens, ambiente e browser. Assinatura com custo marginal não informado é registrada como assinatura/uso desconhecido; não recebe custo zero artificial para vencer a comparação.

## 2. Cenários fixados em B00

| Fixture | Conteúdo | O que exercita |
|---|---|---|
| F1 — workspace pequeno | 1.000 arquivos, 25 MiB, Unicode/CRLF, Git limpo e WIP | Startup, busca, leitura, patch e checkpoint |
| F2 — monorepo | 50.000 arquivos elegíveis, 1 GiB; árvores ignoradas adicionais | Busca/indexação incremental, memória e cancelamento |
| F3 — histórico | 10.000 mensagens, 100.000 eventos, 500 sessões, artefatos externos | Página inicial, paginação, scroll, reconexão e compactação |
| F4 — streams | 4 processos produzindo, em conjunto, 5 MiB/s por 5 minutos | Pressão de saída, quota, disco e responsividade |
| F5 — execução | 2 agentes, 8 leitores, 1 build e 1 contexto de browser ativos | Justiça das filas, limites e impacto em digitação |
| F6 — falhas | Corte de processo em cada fronteira de intenção/efeito/resultado, disco cheio, stream truncado | Recuperação e ausência de duplicação |
| F7 — workflow | 100 nós pequenos, branches/foreach limitados e outputs grandes por referência | Escalonamento incremental e tamanho de eventos |

Seeds e checksums ficam versionados; datasets grandes são gerados no diretório temporário de teste. F4 não obriga armazenar 1,5 GiB: deve atingir quotas e comprovar a política de truncamento/cancelamento sem alocação ilimitada. Especificar claramente se o fluxo continua sendo drenado e descartado ou se o processo é encerrado.

Hardware de referência: registrar CPU, RAM, SSD, SO/build, terminal, energia, Bun e versões dos adapters da máquina Windows usada em B00. Não inventar números de uma máquina “equivalente”. Linux/macOS recebem medições próprias antes de declarar suporte.

## 3. Metas iniciais e bloqueios

| Métrica | Meta inicial proposta | Medição |
|---|---|---|
| `--help` headless | p95 ≤ 300 ms | Novo processo, sem importar OpenTUI nem SDKs opcionais |
| Primeiro prompt utilizável | p95 ≤ 1,5 s com supervisor existente; ≤ 2,5 s iniciando ambos | Do spawn à primeira entrada aceita; sem esperar rede/índice |
| Tecla até frame visível | p95 ≤ 50 ms, p99 ≤ 100 ms | Terminal real e renderer de teste; F3/F5 |
| Trocar sessão/página de histórico | p95 ≤ 200 ms | Página de até 100 mensagens; F3, cache declarado |
| Confirmação de cancelar | p95 ≤ 100 ms | Recepção no supervisor → evento aceito; recursos ainda encerrando ficam visíveis |
| Encerrar processo local gerenciado | p95 ≤ 2 s no fixture cooperativo; teto de 5 s para forçar árvore | Não inclui API externa que já aceitou efeito; ownership verificado |
| Overhead de dispatch | p95 ≤ 20 ms sem fila | Exclui tool/rede; inclui autorização e intenção durável em SSD de referência |
| Reconectar uma visão | p95 ≤ 500 ms | Snapshot + últimos 1.000 eventos; sem reler todo histórico |
| RSS em repouso | UI + supervisor ≤ 300 MiB | Sem browser, clientes oficiais e índice em carga; relatar filhos separadamente |
| Memória após ciclo longo | Acréscimo retido ≤ 30 MiB após 100 tarefas equivalentes e estabilização | Baseline, heap e RSS; crescimento monotônico exige perfil |
| CPU ociosa | Média ≤ 1% da capacidade total da máquina | Janela de 60 s; sem spinner/polling desnecessário |
| Crescimento de histórico | Custo de exibir 100 mensagens não cresce linearmente com 100.000 eventos | Comparar F3 pequeno/grande; inspeção de query e render |
| Build de índice | Nunca impede prompt, cancelamento ou orçamento interativo | Tempo total reportado; pausa sob F5 |

Metas devem ser confirmadas ou ajustadas em B00 com medição e justificativa registrada. Alterar um limite não equivale a aprovar uma regressão. Após congelar a baseline, cada PR relata desvio absoluto e relativo; regressão repetível >10% em cenário controlado exige explicação e decisão explícita. Não bloquear por uma única amostra ruidosa de CI compartilhado.

## 4. Limites operacionais iniciais

Configuração por perfil com tetos; aumento de concorrência continua sujeito a orçamento, memória e escopo:

- 2 tarefas de agente ativas; no máximo 2 chamadas de modelo simultâneas por perfil. Descendentes compartilham o teto; profundidade inicial 2 e total de 6 tarefas agentes por objetivo. Tarefas determinísticas de workflow não consomem esse contador de agentes.
- 8 leituras de arquivo concorrentes; 1 escritor por árvore/caminho com identidade canônica; 1 build pesado por workspace; 1 proprietário mutante por sessão de browser. Permitir leitores independentes sem serializar tudo.
- Janela visual de 100 mensagens + overscan limitado; páginas por cursor com teto adicional de 512 KiB, o que ocorrer primeiro. Reconexão entrega snapshot/eventos em chunks limitados, não um frame com todo o backlog. Não montar todo histórico e esperar que clipping resolva CPU/memória.
- Frame IPC limitado a 1 MiB; arquivos/imagens por ArtifactRef e leitura em blocos de até 256 KiB. Rejeitar mensagem maior antes de alocar corpo completo. JSON não transporta BigInt sem codificação explícita.
- Leitura padrão até 64 KiB por faixa, resposta textual para modelo até 32 KiB por tool; fornecer cursor/truncamento. Busca limita matches durante consumo e termina o processo quando apropriado.
- Ring buffer até 256 KiB por processo; spool inicial até 32 MiB por processo e quota de 1 GiB por run, configuráveis. Eventos de controle têm canal/prioridade independente de logs.
- Artefatos encerrados: retenção padrão 30 dias e quota de perfil de 5 GiB; arquivos fixados e runs ativos não são coletados automaticamente. Ao atingir quota com dados fixados, bloquear novas alocações e explicar a causa. Exclusão marca referências antes da coleta física.
- Saída do modelo e eventos visuais agrupados por até 50 ms ou 32 KiB. Intenção de efeito, decisão, pergunta respondida e estado terminal exigem commit antes de ack. Texto em voo pode ser marcado como provisório; cursor confirmado nunca avança além do commit.
- Reservar contexto para resposta, resultados de tools e retomada. Calcular a janela efetiva por modelo; compactar antes de estourar o limite. Não preencher contexto com todos os schemas MCP ou skills.

Os números são defaults de produto a homologar; não foram deduzidos como “ótimos” dos repositórios. Medir pressão e adaptar concorrência para baixo durante carga antes de aumentar recursos.

## 5. Decisões de arquitetura que evitam desperdício

**Inicialização:** entrypoint de CLI leve, importação dinâmica da UI, provider e integrações apenas quando usados. Sem abrir browser, consultar todos os MCPs, iniciar LSP, varrer repo ou consultar quota remota antes de aceitar input. Config local/catálogo em cache permitem mostrar estado offline.

**Persistência:** um escritor SQLite por perfil, em worker dedicado; operações pequenas e queries paginadas. O supervisor mantém cancelamento e filas responsivos. WAL e `synchronous=FULL` são a baseline de durabilidade para efeitos, sujeitos à prova Windows em B00. Não trocar para um modo menos durável apenas para passar benchmark. Banco em disco local; backup consistente pela API, não cópia cega do arquivo principal com WAL ativo. A API `bun:sqlite` é síncrona, portanto isolamento e tamanho das transações são parte do desenho. [Documentação Bun](https://bun.sh/docs/runtime/sqlite).

**Processos e arquivos:** streaming desde a origem, limites em bytes antes de conversão/parse, readers por faixa, `rg` com args seguros e exclusões, diretórios com dirents e paginação. Evitar listar uma árvore inteira antes de descartar `node_modules`. DB, filesystem e API não formam uma transação única: o ganho de batching não pode enfraquecer precondições e reconciliação.

**Contexto:** mapa incremental por hash, watcher com debounce/exclusões e rescan ao detectar overflow. Cache de LSP/memória é invalidado por revisão/escopo. Embeddings são extensão condicionada a ganho no benchmark de recuperação, não dependência inicial.

**Modelos:** perfil por tarefa, capabilities e avaliação; evitar chamada extra de LLM apenas para rotear toda interação simples. Prefixos estáveis ajudam prompt caching, mas não justificar preenchimento inútil. Registrar cache hit e custo observado; roteamento e cache variam por provedor. [Prompt caching OpenRouter](https://openrouter.ai/docs/guides/best-practices/prompt-caching).

**Fallback:** allowlist de modelos/provedores com requisitos de tools, saída estruturada, privacidade e custo. `require_parameters` impede selecionar endpoints que ignorem parâmetros necessários. Retry limitado respeita deadline/Retry-After e usa jitter; não repetir uma mutação parcialmente executada porque a geração falhou. [Roteamento OpenRouter](https://openrouter.ai/docs/guides/routing/provider-selection).

**Browser/ambientes:** abrir sob demanda, reutilizar por lease/revisão e encerrar por inatividade. Screenshot só quando há informação nova relevante, com tamanho adequado; base64 apenas na fronteira do provedor. Traces completos por validação/falha, com quota, retenção e redação. Warm pool remoto depende de medir tempo poupado versus custo ocioso.

**Equipes/workflows:** uma fila comum com recursos diferentes; prioridade à interação humana e mecanismo contra starvation. Agente simples permanece o padrão. Paralelizar quando independência e caminho crítico justificarem; validar resultado integrado. Metadata de workflow é incremental; payload grande vira artefato.

## 6. Instrumentação e execução dos ensaios

Cada span registra `traceId`, `taskId`, `runId`, `stepId`, backend/versão, ambiente, revisão e classe da operação. Métricas não incluem conteúdo de prompt, segredo ou URL assinada. Históricos e traces ficam locais; exportação redige dados sensíveis.

Registrar `startup.ready`, `input.render`, `queue.wait`, `context.build`, `model.ttft`, `model.total`, `tool.intent_commit`, `tool.execute`, `store.commit`, `ipc.catchup`, `cancel.ack`, `cancel.drained`, `preview.ready`, `validation.complete`, bytes lidos/retidos, cache, tokens, custo e retries. Separar estados de fila de latência de execução.

Protocolo:

1. Congelar fixture, commit, versões, hardware e configuração. Capturar consumo dos subprocessos e tamanho de banco/WAL/artefatos.
2. Startup: pelo menos 30 processos novos; primeira execução pós-instalação separada das seguintes. “Processo novo” não significa cache de disco frio; não alegar cold-cache sem controlá-lo.
3. Microbench: 3 warmups e 30 execuções para medianas/p95; interações/IPC usam pelo menos 1.000 amostras para cauda. p99 com pouca amostra é apenas descritivo, não aceite estatístico.
4. F4/F5: cinco minutos sustentados; observar vazamentos, filas e output ao final. F6: fault injection determinística em cada fronteira, com golden de estado/efeitos.
5. Perfil CPU/heap identifica o gargalo antes de otimizar. Alterar um fator por vez, preservar ordenação, resultado e política; comparar artefatos e invariantes, não só cronômetro.
6. Salvar JSON bruto, relatório e comando exato em `.audits/tui-bench/<commit>/<platform>/`. Sem dados de cliente nos fixtures.

Suite offline em cada lote; smoke de provedor real separado, limitado por orçamento e com resultados identificados. CI compartilhado faz smoke e regressões grandes; aprovação de release usa hardware de referência estável e terminal real.

## 7. Avaliação do produto contra o fluxo atual

Banco de 30 tarefas: 8 bugs, 6 mudanças multipacote, 4 revisões, 4 pesquisas, 4 validações de browser e 4 operações locais/rascunhos. Usar snapshots independentes sem dados privados; separar casos de desenvolvimento da amostra final para evitar ajuste ao teste.

Comparações: (a) motor próprio versus fluxo atual; (b) TUI com backend oficial versus uso direto do mesmo backend/modelo quando possível. Isso distingue ganho da integração de ganho do modelo. Comparar versões, escopos, orçamento e ferramentas disponíveis; diferenças inevitáveis aparecem no relatório.

Repetir tarefas estocásticas ao menos três vezes. Avaliar por checks executáveis e revisão humana sem depender da autoavaliação do agente. Relatar distribuição e falhas, não apenas melhor run. Uma melhoria em quatro tarefas não prova superioridade geral.

Aceite de adoção: invariantes críticos sem violação na suíte; taxa de aceite ao menos equivalente na amostra essencial; nenhuma categoria essencial materialmente pior sem decisão consciente; ganho de tempo ou custo de 20% em jornadas integradas previamente escolhidas, sem reduzir qualidade. Esse percentual é hipótese/meta de produto, não promessa. Sem ganho medido, reduzir complexidade ou manter o fluxo atual para aquela classe de tarefa.
