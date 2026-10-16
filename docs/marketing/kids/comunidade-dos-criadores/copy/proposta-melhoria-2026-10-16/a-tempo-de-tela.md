# Página A: tempo de tela (página padrão)

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md) ou aos [blocos comuns](blocos-comuns.md).

| | |
| --- | --- |
| Endereço | `/kids/comunidade-dos-criadores/oferta` |
| Quem chega | Tráfego misto e frio: anúncio, bio, link compartilhado. Muitos não passaram pelo quiz |
| Nível de consciência | Sabe que o filho passa tempo no computador; não pensou em criação de jogos como resposta |
| Objeção principal | "Vai ser só mais tela" |
| Papel da página | Mostrar que uma parte do tempo que a família já permite pode virar um jogo feito pela criança, e que o pai consegue enxergar o que ela aprendeu |

## O que manter

- O chip "Aprender criando" e a frase central aprovada para o Instagram, que vira título alternativo para teste.
- A cena do ponto no placar e a pergunta "Me mostra o que você mudou", agora uma vez cada.
- A ideia dos três interesses (regra, desenho, tecnologia), mais curta.
- Os fatos de oferta e de requisitos.

## Diagnóstico desta página

1. **Benefícios do herói descrevem a plataforma, não a vida da família.** "Aulas e ferramentas de criação reunidas na mesma plataforma." e "Projetos e registros para acompanhar cada criança da família." São itens da furadeira; falta o decorado (regra 12 do Light Copy). **Correção:** cada benefício diz o que a criança faz e o que isso dá à família.

2. **A seção que deveria argumentar só sugere.** "O computador já participa da rotina de muitas famílias. Dentro do tempo que vocês permitem, cabe reservar uma parte para uma atividade que envolva criar." Diz o que fazer e não diz por que o tempo de tela de hoje costuma não construir nada (regra 9, sem tese). **Correção:** a tese do README pelo ângulo da tela, com a fala da Flávia como prova logo ao lado.

3. **Lero-lero no lugar da cena.** "O valor da integração aparece nessa continuidade entre aprender, fazer, pedir ajuda e mostrar." e "Você participa pelo que consegue ver, ouvir e experimentar, inclusive sem trabalhar com programação." Dá para trocar por qualquer plataforma educativa sem mudar o sentido (regra 8). **Correção:** contar a aula como sequência de ações com rótulos reais.

4. **Ajuda por mensagens no corpo.** "O apoio acontece por mensagens, de forma assíncrona, e pode ser necessário aguardar o retorno. O formato não inclui encontros ao vivo." Contraria sua decisão de 05/10 (a plataforma orienta; Recados só nas dúvidas). **Correção:** Ouvir, Verificar esta parte, Uma pista e O que falta para seguir no corpo; Recados na resposta das dúvidas; aula gravada como escolha, na seção das alternativas.

5. **Jornada contada pelo que ainda não abre.** "O acesso depende dos requisitos, da disponibilidade do serviço e dos créditos da família." e "Algumas liberações dependem de cursos ainda em preparação." A conquista da criança some atrás da ressalva. **Correção:** cada etapa entrega uma ferramenta; a condição de créditos aparece uma vez e o estado do catálogo vira um fato só [conferir].

6. **Alternativas reconhecidas sem explicar a diferença.** Título "O valor da assinatura aparece quando essas partes trabalham juntas" (rótulo) e "Há famílias que gostam de montar esse caminho." **Correção:** bloco de alternativas dos [blocos comuns](blocos-comuns.md#6-as-alternativas-o-paliativo), com o cartão de "construir dentro de um jogo" primeiro, porque é o paliativo mais próximo da família da página A.

7. **Operacional repetido no corpo.** "O responsável administra a visibilidade do perfil, inicialmente desligada para colegas." está na seção 8 e de novo nas dúvidas; pausa e revisão aparecem em três seções. **Correção:** visibilidade só nas dúvidas; pausa vira um passo da aula por dentro.

8. **Convite sem cena e sem risco.** "Escolham o plano que cabe na rotina e abram juntos a primeira atividade." **Correção:** um primeiro encontro concreto com a aula e os sete dias de garantia.

## Nova estrutura

| # | Seção (id atual → nova) | Função | Telas | Texto atual |
| --- | --- | --- | --- | --- |
| 1 | herói | Premissa, tese em uma frase, três consequências | `aula` | Reescrito |
| 2 | `a02` → `a02` | Argumento (tese pela tela) com prova | `regra` | Reescrito |
| | faixa "Por dentro da Comunidade" | Mostrar as áreas | 9 telas atuais | Passa para depois da seção 2 (`tourAfterSection: 'a02'`), para a tese vir antes das telas |
| 3 | `a03` + `a04` → `experiencia` | Demonstração: uma aula por dentro, com AV10 + N9 e o vídeo V1 | `jogo-pronto`, `aula-estudio`, `estudio`, `salvamento` + vídeo | Funde as duas; sai a ajuda por mensagens |
| 4 | `a08` → `relatos` | Mostrar o jogo e faixa de relatos (AV03, N1, N15, N12) | `publicacao` + retratos | Funde publicação e prova; sai visibilidade (dúvidas) e "espaço de cada criança" (oferta e dúvidas) |
| 5 | `a06` → `a06` | Interesses (ampliação de valor) | `preparados`, `pinta`, `codigo` | Encurtado |
| 6 | `a07` → `a07` | Jornada: o que ele conquista | `jornada`, `pensa`, `molda` | Reescrito, condição uma vez |
| 7 | `a05` → `a05` | O que você acompanha | `responsavel`, `aprendizagem` | Bloco comum §7 |
| 8 | `a09` → `alternativas` | Paliativo, com N14 | `reunida` | Bloco comum §6 |
| 9 | `origem` | Quem fez | sem tela | Bloco comum §4 (história do Sobre nós) |
| 10 | assinatura e garantia | Oferta, com N6 antes dos planos | `perfis` (template) | Blocos comuns §1 e §2 |
| 11 | dúvidas | Objeções, com N4 na resposta da aula gravada | atuais | Bloco comum §8 |
| 12 | `convite` | Cena final e próximo passo | sem tela | Reescrito |

Corpo estimado: cerca de 1.400 palavras sem os fundadores (hoje 2.127).

## Copy proposta

### Herói

> **Chip:** Aprender criando
>
> **Título:** Uma parte do tempo de tela do seu filho vira o jogo que ele mesmo programou
>
> **Ênfase:** o jogo que ele mesmo programou
>
> **Apoio:** Nos vídeos e nos jogos prontos, alguém já tomou todas as decisões, e ele só escolhe o que vem em seguida. Criando um jogo, as decisões passam para ele: quanto o personagem pula, quantos pontos vale cada estrela, quando a fase termina. A aula mostra o passo, ele monta, aperta para testar e vê o jogo responder.
>
> **Benefícios** (ícones jogo, pincel, grupo):
> - Ele começa jogando o jogo pronto e termina o primeiro curso com a versão dele publicada, com um link para mostrar. [conferir: o curso de entrada termina com a publicação do projeto]
> - Depois do primeiro projeto, o Estúdio e o Pinta ficam livres para ele desenhar personagens e inventar fases.
> - Você não precisa saber programar: basta pedir "me mostra o que você mudou" e jogar junto.
>
> **Requisitos:** Para crianças de 9 a 14 anos que leem com autonomia. No navegador do computador, com internet, mouse e teclado.
>
> **Botões:** Ver os planos para minha família (→ `#planos`) · Ver uma aula por dentro (→ `#experiencia`)

**Títulos alternativos para teste:**
- Seu filho aprende criando jogos, da primeira experiência às próprias ideias (atual, a mensagem central do Instagram; ênfase "da primeira experiência às próprias ideias").
- No vídeo, quem decide é quem fez. No jogo que seu filho cria, quem decide é ele (ênfase "quem decide é ele").

### 2. Argumento (`a02`, tela `regra`)

> **Selo:** O que muda na tela
>
> **Título:** No jogo pronto, cada decisão já foi tomada por outra pessoa
>
> Pense na última hora que seu filho passou no computador. Ele escolheu um vídeo, depois outro, entrou numa partida e jogou do jeito que o jogo deixa. Foi divertido, e é justo que seja. Só que, em todo esse tempo, quem decidiu a velocidade do personagem, o que vale ponto e quando a fase acaba foi quem fez o jogo.
>
> Por isso, depois de uma tarde de tela, quase nunca existe alguma coisa dele para mostrar.
>
> **Fala solta:** "O Fernando passava muito tempo nas telas, mas ele mais assistia, não desenvolvia nada. O curso incentivou ele a desenvolver, a programar, não a jogar." Flávia · Mãe do Fernando · Usar a tela para criar
>
> Quando ele cria um jogo, essas decisões passam para ele. Ele entra no bastidor do jogo, nas regras que dizem quanto o personagem pula e o que acontece quando ele encosta numa moeda. E cada decisão é testada na hora, porque ele aperta para jogar e o jogo obedece, ou não. É comparando o que mandou fazer com o que aconteceu que ele aprende.
>
> Os combinados de tela continuam sendo de vocês. O que muda é o papel dele numa parte desse tempo.
>
> **Fala solta:** N2 · Daniel · Pai do Rafael · O mesmo tempo de tela (texto em [trechos-novos.md](trechos-novos.md))

O texto da seção não depende do N2: o parágrafo dos combinados afirma por conta própria que a família continua decidindo o tempo. Se o recorte não for aprovado, a fala sai e nenhuma frase da página muda. A N3 (Daniel · Só recebendo) ficou de fora na revisão: diz o mesmo que a fala da Flávia logo acima, e três falas seguidas cortariam o raciocínio.

### 3. Uma aula por dentro (`experiencia`)

Usa o [bloco comum §5](blocos-comuns.md#5-uma-aula-por-dentro-demonstração-base), com estes ajustes:

> **Selo:** Uma aula por dentro
>
> **Passo 3, troca da segunda frase:** Aperta para jogar e confere: o personagem alcançou a estrela e o placar subiu um ponto. Se não subiu, volta ao trecho do vídeo.
>
> **Fala solta, logo depois da AV10 que fecha o bloco comum:** N9 · Flávia · Mãe do Fernando · Tempo apertado (texto em [trechos-novos.md](trechos-novos.md))
>
> **Frase final:** No fim da sessão, ele tem uma regra que funciona e uma vontade nova de chamar alguém para ver.
>
> **Vídeo, ao fim da seção:** V1 · "O Fernando explica as regras do jogo que ele fez" (título do bloco comum §3.4; legenda completa da fala)

O título do bloco comum ("Na primeira aula, ele joga o jogo pronto antes de montar o dele") serve aqui sem mudança. A AV10 (Flávia · Mãe do Fernando · Fazer por conta própria) já fecha o bloco comum; o N9 amplia a mesma ideia com o motivo dela. A frase final continua de pé sem o N9. O vídeo mostra, logo depois da explicação, uma criança fazendo o que a página promete: explicar as regras do próprio jogo.

### 4. Mostrar o jogo e a faixa de relatos (`relatos`, tela `publicacao` + retratos)

> **Selo:** O que contam sobre as aulas
>
> **Título:** O que os pais viram mudar no tempo de tela
>
> Quando o jogo fica pronto, ele publica no Mural e ganha um link e um cartão com QR para mandar à avó, ao primo ou ao amigo da escola. É nessa hora que aparece o pedido que a gente mais gosta de ouvir: "vem ver o que eu fiz".
>
> **Cartelas, nesta ordem:**
> 1. "Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo." Débora · Aluna · Relato sobre o Desafio do Primeiro Jogo
> 2. N1 · Daniel · Pai do Rafael · Mostrar o que aprendeu (texto em [trechos-novos.md](trechos-novos.md))
> 3. N15 · Harle · Pai do Jeffrey · Me mostra quando chego (texto em [trechos-novos.md](trechos-novos.md))
> 4. N12 · Harle · Pai do Jeffrey · Ele mesmo cobrava (texto em [trechos-novos.md](trechos-novos.md))

A Flávia fica fora da faixa porque já aparece no argumento (AV12) e na demonstração (AV10 e N9). As quatro cartelas contam a mesma virada, o filho mostrando o que fez, por quatro vozes diferentes, e o parágrafo do Mural explica o mecanismo antes delas. Se N1, N15 ou N12 não forem aprovados, a faixa segue com as cartelas que restarem e o parágrafo do Mural não muda. Valem as [regras e condições do bloco comum §3](blocos-comuns.md#3-o-que-as-familias-contam) (identificação como no Instagram, termo assinado, retrato real, decisão sobre o parentesco da Débora no cartão).

### 5. Interesses (`a06`, cartas)

> **Selo:** Do jeito dele
>
> **Título:** Tem criança que entra pela regra e tem criança que entra pelo personagem
>
> **Para quem gosta de inventar jogos** (tela `preparados`). Começa com personagens prontos e põe a atenção no que faz o jogo funcionar: andar, pular, somar ponto. Com o Estúdio livre, volta ao projeto e mistura as regras do jeito dele.
>
> **Para quem vive desenhando** (tela `pinta`). No Pinta, desenha o personagem, escolhe as cores e monta o cenário, e depois leva tudo para o jogo. Se o personagem some no fundo azul, ele volta ao desenho, troca a cor e confere de novo.
>
> **Para quem quer saber como as coisas funcionam** (tela `codigo`). Descobre que atrás de cada tecla existe uma instrução: quando apertar a seta, ande; quando encostar na moeda, some um ponto. Prever, testar e conferir é o primeiro passo da programação.
>
> Muitas vezes esses interesses se misturam, e o mesmo jogo acaba tendo regra, desenho e uma boa dose de curiosidade.
>
> [Botão] Ver os planos da Comunidade (→ `#planos`)

### 6. Jornada (`a07`, telas `jornada`, `pensa`, `molda`)

> **Selo:** Jornada do Criador
>
> **Título:** Cada projeto que ele termina abre uma ferramenta nova
>
> Na Comunidade, a criança avança como num jogo: cada etapa da Jornada do Criador pede um projeto e entrega uma ferramenta. Quando conclui [conferir: nome do curso de entrada] e publica o jogo, ela chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para as ideias dela, fora das aulas.
>
> No posto Inventor chegam o Pensa, que conversa sobre a ideia de um jogo e organiza as escolhas em tarefas, e o Zappy, que olha os blocos no Estúdio e explica o que conferir sem mexer no projeto. Os dois usam os créditos de IA da família. No Explorador de Mundos, o Molda abre a criação em três dimensões. [conferir: hoje os cursos publicados levam até o posto X; os próximos entram na assinatura assim que forem lançados.]
>
> Para ele, a próxima ferramenta é um bom motivo para terminar o projeto. Para você, a Jornada mostra em que ponto ele está e o que vem depois, numa tela só.

### 7. O que você acompanha (`a05`)

[Bloco comum §7](blocos-comuns.md#7-o-que-você-acompanha) sem mudança. As telas continuam `responsavel` e `aprendizagem`.

### 8. Alternativas (`alternativas`, tela `reunida`)

[Bloco comum §6](blocos-comuns.md#6-as-alternativas-o-paliativo), com uma mudança de ordem: o cartão "Construir dentro de um jogo" vem primeiro, depois "Vídeo gratuito na internet" e por último "Aula ao vivo".

> **Fala solta, ao fim da seção:** N14 · Harle · Pai do Jeffrey · Ir mais fundo (texto em [trechos-novos.md](trechos-novos.md))

### 9 a 11. Fundadores, assinatura, garantia e dúvidas

- **Fundadores:** [bloco comum §4](blocos-comuns.md#4-quem-fez-o-que-seu-filho-vai-usar), com a história aprovada do Sobre nós. O parágrafo opcional da escola é decisão sua; o bloco o recomenda na página F.
- **Assinatura e garantia:** blocos comuns [§1](blocos-comuns.md#1-assinatura-o-bloco-dos-planos) e [§2](blocos-comuns.md#2-garantia), com a fala solta N6 · Daniel · Pai do Rafael · Como uma atividade extra (texto em [trechos-novos.md](trechos-novos.md)) antes dos cartões dos planos.
- **Dúvidas:** [bloco comum §8](blocos-comuns.md#8-dúvidas), incluindo o N4 na resposta da aula gravada. O grupo "Rotina e tela" vem primeiro, abrindo com "A proposta é aumentar o tempo de tela do meu filho?". A página A não tem perguntas próprias.

### 12. Convite (`convite`)

> **Selo:** Para começar juntos
>
> **Título:** A próxima hora no computador pode terminar com um jogo dele
>
> Escolham um dia da semana, sentem juntos na primeira aula e deixem que ele jogue o jogo pronto antes de montar o dele.
>
> No fim da sessão, o aviso Guardado na sua conta confirma que o projeto ficou salvo, e no dia seguinte ele continua de onde parou. Quando o jogo estiver pronto, quem vai chamar para jogar é ele. E se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.
>
> [Botão] Escolher um plano para minha família (→ `#planos`)

### SEO

> **Title:** Aprender criando jogos no tempo de tela | Comunidade dos Criadores | Sistema Zero
>
> **Description:** Uma parte do tempo de tela vira um jogo que seu filho programa: aula passo a passo, teste na hora e um projeto para mostrar à família. De 9 a 14 anos.

## Por que essas mudanças

- **Tese (regra 9).** A seção 2 explica por que o tempo de tela costuma não deixar nada da criança: as decisões já vieram tomadas. A criação devolve essas decisões a ela, e o teste imediato é o mecanismo do aprendizado.
- **Prova perto da alegação (Manual, princípio 14), em três lugares, como no destaque Avaliações.** No argumento, Flávia (AV12) e Daniel (N2) falam do tempo de tela; na demonstração, Flávia (AV10, N9) fala de independência e o Fernando explica o próprio jogo (V1); a faixa reúne quatro vozes sobre o filho mostrando o que fez; Harle (N14) compara com o curso gratuito; Daniel (N6) põe a assinatura na régua das atividades extras. O texto da página fica de pé sem as falas novas, que dependem da sua aprovação.
- **Decorado (regra 12).** Cada seção fecha numa cena: o "vem ver o que eu fiz", a ferramenta nova como motivo para terminar, o pai que sabe em que ponto o filho está.
- **A plataforma orienta (decisão de 05/10).** Nenhuma menção a Recados ou espera no corpo; a ajuda aparece pelos rótulos da aula.
- **Uma condição, uma vez.** Créditos de IA aparecem uma vez (Jornada); o estado do catálogo vira um fato só, a confirmar.
- **Tráfego frio.** Nada supõe que a pessoa fez o quiz; o herói abre pela situação de qualquer família com criança no computador.
- **Conceito com nome.** "O bastidor do jogo" aparece uma vez, colado às regras que ele nomeia, como nas séries do Instagram.

## Hipóteses de teste

1. **Título do herói:** atual ("Seu filho aprende criando jogos, da primeira experiência às próprias ideias") × proposto ("Uma parte do tempo de tela do seu filho vira o jogo que ele mesmo programou"). Mesmo apoio, mesma página. Métrica: clique em "Ver os planos" e início de checkout.
2. **Faixa de relatos:** com × sem a seção 4 (falas soltas mantidas nas duas versões). Métrica: clique em "Ver os planos" e início de checkout.
