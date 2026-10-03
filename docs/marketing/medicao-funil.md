# Medição do funil — implementação de 03/10/2026

Implementada no pacote `packages/funnel`, com relatórios em **/admin → Métricas**. Ainda não publicada em produção. A captura de prints roda em um processo separado do site.

**Comportamento atual, por solicitação explícita de 03/10/2026:** coleta automática, sem janela de autorização na entrada, incluindo o vínculo da navegação com o lead identificado no pré-checkout. O botão Privacidade abre somente por clique e permite desativar/reativar. Essa mudança técnica não registra consentimento implícito nem constitui validação jurídica; o usuário reservou essa avaliação para depois.

## O que é possível consultar

- Sessões e navegadores medidos, origem e campanha, páginas e versões visitadas.
- Seções vistas, botões vistos/clicados, abertura de dúvidas e recursos, ampliação de imagens e vídeos HTML nativos.
- Prints da página pública, pontos de clique sobre os elementos e recorte de seção ou botão.
- Perguntas vistas e respostas salvas, separadas por produto e versão: Comunidade, Desafio e demais quizzes registrados.
- Sessões com contato salvo, encaminhamento ao checkout, compra confirmada e receita inicial identificada.
- Conferência das compras sem vínculo de navegação. Recusa, bloqueadores, outra máquina e histórico anterior podem deixar compras sem vínculo.

Os filtros incluem datas, produto, ambiente, origem, campanha, página e versão. A tela distingue zero registros de falha de consulta. As imagens de QA do painel usam uma visita sintética local: clique, ingestão, banco, captura e relatório reais; apenas a autenticação usa um provedor local de teste. Não representam visitas ou vendas de produção.

## Como ler as contagens

**Sessão:** navegação medida automaticamente, encerrada após 30 minutos sem atividade. **Visitante medido:** navegador identificado por cookie; não equivale necessariamente a uma pessoa. Os dados analíticos não incluem quem desativou a coleta. Preferências anteriores de recusa são preservadas.

**Associação com a pessoa:** ao iniciar o quiz/criar o lead e ao salvar o contato, o servidor vincula a sessão ao lead por ID. Nome, e-mail e telefone permanecem no cadastro; o vínculo permite relacioná-los às interações anteriores do mesmo navegador. O identificador aleatório não torna esses dados anônimos. Não há identificação confiável entre dispositivos sem vínculo de cadastro, nem preenchimento retroativo de visitas que nunca foram coletadas.

Se o lead for criado antes de terminar a abertura da sessão analítica, o primeiro lote válido de visualização da página/pergunta recupera o vínculo. Essa recuperação exige os cookies válidos e o mesmo produto; não reassocia compras concluídas nem usa um clique isolado de outro produto.

**Período:** sessões iniciadas nas datas selecionadas, no horário de Brasília. Compra atribuída à primeira sessão vinculada ao lead, com janela de sete dias desde o início da sessão. Dias recentes ainda podem receber compras. O quadro de conferência comercial usa outra base: data de pagamento, produto e todos os ambientes presentes naquele banco; não aplica origem/campanha/página.

**Clique de um elemento:** a tabela conta aberturas distintas da página, sem multiplicar visitas que clicaram várias vezes. O mapa usa a quantidade de cliques. Exposição exige visibilidade por um segundo ou interação. Perguntas que um percurso condicional não mostrou não entram no denominador daquela pergunta. Respostas são confirmadas por eventos do servidor, sem depender dos nomes legados de cada quiz.

**Receita:** valor congelado da cobrança inicial efetivamente confirmada, identificada por `paid_payment_id`; uma nova tentativa de checkout não troca o valor da compra anterior. Não inclui renovações nem desconta reembolsos. Compras sem snapshot comercial e históricos com várias cobranças sem identificação da efetivamente paga são mostrados como sem valor disponível, não como receita zero.

Contato completo e resposta salva são registrados na mesma transação da atualização comercial. Isso cobre também o checkout direto; falha ao salvar não deixa um marco de sucesso separado. A exposição da pergunta acompanha cada tentativa, incluindo reinício e navegação em abas de produtos diferentes.

## Páginas e perguntas podem mudar

O layout compartilhado descobre seções, links, botões, dúvidas e vídeos no HTML atual. Um observador acompanha os elementos que aparecem depois, incluindo ilhas React. Não há cadastro prévio de seções.

O identificador explícito é preferido; na ausência dele é calculada uma posição estrutural no HTML. Para manter a comparação de um botão mesmo ao reorganizar o layout:

```html
<section data-analytics-id="como-aprende">
  <h2>Como seu filho aprende</h2>
  <a href="/kids/comunidade-dos-criadores/oferta" data-analytics-id="ver-planos">Ver planos</a>
</section>
```

Mantenha IDs únicos na página. Ao mudar a função do botão, use outro ID. IDs automáticos podem mudar quando a estrutura é reorganizada. O hash do conteúdo público, estrutura, classes/estilos, imagens, arquivos CSS e release separa as versões; elementos novos são descobertos sem editar o coletor. Mudanças no conteúdo e nos atributos acompanhados são revistas com debounce de 200 ms. Animações e mudanças isoladas de classe não disparam uma nova versão continuamente. O mesmo ID em versões diferentes não é somado silenciosamente. URLs com ou sem barra final representam a mesma página.

As perguntas têm snapshots imutáveis com produto, chave, texto, posição, tipo e opções. Alterações de texto, opções e ordem geram outra definição. O lead guarda a definição respondida. Uma aba desatualizada recebe uma instrução para atualizar; ela não escreve respostas antigas sobre outra definição. Ao mudar regras funcionais em helpers do quiz, atualize também sua versão declarada, pois mudanças internas de um helper não necessariamente mudam o texto da função que o chama. O snapshot mostra a ordem editorial das opções; opções embaralhadas podem ter aparecido em outra ordem para uma família.

Perguntas existentes não foram reescritas por esta implementação. Quizzes antigos sem a definição arquivada continuam no histórico de leads, sem inventar a pergunta que a família teria visto.

## Prints e mapas

O navegador do visitante envia identificador do elemento e ponto relativo do clique. **Não tira print, não grava vídeo e não acompanha movimento do mouse.**

O script `packages/funnel/scripts/analytics-snapshots.ts` abre somente páginas públicas reconhecidas, num navegador limpo, sem conta ou sessão de visitante. Bloqueia requisições de escrita, mascara campos, captura JPEG e guarda os limites dos elementos. O painel desenha os cliques sobre o print da mesma página, versão e largura de tela. Escolher uma seção recorta o print existente, sem baixar outra imagem.

Os prints representam o estado padrão da página. Um elemento fechado ou ausente não recebe um ponto em outro lugar: o painel informa que não foi desenhado. Cliques por teclado entram na tabela, sem coordenada. O mapa agrupa posições em intervalos de 5% do elemento e mostra até 3.000 grupos mais frequentes. Não é reprodução da sessão.

As larguras de 390 e 1280 px são capturadas antecipadamente. Outras larguras e variantes são descobertas a partir das visitas. Se a página já mudou antes da captura, o sistema não apresenta o layout novo como sendo o antigo. Por isso é necessário executar o processo após publicar e periodicamente. Uma página personalizada, quiz, resultado ou checkout não deve ser fotografada como se fosse a tela de um visitante.

O processo de captura usa um lock no PostgreSQL para evitar execuções sobrepostas, orçamento de dez minutos por execução e limite de 45 segundos por página. Aguarda imagens/fontes por até dez segundos, expande o conteúdo que o navegador renderiza sob demanda e confere versão, altura e posições antes/depois do print. Captura instável, página indisponível ou recurso travado produz falha sinalizada ao cron, sem salvar uma imagem incompatível. `--page=/como-funciona --width=390 --refresh` permite refazer uma captura específica.

## Privacidade, confiabilidade e desempenho

- A regra compartilhada em `src/analytics/preference.ts` inicia coleta quando não existe preferência de desativação. O cookie `sz_metrics=accepted` não é criado automaticamente; o endpoint legado `/api/analytics/consent` só grava a preferência após ação explícita. O botão Privacidade permite desativar ou reativar. Desativação para a coleta nas abas e remove os registros analíticos vinculados ao navegador, preservando quiz, cadastro e compra.
- A desativação é salva no navegador antes da chamada de rede. Se a exclusão falhar, a coleta continua desativada, inclusive em outras abas e após recarregar. `sz_metrics_cleanup=1` sinaliza somente a exclusão pendente, sem identificar a pessoa; o site tenta novamente ao carregar/reconectar e o servidor remove esse marcador quando termina. A interface informa a pendência. Reativar aguarda essa limpeza antes de iniciar outra identidade.
- Desativar com a abertura de sessão ainda no servidor (primeira visita em rede lenta) espera essa abertura terminar, por até 5 segundos, antes de pedir a exclusão. Assim o visitante que ela cria também é apagado, em vez de ficar órfão. Nada é enviado depois da desativação: o servidor já recebe o cookie `rejected` e responde 403.
- Com a desativação, os eventos de comportamento que o navegador manda ao cadastro (`viu_pagina_vendas`, `abriu_checkout`, `enviou_precheckout`, `redirecionou_checkout`) também param: `/api/events` responde 202 sem gravar. Respostas salvas, início e conclusão do quiz, contato e pagamento continuam, porque são registrados junto do próprio cadastro. A política descreve essa divisão.
- Navegador sem cookies próprios (`navigator.cookieEnabled` falso): a coleta não inicia, porque cada abertura de sessão criaria outro visitante. O painel informa que o navegador bloqueia cookies. Um 401 logo depois de abrir uma sessão nova conta como falha, com espera crescente, em vez de abrir outra sessão a cada 5 segundos.
- Os pedidos de preferência usam `AbortController` com prazo, e não `AbortSignal.timeout`, que não existe antes do Safari 16 (iPhones antigos). A desativação tem limite por IP próprio (60 por minuto), separado dos 120 da coleta, para não receber 429 num IP compartilhado.
- Identificador analítico aleatório e assinado, em cookie HttpOnly. Identificação por até 30 dias; a preferência (desativar ou reativar) dura 12 meses, porque a coleta é automática e a desativação não pode vencer junto com o identificador. **Limite conhecido:** os registros duram até 90 dias, então a desativação só alcança o identificador atual. Os registros de um identificador que já venceu (ou de antes de uma troca do `FUNNEL_HMAC_SECRET`) não são mais reconhecidos pelo navegador e saem pela retenção de 90 dias. A política diz isso. Alongar o identificador para 90 dias fecharia essa lacuna, mas aumenta o rastreamento; é decisão de produto, ainda não tomada.
- Safari (ITP) limita a 7 dias os cookies gravados por script. Isso só pesa quando a desativação falha na rede: `rejected` e `sz_metrics_cleanup` gravados pelo navegador podem vencer antes de uma nova visita. No caminho normal, o servidor regrava a preferência por 12 meses. Sessões e prints por 90 dias, com limpeza periódica. Definições das perguntas permanecem como contexto do histórico comercial.
- Sem valores de campos, texto de respostas, CPF, telefone, e-mail ou query string na telemetria. Texto só em páginas públicas; áreas pessoais devem receber `data-analytics-private`. Referrer reduzido ao hostname; fetch analítico usa `no-referrer`.
- Endpoint no mesmo domínio, validação fechada, limite de 48 KiB por requisição e 40 eventos, teto próprio por IP, ambiente decidido pelo servidor. O cliente não pode registrar compra confirmada.
- IDs únicos no banco tornam o reenvio idempotente. Fila de até 200 eventos, lotes pequenos, retry com espera crescente e envio ao sair da página. A fila fica na memória: fechamento abrupto, bloqueadores e perda prolongada de rede podem perder eventos. Não há promessa de captura de 100% das visitas.
- O coletor carrega automaticamente, exceto quando a preferência está desativada. Na build revisada: controle inicial de 1.572 bytes gzip, helper compartilhado de 710 bytes, coletor de 2.663 bytes, descoberta do HTML de 1.619 bytes e atribuição de 733 bytes. Soma dos módulos: 7.297 bytes gzip, sem contar cabeçalhos HTTP. Nenhuma dependência de Hotjar ou gravação de sessão foi adicionada ao visitante. O worker de prints desativa métricas no seu navegador operacional para não gerar visitas artificiais.
- Playwright e tsx são dependências de desenvolvimento/operação do processo de prints. O site não inicia Chromium. Os prints têm limite de 1,5 MB por imagem e 40 mil pixels de altura; estão no PostgreSQL, com acesso autenticado pelo painel.

## Ativação

1. Publicar o código pelo processo normal do projeto, aplicando as migrações geradas **0017, 0018, 0019 e 0020** antes de atender as novas rotas. São aditivas; foram aplicadas e testadas somente no PostgreSQL local `localhost:5433`. A 0020 identifica a cobrança paga e adiciona índices para os relatórios. Não preenche históricos ambíguos com valores presumidos.
2. No processo separado de captura, instalar as dependências do workspace, Node compatível com `--env-file-if-exists` e Chromium: `bunx playwright install --with-deps chromium`. Não executar essa instalação a cada visita nem dentro do handler HTTP.
3. Configurar as variáveis normais do funil para acesso ao banco e `ANALYTICS_CAPTURE_URL=https://sistemazero.com.br`. A origem vem da configuração, nunca de uma URL fornecida por visitante.
4. Executar `bun run analytics:snapshots`, a partir de `packages/funnel`, depois de cada publicação e agendar a cada 15 minutos num worker/cron separado. O comando usa Node; na verificação local, a inicialização de Playwright com Bun no Windows ficou presa, enquanto o mesmo lançamento com Node funcionou. `--refresh` refaz um print já existente apenas quando o hash daquela versão ainda coincide.
5. Conferir `/admin → Métricas`, ambiente Produção, após uma navegação sem preferência de desativação. O histórico começa na ativação. Não reutilizar capturas do ambiente local para representar produção.

Não foram alteradas configurações de produção nem criado um cron remoto nesta entrega. Esses são passos de publicação, não dependem de inserir identificadores em todas as seções.

## Verificação

Resultado da terceira revisão (full review, 03/10 à noite): **462 testes passaram**, com 4.344 asserções em 47 arquivos, incluindo o PostgreSQL local real (`ANALYTICS_TEST_DATABASE_URL`). Typecheck sem erros nem avisos. O lint não tem erros e mantém os quatro avisos de especificidade CSS já existentes em `comunidade-quiz.css`. Build isolada concluída.

Desempenho medido na build local em Chromium, 390 × 844 px, CPU desacelerada 4 vezes, rede de 1,6 Mbps de download / 750 Kbps de upload e latência de 150 ms, cache vazio, sete execuções intercaladas por cenário, com a máquina livre (2% de CPU no início):

| Página | Coleta | LCP mediano | CLS mediano | Bloqueio por tarefas longas |
| --- | --- | --- | --- | --- |
| `/` | Desativada | 1.644 ms | 0,0004 | 68 ms |
| `/` | Automática | 1.660 ms | 0,0004 | 77 ms |
| `/como-funciona/` | Desativada | 2.072 ms | 0 | 109 ms |
| `/como-funciona/` | Automática | 2.068 ms | 0 | 105 ms |

O script passou nos quatro cenários. A coleta automática não tem custo mensurável: com e sem coleta, as medianas ficaram iguais em todas as rodadas da noite.

**Atenção ao ler esse número:** o bloqueio da página longa é praticamente uma tarefa só, a primeira montagem da tela, e oscila muito com a carga da máquina. Na mesma noite, com outras sessões ocupando metade da CPU, as medianas ficaram entre 178 e 207 ms (amostras isoladas chegaram a 639 ms), e a rodada da segunda revisão deu 216 ms. Decomposta no rastreamento do Chrome, essa tarefa gasta quase todo o tempo no layout do texto: o navegador abre várias faces de fonte (a página declara Baloo 2, Nunito e Plus Jakarta Sans em quatro pesos cada, além dos ícones) e molda o texto na primeira montagem. É custo da tipografia da página, não das métricas. Reduzir pesos ou mudar a pré-carga das fontes é decisão de direção de arte, registrada como próximo passo caso seja preciso mais margem em aparelhos fracos.

O ajuste deixado pelo Codex no rodapé de `/como-funciona/` (`content-visibility: auto`) desenha os mesmos pixels a 390 px (a 1280 px muda só o antisserrilhado, por 0,125 px de rolagem), mas não mostrou ganho no A/B feito na mesma build e na mesma hora: 178 × 194 ms sem coleta e 207 × 205 ms com coleta, em nove amostras. Ele continua no CSS e fica a critério da dona: a remoção foi bloqueada pela proteção da sessão por ser trabalho não commitado de outra sessão.

A renderização sob demanda das seções e passos fora da tela, da revisão anterior, continua valendo; o print operacional força a renderização integral. Os limites automatizados não mudaram: LCP mediano ≤ 2.500 ms, CLS ≤ 0,1 e soma mediana do excesso de tarefas sobre 50 ms ≤ 200 ms. Essa última medição cobre a janela observada pelo script; não equivale ao INP nem ao TBT de uma auditoria Lighthouse. As rodadas anteriores com falha estão em `output/analytics/performance-review-initial.json`. São resultados de laboratório local em máquina compartilhada; não garantem tempos em todos os aparelhos e conexões de produção.

- Contratos, ingestão, consentimento, assinatura, deduplicação, versão do quiz e proteção de dados: testes automatizados.
- PostgreSQL real: reenvio, contato e resposta atômicos, checkout direto, receita da cobrança efetivamente paga, receita sem snapshot, perguntas vistas/respondidas sem duplicação, jornada por produto, janela de sete dias, separação de ambiente e revogação sem apagar compra.
- Navegador real na build: coleta automática sem aviso/aceite fabricado, desativação persistente após reload, reativação, raiz curta, imagem/ampliação, atribuição, FAQ e espaçamento de 24 px, seção criada dinamicamente, mudança de hash, ausência de conteúdo de formulário, dois quizzes, revogação e painel protegido. Recuperação de conexão no quiz Pro validada na revisão anterior.
- `analytics-linking.ts`: visita automática na raiz → oferta real da Comunidade → envio real do pré-checkout → lead com e-mail/nome/telefone ligado à sessão anterior no PostgreSQL. Exatamente um `contact_saved`; e-mail não aparece nos payloads de cliques. O script exige banco local e limpa seu cadastro sintético.
- `analytics-preferences.ts`: falha de rede na desativação (com o texto da pendência), duas abas (a outra aba mostra a pendência), recarga, nova tentativa de exclusão, foco ao abrir e ao fechar, reativação, painel em celular na horizontal, Safari sem `AbortSignal.timeout` e navegador com cookies bloqueados. Conta toda a coleta (aberturas de sessão e eventos), não só os lotes de eventos. Os scripts de inicialização vão como texto: o tsx embrulha funções internas em `__name()`, que não existe na página, e o script quebrava em silêncio.
- `analytics-race.ts`: o cookie do lead sai do navegador enquanto a abertura de sessão é enviada, e os eventos ficam retidos até ele voltar. O teste afirma zero vínculos logo após a abertura, então o vínculo encontrado no PostgreSQL só pode vir do primeiro lote de eventos. A versão anterior trocava o cabeçalho `cookie`, o que o Chromium ignora, e passava pelo vínculo da abertura de sessão sem provar a recuperação.
- Regressões do coletor: elementos privados, tentativa reiniciada, pergunta respondida rapidamente, sessão expirada, início interrompido pela recusa, limite de IDs, versão do layout e desativação com a abertura de sessão retida (o `stop()` só termina quando ela termina e nada é enviado depois).
- Painel React: visita sintética local com banco/API/coleta reais, print pelo worker, ponto sobre botão e recorte de elemento. Provedor local de identidade usado somente para autenticar o administrador de teste.
- Captura com imagem travada: encerrou com código de falha em cerca de 15 segundos, sem salvar print.
- Capturas locais: raiz, `/como-funciona/`, oferta da Comunidade e oferta Pro em celular e desktop. **A oferta do Desafio respondeu 503 localmente** (`offer_unavailable`); nenhum print falso foi criado. O quiz do Desafio passou no teste de navegação.
- O roteiro completo `desafio-farol.ts` passou de novo na terceira revisão: três ofertas, celular/desktop, 19 FAQs, imagens, pré-checkout, cupom, atribuição, quiz/resultados condicionais, recuperação de rede e reinício. Ele usa o painel de privacidade, mas não afirma que a coleta parou; quem prova a desativação são `analytics-preferences.ts` e `analytics-smoke.ts`. Usa o catálogo sintético isolado na porta 3347 e a build na 4347; não comprova a disponibilidade do catálogo real nem cria pagamentos.
- Botão Privacidade no celular: na oferta da Comunidade a 390 px, com a barra fixa visível, o botão fica 8 px acima dela e não cobre mais "Escolher um plano". Com o pré-checkout aberto, o botão some.
- Evidências locais: `packages/funnel/output/analytics/`. Scripts de navegador executam com Node/tsx. Para a build isolada, use `bunx astro build --outDir ./.tmp/analytics-review-build`, suba seu servidor em uma porta livre e passe `ANALYTICS_CAPTURE_URL=http://127.0.0.1:<porta>`. `analytics-panel.ts` inicia sua própria instância dessa build e exige `.env` com banco local; `analytics-worker.ts` também exige banco local. `analytics-regressions.ts` usa o servidor Vite para importar o coletor diretamente. Diagnósticos de perfil ficam em `.tmp/`, fora dos arquivos de entrega.

Achados, correções e contrato com a sessão do Desafio: [revisao-medicao-2026-10-03.md](revisao-medicao-2026-10-03.md).

## Entrada do Instagram

`/` agora é a bio curta com avatar existente, posicionamento e três acessos: como funciona (principal), quiz do Desafio e Comunidade com os planos. O quiz da Comunidade fica dentro de `/como-funciona/`, junto da apresentação com prints, percurso de aprendizado, recursos e FAQ. Os links preservam a origem sanitizada; o ajuste de espaçamento das dúvidas foi mantido.

Reprodução de sessões fica para uma próxima etapa, conforme a escolha do usuário.
