# Implementação de 20/10/2026: duas páginas Kids, funil adulto, quizzes, bio e termos

Implementa a [proposta aprovada no Canvas em 19/10/2026](proposta-2026-10-19/README.md). O código vive em
`packages/funnel`; o resumo técnico está no `CLAUDE.md` do pacote, seção "Comunidade dos Criadores em
três públicos".

## Endereços

| Endereço | O que é |
| --- | --- |
| `/` | Bio do Instagram: "Criar jogos não tem idade." e dois cartões, um para cada quiz |
| `/kids/comunidade-dos-criadores/oferta` | Página de 9 a 17 anos |
| `/kids/comunidade-dos-criadores/oferta/criar-junto` | Página do menor de 9, criando com um adulto |
| `/kids/comunidade-dos-criadores/oferta/continuar` | Continuidade Kids, redesenhada na segunda rodada |
| `/kids/comunidade-dos-criadores/oferta/{tempo-de-tela,criacao-de-jogos,expressao-visual,formacao-tecnologica,habilidades-escolares}` | 301 para `/oferta`, com a mesma query |
| `/kids/comunidade-dos-criadores/quiz` | Quiz Kids v6 |
| `/pro/comunidade-dos-criadores/oferta` | Página adulta |
| `/pro/comunidade-dos-criadores/quiz` | Quiz adulto v1 |
| `/pro/comunidade-dos-criadores/oferta/continuar` | Continuidade adulta, nova na segunda rodada |
| `/pro/comunidade-dos-criadores/checkout` e `/obrigado` | Assinatura adulta, mensal ou anual |
| `/como-funciona/` | 301 para `/kids/comunidade-dos-criadores/oferta#experiencia`, com a query |
| `/termos` | Índice dos Termos, um por oferta |
| `/<audience>/<produto>/termos` | O Termo de cada oferta |
| `/privacidade` | Política de Privacidade única |

`/pro` continua levando ao No Comando da IA, e `/kids` ao Desafio do Primeiro Jogo.

## O que entrou em cada parte

- **Páginas Kids:** desenho e copy do Canvas, preços dos planos ao vivo, economia do anual calculada,
  dois botões de plano que abrem o pré-checkout com o plano escolhido. Sem os botões "Jogue um jogo".
- **Quiz Kids v6:** entrada com filho ou filha e a idade em cartas, ramo de 9 a 17 anos e ramo do
  menor de 9 com pontuação própria, saída de 18 ou mais para o quiz adulto. Resultado em carta, com
  as respostas da família devolvidas no texto e o botão para a página do ramo.
- **Funil adulto:** página arcade, quiz com a saída "Tenho menos de 18 anos" para o quiz Kids,
  resultado em carta, checkout e obrigado no mesmo tema, Termo próprio. O preço vem do catálogo
  (R$ 97 por mês e R$ 797 por ano no seed).
- **Bio:** só os dois caminhos, sem atalho para oferta.
- **Termos e Privacidade:** um Termo por oferta, versão gravada em cada compra, Política única com
  capítulos para crianças e adolescentes e para adultos.
- **/admin:** Performance encadeia cada ramo do quiz Kids à parte; Respostas e Perfis rotulam os
  leads das versões anteriores; o funil adulto aparece no seletor.

## Decisões tomadas durante a implementação

A dona autorizou seguir sem consulta. Cada decisão abaixo seguiu a recomendação do plano.

- **Botão do resultado do menor de 9:** cada perfil tem o seu texto de botão (tabela em
  `result-copy-m9.ts`); o Canvas mostrava um só exemplo.
- **Saída de menor de 18 no quiz adulto:** é uma tela, não uma pergunta. Nada sobre idade é gravado.
- **Selo de produto no quiz adulto:** ficou de fora antes do resultado; o topo mostra só a marca e
  o selo de HUD "COMUNIDADE DOS CRIADORES", como no Canvas.
- **"Ter professor ao vivo"** é a necessidade que a pessoa declara no quiz adulto. O Canvas trazia
  "Ter aula ao vivo", trocado para nenhuma tela antes do resultado citar aula, como no Kids. No
  resultado, ela vira condição não atendida e o botão leva a conferir os requisitos.
- **Revisão de copy de 20/10/2026:** as cartas adultas não dizem mais "a gente vê essa história com
  frequência" (ainda não há alunos adultos); "Não é falta de vontade" virou "Vontade você tem, porque
  já tentou"; o relatório semanal sai "toda sexta, no fim da tarde"; o menu adulto é "Compras e
  assinatura"; o obrigado adulto não promete começar "hoje mesmo"; frases em que "ele" era o
  computador ou o bloco ficaram explícitas, para não virarem "ela" na versão da filha.
- **Relatos sem lugar nas páginas novas** ficaram numa lista de reserva com o motivo
  (`RELATOS_RESERVA`), em vez de saírem do código.
- **Checkout e obrigado** passaram a ler os textos do conteúdo de cada funil. O texto do Desafio e o
  da Comunidade Kids não mudaram.
- **Título da página de 9 a 17:** o marca-texto rosa virou um bloco único. Com o fundo linha a linha
  do Canvas, a fonte do título fazia o rosa cobrir a linha de cima e encostar no parágrafo.
- **Build do funil:** o pacote fixa a versão do Vite usada pelo Astro. Sem isso, o build do Railway
  quebrava desde 16/10, por causa de uma atualização em outro pacote do monorepo.

## Segunda rodada: continuidades e Como funciona

Proposta no mesmo Canvas (quadros `EstrategiaContinuar`, `PaginaContinuarKids` e
`PaginaContinuarAdulto`, exportados em `proposta-2026-10-19/canvas/`) e implementada no mesmo dia.

- **Continuidade Kids:** corpo novo `ComunidadeContinuarBody`, copy em `oferta/pagina-continuar.ts`,
  peças próprias em `comunidade-continuar.css` sobre o layout da página de 9 a 17. Faixa para a
  criança que chega pela tela de ferramenta fechada, painel "O caminho dele", cinco situações, o que
  fica sem custo e o que a assinatura acrescenta, os oito postos (conferidos no teste contra a
  política da Jornada no core), relatos N18, AV11 e N15, planos ao vivo, 9 dúvidas, faixa 9 a 17.
- **Continuidade adulta:** subpágina nova do funil adulto (`isComunidadeAdultoSubpagina`), corpo
  `ComunidadeAdultoContinuarBody`, copy em `comunidade-adulto/oferta/continuar.ts` (requisitos, cartão
  dos planos, escada, tela do Mural e links legais vêm de `PAGINA_ADULTO` por referência), peças em
  `comunidade-adulto-continuar.css`. Tela de save no herói, quatro casos, o que fica salvo, a prova
  pela experiência própria, planos ao vivo e 8 dúvidas. No sitemap.
- **Como funciona:** `src/pages/como-funciona.astro` só redireciona; o conteúdo
  (`home-comunidade.ts`) e o CSS (`comunidade-home.css`) saíram. Os links do Desafio (oferta,
  resultado, cabeçalho do resultado e o botão de quem o quiz não recomenda) vão direto para a seção
  de experiência da página de 9 a 17; o menu da oferta do Desafio ficou com a própria seção. A página
  saiu do sitemap e das capturas; o painel de métricas ainda abre os dados dela de antes do 301.
- **Limpeza:** a continuidade antiga (`ComunidadeOfertaBody`, `ComunidadeTour`, `continuidade.ts`,
  `continuidade-faq.ts` e `shared.ts`) saiu. O motor de seções continua, porque o presente e o
  embaixador o usam. As falas que só a continuidade antiga usava (AV02, N4, N6, N7 e N19) foram para
  a reserva, com o motivo. O espelho antigo está em
  `kids/comunidade-dos-criadores/copy/historico/2026-10-20-continuidade-antiga/`.

### Revisão completa da segunda rodada

Três revisões (código, copy, documentação e testes). O que mudou por causa delas:

- **Pré-checkout da continuidade:** a página Kids voltou a pedir o mesmo e-mail do responsável no
  pré-checkout (a versão nova tinha perdido o aviso), e a adulta ganhou o aviso dela.
- **Cupom da URL:** as cinco páginas da Comunidade (9 a 17, menor de 9, continuidade Kids, adulta e
  continuidade adulta) passaram a levar `?cupom=` ao checkout e a avisar na seção dos planos que o
  receberam, ou que ele não vale. Antes o cupom se perdia em silêncio. Os preços continuam os do
  catálogo: o cupom é cotado contra a oferta principal e o checkout confere o plano escolhido.
- **Presente e embaixador:** o capítulo "experiencia" voltou a ter o ícone dele (a limpeza tinha
  levado junto). O reveal ao rolar, que só a continuidade antiga ligava, saiu do CSS e das classes.
- **Adulta:** a tela de save cabe a partir de 320 px (no celular fica só a opção marcada), é
  ilustração para o leitor de tela, e o preço mensal do herói só aparece com o plano mensal no ar.
- **Kids:** a faixa para a criança entrou no `<main>`; a linha tracejada do painel liga os marcos.
- **Contraste:** sobre o fundo alternativo das páginas do Desafio, do presente e do embaixador, todo
  link fica na tinta com o traço azul; dentro de uma carta ele volta ao azul.
- **Preço por dia:** uma função só (`precoPorDiaCents`) para as cinco páginas, com teste.
- **Métricas:** o clique do cabeçalho do quiz do Desafio passou a `desafio-quiz-experiencia`.
- **Copy:** ajustes de Light Copy e de clareza nas duas continuidades, já nos espelhos.

## Verificação

- Testes do funil, typecheck, lint e build passaram.
- Teste de navegador das quatro páginas de oferta: preços ao vivo, dois planos, pré-checkout até o
  checkout com o plano e a atribuição, 301 das páginas antigas, cinco larguras sem rolagem lateral.
- Os três caminhos de quiz foram percorridos até o resultado, num servidor local com banco local.
  Também foram conferidos checkout, obrigado, bio, Termos e Privacidade em 390 e 1440 px.
- Segunda rodada: testes do funil, typecheck, lint, build e o teste de navegador com as cinco
  páginas (incluindo as duas continuidades, preços ao vivo, os dois planos até o checkout e cinco
  larguras sem rolagem lateral), o 301 da Como funciona com a query e a âncora, e os links da oferta
  do Desafio no build local. Conferência visual das duas continuidades em 390 e 1440 px.

## Terceira rodada: as cinco pendências da continuidade

Análise e proposta aprovadas pela dona em 20/10/2026, com as três recomendações: seed da jornada
adulta automático, textos dos e-mails como propostos e perfil Kids sem prazo aos 18 anos.

- **Etapa adulta depois do cancelamento:** a etapa mais alta alcançada fica gravada
  (`members.adult_journey_reached`) e nunca desce, nem se a política for editada; o piso não dá
  ferramenta. Testes provam que encerrar o acesso (adulto e Kids) não tira etapa, capacidades nem
  paleta, e que as ferramentas voltam a pedir a licença. A página adulta passou a prometer "a etapa e
  os blocos que você já liberou".
- **Seed da jornada adulta:** roda sozinho na subida do members, uma vez só: só grava quando ainda não
  existe política, com trava e inserção sem sobrescrever; uma edição feita no Admin nunca é tocada.
  Sem cursos suficientes, registra o motivo e tenta na próxima subida. O curso No Comando da IA (produto
  vendido à parte) nunca entra como requisito.
- **Entradas da continuidade adulta:** a tela de ferramenta fechada separa "falta a assinatura" (leva à
  continuidade) de "falta a etapa" (leva à etapa); cartão em Cursos para quem só tem No Comando da IA;
  curso bloqueado sem página própria leva à continuidade; "Voltar para a Comunidade" em Compras. Links
  com `utm_source=plataforma&utm_medium=app&utm_content=<lugar>`.
- **Aviso de ferramenta fechada no Kids:** novo texto ("O Pinta faz parte da Comunidade dos Criadores
  … abre no posto Construtor(a). Chame o seu responsável para ver a página junto com você."), com o
  posto vindo da política; teste que reprova "tudo liberado"; "Ver como continuar" na área dos pais para
  assinatura encerrada.
- **E-mails:** `gift-expiry-2d`, `gift-expired`, `subscription-ended-kids`, `subscription-ended-adult`
  (members, no ciclo de 6 h, com deduplicação e sem e-mail para expirações antigas) e
  `profile-turned-18` (auth, diário, um por perfil).
- **Perfil que completa 18 anos:** continua funcionando; aviso ao responsável por e-mail e na página do
  perfil em /pais, com "Arquivar perfil"; pedido da data de nascimento quando falta. As duas páginas
  de continuidade trocaram "os projetos não passam" por "o perfil Kids continua funcionando, e a conta
  adulta começa nova". Termos Kids (versão `comunidade-kids-2026-10-20b`) e Privacidade ganharam a regra
  dos 18 anos, para a revisão jurídica.
- **Cancelamento:** conferido que hoje nada chama a rota do members que revogaria na hora no
  `canceled`; o acesso termina na expiração com carência. A rota segue revogando na hora se um dia
  for ligada (anotado no CLAUDE.md do members para mudar antes de ligar).

## Pendências para produção

- **Levar os projetos do Kids para a conta adulta:** validar no navegador o Exportar (Kids) e Importar
  (adulto) do Estúdio; se funcionar, escrever o passo a passo na Ajuda e dizer isso nas páginas.
- **Compras e área dos pais:** a lista de assinaturas só traz o nome do produto, igual no adulto e no
  Kids; o botão de volta pode aparecer na área errada para quem tem as duas. Corrigir quando o
  Payments devolver o código do produto.
- **Capturas reais da área adulta.** As telas da página adulta são prévias com dados de teste. A
  prévia do Mural ainda mostra o nome antigo "Mostra dos criadores".
- **Cursos adultos** publicados com os blocos da paleta. A política da jornada adulta se configura
  sozinha na primeira subida do members com cursos suficientes; as etapas que faltarem entram pelo Admin.
- **Espaços adultos no Hub:** Clube, Mural adulto e Desafio do mês, que a página e as cartas adultas
  já citam, assim como os tutoriais adultos.
- **Ferramentas das fases seguintes no Kids:** as páginas descrevem Pensa, Molda, Ponte e código como
  parte da Jornada (texto aprovado no Canvas), mas os cursos publicados chegam ao Construtor.
- **Botão do resultado do menor de 9, perfil B:** o quadro do Canvas diz "Ver como criar o primeiro
  jogo de vocês" e o `quiz-dados.json` (fonte única) diz "Ver as ideias dela virando jogo". Ficou o
  segundo; a dona confirma qual vale.
- **Revisão jurídica** dos quatro Termos e da Política de Privacidade.
- **Links antigos:** Instagram, ManyChat e documentos que apontam para as páginas de perfil. Eles
  funcionam pelo redirecionamento.
- **E-mails do Members e do Messaging** ainda falam das faixas antigas. O Desafio e o presente
  continuam em 9 a 14 anos.
