# Construtor: estudo e proposta dos cursos da trilha

**Estudo, desenho dos jogos 2D e 3D e protótipos para aprovação**

Data: 24/11/2026. Referência estudada: `informach/sistema-zero`, branch `staging`, commit `9ca0696aef5a536846525704b9d01261e2bd0da7`.

**Estado: jogos aprovados por Helena; referência da autoria dos cursos.** Este documento conserva o estudo do Faísca, o enquadramento na Jornada, as decisões aprovadas para os dois jogos e os protótipos importáveis. Os roteiros, manifestos e materiais completos estão descritos na [produção das bases](producao-cursos-base-2026-11-24.md). Os encaminhamentos e as tabelas de sequência abaixo registram o planejamento que orientou essa autoria; o [mapa 2D](nave-contra-asteroides/mapa-de-aulas.md) e o [mapa 3D](patrulha-espacial/mapa-de-aulas.md) mostram sua distribuição final por parte. A política publicada, a gravação e a disponibilização das aulas continuam sendo etapas posteriores.

**Divisão de autoria aprovada em 24/11/2026:** telas de início, vitória e derrota, estado inicial, comando para começar e mecanismo de reinício chegam preparados no Construtor. A criança programa os sistemas da partida, as condições de vitória e derrota e o acionamento do resultado; aprende a usar a guarda conhecida **Se jogando** nas regras que acrescenta e testa o reinício. Construir toda a estrutura das telas e transições fica para o Inventor. Esta decisão já está aplicada aos projetos iniciais e à sequência abaixo.

**Atualização de direção em 24/11/2026:** a personalização das duas bases fica limitada à aparência. O 2D já oferece três opções de nave, cenário, asteroide e laser. O 3D usa provisoriamente três GLBs reaproveitados da galeria, um para a nave, um para o asteroide e um para o laser, carregados por blocos de modelo. Helena fará as artes definitivas e suas variações no Blender. Vidas, meta, intervalos, velocidades, áreas de colisão e demais regras devem permanecer iguais entre opções de aparência. Os seis arquivos `.szproject.json` acompanham esta proposta para importação e aprovação no Estúdio; o [guia dos protótipos](prototipos-base/README.md) reúne os arquivos, os controles e a validação.

| Dimensão | Entrega atual | Quantidade |
| --- | --- | --- |
| 2D | Três jogos completos com combinações visuais diferentes: [principal](prototipos-base/2d/nave-2d-completo.szproject.json), [Órbita](prototipos-base/2d/nave-2d-orbita.szproject.json) e [Nebulosa](prototipos-base/2d/nave-2d-nebulosa.szproject.json) | 3 JSONs |
| 2D | [Projeto inicial pedagógico](prototipos-base/2d/nave-2d-inicial.szproject.json), com a mesma biblioteca visual | 1 JSON |
| 3D | [Jogo completo](prototipos-base/3d/patrulha-espacial-3d-completo.szproject.json), com os modelos provisórios da galeria | 1 JSON |
| 3D | [Projeto inicial pedagógico](prototipos-base/3d/patrulha-espacial-3d-inicial.szproject.json), com os mesmos três GLBs embutidos | 1 JSON |

## 1. Decisão proposta

O Construtor deve fazer a criança passar de **programar uma relação entre acontecimentos** para **combinar sistemas que formam uma partida**.

- **Nave Contra Asteroides**, com Jogo 2D: nave na parte inferior, movimento lateral, tiros para cima e asteroides descendo.
- **Patrulha Espacial**, com Jogo 3D: nave vista por trás e de cima, movimento lateral em X, altura fixa e asteroides chegando pela profundidade Z. Tiros são objetos reais que percorrem o espaço.
- Os dois jogos compartilham as mesmas regras principais. A segunda versão permite reconhecer o que continua igual e aprender o que muda no espaço e nos blocos da extensão.
- O projeto inicial entrega artes, telas, começo, reinício e apoios técnicos identificados. A criança constrói surgimento, acerto, pontuação, dano e condições de resultado; protege suas regras com o padrão fornecido **Se jogando**.
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

A Estação de Reciclagem reutiliza criação por tempo, grupos, colisão, pontos, vidas, resultado e reset com coletor e peças. Coletar a peça correta soma um ponto; a incorreta tira uma vida; cada peça deixa de participar após a coleta. O cenário, o coletor, os dois tipos visuais e as posições fixas de entrada chegam preparados. A missão confere os resultados e o reinício completo. O plano curricular anterior também propõe uma mudança de meta no enunciado; essa variação deverá ser conciliada na produção futura, considerando a decisão atual de manter a personalização apenas visual. Ela não pode exigir câmera, modelagem, um Poder específico ou um sorteio novo que as bases não tenham ensinado. [Fonte: currículo][curriculo]

A missão mantém os apoios cuja construção não foi ensinada nas bases. As telas, o estado inicial, o começo e o mecanismo de reinício chegam preparados nas duas dimensões. No 3D, também são fornecidos transporte, controle lateral e percursos de grupos. A criança programa criação, contato, contagem, dano, condições finais e o acionamento do resultado; usa a guarda conhecida nas próprias regras e demonstra que os valores e objetos que criou voltam ao começo. O critério de reset verifica o comportamento da partida, sem atribuir à criança a construção do mecanismo pronto. Esta fronteira substitui, para a futura produção da missão, a exigência anterior de programar o fluxo completo. A matriz de autoria da seção 7 orientará os critérios.

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
| Construtor | Artes, telas, começo, reinício e apoios técnicos preparados; partida incompleta | Construir os sistemas que fazem objetos surgir, interagir e contar; decidir o resultado e usar a guarda de execução conhecida |
| Inventor, nova direção | Projeto sem blocos | Montar também inicialização, telas, estados, transições e reinício, além das novas regras do jogo |

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

A arte pode ser personalizada com as opções fornecidas. A biblioteca 2D entregue inclui três aparências de nave, três cenários, três asteroides e três lasers, com diferenças reconhecíveis. No protótipo 3D há um modelo provisório por elemento: nave, asteroide e laser da galeria. As artes definitivas e suas variações serão produzidas por Helena no Blender e incorporadas como modelos, mantendo o uso de um bloco para carregar cada objeto.

Trocar a aparência deve manter dimensões de colisão e comportamento. A produção de pixel art, desenhos ou modelos pela criança continua pertencendo aos extras correspondentes. As bases usam materiais fornecidos; a aprovação atual do 3D se concentra no jogo e no uso dos modelos provisórios.

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

Estes valores foram configurados nos protótipos para aprovação. Ainda são escolhas de partida para o ensaio de jogabilidade com iniciantes:

| Parâmetro | Proposta inicial | Como conferir |
| --- | --- | --- |
| Meta | 20 acertos | Meta visível e partida com duração apropriada no teste com iniciantes |
| Vidas | 3 | Há oportunidade de perceber o erro e continuar |
| Intervalo entre asteroides | 1,5 segundo | Permite observar o nascimento e antecipar a aproximação |
| Variação de dificuldade | Constante ao longo da partida | Não existe aceleração automática ou mudança de classe |
| Configuração alternativa de investigação | 1 ou 2 segundos, mudando uma coisa por vez | A criança compara o efeito do intervalo |
| Tempo de reação desejado | Aproximadamente quatro segundos entre entrada e altura da nave | Medir nos dois motores, sem copiar velocidades numéricas entre unidades diferentes |

Os 20 acertos devem ter uma única definição legível, consultada pela condição de vitória. A personalização conserva essa meta e os demais parâmetros de jogabilidade. Comparações de intervalo e velocidade, quando necessárias para compreender um conceito, acontecem nas experiências orientadas; não são opções de customização dos jogos entregues.

### 6.4 Nave Contra Asteroides: funcionamento em 2D

A referência lógica é uma tela de 800 × 480, como o curso existente. A nave fica perto da parte inferior, com espaço de respiro para o tiro nascer. Asteroides entram acima da área visível e descem. O cenário e suas estrelas fazem parte da imagem de fundo preparada.

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

O projeto inicial já entrega **abertura preparada**, com aviso e evento Enter para mudar o estado para jogando. Essa implementação não usa a tela nativa de início que pausa os eventos, pois ela impediria o Enter preparado. As mensagens das telas finais e o botão nativo **Voltar ao início** também chegam configurados. A criança construirá as condições que acionam o resultado. Depois do botão, o programa é executado novamente e Enter começa a nova partida.

**O controle de fim é uma diferença real entre as versões:** no Jogo 3D, a tecla R montada como evento não funciona depois do fim nativo; o botão funciona. O curso deve explicar e mostrar o controle real. [Fonte: regras e telas 3D][regras-3d]

No protótipo para aprovação, a câmera está em `(0, 8, 12)` e olha para um modelo vazio em `(0, 1, -12)`. Esse alvo não tem geometria e serve apenas ao enquadramento. A nave, o meteoro e o laser já foram empacotados em três GLBs incorporados, reaproveitando as geometrias, cores e materiais da Patrulha Espacial da galeria. Cada um entra por um bloco nativo `sz_g3d_create_model_file`, que gera `SZGame3D.createModelFile`.

O programa entregue não contém a montagem visual das peças por blocos de formas nem opções artísticas novas para o 3D. Quando Helena entregar as artes e variações do Blender, a substituição ocorrerá no campo **modelo** do bloco. Conferir novamente orientação, escala, saída do tiro, caixa de colisão, carregamento e reinício, preservando as regras aprovadas. Os modelos provisórios e os resultados de validação estão descritos no [guia dos protótipos](prototipos-base/README.md) e no [guia 3D](prototipos-base/3d/README.md). [Origem dos modelos: Patrulha da galeria][galeria-3d]

### 6.6 Por que essas referências da galeria

O Nave da galeria oferece a estrutura do tiro vertical. A Patrulha oferece a profundidade e o projétil real. Os exemplos mais complexos acrescentam duas classes de meteoros, recarga, balanço, aumento de velocidade, pontos por tempo ou perseguição.

Esses elementos não entram como regras obrigatórias da base. O Caça Estelar pode inspirar um curso futuro de arena, mas seu ataque por proximidade não é a referência correta para ensinar um projétil que viaja. [Fontes: Nave][galeria-2d], [Patrulha][galeria-3d] e [Caça Estelar][caca].

## 7. Projeto inicial e autoria da criança

### 7.1 Regra para o projeto inicial

O início deve executar sem erro e apresentar um cenário cuidado. Ele não deve conter uma partida completa que a criança apenas liga.

No **2D**, há nave visível, ambiente, desenho por quadro, telas de abertura/vitória/derrota, estado inicial e evento Enter para começar ou reiniciar após o resultado. A nave ainda não anda e não atira; não existem grupos, asteroides ativos, acertos, pontos, dano ou condições de resultado. As doze opções visuais estão incorporadas. O laço oferece a área protegida **Se jogando** para receber as regras da criança.

No **3D**, há ambiente, câmera, três blocos de modelos GLB, abertura, estado inicial, Enter para começar e mensagens finais com botão de reinício preparados. A nave pode ser pilotada lateralmente depois de Enter; os dois grupos existem vazios. Ainda não há tiros, asteroides ativos, acertos, pontos, dano ou condições de resultado. O movimento lateral preparado evita que uma diferença técnica de controle consuma o curso de transferência. Movimento e transporte só executam enquanto a partida está em andamento. Os modelos provisórios são os mesmos do jogo completo.

O jogo pronto que a criança experimenta na abertura é um exemplo separado. Não é o projeto inicial entregue para editar.

### 7.2 Matriz de responsabilidades

| Sistema | Inicial 2D | Construção no 2D | Inicial 3D | Construção no 3D |
| --- | --- | --- | --- | --- |
| Artes e apresentação | Biblioteca com três naves, três fundos, três asteroides e três lasers | Escolher aparências com as mesmas dimensões e regras | Três GLBs provisórios da galeria, um por elemento, e câmera preparada | Trocar o modelo quando as artes e variações do Blender estiverem disponíveis; preservar dimensões e regras |
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
| Telas e começo | Abertura, telas finais, estado inicial e Enter preparados | Reconhecer os momentos; sem construir apresentação ou evento de começar | Aviso de abertura, variável `estado`, Enter e mensagens finais preparados | Reconhecer os momentos e a diferença de controle do fim |
| Execução durante a partida | Guarda **Se jogando** no laço preparado | Construir os novos eventos/relógios e aplicar neles o mesmo padrão; testar antes/durante/depois | Movimento, transporte e percursos protegidos por `estado === jogando` | Aplicar o padrão conhecido nas novas regras; sem montar toda a arquitetura de estados |
| Vitória/derrota | Telas prontas; sem condições nem pontuação/vida antecipadas | Comparações, prioridade e mudança para o resultado preparado | Mensagens finais prontas; sem condições nem pontuação/vida antecipadas | Comparações, prioridade e ligação com o resultado nativo |
| Reinício | Enter e bloco de reinício já ligados aos resultados | Inicializar os valores próprios e testar a restauração completa, preservando aparência | Botão final nativo configurado; inicialização executada novamente | Inicializar os valores próprios e testar a restauração completa, preservando aparência |

**As expressões de posição fornecidas são apoio explícito.** A expressão produz uma posição de entrada válida a cada criação. A criança a encaixa no nascimento do asteroide e observa seu efeito: programa quando ele nasce e a criação naquela posição. Projetar distribuição, limites de sorteio e progressão de dificuldade não será critério destas bases; esse trabalho pertence à futura autoria do Inventor. A próxima produção deve usar blocos existentes para a expressão fornecida, com margens verificadas, sem JavaScript cru ou novas APIs inventadas.

Os apoios não devem aparecer como um emaranhado de rotinas sem identificação. Organizar a área para a criança reconhecer preparação e regras que está construindo, usando os recursos de organização existentes no Estúdio. Não pressupor um sistema novo de pastas, bloqueios ou macros.

**A guarda não entrega o sistema que será ensinado.** O projeto inicial não contém um evento Espaço ou temporizador já resolvido. Ao construir o disparo e o surgimento dos asteroides, a criança monta esses elementos e encaixa suas ações no padrão **Se jogando**, retomado na experiência e mostrado passo a passo. Os apoios que já existem vêm protegidos. Não adiar todas essas ligações para uma grande remontagem no fim do curso.

**Telas preparadas não antecipam as respostas.** A abertura já funciona, mas não há comparação de pontos, detecção de vida zero ou fim automático no inicial. Os testes técnicos podem acionar uma tela final diretamente para conferir seu botão; essa chamada pertence somente ao teste e não aparece como solução no projeto da criança. A apresentação inicial usa textos que não dependem de `pontos`, `meta` ou vidas ainda ausentes.

### 7.3 Particularidades indispensáveis do apoio 3D

**Grupos vazios existem desde o começo.** Como os percursos e o transporte preparados os referenciam, deixá-los ausentes produziria erros. A criança já terá construído grupos no 2D e retoma aqui essa ideia; no 3D ela povoará os grupos e controlará as cópias.

**Velocidade vai para a cópia.** `spawnCopy` não herda a velocidade do molde. O apoio deve percorrer as cópias, aplicar a velocidade do grupo e depois movê-las. As velocidades iniciais de transporte podem ser zero, para a criança configurar o componente Z na parte correspondente. O mecanismo que aplica essa velocidade às novas cópias chega pronto. [Fonte: runtime 3D][runtime-3d]

**O percurso não resolve o acerto.** Os dois `Para cada` vêm visíveis e preparados, mas seu miolo não contém a condição de colisão, a retirada ou a pontuação. A criança constrói essas regras. A preparação declara `alvoAtivo` no início, devolve verdadeiro antes de conferir os tiros de cada asteroide e oferece a guarda `Se alvoAtivo`. Dentro do acerto, a criança retira os envolvidos e marca `alvoAtivo` como falso. Assim o asteroide consumido não conta novamente naquele percurso. Essa ligação faz parte da montagem ensinada; não acontece por mágica ao remover um objeto. A variável é criada em Ao iniciar, respeitando o lugar permitido pelo bloco, e não declarada dentro do laço. A autoria do detector completo não será atribuída à criança. [Fonte: Patrulha][galeria-3d]

Antes de preencher a regra, a criança observa que a preparação apresenta um tiro e um asteroide de cada vez. Os nomes e o lugar desses dois envolvidos ficam visíveis. A regra que ela constrói confere o contato, retira o par e soma o ponto. Construir os percursos encaixados não é objetivo desta base; entender quais objetos a regra está usando faz parte da montagem.

**Pontos têm uma só fonte de verdade.** Usar a variável autoral `pontos` e exibi-la pelo HUD. Não somar simultaneamente nessa variável e em um placar interno sem contrato de sincronização. O motor oferece pontos nativos, mas usar esse recurso sozinho não ensinaria criação de variável.

Cada projeto de entrada só pode ler variáveis que já tenham sido criadas até aquela parte. O HUD do placar entra junto com a variável `pontos`; a preparação visual não deve consultá-la antecipadamente. O mesmo cuidado vale para a meta e para as vidas. O estado da partida já é declarado pela preparação desde o projeto inicial.

**Vidas usam o recurso nativo de vida.** A criança configura três, programa a perda e lê o valor para decidir a derrota. A extensão fornece armazenamento, piscar e proteção breve. Isso permite dedicar a autoria à regra do dano; não afirmar que ela implementou internamente a invulnerabilidade. Vida zero não termina o jogo automaticamente. [Fonte: regras 3D][regras-3d]

**Abertura e fim têm contratos distintos e preparados.** Abertura com Enter e aviso; fim nativo com botão. A criança programa o motivo do encerramento e aciona essa apresentação. O texto e as instruções devem ser idênticos ao comportamento que o protótipo demonstrar.

### 7.4 O que ficará para a construção desde o zero no Inventor

Além dos novos assuntos de corrida, a criança passará a montar inicialização da cena, criação dos atores, preparação da câmera, desenho/renderização exposto pelos blocos e grupos. Construirá também as telas, o estado inicial, as transições entre abertura/partida/resultado e o acionamento do reinício. No Construtor ela terá usado essa estrutura e programado as regras que a acionam; no Inventor será autora de sua organização completa, começando sem blocos. O placar, os contatos e outras regras já construídas serão retomados. Compreensão será conferida, sem presumir domínio apenas pela conclusão do curso.

O alvo é retirar os blocos iniciais de apoio. Não é reimplementar internamente o motor gráfico: continuará usando os comandos das extensões.

Essa fronteira mantém a progressão do Faísca: programar uma condição que provoca uma resposta preparada. O projeto da Ilha já entrega reinício por R, enquanto a criança constrói a memória da chave e a decisão. O avanço no Construtor está em combinar vários sistemas e seus resultados; a construção de toda a infraestrutura tem um lugar explícito no Inventor. [Fontes: projetos Farol][farol-projeto] e [Ilha][ilha-projeto].

## 8. Sequência de aprendizagem proposta

O mapa abaixo define conquistas e dependências. Ainda não define as falas, cada clique, todos os objetivos por parte ou a quantidade final de vídeos. A divisão deve ser conferida no protótipo: uma linha da tabela não pode virar um vídeo longo que empilhe conceitos diferentes.

### 8.1 Nave Contra Asteroides: nove aulas de referência

| Aula proposta | Conquista jogável | O que a criança constrói | Parte preparada que usa |
| --- | --- | --- | --- |
| 1. Sua nave na rota | Depois de começar, a nave se move e respeita as bordas | Movimento lateral e limite na área protegida; primeira escolha de aparência | Telas, Enter, nave, desenho e guarda **Se jogando** |
| 2. Um disparo nasce da nave | Apertar Espaço durante a partida cria um tiro no lugar certo | Grupo, evento com a guarda conhecida, posição relativa à nave, velocidade, movimento, desenho e limpeza | Aparência do laser, som e padrão de guarda disponíveis |
| 3. O campo de asteroides | Asteroides aparecem em intervalos durante a partida e atravessam a tela | Segundo grupo, relógio em segundos, guarda conhecida, criação, direção e limpeza | Aparência, expressão de posição de entrada e estado fornecidos |
| 4. Um encontro, um acerto | O tiro destrói o asteroide atingido | Colisão entre grupos e retirada apenas do par envolvido | Efeitos prontos, acionados na regra correta |
| 5. Cada acerto conta | O placar responde a acertos, sem contar tiros perdidos | Variável numérica, zero inicial, incremento e apresentação | Estilo visual dos elementos disponíveis |
| 6. Três chances para continuar | Batidas custam uma vida, com retorno visível | Vida inicial, contato com a nave, retirada, dano e indicador | Proteção breve e piscar da extensão |
| 7. Cada regra no seu momento | Os sistemas construídos funcionam somente durante a partida | Testar e corrigir o uso da guarda conhecida em tiro, relógio e contatos; explicar quando uma ação pode acontecer | Telas, estado e transição de início já funcionando |
| 8. Uma partida com final | A meta vence; ficar sem vidas encerra com derrota | Comparações, prioridade e acionamento do resultado preparado | Apresentação de vitória/derrota e proteção das rotinas preparadas |
| 9. Testar de novo e deixar do seu jeito | Uma nova partida limpa o estado anterior e conserva a aparência escolhida | Conferir valores iniciais, objetos e relógio; escolher nave/cenário/asteroide/laser e testar a partida inteira | Comando de reinício pronto e biblioteca visual fornecida |

As aulas 2 e 3 precisam de partes separadas: criação, direção/movimento e retirada não são um único conceito. As guardas entram junto de cada regra nova. A etapa 7 é uma retomada aplicada e um diagnóstico dos sistemas construídos, sem ensinar a montagem das telas ou refazer a estrutura de início. Ela pode ser incorporada às revisões das etapas 2–6 se a escrita das partes mostrar que uma aula separada seria repetitiva. A referência de nove aulas não obriga a criar uma aula de preenchimento; duração e identidades serão conciliadas antes da produção. Os checkpoints permitem parar entre conquistas.

O desenho visual fica pronto, mas a criança aprende o **ciclo de vida do objeto**: ele nasce, aparece, se move, interage e sai do jogo. Isso é uma evolução nítida em relação a recolher uma chave já colocada.

As versões das primeiras aulas são ensaios parciais, com abertura e Enter já prontos desde o início. As condições finais só são acrescentadas depois de pontos e vidas terem sido construídos. Não apresentar a versão de vidas sem a condição final como se já fosse a partida completa. A tela de fim disponível não deve ser confundida com uma regra de vitória/derrota já resolvida.

### 8.2 Patrulha Espacial: cinco aulas de referência

| Aula proposta | Conquista | Transferência e novidade | Autoria principal |
| --- | --- | --- | --- |
| 1. Da tela ao espaço | Depois de Enter, a nave pronta dispara um laser real | Reencontrar a partida, observar X/Y/Z e construir o tiro em profundidade | Evento com guarda conhecida, cópia na posição da nave, direção do tiro e retirada por Z |
| 2. Meteoros na rota | O campo passa a receber obstáculos durante a partida | Relógio e grupos conhecidos, agora com moldes e cópias 3D | Temporizador com guarda conhecida, criação, velocidade configurada e limpeza |
| 3. Acertar no espaço | Um encontro real soma um ponto | Sobreposição na imagem não garante contato; condição aplicada ao par preparado | Se encostando, retirada, marca de alvo consumido e contador |
| 4. Três chances na patrulha | A nave recebe dano de forma legível | Reaplicar vida e evento com o grupo | Vida inicial, dano no contato, retirada e leitura do valor |
| 5. Uma patrulha completa | Vitória, derrota e nova tentativa coerentes | Reaplicar condições, usar a estrutura preparada e conhecer o botão real de reinício desta extensão | Condições e prioridade, acionamento do resultado, revisão das guardas e prova da restauração dos valores próprios |

O número cinco é uma referência inicial compatível com o outline existente. A montagem de telas, estado inicial, começo e reinício saiu da autoria dessa base. A última aula se concentra nas condições, na ligação com o resultado e nos testes da partida. Se esses assuntos ainda ocuparem muitas partes, dividir a conquista e conciliar as identidades reservadas; a duração depende do protótipo e da escrita das partes.

No 3D, grupos, tempo e pontos não precisam ser apresentados como conceitos completamente novos. A criança reencontra a ideia, observa sua nova representação e recebe a montagem completa. As experiências novas se concentram em profundidade, altura e contato.

### 8.3 Continuidade, escolha e sensação de conquista

Desde a primeira aula, a criança vê sua nave. Na segunda conquista, dispara. Na seguinte, tem obstáculos; depois, pode acertá-los. A pontuação torna a evolução visível, e as vidas dão consequência às decisões.

A personalização é exclusivamente visual nas duas dimensões. No **2D**, a biblioteca já incorporada permite:

- Escolher outra nave entre três opções.
- Escolher outro cenário entre três opções.
- Escolher outra aparência de asteroide entre três opções.
- Escolher outra aparência de laser entre três opções.

As opções 2D podem ser combinadas. Os três projetos completos alternativos facilitam visualizar algumas combinações; cada arquivo conserva a biblioteca inteira para outras escolhas. No **3D**, a entrega atual tem um jogo completo e um inicial, com os mesmos modelos provisórios da galeria. As opções definitivas serão feitas por Helena no Blender; serão escolhidas pelo campo de modelo, sem acrescentar montagem procedural das artes ao programa.

Uma troca visual não altera meta, vidas, intervalo de surgimento, velocidade, dano, colisões ou controles. Reiniciar a partida conserva a aparência selecionada no programa. Esse contrato será reconferido ao incorporar as artes do Blender.

A criança testa se sua combinação mantém nave, tiros, alvos e placar legíveis. Essa é a decisão de acabamento desta etapa. Mudanças de regra, dificuldade, mensagens e sons ficam fora da personalização atual.

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
| Estado preparado | Comparar o mesmo Espaço ou relógio antes, durante e depois da partida; usar a guarda fornecida | A mesma entrada pode produzir ou não uma ação conforme o momento; a regra nova deve consultar esse momento |
| Meta e resultado | Comparar valor abaixo, igual e acima da meta; conferir também vida zero | A condição é uma pergunta sobre o estado atual |
| Reinício preparado | Observar pontos, vidas e objetos antes/depois de uma nova partida | O mecanismo pronto executa a inicialização; os valores que a criança criou precisam começar corretamente |
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

Os critérios abaixo orientam a produção e a aprovação. Os seis protótipos anexos já passaram pelas verificações estruturais e funcionais descritas no [guia de importação e validação](prototipos-base/README.md). No 3D, a verificação inclui o carregamento assíncrono dos GLBs embutidos e o reinício. Os ensaios de aprendizagem, a sensação de jogo e a conferência visual dentro do Estúdio continuam pendentes de revisão.

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
| Trocar uma aparência 2D; depois, integrar as opções do Blender no 3D | A aparência muda; vidas, meta, velocidade, intervalo, área de colisão e controles permanecem iguais |
| Reiniciar com outra aparência | A partida volta ao começo e preserva as escolhas visuais |
| Tiro 3D criado de um molde | Move-se; não depende de uma velocidade que o molde não transmite |
| Encerrar o 3D | Botão nativo funciona; não pedir um R que a pausa impede |

### 10.2 Demonstração de compreensão

Ao terminar o par, a criança deve conseguir, no seu nível de linguagem:

- Identificar o que faz novos objetos aparecerem.
- Explicar por que um tiro nasce onde a nave está.
- Distinguir tirar um objeto de apagar o grupo inteiro.
- Relacionar um acerto com uma soma de pontos e uma batida com uma perda de vida.
- Prever, nas experiências, o efeito de um intervalo diferente e de atingir a meta.
- Explicar por que o jogo não deve continuar criando coisas na tela final.
- Mostrar o que uma nova partida precisa restaurar.
- Identificar o que veio preparado: telas, começo e mecanismo de reinício; distinguir isso das condições e regras que construiu.
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
| Nave com aparência escolhida | `sz_g2d_create_image_sprite` e imagem incorporada | `sz_g3d_create_model_file`, com GLB incorporado; modelo provisório da galeria na entrega atual |
| Disparo | `sz_g2d_on_key` + `sz_g2d_spawn_image_in_group` | `sz_g3d_on_key` + `sz_g3d_spawn_copy` |
| Asteroide | `sz_g2d_spawn_image_in_group`, com imagem de asteroide | Cópia do molde visual fornecido |
| Cadência | `sz_g2d_every_seconds` | `sz_g3d_every_seconds` |
| Mover grupo | `sz_g2d_update_group` | `sz_g3d_set_velocity` por cópia + `sz_g3d_update_group_no_gravity` |
| Fora da área | `sz_g2d_prune_offscreen` | `sz_g3d_prune_area`, pelo eixo Z |
| Acerto entre grupos | `sz_g2d_on_group_overlap` | Percursos preparados + `sz_g3d_collides` na condição do aluno |
| Retirada | `sz_g2d_remove_from_group` | `sz_g3d_remove_from_group` |
| Nave × alvos | `sz_g2d_on_sprite_group_overlap` | `sz_g3d_on_touch_group` |
| Pontuação autoral | Variável + incremento + `sz_g2d_draw_score` | Variável + incremento + `sz_g3d_hud_text` |
| Vida | `sz_g2d_set_health`, `sz_g2d_damage_sprite`, `sz_g2d_health_depleted` | `sz_g3d_set_life`, `sz_g3d_hurt`, `sz_g3d_life_of` |
| Estado | `sz_g2d_set_scene` / `sz_g2d_scene_is`; início e guarda do laço preparados | Variável de texto `estado`, Enter e guardas dos apoios preparados |
| Resultado | Condição do aluno muda o estado; blocos preparados desenham a tela correspondente | Condição do aluno liga estado final e `sz_g3d_end_game` às mensagens preparadas |
| Reinício | `sz_g2d_restart` já ligado a Enter após resultado | Botão final nativo já configurado; inicialização executada novamente |

Para variáveis e condições, os blocos existentes são `sz_js_var_create`, `sz_js_var_assign`, `sz_js_var_increment`, `sz_js_if_else`, `sz_val_variable` e `sz_val_compare`.

A escolha de imagens no 2D substitui os visuais embutidos de `spawn_bullet` e `spawn_asteroid` pelos sprites com imagem já suportados. A competência continua sendo criar objetos em um grupo, com posição, dimensões e velocidade. Todos os projetos 2D carregam as doze imagens incorporadas, e a seleção usa o campo de imagem do bloco existente.

No 3D, `SZGame3D.createModelFile` carrega os três GLBs incorporados: nave, molde de asteroide e molde de tiro. O projeto completo e o inicial usam os mesmos arquivos provisórios. Não é necessário montar as geometrias por blocos ou importar os GLBs separadamente. O carregador nativo trabalha de forma assíncrona; a validação conferiu que os modelos efetivos chegaram, sem ficar nas formas de reserva, e que suas cópias e o reinício funcionaram. A produção de novas artes e variações 3D ficará com Helena no Blender.

### 11.1 Diferenças que a produção deve respeitar

**Tempo:** `A cada N segundos` é uma raiz ao lado do laço de quadros. Não encaixar a criação do temporizador dentro de um quadro. No 2D, o temporizador pode continuar disparando em outra tela; seu corpo precisa consultar o estado. [Fonte: pedagogia da extensão][pedagogia-2d]

**Unidades:** velocidades numéricas das duas extensões não são intercambiáveis. No 3D, a API de velocidade é por segundo. A configuração 2D do curso anterior usa deslocamento por atualização. Calibrar o tempo de reação observado, sem dizer que o mesmo número faz a mesma coisa nos dois motores.

**Movimento lateral:** `top_down` do Jogo 3D move em X/Z e orienta o objeto. Não é equivalente a manter uma nave olhando para a frente e movê-la só em X. O motor lateral do projeto inicial deve usar o padrão adequado da Patrulha, com passagem do tempo tratada na preparação.

**Colisões e resultado:** concentrar a decisão final depois das consequências de colisão relevantes. No Jogo 3D consultado, o contato nativo de nave × grupo é processado depois do callback de animação. Para conservar esse evento e a prioridade da derrota, conferir o resultado no início do quadro seguinte, antes de permitir novas ações: primeiro vida zero, senão meta atingida. O incremento de pontos e o evento de vida zero não encerram separadamente a partida. O protótipo deve provar a ordem, inclusive no caso simultâneo, e conferir que os apoios de movimento e de tempo não executam um novo passo após a decisão. A promessa é um resultado único e coerente.

**Reinício:** depois de `end_game`, os eventos de tecla do 3D são ignorados. A abertura preparada desta proposta evita a pausa inicial nativa; o resultado mantém o botão nativo. Os dois controles já estão configurados no inicial. Não apresentar um evento de teclado como responsável por um clique/Enter que o navegador encaminha ao botão.

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

Os seis arquivos importáveis completos e iniciais estão no [pacote de protótipos](prototipos-base/README.md): quatro do 2D e dois do 3D. Com essa primeira implementação disponível, a sequência de trabalho é:

1. **Aprovar os protótipos no Estúdio.** Importar os jogos completos, experimentar as opções visuais 2D e conferir controles, visibilidade, ritmo e reinício nas duas dimensões. No 3D, avaliar o jogo com os modelos provisórios da galeria, já carregados por blocos de modelo. Os iniciais permitem avaliar a fronteira de autoria. As artes e variações do Blender serão incorporadas quando Helena as fornecer, com nova conferência de escala, orientação, contato e reinício.
2. **Fechar a matriz por parte.** Para cada parte: projeto de entrada, construção, conceito, experiência anterior, resultado e teste. Ajustar a divisão em aulas se houver concentração excessiva.
3. **Conciliar os destinos do curso.** Mapear aulas existentes/reservadas e registrar a evolução curricular que será publicada.
4. **Escrever as aulas e produzir os derivados.** Roteiros, manifestos, experiências, objetivos, vozes e Passo a passo vêm depois desse desenho.
5. **Validar com execução e observação de iniciantes.** Separar funcionamento, clareza pedagógica e produção/publicação.

O estudo e a especificação agora acompanham protótipos importáveis para aprovação. As escolhas centrais estão definidas: dois jogos de nave com trajetória reta, profundidade real no 3D, telas/começo/reinício preparados, personalização apenas visual, autoria crescente dos sistemas e das condições finais e partida completa como conquista do Construtor. A construção integral da estrutura das telas e transições fica para o Inventor.

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
