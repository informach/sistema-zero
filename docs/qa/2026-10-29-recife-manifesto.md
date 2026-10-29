# Conferência do manifesto Mira de bolhas

Fase3-05 do Recife Coral. A entrega contém um Quadro das Cores, três desafios do dia e
oito projetos em blocos, iniciais e gabaritos. Nenhum cadastro no Admin foi realizado.

## Evidências

O executor oficial `check-objectives.mjs` rodou no Chrome local, controlado pelo Node, com
o runtime Jogo 2D e o julgador do core. Os 11 objetivos, incluindo os quatro extras, passaram
nos gabaritos e falharam nos iniciais. Treze cenários incorretos também reprovaram:

- Mira parada, bolha descendo e contato principal ausente.
- Contar o mesmo alvo novamente, pontuar sem acertar e relançar uma bolha em voo.
- Velocidade antiga, pontuação antiga e contato do segundo alvo ausente.
- Enter sem ação em cada uma das quatro versões.

A execução final teve 119 asserções, zero falhas e nenhum objetivo indisponível. Não permite
objetivo inválido nem seleção vazia. O HTTP de importar, exportar e reimportar usa repositório
em memória e porta Members falsa; ele não substitui a execução real.

| Conferência | Comando na raiz | Resultado |
| --- | --- | --- |
| Fontes, contrato e Blockly | `bun test docs/desafios-do-jogo/recife/recife.test.ts packages/arquipelago-contracts/tests/manifesto-do-recife.test.ts packages/studio/src/blockly/__tests__/recifeManifest.test.ts` | 113 testes aprovados ao incluir a suíte completa de arquipelago-contracts; JSON exato e oito projetos regenerados |
| HTTP em memória | `bun test packages/arquipelago-api/tests/integration/manifestos.test.ts` | 17 testes aprovados; reimportação sem revisões extras |
| Executor real | `SZ_CHECK_CHROMIUM` definido, `bun test packages/studio-runtime/tests/recife-browser.test.ts` | Aprovado, 119 asserções |
| Tipagem | `node --max-old-space-size=8192 packages/studio/node_modules/typescript/bin/tsc --noEmit -p docs/desafios-do-jogo/recife/tsconfig.json` | Aprovada |
| Biome | `bunx biome check` nos 11 arquivos TS, MJS e configuração da entrega | Aprovado |
| Apresentação | `SZ_CHECK_CHROMIUM` definido, `bun docs/desafios-do-jogo/recife/conferir-browser.ts` | Mira, captura, ponto e reinício nos três tamanhos |

Os comandos de geração e checagem estão também no [README do pacote](../desafios-do-jogo/recife/README.md).

## Revisão e correções

A revisão retirou uma subtração que exigia um bloco de nível superior. O reposicionamento usa
velocidade, aplicação e limite da tela, todos já ensinados. Os blocos são conferidos contra as
listas versionadas dos cursos até Explorador e não acrescentam conquistas manuais.

O primeiro ensaio real reprovou o lançamento porque a verificação pressupunha que a bolha ainda
estivesse em voo após um possível acerto. Lançamento e captura agora usam tentativas separadas.
O extra do segundo alvo captura ambos antes de verificar o reinício. Seu conjunto de checkpoints
foi reduzido ao limite contratual de oito; o ensaio agora recusa regras inválidas, em vez de filtrá-las.

A bolha envolve visualmente o alvo ao capturá-lo. Os botões e recados foram afastados dos
controles direcionais, inclusive na janela de 640 × 480. O placar fica no cabeçalho.

A abertura direta de Playwright no Bun travou neste Windows. Essa tentativa foi encerrada,
incluindo seus processos de navegador. A ferramenta de conferência usa Bun apenas para gerar
a prévia e Node para controlar o Chrome, como o teste do executor. As tentativas finais
encerraram com código zero.

## Prints e gestos

- [Computador, 1280 × 844](2026-10-29-recife-desafio-computador.png)
- [Celular emulado, 390 × 844](2026-10-29-recife-desafio-celular.png)
- [Janela compacta, 640 × 480](2026-10-29-recife-desafio-compacto.png)

Os prints mostram uma captura com um ponto. No computador, o ensaio usou teclado e mouse.
No celular emulado, segurou a seta com entrada de toque pelo protocolo do navegador e tocou
nos botões. O leitor da instrumentação apenas observou o jogo, sem mudar suas variáveis.
O ensaio também conferiu o reinício por clique, ausência de rolagem horizontal e ausência de
erros no console ou na página. Requisições externas são bloqueadas e consideradas falha.

## Limites e acompanhamento

Celular físico e importação/publicação no Admin ficam para depois. O quadro 6 deve estar
disponível e a análise do Members deve conferir o currículo publicado no momento da importação.
Não houve escrita em banco, alteração de salvamento, Blender, código do jogo, .env ou CI.

O conector Artifact não está disponível nesta sessão. A especificação recebida e os documentos
locais foram usados; não há alegação de leitura ou atualização do Canvas. Nota para a coleção
de acompanhamento, conforme a orientação de atualização manual:

> fase3-05: manifesto Mira de bolhas preparado e validado. Um Quadro das Cores, três desafios
> do dia, extras de Enter, oito projetos em blocos e SVGs embutidos. Contrato, Blockly, HTTP
> em memória e executor real conferidos. Prints de computador e celular emulado em docs/qa.
> Importação e publicação no Admin pendentes. Nenhum progresso de pessoa alterado.
