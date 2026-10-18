**Python no Estúdio: catálogo próprio, Turtle e oficinas ao vivo**

Data: 16/10/2026. Parecer exploratório; não é especificação aprovada nem plano de implementação.

Este documento complementa a [análise inicial](estudio-javascript-python-viabilidade-2026-10-16.md) com duas informações dadas pelo usuário: Python teria extensões próprias, sem tradução integral do catálogo JavaScript; as oficinas receberiam uma mistura de alunos da jornada e crianças novas.

**Parecer atualizado:** sou mais favorável à proposta com esse recorte. Há uma experiência educacional identificável: programação visual e textual em Python, com Turtle para criação e pequenos jogos, uma família Pygame para jogos 2D e, eventualmente, Raylib para 3D. O investimento passa a poder ser avaliado por experiências completas e delimitadas. A quantidade de blocos JavaScript existente deixa de ser a referência para dimensionar o catálogo Python.

A conclusão se apoia em documentação primária e leitura do repositório. Não executei esses ambientes Python no navegador desta sessão, não medi desempenho e não validei demanda com alunos. Possibilidade documentada de execução web não equivale a integração validada no Estúdio.

**Valor para a jornada e para as oficinas.**

Manter JavaScript como linguagem principal da jornada e criar uma coleção de oficinas Python parece uma combinação coerente. O aluno atual encontra uma nova linguagem e outra forma de criar; o aluno novo encontra uma porta de entrada que pode funcionar sem conhecer a jornada. O ganho depende de projetos, mediação e progressão, e não apenas da sintaxe.

Repetição de conceitos pode ser produtiva. Um aluno que já usou repetição em JavaScript pode reconhecer a mesma ideia ao desenhar uma composição em Turtle. O que evitaria é vender o mesmo exercício como novidade apenas por convertê-lo para Python. A oficina pode introduzir outro resultado, outra mecânica e novas decisões de autoria.

| Organização possível | Benefício | Limitação | Parecer |
|---|---|---|---|
| Toda oficina obrigatoriamente em Python | Identidade comercial simples | Restringe projetos para os quais JavaScript já é adequado e cria dependência de um catálogo novo | Não adotaria como regra permanente |
| Linguagem escolhida por oficina ou sequência de encontros | Permite uma coleção Python consistente e oficinas JS quando fizer sentido | Exige curadoria clara de projetos e pré-requisitos | Minha preferência |
| Cada criança escolhe JS ou Python dentro da mesma oficina | Mais liberdade individual | Professor precisa acompanhar dois conjuntos de APIs, exemplos e erros ao mesmo tempo | Evitaria na entrada |

Para uma turma mista, a oficina inicial precisa ter um resultado comum alcançável e desafios extras. Em uma composição Turtle, iniciantes modificam movimentos, cores e repetições; alunos experientes criam funções parametrizadas e variações aleatórias. Em um jogo simples, todos conseguem jogar; os desafios adicionais tratam de pontuação, comportamento ou dificuldade. Isso é uma proposta pedagógica, não uma garantia de que qualquer faixa de idade possa compartilhar a mesma atividade.

Uma estrutura útil é PRIMM: prever o resultado, executar, investigar, modificar e criar. A Raspberry Pi Foundation descreve essa abordagem e sua pesquisa; o exemplo apresentado no seminário utiliza Python Turtle. É uma referência para organizar a interação ao vivo, não uma prova de que a nova oferta terá retorno comercial. [Fonte primária](https://www.raspberrypi.org/blog/primm-talk-in-programming-lessons-research-seminar/).

**O papel de cada extensão.**

| Família | Experiências propostas | Papel na aprendizagem | Ponto a validar |
|---|---|---|---|
| Turtle | Arte generativa, desenhos, padrões, corrida de tartarugas, labirinto simples | Entrada visual; sequência, orientação, repetição, funções e eventos | Compatibilidade da implementação web, animação e temporizadores |
| Pygame Zero | Jogos com personagens, coleta, cliques, obstáculos e pontuação | Resultado interativo com pouco código de infraestrutura | Integração web disponível, mas descrita como pouco testada pelo Pygbag |
| Pygame CE | Jogos 2D com maior controle sobre eventos, desenho e atualização | Aprofundamento do funcionamento dos jogos | Loop cooperativo, recursos, áudio, interrupção e reinício no navegador |
| Raylib/Python | Cenas e pequenos jogos 3D com câmera e objetos | Trilha posterior, com maior exigência espacial e de programação | Binding Python, runtime web e recursos concretos usados nas aulas |

Turtle merece uma identidade própria. Ele permite enxergar a execução produzindo uma imagem e relacionar código a movimento. Eu o consideraria a melhor primeira experiência a investigar para esta turma mista. Também consideraria jogos simples em Turtle, sem transformá-lo na biblioteca responsável por todos os jogos 2D.

O Turtle padrão depende de Tkinter. Para o navegador, precisamos de uma implementação compatível com sua API ou de uma extensão explicitamente inspirada nela. Preservar nomes e comportamento conhecidos facilita consultar materiais externos e continuar programando fora da plataforma. Os blocos e as explicações podem permanecer em português. [Documentação do Python](https://docs.python.org/3/library/turtle.html).

Há um precedente concreto: WebTigerPython usa Pyodide e implementa Turtle com PixiJS, comunicando o interpretador em worker com a renderização. Sua lista de funções ausentes inclui `ontimer`, `register_shape` e `bgpic`. Portanto, é uma referência de arquitetura, mas não uma base pronta cuja compatibilidade com jogos possamos presumir. [Documentação da implementação](https://docs.webtigerpython.ethz.ch/tjlibraries/turtle.html).

Pygame Zero oferece uma interface pequena com `Actor`, `draw`, `update` e eventos. Isso o torna atraente para oficinas com jogos. Pygame CE pode oferecer maior controle em experiências posteriores; não é necessário apresentar as duas bibliotecas como escolhas concorrentes para uma criança iniciante. Uma família educacional 2D poderia organizar essa progressão, após verificar a combinação técnica escolhida. [Introdução oficial do Pygame Zero](https://pygame-zero.readthedocs.io/en/stable/introduction.html).

O Pygbag documenta a execução de Pygame Zero por `#!pgzrun`, mas qualifica esse caminho como pouco testado. Assim, há uma possibilidade real a investigar, sem evidência suficiente para prometer compatibilidade integral. Se adotarmos apenas uma API inspirada em Pygame Zero, será preciso identificar essa diferença e entregar a biblioteca correspondente na exportação. [Documentação do Pygbag](https://pygame-web.github.io/wiki/pygbag/).

Raylib também é candidato real: o projeto `raylib-python-cffi` documenta execução web com Pygbag, incluindo o loop assíncrono. O pacote se chama `raylib`; `pyray` é uma das interfaces que ele oferece. Há ressalvas de recursos, como áudio em determinadas combinações. Isso sustenta viabilidade exploratória, não uma garantia para toda API. [Documentação do binding](https://github.com/electronstudio/raylib-python-cffi#running-in-a-web-browser).

Existe ainda o RLZero, uma interface educacional simplificada para Raylib, explicitamente em desenvolvimento. Eu o estudaria como referência de desenho pedagógico antes de considerar uma dependência de produção. [Projeto do autor](https://github.com/electronstudio/rlzero).

**Execução: escolher Python não define sozinho o ambiente.**

O aplicativo pode continuar em TypeScript/React. Python seria a linguagem dos programas das crianças. As extensões podem utilizar renderização e outras partes implementadas em JavaScript ou WebAssembly sem prejudicar esse objetivo.

Pyodide continua sendo candidato para Python geral e Turtle com renderização web. Porém, a documentação atual classifica seu suporte a SDL como experimental e descreve a necessidade de devolver controle ao navegador nos loops. Com jogos no centro da proposta, eu não decidiria antecipadamente que todo o catálogo precisa rodar no mesmo Pyodide. [Documentação oficial do SDL no Pyodide](https://pyodide.org/en/stable/usage/sdl.html).

Pygbag é uma ferramenta de empacotamento e execução web, não outra biblioteca de jogos concorrente do Pygame. Seu projeto fornece um caminho com CPython e pygame-ce em WebAssembly. Ele merece avaliação central para a família de jogos. Isso não significa que qualquer pacote instalado por pip no desktop funcionará no navegador. [Repositório oficial](https://github.com/pygame-web/pygbag).

Há três possibilidades técnicas a comparar, sem compromisso de implementação neste parecer:

| Possibilidade | Ganho | Custo ou incerteza |
|---|---|---|
| Pyodide como ambiente único | Integração geral de Python concentrada | Compatibilidade gráfica de cada biblioteca ainda precisa ser demonstrada |
| Perfis diferentes: Turtle/Python geral e jogos | Cada experiência usa um ambiente adequado | Mais de um executor para manter, com a mesma interface do Estúdio |
| Um ambiente de jogos com Turtle implementado sobre ele | Pode reduzir variedade de runtimes | Exige manter a adaptação Turtle e verificar se a inicialização serve à experiência simples |

Eu manteria a arquitetura aberta a perfis diferentes e escolheria a combinação com evidência de funcionamento. Não carregaria todos os runtimes quando a criança abre um projeto Turtle. Também evitaria transformar cada clique em Executar em uma instalação de pacotes ou reconstrução completa.

**Como isso conversa com o Estúdio atual.**

A interface pode dizer “Linguagem do projeto”. Internamente, um campo enumerado como `programmingLanguage` é mais adequado que `isPython`. Linguagem, clássico/Pro e Blocos/Ponte/Código são dimensões diferentes. O perfil do projeto determina executor e ferramentas; arquivos ainda têm seus próprios tipos. O nome final do contrato pode ser decidido depois.

O admin escolheria um modelo que já determina linguagem, extensões e modos permitidos. A criança receberia o projeto preparado. No Estúdio Completo, a escolha pode aparecer na criação, associada a experiências como “Desenhar com Turtle”. Abrir ou continuar um projeto deve preservar essa identidade. Trocar uma preferência visual não pode converter silenciosamente um projeto existente entre linguagens.

O catálogo já tem uma boa divisão em extensões oficiais, exemplos, documentação e ferramentas. Mas [ExtensionManifest e ExtensionRuntimeDefinition](../packages/studio/src/extensions/types.ts) não descrevem linguagem nem perfis Python; a execução depende de bootstrap JavaScript e imports ESM. O [painel de extensões](../packages/studio/src/components/extensions/ExtensionsPanel.tsx) filtra nível, permissões e categoria, sem um critério de linguagem.

Sua proposta se encaixa nessa organização, mas o filtro visual seria apenas uma parte. Compatibilidade precisa ser validada também ao importar, salvar, executar, publicar e remixar. “Suporta Python” não pode significar que duas extensões funcionam juntas se dependem de runtimes incompatíveis.

Os blocos podem compartilhar aparência e interações. A semântica precisa respeitar Python: operadores, listas, laços e funções têm diferenças reais. A [representação intermediária atual](../packages/studio/src/ir/schema.ts) contém conceitos específicos de JavaScript. Já o [registro de codecs](../packages/studio/src/codecs/programming/registry.ts) oferece uma fronteira útil entre blocos, representação e código.

Eu validaria uma família Python pequena ao longo da progressão inteira: Blocos, Ponte e Código. Converter blocos conhecidos para Python é um problema menor que reconhecer alterações livres e reconstruir blocos. A Ponte precisa de um subconjunto explícito, preservação de código não representável e associação confiável entre linhas e blocos. Não devemos prometer conversão de todo Python em blocos.

No Pro, aceitar `.py` e colorir a sintaxe não basta. O [executor atual](../packages/studio/src/modes/pro/ProPreview.tsx) pressupõe npm/WebContainer, e os serviços de linguagem são voltados ao ecossistema JavaScript. Execução, diagnóstico e ajuda precisam conhecer o perfil Python. Pro continua fazendo sentido como destino de aprofundamento, sem ser condição obrigatória para uma primeira oficina Turtle em Blocos/Ponte.

Recursos criados no Pinta e no Molda podem ser aproveitados quando os formatos e as convenções forem compatíveis. Isso exige mapear caminhos, nomes e carregamento no sistema de arquivos do runtime; não torna metadados e comportamentos dos motores automaticamente intercambiáveis. Exemplos, documentação, exercícios e orientação da IA também precisam corresponder à linguagem e à API realmente disponíveis.

**Três achados específicos das oficinas ao vivo.**

1. A sala hoje rejeita projetos Pro e modos diferentes de Blocos/Ponte. Isso está explícito na [validação do snapshot](../packages/members/src/domain/live/workspace-snapshot.ts). Portanto, uma oficina de código Python livre exige ampliar o contrato da sala, independentemente da escolha da biblioteca. O [workspace ao vivo](../packages/member-shell/src/components/live/live-workspace.tsx) também desabilita a escolha de extensões para o aluno por padrão, o que favorece uma seleção feita pelo professor/modelo.
2. O preview ao vivo é um documento HTML temporário servido fora da origem da aplicação, conforme a [rota atual](../packages/member-shell/src/routes/live-preview.ts). Python web pode ser iniciado por HTML, mas runtime, módulos e recursos precisam de uma estratégia compatível com essa origem e sua política de execução. Um worker não substitui isolamento de origem. Não seria adequado embutir um interpretador inteiro em cada snapshot do aluno.
3. Cursos ao vivo não concedem desbloqueios curriculares do Estúdio na [regra atual](../packages/members/src/infrastructure/persistence/drizzle/studio-unlock-eligibility.ts). A continuidade do projeto da oficina e a permissão para criar novos projetos Python são decisões diferentes. Essa política precisa ser explícita para que a criança saiba o que poderá continuar fazendo depois do encontro.

A infraestrutura de projetos, revisões, persistência e assistência do professor oferece reaproveitamento. O critério real é que ela continue funcionando com o novo executor: professor ajuda na revisão correta, o aluno recupera o projeto ao reconectar, e Reiniciar não mantém tarefas e callbacks da execução anterior.

**O que decidiria o investimento.**

Eu começaria a avaliação de valor por uma experiência Turtle completa e uma experiência 2D pequena. Isso dá evidência sobre criação, jogo e progressão sem depender da extensão 3D para justificar Python. É uma prioridade de investigação, não um cronograma de entrega.

Antes de considerar a proposta pronta para uma turma, precisaremos observar:

- Inicialização sem cache e novas execuções em computadores representativos, com a chamada ao vivo aberta.
- Parada e recuperação após erro ou loop infinito, sem perder a aula nem o projeto.
- Teclado, foco, áudio, recursos, redimensionamento e os dispositivos realmente usados pelo público.
- Blocos/Ponte preservando programas, erros associados ao código correto e assistência do professor funcionando.
- Reabertura, publicação e exportação usando versões fixadas e uma combinação de bibliotecas suportada.
- Resultado pedagógico para os dois grupos: novatos conseguem criar e explicar; alunos da jornada encontram desafios que vão além de repetir o exercício.

Também mediria interesse e continuidade depois da oficina. A nova linguagem pode ampliar a oferta e estimular a exploração, mas essa hipótese comercial ainda não foi comprovada.

Minha recomendação de produto é uma coleção Python com personalidade própria, começando conceitualmente por Turtle, organizada ao lado da jornada JavaScript. Pygame Zero/CE e Raylib ocupam papéis distintos de aprofundamento. A seleção de linguagem pode ser simples para o aluno; a sustentação técnica deve ser explícita, delimitada e verificada por experiência.
