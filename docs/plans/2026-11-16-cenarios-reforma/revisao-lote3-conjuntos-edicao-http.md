# Lote 3.6 — Edição persistente e contrato HTTP dos conjuntos

Checkpoint de implementação local. **Não fecha a parte 3.6 nem o lote 3.** Mantém os lotes 0–2 fechados e somente o lote 3 em execução. Interface, hosts, motor e ensaios dos conjuntos ainda faltam.

## Implementado e revisado

- Um cenário de edição persistente por conjunto, preparado de forma idempotente sob a trava do espaço. Usa a oficina, os lotes, CAS, inversos e fotografias existentes. Um mundo interno por biblioteca hospeda esses cenários e fica fora da lista e do teto de jogos.
- Publicação explícita do rascunho salvo, com revisão do catálogo, revisão da fonte e conteúdo conferidos dentro da transação. Uma publicação direta pode sincronizar uma fonte limpa; recusa alterações pendentes. O pivô local permanece estável, inclusive ao acrescentar peças nas bordas.
- A publicação não substitui versões antigas. Desfazer na fonte depois de publicar deixa a edição pendente, sem desfazer automaticamente as cópias em outros cenários. Falha adiada até o commit reverte fonte, catálogo e todas as cabeças juntas.
- Fonte de definição aceita objetos/pastas e conserva suas referências. Recusa sistemas não representados no fragmento e montagem do próprio conjunto. O serviço impede exclusão/duplicação da fonte por atalhos de cenários comuns. Excluir o conjunto ou sua biblioteca remove a fonte e recolhe seus arquivos, preservando os snapshots e históricos de outros cenários.
- Serviço de catálogo composto no `CenariosService`: criação idempotente, busca/paginação, nome/pasta/etiquetas, leitura de revisão, abertura da edição, publicação e exclusão. A autorização continua sendo a do espaço e do modo da ferramenta. Datas trafegam como ISO; o DTO de revisão não expõe o identificador do autor.
- Rotas explícitas no Members/gateway/BFF. Nenhum curinga novo. O limite de documentos/restaurações/definições passa a 8 MiB mais envelope de 64 KiB, de ponta a ponta; as outras rotas mantêm seus limites menores. Teste HTTP envia um fragmento válido de 1.800 objetos acima de 1 MiB e recusa o corpo acima do teto com 413.
- Miniaturas vinculadas à revisão fotografada. Reutilizam reserva, envio condicional e prova de conteúdo do BFF. O BFF autoriza conjunto, espaço e revisão antes de ler o bucket. Só a rota interna HMAC pode afirmar a prova. Confirmação do blob e associação à revisão acontecem na mesma transação; respostas de uma revisão antiga não substituem a miniatura da atual.

## Revisão e provas

- Teste vermelho encontrou água aceita no rascunho por uma saída antecipada do índice de usos. A validação de formato agora precede essa saída. A recusa conserva a revisão e o histórico intactos.
- Teste vermelho encontrou resposta repetida de publicação listando a fonte como se fosse uma cópia atualizada. O lote da fonte passou a ter chave de operação própria, conservando a resposta idempotente do catálogo.
- Postgres real: prova concorrente de preparação da fonte, publicação em duas cabeças, revisão antiga, undo, rejeição de rascunho atrasado/divergente, arquivo necessário somente no histórico, exclusão/cascatas e falha da miniatura adiada até o commit. A falha desfaz também a confirmação do blob.
- A primeira execução dos testes novos reproduziu travamento de `expect(promise).rejects` com o cliente Postgres no Bun. As recusas SQL agora são aguardadas com `.catch(e => e)` antes da asserção, como nos testes existentes. Uma execução sofreu timeout no preparo do banco; a repetição isolada e a suíte completa passaram. Não foram alteradas conexões de staging/produção.

Resultados locais registrados em `output/cenarios-reforma/conjuntos-fonte-*` e `conjuntos-http-*` (logs privados, sem credenciais): núcleo **151 testes/3.922 asserções**; Members **46/210**; Postgres **33/300**; BFF **26/143**; gateway **5/280**. Tipagem do gateway aprovada. A tipagem global de Members encontrou somente `tests/unit/pinta-block.test.ts:74`, porque a alteração paralela do Pinta acrescenta `map-set` antes de atualizar `PintaAssetKindName`; esse arquivo não foi modificado por este trabalho. **Não registrar a tipagem global como aprovada nem fechar o lote enquanto essa verificação estiver pendente.**

A tipagem de `member-shell` também encontrou somente uma pendência dessa alteração paralela: falta `map-set` em `src/server/pensa/context.ts:37`. Esse arquivo foi preservado. Repetir as duas verificações após a conclusão do trabalho paralelo, antes do fechamento do lote.

Tipagem do núcleo e build da oficina aprovados. O build mantém o chunk do motor em 766,64 kB (203,03 kB gzip), com o aviso de tamanho acima de 500 kB. Esse resultado não substitui os ensaios de orçamento/miniaturas da parte 3.7 nem uma medição em aparelhos físicos.

## Migração e implantação final

`0160_flaky_marvel_zombies.sql` e snapshot/journal foram gerados pelo script `bun run db:generate`, sem edição manual do SQL. Acrescentam colunas opcionais, índices únicos e verificação de preenchimento conjunto do vínculo/revisão publicada. Não há backfill de dados existentes. Aplicar antes do backend que consulta essas colunas. A DDL acrescenta índices/check/FKs e deve ser aplicada com a rotina de migração existente; os testes recriam somente o schema do Postgres descartável na porta 55439.

Não remover a migração nem suas colunas com cenários de fonte já em uso. Se for preciso retornar o aplicativo ao checkpoint anterior durante a implantação final, manter a estrutura aditiva e os dados. Nenhuma validação de implantação, aparelho físico ou aprovação artística foi feita neste checkpoint.

## Próximo passo da mesma parte 3.6

Conectar os hosts HTTP/memória e a biblioteca/gaveta; abrir a definição na mesma oficina e oferecer a publicação explícita. Depois integrar as montagens à renderização, seleção de raiz, árvore, transformações e ocupação do pincel. Só fechar após ensaios completos com recursos reais, revisões, imagens, teclado/toque e ciclos de carregamento. Não avançar às partes 3.7/3.8 ou aos lotes 4–10 antes disso.

### Atualização: hosts conectados, controles visuais ainda pendentes

- Os hosts HTTP e de ensaio implementam o catálogo, revisões, abertura da fonte, publicação e miniaturas. O HTTP transforma digests em endereços autorizados, lembra a origem dos recursos fixados dentro dos conjuntos e reutiliza o envio condicional. A miniatura sempre vai para a revisão explicitamente fotografada.
- O host local extraiu a preparação de um lote da gravação do gesto já existente. Publicação prepara todas as mudanças, incluindo a fonte limpa, antes de trocar qualquer cabeça, sem `await` entre as aplicações. Conserva o mesmo histórico; não há outro controlador. As chaves das operações incluem a identidade do conjunto, evitando colisões entre duas publicações com o mesmo identificador em conjuntos diferentes.
- Miniaturas locais compartilham URL/bytes pelo hash dentro do espaço e mantêm donos por conjunto/revisão. A exclusão revoga a URL e desconta os bytes quando sai o último dono. Os snapshots do catálogo protegem texturas da coleta. Mundo de fontes fica fora da listagem de jogos e seus cenários são gerenciados pelo catálogo.
- A revisão encontrou uma diferença em relação ao SQL: o ensaio aceitava uma definição com conteúdo adulterado para uma versão ainda existente no catálogo. Teste vermelho reproduziu; a preparação agora confere as referências usadas contra a revisão fixada. A publicação informa sua definição proposta apenas pela porta interna de preparação, antes de gravar as versões. A API pública de gestos não recebe essa exceção.
- Oficina: **58 testes/395 asserções**, tipagem e build aprovados. Cinco testes novos exercitam publicação em duas cenas, undo/reabertura, cópia bloqueada sem parcialidade, fonte limpa/pendente, idempotência, snapshot divergente, miniaturas compartilhadas e o protocolo HTTP.
- Regressões no navegador aprovadas em claro/escuro, 1.440/1.024/390 px: copiar/recortar/colar com GLB e textura reais, exclusão da biblioteca e reabertura; pincel com prévia, cancelamento, undo e retomada. Sem erros de página/console. Scripts `verificar-transferencia.mjs` e `verificar-espalhamento.mjs`; resultados privados em `output/cenarios-reforma/lote3-conjuntos-hosts-*`. Essas regressões verificam os recursos existentes depois da extração da gravação; ainda não são o aceite visual das montagens.
- Build do playground: entrada 434,08 kB (130,61 kB gzip); motor 766,64 kB (203,03 kB gzip), com aviso de chunk grande preservado. Não equivale a validação em aparelho físico.

Faltam biblioteca/gaveta, publicação na interface, fotografia representativa da definição e integração das montagens com o palco, seleção, organização e pincel. A parte **3.6 permanece aberta**.
