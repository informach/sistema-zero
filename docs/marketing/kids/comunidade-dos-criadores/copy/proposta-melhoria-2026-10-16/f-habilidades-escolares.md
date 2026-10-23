# Página F: habilidades escolares

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md) ou aos [blocos comuns](blocos-comuns.md).

| | |
| --- | --- |
| Endereço | `/kids/comunidade-dos-criadores/oferta/habilidades-escolares` |
| Quem chega | Pai ou mãe que se preocupa com a escola, vindo de anúncio ou post sobre aprendizagem. A página não é perfil do quiz |
| Nível de consciência | Conhece a dificuldade (ou quer reforçar o que o filho vê na escola); não liga criação de jogos a isso |
| Objeção principal | "Isso é jogo, não é estudo", seguida de "meu filho tem dificuldade, vai conseguir?" |
| Papel da página | Mostrar que, ao criar um jogo, números, leitura e lógica ganham um efeito que a criança vê e testa, sem prometer nota e sem substituir a escola |

Decisões já tomadas para esta página (ver [pagina-f-habilidades-escolares-proposta.md](../historico/2026-10-16-antes-da-proposta/pagina-f-habilidades-escolares-proposta.md)) e mantidas aqui: atividade complementar à escola, nenhuma promessa de nota, não segue a série, não é reforço nem alfabetização.

## O que manter

- A abertura da seção 1 ("Ele acompanha o exemplo, mas trava quando a pergunta muda"), que é a mais próxima do Light Copy entre as seis páginas. Ela fica e só é afiada.
- O exemplo dos cinco e dez passos e o jogo do jardim com o contador.
- O cuidado de não culpar a criança nem a escola.
- A resposta honesta sobre notas.

## Diagnóstico desta página

1. **O exemplo mais forte está enterrado.** "Imagine agora um jogo em que um comando faz o personagem andar cinco passos." é o quarto parágrafo da seção 1, e o herói fica no abstrato: "Criar jogos dá um uso concreto ao que seu filho aprende na escola". "Uso concreto" pede o concreto que a página só mostra depois. **Correção:** o número que vira distância sobe para o título do herói.

2. **Lero-lero no apoio do herói.** "Com projetos guiados, o interesse por jogos abre espaço para praticar essas habilidades e mostrar a você o que conseguiu compreender." "Abre espaço para praticar essas habilidades" serve a qualquer atividade (regra 8). **Correção:** o apoio diz a tese e o exemplo em três frases.

3. **A tese perde força num parágrafo de cautela.** "O jeito de ensinar também precisa entrar nessa conversa. Uma resposta errada, sozinha, não mostra que seu filho é incapaz ou que não quer aprender. Vale olhar para as oportunidades que ele teve de experimentar, entender o resultado e tirar a dúvida que ficou." A intenção (não culpar) é boa, mas o parágrafo atrasa a causa. **Correção:** a causa em uma frase (no exercício do caderno, o número não aparece fazendo nada) e o "não é falta de capacidade" dentro dela.

4. **Seis cartões de matéria com o mesmo fecho.** Leitura, matemática, ciências, resolução de problemas, arte e geometria, comunicação, cada um terminando em "também participam", "também aparecem": "São práticas que também aparecem em apresentações, perguntas ao professor e trabalhos com colegas." **Correção:** quatro cartões, cada um com a ação no jogo e o espelho na escola numa frase; geometria vai para um benefício do herói.

5. **Ajuda por mensagens no corpo.** "O apoio acontece por mensagens, de forma assíncrona, e pode ser necessário aguardar o retorno. A assinatura não inclui encontros ao vivo." e, no cartão de comunicação, "Para pedir ajuda por mensagem, descreve onde travou." **Correção:** a seção sobre a dificuldade passa a mostrar a criança investigando com a própria aula (rever o trecho, mudar uma parte por vez, Verificar esta parte). Recados só nas dúvidas.

6. **Fechos abstratos onde cabia uma cena.** "A ligação fica no conceito e no caminho usado para resolver." e "A profundidade depende da atividade e do que a criança já compreende." **Correção:** o exemplo da multiplicação com estrelas, que já existe na página, fecha a seção do responsável.

7. **Jornada como lista de restrições.** "O acesso depende dos requisitos da Jornada, da disponibilidade do serviço e dos créditos da família." **Correção:** o que cada etapa abre, com créditos uma vez e o catálogo como um fato [conferir].

8. **Nenhuma prova e nenhuma alternativa.** A fala do Daniel ("trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática") é a prova exata desta página e não aparece. Também falta comparar com o que a família já tenta (reforço, aplicativo de exercício, explicar de novo em casa). **Correção:** faixa de relatos logo depois da demonstração, falas soltas no método e antes dos planos, a história do André com o parágrafo da escola nos fundadores e uma seção de alternativas própria da F.

## Nova estrutura

| # | Seção (id atual → nova) | Função | Telas | Texto atual |
| --- | --- | --- | --- | --- |
| 1 | herói | Premissa concreta, tese, três consequências | `estudio` (hoje `aula-estudio`) | Reescrito |
| 2 | `f01` → `f01` | Argumento (tese afiada) | `regra` (hoje `aula`) | Mantém a abertura, corta o parágrafo de cautela, sobe o exemplo |
| | faixa "Por dentro da Comunidade" | Mostrar as áreas | 9 telas atuais | Continua depois da seção 2, como hoje |
| 3 | `f02` + `f04` → `experiencia` | Demonstração com o jogo do jardim, com a fala N5 (método) | `jogo-pronto`, `aula-estudio`, `contador`, `salvamento` | Funde as duas sobre o bloco comum §5 |
| 4 | nova → `relatos` | Faixa de relatos (AV08, N11, AV09, AV03) | retratos | Novo (bloco comum §3) |
| 5 | `f03` → `f03` | A escola dentro do jogo (cartas) | sem tela | De seis para quatro cartões |
| 6 | `f05` → `f05` | Quando não funciona: investigar | `pausa` | Reescrito; sai a ajuda por mensagens |
| 7 | `f06` → `f06` | O que você acompanha | `responsavel`, `aprendizagem` | Bloco comum §7 + exemplo da multiplicação |
| 8 | nova → `alternativas` | Paliativo próprio da F | sem tela | Novo |
| 9 | `f07` → `f07` | Jornada | `jornada`, `catalogo` | Encurtado |
| 10 | `origem` | Quem fez, com o parágrafo da escola | sem tela | Bloco comum §4, variante com o parágrafo opcional (decisão sua) |
| 11 | assinatura e garantia | Oferta, com N6 antes dos planos | `perfis` (template) | Blocos comuns §1 e §2 |
| 12 | dúvidas | Objeções | atuais | Bloco comum §8 + perguntas próprias reescritas |
| 13 | `convite` | Cena final | sem tela | Reescrito |

Corpo estimado: cerca de 1.450 palavras sem os fundadores (hoje 2.040).

## Copy proposta

### Herói

> **Chip:** Habilidades da escola
>
> **Título:** No caderno, cinco é só um número. No jogo do seu filho, cinco é a distância que o personagem anda
>
> **Ênfase:** cinco é a distância que o personagem anda
>
> **Apoio:** Muita criança aprende a repetir o passo do exemplo sem saber o que os números representam, e trava quando a pergunta muda. Criando um jogo, ela troca o valor de um comando de cinco para dez e vê o personagem andar o dobro. A aula liga o que ela viu ao que o número significa.
>
> **Benefícios** (ícones jogo, pincel, grupo):
> - Números, leitura e lógica com um efeito que ele vê e testa na hora.
> - Tamanho, posição e cor dos personagens viram escolhas que ele confere no cenário.
> - Ele explica a conta pelo que acontece no jogo, e você entende o raciocínio dele.
>
> **Requisitos:** Para crianças de 9 a 14 anos que leem com autonomia. No navegador do computador, com internet, mouse e teclado. Uma atividade de criação, complementar à escola.
>
> **Botões:** Ver os planos para meu filho (→ `#planos`) · Ver como isso aparece no jogo (→ `#experiencia`)

O título é longo para a regra `ENFASE_NUMA_LINHA`; conferir a quebra no print antes de publicar.

**Títulos alternativos para teste:**
- No jogo que seu filho programa, cada número tem um efeito que ele vê na tela (ênfase "um efeito que ele vê na tela").
- Criar jogos dá um uso concreto ao que seu filho aprende na escola (atual; ênfase "ao que seu filho aprende na escola").

### 2. Argumento (`f01`, tela `regra`)

> **Selo:** Entender a dificuldade
>
> **Título:** Ele acompanha o exemplo, mas trava quando a pergunta muda
>
> Talvez você reconheça a cena: seu filho olha a conta resolvida no caderno e faz outra igual. Quando a pergunta muda um pouco, ele já não sabe por onde começar. Você explica de novo, faz mais um exemplo e tenta descobrir onde ele se perdeu.
>
> Muitas vezes ele aprendeu a repetir os passos e ainda não sabe o que aqueles números representam. Isso acontece porque, no exercício do caderno, o número não aparece fazendo nada: entra na conta, sai um resultado, e só a correção diz se deu certo. Por isso, uma resposta errada, sozinha, diz pouco sobre capacidade ou vontade: muitas vezes, o que faltou foi ver o que o número faz.
>
> No jogo, o número faz. Um comando manda o personagem andar cinco passos. Seu filho troca para dez, aperta para testar e vê o personagem ir duas vezes mais longe. Então volta para cinco e compara. Agora o número é uma distância que ele enxerga, e a aula liga o que ele viu ao que o comando significa.
>
> Essa ligação entre o número e o que ele faz na tela aparece a cada projeto, dentro de uma coisa que seu filho quer ver funcionando.

### 3. Um projeto por dentro (`experiencia`)

Usa a sequência do [bloco comum §5](blocos-comuns.md#5-uma-aula-por-dentro-demonstração-base) com o jogo do jardim. Título e passos trocados:

> **Selo:** Um projeto por dentro
>
> **Título:** No jogo do jardim, cada personagem encontrado soma um no contador
>
> **1. Primeiro ele joga.** Toca nos esconderijos do jardim e vai achando os personagens escondidos, enquanto o contador sobe. Agora ele sabe aonde vai chegar. [conferir: o Cadê Todo Mundo? está na assinatura, ou o exemplo precisa dizer que é um curso à parte]
>
> **2. Depois monta a regra.** Quando tocar no esconderijo, o personagem aparece e o contador soma um. O vídeo mostra cada passo ao lado do editor, e as falas do Zappy têm o botão Ouvir, que lê a instrução em voz alta.
>
> **3. Então testa.** Aperta para jogar e confere se o número mudou na hora certa. Se ele sobe quando o toque cai num espaço vazio, algo na regra está trocado, e é ali que ele vai procurar. No experimento, Uma pista indica onde olhar.
>
> **4. E guarda para amanhã.** O aviso Guardado na sua conta confirma que o projeto ficou salvo, e a faixa O que falta para seguir mostra o próximo passo.
>
> Nessa regra cabem leitura (entender o pedido), contagem (o número que sobe) e lógica (só soma quando encontra). Peça que ele mostre o que faz o número mudar: a explicação dele diz o que entendeu.
>
> **Fala solta, ao fim da seção:** N5 · Daniel · Pai do Rafael · Teoria na prática (texto em [trechos-novos.md](trechos-novos.md))

A frase final do bloco comum (a AV10 da Flávia sobre acompanhar menos) fica fora da F, porque a distribuição desta página usa outras falas. O N5 descreve, na voz de um pai, a mesma sequência que a seção mostra (explicação curta, prática e o jogo pronto no fim); se não for aprovado, a seção termina no parágrafo anterior sem perder nada.

### 4. O que os pais percebem (`relatos`, retratos)

> **Selo:** O que contam sobre as aulas
>
> **Título:** O que os pais percebem quando o filho explica o próprio jogo
>
> **Cartelas, nesta ordem:**
> 1. "Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática." Daniel · Pai do Rafael · Organizar as ideias
> 2. N11 · Flávia · Mãe do Fernando · Prática e foco (texto em [trechos-novos.md](trechos-novos.md))
> 3. "Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele." Harle · Pai do Jeffrey · Mais responsabilidade
> 4. "Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo." Débora · Aluna · Relato sobre o Desafio do Primeiro Jogo

A faixa vem logo depois da demonstração, como no bloco comum §3. A N11 entra só como opinião da Flávia sobre o próprio filho: a cartela não ganha título, legenda ou frase de apoio que a transforme em efeito do curso na escola, e nenhum texto da página repete a ideia dela como promessa. As percepções de Daniel e Harle ficam atribuídas aos filhos deles, sem nota, matéria ou prazo acrescentados. Se a N11 não for aprovada, a faixa segue com três cartelas. Valem as [regras e condições do bloco comum §3](blocos-comuns.md#3-o-que-as-familias-contam).

### 5. A escola dentro do jogo (`f03`, cartas)

> **Selo:** A escola dentro do jogo
>
> **Título:** Leitura, conta e investigação ganham uma tarefa dentro do jogo
>
> **Leitura: entender o que está sendo pedido.** A instrução pede que o personagem apareça depois de um toque. Para montar, ele precisa descobrir o que fazer e quando, como num enunciado. Se não entendeu, volta ao trecho e lê de novo.
>
> **Matemática: prever antes de conferir.** O placar soma pontos, as vidas diminuem, o personagem anda um número de passos. Antes de mudar um valor, ele diz o que vai acontecer; depois joga e confere se acertou.
>
> **Ciências: mudar uma coisa por vez.** No experimento do jardim, ele liga e desliga a reação e compara as duas versões. Mudar uma coisa e observar o efeito é o jeito de investigar que as aulas de ciências pedem.
>
> **Resolver problemas: começar por uma parte.** Um jogo tem personagem, obstáculos e pontos. Ele faz o personagem andar, testa e só então acrescenta a próxima parte. É a mesma organização que um trabalho escolar de várias etapas pede.
>
> [Botão] Ver os planos para meu filho (→ `#planos`)

### 6. Quando não funciona (`f05`, tela `pausa`)

> **Selo:** Quando não funciona
>
> **Título:** O personagem ficou parado, e agora ele tem um problema para investigar
>
> Seu filho montou a regra, apertou para jogar e o personagem não saiu do lugar. Na conta do caderno, o erro só aparece na correção. No jogo, ele aparece na hora, na regra que ele acabou de montar.
>
> Então ele investiga: volta ao trecho do vídeo, compara com a montagem e muda uma parte por vez. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta, e cada novo teste diz se a mudança resolveu.
>
> Reler o pedido, conferir uma etapa e tentar de novo também são o que um problema de matemática pede. No jogo, ele pratica isso toda vez que o personagem não obedece, e sem ninguém dando a resposta pronta.

### 7. O que você acompanha (`f06`)

[Bloco comum §7](blocos-comuns.md#7-o-que-você-acompanha), com um parágrafo próprio no fim:

> Dá para aproximar o jogo da matéria da semana. Se a escola está em multiplicação e, numa atividade, ele define quantos pontos vale cada estrela, pergunte quantos pontos ele faz com quatro estrelas e joguem para conferir. Se a dificuldade é começar uma tarefa, lembre com ele por qual parte o jogo começou.

### 8. Alternativas (`alternativas`, própria da F)

No lugar do bloco comum §6, porque o paliativo desta família é outro:

> **Selo:** Antes de escolher
>
> **Título:** O aplicativo de exercício dá ponto por acerto; no jogo que ele cria, é ele quem decide quanto vale o ponto
>
> **Reforço escolar.** Quando há matéria atrasada, um professor de reforço retoma o conteúdo da série, e para isso ele é a escolha certa. A Comunidade não segue a série e não substitui esse trabalho.
>
> **Aplicativo de exercício.** Transforma a lista em desafio, com pontos e fases, e a criança responde ao que o aplicativo pergunta. Criando o jogo, ela escreve a regra que dá os pontos, e por isso precisa entender a conta por dentro.
>
> **Explicar de novo em casa.** Funciona quando você tem tempo e jeito para aquela matéria. Aqui a explicação fica gravada ao lado do editor, e você entra na conversa pelo jogo que ele mostra, deixando a aula para a aula.

### 9. Jornada (`f07`, telas `jornada`, `catalogo`)

> **Selo:** Jornada do Criador
>
> **Título:** Um jogo puxa o próximo, e cada etapa abre uma ferramenta
>
> Os cursos são projetos de jogo em sequência. Quando conclui [conferir: nome do curso de entrada] e publica o projeto, seu filho chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para ele voltar a um jogo, mudar uma regra e testar outra conta.
>
> No posto Inventor chegam o Pensa, que ajuda a dividir uma ideia de jogo em tarefas, e o Zappy, que examina os blocos no Estúdio sem mexer no projeto. Os dois usam os créditos de IA da família. [conferir: hoje os cursos publicados levam até o posto X; os próximos entram na assinatura assim que forem lançados.]

### 10 e 11. Fundadores, assinatura e garantia

- **Fundadores:** [bloco comum §4](blocos-comuns.md#4-quem-fez-o-que-seu-filho-vai-usar), a história aprovada do Sobre nós, **na variante com o parágrafo opcional da escola** (decisão sua; o bloco o recomenda nesta página), com as fotos reais do certificado e das medalhas. O parágrafo fica como relato de vocês sobre o André ("Contamos isso como pais, pelo que vimos no André") e convive com a resposta das dúvidas sobre notas, que continua dizendo que a Comunidade não promete nota a ninguém.
- **Assinatura e garantia:** blocos comuns [§1](blocos-comuns.md#1-assinatura-o-bloco-dos-planos) e [§2](blocos-comuns.md#2-garantia), com a fala solta N6 · Daniel · Pai do Rafael · Como uma atividade extra (texto em [trechos-novos.md](trechos-novos.md)) antes dos cartões dos planos.

### 12. Dúvidas

Grupos do [bloco comum §8](blocos-comuns.md#8-dúvidas), com um grupo próprio na frente, "Aprendizagem e escola", e duas perguntas próprias no grupo "Para começar". Estas respostas substituem as de `habilidades-escolares-faq.ts`:

> **Isso ajuda meu filho na escola?**
> Dá uso a coisas que ele vê na escola. No jogo, ler a instrução, usar um número e seguir uma lógica têm um efeito que ele testa: quando explica por que o placar subiu três pontos, está usando a conta para justificar uma escolha. Reconhecer a mesma ideia numa prova é outro passo, e as conversas em casa ajudam a fazer essa ponte. A Comunidade é uma atividade complementar à escola.

> **A Comunidade promete melhorar as notas?**
> Não. A nota depende da escola, do conteúdo da série e de muita coisa que acontece fora daqui. O que vocês conseguem ver diretamente é o jogo que ele fez e o que ele consegue explicar sobre ele.

> **Os cursos seguem a série escolar do meu filho?**
> Não. A Jornada segue projetos de jogo, do mais simples ao mais elaborado, e não o conteúdo de cada série. Leitura, números e lógica aparecem dentro das tarefas de cada projeto. Por isso ela não substitui o reforço quando há matéria atrasada.

> **Como sei se ele entendeu ou só seguiu os passos?**
> Peça que ele preveja antes de testar: "se eu trocar cinco por dez, o que acontece?". Prever o efeito pede que ele saiba o que o número faz, e copiar os passos não dá isso. A marca de conclusão diz que ele cumpriu a aula; a previsão, o teste e a explicação dizem o que ele entendeu.

> **E se ele gosta de jogar, mas nunca quis criar?**
> Mostre a ele as telas desta página e pergunte o que mudaria num jogo de que gosta: o personagem, uma regra, a dificuldade de uma fase. A primeira aula começa com ele jogando, antes de montar. E, se nos sete dias ele não se envolver, vocês pedem o reembolso.

> **Meu filho tem dificuldade em matemática. Ele consegue começar?** (grupo "Para começar")
> O começo foi feito para isso: cada passo aparece no vídeo ao lado do editor, e os números entram como coisas que ele vê, como passos, pontos e vidas. Nas primeiras aulas, vale sentar junto e observar como ele lida com as quantidades. A Comunidade não tem um plano individual de reforço de matemática.

> **E se ele não gosta de ler ou ainda precisa de ajuda com textos?** (grupo "Para começar")
> Ler faz parte: a criança precisa ler as instruções e os blocos com alguma autonomia. A aula ajuda com o vídeo, e as falas do Zappy têm o botão Ouvir, que lê em voz alta. Se ele ainda precisa de bastante ajuda para entender uma instrução, acompanhe as primeiras tarefas para ver quanto apoio é necessário. A Comunidade não alfabetiza.

A resposta "Eu preciso saber programação para acompanhar?" passa a ser a do bloco comum, sem a menção aos Recados.

### 13. Convite (`convite`)

> **Selo:** Para começar juntos
>
> **Título:** Na próxima vez que ele chamar você para jogar, peça para ver a conta por trás do placar
>
> Abram juntos a primeira aula num dia combinado. Ele joga, monta a primeira regra e mostra para você o número mudando na hora certa.
>
> Daí para a frente, os jogos trazem contas, instruções e ideias para ele explicar, e você ganha um assunto de escola que começa pelo que ele quer fazer. Se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.
>
> [Botão] Escolher um plano para meu filho (→ `#planos`)

### SEO

> **Title:** Criar jogos e praticar o que se aprende na escola | Comunidade dos Criadores | Sistema Zero
>
> **Description:** No jogo que seu filho programa, números, leitura e lógica têm um efeito que ele vê e testa. Atividade complementar à escola, para crianças de 9 a 14 anos.

## Por que essas mudanças

- **Especificidade no topo (Manual, princípio 5).** O exemplo dos cinco passos, que era o melhor da página, vira o título; o leitor entende a tese antes de rolar.
- **Tese sem culpa (regra 9 e direção kids).** A causa fica numa frase (o número não aparece fazendo nada no exercício) e já inclui que o erro não é falta de capacidade nem de vontade, sem criticar a escola.
- **Menos cartões, mais ação (regra 8).** Cada cartão tem uma ação no jogo e um espelho na escola; os fechos repetidos saem.
- **A plataforma orienta (decisão de 05/10).** A seção da dificuldade mostra a criança investigando com a aula; Recados só nas dúvidas.
- **Prova em três lugares, como no destaque Avaliações (8D, função 6).** Daniel (N5) confirma o método; a faixa reúne Daniel (AV08), Flávia (N11, como opinião dela), Harle (AV09) e Débora (AV03); Daniel (N6) põe a assinatura na régua das atividades extras; e a história do André, contada pelos pais, é a prova mais forte que existe para esse público. Nenhuma frase da página depende das falas novas.
- **Alternativas (8D, função 2).** A seção reconhece o reforço como a escolha certa para matéria atrasada, o que deixa a página mais confiável para esse pai.
- **Limites ditos uma vez, com clareza.** Sem promessa de nota, sem série, sem reforço, sem alfabetização: cada limite em uma resposta das dúvidas, como fato.

## Hipóteses de teste

1. **Título do herói:** atual ("Criar jogos dá um uso concreto ao que seu filho aprende na escola") × proposto ("No caderno, cinco é só um número…"). Métrica: clique em "Ver como isso aparece no jogo" e em "Ver os planos".
2. **Seção de alternativas:** com × sem. Métrica: início de checkout e abertura das dúvidas "notas" e "série".
