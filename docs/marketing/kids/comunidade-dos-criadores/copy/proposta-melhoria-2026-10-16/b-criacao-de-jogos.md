# Página B: criação de jogos

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md) ou aos [blocos comuns](blocos-comuns.md).

| | |
| --- | --- |
| Endereço | `/kids/comunidade-dos-criadores/oferta/criacao-de-jogos` |
| Quem chega | Responsável cujo filho já pede para fazer jogos, vindo do quiz ou de anúncio sobre criar jogos |
| Nível de consciência | Alto sobre o desejo (o filho quer criar), baixo sobre o caminho (não sabe por onde começar nem que ferramenta é) |
| Objeção principal | "Ele vai travar no primeiro passo, como já travou num tutorial" e "isso é Roblox?" |
| Papel da página | Mostrar um começo alcançável e a passagem da construção guiada para as ideias dele, com o link do jogo publicado como prova de que chegou lá |

Arquivo atual: `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/criacao-de-jogos.ts`.

## O que manter

- A cena do ponto no placar que muda de valor (b04) e a partida em família (b09).
- O gato que recolhe estrelas como exemplo do Pensa.
- O personagem que some no cenário e pede outra cor.
- A honestidade sobre o Roblox Studio (agora só nas dúvidas) e o fato de que o Estúdio livre chega no posto Construtor.
- A frase do convite atual para quem já fez o Desafio, levada para as dúvidas.

## Diagnóstico desta página

1. **O herói promete sem tensão.** "Seu filho aprende a criar jogos e dar a eles o seu jeito." "Dar a eles o seu jeito" não diz o que a criança faz (regra 5, promessa vaga; regra 8, lero-lero). Os benefícios descrevem o produto ("A Jornada organiza o avanço e a liberação das ferramentas.") em vez de juntar uma urgência a uma consequência. **Correção:** título com a antítese que o pai reconhece (ele conhece os jogos de cor, mas não sabe fazer um) e benefícios que terminam numa cena: o link mandado, o Estúdio livre, você jogando.

2. **A tese da seção 2 se perde em hipóteses.** "Se tentou um tutorial e travou, pode ter faltado uma explicação, um recurso ou uma sequência adequada ao que sabia. Na Comunidade, a orientação, as ferramentas da atividade e o caminho de ajuda fazem parte da mesma experiência." São três talvez seguidos de uma abstração, e o produto entra pelo rótulo (regra 9, sem tese). **Correção:** dizer a causa: jogar nunca exigiu as decisões que construir exige, e quem só joga recebe tudo pronto.

3. **A ajuda por mensagens volta três vezes.** "A ajuda por mensagens entra quando a dúvida continua" (b04); "O apoio é assíncrono, por mensagens, e pode ser necessário aguardar uma resposta. A assinatura não inclui aulas ao vivo." (b06); "a dúvida tem um lugar para ser enviada" (b05). Contraria a decisão de 05/10. **Correção:** a orientação da própria aula (Ouvir, Verificar esta parte, O que falta para seguir) no corpo; Recados só na resposta das dúvidas.

4. **A cautela vira refrão.** São 32 "pode" no corpo, e a seção da Jornada empilha condições: "O remix, quando disponível, permite explorar e alterar uma base publicada compatível. Um desafio do mês para a etapa pode oferecer um tema"; "Pensa e Zappy dependem dos requisitos, da disponibilidade do serviço e dos créditos de uso da família." **Correção:** cada condição uma vez, como fato ("os dois usam os créditos de IA da família"), e o estado do catálogo numa frase verificável.

5. **O decorado principal fica abstrato.** O que esta família quer é ver alguém jogando o jogo do filho, e a página diz: "Essa partida pode render uma conversa: uma regra ficou clara, uma fase pareceu difícil, uma ideia despertou curiosidade." Logo depois, um parágrafo sobre visibilidade de perfil ocupa o lugar da emoção. **Correção:** a cena concreta (o primo, a avó, o amigo jogando), o comentário que leva à próxima versão e a fala do Rafael logo em seguida. A visibilidade fica nas dúvidas.

6. **O mesmo mecanismo em três seções.** A pausa aparece em b03 ("Pode assistir a um passo, pausar o vídeo e executar aquela ação") e em b06 ("pausar, fazer, voltar ao trecho e testar mais uma vez"); b05 repete b03 e b07 ("A arte tem um destino no jogo; a explicação ajuda numa ação; a dúvida tem um lugar para ser enviada."). **Correção:** uma demonstração só (bloco comum 5) e b05 e b06 fundidas nela.

7. **O paliativo não explica a diferença.** "Ferramentas gratuitas e tutoriais também oferecem caminhos para aprender. Ao comparar, vale olhar o que cada experiência reúne". **Correção:** bloco comum 6, começando pelo card de construir dentro de um jogo, que é o que esta criança já faz.

8. **Títulos que são rótulos e nenhuma prova.** "Uma experiência organizada para construir em casa", "Aula, desenho, teste e ajuda acompanham a mesma criação", "O visual do jogo também pode acompanhar as ideias dele". E nenhuma das três falas que sustentam exatamente esta promessa (Rafael, Daniel, André) aparece. **Correção:** títulos que afirmam algo curioso e a seção de depoimentos depois do jogo publicado.

## Nova estrutura

| # | Seção (id atual → nova) | Função | Telas | O que acontece com o texto atual |
| --- | --- | --- | --- | --- |
| 1 | herói | Premissa, tese em uma frase, três consequências | `estudio` | Reescrito |
| 2 | b02 → `ideia` | Argumento: por que a ideia trava | `preparados` | Reescrito; mantém a cena da fase inventada |
| 3 | b03 + b06 → `experiencia` | Demonstração: o primeiro projeto por dentro | `jogo-pronto`, `aula-estudio`, `salvamento` + vídeo V1 | Bloco comum 5 com o exemplo do salto; b06 fundida (pausa); Recados e requisitos saem |
| 4 | b04 → `mudanca` | Mecanismo do quadro B: a primeira regra mudada | `regra` | Mantém a cena do placar; reescrito com decorado |
| 5 | b09 → `mostrar` | Decorado principal: alguém jogando o jogo dele | `publicacao`, `mural` | Reescrito; visibilidade vai para as dúvidas |
| 6 | novo → `familias` | Prova | retratos (layout novo) | Faixa da tabela 3.5: AV02, AV11, N18, AV04 |
| 7 | b07 + b08 → `jornada` | O que ele conquista depois do primeiro jogo | `jornada`, `integracao`, `pensa`, `zappy` | Funde o visual (b07) com a Jornada (b08); remix sai |
| 8 | b10 → `voce-acompanha` | O que o responsável acompanha | `responsavel`, `aprendizagem`, `perfis` | Bloco comum 7 com o ajuste dos conceitos |
| 9 | b11 → `alternativas` | Paliativo | `reunida` | Bloco comum 6, com o card de jogos primeiro; Roblox vai para as dúvidas |
| | b05 | | | Cortada; o conteúdo já está em 3 e 7 |
| | fundadores, oferta, garantia, dúvidas, convite | | | Blocos comuns 4, 1, 2, 8 e convite próprio |

Na seção 7, conferir se o layout `journey` aceita quatro telas para três grupos; se não, juntar `pensa+zappy` como já se faz com `clube+publicacao`.

## Copy proposta

### 1. Herói

> **Selo:** Fazer os próprios jogos
>
> **Título:** Seu filho conhece de cor os jogos que joga, e aqui ele aprende a fazer os dele
>
> **Ênfase:** aprende a fazer os dele
>
> **Apoio:** Entre a ideia que ele conta empolgado e um jogo que funciona, existem decisões que ninguém ensinou: qual comando faz o personagem pular, onde esse comando entra, como saber se deu certo. O primeiro projeto ensina essas decisões uma de cada vez, começando por uma partida no jogo pronto, para ele saber aonde vai chegar.
>
> - O primeiro jogo termina publicado, com um link que ele manda para quem quiser jogar.
> - Depois desse projeto, o Estúdio e o Pinta ficam livres para ele inventar personagens, fases e regras.
> - Você joga o que ele fez e entende cada escolha, porque ele mostra o bloco que mudou.
>
> **Requisitos:** Para crianças de 9 a 14 anos. No navegador do computador, com internet, mouse e teclado.
>
> [Ver os planos para meu filho] → `#planos` · [Ver como ele monta o primeiro jogo] → `#experiencia`

Títulos alternativos para teste:

- Seu filho inventa jogos o tempo todo, e aqui aprende a fazer cada um funcionar. (Ênfase: aprende a fazer cada um funcionar)
- O jogo que existe só na cabeça do seu filho ganha fases, regras e um link para o amigo jogar. (Ênfase: um link para o amigo jogar)

### 2. Argumento

> **Selo:** Da ideia ao jogo
>
> **Título:** A ideia ele já tem; o que trava são as decisões que jogar nunca exigiu
>
> Seu filho já contou como seria a fase, qual poder o personagem teria e que obstáculo colocaria no caminho. A ideia tem graça para ele. Só que, na hora de construir, aparecem perguntas que nenhuma partida fez: que comando faz o personagem pular, onde esse comando entra, o que acontece quando ele encosta na moeda.
>
> Essas respostas são o bastidor do jogo, as regras que dizem quanto o personagem pula e quando a fase termina. Quem só joga recebe tudo isso pronto. Por isso, se ele já tentou construir sozinho, talvez tenha parado justamente aí: o personagem não obedece e não fica claro onde olhar.
>
> O caminho é aprender uma decisão de cada vez, com um resultado para ver em cada uma. Primeiro o movimento, depois o salto, depois o ponto. A cada passo, ele aperta para jogar e confere se o personagem fez o que ele mandou. Aos poucos, as ideias que ele conta deixam de esperar por alguém e começam a aparecer na tela.
>
> E ninguém precisa largar o videogame por isso. O pai do Jeffrey conta como é na casa deles:
>
> *Fala solta:* N13 · Harle · Pai do Jeffrey · Jogar e criar (texto em [trechos-novos.md](trechos-novos.md))

### 3. O primeiro projeto por dentro

Usa o [bloco comum 5](blocos-comuns.md#5-uma-aula-por-dentro-demonstracao-base) com estes ajustes:

> **Selo:** Um começo guiado
>
> **Título:** Antes de montar qualquer bloco, ele joga a partida que vai construir
>
> No passo 2, acrescentar ao fim: Os personagens e os sons já vêm prontos, então a atenção dele fica no que importa nesse começo: fazer o jogo funcionar.
>
> No passo 3, trocar o exemplo por: Aperta para jogar e vê se o personagem alcançou a plataforma. Se ficou curto, ele volta ao trecho do vídeo e confere o bloco do salto.

No fechamento, a frase termina em "com o tempo, você acompanha menos." e a fala da Flávia (AV10) sai: nesta página, a prova da demonstração é o vídeo de uma criança explicando o próprio jogo, logo depois dos quatro passos.

> **Vídeo V1 · título:** O Fernando explica as regras do jogo que ele fez
>
> Corte de `fernando.wav` indicado na [seção 3.4 dos blocos comuns](blocos-comuns.md#34-video-de-uma-crianca-explicando-o-proprio-jogo), com legenda completa da fala. Identificação: Fernando · Aluno · Relato sobre criar jogos.

O restante do bloco 5 fica igual.

### 4. A primeira mudança

> **Selo:** A primeira mudança
>
> **Título:** A primeira regra que ele muda é o primeiro pedaço do jogo que é só dele
>
> Imagine a fase em que cada estrela vale um ponto. Seu filho troca o valor para cinco, joga de novo e vê o placar disparar. Então decide se gostou ou se o jogo ficou fácil demais, e muda outra vez.
>
> Para fazer essa mudança de propósito, ele precisa entender o que aquele bloco faz, e é nesse momento que montar deixa de ser copiar o passo e vira decidir. As atividades que deixam um valor aberto para ele mexer existem para isso: a montagem guiada mostra como funciona, e a mudança mostra se ele entendeu.
>
> Você percebe a diferença quando ele chama para jogar as duas versões e explica por que prefere uma delas. A conversa sobre jogos, que antes era sobre o jogo dos outros, passa a ser sobre uma escolha que ele fez.

### 5. Mostrar o jogo

> **Selo:** Uma criação para mostrar
>
> **Título:** O jogo publicado vira um convite, e do outro lado alguém joga o que ele fez
>
> Quando publica, o jogo ganha um lugar no Mural dos Criadores, um link e um cartão com QR. Seu filho manda para o primo, para a avó, para o amigo da escola, e acontece uma coisa que jogar nunca deu a ele: outra pessoa joga o que ele construiu.
>
> Quem joga comenta. A fase ficou difícil, o pulo está curto, o inimigo é rápido demais. Ele volta ao Estúdio com um motivo para a próxima versão, que agora tem plateia. No Clube, mostra o projeto para outros criadores, e o desafio do mês da etapa dele propõe um tema para o jogo seguinte.

### 6. O que as famílias contam

Faixa de relatos do [bloco comum 3](blocos-comuns.md#3-o-que-as-familias-contam), conforme a tabela 3.5:

> **Selo:** O que contam sobre as aulas
>
> **Título:** O primeiro jogo vira link, ideia nova e vontade de fazer outro
>
> "No fim eu peguei o link e mandei pro meu amigo jogar."
> Rafael · Aluno · Relato sobre o Desafio do Primeiro Jogo (AV02)
>
> "Vai criando, vai sendo mais criativo. 'Eu quero mudar isso aqui no jogo.'"
> Daniel · Pai do Rafael · Ter ideias para o jogo (AV11)
>
> N18 · Jeffrey · Aluno · O jogo que é só dele (texto em [trechos-novos.md](trechos-novos.md))
>
> "Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior."
> André · Aluno · Relato sobre o Desafio do Primeiro Jogo (AV04)

A ordem acompanha o caminho da página: o link (seção 5), a mudança (seção 4), o jogo feito fora do curso e a vontade do próximo, que prepara a Jornada. Como o bloco dos fundadores também fecha com a AV04, nesta página vale encerrar o bloco 4 sem a citação para a fala não aparecer duas vezes [conferir].

### 7. Jornada

> **Selo:** Jornada do Criador
>
> **Título:** Depois do primeiro jogo, cada etapa entrega uma ferramenta nova
>
> **Construtor: o Estúdio e o Pinta ficam livres.** Quando conclui [conferir: nome do curso de entrada] e publica o projeto, seu filho chega ao posto Construtor. O Estúdio e o Pinta deixam de ser só os da aula e passam a ser dele: abre um projeto em branco, desenha no Pinta a criatura que inventou, leva para o jogo e escreve as regras que ela segue. Se ela some no cenário, volta à arte, troca a cor e testa de novo.
>
> *Fala solta:* N16 · Jeffrey · Aluno · Habilidade de criar (texto em [trechos-novos.md](trechos-novos.md))
>
> **Inventor: planejar com o Pensa e investigar com o Zappy.** Jogo maior pede plano. No posto Inventor, o Pensa conversa com ele sobre o jogo que quer fazer, como o do gato que recolhe estrelas: como o gato anda, o que conta como vitória, quando a fase acaba. Depois organiza as respostas em tarefas. No Estúdio, o Zappy olha os blocos e o erro e explica o que conferir, mas quem ajusta e testa é ele. Os dois usam os créditos de IA da família.
>
> **Explorador de Mundos: o Molda.** Mais adiante, o Molda abre a criação em três dimensões. [conferir: hoje os cursos publicados levam até o posto X; os próximos entram na assinatura quando forem lançados.]

### 8. O que você acompanha

[Bloco comum 7](blocos-comuns.md#7-o-que-voce-acompanha), com este parágrafo depois do segundo:

> Nas aulas, ele encontra conceitos de programação dentro do jogo: a tecla que dispara um movimento, a condição que soma o ponto, a instrução que se repete. Quando ele explica a regra que montou, você está ouvindo esses conceitos com as palavras dele.

### 9. Alternativas

[Bloco comum 6](blocos-comuns.md#6-as-alternativas-o-paliativo), com o card "Construir dentro de um jogo" em primeiro lugar, porque é o que esta criança já faz. Os outros dois ficam iguais. Depois dos cards:

> *Fala solta:* N14 · Harle · Pai do Jeffrey · Ir mais fundo (texto em [trechos-novos.md](trechos-novos.md))

### Fundadores

[Bloco comum 4](blocos-comuns.md#4-quem-fez-o-que-seu-filho-vai-usar), com a história aprovada do Sobre nós. Sem o parágrafo opcional da escola, que é recomendado só na página F.

### Oferta e garantia

Antes dos planos:

> *Fala solta:* N6 · Daniel · Pai do Rafael · Como uma atividade extra (texto em [trechos-novos.md](trechos-novos.md))

Depois, blocos comuns [1](blocos-comuns.md#1-assinatura-o-bloco-dos-planos) e [2](blocos-comuns.md#2-garantia), sem ajuste.

### Dúvidas

[Bloco comum 8](blocos-comuns.md#8-duvidas), mais estas duas, reescritas:

> **As aulas ensinam a criar no Roblox Studio?**
> Não. Seu filho cria no Estúdio da Comunidade, montando as regras com blocos. Se ele gosta de Roblox, as ideias que traz de lá (obstáculos, fases, pontos, um personagem que coleta coisas) cabem nos projetos do Estúdio. Se o objetivo é aprender a ferramenta Roblox Studio em si, esta não é a escolha certa; mostre a demonstração para ele e vejam juntos se é este jeito de criar que ele quer.

> **Ele já começou pelo Desafio. Precisa repetir o que fez?**
> Não. Assinando com o mesmo e-mail do responsável, ele continua no mesmo perfil, com o que já concluiu e os jogos que guardou. Se ainda faltar terminar uma etapa ou publicar o projeto, a Jornada mostra o que falta.

### Convite final

> **Selo:** Para começar juntos
>
> **Título:** A próxima partida em casa pode ser num jogo feito por ele
>
> Esta noite, ele abre a primeira aula, joga a partida pronta e começa a montar a primeira parte. Quando o projeto estiver publicado, é ele quem manda o link e pede para você jogar.
>
> Escolham o plano. Se em sete dias vocês acharem que não é para ele, devolvemos o valor.
>
> [Escolher um plano para meu filho criar] → `#planos`

### SEO

> **Title:** Criar jogos para crianças | Comunidade dos Criadores | Sistema Zero
>
> **Description:** Seu filho aprende a fazer os próprios jogos: joga o projeto pronto, monta cada regra em blocos, testa e publica com um link para os amigos. De 9 a 14 anos.

## Por que essas mudanças

- **Tese (regra 9):** a seção 2 explica a causa do travamento (jogar não exige as decisões que construir exige) em vez de listar hipóteses sobre o tutorial.
- **Decorado (regra 12):** cada mecanismo termina numa cena: o placar disparando e a escolha entre duas versões (seção 4), o primo jogando e comentando (seção 5), o projeto em branco no Estúdio livre (seção 7).
- **Prova perto da alegação (Manual 14):** a prova aparece em cinco pontos, conforme a tabela 3.5 dos blocos comuns: o pai que joga junto no argumento (N13), o Fernando explicando o próprio jogo na demonstração (V1), a faixa logo depois do jogo publicado (o Rafael fala do link e o André fecha com "fazer um maior", que prepara a Jornada), o Jeffrey na Jornada (N16) e as comparações dos pais nas alternativas (N14) e antes dos planos (N6).
- **A plataforma orienta (decisão de 05/10):** a ajuda por mensagens sai do corpo; a demonstração usa os rótulos reais da aula.
- **Uma condição, uma vez:** Construtor, créditos de IA e estado do catálogo aparecem cada um uma vez, na seção 7, como fato. O "pode" cai de 32 para 1 no corpo novo (no convite).
- **Corte:** de 11 seções para 9, com b05 e b06 fundidas; o corpo passa de cerca de 2.080 para cerca de 1.300 palavras somando os blocos comuns.
- **Paliativo honesto:** o card de jogos de construir abre a comparação porque é a referência da criança, e o Roblox Studio fica numa resposta clara nas dúvidas, em vez de aparecer no fecho do corpo.

## Hipóteses de teste

1. **Herói:** título atual ("Seu filho aprende a criar jogos e dar a eles o seu jeito") contra o proposto, com o resto da página igual. Métrica: clique em "Ver os planos" e início de checkout.
2. **Depoimentos:** a mesma página com e sem a seção 6. Métrica: rolagem até os planos e início de checkout.
