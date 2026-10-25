# Contrato das extensões Python

As cinco extensões usam o mesmo documento Python, a mesma autorização por release, a mesma infraestrutura de blocos e o mesmo worker protegido. A biblioteca escolhida define a API que o aluno aprende e como o desenho chega à tela.

| Extensão | Implementação no navegador | Referência para o computador |
| --- | --- | --- |
| Turtle | Engine Python com backend de desenho e eventos do Studio; cena retida e descarte de recursos por execução | Turtle do Python 3.14.2, com Tk disponível |
| Pygame Zero | API adaptada; listas de desenho, atores, eventos, áudio e cache de imagens | pgzero 1.2.1 sobre pygame-ce 2.5.8 |
| Pygame-ce | pygame-ce 2.5.7 real em WebAssembly; ponte para tela, entrada, tempo e áudio | pygame-ce 2.5.7, `pinta.py` e fontes exportados |
| Raylib 2D | API Python adaptada e renderer WebGL2 | raylib-python-cffi 6.0.1.0 |
| Raylib 3D | Mesmo núcleo de Raylib, com câmera, malhas, modelos, animações e shaders 3D | raylib-python-cffi 6.0.1.0 |

O contrato de cada biblioteca está em `src/runtime/python/<biblioteca>/contract.ts`. A identidade comum das cinco extensões fica em `canvasExtensionContract.ts`, que contém somente metadados. Catálogo, agrupamento da galeria e autoria não devem carregar o interpretador ou os renderizadores.

## Autoria e progressão

- Um projeto instala uma extensão de tela por vez. Raylib 2D e 3D podem ser trocadas diretamente, com análise antes de reduzir recursos.
- Instalação e blocos dependem da autorização atual do host e da release. Selecionar uma extensão não concede capacidades por si só.
- Cada conceito usa `PythonBlockCodec` e preserva o AST. Um parâmetro opcional deve gerar Python válido quando habilitado. Números negativos têm nó de sinal, como no AST do CPython.
- A primeira paleta deve permitir um programa funcional: inicialização, repetição/eventos, entrada e desenho. No Pygame-ce ela inclui também movimento por propriedades, retângulos, colisão, placar, imagens, fontes e som, antes de exigir classes.
- A progressão aumenta por nível; dependências necessárias continuam explícitas e sujeitas à autorização. Não se ampliam permissões para completar uma paleta.
- Os programas da galeria são fontes editáveis e recursos do projeto. A qualificação visual exige zero nós opacos, persistência do workspace Blockly e reanálise do Python gerado.

## Ciclo de vida e carregamento

`extensionFiles.ts` concentra o carregamento de arquivos imutáveis: requisições concorrentes, orçamento de bytes por arquivo, timeout de 30 segundos, cancelamento pelo proprietário e cancelamento dos demais arquivos quando um falha. Os módulos de cada biblioteca declaram seus próprios arquivos e limites; a wheel pygame-ce conserva sua verificação adicional de tamanho. A distribuição e o host mantêm a responsabilidade pela integridade e autorização dos artefatos.

Renderizadores e protocolos preservam as diferenças de cada biblioteca: Turtle mantém uma cena, Pygame Zero envia comandos, Pygame-ce envia pixels, Raylib usa WebGL2. Não existe motivo para impor a todas o transporte mais caro. Teclas, ponteiros, áudio, timers, imagens e recursos gráficos pertencem à execução e são encerrados quando ela é parada.

Antes de remover uma extensão, a análise confere imports e módulos próprios que os sombreiam. Pygame Zero também fornece nomes e callbacks sem import, que precisam ser conferidos no entrypoint. A redução Raylib 3D → 2D inclui nomes C, aliases e imports explícitos de funções 3D; um import não usado pode precisar ser retirado. A análise sintática não executa o programa nem constitui uma prova de todos os comportamentos dinâmicos possíveis em Python.

## Exportação e compatibilidade

O código exportado usa as dependências nativas fixadas nos contratos. `pinta.py` e suas fontes ficam ao lado do entrypoint, inclusive quando ele está em uma subpasta. Arquivos e nomes reservados pelo autor são preservados. SVGs do Pygame Zero recebem equivalentes PNG para o carregador nativo.

As adaptações não representam toda a API de um sistema operacional. Recursos que dependem de janelas nativas, dispositivos ou extensões gráficas ausentes seguem os limites documentados de cada biblioteca. A ponte de áudio tem limitações de transição e posicionamento; consulte `src/runtime/python/pygame/README.md`. O Pygame-ce envia a tela completa nas atualizações parciais; `display.update(None)` conserva a imagem exibida.

## Verificação e manutenção

1. Execute `bun run test` e o typecheck do Studio.
2. Confira `check:python-text-sources`, `check:python-visual-examples`, `check:pgzero-games`, `check:raylib-games` e `check:pygame-games`.
3. Execute `scripts/python/pygame-block-coverage.ts --check` com `PYTHON` apontando para CPython 3.14.2. Rode `test-pygame-bridge.py` e `test-pinta-module.py` com pygame-ce 2.5.7 real.
4. Execute os Playwrights de Turtle, Pygame Zero, Pygame-ce e Raylib contra uma distribuição local recém-compilada. O teste Turtle de galeria cobre os 22 programas; os de Pygame Zero, Pygame-ce e Raylib derivam das respectivas galerias.
5. Mudou a ordem do catálogo? Requalifique os exemplos; não altere o hash de um recibo manualmente. `scripts/python/requalify-gallery.ts` recebe `--node`, `--distribution`, `--distribution-sha256` e `--runtime-release`; preserva as evidências anteriores, verifica edições causais e grava novos recibos. Depois regenere os metadados de blocos.

O job `studio-python-extensions` confere a cobertura dos nove jogos Pygame-ce com Python 3.14.2 e testa sua ponte e o Pinta com a biblioteca nativa. Ele participa do gate de staging. A publicação de novos bytes de runtime e sua ativação permanecem no processo de releases imutáveis, separadas da qualificação local.
