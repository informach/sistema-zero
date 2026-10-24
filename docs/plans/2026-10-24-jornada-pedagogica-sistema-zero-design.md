# Proposta de jornada pedagógica do Sistema Zero

**Data:** 24/10/2026

**Estado:** proposta para decisão; nenhum requisito da plataforma ou curso foi alterado

**Escopo:** jornada Kids e adulta, cursos, modos do Estúdio, extensões, JavaScript e Python

## Decisão recomendada

Manter os oito postos Kids como a narrativa do crescimento de quem cria jogos. Trocar o critério que organiza o percurso: cada avanço deve representar uma capacidade observável de compreender, construir, modificar, testar e explicar um jogo. Extensões, 2D/3D, modos e linguagens são caminhos para exercitar essas capacidades.

Oferecer a Ponte livre depois do primeiro jogo 2D completo. Ensinar a primeira regra escrita em JavaScript **ou** Python antes de exigir qualquer curso 3D avançado. Permitir que o aluno estude 3D básico nesse período por interesse, com pré-requisitos próprios. Fazer Lenda representar um projeto autoral testado e revisado, sem tornar Mundo 3D obrigatório para quem cria jogos 2D.

Esta proposta descreve o currículo desejado. As seções finais distinguem o que a configuração atual já permite daquilo que exigiria mudanças posteriores.

## 1. Situação conferida

A [jornada Kids atual](../jornada-do-criador.md) tem oito postos e sete etapas de cursos: uma posição em Primeiros Passos e oito em cada uma das seis etapas seguintes, totalizando 49 posições. O seed exige conclusão e publicação dos cursos posicionados. A Ponte livre chega ao posto Gênio da Criação, depois de 41 posições; o Pro chega a Lenda, depois de 49. A política publicada pode alterar requisitos e capacidades, mas preserva os sete avanços estruturais.

A ordem técnica registrada no [catálogo da jornada](../../packages/core/src/journey/catalog.ts) é Primeiros Passos 2D → Iniciante 2D → Iniciante 3D → Intermediário 2D → Intermediário 3D → Avançado 2D → Avançado 3D. A [orientação dos cursos de jogos](../orientacao-cursos-jogos.md) relaciona cada degrau a uma camada do Estúdio. Ela também coloca JavaScript e canvas sem extensão em Avançado 2D, embora a Ponte livre só abra após concluir essa etapa. Uma aula pode usar Pro antes da liberação global; isso precisa ser uma escolha curricular explícita.

O [desenho inicial adulto](../../packages/members/src/application/adult-journey/adult-journey-seed.ts) tem sete etapas independentes, mas espelha a mesma ordem técnica. A política adulta exige os cursos vinculados a cada etapa. Sua validação só permite liberar IA e Pensa após incluir um curso adulto avançado naquela etapa ou em uma anterior.

Há materiais locais para cinco cursos: [Cadê Todo Mundo?](../aulas-interativas/cade-todo-mundo/), [A Chave do Farol](../aulas-interativas/desafio-primeiro-jogo/), [Nave Contra Asteroides](../aulas-interativas/nave-contra-asteroides/), [O Jogo do Meu Jeito](../aulas-interativas/o-jogo-do-meu-jeito/) e [Corre, Dino!](../aulas-interativas/corre-dino/). Cadê é extra opcional na Faísca. O Farol é a posição obrigatória de entrada e foi preparado para receber quem nunca fez Cadê. O Jogo do Meu Jeito continua a partir de uma cópia da Nave. Os materiais locais e um registro editorial de 19/10 não comprovam, por si, o estado do catálogo remoto em 24/10.

As [diretrizes pedagógicas atuais](../aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md) já estabelecem uma ideia por parte, experiência concreta antes de um conceito novo, montagem completa, teste, correção, personalização e uma fonte editorial que sirva aos públicos infantojuvenil e adulto. A proposta mantém essa base.

JavaScript e Python têm documentos, paletas e execução próprios. Concluir cursos JavaScript não concede blocos Python equivalentes; os projetos não são traduzidos automaticamente. Python dispõe de blocos de Programação e da extensão Turtle, com Ponte e Pro próprios. Ver [conquistas Python](../continuity/2026-10-22-python-visual-games-and-unlocks.md).

### Problema pedagógico

Concluir uma sequência longa de jogos guiados mede participação, mas não demonstra, isoladamente, que o aluno consegue decidir onde uma regra entra num projeto novo. Além disso, a complexidade de câmera e espaço 3D é independente da dificuldade de ler uma condição escrita. Ao exigir muitas camadas de blocos antes da Ponte, a jornada distancia o código das primeiras ideias que o aluno compreendeu.

O [referencial K–12 de computação](https://k12cs.org/framework-statements-by-progression/) organiza a progressão por ideias e práticas: eventos, estado, variáveis, condições, composição, teste e abstração. Uma [revisão sistemática sobre a passagem de blocos a texto](https://www.sciencedirect.com/science/article/pii/S2590118425000280) favorece tornar explícitas as relações entre representações e aponta a necessidade de mais estudos experimentais. Um [estudo com alunos experientes em Scratch](https://escholarship.org/uc/item/36d9j4c8) não encontrou transferência automática robusta para Python depois de controlar a habilidade geral. Essas fontes orientam o desenho; não definem o momento exato da Ponte para o Sistema Zero.

## 2. Alternativas consideradas

| Abordagem | Ganho | Limite |
| --- | --- | --- |
| Manter os níveis por extensão e apenas antecipar a Ponte | Aproveita a maior parte da organização atual | O avanço continua dependendo de ferramentas que podem não servir ao projeto do aluno |
| Concluir todos os blocos, depois Ponte, depois código, deixando 3D para o fim | Deixa clara a mudança de modo | Cria outra sequência rígida e adia 3D mesmo quando ele seria um contexto motivador e adequado |
| Organizar a jornada por competências e oferecer modos, linguagens e tipos de jogo com pré-requisitos próprios | Relaciona avanço ao que o aluno faz; comporta interesses e ritmos diferentes | Pede revisão da taxonomia de etapas, dos requisitos e de algumas regras atuais de acesso |

Recomendação: a terceira abordagem. Ela mantém um percurso central compreensível e usa projetos opcionais para oferecer prática, escolha e continuidade.

## 3. Resultado de aprendizagem

Ao concluir a entrada, o aluno programa uma regra que produz resultados diferentes em duas situações e consegue mostrar onde ela está. Após os jogos iniciais, combina várias regras numa partida completa e altera uma delas sem repetir todos os passos da aula. Na Ponte, relaciona uma regra em blocos à sua representação escrita, prevê uma mudança e a testa. No primeiro curso de código, escreve e depura uma regra pequena em JavaScript ou Python. No projeto final, planeja, constrói, testa com outra pessoa e revisa um jogo próprio.

Cada promoção combina **um projeto central** com **uma demonstração curta de autonomia**. A demonstração deve ocorrer no jogo: alterar uma regra, comparar resultados, corrigir um erro ou aplicar a ideia em outro contexto. Uma explicação breve pode complementar a evidência, sem depender de um texto longo ou de uma avaliação automática da fala da criança. O aluno recebe ajuda e pode tentar novamente.

Conclusão, conquista de blocos, posto e publicação no Mural têm funções diferentes. O Mural oferece troca e reconhecimento, mas publicar não deve ser a prova pedagógica universal. Um projeto privado verificável precisa poder cumprir o marco curricular. O [estudo de aprendizagem por domínio da EEF](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/mastery-learning) apoia objetivos claros, diagnóstico, retorno e tempo flexível; não prescreve um número fixo de cursos. A [pesquisa de transferência das National Academies](https://www.nationalacademies.org/read/9853/chapter/6) recomenda prática em mais de um contexto para ampliar a aplicação do que foi aprendido.

## 4. Percurso central Kids

Os nomes dos cursos novos são provisórios. A coluna “para avançar” descreve evidência pedagógica desejada, não uma verificação que o produto já execute.

| Posto atual | Cursos centrais e escolha | Para avançar | Próximo acesso recomendado |
| --- | --- | --- | --- |
| **Faísca** | **A Chave do Farol**. **Cadê Todo Mundo?** continua extra e opcional. | Mostrar os resultados da porta com e sem chave, testar os dois casos e identificar a regra. | **Construtor(a):** Estúdio livre com blocos conquistados e Pinta. |
| **Construtor(a)** | **Nave Contra Asteroides**. **O Jogo do Meu Jeito** abre após a Nave como curso opcional de autoria visual. | Concluir uma partida e alterar uma regra de pontos, vidas ou colisão com orientação reduzida; testar o efeito. | **Inventor(a):** Ponte livre para projetos e peças já aprendidos. |
| **Inventor(a)** | **Corre, Dino!** e o novo curso curto **Por Dentro das Regras**, usando partes familiares da Nave e do Dino na Ponte. | Aplicar uma ideia da Nave em outro tipo de jogo; reconhecer uma regra nos blocos e no código, prever uma alteração e testá-la. | **Explorador(a) de Mundos:** acesso ao 3D básico e ao percurso de primeiro código escolhido. |
| **Explorador(a) de Mundos** | **Minhas Primeiras Regras em Código**, em JavaScript **ou** Python. O curso **Primeiro Mundo 3D** é uma opção independente. | Ler, modificar e escrever uma pequena regra em um projeto iniciado; corrigir ao menos um erro observável. | **Mestre dos Jogos:** Pro livre na linguagem conquistada. |
| **Mestre dos Jogos** | Novo curso **Meu Jogo, Minhas Regras**, com escolha de um jogo pequeno em 2D ou em 3D básico já estudado. | Planejar duas ou três regras, montar um jogo jogável, testar uma falha e melhorar a primeira versão. Pode escolher o modo apropriado; o primeiro código já foi demonstrado na etapa anterior. | **Arquiteto(a) de Mundos:** cursos de organização e reutilização de regras. |
| **Arquiteto(a) de Mundos** | Novo curso **Jogos que Crescem**: funções, estados, dados e partes reutilizáveis num jogo com mais de uma mecânica. | Acrescentar uma mecânica sem duplicar toda a lógica e testar se a mudança preserva as regras anteriores. | **Gênio da Criação:** projetos de maior escopo e motores avançados adequados ao caminho escolhido. |
| **Gênio da Criação** | **Projeto Lenda**: proposta, protótipo, partida com outra pessoa, revisão e apresentação. | Entregar um jogo próprio e jogável, explicar decisões importantes e mostrar uma melhoria resultante de um teste real. Pode ser 2D ou 3D. | **Lenda:** especializações e projetos próprios, sem novo requisito para conservar o posto. |
| **Lenda** | Cursos de aprofundamento em jogos, motores, mundos, JavaScript e Python. | Não há nova promoção obrigatória. | Continuidade por escolha e novos projetos. |

Este percurso tem oito cursos ou projetos centrais antes de Lenda: Farol, Nave, Dino, Por Dentro das Regras, primeiro código, jogo próprio, organização de sistemas e projeto final. É uma hipótese para ensaio, não um novo número mágico. Os cursos opcionais dão mais prática quando necessária e ampliam o catálogo sem prolongar artificialmente cada promoção.

O curso **Projeto Lenda** pertence à etapa anterior à promoção. Depois de alcançar Lenda, uma celebração ou curso de formatura pode continuar opcional; a política atual recusa usar um curso de formatura como requisito para chegar ao posto.

### Por que preservar os cinco cursos preparados

- **Cadê Todo Mundo?** apresenta evento e contagem num jogo curto. É uma boa opção anterior ao Farol, sem virar pré-requisito.
- **A Chave do Farol** ensina movimento, informação guardada e decisão. Mantém a entrada autossuficiente.
- **Nave Contra Asteroides** combina movimento, grupos, colisão, pontos, vidas e estados numa partida completa.
- **O Jogo do Meu Jeito** trabalha autoria de imagens e animação sobre um jogo conhecido. Depende da Nave e não substitui a prova de criar novas regras.
- **Corre, Dino!** retoma ideias anteriores em outro gênero e acrescenta ritmo, progressão de dificuldade e ajustes de colisão. Essa troca de contexto permite observar transferência.

## 5. Cursos adicionais e papel das extensões

O catálogo precisa oferecer opções concretas, sem transformar cada extensão numa etapa universal. Estes são os primeiros cursos de especialização propostos; os títulos e a ordem interna dependem de protótipos de aula.

| Curso proposto | Pré-requisito pedagógico | Ferramentas | Papel |
| --- | --- | --- | --- |
| **Primeiro Mundo 3D** | Um jogo 2D completo e noção de estado, evento e colisão | Jogo 3D; Molda básico quando necessário | Recriar uma regra conhecida enquanto aprende profundidade, eixo Z e câmera |
| **Fábrica de Desafios 2D** | Organizar estados e regras reutilizáveis | Jogo 2D Avançado | Criar muitos objetos e comportamentos sem copiar regras inteiras |
| **Aventura em 3D** | Primeiro Mundo 3D | Jogo 3D Avançado | Reaplicar organização de estados, objetos e testes no espaço 3D |
| **Mundo Vivo** | Um projeto 3D básico e uma ideia que precise de espaço amplo | Mundo 3D, com Jogo 3D Avançado quando pertinente | Trabalhar terreno, deslocamento, personagens e missões com escopo controlado |
| **Por Trás do Motor 2D** | Um primeiro projeto autoral em código | JavaScript e canvas no Pro | Entender como uma parte do jogo funciona sem o motor pronto |
| **Por Trás do Mundo 3D** | Projeto 3D e experiência em código JavaScript | three.js no Pro | Explorar a implementação direta de câmera, cena e atualização |
| **Minha Segunda Linguagem** | Primeiro projeto em código concluído | JavaScript ou Python, conforme a linguagem ainda não estudada | Recriar uma mecânica conhecida e comparar lógica e sintaxe |

**Jogo 2D** acompanha Farol, Nave e Dino. **Pinta** abre após a entrada e ganha um curso dedicado em O Jogo do Meu Jeito. **Ponte** entra após a Nave. **Jogo 3D** e **Molda básico** entram quando o aluno escolhe o primeiro projeto 3D. **Jogo 2D Avançado**, **Jogo 3D Avançado** e **Mundo 3D** aparecem quando o projeto pede seus recursos e os fundamentos correspondentes foram demonstrados. Os níveis de Molda podem acompanhar esse percurso 3D. Não se deve inventar uma mecânica nova em todo curso apenas para produzir uma recompensa de paleta: aprofundar uma ideia e criar uma variação própria também são ganhos reais.

O primeiro curso 3D deve reaproveitar uma regra conhecida, como recolher um objeto e abrir uma porta. Sua novidade principal será representar e controlar o espaço. Assim, o aluno consegue identificar o que mudou na programação e o que mudou na geometria do jogo.

## 6. Da Ponte ao primeiro código

O curso **Por Dentro das Regras** trabalha quatro ações em projetos familiares:

1. **Reconhecer:** localizar no código a regra montada em blocos.
2. **Prever:** dizer o que ocorrerá ao mudar um valor ou uma condição antes de executar.
3. **Modificar:** fazer a mudança, rodar o jogo e comparar resultado e previsão.
4. **Produzir:** escrever uma regra curta num projeto iniciado para resolver um problema visível.

O aluno pode voltar aos blocos para entender um erro. A passagem mede autonomia crescente para expressar a mesma ideia. O método [PRIMM](https://primmportal.com/) — prever, executar, investigar, modificar e criar — oferece uma referência útil para essas tarefas. A Ponte do Estúdio é bidirecional; a aula deve curar mudanças pequenas e conferir o resultado, em vez de expor todo o código gerado de uma vez.

No primeiro curso Pro, a arte, o cenário e os controles podem vir preparados. A pessoa escreve uma condição, muda uma contagem e corrige uma falha observável. O curso não junta sintaxe nova, arquitetura de arquivos, física e câmera 3D. Uma aula Pro contextual pode ensinar isso antes de o Pro ficar disponível no Estúdio livre; a promoção seguinte libera a criação livre.

## 7. JavaScript e Python

Os dois percursos demonstram a mesma competência: ler, alterar, escrever e depurar uma regra. **Equivalência de competência não significa blocos, arquivos ou projetos idênticos.** O primeiro percurso textual é uma escolha. Estudar a segunda linguagem é opcional e ocorre depois, com uma atividade explícita de transferência.

**JavaScript** aproveita a continuidade dos jogos preparados e do código mostrado pela Ponte nos projetos dessa linha. **Python** começa com seus próprios blocos de Programação e Turtle num projeto pequeno; a aula relaciona eventos, estado e condições já conhecidos aos comandos Python antes de pedir escrita livre. Um aluno que concluiu Farol e Nave não recebe automaticamente uma paleta Python. O percurso Python precisa conceder suas próprias peças e ensinar seu próprio ambiente.

Os projetos Python atualmente descritos usam Turtle; esta proposta não presume uma extensão Python 3D equivalente às extensões JavaScript. Um projeto final 3D pode usar os recursos 3D disponíveis em JavaScript; um projeto final Python pode escolher uma ambição 2D adequada ao Turtle ou às capacidades homologadas quando o curso for produzido.

## 8. Crianças, adolescentes e adultos

A fonte editorial das aulas permanece comum: explicação que uma criança entende e tratamento respeitoso para adolescentes e adultos. As duas comunidades preservam contas, matrículas, progresso e certificados separados. O aluno varia o ritmo, a ajuda e o ponto de entrada; não precisa receber uma segunda versão menos clara da explicação.

- Crianças iniciantes podem fazer Cadê antes do Farol, rever experiências e continuar criando jogos visuais enquanto se preparam para o código. Não há idade fixa para abrir a Ponte. A alfabetização e a capacidade de ler uma regra curta influenciam o apoio necessário.
- Adolescentes e adultos iniciantes entram no mesmo núcleo de conceitos e podem avançar mais depressa quando mostram autonomia.
- Quem já programa pode fazer um desafio curto que demonstra as competências iniciais e evita repetir cursos inteiros. Esse reconhecimento exigiria uma forma confiável de registrar o marco, não apenas um botão para pular aulas.

Na área adulta, os sete marcos centrais podem ser as sete etapas, com Lenda como posição final. Cursos e evidências podem ter exigências diferentes das da comunidade Kids, mas devem representar as mesmas capacidades. A liberação atual de IA/Pensa apenas após um curso adulto avançado requer uma decisão de produto e eventual revisão técnica se Pensa passar a apoiar planejamento mais cedo. IA e Pensa podem ajudar a dividir um projeto e depurar, sem substituir a primeira previsão e o primeiro teste do aluno.

## 9. Regras de promoção e avaliação

Um marco curricular deve ter critérios observáveis e poucas condições. Exemplo para **Construtor(a) → Inventor(a)**:

1. Concluir Nave Contra Asteroides.
2. Receber um pedido curto que altere uma regra familiar, com liberdade de solução coerente.
3. Rodar o jogo, testar um caso em que a regra atua e outro em que ela não deve atuar, corrigindo se necessário.

A verificação automática pode conferir propriedades e comportamento do projeto; ela não comprova sozinha compreensão. O ensaio humano amostra a explicação do aluno e sua capacidade de aplicar a ideia em outro jogo. Dicas indicam onde conferir, sem entregar a solução inteira. O aluno pode tentar novamente após receber retorno. Publicar no Mural continua disponível, com as permissões do produto, mas um projeto privado verificável deve satisfazer o aprendizado.

Cada curso mantém a proposta pedagógica exigida pelas diretrizes: conhecimentos prévios, partes preparadas, resultado construído, conceitos novos, sequência de conquistas e critérios de conclusão. Cursos opcionais podem oferecer mais variações e prática; não precisam ocupar toda a capacidade estrutural de 49 posições.

## 10. Limites do produto atual

A [política Kids](../../packages/core/src/journey/kids-policy.ts) permite requisitos por posição ou curso, com marcos `complete` e `showcase`, e permite mover capacidades entre postos respeitando dependências. Ela conserva sete avanços e os sete identificadores técnicos de etapa. A configuração atual representa uma lista cumulativa de requisitos; não representa naturalmente **curso JavaScript ou curso Python** como alternativas equivalentes. A jornada adulta também usa uma lista de cursos exigidos por etapa. Permitir escolha real de linguagem para um marco obrigatório exigirá modelar essa equivalência ou uma evidência comum de competência.

Hoje, um curso Kids com posição concede blocos ao Estúdio livre após conclusão **e publicação**, mesmo que uma nova política passe a usar apenas conclusão para subir de posto. Essa diferença precisa ser resolvida para que uma família possa manter o projeto privado sem perder as peças que o aluno aprendeu. Cursos extras e bônus têm regra de concessão diferente. Produto comprado, matrícula, capacidade global, paleta, curadoria da aula e runtime continuam autorizações separadas.

A estrutura atual associa nomes de etapas e posições ao eixo 2D/3D. Uma mudança apenas nas exigências do Admin não tornará, por si, as telas e o catálogo semanticamente coerentes com a jornada por competências. O desenho final precisa alinhar nomes, descoberta de cursos, requisitos e promessas visíveis. Direitos e postos já conquistados devem permanecer preservados.

## 11. Validação antes de ampliar a produção

Validar primeiro o ponto mais arriscado: **quando a Ponte ajuda e quando o aluno já consegue escrever uma regra curta**. Os cinco cursos preparados oferecem o contexto inicial. Produzir um protótipo pequeno de Por Dentro das Regras e da primeira regra em código, sem gravar antecipadamente todos os cursos avançados.

Observar iniciantes de idades diferentes, adolescentes e adultos em três tarefas: mudar uma regra da Nave sem copiar a professora, relacionar essa regra aos blocos e ao código, e corrigir uma pequena regra escrita. Registrar o que a pessoa previu, o que testou, as ajudas necessárias, a correção feita e se conseguiu reaplicar a ideia em outro jogo. Perguntar também se o desafio pareceu alcançável e qual jogo gostaria de criar em seguida. Definir critérios de decisão antes do ensaio, sem transformar tempo de tela ou conclusão isolada em prova de domínio.

Rever após o ensaio: posição da Ponte, tamanho do curso de código, necessidade de prática adicional entre Nave e Dino, apoio para leitores iniciantes e relação entre primeiro 3D e primeiro texto. Uma sequência que funciona para adultos pode exigir mais etapas de apoio para parte das crianças, preservando o mesmo mapa conceitual.

## 12. Decisões para fechar antes de executar

1. **Significado de Lenda:** esta proposta inclui uma primeira competência real em código no percurso até Lenda e deixa livre o modo do projeto final. Se Lenda puder ser alcançada sem código, criar uma conquista de linguagem separada e ajustar a promessa pública da jornada.
2. **Publicação:** decidir que a evidência privada pode satisfazer avanço e concessão curricular, mantendo o Mural como escolha.
3. **Equivalência de linguagem:** definir como JavaScript ou Python cumprem o mesmo marco sem converter blocos nem exigir os dois cursos.
4. **Extensão do núcleo:** validar se os oito cursos/projetos centrais oferecem prática suficiente; acrescentar prática onde os ensaios mostrarem necessidade.
5. **Ferramentas globais:** confirmar Ponte após Nave, Pro após o primeiro curso de código, Molda quando o caminho 3D abrir e o momento adequado de Pensa em cada comunidade.

## Fontes externas usadas na reflexão

- [K–12 Computer Science Framework: progressão de conceitos e práticas](https://k12cs.org/framework-statements-by-progression/).
- [Supporting learners in the transition from block-based to text-based programming: revisão sistemática, 2025](https://www.sciencedirect.com/science/article/pii/S2590118425000280).
- [Analogical Transfer between Block- and Text-Based Programming Languages, 2026](https://escholarship.org/uc/item/36d9j4c8).
- [PRIMM: Predict, Run, Investigate, Modify, Make](https://primmportal.com/).
- [National Academies: Learning and Transfer](https://www.nationalacademies.org/read/9853/chapter/6).
- [Education Endowment Foundation: Mastery learning](https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/mastery-learning).
- [Scratch Foundation: filosofia de aprendizagem criativa](https://www.scratchfoundation.org/learn/learning-library/scratch-creative-learning-philosophy).
