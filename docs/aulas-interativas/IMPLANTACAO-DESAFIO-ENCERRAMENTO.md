# Implantação da aula final do Desafio

Esta mudança prepara o redesenho em código e arquivos de autoria. Ela não altera o curso publicado por si só. A aula nova reúne o certificado e o pitch da Comunidade dos Criadores no módulo 3.

## Preparação em staging

1. Implantar primeiro o progresso por seção para aulas com certificado. Na aula nova, emitir o certificado conclui apenas a primeira seção.
2. Aplicar a migração `0094_medical_wrecking_crew.sql` do `members` e implantar a escolha de ilustração por módulo.
3. Abrir a aula de certificado do Desafio no admin e confirmar o slug `certificado`. Se a aula não existir em staging, criá-la no módulo 3 com esse slug e um bloco **Certificado** antes de executar o script, que exige as sete aulas para reorganizar com segurança.
4. Executar `bun run desafio:reorganize --target staging` no pacote `members` com `DATABASE_URL` de staging. O dry-run mostra o ID do curso, a identidade do banco (`database`), os movimentos, as exclusões opcionais, os títulos, os resumos, as artes e quantas conclusões antigas seriam removidas. Conferir o relatório e o destino da conexão; então executar `bun run desafio:reorganize --target staging --apply --expect-course-id <id-do-dry-run> --expect-database <database-do-dry-run>`. O script só aceita o curso `desafio-primeiro-jogo` e para diante de aulas não reconhecidas. Em staging, onde Caderno do Aluno e Mapa dos Pais já foram apagados, essas duas exclusões são ignoradas.
   Conferir também no admin a descrição curta e a descrição do curso conforme `modulos-desafio-primeiro-jogo.md`. O script atualiza os resumos dos módulos, mas não esses dois campos do curso.
5. Conferir a configuração atual do bloco: imagem base, frase do curso, texto, cor e assinaturas. A arte preparada está em `docs/design/zappy-vagalume/para-upload-admin/prontos/certificado-desafio-primeiro-jogo-base.png`. A importação deve preservar o ID e os campos configurados; conferir a prévia antes de aplicar.
6. Importar `aulas/desafio-certificado.manifesto.json`. Conferir a ordem das duas seções e o vínculo do certificado. Revisar blocos antigos que a prévia preservar no fim da aula para não duplicar o pitch.
7. Gravar `video-pitch` seguindo `aulas/desafio-certificado.roteiro.md`, subir ao Vimeo pelo admin e vincular o vídeo planejado. Confirmar que o link da oferta aponta para a página pública atual.
8. Publicar a aula final no fim do módulo 3. O script remove a antiga aula “Continue criando” se ela existir. Não deixar duas aulas de pitch na trilha.

## Ensaio de ponta a ponta

Usar um perfil novo com acesso ao Desafio. Antes de concluir o Dia 5, o certificado permanece bloqueado. Depois do Dia 5, emitir o certificado e conferir o PDF, inclusive nome longo, assinaturas e QR. A segunda seção deve liberar nesse momento, enquanto a aula e o curso seguem incompletos. Assistir a 89% do vídeo: **Concluir aula** segue bloqueado. Chegar a 90%: a seção termina e o botão libera. Clicar nele conclui a aula e leva o curso a 100%. Abrir a oferta ou assinar não participa dessa checagem.

Repetir a abertura da aula com um perfil que já tinha certificado emitido antes da mudança. O certificado existente deve continuar disponível. Se a aula já estiver marcada como concluída no histórico, o progresso antigo permanece concluído; a regra nova vale para quem ainda não terminou a aula.

## Produção

Aplicar o mesmo procedimento somente depois de conferir em staging o PDF e o percurso completo. Fazer um dry-run próprio com `--target production` e usar o ID e a identidade do banco mostrados por ele na aplicação; o script também aceita um quarto módulo antigo contendo apenas certificado e “Continue criando”, movendo o certificado e removendo esse módulo vazio. Conferir antes os slugs e a posição das aulas existentes em produção. Registrar a configuração do bloco de certificado para comparar a prévia da importação e preservar a arte e as assinaturas.
