# Revisão L3 — sincronização, execução e mídia

## Evidência funcional

- PostgreSQL de revisão exclusivo em `127.0.0.1:15439/marketing_review`, sem alteração de dados publicados.
- Electron real restaurou a sessão, fez oito leituras concorrentes, recuperou um rascunho do SQLite e confirmou uma única revisão. A interface online embutida permaneceu sem Node e sem ponte nativa.
- Uma solicitação de copy passou pelo BFF, gateway, contexto congelado e concessão do servidor; executou no cliente oficial com **ChatGPT Pro** e confirmou o resultado no servidor. Registro local: `packages/marketing-desktop/.cache/connected-proof/resumed.json`, trabalho `f552ba00-d684-47e2-96f4-75e09263114d`, época 1. Nenhuma API paga configurada na prova.
- Uma identidade de usuário divergente, enviada pelo executor, recebeu 401 do BFF. A troca de sessão na interface embutida não pode mudar silenciosamente a autoria da fila local.
- O caminho de execução com 261 caracteres reproduziu `ENOENT` no Windows; o mesmo cliente iniciou em caminho curto. A execução nativa agora usa diretório curto separado do acervo persistente por conta/projeto.

## Invariantes implementados e testados

- SQLite WAL/FULL, migração local versionada, identidade por servidor/usuário; outbox persiste a chave e o payload exatos antes do HTTP. Confirmação de escrita não avança o cursor de leitura.
- Páginas contíguas, revisões imutáveis no delta, reconciliação por sequência e preservação de pendências quando um projeto perde acesso. Protocolo incompatível bloqueia envio.
- Alterações conjuntas são atômicas no PostgreSQL e duráveis no desktop. Relações peça/representação/componente são verificadas nos dois sentidos; conflito não salva parte do grupo.
- Concessão com época, dono e dispositivo canônicos, prazo de trabalho e janela de transferência limitada. Duas máquinas não assumem a mesma tentativa; resultado tardio de concessão vencida é recusado. Repetir geração exige decisão explícita.
- Supervisor limita a um trabalho pesado por dispositivo. Resultado local persiste antes do envio; retomada de confirmação não repete inferência.
- Multipart de 8 MiB, MD5 assinado por parte e tamanho fixado; as partes existentes no armazenamento são a fonte da retomada. Conclusão de upload não confirma o arquivo: worker com concessão verifica tamanho e SHA-256 em streaming.
- Download por identidade e hash, retomada por Range e conferência antes de uso. HTML local é servido como texto, com `nosniff` e sandbox.
- Cache com orçamento de 20 GiB e reserva de 2 GiB livres no disco. Reservas concorrentes são serializadas. Liberação explícita remove somente cópias cuja equivalência foi confirmada no servidor; arquivos ligados a trabalho pendente ficam protegidos.

## Verificação executada

- 9 testes PostgreSQL de workspace; 4 de execução; 3 de multipart/verificação.
- 8 testes Node/SQLite: reinício, resposta perdida, conflito, revogação, protocolo, grupo atômico, retomada multipart, reserva de disco e retomada sem nova inferência.
- 17 testes Bun do desktop; typecheck dos pacotes afetados executado durante a implementação.
- Migração aditiva `marketing/0008_green_randall.sql` gerada por Drizzle e aplicada ao banco de revisão.

## Limites e fechamento pendente

- Testes de multipart usam armazenamento determinístico com banco PostgreSQL real. O adaptador S3/R2 implementa comandos oficiais, mas a transferência integrada contra R2 real ainda não foi executada: esta stack de revisão não tem credenciais R2. Não anunciar essa validação como realizada.
- Bancada de produto, resolução visível de conflitos, importação do acervo e vídeo completo serão integrados em L4–L8. A interface inicial de prova continua presente até a substituição pela bancada.
- Instalação nativa de clientes ausentes, atualização/assinatura de distribuição, primeiro login em conta desconectada, duas máquinas físicas, suspensão e cargas de vídeo reais permanecem na verificação integrada. O pacote de revisão é explicitamente não assinado.
- A sessão desktop deixou de depender de refresh rotativo. O problema preexistente de concorrência do refresh da web continua registrado para correção antes da liberação.
- A revisão final deve repetir testes após integração, verificar limites de tamanho/paginação com o acervo e remover caminhos de prova da experiência de produção.

## Referências técnicas

- [R2 multipart](https://developers.cloudflare.com/r2/objects/upload-objects/): partes e expiração de envios incompletos.
- [S3 UploadPart](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/UploadPartCommand/): ContentMD5/ContentLength.
- [SQLite no Node](https://nodejs.org/api/sqlite.html): persistência local sem addon nativo adicional.

Não houve push, deploy, publicação social, commit ou merge nesta etapa. A revisão não equivale à liberação completa do produto.
