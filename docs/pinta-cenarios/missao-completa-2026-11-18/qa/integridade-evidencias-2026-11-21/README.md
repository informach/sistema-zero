# Integridade dos arquivos de evidência

A revisão dos treze manifestos de evidências encontrou 25 logs presentes no
disco e conferidos pelos hashes, mas ausentes do Git por sua regra geral de
ignorar logs. São 19 do leitor 48a8 e seis dos testes HTTP locais de timeout
de publicação. Os ensaios e seus resultados permanecem históricos; não foram
reexecutados nem atribuídos à fonte atual.

Os bytes originais foram recuperados e comparados aos manifestos existentes,
sem qualquer atualização dos hashes para acomodar diferenças. Atributos locais
preservam o fim de linha dos logs. Também foi conferido o conteúdo do índice
de Git, para que outro checkout receba exatamente as mesmas evidências.

Não houve mudança em código, autenticação, runtime ou ambiente publicado.
O resultado de cada teste continua vinculado à fonte e ao escopo de seu relatório.
