# Vídeo e materiais como critérios conjuntos de avanço

## Decisão de produto

A professora pode exigir 90% do vídeo e o download de arquivos específicos de um bloco de materiais da mesma seção. Os critérios selecionados são cumulativos. Arquivos não marcados continuam opcionais. Selecionar um bloco de materiais sem indicar ao menos um arquivo obrigatório não é publicável.

O aluno vê o botão explícito de download e quais arquivos são necessários para avançar. O servidor só registra a tentativa quando a rota autenticada preparou uma resposta de arquivo válida, inclusive a marca d'água quando exigida. Um clique que falhou não satisfaz o critério. A plataforma confirma o início da entrega, não se o sistema operacional gravou o arquivo.

## Contrato e fluxo

`SectionCompletion.blockIds` mantém a combinação AND. Para um bloco `materials` selecionado, `materialItems` relaciona o ID do bloco aos IDs estáveis dos itens `file` exigidos. A publicação valida associação à seção, existência dos itens, anexos associados, duplicação e limites. O vídeo deixa de exigir seção exclusiva.

O botão de cada arquivo envia o ID do bloco e do item à rota de download. Depois da autorização, da leitura do R2 e da preparação da marca d'água, o BFF chama uma rota HMAC exclusiva do `member-shell` no members. O BFF inclui a revisão esperada do bloco e o hash da referência do arquivo que acabou de preparar. O members revalida matrícula, perfil, aula publicada, bloco/item/anexo, revisão, referência e seção acessível antes de registrar de modo idempotente o ID do item em `lesson_block_progress.answers`, associado à revisão do bloco. Uma falha nesse registro de arquivo obrigatório impede responder com o arquivo, para não criar um download que não possa liberar a seção. Um arquivo não obrigatório não exige gravação.

O avaliador de conclusão lê o progresso do vídeo e os IDs registrados do bloco de materiais. Quando ambos foram selecionados, a seção só avança com os dois satisfeitos. O player atualiza o progresso depois de um download confirmado e não marca como concluído um arquivo que apenas abriu uma aba externa sem confirmação.

## Verificação

Testar autoria válida e inválida, combinação AND, arquivos opcionais, revisão, repetição/idempotência, outro perfil, seção bloqueada, erro de marca d'água e a interface Kids/Adulto. Fazer revisão após cada lote e full review antes de integrar somente à `staging` local. Não fazer push nem deploy nesta etapa.

Na publicação futura, Gateway, Community e Community Kids precisam compartilhar o `MEMBER_SHELL_HMAC_SECRET` já exigido pelo shell. Não há migração de banco: a evidência usa o campo JSONB de progresso existente. Verificar as três configurações antes do deploy.
