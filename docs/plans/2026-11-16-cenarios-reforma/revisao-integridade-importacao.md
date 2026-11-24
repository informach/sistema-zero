# Revisão de integridade e importação real

Continuação dos lotes 1/2, sobre `413359d31`, na branch `staging`. Este recorte fecha a implementação da conferência de uploads e acrescenta um ensaio com FBX binário original. Não fecha os lotes completos nem substitui sua validação remota.

## Contrato de arquivos

O envio continua direto do navegador ao bucket UGC. A assinatura agora exige criação única (`If-None-Match: *`), além do tamanho e MIME. Uma URL ainda válida não pode substituir conteúdo já existente. O cliente aceita 412 somente quando o servidor pediu criação única; o registro posterior confere o conteúdo efetivamente guardado.

Antes de ler o armazenamento, o BFF confere que o espaço pertence à sessão. Depois lê até dois arquivos simultaneamente, calcula SHA-256 incremental e confere o tamanho real. Para modelos, mantém somente o prefixo JSON limitado a 8 MB e o cabeçalho BIN; não materializa o corpo binário inteiro. Valida GLB v2 autocontido, estrutura das tabelas e ausência das compressões recusadas. A requisição tem cancelamento e prazo de conferência. Não se trata de uma validação completa de toda a especificação glTF.

Retratos são PNG ou WebP, com limites de bytes, cabeçalhos, estrutura, dimensões e animação. A conferência não decodifica pixels no servidor. O MIME efetivo acompanha a reserva, a prova e a leitura; PNG não é mais servido como WebP. Metadados de leitura são consultados no Members e lembrados por 60 segundos, dentro do espaço autorizado.

O Members recebe a prova tipada `{digest, bytes, tipoDoConteudo}` pela rota HMAC. Só confirma uma reserva não vencida com os mesmos metadados. Uma reserva ativa ou arquivo confirmado não pode trocar tamanho ou tipo sob o mesmo hash. Foi reproduzido e corrigido o caso em que essa troca permitia desalinhar a cota. Miniatura e capa podem reutilizar a mesma imagem sem consumir espaço duplicado.

A migração **0155_sour_vector**, produzida por `bun run db:generate`, acrescenta o MIME e sua restrição. A coluna admite nulo para registros existentes; a leitura conserva o tipo anterior nesses registros. Não altera nem remove modelos publicados. A tipagem do member-shell passou com a dependência direta do núcleo puro.

## FBX original

O script `packages/molda-cenarios/playground/oficina/verificar-fbx-real.mjs` exercita o worker real no Chrome com `Lighthouse_01.fbx` e os atlas do Adventure Land. Fontes, texturas e GLB convertido permanecem fora do Git.

Resultado: um modelo, cinco imagens incorporadas, 1.556 triângulos, altura de **23,9767 m**, miniatura gerada e nenhuma recusa ou erro no navegador. [Metadados do ensaio](evidencias/importacao/fbx-real.json). O script é reproduzível com o arquivo privado de teste, sem credenciais.

## Verificação e limites

Os ensaios locais passaram: núcleo com 47 testes; BFF/conteúdo com 26; cliente HTTP com 11; Members serviço/HTTP com 32; Postgres descartável com 12. Os testes incluem hash trocado, referência externa, binário truncado, cancelamento, autorização antes da leitura, MIME divergente, reserva vencida, confirmação com tamanho errado e reaproveitamento de imagem. Os 3.218 GLBs preparados do acervo passaram no novo conferidor.

Antes de considerar o fluxo remoto aprovado, ainda é obrigatório publicar Members e apps com o mesmo contrato, executar upload/registro/reabertura no staging, conferir o PUT condicional e o CORS das duas origens. Não afirmar que essa prova já ocorreu. O novo histórico remoto, o acesso de equipe no Kids e os demais requisitos do plano continuam no registro de execução.

A preservação do catálogo existente foi mantida; arquivos de arte e credenciais não foram adicionados. Não houve mudança de interfaces, geografia ou sistemas do Arquipélago neste recorte.
