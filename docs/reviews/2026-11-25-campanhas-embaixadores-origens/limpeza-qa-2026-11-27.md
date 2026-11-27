# Benefícios do Guia e limpeza dos dados de QA

Em 27/11/2026, a responsável pediu a correção do espaçamento da aba Benefícios e a exclusão dos dados de teste que estavam sendo contados como resgates reais.

## Dados conferidos em produção

Os dois resgates do benefício do Guia eram sintéticos. Os e-mails terminavam no domínio reservado `qa.sistemazero.invalid`. Eles e as duas aquisições correspondentes foram excluídos fisicamente. O relatório real do serviço passou a retornar zero resgates e zero pessoas, sem filtro para esconder QA.

A responsável excluiu os três cursos arquivados de QA durante a execução. A conferência confirmou a ausência deles. Os dois cursos reais chamados “Testes de regras”, pertencentes à Jornada, foram preservados.

Também foram excluídas duas contas sintéticas ainda existentes, seus acessos, certificados e progresso, cinco cadastros do funil, três checkouts, mensagens e eventos de teste identificados. Dois rascunhos antigos de pagamentos Pix de QA estavam expirados desde 17/11/2026. Uma consulta somente leitura à Efí confirmou que não receberam Pix antes da exclusão dos registros locais. Nenhum pagamento real foi apagado e nenhuma cobrança ou mensagem nova foi criada para validar a correção.

O benefício passou a se chamar “Cadê Todo Mundo”, sem travessão. A disponibilidade do presente e o prazo de acesso do Cadê continuam iguais. Os recibos de 26/11 registram a preservação dos dois resgates na conversão original. Esta limpeza posterior, autorizada pela responsável, explica por que o total atual é zero.

Backups privados foram guardados fora do Git. O recibo público registra os hashes, as contagens removidas e as verificações, sem e-mails nem dados pessoais. A primeira tentativa de exclusão foi revertida integralmente por um nome de coluna incorreto; uma consulta confirmou que os registros ainda existiam antes da execução corrigida. Na exclusão das contas, uma resposta de sucesso sem JSON interrompeu o operador após a primeira purga; a recuperação conferiu essa conta por leitura e continuou a partir da segunda, sem repetir a operação já concluída.

## Aparência e linguagem

A correção usa os componentes do Admin, com 16 px de padding em telas pequenas e 24 px nas maiores. Filtros, total, status, ações e tabela têm áreas separadas. A tabela rola dentro do cartão no celular. Carregamento, erro e ausência de dados recebem o mesmo cuidado visual.

Os textos são curtos e sem travessão. O total diferencia resgate de resgates. As duas origens, o filtro por datas, a paginação de 25 pessoas e a exportação da página atual foram preservados.

O teste de navegador reproduziu o recuo de 1 px da versão anterior, incluindo a borda, e passou com 17 px no celular e 25 px no desktop após a correção. Também passaram os cenários com dados, sem resgates, sem benefício, erro e carregamento, nas larguras de 320, 390, 768 e 1440 px. Todos os dados desse teste ficaram no navegador e no servidor local.

Validação local: 1.039 testes do Admin, zero falhas, checagem de tipos, build e Biome aprovados. A checagem de tipos precisou de 8 GB de heap no processo local; a primeira tentativa com 4 GB esgotou memória. Uma primeira preparação da publicação parou por ausência do SDK de infraestrutura na cópia isolada, antes de criar qualquer deployment. O SDK foi instalado pelo lockfile próprio de `.railway`, seguindo o workflow do projeto.

## Publicação

A fonte seletiva está no [PR 297](https://github.com/informach/sistema-zero/pull/297), commit `6f28e4a39f4429190a8e3e2f4e8931f34a0abb50`. Apenas o Admin é selecionado para publicação. O commit foi integrado à staging local como `222760d56`. A publicação remota da staging continua sob responsabilidade da outra frente.

O ajuste visual está publicado e conferido em produção. O CI completo, o merge protegido e a publicação oficial do PR 297 terminaram. [Recibo desta entrega](limpeza-qa-2026-11-27.json).

## Regra para novas validações

Preferir dados locais e bancos descartáveis. Quando um teste remoto for necessário e autorizado, registrar os IDs e concluir com a exclusão dos dados sintéticos e de suas dependências, seguida de uma consulta que confirme a limpeza. Arquivar cursos ou bloquear contas não remove resgates das métricas. A validação não termina enquanto houver registros de teste aparecendo como resultados reais.
