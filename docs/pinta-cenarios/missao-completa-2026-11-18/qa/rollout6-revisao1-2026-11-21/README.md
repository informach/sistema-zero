# Revisão do primeiro lote — gravador 6

Revisão sobre `a486bbdbd`, antes do próximo lote da missão.

## Achados e correções

1. O teste HTTP conferia a chave do download, mas não todo o resumo público.
   A comparação agora exige chave, revisão e resumo confirmado, incluindo a
   versão de formato que o cliente usa para decidir se pode ler/gravar.
2. A exclusão SQL contra reserva pendente ainda só tinha o exemplo de formato
   2. O mesmo ensaio agora cobre formato 6 e capacidades 4/5, verifica que a
   recusa não altera o registro e conserva o teste histórico de formato 2.
3. O segundo banco descartável usa tmpfs explícito para seus dados. A remoção
   do contêiner encerra também esse armazenamento temporário.

Passaram novamente os 55 casos HTTP (565 asserções) e 17 casos PostgreSQL
reais (160 asserções), sem skips. O contêiner próprio foi removido. Nenhuma
fonte funcional ou arquivo do Molda mudou nesta revisão.

## Preparação autenticada

O navegador foi reaberto com seu perfil privado existente, sem nova captura
de credenciais. As mutações HTTP do Pinta são restritas aos oito IDs QA já
identificados; nenhuma gravação sobre outro desenho é permitida pelo ensaio.
Os seis hashes autorais da Vila/Floresta/Cabana coincidem com o checkpoint
de 21/11, inclusive a Cabana editada. A aba autenticada com a Vila aberta
permanece carregada e com rede suspensa, para conservar o leitor anterior.
Foram guardados os hashes dos 26 scripts públicos carregados, não suas cookies.

O preflight oficial de staging passou para a fonte a486bbdbd. Esse modo não
solicitou deploy. A CI 44898386515 continuava em andamento na consulta.
Esses resultados ainda não comprovam produtor B6, upload ao R2 ou rollback
dos serviços: a etapa 0 continua aberta até os ensaios operacionais.
