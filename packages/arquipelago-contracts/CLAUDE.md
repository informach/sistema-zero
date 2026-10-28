# CLAUDE.md — @sistemazero/arquipelago-contracts

## Medição agregada (28/10/2026)

`medicao.ts`: filtro estrito por público e até 90 dias civis, relatório e números discriminados
entre `disponivel`, `poucos-dados` e `aguardando`. Valores protegidos são `null`, sem campos
auxiliares com contagens ou pessoas. O relatório enumera fontes ausentes explicitamente.
Testes em `tests/medicao.test.ts`. É só leitura, sem alteração do formato do salvamento.

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
- `salvamento.ts`: `SalvamentoV5` estrito (a V4 mais `presenteDosBichosEntregue`; a V4 é a V3
  mais `construcao` e `projetos`, 28/10/2026, o
  modo construção; a V3 é a V2 mais `moradores.capi` e `bichos`; a V2 é a V1 mais `percursos`),
  teto de 64 KB, salvamento inicial e migrações (`migrarDaV1`, `migrarDaV2`, `migrarDaV3`, `migrarDaV4`;
  `SalvamentoSchema` aceita as anteriores e já devolve migradas; uma aba antiga não lê a resposta
  V5). A migração da V4 preserva o progresso e inicia a marca do presente como `false`.
  Os schemas V1 a V4 continuam imutáveis; os testes `salvamento-v5.test.ts` conferem a cadeia.
  A obra (`ObraSchema`) guarda paredes e cercas em trechos, aberturas, piso por cômodo,
  objetos, caminhos e canteiros, com tetos que cabem em 64 KB no pior caso (teste).
- `objetos.ts` (28/10/2026): os objetos com função da casa (`OBJETOS_DA_CASA`), o molde que o Pinta
  e o Molda recebem (`MoldeDeObjetoSchema`: área na grade, caixa, faces que recebem imagem, a
  frente e a função) e o catálogo (`CATALOGO_DE_OBJETOS`, com a origem de cada um). Medidas do
  README de `arquipelago/arte/objetos`. `planificacaoDoMolde` (28/10/2026, pura): as faces numa
  tela só (lados ao lado da frente, topo em cima, lado maior com `LADO_DA_PLANIFICACAO` pontos), o
  que o Pinta abre e onde cada face cai quando o jogo for desenhar a aparência. Acréscimo sem
  mudar a `Plataforma`: a `VERSAO_CONTRATO_PLATAFORMA` continua 1.
- `plataforma.ts`: a interface `Plataforma` que a página da plataforma implementa, versão do
  contrato, formato do quarto, pedido de ferramenta e manifesto do cliente.
- `api.ts`: formatos das rotas do serviço (acesso, salvamento guardado e gravação por revisão,
  tempo, limite da família e a leitura dos pais com `algumaCriancaVe` e `?perfis=`, cartões do
  jogador).
- `desafios.ts` (27/10/2026): desafios do jogo (conteúdo com versão e migração, metadados, visões
  da equipe e da pessoa, molde do Estúdio de desafio, `LIMITES_DO_DESAFIO`, `MOEDAS_PADRAO`). As
  visões da pessoa são estritas: gabarito e regra nunca saem. Desafio do dia (28/10/2026):
  `MOEDAS_PADRAO_POR_TIPO` (10 e 5), `corPermitida` (a cor é sempre falsa, obrigada por `refine`
  em `CriarDesafioSchema`, `GravarDesafioSchema` e `DesafioDoManifestoSchema`) e o campo opcional
  `doDia: { id, dia, feito } | null` em `DesafiosDoJogadorSchema`.
- `aprenda.ts`: "Aprenda isso em", blocos exigidos e a cobertura dos blocos pelos cursos.
- `cartas-lumi.ts`: os 14 cartões da rotina dos Lumis e o bloco que libera cada cartão de controle.
- As regras do jogo em linguagem da dona, com onde mudar cada número: `docs/arquipelago-regras.md`.

Regras: mudar um formato salvo exige nova versão e migração (nunca alterar `V1` de forma
incompatível); mudar a `Plataforma` de forma incompatível exige subir `VERSAO_CONTRATO_PLATAFORMA`.
Usado pelo jogo, pelo serviço e pela página da plataforma; é o único pacote do jogo que a
plataforma pode importar.
