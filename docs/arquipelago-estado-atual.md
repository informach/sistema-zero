# Estado atual do Arquipélago Vagalume

Leitura local de 30/10/2026, base de conciliação `11002f9ff` e lote de visitas adultas. Este índice separa implementação de entrega
operacional. A [auditoria](../.audits/architectural-analysis-2026-10-30-arquipelago.md) registra
os achados na base anterior; o [programa de ajustes](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md)
registra cada commit e merge posterior. Os checkpoints dos planos antigos são históricos.
O [levantamento integrado de 30/10](arquipelago-levantamento-2026-10-30.md) junta estas fontes,
compara ilha por ilha com a proposta e lista achados novos (N01 a N15) ligados aos lotes.

**Revisão dos lotes de 30/10 (base `f62ab0807`).** O [relatório da revisão](../.audits/architectural-analysis-2026-10-30-arquipelago-revisao-dos-lotes.md)
encontrou R1 a R5. Corrigidos na `staging` local, sem push: R1, o projeto autoral do Farol
aprovava ações sem efeito (regra causal `gameCausality`, merge `510fc6a79`); R3, pausa e menos
movimento do pet que acompanha (merge `7d87ca0f8`); R4, lint do diff, com os manifestos do C02
gravados no formato do Biome pelo gerador (merge `ae59bf925`); R5, este índice. R2 (Python e Pro
abrindo pelo jogo, elegibilidade e release Python) está com a sessão do levantamento, no ramo
`arquipelago/levantamento-c02-ambiente`; até ele chegar, o diálogo recusa Python e Pro.

## Fontes vigentes

| Regra | Valor nesta base | Fonte de autoridade |
| --- | --- | --- |
| Salvamento | V20; aceita e migra versões anteriores | `VERSAO_SALVAMENTO` e `SalvamentoSchema`, [salvamento.ts](../packages/arquipelago-contracts/src/salvamento.ts) |
| Teto do documento | 65.536 bytes UTF-8, não caracteres | `SALVAMENTO_MAX_BYTES`, mesmo arquivo; [cenários cheios](../packages/arquipelago-contracts/tests/salvamento-v10.test.ts) |
| Moedas do jogo por semana | 100; preservar créditos antigos | `ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS`, [repositório do Members](../packages/members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository.ts) |
| Ritmo de movimento | Base 1 para bem e cansado; bônus 1,1 para ótimo | `RITMO`, [necessidades.ts](../packages/arquipelago/src/sistemas/necessidades.ts) |
| Quadros por ilha | 6 | `QUADROS_POR_ILHA`, [desafios.ts](../packages/arquipelago-contracts/src/desafios.ts) |
| Publicação e aprovação | Serviço e executor decidem; o cliente não concede conclusão | [regras dos manifestos](arquipelago-manifesto-de-desafios.md) |

As menções a V11, V12 e outras versões nas seções datadas explicam quando um campo entrou.
Não descrevem a resposta atual do serviço. Da mesma forma, 150 moedas foi uma regra anterior,
substituída por 100; não é um teto alternativo. A margem histórica de 29 bytes também não é
a margem atual: o ensaio de documento cheio foi atualizado após reorganizações posteriores.
Consultar e executar o teste antes de acrescentar dados, em vez de usar uma folga antiga.

## Matriz de implementação e entrega

“Prova local” indica exatamente o recorte dos arquivos vinculados. Não certifica implantação,
uso por uma conta real ou celular físico. Nenhum estado remoto foi inferido de um commit.

| Funcionalidade | Código e conteúdo locais | Prova local | Implantação ou decisão ainda necessária |
| --- | --- | --- | --- |
| Continuidade, fila e conflitos | Diário local, revisões e recuperação implementados | [Continuidade](qa/2026-10-29-continuidade/README.md) | Jornada autenticada completa e versões servidas em Q01 |
| Pinta e Molda no mundo | Ponte da plataforma e aparências da própria pessoa implementadas; reserva no modelo existente | [Molda no mundo](qa/2026-10-29-molda-no-mundo/README.md) | Aceite autenticado da página, ferramentas e acesso real; arte adicional somente se uma falta for comprovada |
| Galeria e inventário único | Código de integração e adoção preparado | [Procedimento da galeria](operations/arquipelago-galeria-unica.md) | Adoção de compras antigas e conferência operacional; não executadas por este lote |
| Cor conquistada | Histórico confirmado independente de arquivamento/publicação; cache cosmético isolado por perfil | [A02, sete cenários](qa/2026-10-30-cores-conquistadas/README.md) | Conferir serviço, gateway e host implantados juntos; o fallback não reconstrói histórico remoto ausente |
| Quadros e desafios do dia | C01a confere fontes dos requisitos derivados pelo Members. C01b1 inventaria 54 atividades em dois públicos, sem publicação automática. C01b2a/b retiram dependências opcionais dos quadros do Bosque e da Vila. C01c compara regras alteradas e recusa desconhecidos; C01d corrige IDs; C01e impede retirar derivados manualmente; C01e2 reanalisa a publicação exata antes de reativar. C01f recusa objetivo que o inicial já cumpre (`fc9b9ac10`); C01b ajusta o repertório do Recife, Pico, Vale e Nuvens (`956bcfe5e`). C02: contrato, Members e Admin aceitam Python e Pro (`79c2df4a9`) e há quatro desafios com inicial, gabarito e negativos (`6cf4d7b26`), mas o diálogo do jogo ainda os recusa (R2, outra sessão). C03a Pega-conchas (`7a95991ea`) e C03b projeto autoral do Farol (`ca1ccf83b`, critérios causais desde `510fc6a79`). Nos JSON locais, 54 de 130 entradas pedem publicação; Bosque e Vila, nenhuma | [Inventário](desafios-do-jogo/repertorio-local.md), [regras a completar](desafios-do-jogo/regras-a-completar.json), [plano C01](superpowers/plans/2026-10-30-arquipelago-curriculo-publicacao.md), [corrida do Bosque](qa/2026-10-30-bosque-repertorio/README.md) e [corrida da Vila](qa/2026-10-30-vila-repertorio/README.md) | Aplicação completa do Inventor (a corrida da Vila não comprova pulo com apoio, colisão e dificuldade), fontes curriculares do Vale textual, Python/Pro no cliente e publicação dos suspensos depois da prova curricular. Publicação remota não comprovada; não marcar `publicar: true` em lote |
| Minijogos e fliperama | Aprovação, cópia, player e ligação ao Mural implementados | [Fliperama e Mural](qa/2026-10-29-fliperama-mural/README.md) | Conferir ciclo autenticado de desafio, aprovação, atração e abertura nos dois públicos |
| Quarto, abertura e cuidado | Pausa de pet/móveis, leitura manual com voltar e bônus sem reduzir ritmo básico. O pet que acompanha pela ilha (S01, `a40283108`) para inteiro na pausa e o passarinho voa sem balanço com menos movimento (R3, `7d87ca0f8`) | [A03a](qa/2026-10-30-quarto-pausa/README.md), [A03b](qa/2026-10-30-leitura-abertura/README.md), [A03c](qa/2026-10-30-ritmo-basico/README.md); pet: `tests/pet-que-acompanha.test.ts` e `playground/verificar-companhia-browser.ts` (passarinho, provado por mutação) | Qualificação de leitura, toque e acessibilidade com pessoas e dispositivos reais |
| Farol e Íris | Sala, última página, seis fachos e volta da Íris implementados; prioridade da HUD integrada em `16345a590` | [A04](qa/2026-10-30-prioridade-farol/README.md) e [final](plans/2026-10-29-arquipelago-final-do-farol.md) | Projeto autoral (C03b) e exposição (galeria do Farol, `20b312aa1`) feitos. Falta a subida física final pelo Farol (escada, bordas, equilíbrio, corrente de ar e âncoras): hoje a entrada na sala do alto não entrega essa aventura |
| Rede de barcos | Portos, destinos, canais, espera e troca de ilha completa implementados | [Rede de barcos](qa/2026-10-30-rede-barco/README.md) | Integração ampliada e aparelho físico. Portos já existentes não são pedido de arte pendente |
| Fantasma de percurso familiar | Gravação, autorização, serviço, replay e interface integrados pela outra sessão em `ae68922b1` | [Fantasma familiar](qa/2026-10-30-fantasma-familiar/README.md) | [Migração e adoção](operations/arquipelago-fantasmas.md), jornada autenticada. Adulto compara consigo; visita consentida entre adultos continua separada |
| Moradores, aconchego e Lumis | Cuidado, rotinas e consequências no mundo implementados conforme regras | [Regras](arquipelago-regras.md), seções de moradores, construção e Lumis | Não confundir rotinas de Lumi com todo o currículo dos cursos; qualificação integrada em Q01 |
| Insumos e pedidos remunerados | Compras e entregas com revisão, idempotência e carteira implementadas | [Insumos](qa/2026-10-30-insumos/README.md), [operação](operations/arquipelago-insumos.md) | Conferência operacional de API, Members e fluxo autenticado; nenhum crédito remoto foi emitido neste lote |
| Feira, receitas e roupas | Tema semanal e integrações existentes. Festa de fim de ano ativa de 20/12 a 06/01 (`sistemas/festas.ts`, data aprovada em 30/10); Noite das Lanternas sem data | [Vestuário sazonal](superpowers/plans/2026-10-30-arquipelago-vestuario-sazonal.md), [receitas](superpowers/plans/2026-10-30-arquipelago-receitas-sazonais.md) | Noite das Lanternas depende de data aprovada e continua desligada |
| Pele adulta | Tema e voz específicos implementados | [CLAUDE do jogo](../packages/arquipelago/CLAUDE.md), seção Pele adulta | Paridade de conteúdo publicado continua ligada a C01/C03; não chamar toda a versão adulta de pendente |
| Visitas adultas consentidas | Convite opaco revogável, casa somente de leitura, isolamento do Kids e confirmação durante a visita implementados | [L12](qa/2026-10-30-visitas-adultas/README.md), banco e HTTP reais locais; navegador com plataforma falsa | Aceite autenticado hospedado em Q01/L14 e implantação da migração 0016, API/gateway/BFF/cliente juntos; não executados |
| Medição | Fotografia, mudanças de aparência por data do servidor e aprovações separadas; grupos pequenos protegidos | [QA A06](qa/2026-10-30-medicao-aparencias/README.md) | Migração 0015 e implantação ordenada ainda locais. Datas de criação e compra não integradas. Aplicar aparência não prova autoria nem aprendizado |
| Coleções da praia | Coleta de cinco conchas, observação da estrela e pesca de cinco espécies ligadas ao álbum e ao inventário | [Plano E01](superpowers/plans/2026-10-30-arquipelago-colecoes-da-praia.md), testes de regras, modelos, espaço do corpo e save cheio | Provas finais e limites em [QA da praia](qa/2026-10-30-colecoes-da-praia/README.md); aceite hospedado e aparelho físico em Q01. Pega-conchas pertence ao conteúdo C03 |
| Coleções do Pico e das Nuvens, iscas | Notas e cristais do Pico, estrelas das Nuvens à noite, no álbum e na mochila; minhoca e pena na pesca, de graça ou na feira | Testes de lugares contra os GLBs, regras e save cheio; `playground/verificar-colecoes-e-iscas-browser.ts` | Aceite hospedado e aparelho físico em Q01 |
| Móveis dos cômodos (V20) | 21 móveis da cozinha, sala e banheiro na ferramenta Móveis do Construir, com abas, peças de parede, tapete por baixo, aconchego e colisão | `tests/moveis.test.ts` (regras e GLBs), `salvamento-v20.test.ts`; `playground/verificar-moveis-browser.ts` | Aceite hospedado e aparelho físico em Q01 |
| Modo livre e galeria do Farol (V20) | Depois do final, todos os projetos azuis chegam e a sala do alto do Farol vira galeria: seis pedestais com aparências do Pinta e do Molda, minijogos aprovados e jogos do Mural, câmera própria da galeria no modo livre | `tests/galeria-do-farol.test.ts` (regras, vagas contra a sala real, câmera, modo livre), `salvamento-v20.test.ts`; `playground/verificar-galeria-farol-browser.ts` (`?jogos=exemplo`) | Aceite hospedado e aparelho físico em Q01 |
| Segredos e mapa detalhado | Três percursos na V19, mapa que se revela andando (`0e7236050`), chaves dos cômodos (`32f155177`) e baús no alto do vento, só com o planador (`6238451e1`) | Testes de cada lote e `playground/verificar-segredos-browser.ts` | Conteúdo dos quatro baús: hoje a recompensa é o registro do achado no álbum; Lumis raros e páginas extras ainda não existem |
| Construção avançada e Lenda | Quintal grande (`92aea3551`), 21 móveis (V20, `74a0e1d43`), modo livre e galeria do Farol (`20b312aa1`) | Linhas dos móveis e da galeria acima | Iglu (o commit saiu na integração da V20 por falta de espaço no salvamento), segundo andar, terraformação e subida final; documento próprio de obra estendida; pedidos em [arte](plans/2026-10-30-arquipelago-pedidos-de-arte.md) |

## Relatórios gerados e revisão

Lint (R4, 30/10): `biome check` sobre os arquivos TS, TSX e JSON alterados desde `5012f01dd` ficou
sem erros. Restam avisos que não reprovam: oito manifestos acima de 1 MiB, que o Biome não lê, e
um `useOptionalChain` em `verificar-segredos-browser.ts`. Os manifestos do C02 saem do gerador já
formatados (`docs/desafios-do-jogo/gravar-manifesto.ts`); não formatar à mão.

O achado A9 foi tratado por outra sessão em `f72f3cce7`, integrado em `8c89b2565`.
Os geradores escrevem os relatórios de arte no formato do Biome. Nesta base, os nove
`relatorio.json` existentes em `arte/` passaram em `bunx biome check`, sem edição nem
regeneração. Não excluir a pasta inteira do lint para esconder um relatório fora do padrão.

## Como atualizar este índice

Ao fechar um lote, atualizar a linha correspondente com o commit e a prova. Se houver
publicação, registrar separadamente ambiente, revisão e aceite observado. Não promover uma
marca `publicado` no manifesto a prova de importação, nem um print em SwiftShader a teste de
desempenho físico. Decisões abertas continuam explícitas; checkpoints antigos não são apagados.
