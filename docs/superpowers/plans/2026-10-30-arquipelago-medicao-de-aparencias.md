# A06: fotografia e mudanças de aparência

## Decisão e limites

A consulta atual classifica a aparência de hoje pela data `ganhoEm` do projeto azul.
Ela permanece disponível como fotografia, com título e explicação junto aos números.
Não mede produção no período. O novo indicador conta mudanças de aparência confirmadas
entre duas revisões do salvamento, pela hora do servidor em São Paulo.

Uma mudança não prova a criação do desenho nem uma compra. Pinta, Molda e criação guardada
são origens declaradas no save; galeria continua conferida pelo serviço de compras existente.
O painel não usa esses registros para avaliar aprendizado nem creditar recompensas.
As datas de criação e compra continuam fontes ausentes nesta medição, explicitamente.

Levantamento: `members/creations` tem datas do documento da ferramenta e `coinEvents` tem
adoções da galeria. Não há nesta porta uma leitura agregada que vincule criação no período
ao uso no Arquipélago. A tabela antiga `arquipelago.compras_da_galeria` não é mais escrita pelo
caminho atual e não tem comunidade; não usá-la como fonte completa de compras. O serviço do
jogo não consulta tabelas privadas do Members diretamente. Uma futura integração de criação
ou aquisição precisa dessa porta e semântica próprias, não de inferência a partir do save.

Sem reconstruir eventos antigos. O primeiro save recebido estabelece a base, inclusive
quando importado de um aparelho. Só uma gravação posterior aceita registra aplicações
novas ou trocas. Retirar uma aparência não conta como aplicação. Voltar a uma aparência
anterior conta como outra aplicação, nunca como outra criação. Revisão repetida, conflito,
suporte somente leitura e transação desfeita não produzem eventos.

Tabela própria, sem mudar o salvamento V18. Chave jogador/revisão/objeto, data do servidor,
público e origem. Não guardar o ID da criação, conteúdo, nome ou imagem. FK com exclusão
em cascata do save. Índice público/data para agregar sem percorrer o JSON. A proteção de
grupos menores que cinco permanece, sem total que revele grupos suprimidos.

## Implantação, sem executar envio

Migração gerada pelo Drizzle, só aditiva, sem backfill ou atualização de saves. Aplicar a
migração antes da API. Atualizar primeiro o Admin com o contrato opcional: ele aceita a API
antiga; o Admin antigo usa schema estrito e não aceita o novo campo. Não prometer implantação
em qualquer ordem. Em rollback, voltar API antes de Admin e conservar a tabela para preservar
o histórico. Apenas a próxima implantação inicia a coleta. Nenhuma data de início fictícia.

## Etapas

- [x] Regra pura e provas de mudança, origem, remoção, base antiga e repetição.
- [x] Tabela gerada, gravação atômica com CAS, leitura agregada por data própria.
- [x] Contrato opcional e painel com fotografia e eventos separados.
- [x] Postgres local: concorrência, conflito, rollback, exclusão, públicos e meia-noite.
- [x] Navegador com serviço e componente reais, computador e celular emulado.
- [x] Suítes, tipagem, Biome, revisão e documentação. QA em
  `docs/qa/2026-10-30-medicao-aparencias/README.md`: API 263, contratos 201, Admin 971 aprovados.
- [ ] Commit e merge local, sem push.

## Pedidos de arte

Nenhum. O lote não altera arte, formato de save, carteira ou progressão.
