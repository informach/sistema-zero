# Marketing web e desktop colaborativo — Implementation Plan

> **For agentic workers:** executar os lotes consecutivamente com executing-plans e conferir os critérios de saída. O estado consolidado de 16/10 está na [revisão integrada](../../../.audits/marketing-full-review-2026-10-16.md), que separa implementação, provas e liberação. L0–L5 têm implementação e provas, com critérios operacionais abertos. L6 recebeu autoria Remotion isolada, cache de trechos e prova de gravação existente web → desktop → R2 → web; o piloto de celular/equipe continua aberto. L7 demonstrou exportação da edição aprovada e métricas → IA → próxima pauta; recuperação operacional remota continua aberta. L8 concluiu carga/reconciliação no ambiente de revisão. L9 demonstrou sessões/sincronização/aprendizado, sem piloto físico completo. L10 tem implementação e provas web/Electron; liberação depende de L9. L11 é condicional. As caixas históricas não representam porcentagem restante de código nem substituem os critérios operacionais. Ver também [L0](../../plans/2026-10-15-marketing-desktop-l0-evidencias.md).

**Goal:** permitir que a equipe continue todo o trabalho de marketing pelo app web/desktop, com acervo carregado, assinaturas individuais, produção de imagem/vídeo, edição e sincronização confiável.

**Execução autorizada em 15/10/2026:** seguir os lotes consecutivamente, revisar cada lote, fazer full review integrado e então commit e merge em staging local. A revisão entre lotes não exige pausa/novo aceite. Preservar alterações alheias em checkout separado e registrar evidências sem marcar verificações externas não realizadas como concluídas.

**Architecture:** servidor de marketing como registro oficial, web Next/BFF e desktop React/Electron com executor e cache locais. Remotion é uma biblioteca interna: composição React compartilhada para prévia e renderização, sem serviço ou editor separado. Clientes oficiais de IA mantêm suas próprias credenciais; operações do produto passam pelo gateway. A execução hospedada permanece condicionada à capacidade e modalidade admitidas.

**Tech Stack:** TypeScript, React, Next.js, Bun/Elysia, PostgreSQL/Drizzle, R2/Drive existentes; Electron escolhido pelo usuário, Remotion incorporado para composição/vídeo e FFmpeg para preparação de mídia, Whisper.cpp para transcrição local e armazenamento local durável. L0 usa Electron 44.7.2, Remotion 4.0.535, Codex 0.162.1 e Claude Code 2.1.299; demais versões e limites estão no registro da prova.

**Spec:** [proposta de produto e arquitetura](../../plans/2026-10-15-marketing-app-fluxo-editorial-proposta.md). [Evidências da análise](../../plans/2026-10-15-marketing-app-fluxo-editorial-evidencias.md). [Aproveitamento do Fluxo Criativo](../../plans/2026-10-15-fluxo-criativo-aproveitamento-marketing.md).

## Global Constraints

- Assinaturas de Codex e Claude Code na primeira entrega funcional, incluindo imagem nativa pelo Codex.
- Operação sem terminal; login oficial pode abrir navegador ou janela própria do provedor.
- Cada executor usa sua própria identidade e assinatura; conteúdo compartilhado não é conta compartilhada.
- Sem fallback silencioso para OpenRouter, API paga, créditos extras ou assinatura de outra pessoa.
- App web e desktop compartilham estado confirmado pelo servidor, com pendências e conflitos visíveis.
- Electron é a escolha definida; o desktop oferece todas as funções web para a mesma identidade/permissões, além das capacidades locais.
- A web identifica ações que exigem desktop e oferece abertura da mesma peça, revisão e seleção; preparar/revisar continua disponível.
- Paridade desktop não significa execução offline nem transferir publicação, métricas e credenciais sociais para o computador.
- A primeira liberação inclui o acervo existente: posicionamento, fontes, calendário, copies, peças, apoio, histórico e pendências, inclusive material pertinente do Fluxo Criativo.
- Edição conduzida por IA: pedidos em linguagem natural para copy, arte, cortes, legendas e efeitos. Nenhuma operação manual de timeline/canvas é requisito.
- Ajustar, Gerar alternativas e Adaptar formato são os três atalhos; pedidos livres têm o mesmo alcance. Ajuste explícito em rascunho corrente aplica nova revisão validada com Desfazer. Alternativas exigem escolha; adaptação cria representação derivada. Aprovação/publicação exigem a edição final exata.
- Vídeo gravado, cortes, áudio, legendas e animações Remotion pertencem a L6; não são adiados para L11.
- Originais de mídia imutáveis; timeline versionada e sincronizada; nenhum código gerado recebe acesso nativo irrestrito.
- Fontes/pesquisa são L4; acervo entra por L8A/L8B. A leitura das métricas existentes e a correção de dados ausentes integram L7. L10 amplia monitoramento e análise; custos externos são separados das assinaturas.
- Publicação só usa edição identificada, aprovada e sincronizada; importar conteúdo não publica nem agenda.
- Manter gateway, domínio de marketing, publicadores, UI compartilhada e autenticação existentes como base.
- Respeitar as etapas existentes; não criar um construtor genérico de workflow.
- Migrações aditivas, sem FK entre schemas e sem segredos internos no cliente instalado.
- Avaliar qualidade com P01, P07, P34 e P08; conferir o estado atual de P29 antes de usá-la como produção piloto.
- Nenhum lote está concluído só porque compila; exige evidência funcional e revisão do seu escopo.

Este plano decompõe a proposta consolidada, que é a referência normativa das decisões de produto. Os lotes delimitam contratos, áreas, comportamentos e validações; não representam código implementado ou estimativa fechada de calendário. As evidências e a auditoria do Fluxo Criativo registram observações, sem reabrir Electron, edição por IA ou incorporação do Remotion. Alterações específicas de protocolo são decididas a partir da prova real, preservando os contratos de produto.

## Estrutura e interfaces

Caminhos identificados como novos descrevem a estrutura proposta. A bancada desktop e a composição inicial já existem; a presença do diretório não indica conclusão de suas responsabilidades. O estado executado é registrado por lote e evidência.

| Área | Caminhos | Responsabilidade |
| --- | --- | --- |
| Contratos compartilhados, novo | packages/marketing-contracts/src/editorial.ts, execution.ts, sync.ts, assets.ts, video.ts, intelligence.ts | Schemas de operações, revisões, eventos e arquivos; sem segredos ou dependência de Electron |
| Componentes compartilhados, novo | packages/marketing-workbench/src/ | Bancada de pedidos por peça/componente, comparação, prévias, comentários e sincronização; timeline é estrutura interna |
| Desktop, novo | packages/marketing-desktop/src/main/, preload/, renderer/ | Janela, ponte restrita, sessão do app, cache, execução e atualização |
| Execução desktop, novo | packages/marketing-desktop/src/main/execution/ | Adaptadores Codex/Claude, supervisor, checkpoints e coleta de artefatos |
| Sincronização desktop, novo | packages/marketing-desktop/src/main/sync/ | Fila local, cursor, reconciliação e transferência |
| Produção, novo | packages/marketing-production/src/ | Receitas de composição, captura, fontes e verificação, independentes do shell |
| Vídeo, novo | packages/marketing-production/src/video/compositions/, packages/marketing-desktop/src/main/media/ | Composições React/Remotion e parâmetros compartilhados; Player no workbench; bundler/renderer apenas no processo local; FFmpeg e transcrição complementares |
| Inteligência, novo no marketing | domain/intelligence/, application/intelligence/ e workers correspondentes | Fontes, referências, watchlists, snapshots, coleta, cobertura e alertas |
| Backend existente | packages/marketing/src/domain/, application/, interfaces/http/ | Novos contextos de projeto, revisões, execuções, sincronização e importação nos padrões atuais |
| Persistência existente | packages/marketing/src/infrastructure/persistence/drizzle/ | Schema, repositórios, transações e migrações |
| Web existente | packages/marketing-app/src/app/, lib/api.ts, server/ | Incorporar componentes, adaptar transporte e ampliar BFF sem distribuir código server-only |
| Identidade e borda existentes | packages/auth/src/, packages/api-gateway/src/ | Vinculação de dispositivo, escopos, revogação e autorização |
| Publicação existente | publication.service.ts e publisher-worker.ts no marketing | Fixar edição, validar novamente no envio e reconciliar resultado incerto |
| Mídia existente | media.service.ts, media-asset.repository.ts e media-archiver-worker.ts | Finalização, dependências de uso e restauração |
| Receitas Studio | packages/studio e packages/studio-runtime | Consumir exemplos/runtime por versão; não alterar pedagogia como efeito da produção |

Contratos a fechar em L1:

| Objeto/operação | Dados e garantias mínimas |
| --- | --- |
| Operação editorial | operationId, projectId, entityId, componentId opcional, baseRevisionId, payload validado. Autor e dispositivo resolvidos pela autenticação |
| Resultado de operação | Aplicada com revisão/evento, repetida com o mesmo resultado, conflito com ambas as bases, ou recusada por acesso/validação |
| Fluxo de alterações | Cursor, eventos ordenados, exclusões e indicador de necessidade de novo retrato; filtragem por acesso |
| Solicitação de execução | Intenção ajustar/alternativas/adaptar, peça/representação, revisão/contexto congelados, capacidade, executor, escopo alterável/protegido e limites de execução |
| Disponibilidade de ação | Capacidade requerida, local de execução, permissões, estado conhecido do dispositivo e motivo de indisponibilidade |
| Passagem web → desktop | Referência opaca com validade, usuário autorizado, projeto, peça, revisão, seleção e intenção; sem token de sessão, comando ou caminho na URL |
| Tentativa | runId, attemptId, dono, dispositivo, concessão temporária, sessão local opaca, estado e checkpoints |
| Arquivo | Identidade, origem, hash, tamanho, MIME, dimensões, dependências, estado local/enviando/confirmado |
| Edição publicável | Revisões de texto/arte, legenda, sequência e hashes finais confirmados, alt, verificações, aprovador e data; aprovação de prévia não aprova um arquivo futuro |
| Variante e adaptação | sourceContentId/sourceRevisionId, formato editorial, mídia, representação escolhida e histórico; aprovação pertence à revisão |
| Projeto de vídeo | schemaVersion, fps racional, dimensões, IDs de clipes/trilhas, intervalos de origem, posição/duração, áudio, efeitos, fontes e recipeVersion |
| Mídia e legenda | Original/proxy/final, hashes, duração, codec, rotação, timebase, fontes/receitas e vínculo à transcrição/timestamps; referências por identidade, sem caminhos locais como contrato |
| Observação e acompanhamento | Fonte/ID/URL, datas, período, métrica/denominador, estado de disponibilidade, cobertura, hipótese, última coleta e orçamento permitido |
| Registro de importação | importRunId, origem/hash, identidade editorial, destino, classificação, resultado e conflito |

Peça é a identidade editorial; representação define formato/mídia; revisão é imutável; o rascunho aponta para a revisão corrente; edição aprovada fixa o resultado; publicação registra o envio. A tarefa produz uma revisão, sem substituir essas identidades.

A chave idempotente inclui escopo/ator e hash do pedido. A gravação de alteração/evento é transacional. Um identificador informado pelo cliente não autoriza acesso. O protocolo não exige transferir sessões privadas entre pessoas.

## Sequência e liberação

L0 → L1 → L2 → L3 estabelece a base. L4 depende de L1 e usa L3 para execução assistida; L5 depende de L3/L4. L6A e L6B dependem de L3/L4/L5, sem dependência entre si; L6C integra ambos. L7 consolida aprovação, publicação e métricas existentes.

L8A começa após L1/L3/L4 para inventariar e carregar em preparação; suas amostras ajudam a validar L5/L6. L8B reconcilia o acervo completo após L8A/L5/L6/L7, verifica o delta e ativa os projetos. L9 exige L0–L7, L8A e L8B completos. Isso descreve dependências técnicas, não autoriza execução automática de vários agentes.

A primeira liberação cotidiana acontece em L9, com assinaturas, acervo, pesquisa, planejamento, produção, aprovação e leitura das métricas existentes. L10 amplia monitoramento, alertas e análises por objetivo; L11 reúne expansões condicionadas ao uso. Cada lote demonstra uma fatia utilizável em ambiente controlado; demonstração intermediária não equivale a liberar um produto incompleto. Estimativas de prazo/esforço são recalibradas após L0 e as medições de L3/L6.

## L0 — Provar assinaturas e execução desktop

**Dependência:** nenhuma implementação prévia; usar a proposta e as condições oficiais vigentes.

**Entregáveis:** prova curta no shell Electron, registro da modalidade admitida, capacidades realmente verificadas e dependências necessárias. A escolha de Electron e Remotion já está feita.

- [x] Registrar o enquadramento do desenho local interno e as condições de distribuição de cada provedor, distinguindo execução comprovada de autorização comercial individual. Não extrapolar a prova para serviço hospedado de inferência.
- [x] Executar pelo protótipo uma tarefa textual no Codex e outra no Claude, via clientes oficiais, com modalidade de assinatura identificada.
- [ ] Criar e editar uma imagem pelo caminho nativo do Codex; capturar eventos, resultado, arquivo e falha estruturada.
- [ ] Demonstrar login oficial por interface, ausência de credenciais exportadas e não utilização de fallback pago.
- [x] Incorporar uma composição React/Remotion simples ao shell: clipe fornecido, corte e texto animado, com prévia e exportação local usando os mesmos parâmetros.
- [x] Verificar o caminho de provisionamento de FFmpeg/Chromium/Whisper.cpp/fontes, uma transcrição curta em português e dependências de captura do Studio; registrar limitações, sem implementar todo o pipeline.
- [x] Registrar enquadramento/custo de licença Remotion, versões e protocolos suportados. Editor Starter não integra a primeira entrega.

**Verificação parcial dos itens abertos:** imagem criada e editada de verdade, com arquivos/hashes e inspeção visual. Falhas de protocolo/processo, timeout e imagem inválida têm testes controlados; falta exercitar a falha nativa específica de geração. As contas existentes foram reconhecidas e usadas pela ponte Electron. O primeiro login de conta desconectada pela interface ainda não foi exercitado; nenhuma sessão existente foi encerrada para forçar esse cenário. O usuário confirmou organização de até três pessoas, enquadrada na licença gratuita Remotion nas condições registradas.

**Validação:** evidências reais do protótipo e dos arquivos, sem depender apenas de capability=true. Separar fixture de protocolo de inferência real. Instalador final em duas máquinas, catálogo de efeitos, todos os casos de codec e migração do acervo pertencem aos lotes seguintes.

**Saída:** os dois clientes, a imagem e uma composição Remotion incorporada funcionam no desenho admitido. Se uma capacidade obrigatória não tiver caminho, registrar o impedimento e a alternativa necessária, sem trocar silenciosamente por API paga nem liberar o produto sem o requisito.

**Reversão:** protótipo isolado, sem dados de produção nem mudança no fluxo legado.

## L1 — Contratos, dados e permissões

**Dependência:** L0. **Áreas:** marketing-contracts; domain/application; schema/repositórios; auth/gateway.

- [ ] Definir schemas versionados da tabela de contratos, estados de execução, códigos de conflito e limites padrão de tempo, chamadas, variantes e reparos por tentativa.
- [ ] Criar projeto/direção, evidência, pauta, componentes/revisões, manifesto, aprovação, execução/eventos e vínculo de uso de mídia.
- [ ] Acrescentar variantes de mídia, projeto de vídeo, legendas temporais e grafo de dependências; separar conteúdo editorial, destino e mídia sem quebrar os enums legados.
- [ ] Especificar operações de timeline por IDs estáveis e conflito de corte/reordenação; impedir intervalos inválidos ou fontes sem acesso.
- [ ] Definir permissões de consultar, editar, executar, aprovar, publicar e administrar; acumulação permitida conforme equipe.
- [ ] Implementar checagem de projeto/objeto e autoria no serviço, mantendo a borda staff+ e sem FK entre schemas.
- [ ] Acrescentar idempotência transacional e eventos de alterações/exclusões; preservar compatibilidade do conteúdo legado.
- [ ] Gerar/revisar migração aditiva e testar dados anteriores, índices e execução repetida das operações.

**Validação:** teste de integração em PostgreSQL para dois escritores com a mesma base, timeout após commit, chave reutilizada com outro payload e acesso negado ao objeto. Conferir que nenhum cliente escolhe o autor por simples campo no JSON.

**Saída:** contratos consumíveis por web/desktop e dados antigos legíveis. Aprovação nova só existe quando realmente realizada.

**Reversão:** desligar rotas/flags novas; conservar tabelas aditivas e dados. Não aplicar downgrade destrutivo.

## L2 — Desktop instalável e identidade

**Atualização de 16/10:** instalação dos clientes oficiais Codex/Claude pela interface Windows x64 e reabertura foram exercitadas. Atualização do Electron possui manifesto restrito, assinatura Authenticode obrigatória e encerramento coordenado; distribuição exige certificado/feed reais. Faltam o instalador do Sistema Zero efetivamente assinado, atualização entre duas versões, primeiro login desconectado e piloto físico. Ver `.audits/marketing-l2-install-update-review-2026-10-16.md`.

**Dependências:** L0, L1. **Áreas:** marketing-desktop; auth/gateway; componentes iniciais do workbench.

- [ ] Criar shell Electron local, ponte nativa com operações permitidas e supervisor separado da interface.
- [ ] Definir navegação que abrange todas as funções web; compartilhar componentes e transportes sem distribuir módulos server-only.
- [ ] Implementar abertura pelo web com referência opaca e acesso validado; abrir a peça/revisão/seleção correta sem execução automática oculta.
- [ ] Implementar vinculação do dispositivo à conta do Sistema Zero por navegador, código de uso único/prova de instalação, validade e revogação.
- [ ] Armazenar a credencial do app no sistema operacional; manter credenciais de inferência no cliente oficial.
- [ ] Integrar os dois adaptadores validados e diagnóstico por capacidade, sem restringir métodos nativos do binário Claude.
- [ ] Preparar instalador assinado e atualização verificável; definir versão mínima de protocolo sem apagar o cache antigo.
- [ ] Implementar estado em segundo plano, pausa, encerramento e mensagens de conexão.

**Validação:** instalação limpa em duas máquinas do piloto, identidade distinta, revogação, logout, reinício e tentativa de IPC por origem não permitida. Verificar que preview gerado não consegue chamar operações nativas. Na abertura pelo web, testar app ausente, link expirado, identidade diferente, repetição e intenção inválida.

**Saída:** cada usuário conecta sua conta e seu dispositivo sem terminal e consegue realizar o percurso de L0 no pacote do produto.

**Reversão:** desativar dispositivo/capacidade ou distribuir correção compatível; web e dados compartilhados continuam acessíveis.

## L3 — Sincronização, tarefas e arquivos

**Dependências:** L1, L2. **Áreas:** sync/execution no desktop, serviços/rotas equivalentes no marketing, R2 e BFF.

- [ ] Implementar fila local durável, reenvio idempotente, cursor confirmado após aplicação local e retrato de recuperação.
- [ ] Implementar um executor comum com adaptadores específicos, concessão temporária e proteção contra gravação de tentativa antiga; não fazer failover cego nem construir um framework genérico de agentes.
- [ ] Criar publicação de progresso por eventos persistidos e consulta incremental, com retomada após fechar a interface.
- [ ] Registrar artefatos/checkpoints antes de avançar; transferir com integridade e confirmação server-side.
- [ ] Retomar transferência de gravações grandes com integridade; separar estado de original, proxy e final. Nunca anunciar projeto completo quando só a prévia chegou.
- [ ] Fixar assets/fontes/receitas por hash e baixar dependências autorizadas antes de render; URLs temporárias não são identidade durável.
- [ ] Tratar rede ausente, cota, servidor indisponível, processo encerrado, arquivo faltante e resultado tardio. Limitar tentativas/reparos e manter diagnóstico; não repetir inferência sem limite nem ativar provedor pago.
- [ ] Medir duração por etapa, trabalho reutilizado, falhas/recuperações, variantes descartadas e consumo informado pelo provedor. Ausência de contagem não vira custo/token inventado.
- [ ] Encaminhar novo pedido para revisão da tarefa ainda não iniciada ou próxima tarefa dependente; não mudar a base de uma tentativa em curso.
- [ ] Separar estados local, enviando, confirmado, conflito e bloqueado; limitar cache sem eliminar pendências nem arquivos usados por tarefas ativas.
- [ ] Confirmar rascunho no servidor antes da passagem web → desktop e tratar conflito/revisão mais nova; devolver progresso e resultado ao web.

**Validação:** matriz com resposta perdida depois do commit, evento duplicado, cursor expirado, exclusão remota, upload parcial, perda de lease e dois dispositivos do mesmo usuário. A tentativa de publicar referência de arquivo não confirmado deve falhar.

**Saída:** nenhum sucesso é exibido à equipe antes da confirmação; reconectar não perde nem duplica alterações e não regenera um arquivo já produzido.

**Reversão:** pausar execução/sincronização nova preservando fila e artefatos; a equipe usa revisões já confirmadas.

## L4 — Direção, fontes e planejamento

**Dependência:** L1; execução assistida integra L3. **Áreas:** serviços de projeto/fontes/pautas e workbench/web.

- [ ] Criar direção vigente e histórico, referências visuais e decisões com origem.
- [ ] Estruturar relatos, interpretações e hipóteses; preservar citações e vincular fontes às peças.
- [ ] Disponibilizar investigação pelo app com resultados persistidos, fontes e proposta de mudança na direção.
- [ ] Montar contexto de tarefa por projeto/formato/seleção, com metadados/busca textual, evidência relevante e material protegido. Limitar tamanho; não anexar todo o acervo a cada pedido nem exigir serviço pago de embeddings.
- [ ] Versionar resumos com suas fontes e invalidá-los quando a base mudar; guardar decisões no projeto, sem depender da conversa privada do cliente de IA.
- [ ] Criar biblioteca de referências de posts/anúncios e listas de perfis/temas, com datas, fatos/inferências e origem. Aceitar cadastro, CSV/JSON e pesquisas pontuais.
- [ ] Oferecer “Criar variação desta referência”, ligando evidência, objetivo e hipótese à bancada, sem promover engajamento a prova de conversão.
- [ ] Criar calendário de pautas por semana/posição, separado de prazo e horário publicado.
- [ ] Importar amostra de direção, pesquisa e calendário para validar o mapeamento antes da carga integral.
- [ ] Oferecer painel, ideias, direção e calendário no Electron; indicar apenas as ações de pesquisa com IA que exigem executor local.

**Validação:** separar projetos/produtos, mostrar fonte usada, conservar duas revisões do mesmo dia e representar vinte semanas sem agendar posts. Conferir CTAs diferentes para feed, stories e ManyChat.

**Saída:** o usuário consegue planejar e iniciar uma peça com o contexto existente, sem recopiá-lo em prompts.

**Reversão:** preservar versões anteriores da direção; desligar sugestões automáticas sem perder cadastro e pauta.

## L5 — Copy, comparação e colaboração editorial

**Dependências:** L3, L4. **Áreas:** workbench; script-tab/caption-editor; revisões/componentes/comentários.

- [ ] Capturar o rascunho corrente ao iniciar a tarefa e congelar sua revisão de entrada.
- [ ] Modelar slides/cenas/legendas com IDs estáveis; manter formatos próprios para stories, Reels e peças de campanha.
- [ ] Implementar Ajustar, Gerar alternativas e Adaptar formato, também acessíveis por pedido livre; parte/todo, comparação e restauração por nova revisão.
- [ ] Aplicar ajuste explicitamente solicitado ao rascunho corrente após validação e checagem da base, com prévia e Desfazer. Exigir escolha para alternativas e resolver conflito/ambiguidade relevante antes de aplicar; não pedir confirmação de cada ferramenta.
- [ ] Criar novo rascunho ao alterar edição aprovada/agendada/publicada; conservar rejeições, decisões úteis e referência de origem.
- [ ] Preservar texto protegido, referência visual, objetivo e CTA; adaptar roteiro/duração ao novo formato sem sobrescrever a peça de origem.
- [ ] Conciliar mudanças em componentes distintos e resolver conflitos no mesmo componente sem sobrescrita.
- [ ] Vincular comentários à revisão e permitir passagem de tarefa para outra pessoa/provedor por contexto estruturado.
- [ ] Executar revisão por lote com escopo/exclusões e resumo das diferenças; não substituir referências aprovadas indiscriminadamente. Usar preferência de provedor persistida, com segunda revisão por outro agente apenas quando solicitada/necessária.
- [ ] Manter edição/comentários no web e no Electron; na geração local pelo web, mostrar indicação de desktop e abrir o pedido com o rascunho correto.

**Validação:** pedido simples aplicado com Desfazer; alternativas sem escolha não substituem rascunho; resposta de IA atrasada; briefing alterado antes de salvar; dois usuários no mesmo slide; slides distintos; ordem concorrente; citação real marcada pelo linter; revisão que preserva P01/P07/P34.

**Saída:** editar/revisar texto não destrói arte nem uma versão concorrente. O segundo operador entende a decisão anterior sem ler histórico privado de CLI.

**Reversão:** retornar a uma revisão anterior por nova operação registrada, preservando a história.

## L6 — Arte, edição de vídeo e Remotion

**Dependências:** L3, L4, L5. **Áreas:** marketing-production, media/execution do desktop, workbench, mídia e adaptadores de IA. Três sublotes revisáveis, todos anteriores a L9. L6A e L6B podem começar sobre a mesma base; L6C depende dos dois.

### L6A — Imagens e composição editável

- [ ] Transformar receitas úteis do fluxo atual em módulos versionados, com dependências/fontes.
- [ ] Gerar/editar imagens com referências; selecionar região/componente e conservar elementos protegidos.
- [ ] Executar exemplos reais do Studio e capturar runtime/Blockly com evidência.
- [ ] Separar texto/layout da imagem, aplicar mudanças por pedido à IA e renderizar só os componentes afetados.
- [ ] Comparar/reutilizar variantes; indicar limitações de PNG sem montagem e oferecer reconstrução assistida.
- [ ] Produzir originais, manifesto, prévia, alt e derivados compatíveis com distribuição.
- [ ] Retomar P29 por artefatos existentes; conferir P01/P34 na edição só de copy, P07 na captura e P08 no estado real.

**Saída e validação:** arte utilizável e revisável pelos dois clientes; alteração parcial preserva hashes dos assets mantidos. Qualidade avaliada por legibilidade, continuidade, dimensões e fidelidade ao produto.

### L6B — Remotion incorporado, gravações, áudio e legendas

**Atualização integrada de 16/10:** uma gravação de tela existente do P21 foi enviada pela web, confirmada, vinculada à montagem e preparada no desktop. Codex aplicou corte e texto animado; Remotion exportou o MP4 e a web reproduziu o proxy confirmado. O original foi preservado. CORS do bucket de testes e acompanhamento automático da confirmação na biblioteca foram corrigidos. Prova, hashes, reabertura sem nova geração e limites em `.audits/marketing-l6-recorded-video-review-2026-10-16.md`. Não substitui filmagem de celular/fala nem segundo computador.

- [ ] Incorporar Remotion como biblioteca: composição React pura no pacote de produção, Player no workbench e renderer/bundler no processo local. Compartilhar componente, parâmetros, assets, fontes e versões; não criar serviço/editor/plugin separado.
- [ ] Preparar bundle no build do app ou ao validar uma receita nova; reutilizá-lo enquanto não houver mudança. Dependências Node de renderização não entram no bundle web.
- [ ] Receber vídeo/áudio/imagem por upload web ou seleção desktop, com original imutável e sincronização rastreável.
- [ ] Preparar metadados e, sob demanda, miniaturas, forma de onda, proxy e transcrição; tratar rotação, codec, arquivo inválido e taxa de quadros variável. FFmpeg complementa ingestão/transcodificação; Remotion compõe a montagem, evitando dois motores de timeline.
- [ ] Implementar operações internas de intervalo, divisão, corte, junção, ordem, velocidade, enquadramento, trilhas e volumes/fades, acionadas por pedidos à IA; desfazer/refazer por revisão.
- [ ] Gerar legendas por transcrição Whisper.cpp instalada pela interface, aceitar SRT fornecido e correções solicitadas à IA; correções aceitas e timestamps sobrevivem aos cortes.
- [ ] Compartilhar pedidos, contexto e prévias entre web/desktop; quando a prévia interativa não estiver disponível, usar proxy/render de revisão identificada. Prévia e exportação básica usam a mesma composição; render final ocorre quando solicitado ou ao preparar aprovação, sem reexportar a cada ajuste.
- [ ] IA analisa transcrição e frames temporais, planeja decisões com alvo/intervalo e executa operações validadas. Usuário avalia o resultado e pede ajustes, sem aprovar comandos/cortes individualmente.
- [ ] Testar interpretação de “retire pausas”, “use o trecho em que mostro o jogo” e “mude só o encerramento”; proteger falas e material mantido, sem inventar conteúdo não gravado.
- [ ] Implementar cancelamento de preparação/transcrição e recuperação após fechar/reabrir, conservando originais e saída concluída.

**Validação:** MP4 usual, MOV de celular rotacionado/taxa variável, clipe sem áudio, combinação de fps, caminho com espaços/acentos, SRT fora do intervalo, arquivo incompleto e falta de espaço. Corte fora de keyframe não pode congelar início; áudio/legenda acompanham a montagem. Edição não reencoda a cada interação.

**Saída:** gravação própria pode ser editada, legendada, sincronizada e retomada por outro operador sem terminal.

### L6C — Efeitos, composição híbrida e adaptação

- [ ] Ampliar as composições já incorporadas em L6B com cenas reais, imagem animada e composição híbrida; sobrepor textos, identificação, destaques, contador, lista, CTA e transições.
- [x] Versionar receitas e validar parâmetros. A IA pode ajustar código de composição em escopo isolado, com validação antes de integrar; não carregar código arbitrário no renderer com ponte Electron nem criar um sistema de plugins. Codex/Claude reais, preflight, retomada, PostgreSQL e percurso Electron → R2 → web comprovados em 16/10; auditoria `marketing-l6-composition-review-2026-10-16.md`.
- [ ] Adaptar story de imagem para vídeo, inclusive um item dentro de sequência, reaproveitando imagem/copy/CTA sem alterar os outros.
- [x] Permitir regenerar/ajustar só cena, texto ou efeito: ajuste solicitado atualiza rascunho com Desfazer, alternativas aguardam escolha. Recalcular apenas o trecho/dependências afetados. Reuso visual e áudio contínuo comprovados em 16/10; auditoria `marketing-l6-render-cache-review-2026-10-16.md`.
- [ ] Exportar arquivo válido para destino escolhido com checagem de duração, dimensões, áudio, texto/áreas seguras, codec e sincronismo.
- [ ] Registrar identidade do render por timeline/assets/fontes/motor; upload retomável e aprovação da saída exata.
- [ ] Mostrar “Requer app desktop” por ação local, com instalação/abertura preservando rascunho e seleção.

**Validação:** vídeo gravado com trecho removido e animação sobreposta, imagem → story em vídeo, alteração só de CTA, legendas com acentos, fonte ausente, cancelamento de render, mídia ainda não sincronizada e resposta de IA atrasada. Reproduzir a mesma revisão no segundo desktop com igualdade temporal/textual/visual; não exigir hash de vídeo idêntico entre encoders/hardware distintos.

**Saída:** projeto editável e MP4 final conferidos e compartilhados; vídeo integra o percurso de aprovação. Não requer edição manual, voz sintética, avatar, Lambda nem API generativa paga.

**Reversão de L6:** selecionar receita/revisão anterior, preservar originais/variantes e bloquear apenas capacidade incompatível. Excluir cache só quando recuperável e fora de trabalho ativo.

## L7 — Aprovação, distribuição, retenção e métricas existentes

**Atualização integrada de 16/10:** exportação do final aprovado validada pelo núcleo nativo e download real da web, com bytes/hash do R2 idênticos e rascunho posterior preservado separadamente. Caixa nativa de destino e recuperação operacional remota continuam abertas. A prova do ciclo de aprendizado identificou e corrigiu o resultado de análise em texto separado: agora a IA atualiza uma revisão estruturada, hipótese e critério para a próxima pauta, com conflito e Desfazer. A regressão nativa passou com 434 testes; o percurso métricas → Electron/Codex real → sincronização → próxima pauta na web passou, usando métricas sintéticas explícitas, sem postagem social. Ver `.audits/marketing-l7-export-integration-review-2026-10-16.md`.

**Dependências:** L1, L3, L5, L6A–C. **Áreas:** publication.service, publisher-worker, mídia, arquivo, métricas e UI de aprovação/análise.

- [ ] Fixar edição aprovada com copy, legenda, arquivos finais confirmados/hash, ordem, alt, revisão da timeline/receita e verificações. Prévia aprovada não aprova automaticamente um arquivo final futuro; render posterior não substitui a mídia aprovada.
- [ ] Tratar adaptação como representação editorial; mudança de mídia exige checagem do destino. Nova postagem de conteúdo já publicado cria entrega/conteúdo derivado ligado à origem, sem cancelar histórico para contornar unicidade.
- [ ] Impedir troca de mídia após início de upload/envio externo; respeitar cancelamento/reconciliação e checkpoints do provedor.
- [ ] Acrescentar versão esperada à alteração da lista de assets e impedir ponteiro para “último arquivo”.
- [ ] Revalidar aprovação/arquivos ao agendar e ao assumir envio; impedir caminho legado incompatível no projeto migrado.
- [ ] Preservar checkpoints dos publicadores e reconciliar resultado externo incerto antes de repetir envio.
- [ ] Proteger assets com dependências ativas e implementar restauração utilizável pelo renderizador.
- [ ] Definir backup de banco/mídia e ensaiar restauração com manifestos; separar exclusão editorial de limpeza de cache.
- [x] Vincular publicação/edição/objetivo e snapshots de resultado; oferecer leitura assistida das métricas existentes/importadas que possa originar uma pauta/hipótese no primeiro ciclo.
- [x] Corrigir contratos/schema/agregações/UI para disponibilidade explícita: shares/saves ausentes não viram zero no worker, nem views indisponíveis no adaptador Facebook. Preservar zeros legados ambíguos como incerteza histórica, sem reclassificá-los sem evidência.
- [ ] Disponibilizar no Electron biblioteca, conexões, aprovação, agendamento, publicação e métricas já existentes no web, sempre pelos serviços centrais.

**Validação:** rascunho novo após agendamento; invalidação de evidência; mudança simultânea de assets; arquivo arquivado usado em outro trabalho; conversão PNG/JPEG; confirmação manual da edição correta. Testar sem publicar campanha real. Conferir métrica ausente, zero observado, legado ambíguo, origem/período e associação à edição efetivamente publicada.

**Saída:** o que será publicado coincide com a edição conferida e permanece recuperável; dados disponíveis sustentam análise inicial sem inventar valores ausentes.

**Reversão:** pausar apenas novos envios do fluxo afetado, conservar edição e checkpoints. Não “desfazer” publicação externa nem reenviar automaticamente.

## L8 — Alimentar o app com todo o acervo

**Execução:** L8A/L8B concluídos no ambiente nativo de revisão, em retratos datados. CDC/Sistema Zero: 4.167 origens preservadas e liberação após reconciliação de alterações reais; conferência final com 4.209 registros sem diferenças. Conserva 109 peças/grupos, 779 componentes, 80 pautas/20 semanas, 47 conferências e 227 artes vinculadas a 37 posts. P29, três fixados e seis destaques mantêm dez pendências de produção consultáveis. Sete conjuntos adicionais liberados, incluindo 560 arquivos Fluxo, uma omissão explícita e 17 extrações Office. A web consultou P01, arte/copy/alt, histórico e Office no inventário reconciliado; o Electron conferiu a liberação pela interface. Origens alteradas ganham versão, removidas permanecem no histórico e a reconciliação conserva revisões humanas. A regressão backend passou com 354 testes/2.024 assertions. Isso não constitui deploy ou carga de produção: L9, L10 e critérios anteriores abertos seguem pendentes. Docker dispensado pelo usuário. Ver `.audits/marketing-l8-review-2026-10-15.md`.

**Áreas:** novo contexto de importação no marketing, ferramenta desktop e biblioteca. L8A prepara cedo; L8B completa/reconcilia e ativa antes da liberação.

Subcargas ordenadas: direção/fontes → pauta/copy → originais/apoio → entregas/registros de revisão → histórico → reconciliação e ativação. “Todo” se refere ao acervo de marketing elegível, com disposição explícita de cada origem, não às dependências técnicas encontradas junto dos arquivos.

### L8A — Inventário e carga preparatória

**Dependências:** L1, L3, L4. Pode fornecer amostras reais a L5/L6, sem aguardar toda a produção.

- [x] Inventariar docs/marketing, planos editoriais, produção e referências em output; incluir arquivos pertinentes ignorados pelo Git.
- [x] Incluir meus-produtos do Fluxo Criativo: três produtos, 561 arquivos brutos na análise. Distinguir marketing, referência pedagógica e arquivo técnico; comparar identidade/conteúdo além do hash.
- [x] Classificar calendários, oferta/preços e posicionamentos antigos sem substituir direção vigente; Programando com Diversão não vira produto ativo por inferência.
- [x] Separar produtos/canais e excluir credenciais, caches, node_modules e propostas de engenharia da base de posicionamento.
- [x] Manter importação sem execução de scripts; isolar prévias HTML e revisar receitas antes de executá-las.
- [x] Congelar retrato com hashes e mapear origem → destino → revisão; classificar vigente, histórico, referência e incompleto.
- [x] Carregar em preparação, reconciliando o que já existir no app e conservando IDs editoriais. Similaridade sugerida pela IA não autoriza apagar/mesclar origens.
- [x] Preparar amostras de copy, montagem, arquivo final e pendência real; identificar PNG sem fonte editável e dependências ausentes.

**Validação e saída:** inventário reproduzível e amostras consultáveis, com proveniência e estados explícitos; nenhuma ativação ou aprovação por inferência. Revisar incompatibilidades antes de fechar parsers/produção.

### L8B — Reconciliação integral e ativação

**Dependências:** L8A, L5, L6A–C, L7.

- [x] Completar a carga de originais/componentes estruturáveis e vínculos, aproveitando os formatos validados em L5/L6.
- [x] Validar contagens, integridade, vínculos, ordem, textos, alt, fontes, precedência e amostra visual.
- [x] Detectar mudanças entre inventário e ativação e importar o delta com comparação; não sobrescrever trabalho já feito no app.
- [x] Resolver ou identificar ambiguidades, exclusões, duplicatas e dependências pendentes. Cada origem elegível precisa de destino ou motivo rastreável.
- [x] Ativar os projetos carregados e colocar pendências reais na fila de continuidade, sem publicar/agendar.

**Validação:** reexecutar não duplica. Conferir calendário principal, extras, stories, fixados, destaques, ManyChat e materiais dos demais produtos. P01 conserva combinação entre versões de copy e arte; P29 conserva incompletude.

**Saída:** o usuário encontra, consulta e continua o trabalho pelo app. Não basta subir um ZIP ou mostrar contagem de mídia. Materiais ambíguos ficam identificados para conferência, nunca aprovados por inferência. O acervo completo elegível de ambas as origens tem sua disposição reconciliada.

**Reversão de L8:** desativar a carga sem remover arquivos originais. Objetos já editados por pessoas não são apagados por rollback; reconciliar por revisão.

## L9 — Piloto colaborativo e primeira liberação

**Dependências:** L0–L7, L8A, L8B. **Áreas:** teste integrado, operação desktop/web e documentação.

- [ ] Executar o percurso com duas pessoas e dois computadores, alternando produção e revisão.
- [ ] Validar a matriz de todas as funções web no Electron, com as mesmas permissões e sem exigir navegador para concluir a operação comum.
- [ ] Validar a passagem web → desktop → resultado sincronizado, incluindo rascunho pendente, app ausente, sessão expirada, identidade diferente e abertura repetida.
- [ ] Mostrar trabalho concluído e incompleto do acervo e terminar uma peça usando suas referências.
- [ ] Executar um lote pequeno com exclusões, rever diferenças e aplicar só os itens aceitos.
- [ ] Corrigir uma frase sem regerar imagem, sem confirmação redundante e com Desfazer; ajustar só detalhe visual; comparar alternativas, escolher uma e restaurar a anterior; adaptar story de imagem para vídeo.
- [ ] Subir gravação própria, pedir à IA cortes/correção de legenda/animação Remotion, renderizar e continuar no segundo computador com a revisão correta. Demonstrar sem manipulação manual de timeline/canvas.
- [ ] Repetir os cenários críticos de concorrência, rede, upload, cota, suspensão, atualização e revogação.
- [ ] Completar pesquisa → pauta → produção → aprovação → preparação da publicação → leitura das métricas existentes/importadas, com próxima hipótese rastreável.
- [ ] Medir interface, sincronização, CPU/memória, cache, etapas de produção e tempo humano; comprovar limites de tentativa/variantes e ausência de fallback pago.
- [ ] Liberar para o projeto/equipe após aceitação funcional, registrar problemas residuais e instruções de recuperação.

**Carga do piloto:** acervo principal de referência com 60 pautas/227 arquivos, três sessões de equipe e um trabalho visual ativo; conferir novamente a base no congelamento. Metas propostas: feedback/navegação da interface p95 ≤100 ms e revisão pequena confirmada visível ao colega p95 ≤3 s em conexão saudável. Essas metas não são prazos de geração por IA nem de renderização. Registrar hardware/rede; medir upload e inferência separadamente. Incluir gravação de celular de alguns minutos e animação curta: tempo de ingestão/proxy/transcrição/render, precisão dos cortes, sincronismo, responsividade durante render, pico de RAM/disco e continuidade entre máquinas. L0 registra limites iniciais, detalhados em L6; não prometer todo codec/4K/duração sem medição. Começar com um trabalho pesado de captura/transcrição/render por dispositivo, mantendo UI/sync independentes; ampliar só com evidência.

**Saída:** assinaturas, acervo, trabalho em equipe, qualidade e recuperação demonstrados. Nenhum passo obrigatório exige terminal. Não aceitar perda silenciosa, conta compartilhada ou edição errada na publicação como “problema posterior”.

**Reversão:** pausar novas tarefas e manter consulta/exportação de revisões confirmadas; corrigir o lote causador sem apagar trabalho.

## L10 — Ampliação de análise, monitoramento e aprendizado

**Execução em 16/10:** relações e agrupamentos por edição aprovada, observações públicas/importadas estruturadas, ciclo análise → hipótese → pauta, feeds recorrentes no servidor, espera de pesquisa pessoal/manual, painel de novidades e análise do processo produtivo estão implementados. Provas web/Electron, revisão dos pacotes e builds passaram. Tempo humano é declarado e consumo tem cobertura explícita de resultados confirmados. Migrações novas `0028..0031`. Ver `.audits/marketing-l10-review-2026-10-16.md`. Os entregáveis abaixo estão demonstrados em revisão; a liberação permanece condicionada ao piloto L9 e aos critérios anteriores pendentes.

**Dependências:** L4, L7, L8B; liberação após L9. **Áreas:** métricas existentes, contexto de inteligência, workers de coleta, relações de objetivo/hipótese e telas de análise.

- [x] Ampliar as relações publicação/edição e a disponibilidade explícita já entregues em L7, acrescentando cobertura e comparações para novas fontes.
- [x] Exibir resultado por objetivo, necessidade, série e formato, com contexto comparável, tanto na web quanto no Electron.
- [x] Transformar uma análise em hipótese e proposta para o próximo ciclo, preservando a evidência.
- [x] Reutilizar MetricsWorker/política/repos de snapshots para contas próprias; ampliar coletas para novas fontes/watchlists com agenda/fuso, credencial adequada, budget, deduplicação, retry limitado, cancelamento e última coleta visível. Não duplicar coleta de publicações já atendidas.
- [x] Distinguir contas próprias conectadas, referências públicas e dados importados; ausência de likes/shares/views não vira zero. Informar denominador, amostra, cobertura e janela comparável.
- [x] Manter coleta suportada no servidor com desktop desligado; tarefa pessoal/IA local aguarda dono/dispositivo. Não transferir assinatura privada ao servidor.
- [x] Criar alertas no app para novidades/mudanças observadas e propostas de novas pautas/variações, com fonte e revisão humana.
- [x] Avaliar Apify/coletor externo somente como integração opcional explícita; importação manual segue disponível. Nenhum envio de mensagem, publicação ou alteração de mídia paga automática.
- [x] Ampliar a análise das métricas de produção já instrumentadas em L3: tempo humano, retrabalho, consumo informado, geração descartada e falhas recuperadas.

**Validação:** peça republicada com edições diferentes; dados ausentes; análise que não transforma correlação em prova. Demonstrar uma decisão de pauta baseada em resultados, sem alterar automaticamente a estratégia aprovada. Testar dado oculto, snapshot parcial, mudança de definição, timezone, coleta duplicada, quota, rede ausente, fonte removida e desktop offline; falha não produz falsa queda de métrica.

**Saída:** o ciclo inicial de L9 ganha acompanhamento recorrente de novas fontes, alertas e comparações ampliadas, mantendo rastreabilidade.

**Reversão:** ocultar projeções analíticas novas mantendo snapshots e histórico.

## L11 — Expansões condicionais

**Dependência:** dados do piloto e necessidade real. Este lote não é requisito para a primeira liberação.

- [ ] Priorizar recursos avançados de vídeo pelo gargalo medido: tracking, multicâmera, remoção de fundo e montagens extensas. Cortes, legendas, efeitos básicos e Remotion já pertencem a L6.
- [ ] Avaliar avatar, TTS e vídeo generativo como serviços opcionais com modalidade/custo próprios, sem pressupor cobertura pelas assinaturas.
- [ ] Considerar controles manuais avançados apenas se a equipe pedir posteriormente; não são requisito para produzir nem substituem a edição por IA.
- [ ] Incluir novos sistemas operacionais somente após testar instalação, renderização, fontes e clientes oficiais.
- [ ] Avaliar streaming/notificações persistentes se o polling não cumprir a meta.
- [ ] Reavaliar execução hospedada com a modalidade e as capacidades comprovadas, sem migrar credenciais locais por conveniência.
- [ ] Otimizar o pacote Electron conforme medições de recursos, mantendo a escolha e a paridade funcional definidas.

Cada expansão recebe escopo, teste e critério próprios. Não converter L11 em um conjunto obrigatório de funcionalidades indefinidas nem usá-lo para deslocar requisitos de L0–L10.

## Verificação e documentação por lote

1. Selecionar os cenários de falha e os invariantes alterados antes de implementar.
2. Acrescentar testes que reproduzam esses comportamentos; validar contra a ausência/defeito da implementação.
3. Implementar e executar os testes direcionados.
4. Rodar typecheck/check e regressões dos pacotes afetados; construir o frontend/instalador quando alterados.
5. Demonstrar o resultado funcional, registrar migração/reversão e revisar o lote.
6. Registrar mudança pequena e revisável; não misturar migração de acervo, atualização de clientes e alterações editoriais sem relação.

Nos pacotes existentes, os scripts foram conferidos: marketing, marketing-app, auth e api-gateway possuem bun test, bun run typecheck e bun run check. Marketing-app possui bun run build. Executar no diretório do pacote. No auth, check inclui validação de migrações. Os novos pacotes devem oferecer scripts equivalentes e uma construção de instalador; comandos de empacotamento serão definidos ao adotar a ferramenta validada em L0.

Testes de sincronização usam falhas controladas de rede e banco real para os invariantes transacionais. Testes de contrato usam eventos sanitizados dos clientes; inferência real ocorre em cenários limitados do piloto, não em toda execução de CI. Testes visuais usam dimensões, texto, layout, capturas e julgamento editorial; não exigir reprodução exata de uma nova imagem generativa.

Atualizar docs/marketing.md, os guias operacionais dos pacotes, o procedimento de recuperação desktop, o manifesto de importação e o registro de compatibilidade. O estado do lote deve apontar evidências, não apenas uma lista de arquivos alterados.

## Cobertura da proposta

| Requisito | Lotes responsáveis |
| --- | --- |
| Assinaturas imediatas e imagem nativa | L0, L2, L6, L9 |
| Electron com todas as funções web | L2, L4–L7, L9, L10 |
| Indicação de ação local e passagem de contexto | L1–L3, L5, L6, L9 |
| Equipe, identidade e autorização | L1–L3, L5, L9 |
| Sincronização, falhas e arquivos | L3, L7, L9 |
| Pesquisa, posicionamento e contexto | L4, L8A/L8B |
| Calendário e todos os tipos editoriais | L4, L5, L8A/L8B |
| Copy, arte, demonstração e revisão | L5, L6A |
| Edição/regeneração parcial e completa | L1, L5, L6A–C, L9 |
| Gravação, cortes, áudio, legendas e Remotion | L0, L1, L3, L6B–C, L7, L9 |
| Story de imagem → vídeo e variantes | L1, L5, L6C, L7, L9 |
| Aprovação, distribuição e arquivo | L7 |
| Todo o acervo e continuidade, incluindo Fluxo Criativo | L8A, L8B, L9 |
| Desempenho e economia | L3, L6, L9, L10 |
| Métricas existentes confiáveis e retorno inicial ao planejamento | L4, L7, L9 |
| Monitoramento e análises ampliadas | L10 |
| Referências, mercado e monitoramento | L4, L8A/L8B, L10 |
| Hospedagem, vídeo avançado e outras plataformas | L11, condicionados à necessidade |

Há execução e provas locais registradas nas auditorias por lote, incluindo importação preparatória de fontes e peças e recuperação de originais no R2 de staging. Isso não equivale à carga integral, publicação ou liberação cotidiana. A proposta completa permanece pendente dos critérios abertos, do piloto colaborativo e da revisão final.

### Atualização operacional de L8 — 16/10

A pausa por espaço em disco foi superada. L8 concluiu a reconciliação de 4.167 origens e a conferência final dos 4.209 registros do inventário, sem diferenças no retrato de liberação. Os sete conjuntos adicionais também receberam recibos de liberação. Dez pendências reais de produção permanecem visíveis. A regressão backend passou com 354 testes/2.024 assertions no PostgreSQL nativo. L9 entrou na medição de sincronização e corrigiu a corrida da sessão web; L10 e critérios anteriores continuam abertos. A orientação do usuário é continuar sem Docker, executar os lotes sem pausas para aceite e realizar commit/merge local somente após a revisão final.
