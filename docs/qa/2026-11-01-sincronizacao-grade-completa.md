# Grade completa e fontes do Zappy

Verificação local do sincronizador Kids para adulto. Não houve aplicação desta mudança em bancos de staging ou produção.

## Comportamento

O destino ausente é criado na mesma transação das publicações. O existente mantém sua identidade. A grade ativa da origem substitui a adulta: aulas e módulos excedentes são arquivados, com os blocos das aulas, sem remover registros de progresso, conclusões ou entregas. Se a aula voltar, seu ID pode ser recuperado pelo mapa ou slug. Contagens da grade ativa excluem aulas retiradas; a linha do tempo histórica continua consultável.

A troca exige as fontes atuais do Zappy para vídeos, diálogos, texto e PDFs marcados. Confere referências, revisão, estado e trechos reais. Um cabeçalho marcado como pronto sem trechos não basta. A verificação é somente leitura; a aplicação pode reparar um índice sem republicar o conteúdo. A grade e os índices antigos são substituídos na mesma transação, com rollback integral em qualquer falha.

## Evidências

- Postgres 17 local descartável, banco `sistemazero_course_sync_test`, com as migrations reais até 0145. O teste recusa URLs remotas ou outro nome de banco.
- Teste causal inicial recusou a grade excedente como no comportamento antigo. Após a implementação, passaram retirada, restauração do mesmo ID, progresso de vídeo preservado, conclusões preservadas, contagens atuais e reordenação sem conflito com posições históricas.
- Uma publicação posterior inválida desfaz inclusive o arquivamento já realizado na transação.
- Remover somente os trechos do índice, mantendo o cabeçalho pronto, reproduziu uma falsa aprovação. Após a correção, a verificação recusa e a aplicação repara sem republicar o curso.
- Suíte Members de unidades, integração HTTP e banco do sincronizador: **2.115 passaram, 2 pulados, 0 falhas**, em 264 arquivos. As duas verificações puladas exigem condições específicas de Linux e do executor Python. Uma primeira chamada sem diretório de trabalho explícito também descobriu cópias históricas em `output`; repetida no pacote, ficou limitada às fontes reais. Os 11 erros dessa primeira chamada eram de resolução de módulos nessas cópias, não foram ignorados na contagem aprovada.
- Após o ajuste adicional dos trechos: **41 passaram, 0 falhas, 142 asserções**, incluindo o sincronizador SQL, planejador, ordenação, empacotamento operacional, voz e tema. Não somar as contagens das duas execuções, pois há sobreposição.
- Typecheck completo Members aprovado; lint do pacote aprovado com avisos preexistentes em outras frentes. Biome dos arquivos alterados e `git diff --check` conferidos.

## Migração e implantação

`0145_archive-course-curriculum.sql` acrescenta somente `archived_at` nullable em `members.modules` e `members.lessons`. Sem backfill, exclusão ou mudança de dados ao migrar. A aplicação antiga tolera as colunas novas; a aplicação nova depende delas. Aplicar a migration antes de executar o operador novo. Para recuar a aplicação, manter as colunas: removê-las descartaria a marca do histórico.

O fluxo web durável de promoção entre ambientes e sua preparação automática de mídia ainda estão no plano `docs/superpowers/plans/2026-11-01-publicacao-unica-de-cursos.md`. Esta evidência não é uma homologação desse fluxo nem de um deploy.
