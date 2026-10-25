# Revisão aprofundada das extensões Python

Base: `44af4842022571789843efaa28db0e1f5a2d3917`, staging local em 25/10/2026.

O checkout de início já incluía o complemento `d7de2a3b8`, que adicionou as permissões Pygame-ce ao currículo e empacotou o catálogo integrado. Esse complemento foi preservado.

Escopo: Turtle, Pygame Zero, Pygame-ce, Raylib 2D e Raylib 3D; contratos, seleção e persistência de blocos, instalação/remoção, carregamento, protocolos e renderizadores, exemplos, bibliotecas nativas e exportação. Os ajustes desta revisão são locais; não ativam uma release remota.

## Conclusão técnica

As extensões já compartilham uma arquitetura: documento Python, autoridade por release, codecs sobre o AST do CPython, carregamento sob demanda e execução no worker protegido. Não são cinco sistemas independentes. As inconsistências relevantes estavam na proteção das operações, na primeira paleta do Pygame-ce, na exportação de um módulo auxiliar e na verificação contínua da galeria.

Os motores gráficos diferentes são uma escolha coerente com as bibliotecas ensinadas. Turtle conserva geometria e semântica Python com desenho retido; Pygame Zero transmite comandos; Pygame-ce preserva a biblioteca real e transmite pixels; Raylib usa WebGL2 e compartilha o núcleo entre 2D e 3D. Trocar todos pelo mesmo transporte acrescentaria custos e mudanças de compatibilidade sem um ganho demonstrado. A revisão padroniza os contratos compartilhados e conserva essas diferenças.

## Inventário atual

Os números de blocos incluem codecs de leitura oculta; a primeira paleta soma suas dependências de Programação.

| Extensão | Codecs | Visíveis | Conceitos iniciais | Programas | Entradas na galeria |
| --- | ---: | ---: | ---: | ---: | ---: |
| Turtle | 85 | 72 | 24 | 22 | 42 |
| Pygame Zero | 60 | 59 | 22 | 58 | 116 |
| Pygame-ce | 84 | 84 | 23 | 9 | 18 |
| Raylib 2D | 137 | 137 | 18 | 9 | 18 |
| Raylib 3D | 183 | 183 | 27 | 8 | 16 |
| Total | 549 | 535 | — | 106 | 210 |

Há 104 apresentações em Blocos e 106 em Código. Dois programas Turtle existem somente na apresentação Pro. Os programas de início, simulação, desenho e jogos com campanha têm propósitos diferentes; vitória e derrota se aplicam aos jogos que apresentam essas regras.

## Achados e correções

### R1 — Remoção de Pygame Zero/Pygame-ce sem conferir o código — P1, corrigido

`pythonExtensionCodeCheck` e `changePythonExtension` analisavam Turtle e Raylib, mas removiam as outras duas extensões diretamente. Um programa continuava salvo e passava a falhar por perder a biblioteca.

A análise agora precede a remoção das cinco extensões. Para Pygame Zero ela cobre `pgzero`, `pgzrun` e `pygame`; para Pygame-ce, `pygame` e `pinta`. O mesmo controle de concorrência, troca de autorização e preservação de arquivos/histórico continua ativo. Testes reproduziram a falha em Classic e Pro e passaram depois da correção.

### R2 — Dependências implícitas do Pygame Zero e auxiliar Turtle — P1, corrigido

Pygame Zero fornece `Actor`, `screen`, `keyboard` e callbacks sem exigir import. Uma busca só por imports seria insuficiente. A análise reconhece os nomes fornecidos e callbacks do entrypoint, inclusive um callback atribuído como valor, e respeita os nomes locais. Turtle inclui também `formas_do_pinta` entre seus imports dependentes. Módulos próprios continuam sombreando os fornecidos pelo Studio.

Esta é uma análise sintática e conservadora de referências, não a execução nem a prova de todos os efeitos dinâmicos possíveis de um programa Python.

### R3 — Troca Raylib 3D → 2D ignorava aliases — P1, corrigido

A busca por grafias diretas deixava passar `from pyray import draw_cube as cubo`, mas podia acusar métodos alheios chamados `draw_cube`. O verificador considera imports explícitos, aliases e nomes C, incluindo `raylib.rl`. Imports explícitos de funções 3D também contam quando são reexportados por um módulo auxiliar. Métodos de objetos sem imports correspondentes não são acusados apenas pela grafia.

### R4 — Exportação Pygame-ce quebrava `import pinta` em entrypoint com subpasta — P1, corrigido

`pinta.py` e fontes eram sempre copiados para a raiz, embora `python src/main.py` procure imports inicialmente em `src/`. O exportador agora os coloca ao lado do entrypoint. A proteção de arquivos, diretórios e diferenças de caixa do autor foi preservada. Além do teste de exportação, o pacote gerado foi executado com Python 3.14.2 e pygame-ce 2.5.7: `nested-export-ok 27`.

### R5 — Parâmetro opcional de áudio gerava AST incompatível com os blocos — P2, corrigido

O default `-1` de repetição era uma Constant negativa, enquanto o editor exige o nó de sinal do CPython. Habilitar a opção falhava ao gerar o código. O sinal agora é um `UnaryOp`. A nova verificação transversal percorre os defaults e controles opcionais dos 549 codecs das cinco extensões e confirma o retorno ao mesmo AST.

### R6 — `pygame.display.update(None)` mostrava um quadro novo — P2, corrigido

A ponte confundia `update()` com `update(None)`. Agora a segunda forma conserva a tela, conforme a biblioteca nativa. A regressão foi reproduzida no pygame-ce real e verificada também no worker: a imagem azul permanece apesar de uma alteração vermelha na Surface; a atualização seguinte mostra o vermelho.

Atualizações parciais com retângulos ainda enviam a tela inteira, conforme o limite documentado da ponte. Essa diferença não foi apresentada como equivalência integral ao SDL.

### R7 — Primeira paleta Pygame-ce não permitia desenhar um jogo — P1, corrigido

Os oito conceitos iniciais ofereciam inicialização e alguns objetos, mas faltavam desenho, preenchimento, `Clock.tick`, laço e operações de colisão. A primeira paleta passa a oferecer 23 conceitos, com dependências explícitas para repetição e propriedades. Um teste projeta um programa com janela, movimento, colisão, pontuação, texto e desenho e confirma que todos os seus blocos estão disponíveis no primeiro nível.

Nenhum ID ou API existente foi trocado. A política continua exigindo a aprovação do host para os blocos e suas dependências.

### R8 — Quatro implementações duplicadas do carregamento — P2, corrigido

Turtle, Pygame Zero, Pygame-ce e Raylib repetiam controle de timeout, concorrência, cancelamento e falha parcial. `extensionFiles.ts` concentra esse comportamento. Os contratos de arquivos e limites continuam específicos; a wheel pygame-ce mantém sua validação adicional. Testes cobrem cancelamento de todas as requisições com o motivo original, limites por arquivo, erros e retorno dos caminhos esperados. Os cinco motores foram executados no navegador após a extração.

### R9 — Metadados duplicados e descrições excessivas de compatibilidade — P2, corrigido

Os IDs das extensões de tela agora têm um contrato leve compartilhado por catálogo e runtime. O teste de carregamento comprova que a galeria JavaScript não traz payload Python e que consultar metadados Python não importa o interpretador ou os renderizadores. As instruções de instalação leem as versões fixadas nos contratos. Foram retiradas afirmações de que as adaptações são a biblioteca nativa integral.

### R10 — Recibos das três galerias divergiam do catálogo integrado — P1, corrigido

Os checks de Turtle, Pygame Zero e Raylib recusaram os recibos versionados porque a ordem dos codecs havia mudado na integração. O código dos exemplos não foi alterado para contornar a prova.

Foram produzidos 95 recibos novos: 20 Turtle, 58 Pygame Zero e 17 Raylib. A prova percorreu 71.169 blocos e 268 edições causais, com zero nós opacos. Cada programa passou por criação, serialização e restauração de workspace, edição em Blockly, geração de Python e reanálise do AST. As evidências anteriores foram mantidas. Os manifests agora apontam para os recibos atuais e todos os checks de geração passaram.

O novo `scripts/python/requalify-gallery.ts` reproduz esse processo com uma distribuição explícita. A análise usou CPython/WASM 3.14.2, com o carregador real de autoria; nenhuma capacidade de execução ou publicação é concedida por esse procedimento.

### R11 — Testes de pintura tinham dependências e sincronização incorretas — P2, corrigido

Um smoke Pygame-ce podia ler a tela antes da primeira pintura: janela existente e processo em execução não significam que o primeiro quadro já foi mostrado. A prova agora espera a mesma condição de pixels que já exigia, com o timeout existente.

A cena sintética de camada retida Turtle dependia do checkout externo de Space Arena, embora não executasse esse jogo. Ela agora usa a fixture Turtle própria do repositório e compara sua identidade com a configuração do host atual. A exigência de igualdade de pixels entre pintura progressiva e pintura única foi mantida e passou.

### R12 — Ponte Pygame-ce e cobertura Python 3.14 não participavam do CI — P2, corrigido

O job `studio-python-extensions` instala Python 3.14.2, verifica a cobertura em blocos dos nove jogos Pygame-ce e roda os testes da ponte e do Pinta com pygame-ce 2.5.7 nativo. Ele foi incluído entre os requisitos do deploy de staging. Os comandos equivalentes passaram localmente; o novo job remoto ainda precisa ser executado pelo CI.

### R13 — Cobertura de galeria não acompanhava todas as famílias — P2, corrigido

Turtle ganha testes de desenho, entrada e encerramento dos seus 22 programas, ligados à configuração canônica de testes Python. A lista manual de exemplos Pygame Zero foi substituída pelo manifest da galeria; os mesmos 58 casos existentes foram preservados, na mesma ordem. Raylib e Pygame-ce já derivavam seus testes dos manifests.

## Evidência de funcionamento e resultado

Já verificado sobre os ajustes:

- 134 testes de navegador passaram no Chrome/Windows, incluindo os 106 programas e os contratos de API, persistência, entrada, cancelamento, desenho e atualização de tela.
- Os nove jogos Pygame-ce executaram 1.800 quadros roteirizados cada pelo caminho da ponte, sem falhas. Essa prova de execução não substitui a verificação de todos os finais e caminhos dos RPGs.
- Os 48 roteiros Pygame Zero passaram na biblioteca nativa, incluindo fases, vitória/derrota, reinício, pontuação, menus e física conforme cada roteiro.
- Os 17 roteiros Raylib passaram na biblioteca nativa, incluindo construção, colisões, campanha, combate, câmera e reinício conforme cada jogo.
- Os diferenciais Raylib passaram: 155 grupos de matemática/2D, 17 de câmera/colisão 3D, 99 de malhas e 503 de modelos/animações GLB, sem diferença bit a bit frente à referência Windows/UCRT.
- Os 194 arquivos Python de exemplos compilaram com CPython 3.14.2. Os nove jogos Pygame-ce passaram na cobertura completa de seus módulos em Blocos, sem nós opacos.
- A exportação com entrypoint em subpasta executou o Pinta e uma fonte nativamente.
- Screenshots de Turtle, Pygame Zero, Pygame-ce e Raylib foram capturadas. Foram inspecionadas também cenas Pygame-ce complexas e a correspondência visual de Mundo de Blocos com a referência nativa.
- O teste de carga Pygame-ce passou com média de 54,1 FPS, com mapa completo, transparência, sprites, transformações e texto. Na repetição sobre o runtime final combinado, passou com 48,9 FPS (cinco amostras entre 47,9 e 49,9 FPS). As duas execuções superaram o requisito de 45 FPS.
- Uma medição exploratória de pintura dos nove jogos Pygame-ce, após aquecimento e com 120 intervalos por jogo, encontrou oito entre 59,5 e 60,0 FPS e Python Monsters em 45,2 FPS. São medidas do trecho inicial executado no Chrome/Windows desta máquina, não garantias para todas as cenas ou dispositivos.
- A sintaxe YAML do novo job e sua inclusão nas dependências de staging foram verificadas. A análise estática dos 31 arquivos TypeScript/JSON alterados passou.
- A suíte canônica do Studio passou: 11.108 testes, zero falhas, 809 arquivos em 149 processos isolados. Os quatro testes existentes de `checkRunner` foram ignorados porque o executável configurado em `/opt/pw-browsers/chromium` não está presente neste Windows; os Playwrights Python usaram o Chrome instalado.
- Os typechecks de Studio, Members e Member Shell passaram; o do Studio foi repetido depois do ajuste final da paleta e novamente sobre a integração final.
- A staging avançou durante a revisão. Foram preservados `4fccd36a7` e `ead28d075` (arcos entre hosts e sincronização de um teste Pinta), com 8 regressões de pixels/75.678 asserções e os 25 casos isolados do painel Pinta aprovados sobre a combinação.
- A regressão de navegador após incorporar esses commits passou: 74 casos, incluindo os 63 de Pygame Zero, os 10 de Pygame-ce e o teste de carga. Os demais motores não receberam mudanças nessa integração.

Distribuição da rodada completa de 134 casos: `066ad195db035e955d89c6fe2341512c925cdbae76e0caceb60491d5153d03b3`. Distribuição final combinada, verificada nos 74 casos afetados: `dc38452afeec4167da4196c77b03b5395ee573b5228ca8115f76e19c6ede17de`. Os recibos de autoria registram a distribuição de análise `f92f982520a1925d2b291e311332de654967140dbdc9902ff2036e9a52fe2391`. A comparação dos manifests confirmou bytes idênticos para o worker de análise, CPython/Pyodide e biblioteca padrão. O frame de inicialização mudou com a extração dos metadados das extensões; o compilador e a análise usados nos recibos permaneceram iguais.

Evidências locais adicionais: `packages/studio/.cache/python-extensions-review-full-suite-verified.log`, `packages/studio/.cache/python-extensions-review-browser-verified.log`, `packages/studio/.cache/python-extensions-review-browser-integrated.log` e `.cache/python-extensions-review/`. Os 95 recibos causais estão versionados nos diretórios de evidência das três galerias em `docs/continuity/`.

## Decisões mantidas e limites

A versão de pygame-ce de referência do Pygame Zero não precisa ser igual à wheel da extensão Pygame-ce: a primeira valida uma adaptação de API, a segunda executa uma biblioteca compilada real. Ambas têm versões explícitas e exportação coerente com seu contrato.

O transporte de pixels do Pygame-ce preserva suas operações nativas, mas tem custo de banda de memória proporcional à resolução. Listas de desenho, cenas retidas e WebGL2 continuam apropriados às outras bibliotecas. A decisão de migrar um motor exigiria comparar o mesmo trabalho e a compatibilidade; não foi inferida somente da quantidade de código.

Recursos nativos ausentes, limitações da ponte de áudio, contexto WebGL2 e requisitos do navegador continuam documentados. As provas de browser desta revisão são locais no Chrome/Windows. Alterações em arquivos do runtime precisam do processo normal de construção, qualificação e ativação de uma nova release; não foram publicadas remotamente por esta revisão.

Contrato de manutenção consolidado: `packages/studio/docs/python-extensions.md`.
