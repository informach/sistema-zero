# Lote 8.4 — Preparo de importação no Estúdio

19/11/2026, continuação de `33e90f06f`. **Recorte do preparo puro JavaScript; importação pelo produto e 8.4 continuam abertos.**

`prepararImportacaoDeCena3D` captura o conteúdo do projeto e copia o pacote antes dos awaits. Usa o preflight existente e recebe o pacote já agrupado quando essa opção é solicitada à fonte Molda. Produz um plano serializável, com hash da base, lista completa de assets, ID do cenário, quantidade adicionada e orçamento. A função não grava no projeto, na biblioteca ou na conta. A [revisão do commit atômico](checkpoint-lote8-studio-commit.md) explica a separação do compilador para conservar o orçamento do editor.

Recursos são compartilhados por conteúdo, MIME/tipo e papel quando binários. Nomes/IDs anteriores são conservados. Revisão nova acrescenta um envelope e reaproveita recursos, sem reescrever a anterior. A reimportação privilegia os IDs da revisão já usada; uma cópia idêntica acrescentada posteriormente não desvia seus vínculos. O nome técnico do arquivo novo usa um identificador limitado/portátil; o caminho compilado completo continua no manifesto, sem truncar a procedência.

O orçamento conta as partes e instâncias compiladas, os modelos comuns fora das cenas e os bytes já presentes. Dependências de cena não entram novamente como modelos avulsos. O inspetor GLB real do motor ganhou entrada pública no subpath `/compilar`; nenhum parser novo foi criado. Modelos do curso conservam seus stubs e são medidos pelos bytes completos. Tetos: 48 malhas, 5 MiB/modelo, 24 MiB/projeto; caracteres e quantidade de materiais continuam como cercas independentes. Excesso retorna diagnóstico tipado e sugestão de avaliar junção, sem alterar autoria ou omitir arquivos.

## Provas locais

Dez testes novos usam GLBs reais de ensaio, sem renderer ou peças licenciadas: 48/49 partes/instâncias; 5 MiB e quatro bytes a mais; modelos/bytes já existentes; mesmo recurso em dois caminhos; reimportação, nome personalizado e nova revisão; cópia idêntica posterior; captura antes de alterações concorrentes; cancelamento/hash inválido; junção real; caminho compilado longo. **Dez passaram, zero falhas, 37 verificações.** Os casos da cópia posterior e nome longo foram reproduzidos vermelhos antes das respectivas correções.

Regressão de preparo/assets/documentos/workspace: **71 testes, zero falhas, 329 verificações**, sete arquivos. Núcleo/motor: **604 testes, zero falhas, 15.826 verificações**. Build/orçamento real do playground: **um teste, zero falhas, 29 verificações**, sem aumentar limites. Tipagem do núcleo e tipagem integral do Estúdio aprovadas localmente, TypeScript 5.9.3.

A conferência reproduzível detectou que reexportar o schema exclusivo do Estúdio no índice geral do compilador levava 1.117 caracteres desse domínio ao runtime Three independente. A API foi isolada em `@sistemazero/molda-cenarios-core/studio`. O runtime voltou **exatamente** aos 1.106.050 caracteres e SHA-256 `7d66f2567a028af248087cb96c3789f68cc2e10f86e76fbf291559dc498143a6`, três dependências, sem regenerar o arquivo ou trocar seus limites.

A staging avançou em paralelo até `dd4f0959c`, preservado nesta continuação. Seu relatório registra três erros Canvas2D em outra worktree. A tipagem integral desta árvore terminou com código zero; uma redução que importa o módulo real também passou com DOM, WebWorker e tipos Bun. Nenhum cast, supressão ou mudança de configuração foi aplicado para esconder a diferença. Conferir essa divergência na qualificação integrada antes de fechar 8.4; estes resultados locais não afirmam CI verde na outra sessão.

## Limites e continuação

O preparo puro JavaScript foi implementado, testado e revisado. Ele ainda recusa Python explicitamente: falta preparar seus caminhos/fontes e conectar a distribuição compatível. Não há oferta desse preparo na interface atual. Também faltam a ação atômica do store, sua cerca de projeto/perfil, o adapter autorizado de cenários, os estados da galeria e o ensaio de produto. **Não é uma importação completa nem o fechamento da tarefa 2 do plano.** O diagnóstico de excesso ainda precisa da apresentação visual prevista.

Próximo trabalho, dentro de 8.4: concluir essas partes, com teste de projeto/perfil alterado durante a operação, erro/cancelamento sem gravação parcial, repetição e módulos Python autorais. Depois, carregador comum, quatro motores, fluxo Python na interface e review completo. Nenhuma alteração foi feita no mundo ou na campanha. Nenhuma implantação ou validação remota foi executada neste recorte.
