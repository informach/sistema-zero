# Cadernos visuais e ensaios dos cursos do Construtor

Os dois cadernos seguem a [receita visual comum](../caderno-visual/README.md): A4, capa com as artes do jogo, fontes Nunito e Baloo 2, logo Kids, cards, passos numerados, paleta, diagramas com rótulos e cores do Estúdio, galerias e apoio à conclusão. Não incluem as páginas de apresentação da plataforma dos cursos de entrada.

## Fontes e regeneração

O texto das aulas é a fonte editorial. O gerador dos cursos produz `curso-autoria.json` e todos os projetos de entrada/solução. `montar-conteudo.ts` projeta as mesmas ações e testes para `caderno-conteudo.json`. O JSON contém o texto do material, e `caderno-paginacao.json` registra as divisões entre páginas. Não corrigir apenas o PDF.

```sh
bun docs/aulas-interativas-tecnico/qa/gerar-construtor-bases.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-inventario-blocos.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/montar-conteudo.ts nave-contra-asteroides
bun docs/aulas-interativas-tecnico/recursos/construtor-base/montar-conteudo.ts patrulha-espacial
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py construtor-nave --paginate
python docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-materiais.py construtor-patrulha --paginate
```

Dependências da impressão: Bun, Python, `weasyprint==70.0` e `pypdf`. `BUN_BINARY` pode apontar para o executável. Sem `--paginate`, a conferência falha se um conteúdo passar do limite; com ele, itens inteiros passam para uma continuação. Um item maior que uma folha continua sendo erro, para revisão do conteúdo ou do esquema.

O gerador escreve HTML, mapa de páginas e cores utilizadas em `tmp/pdfs/<curso>`. A conferência mede cada item em todas as páginas, verifica margem, rodapé, número de folhas, tamanho A4, incorporação das duas fontes e cores contra as definições oficiais. Renderizar o PDF com Poppler e olhar todas as páginas ainda é obrigatório: uma medida válida não garante uma boa composição.

## Diagramas e artes

`blocos.ts` lê os blocos de cada snapshot e as definições do pacote `studio`. O esquema mostra a mudança da parte e seus encaixes, conservando os rótulos literais e distinguindo o contexto que já estava pronto. Não é uma captura de interface. Partes com escolha de aparência mostram os blocos disponíveis sem impor uma resposta visual única.

`gerar-inventario-blocos.ts` produz `blocos-usados.md/json` com nomes preenchidos, categorias oficiais, partes de montagem, apoio inicial e contagens. A lista de liberação não é tratada como uma lista de conceitos novos.

`gerar-artes.ts` recompõe somente os SVGs 2D e projeta somente as malhas GLB dos projetos aprovados. Usa `three`, `happy-dom` e `sharp` como ferramentas de produção. A imagem 3D é uma ilustração geométrica dos modelos provisórios da galeria; não comprova a aparência da prévia WebGL. Não há novas malhas procedurais ou variações 3D inventadas. Quando Helena entregar as artes do Blender, substituir os arquivos segundo o contrato do curso e regenerar imagens, exemplos e PDFs.

```sh
bun docs/aulas-interativas-tecnico/recursos/construtor-base/gerar-artes.ts
```

## Ensaio de funcionamento 2D

`validar-runtime-2d.ts` executa os 26 estágios no motor oficial, com o JavaScript produzido pelo gerador oficial, DOM de teste e Canvas2D nativo real. Requer `happy-dom`, `@napi-rs/canvas` e `sharp`. As dependências podem estar instaladas no ambiente de QA; `CODEX_PRIMARY_RUNTIME_NODE_MODULES`, se presente, é apenas uma localização alternativa delas.

```sh
bun docs/aulas-interativas-tecnico/recursos/construtor-base/validar-runtime-2d.ts
```

As sondas de observação entram só na cópia do código executada no ensaio. Nunca são escritas nos projetos da criança. O relatório fica em `qa/relatorios/construtor-base-runtime-2d.json`. Ele verifica presença e ausência das regras nas etapas intermediárias, contato único, limpeza, proteção, bloqueio após o fim, prioridade e reinício. Esse ensaio não substitui a importação manual no Estúdio nem a conferência do palco de gravação.

## Gates de autoria

```sh
bun docs/aulas-interativas-tecnico/recursos/construtor-base/construtor-2d-experiencias.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/validar-gestos.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/validar-objetivos-2d.ts
bun docs/aulas-interativas-tecnico/recursos/construtor-base/validar-roundtrip.ts
```

O gate de gestos usa o parser de verbos oficial e as tags EdiAula documentadas; o reconhecimento estático não comprova que todos os alvos foram resolvidos na interface. O ensaio de objetivos 2D usa as regras e o avaliador de execução. O roundtrip abre as 45 etapas no Blockly real e compara os arquivos regenerados. Os relatórios registram o alcance de cada verificação.

## Pacotes de entrega

Os snapshots `.szproject.json` destas bases e dos protótipos usam a serialização compacta do exportador nativo. O `biome.json` desativa somente a formatação desses arquivos; a leitura de JSON e as demais verificações continuam ativas. Assim os arquivos importáveis conservam seus bytes e hashes aprovados.

Depois da geração e das conferências, normalize os JSONs de apoio escritos pelo pipeline Python e os relatórios. Faça isso antes de consolidar os hashes do conteúdo e de empacotar:

```sh
bunx --no-install biome format --write docs/aulas-interativas-tecnico/qa/relatorios docs/aulas-interativas-tecnico/recursos/construtor-nave docs/aulas-interativas-tecnico/recursos/construtor-patrulha
```

Depois das conferências de autoria, da revisão visual e da atualização dos relatórios, execute:

```sh
python docs/aulas-interativas-tecnico/recursos/construtor-base/empacotar.py
```

Os dois ZIPs ficam em `docs/aulas-interativas/construtor/entregas/`: pacote de produção dos cursos e pacote com as 45 etapas. O empacotador confere a integridade do ZIP, lê todos os JSONs, verifica os cabeçalhos dos PDFs e inclui hashes. A regeneração das fontes continua dependendo do checkout completo, como explica o LEIA-PRIMEIRO do pacote.
