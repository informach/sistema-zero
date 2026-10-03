# Revisão da medição — 03/10/2026

Status: três revisões e correções concluídas no ambiente local. A ressalva de desempenho da segunda revisão foi encerrada na terceira: o script passou nos quatro cenários com a máquina livre, a coleta não tem custo mensurável e o custo restante da página longa é tipografia (detalhes em `medicao-funil.md`). Migrações de produção e agendamento remoto de capturas ainda não foram executados. Este registro coordena a revisão de métricas com a implementação concorrente do Desafio/Farol.

**Alteração posterior solicitada pelo usuário no mesmo dia:** a coleta passou a ser automática, sem aviso de autorização na entrada. A preferência de desativação continua respeitada e nenhum aceite é fabricado. Essa decisão substitui as referências a coleta dependente de consentimento na revisão histórica abaixo. Estado atual, nova validação e operação: `docs/marketing/medicao-funil.md`; plano: `docs/superpowers/plans/2026-10-03-metricas-automaticas.md`. O helper de privacidade de `tests/browser/desafio-farol.ts` foi adaptado aos botões Ativar/Desativar; copy e perguntas do Desafio não foram modificadas por esta mudança.

## Segunda revisão — coleta automática

Revisão solicitada depois da mudança para coleta automática. Dois defeitos foram reproduzidos com testes que falharam antes da correção:

| Prioridade | Defeito | Correção e validação |
| --- | --- | --- |
| Alta | Se o quiz criasse o lead antes de terminar a abertura da sessão analítica, ambos os pedidos partiam sem o cookie um do outro e o vínculo podia ficar ausente. | O primeiro lote válido de visualização da página/pergunta recupera a associação pelo cookie do lead, limitada ao mesmo produto e a uma compra ainda não concluída. Teste de integração inclui lote misto, outro produto e compra concluída. `analytics-race.ts` atrasa a sessão no navegador e comprova vínculo/origem no PostgreSQL. |
| Média | Falha na requisição de desativação parava apenas o coletor daquela página; recarregar podia iniciar tudo novamente. | Preferência local salva antes da rede, interrupção nas demais abas e marcador de exclusão pendente. Nova tentativa ao carregar/reconectar; reativação aguarda a limpeza. `analytics-preferences.ts` cobre falha de rede, duas abas, recarga, exclusão e reativação. |

O painel de preferências recebeu limite de altura e rolagem para caber no celular na horizontal, também verificado no navegador. A entrada permanece sem janela de autorização, conforme solicitado, e não grava aceite automaticamente.

Validação desta rodada:

- **459 testes, 4.313 asserções, 47 arquivos; zero falhas**, incluindo o PostgreSQL local real.
- Typecheck: zero erros/warnings, um hint anterior. Biome: zero erros, quatro avisos anteriores de CSS. Build de produção isolada concluída.
- Navegação na build: raiz atualizada pela outra sessão, origem, FAQ, imagem, seção dinâmica, duas definições de quiz, desativação e proteção do admin passaram. Regressões de coletor no servidor de desenvolvimento também passaram.
- Pré-checkout real da Comunidade: contato ligado à visita e origem anteriores, um único marco comercial, nenhum campo pessoal nos payloads analíticos.
- Painel completo: clique → ingestão → PostgreSQL → worker → API autenticada → print, ponto e recorte. As capturas foram atualizadas para o visual corrente da raiz.
- Desafio/Farol: roteiro completo aprovado em instância isolada, com catálogo sintético, incluindo variantes, 19 FAQs, cupom e percursos condicionais. Sem envio de contato ou criação de cobrança. A disponibilidade do catálogo real continua sendo uma verificação de publicação; a fixture não a comprova.
- Performance final: sete amostras intercaladas por condição, cache vazio, CPU 4× e rede limitada. LCP mediano 1,7 s na raiz e 2,1 s na apresentação, CLS zero. **O script não passou integralmente:** apresentação sem coleta teve bloqueio mediano de 216 ms, acima dos 200 ms; com coleta, 200 ms. Rodadas anteriores e experimentos estão descritos em `medicao-funil.md`; medições brutas em `output/analytics/performance-mobile.json` e `performance-review-initial.json`. As alternativas experimentais de CSS não mostraram melhora consistente e não foram aplicadas. A redução do custo de layout continua pendente.

Não houve deploy, migração remota ou agendamento de worker. A revisão histórica abaixo registra o estado anterior à coleta automática; para operação, use `medicao-funil.md`.

## Terceira revisão — full review e fechamento (03/10, noite)

A sessão do Codex que fazia as métricas caiu antes de medir o ajuste do rodapé. O trabalho foi assumido por outra sessão, que fez um full review com dois revisores independentes (servidor/dados e navegador/acessibilidade/testes/documentação). Cada achado foi conferido no código antes da correção.

| Prioridade | Achado | Correção e validação |
| --- | --- | --- |
| Média | Depois de desativar, `/api/events` continuava gravando comportamento no cadastro (`viu_pagina_vendas`, `abriu_checkout`…), e a política dizia que a coleta parava. | Com `rejected`, `/api/events` responde 202 sem gravar. Respostas, início/conclusão do quiz, contato e pagamento seguem pelo cadastro, e a política agora descreve essa divisão. Teste em `api-leads.test.ts`. |
| Média | Desativar com a abertura de sessão ainda no servidor cancelava a resposta: o servidor criava o visitante, o cookie nunca chegava e a exclusão saía sem ele (visitante órfão por 90 dias). | A abertura de sessão não é mais cancelada ao parar; `stop()` devolve uma promessa e a desativação espera por ela (até 5 s) antes de pedir a exclusão. Nada é enviado depois. Regressão nova em `analytics-regressions.ts`. |
| Média | `AbortSignal.timeout` não existe antes do Safari 16: nesses iPhones a exclusão nunca acontecia e reativar ficava impossível. | `AbortController` + `setTimeout` na preferência e na abertura de sessão. Cenário no navegador com a função removida. |
| Média | Com cookies bloqueados, desativar não tinha efeito e o coletor abria uma sessão (e um visitante) a cada 5 s. | Sem `navigator.cookieEnabled` a coleta não inicia e o painel explica o motivo; 401 logo após abrir uma sessão conta como falha, com espera crescente. Cenário no navegador. |
| Média | A desativação só alcança o identificador atual (30 dias), mas os registros duram 90 dias. | Política e documentação dizem exatamente o que a desativação alcança. Alongar o identificador é decisão de produto pendente. |
| Média | O botão Privacidade cobria parte de "Escolher um plano" na barra fixa do celular e ficava por cima do pré-checkout. | Sobe acima da barra quando ela aparece e some com o modal aberto. Conferido a 390 px. |
| Média | Foco perdido ao desativar, fechar e no Esc; aviso escrito com a região ainda escondida. | Foco entra no painel ao abrir e volta ao botão ao fechar; região de aviso sempre presente fora do painel; erro aparece antes de receber o texto. Foco testado no navegador. |
| Média | `analytics-race.ts` não provava a recuperação: o Chromium ignora a troca do cabeçalho `cookie`. | O cookie do lead sai de fato do navegador durante a abertura; o teste afirma zero vínculos depois dela. Passou com o PostgreSQL real. |
| Baixa | Falha no vínculo recuperado derrubava o lote inteiro com 503. | Recuperação em `try/catch`; teste confirma que o lote é gravado. |
| Baixa | Desativação dividia o limite por IP com a coleta automática. | Bucket próprio de 60 por minuto. |
| Baixa | Textos antigos de "aceite" e "recusa" no painel; "Não gravamos o que você digita" impreciso; vínculo descrito só no quiz/pré-checkout. | Textos corrigidos no painel, no aviso e nas políticas. |
| Baixa | Testes fracos: status sem conferência, desativação sem identificador sem teste, recarga contando só eventos, outra aba sem conferir a pendência. | Asserções e testes acrescentados; o teste de preferências conta toda a coleta. |

Ficaram registrados, sem mudança nesta entrega: `analytics_visitors.first_attribution` dura enquanto o visitante continuar voltando (coluna não é lida); os testes de PostgreSQL das métricas pulam no CI sem `ANALYTICS_TEST_DATABASE_URL`, como já acontecia; o ajuste do rodapé de `/como-funciona/` (`content-visibility`) desenha igual mas não mostrou ganho mensurável no A/B, e a remoção dele foi bloqueada pela proteção da sessão por ser trabalho não commitado do Codex (fica a critério da dona).

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
