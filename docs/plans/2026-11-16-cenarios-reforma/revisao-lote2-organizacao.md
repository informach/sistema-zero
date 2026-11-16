# Molda Cenários — descrição e capa das bibliotecas

16/11/2026. Continuação do lote 2, após `7dc4af18b`. Não encerra o plano integral.

A biblioteca pode receber descrição ao ser criada ou editada. A descrição aparece no cartão e no cabeçalho, com leitura limitada a duas linhas para preservar a composição. O texto completo permanece disponível na edição. O limite de mil caracteres é validado na API.

A pessoa pode escolher a miniatura de um modelo como capa, pelo diálogo de edição do modelo, e voltar à capa automática nas opções da biblioteca. A capa reutiliza um modelo do mesmo espaço; não duplica imagens nem ocupa mais armazenamento. A referência é protegida por chave estrangeira: remover o modelo escolhido devolve a biblioteca à capa automática e permite liberar os arquivos que ficaram sem uso. Não foi acrescentado upload de imagens independentes para capas.

Migração **0153_silky_the_hand**, gerada pelo script `db:generate`: descrição e referência de modelo para capa. O serviço confere espaço e miniatura; o repositório repete a conferência dentro da trava do espaço para evitar corrida com remoção do modelo. Não foi necessário criar outra rota de upload ou outro formato de arquivo.

Verificação: 31 testes de serviço/HTTP, nove de Postgres real com as migrações 0151–0153, e 27 testes da oficina aprovados. Os testes cobrem capa de outra conta recusada, escolha da miniatura, remoção do modelo, retomada da capa automática e liberação dos bytes. Tipagens de Members e oficina aprovadas. `bun run ci` passou sem erros, com os avisos preexistentes do repositório.

O Chrome exercitou criação com descrição, importação, edição de nome/pasta/etiquetas e escolha da capa, além da regressão da biblioteca viva do Molda. [Captura da biblioteca](evidencias/organizacao/biblioteca-importada.png), [resultado da importação](evidencias/organizacao/resultado.json). O ensaio usa host em memória e modelos sintéticos; armazenamento remoto continua dependendo da validação de staging.

O teste inicial de capa no Postgres recusou corretamente um digest sintético fora de hexadecimal. A fixture passou a reservar hashes válidos e tipos corretos; nenhuma restrição foi afrouxada.

Continuam pendentes no lote 2: chãos/texturas, conjuntos com o lote 3, acervo da equipe por coleção, importação da Faísca e ensaios com arquivos mais complexos. Os lotes 3–10 permanecem necessários.
