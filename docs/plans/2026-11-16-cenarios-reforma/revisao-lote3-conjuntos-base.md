# Lote 3.6 — Base dos conjuntos e publicação transacional

17/11/2026 · staging · checkpoint técnico intermediário. **A parte 3.6 e o lote 3 permanecem abertos.** O catálogo e a publicação descritos abaixo foram exercitados pelo repositório e pelos testes; sua interface, endpoints e edição visual ainda não estão disponíveis.

## Contratos e núcleo

O cenário fixa revisões imutáveis de conjuntos e guarda montagens com identidade, posição, giro, tamanho uniforme, pasta, camada, visibilidade e bloqueio próprios. As peças internas conservam sua escala por eixo. A expansão é uma projeção de leitura: resolve os apoios na composição original e depois transforma o conjunto como um corpo. A autoria não guarda milhares de clones com transformações divergentes.

Os esquemas elementares passaram a ser compartilhados em `entidades-schema.ts`, reexportados pela API pública existente. O fragmento básico de uma definição não contém outras definições recursivas. O clipboard estende esse fragmento para preservar cópias vivas; salvar uma composição com outros conjuntos fixa sua expansão no conteúdo novo.

Comandos de definição, atualização, colocação, transformação, duplicação, exclusão e desvinculação usam a fila existente. A inversão é granular, inclusive ao atualizar todas as cópias de uma definição. Uma restauração integral só é usada nas situações já previstas ou ao restaurar conteúdos distintos sob o mesmo ID local de definição. Pastas, apoios internos, aparência, espelhos, proporções e IDs remapeados são conferidos. A revisão antiga não depende da cabeça mutável da biblioteca.

Os limites são aplicados também à expansão: 20.000 objetos, 8 MiB e os tetos de tabelas do documento. Cada definição contém até 2.000 objetos; cada cenário admite até 128 definições fixadas e 2.000 montagens, sujeito ao orçamento global. Não há colocação automática na Faísca.

## Catálogo e transação

As migrações geradas pelo comando do projeto são `0158_fluffy_maggott.sql` e `0159_wise_lady_bullseye.sql`. Acrescentam catálogo, revisões imutáveis, índice de usos das cabeças, operações idempotentes e integridade de revisão nos usos. Não foram editadas manualmente. A conferência ocorreu no Postgres descartável da porta 55439; não houve implantação manual em staging nesta etapa.

`ConjuntosNoPostgres` compartilha a conexão, a trava do espaço e a gravação de lotes do repositório existente. A gravação foi extraída para `gravarLoteSobTrava`, sem duplicar a atualização de cabeça, o histórico ou os registros de operação.

A publicação confere versão esperada, conteúdo, origem, arquivos confirmados, cota e orçamento das cabeças afetadas. Faz duas passadas em lotes de até oito documentos, para não manter os documentos de todos os jogos na memória: primeiro valida todos; depois grava versão, catálogo e lotes na mesma transação. Preserva as transformações das montagens e as revisões anteriores dos cenários. Pedidos repetidos não reaplicam as mudanças.

O conteúdo JSON das revisões entra na cota, além dos arquivos. Miniaturas pertencem à revisão fotografada; uma resposta dirigida à revisão antiga não se torna a capa da nova. Arquivos usados pelo catálogo, snapshots, cabeças, fotografias esparsas, comandos e inversos continuam protegidos depois de remover o catálogo. Os caminhos JSON conhecidos são centralizados em `cenarios-arquivos-json.ts`; propriedades livres do usuário não fixam arquivos incidentalmente.

## Revisão e provas

- Comparação independente com matrizes Three: 25 combinações de giro XYZ, incluindo singularidades de Euler, escala não uniforme das peças e tamanho uniforme da montagem; 400 asserções.
- Atualização de duas cenas reais no Postgres: versões antigas intactas e posições/giros preservados. Conflito, cadeado, cota e expansão acima do limite recusados integralmente.
- Duas publicações concorrentes disputam a mesma revisão: uma vence, outra recebe conflito. Repetição concorrente da operação vencedora não cria novos lotes ou versões.
- Um trigger de teste adia a falha até o commit, depois de executar as escritas. A transação devolve catálogo, versões, duas cabeças, históricos e cota ao estado anterior. O trigger é removido em `finally` e não pertence às migrações.
- O teste de proteção de snapshots reproduziu a perda prematura de três arquivos com o repositório anterior e passou com a correção. Arquivos presentes só nos comandos de conjunto, no clipboard ou em restaurações são preservados e liberados na última exclusão.
- Miniaturas antigas, nova cabeça sem imagem, papel de arquivo incorreto, substituição de imagem e descarte final também foram conferidos em SQL real.

| Verificação local | Resultado |
| --- | --- |
| Núcleo | 148 testes, 3.907 asserções |
| Motor | 44 testes, 1.018 asserções |
| Oficina e hosts | 53 testes, 355 asserções |
| Members: serviço, histórico e HTTP existentes | 42 testes, 160 asserções |
| Postgres | 28 testes, 242 asserções |
| Tipagem | Núcleo, motor, oficina e Members aprovados |
| Build da oficina | Aprovado; bundle do motor de aproximadamente 766,6 kB, 203,0 kB gzip |

Regressões Chrome do pincel e do clipboard passaram em 1.440 claro/escuro, 1.024 claro e 390 escuro. São fluxos existentes; **não comprovam a interface dos conjuntos**, ainda pendente. [Pincel](evidencias/lote3-conjuntos-base/regressao-espalhamento.json) e [clipboard](evidencias/lote3-conjuntos-base/regressao-transferencia.json).

## Continuidade obrigatória

Seguir o [plano da parte 3.6](../../superpowers/plans/2026-11-17-cenarios-lote3-conjuntos.md). Faltam endpoints/hosts, prova de imagem no BFF, rascunho persistente na mesma oficina, nome/miniatura na biblioteca, seleção da raiz e integração com palco, volumes, gestos e ocupação do pincel. O pivô deve permanecer estável ao editar a definição. A atualização não pode apagar um rascunho pendente.

Depois desses itens, produzir os ensaios visuais e de interação com modelos reais, revisar a parte inteira e só então marcar 3.6. Eficiência, retratos e Testar continuam nas partes 3.7/3.8. Não houve aprovação artística, teste em aparelhos físicos, conclusão global ou abertura da ferramenta aos membros.
