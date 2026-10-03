# Revisão da medição — 03/10/2026

Status: revisão e correções concluídas no ambiente local, com as verificações abaixo. Publicação, migrações de produção e agendamento remoto de capturas ainda não foram executados. Este registro coordena a revisão de métricas com a implementação concorrente do Desafio/Farol.

## Contrato compartilhado com os funis

- Uma única coleta em `BaseLayout`/`Analytics.astro`, um protocolo em `src/analytics` e um painel. Nenhum coletor próprio por produto.
- Rotas são reconhecidas pelo registry; seções e botões são descobertos no DOM. `data-analytics-id` e `data-analytics-section` são identificadores públicos estáveis opcionais. Não colocar nomes, e-mails ou respostas nesses atributos.
- Todo quiz deve enviar `quizDefinitionId` recebido do servidor na criação/PATCH. O elemento da pergunta ativa declara `data-analytics-question`, `data-analytics-quiz`, `data-analytics-attempt` (ID do lead) e `data-analytics-position` (posição efetivamente apresentada).
- O servidor arquiva perguntas, alternativas, ordem e versão. Ao alterar regras auxiliares do motor, incrementar também `quiz.version`. Não renomear a chave de uma pergunta que continua tendo o mesmo significado.
- `quiz_answer_saved` é emitido pelo salvamento compartilhado no servidor; nenhum quiz deve criar uma segunda contagem no navegador. Perguntas condicionais usam apenas tentativas nas quais foram apresentadas.
- Áreas com informação pessoal usam `data-analytics-private`. Formulários, diálogos, campos e páginas personalizadas não fornecem texto nem coordenadas à coleta.
- Copy, perguntas, regras pedagógicas, ofertas e novos componentes específicos do Desafio pertencem à sessão do Farol. Esta revisão atua na infraestrutura de analytics, painel, capturas e testes. Mudanças necessárias em arquivos compartilhados serão pequenas e reavaliadas contra o estado atual antes de editar.
- Preço, confirmação de pagamento e concessão de acesso continuam usando as fontes existentes do catálogo e do servidor.

## Achados e correções

| Prioridade | Falha reproduzida | Correção e evidência |
| --- | --- | --- |
| Alta | Uma cobrança antiga paga depois de outra tentativa atribuía o valor da última tentativa: R$ 397 em vez de R$ 67. | `paid_payment_id` registra a cobrança efetivamente confirmada. Teste PostgreSQL valida R$ 67. Históricos ambíguos ficam sem valor disponível. |
| Alta | Contato salvo pelo checkout direto não produzia o marco analítico; resposta e marco podiam ser gravados separadamente. | Contato/resposta e respectivo marco na mesma transação. Testes de banco cobrem a persistência e a rejeição de revisão concorrente. |
| Alta | Eventos de abertura/vídeo dentro de área privada escapavam da exclusão aplicada aos cliques. | Todos os coletores aplicam a mesma regra de privacidade. Regressão de navegador comprova ausência desses eventos. |
| Média | Pergunta repetida em uma nova tentativa não era contada; resposta muito rápida em formulário podia perder a exposição. | Exposição vinculada à tentativa; interação registra a pergunta, sem coletar o conteúdo do formulário. Espera de um segundo reiniciada ao trocar pergunta. |
| Média | Outra aba/produto trocava o cookie do lead e invalidava exposições legítimas ainda na fila. | Aceita tentativas anteriormente vinculadas ao mesmo visitante/ambiente, com validação da definição e rejeição de tentativas de terceiros. |
| Média | Sessão expirada descartava a interação que iniciou a nova sessão. | Renova a sessão e preserva as interações recentes; reinicia identificação da abertura e exposições. |
| Média | Recusa durante a inicialização assíncrona podia deixar o coletor iniciar depois. | Cancelamento via AbortSignal, revalidação de preferência no retorno do cache de navegação e erro de consentimento recuperável. |
| Média | IDs estruturais longos invalidavam um lote; barra final criava outra versão; mudança de layout com o mesmo texto não alterava o hash. | Limite de ID com sufixo estável, rota canônica e estrutura/classes/estilos no hash. Testes de protocolo e navegador. |
| Média | Checkout direto não entrava na jornada e o quiz de outro produto podia contaminar o filtro de jornada. | Relatório reconhece a página de checkout e limita a classificação ao produto selecionado. Testes de banco. |
| Média | Painel podia mostrar resultado atrasado, consultar a cada tecla ou manter mapa carregando após erro. | Atualiza o filtro ao sair do campo, ignora respostas canceladas, exibe erro do mapa; API normaliza a página e rejeita filtros incompletos antes de consultar o banco. |
| Média | Worker podia esperar indefinidamente, sobrepor execuções ou encerrar com sucesso após falha de captura. | Lock no banco, prazos por recurso/página/execução, comparação da geometria e retorno de falha. Recurso travado foi interrompido em cerca de 15 segundos, sem print. |
| Média | Falha no primeiro POST do quiz Pro apresentava perguntas sem tentativa válida. | Estado de erro com nova tentativa; pergunta aparece somente após criar/recuperar o lead. Teste de navegador reproduziu a falha e confirmou a recuperação. |
| Desempenho | Layout da página longa ocupava o navegador por tempo excessivo em CPU móvel simulada. | Perfil mostrou o gargalo; renderização sob demanda de seções/passos fora da tela reduziu o bloqueio mediano de cerca de 396 ms para 199 ms sem coleta. Capturas continuam completas. |

Os testes usam as definições atuais do registry, sem congelar as perguntas do Desafio em uma segunda regra. As falhas de comportamento foram verificadas com regressões antes/depois da correção. Não há mudança em valores de oferta nem na política de acesso aos produtos.

## Verificação

- `bun test`, com `ANALYTICS_TEST_DATABASE_URL` apontando explicitamente para o PostgreSQL local: **457 testes, 4.296 asserções, 47 arquivos; zero falhas**.
- `bun run typecheck`: zero erros, zero warnings, uma indicação de variável não utilizada em `resultado.astro`, alterado simultaneamente pela sessão do Desafio.
- `bun run check`: zero erros; quatro avisos anteriores de especificidade em `comunidade-quiz.css`.
- `bunx astro build --outDir ./.tmp/analytics-review-build`: sucesso.
- Navegador na build: consentimento, origem, FAQ e espaçamento, ampliação de imagem, seção dinâmica, versão, privacidade, perguntas da Comunidade e do novo Desafio, revogação e acesso protegido ao painel passaram.
- Recuperação de conexão: primeiro POST do quiz Pro falha, botão permite repetir, segunda tentativa abre pergunta com ID válido.
- Teste integrado do painel: clique real de visitante sintético → endpoint → PostgreSQL → worker de print → API autenticada → mapa e recorte. Somente o provedor de identidade é uma fixture local.
- Worker com imagem travada: falha sinalizada, zero prints salvos, execução encerrada em cerca de 15 segundos.
- Performance: Chromium 390 × 844, CPU 4×, rede 1,6 Mbps / 750 Kbps, latência 150 ms, cache vazio, três amostras por condição. LCP mediano ~1,5 s na raiz e ~2,1 s em `/como-funciona/`; CLS mediano zero. Bloqueio mediano de tarefas longas 11 ms na raiz e 193–199 ms na apresentação. É medição de laboratório, não dado de produção nem INP.
- Módulos de analytics somam 6.581 bytes gzip; controle inicial + helper somam 1.686 bytes. Coletor e descoberta só carregam depois do aceite.

Evidências: `packages/funnel/output/analytics/performance-mobile.json`, `painel-mapa.png` e `painel-recorte.png`. Scripts de regressão, integração de navegador e perfil estão em `packages/funnel/tests/browser/analytics-*.ts`; diagnósticos temporários ficam em `.tmp`.

## Pendências de ativação e integração

- Aplicar migrações aditivas 0017–0020 no ambiente de destino antes do código, publicar a aplicação e instalar/agendar o worker separado de prints. A revisão aplicou migrações somente no banco local; não fez deploy nem criou cron remoto.
- **Coordenação com Desafio/Farol:** a oferta `/kids/desafio-primeiro-jogo/oferta` ainda respondeu **503** na configuração local real durante a verificação final. O contrato da oferta/catálogo deve ser conferido pela implementação desse funil antes da publicação conjunta. Não foi colocado preço de fallback nem criado print para essa resposta. O novo quiz passou no teste de navegação e a suíte de seus contratos passou junto com a suíte completa.
- Histórico de versões que nunca foram fotografadas não recebe imagem retroativa inventada. A fila analítica é em memória e a coleta depende de consentimento; não equivale à totalidade de visitantes ou compradores.
- Reprodução de sessões permanece fora desta entrega, conforme a decisão do usuário.

## Alterações compartilhadas durante a revisão

- `FunnelRepo.saveQuizAnswers` e `mergeQuizAnswers` aceitam um último argumento opcional com o marco `quiz_answer_saved`. O handler comum já envia esse argumento. Resposta e marco são gravados na mesma transação; o componente do Desafio não deve emitir esse marco por conta própria.
- `updateLead` registra `contact_saved` junto ao primeiro contato completo, incluindo checkout direto. O endpoint `/api/contact` não insere um segundo evento.
- `markPaid` recebe opcionalmente o ID da cobrança confirmada. Os quatro pontos de confirmação existentes já passam esse ID. A migração aditiva `0020_analytics_review` adiciona `paid_payment_id` e índices; foi aplicada somente ao banco local. Não alterar preço, oferta nem concessão para integrar essa gravação.
- A rota compartilhada de quiz usa `no-store` para todos os produtos. Isso impede que o botão de atualização volte a abrir uma definição antiga servida pelo cache. Assets continuam com o cache normal da build.
- O novo Desafio já declara os quatro atributos da pergunta ativa usados pela medição. Não há tabela de perguntas duplicada no coletor.
- QA desta revisão usa uma build separada em `packages/funnel/.tmp/analytics-review-build` na porta 4322, preservando o servidor de desenvolvimento na 4321. O teste completo do painel inicia e encerra sua própria instância em porta local aleatória.
