# Estado atual do Arquipélago Vagalume

Leitura local de 30/10/2026, base de conciliação `11002f9ff` e lote de visitas adultas. Este índice separa implementação de entrega
operacional. A [auditoria](../.audits/architectural-analysis-2026-10-30-arquipelago.md) registra
os achados na base anterior; o [programa de ajustes](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md)
registra cada commit e merge posterior. Os checkpoints dos planos antigos são históricos.

## Fontes vigentes

| Regra | Valor nesta base | Fonte de autoridade |
| --- | --- | --- |
| Salvamento | V18; aceita e migra versões anteriores | `VERSAO_SALVAMENTO` e `SalvamentoSchema`, [salvamento.ts](../packages/arquipelago-contracts/src/salvamento.ts) |
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
| Quadros e desafios do dia | C01a confere fontes dos requisitos derivados pelo Members. C01b1 inventaria 54 atividades em dois públicos, sem publicação automática. C01b2a/b retiram dependências opcionais dos quadros do Bosque e da Vila. C01c compara regras alteradas e recusa desconhecidos; C01d corrige IDs; C01e impede retirar derivados manualmente; C01e2 reanalisa a publicação exata antes de reativar | [Inventário](desafios-do-jogo/repertorio-local.md), [regras a completar](desafios-do-jogo/regras-a-completar.json), [plano C01](superpowers/plans/2026-10-30-arquipelago-curriculo-publicacao.md), [corrida do Bosque](qa/2026-10-30-bosque-repertorio/README.md) e [corrida da Vila](qa/2026-10-30-vila-repertorio/README.md) | Dependências opcionais dos outros pacotes, fontes reais e aplicações Inventor, Faísca, Python/texto/Pro e autoria após Farol. Publicação remota não comprovada |
| Minijogos e fliperama | Aprovação, cópia, player e ligação ao Mural implementados | [Fliperama e Mural](qa/2026-10-29-fliperama-mural/README.md) | Conferir ciclo autenticado de desafio, aprovação, atração e abertura nos dois públicos |
| Quarto, abertura e cuidado | Pausa de pet/móveis, leitura manual com voltar e bônus sem reduzir ritmo básico | [A03a](qa/2026-10-30-quarto-pausa/README.md), [A03b](qa/2026-10-30-leitura-abertura/README.md), [A03c](qa/2026-10-30-ritmo-basico/README.md) | Qualificação de leitura, toque e acessibilidade com pessoas e dispositivos reais |
| Farol e Íris | Sala, última página, seis fachos e volta da Íris implementados; prioridade da HUD integrada em `16345a590` | [A04](qa/2026-10-30-prioridade-farol/README.md) e [final](plans/2026-10-29-arquipelago-final-do-farol.md) | Subida como aventura e continuidade autoral/exposição continuam em E04/C03; a cena final não entrega esses sistemas |
| Rede de barcos | Portos, destinos, canais, espera e troca de ilha completa implementados | [Rede de barcos](qa/2026-10-30-rede-barco/README.md) | Integração ampliada e aparelho físico. Portos já existentes não são pedido de arte pendente |
| Fantasma de percurso familiar | Gravação, autorização, serviço, replay e interface integrados pela outra sessão em `ae68922b1` | [Fantasma familiar](qa/2026-10-30-fantasma-familiar/README.md) | [Migração e adoção](operations/arquipelago-fantasmas.md), jornada autenticada. Adulto compara consigo; visita consentida entre adultos continua separada |
| Moradores, aconchego e Lumis | Cuidado, rotinas e consequências no mundo implementados conforme regras | [Regras](arquipelago-regras.md), seções de moradores, construção e Lumis | Não confundir rotinas de Lumi com todo o currículo dos cursos; qualificação integrada em Q01 |
| Insumos e pedidos remunerados | Compras e entregas com revisão, idempotência e carteira implementadas | [Insumos](qa/2026-10-30-insumos/README.md), [operação](operations/arquipelago-insumos.md) | Conferência operacional de API, Members e fluxo autenticado; nenhum crédito remoto foi emitido neste lote |
| Feira, receitas e roupas | Tema semanal e integrações existentes; calendário não equivale a datas aprovadas | [Vestuário sazonal](superpowers/plans/2026-10-30-arquipelago-vestuario-sazonal.md), [receitas](superpowers/plans/2026-10-30-arquipelago-receitas-sazonais.md) | Noite das Lanternas e janela de fim de ano dependem de datas aprovadas; permanecer desativadas até lá |
| Pele adulta | Tema e voz específicos implementados | [CLAUDE do jogo](../packages/arquipelago/CLAUDE.md), seção Pele adulta | Paridade de conteúdo publicado continua ligada a C01/C03; não chamar toda a versão adulta de pendente |
| Visitas adultas consentidas | Convite opaco revogável, casa somente de leitura, isolamento do Kids e confirmação durante a visita implementados | [L12](qa/2026-10-30-visitas-adultas/README.md), banco e HTTP reais locais; navegador com plataforma falsa | Aceite autenticado hospedado em Q01/L14 e implantação da migração 0016, API/gateway/BFF/cliente juntos; não executados |
| Medição | Fotografia, mudanças de aparência por data do servidor e aprovações separadas; grupos pequenos protegidos | [QA A06](qa/2026-10-30-medicao-aparencias/README.md) | Migração 0015 e implantação ordenada ainda locais. Datas de criação e compra não integradas. Aplicar aparência não prova autoria nem aprendizado |
| Coleções da praia | Coleta de cinco conchas, observação da estrela e pesca de cinco espécies ligadas ao álbum e ao inventário | [Plano E01](superpowers/plans/2026-10-30-arquipelago-colecoes-da-praia.md), testes de regras, modelos, espaço do corpo e save cheio | Provas finais e limites em [QA da praia](qa/2026-10-30-colecoes-da-praia/README.md); aceite hospedado e aparelho físico em Q01. Pega-conchas pertence ao conteúdo C03 |
| Segredos e mapa detalhado | Exploração existente não prova todas as conexões previstas | [Lacunas da auditoria](../.audits/architectural-analysis-2026-10-30-arquipelago.md), lote E02 | Completar a matriz de segredos e habilidades anteriores; pedidos de arte somente após conferir o inventário |
| Construção avançada e Lenda | Construção atual e final existem; não equivalem a segundo andar, terraformação e exposição | [Programa E04](plans/2026-10-30-arquipelago-ajustes-da-auditoria.md) | Planos próprios com orçamento, colisão, desfazer e retomada antes de implementar |

## Relatórios gerados e revisão

O achado A9 foi tratado por outra sessão em `f72f3cce7`, integrado em `8c89b2565`.
Os geradores escrevem os relatórios de arte no formato do Biome. Nesta base, os nove
`relatorio.json` existentes em `arte/` passaram em `bunx biome check`, sem edição nem
regeneração. Não excluir a pasta inteira do lint para esconder um relatório fora do padrão.

## Como atualizar este índice

Ao fechar um lote, atualizar a linha correspondente com o commit e a prova. Se houver
publicação, registrar separadamente ambiente, revisão e aceite observado. Não promover uma
marca `publicado` no manifesto a prova de importação, nem um print em SwiftShader a teste de
desempenho físico. Decisões abertas continuam explícitas; checkpoints antigos não são apagados.
