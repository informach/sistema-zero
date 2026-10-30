# Ajustes da auditoria do Arquipélago

## Autorização e desenho aprovado

Em 30/10/2026, a dona autorizou executar todos os ajustes do levantamento, em lotes com revisão,
commit e merge no staging local. Não fazer push. Referência: a auditoria
`.audits/architectural-analysis-2026-10-30-arquipelago.md`, a proposta do Arquipélago e a revisão
da Jornada do Criador de 25/10/2026 identificadas pelos hashes no relatório.

Achados posteriores à auditoria, N01 a N15, estão no
[levantamento integrado de 30/10](../arquipelago-levantamento-2026-10-30.md), cada um ligado a um lote.

Este plano complementa `2026-10-29-arquipelago-entrega-integral-design.md`. Não declara os lotes
antigos encerrados nem repete funcionalidades já implementadas. Cada fechamento distingue
implementação, provas locais, arte/conteúdo e implantação.

Escolha: consolidar os sistemas existentes e completar os ciclos de produto, por responsabilidade.
Uma reescrita do motor perderia regras e testes úteis. Um único commit grande dificultaria revisar
e integrar o trabalho simultâneo. Por isso, cada lote produz uma melhoria verificável e entra
separadamente no staging local.

## Regras de execução

**Orientação mais recente da dona, 30/10/2026:** concluir o lote atual C01b2b e seu review,
fazer commit e merge no staging local, depois push de staging. Após esse envio, pausar a
implementação de novos lotes. A restrição anterior de push fica revogada somente para esse
envio. O início de C01f permanece como rascunho local no worktree da auditoria, fora do lote
e do staging; ainda não tem suíte completa, review final ou commit.

- Branch própria a partir do staging local, em worktree separado. Preservar todas as mudanças da
  outra sessão, especialmente barcos, HUD e carregamento de ilhas. Integrar apenas quando o Git
  puder preservar a árvore compartilhada; nunca guardar ou descartar o trabalho alheio.
- Não usar subagentes nesta execução. Aplicar `executing-plans` em sequência e fazer revisão
  própria de código, requisitos, testes e limites antes de cada commit.
- Não escrever em bancos de staging/produção. Banco de teste somente local descartável.
- Não editar `.env`, workflows, Blender ou GLBs. Pedidos de arte ficam agrupados por lote.
- Preservar migrações históricas e o teto de 65.536 bytes UTF-8. Não aumentar salvamento sem
  necessidade e sem provar migração, conflito e cenário cheio. Não colocar dados de carteira nele.
- Textos da criança sem travessão ou exclamação, sem começar por pergunta. Versões adultas na voz
  existente. Cursos continuam donos da progressão e repertório.
- Em cada lote de código: teste dirigido, suíte do pacote, tipagem com 8 GB, Biome dos arquivos
  tocados e prova no navegador quando o comportamento é visível. Não chamar SwiftShader de
  desempenho medido em celular físico.
- Commit claro em português, sem identificador de modelo. Merge no staging local. Sem push,
  importação de conteúdo remoto ou implantação automática.

## Matriz de lotes

| Lote | Escopo e referência | Critério para encerrar |
| --- | --- | --- |
| A01 | Recursos animados, achado A10 | Esqueletos próprios descartados uma vez, original preservado; repetição no navegador sem crescimento por remontagem |
| A02 | Cor das ilhas, A1 | Catálogo desconhecido usa base/último confirmado; publicação não apaga conquista visual; sem conceder moedas ou aprovação local |
| A03 | Movimento, pausa e leitura, A3/A4/A6 | Pet e móveis respeitam pausa/redução; abertura permite ler/voltar; cuidado só beneficia movimento, percursos continuam possíveis |
| A04 | Guia contextual, A5 | Final prioriza última página e revelação, tarefas de rotina retornam depois, incluindo celular e voz adulta |
| A05 | Estado canônico e relatórios, A8/A9 | Documentos atuais concordam em versão/teto/disponibilidade; relatórios gerados têm tratamento explícito sem alterar arte |
| A06 | Medição de autoria, A7/L13 | Fotografia atual rotulada corretamente; fatos novos registram evento e período próprios, sem inventar fontes nem expor dados pessoais |
| C01 | Currículo e publicação, A2/L03 | Retomada separada de aplicação; pré-requisitos reais e objetivos observáveis por posto; sem liberar blocos manualmente |
| C02 | Python e aplicação textual/Pro, L03 | Contrato/executor suportam evidência da linguagem e ambiente ensinados; casos negativos no executor real, sem cobrar estrutura pronta |
| C03 | Faísca e projeto autoral, L03/L11 | Pacote central e continuidade do Farol coerentes com o repertório; Kids/adulto; artefatos, iniciais, soluções e negativos validados |
| E01 | Praia e coleções | Pesca e coleção com os modelos disponíveis, regras tranquilas e persistência comprovada; arte faltante não é simulada por geometria improvisada |
| E02 | Exploração ampliada, L10 | Integrar o resultado da outra sessão de barcos; mapa/segredos definidos por percursos existentes; não duplicar rede em paralelo |
| E03 | Fantasma familiar, L10 | Autorização, gravação, reprodução e interface integradas somente para a família permitida |
| E04 | Construção e Lenda, L11 | Segundo andar, terraformação delimitada, criação e exposição com orçamento, colisão, desfazer e retomada; planos próprios antes de alterar cada sistema |
| S01 | Companhia, calendário e adultos, L06/L09/L12 | Relação pet/acompanhante explícita, visita adulta consentida e sazonalidade com datas aprovadas; ausência sem perda |
| Q01 | Integração e entrega, L04/L05/L14 | Ciclos locais completos nas duas comunidades, migração e adoção operacionais documentadas, QA autenticado em ambiente local e qualificação física identificada separadamente |

As etapas de publicação/implantação não serão executadas durante a restrição de envio. Testes
físicos e decisões de datas não podem ser declarados concluídos sem a evidência correspondente.
Essas dependências não interrompem lotes independentes.

## Primeiro lote: descarte de personagens animados

**Objetivo:** eliminar a retenção da textura de esqueleto observada nas remontagens do Farol.

**Arquivos:** `packages/arquipelago/src/mundo/arte-animada.ts`, teste próprio em
`packages/arquipelago/tests/arte-animada-descarte.test.ts`,
`packages/arquipelago/playground/verificar-final-farol-browser.ts`, seção nas regras e no
`CLAUDE.md` do jogo. Evidência em `docs/qa/2026-10-30-descarte-animado/`.

**Interface preservada:** `copiarArteAnimada(original)` continua devolvendo `cena`, `bocas`,
`luzes` e `soltar()`. A cópia é proprietária dos esqueletos clonados e dos materiais de brilho
duplicados. Geometrias, texturas de materiais e materiais não alterados continuam compartilhados.

- [x] Criar uma cena mínima com dois `SkinnedMesh`, esqueleto e geometria compartilhados no
  original. Clonar pelo helper real e alocar `boneTexture` nos esqueletos da cópia. Observar eventos
  `dispose` da cópia, do original e das geometrias/materiais compartilhados.
- [x] Demonstrar a falha atual: depois de `soltar()`, os esqueletos próprios ainda têm textura.
- [x] Recolher esqueletos únicos durante o percurso já usado pelo helper. Tornar o descarte
  idempotente e executar `skeleton.dispose()` apenas nas cópias, além dos materiais já exclusivos.
- [x] Testar original intacto, segunda cópia utilizável, descarte repetido e cena sem esqueleto.
- [x] Ampliar o verificador do Farol para aquecer uma remontagem e repetir três ciclos, conferindo
  texturas e geometrias após a cena estabilizar. Manter os casos de página, pausa, persistência,
  falha de carga e bloqueio antes da Lenda.
- [x] Rodar teste dirigido e suíte, tipagem, Biome, navegador nos dois tamanhos. Comparar com a
  sequência da auditoria: 53, 74, 95, 116 e 137 texturas, com 399 geometrias.
- [x] Revisar o diff e a propriedade dos recursos; registrar comandos e resultado; commit.
- [x] Merge local do A01: `00adca1df`. As duas seções novas do CLAUDE foram preservadas ao
  resolver o conflito documental. A suíte dirigida passou novamente na árvore integrada.

## Registro dos lotes

| Lote | Estado | Commit / merge | Evidência e dependências |
| --- | --- | --- | --- |
| Organização | Registrada no staging local | `1b7a6c4a1` | Auditoria e QA preservados; desenho aceito pela instrução da dona |
| A01 | Implementado, revisado, verificado e integrado no staging local | `7b1273879`, merge `00adca1df` | 1.223 testes passaram, 1 ignorado; tipagem/Biome aprovados; texturas 53 constantes em computador e celular emulado; 22 testes dirigidos repetidos após integrar |
| A02 | Implementado, revisado, verificado e integrado no staging local | `5a4c8e042`, merge `165e94c10` | Sete cenários em dois tamanhos; suites, tipagem e Biome aprovados; QA em `docs/qa/2026-10-30-cores-conquistadas/` |
| A03a | Implementado, revisado, verificado e integrado no staging local | `ebf069fde`, merge `297e95fd1` | 1.297 testes do jogo e 2 do avatar-quarto aprovados, tipagem/Biome aprovados, 22 verificações de pose no navegador; QA em `docs/qa/2026-10-30-quarto-pausa/` |
| A03b | Implementado, revisado, verificado e integrado no staging local | `f60621b26`, merge `579cb2840` | 1.298 testes aprovados, tipagem/Biome, navegador em dois tamanhos; `docs/qa/2026-10-30-leitura-abertura/` |
| A03c | Implementado, revisado, verificado e integrado no staging local | `48714b12b`, merge `9af68cb3e` | 1.299 testes aprovados, tipagem/Biome, velocidades básicas e pulo no navegador; `docs/qa/2026-10-30-ritmo-basico/` |
| A04 | Implementado, revisado, verificado e integrado no staging local | `012281a29`, merge `16345a590` | 1.308 testes aprovados, tipagem/Biome, Farol nos dois tamanhos e públicos; pendências e tutorial retomados sem recado vencido; `docs/qa/2026-10-30-prioridade-farol/` |
| A05, parte A9 | Feito pela sessão de arte e conferido nesta auditoria | `f72f3cce7`, integrado em `8c89b2565` | Geradores gravam no formato do Biome; os nove `relatorio.json` existentes passaram sem edição ou regeneração |
| A05 | Índice canônico e resumos revisados e integrados localmente | `6db264de9`, merge `9b5fcdd01` | Matriz de código/conteúdo/provas/implantação, histórico identificado, versões e teto conferidos, pedido de arte do Farol marcado como atendido |
| A06 | Implementado, revisado, verificado e integrado localmente | `a0ec519a2`, merge `85ee77ecf` | Fotografia separada de aplicações/trocas confirmadas; API 263, contratos 201, Admin 971 testes aprovados; migração gerada, tipagem/Biome e navegador local aprovados, sem reconstruir criação/compra |
| C01a | Barreira de repertório implementada, revisada, verificada e integrada | `796c2ae89`, merge `c06f7ea87` | 265 testes aprovados, tipagem/Biome; publicação, importação e reativação recusam cobertura impossível e quadros dependentes só de opcionais. Classificação dos pacotes continua em C01b |
| C01b1 | Inventário de repertório e suspensão da publicação automática revisados e integrados | `d34453c25`, merge `9ee93859b` | 54 atividades em dois públicos, fontes por papel/posto; 205 testes de contratos e 18 de conteúdo aprovados, tipagem/Biome; projetos e objetivos preservados. Árvore integrada com visitas adultas: 207 testes de contratos aprovados. Correções de dependência continuam em C01b2/C02 |
| C01b2a | Corrida do Bosque revisada, verificada e integrada localmente | `0da3ba918`, merge `4b4b985de` | Seis quadros sem dependência de extra; contratos 208, conteúdo 18, runtime 386 aprovados; executor real e oito casos visuais. A lacuna da derivação de tipos já presentes é tratada em C01c |
| C01b2b | Controles da corrida da Vila revisados, conferidos e integrados localmente | `5eeeb0836`, merge `0ca840100`; envio de staging autorizado | Enter/+ dá largada, Espaço/A recomeça no extra. Quatro jogos sem clique de curso opcional; cinco quadros intactos. Contratos 209, conteúdo/Blockly 128 e runtime 386 testes aprovados; executor real com 167 asserções; oito casos visuais; tipagem e Biome aprovados |
| C01c | Análise de regras alteradas e recusa de blocos desconhecidos, integrada localmente | `6547f2417`, merge `27cd2b91d` | Members 2.131 testes, API dirigida 49, tipagem/Biome; relatório das 108 entradas. Cinco atividades nos dois públicos tinham IDs repetidos, tratados em C01d |
| C01d | IDs distintos nas fábricas da Vila e do Pico, integrados localmente | `e801f3545`, conciliação `cc6a8c620`, merge `0285b4284` | Leitor canônico em 108 atividades; contratos 208, conteúdo 126 e Estúdio 11.167 testes aprovados, executor real e tipagem/Biome. Ajuste de tipagem do Reino Zero mantém o exemplo idêntico. Praia preservada, 137 testes dirigidos aprovados na árvore conciliada |
| C01e | Retiradas manuais não ocultam requisitos derivados, integrado localmente | `50ca1203b`, merge `a769f0a78` | API 270 e Admin 971 testes aprovados, tipagem/Biome. Publicação/importação bloqueadas; resposta antiga do Members com desconhecidos também |
| C01e2 | Reativação reanalisa a publicação exata, integrada localmente | `32dd5897a`, merge `5e76a14d7` | API 332 testes aprovados, 45 ignorados, Postgres local descartável, tipagem/Biome. Requisitos históricos incompletos exigem nova publicação; rascunho e conquistas preservados |
| E02, rede do barco | Implementada por outra sessão e presente na base | `f27f31aaf` | `docs/qa/2026-10-30-rede-barco/`; mapa detalhado e conexões entre segredos continuam no restante de E02 |
| E03 | Implementado por outra sessão e integrado localmente | `bbe7418bf`, `5df394ff3`, merge `ae68922b1` | `docs/qa/2026-10-30-fantasma-familiar/`; migração/adoção e aceite autenticado separados em Q01 |
| S (V19) e N05 | Integrado e enviado ao staging | `1e96a7627`, merge `1488f46c7` | Chaves, segredos, mapa, companhia e três percursos novos num salvamento só; documento cheio conferido |
| N01 | Integrado e enviado | `43a33bc91`, merge `95a087743` | Borrões e Lumis em todas as ilhas, lanterna pelo Zappy na primeira noite |
| N02 | Integrado e enviado | `cef00ff9f`, merge `2644215eb` | Cena da subida de posto; a fala "próxima fase" saiu do código |
| N03 e N04 | Integrado e enviado | `34ff3724a`, merge `ff0a6722e` | Horta em horas, primeiro pedido rápido, clima natural antes das Nuvens |
| N06, N07 e festa de fim de ano | Integrado e enviado | `761342049`, merge `942594230` | Resumo do dia, fim do tempo no fim da ação, festa de 20/12 a 06/01; Lanternas desligadas |
| N08a | Integrado e enviado | `6c3447410`, merge `0e765c955` | Visitas de outras crianças só com os dois interruptores ligados; regras §6.22 |
| N08b | Integrado e enviado | `f58b6c60d`, merge `8ce5acf9a` | Fotos no Clube pela moderação do hub; regras §6.23 |
| N11 | Integrado e enviado | `32f155177`, merge `7316af613` | Chaves dos cômodos; regras §6.16.2a |
| N12 | Integrado e enviado | `6238451e1`, merge `fca682da3` | Baús no alto do vento, só com o planador; o conteúdo dos baús fica pendente; regras §6.24 |
| E02, mapa | Integrado e enviado | `0e7236050`, merge `cc34abc4f` | O mapa de cada ilha se revela andando; regras §6.25 |
| S01, companhia | Integrado e enviado | `a40283108`, merge `b3798e66f` | O bichinho do quarto acompanha pela ilha; regras §6.26 |
| E04, iglu e quintal | Quintal integrado e enviado; iglu adiado | `92aea3551`, merge `74819e31b`; iglu `3751feaaa` retirado na integração `25c225e5c` | O salvamento V20 do remoto não deixou espaço para o iglu; volta num documento próprio do serviço junto com o lote na arte. Segundo andar, terreno e subida final continuam |
| C01b | Integrado e enviado | `956bcfe5e`, merge `b4ae582b6` | Recife, Pico, Vale e Nuvens só com blocos da trilha; 22 quadros voltam a pedir publicação, a importação é da dona |
| A05 e N13 (30/10) | Regras §5, §6.9 e §6.27 atualizadas para a V20 | este lote | Decisões N09, N10, N15 e Íris na abertura registradas |
| C02, C03, resto de E04, Q01 | A executar | Nenhum | C02 em andamento |

### Lote de visitas adultas da frente de entrega integral

L12/S01 tem implementação local de visita por código revogável, sem diretório ou mudança
de V18, na frente que também integrou barcos e fantasmas. Plano próprio em
`docs/superpowers/plans/2026-10-30-arquipelago-visitas-adultas.md`; provas em
`docs/qa/2026-10-30-visitas-adultas/`. A paridade de conteúdo, companhia e decisões de
calendário da linha S01 não são concluídas por esse recorte. O aceite hospedado continua Q01.

## Pedidos de arte

### Coleções da praia, E01

O recorte de coleta e pesca usa cinco conchas, estrela-do-mar, vara e ícones existentes.
Regras, interação, álbum e inventário ficam no jogo, sem migração da V18 ou nova porta de
plataforma. Plano próprio em `docs/superpowers/plans/2026-10-30-arquipelago-colecoes-da-praia.md`.
Não equivale ao pacote curricular Pega-conchas, a uma receita de peixe ou ao aceite hospedado.
As provas e os limites do recorte estão em `docs/qa/2026-10-30-colecoes-da-praia/README.md`.
Nenhum pedido de arte foi necessário.

Nenhum pedido no lote A01. Para praia, construção avançada e exposição, conferir primeiro o
inventário existente e registrar uma lista única de necessidades concretas por lote, com nó,
âncora, posição e finalidade. Não pedir modelo baseado apenas em uma hipótese.
