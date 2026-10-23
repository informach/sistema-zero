# Blocos comuns às seis páginas

Proposta de 16/10/2026. Volte ao [diagnóstico geral](README.md). Os textos limpos estão nos blocos de citação; o que vem fora deles é explicação para você. `[conferir: …]` marca um fato que precisa da sua confirmação antes de ir para o código.

Hoje os blocos comuns vivem em `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/shared.ts` (oferta, garantia, fundadores e dúvidas de A a D). E e F têm oferta ou dúvidas próprias, que devem receber as mesmas mudanças.

## 1. Assinatura (o bloco dos planos)

**Problema hoje.** O título "Um acesso para aprender, criar e acompanhar" serve para qualquer curso online. Os dois parágrafos listam categorias ("os espaços da comunidade e o acompanhamento da família") sem dizer o que cada item faz pela criança. O anual não diz quanto economiza. Os dois perfis, que para quem tem dois filhos são metade do preço por criança, aparecem como detalhe técnico.

**Proposta.** Entregáveis com o efeito de cada um (a "metáfora de valor" do 8D), irmãos em destaque, economia do anual em reais e uma frase final que tira a dúvida "qual plano escolher".

> **Título:** Tudo o que seu filho usa para criar entra numa assinatura só
>
> **Abertura:** Vocês assinam uma vez e seu filho tem os cursos da Comunidade, as ferramentas que a Jornada vai abrindo e um lugar para mostrar os jogos que fizer. Os cursos lançados enquanto a assinatura estiver ativa entram junto, sem compra separada.
>
> **Os cursos publicados e os próximos.** Cada curso é um jogo guiado do começo ao fim, e os lançamentos entram no acesso assim que saem. [conferir: hoje são N cursos publicados.]
>
> **As ferramentas, uma etapa de cada vez.** Depois do primeiro projeto publicado, o Estúdio e o Pinta ficam livres para as ideias dele. No posto Inventor chegam o Pensa, para planejar um jogo, e a ajuda do Zappy no Estúdio. No Explorador de Mundos, o Molda, para criar em três dimensões.
>
> **Dois filhos, uma assinatura.** Os dois planos têm até dois perfis de criança. Cada um guarda os próprios jogos, o próprio progresso e a própria Jornada.
>
> **Um lugar para mostrar.** O jogo publicado vai para o Mural com um link e um cartão com QR para mandar à família. O Clube e o desafio do mês dão motivo para a próxima versão.
>
> **A sua área.** Você vê o que cada filho fez, os temas que estudou, as entregas e em que ponto da Jornada ele está.
>
> As aulas são gravadas e funcionam no navegador do computador. O caminho de liberação é o mesmo nos dois planos; muda só a forma de pagar.

> **Plano mensal**
> Cobrado todo mês no cartão. Você cancela a próxima renovação pela sua área quando quiser, e o acesso continua até o fim do mês já pago.
> [Botão] Escolher o plano mensal

> **Plano anual**
> Doze meses pelo equivalente a {{equivalente_mensal_anual}} por mês. Comparado a doze mensalidades, vocês economizam {{economia_anual}}.
> Pix à vista ou cartão com renovação anual. No Pix, o acesso termina ao fim dos 12 meses e vocês decidem se renovam; no cartão, a renovação é automática e pode ser cancelada pela sua área.
> [Botão] Escolher o plano anual

**Fala solta antes dos cartões dos planos:** N6, Daniel · Pai do Rafael · Como uma atividade extra (a comparação com natação e inglês; texto em [trechos-novos.md](trechos-novos.md)). Ela coloca a assinatura na régua que o próprio pai usa para decidir, que é a das atividades extras.

**Ajustes de implementação.**
- `{{economia_anual}}` é um marcador novo, calculado do `compareAtPriceCents` do anual no catálogo (hoje R$ 1.164 − R$ 797 = R$ 367). Sem número escrito à mão. [conferir: o `compareAt` de produção.]
- O selo do cartão anual, hoje fixo no template ("12 meses de acesso"), pode virar "Economia de {{economia_anual}}".
- Os negritos dos cinco itens entram em `destaques.ts` (chave `assinatura`).

**Por quê.** Princípio 12 do Manual (ancoragem) e regra 12 do Light Copy (Decorado). A frase dos irmãos responde a uma objeção de preço com um fato da oferta, sem inventar bônus.

## 2. Garantia

**Problema hoje.** Três parágrafos antes do essencial, com "canal indicado nos termos" sem dizer qual canal. A página E já usa o e-mail direto; as outras cinco não.

> **Título:** Sete dias para ver seu filho na primeira aula
>
> Assinem, abram a primeira aula juntos e vejam como seu filho se sai: se ele entende o passo, se gosta de montar, se a atividade cabe na rotina de vocês. Se em sete dias vocês acharem que não é para ele, devolvemos o valor integral.
>
> Para pedir, escreva para contato@sistemazero.com.br com o e-mail usado na compra. O prazo vale para a primeira contratação e para cada nova contratação anual por Pix; as renovações automáticas no cartão seguem os termos. Cancelar a próxima renovação é outra ação, feita na sua área, e mantém o acesso até o fim do período pago.

O link "Consultar os termos da assinatura" já está no template, logo abaixo. A frase do período da página E ("O período começa com a aprovação do pagamento") continua como bloco próprio dela.

## 3. O que as famílias contam

**Problema hoje.** Não existe. É a função 6 do 8D (prova social) e o maior buraco das seis páginas.

**Proposta (ampliada em 16/10, a seu pedido, conforme o que foi definido no destaque Avaliações do Instagram).** A prova deixa de ser uma seção só e aparece em três lugares de cada página:

1. **Uma faixa de relatos** com quatro cartelas, logo depois da demonstração.
2. **Uma ou duas falas soltas** coladas à alegação que sustentam: a do tempo de tela no argumento, a da independência na demonstração, a do curso gratuito nas alternativas, a da "natação e inglês" perto dos planos, a da atenção nas dúvidas.
3. **Um vídeo curto de uma criança explicando o próprio jogo**, que é a prova mais direta do quadro central da Comunidade ("ver seu filho criar jogos e explicar suas escolhas").

### 3.1 Regras herdadas do destaque Avaliações

Fonte: `instagram/01-destaques.md` (seção Avaliações) e `instagram/producao/destaques/avaliacoes/fontes-dos-relatos.txt`.

- **Identificação igual à do Instagram:** nome · Aluno ou Aluna · contexto do relato (por exemplo, "Rafael · Aluno · Relato sobre o Desafio do Primeiro Jogo"); responsáveis com nome · relação · tema ("Daniel · Pai do Rafael · Organizar as ideias"). O tema é editorial e fica fora das aspas.
- **Recortes sem reticências nem colchetes**, preservando as palavras e o sentido. Os segundos de cada corte ficam no arquivo de fontes, nunca na página.
- **Nada de estrelas, nota média, idade, compra comprovada ou "resultado típico".** A percepção dos pais sobre lógica, matemática, criatividade e responsabilidade fica atribuída aos próprios filhos.
- **Os títulos dos arquivos de vídeo nunca viram chamada.** Alguns citam condições de saúde; nada disso entra na página.
- **Retratos:** os mesmos das cartelas (responsáveis extraídos dos vídeos; Jeffrey e Fernando pelas referências que você forneceu; Rafael, Débora e André em `packages/funnel/public/img/desafio-primeiro-jogo/depo-*.webp`). Regra de 13/10: depoente de fora da família só com retrato real, nunca recriado por IA.
- **Abertura sem lista fixa de nomes**, para continuar válida quando novos relatos entrarem: "O que contam sobre as aulas".
- **André e Débora:** no Instagram aparecem como Aluno e Aluna, por orientação sua. Nas páginas, a seção dos fundadores já diz "pais do André e da Débora", o que deixa o parentesco claro na mesma página. A recomendação registrada em 13/10 (CONAR, art. 27, §9º) era declarar também no cartão; a decisão é sua [conferir].

### 3.2 As dez cartelas aprovadas

| Cartela | Identificação | Fala |
| --- | --- | --- |
| AV02 | Rafael · Aluno · Relato sobre o Desafio do Primeiro Jogo | "No fim eu peguei o link e mandei pro meu amigo jogar." |
| AV08 | Daniel · Pai do Rafael · Organizar as ideias | "Foi um curso que trouxe pro Rafa uma questão de se pensar, de se organizar, tanto na lógica, na matemática." |
| AV03 | Débora · Aluna · Relato sobre o Desafio do Primeiro Jogo | "Achei que ia ser difícil, mas fui montando os bloquinhos e deu certo. No último dia chamei a minha mãe pra ver o meu jogo." |
| AV10 | Flávia · Mãe do Fernando · Fazer por conta própria | "No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento." |
| AV07 | Jeffrey · Aluno · Relato sobre criar jogos | "Eu gosto bastante de produzir os meus jogos, porque é uma forma de eu expressar as minhas ideias." |
| AV09 | Harle · Pai do Jeffrey · Mais responsabilidade | "Começou a ter a sua regra de todo dia ir lá olhar, ver o que que tem no curso pra ele fazer. Ele ficou mais responsável com as coisas dele." |
| AV04 | André · Aluno · Relato sobre o Desafio do Primeiro Jogo | "Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior." |
| AV11 | Daniel · Pai do Rafael · Ter ideias para o jogo | "Vai criando, vai sendo mais criativo. 'Eu quero mudar isso aqui no jogo.'" |
| AV06 | Fernando · Aluno · Relato sobre criar jogos | "Eu me sinto criando meus próprios jogos muito feliz, animado, para ver depois o que que vai dar." |
| AV12 | Flávia · Mãe do Fernando · Usar a tela para criar | "O Fernando passava muito tempo nas telas, mas ele mais assistia, não desenvolvia nada. O curso incentivou ele a desenvolver, a programar, não a jogar." |

### 3.3 Trechos novos dos mesmos vídeos

As transcrições completas dos cinco vídeos (`output/instagram/avaliacoes/2026-10-09/fontes/*-transcricao.txt`) têm falas que respondem às objeções das páginas e não entraram no Instagram. Repeti o processo das cartelas: segunda transcrição com o modelo medium e marcação de palavras. Os textos e os segundos estão em [trechos-novos.md](trechos-novos.md). Eles só entram na página depois que você ouvir e aprovar cada recorte.

| Código | Quem · tema (editorial) | Ideia do trecho | Página e lugar |
| --- | --- | --- | --- |
| N1 | Daniel · Mostrar o que aprendeu | Ao fim de cada aula, o Rafa mostrava o que tinha aprendido e contava até na casa dos avós | A e B, faixa de relatos |
| N2 | Daniel · O mesmo tempo de tela | Ele não ficou com mais tempo de tela; trocou parte do tempo por programação | A, argumento (o mais forte para a página padrão) |
| N3 | Daniel · Só recebendo | A preocupação da casa era ele passar o tempo consumindo vídeo, só recebendo | Reserva (repete a ideia da AV12) |
| N4 | Daniel · Prestar atenção online | O receio era ele não prestar atenção num curso online; os desafios seguraram a atenção | Dúvidas (aula gravada) e D |
| N5 | Daniel · Teoria na prática | Um pouco de teoria, prática na aula e o joguinho criado; aulas curtas | D e F, método |
| N6 | Daniel · Como uma atividade extra | Pensaram como um investimento na criança, como natação ou inglês | Perto dos planos, nas seis |
| N7 | Daniel · Querer continuar | Queriam um curso que o Rafa começasse e não quisesse parar, e foi o que aconteceu | E |
| N8 | Daniel · Seguir sozinho | No começo sentavam ao lado; hoje ele segue sozinho e o pai "já não entende mais nada" | D e E |
| N9 | Flávia · Tempo apertado | Ele ficou mais independente, e isso importa porque o tempo dela é apertado (amplia a AV10) | A e D, demonstração |
| N10 | Flávia · Curso gratuito | O curso gratuito nem sempre tem o mesmo envolvimento e a mesma didática | C, alternativas (depende de uma palavra a ouvir) |
| N11 | Flávia · Prática e foco | Ele vai bem na escola, e ela acha que o curso ajuda como exercício de prática e foco | Só F, com a fala atribuída a ela |
| N12 | Harle · Ele mesmo cobrava | Jeffrey cobrava o pai quando o computador falhava ou não dava tempo de fazer o curso | A, faixa de relatos |
| N13 | Harle · Jogar e criar | O pai também joga ("pai gamer"), e o filho continua jogando e criando os próprios jogos | B, argumento (mostra que jogar e criar convivem) |
| N14 | Harle · Ir mais fundo | Pesquisou cursos gratuitos, mas eram uma aula experimental; neste o filho aprofundou | A, B e D, alternativas |
| N15 | Harle · Me mostra quando chego | Quando volta do trabalho, pergunta como foi, e o filho mostra os jogos que criou | A e E, faixa de relatos |
| N16 | Jeffrey · Habilidade de criar | Os jogos da aula deram a ele a habilidade de fazer os próprios jogos | B |
| N17 | Jeffrey · Cada etapa importa | O que mais gostou foi o processo; cada etapa garante que o jogo funcione | D |
| N18 | Jeffrey · O jogo que é só dele | Um jogo fora do curso, com tudo o que aprendeu, todos os personagens criados por ele, inclusive ele mesmo | B e C (a prova mais forte de "próprias ideias") |
| N19 | Fernando · Um jogo de cada vez | Quer se dedicar a um jogo e depois fazer muitos | E |
| N20 | Fernando · Para outras crianças | Diria às outras crianças que ainda não programam que é legal programar | Convite final ou E |

Na reserva, sem lugar fixo: N21 (Fernando, sprites e animação), N22 (Daniel sobre a Helena como professora), N23 (Daniel sobre o ritmo de cada criança) e N24 (Flávia sobre a didática). Textos e segundos em [trechos-novos.md](trechos-novos.md#reserva-não-distribuída-para-você-considerar).

Cuidados: Daniel e Flávia também falam de preço, mas avaliaram uma oferta anterior; por isso o N6 usa só a comparação com natação e inglês, sem "não achei caro". Os vídeos citam "a professora Helena" e o nome antigo do programa; o trecho escolhido evita o nome antigo. O N10 termina antes de "uma assistência, como a gente tem esse contato com a Helena", para não sugerir atendimento individual, que a página não oferece como destaque.

### 3.4 Vídeo de uma criança explicando o próprio jogo

- **V1, Fernando explicando o jogo dele** (`fernando.wav`, cerca de 14 s a 48 s): ele conta a regra (fugir do balão, coletar as fadinhas, ganhar pontos e vida, vencer em 40 segundos). É a criança explicando as escolhas que fez, exatamente o que as páginas prometem ao pai. Lugar: B e A, junto da demonstração.
- **V2, Jeffrey mostrando o jogo que criou fora do curso** (`jeffrey.wav`, cerca de 344 s a 424 s): os personagens que ele inventou e o personagem que é ele mesmo. Lugar: C e B.

O Manual proíbe vídeo de depoimento sem título do que a pessoa vai dizer. Título proposto para V1: "O Fernando explica as regras do jogo que ele fez". Para V2: "O Jeffrey apresenta os personagens que criou para o próprio jogo". Legenda completa da fala no vídeo.

### 3.5 Distribuição por página

| Página | Título da faixa de relatos | Faixa (4 cartelas) | Falas soltas e vídeo |
| --- | --- | --- | --- |
| A | O que os pais viram mudar no tempo de tela | AV03 Débora, N1 Daniel, N15 Harle, N12 Harle | Argumento: AV12 e N2 (a N3 fica de reserva, porque repete a AV12) · Demonstração: AV10 + N9 · Alternativas: N14 · Planos: N6 · Vídeo V1 |
| B | O primeiro jogo vira link, ideia nova e vontade de fazer outro | AV02 Rafael, AV11 Daniel, N18 Jeffrey, AV04 André | Argumento: N13 · Demonstração: V1 · Jornada: N16 · Alternativas: N14 · Planos: N6 |
| C | Quando o jogo é dele, os personagens também são | AV07 Jeffrey, AV06 Fernando, AV03 Débora, AV11 Daniel | Vídeo V2, com a N18 como legenda de abertura (os dois saem do mesmo vídeo, então a fala não se repete num cartão) · Alternativas: N10 · Planos: N6 |
| D | O que os pais contam sobre raciocínio e autonomia | AV08 Daniel, N5 Daniel, N17 Jeffrey, N8 Daniel | Demonstração: AV10 · Dúvida da atenção: N4 · Para você: AV09 · Alternativas: N14 · Planos: N6 |
| E | Quem fez o primeiro jogo já pensa no próximo | AV04 André, N19 Fernando, N7 Daniel, N15 Harle | Herói ou abertura: AV02 · Planos: N6 |
| F | O que os pais percebem quando o filho explica o próprio jogo | AV08 Daniel, N11 Flávia, AV09 Harle, AV03 Débora | Método: N5 · Fundadores: observações sobre o André (seção 4) · Planos: N6 |

**Condições antes de publicar:**
- [ ] Termo de autorização assinado de cada pessoa (regra de 13/10). Sem o termo, a fala não entra.
- [ ] Você ouvir e aprovar cada trecho novo (N1 a N20) e os cortes dos vídeos V1 e V2.
- [ ] Decisão sobre o parentesco no cartão de André e Débora.

**Implementação.** Layout novo de relatos (retrato, fala, identificação) e um componente de fala solta dentro das seções. Os vídeos pedem hospedagem fora do repositório e legenda; os cortes de 30 s a 80 s cabem no limite de envio direto ao R2.

## 4. Quem fez o que seu filho vai usar

**Problema hoje.** "Somos Helena e Júlio, desenvolvedores de sistemas e formados em Sistemas de Informação" é currículo; o Manual pede conquista concreta e uma origem verdadeira. A página não conta a história que o destaque Sobre nós do Instagram já conta (SN01 a SN07, com os fatos que você acrescentou em 08/10): o André jogava e assistia a vídeos de jogos, vocês usaram parte desse tempo para ensiná-lo a criar, e o que mudou depois.

**Proposta.** A mesma história do Sobre nós, em prosa de página, com as mesmas regras: as mudanças são observações de vocês sobre o André, sem atribuir tudo à programação e sem prometer o mesmo a outras crianças; sem quantidade de medalhas, notas, datas ou categorias; o certificado mostrado é o real, com os dados pessoais desnecessários recortados.

> **Selo:** Quem está por trás
>
> **Título:** Tudo começou com o tempo que nosso filho já passava jogando
>
> Somos Helena e Júlio, pais do André e da Débora. Nós dois somos formados em Sistemas de Informação e trabalhamos com programação.
>
> O André sempre gostou muito de jogar e de assistir a vídeos de jogos. Em vez de brigar com esse interesse, decidimos aproveitá-lo: passamos a usar uma parte do tempo que ele já ficava na tela para ensiná-lo a criar os próprios jogos.
>
> Para um jogo funcionar, ele precisava pensar no que vem primeiro, testar e ajustar quando algo dava errado. Foi nesse processo que vimos o André se interessar cada vez mais por aprender. Depois, ele chamava a gente para jogar e contava como tinha feito.
>
> **[Parágrafo opcional, decisão sua; recomendado na página F.]** Nesse período, também percebemos mudanças na escola. Ele passou a se envolver mais nas aulas e a se concentrar melhor, e as notas melhoraram. Desde o segundo ano, tem ficado entre os cinco primeiros da turma, na maioria das vezes em primeiro lugar, e conquistou medalhas em olimpíadas de matemática. Contamos isso como pais, pelo que vimos no André. *(Foto real do certificado e foto do André com as medalhas, as mesmas de SN04 e SN05.)*
>
> Essa experiência nos deu vontade de ajudar outras famílias a usar uma parte do tempo de tela para aprender criando, e foi assim que nasceu a Comunidade dos Criadores. Hoje somos nós que preparamos as aulas, usando o que sabemos de programação para ensinar as crianças a fazer os próprios jogos. [conferir: acrescentar "e as ferramentas que elas usam, como o Estúdio e o Pinta, também são feitas por nós"?]
>
> "Eu já jogava um monte, agora eu faço os meus jogos. Esse foi o primeiro e já quero fazer um maior." André · Aluno · Relato sobre o Desafio do Primeiro Jogo

Nas páginas em que a cartela do André (AV04) já está na faixa de relatos (B e E), a linha final desta seção sai, para a mesma fala não aparecer duas vezes.

**Por quê.** Princípio 15 do Manual (autoridade concreta) e a regra da seção de autoridade (origem verdadeira e a virada). Toda a história já foi aprovada por você para o Instagram; aqui só muda o formato. "Em vez de brigar com esse interesse" retoma o argumento aprovado em 14/08 ("não briga com o interesse, aponta para a criação"). Na página F, o parágrafo da escola é a prova mais forte que existe para esse público, desde que fique como relato de vocês.

## 5. Uma aula por dentro (demonstração base)

A, B, D e F usam esta sequência com o exemplo de cada página. C e E adaptam (o personagem desenhado e o projeto em andamento). As telas já existem: `jogo-pronto`/`aula`, `aula-estudio`, `regra`, `salvamento`.

**Problema hoje.** A demonstração está espalhada em três ou quatro seções ("Aprender e fazer", "No ritmo da atividade", "Tudo se conecta") e fecha sempre na ajuda por mensagens.

> **Título:** Na primeira aula, ele joga o jogo pronto antes de montar o dele
>
> **1. Primeiro ele joga.** A aula abre com o jogo terminado, para seu filho saber aonde vai chegar e ter vontade de chegar lá.
>
> **2. Depois monta, um passo de cada vez.** O vídeo mostra o passo ao lado do editor. Ele pausa, encaixa os blocos e segue. As falas do Zappy explicam o que fazer, e o botão Ouvir lê em voz alta.
>
> **3. Então testa.** Aperta para jogar e vê se o personagem fez o que ele mandou. Se não fez, volta ao trecho do vídeo. Nas partes que têm verificação, Verificar esta parte mostra o que já está certo e o que falta; nos experimentos, Uma pista indica onde olhar.
>
> **4. E guarda para amanhã.** O aviso Guardado na sua conta confirma que o projeto ficou salvo, e a faixa O que falta para seguir mostra o próximo passo. No outro dia, ele abre e continua de onde parou.
>
> A aula foi feita para a criança seguir com o que está na tela. Nas primeiras vezes, sentar junto ajuda a conhecer os botões; com o tempo, você acompanha menos, como conta a Flávia, mãe do Fernando: "No início eu acompanhei mais, agora eu acompanho menos. Ele faz o curso com total independência no momento."

**Por quê.** Sua decisão de 05/10 (a plataforma orienta) e as diretrizes da Comunidade (mostrar o que vem pronto, o que a criança faz e como pode rever). Os rótulos foram conferidos no código em 16/10: Ouvir, Uma pista (experimentos), Verificar esta parte, O que falta para seguir, Guardado na sua conta. A ressalva "algumas crianças precisam de companhia" continua verdadeira, agora dita uma vez e resolvida pela fala da Flávia.

## 6. As alternativas (o paliativo)

**Problema hoje.** "Há ferramentas e tutoriais gratuitos para aprender programação. […] Há famílias que gostam de montar esse caminho." Reconhece a alternativa e não explica a diferença.

> **Título:** O tutorial ensina o passo; o difícil é saber o que fazer quando o jogo não obedece
>
> **Vídeo gratuito na internet.** Há bons tutoriais, muitos em inglês e cada um num ponto diferente. Funcionam para quem já sabe o que procurar. O problema aparece no primeiro erro: o vídeo segue e a criança fica sem saber onde olhar. Aqui a explicação está na mesma tela do editor, e a verificação mostra o que falta.
>
> **Aula ao vivo.** O professor explica na hora, no horário marcado e no ritmo da turma, e para quem precisa de alguém ao lado isso pesa a favor. Aqui a explicação é gravada: espera por ele, repete o trecho quantas vezes ele precisar e cabe no horário que vocês escolherem.
>
> **Construir dentro de um jogo.** Montar mundos no Minecraft ou no Roblox já é criação, e muita criança começa por aí. Só que a gravidade, os pontos e o fim da partida continuam sendo do jogo. Aqui é ele quem escreve essas regras.

**Fala solta ao fim da seção:** N14, Harle · Pai do Jeffrey · Ir mais fundo (ele pesquisou cursos gratuitos e achou uma aula experimental; aqui o filho aprofundou). Em C, a N10 da Flávia sobre a didática do curso gratuito. É um pai comparando, com as palavras dele, o que a seção explica.

**Por quê.** A referência da skill `copy-funil`: paliativo é o que o comprador já tenta; explicar a diferença sem decretar fracasso. A comparação com a aula ao vivo transforma "não temos aula ao vivo" numa vantagem verificável, que era o ponto da sua decisão de 05/10.

## 7. O que você acompanha

> **Título:** Você não precisa saber programar para entender o que ele fez
>
> A programação está nas aulas. O seu papel é outro: combinar o horário, abrir a primeira aula junto e, depois, pedir para ver o jogo.
>
> Na sua área, cada filho tem um painel com os cursos, as atividades, as entregas, os temas que estudou e o ponto da Jornada. Dali você escolhe um projeto e faz a pergunta que abre a conversa: "Me mostra o que você mudou." Ele aponta o bloco, joga e explica. Você entende o que ele aprendeu pelo que ele mostra, e passa a fazer parte de um assunto que antes era só dele.
>
> Uma etapa concluída diz que ele cumpriu o pedido da aula; a explicação dele diz o que entendeu. Os dois juntos contam muito mais do que o tempo que ele passou conectado.

**Por quê.** A dor D20 da pesquisa de 12/10 ("acabo ficando de fora dessa parte da vida dele") vira decorado. A diferença entre concluir e entender continua, em uma frase.

## 8. Dúvidas

**Problema hoje.** 40 perguntas em A a D, 50 em E e 45 em F. Várias se sobrepõem (internet e salvamento; Pensa, Zappy, IA e planejamento; perfil e link público; senha e atendimento) e algumas servem a quem já é cliente (indicação). A ajuda por mensagens aparece em três respostas.

**Proposta.** Cerca de 24 perguntas, em cinco grupos. Respostas que começam pela resposta.

| Grupo | Perguntas |
| --- | --- |
| Para começar | Precisa saber programar? · Precisa saber desenhar? · Eu preciso saber programação? · Como ele acompanha uma aula gravada? · Tem aula ao vivo? (nova) · De que equipamento ele precisa? · Combina com quem já programa? |
| Rotina e tela | A proposta é aumentar o tempo de tela? · Precisa entrar todo dia? (junta férias e pontos) · Como ele guarda o projeto para continuar? (junta internet, salvamento e exportação) · E se ele já desistiu de outras atividades? |
| Ferramentas e IA | Todas as ferramentas abrem no primeiro dia? · Quais cursos entram? · A IA faz o projeto por ele? (junta Pensa, Zappy e planejamento) · Os créditos de IA são ilimitados? · E depois dos blocos? (junta 3D e código) · Os cursos têm certificado? |
| Família e segurança | Uma assinatura atende dois filhos? · Quem vê o perfil e os jogos dele? (junta perfil e link público) · E se uma conversa no Clube o incomodar? · Como saber se ele precisa de um apoio que vocês não oferecem? |
| Assinatura | O que ele faz quando trava? (único lugar dos Recados) · Preciso comprar ferramentas à parte? · Como cancelo? · Como peço o reembolso? · Como falo com vocês ou recupero a senha? |

Cada página acrescenta as suas: B (Roblox Studio, Desafio), C (só desenhar, desenho do papel), E (as perguntas de continuidade), F (escola, notas, série, dificuldade em matemática e em leitura). Saem da página de vendas: indicação (é para quem já assina) e exportação como pergunta própria.

Respostas reescritas (as demais seguem a mesma régua: resposta na primeira frase, uma condição uma vez, sem refrão de cautela):

> **O que ele faz quando trava numa atividade?**
> Primeiro, usa o que está na tela: volta o vídeo ao trecho e, nas partes que têm verificação, aperta Verificar esta parte para ver o que já está certo e o que falta. Nos experimentos, Uma pista indica onde olhar. Para dúvidas de como usar uma ferramenta, o Como fazer tem tutoriais por assunto, e a partir do posto Inventor o Zappy do Estúdio também ajuda a examinar os blocos.
> Se a dúvida continuar, o botão Preciso de ajuda, na própria aula, manda a pergunta para a nossa equipe. A resposta chega por escrito nos Recados, e ele pode consultá-la depois.

> **Tem aula ao vivo?** (nova)
> Não. As aulas são gravadas, e isso foi uma escolha: a explicação espera por ele. Seu filho pausa no passo, faz, volta ao trecho quantas vezes precisar e segue quando o jogo funcionar, no horário que vocês combinarem.

Na resposta "Como meu filho acompanha uma aula gravada?", acrescentar a fala N4 do Daniel (o receio de que o filho não prestasse atenção num curso online e o que eles viram depois), que responde à dúvida com a experiência de outro pai.

> **A proposta é aumentar o tempo de tela do meu filho?**
> Não. A ideia é mudar o que ele faz numa parte do tempo que vocês já permitem. Vocês continuam decidindo os dias e a duração, e a aula gravada cabe nesse combinado porque pausa hoje e continua amanhã do mesmo ponto.
> O que muda é o papel dele naquele tempo. Em vez de escolher o próximo vídeo, ele decide quanto o personagem pula, testa e mostra para você.

> **Todas as ferramentas abrem no primeiro dia?**
> Não, e de propósito. No começo, cada aula traz os personagens e os recursos daquela atividade, para ele aprender um passo de cada vez. Quando conclui [conferir: nome do curso de entrada] e publica o projeto, chega ao posto Construtor, e o Estúdio e o Pinta ficam livres para as ideias dele. No Inventor chegam o Pensa e a ajuda do Zappy; no Explorador de Mundos, o Molda. [conferir: hoje os cursos publicados levam até o posto X; os próximos entram na assinatura quando forem lançados.]

> **Quais cursos entram na assinatura?**
> Todos os cursos publicados da Comunidade e os que forem lançados enquanto a assinatura estiver ativa, sem pagar à parte. [conferir: hoje são N.] Cada curso é um jogo guiado, e a Jornada mostra a ordem e o que cada um libera.

> **A inteligência artificial faz o projeto por ele?**
> Não. O Pensa conversa sobre a ideia do jogo (o objetivo, os controles, quando a partida termina) e organiza as escolhas dele em tarefas; dois irmãos podem planejar juntos no mesmo plano. O Zappy, no Estúdio, olha os blocos e o erro e explica o que conferir, mas não mexe no projeto: quem ajusta e testa é a criança. A IA também erra, e conferir a sugestão no jogo faz parte de aprender. Os dois abrem no posto Inventor e usam os créditos de IA da família.

> **Quem vê o perfil e os jogos do meu filho?**
> O perfil começa escondido dos colegas, e só você liga essa opção, na sua área. Os jogos são outra coisa: quando ele publica, o link é público, e quem receber consegue jogar. Por isso vale combinar com ele quais jogos publicar e para quem mandar.

## 9. Convite final

**Problema hoje.** Os seis convites terminam em "Escolham o plano que cabe na rotina e abram juntos a primeira atividade". Falta a cena com o decorado e a reversão de risco.

**Padrão proposto:** a cena que o pai quer viver, o próximo passo concreto e os sete dias. Cada página escreve a sua cena.

> Exemplo (A): Hoje à noite, vocês podem abrir a primeira aula juntos. Ele joga o jogo pronto, monta o primeiro passo e aperta para testar. Daqui a alguns dias, é ele quem vai chamar você para jogar. E se em sete dias não for para ele, devolvemos o valor.

## 10. Nota do checkout

> Ao escolher o plano, você preenche os dados do responsável, confere o valor e a renovação e só então paga. O perfil do seu filho é criado depois, já dentro da plataforma.

A segunda frase repete o aviso que o pré-checkout já mostra às famílias do kids, e evita que o pai preencha os dados da criança.
