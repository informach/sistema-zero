# Desafios, cartões dos Lumis e a seção Jogo no Admin (Arquipélago Vagalume)

Decisão da dona em 27/10/2026: as **ilhas abrem pelo posto** da Jornada do Criador; os
**desafios** (Quadro das Cores, desafio do dia, pedido de morador) e os **cartões dos Lumis** abrem
pelos **blocos do Estúdio** que a pessoa conquistou nos cursos. Os desafios são cadastrados pela
equipe numa seção **Jogo** do Admin, valem para todas as crianças e não são individuais. A mesma
regra vale para a comunidade adulta, com os blocos dos cursos adultos.

Este documento é o plano técnico. O andamento fica na página de acompanhamento (grupo "Desafios,
Lumis e o Admin do jogo").

## Regras do jogo

1. **Ilha aberta** quando o posto da pessoa chegou ao posto da ilha (o mapa ilha → posto mora num
   lugar só, no contrato, pelo identificador do posto).
2. **Blocos exigidos** de um desafio = os blocos do gabarito, menos os que já vêm no projeto
   inicial e menos os de moldura (`contract.domain === 'frame'`, sempre disponíveis), mais os que a
   equipe acrescentar e menos os que ela retirar.
3. **Desafio disponível** quando a ilha está aberta e todos os blocos exigidos estão entre os
   conquistados. Senão aparece com "Aprenda isso em", calculado pelos cursos publicados que
   liberam cada bloco que falta, com o posto de cada curso.
4. **Feito continua feito:** depois de concluído, a disponibilidade nunca é recalculada (mudança
   nos blocos do curso ou na lista da pessoa não tira o que ela fez). Rejogar é permitido.
5. **Conferência no servidor**, com o mesmo executor das aulas. O gabarito nunca vai para o
   navegador.
6. **Cartões dos Lumis** (`CARTAS_LUMI`, no contrato): os de QUANDO e de AÇÃO (voar até, regar,
   colher, guardar) são do mundo do jogo e valem para todos; os de CONTROLE (repetir, para cada,
   enquanto, se, escolha, esperar, guardar na memória, contar) são os mesmos conceitos dos blocos
   do Estúdio, um cartão por bloco, e só ficam na mão de quem conquistou o bloco (mesma fonte e
   mesma régua dos desafios). O caderno dos Lumis no jogo (28/10/2026) lê `GET /arquipelago/cartas`
   pela porta da plataforma e mostra a coleção por tipo, com "Aprenda isso em" nos que faltam
   (`docs/arquipelago-regras.md` §8.1). Montar a rotina e o Lumi executar entram com os Lumis
   (Fase 2 do projeto do jogo). Na comunidade adulta vale a mesma regra com os blocos e os cursos
   adultos, conferida de ponta a ponta em 28/10/2026 (§8).

## Decisões tomadas no plano (reversíveis, anotadas para a dona)

| Pergunta | Decisão | Por quê |
|---|---|---|
| Desafio exige o Estúdio livre e o produto Estúdio Completo? | **Não.** O desafio abre um Estúdio de desafio, como o das aulas, para quem tem a ilha aberta e os blocos | O Quadro das Cores é o coração do jogo e a Sua ilha é da Faísca, que ainda não tem o Estúdio livre |
| Blocos que já vêm no projeto inicial contam como exigidos? | **Não** | A criança não precisa saber montar o que já recebeu pronto |
| Cartões dos Lumis: catálogo no código ou no Admin? | **No código** (contrato), conferido contra o catálogo de blocos | O comportamento de cada cartão na rotina é código do jogo |
| Comunidade adulta com política antiga (etapas sem currículo) | Ilha pela **posição** da etapa; o Farol é a jornada completa | É o que o jogo já faz hoje; o validador avisa no Admin |
| "Aprenda isso em" inclui oficinas ao vivo? | **Só cursos gravados publicados** nesta primeira versão | As oficinas não se divulgam fora delas |
| Sessão de suporte pode conferir? | **Pode, sem gravar nada e sem prêmio** | Ajuda a equipe a reproduzir um problema |
| Moedas | Por desafio, cadastradas no Admin (padrão 20 no principal e 10 no extra, teto 100 e 50), pela porta de moedas do Members com chave única | O Members dá no máximo 150 moedas do jogo por semana (`ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS`, metade do que quem estuda com regularidade ganha nos cursos), tudo ou nada: um prêmio por desafio acima de 100 nunca caberia. Bateu no teto da semana, o prêmio fica como `teto` e é cobrado de novo numa semana seguinte (nunca se perde) |
| Linguagem | **Só blocos (JavaScript)** na primeira versão; Python e Pro ficam de fora | Pro não tem blocos, então o desafio abriria para todos |

## Onde cada parte mora

- **Contrato** (`packages/arquipelago-contracts`, só Zod): `ilhas.ts` com o posto de cada ilha;
  `desafios.ts` (conteúdo com versão e migração, visões do Admin e da pessoa, molde do desafio);
  `aprenda.ts` (puro: "Aprenda isso em", cobertura e blocos exigidos); `cartas-lumi.ts`;
  `membros.ts` (formatos da conversa Members ↔ serviço do jogo).
- **Serviço do jogo** (`packages/arquipelago-api`, schema `arquipelago`): tabelas `desafios`,
  `desafio_publicacoes` (instantâneo imutável de cada publicação), `desafio_progresso` e
  `desafios_concluidos`. Rotas da pessoa (`/arquipelago/desafios`, `/desafios/:id`,
  `/desafios/:id/verificar`, `/desafios/:id/recompensa-vista`, `/cartas`) e da equipe
  (`/arquipelago/admin/*`). A cor da ilha sai do servidor (Quadros feitos ÷ 6), sem mudar o
  `SalvamentoV1`. Liga com `ARQUIPELAGO_DESAFIOS` (`desligado`, `equipe`, `aberto`; nasce desligado).
- **Members** (rotas internas `/members/internal/arquipelago/*`, token próprio
  `ARQUIPELAGO_MEMBERS_TOKEN`, separado do token das moedas): `GET /jornada`, `GET /jogador`
  (posto e blocos conquistados, leitura sem escrita), `GET /curriculo-de-blocos` (cursos publicados
  com os blocos e o posto), `POST /objetivos/analisar` (blocos do gabarito, problemas, a vista dos
  objetivos e o gabarito passando) e `POST /objetivos/verificar` (o mesmo executor das aulas, com
  cache). O serviço do jogo nunca fala direto com o executor.
- **Gateway:** rotas da pessoa com os limites de corpo e tempo da conferência; rotas da equipe só
  para superadmin, admin e staff (escrita só superadmin e admin, com auditoria). A política do Kids
  **exclui `/arquipelago/admin/*`** para aluno e responsável.
- **Admin:** item **Jogo** no grupo Conteúdo, com as abas Desafios, Ilhas e postos e Cartões dos
  Lumis. O editor do desafio usa dois Estúdios embarcados (projeto inicial e gabarito), o editor de
  objetivos das aulas (extraído para `ProjectObjectivesEditor`), dicas, desafio extra (os objetivos
  opcionais), prêmio, blocos exigidos com acrescentar e retirar, a tabela "Aprenda isso em" e os
  avisos de cobertura. Publicar é recusado enquanto a análise do Members tiver problema.
- **Plataforma e jogo:** a página aceita o molde do desafio, abre o Estúdio de desafio por cima do
  jogo com o painel de objetivos (extraído do cartão das aulas) e devolve ao jogo, que relê o
  desafio e toca a cor no quadro.

## Ordem de entrega (cada etapa fica de pé sozinha)

1. **Um mapa só:** `ilhas.ts` pelo identificador do posto, teste contra a jornada do core, rota
   `/jornada` no Members e a conferência do mapa no serviço do jogo (aviso no log e no Admin).
2. **Leituras da plataforma e cartões dos Lumis:** `/jogador` e `/curriculo-de-blocos`, o adaptador
   do Members no serviço, `CARTAS_LUMI`, `GET /arquipelago/cartas` e o caderno dos Lumis no jogo.
3. **Cadastro:** tabelas, `/objetivos/analisar`, rotas da equipe, gateway e a seção Jogo no Admin.
   Nada aparece para as crianças.
4. **Jogar:** `/objetivos/verificar`, rotas da pessoa atrás de `ARQUIPELAGO_DESAFIOS=equipe`, o
   molde na página, o Estúdio de desafio com o painel de objetivos e o tempo livre pausado.
5. **Quadro das Cores no mundo e prêmios:** seis quadros por ilha, cor pelo servidor, a varredura
   de cor, moedas com nova tentativa e "Ir para o curso".
6. **Desafio do dia, pedido de morador e comunidade adulta.**

## Riscos e defesas

- **Aluno chegando ao Admin do jogo:** três barreiras (papéis no gateway, exclusão na política do
  Kids e a checagem de equipe no serviço), com teste em cada uma.
- **Gabarito vazando:** as visões da pessoa são `strictObject` e um teste prova que gabarito e
  regra não passam.
- **Custo do executor:** cache por impressão do projeto, 10 conferências por minuto por pessoa no gateway (`arquipelago-desafio-verificar`) e
  424 (nunca 5xx) quando o executor está fora.
- **Members fora do ar:** só os desafios desligam no jogo; o resto segue.
- **Edição durante o jogo:** uma revisão publicada continua conferível enquanto existir;
  arquivar invalida (409 `DESAFIO_MUDOU`).
