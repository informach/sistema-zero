# Estado atual do Arquipélago Vagalume

Leitura local de 31/10/2026, base `ecbe7184a` (staging local, depois da revisão dos lotes de 31/10).
Este índice separa implementação de entrega operacional. A [auditoria](../.audits/architectural-analysis-2026-10-30-arquipelago.md) registra
os achados na base anterior; o [programa de ajustes](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md)
registra cada commit e merge posterior. Os checkpoints dos planos antigos são históricos.
O [levantamento integrado de 30/10](arquipelago-levantamento-2026-10-30.md) junta estas fontes,
compara ilha por ilha com a proposta e lista achados novos (N01 a N15) ligados aos lotes.

**Revisão dos lotes de 30/10 (base `f62ab0807`).** O [relatório da revisão](../.audits/architectural-analysis-2026-10-30-arquipelago-revisao-dos-lotes.md)
encontrou R1 a R5. Corrigidos na `staging` local, sem push: R1, o projeto autoral do Farol
aprovava ações sem efeito (regra causal `gameCausality`, merge `510fc6a79`); R3, pausa e menos
movimento do pet que acompanha (merge `7d87ca0f8`); R4, lint do diff, com os manifestos do C02
gravados no formato do Biome pelo gerador (merge `ae59bf925`); R5, este índice. R2 (Python e Pro
abrindo pelo jogo) foi feito pela sessão do levantamento: release Python ativa no Recife e no Pico
(`d1a14b2ce`) e o C02b (`42a908ffa`, merge `2225e8cfa`, [plano](superpowers/plans/2026-10-30-arquipelago-c02b-python-e-pro-no-jogo.md)),
com o contexto de execução `arquipelago` para o Python e a compilação Pro pelo desafio.
O que falta do plano, em ordem e separado entre Blender, código e decisões da dona:
[o que falta](plans/2026-10-30-arquipelago-o-que-falta.md).

**Revisão dos lotes de 31/10 (base `542249c2f`).** A [conferência](../.audits/architectural-analysis-2026-10-31-arquipelago-revisao-dos-lotes.md)
achou N1 a N5 e listou o resto do plano (lotes 9 a 11 da lista A v3, móveis no andar de cima e a
qualificação). Tudo implementado na `staging` local, um merge por item:
- N1 e N2, obra estendida segura (resposta perdida não apaga a obra; Desfazer no térreo não esconde o
  andar): `2c2c9b515`. N3, critérios causais com constantes (variável sempre falsa, código morto):
  `b55b5153d`. N4, a subida por fora leva à sala do alto e ao final: `c94c34139`. N5: este índice e
  os documentos do lote 11.
- C3, móveis no andar de cima, só dentro dos cômodos: `e2f151602`. Objetos com função ficam no
  térreo (escopo reduzido, decisão da dona).
- Noite das Lanternas de 1 a 12/10, com a cocada: `3a284cc16`.
- Lote 9 (conteúdo): Vila, a corrida do entregador sobre o Corre, Dino! (`a6124cde3`); Bosque, a
  chuva de pinhas com grupos, vidas e recomeço (`e23b51625`); Recife e Pico em Python com tema da ilha
  (`95f86a898`); Pico em blocos com duas fases (`f759abc71`); pedidos dos moradores como enunciado
  (`9b2edd22c`); Vale e Nuvens publicam (`17fdd3c6b`, decisão da dona); Farol em cada linguagem, com o
  curso-base da linguagem e a sugestão da última aprendida (`24b9daabb`).
- Lote 10: A34 frase das permissões (`d31d93526`), A35 versão atual e anterior do contrato
  (`26ff4edca`), A36 fronteira (`8b392b52c`), A28 nada pago é sorteado (`9410b092d`), A27 regra de
  segurança do jogo (`871549e6e`), A33 cartão dos pais por semana e por criação (`6dbfe3792`,
  migração 0024), B16 roupas da festa exclusivas (`ecbe7184a`).

## Fontes vigentes

| Regra | Valor nesta base | Fonte de autoridade |
| --- | --- | --- |
| Salvamento | V23 (01/11/2026, os outros bichos adotados); aceita e migra versões anteriores | `VERSAO_SALVAMENTO` e `SalvamentoSchema`, [salvamento.ts](../packages/arquipelago-contracts/src/salvamento.ts) |
| Teto do documento | 81.920 bytes UTF-8 (80 KB desde 01/11/2026), não caracteres | `SALVAMENTO_MAX_BYTES`, mesmo arquivo; [cenários cheios](../packages/arquipelago-contracts/tests/salvamento-v10.test.ts) |
| Moedas do jogo por semana | 100; preservar créditos antigos | `ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS`, [repositório do Members](../packages/members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository.ts) |
| Ritmo de movimento | Base 1 para bem e cansado; bônus 1,1 para ótimo | `RITMO`, [necessidades.ts](../packages/arquipelago/src/sistemas/necessidades.ts) |
| Quadros por ilha | 6 | `QUADROS_POR_ILHA`, [desafios.ts](../packages/arquipelago-contracts/src/desafios.ts) |
| Publicação e aprovação | Serviço e executor decidem; o cliente não concede conclusão | [regras dos manifestos](arquipelago-manifesto-de-desafios.md) |
| Obra estendida | Documento próprio, versão 1 (iglu, andar de cima com móveis, terreno), fora do salvamento | `VERSAO_DA_OBRA_ESTENDIDA`, [obra-estendida.ts](../packages/arquipelago-contracts/src/obra-estendida.ts); migração 0023 do serviço |
| Contrato da plataforma | Versão 1; os dois lados aceitam a atual e a anterior | `versaoCompativel`, [plataforma.ts](../packages/arquipelago-contracts/src/plataforma.ts) |

As menções a V11, V12, V20 e outras versões nas seções datadas explicam quando um campo entrou.
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
| Quadros e desafios do dia | C01a confere fontes dos requisitos derivados pelo Members. C01b1 inventaria 54 atividades em dois públicos, sem publicação automática. C01b2a/b retiram dependências opcionais dos quadros do Bosque e da Vila. C01c compara regras alteradas e recusa desconhecidos; C01d corrige IDs; C01e impede retirar derivados manualmente; C01e2 reanalisa a publicação exata antes de reativar. C01f recusa objetivo que o inicial já cumpre (`fc9b9ac10`); C01b ajusta o repertório do Recife, Pico, Vale e Nuvens (`956bcfe5e`). C02: contrato, Members e Admin aceitam Python e Pro (`79c2df4a9`) e há quatro desafios com inicial, gabarito e negativos (`6cf4d7b26`); Recife e Pico na release Python ativa (`d1a14b2ce`) e, desde o C02b (`42a908ffa`), Python e Pro abrem no diálogo do jogo, com autorização própria do desafio. C03a Pega-conchas (`7a95991ea`) e C03b projeto autoral do Farol (`ca1ccf83b`, critérios causais desde `510fc6a79`). Revisão de 31/10 (lote 9): conteúdo refeito na Vila, no Bosque, no Recife e no Pico em Python, no Pico em blocos e no Farol; pedidos dos moradores como enunciado; Vale e Nuvens publicam por decisão da dona (a barreira C01a do serviço continua: só publica com os cursos gravados). Nos JSON locais, 136 de 138 entradas pedem publicação; ficam de fora só as duas corridas noturnas do Bosque | [Inventário](desafios-do-jogo/repertorio-local.md), [regras a completar](desafios-do-jogo/regras-a-completar.json), [plano C01](superpowers/plans/2026-10-30-arquipelago-curriculo-publicacao.md), [corrida do Bosque](qa/2026-10-30-bosque-repertorio/README.md) e [corrida da Vila](qa/2026-10-30-vila-repertorio/README.md) Importação nos ambientes publicados (com a dona) e prova do C02b no navegador com o runtime publicado. Python e Pro pedem o curso-base da linguagem desde `e99575ab2` (no Farol, o da linguagem: `postoDoCursoBase`). Publicação remota não comprovada |
| Minijogos e fliperama | Aprovação, cópia, player e ligação ao Mural implementados | [Fliperama e Mural](qa/2026-10-29-fliperama-mural/README.md) | Conferir ciclo autenticado de desafio, aprovação, atração e abertura nos dois públicos |
| Quarto, abertura e cuidado | Pausa de pet/móveis, leitura manual com voltar e bônus sem reduzir ritmo básico. O pet que acompanha pela ilha (S01, `a40283108`) para inteiro na pausa e o passarinho voa sem balanço com menos movimento (R3, `7d87ca0f8`) | [A03a](qa/2026-10-30-quarto-pausa/README.md), [A03b](qa/2026-10-30-leitura-abertura/README.md), [A03c](qa/2026-10-30-ritmo-basico/README.md); pet: `tests/pet-que-acompanha.test.ts` e `playground/verificar-companhia-browser.ts` (passarinho, provado por mutação) | Qualificação de leitura, toque e acessibilidade com pessoas e dispositivos reais |
| Farol e Íris | Sala, última página, seis fachos e volta da Íris implementados; prioridade da HUD integrada em `16345a590`. Subida por fora (B7a, `6ee28cb35`) ligada ao final em N4 (`c94c34139`): o resultado oferece "Entrar na sala do alto", e a porta segue como a alternativa direta | [A04](qa/2026-10-30-prioridade-farol/README.md), [final](plans/2026-10-29-arquipelago-final-do-farol.md), `playground/verificar-final-farol-browser.ts` com o percurso completo | Aceite hospedado e aparelho físico em Q01 |
| Rede de barcos | Portos, destinos, canais, espera e troca de ilha completa implementados | [Rede de barcos](qa/2026-10-30-rede-barco/README.md) | Integração ampliada e aparelho físico. Portos já existentes não são pedido de arte pendente |
| Fantasma de percurso familiar | Gravação, autorização, serviço, replay e interface integrados pela outra sessão em `ae68922b1` | [Fantasma familiar](qa/2026-10-30-fantasma-familiar/README.md) | [Migração e adoção](operations/arquipelago-fantasmas.md), jornada autenticada. Adulto compara consigo; visita consentida entre adultos continua separada |
| Moradores, aconchego e Lumis | Cuidado, rotinas e consequências no mundo implementados conforme regras | [Regras](arquipelago-regras.md), seções de moradores, construção e Lumis | Não confundir rotinas de Lumi com todo o currículo dos cursos; qualificação integrada em Q01 |
| Insumos e pedidos remunerados | Compras e entregas com revisão, idempotência e carteira implementadas | [Insumos](qa/2026-10-30-insumos/README.md), [operação](operations/arquipelago-insumos.md) | Conferência operacional de API, Members e fluxo autenticado; nenhum crédito remoto foi emitido neste lote |
| Feira, receitas e roupas | Tema semanal e integrações existentes. Roupas da festa só conquistadas na festa (B16, `ecbe7184a`): faixa `festa` no catálogo do Members, sem compra. Festa de fim de ano ativa de 20/12 a 06/01 (`sistemas/festas.ts`, data aprovada em 30/10); Noite das Lanternas de 1 a 12/10 (aprovada em 31/10, com a cocada) | [Vestuário sazonal](superpowers/plans/2026-10-30-arquipelago-vestuario-sazonal.md), [receitas](superpowers/plans/2026-10-30-arquipelago-receitas-sazonais.md) | Sem pendência de data |
| Pele adulta | Tema e voz específicos implementados | [CLAUDE do jogo](../packages/arquipelago/CLAUDE.md), seção Pele adulta | Paridade de conteúdo publicado continua ligada a C01/C03; não chamar toda a versão adulta de pendente |
| Visitas entre amigos (N08a) | Convites controlados pelos responsáveis, leituras restritas e interface implementados. Os três defeitos da revisão (convite novo restaurava acessos revogados, revogação durante a leitura do Members, aceites simultâneos acima de 20) corrigidos em `83a9dfbab` | Suítes locais; [revisão dos lotes recebidos](qa/2026-10-30-revisao-lotes-recebidos/README.md) | Aceite autenticado hospedado em Q01 |
| Visitas adultas consentidas | Convite opaco revogável, casa somente de leitura, isolamento do Kids e confirmação durante a visita implementados | [L12](qa/2026-10-30-visitas-adultas/README.md), banco e HTTP reais locais; navegador com plataforma falsa | Aceite autenticado hospedado em Q01/L14 e implantação da migração 0016, API/gateway/BFF/cliente juntos; não executados |
| Medição e cartão dos pais | Fotografia, mudanças de aparência por data do servidor e aprovações separadas; grupos pequenos protegidos. O cartão dos pais conta as criações do Pinta e do Molda postas no jogo na semana, cada uma uma vez (A33, migração 0024; a tabela guarda só a marca da criação, nunca o id) | [QA A06](qa/2026-10-30-medicao-aparencias/README.md) | Migrações 0015 e 0024 e implantação ordenada ainda locais. Datas de criação e compra não integradas. Aplicar aparência não prova autoria nem aprendizado |
| Coleções da praia | Coleta de cinco conchas, observação da estrela e pesca de cinco espécies ligadas ao álbum e ao inventário | [Plano E01](superpowers/plans/2026-10-30-arquipelago-colecoes-da-praia.md), testes de regras, modelos, espaço do corpo e save cheio | Provas finais e limites em [QA da praia](qa/2026-10-30-colecoes-da-praia/README.md); aceite hospedado e aparelho físico em Q01. Pega-conchas pertence ao conteúdo C03 |
| Coleções do Pico e das Nuvens, iscas | Notas e cristais do Pico, estrelas das Nuvens à noite, no álbum e na mochila; minhoca e pena na pesca, de graça ou na feira | Testes de lugares contra os GLBs, regras e save cheio; `playground/verificar-colecoes-e-iscas-browser.ts` | Aceite hospedado e aparelho físico em Q01 |
| Móveis dos cômodos (V20) | 21 móveis da cozinha, sala e banheiro na ferramenta Móveis do Construir, com abas, peças de parede, tapete por baixo, aconchego e colisão | `tests/moveis.test.ts` (regras e GLBs), `salvamento-v20.test.ts`; `playground/verificar-moveis-browser.ts` | Aceite hospedado e aparelho físico em Q01 |
| Modo livre e galeria do Farol (V20) | Depois do final, todos os projetos azuis chegam e a sala do alto do Farol vira galeria: seis pedestais com aparências do Pinta e do Molda, minijogos aprovados e jogos do Mural, câmera própria da galeria no modo livre | `tests/galeria-do-farol.test.ts` (regras, vagas contra a sala real, câmera, modo livre), `salvamento-v20.test.ts`; `playground/verificar-galeria-farol-browser.ts` (`?jogos=exemplo`) | Aceite hospedado e aparelho físico em Q01 |
| Segredos e mapa detalhado | Três percursos na V19, mapa que se revela andando (`0e7236050`), chaves dos cômodos (`32f155177`), baús no alto do vento, só com o planador (`6238451e1`). Nove segredos com páginas e sete Lumis de luz que só saem dos baús (B8, `0660b62fd`; retroativo: ter o baú é ter o Lumi) | Testes de cada lote, `tests/nada-pago-e-sorteado.test.ts` dos contratos e `playground/verificar-segredos-browser.ts` | Aceite hospedado e aparelho físico em Q01 |
| Construção avançada e Lenda | Quintal grande (`92aea3551`), 21 móveis (V20, `74a0e1d43`), modo livre e galeria do Farol (`20b312aa1`). Obra estendida em documento próprio (migração 0023): iglu, terreno e andar de cima (B7, `9511bac57` e `f2f441cf6`), com a resposta perdida e o Desfazer seguros (C1) e móveis lá em cima só dentro dos cômodos (C3) | `tests/obra-estendida.test.ts`, `tests/andar-de-cima.test.ts`, `playground/verificar-andar-e-terreno-browser.ts` | Objetos com função (geladeira, aquário etc.) ficam no térreo: escopo reduzido por decisão da dona. Aceite hospedado em Q01 |

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
