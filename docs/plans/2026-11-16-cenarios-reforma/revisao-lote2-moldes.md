# Molda Cenários — biblioteca viva Meus moldes

16/11/2026. Segunda passada do lote 2. O lote continua aberto para os itens restantes do plano original.

## Implementação

“Meus moldes” aparece entre as bibliotecas da conta, na tela do mundo e na gaveta da oficina. A lista lê as criações guardadas na conta pela API de criações que o Molda já usa, com o perfil fixado no cliente. Atualizar, voltar à janela ou tornar a aba visível relê a fonte; busca funciona sem distinguir acentos. A galeria original não é alterada e seu namespace global não é trocado.

Um modelo só é convertido quando escolhido. A ponte reutiliza os codificadores das duas gerações do Molda, com orçamento próprio de Cenários. O orçamento do Estúdio permanece separado inclusive no cache. Se a conversão precisa omitir ou adaptar elementos, a ferramenta mostra as mudanças e exige o aceite daquela revisão específica antes de colocar a cópia. Nenhuma revisão é aceita automaticamente.

O arquivo passa pela preparação em worker, medição, miniatura, reserva, upload e confirmação já existentes. A biblioteca de armazenamento **Cópias do Molda** pertence à conta, tem fonte identificada pelo perfil e é criada de forma idempotente; o nome não identifica sua origem. As cópias podem ser administradas na tela de bibliotecas, inclusive para liberar armazenamento. Famílias continuam compartilhando as bibliotecas da conta.

As instâncias já colocadas conservam o modelo e hash usados. Atualizar a criação no Molda oferece uma nova versão na gaveta; escolher essa versão não altera as anteriores. Repetir a mesma escolha reutiliza o GLB guardado. O cache é limitado e confere se a cópia ainda existe antes de reutilizá-la. Cancelar ou sair interrompe a preparação; trocar de perfil desmonta o host e aborta o cliente da conta anterior.

## Dados e contratos

- Migração **0152_young_nomad**, gerada por `bun run db:generate`: coluna opcional `fonte` e índice único por espaço/fonte. Bibliotecas manuais continuam sem fonte; não há migração de dados de autoria.
- `POST /espacos/:espacoId/biblioteca-molda`, protegido pelo mesmo Members/gateway/BFF; a fonte vem do ator autenticado e só pode ser criada no espaço de conta.
- Busca exata por digest na listagem de modelos, dentro da biblioteca autorizada, para evitar baixar páginas inteiras ou duplicar arquivos.
- Ponte pública `@sistemazero/molda/cenarios-library`: recebe snapshot e identidade esperada, não precisa abrir o Molda nem mudar seu armazenamento.
- A rota de interface `?biblioteca=molda` identifica a vista da fonte; o servidor recebe apenas UUIDs reais nas chamadas de armazenamento.
- Correção adicional: ao reabrir um cenário, o host conserva o espaço dos arquivos referidos no documento autorizado, mesmo se a biblioteca original tiver sido apagada. Há teste específico; as cópias fixadas não dependem de uma biblioteca ainda existente para resolver a leitura.

## Evidências e revisão

[Biblioteca viva](evidencias/moldes/biblioteca-viva.png), [gaveta e cópias](evidencias/moldes/gaveta-e-copias.png), [resultado do ensaio](evidencias/moldes/resultado.json). Script: `node packages/molda-cenarios/playground/oficina/verificar-moldes.mjs`, com o playground na porta 4541.

O Chrome exercitou a ponte e a interface reais, usando uma fonte de conta simulada e o host em memória: modelos das duas gerações, atualização da criação, preservação do modelo anterior e duas instâncias da mesma versão nova. Resultado: quatro instâncias, três GLBs guardados, sem erros de página. Isso não é prova de armazenamento ou autenticação no staging remoto.

Verificações executadas: 13 testes das pontes de exportação; 30 testes de serviço/HTTP do Members; oito testes em Postgres 17 descartável, incluindo criação concorrente e migração real 0152; cinco testes do gateway e 17 do BFF. A suíte da oficina foi exercitada e os nove testes do host HTTP, incluindo reabertura, passaram. Tipagens do Molda, da oficina, do member-shell e do Members aprovadas. `bun run ci` executado na raiz passou sem erros; continuam 307 avisos e 245 informações preexistentes de lint.

A primeira tentativa do ensaio usou uma peça sintética sem o nome obrigatório; o leitor estrito recusou corretamente. A fixture foi corrigida, sem alterar a validação. A tipagem também identificou inferência literal no parâmetro do orçamento do exportador; o parâmetro recebeu tipo numérico explícito. O JSON de evidência da passada anterior foi formatado conforme o Biome após o CI apontar a divergência. Os limites e verificações não foram reduzidos.

## Continuidade

Restam no lote 2 capa/descrição das bibliotecas, chãos/texturas, conjuntos em conjunto com o lote 3, acervo da equipe por coleção, conversão da Faísca e ensaios com arquivos complexos/licenciados. A comprovação da plataforma em staging permanece no lote 1. Os lotes 3–10 continuam necessários; não houve abertura geral nem publicação em produção.
