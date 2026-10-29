# CLAUDE.md — @sistemazero/arquipelago-contracts

## Medição agregada (28/10/2026)

`medicao.ts`: filtro estrito por público e até 90 dias civis, relatório e números discriminados
entre `disponivel`, `poucos-dados` e `aguardando`. Valores protegidos são `null`, sem campos
auxiliares com contagens ou pessoas. O relatório enumera fontes ausentes explicitamente.
Testes em `tests/medicao.test.ts`. É só leitura, sem alteração do formato do salvamento.

## A família na área dos pais (fase1-18, 28/10/2026)

`familia.ts`: `SemanaDaFamiliaSchema` (o que o serviço manda: janela de 7 dias, limite e, por
criança, `desafios`, `objetos` e `tempoLivre`; `desafios`, `objetos` e `deIlhasAnteriores` são
`null` quando o serviço não tem o número), `SemanaDaFamiliaParaOsPaisSchema` (o mesmo com o
`nome` que o BFF põe) e `PermissoesDaFamiliaSchema` com `PERMISSOES_PADRAO` (irmãos ligada,
outras crianças e fotos no Clube desligadas: ECA Digital, art. 21). Objetos estritos. Testes em
`tests/familia.test.ts`. Volta ao curso (29/10/2026): `voltaAoCurso` opcional e anulável em cada
criança (`{dias}`), `HORAS_DA_VOLTA_AO_CURSO = 24` e, em `membros.ts`,
`AulasConcluidasDosMembrosSchema` (a resposta da rota interna do Members). Regras em `docs/arquipelago-regras.md`, seção 3.

## Recordes da família e visitas (fase3-12, 29/10/2026)

Em `familia.ts`: `IrmaosDoJogadorSchema` (o serviço: `versao`, `situacao` `ok`|`desligado` e os
irmãos com `percursos` e `temCasa`, sem nome), `IrmaosParaOJogoSchema` (o mesmo com o `nome` que o
BFF põe) e `CasaDoIrmaoSchema` (a obra, a horta e os objetos `completos` de um irmão, nada mais do
salvamento, e o `quarto` da plataforma dele, `null` quando o Members não respondeu, 29/10/2026).
Em `membros.ts`, `QuartoDosMembrosSchema` (`{quarto}`, a rota interna do Members).
`VERSAO_DAS_VISITAS = 1`. Sem mudança no salvamento. Testes em `tests/familia.test.ts`;
regras em `docs/arquipelago-regras.md` §6.20.

## A galeria de aparências (fase1-13, 29/10/2026)

`galeria.ts`: o catálogo (`IDS_DA_GALERIA`, `GALERIA`: id estável, objeto, nome, preço e
`modelo`), uma aparência por objeto hoje, pronto para variações (entrada nova com id e `modelo`
próprios). Preço entre `PRECO_MINIMO_DA_GALERIA` (20, um desafio) e `PRECO_MAXIMO_DA_GALERIA` (75,
metade do teto semanal do jogo). Rotas: `GaleriaDoJogadorSchema` (possuídas, saldo ou `null`,
`ilimitado` da equipe), `CompraNaGaleriaSchema` (`{aparencia, chave}`, o preço nunca vem do corpo)
e `SaldoInsuficienteSchema`. Em `membros.ts`, `SaldoDosMembrosSchema` (a leitura do saldo).
Testes: `tests/galeria.test.ts`. Regras em `docs/arquipelago-regras.md` §9.9.

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
- `salvamento.ts`: `SalvamentoV11` estrito (fase3-02: V10 mais as três marcas de `recife`).
  A V10 (29/10/2026, fase2-07) é a V9 mais `rotinas`, a rotina
  de cada Lumi preso, só das espécies em `lumis`, com o teto somando todas; `migrarDaV9` começa
  sem nenhuma; testes em `tests/salvamento-v10.test.ts`, com o pior caso de 64 KB com tudo no teto,
  medido em bytes UTF-8 também com as marcas da V11). A V9 é a V8 mais `lumis`, quantos Lumis
  de cada espécie ela já prendeu com a lanterna, de 1 a 999, com a lista inteira `LUMIS` (as 14
  espécies das sete famílias) para as ilhas seguintes não pedirem versão nova; `migrarDaV8` começa
  sem nenhum; testes em `tests/salvamento-v9.test.ts`). A V8 é a V7 mais `turnos`, um por balcão
  de `POSTOS_DA_VILA` (padaria, sorveteria, sucos) no `TurnoSchema`: `pagoEm`, `melhor` de 1 a 3 e
  `vezes`; `migrarDaV7` começa sem nenhum; testes em `tests/salvamento-v8.test.ts`). A V7 é a V6
  mais `moradores.bento`, no
  `MoradorSchema` da Capi, que continua com o nome `CapiSchema`; `migrarDaV6` põe o Bento como
  `MORADOR_NOVO`; testes em `tests/salvamento-v7.test.ts`). Serviço e cliente sobem juntos: um
  cliente antigo não lê a resposta da versão nova. A V6 (29/10/2026) é a V5 mais `aparencias` em cada projeto
  azul, as que ela já tem, até `APARENCIAS_GUARDADAS_MAXIMO`, com a em uso sempre entre elas;
  `migrarDaV5` guarda a em uso como a única; `ProjetoAzulV4Schema` é o da V4 e da V5. A V5 é a V4
  mais `presenteDosBichosEntregue`; a V4 é a V3
  mais `construcao` e `projetos`, 28/10/2026, o
  modo construção; a V3 é a V2 mais `moradores.capi` e `bichos`; a V2 é a V1 mais `percursos`;
  teto de 64 KB, salvamento inicial e migrações (`migrarDaV1` a `migrarDaV9`;
  `SalvamentoSchema` aceita as anteriores e já devolve migradas; uma aba antiga não lê a resposta
  atual). A migração da V4 preserva o progresso e inicia a marca do presente como `false`.
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
  `planta-interior` entrou em `OBJETOS_DA_CASA` em 29/10/2026 sem versão nova do salvamento: só
  alarga o que a V4/V5 aceitam (todo salvamento antigo continua válido). Serviço e cliente sobem
  juntos (um cliente antigo não leria uma obra com a planta).
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
- `rotinas.ts` (fase2-07): a rotina de um Lumi como árvore de cartões (`CartaoDaRotinaSchema`, o
  `c` é o id de `CARTAS_LUMI`), em formato curto para caber nos 64 KB; `RotinaSchema` (começa com
  um QUANDO e só ele é QUANDO), `LIMITES_DA_ROTINA` (16 por rotina, 32 somando, 3 níveis),
  `LUGARES_DA_ROTINA`, `CONDICOES_DA_ROTINA`, `CASOS_DA_ESCOLHA`, `contarCartoes` e
  `profundidadeDaRotina`. O jogo confere o resto (os de controle conquistados). Regras em
  `docs/arquipelago-regras.md` §8.2.
- As regras do jogo em linguagem da dona, com onde mudar cada número: `docs/arquipelago-regras.md`.

Regras: mudar um formato salvo exige nova versão e migração (nunca alterar `V1` de forma
incompatível); mudar a `Plataforma` de forma incompatível exige subir `VERSAO_CONTRATO_PLATAFORMA`.
Usado pelo jogo, pelo serviço e pela página da plataforma; é o único pacote do jogo que a
plataforma pode importar.

## Minijogos aprovados (desafios-16, 29/10/2026)

Contrato minijogos.ts: lista, cópia aprovada e capa escolhida embutida PNG/JPEG/WebP. Mesmo teto de projeto dos desafios. A capa tem teto próprio, `CAPA_DO_MINIJOGO_CARACTERES` (400 mil caracteres do data URL): acima dele fica `null` (`capaDoMinijogo` ao guardar, `capaQueCabe` ao ler), porque a lista leva a capa de cada minijogo. Medição inclui minijogos com proteção de grupos.

Plano e testes: docs/plans/2026-10-29-arquipelago-minijogos.md.

## Mini estúdio dos Lumis (29/10/2026)

Núcleo puro sem React, three ou I/O. Não mudar os schemas de salvamento existentes ao evoluir o molde.

Contrato e intérprete em `arquipelago-contracts/src/rotina-*.ts`; plano `docs/plans/2026-10-29-mini-estudio-lumis.md`, regras §8.2. Prévia isolada, salvamento V10 intacto, releitura das conquistas e limites mantidos. JavaScript/TypeScript somente; não executa código livre.

## Salvamento V11: descobertas do Recife (29/10/2026)

`SalvamentoV11Schema` acrescenta somente `recife: { bau, pagina, tesouro }`, três booleanos.
`migrarDaV10` preserva o documento e começa as marcas em false. A união pública aceita V1 a V11
e devolve V11. Não acrescentar campos aos schemas históricos. A validação de dono e limite das
rotinas é compartilhada sem mudar a régua da V10. O pior caso completo continua limitado a 64 KB.
Testes: `salvamento-v11.test.ts` e pior caso em `salvamento-v10.test.ts`.
