# CLAUDE.md — @sistemazero/arquipelago-contracts

Estado canônico em [docs/arquipelago-estado-atual.md](../../docs/arquipelago-estado-atual.md).
`SalvamentoSchema` recebe versões anteriores e devolve V18; teto de 65.536 bytes UTF-8.
Schemas históricos continuam imutáveis. Menções a V11 e outras versões nas seções datadas
explicam sua introdução, não a versão atual da resposta.

## Salvamento V20: móveis da casa e galeria do Farol (30/10/2026)

`moveis.ts`: `MOVEIS` (21 ids, só cresce no fim; o salvamento guarda o índice), `MovelNaObraSchema`
(tupla `[índice, x, z, giro]`) e `MOVEIS_NA_CASA_MAXIMO` (24). `ObraDaCasaSchema` = obra antiga +
`moveis`; `ObraDaCabanaSchema` aceita só `moveis: []`. `Obra` é o tipo da V20; `ObraAteV19` o de
antes. `farol.galeria`: até `VAGAS_DA_GALERIA_DO_FAROL` (6) vagas, cada uma `null` ou
`ExposicaoDoFarol` (`['a', objeto, idDaAparencia]`, `['j', playId]`, `['d', desafioId]`), só com o
final concluído e sem repetir criação (`chaveDaExposicao`). `migrarDaV19` põe listas vazias.
`CasaDoIrmaoSchema.obra` aceita a obra V20 ou a antiga (completada por `obraComMoveis`). Pior caso:
63.989 bytes (folga 1.547). Testes: `tests/salvamento-v20.test.ts`, cenário cheio atualizado.

## Visitas adultas V1 (L12, 30/10/2026)

`visitas-adultas.ts` define o código base64url de 32 caracteres, comando de geração vazio,
comando `{ codigo }`, estado sem código e projeção visual sem identidade. O quarto e seus
itens removem campos não desenhados; o quarto próprio continua com seu contrato aberto.
Os métodos da porta do serviço agora incluem DELETE, de forma aditiva. Sem alteração da V18,
do teto do save ou do formato histórico de visitas Kids. Não usar código em URL ou save.

## Fantasma V1 (L10, 30/10/2026)

`fantasma.ts`: amostras a 100 ms, coordenadas inteiras em centímetros, giro em 65536 unidades,
até 5 min, 3001 amostras e 128 KB. `GuardarFantasmaSchema` recebe revisão confirmada e artefato,
sem identidade, nome, moedas ou recompensa. O envelope admite mais 1 KB. A resposta é
`disponivel` com artefato ou `ausente` sem campos adicionais. São dados separados do save V18.
`tests/fantasma.test.ts` cobre percursos reais, limites, último trecho parcial e chaves estritas.

## Cores conquistadas V1 (A02, 30/10/2026)

`cores-conquistadas.ts`: resposta estrita de leitura, até oito ilhas sem repetição, cada uma com
posições únicas de 1 a 6. Não recebe pessoa, público, saldo ou aprovação. O serviço obtém as
posições da publicação histórica de cada conclusão autenticada. A cor independe do catálogo
atual. Acréscimo compatível pela porta genérica de serviço, sem mudar `Plataforma` ou salvamento.
`tests/cores-conquistadas.test.ts` cobre versão, limites, duplicatas e campos desconhecidos.

## Vestuário sazonal V1 (L09, 30/10/2026)

`vestuario-festas.ts` contém sugestões de peças já existentes e o molde estrito da ferramenta
`avatar`, propósito `vestir`. Só recebe versão e festa; não recebe usuário, preço, saldo ou
peças arbitrárias. A seleção não concede posse e não ativa datas de festa. `avatar-pronto`
devolve o avatar persistido da plataforma. Nada é gravado na V18. O teste de conformidade
confere nomes e categorias no catálogo puro de apresentação do avatar.

## Pedidos remunerados V1 (L07, 30/10/2026)

`pedidos-catalogo.ts` e `receitas-moradores.ts` são dados puros compartilhados; o jogo conserva
falas, gostos e o preparo culinário. `pedidos-entrega.ts` escolhe o pedido e calcula a entrega
inteira, amizade, cesta e prêmio de três ou quatro moedas. Recusa falta de itens, pedido já feito,
dia diferente, mochila acima de 999 ou save acima de 65.536 bytes. Não modifica a entrada.
O relógio civil é São Paulo, independente do fuso do aparelho. Não confundir com o ciclo solar.

`pedidos-remunerados.ts` recebe comando V1 estrito com UUID, revisão-base, morador, dia e ID.
Não recebe identidade, moeda, amizade nem inventário do navegador. Resultado traz o mesmo
comando, save confirmado e pagamento pendente, creditado, teto ou recusado. Não reinterpretar
comandos antigos quando mudar a economia; versionar a regra. O prêmio financeiro não mora na V18.

## Insumos V1 (L07, 30/10/2026)

`insumos.ts` contém onze sementes/ingredientes e duas iscas (30/10/2026), de duas ou três moedas, e
compra de uma a dez unidades. Comando estrito com UUID e revisão confirmada. Não recebe preço,
público ou identidade do navegador. `prepararEntregaDeInsumos` preserva a entrada e só aceita
entrega inteira, até 999 por item e 65.536 bytes UTF-8. Resultado valida preço, revisão e saldo
coerentes com o estado da operação. Reservas financeiras ficam no serviço, fora de V18.
Não alterar o significado de um comando V1 já reservado ao mudar preços no futuro.

## Salvamento V18: ilhas visitadas (30/10/2026)

`SalvamentoV18Schema` acrescenta `ilhasVisitadas`, inteiro 0 a 255. `BIT_DA_ILHA`, em
`exploracao.ts`, fixa a identidade dos oito bits; nunca ordenar pelo catálogo mutável.
`migrarDaV17` começa em zero e preserva todos os campos anteriores, sem inferir descobertas.
Schemas V1 a V17 continuam estritos. `SalvamentoSchema` recebe todos e devolve V18.
O teto continua 65.536 bytes UTF-8. `salvamento-v18.test.ts` cobre todas as 256 combinações,
dados inválidos, entrada histórica intocada e o cenário cheio. Visita não é autoridade para
abrir ilha, conceder prêmio nem validar atividade.

## Publicações no fliperama (L05)

`minijogos.ts` exporta `JogosDoMuralSchema`: no máximo 24 publicações recentes, apenas UUID
`playId` e `titulo` até 300 caracteres. `MoldeDoJogoDoMuralSchema` é estrito e aceita só o UUID.
A ferramenta existente `estudio`, propósito `jogo-do-mural`, não cria fonte nem versão de save.
Quem decide autoria, comunidade e visibilidade é o Hub; quem roda é o player público da plataforma.

## Pedidos dos balcões e profissão V1 (L07, 29/10/2026)

`turnos.ts` contém a regra pura dos seis fregueses e das bandejas, compartilhada pelo jogo e
pelo serviço. A semente do turno remunerado é o UUID reservado pelo serviço, não um dia
escolhido pelo navegador. `numero-estavel.ts` preserva o sorteio estável usado pelos moradores.
`profissoes.ts` valida o início, as seis respostas e a sessão: dia civil válido e estado de
pagamento coerente com conclusão. Versão 1 não pode mudar seu significado para sessões já
guardadas. O prêmio inicial é 5 moedas. O teto total do jogo é conferido no Members.
Não acrescentar campo de moedas ao salvamento do aparelho.

## Trabalho dos Lumis e colheita inteira (29/10/2026)

`lumis-trabalho.ts` define os 14 perfis de voo, carga, trabalho e brilho. É catálogo, sem campo
novo no salvamento. `rotina-execucao.ts` confere a carga por espécie e `cabeColheita` confere a
mochila e a semente devolvida. Recusa preserva a planta madura; guardar transfere só a carga
colhida e mantém na mochila o que não couber na geladeira. Não duplicar a regra no editor.
Testes de conservação e paridade passo a passo em `tests/lumis-trabalho.test.ts`.

`colheita.ts` centraliza humor e bônus: clima favorável +1, humor ótimo +1, sem subtrair o
rendimento básico. `colher` recebe contexto explícito; não consulta relógio ou sorteio escondido.
`MundoDaRotinaV2Schema` exige esse contexto transitório. O molde novo usa versão 2; V1 continua
estrito, sem bônus. A resposta precisa ter a mesma versão, abertura e Lumi do pedido. Os schemas
históricos e o salvamento V17 não recebem campos. Testes em `colheita-especial.test.ts` e
`rotina-colheita-v2.test.ts`.

## Medição agregada (28/10/2026)

**A06, 30/10/2026:** `RelatorioDaMedicaoSchema.mudancasDeAparencia` é opcional e separa
aplicações/trocas registradas no período da fotografia `criacao`. Mesmas três origens e
supressão de grupos menores que cinco, sem nomes, IDs de criação ou contagens auxiliares.
Ausência do campo não é zero. Primeiro atualizar Admin, que aceita o serviço antigo, depois
API: o schema estrito do Admin antigo rejeita o campo novo. Save e versão de Plataforma
permanecem iguais. A coleta não reconstrói datas de criação nem de compra.

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
- `salvamento.ts`: formato atual `SalvamentoV18Schema`, estrito. `SalvamentoSchema` aceita
  versões anteriores e migra para V18. O teto é medido em bytes UTF-8.
  Histórico: a V11 acrescentou as três marcas de `recife` à V10 (fase3-02).
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
  teto de 64 KB, salvamento inicial e migrações (`migrarDaV1` a `migrarDaV17`;
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
  `doDia: { id, dia, feito } | null` em `DesafiosDoJogadorSchema`. C02 (30/10/2026):
  `ObjetivoDoDesafioSchema` é a união de `ObjetivoJavaScriptDoDesafioSchema` (como antes) e
  `ObjetivoPythonDoDesafioSchema` (`programmingLanguage: 'python'`, `profileId` e `stdin` até 4
  linhas, o `SectionPythonProjectCheck` das aulas). Perfil e entradas fora do Python são
  recusados. A regra continua opaca: o Members confere. Teste: `tests/desafios-python.test.ts`.
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
`migrarDaV10` preserva o documento e começa as marcas em false. Na época da V11, a união pública
aceitava V1 a V11 e devolvia V11; atualmente recebe até V18. Não acrescentar campos aos schemas históricos. A validação de dono e limite das
rotinas é compartilhada sem mudar a régua da V10. O pior caso completo continua limitado a 64 KB.
Testes: `salvamento-v11.test.ts` e pior caso em `salvamento-v10.test.ts`.

## Percurso `pico-cume` (fase3-07, 29/10/2026)

`PERCURSOS` ganhou `pico-cume` (a subida ao cume do Pico Gelado) sem versão nova, como a
`vila-telhados`: só alarga o que a V2 em diante aceitam. O pior caso de 64 KB (com uma entrada por
percurso, em `tests/salvamento-v10.test.ts`) tinha 140 bytes de margem antes da V12. O teste
agora inclui também os três ninhos do Vale e a escavação, os corais e a banda, dentro do mesmo
teto: sobravam 29 bytes depois da V14; a V15 abriu espaço (4579, abaixo). Campo novo precisa conferir o espaço
antes.

## Salvamento V12: descobertas do Vale (29/10/2026)

`SalvamentoV12Schema` acrescenta `vale: { pegadas, escavacao, ninhos }`: booleano, inteiro de 0 a 3
e lista sem repetição dos três ids de `NINHOS_DO_VALE`. `migrarDaV11` começa em false, 0 e lista
vazia. A união pública aceita V1 a V12 e devolve V12. Schemas históricos continuam estritos,
e a validação das rotinas e o teto de 64 KB permanecem. Não guardar observação temporária,
posição ou cronômetro nesta coleção. Testes de migração e rejeição em `salvamento-v12.test.ts`.

## Salvamento V13: corais do Recife (fase3-03, 29/10/2026)

`SalvamentoV13Schema` troca `recife` por `RecifeV13Schema`: os três achados da V11 mais `corais`,
um inteiro de 0 a `2 ** PONTOS_DE_CORAL - 1` (15), um bit por ponto de replantio da lagoa (o
ponto N é o bit N - 1). `migrarDaV12` começa em 0. A união pública aceita V1 a V13 e devolve V13;
a V12 continua estrita (não aceita `corais`). O catálogo do `aquario` ganhou a função ("um peixe
para cada coral replantado") e a origem (o primeiro coral). ⚠️ O pior caso de 64 KB em
`tests/salvamento-v10.test.ts` passa a pôr também o Recife mais pesado (`false` ocupa um byte a
mais que `true`, os corais com dois dígitos): sobram 48 bytes (medido em 29/10/2026). Campo novo
precisa achar espaço antes. Testes: `salvamento-v13.test.ts`.

## Salvamento V14: a banda do Pico (fase3-08, 29/10/2026)

`SalvamentoV14Schema` acrescenta `pico: { banda }`, um número de 0 a 7, um bit por instrumento de
volta ao palco, na ordem xilofone, violão e bateria (`INSTRUMENTOS_DA_BANDA = 3`; o jogo tem a
lista em `sistemas/banda.ts`). `migrarDaV13` começa em 0. A união pública aceita V1 a V14 e devolve
V14; a V13 continua estrita. 19 bytes no pior caso: sobram 29 do teto. Testes em
`salvamento-v14.test.ts`. Em `objetos.ts`, a origem da lareira e da banda diz de onde elas vêm
(o primeiro chocolate quente no iglu e o festival de inverno).

## Aparências lidas pela plataforma (29/10/2026)

`aparencias.ts`: `AparenciaLidaSchema` valida GLB estático autônomo ou PNG. Tetos propostos em
`LIMITES_DA_APARENCIA`: 2 MiB de GLB, 5.000 triângulos contando instâncias, atlas 512; PNG
256 KiB e lado 192. Confere cabeçalho, buffers, acesso à geometria, imagens embutidas e ciclos.
`escalaDaCaixaDoMolda` é compartilhada pela oficina e pelo encaixe do jogo. O método
`Plataforma.lerAparencia(criacaoId, sinal?)` é opcional, recebe somente id da conta e devolve
bytes próprios ou null. Mantém contrato 1 e salvamento intactos. A visita não recebe esses ids.
Testes em `tests/aparencias.test.ts`; regra completa em `docs/arquipelago-regras.md` §6.16.

## Salvamento V15: o filhote do Vale (fase4-03, 29/10/2026)

`SalvamentoV15Schema` troca `vale` por `ValeV15Schema`: o da V12 mais `filhote`
(`FilhoteDoValeSchema`, `null` até a Jade entregar o ovo): `ovo` de 0 a `DIAS_PARA_CHOCAR` (3),
`aquecidoEm`, `comeuEm` e `carinhoEm` (dia ou `null`), `nome` de 1 a 16 letras ou `null` e `dias`
de 0 a `DIAS_CUIDADOS_MAXIMO` (99). Para caber, o id de uma aparência guardada vai até
`ID_DA_APARENCIA_MAXIMO` (40; `AparenciaV15Schema`, `ProjetoAzulV15Schema`); o migrador histórico
`migrarDaV14` tira das guardadas o que passar disso (a em uso vira `null`) e começa o filhote
em `null`. Esse filtro não é usado pela migração pública atual, descrita na V16 abaixo.
Na entrega da V15, a fixture de capacidade com IDs canônicos deixava 4579 bytes livres;
ela não representa todas as combinações de referências legadas longas. Os testes antigos montam a base
pela V14 (`tests/ajuda-salvamento.ts`, `inicialV14`). Testes: `salvamento-v15.test.ts`. O catálogo
diz de onde vem o museu (o fóssil descoberto no Vale).


## Salvamento V16: continuidade sem descarte (L01, 29/10/2026)

Na entrega V16, a união pública aceitava V1 a V16 e devolvia V16. `migrarDaV15` acrescenta `nuvens.constelacoes`
(0..63), `farol.pagina`, `farol.concluido` e `clima` (`sol`, `nublado`, `chuva`). Final concluído
exige página. `PERCURSOS` inclui `nuvens-saltos` e `nuvens-balao`; os schemas até V15 mantêm o
catálogo histórico. `migrarDaV14ParaAtual` preserva IDs antigos de até 80, sem chamar o filtro
histórico de `migrarDaV14`. Os schemas e migradores históricos não mudam de semântica.

`ProjetoAzulAtualSchema` volta ao limite aceito antes da V15. O formato da ferramenta Lumi V1
não muda; sua geladeira aceita referências antigas completas. `ID_DA_APARENCIA_MAXIMO` é o
limite histórico V15, não o limite global de bytes nem uma instrução para truncar IDs.
O orçamento com IDs canônicos e a recusa global acima de 64 KB são provas diferentes.
Testes: `salvamento-v16.test.ts`, `salvamento-v10.test.ts` e HTTP do serviço.

## Salvamento V17: amizade dos seis moradores (29/10/2026)

A união pública aceita V1 a V17 e devolve V17. `migrarDaV16` acrescenta Maré, Floco, Jade e
Iriê, cada qual com seu próprio `MoradorSchema` vazio. Capi, Bento, objetos e conquistas são
preservados. Os esquemas históricos continuam estritos e os migradores de versão conservam
seu destino. `migrarDaV14ParaAtual` é a composição até a versão atual, preservando os IDs longos.

`MORADORES_DO_ANEL` é a lista dos seis registros. A amizade e o inventário continuam na mesma
revisão CAS; não se somam cópias concorrentes. O caso pesado com os seis pedidos em Unicode
ocupa 62.605 bytes, com 2.931 de margem. O teto de 65.536 bytes continua independente dessa
fixture e nunca autoriza truncar dados. Testes: `salvamento-v17.test.ts` e capacidade V10.

## Posse única da galeria (L04, 30/10/2026)

`posse-da-galeria.ts` mantém os nove IDs de aparência e mapeia a identidade da posse.
Aquário, fliperama e planta têm destinos quarto e jogo; os outros seis só jogo. Os
preços únicos permanecem no `GALERIA`. Contratos internos são estritos e não aceitam
preço no pedido. `adocao-da-galeria.ts` é transferência operacional v1, com limite
de compras e recusa de chaves/itens repetidos. Nunca expor sua aplicação ao jogador.
O save V18 permanece igual. Nenhum contrato importa o jogo, React ou three.
