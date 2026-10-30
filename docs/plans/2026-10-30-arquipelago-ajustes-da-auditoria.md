# Ajustes da auditoria do Arquipélago

## Autorização e desenho aprovado

Em 30/10/2026, a dona autorizou executar todos os ajustes do levantamento, em lotes com revisão,
commit e merge no staging local. Não fazer push. Referência: a auditoria
`.audits/architectural-analysis-2026-10-30-arquipelago.md`, a proposta do Arquipélago e a revisão
da Jornada do Criador de 25/10/2026 identificadas pelos hashes no relatório.

Este plano complementa `2026-10-29-arquipelago-entrega-integral-design.md`. Não declara os lotes
antigos encerrados nem repete funcionalidades já implementadas. Cada fechamento distingue
implementação, provas locais, arte/conteúdo e implantação.

Escolha: consolidar os sistemas existentes e completar os ciclos de produto, por responsabilidade.
Uma reescrita do motor perderia regras e testes úteis. Um único commit grande dificultaria revisar
e integrar o trabalho simultâneo. Por isso, cada lote produz uma melhoria verificável e entra
separadamente no staging local.

## Regras de execução

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
| C01a | Barreira de repertório implementada, revisada e verificada | Commit deste lote, merge local em seguida | 265 testes aprovados, tipagem/Biome; publicação, importação e reativação recusam cobertura impossível e quadros dependentes só de opcionais. Classificação dos pacotes continua em C01b |
| E02, rede do barco | Implementada por outra sessão e presente na base | `f27f31aaf` | `docs/qa/2026-10-30-rede-barco/`; mapa detalhado e conexões entre segredos continuam no restante de E02 |
| E03 | Implementado por outra sessão e integrado localmente | `bbe7418bf`, `5df394ff3`, merge `ae68922b1` | `docs/qa/2026-10-30-fantasma-familiar/`; migração/adoção e aceite autenticado separados em Q01 |
| Demais lotes | A executar em ordem de dependência | Nenhum | Detalhar o plano do subsistema antes da sua implementação |

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
