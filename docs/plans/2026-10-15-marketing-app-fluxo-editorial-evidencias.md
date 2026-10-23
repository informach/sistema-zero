**Evidências da revisão do app de marketing**

15/10/2026. Atualizado após a revisão de desktop, edição por IA, vídeo, Fluxo Criativo e migração do acervo. Apoio à [proposta revisada](2026-10-15-marketing-app-fluxo-editorial-proposta.md). Registra observações e sua consequência para o desenho; não é um relatório de implementação ou de testes em produção.

**Método e alcance**

Leitura do código de marketing/marketing-app e dos materiais do Instagram; inspeção dos clientes instalados; geração local de tipos do protocolo do Codex; consulta somente de leitura a autenticação e capacidades; pesquisa em documentação oficial. Não houve inferência, geração de imagem, publicação social, acesso ao banco de produção ou exportação de credenciais.

A documentação antiga do repositório foi tratada como orientação histórica quando divergia da implementação. As conclusões sobre comportamento do app abaixo vêm da leitura dos caminhos indicados; não foram exercitadas na interface.

**Código do produto**

| Evidência | Observação | Implicação |
| --- | --- | --- |
| [Serviço de copy](../../packages/marketing/src/application/ai/ai-copy.service.ts) | Geração lê conteúdo por ID; prompts usam campos delimitados. Melhoria usa o texto enviado e verificações do linter | Contexto editorial, fontes e artefatos precisam ser incorporados explicitamente |
| [Porta de IA](../../packages/marketing/src/infrastructure/gateways/ai/ai-copy.port.ts) | Contrato com configuração e chamada complete que devolve resultado estruturado | Substituir apenas o cliente HTTP não entrega sessões, ferramentas, eventos e arquivos |
| [Cliente OpenRouter](../../packages/marketing/src/infrastructure/gateways/ai/openrouter-copy-client.ts) | Caminho atual de inferência é uma chamada ao provedor | A integração por assinatura requer adaptadores e ciclo de execução próprios |
| [Editor de roteiro](<../../packages/marketing-app/src/app/(app)/conteudos/[id]/script-tab.tsx>) | Mantém título/briefing/roteiro localmente. Geração envia contentId; melhoria envia o roteiro corrente. Resposta executa setScript | Capturar base atual, validar alterações e preservar revisões; ajuste pedido atualiza rascunho com Desfazer, alternativas exigem escolha |
| [Editor de legenda](<../../packages/marketing-app/src/app/(app)/conteudos/[id]/publicacoes/[pubId]/caption-editor.tsx>) | Resultado de IA é aplicado ao campo da legenda | Comparação e histórico devem entrar no fluxo de edição |
| [Estado de IA](../../packages/marketing-app/src/components/ai/use-ai-status.ts) | Disponibilidade parte da configuração do recurso atual | Estado novo deve ser por usuário, dispositivo e capacidade |
| [Atualização de conteúdo](../../packages/marketing/src/application/contents/content.service.ts) | update altera campos e incrementa version; não produz edição imutável nem liga aprovação aos arquivos/texto. Aprovar etapa exige checklist | Introduzir edição aprovada, derivação de rascunhos e controle de impacto |
| [Publicações](../../packages/marketing/src/application/publications/publication.service.ts) | Criação depende de etapa elegível. setAssets valida arquivos da mesma peça e prontos, mas não recebe versão esperada como update | Fixar edição e proteger alteração de assets contra concorrência |
| [Calendário](<../../packages/marketing-app/src/app/(app)/calendario/calendario-client.tsx>) e [serviço](../../packages/marketing/src/application/publications/publication.service.ts) | Lista publicações por scheduledAt; serviço limita a janela de consulta a 92 dias | Vinte semanas planejadas precisam de projeção de pautas e paginação adequadas, não de datas artificiais |
| [BFF](<../../packages/marketing-app/src/app/api/marketing/[...path]/route.ts>) | Proxy atual trabalha com JSON e caminhos permitidos | Adicionar endpoints de tarefa/eventos; evitar prender a execução à requisição original |
| [Schema](../../packages/marketing/src/infrastructure/persistence/drizzle/schema.ts) | Conteúdo, mídia, publicações e estados existentes; não modela todo o histórico editorial e a composição proposta | Evolução aditiva, sem substituir o domínio de publicação |
| [Publicador Meta](../../packages/marketing/src/infrastructure/gateways/meta/meta-publisher.ts) | Valida JPEG para imagens de feed/carrossel | Derivados compatíveis fazem parte da entrega |
| [Repositório de mídia](../../packages/marketing/src/infrastructure/persistence/drizzle/media-asset.repository.ts) | Seleção para arquivo combina mídia pronta/R2, conteúdo publicado e updatedAt anterior ao corte | O tempo desde atualização do conteúdo não representa todas as dependências de uso |
| [Worker de arquivo](../../packages/marketing/src/infrastructure/workers/media-archiver-worker.ts) | Move mídia R2 → Drive e remove o objeto R2 após checkpoint | Novas referências ativas precisam participar da elegibilidade |
| [Resolução de mídia](../../packages/marketing/src/application/media/media.service.ts) | Arquivo arquivado resolve para URL de visualização do Drive | Renderizador precisa de restauração/download, integridade e acesso aos bytes |

O backend atual já contém publicadores, importação de mídia, arquivo e coleta de métricas. Não é correto descrevê-lo como um aplicativo exclusivamente manual. Também não há evidência nesta análise de que as contas e os serviços estejam ativos em produção.

**Método editorial e acervo**

| Fonte | Evidência relevante |
| --- | --- |
| [Instagram vigente](../marketing/kids/comunidade-dos-criadores/instagram/README.md) | Posicionamento, público e funções diferentes de cada espaço |
| [Calendário](../marketing/kids/comunidade-dos-criadores/instagram/03-postagens.md) | 60 peças principais em vinte semanas; IDs e ordem editorial são conceitos distintos |
| [Cobertura](../marketing/kids/comunidade-dos-criadores/instagram/postagens/12-mapa-cobertura.md) | Trinta dores, trinta desejos e classificação de relato/interpretação/hipótese |
| [Copy](../marketing/kids/comunidade-dos-criadores/instagram/postagens/13-guia-de-copy.md) | Clareza, frases conectadas, ações concretas, adequação por formato e preservação de relatos |
| [Direção visual](../marketing/kids/comunidade-dos-criadores/instagram/postagens/05-direcao-visual-e-producao.md) | Paleta, Nunito, variedade visual, referências e capturas do produto |
| [Índice de produção](../marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/README.md) | Entregas e instruções de continuidade |
| [P01, revisão v4](../marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p01-uma-ideia-dele/apoio/v4/fontes-e-producao.md) | Copy atualizada com preservação de arte anterior |
| [P07, produção v3](../marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p07-primeira-dificuldade/apoio/v3/fontes-e-producao.md) | Demonstração e refinamentos visuais que precisam conservar coerência; a revisão v4 preserva essa arte |
| [P34, publicação](../marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p34-a-ideia-veio-dele/publicacao.txt) | Entrega útil como referência de composição preservada |
| [P08, produção](../marketing/kids/comunidade-dos-criadores/instagram/producao/postagens/p08-uma-derrota-nao-conta-tudo/apoio/fontes-e-producao.md) | Asset gerado inserido no runtime, captura do estado real e bloco obtido pelo Blockly |
| [Revisão de força e precisão](../marketing/kids/comunidade-dos-criadores/instagram/pesquisas/revisao-forca-e-precisao-2026-10-13.md) e [revisão de clareza geral](../marketing/kids/comunidade-dos-criadores/instagram/pesquisas/revisao-clareza-geral-2026-10-13.md) | Revisões do mesmo dia possuem escopos e conclusões diferentes; há histórico superado e preservação intencional |
| [Campanha ManyChat](../marketing/kids/comunidade-dos-criadores/instagram/campanhas/manychat-desafio/README.md) | Peças, palavras-chave e fluxo de campanha não devem se perder na migração |

A contagem foi feita nas subpastas pNN de producao/postagens, considerando publicacao.txt e PNGs numerados diretamente em cada pasta. Resultado: 38 pastas, 37 publicacao.txt e 227 imagens numeradas. Não inclui indiscriminadamente imagens de apoio, prévias, históricos, fixados ou destaques. O registro de P08 discrimina 220 imagens em trinta carrosséis e sete imagens únicas.

P29, em producao/postagens/p29-aprender-a-fazer-hoje, contém apenas apoio nesta data. A preparação local em output/instagram/p29-2026-10-15/preparar.ts usa exemplo oficial do Studio, exportação de projeto e compilação de runtime. Reutiliza uma imagem de família já existente. O arquivo é ignorado pelo Git, confirmado com git check-ignore: serve como evidência do processo atual, não como dependência estável do produto proposto.

Em P08, a condição descrita é vida abaixo da metade, com 70 de 160 na captura e dano-base 22 na regra. O registro diferencia adaptações de visual/normalização, ações executadas e estado capturado. Isso fundamenta exigir proveniência e condições reproduzíveis, em vez de conferir apenas se a imagem “parece um jogo”.

**Verificações locais dos clientes**

| Verificação | Resultado observado |
| --- | --- |
| Versão de Codex | codex-cli 0.162.1 |
| Estado de login do Codex | Login por ChatGPT |
| Versão de Claude Code | 2.1.299 |
| Estado de Claude Code, campos selecionados | loggedIn=true; authMethod=claude.ai; apiProvider=firstParty; subscriptionType=max |
| Codex features | image_generation listado como stable e habilitado |
| Geração offline de tipos do App Server | Contratos de capacidades e itens de geração de imagem presentes |
| Inicialização de App Server por stdio | Resposta sem erro |
| modelProvider/capabilities/read | imageGeneration=true; webSearch=true |
| account/read com refreshToken=false | auth_type=chatgpt; plan_type=pro |

O processo de consulta do App Server foi iniciado sem janela e encerrado ao término. Foram usados initialize/initialized, modelProvider/capabilities/read e account/read; nenhum thread/start ou turn/start. A saída compartilhada selecionou os campos necessários e omitiu identidade pessoal e credenciais.

Os tipos gerados foram escritos em uma pasta temporária fora do repositório. O item ImageGenerationItem inclui estado, resultado, falha e caminho salvo opcional. Isso permite desenhar um coletor de artefatos, mas não comprova que toda geração devolva um arquivo utilizável: o adaptador deve validar sucesso, existência e integridade.

A ajuda local do Claude Code confirma modo programático, JSON/stream-json, retomada de sessão e schema de saída. A opção --bare desativa OAuth/keychain e exige autenticação de API; portanto, não deve ser adotada no conector de assinatura como atalho de isolamento. A escolha de modo deve preservar o login nativo e verificar a modalidade efetivamente usada.

Não foram feitos testes de logout, novo login, expiração de sessão, cota, geração, edição de imagem ou recuperação após falha. Tampouco foi confirmado o enquadramento comercial de uma implementação específica, ainda inexistente.

**Fontes oficiais consultadas**

| Fonte | Questão para a qual foi consultada |
| --- | --- |
| [Codex App Server](https://learn.chatgpt.com/docs/app-server) | Protocolo, autenticação e limites de aplicação |
| [Geração de imagens](https://learn.chatgpt.com/docs/image-generation) | Capacidade nativa e modalidade de uso |
| [Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source) | Escopo da integração oferecida |
| [Limitações da rota](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations) | Diferenças em relação ao cliente nativo |
| [VMs próprias](https://developers.openai.com/siwc/token-sharing-open-source/self-hosted-vms) | Escopo específico de execução remota |
| [Condições de Claude Code](https://code.claude.com/docs/en/legal-and-compliance) | Binário oficial, login e hospedagem |
| [Claude Code programático](https://code.claude.com/docs/en/headless) | Execução e respostas estruturadas |

As conclusões de arquitetura estão na proposta principal. A documentação é datada desta consulta; a implementação deve conferir sua vigência e compatibilidade com a versão dos clientes em L0.

**Evidências adicionais: desktop e equipe**

| Fonte local | Observação | Consequência para a proposta |
| --- | --- | --- |
| [Dependências do app](../../packages/marketing-app/package.json) | Next 16/React 19/TypeScript; componentes do pacote UI | Compartilhar a experiência sem copiar os primitivos existentes |
| [Cliente de API](../../packages/marketing-app/src/lib/api.ts) | Fetch para rotas da mesma origem e redirecionamento web em 401 | Desktop precisa de transporte e tratamento de sessão próprios |
| [Sessão](../../packages/marketing-app/src/server/session.ts) e [gateway do BFF](../../packages/marketing-app/src/server/gateway.ts) | Cookies/headers do Next e módulos server-only | Não empacotar essas funções como frontend estático nem distribuir segredos |
| [Lista de equipe](../../packages/marketing-app/src/app/api/team/route.ts) | Busca usuários dos papéis de equipe no auth | Reaproveitar identidade, sem confundir lista de responsáveis com autorização para execução |
| [Autorização do gateway](../../packages/api-gateway/src/application/pipeline/stages/authorization.stage.ts) | Verifica papéis e escopos do principal | Base para credencial desktop; acesso a objetos continua no domínio |
| [Concorrência de conteúdo](../../packages/marketing/src/infrastructure/persistence/drizzle/content.repository.ts) | Update condicionado ao ID e à versão esperada | Aproveitar controle otimista; acrescentar revisão por componente e conflitos explícitos |
| [Dispositivos de estudo](../../packages/auth/src/interfaces/http/routes/study-access.routes.ts) | Dispositivos vinculados ao fluxo de estudo/perfis | Não reutilizar esse contrato como autenticação de funcionários no desktop |
| [Sincronização do Studio](../../packages/studio/src/studio/cloud-sync.ts) | Callback para trazer projeto enviado ao professor | Não é protocolo de colaboração contínua nem resolve concorrência do marketing |

A busca por configurações de Electron/Tauri/Cargo nos caminhos pesquisados não encontrou uma base desktop pronta para reaproveitar. Essa busca não prova ausência de toda ferramenta nativa fora do escopo inspecionado.

**Acervo ampliado para a carga inicial**

A varredura por arquivos encontrou 1.910 itens em docs/marketing, incluindo 858 PNGs, 323 JSONs e 313 Markdown. Em output/instagram encontrou 38.225 itens, com grande volume de JavaScript, TypeScript e mapas de código. Essas são contagens brutas de arquivos, não entregas nem conteúdo elegível integralmente.

O material inclui [visão da Comunidade](../marketing/kids/comunidade-dos-criadores/visao-geral.md), [Desafio Primeiro Jogo](../marketing/kids/desafio-primeiro-jogo/README.md), [direção de Cadê Todo Mundo](../marketing/kids/cade-todo-mundo/direcao-copy-e-provas.md), [medição de funil](../marketing/medicao-funil.md) e [proposta em pesquisa](../marketing/propostas/caixa-em-sete-dias/pesquisa-2026-10-13.md), além do Instagram e de planos editoriais anteriores.

A varredura fundamenta uma importação com classificação, não uma cópia indiscriminada de diretórios. O inventário definitivo precisa excluir dependências/caches, resolver referências e contar arquivos/peças por projeto. Esta análise não fez leitura editorial integral dos 1.910 arquivos, upload ou importação.

Por solicitação do usuário, a migração integral precede a primeira liberação: L8A inventaria/carrega em preparação após L1/L3/L4; L8B reconcilia o total e ativa após L5/L6/L7; L9 comprova continuidade e trabalho em equipe. O [plano de lotes](../superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md) contém dependências, entregáveis, validação e reversão.

**Documentação oficial acrescentada nesta revisão**

| Fonte | Uso na análise |
| --- | --- |
| [Processos do Electron](https://www.electronjs.org/docs/latest/tutorial/process-model) | Separação de interface e execução |
| [Segurança do Electron](https://www.electronjs.org/docs/latest/tutorial/security) | Limites da ponte nativa e tratamento de conteúdo remoto |
| [Distribuição assinada](https://www.electronjs.org/docs/latest/tutorial/code-signing) | Requisitos de distribuição desktop |
| [Atualizações](https://www.electronjs.org/docs/latest/tutorial/updates) | Ciclo de atualização do cliente |
| [Tauri com Next.js](https://v2.tauri.app/start/frontend/nextjs/) | Limites do empacotamento estático |
| [Binários auxiliares](https://v2.tauri.app/develop/sidecar/) | Alternativa de execução nativa em Tauri |
| [WebViews](https://v2.tauri.app/reference/webview-versions/) | Diferenças de runtime de interface |

Após a comparação, o usuário escolheu Electron e definiu o desktop como superset funcional do web: todas as funções comuns, mais execução local. O web deve indicar as ações que exigem desktop e permitir continuar no mesmo contexto. Essa decisão substitui o caráter provisório da escolha; as metas de desempenho continuam propostas, não medições. O teste de capacidade do Codex registrado acima pertence à revisão anterior desta conversa e não foi repetido; também não houve inferência nova nesta revisão.

**Revisão adicional: edição por IA, vídeo e Fluxo Criativo**

A análise complementar está em [aproveitamento do Fluxo Criativo](2026-10-15-fluxo-criativo-aproveitamento-marketing.md). Origem examinada: C:/Users/tocha/Documents/fluxo-criativo. Foram conferidas as 202 entradas do inventário anterior por SHA-256, todas iguais ao registro de 01/10; aprofundou-se a análise de capacidades então não portadas e do acervo.

| Observação | Evidência | Consequência |
| --- | --- | --- |
| Edição deve ser conduzida por IA | Esclarecimento do usuário nesta revisão | Timeline interna; pedidos, prévias e versões como interface. Sem requisito de editor manual |
| Métodos parcialmente adaptados | .agents/marketing/manifest.json e importacao-fluxo-criativo.md | Reusar nove skills canônicas e incorporar capacidades ao app |
| Fluxo Criativo contém instruções de Remotion, sem projeto executável localizado | Origem: video-remotion.md depende de ~/cple-videos; ausência de TSX/remotion.config no escopo pesquisado | Incorporar a biblioteca Remotion diretamente ao app e adaptar o repertório; a ausência de projeto pronto não exige outra plataforma |
| FFmpeg já aparece em outro pacote | packages/live-recorder/src/segment-store.ts | Referência de processo/arquivo, sem confundir gravador de lives com editor de marketing |
| Repertório de edição existe | Origem: video-editar.md, video-efeitos.md, video-avancado/SKILL.md | Adaptar cortes, áudio, legendas e animações, removendo instalação improvisada e defaults de outro projeto |
| Alguns geradores exigem APIs externas | Origem: animar-criativo.py e generate-creative.py | Não herdar roteamento pago automático |
| Dashboard da origem não é monitor contínuo | Origem: instagram-dashboard/SKILL.md:323 e dashboard-social/SKILL.md:499 | Monitoramento ampliado é entrega de L10; métricas próprias reutilizam o worker já existente |
| Sistema Zero já coleta métricas periodicamente | MetricsWorker e collection-schedule; fontes por rede | Ampliar base atual; corrigir shares/saves ausentes zerados e views=0 do caminho Facebook em contrato/schema/agregação/UI no L7, antes da liberação |
| Ausências são zeradas | Origem: atualizar.py:201–268; pesquisar.py:242–287 | Métricas tipadas, denominador/cobertura e qualidade explícitos |
| Desktop anunciado está incompleto neste checkout | package.json aponta electron/main.js ausente | Nenhuma reutilização de shell pronto foi comprovada |
| Acervo externo ainda precisa ser conciliado | 561 arquivos; 534 candidatos comparados sem hashes idênticos nos diretórios alvo | Incluir origem externa em L8A/L8B, com comparação semântica, decisões de duplicidade rastreáveis e precedência |
| Story de imagem e de vídeo têm mesmo destino | ContentType story e PublicationFormat ig_story no domínio atual | Representação/mídia separada, sem simples troca de enum |
| Atualizações atuais não oferecem troca genérica de tipo/formato | Contratos e serviços de conteúdo/publicação examinados | Criar variante e operação de adaptação explícita, conservando edição publicada |

Fontes novas: [Remotion Player](https://www.remotion.dev/docs/player), [renderer](https://www.remotion.dev/docs/renderer), [vídeo](https://www.remotion.dev/docs/media/video), [Whisper.cpp](https://www.remotion.dev/docs/install-whisper-cpp), [Editor Starter](https://www.remotion.dev/docs/editor-starter), [licenciamento](https://www.remotion.dev/docs/license/pricing) e [FFmpeg](https://ffmpeg.org/ffmpeg.html). Consultadas em 15/10/2026. Player/render/ASR foram verificados como capacidades documentadas, não executados nesta análise. Licença precisa de enquadramento em L0; não foi assumido custo zero.

**Revisão de coerência e eficiência**

Esta passagem revisa os documentos em conjunto e incorpora a observação do usuário de que Remotion é uma biblioteca. Não acrescenta teste de inferência nem demonstração de um aplicativo implementado.

| Inconsistência ou atrito identificado | Correção consolidada | Lotes |
| --- | --- | --- |
| Remotion aparecia tardiamente, sugerindo um editor anterior e outra integração depois | Biblioteca incorporada desde o fluxo básico; composição React compartilhada para prévia/render, FFmpeg complementar | L0/L6B/L6C |
| Quatro ações de edição tinham alcance sobreposto | Ajustar, Gerar alternativas e Adaptar formato, além do pedido livre | L5/L6 |
| Toda revisão parecia depender de seleção/aceite separado | Ajuste explícito no rascunho corrente aplica revisão validada com Desfazer; alternativa exige escolha; publicação exige aprovação final exata | L5/L6/L7 |
| A carga do acervo começava tarde demais para influenciar a implementação | L8A prepara cedo e fornece amostras; L8B reconcilia integralmente e ativa antes de L9 | L8A/L8B |
| Correção de dados ausentes e leitura básica ficavam misturadas à expansão futura | Corrigir métricas existentes antes de liberar; L10 amplia fontes e análise | L7/L9/L10 |
| Medição de produção surgia depois do piloto | Instrumentação em L3, medição do piloto em L9, análise ampliada em L10 | L3/L9/L10 |
| Metas de interface podiam parecer promessa de tempo de IA | Separar feedback local/sync de geração, upload, transcrição e render; medir estes por etapa e hardware | L3/L6/L9 |
| Muitas etapas podiam repetir contexto, análise e render desnecessariamente | Contexto recuperado com orçamento, cache por dependência, uma variante por padrão, tentativa limitada e exportação final sob demanda | L3/L4/L6 |

A documentação de [integração do Player](https://www.remotion.dev/docs/player/integration) descreve reutilizar o componente para prévia e render. A [API de renderização](https://www.remotion.dev/docs/renderer) fornece o caminho de exportação. Fontes conferidas em 15/10/2026. A decisão arquitetural é mantê-las dentro dos pacotes de produção/workbench e do processo local; não criar servidor Remotion, editor separado ou framework de plugins.

A proposta principal é normativa. O plano detalha dependências/aceite; este caderno e a auditoria do Fluxo Criativo preservam fatos observados, seu alcance e as decisões derivadas.

**Verificações realizadas na documentação entregue**

A revisão final confere existência dos destinos locais, coerência entre proposta e evidências, ausência das premissas substituídas e preservação do escopo de documentação. Não se executa a suíte da aplicação para declarar comportamento novo, porque nenhum comportamento da aplicação foi implementado.
