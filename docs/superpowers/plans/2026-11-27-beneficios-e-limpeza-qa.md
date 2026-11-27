# Benefícios do curso e limpeza de QA

Objetivo: melhorar a leitura da aba Benefícios e retirar os dados sintéticos que confundem as métricas de produção.

Direção visual: manter os componentes, as cores e a tipografia do Admin. Aplicar 16 px de padding no celular e 24 px em telas maiores, separar filtros e resultados e dar destaque ao total de resgates. Usar textos curtos, sem travessão. Preservar as duas origens, o período, a paginação e a exportação existentes.

1. Conferir os cartões reais e reproduzir a falta de espaçamento no navegador com dados locais simulados. Corrigir o componente e conferir os estados com dados, vazio, erro e carregamento em larguras de celular e desktop.
2. Inventariar produção em transação somente leitura. Confirmar os e-mails sintéticos dos dois resgates e suas dependências. Conferir a exclusão dos três cursos de QA feita pela responsável durante a execução. Preservar os cursos reais cujo assunto é teste de regras.
3. Guardar backup privado dos alvos e registrar os hashes. Excluir apenas os IDs confirmados, com proteção de papéis administrativos, dados financeiros reais e dependências. Conferir que as métricas e a consulta do benefício voltaram a mostrar apenas dados reais.
4. Retirar o travessão do nome do benefício e dos textos alterados. Documentar que toda validação futura deve usar dados locais ou descartáveis e terminar com limpeza verificada, sem deixar cadastros de teste nas métricas.
5. Executar as verificações pertinentes, commitar a correção, integrar à staging local e publicar seletivamente o Admin em produção. Acompanhar CI, merge e publicação oficial, preservando a responsabilidade da outra frente pela publicação de staging.

Nenhuma conta, compra ou curso será apagado apenas por conter uma palavra parecida com teste. A exclusão usa uma lista explícita de IDs com evidência de QA.
