# Medição do funil — implementação de 03/10/2026

Implementada no pacote `packages/funnel`, com relatórios em **/admin → Métricas**. Ainda não publicada em produção. A captura de prints roda em um processo separado do site.

## O que é possível consultar

- Sessões e navegadores medidos, origem e campanha, páginas e versões visitadas.
- Seções vistas, botões vistos/clicados, abertura de dúvidas e recursos, ampliação de imagens e vídeos HTML nativos.
- Prints da página pública, pontos de clique sobre os elementos e recorte de seção ou botão.
- Perguntas vistas e respostas salvas, separadas por produto e versão: Comunidade, Desafio e demais quizzes registrados.
- Sessões com contato salvo, encaminhamento ao checkout, compra confirmada e receita inicial identificada.
- Conferência das compras sem vínculo de navegação. Recusa, bloqueadores, outra máquina e histórico anterior podem deixar compras sem vínculo.

Os filtros incluem datas, produto, ambiente, origem, campanha, página e versão. A tela distingue zero registros de falha de consulta. Os exemplos das imagens de QA do painel têm **contagens simuladas**, não representam vendas reais.

## Como ler as contagens

**Sessão:** navegação com permissão, encerrada após 30 minutos sem atividade. **Visitante medido:** navegador identificado por cookie; não equivale necessariamente a uma pessoa. Os dados analíticos não incluem quem recusou.

**Período:** sessões iniciadas nas datas selecionadas, no horário de Brasília. Compra atribuída à primeira sessão vinculada ao lead, com janela de sete dias desde o início da sessão. Dias recentes ainda podem receber compras. O quadro de conferência comercial usa outra base: data de pagamento, produto e todos os ambientes presentes naquele banco; não aplica origem/campanha/página.

**Clique de um elemento:** a tabela conta aberturas distintas da página, sem multiplicar visitas que clicaram várias vezes. O mapa usa a quantidade de cliques. Exposição exige visibilidade por um segundo ou interação. Perguntas que um percurso condicional não mostrou não entram no denominador daquela pergunta. Respostas são confirmadas por eventos do servidor, sem depender dos nomes legados de cada quiz.

**Receita:** valor congelado da cobrança inicial efetivamente confirmada. Não inclui renovações nem desconta reembolsos. Compras sem snapshot comercial são mostradas como sem valor disponível, não como receita zero.

## Páginas e perguntas podem mudar

O layout compartilhado descobre seções, links, botões, dúvidas e vídeos no HTML atual. Um observador acompanha os elementos que aparecem depois, incluindo ilhas React. Não há cadastro prévio de seções.

O identificador explícito é preferido; na ausência dele é calculada uma posição estrutural no HTML. Para manter a comparação de um botão mesmo ao reorganizar o layout:

```html
<section data-analytics-id="como-aprende">
  <h2>Como seu filho aprende</h2>
  <a href="/kids/comunidade-dos-criadores/oferta" data-analytics-id="ver-planos">Ver planos</a>
</section>
```

Mantenha IDs únicos na página. Ao mudar a função do botão, use outro ID. IDs automáticos podem mudar quando a estrutura é reorganizada. O hash do conteúdo público, estrutura, imagens e release separa as versões; elementos novos são descobertos sem editar o coletor. Conteúdo dinâmico é revisto com debounce de 200 ms. O mesmo ID em versões diferentes não é somado silenciosamente.

As perguntas têm snapshots imutáveis com produto, chave, texto, posição, tipo e opções. Alterações de texto, opções e ordem geram outra definição. O lead guarda a definição respondida. Uma aba desatualizada recebe uma instrução para atualizar; ela não escreve respostas antigas sobre outra definição. Ao mudar regras funcionais em helpers do quiz, atualize também sua versão declarada, pois mudanças internas de um helper não necessariamente mudam o texto da função que o chama. O snapshot mostra a ordem editorial das opções; opções embaralhadas podem ter aparecido em outra ordem para uma família.

Perguntas existentes não foram reescritas por esta implementação. Quizzes antigos sem a definição arquivada continuam no histórico de leads, sem inventar a pergunta que a família teria visto.

## Prints e mapas

O navegador do visitante envia identificador do elemento e ponto relativo do clique. **Não tira print, não grava vídeo e não acompanha movimento do mouse.**

O script `packages/funnel/scripts/analytics-snapshots.ts` abre somente páginas públicas reconhecidas, num navegador limpo, sem conta ou sessão de visitante. Bloqueia requisições de escrita, mascara campos, captura JPEG e guarda os limites dos elementos. O painel desenha os cliques sobre o print da mesma página, versão e largura de tela. Escolher uma seção recorta o print existente, sem baixar outra imagem.

Os prints representam o estado padrão da página. Um elemento fechado ou ausente não recebe um ponto em outro lugar: o painel informa que não foi desenhado. Cliques por teclado entram na tabela, sem coordenada. O mapa agrupa posições em intervalos de 5% do elemento e mostra até 3.000 grupos mais frequentes. Não é reprodução da sessão.

As larguras de 390 e 1280 px são capturadas antecipadamente. Outras larguras e variantes são descobertas a partir das visitas. Se a página já mudou antes da captura, o sistema não apresenta o layout novo como sendo o antigo. Por isso é necessário executar o processo após publicar e periodicamente. Uma página personalizada, quiz, resultado ou checkout não deve ser fotografada como se fosse a tela de um visitante.

## Privacidade, confiabilidade e desempenho

- Aceite explícito antes da coleta; botão Privacidade para mudar a escolha. Recusa preserva quiz e compra. Revogação para a coleta nas abas e remove os registros analíticos vinculados ao navegador, sem apagar os registros comerciais necessários.
- Identificador analítico aleatório e assinado, em cookie HttpOnly. Preferência e identificação por até 30 dias. Sessões e prints por 90 dias, com limpeza periódica. Definições das perguntas permanecem como contexto do histórico comercial.
- Sem valores de campos, texto de respostas, CPF, telefone, e-mail ou query string na telemetria. Texto só em páginas públicas; áreas pessoais devem receber `data-analytics-private`. Referrer reduzido ao hostname; fetch analítico usa `no-referrer`.
- Endpoint no mesmo domínio, validação fechada, limite de 48 KiB por requisição e 40 eventos, teto próprio por IP, ambiente decidido pelo servidor. O cliente não pode registrar compra confirmada.
- IDs únicos no banco tornam o reenvio idempotente. Fila de até 200 eventos, lotes pequenos, retry com espera crescente e envio ao sair da página. A fila fica na memória: fechamento abrupto, bloqueadores e perda prolongada de rede podem perder eventos. Não há promessa de captura de 100% das visitas.
- O coletor carrega após aceite. Na build validada: controle inicial de 939 bytes gzip, helper compartilhado de 710 bytes; após aceite, coletor de 2.420 bytes, descoberta do HTML de 1.394 bytes e atribuição de 593 bytes. Total desses módulos: 6.056 bytes gzip. Nenhuma dependência de Hotjar ou gravação de sessão foi adicionada ao visitante.
- Playwright e tsx são dependências de desenvolvimento/operação do processo de prints. O site não inicia Chromium. Os prints têm limite de 1,5 MB por imagem e 40 mil pixels de altura; estão no PostgreSQL, com acesso autenticado pelo painel.

## Ativação

1. Publicar o código pelo processo normal do projeto, aplicando as migrações geradas **0017, 0018 e 0019** antes de atender as novas rotas. São aditivas; foram aplicadas e testadas somente no PostgreSQL local `localhost:5433`.
2. No processo separado de captura, instalar as dependências do workspace, Node compatível com `--env-file-if-exists` e Chromium: `bunx playwright install --with-deps chromium`. Não executar essa instalação a cada visita nem dentro do handler HTTP.
3. Configurar as variáveis normais do funil para acesso ao banco e `ANALYTICS_CAPTURE_URL=https://sistemazero.com.br`. A origem vem da configuração, nunca de uma URL fornecida por visitante.
4. Executar `bun run analytics:snapshots`, a partir de `packages/funnel`, depois de cada publicação e agendar a cada 15 minutos num worker/cron separado. O comando usa Node; na verificação local, a inicialização de Playwright com Bun no Windows ficou presa, enquanto o mesmo lançamento com Node funcionou. `--refresh` refaz um print já existente apenas quando o hash daquela versão ainda coincide.
5. Conferir `/admin → Métricas`, ambiente Produção, após uma navegação consentida. O histórico começa na ativação. Não reutilizar capturas do ambiente local para representar produção.

Não foram alteradas configurações de produção nem criado um cron remoto nesta entrega. Esses são passos de publicação, não dependem de inserir identificadores em todas as seções.

## Verificação

Resultado final: **429 testes passaram**, além do teste com PostgreSQL executado separadamente; typecheck e build passaram. O lint manteve quatro avisos de especificidade CSS já existentes em `comunidade-quiz.css`.

Desempenho medido na build local em Chromium, 390 × 844 px, CPU desacelerada 4 vezes, sem limitação de rede, três execuções por cenário: raiz com mediana de LCP de 196 ms sem coleta e 152 ms com coleta; `/como-funciona/` com 520 ms e 496 ms. CLS mediano zero nos quatro cenários, após antecipar as fontes principais e reservar o espaço dos ícones. A diferença entre os tempos é variação da amostra; não significa que a coleta acelera a página. São resultados de laboratório local, não de conexões móveis reais em produção.

- Contratos, ingestão, consentimento, assinatura, deduplicação, versão do quiz e proteção de dados: testes automatizados.
- PostgreSQL real: reenvio, vínculo comercial, receita sem snapshot, perguntas vistas/respondidas sem duplicação, janela de sete dias, separação de ambiente e revogação sem apagar compra.
- Navegador real na build: raiz curta, imagem, atribuição, FAQ, seção criada dinamicamente, mudança de hash, ausência de conteúdo de formulário, dois quizzes, revogação e painel protegido.
- Painel React: print real local com contagens simuladas, ponto sobre botão e recorte de elemento.
- Capturas locais: raiz, `/como-funciona/`, oferta da Comunidade e oferta Pro em celular e desktop. **A oferta do Desafio respondeu 503 localmente** (`offer_unavailable`); nenhum print falso foi criado. O quiz do Desafio passou no teste de navegação.
- Evidências locais: `packages/funnel/output/analytics/`. Os scripts de navegador em `tests/browser/` executam com Node/tsx e precisam do servidor local. `analytics-panel.ts` usa o servidor de desenvolvimento para montar a ilha real; `analytics-smoke.ts` e `analytics-performance.ts` também funcionam na build.

## Entrada do Instagram

`/` agora é a bio curta com avatar existente, posicionamento e quatro acessos: Comunidade e planos, como funciona, quiz da Comunidade e Desafio. A apresentação anterior, com prints, percurso de aprendizado, recursos e FAQ, está em `/como-funciona/`. Os links preservam a origem sanitizada; o ajuste de espaçamento das dúvidas foi mantido.

Reprodução de sessões fica para uma próxima etapa, conforme a escolha do usuário.
