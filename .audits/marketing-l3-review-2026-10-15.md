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

## Atualização de validação do L3 durante L8 (16/10)

O R2 de staging passou a integrar a stack nativa de revisão; a limitação anterior de ausência de credenciais descreve apenas a primeira etapa. A importação já transfere e confirma arquivos reais. O retrato paginado inicial, o histórico paginado completo e a redução de deltas vazios foram exercitados no web/Electron com o acervo. A interface de limpeza local remove apenas equivalentes confirmados em grupos de até 100 e a prova real recuperou um arquivo removido, com hash/tamanho idênticos. Detalhes e logs na revisão L8, seção “Histórico completo, sincronização e espaço local”.

Permanecem abertos: refresh concorrente da web, cenários de arquivos grandes/expiração multipart, desempenho p95 da colaboração, duas máquinas físicas e os demais critérios externos do piloto. Docker foi dispensado pelo usuário; os testes transacionais continuam no PostgreSQL nativo isolado. Nenhum desses pontos foi dado como validado por simulação.

## Revisão adicional do transporte dos clientes oficiais (16/10)

- Reproduzidas duas falhas: erro em stdout/stderr podia escapar do tratamento do subprocesso; envelopes JSON sem resultado/erro ficavam aguardando timeout. `tests-native-transport-red.log` registrou as duas regressões antes da correção.
- O JSON-RPC valida o envelope na entrada e retorna resultado desconhecido até que o consumidor aplique seu schema. Não usa mais o parâmetro genérico como afirmação não verificada do resultado. Erros de ambos os streams encerram os pedidos pendentes; saída tardia após encerramento é ignorada. O coletor do Claude recebeu o mesmo tratamento.
- Eventos são validados pelos campos efetivamente consumidos. Itens não relacionados são ignorados; notificações do protocolo conservam parâmetros JSON livres. Imagem inline aceita `savedPath: null` e confirmação de login sem ID não confirma a tentativa ChatGPT. Aprovações nativas não solicitadas continuam recusadas.
- Schemas oficiais locais em `.cache/official-protocol` foram consultados, especialmente `JSONRPCMessage` e `v2/ItemCompletedNotification`; referência oficial complementar: https://learn.chatgpt.com/docs/app-server . Nenhum formato adicional de API paga foi introduzido.
- Regressores completos do desktop: **60 testes, 1.698 assertions, zero falhas** (`tests-native-transport-complete`). Typecheck passou (`types-native-transport-final`). Prova real através dos clientes oficiais retornou texto com **ChatGPT Pro** e **Claude Max**, sem API paga (`proof-native-transport-text`, código zero). O próximo build integrado deve incorporar essas mudanças após o término da importação ativa; o bundle que está importando não foi substituído durante a execução.
- Esses ajustes não encerram a pendência distinta de recuperar pelo app um resultado bruto interrompido antes de ser convertido em proposta válida, nem o problema do refresh web.

## Recuperação da resposta nativa antes do resultado editorial (16/10)

A pendência de recuperação citada acima recebeu implementação adicional. Cada geração do executor registra sua época antes de chamar o cliente oficial. A resposta bruta é preservada antes da interpretação editorial; imagens recebem cópia própria conferida por SHA-256. O recibo de início impede repetir uma invocação incerta no mesmo diretório. O botão existente “Retomar resultado local” usa a época original mesmo quando o servidor concede uma nova tentativa. Nesse caminho não há consulta de login nem chamada de geração: o parser e os schemas são os mesmos usados para respostas novas.

Pedido e conteúdo das referências participam da identidade; mudança de referência no mesmo caminho bloqueia a reutilização. Resposta ausente, parcial, inválida ou imagem divergente não é aplicada e não inicia inferência. A saída parcial do Claude é salva antes de devolver cancelamento/falha; itens consumidos do Codex são preservados durante a execução. Um encerramento abrupto antes de um checkpoint completo continua exigindo nova geração explicitamente solicitada. Não se anuncia recuperação de resposta que nunca chegou ao disco.

Imagens incorporadas usam identidade por projeto, pedido, época original e posição. Repetir a incorporação ou reiniciar entre escrita e registro do catálogo conserva o mesmo arquivo/ID, verificando bytes; divergência é recusada. Uma confirmação antiga de falha cujo envio se perdeu é descartada ao recuperar o resultado, evitando confirmar `failed` depois de uma recuperação bem-sucedida. O teste sem essa correção falhou com `failed` em vez de `succeeded` (`tests-provider-recovery-ack-red`); a implementação restaurada passou.

Evidências desta revisão:

- 66 testes Bun / 1.720 assertions, zero falhas (`tests-provider-recovery-reviewed`).
- 19 testes Node/SQLite, zero falhas (`tests-provider-recovery-node-final`), incluindo reinício, recuperação na mesma concessão e em nova época, falha de confirmação, cancelamento e identidade da imagem.
- Prova com os clientes oficiais: ChatGPT Pro e Claude Max retornaram texto e o resultado foi recuperado idêntico, em 3 ms e 2 ms respectivamente, sem nova geração (`proof-provider-recovery`, código zero; evidência em `packages/marketing-desktop/.cache/recovery-mvas9qtq/evidence.json`). Esses tempos medem somente leitura/interpretação local, não geração ou sincronização.
- Typecheck será repetido após a integração dos ajustes finais; o próximo build Electron aguarda o término da importação ativa. Esta prova usa o adaptador real, ainda não demonstra o clique de recuperação dentro do Electron empacotado.

Os checkpoints ficam no orçamento local e são preservados enquanto há trabalho recuperável. A limpeza já implementada de assets confirmados não remove esses diagnósticos intermediários; a política operacional de retenção de execuções confirmadas permanece na revisão de armazenamento. Os demais critérios abertos deste lote, inclusive refresh concorrente web e cenários de arquivos grandes, continuam abertos.

## Revisão integrada posterior em 16/10

A corrida de refresh web citada acima foi corrigida e demonstrada em L9. A revisão de transferência encontrou e corrigiu a retomada de multipart expirado; teste PostgreSQL e prova no R2 real passaram. O ensaio de 2 GB está registrado separadamente em [recuperação de transferências](marketing-l3-recovery-review-2026-10-16.md). Essa atualização substitui o status histórico dessas pendências, sem encerrar vídeo, instalação assinada ou piloto físico.

A retenção dos temporários de execuções confirmadas foi implementada na limpeza do app e conferida pela interface Electron, preservando os recibos e baixando novamente uma cópia do R2. Ver [revisão de retenção](marketing-l3-execution-retention-review-2026-10-16.md). A pendência acima sobre temporários confirmados é histórica; trabalhos interrompidos continuam protegidos.
