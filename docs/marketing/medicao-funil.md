# Medição do funil — implementação de 03/10/2026

Implementada no pacote `packages/funnel`, com relatórios em **/admin → Métricas**. Ainda não publicada em produção. A captura de prints roda em um processo separado do site.

## O que é possível consultar

- Sessões e navegadores medidos, origem e campanha, páginas e versões visitadas.
- Seções vistas, botões vistos/clicados, abertura de dúvidas e recursos, ampliação de imagens e vídeos HTML nativos.
- Prints da página pública, pontos de clique sobre os elementos e recorte de seção ou botão.
- Perguntas vistas e respostas salvas, separadas por produto e versão: Comunidade, Desafio e demais quizzes registrados.
- Sessões com contato salvo, encaminhamento ao checkout, compra confirmada e receita inicial identificada.
- Conferência das compras sem vínculo de navegação. Recusa, bloqueadores, outra máquina e histórico anterior podem deixar compras sem vínculo.

Os filtros incluem datas, produto, ambiente, origem, campanha, página e versão. A tela distingue zero registros de falha de consulta. As imagens de QA do painel usam uma visita sintética local: clique, ingestão, banco, captura e relatório reais; apenas a autenticação usa um provedor local de teste. Não representam visitas ou vendas de produção.

## Como ler as contagens

**Sessão:** navegação com permissão, encerrada após 30 minutos sem atividade. **Visitante medido:** navegador identificado por cookie; não equivale necessariamente a uma pessoa. Os dados analíticos não incluem quem recusou.

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

- Aceite explícito antes da coleta; botão Privacidade para mudar a escolha. Recusa preserva quiz e compra. Revogação para a coleta nas abas e remove os registros analíticos vinculados ao navegador, sem apagar os registros comerciais necessários.
- Identificador analítico aleatório e assinado, em cookie HttpOnly. Preferência e identificação por até 30 dias. Sessões e prints por 90 dias, com limpeza periódica. Definições das perguntas permanecem como contexto do histórico comercial.
- Sem valores de campos, texto de respostas, CPF, telefone, e-mail ou query string na telemetria. Texto só em páginas públicas; áreas pessoais devem receber `data-analytics-private`. Referrer reduzido ao hostname; fetch analítico usa `no-referrer`.
- Endpoint no mesmo domínio, validação fechada, limite de 48 KiB por requisição e 40 eventos, teto próprio por IP, ambiente decidido pelo servidor. O cliente não pode registrar compra confirmada.
- IDs únicos no banco tornam o reenvio idempotente. Fila de até 200 eventos, lotes pequenos, retry com espera crescente e envio ao sair da página. A fila fica na memória: fechamento abrupto, bloqueadores e perda prolongada de rede podem perder eventos. Não há promessa de captura de 100% das visitas.
- O coletor carrega após aceite. Na build desta revisão: controle inicial de 982 bytes gzip, helper compartilhado de 704 bytes; após aceite, coletor de 2.611 bytes, descoberta do HTML de 1.582 bytes e atribuição de 702 bytes. Soma dos módulos: 6.581 bytes gzip, sem contar os cabeçalhos HTTP. Nenhuma dependência de Hotjar ou gravação de sessão foi adicionada ao visitante.
- Playwright e tsx são dependências de desenvolvimento/operação do processo de prints. O site não inicia Chromium. Os prints têm limite de 1,5 MB por imagem e 40 mil pixels de altura; estão no PostgreSQL, com acesso autenticado pelo painel.

## Ativação

1. Publicar o código pelo processo normal do projeto, aplicando as migrações geradas **0017, 0018, 0019 e 0020** antes de atender as novas rotas. São aditivas; foram aplicadas e testadas somente no PostgreSQL local `localhost:5433`. A 0020 identifica a cobrança paga e adiciona índices para os relatórios. Não preenche históricos ambíguos com valores presumidos.
2. No processo separado de captura, instalar as dependências do workspace, Node compatível com `--env-file-if-exists` e Chromium: `bunx playwright install --with-deps chromium`. Não executar essa instalação a cada visita nem dentro do handler HTTP.
3. Configurar as variáveis normais do funil para acesso ao banco e `ANALYTICS_CAPTURE_URL=https://sistemazero.com.br`. A origem vem da configuração, nunca de uma URL fornecida por visitante.
4. Executar `bun run analytics:snapshots`, a partir de `packages/funnel`, depois de cada publicação e agendar a cada 15 minutos num worker/cron separado. O comando usa Node; na verificação local, a inicialização de Playwright com Bun no Windows ficou presa, enquanto o mesmo lançamento com Node funcionou. `--refresh` refaz um print já existente apenas quando o hash daquela versão ainda coincide.
5. Conferir `/admin → Métricas`, ambiente Produção, após uma navegação consentida. O histórico começa na ativação. Não reutilizar capturas do ambiente local para representar produção.

Não foram alteradas configurações de produção nem criado um cron remoto nesta entrega. Esses são passos de publicação, não dependem de inserir identificadores em todas as seções.

## Verificação

Resultado após a revisão: **457 testes passaram**, com 4.296 asserções em 47 arquivos, incluindo PostgreSQL real e as alterações atuais do Desafio. Typecheck e build passaram. O lint não tem erros e manteve quatro avisos de especificidade CSS já existentes em `comunidade-quiz.css`; o typecheck apontou uma variável não utilizada em `resultado.astro`, arquivo da implementação concorrente.

Desempenho medido na build local em Chromium, 390 × 844 px, CPU desacelerada 4 vezes, rede de 1,6 Mbps de download / 750 Kbps de upload e latência de 150 ms, cache vazio, três execuções por cenário:

| Página | Coleta | LCP mediano | CLS mediano | Bloqueio por tarefas longas |
| --- | --- | --- | --- | --- |
| `/` | Recusada | 1.488 ms | 0 | 11 ms |
| `/` | Permitida | 1.480 ms | 0 | 11 ms |
| `/como-funciona/` | Recusada | 2.108 ms | 0 | 199 ms |
| `/como-funciona/` | Permitida | 2.112 ms | 0 | 193 ms |

O perfil de execução mostrou custo alto de layout na página longa. Renderização sob demanda das seções e passos fora da tela reduziu o bloqueio mediano sem coleta de cerca de 396 ms para 199 ms. O print operacional força a renderização integral, preservando a captura. Os limites automatizados são LCP mediano ≤ 2.500 ms, CLS ≤ 0,1 e soma mediana do excesso de tarefas sobre 50 ms ≤ 200 ms. Essa última medição cobre a janela observada pelo script, não equivale ao INP nem ao TBT de uma auditoria Lighthouse. As diferenças pequenas entre consentimentos são variação da amostra. São resultados de laboratório local; não garantem tempos em todos os aparelhos e conexões de produção.

- Contratos, ingestão, consentimento, assinatura, deduplicação, versão do quiz e proteção de dados: testes automatizados.
- PostgreSQL real: reenvio, contato e resposta atômicos, checkout direto, receita da cobrança efetivamente paga, receita sem snapshot, perguntas vistas/respondidas sem duplicação, jornada por produto, janela de sete dias, separação de ambiente e revogação sem apagar compra.
- Navegador real na build: raiz curta, imagem/ampliação, atribuição, FAQ e espaçamento de 24 px, seção criada dinamicamente, mudança de hash, ausência de conteúdo de formulário, dois quizzes, revogação, recuperação de conexão no quiz Pro e painel protegido.
- Regressões do coletor: elementos privados, tentativa reiniciada, pergunta respondida rapidamente, sessão expirada, início interrompido pela recusa, limite de IDs e versão do layout.
- Painel React: visita sintética local com banco/API/coleta reais, print pelo worker, ponto sobre botão e recorte de elemento. Provedor local de identidade usado somente para autenticar o administrador de teste.
- Captura com imagem travada: encerrou com código de falha em cerca de 15 segundos, sem salvar print.
- Capturas locais: raiz, `/como-funciona/`, oferta da Comunidade e oferta Pro em celular e desktop. **A oferta do Desafio respondeu 503 localmente** (`offer_unavailable`); nenhum print falso foi criado. O quiz do Desafio passou no teste de navegação.
- Evidências locais: `packages/funnel/output/analytics/`. Scripts de navegador executam com Node/tsx. Para a build isolada, use `bunx astro build --outDir ./.tmp/analytics-review-build`, suba seu servidor em uma porta livre e passe `ANALYTICS_CAPTURE_URL=http://127.0.0.1:<porta>`. `analytics-panel.ts` inicia sua própria instância dessa build e exige `.env` com banco local; `analytics-worker.ts` também exige banco local. `analytics-regressions.ts` usa o servidor Vite para importar o coletor diretamente. Diagnósticos de perfil ficam em `.tmp/`, fora dos arquivos de entrega.

Achados, correções e contrato com a sessão do Desafio: [revisao-medicao-2026-10-03.md](revisao-medicao-2026-10-03.md).

## Entrada do Instagram

`/` agora é a bio curta com avatar existente, posicionamento e quatro acessos: Comunidade e planos, como funciona, quiz da Comunidade e Desafio. A apresentação anterior, com prints, percurso de aprendizado, recursos e FAQ, está em `/como-funciona/`. Os links preservam a origem sanitizada; o ajuste de espaçamento das dúvidas foi mantido.

Reprodução de sessões fica para uma próxima etapa, conforme a escolha do usuário.
