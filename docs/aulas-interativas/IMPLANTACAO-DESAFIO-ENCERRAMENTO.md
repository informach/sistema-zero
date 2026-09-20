# Implantação da aula final do Desafio

Esta mudança prepara o redesenho em código e arquivos de autoria. Ela não altera o curso publicado por si só. A aula nova reúne o certificado e o pitch da Comunidade dos Criadores no módulo 3.

## Preparação em staging

1. Implantar primeiro o progresso por seção para aulas com certificado. Na aula nova, emitir o certificado conclui apenas a primeira seção.
2. Abrir a aula de certificado do Desafio no admin e confirmar o slug `certificado`. Se a aula não existir em staging, criá-la no módulo 3 com esse slug e um bloco **Certificado**.
3. Conferir a configuração atual do bloco: imagem base, frase do curso, texto, cor e assinaturas. A arte preparada está em `docs/design/zappy-vagalume/para-upload-admin/prontos/certificado-desafio-primeiro-jogo-base.png`. A importação deve preservar o ID e os campos configurados; conferir a prévia antes de aplicar.
4. Importar `aulas/desafio-certificado.manifesto.json`. Conferir a ordem das duas seções e o vínculo do certificado. Revisar blocos antigos que a prévia preservar no fim da aula para não duplicar o pitch.
5. Gravar `video-pitch` seguindo `aulas/desafio-certificado.roteiro.md`, subir ao Vimeo pelo admin e vincular o vídeo planejado. Confirmar que o link da oferta aponta para a página pública atual.
6. Publicar a aula final no fim do módulo 3. Depois de validar o novo percurso, despublicar a antiga aula separada de próximos passos, se ela também existir em staging. Não deixar duas aulas de pitch na trilha.

## Ensaio de ponta a ponta

Usar um perfil novo com acesso ao Desafio. Antes de concluir o Dia 5, o certificado permanece bloqueado. Depois do Dia 5, emitir o certificado e conferir o PDF, inclusive nome longo, assinaturas e QR. A segunda seção deve liberar nesse momento, enquanto a aula e o curso seguem incompletos. Assistir a 89% do vídeo: **Concluir aula** segue bloqueado. Chegar a 90%: a seção termina e o botão libera. Clicar nele conclui a aula e leva o curso a 100%. Abrir a oferta ou assinar não participa dessa checagem.

Repetir a abertura da aula com um perfil que já tinha certificado emitido antes da mudança. O certificado existente deve continuar disponível. Se a aula já estiver marcada como concluída no histórico, o progresso antigo permanece concluído; a regra nova vale para quem ainda não terminou a aula.

## Produção

Aplicar o mesmo procedimento somente depois de conferir em staging o PDF e o percurso completo. Conferir antes os slugs e a posição das aulas existentes em produção. Registrar a configuração do bloco de certificado para comparar a prévia da importação e preservar a arte e as assinaturas.
