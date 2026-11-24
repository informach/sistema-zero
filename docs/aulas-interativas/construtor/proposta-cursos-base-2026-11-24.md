# Construtor: estudo e proposta dos cursos da trilha

**Etapa 1 — desenho dos jogos 2D e 3D e divisão da autoria**

Data: 24/11/2026. Referência estudada: `informach/sistema-zero`, branch `staging`, commit `9ca0696aef5a536846525704b9d01261e2bd0da7`.

**Estado: proposta para revisão de Helena.** Este documento registra o estudo do Faísca, o enquadramento na Jornada e as decisões propostas para os dois jogos. Não é roteiro de gravação, manifesto de aula, projeto jogável novo nem alteração da política publicada.

## 1. Decisão proposta

O Construtor deve fazer a criança passar de **programar uma relação entre acontecimentos** para **combinar sistemas que formam uma partida**.

- **Nave Contra Asteroides**, com Jogo 2D: nave na parte inferior, movimento lateral, tiros para cima e asteroides descendo.
- **Patrulha Espacial**, com Jogo 3D: nave vista por trás e de cima, movimento lateral em X, altura fixa e asteroides chegando pela profundidade Z. Tiros são objetos reais que percorrem o espaço.
- Os dois jogos compartilham as mesmas regras principais. A segunda versão permite reconhecer o que continua igual e aprender o que muda no espaço e nos blocos da extensão.
- O projeto inicial entrega as artes, a apresentação e apoios técnicos explicitamente identificados. A criança constrói surgimento, acerto, pontuação, dano, condições de resultado e regras de execução da partida.
- A construção inteira do ambiente e do programa, começando sem blocos, fica para o **Inventor**, conforme a orientação nova de Helena nesta conversa.

A quantidade de trabalho será medida pelos sistemas que a criança consegue compreender e modificar. Percentuais de blocos não são uma boa medida: desenhar um cenário pode ocupar muitos blocos e ensinar menos sobre a partida que uma condição curta de vitória.

## 2. Fontes e leitura do estado atual

Foram examinados os índices e materiais do Faísca, seus projetos geradores e verificadores, o Nave existente, a Jornada e seu currículo editorial, os catálogos de blocos e exemplos das duas extensões e trechos do runtime que mudam a viabilidade da proposta.

Há três distinções necessárias para interpretar esse material:

1. **Currículo do repositório e política publicada são fontes diferentes.** O JSON descreve o currículo editorial aprovado e alimenta o seed. A política publicada governa o acesso real. Este estudo não consultou o banco de alunos nem confirmou o catálogo publicado. [Fontes: Jornada e currículo][jornada]
2. **Arquivos gerados não comprovam produção.** Vários cursos do Faísca têm autoria local completa e pendências de voz, vídeo, importação ou publicação. A classificação abaixo trata do conteúdo disponível para estudo. [Fonte: índice Faísca][faisca]
3. **Decisões específicas recentes prevalecem sobre notas históricas.** O Jardim recebeu uma revisão em 24/11 que muda a missão; os Poderes receberam revisão em 23/11. Não copiar instruções antigas de ajuda e de montagem sem confrontá-las com essas versões. [Fonte: Jardim][jardim]

### 2.1 O que foi encontrado no Faísca

| Papel | Curso | Organização atual da autoria |
| --- | --- | --- |
| Trilha 2D | A Chave do Farol | Três aulas de construção e encerramento/certificado |
| Trilha 3D | A Ilha do Farol | Três aulas |
| Missão | O Jardim Secreto | Uma parte 2D e uma parte 3D |
| Poder | Moedas no caminho | Contador e objetivo por quantidade, nas duas dimensões |
| Poder | O segredo da cabana | Combinação de informações, nas duas dimensões |
| Poder | A ponte apressada | Ação temporária e tempo, nas duas dimensões |
| Poder | O baú dos símbolos | Estado que registra uma sequência, nas duas dimensões |
| Extra | Cadê Todo Mundo? | Evento e contagem em outro jogo; duas aulas e certificado |
| Extra | Meu primeiro desenho no Pinta | Criar uma imagem e usá-la no Farol |

O índice específico do Faísca está mais atualizado que o índice geral de aulas. Os materiais estudados abrangem o posto, e não apenas a primeira aventura. [Fonte: índice Faísca][faisca]

### 2.2 O que a criança fez nos dois cursos principais

| Etapa | Construção da criança | Apoio que já existia |
| --- | --- | --- |
| Farol 2D, movimento | Ativar direções, mover a cada quadro e limitar à tela | Tela, personagem, posições, imagens e desenho por quadro |
| Farol 2D, chave | Encontro, retirada, criar e alterar `temChave`, modificar aviso | Chave e demais objetos, aviso inicial e apresentação do HUD |
| Farol 2D, decisão | Se/senão, resposta sem chave, vitória, imagem acesa e personalização | Barco, deslocamento do barco e acabamento visual da chegada |
| Ilha 3D, movimento | Movimento por comando da extensão e teste das direções | Cena, câmera, modelos, chão permitido, sólidos e animações |
| Ilha 3D, chave | Alterar posição, encontro, esconder, memória e aviso | Modelos posicionados, escala, enquadramento e HUD |
| Ilha 3D, decisão | Decisão, acender, marcar vitória, guarda `Se não ganhou`, personalizar | Chegada do barco, continuidade da animação e reinício por R |

Essa divisão está no código dos projetos progressivos. O Farol 2D começa sem movimento, coleta ou regra da porta, mas com a apresentação montada. A Ilha começa com a preparação espacial e a infraestrutura de animação, mas sem as regras que a criança construirá. [Fontes: projeto Farol][farol-projeto] e [projeto Ilha][ilha-projeto].

O Faísca já usa uma solução valiosa: a criança programa a **condição que provoca um resultado visual preparado**. Ela pode acender o farol e trazer o barco sem precisar construir a animação inteira. No Construtor, o mesmo princípio pode preservar a qualidade visual enquanto aumenta a autoria das regras.

### 2.3 Repertório que pode ser retomado

Podemos retomar eventos, a organização básica do Estúdio, uma informação verdadeira ou falsa, Se/senão, `não`, coleta/contato, posições e testes antes/depois de uma condição. Também podemos retomar a prática de verificar e enviar o projeto.

**Não podemos presumir que todos já saibam contadores, comparações numéricas, grupos, relógios ou combinações com E/OU.** O aluno concluiu um Poder do Faísca, mas pode ter escolhido qualquer um. Cadê Todo Mundo? e Pinta também são extras. Os conteúdos necessários à base do Construtor precisam ser ensinados ali. [Fontes: Jornada][jornada] e [currículo][curriculo].

Usar um número no campo velocidade tampouco comprova que a criança investigou velocidade. No Farol, valores foram mantidos sem transformar toda a preparação em assunto de aula. Sinais e velocidades dos tiros precisarão de uma investigação curta própria.

## 3. Como os cursos foram feitos e o que preservar

### 3.1 A estrutura pedagógica

O padrão do Faísca é uma sequência com funções diferentes:

1. **Jogar uma referência pronta:** perceber qual jogo será construído, seus controles e objetivo.
2. **Entender uma ideia:** vídeo curto que liga o conceito a algo concreto.
3. **Investigar:** experiência manipulável, com Zappy orientando conforme o que acontece.
4. **Construir:** montagem completa no Estúdio, aplicada ao próprio projeto.
5. **Testar e verificar:** observar a consequência, conferir objetivos e corrigir.
6. **Enviar:** uma entrega no fim da última construção da aula, depois das escolhas.

Uma aula pode ter várias partes. Cada parte de montagem trabalha uma ideia. A primeira aula já termina com algo construído; apresentação e caderno entram nela, sem criar uma aula inteira de introdução. [Fontes: diretrizes][diretrizes] e [descoberta guiada][descoberta].

Na experiência, a criança observa a relação sem precisar ler blocos. O vídeo não faz a investigação no lugar dela nem dá um passeio pelos controles. A montagem seguinte ensina caminho da paleta, bloco literal, destino, encaixe, campos, valores e testes. A orientação de colocar o destino à vista antes de pegar a peça deve continuar.

**A autonomia aumenta pela extensão da autoria, pelas decisões e pela transferência.** Nos cursos da trilha, os gestos necessários continuam sendo ensinados. O 3D pode retomar conceitos com menos repetição, mas a montagem com os blocos 3D deve ser completa.

### 3.2 Projeto contínuo e verificação

Cada curso mantém um projeto da criança entre as partes. Os exemplos de entrada e solução registram estados progressivos. Uma solução intermediária não pode já conter a resposta da etapa seguinte.

Os objetivos crescem cumulativamente: ao acrescentar vidas, não pode deixar de funcionar o tiro já construído. O verificador deve executar comportamentos, além de conferir a montagem quando ela é o objetivo. Ter um bloco em qualquer lugar não comprova acerto, contagem ou reinício.

Personalizações de imagem, texto e valores válidos precisam sobreviver à continuidade. Um exemplo de recuperação não deve substituir silenciosamente o trabalho da criança. [Fontes: descoberta guiada][descoberta] e [padrão atual do Faísca][padrao].

### 3.3 Base, missão e Poder têm papéis próprios

Os cursos da trilha ensinam a construção. Os Poderes acrescentam mecânicas. A missão verifica a aplicação em outro contexto.

A revisão do Jardim de **24/11/2026** determina missão sem montagem no vídeo, dicas ou quiz, com referências às aulas em que a ideia foi ensinada e caderno após o primeiro envio. A missão do Construtor deverá seguir essa orientação na etapa futura. Ela não é o molde a usar para ensinar as bases. [Fonte: revisão do Jardim][jardim]

Os cursos e Poderes têm montagem guiada completa, inclusive no 3D conforme a revisão atual do Faísca. Isso evita confundir a transferência espacial com abandono da instrução.

### 3.4 Produção editorial

Há uma fonte editorial compartilhada entre públicos. Roteiro, manifesto, falas da professora, falas de Dedé/Debinha, edição e Passo a passo devem representar a mesma versão. Na versão Kids, intervenções dos personagens substituem frases definidas da fala principal.

Nave usa fontes em `docs/aulas-interativas-tecnico/qa/`, incluindo `nave-contra-asteroides.conteudo.json` e seus geradores. Quando começarmos a reautoria, será necessário editar as fontes e regenerar as saídas. Alterar apenas o Markdown ou apenas o manifesto deixaria o curso divergente. [Fonte: apoio técnico][apoio]

## 4. Lugar do Construtor na Jornada

A ordem vigente no currículo é **Faísca → Construtor → Inventor → Explorador → Mestre → Arquiteto → Gênio → Lenda**. O Construtor trabalha a promessa: reunir várias regras em uma partida que começa, termina e recomeça. [Fontes: Jornada][jornada] e [currículo][curriculo].

### 4.1 Cursos previstos

| Papel | Curso ou conjunto | Relação com esta etapa |
| --- | --- | --- |
| Trilha 2D | Nave Contra Asteroides | Refazer o desenho e depois a autoria do curso existente |
| Trilha 3D | Patrulha Espacial | Estruturar o novo curso; este é o nome editorial atual |
| Missão 2D e 3D | A Estação de Reciclagem | As bases precisam ensinar o repertório que ela aplicará |
| Poderes | Escudo temporário; Tiro triplo; Inimigo que atira; Chefão com resistência; Troca de arma | Reservar essas melhorias para a escolha posterior |
| Extras | O Jogo do Meu Jeito; A Tartaruga; Minha primeira peça | Não são pré-requisitos das bases nem da promoção |

Após os cursos 2D e 3D, missão, Poderes e extras abrem juntos. Para avançar, o aluno conclui a missão nas duas dimensões e aplica **dois Poderes distintos**. Duas versões do mesmo Poder não contam como dois. Mural, XP e extras não são requisitos de promoção. [Fonte: Jornada][jornada]

A sequência proposta é **Nave 2D e depois Patrulha 3D**, conforme a Jornada. A segunda base retoma sistemas que a criança já construiu, ensina a montagem correspondente com os blocos 3D e investiga as diferenças espaciais.

A Estação de Reciclagem reutiliza criação por tempo, grupos, colisão, pontos, vidas, resultado e reset com coletor e peças. Coletar a peça correta soma um ponto; a incorreta tira uma vida; cada peça deixa de participar após a coleta. O cenário, o coletor, os dois tipos visuais e as posições fixas de entrada chegam preparados. A missão também confere uma mudança de meta e o reinício completo. Ela não pode exigir câmera, modelagem, um Poder específico ou um sorteio novo que as bases não tenham ensinado. [Fonte: currículo][curriculo]

A missão mantém os apoios cuja construção não foi ensinada nas bases. No 3D, não pode exigir que a criança refaça sozinha o transporte, o controle lateral ou os percursos preparados. A matriz de autoria da seção 7 também orientará os critérios da missão.

### 4.1.1 Requisitos dos Poderes e papel dos extras

Os pré-requisitos abaixo são do plano curricular atual. Eles mostram quais fundamentos precisam aparecer nas bases e quais novidades ficam para uma escolha posterior. Não pressupõem um Poder específico do Faísca. [Fonte: currículo][curriculo]

| Poder | Fundamentos exigidos das bases | Novidade e evidência esperada |
| --- | --- | --- |
| Escudo temporário | Vidas, colisão e relógio | Item que protege por um período; batidas voltam a causar dano quando o efeito acaba |
| Tiro triplo | Criação de tiros e grupos | Três projéteis com sentidos diferentes; todos nascem na nave e são retirados ao sair |
| Inimigo que atira | Grupos, relógio, colisão e vidas | Inimigo com disparos próprios; projéteis causam dano e não sobrevivem ao reinício |
| Chefão com resistência | Contadores, estados e colisões | Um alvo exige vários acertos; a derrota acontece uma única vez ao esgotar sua vida |
| Troca de arma | Memória, condição e tiros | Equipamento muda o disparo; a nova partida restaura a configuração inicial |

Os extras ampliam ferramentas e expressão: **O Jogo do Meu Jeito** trabalha arte e animação no Pinta; **A Tartaruga** apresenta Python desde o início por meio de desenhos; **Minha primeira peça** apresenta o Molda e a importação de um modelo numa cena preparada. Nenhum deles substitui a missão ou um Poder obrigatório. As bases não dependem de arte produzida nesses extras. [Fonte: currículo][curriculo]

### 4.2 A nova progressão solicitada

| Posto | Ponto de partida | Responsabilidade central da criança |
| --- | --- | --- |
| Faísca | Mundo e boa parte da apresentação preparados | Fazer o jogo responder, guardar uma informação e decidir |
| Construtor | Apresentação e apoios técnicos preparados; partida incompleta | Construir os sistemas que fazem objetos surgir, interagir, contar e encerrar uma partida |
| Inventor, nova direção | Projeto sem blocos | Montar também inicialização, apresentação e estrutura do programa, além das novas regras do jogo |

**Divergência registrada:** o currículo JSON contém um plano anterior do Inventor que entregaria estados, placar e reinício prontos. A orientação de Helena nesta conversa substitui essa premissa para o planejamento futuro. O currículo e o Inventor deverão ser conciliados quando essa frente for trabalhada; este documento não altera agora o seed ou a política publicada.

Começar sem blocos no Inventor não precisa significar desenhar ou modelar todas as artes. A exigência nova é a autoria do programa completo. Assets podem continuar disponíveis como materiais, sem blocos pré-montados.

## 5. Diagnóstico do Nave Contra Asteroides atual

O curso existente já usa a extensão **Jogo 2D**. Seu início é vazio: não há blocos, comandos iniciais, eventos ou laços. A criança começa preparando a tela, criando a nave e desenhando. São nove aulas. Portanto, ele precisa mudar para assumir o lugar intermediário solicitado agora. [Fontes: etapas do Nave][nave-etapas] e [índice do curso][nave].

### Aproveitar

- A sequência de conquistas: mover, atirar, acertar, contar e terminar.
- O tiro nascer na posição atual da nave.
- Distinguir o grupo do objeto específico que colidiu.
- Retirar os envolvidos antes que continuem interagindo.
- Limpar objetos que saíram da área.
- Bloquear disparos e criação quando a partida não está em andamento.
- Conferir os dois resultados e o reinício.
- Experiências que realmente concretizem essas relações, após revisão de adequação ao novo jogo.

### Refazer

- O ponto de partida: ambiente e nave já visíveis.
- A distribuição da carga: diminuir preparação de tela e desenho; dar espaço aos sistemas da partida.
- O relógio: preferir segundos para a cadência de surgimento, em vez de ensinar uma equivalência fixa entre quadros e tempo.
- A apresentação, os parâmetros e os projetos progressivos dos dois jogos, como um par planejado.
- Os critérios e as experiências, conforme as decisões desta proposta.
- A regra de conflito entre vitória e derrota. O programa antigo usa verificações independentes; no novo, o resultado deve ser único e ter prioridade definida.

O curso antigo usa meta 26; o exemplo 2D da galeria usa 25 e inclui perda de vida por asteroide escapado. Essas são regras de referências diferentes, não requisitos que precisem ser herdados. A proposta abaixo escolhe deliberadamente outra meta inicial e uma única origem de dano. [Fontes: projeto do curso][nave-projetos] e [exemplo da galeria][galeria-2d].

## 6. Os jogos propostos

### 6.1 Ideia comum

Uma nave abre uma passagem em um campo de asteroides. Para liberar a rota, o jogador precisa acertar uma quantidade de asteroides antes de perder suas três vidas.

Atirar permite avançar em direção à meta; desviar preserva vidas. A nave, o laser e o asteroide têm silhuetas e sons distintos. O acerto responde imediatamente. O objetivo fica visível durante a partida, e o resultado convida a tentar outra vez.

A arte pode ser personalizada com as opções fornecidas. Produzir pixel art, desenhar asteroides ou modelar a nave fica para os extras correspondentes. O jogo base precisa ser atraente com os materiais de entrada.

### 6.2 Regras comuns, fixadas para esta proposta

| Elemento | Regra |
| --- | --- |
| Movimento | Lateral, contínuo enquanto a seta estiver apertada; sem sair da área permitida |
| Disparo | Um tiro por aperto de Espaço; segurar não vira disparo automático |
| Origem do tiro | Posição atual da nave, com saída visual coerente com seu bico |
| Trajetória | Reta; tiros e asteroides percorrem sentidos opostos |
| Asteroides | Um único tipo funcional, de um acerto; variação visual pode vir pronta |
| Surgimento | Intervalo constante durante a partida; posições válidas fornecidas como apoio |
| Acerto | Um tiro consome um asteroide e é consumido; soma um ponto uma única vez |
| Asteroide escapado | É retirado; não soma ponto e não tira vida |
| Batida na nave | Retira o asteroide e tira uma vida; a proteção breve do motor evita dano repetido no mesmo contato |
| Vidas | Três no começo de toda nova partida |
| Vitória | Atingir ou ultrapassar a meta com pelo menos uma vida |
| Derrota | Ficar sem vidas |
| Conflito no mesmo ciclo de resolução | Derrota tem prioridade se as vidas chegaram a zero; caso contrário, conferir a meta |
| Fim | Um resultado; nenhuma criação, contagem ou batida posterior altera a partida encerrada |
| Reinício | Restaura pontos, vidas, grupos, relógios e posição, mantendo o programa e as personalizações |

A decisão de não tirar vida por um asteroide escapado mantém a causa do dano visível: a nave bateu. O jogador pode escolher desviar. Essa regra também evita punir duas vezes uma mesma situação.

O escudo coletável, tiros em ângulo, inimigos que atiram, chefão e troca de arma ficam disponíveis como evolução nos Poderes. A proteção curta após dano é uma proteção técnica da vida da nave; não é o Poder Escudo temporário.

### 6.3 Parâmetros iniciais para o protótipo

Estes valores são escolhas de partida para a próxima implementação, não resultados de um ensaio realizado:

| Parâmetro | Proposta inicial | Como conferir |
| --- | --- | --- |
| Meta | 20 acertos | Meta visível e partida com duração apropriada no teste com iniciantes |
| Vidas | 3 | Há oportunidade de perceber o erro e continuar |
| Intervalo entre asteroides | 1,5 segundo | Permite observar o nascimento e antecipar a aproximação |
| Variação de dificuldade | Constante ao longo da partida | Não existe aceleração automática ou mudança de classe |
| Configuração alternativa de investigação | 1 ou 2 segundos, mudando uma coisa por vez | A criança compara o efeito do intervalo |
| Tempo de reação desejado | Aproximadamente quatro segundos entre entrada e altura da nave | Medir nos dois motores, sem copiar velocidades numéricas entre unidades diferentes |

Os 20 acertos não devem virar uma constante espalhada: usar uma meta legível que o aluno possa alterar e que a condição consulte. Não cobrar exatamente 20 em todo projeto personalizado. Na versão de ensaio do curso, usar a configuração de referência para comparar efeitos.

### 6.4 Nave Contra Asteroides: funcionamento em 2D

A referência lógica é uma tela de 800 × 480, como o curso existente. A nave fica perto da parte inferior, com espaço de respiro para o tiro nascer. Asteroides entram acima da área visível e descem. Estrelas se movem ao fundo como apresentação pronta.

- X representa a posição lateral.
- Y cresce para baixo na tela.
- O tiro tem velocidade vertical negativa.
- O asteroide tem velocidade vertical positiva.
- Esquerda/direita movem a nave; Espaço dispara.
- Enter inicia na abertura e, depois do resultado, retorna à abertura por reinício.

O indicador mostra pontos/meta e vidas. A criança programa o placar a partir de uma variável e os eventos que alteram o resultado. Ela não precisa construir o sistema de fontes, partículas ou desenho da nave.

### 6.5 Patrulha Espacial: funcionamento em 3D

A câmera fica atrás e um pouco acima da nave, apontando para o campo de asteroides. O jogador percebe objetos pequenos ao longe que se aproximam e crescem na imagem. O laser viaja de fato até o alvo; apertar Espaço perto de um asteroide não o elimina automaticamente.

- A nave varia apenas em X.
- A altura Y permanece constante, inicialmente 1.
- A nave ocupa uma profundidade fixa próxima de Z = 0.
- Asteroides nascem ao fundo, em Z negativo, e avançam em direção a Z positivo.
- Tiros partem à frente da nave e avançam para Z negativo.
- Nave, alvos e tiros compartilham a faixa de altura que torna o acerto possível.
- A câmera e a orientação visual dos modelos chegam preparadas.

Assim, o 3D acrescenta profundidade, escala aparente e contato espacial. Não exige controlar altitude, virar a câmera, calcular ângulos ou pilotar em seis direções.

O jogo usará **abertura autoral**, com aviso e evento Enter para mudar o estado para jogando. Não usar a tela nativa de início que pausa os eventos, pois ela impediria esse Enter de autoria. No resultado, usar a tela nativa do Jogo 3D e seu botão de reinício, com texto **Voltar ao início**. Depois do botão, o programa é executado novamente e Enter começa a nova partida.

**O controle de fim é uma diferença real entre as versões:** no Jogo 3D, a tecla R montada como evento não funciona depois do fim nativo; o botão funciona. O curso deve explicar e mostrar o controle real. [Fonte: regras e telas 3D][regras-3d]

### 6.6 Por que essas referências da galeria

O Nave da galeria oferece a estrutura do tiro vertical. A Patrulha oferece a profundidade e o projétil real. Os exemplos mais complexos acrescentam duas classes de meteoros, recarga, balanço, aumento de velocidade, pontos por tempo ou perseguição.

Esses elementos não entram como regras obrigatórias da base. O Caça Estelar pode inspirar um curso futuro de arena, mas seu ataque por proximidade não é a referência correta para ensinar um projétil que viaja. [Fontes: Nave][galeria-2d], [Patrulha][galeria-3d] e [Caça Estelar][caca].

## 7. Projeto inicial e autoria da criança

### 7.1 Regra para o projeto inicial

O início deve executar sem erro e apresentar um cenário cuidado. Ele não deve conter uma partida completa que a criança apenas liga.

No **2D**, haverá nave visível, ambiente e desenho por quadro. A nave ainda não anda e não atira; não existem asteroides ativos, acertos, pontos, dano ou resultado.

No **3D**, haverá ambiente, câmera, modelos, nave pilotável lateralmente e dois grupos vazios. Ainda não há tiros, asteroides ativos, acertos, pontos, dano ou resultado. O movimento lateral preparado evita que uma diferença técnica de controle consuma o curso de transferência.

O jogo pronto que a criança experimenta na abertura é um exemplo separado. Não é o projeto inicial entregue para editar.

### 7.2 Matriz de responsabilidades

| Sistema | Inicial 2D | Construção no 2D | Inicial 3D | Construção no 3D |
| --- | --- | --- | --- | --- |
| Artes e apresentação | Nave, fundo, efeitos e opções visuais | Escolher opções e textos conhecidos | Modelos, materiais, céu, iluminação e câmera | Escolher opções compatíveis |
| Nave visível | Criação e desenho prontos | Retomar posição e aparência quando necessário | Modelo, escala, posição e orientação prontos | Conferir a relação com tiros e alvos |
| Controle lateral | Não pronto | Movimento e limite, como retomada do Faísca | Motor lateral, limite e estabilidade prontos | Observar X e usar a posição atual no tiro |
| Grupos | Não declarados | Criar `tiros` e `asteroides` | Os dois grupos vazios já declarados | Criar cópias e gerir seus conteúdos; não alegar que os declarou |
| Tiros | Não existem | Evento, nascimento, velocidade, movimento, desenho e retirada ao sair | Molde visual e transporte de grupos preparados | Evento, cópia na nave, direção configurada e limpeza por limite |
| Asteroides | Não existem | Grupo, relógio, criação, velocidade, movimento, desenho e limpeza | Molde e transporte de grupos preparados | Relógio, cópia, direção e limpeza por profundidade |
| Posição de entrada | Faixa segura e expressão de posição fornecidas como material de apoio | Usar o valor fornecido na criação; autoria do relógio e do nascimento | Faixa segura e expressão de posição fornecidas | Usar o valor fornecido; autoria do relógio e da cópia |
| Tiro × asteroide | Nenhuma regra | Montar colisão dos grupos e suas consequências | Dois percursos de grupos, variável `alvoAtivo` e sua guarda preparados, com regra de acerto vazia | Montar contato, retirar os dois envolvidos e marcar `alvoAtivo` como falso |
| Pontos | Nenhuma pontuação | Criar variável zero, somar no acerto e mostrar o valor | Nenhuma pontuação | Criar variável zero, somar no acerto e mostrar o valor |
| Vidas e dano | Nenhuma regra de dano | Dar três vidas, retirar uma na batida e consultar a vida | Nenhuma regra de dano | Dar três vidas, evento nave × grupo, dano e consulta da vida |
| Proteção após dano | Recurso da extensão | Configurar/usar e observar, sem construir o motor de proteção | Recurso da extensão | Usar e observar, sem construir o motor de proteção |
| Estado da partida | Modo de construção executa diretamente | Abertura, começo, guardas e estados finais | Modo de construção executa diretamente | Variável de estado, começo e guardas; resultado usando a tela nativa |
| Vitória/derrota | Não existem | Condições, prioridade e telas | Não existem | Condições, prioridade e chamada de fim |
| Reinício | Não faz parte da regra inicial ensinada | Ligar o bloco de reinício e conferir inicialização completa | Mecanismo do botão final pertence à extensão | Programar os valores iniciais e comprovar reconstrução completa pelo botão |

**As expressões de posição fornecidas são apoio explícito.** A expressão produz uma posição de entrada válida a cada criação. A criança a encaixa no nascimento do asteroide e observa seu efeito: programa quando ele nasce e a criação naquela posição. Projetar distribuição, limites de sorteio e progressão de dificuldade não será critério destas bases; esse trabalho pertence à futura autoria do Inventor. A próxima produção deve usar blocos existentes para a expressão fornecida, com margens verificadas, sem JavaScript cru ou novas APIs inventadas.

Os apoios não devem aparecer como um emaranhado de rotinas sem identificação. Organizar a área para a criança reconhecer preparação e regras que está construindo, usando os recursos de organização existentes no Estúdio. Não pressupor um sistema novo de pastas, bloqueios ou macros.

### 7.3 Particularidades indispensáveis do apoio 3D

**Grupos vazios existem desde o começo.** Como os percursos e o transporte preparados os referenciam, deixá-los ausentes produziria erros. A criança já terá construído grupos no 2D e retoma aqui essa ideia; no 3D ela povoará os grupos e controlará as cópias.

**Velocidade vai para a cópia.** `spawnCopy` não herda a velocidade do molde. O apoio deve percorrer as cópias, aplicar a velocidade do grupo e depois movê-las. As velocidades iniciais de transporte podem ser zero, para a criança configurar o componente Z na parte correspondente. O mecanismo que aplica essa velocidade às novas cópias chega pronto. [Fonte: runtime 3D][runtime-3d]

**O percurso não resolve o acerto.** Os dois `Para cada` vêm visíveis e preparados, mas seu miolo não contém a condição de colisão, a retirada ou a pontuação. A criança constrói essas regras. A preparação declara `alvoAtivo` no início, devolve verdadeiro antes de conferir os tiros de cada asteroide e oferece a guarda `Se alvoAtivo`. Dentro do acerto, a criança retira os envolvidos e marca `alvoAtivo` como falso. Assim o asteroide consumido não conta novamente naquele percurso. Essa ligação faz parte da montagem ensinada; não acontece por mágica ao remover um objeto. A variável é criada em Ao iniciar, respeitando o lugar permitido pelo bloco, e não declarada dentro do laço. A autoria do detector completo não será atribuída à criança. [Fonte: Patrulha][galeria-3d]

Antes de preencher a regra, a criança observa que a preparação apresenta um tiro e um asteroide de cada vez. Os nomes e o lugar desses dois envolvidos ficam visíveis. A regra que ela constrói confere o contato, retira o par e soma o ponto. Construir os percursos encaixados não é objetivo desta base; entender quais objetos a regra está usando faz parte da montagem.

**Pontos têm uma só fonte de verdade.** Usar a variável autoral `pontos` e exibi-la pelo HUD. Não somar simultaneamente nessa variável e em um placar interno sem contrato de sincronização. O motor oferece pontos nativos, mas usar esse recurso sozinho não ensinaria criação de variável.

Cada projeto de entrada só pode ler variáveis que já tenham sido criadas até aquela parte. O HUD do placar entra junto com a variável `pontos`; a preparação visual não deve consultá-la antecipadamente. O mesmo cuidado vale para a meta e para o estado da partida.

**Vidas usam o recurso nativo de vida.** A criança configura três, programa a perda e lê o valor para decidir a derrota. A extensão fornece armazenamento, piscar e proteção breve. Isso permite dedicar a autoria à regra do dano; não afirmar que ela implementou internamente a invulnerabilidade. Vida zero não termina o jogo automaticamente. [Fonte: regras 3D][regras-3d]

**Abertura e fim têm contratos distintos.** Abertura autoral com Enter e aviso; fim nativo com botão. O texto e as instruções devem ser idênticos ao comportamento que o protótipo demonstrar.

### 7.4 O que ficará para a construção desde o zero no Inventor

Além dos novos assuntos de corrida, a criança passará a montar inicialização da cena, criação dos atores, preparação da câmera, desenho/renderização exposto pelos blocos, grupos e estrutura de execução. Ela remontará estados e placar trabalhados no Construtor, com retomadas dos conceitos e todos os passos necessários. Compreensão será conferida, sem presumir domínio apenas pela conclusão do curso.

O alvo é retirar os blocos iniciais de apoio. Não é reimplementar internamente o motor gráfico: continuará usando os comandos das extensões.

## 8. Sequência de aprendizagem proposta

O mapa abaixo define conquistas e dependências. Ainda não define as falas, cada clique, todos os objetivos por parte ou a quantidade final de vídeos. A divisão deve ser conferida no protótipo: uma linha da tabela não pode virar um vídeo longo que empilhe conceitos diferentes.

### 8.1 Nave Contra Asteroides: nove aulas de referência

| Aula proposta | Conquista jogável | O que a criança constrói | Parte preparada que usa |
| --- | --- | --- | --- |
| 1. Sua nave na rota | A nave se move e respeita as bordas | Movimento lateral e limite; primeira escolha de aparência | Tela, nave e desenho |
| 2. Um disparo nasce da nave | Apertar Espaço cria um tiro que sai do lugar certo | Grupo, evento, posição relativa à nave, velocidade, movimento, desenho e limpeza | Aparência do laser e som disponíveis |
| 3. O campo de asteroides | Asteroides aparecem em intervalos e atravessam a tela | Segundo grupo, relógio em segundos, criação, direção e limpeza | Aparência e valor de posição de entrada fornecidos |
| 4. Um encontro, um acerto | O tiro destrói o asteroide atingido | Colisão entre grupos e retirada apenas do par envolvido | Efeitos prontos, acionados na regra correta |
| 5. Cada acerto conta | O placar responde a acertos, sem contar tiros perdidos | Variável numérica, zero inicial, incremento e apresentação | Estilo visual dos elementos disponíveis |
| 6. Três chances para continuar | Batidas custam uma vida, com retorno visível | Vida inicial, contato com a nave, retirada, dano e indicador | Proteção breve e piscar da extensão |
| 7. Você decide quando começa | Na abertura nada dispara; Enter libera a partida | Estado inicial, transição e guardas de movimento, relógio, tiro e contatos | Estrutura visual do palco |
| 8. Uma partida com final | A meta vence; ficar sem vidas encerra com derrota | Comparações, prioridade, estados finais e telas | Blocos de apresentação de tela |
| 9. Recomeçar e deixar do seu jeito | Uma nova partida limpa o estado anterior e conserva as escolhas | Comando de reinício, conferência do estado inicial, mudança de uma regra conhecida e teste final | Os recursos visuais e sonoros fornecidos |

As aulas 2 e 3 precisam de partes separadas: criação, direção/movimento e retirada não são um único conceito. Da mesma forma, a aula 7 deve distinguir o nome do estado, a transição e as regras que precisam consultá-lo. A criança não precisa terminar tudo em uma sentada; os checkpoints permitem parar entre as partes.

O desenho visual fica pronto, mas a criança aprende o **ciclo de vida do objeto**: ele nasce, aparece, se move, interage e sai do jogo. Isso é uma evolução nítida em relação a recolher uma chave já colocada.

As versões das primeiras aulas são ensaios parciais, que entram direto no jogo para testar o sistema recém-construído. A abertura e as condições finais são acrescentadas depois. Não apresentar a versão de vidas sem a condição final como se já fosse a partida completa.

### 8.2 Patrulha Espacial: cinco aulas de referência

| Aula proposta | Conquista | Transferência e novidade | Autoria principal |
| --- | --- | --- | --- |
| 1. Da tela ao espaço | A nave pronta dispara um laser real | Reencontrar a partida, observar X/Y/Z e construir o tiro em profundidade | Evento, cópia na posição da nave, direção do tiro e retirada por Z |
| 2. Meteoros na rota | O campo passa a receber obstáculos | Relógio e grupos conhecidos, agora com moldes e cópias 3D | Temporizador, criação, velocidade configurada e limpeza |
| 3. Acertar no espaço | Um encontro real soma um ponto | Sobreposição na imagem não garante contato; condição aplicada ao par preparado | Se encostando, retirada, marca de alvo consumido e contador |
| 4. Três chances na patrulha | A nave recebe dano de forma legível | Reaplicar vida e evento com o grupo | Vida inicial, dano no contato, retirada e leitura do valor |
| 5. Uma patrulha completa | Começo, vitória, derrota e nova tentativa coerentes | Reaplicar estados e condições; conhecer o botão real de reinício desta extensão | Estado autoral, guardas, resultado, valores iniciais e prova de reset |

O número cinco é uma referência inicial compatível com o outline existente. **Não é um limite que justifique comprimir a última aula.** Se a montagem de estados, resultado e reset ocupar muitas partes, separar essa conquista em duas aulas, conciliando as identidades reservadas. O objetivo da etapa atual é fixar o percurso e a fronteira de autoria; a duração depende do protótipo e da escrita das partes.

No 3D, grupos, tempo e pontos não precisam ser apresentados como conceitos completamente novos. A criança reencontra a ideia, observa sua nova representação e recebe a montagem completa. As experiências novas se concentram em profundidade, altura e contato.

### 8.3 Continuidade, escolha e sensação de conquista

Desde a primeira aula, a criança vê sua nave. Na segunda conquista, dispara. Na seguinte, tem obstáculos; depois, pode acertá-los. A pontuação torna a evolução visível, e as vidas dão consequência às decisões.

A personalização acompanha o que já foi compreendido:

- Aparência, nome e mensagens entre opções fornecidas.
- Cor do laser e retorno sonoro, respeitando legibilidade.
- Meta de acertos, depois de aprender a condição que a usa.
- Intervalo entre asteroides, depois da investigação de tempo.

Uma mudança de dificuldade deve alterar uma variável por vez e terminar com comparação. Não entregar uma lista de cinco números para copiar e chamar isso de equilíbrio do jogo.

## 9. Experiências que precisam anteceder a montagem

Estas são especificações de intenção. A próxima etapa deverá confrontá-las com as experiências existentes do Nave, reaproveitar o que representar a mesma relação e produzir apenas o que faltar.

| Conceito | Experiência concreta | Descoberta que prepara |
| --- | --- | --- |
| Um objeto e seu grupo | Ver vários tiros; selecionar um para observar qual sai e quais continuam | O grupo reúne objetos, mas o acerto tem participantes específicos |
| Sentido e velocidade | Comparar um tiro parado, indo para o alvo e indo para o lado errado | O sinal muda a direção; o valor muda quanto ele avança |
| Origem do disparo | Mover a nave e comparar tiro preso a um ponto fixo com tiro que nasce nela | A criação precisa ler a posição atual |
| Relógio de criação | Comparar intervalos constantes de 1 e 2 segundos, com o tempo visível | Menor intervalo cria mais objetos no mesmo tempo |
| Retirada | Comparar objeto apenas fora da imagem com objeto retirado do grupo | Sumir da vista não é necessariamente deixar de participar |
| Colisão | Testar encontro, passagem sem tocar e dois alvos com só um atingido | A consequência deve pertencer ao par que se encontrou |
| Pontuação | Comparar tiro perdido, acerto e novo acerto | O número muda pelo acontecimento certo e guarda o total |
| Vida | Ver três chances, uma batida e a proteção breve | Uma batida custa uma chance; não todas no contato prolongado |
| Estado | Comparar o mesmo Espaço ou relógio antes, durante e depois da partida | A mesma entrada pode produzir ou não uma ação conforme o momento |
| Meta e resultado | Comparar valor abaixo, igual e acima da meta; conferir também vida zero | A condição é uma pergunta sobre o estado atual |
| Reinício | Observar pontos, vidas e objetos antes/depois de uma nova partida | Recomeçar recompõe o estado, sem desfazer o programa |
| Profundidade, no 3D | Dois objetos parecem alinhados na imagem, mas estão em profundidades ou alturas diferentes | Aparência na tela e contato no espaço são coisas diferentes |

Uma experiência pode preparar duas montagens próximas quando concretiza ambas. Não precisa haver um cenário independente para cada rótulo desta tabela. O desenho final deve evitar que a experiência se torne um Estúdio reduzido ou um teste de vocabulário.

O vídeo explica a ideia e convida a investigar. Zappy acompanha os testes no estado real da cena, sem impor ordem única; a criança pode repetir e continuar explorando. A montagem retoma o resultado no próprio jogo.

### Revisões curtas

Proposta de distribuição para o 2D:

- Após tiros/asteroides: direção, origem e intervalo.
- Após acerto/placar: identificar por que um ponto foi contado duas vezes ou por que um tiro perdido não deve contar.
- Após o fechamento: decidir quais estados testar e o que precisa voltar ao início.

No 3D, concentrar a revisão em uma previsão de contato/profundidade e em um diagnóstico de partida completa. Os quizzes não exigem decorar o nome literal do bloco. Nome e encaixe são ensinados na montagem.

## 10. Critérios da futura implementação e de aprendizagem

Os critérios abaixo pertencem à produção posterior. Não representam testes executados sobre um projeto novo nesta etapa.

### 10.1 Jogo funcionando

| Caso | Resultado esperado |
| --- | --- |
| Abrir qualquer projeto de entrada | Sem referência ausente, erro de execução ou solução futura já pronta |
| Não apertar disparo | Nenhum tiro nasce |
| Apertar Espaço uma vez | Um tiro nasce na nave; não existe metralhadora por repetição do teclado |
| Mover a nave e atirar outra vez | O tiro nasce na nova posição |
| Deixar o relógio passar durante a partida | Surgimento respeita o intervalo configurado |
| Observar a abertura por vários intervalos | Nenhum objeto de jogo surge ou se move |
| Tiro passar sem tocar | Nenhum ponto e nenhuma retirada indevida |
| Acertar um alvo entre vários | Só o par envolvido sai; um ponto é contado |
| Dois tiros alcançarem o mesmo alvo | O alvo não pontua duas vezes |
| Batida que dura vários quadros | Uma perda válida de vida, com proteção breve e retirada do alvo |
| Asteroide sair sem bater | Retirada sem perda de vida ou pontuação |
| Um tiro sair da área | Grupo e recursos não acumulam aquele tiro |
| Atingir a meta com vida | Uma vitória; não há pontos extras depois do resultado |
| Ficar sem vidas | Uma derrota; não há novas batidas depois do resultado |
| Meta e última vida no mesmo ciclo | Aplica a prioridade declarada: derrota |
| Reiniciar após vitória e derrota | Pontos zero, três vidas, nave no início, grupos vazios e relógio novo |
| Reiniciar repetidamente | Nenhuma duplicação de eventos, velocidade ou frequência de criação |
| Alterar cor, mensagem ou meta válida | Verificação aceita a personalização e consulta a regra atual |
| Tiro 3D criado de um molde | Move-se; não depende de uma velocidade que o molde não transmite |
| Encerrar o 3D | Botão nativo funciona; não pedir um R que a pausa impede |

### 10.2 Demonstração de compreensão

Ao terminar o par, a criança deve conseguir, no seu nível de linguagem:

- Identificar o que faz novos objetos aparecerem.
- Explicar por que um tiro nasce onde a nave está.
- Distinguir tirar um objeto de apagar o grupo inteiro.
- Relacionar um acerto com uma soma de pontos e uma batida com uma perda de vida.
- Prever o efeito de mudar o intervalo ou a meta.
- Explicar por que o jogo não deve continuar criando coisas na tela final.
- Mostrar o que uma nova partida precisa restaurar.
- Reconhecer essas relações na futura Estação de Reciclagem.

Essas evidências não precisam virar uma prova escrita extensa. Podem aparecer em uma previsão, na escolha de um teste, em uma pequena modificação e na explicação curta do que aconteceu. Os testes de software conferem o produto; um ensaio com crianças é necessário para avaliar clareza, carga e autonomia.

### 10.3 Verificação dos projetos e paletas

Todos os projetos progressivos precisam ter conversão coerente entre blocos, IR e código gerado. Evitar JavaScript cru, propriedades genéricas difíceis ou um nível avançado escondido na preparação.

Antes de pedir bloco novo, conferir todos os catálogos, a paleta e a classificação em `blockLevels.ts`. Se o recurso já existe em outra faixa, tratar a disponibilidade curricular de forma explícita. O apoio técnico inicial também deve ser compatível com a paleta do curso. [Fonte: regra do Faísca][faisca]

A experiência nova será conferida com os conceitos que realmente ensina. Não tratar uma pontuação técnica alta do verificador como comprovação de aprendizagem.

## 11. Mapa técnico para não inventar funcionalidades

Os IDs abaixo foram localizados no código da referência estudada. Não são texto de aula; servem para orientar o protótipo e evitar promessas que as extensões não sustentam.

| Necessidade | Jogo 2D | Jogo 3D / apoio previsto |
| --- | --- | --- |
| Grupo | `sz_g2d_create_group` | `sz_g3d_create_group`; dois grupos vazios fornecidos |
| Disparo | `sz_g2d_on_key` + `sz_g2d_spawn_bullet` | `sz_g3d_on_key` + `sz_g3d_spawn_copy` |
| Asteroide | `sz_g2d_spawn_asteroid` | Cópia do molde visual fornecido |
| Cadência | `sz_g2d_every_seconds` | `sz_g3d_every_seconds` |
| Mover grupo | `sz_g2d_update_group` | `sz_g3d_set_velocity` por cópia + `sz_g3d_update_group_no_gravity` |
| Fora da área | `sz_g2d_prune_offscreen` | `sz_g3d_prune_area`, pelo eixo Z |
| Acerto entre grupos | `sz_g2d_on_group_overlap` | Percursos preparados + `sz_g3d_collides` na condição do aluno |
| Retirada | `sz_g2d_remove_from_group` | `sz_g3d_remove_from_group` |
| Nave × alvos | `sz_g2d_on_sprite_group_overlap` | `sz_g3d_on_touch_group` |
| Pontuação autoral | Variável + incremento + `sz_g2d_draw_score` | Variável + incremento + `sz_g3d_hud_text` |
| Vida | `sz_g2d_set_health`, `sz_g2d_damage_sprite`, `sz_g2d_health_depleted` | `sz_g3d_set_life`, `sz_g3d_hurt`, `sz_g3d_life_of` |
| Estado | `sz_g2d_set_scene` / `sz_g2d_scene_is` | Variável de texto `estado`, comparação e Se |
| Resultado | Estado final e `sz_g2d_show_screen` | Estado autoral e `sz_g3d_end_game` |
| Reinício | `sz_g2d_restart`, ligado pelo aluno | Botão final nativo; inicialização autoral executada novamente |

Para variáveis e condições, os blocos existentes são `sz_js_var_create`, `sz_js_var_assign`, `sz_js_var_increment`, `sz_js_if_else`, `sz_val_variable` e `sz_val_compare`.

### 11.1 Diferenças que a produção deve respeitar

**Tempo:** `A cada N segundos` é uma raiz ao lado do laço de quadros. Não encaixar a criação do temporizador dentro de um quadro. No 2D, o temporizador pode continuar disparando em outra tela; seu corpo precisa consultar o estado. [Fonte: pedagogia da extensão][pedagogia-2d]

**Unidades:** velocidades numéricas das duas extensões não são intercambiáveis. No 3D, a API de velocidade é por segundo. A configuração 2D do curso anterior usa deslocamento por atualização. Calibrar o tempo de reação observado, sem dizer que o mesmo número faz a mesma coisa nos dois motores.

**Movimento lateral:** `top_down` do Jogo 3D move em X/Z e orienta o objeto. Não é equivalente a manter uma nave olhando para a frente e movê-la só em X. O motor lateral do projeto inicial deve usar o padrão adequado da Patrulha, com passagem do tempo tratada na preparação.

**Colisões e resultado:** concentrar a decisão final depois das consequências de colisão relevantes. No Jogo 3D consultado, o contato nativo de nave × grupo é processado depois do callback de animação. Para conservar esse evento e a prioridade da derrota, conferir o resultado no início do quadro seguinte, antes de permitir novas ações: primeiro vida zero, senão meta atingida. O incremento de pontos e o evento de vida zero não encerram separadamente a partida. O protótipo deve provar a ordem, inclusive no caso simultâneo, e conferir que os apoios de movimento e de tempo não executam um novo passo após a decisão. A promessa é um resultado único e coerente.

**Reinício:** depois de `end_game`, os eventos de tecla do 3D são ignorados. A abertura autoral desta proposta evita a pausa inicial nativa; o resultado mantém o botão nativo. Não apresentar um evento de teclado como responsável por um clique/Enter que o navegador encaminha ao botão.

**Teclado e toque:** o escopo inicial é computador com teclado e navegador compatível com o Estúdio; 3D requer WebGL. Uma prévia responsiva não comprova controles de toque. O 2D tem opções de controle por dedo, mas a nave 3D genérica não recebe automaticamente os controles dos kits. Se for necessária uma versão móvel, ela precisa de adaptação e ensaio próprios.

## 12. Identidades e continuidade da reautoria

O curso 2D existente conserva `nave-contra-asteroides`, com a correspondente oferta adulta. O curso 3D reservado usa `jornada-construtor-base-3d`; a missão, `jornada-construtor-missao`.

Na produção futura:

1. Conferir os cursos e aulas de destino antes de importar.
2. Preservar UUIDs, slugs e vínculos compatíveis, mídia anexada e direitos/progresso existentes.
3. Mapear a sequência pedagógica nova para as identidades reservadas; não fabricar outro curso com o mesmo título.
4. Se mudar a quantidade de aulas, planejar a conciliação. Os nove itens do 2D e cinco do outline 3D não podem ser usados para presumir identidades de banco.
5. Conferir `outlineHash` e `requiredLessonIds`. O seed tem proteções contra mudança silenciosa do planejamento.
6. Atualizar a fonte editorial e todos os derivados pelo gerador correspondente.

Este trabalho não precisa de Pensa, Ponte, Pro ou IA como pré-requisito. As bases permanecem em blocos com as duas extensões solicitadas. A política publicada deve ser consultada quando chegar a etapa de disponibilizar cursos. [Fontes: Jornada][jornada], [operação do seed][seed-doc] e [implementação do seed][seed-code].

## 13. Encaminhamento da próxima etapa

Com a direção dos jogos e a fronteira de autoria revisadas, a sequência de trabalho é:

1. **Prototipar os dois jogos finais e seus projetos iniciais.** Confirmar controles, visibilidade, colisões, ritmo, apoios 3D e reinício.
2. **Fechar a matriz por parte.** Para cada parte: projeto de entrada, construção, conceito, experiência anterior, resultado e teste. Ajustar a divisão em aulas se houver concentração excessiva.
3. **Conciliar os destinos do curso.** Mapear aulas existentes/reservadas e registrar a evolução curricular que será publicada.
4. **Escrever as aulas e produzir os derivados.** Roteiros, manifestos, experiências, objetivos, vozes e Passo a passo vêm depois desse desenho.
5. **Validar com execução e observação de iniciantes.** Separar funcionamento, clareza pedagógica e produção/publicação.

O resultado desta etapa é o estudo e uma especificação revisável. As escolhas centrais estão definidas: dois shooters de trajetória reta, profundidade real no 3D, apresentação preparada, autoria crescente dos sistemas e partida completa como conquista do Construtor.

## Referências consultadas

Todos os links abaixo estão fixados no commit estudado para que uma alteração posterior da `staging` não mude silenciosamente a evidência deste documento.

- [Jornada do Criador][jornada]: fluxo de acesso e promoção; autoridade da política publicada.
- [Currículo editorial completo][curriculo]: postos, cursos, missões, Poderes e extras; plano anterior do Inventor.
- [Faísca, índice atual][faisca]: inventário e regras de blocos.
- [Projeto progressivo de A Chave do Farol][farol-projeto] e [projeto de A Ilha do Farol][ilha-projeto]: preparação real e autoria por etapa.
- [O Jardim Secreto][jardim]: decisão de 24/11 sobre missão.
- [Diretrizes pedagógicas][diretrizes], [descoberta guiada][descoberta] e [padrão atual do Faísca][padrao]: estrutura, experiências e montagem.
- [Apoio técnico][apoio]: fontes, geradores e derivados.
- [Nave existente][nave], [etapas][nave-etapas] e [projetos][nave-projetos]: começo vazio e regras atuais.
- [Nave da galeria][galeria-2d], [Patrulha Espacial][galeria-3d] e [Caça Estelar][caca]: referências e diferenças de jogabilidade.
- [Blocos de grupos do Jogo 2D][blocos-2d] e [pedagogia da extensão][pedagogia-2d]: ações, estados e relógios.
- [Blocos do Jogo 3D][blocos-3d], [blocos de regras 3D][blocos-regras-3d], [runtime 3D][runtime-3d] e [runtime das regras][regras-3d]: cópias, grupos, vida, telas e reinício.
- [Operação do seed][seed-doc] e [implementação do seed][seed-code]: preservação de identidade e planejamento.

[jornada]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/jornada-do-criador.md
[curriculo]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/members/src/infrastructure/config/creator-journey-curriculum.json
[faisca]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas/faisca/README.md
[farol-projeto]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/qa/desafio-farol-projeto.ts
[ilha-projeto]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/qa/ilha-do-farol-projeto.ts
[jardim]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas/faisca/o-jardim-secreto/README.md
[diretrizes]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/DIRETRIZES-PEDAGOGICAS.md
[descoberta]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/DESCOBERTA-GUIADA.md
[padrao]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/qa/faisca-padrao.test.ts
[apoio]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/README.md
[nave]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas/construtor/nave-contra-asteroides/README.md
[nave-etapas]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/qa/nave-contra-asteroides-etapas.ts
[nave-projetos]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/aulas-interativas-tecnico/qa/nave-contra-asteroides-projetos-qa.ts
[galeria-2d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-2d/examples/arcade.ts
[galeria-3d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/__gen_patrulhaEspacial.ts
[caca]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/__gen_cacaEstelar.ts
[blocos-2d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-2d/blockCatalogGroups.ts
[pedagogia-2d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-2d/pedagogy.ts
[blocos-3d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/blocks.ts
[blocos-regras-3d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game3dRules/blocks.ts
[runtime-3d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game-3d/runtime.ts
[regras-3d]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/studio/src/official-extensions/game3dRules/runtime.ts
[seed-doc]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/docs/jornada-criador-seed.md
[seed-code]: https://github.com/informach/sistema-zero/blob/9ca0696aef5a536846525704b9d01261e2bd0da7/packages/members/src/application/creator-journey/creator-journey-seed.ts

