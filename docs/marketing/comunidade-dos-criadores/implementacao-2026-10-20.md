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
| `/kids/comunidade-dos-criadores/oferta/continuar` | Continuidade, sem mudança |
| `/kids/comunidade-dos-criadores/oferta/{tempo-de-tela,criacao-de-jogos,expressao-visual,formacao-tecnologica,habilidades-escolares}` | 301 para `/oferta`, com a mesma query |
| `/kids/comunidade-dos-criadores/quiz` | Quiz Kids v6 |
| `/pro/comunidade-dos-criadores/oferta` | Página adulta |
| `/pro/comunidade-dos-criadores/quiz` | Quiz adulto v1 |
| `/pro/comunidade-dos-criadores/checkout` e `/obrigado` | Assinatura adulta, mensal ou anual |
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
- **"Ter aula ao vivo"** é uma necessidade que a pessoa declara no quiz adulto, aprovada no Canvas;
  no resultado, ela vira condição não atendida e o botão leva a conferir os requisitos.
- **Relatos sem lugar nas páginas novas** ficaram numa lista de reserva com o motivo
  (`RELATOS_RESERVA`), em vez de saírem do código.
- **Checkout e obrigado** passaram a ler os textos do conteúdo de cada funil. O texto do Desafio e o
  da Comunidade Kids não mudaram.
- **Título da página de 9 a 17:** o marca-texto rosa virou um bloco único. Com o fundo linha a linha
  do Canvas, a fonte do título fazia o rosa cobrir a linha de cima e encostar no parágrafo.
- **Build do funil:** o pacote fixa a versão do Vite usada pelo Astro. Sem isso, o build do Railway
  quebrava desde 16/10, por causa de uma atualização em outro pacote do monorepo.

## Verificação

- Testes do funil, typecheck, lint e build passaram.
- Teste de navegador das quatro páginas de oferta: preços ao vivo, dois planos, pré-checkout até o
  checkout com o plano e a atribuição, 301 das páginas antigas, cinco larguras sem rolagem lateral.
- Os três caminhos de quiz foram percorridos até o resultado, num servidor local com banco local.
  Também foram conferidos checkout, obrigado, bio, Termos e Privacidade em 390 e 1440 px.

## Pendências para produção

- **Capturas reais da área adulta.** As telas da página adulta são prévias com dados de teste. A
  prévia do Mural ainda mostra o nome antigo "Mostra dos criadores".
- **Cursos adultos** publicados com os blocos da paleta, e a política da jornada adulta, que exige
  rodar `journey:seed-adult --apply` com a dona.
- **Espaços adultos no Hub:** Clube e Mural adulto.
- **Revisão jurídica** dos quatro Termos e da Política de Privacidade.
- **Links antigos:** Instagram, ManyChat e documentos que apontam para as páginas de perfil. Eles
  funcionam pelo redirecionamento.
- **E-mails do Members e do Messaging** ainda falam das faixas antigas. O Desafio e o presente
  continuam em 9 a 14 anos.
