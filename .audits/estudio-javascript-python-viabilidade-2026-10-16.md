**JavaScript e Python no Estúdio — parecer de viabilidade e valor**

Data: 16/10/2026. Escopo: opinião anterior ao planejamento; clássico, Pro, aulas e Estúdio Completo.

**Parecer:** Python pode acrescentar valor como uma segunda trilha de aprendizagem. Não recomendo assumir agora a reprodução integral do catálogo, dos jogos e dos modos atuais em duas linguagens. A escolha visual seria pequena; a responsabilidade técnica e editorial seria permanente. Manteria JavaScript/TypeScript como caminho principal para os projetos web e jogos atuais e consideraria Python quando houver uma experiência pedagógica concreta que justifique o investimento.

Esta análise combina leitura dos pontos estruturais do código, inspeção executável do catálogo e pesquisa em documentação oficial e estudos publicados. Não é auditoria de cada arquivo do monorepo. Não houve implementação de Python, benchmark, teste de interface, consulta a métricas de produção ou pesquisa com alunos. A viabilidade geral tem boa sustentação; desempenho neste produto, demanda e retorno comercial continuam não medidos.

**O que existe hoje e por que isso muda a decisão.**

O sistema já distingue três coisas: o contexto que hospeda o editor, o tipo de projeto e a forma de edição. Uma linguagem adicional seria outra dimensão.

| Dimensão | Situação atual verificada | Consequência |
|---|---|---|
| Contexto | Aula/admin e Estúdio Completo compartilham componentes e contratos | Não são quatro implementações independentes; há bastante infraestrutura reaproveitável |
| Tipo | `classic` ou `pro` | Define documento, ferramentas e execução |
| Edição | Clássico: Blocos/Ponte. Pro: Código | Python não deve virar um quarto modo nem ser sinônimo de Pro |
| Linguagem | Clássico centrado em JavaScript; Pro admite JavaScript/TypeScript e arquivos web | Não encontrei um backend de linguagem Python nesses caminhos |

A regra atual está em [modes.ts](../packages/studio/src/core/modes.ts). O modo Código antigo de um projeto clássico é normalizado para Ponte. Assim, a promessa atual é uma progressão Blocos → Ponte → projeto Pro/Código, e não três modos equivalentes dentro de cada tipo.

No clássico, [ProjectFiles](../packages/studio/src/core/project.ts) exige `index.html`, `style.css` e `script.js`. A lista de linguagens extras não inclui Python. [A validação de projetos](../packages/studio/src/state/projectValidation.ts) também espera esse formato. No Pro, [proProject.ts](../packages/studio/src/core/proProject.ts) oferece árvore de arquivos, mas a lista de extensões aceitas não inclui `.py`, e os metadados de execução incluem um script npm.

O clássico transforma blocos em uma representação intermediária própria e depois gera HTML/CSS/JS. O caminho está em [blockToIR.ts](../packages/studio/src/codecs/programming/blockToIR.ts) e [generators/project.ts](../packages/studio/src/generators/project.ts). Isso é um ponto favorável ao reaproveitamento. Entretanto, essa representação não é neutra: [schema.ts](../packages/studio/src/ir/schema.ts) contém `JSExpr`, `JSStatement`, operadores `===`/`!==`, promessas e trechos `rawJS`. Dar outro nome a esses tipos não resolveria suas diferenças de comportamento.

**Dimensão real dos blocos.** Carreguei `SERVER_BLOCK_CATALOG` com Bun e contei as entradas e os identificadores únicos. O resultado foi **1.523 entradas e 1.523 tipos distintos**, excluindo os blocos ocultos/legados conforme a regra do próprio [catálogo](../packages/studio/src/blockly/blockCatalog.ts).

| Família | Tipos disponíveis |
|---|---:|
| Núcleo: áreas, HTML, SVG, CSS, programação, página/eventos, Canvas, som e demais categorias | 405 |
| Jogo 2D | 307 |
| Jogo 2D Avançado | 384 |
| Jogo 3D | 159 |
| Jogo 3D Avançado | 132 |
| Mundo 3D | 136 |
| Total | 1.523 |

Essa contagem não é uma estimativa de blocos a reescrever. HTML, CSS e SVG continuam tendo suas próprias linguagens; vários controles visuais podem ser compartilhados; diversas ações podem usar um mesmo adaptador. Ela mede a superfície a classificar, documentar e verificar se prometermos compatibilidade integral. Não basta traduzir os blocos de variáveis e repetição.

**Onde está o trabalho mais difícil.**

| Parte | Evidência atual | Efeito de adicionar Python |
|---|---|---|
| Blocos → código | Geradores próprios em cima da IR | Implementar emissão Python e decidir quais conceitos e APIs são compatíveis |
| Código → blocos | [Parser Babel](../packages/studio/src/parsers/js.ts) e [conversão da Ponte](../packages/studio/src/modes/bridgeReverseParse.ts) | Novo parser/adaptador Python, preservação de texto e tratamento de sintaxe fora do subconjunto visual |
| Correspondência visual | [Source map pedagógico](../packages/studio/src/generators/sourceMap.ts) limitado aos três arquivos canônicos | Relacionar blocos às linhas Python sem perder identidade ou destacar código errado |
| Jogos | [Contratos de ciclo de execução](../packages/studio/src/extensions/types.ts), motores e codecs próprios | Adaptar callbacks, estado, entrada, som, recursos e reinício; medir comunicação com o motor |
| Pro completo | [ProPreview](../packages/studio/src/modes/pro/ProPreview.tsx) usa `npm install` e `npm run dev` em WebContainer | Definir um ambiente Python; não há interpretador disponível só por escolher uma linguagem |
| Pro nas aulas/admin | [Adapter de runtime](../packages/studio/src/studio/pro-runtime.tsx) e [Worker](../packages/studio-runtime/src/index.ts) compilam um artefato web | A infraestrutura remota existente precisa de outro contrato para executar Python ou empacotar seu runtime |
| Editor | [Serviço de linguagem Pro](../packages/studio/src/monaco/pro/languageService.ts) usa TypeScript | Coloração de sintaxe seria só o começo: diagnóstico, imports, sugestões e navegação precisam de suporte próprio |
| Avaliação | [Atividades](../packages/studio/src/studio/activity.ts) incluem funções globais, DOM e asserções JS | Revisar os critérios dependentes da linguagem e da execução; regras estruturais podem ter reaproveitamento |
| Exportação/publicação | [fileMap](../packages/studio/src/export/fileMap.ts), player e conversão para Pro assumem recursos web | O programa Python precisa continuar rodando no link público, no remix e na exportação |

O parser atual já reconhece apenas padrões conhecidos e preserva código não reconhecido como `rawJS`. Isso mostra que nem o caminho JavaScript promete transformar qualquer programa livre em blocos perfeitamente. Em Python, seria necessário explicitar o mesmo limite. Não é aceitável uma volta aos blocos que apague código válido ou altere o resultado silenciosamente.

A [documentação do Blockly](https://docs.blockly.com/guides/create-custom-blocks/code-generation/overview/) confirma geração Python 3, mas exige geradores específicos para blocos personalizados e deixa a execução para a aplicação. Esse recurso não substitui o pipeline próprio do Estúdio nem entrega sua conversão reversa.

Há diferenças semânticas além da sintaxe: escopo, coerção, listas, igualdade, valores vazios, exceções e assincronismo. Uma mesma figura visual só pode gerar as duas linguagens com confiança se seu significado estiver definido. Para recursos específicos da web, uma API Python pode chamar o motor JS; isso é viável, mas é uma biblioteca do Estúdio a ensinar e manter.

**As opções de execução e o que eu escolheria investigar.**

| Opção | Vantagem | Limite para esta decisão |
|---|---|---|
| CPython no navegador via Pyodide | Sem instalação local; sem servidor executando cada tentativa; boa aproximação do Python que o aluno encontrará fora da plataforma | Download, inicialização, memória, pacotes compatíveis e integração com o navegador precisam de validação |
| Python restrito convertido para a infraestrutura JS | Pode compartilhar mais do motor e facilitar um subconjunto visual | É necessário declarar o subconjunto; não prometer compatibilidade geral com Python e suas bibliotecas |
| Implementações voltadas ao navegador, como Brython ou Skulpt | Alternativas reais para experiências web e educacionais | Compatibilidade e integração devem ser avaliadas contra os objetivos escolhidos |
| CPython em ambiente remoto isolado | Permite considerar tarefas e dependências que exigem um ambiente de servidor | Introduz sessões, custo de execução, limites, disponibilidade e outra forma de publicar programas |

Minha preferência inicial para uma trilha que pretende ensinar Python transferível seria **avaliar Pyodide**, sem escolher a tecnologia definitivamente antes de uma prova pequena. Ele é uma distribuição baseada em CPython/WebAssembly, oferece integração com JavaScript e inclui diversos pacotes científicos. Isso sustenta experiências com dados e matemática, além de fundamentos. [Documentação do Pyodide](https://pyodide.org/en/stable/).

Não se deve equiparar Python no navegador a um computador Python sem restrições: há módulos ausentes ou limitados e restrições de rede, processos e threads. A biblioteca padrão `turtle.py`, por exemplo, consta como removida; desenhar uma tartaruga educativa exige outra implementação/adaptação. [Compatibilidade oficial](https://pyodide.org/en/stable/usage/wasm-constraints.html).

Para evitar travar o editor, um worker é um candidato natural. Ele não acessa diretamente os objetos da thread principal, portanto jogos e DOM exigem uma interface de comunicação. A interrupção preservando o interpretador usa `SharedArrayBuffer` e cabeçalhos apropriados; encerrar o worker é outra estratégia, com perda do estado daquela execução. A escolha precisa considerar os hosts das aulas. [Workers](https://pyodide.org/en/stable/usage/webworker.html) e [interrupções](https://pyodide.org/en/stable/usage/keyboard-interrupts.html).

Isso tem um obstáculo concreto no produto: a [CSP do preview clássico](../packages/studio/src/preview/csp.ts) bloqueia workers, não autoriza compilação WebAssembly e restringe carregamentos/conexões. O [player público](../packages/studio/src/components/preview/StudioProjectPlayer.tsx) usa um iframe sem `allow-same-origin`. A integração requer uma fronteira própria de execução, preservando o isolamento; colocar o interpretador na página autenticada ou abrir permissões globais não é uma solução presumida.

Também não assumiria que instalar Pygame equivale a portar o catálogo. A documentação atual de SDL no Pyodide marca o suporte como experimental e descreve adaptações do loop para devolver controle ao navegador. Isso não impede jogos Python; impede tratar qualquer jogo desktop como automaticamente compatível. [SDL no Pyodide](https://pyodide.org/en/stable/usage/sdl.html).

O WebContainer do Pro não deve ser confundido com um Linux que executa qualquer binário. Sua documentação delimita execução a tecnologias suportadas na web, como JavaScript e WebAssembly. Python via WASM é uma possibilidade a integrar, não uma capacidade que o projeto já oferece. [Limitações do WebContainer](https://webcontainers.io/guides/troubleshooting#cannot-load-native-addon-error).

PyScript pode fornecer integração e gerenciamento de workers, mas é uma camada que usa interpretadores como Pyodide e MicroPython; não resolve automaticamente as regras de blocos, ponte, publicação ou aprendizagem. [Workers no PyScript](https://docs.pyscript.net/2026.3.1/user-guide/workers/). Brython se apresenta como implementação Python para o navegador com acesso ao DOM/eventos; Skulpt como implementação no navegador em JavaScript. São alternativas, sem evidência nesta análise de que sejam superiores para este produto. [Brython](https://github.com/brython-dev/brython/blob/master/README.md) e [Skulpt](https://skulpt.org/).

**O valor pedagógico que justifica Python.**

Vejo três benefícios possíveis: ensinar que os conceitos de programação atravessam linguagens; oferecer continuidade para alunos interessados em Python fora do Estúdio; e abrir experiências de dados, matemática e simulações com bibliotecas e materiais desse ecossistema. São argumentos de produto, não evidência de aumento de retenção ou vendas no Sistema Zero.

Para uma criança que está criando seu primeiro jogo com blocos, a linguagem gerada pode ser invisível. Acrescentar uma escolha inicial não garante uma experiência melhor. O valor aparece quando o curso usa essa escolha: ler código, compreender uma função, transferir uma ideia, construir algo que tenha propósito naquela trilha. JavaScript já permite ensinar lógica, funções, objetos e criar experiências de IA; Python não é pré-requisito para aprender esses conceitos.

Um estudo de transição Scratch → Python acompanhou 26 alunos de 12–16 anos. Um editor estruturado reduziu problemas durante a transição, mas a retirada desse apoio trouxe dificuldades sintáticas. É evidência a favor de cuidar da passagem ao texto e avaliar autonomia; não demonstra que Python é superior a JavaScript nem permite generalizar diretamente para todo o público do Sistema Zero. [Kazemitabaar et al., 2023](https://arxiv.org/abs/2302.05708).

Outro estudo acompanhou uma transição de ambientes introdutórios para Java: diferenças iniciais entre condições de blocos e texto desapareceram depois de dez semanas no ambiente textual. Também não compara Python e JavaScript. Esses trabalhos reforçam que a qualidade da transição precisa ser avaliada, em vez de presumida pelo número de linguagens disponíveis. [Weintrop e Wilensky, 2019](https://www.terpconnect.umd.edu/~weintrop/papers/Weintrop%26Wilensky_2019_C%26E.pdf).

Há precedentes relevantes, com compromissos diferentes:

| Referência | O que demonstra | O que não demonstra |
|---|---|---|
| [MakeCode](https://makecode.com/language) | Blocos, Static Python e Static TypeScript podem convergir para um pipeline comum | O Python oferecido é um subconjunto; não prova equivalência com todo CPython |
| [EduBlocks](https://docs.edublocks.org/docs/classrooms/for-teachers) | Projetos iniciais, escolha de blocos/texto e testes para atividades Python podem compor uma ferramenta escolar | Não prova que todo programa textual possa retornar aos blocos do Sistema Zero |
| [Python Lab](https://support.code.org/hc/en-us/articles/36950773555213-Python-Lab-Frequently-Asked-Questions) | Python no navegador pode ter currículo, bibliotecas selecionadas, compartilhamento e remix | Não comprova demanda dos nossos alunos ou compatibilidade com nossos motores |

**Como eu trataria a “flagzinha”.**

Na interface, chamaria **Linguagem do projeto**. Para o Pro, “JavaScript/TypeScript” descreve melhor a família atual que somente “JavaScript”. No contrato, usaria um campo enumerado, como `programmingLanguage`, e não um booleano `isPython`. O nome e os valores finais dependem de como o Pro vai representar projetos com vários tipos de arquivo.

A escolha pertence ao projeto salvo. O admin a define no projeto inicial da aula; a atividade pode exigir aquela linguagem, validada também na entrega e na continuidade entre aulas. Se existir uma configuração separada na aula, ela deve ser uma restrição consistente com o snapshot, não uma segunda fonte que possa contradizê-lo. No Estúdio Completo, o aluno escolhe ao criar o projeto/template; reabrir um projeto usa a linguagem que ele já tem.

Trocar um projeto existente de linguagem não seria uma preferência visual. Pode exigir transformação de código e APIs. Eu só ofereceria essa operação quando houver conversão verificada para aquele subconjunto, preservando o original; no restante, a linguagem identifica o projeto e não promete tradução automática. Trocar Blocos/Ponte é diferente de trocar Python/JavaScript.

Em um Pro com arquivos web e Python, a extensão continua determinando a linguagem de cada arquivo. O perfil do projeto determina execução, bibliotecas e ferramentas. A seleção não transforma HTML/CSS em Python nem faz TypeScript deixar de existir.

**O alcance ultrapassa o editor.**

O [StudioBlock](../packages/members/src/domain/course/lesson-block.ts) tem projeto inicial, paleta, modos, critérios, continuidade de aulas e vitrine. O [host de aulas](../packages/member-shell/src/components/studio/studio-block.tsx) conecta rascunhos e compilação. O [admin](../packages/admin/src/components/studio/studio-embed.tsx) também escolhe o tipo e modelo Pro. Portanto, idioma do programa, seed, rascunho, entrega, retomada e publicação precisam concordar.

A paleta livre hoje deriva de conquistas curriculares em [studio-tier.ts](../packages/member-shell/src/lib/studio-tier.ts). Se Python tiver capacidades diferentes, liberar um bloco aprendido em JavaScript não pode implicar silenciosamente uma implementação Python inexistente. Templates, exemplos, documentação, ajuda do Zappy, planos do Pensa e remix também precisam conhecer o perfil de linguagem. O [prompt base atual](../packages/studio/src/ai/prompts.ts) explicita HTML/CSS/JavaScript/DOM/Canvas.

No Pro remoto, o [contrato de build](../packages/studio-runtime/src/contracts.ts) valida templates e dependências npm, e o Worker produz arquivos estáticos com Vite. Usar CPython no servidor para cálculo é diferente de hospedar permanentemente um backend Flask/Django. A existência do Sandbox não elimina essa distinção.

Por outro lado, não seria necessário reescrever a aplicação em Python. React/TypeScript podem continuar implementando interface, persistência, aulas, conta e boa parte dos motores. Blocos visuais, recursos do Pinta/Molda e estruturas comuns também têm potencial de reaproveitamento. O trabalho novo está principalmente nos contratos de linguagem, execução e aprendizagem.

**O investimento que eu defenderia e o que eu adiaria.**

| Decisão | Minha opinião |
|---|---|
| Manter JS/TS como base dos jogos e projetos web existentes | Sim |
| Acrescentar Python porque há uma trilha concreta que ensina algo relevante | Sim, com escopo e critérios próprios |
| Disponibilizar Python em aulas e projetos livres | Faz sentido, mantendo a mesma identidade de projeto entre contextos |
| Suportar Blocos/Ponte/Código para o conjunto Python escolhido | É uma proposta pedagógica coerente; a ponte bidirecional precisa ter limites explícitos |
| Tornar todo bloco de HTML, DOM, jogos 2D/3D e avançado equivalente em Python desde o lançamento | Não recomendo |
| Começar por um editor textual para testar execução | Útil como prova técnica; insuficiente para validar o valor da experiência Blocos → Ponte → Código |
| Reescrever motores e interface em Python | Não há justificativa identificada |
| Prometer tradução livre de qualquer projeto existente | Não |

Python em texto isolado seria a entrada técnica mais estreita, mas não validaria a proposta completa que foi levantada. Se o objetivo comercial é preservar a progressão por blocos, uma validação futura deve incluir pelo menos uma experiência pequena que percorra essa progressão inteira. Isso é um critério de avaliação, não um plano de implementação aprovado.

O custo inicial seria escolher e integrar execução, semântica e formato. O custo recorrente seria manter cada recurso oferecido em ambas as linguagens, suas mensagens de erro, exemplos, testes e materiais. A matriz cresce por linguagem, forma de edição, contexto e família de recursos. Não é necessariamente duas vezes o código; também não é apenas acrescentar um item num seletor. Não há evidência suficiente para estimar prazo ou retorno financeiro de forma responsável.

Eu mudaria de uma recomendação cautelosa para prioridade de produto quando houver: uma trilha/curso com objetivo claro; sinais de interesse do público; uma experiência representativa que funcione nos dispositivos reais; e uma forma confiável de salvar, retomar, compartilhar e aprender sem depender de tradução silenciosa. Para medir valor, observaria conclusão, autonomia sem blocos, retorno voluntário e dificuldades de suporte, além de carregamento, interrupção e comportamento do jogo.

**Decisão sugerida:** tratar Python como expansão possível e relevante do currículo. Se a condição for entregar desde já todos os blocos e recursos atuais em JavaScript e Python, minha recomendação é não assumir esse escopo agora. A justificativa para avançar deve ser o que o aluno vai aprender e criar com essa trilha, acompanhada de evidência técnica e de demanda.
