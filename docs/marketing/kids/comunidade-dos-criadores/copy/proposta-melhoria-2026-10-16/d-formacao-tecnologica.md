# Página D: formação tecnológica

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md) ou aos [blocos comuns](blocos-comuns.md).

| | |
| --- | --- |
| Endereço | `/kids/comunidade-dos-criadores/oferta/formacao-tecnologica` |
| Quem chega | Responsável que procura programação como formação complementar à escola, muitas vezes comparando com aula ao vivo (Kodland) |
| Nível de consciência | Consciente da solução: já decidiu que quer programação e está escolhendo onde |
| Objeção principal | "Isso ensina programação de verdade, com sequência e continuidade, ou é só joguinho? E sem professor ao vivo, ele aprende?" |
| Papel da página | Mostrar que cada conceito tem uso visível no jogo, que existe uma sequência longa (até o código) e que o formato gravado foi escolhido para a criança aprender a se virar com a explicação |

## O que manter

- O exemplo da condição (a regra que soma um ponto quando o personagem alcança um objeto) e a ideia de prever, testar e comparar.
- O layout de ferramentas (`tools`), que para este pai funciona como "ementa".
- "Complementar à escola" e, nas dúvidas, a frase de que a proposta é uma iniciação por projetos, sem equivaler a uma formação profissional.
- A distinção entre concluir e entender, dita uma vez.

## Diagnóstico desta página

**1. O herói promete uma "base" abstrata e descreve recursos.**
"Uma base de programação que aparece nos jogos que seu filho constrói" não diz o que a criança faz. O apoio é lero-lero: "Com orientação, ferramentas integradas e um percurso de atividades, você acompanha a formação nas criações e nas decisões que seu filho aprende a tomar." E o primeiro benefício é promessa vaga: "Conceitos ligados ao funcionamento de um projeto." (Light Copy, regras 5 e 8.)
**Correção:** título com a ação e o efeito visível; apoio com a tese (por que o conceito usado fica e o decorado não); benefícios com os conceitos que de fato aparecem nas aulas.

**2. Falta tese na seção que deveria convencer.**
"Ao escolher uma atividade de tecnologia, você quer entender o que seu filho vai aprender e o que fará com esse conhecimento. Ver uma regra funcionando num projeto ajuda a tornar essa avaliação concreta." Descreve o desejo do pai e não argumenta por que programar num projeto ensina mais do que decorar comandos. (Regra 9.)
**Correção:** a seção 2 explica o mecanismo: o comando ganha sentido quando muda alguma coisa na tela, e a previsão conferida no jogo mostra se ele entendeu.

**3. A página argumenta contra o próprio valor.**
Três vezes seguidas: "Pontos de participação registram outra parte da experiência e, sozinhos, não comprovam aprendizagem." / "Receber um plano não demonstra, sozinho, que aprendeu a realizar cada parte." / "Conclusões e certificados, quando previstos no curso, registram requisitos cumpridos." E "disponibilidade, créditos, requisitos" aparece 11 vezes no corpo, o maior número das seis páginas. (Decisão de 13/10: corrigir sem amolecer.)
**Correção:** a diferença entre concluir e entender aparece uma vez, como argumento a favor (a explicação dele mostra o que entendeu); as condições da IA e da Jornada aparecem uma vez cada, como fato.

**4. Para o pai que compara com aula ao vivo, o formato aparece como falta.**
"O retorno acontece por mensagens, de forma assíncrona; pode ser necessário aguardar. A assinatura não inclui encontros ao vivo." e, na comparação final: "Se a necessidade é intervenção imediata de um professor em encontros marcados, esse critério deve pesar na escolha." (Decisão de 05/10: a plataforma orienta; ajuda por mensagem faz a plataforma parecer menor ao lado da Kodland.)
**Correção:** a aula por dentro mostra a orientação na tela (Ouvir, Verificar esta parte, O que falta para seguir); a comparação com aula ao vivo vira diferença verificável a favor do formato (blocos comuns, seção 6), e os Recados ficam só nas dúvidas.

**5. A continuidade, que é o decorado deste perfil, aparece como lista de requisitos.**
O título "A Jornada mostra os requisitos para continuar" e a frase "Algumas etapas dependem de cursos em preparação." escondem o que este pai mais quer ver: uma sequência longa, que vai dos blocos até o código lado a lado (modo Ponte, no Gênio da Criação) e o código puro (modo Pro, na Lenda).
**Correção:** Jornada como sequência de formação, com a ferramenta de cada posto e uma única frase verdadeira sobre o que está publicado hoje.

**6. Nenhuma prova.**
Não há depoimento. A cartela do Daniel ("trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática") e a da Flávia ("Ele faz o curso com total independência no momento") respondem exatamente às duas objeções deste pai. (Manual, princípio 14.)
**Correção:** faixa de relatos logo depois da Jornada e falas soltas coladas à demonstração, ao "para você", às alternativas, aos planos e à dúvida da atenção, conforme a distribuição do bloco comum §3.5.

**7. Seções fora do ângulo e repetição.**
"Um motivo para aprender" repete interesses, perfis e "Avatar, quarto virtual, missões e conquistas permitem personalizar o espaço e reconhecer a participação.", que não pesam para quem procura formação. "Conhecer e compartilhar" repete a visibilidade do perfil, que já está nas dúvidas. Dentro da seção 3, três subseções dizem o mesmo com abstrações: "Essa variação oferece uma oportunidade de mostrar compreensão." / "O projeto oferece um lugar para essa investigação."
**Correção:** cortar d08 e d09 (o essencial vai para a oferta e as dúvidas); fundir d03 e d06 na aula por dentro.

**8. Títulos que são rótulos.**
"As ferramentas se encontram nas decisões do projeto", "Compare a orientação, a prática e o apoio que seu filho vai encontrar", "A orientação inicial dá uma referência para investigar" e o convite "Uma formação que vocês podem conhecer nas decisões do projeto". (Manual, princípio 13.)
**Correção:** títulos novos em todas as seções.

## Nova estrutura

| # | Seção (id atual → nova) | Função | Telas | O que acontece com o texto atual |
| --- | --- | --- | --- | --- |
| 1 | Herói | Premissa, tese, três consequências | `aprendizagem` (mantém) | Reescrito |
| 2 | `d02` → `uso` | Argumento: o conceito faz sentido quando muda algo na tela | `contador` | Reescrito; aproveita a pontuação e a tecla |
| 3 | `d03` + `d06` → `experiencia` | Demonstração: uma aula por dentro, com o exemplo da condição | `jogo-pronto`, `aula-estudio`, `regra`, `salvamento` | Bloco comum §5 com ajuste; d06 cortado (pausa entra no passo 2, requisitos no herói) |
| 4 | `d05` → `ferramentas` | O que cada ferramenta treina | `estudio`, `pinta`, `pensa`, `zappy`, `molda` | Mantém o layout `tools`, texto reescrito e mais curto |
| 5 | `d04` → `jornada` | A sequência até o código | `jornada`, `catalogo`, `codigo` | Reescrito; condições ditas uma vez |
| 6 | nova → `familias` | Prova: faixa de relatos com quatro cartelas | retratos (layout novo) | Bloco comum §3.5, linha D |
| 7 | `d07` → `acompanha` | O que o responsável acompanha | `responsavel`, `aprendizagem`, `certificado` | Bloco comum §7 com ajuste do certificado e a fala solta AV09 |
| 8 | `d10` → `alternativas` | Diferença para tutorial, aula ao vivo e jogo de construir | `integracao` | Bloco comum §6 (com a fala solta N14) e fecho próprio |
| 9 | `origem` | Quem fez | sem tela | Bloco comum §4, sem mudança |
| 10 | Oferta e garantia | | `perfis` | Blocos comuns §1 e §2 |
| 11 | Dúvidas | | | Bloco comum §8, com outra ordem |
| 12 | Convite | Cena final e próximo passo | | Reescrito |
| | `d08`, `d09` | | | Cortados |

Com a seção 3 na posição de índice 1, o botão "#experiencia" do herói continua chegando nela (o template marca a segunda seção quando nenhuma tem esse id; aqui ela passa a ter o id explícito).

Estimativa do corpo: cerca de 900 palavras das seções próprias abaixo, mais cerca de 520 dos blocos comuns §5, §6 e §7, perto de 1.420 no total (hoje são 2.156).

## Copy proposta

### Herói

> **Chip:** Programação na prática
>
> **Título:** Seu filho aprende programação vendo cada comando funcionar no jogo que ele constrói
>
> **Ênfase:** no jogo que ele constrói
>
> **Apoio:** Um comando decorado numa lista é só uma palavra. Quando o mesmo comando faz o personagem pular, seu filho entende para que ele serve, porque montou, testou e viu o resultado. Cada aula explica um conceito, ele aplica no projeto e confere na hora, e no fim consegue explicar a você a regra que montou.
>
> **Benefícios:**
> - Evento, condição e repetição aparecem no funcionamento do jogo: a tecla que move, o ponto que soma, a ação que se repete.
> - Depois do primeiro projeto, o Estúdio e o Pinta ficam livres para ele aplicar o que aprendeu nas ideias dele.
> - Você acompanha na sua área o que ele estudou e ouve dele a explicação da regra que montou.
>
> **Requisitos:** Para crianças de 9 a 14 anos, no navegador do computador, com internet, mouse e teclado. Uma iniciação em programação por projetos, complementar à escola.
>
> **Botões:** Ver os planos (→ #planos) · Ver uma aula por dentro (→ #experiencia)

Títulos alternativos para teste (cada um com a sua ênfase):

> A. Evento, condição e repetição viram coisas que seu filho vê acontecer na tela
> Ênfase: seu filho vê acontecer na tela

> B. Programação faz sentido para uma criança quando o comando que ela monta muda o jogo na hora
> Ênfase: muda o jogo na hora

### 2. Aprender usando (`uso`)

> **Selo:** Aprender usando
>
> **Título:** O comando faz sentido no momento em que muda alguma coisa na tela
>
> Quando você procura uma atividade de programação, quer saber o que seu filho vai aprender e se aquilo vai ficar. Fica o que teve uso. Um comando numa lista é só uma palavra, mas o mesmo comando, usado para fazer o personagem andar quando ele aperta a seta, vira uma ferramenta que ele sabe para que serve.
>
> Por isso cada aula parte de um jogo. Num jogo de achar personagens escondidos, um contador soma um a cada descoberta; em outro, uma instrução responde a uma tecla; em outro, uma ação se repete a cada volta. Seu filho encontra evento, condição e repetição no comportamento daquilo que está construindo, e o nome técnico chega depois, quando ele já viu o efeito.
>
> E a prova de que entendeu aparece do mesmo jeito. Ele muda o valor, diz o que acha que vai acontecer, joga e confere. Se acertou a previsão, entendeu a regra; se errou, sabe exatamente qual bloco revisar. Você vê o aprendizado acontecendo na frente do computador, e não só pela marca de aula concluída.

### 3. Uma aula por dentro (`experiencia`)

Usa o [bloco comum §5](blocos-comuns.md#5-uma-aula-por-dentro-demonstração-base), cujo fecho já traz a fala solta prevista para a demonstração de D (AV10 · Flávia · Mãe do Fernando · Fazer por conta própria), com dois ajustes:

- No passo 3, o exemplo é a condição: "Aperta para jogar e vê se a estrela soma o ponto que ele programou."
- Depois do texto comum, entra este fecho próprio:

> **O que ele leva de cada aula**
>
> Movimento, posição, eventos, condições, repetição e contadores aparecem conforme o conteúdo de cada curso [conferir: a lista de conceitos por curso no catálogo publicado]. Nem toda aula traz um comando novo: algumas pedem para usar o que ele já conhece num jogo diferente, e é assim que o conceito deixa de ser um exemplo da aula e passa a ser dele.

### 4. Ferramentas (`ferramentas`, layout `tools`)

> **Selo:** Cinco ferramentas
>
> **Título:** Cada ferramenta cuida de uma parte do trabalho de quem faz um jogo
>
> **Estúdio: montar a regra e conferir o efeito.** Ele encaixa os blocos, executa e compara o que pediu com o que aconteceu. Quando não bate, revisa uma parte por vez, que é como programador trabalha todo dia.
>
> **Pinta: desenhar o que entra no jogo.** O personagem criado no Pinta vai para o projeto, e lá a aparência também passa por teste: o tamanho, a cor, o contraste com o cenário.
>
> **Pensa: dividir uma ideia grande em partes.** Antes de montar, o Pensa conversa sobre o objetivo do jogador, os controles e quando a partida termina, e transforma as escolhas dele em tarefas. Quebrar um problema em partes menores é uma das primeiras coisas que se aprende em programação, e aqui ela tem um jogo de verdade como motivo.
>
> **Zappy: investigar um erro.** O Zappy lê os blocos e o erro e explica o que conferir, mas não mexe no projeto: quem corrige e testa é a criança. Aprender a usar a inteligência artificial conferindo a resposta também faz parte dessa formação. O Pensa e o Zappy abrem no posto Inventor e usam os créditos de IA da família.
>
> **Molda: criar em três dimensões.** No posto Explorador de Mundos chega o Molda, a oficina 3D, que produz os modelos usados nos jogos 3D do Estúdio.

### 5. A sequência (`jornada`)

> **Selo:** Jornada do Criador
>
> **Título:** Dos primeiros blocos até o código escrito, uma sequência que mostra onde ele está
>
> Uma formação precisa de ordem, e a Jornada do Criador é essa ordem. Ela mostra os cursos em sequência, o posto em que seu filho está e o que falta para o próximo.
>
> O primeiro marco é concluir [conferir: nome do curso de entrada] e publicar o projeto. Aí ele chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para aplicar o que aprendeu em ideias dele. No Inventor chegam o Pensa e o Zappy; no Explorador de Mundos, o Molda. Lá na frente, no Gênio da Criação, o modo Ponte mostra os blocos lado a lado com o código escrito, e na Lenda ele programa em código puro.
>
> Os cursos lançados enquanto a assinatura estiver ativa entram no acesso sem custo extra. [conferir: hoje os cursos publicados levam até o posto X.] Para a criança, cada posto é uma conquista que ela vê no mapa; para você, é um jeito simples de saber em que ponto da formação ela está.

### 6. O que as famílias contam (`familias`)

Faixa de relatos do [bloco comum §3.5](blocos-comuns.md#3-o-que-as-familias-contam), linha D, logo depois da Jornada, porque responde a "isso ensina de verdade?" e "ele segue sem professor ao lado?".

> **Título:** O que os pais contam sobre raciocínio e autonomia
>
> **Abertura:** O que contam sobre as aulas.
>
> 1. "Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática." Daniel · Pai do Rafael · Organizar as ideias
> 2. N5 · Daniel · Pai do Rafael · Teoria na prática (texto em trechos-novos.md)
> 3. N17 · Jeffrey · Aluno · Cada etapa importa (texto em trechos-novos.md)
> 4. N8 · Daniel · Pai do Rafael · Seguir sozinho (texto em trechos-novos.md)

A percepção sobre lógica e matemática fica atribuída ao Rafael, como o Daniel disse; nada sobre escola ou notas nesta página.

### 7. O que você acompanha (`acompanha`)

[Bloco comum §7](blocos-comuns.md#7-o-que-você-acompanha), com esta frase no lugar do último parágrafo:

> Os cursos que têm certificado entregam o documento de conclusão, que registra a etapa cumprida. A explicação dele mostra o que entendeu, e as duas coisas juntas contam muito mais do que o tempo que ele passou conectado.

Fala solta ao fim da seção, colada ao que o pai observa em casa:

> "Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele." Harle · Pai do Jeffrey · Mais responsabilidade

### 8. Alternativas (`alternativas`)

[Bloco comum §6](blocos-comuns.md#6-as-alternativas-o-paliativo), com a fala solta N14 · Harle · Pai do Jeffrey · Ir mais fundo (texto em trechos-novos.md), e este fecho próprio depois dela:

> Se o que pesa para vocês é um professor corrigindo na hora, em horário marcado, a aula ao vivo atende melhor esse critério. Se pesa a criança aprender a usar a explicação, testar e conferir o próprio trabalho, este formato foi desenhado exatamente para isso.

### 9. Quem fez (`origem`)

[Bloco comum §4](blocos-comuns.md#4-quem-fez-o-que-seu-filho-vai-usar), a história aprovada do Sobre nós, sem mudança. Para este perfil, a frase que o bloco deixa em aberto sobre as ferramentas feitas por vocês pesa mais, porque une quem programa as ferramentas a quem prepara as aulas [conferir no próprio bloco].

### 10 e 11. Oferta, garantia e dúvidas

Blocos comuns [§1](blocos-comuns.md#1-assinatura-o-bloco-dos-planos), [§2](blocos-comuns.md#2-garantia) e [§8](blocos-comuns.md#8-dúvidas). Antes dos planos, a fala solta N6 · Daniel · Pai do Rafael · Como uma atividade extra (texto em trechos-novos.md). Na resposta "Como ele acompanha uma aula gravada?", a fala solta N4 · Daniel · Pai do Rafael · Prestar atenção online (texto em trechos-novos.md). Nas dúvidas, este pai procura conteúdo e continuidade antes de rotina, então a ordem dos grupos muda: Ferramentas e IA primeiro (com "E depois dos blocos?" e "Os cursos têm certificado?" no topo), depois Para começar (com "Combina com quem já programa?" e "Tem aula ao vivo?" no topo), Rotina e tela, Família e segurança, Assinatura.

### 12. Convite

> **Selo:** Para começar
>
> **Título:** A primeira regra que ele montar já vem com um motivo e um resultado para mostrar
>
> Abram juntos a primeira aula. Ele joga o jogo pronto, monta o primeiro comando e aperta para testar, e quando o personagem obedecer, peça para ele contar o que mudou e por quê. É a primeira explicação de muitas que você vai ouvir. E se em sete dias vocês acharem que não é para ele, devolvemos o valor.
>
> **Botão:** Escolher um plano para ele começar (→ #planos)

### SEO

> **Title:** Programação para crianças com jogos | Comunidade dos Criadores | Sistema Zero
>
> **Description:** Seu filho de 9 a 14 anos aprende programação usando cada comando num jogo que ele constrói: explicação ao lado do editor, teste na hora e uma sequência de cursos que você acompanha.

## Por que essas mudanças

- **Tese (Light Copy, regra 9):** a seção 2 diz por que o conceito usado fica, e o herói antecipa essa tese no apoio.
- **Decorado (regra 12):** ouvir o filho explicar a regra que montou e ver no mapa em que ponto da formação ele está.
- **Prova perto da alegação (Manual, princípio 14):** a faixa com Daniel e Jeffrey logo depois da Jornada responde a "ensina de verdade?"; Flávia na demonstração e Harle no "para você" respondem a "ele segue sem professor ao lado?"; N14 compara com curso gratuito na seção das alternativas.
- **Corrigir sem amolecer (decisão de 13/10):** de 11 menções a requisitos e créditos para uma frase em cada lugar certo; a distinção entre concluir e entender virou argumento a favor.
- **A plataforma orienta (decisão de 05/10):** nenhum "aguardar o retorno" no corpo; a comparação com aula ao vivo virou diferença verificável.
- **Especificidade (princípio 5):** os postos com nome e a ferramenta de cada um, incluindo Ponte e Pro, conferidos em `docs/jornada-do-criador.md`.
- **Título em toda seção (princípio 13)** e corte de d08 e d09, que falavam com outro perfil.

## Hipóteses de teste

1. **Herói:** título principal × alternativa A (conceitos nomeados no título). Métrica: clique para os planos e início de checkout, mesma fonte de tráfego.
2. **Posição das alternativas:** seção 8 na posição atual × logo depois do herói, porque este pai chega comparando com aula ao vivo. Só a ordem muda, nenhum texto.
