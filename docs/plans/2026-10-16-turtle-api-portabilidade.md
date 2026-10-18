# Turtle: API, blocos, execução web e portabilidade desktop

16/10/2026 · Revisão 3 · Anexo normativo da [proposta JavaScript/Python](2026-10-16-estudio-javascript-python-turtle-proposta.md). Contrato proposto, ainda não implementado ou homologado.

## 1. Promessa ao aluno

O aluno aprende Python e a API Turtle. Os rótulos dos blocos usam português acessível; nomes do módulo, métodos e parâmetros da biblioteca continuam os oficiais. Nomes criados pelo aluno podem estar em português, como `tartaruga` ou `desenhar_flor`.

Turtle é extensão opcional do projeto, tanto no Clássico quanto no Pro. O núcleo **Programação** funciona sem ela; contém variáveis, decisões, repetições, coleções, funções e demais famílias contratadas na seção 7 da proposta. Turtle acrescenta sua categoria gráfica e reutiliza esses fundamentos. Templates/aulas podem declará-la previamente adicionada. O fluxo de adição/remoção, imports sem extensão e preservação de fontes/materiais está definido na seção 5.0 da proposta.

No navegador, uma implementação compatível desenha no Canvas. No desktop, a fonte exportada usa o Turtle da instalação CPython. Não instalar `turtle` do PyPI. Não anunciar a implementação web como distribuição original da Python Software Foundation.

O contrato de portabilidade é restrito à API e aos formatos abaixo. Tkinter completo, widgets nativos e acesso a objetos de janela do sistema operacional não fazem parte dele. Isso não reduz nenhum recurso JavaScript existente.

Referência semântica: família Python **3.14**, alinhada à candidata Pyodide examinada. O ensaio fixa também patch de CPython e Tcl/Tk. Python 3.14 acrescenta suporte a PNG no registro de formas; por isso não prometer que todos os exemplos gráficos funcionam em versões Python anteriores. [Referência oficial versionada](https://docs.python.org/3.14/library/turtle.html).

Fixar o patch é obrigatório também para eventos: não misturar o código de `turtle.py` 3.14.2 com mudanças posteriores do branch 3.14. Atualizar a referência semântica exige nova versão de contrato e repetir conformance. Compatibilidade de linguagem não significa pixels ou tempos de relógio idênticos entre sistemas.

## 2. Exemplo de continuidade

Rótulos visuais: “criar tartaruga”, “repetir 4 vezes”, “andar 100 passos”, “virar 90 graus à direita”. A Ponte gera:

“Repetir” pertence a **Programação → Repetições**; criar e mover a tartaruga pertencem à extensão **Turtle**. O exemplo pressupõe a extensão adicionada ao projeto.

```python
import turtle

tartaruga = turtle.Turtle()
for lado in range(4):
    tartaruga.forward(100)
    tartaruga.right(90)

turtle.done()
```

Esse mesmo `main.py` é entregue na exportação. O código não contém imports do Sistema Zero, FFI JavaScript, `await` acrescentado pelo gerador ou chamadas a helpers privados. O launcher web e a adaptação gráfica pertencem ao ambiente de execução.

O conjunto de blocos exige esse grau de portabilidade. Código escrito livremente no Pro pode sair dele; nesse caso a análise explica a dependência adicional, sem apagar o arquivo ou garantir compatibilidade inexistente.

## 3. Catálogo inicial contratado

Esta é uma seleção intencional de recursos para criação e jogos simples. Cada item inclui a assinatura, defaults, getters/setters e aliases oficiais aplicáveis, descritos no manifesto executável de conformance da implementação. Abaixo, os nomes principais identificam famílias; não se deve inferir suporte a todas as APIs Turtle por existir uma dessas famílias. O [módulo de referência do CPython 3.14.2](https://github.com/python/cpython/blob/v3.14.2/Lib/turtle.py) orienta a comparação, além da documentação versionada.

| Família | API principal | Linguagem nos blocos |
|---|---|---|
| Objetos | `Screen`, `Turtle`, `getscreen` | criar tela, criar tartaruga, tela da tartaruga |
| Movimento | `forward`, `backward`, `left`, `right`, `goto`, `setx`, `sety`, `home`, `setheading` | andar, voltar, virar, ir para, mudar direção |
| Consultas | `position`, `xcor`, `ycor`, `heading`, `distance`, `towards` | posição, direção, distância até |
| Traço | `penup`, `pendown`, `isdown`, `pensize`, `pencolor`, `fillcolor`, `color` | levantar/baixar lápis, espessura, cor |
| Desenho | `circle`, `dot`, `begin_fill`, `end_fill`, `filling`, `write` | círculo, ponto, preencher, escrever |
| Aparência | `shape`, `shapesize`, `showturtle`, `hideturtle`, `isvisible`, `speed` | aparência, tamanho, mostrar, esconder, velocidade |
| Cópias/marcas | `clone`, `stamp`, `clearstamp`, `clearstamps`, `clear`, `reset` | copiar tartaruga, carimbar, apagar |
| Tela | `bgcolor`, `bgpic`, `setup`, `title`, `colormode`, `turtles`, `getshapes` | fundo, imagem de fundo, tamanho da tela, título |
| Formas | `register_shape`, `addshape` | cadastrar imagem ou polígono |
| Atualização | `tracer`, `update`, `delay` | atualizar desenho, atualizar agora, intervalo |
| Teclado | `listen`, `onkey`, `onkeypress`, `onkeyrelease` | ouvir teclado, ao apertar/soltar tecla |
| Mouse | `onclick`, `onscreenclick`, `onrelease`, `ondrag` | ao clicar/soltar/arrastar |
| Tempo/encerramento | `ontimer`, `mainloop`, `done`, `bye`, `exitonclick` | depois de um tempo, manter tela aberta, encerrar |

Os aliases e formas procedurais são aceitos no código quando correspondem às famílias contratadas; o gerador prefere uma grafia canônica legível. Operações homônimas de Screen/Turtle têm contratos distintos: apagar traço de uma tartaruga não equivale a apagar toda a tela. O registro da implementação deve listar explicitamente ambas, incluindo as variantes globais necessárias, sem resolver chamadas só pelo nome.

O manifesto de conformance terá uma entrada por **nome público e proprietário** (`turtle`, `Turtle` ou `Screen`), com assinatura/defaults, aliases, retorno, erros, efeito e fixture de referência. `forward/fd`, `backward/back/bk`, `right/rt`, `left/lt`, `goto/setpos/setposition`, `setheading/seth`, `position/pos`, `penup/pu/up`, `pendown/pd/down`, `pensize/width`, `showturtle/st`, `hideturtle/ht` e `register_shape/addshape` não podem divergir. A tabela não autoriza sintetizar assinatura pelo nome de um bloco. O manifesto é gerado/verificado contra o patch fixado e revisado antes de implementar cada família; uma API fora da seleção continua explicitamente indisponível, mesmo quando aparece nos stubs completos de desktop.

O runtime suporta as famílias acima no Pro. A paleta divulga gradualmente controles avançados, sem impedir uso textual dos métodos contratados. Toda família anunciada precisa de exemplos executáveis e casos de entrada inválida. Adicionar outro método exige expandir conformance, documentação, stubs, portabilidade e, quando houver bloco, os quatro codecs.

`Turtle` precisa ser classe Python extensível: herança, `super().__init__`, métodos vinculados e atributos definidos pelo aluno funcionam com semântica Python normal. Não expor somente uma factory/proxy rígido que falha ao importar jogos orientados a objetos. Atribuir um campo com nome de método obedece às mesmas regras de sombreamento Python; o renderer não pode usar esse atributo público como controle interno oculto. Classes simples têm blocos no núcleo Python, conforme a revisão 3 da proposta; herança continua fora da representação visual inicial, sem impedir seu uso textual compatível.

### 3.1 Limites explícitos

- `getcanvas`, `RawTurtle` com Canvas Tk externo, widgets Tk, integração com IDLE, configuração de janelas do sistema e rotinas privadas ficam fora do perfil web.
- Exportação PostScript, undo interno do Turtle, formas compostas e transformações avançadas não são anunciados neste catálogo inicial. Desfazer/refazer **edições do projeto** continua disponível pelo editor, independentemente do undo da biblioteca.
- `register_shape` inicial cobre imagens e polígonos simples. Não fingir aceitar uma forma composta e desenhar apenas parte dela.
- Recursos fora do contrato geram erro explicativo, com referência ao original. Nunca um no-op silencioso ou valor falso que permita continuar como se a operação tivesse ocorrido.
- Bibliotecas/formatos futuros são outro incremento de catálogo. A versão do contrato impede uma atualização alterar silenciosamente projetos publicados.

## 4. Comportamentos que precisam coincidir

### 4.1 Estado e geometria

Coordenadas, orientação, graus/radianos quando oferecidos, sinais, posição, caneta, cor, visibilidade, retorno de consultas e independência entre tartarugas seguem o perfil. Consultas observam o estado semântico correto na ordem do programa. A renderização não pode apresentar estado atrasado como resultado de uma consulta.

Qualificar overloads reais: `goto` com par de números ou tupla e `distance` com números, coordenada ou outra tartaruga. Consultas geométricas são calculadas no estado Python; não fazem uma ida e volta ao Canvas por colisão. Nomes de cor Turtle/Tk não são simplesmente strings CSS: por exemplo, `dodger blue` exige normalização/tabela compatível. O manifesto identifica nomes/RGB aceitos, retorno dos getters e erros; cor inválida não mantém silenciosamente o último estilo do Canvas.

Transformação Canvas usa coordenadas do mundo, tamanho lógico e escala de pixels. Redimensionar o painel não muda coordenadas do programa. Tamanho lógico de `setup` permanece estável; o preview pode escalar a apresentação. O desktop abre sua janela nativa. `title` identifica o palco no estúdio e a janela fora dele, sem tentar controlar o navegador.

Comparação de geometria usa tolerância numérica definida nos testes. Rasterização, fontes e antialiasing diferem entre Canvas e Tk; não exigir igualdade byte a byte de screenshots. Testar alinhamento, posição e limites visuais com tolerâncias registradas.

`write(..., move=True)` depende da largura calculada do texto e, portanto, pode alterar também a posição posterior da tartaruga entre sistemas com fontes diferentes. Testar a regra de posicionamento e registrar as fontes/métricas utilizadas; não prometer igualdade numérica universal nesse caso. O código permanece portátil, mas um jogo que usa medida de texto como regra geométrica precisa considerar essa diferença de ambiente.

### 4.2 Animação e eventos

`speed`, `tracer`, `update` e `delay` precisam influenciar o desenho como documentado no contrato, não somente acumular um desenho final. A execução de movimento síncrono pode suspender internamente enquanto o navegador trabalha; a fonte do aluno permanece síncrona.

Um scheduler controla entradas externas no interpretador. Listeners JavaScript enfileiram eventos; não chamam PyProxy síncrono diretamente. O próprio módulo Turtle bombeia a fila no fluxo Python durante os pontos de atualização/animação e em `mainloop`. Não iniciar um segundo `runPythonAsync` enquanto a avaliação principal está suspensa. A API `run_sync` ainda é marcada experimental na documentação atual; a release fixada e suas provas são condição de liberação, não evidência já obtida. [Contrato oficial](https://pyodide.org/en/stable/usage/api/python-api/ffi.html#pyodide.ffi.run_sync).

`mainloop`/`done` mantêm processamento de eventos. `ontimer` agenda callbacks sem introduzir espera ocupada. Timers não são relógio de tempo real: as provas verificam ordem e limites de atraso tolerados, além de cancelamento ao parar/reiniciar. Repetição de tecla, foco, coordenadas de mouse e remoção de listeners têm casos próprios.

Não drenar a fila apenas depois de o script terminar. Na referência 3.14.2, movimentos e atualizações podem despachar eventos antes de `mainloop`. São provas obrigatórias: timer que encerra `while` com movimento; callback que desenha/chama `update`; efeito de `tracer(0)`; callback que falha; encerramento por `bye` dentro de callback. Registrar traces de referência para definir reentrância, ordem e tratamento de exceções. Uma exceção em callback é reportada conforme a referência, sem virar automaticamente término fatal de toda a sessão. Se a candidata não reproduzir os comportamentos contratados, L0 rejeita a arquitetura antes de ampliar os blocos.

REPL aceita comandos quando o programa está concluído ou em ponto de espera expressamente suportado pelo bombeamento da biblioteca. Neste último caso, o comando entra pela própria fila, sem uma segunda avaliação concorrente. `input()` pendente recebe texto pela entrada padrão, não comandos REPL. Durante computação sem ponto de cooperação a interface exige Parar; não prometer console interativo em qualquer linha arbitrária.

Qualificar também `time.sleep` para atrasos não negativos usados pelos exemplos. A release Pyodide candidata possui caminho próprio de suspensão quando `run_sync` está disponível; não acrescentar monkeypatch da plataforma nem reescrever os programas. Liberar o event loop JavaScript durante a espera não autoriza despachar callbacks Turtle que CPython/Tk ainda não despacharia. Testar duração/ordem, CPU, `sleep(0)`, espera longa, callback que dorme e Parar/reiniciar. Argumentos inválidos e fallback upstream entram no relatório de diferenças; não prometer compatibilidade de toda a stdlib. [Implementação Pyodide 314.0.7](https://github.com/pyodide/pyodide/blob/314.0.7/src/py/pyodide/webloop.py), [contrato Python](https://docs.python.org/3.14/library/time.html#time.sleep).

Parar invalida a geração, termina worker e cancela fila gráfica, RAF, timers, input e promises. A imagem final pode permanecer como imagem estática identificada como execução parada; callbacks não continuam ativos. Reiniciar limpa o palco e começa outra sessão. A limpeza não depende de o Python colaborar.

### 4.3 Recursos

API de arquivos recebe caminhos relativos portáveis, sem URLs assinadas de preview no código. A fonte e o runtime usam a mesma raiz lógica. Materiais da biblioteca são copiados para o pacote exportado respeitando licença e referências; não apontam para a conta do aluno.

Formato de imagem prioritário: PNG, com Python 3.14/Tk homologado, incluindo transparência. GIF estático também deve ser qualificado. Animação de GIF, fontes arbitrárias e formatos adicionais não recebem garantia implícita. O renderer deve manter o comportamento definido para rotação de formas de imagem, em vez de aplicar melhorias visuais que mudem o resultado no desktop.

Para arquivo GIF com vários quadros, verificar o quadro carregado pela referência Tk e manter a representação estática correspondente; não usar automaticamente reprodução animada do elemento HTML de imagem. Isso vale para `bgpic` e formas registradas. [Comportamento do carregador PhotoImage](https://www.tcl-lang.org/man/tcl8.7/TkCmd/photo.html).

O limite de resolução, bytes, objetos e comandos vem do perfil de desempenho. Estourá-lo produz erro recuperável e mantém o projeto. Nenhum arquivo original é apagado ou convertido sem registrar a operação.

Pinta entra pelo contrato de materiais da seção 12.1 da proposta: PNG real de imagem, vetor rasterizado, frame ou mapa achatado. A biblioteca Turtle não conhece os formatos de sprite/colisão da plataforma. Preservar fonte original, identidade da derivação e licença; exportar os PNGs necessários com caminhos locais. Atualizar a criação original não altera uma publicação já feita. Imagens de catálogo/miniaturas não substituem os bytes finais homologados. Integração Python com Molda fica para Raylib 3D; não converter GLB/HDR para Turtle nesta entrega.

## 5. Fonte, Ponte e assistência

Cada bloco tem `blockToIR`, `irToBlock`, `irToCode` e `codeToIR`. O vínculo com uma tartaruga é uma referência a variável/objeto, não apenas texto em um campo. Alterar nome respeita escopo; aliases e imports do usuário são preservados quando possível.

O gerador controla imports necessários, identificadores válidos e indentação. Não usa tradução textual do JavaScript. Comentários e regiões não representáveis continuam sob autoridade da fonte. Eventos preservam referências a funções, argumentos e ordem de registro.

Completion e ajuda mostram a API realmente suportada pelo perfil. Métodos da biblioteca desktop fora desse conjunto são identificados como indisponíveis no navegador. Zappy recebe o mesmo manifesto; não recomenda extensões futuras ou funções privadas como se fossem utilizáveis.

## 6. Exportar para continuar no VS Code

Layout mínimo proposto:

```text
meu-projeto/
  main.py
  ...módulos escritos pelo aluno...
  assets/
  pyproject.toml
  LEIA-ME-SISTEMA-ZERO.md
  .sistemazero/export-manifest.json
```

`pyproject.toml` contém requisitos reais do projeto; para Turtle puro, não acrescenta dependência PyPI Turtle. Se já existe configuração autoral, preservá-la e diagnosticar incompatibilidades, sem sobrescrever o arquivo. A primeira entrega tem lock browser sem pacotes externos; não inventar um lock desktop de wheels onde nenhuma distribuição externa é necessária. O manifesto de exportação informa linguagem, entrypoint, versões de referência, assets, hash da fonte, perfil e limites conhecidos. Não altera o comportamento Python nem é necessário para executar o programa.

Não exportar a implementação web interna, runtime Pyodide, FFI, caches ou toolchain como se fossem fontes do aluno. **Se o próprio aluno criou `turtle.py` ou `turtle/`, preservar o arquivo**, avisar sobre sombreamento e não certificar portabilidade automática; jamais apagar uma fonte autoral para produzir uma exportação aparentemente limpa.

As instruções geradas orientam abrir a pasta no VS Code, selecionar Python compatível, verificar suporte a Tk, instalar dependências declaradas quando existirem e executar **o entrypoint real** a partir da raiz: `python main.py` no clássico ou, por exemplo, `python src/jogo.py` no Pro. O executor web reproduz a execução de script definida na seção 4 da proposta, inclusive diretório de trabalho e precedência de imports. Não trocar silenciosamente para `python -m`. Podem explicar `python -m tkinter` como verificação do ambiente. Não instalar dependências do sistema automaticamente nem sobrescrever configurações VS Code existentes. [Tkinter oficial](https://docs.python.org/3/library/tkinter.html).

O arquivo exportado é uma fotografia dos buffers já sincronizados. Uma edição durante a compactação não se mistura ao ZIP. Fonte, assets, lock e relatório carregam a mesma revisão. A exportação usa o worker de ZIP existente, respeitando cancelamento e memória.

Nomes de documentação/manifesto gerados evitam colisão com arquivos autorais. Validar paths contra traversal, colisões por caixa e nomes inválidos nos sistemas anunciados; informar o conflito em vez de renomear imports silenciosamente. O ZIP fonte não é instalador de aplicativo nem executável empacotado: roda com Python/Tk instalado. Para jogar pelo link público, usar a publicação browser separada, sem exportar ou instalar esse ambiente desktop.

### 6.1 Garantia e diagnósticos

Três informações devem ser distintas:

1. **Perfil portátil homologado:** a biblioteca, catálogo de blocos e fixtures passaram nos dois ambientes.
2. **Projeto dentro do contrato conhecido:** análise não encontrou recursos incompatíveis; código dinâmico pode impedir conclusão completa.
3. **Execução desktop observada:** determinado snapshot e cenário foram executados com CPython/Tk identificados. Isso não prova todos os caminhos possíveis de um programa livre.

O exportador não concede um selo de execução a todo projeto porque um exemplo passou. Imports exclusivos web, dependências não resolvidas, nomes que sombreiam stdlib e caminhos absolutos aparecem com diagnóstico. A fonte pode ser baixada para correção; a mensagem não promete que já executará sem ajustes.

## 7. Como preparar as bibliotecas futuras

O contrato diferencia **distribuição instalada**, **nome importado** e **destino**. Exemplos futuros: distribuição `pygame-ce` → `import pygame`; `pgzero` → APIs do Pygame Zero; `raylib` → interface `pyray` ou `raylib`. Não procurar uma distribuição apenas pelo texto do import.

Uma instalação no navegador resolve wheels/artefatos compatíveis com o runtime web. A exportação desktop declara as versões correspondentes das distribuições upstream e fornece instruções/lock apropriados ao alvo. Não exportar wheel WebAssembly como se fosse um wheel Windows/macOS/Linux; também não copiar `.venv` da plataforma.

O manifesto deve resolver dependências transitivas, marcadores de plataforma, versão Python e hashes quando um lock específico for fornecido. A indicação “funciona no desktop” exige ensaio em instalação limpa para os sistemas anunciados. Pygame Zero e pygame-ce precisam de combinação efetivamente homologada, evitando instalar dois provedores conflitantes do módulo `pygame`.

A adaptação do ciclo de execução deve ser pequena, pública e portátil: pode ficar no executor ou em um entrypoint que funcione também no desktop. Código autoral não depende de `platform.window`, DOM ou FFI sem diagnóstico de portabilidade. Se uma extensão futura precisar de biblioteca auxiliar própria, ela deverá ser distribuída e documentada como dependência real; não poderá ser apresentada como uso exclusivo da upstream.

## 8. Conformance obrigatória

- Mesmos arquivos `.py` e recursos nos ensaios web e CPython/Tk, sem editar a fonte entre ambientes.
- Casos para cada família do catálogo, defaults, aliases, getters/setters, valores inválidos e várias tartarugas.
- Programas com arte procedural, evento de teclado, clique/arraste, temporizador, imagens e módulo auxiliar.
- Timer durante movimento antes de `mainloop`, reentrância de atualização, exceção em callback e encerramento durante callback, contra o patch exato.
- Comparação de estado geométrico, valores de retorno, erros e ordem de efeitos; comparação visual com tolerâncias explícitas.
- Execução exportada em Windows, macOS e Linux para cada sistema anunciado; registrar Python/Tk, comandos e ambiente.
- Reabertura no VS Code e edição real de uma regra, seguida de nova execução com a upstream.
- Entrypoint Pro em subdiretório, imports locais e caminhos de assets; imagens materializadas do Pinta usadas pelos mesmos `.py`.
- Testes de sombreamento, imports web, fonte inválida, recursos ausentes e Unicode em código/caminhos admitidos.
- Nenhum teste desta proposta já foi executado; a matriz descreve o que a implementação deverá demonstrar.

## 9. Repositórios reais como corpus de qualificação

A [análise dos três repositórios enviados pelo usuário](../../.audits/estudio-turtle-repositorios-2026-10-16.md) fixa versões, escopo e restrições. Incorporar ao corpus: corrida com entrada antes da tela; jogo com `while/update/sleep`; jogo multiarquivo com subclasses, carimbos e timers. Não considerar código importado integralmente representável em blocos: classes, generators e outras construções fora da IR visual permanecem como fonte preservada/Pro.

Os originais com `winsound`, comandos externos de áudio, `freegames` ou undo Turtle fora do catálogo são casos de diagnóstico, não obrigação de implementar bibliotecas novas nesta etapa. Uma versão adaptada deve ser identificada como tal; não apagar chamadas e afirmar que o original foi homologado. Reuso em templates exige licença e materiais autorizados; leitura estática não é evidência de desempenho.
