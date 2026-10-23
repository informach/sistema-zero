# Página C: expressão visual

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md) ou aos [blocos comuns](blocos-comuns.md).

| | |
| --- | --- |
| Endereço | `/kids/comunidade-dos-criadores/oferta/expressao-visual` |
| Quem chega | Responsável por uma criança que desenha, inventa personagens e cuida da aparência das coisas |
| Nível de consciência | Conhece o interesse do filho; não imagina que desenho e programação se encontram num jogo |
| Objeção principal | "Ele gosta de desenhar, não de programar" e "isso é um curso de desenho?" |
| Papel da página | Mostrar o caminho do personagem até o jogo, com honestidade sobre a ordem (primeiro as regras com personagens prontos, depois os desenhos dele) e fazer a programação parecer o que dá vida ao desenho |

Arquivo atual: `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/expressao-visual.ts`.

Limites que esta proposta respeita (posicionamento, perfil C): nas primeiras aulas a criança programa com personagens prontos; o Pinta livre chega no posto Construtor; o desenho do papel serve de modelo e não vira jogo sozinho; a oferta não é curso de desenho tradicional.

## O que manter

- A cena do personagem azul sobre o fundo azul (c03), que é o melhor exemplo de escolha visual com efeito no jogo.
- Os quadros de animação explicados como movimento visual, separados das regras que fazem o personagem responder (c04).
- O cuidado da abertura c02 (a cor refeita, o formato dos olhos), que passa a sustentar a tese.
- A frase "O personagem que levou tempo para desenhar pode participar de uma criação que alguém joga" (c06), que vira o decorado da seção 5.
- A clareza sobre o desenho do papel, agora só nas dúvidas.

## Diagnóstico desta página

1. **O herói fica no abstrato e esconde a ordem do caminho.** "Os personagens que seu filho cria podem ganhar movimento e interação nos próprios jogos." "Ganhar movimento e interação" é vocabulário de quem já sabe programar (regra 8) e o "podem" enfraquece a premissa. Os benefícios são categorias: "Uma ligação entre o desenho e o que acontece no jogo." E o pai só descobre na seção 3 que o começo usa personagens prontos. **Correção:** verbos que a criança faz (correr, pular, fugir), a ordem real logo nos benefícios (personagens prontos primeiro, Pinta livre depois) e o link do jogo como decorado.

2. **A abertura tem a cena e não tem a tese.** Depois do cuidado com o desenho, vem "O interesse visual encontra uma possibilidade de uso." e "essa passagem oferece um motivo para aprender as regras que produzem a interação". As duas frases poderiam estar em qualquer página (regra 8) e não explicam por que desenhar leva a programar (regra 9). **Correção:** a antítese que organiza a página: no desenho ele decide como o personagem é; no jogo, decide também o que ele faz, e isso se monta em regras.

3. **A página parece tentar dissuadir quem desenha.** O aviso aparece quatro vezes: "A experiência inclui aprender a construir regras de jogos." (requisitos), "Conhecer esse começo com a criança ajuda a perceber se ela tem vontade de explorar as duas partes." (c03), "Não é necessário chegar sabendo desenhar" (c04) e "Se procura apenas desenhar, vale considerar que a Comunidade inclui programação no percurso desde o começo." (c05). A informação é verdadeira e necessária, mas repetida soa como recuo. **Correção:** dizer uma vez nos requisitos, uma vez nas alternativas (card da aula de desenho) e uma vez nas dúvidas, sempre como fato e sem desculpa.

4. **A ajuda por mensagens no corpo.** "A conversa fica nos Recados, por mensagens assíncronas; pode ser necessário aguardar o retorno. O formato não inclui encontros ao vivo." (c07), além do pedido de ajuda em c06. Contraria a decisão de 05/10. **Correção:** orientação da própria aula na demonstração; Recados só nas dúvidas.

5. **Lista de ferramentas sem consequência.** "No Pinta, seu filho encontra cores, formas, camadas e recursos para criar personagens, fundos e peças de cenário." É Quadro sem Decorado (regra 12). **Correção:** cada recurso do Pinta aparece ligado ao que a criança vê no jogo (o tamanho que não cabe na plataforma, a cor que some no fundo, o braço que muda entre dois quadros).

6. **O decorado principal está enterrado.** O que esta família quer ver, o desenho do filho dentro de um jogo que outra pessoa joga, aparece uma vez, no fim da seção "Tudo se conecta": "O personagem que levou tempo para desenhar pode participar de uma criação que alguém joga." **Correção:** seção própria para o jogo publicado, com a fala do Jeffrey logo depois.

7. **Cautela e condições em série.** São 36 "pode" no corpo. A seção da Jornada termina com "Esses recursos dependem dos requisitos, da disponibilidade do serviço e dos créditos da família." e, no parágrafo seguinte, "A Comunidade está em lançamento, com etapas ainda em preparação. […] as próximas liberações dependem dos cursos e requisitos correspondentes." **Correção:** uma condição, uma vez, como fato, e o estado do catálogo numa frase só.

8. **Títulos-rótulo e um paliativo que não compara.** "A ligação entre arte e jogo dá um uso para cada ferramenta", "Desenhar, construir, guardar e mostrar fazem parte da mesma experiência", "Há espaço para escolher a aparência e voltar a ela". O paliativo diz "Há ferramentas gratuitas de desenho e de criação de jogos. Há também atividades dedicadas exclusivamente à formação artística. Vale comparar o que seu filho quer experimentar" sem dizer em que a experiência difere. **Correção:** títulos que afirmam algo e um card honesto sobre aula de desenho.

## Nova estrutura

| # | Seção (id atual → nova) | Função | Telas | O que acontece com o texto atual |
| --- | --- | --- | --- | --- |
| 1 | herói | Premissa, tese, três consequências com a ordem real | `pinta` | Reescrito |
| 2 | c02 → `interesse` | Argumento: no desenho ele decide a aparência; no jogo, o comportamento | `pinta-vetor` | Mantém a cena do cuidado; reescrito com a tese e o fundo azul |
| 3 | c03 + c04 + c05 → `experiencia` | Demonstração: o caminho do personagem, do pronto ao desenhado | `preparados`, `aula-estudio`, `animacao`, `integracao` | Bloco comum 5 adaptado em quatro passos; c05 fundida; o "só desenhar" sai |
| 4 | c09 → `mostrar` | Decorado principal: o desenho dele num jogo que outros jogam | `publicacao`, `mural` + vídeo V2 | Reescrito; visibilidade vai para as dúvidas |
| 5 | novo → `familias` | Prova | retratos (layout novo) | Faixa da tabela 3.5: AV07, AV06, AV11, AV03 (a N18 abre o vídeo V2) |
| 6 | c10 → `jornada` | O que ele conquista: planejar personagens maiores, criar em 3D | `jornada`, `pensa`, `molda` | Reescrito; condições numa frase cada |
| 7 | c08 → `voce-acompanha` | O que o responsável acompanha | `responsavel`, `aprendizagem`, `perfis` | Bloco comum 7 com ajuste visual |
| 8 | c11 → `alternativas` | Paliativo | `estudio` | Bloco comum 6 com o card da aula de desenho no lugar do card de jogos |
| | c06, c07 | | | Cortadas; salvamento e pausa já estão na seção 3, Recados nas dúvidas |
| | c04 (sub "desenho do caderno") | | | Vai para a resposta "papel" das dúvidas |
| | fundadores, oferta, garantia, dúvidas, convite | | | Blocos comuns 4, 1, 2, 8 e convite próprio |

## Copy proposta

### 1. Herói

> **Selo:** Do desenho ao jogo
>
> **Título:** Os personagens que seu filho desenha passam a correr, pular e fugir de inimigos num jogo que ele mesmo programa
>
> **Ênfase:** num jogo que ele mesmo programa
>
> **Apoio:** Um desenho guarda as escolhas que ele fez de forma e de cor. Num jogo, o personagem precisa fazer coisas: andar quando alguém aperta uma tecla, alcançar a plataforma, aparecer bem no cenário da fase. Ele aprende a programar essas regras com personagens prontos e, depois do primeiro projeto, passa a desenhar os dele no Pinta e levá-los para o jogo.
>
> - Nas primeiras aulas, ele programa com personagens prontos e aprende as regras que fazem qualquer personagem se mexer.
> - Depois do primeiro projeto publicado, o Pinta fica livre, e os desenhos dele entram nos jogos que ele monta.
> - O jogo publicado ganha um link, e quem joga encontra o personagem que ele desenhou.
>
> **Requisitos:** Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado. Além de desenhar, ele aprende a programar as regras do jogo.
>
> [Ver os planos para meu filho] → `#planos` · [Ver o caminho do desenho ao jogo] → `#experiencia`

Títulos alternativos para teste:

- Seu filho já desenha personagens, e aqui aprende a fazer cada um se mexer num jogo. (Ênfase: fazer cada um se mexer num jogo)
- O personagem que hoje fica parado no desenho do seu filho vai ganhar fases para atravessar. (Ênfase: ganhar fases para atravessar)

### 2. Argumento

> **Selo:** O interesse que ele já tem
>
> **Título:** Num desenho, ele decide como o personagem é; num jogo, decide também o que ele faz
>
> Você já viu o cuidado que seu filho coloca num personagem: a cor trocada três vezes, o formato dos olhos, o detalhe refeito até ficar como ele imaginou. Cada desenho guarda essas escolhas, mas todas são de aparência. Depois de pronto, o personagem fica do jeito que ele fez, parado na folha ou na tela.
>
> Num jogo, aparecem escolhas que o desenho nunca pediu: como esse personagem anda, o que acontece quando ele encosta numa moeda, se ele aparece bem no cenário da fase. Essas respostas vêm das regras do jogo, e as regras se montam com blocos de programação.
>
> Por isso, para uma criança que já inventa personagens, aprender a programar tem um motivo que ela enxerga: ver a própria criação obedecer ao jogador. E o desenho volta a ser escolha a cada teste, porque o personagem azul que some no fundo azul pede outra cor, e quem percebe isso é ele, jogando.

### 3. O caminho do personagem

Adaptação do [bloco comum 5](blocos-comuns.md#5-uma-aula-por-dentro-demonstracao-base) com o percurso visual. Texto completo:

> **Selo:** Do personagem ao jogo
>
> **Título:** Primeiro o personagem pronto obedece; depois chega a vez do personagem dele
>
> **1. As regras com um personagem pronto.** As primeiras aulas trazem personagens e cenários preparados, para seu filho aprender o que faz qualquer personagem andar, pular e responder a uma tecla. A aula abre com o jogo pronto, para ele saber aonde vai chegar.
>
> **2. Monta e testa.** O vídeo mostra o passo ao lado do editor, e as falas do Zappy explicam o que fazer, com o botão Ouvir para escutar. Ele encaixa os blocos e aperta para jogar. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta.
>
> **3. Desenha o dele no Pinta.** Quando conclui [conferir: nome do curso de entrada] e publica o projeto, chega ao posto Construtor e o Pinta fica livre. Ali ele desenha o personagem com cores, formas e camadas, e o desenho do caderno serve de modelo para a versão digital. Com quadros de animação, faz o braço mudar de posição entre uma imagem e outra, que é o movimento do desenho; fazer o personagem responder ao jogador continua sendo trabalho das regras.
>
> **4. Leva para o jogo e ajusta.** No Estúdio, ele traz a arte do Pinta e testa. O personagem ficou grande demais para a plataforma, a cor sumiu no cenário: ele volta ao desenho, ajusta e joga de novo. O aviso Guardado na sua conta confirma que o projeto ficou salvo para continuar no outro dia.
>
> Nas primeiras vezes, sentar junto ajuda a conhecer os botões; com o tempo, você acompanha menos.

A fala da Flávia (AV10), que fecha o bloco 5 nas outras páginas, fica fora desta: aqui a prova do caminho do personagem é o vídeo V2, logo depois da seção 4.

### 4. Mostrar o jogo

> **Selo:** Uma criação para mostrar
>
> **Título:** Quem joga o jogo dele encontra o personagem que ele desenhou
>
> Quando publica, o jogo vai para o Mural dos Criadores com um link e um cartão com QR. A avó abre no computador dela e lá está o personagem que levou uma tarde inteira para ficar pronto, agora correndo pela fase do jeito que ele programou.
>
> Quem joga repara num detalhe e pergunta como ele fez. Seu filho explica a cor que escolheu e a regra que faz o personagem pular, e às vezes sai dali com a ideia da próxima versão. No Clube, ele mostra a criação para outros criadores, e o desafio do mês da etapa dele propõe um tema para o próximo personagem.
>
> **Vídeo V2 · título:** O Jeffrey apresenta os personagens que criou para o próprio jogo
>
> Corte de `jeffrey.wav` indicado na [seção 3.4 dos blocos comuns](blocos-comuns.md#34-video-de-uma-crianca-explicando-o-proprio-jogo), com legenda completa da fala. A N18 · Jeffrey · Aluno · O jogo que é só dele (texto em [trechos-novos.md](trechos-novos.md)) entra como legenda de abertura do vídeo, e não como cartão na faixa, porque as duas vêm da mesma gravação. Identificação: Jeffrey · Aluno · Relato sobre criar jogos.

O vídeo entra aqui porque mostra, na voz de uma criança, a promessa desta seção: personagens inventados por ela dentro de um jogo que outras pessoas jogam.

### 5. O que as famílias contam

Faixa de relatos do [bloco comum 3](blocos-comuns.md#3-o-que-as-familias-contam), conforme a tabela 3.5:

> **Selo:** O que contam sobre as aulas
>
> **Título:** Quando o jogo é dele, os personagens também são
>
> "Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias."
> Jeffrey · Aluno · Relato sobre criar jogos (AV07)
>
> "Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar."
> Fernando · Aluno · Relato sobre criar jogos (AV06)
>
> "Vai criando, vai sendo mais criativo. 'Eu quero mudar isso aqui no jogo.'"
> Daniel · Pai do Rafael · Ter ideias para o jogo (AV11)
>
> "Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo."
> Débora · Aluna · Relato sobre o Desafio do Primeiro Jogo (AV03)

O Daniel entra no lugar da N18 (que agora abre o vídeo V2) e traz a voz de um pai sobre a ideia que nasce no jogo. A Débora fecha a faixa porque responde, por si só, ao receio de quem desenha e acha que programar vai ser difícil.

### 6. Jornada

> **Selo:** Jornada do Criador
>
> **Título:** Cada etapa abre espaço para personagens maiores, até em três dimensões
>
> Um personagem bem desenhado logo pede uma história: o que ele precisa alcançar, quem atrapalha o caminho, como a fase termina. No posto Inventor, o Pensa conversa com seu filho sobre essas escolhas e organiza as respostas em tarefas para ele construir. No Estúdio, o Zappy olha os blocos e o erro e explica o que conferir, mas quem ajusta e testa é ele. Os dois usam os créditos de IA da família.
>
> Mais adiante, no Explorador de Mundos, o Molda leva os personagens para as três dimensões: em vez de uma figura plana, um boneco de blocos que ele monta por todos os lados. [conferir: hoje os cursos publicados levam até o posto X; os próximos entram na assinatura quando forem lançados.]

### 7. O que você acompanha

[Bloco comum 7](blocos-comuns.md#7-o-que-voce-acompanha), com este parágrafo depois do segundo:

> Quando ele mostra o personagem dentro do jogo, conta por que escolheu aquela cor, o que ajustou no tamanho e como fez o personagem andar. Você conhece decisões que a imagem pronta sozinha nunca mostraria. E se você tem dois filhos, um pode ficar com os desenhos e o outro com as regras, cada um no próprio perfil.

### 8. Alternativas

[Bloco comum 6](blocos-comuns.md#6-as-alternativas-o-paliativo), com o card "Construir dentro de um jogo" substituído por este, em primeiro lugar:

> **Aula de desenho.** Uma boa aula de desenho ensina traço, proporção e técnica, e para quem quer só desenhar é o caminho certo. Aqui o desenho é digital e serve a um jogo: seu filho cria o personagem, programa o que ele faz e testa se ficou como queria.

Os cards do vídeo gratuito e da aula ao vivo ficam iguais. Depois dos cards:

> *Fala solta:* N10 · Flávia · Mãe do Fernando · Curso gratuito (texto em [trechos-novos.md](trechos-novos.md))

### Fundadores

[Bloco comum 4](blocos-comuns.md#4-quem-fez-o-que-seu-filho-vai-usar), com a história aprovada do Sobre nós. Sem o parágrafo opcional da escola, que é recomendado só na página F.

### Oferta e garantia

Antes dos planos:

> *Fala solta:* N6 · Daniel · Pai do Rafael · Como uma atividade extra (texto em [trechos-novos.md](trechos-novos.md))

Depois, blocos comuns [1](blocos-comuns.md#1-assinatura-o-bloco-dos-planos) e [2](blocos-comuns.md#2-garantia), sem ajuste.

### Dúvidas

[Bloco comum 8](blocos-comuns.md#8-duvidas), mais estas duas, reescritas:

> **A Comunidade serve para quem quer só desenhar?**
> Serve para quem quer desenhar e ver o desenho fazer alguma coisa. Aqui o desenho digital e a programação andam juntos: seu filho cria o personagem no Pinta e monta, no Estúdio, as regras que fazem ele andar, pular e responder ao jogador. Nas primeiras aulas, ele programa com personagens prontos, e o Pinta fica livre depois do primeiro projeto publicado. Se ele quer aulas de desenho, com traço e técnica, uma aula de desenho atende melhor. Mostre a demonstração e vejam juntos se a parte de programar também desperta a curiosidade dele.

> **Ele pode aproveitar um personagem que desenhou no papel?**
> Sim, como modelo. Com o desenho do caderno ao lado, ele refaz o personagem no Pinta: copia o formato, escolhe as cores e acerta os detalhes enquanto conhece as ferramentas. Depois leva essa versão digital para o Estúdio. Fotografar o desenho, sozinho, não faz um jogo, porque o personagem ainda precisa das regras de como anda e do que acontece quando encontra um objeto. Essa parte ele monta com blocos, e é justamente a graça da proposta.

### Convite final

> **Selo:** Para começar juntos
>
> **Título:** O personagem que hoje mora no caderno pode estar num jogo que a família inteira joga
>
> Imagine seu filho mostrando o desenho, abrindo o jogo e apertando a tecla: o personagem anda do jeito que ele programou. Você reconhece a cor que ele escolheu e entende a regra que ele montou.
>
> Escolham o plano e abram juntos a primeira aula. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.
>
> [Escolher um plano para meu filho] → `#planos`

### SEO

> **Title:** Personagens e jogos para crianças | Comunidade dos Criadores | Sistema Zero
>
> **Description:** Seu filho desenha personagens no Pinta e aprende a programar o que eles fazem num jogo: andar, pular, responder ao jogador. Para crianças de 9 a 14 anos.

## Por que essas mudanças

- **Tese (regra 9):** a seção 2 diz por que quem desenha tem motivo para programar: o desenho decide a aparência, e só as regras decidem o comportamento que a criança quer ver.
- **Verdade da oferta:** a ordem real do caminho (personagens prontos, depois Pinta livre no Construtor) sobe para os benefícios do herói. O pai não descobre a condição três seções depois.
- **Decorado (regra 12):** o desenho dele num jogo que a avó joga ganha seção própria, seguida do vídeo do Jeffrey apresentando os personagens que criou (V2) e da faixa de relatos.
- **Prova perto da alegação (Manual 14):** conforme a tabela 3.5 dos blocos comuns, a prova aparece no jogo publicado (V2 e faixa), nas alternativas (N10, a comparação de uma mãe com o curso gratuito) e antes dos planos (N6).
- **Fim do recuo:** o aviso sobre programação aparece três vezes, cada uma com função (requisito, comparação, resposta), em vez de quatro vezes em tom de desculpa.
- **A plataforma orienta (decisão de 05/10):** Recados e espera saem do corpo; a demonstração mostra Ouvir, Verificar esta parte e Guardado na sua conta.
- **Uma condição, uma vez:** Construtor (seção 3), créditos de IA e estado do catálogo (seção 6). O "pode" cai de 36 para 2 no corpo novo.
- **Paliativo honesto:** o card da aula de desenho reconhece a melhor opção para quem quer só desenhar e, por isso mesmo, deixa claro para quem esta página serve.
- **Corte:** de 11 seções para 8; o corpo passa de cerca de 2.150 para cerca de 1.350 palavras somando os blocos comuns.

## Hipóteses de teste

1. **Herói:** título atual ("Os personagens que seu filho cria podem ganhar movimento e interação nos próprios jogos") contra o proposto. Métrica: clique em "Ver o caminho do desenho ao jogo" e em "Ver os planos".
2. **Benefícios com a ordem real:** benefícios atuais contra os propostos (que dizem que o começo usa personagens prontos), com o mesmo título. Métrica: início de checkout e pedidos de reembolso nos sete dias, para ver se a franqueza no topo reduz frustração depois da compra.
