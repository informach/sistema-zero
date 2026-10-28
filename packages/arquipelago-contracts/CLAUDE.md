# CLAUDE.md — @sistemazero/arquipelago-contracts

Tipos e validação (zod) de tudo o que atravessa a fronteira do jogo **Arquipélago Vagalume**:
plataforma ↔ jogo ↔ serviço do jogo. Sem React, sem three, sem I/O.

- `ilhas.ts`: as 8 ilhas (sua ilha no centro, 6 no anel, o farol), o POSTO que abre cada uma
  (`POSTOS_DA_JORNADA`; o ÚNICO lugar do mapa ilha → posto, 27/10/2026), a posição derivada dele,
  `ilhaDoPosto` e a conversão do posto Kids em posição.
- `membros.ts`: formatos da conversa serviço do jogo ↔ Members (rotas internas) e
  `conferirMapaDasIlhas` (o mapa contra a jornada publicada: postos do Kids iguais e na ordem;
  no adulto, uma etapa por ilha antes do Farol, porque a ilha abre pela posição da etapa).
- `limites.ts`: limite diário do tempo livre (padrão 30 min, de 10 a 240, passo 5) e o dia de
  São Paulo.
- `salvamento.ts`: `SalvamentoV2` estrito (a V1 mais `percursos`: as três estrelas e o melhor tempo
  de cada percurso, 27/10/2026), teto de 64 KB, salvamento inicial e migração da V1 (`migrarDaV1`;
  `SalvamentoSchema` aceita a V1 e já devolve migrada).
- `plataforma.ts`: a interface `Plataforma` que a página da plataforma implementa, versão do
  contrato, formato do quarto, pedido de ferramenta e manifesto do cliente.
- `api.ts`: formatos das rotas do serviço (acesso, salvamento guardado e gravação por revisão,
  tempo, limite da família, cartões do jogador).
- `desafios.ts` (27/10/2026): desafios do jogo (conteúdo com versão e migração, metadados, visões
  da equipe e da pessoa, molde do Estúdio de desafio, `LIMITES_DO_DESAFIO`, `MOEDAS_PADRAO`). As
  visões da pessoa são estritas: gabarito e regra nunca saem.
- `aprenda.ts`: "Aprenda isso em", blocos exigidos e a cobertura dos blocos pelos cursos.
- `cartas-lumi.ts`: os 14 cartões da rotina dos Lumis e o bloco que libera cada cartão de controle.
- As regras do jogo em linguagem da dona, com onde mudar cada número: `docs/arquipelago-regras.md`.

Regras: mudar um formato salvo exige nova versão e migração (nunca alterar `V1` de forma
incompatível); mudar a `Plataforma` de forma incompatível exige subir `VERSAO_CONTRATO_PLATAFORMA`.
Usado pelo jogo, pelo serviço e pela página da plataforma; é o único pacote do jogo que a
plataforma pode importar.
