# L5 — Copy, comparação e colaboração editorial

Estado: implementação editorial e revisão funcional concluídas nesta etapa. Segue L6A. A integração com edições aprovadas e publicação será conferida em L7; piloto com duas máquinas e limites de operação continuam em L9.

## Implementado e exercitado

- Propostas tipadas de ajuste/alternativas/adaptação. Codex recebe schema específico por intenção; Claude recebe JSON Schema draft 7. Ambas as assinaturas produziram uma proposta real válida, armazenada em `.cache/proof/{codex,claude}-editorial.json`.
- Resultado e aplicação de ajuste/adaptação compartilham transação PostgreSQL. Alternativas esperam escolha. A base congelada inclui briefing, ancestrais, fontes, direção e seleção; mudança concorrente retorna conflito com a proposta preservada.
- Texto protegido e termos da direção são conferidos no servidor. Ajuste de copy só muda campos textuais permitidos; mantém assets e relações. Adaptação cria nova representação e componentes, com revisões de origem e reaproveitamento de assets.
- Desfazer gera novas revisões, confere a base aplicada e não apaga história. A derivação de formato é arquivada em conjunto ao desfazer.
- Prova Electron real sobre P01: assinatura ChatGPT Pro, proposta aplicada no servidor e desfeita. Run `d8b7eb33-a1d6-4201-8f41-2175f3311583`; arquivo `.cache/connected-proof/resumed.json` no momento da prova. O acervo utilizado é a amostra descartável.
- Escopo componente/formato/peça, componentes preservados, comparação de propostas, comentários ligados à revisão e restauração por nova operação.
- Resolução de conflitos locais compara versão da equipe e rascunho. IndexedDB/SQLite guardam a resolução e eventual substituição atomicamente, conservando o pedido anterior. SQLite versão 5; tabela aditiva `resolved_drafts`.
- Histórico de pedidos filtrado por componente com paginação por cursor de execução e ordenação de data/ID; teste com 22 pedidos na mesma data/microssegundo não perde itens.
- Regras Light Copy extraídas para fonte compartilhada entre domínio, web e desktop. Citações são sinalizadas para conferir atribuição; regras de estilo não autorizam alterar falas reais.
- Migração Drizzle aditiva `0009_editorial_applications.sql` adiciona aplicação à execução; aplicada no banco de revisão pelos testes.

## Verificação

- 17 testes PostgreSQL de execução passaram (52 assertions), incluindo ajuste/replay/undo, escolha concorrente, briefing alterado, texto protegido, adaptação, paginação, duas pessoas em slides distintos e passagem de tarefa. A suíte workspace também passou com 9 testes.
- 12 testes da bancada passaram (36 assertions), incluindo resolução com preservação do pedido anterior e recuperação de pedido inválido sem descarte quando falta espaço.
- 9 testes Node/SQLite passaram, incluindo rollback da resolução inválida e reinício com uma substituição única.
- 19 testes Bun do desktop passaram; o teste adicional da ponte de consulta de equipe passou separadamente junto dos outros três testes de transporte (16 assertions). Typechecks de backend, bancada e desktop passaram após as alterações finais. Auth/gateway passaram após o diretório; a ampliação literal da busca por nome completo ainda entra na revisão final de auth.
- Builds de produção Next e Electron passaram. A bancada foi inspecionada na captura `.cache/connected-proof/workbench.png`; nenhum erro foi ocultado para obter o build. Avisos de `use client` no bundle CSR e tamanho do chunk de prova Remotion permanecem registrados.
- Prova Electron integrada com contas oficiais e retorno ao PostgreSQL: P01/Codex `c2d1d384-2d40-4009-8846-48dc45228df3`, P07/Codex `26796ddd-7952-4cb4-8353-1d060f8d7f18`, P34/Claude `8cfe7adc-1501-4e89-8d40-40fef5f3fe8f`. Todas aplicaram e desfizeram. Artefato `.cache/connected-proof/editorial-quality.json` preserva antes/proposta; `resumed.json` registra isolamento, identidade, cache e diretório canônico.
- Revisão de qualidade das amostras: P01 mudou apenas o plural de jogos; P07 explicitou o sujeito e conservou a fala; P34 preservou a citação e explicitou aluno/pai Daniel, informações conferidas na ficha. As alterações foram desfeitas; nenhuma virou aprovação ou publicação.

## Ajustes feitos durante a revisão

- Adaptação não pode omitir a origem de um componente para remover citação/termo protegido; exclusões também conservam o texto na representação derivada. Teste demonstra recusa sem alterar o rascunho.
- Comparação mostra texto anterior/proposto e rótulos compreensíveis. Restauração de conteúdo conserva as relações atuais do grafo; desfazer adaptação é operação estrutural separada.
- Rascunhos resolvidos estão acessíveis na bancada; recuperação cria nova revisão com CAS. Pedidos inválidos são preservados antes de reiniciar, com consulta ao conteúdo recuperado.
- Lote de até dez peças com seleção/exclusão, identidades persistidas antes do envio, execução sequencial, propostas independentes e escolha por peça. Encerrar o lote cancela pedidos que ainda aguardam e guarda seu registro local; histórico canônico permanece no servidor. Validação operacional completa deste fluxo de lote continua no piloto integrado.
- Diretório consultado em auth pelo gateway HMAC, restrito ao consumer marketing, sem FK entre schemas. Concessão exige conta staff+ ativa; consulta e gestão exigem acesso ao projeto. Nome do autor aparece em histórico/comentários; comentários de revisões anteriores são consultáveis no histórico.
- Pedido pode indicar pessoa responsável; só ela reivindica/renova/confirma a tentativa, usando sua própria assinatura. O criador e o administrador mantêm o cancelamento. Nenhuma inferência é disparada ao encaminhar o pedido.

## Integração ainda aberta antes da liberação

- Edições aprovadas/agendadas/publicadas e novo rascunho sem alterar a edição fixa: L7.
- Piloto de revisão em lote, interface de conflitos/comentários e duas pessoas em computadores distintos: L9. A prova nesta máquina não equivale a duas máquinas físicas.
- Limites anteriores: sessão web concorrente, paginação de revisões/snapshot, cancelamento imediato do executor, R2 real, distribuição, login desconectado e atualização.

Sem commit/merge nesta etapa; continuar os lotes autorizados e a revisão final.
