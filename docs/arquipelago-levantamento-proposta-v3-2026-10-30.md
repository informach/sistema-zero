# Arquipélago Vagalume: proposta v3 e Jornada do Criador contra o código (30/10/2026)

Levantamento pedido pela dona em 30/10/2026, sobre o staging local em `62cead8c7` (igual ao
`origin/staging`, mais um commit de CI). Compara:

- a proposta original do jogo, `Arquipélago Vagalume.html` (versão 3, com as fichas das 8 ilhas);
- a proposta pedagógica por posto, `Proposta Jornada do Criador - revisao aprofundada.html`.

Foi feito em cinco frentes de leitura do código (mundo e ilhas; casa e economia; viver, aventura e
Lumis; desafios e pedagogia; família, adulto e arquitetura). Os achados de maior peso foram
conferidos de novo no código antes de entrar aqui (marcados com ✔). Complementa, sem substituir,
`docs/arquipelago-levantamento-2026-10-30.md` e `docs/arquipelago-estado-atual.md`.

**Decisões (30/10/2026):** a dona aprovou as 16 recomendações das decisões pendentes (A1 a A11,
A32, B2, B12, B15 e B16). Elas estão registradas em `docs/arquipelago-regras.md` §6.28, e os
pedidos de arte prontos para produzir foram para `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`
(seção "Pedidos da revisão da proposta v3"). Nada da lista A foi implementado ainda.

Legenda: **Feito**, **Parcial**, **Falta**, **Divergente** (o código faz diferente da proposta;
"registrado" quando há decisão escrita em `arquipelago-regras.md` §6.27 ou no levantamento).

## 1. Em uma página

O jogo está **quase todo construído** e, onde está feito, costuma estar feito com cuidado: regras
puras com teste, servidor que recalcula, moedas à prova de duplicar, textos limpos. O que separa o
jogo da proposta hoje não é falta de sistema, é falta de **ciclo fechado para a criança**:

1. **A cor por partes não acontece.** O código pinta a ilha quadro a quadro, mas o Bosque e a Vila
   Doce têm 0 de 6 quadros marcados para publicar, o Vale 3 de 6 e as Nuvens 5 de 6 ✔. Nenhum
   desafio do dia está marcado para publicar em nenhuma ilha ✔. Hoje a criança chega ao Bosque e
   ele fica em 30% de cor para sempre.
2. **Os Lumis não trabalham com o jogo fechado** ✔. A rotina só começa numa virada de dia ou noite
   vista com o jogo aberto. O gancho da proposta ("colhe a horta, os Lumis guardaram tudo") não
   existe, e a horta em horas reais deixou isso mais visível.
3. **A pedagogia está bem montada nas ilhas de cima e fraca nas de baixo.** Faísca, Nuvens e as
   linguagens do C02 (Python, Ponte, Pro) acertam o posto. Bosque e Vila Doce, que são as
   primeiras ilhas novas da criança, estão abaixo do posto (Bosque) ou fora dele (a corrida da Vila
   não tem pulo nem gravidade, que é o centro do Inventor) ✔.
4. **Três relógios** convivem sem explicação: o dia do jogo (16 minutos, na HUD), as horas reais da
   horta e o dia de São Paulo dos pedidos ✔ (a fala de boa-noite promete crescer a horta numa
   soneca de um minuto).
5. **Várias escolhas divergem da proposta sem registro**: página do Recife, Farol aceso antes do
   final, moqueca sem peixe, dino que não vem para casa, Pinta aberto na Faísca, ninhos sem perigo.

Nada disso é grande em código. A maior parte é publicação de conteúdo, decisão sua e ajuste fino.

## 2. O que foi implementado com excelência

| Área | Por quê | Onde |
| --- | --- | --- |
| Cena da subida de posto | Fiel à proposta (Zappy voa, cor escorre, ponte tábua por tábua, travessia), espera a criança sair de casa, tem versão com menos movimento e teste | `mundo/chegada-da-ponte.ts`, `cena-da-chegada.tsx` |
| Carregar e soltar ilhas | Uma ilha completa por vez, a leve como reserva, prova de memória em cinco voltas | `mundo/carregar-ilha.ts`, Q01 |
| Kit de movimento | Os sete movimentos existem, com física em passo fixo e sala de teste | `sistemas/modos/`, `cipo.ts`, `escalada.ts` |
| Modo construção | Paredes que esticam, cômodos por fechamento, corte automático das paredes, desfazer, recusas com fala do Zappy | `sistemas/construcao/` |
| Molde do objeto | Um contrato só alimenta o Pinta (planificação com a frente marcada), o Molda (5 mil triângulos) e a validação no servidor | `contracts/objetos.ts`, `member-shell/lib/arquipelago-objeto.ts` |
| Aconchego | Ao pé da letra: comprar nunca tira ponto, feito por você soma mais | `construcao/aconchego.ts` |
| Economia | Uma carteira, teto semanal no Members sob trava, chave única por prêmio, pendente quando o Members cai, função se conquista no servidor, nada de caixa surpresa ou dinheiro real | `members/.../arquipelago-coins.repository.ts`, `servico-do-jogo.ts` |
| Percursos | 8 percursos com checkpoint, três estrelas e fantasma da família | `sistemas/percurso.ts` |
| Família e privacidade | Limite contado no servidor, interruptores dos pais, a criança não alcança `/familia/*`, fotos com aprovação prévia e sem metadados, o serviço nunca sabe nomes | `servico-das-visitas*.ts`, `arquipelago-clube.ts` |
| Arquitetura | Fronteira de importação com teste, porta única `montarArquipelago`, falha contida em camadas, liga e desliga no serviço começando desligado | `entrada.tsx`, `config/env.ts` |
| Desafios | Cada objetivo passa no gabarito e falha no inicial, com erros de propósito, no executor real (Chrome, Python publicado, Pro) | `docs/desafios-do-jogo/`, `studio-runtime/tests` |
| Textos | Os 1.310 textos dos desafios e o `src/` do jogo estão sem travessão, sem exclamação e sem abrir com pergunta | varredura das frentes |

## 3. Mapa da proposta: feito, parcial e falta

### 3.1 Mundo e história

| Item da proposta | Situação | Observação |
| --- | --- | --- |
| Sua ilha no centro, seis em anel, Farol ao lado da casa | Feito | |
| Ilhas de posto alto maiores ou mais altas | Parcial | Só as Nuvens flutuam e o Pico é alto; todas têm o mesmo raio |
| Silhueta até 3 mil triângulos, uma peça, névoa por cima | Divergente (sem registro) | Quatro das seis passam de 3 mil (Vila 4.440) e têm de 9 a 16 partes; não há névoa sobre a ilha cinza |
| Versão média baixando na ponte | Divergente (registrado, N15) | Duas versões em vez de três |
| Ponte quebrada antes do posto, barco depois do Recife | Feito | |
| Luneta: morador acenando, bicho correndo, segredo brilhando | Parcial | Vulto cinza genérico e um brilho, iguais em toda ilha; o morador e o aceno já existem em arte |
| Cor por partes | Feito no código, não acontece | Falta publicar os quadros (seção 5) |
| Abertura (Cinza, Íris, barquinho, chave, carta, Zappy) | Feito | Fiel ao texto |
| "Só o quarto tem cor" | Incoerente | O Zappy diz isso ✔, mas casa, horta e píer já aparecem coloridos |
| Páginas do diário | Feito em 5 de 6 | Recife tem texto novo ✔ (seção 6) |
| Carta de boas-vindas como página da sua ilha | Parcial | Só na abertura, não fica no diário |
| Final na Lenda | Parcial | Última página, seis fachos e volta da Íris fiéis; a subida pelo Farol espera arte |
| Farol acende no final | Incoerente | Acende ao chegar à Lenda (`jornada >= 8`) ✔, antes da subida e da última página |
| Personagens | Feito | O Nico só acena: sem conversa nem papel de carteiro |

### 3.2 As oito ilhas pela ficha

| Ilha | O que falta ou diverge (o resto está feito) |
| --- | --- |
| Sua ilha (Faísca) | Horta e píer cinzas; Nico como carteiro |
| Bosque (Construtor) | Pinta deveria abrir aqui; abre na Faísca, sem registro (o Molda tem registro, N10) |
| Vila Doce (Inventor) | Corrida sem atalhos; móveis de café e banca de feira para casa |
| Recife (Explorador) | Página do diário diverge |
| Pico (Mestre) | Iglu construível e segundo andar (falta arte e espaço no salvamento) |
| Vale (Arquiteto) | "Proteger os ninhos das ondas de cinza" virou observar, sem perigo; fósseis com um osso só; o dino de estimação fica no Vale |
| Nuvens (Gênio) | Jardim do céu e "fazer a ilha florescer" não existem e não têm pedido; moldar o terreno espera arte |
| Farol (Lenda) | Subida final espera arte |

### 3.3 Casa, criação e economia

| Item | Situação | Observação |
| --- | --- | --- |
| Mesmo quarto da plataforma | Parcial | O jogo lê o quarto só ao abrir e nunca grava; "mudou no jogo, muda na plataforma" vale só para 3 itens da galeria |
| Porta nova, cômodos, chaves | Feito | As chaves liberam acabamento, não o cômodo (registrado) |
| Cabana no Bosque, quintal grande no Vale | Feito | |
| Iglu, segundo andar, moldar o terreno | Falta | Arte e o documento estendido da obra (plano E04) |
| Farol galeria e modo livre | Feito | |
| Projeto azul (Pinta, Molda, galeria, feito por você grátis) | Feito | |
| "Usar uma criação minha que cabe neste molde" | Parcial | Só troca entre aparências já feitas para o objeto |
| Galeria com 3 modelos por objeto | Parcial | Um por objeto (falta arte) |
| Geladeira "guarda 12 e conserva" | Incoerente | Nada estraga no jogo; "conserva" não tem efeito |
| Feira como fonte de moedas | Divergente | A feira só vende |
| Excedente do teto | Incoerente | Desafio e turno esperam a semana seguinte; o do pedido se perde |

### 3.4 Viver, aventura, Lumis e ritmos

| Item | Situação | Observação |
| --- | --- | --- |
| Necessidades como humor bom, cochilo sem perda | Feito | O bônus não aparece na tela; o cochilo é um teletransporte, não "cochila onde está" |
| Moradores com gostos, aniversário, pedidos, amizade | Parcial | Amizade libera receitas e diário, mas não roupas |
| Bichos que seguem, adotar, truques, crescer | Parcial | Uma vaga de adotado só; o pet que acompanha desliza sem animação (não confirmado se o modelo tem clipe) |
| Horta em tempo real com clima | Feito (decisão de 30/10) | Chuva só rega com o jogo aberto |
| Receitas do Brasil | Parcial | Moqueca de legumes no lugar de peixe com coco ✔; brigadeiro vem da amizade, não do extra do desafio; pratos quase só servem para comer |
| Profissões na Vila | Feito | A feira só gira destaques de um catálogo fixo |
| Festas | Parcial | Carnaval, Junina e fim de ano ativos; roupas são só sugestões, sem posse; decoração só na Vila |
| Percursos, fantasma, exploração, brinquedos de ilha | Feito | A terceira estrela é coleta, não "achar o segredo" |
| A noite tem o Cinza | Parcial | Borrões viram Lumis, mas não desbotam nada |
| Segredos | Parcial | 4 baús, todos pelo planador, vazios; faltam Lumis raros e páginas extras |
| Lumis por ilha com rotina em cartões | Parcial | Intérprete excelente; rotina só com o jogo aberto ✔; automatiza só horta e geladeira |
| Sessão de 20 minutos | Parcial | "Pedido do Bento: bolo de fubá" não é possível (pedidos só pedem milho, tomate, pipoca e salada); o desafio na feira depende da publicação |
| Álbum | Parcial | Faltam fósseis, peixes do Recife e pegadas |

### 3.5 Família, adulto e arquitetura

| Item | Situação | Observação |
| --- | --- | --- |
| Cartão dos pais | Parcial | Objetos contados "desde o começo" e por aparência aplicada, não criação da semana |
| Limite do tempo livre (30 min, fora desafios) | Feito | Quem pausa o relógio é o cliente; um cliente adulterado escapa (risco baixo) |
| Fim no fim da ação | Feito | |
| Interruptores (irmãos, outras crianças, Clube) | Feito | O texto "Tudo começa desligado" ✔ é falso: irmãos começam ligados, como a proposta quer |
| ECA, sem caixa surpresa | Feito hoje | Não há regra nem teste que impeça um sorteio pago no futuro, e os baús vão receber Lumis raros |
| Adulto pelas etapas, sem limite, com resumo e visitas | Feito | Desafios adultos ainda não importados |
| Publicação separada com manifesto e rollback | Divergente | O jogo vai dentro da imagem do serviço; voltar uma versão é reimplantar, sem canal estável e teste |
| CSP própria da página do jogo | Divergente (com motivo escrito) | No Kids a página usa a política do Estúdio Pro inteira (`unsafe-eval`, StackBlitz) para o Pro abrir sobre o jogo ✔ |
| Contrato da plataforma | Feito | Exige igualdade exata de versão: plataforma e jogo precisam subir juntos |
| Admin do jogo | Divergente | Mora em `packages/admin`, não no pacote do jogo; conteúdo das ilhas só no código |
| Medição de sucesso | Parcial | D1 e D7 e volta ao curso só no Kids; sem fonte para satisfação dos pais, permanência, comprados e conclusões antes e depois |

## 4. Coerência pedagógica por posto

Contagem dos quadros do Quadro das Cores marcados para publicar ✔ (Kids; o adulto é igual).

| Posto e ilha | Minijogo da proposta | O que existe | Alinhamento com a Jornada | Quadros |
| --- | --- | --- | --- | --- |
| Faísca, sua ilha | Pega-conchas | 6 quadros em blocos | **Bom**: evento, informação, Se, coletar uma vez, reiniciar, só com blocos do Farol e do Jardim | 6/6 |
| Construtor, Bosque | Corrida dos bichos | 6 quadros (5 retomadas) e 3 do dia | **Parcial**: quadros 1 a 3 são do Faísca; nenhum trabalha grupos, vidas, derrota e partida que recomeça, o centro do Construtor | 0/6 |
| Inventor, Vila Doce | Corrida do entregador | 6 quadros e 3 do dia | **Divergente**: o entregador anda em 4 direções desviando de uma caixa, sem pulo, gravidade, obstáculos sorteados nem dificuldade crescente; o README admite | 0/6 |
| Explorador, Recife | Mira de bolhas | 6 quadros em blocos, 3 do dia, 1 em Python | **Parcial**: a cor sai só de retomadas em blocos; o Python acerta o posto, mas copia o tema da missão "Resgate dos Vagalumes" | 6/6 |
| Mestre, Pico | Fase de plataforma | 6 quadros, 3 do dia, 1 em Python | **Parcial**: o último quadro tem uma fase só; o Python (fases como dados) acerta o posto, mas espelha a missão | 6/6 |
| Arquiteto, Vale | Proteja os ninhos | 6 quadros, 3 do dia, 1 em JS na Ponte | **Parcial**: o JS na Ponte é o melhor encaixe do pacote; quadros 1, 2 e 6 pedem blocos que nenhum curso ensina; os cursos do Arquiteto não existem | 3/6 |
| Gênio, Nuvens | Jardim que floresce | 6 quadros, 3 do dia, 1 em Pro | **Bom**: ocupação, custo e taxa; o Pro separa modelo e apresentação e guarda o estado | 5/6 |
| Lenda, Farol | Projeto livre como as Maestrias | 1 quadro autoral | **Abaixo do posto**: os critérios são os do Faísca e só aceitam blocos do Faísca; não deixa usar Python ou JS nem escolher uma Maestria. Mérito: a conferência causal aceita ideias diferentes do gabarito | 1/1 |

Regras da proposta para os desafios:

| Regra | Situação |
| --- | --- |
| Montado no Admin | Parcial: pelo manifesto; Python e Pro não se editam no Admin |
| Três tipos (Quadro, do dia, dos moradores) | Parcial: o desafio de morador existe só no tipo, sem conteúdo nem tela |
| Desafio do dia como revisão espaçada | Feito no código, vazio: nada publicado |
| Minijogo vira atração | Parcial: fliperama de casa e galeria do Farol; barraca na feira e brinquedo do festival não |
| "Aprenda isso em" | Parcial: só aparece quando falta bloco; Python e Pro nunca mostram |
| Prêmio | Parcial: moedas, cor e extra em moedas; falta o prêmio-objeto do extra ("receita de brigadeiro") |
| Desafio só com blocos conquistados | Feito para blocos. **Furo**: Python e Pro abrem só por estar na ilha. Quem acaba de chegar ao Explorador recebe Python antes de fazer o curso |

Medição pedagógica prometida na proposta: tentativas e dicas usadas não são contadas (a tentativa
sobrescreve a anterior); acerto na primeira tentativa não existe; rotinas dos Lumis que funcionam e
projetos reenviados não são medidos. Volta ao curso em 24 horas está feita.

## 5. Ajustes e melhorias, por prioridade

### Decisões suas (desbloqueiam o resto)

1. **Publicação dos quadros do Bosque e da Vila Doce** e de pelo menos parte dos desafios do dia. Sem
   isso a cor por partes e a revisão espaçada não existem. Se a Vila precisa de conteúdo novo antes
   (item 6), o Bosque pode ir primeiro.
2. **A cor sai da linguagem do posto?** Hoje, do Explorador em diante, a ilha se colore só com
   retomadas em blocos, e o desafio na linguagem do posto vale 10 moedas sem cor. A criança restaura
   o Recife inteiro sem nenhum Python.
3. **Requisito de curso para Python e Pro** (por exemplo, o curso-base 2D do posto concluído), já que
   não há blocos para servir de barreira.
4. **Registrar ou desfazer as divergências** (seção 6): página do Recife, Farol aceso antes do
   final, Pinta na Faísca, moqueca, dino no Vale, ninhos sem perigo, terceira estrela de coleta,
   borrões que não desbotam, quarto que só se edita na plataforma.

### Código, alto impacto

5. **Lumis com o jogo fechado**: ao abrir, rodar as viradas de amanhecer que passaram, com teto.
6. **Corrida do entregador com pulo, gravidade, obstáculos sorteados e dificuldade com teto**, que é o
   que o Inventor ensina e o que a proposta mostra como exemplo.
7. **Farol acende só depois da subida** (`mundo/farol.tsx:47` deve depender de `farol.concluido`).
8. **Um relógio legível**: alinhar dia do jogo, horta e pedidos, ou explicar na tela; corrigir a fala
   de boa-noite.
9. **O salvamento não pode depender do Members**: hoje todo salvamento de quem tem aparência da
   galeria consulta a posse ✔. Cache curto, ou conferir só as aparências novas.
10. **Sua ilha cinza fora do quarto** no começo, para a primeira fala do Zappy ser verdade.

### Código, médio impacto

11. Pedidos que pedem pratos (bolo de fubá, pão de queijo) e venda na feira: dar destino à cozinha.
12. Luneta com o morador da ilha acenando (a arte já existe).
13. Nico com conversa e pedidos; humor "ótimo" visível; roupas por amizade e de festa com posse.
14. Desafio de morador (placa que acende à noite) e barraca na feira para o minijogo aprovado.
15. Medição: contar tentativas e dicas, guardar o acerto na primeira tentativa, somar as rotinas
    dos Lumis que passam no teste.
16. Política de segurança da página do jogo no Kids: uma própria, com o mínimo do Pro (de
    preferência em quadro isolado), no lugar da política inteira do Estúdio Pro.
17. Regra e teste "nenhum sorteio pago com moeda" antes de os baús receberem Lumis raros.
18. Projeto autoral do Farol à altura da Lenda (linguagem escolhida, ou uma Maestria).

### Conteúdo e arte

19. Enunciados menos prescritivos nos quadros 1 a 5 e com o morador no pedido; tema próprio nos
    desafios Python, sem copiar as missões dos cursos.
20. Jardim do céu e florescer (Nuvens), dino em casa (Vale), móveis de café e banca (Vila): hoje não
    têm lote nem pedido de arte.
21. Silhuetas das ilhas em uma peça e até 3 mil triângulos (pedido de arte), ou registrar a
    divergência; conteúdo dos segredos; fósseis, peixes e pegadas no álbum.
22. Os pedidos de arte já abertos: iglu, segundo andar, terreno, subida do Farol, variações da galeria.

## 6. Incoerências encontradas

### Na história e no mundo
- O Zappy diz "Só o seu quarto ainda tem cor" (`sistemas/abertura.ts:199`) ✔, mas nada desbota a casa.
- O Farol fica aceso com `jornada >= 8` ✔, enquanto a última página diz que ele "se acende" depois da subida.
- A página do Recife é "narrativa nova da fase3-02" ✔ ("encontrei outro jeito de passar") e resolve o
  medo da Íris antes do final; a ficha pede "Mapas sem fim não levam ninguém a lugar nenhum."
- A placa da ponte assina "Íris", que pela proposta só aparece nas páginas.

### Entre regras e código
- Boa-noite promete crescer a horta numa soneca de um minuto ✔.
- Excedente do teto: pedidos perdem, desafios e turnos esperam.
- "Tudo começa desligado" no cartão dos pais ✔, com irmãos ligados.
- Geladeira "conserva" sem efeito; feira citada como fonte de moedas e que só vende.

### Documentos defasados
- `arquipelago-regras.md`: §6.19 diz fim de ano "ainda desativado" (está ativo); §6.15.3 diz que o
  Bento dá a lanterna (N01 passou ao Zappy); §7.3 diz "Só JavaScript" (aceita Python); §9.9 descreve a
  galeria como único gasto e uma tabela de compras que não participa mais.
- `arquipelago-levantamento-2026-10-30.md`: §3 ainda lista N01 e N03 como falta; §8 diz que só
  Carnaval e Junina ligam.
- `arquipelago-estado-atual.md`: dá os defeitos R01 a R03 das visitas como abertos (corrigidos em
  `83a9dfbab`) e as migrações 0015 e 0016 como locais, enquanto a Q01 lista só 0017 e 0018.
- `packages/arquipelago/CLAUDE.md`: ainda cita salvamento V18 e V12 em duas seções (o atual é V20).
- `conteudo-por-posto.md`: fala em 54/60 atividades (o inventário tem 61) e diz que o C01b tirou o
  "e" lógico e a opacidade do Vale, que o quadro 6 ainda usa.
- Comentários antigos dizem que as visitas "só gravam e leem" (`contracts/familia.ts:93`), e o
  comentário da política de segurança do Kids diz que o afrouxamento é só de `/estudio/pro`.

## 7. Pendências para ir ao ar

- Migrações do `arquipelago-api` (0017 e 0018; conferir se 0015 e 0016 já estão no remoto); serviço e
  jogo sobem juntos por causa da V20.
- Variáveis: `ARQUIPELAGO_MODO`, `_PUBLICOS`, `_DESAFIOS`, `_LISTA` (esta não está em
  `.railway/variables.ts`), tokens do Members e do gateway.
- Canal `fotos-do-arquipelago` no hub (sem seed no repositório).
- Importação dos manifestos pelo Admin (passa pela barreira C01a).
- Jornada autenticada nas duas comunidades, celular físico (30 quadros, toque) e permissões em duas
  famílias reais.
- O verificador de móveis falha no `origin/staging` (outra frente).

## 8. O que este levantamento não verificou

Nada foi aberto no navegador nem em aparelho. Não confirmados: quadros por segundo e chamadas de
desenho numa ilha completa no celular, o tempo da travessia contra o carregamento em aparelho lento,
e se o Pinta e o Molda recusam aparência fora do molde ao voltar. (O pet foi conferido depois: só tem
clipes de parado; ver B3.)

## 9. Os achados separados pela arte

Conferido nos arquivos de arte antes de separar (30/10/2026):

- os oito personagens já têm os clipes `acenar`, `andar`, `falar`, `feliz` e `parado`;
- os filhotes de rex e tricerátopo têm `andar`, `parado` e `pular`;
- o item `peixe-com-coco.glb` e os modelos dos pratos já existem;
- o museu já tem `cranio` e `pegada`, e o Vale tem `ninho-1` a `ninho-3`, `vulcao` e `pe-do-vulcao`;
- o `vila-doce-props.glb` tem uma `barraca`, já usada pela feira e pelos balcões;
- as Nuvens não têm nenhum nó de jardim, flor ou lote;
- os bichinhos do quarto (`pet-cachorro`, `pet-gato`) só têm clipes de parado (`corpo`, `cabeca`,
  `rabo`), sem caminhada.

### Lista A: não dependem de arte nova nem de ajuste de arte

**Decisões suas**

| Nº | Achado | O que decidir |
| --- | --- | --- |
| A1 | Bosque e Vila Doce com 0/6 quadros para publicar; nenhum desafio do dia marcado | Publicar o Bosque já; a Vila depois do A15 |
| A2 | A cor da ilha sai só de retomadas em blocos do Explorador em diante | Se o desafio na linguagem do posto passa a dar cor |
| A3 | Python e Pro abrem só por estar na ilha | Qual curso exigir antes |
| A4 | Página do diário do Recife com texto novo | Voltar à frase da ficha ou registrar |
| A5 | Pinta aberto na Faísca (a proposta põe no Construtor) | Registrar como o Molda (N10) ou travar |
| A6 | Moqueca de legumes no lugar do peixe com coco | O modelo `peixe-com-coco` existe: trocar ou registrar |
| A7 | Dino de estimação mora no Vale | Os filhotes já têm `andar` e `pular`: trazer para casa ou registrar |
| A8 | Ninhos do Vale sem perigo | Proteger dos borrões de cinza (efeito procedural, como a chuva) ou registrar |
| A9 | Terceira estrela é coleta, não segredo | Registrar ou trocar |
| A10 | O quarto só se edita na plataforma | Registrar ou fazer o jogo reler e gravar |
| A11 | Admin fora do pacote do jogo; jogo dentro da imagem do serviço, sem canal estável e teste | Registrar ou separar a publicação |

**Código, alto impacto**

| Nº | Achado | O que fazer |
| --- | --- | --- |
| A12 | Lumis não trabalham com o jogo fechado | Rodar ao abrir as viradas de amanhecer que passaram, com teto |
| A13 | Farol aceso antes da subida | `farol.tsx` depender de `farol.concluido` |
| A14 | Três relógios; boa-noite promete crescer a horta numa soneca | Um relógio legível na tela e a fala corrigida; chuva regar também com o jogo fechado |
| A15 | Corrida do entregador sem pulo, gravidade e dificuldade | Refazer os quadros da Vila no conteúdo do Inventor (usa a arte do Jogo 2D) |
| A16 | O salvamento depende do Members para quem tem aparência da galeria | Cache curto ou conferir só as aparências novas |
| A17 | "Só o quarto tem cor", mas a casa, a horta e o píer já têm cor | Desbotar pelo mesmo shader de saturação das ilhas até a primeira chave |

**Código, médio impacto**

| Nº | Achado | O que fazer |
| --- | --- | --- |
| A18 | Luneta com vulto genérico | Mostrar o morador da ilha com o clipe `acenar` e um bicho da ilha |
| A19 | Nico só acena | Conversa, pedidos e o papel de carteiro (a carta já existe como item) |
| A20 | Humor "ótimo" invisível | Mostrar na HUD ou numa fala o que ele dá |
| A21 | Amizade não libera roupas; roupas de festa só como sugestão | Posse de peças de avatar que já existem |
| A22 | Pedido do Bento não pede bolo de fubá; pratos sem destino | Pedidos de pratos e venda na feira (os modelos existem) |
| A23 | Desafio de morador só existe no tipo | Conteúdo e tela (a placa que acende usa as placas que existem) |
| A24 | "Aprenda isso em" só quando falta bloco | Mostrar o curso também no desafio disponível |
| A25 | Prêmio-objeto do extra (receita de brigadeiro) | Ligar receitas ao extra |
| A26 | Medição: tentativas, dicas, acerto na primeira, rotinas que funcionam, reenvios, comprados | Contar e mostrar no Admin |
| A27 | Política de segurança da página do jogo no Kids | Uma política própria com o mínimo do Pro |
| A28 | Nenhuma regra contra sorteio pago | Regra e teste antes dos Lumis raros |
| A29 | Projeto autoral do Farol com critérios do Faísca | Critérios da Lenda, linguagem à escolha |
| A30 | "Usar uma criação minha" sem filtro por molde | Listar as criações da conta que cabem |
| A31 | Geladeira "conserva" sem efeito | Tirar a palavra ou dar um efeito sem castigo |
| A32 | Excedente do teto com três regras | Uma política só |
| A33 | Cartão dos pais conta objetos desde o começo e por aparência aplicada | Da semana e por criação, como a proposta |
| A34 | "Tudo começa desligado", com irmãos ligados | Corrigir o texto |
| A35 | Contrato da plataforma exige versão exata | Aceitar a atual e a anterior |
| A36 | Teste de fronteira não pega aspas duplas nem `require` | Ampliar e incluir o `avatar-quarto` |
| A37 | Ilha cinza sem névoa por cima | Névoa na silhueta cinza (código, sem mexer no modelo) |
| A38 | Borrões não desbotam nada | Desbotar o canto onde estão (shader) |
| A39 | Carta de boas-vindas fora do diário; segredos vazios | Carta como página da sua ilha; páginas extras nos 4 baús atuais (texto) |
| A40 | Peixes do Recife fora do álbum | Os modelos existem; a miniatura sai do pipeline de miniaturas |
| A41 | Atalhos da corrida pelos telhados | Pontos de passagem sobre os telhados atuais; se algum telhado não alcançar, vira o B13 |

**Conteúdo dos desafios**

| Nº | Achado | O que fazer |
| --- | --- | --- |
| A42 | Bosque com quadros do Faísca | Grupos, vidas, derrota, partida que recomeça |
| A43 | Vale (quadros 1, 2 e 6) e Nuvens (quadro 5) com blocos que nenhum curso ensina | Trocar por blocos da trilha ou esperar os cursos |
| A44 | Enunciados ditam a solução; objetivo genérico | Pedido do morador, menos prescritivo |
| A45 | Python do Recife e do Pico copia o tema das missões | Tema próprio da ilha |
| A46 | Pico em blocos com uma fase só | Fases e níveis no último quadro |

**Documentação**

| Nº | Achado |
| --- | --- |
| A47 | Os documentos defasados da seção 6 (regras §6.19, §6.15.3, §7.3, §9.9; levantamento §3 e §8; estado atual; CLAUDE.md do jogo; conteúdo por posto; comentários antigos) |

### Lista B: dependem de arte nova ou de ajuste de arte

| Nº | Achado | Tipo | Decisão antes |
| --- | --- | --- | --- |
| B1 | Silhuetas acima de 3 mil triângulos e em várias peças | Ajuste | Não |
| B2 | Ilhas de posto alto do mesmo tamanho | Ajuste | Sim: seguir a proposta ou registrar |
| B3 | Bichinho do quarto desliza sem andar | Ajuste (clipes) | Não |
| B4 | Coleção de fósseis com uma peça | Arte nova | Não |
| B5 | Fósseis e pegadas sem ícone no álbum | Arte nova (ícones) | Não |
| B6 | Jardim do céu e "fazer a ilha florescer" | Arte nova | Não |
| B7 | Móveis de café e banca de feira para casa | Arte nova | Não |
| B8 | Galeria com um modelo por objeto | Arte nova | Não |
| B9 | Decoração de festa para a casa | Arte nova | Não |
| B10 | Barraca do minijogo na feira e brinquedo do festival | Arte nova | Não |
| B11 | Segredos só pelo planador | Ajuste das ilhas | Não |
| B12 | Lumis raros | Arte nova ou código | Sim: variação de cor no código ou modelo próprio |
| B13 | Atalhos da corrida, se os telhados atuais não alcançarem | Ajuste da Vila | Depende do A41 |
| B14 | Iglu, segundo andar, moldar o terreno, subida do Farol | Já pedidos | Não |
| B15 | Bolsa de carteiro do Nico | Opcional | Sim |
| B16 | Roupas de festa novas | Opcional | Sim: só se as peças atuais não bastarem |

## 10. O que precisa ser criado ou ajustado nas artes

Regras que valem para todos os itens, as mesmas dos pedidos de arte em
`docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`:

- Gerar pelos scripts de `packages/arquipelago/arte/` (Blender sem tela), nunca à mão no GLB, e
  atualizar o `relatorio.json` e o README do kit.
- Não remover nem renomear nós, colisores, clipes e materiais existentes; manter origem, escala e
  rotação usadas pelo carregamento.
- Cores chapadas pelo nome do material, sem textura; o que acende, com emissão.
- Tetos atuais: ilha 40 mil triângulos e 1,5 MB; objeto 10 mil e 450 KB por arquivo; objeto criado
  pela criança 5 mil. Miniaturas pelo `arte/casa/miniaturas.py` (160 px, fundo transparente) e
  ícones pelo `arte/itens` (o mesmo enquadramento e luz).
- Medidas em metros; uma célula da grade do construir é 1 m.
- Cada entrega vem com o aceite (o teste ou verificador que esta sessão roda depois). Um GLB
  exportado não quer dizer que a mecânica esteja ligada: ligar é código.

### B1. Silhuetas das seis ilhas (`mundo/ilhas-do-anel.glb`)

- **Hoje:** Vila 4.440, Bosque 4.062, Nuvens 4.012, Recife 3.064, Vale 3.014 e Pico 1.688
  triângulos; de 9 a 16 partes por ilha (cerca de 80 chamadas de desenho para as seis).
- **Pedido:** cada ilha num nó só, com o nome que já existe (`bosque`, `nuvens`, `pico`, `recife`,
  `vale-dos-dinos`, `vila-doce`), até 3 mil triângulos, um material, cor por vértice. O shader de
  saturação do jogo continua levando do cinza à cor.
- **Preservar:** a forma reconhecível de longe (o vulcão do Vale, o cume do Pico, as nuvens que
  flutuam, a torre de doces da Vila) e a caixa total e a altura de cada ilha, porque o raio de
  carregamento é calculado delas.
- **Aceite:** um teste novo que lê o GLB e reprova silhueta acima de 3 mil triângulos ou com mais
  de uma malha; o verificador de memória das ilhas sem mudança no teto.

### B2. Ilhas de posto alto maiores ou mais altas (decisão antes)

Só se você decidir seguir a proposta ("as ilhas dos postos mais altos são maiores ou mais altas").
Hoje todas têm raio de 13 m. Régua sugerida: Bosque e Vila como estão; Recife e Pico +10%; Vale e
Nuvens +20%. Mudar a ilha completa é grande (colisores, percursos, cais e ponte refeitos e
medidos de novo). A alternativa barata é aumentar só a silhueta (B1) e a altura, que é o que se vê
da porta de casa. Aceite: os testes de colisão e de percurso de cada ilha passando de novo.

### B3. Bichinho do quarto andando (pacote `avatar-quarto` e as duas comunidades)

- **Hoje:** `pet-cachorro.glb` e `pet-gato.glb` só têm clipes de parado (`corpo`, `cabeca`, `rabo`);
  no jogo eles deslizam atrás da criança. O `pet-passaro` já bate as asas.
- **Pedido:** os clipes `andar` (ciclo de 0,6 a 0,8 s, em laço) e `correr` (0,4 s, em laço) nos
  dois, com os mesmos ossos e nomes de juntas. Pés sem escorregar a 1,5 m/s (andar) e 3,5 m/s
  (correr), que é o ritmo do avatar.
- **Preservar:** os clipes atuais e a pose de repouso, porque o quarto da plataforma usa os mesmos
  arquivos; as cópias iguais em `community-kids/public/room3d/items` e
  `community/public/room3d/items` (o teste do catálogo confere).
- **Aceite:** o teste do catálogo do quarto com os clipes novos e o verificador do pet que
  acompanha no navegador.

### B4. Fósseis do Vale (`ilhas/vale-dos-dinos-props.glb` e `arte/itens`)

- **Hoje:** só `cranio-fossil` e `osso`.
- **Pedido:** seis fósseis para escavar e completar o museu, um por nó, cada um com até 1.500
  triângulos e de 0,3 a 0,6 m no maior lado: `fossil-cranio-rex`, `fossil-dente`, `fossil-garra`,
  `fossil-vertebra`, `fossil-chifre-triceratops` e `fossil-ovo`. Tom de osso com uma sombra mais
  escura, sem textura. Os mesmos seis como itens soltos em `arte/itens`, para segurar e expor no
  museu de casa.
- **Aceite:** um nó por fóssil, item com ícone (B5) e o museu de casa mostrando os seis.

### B5. Ícones do álbum (`arte/itens` → `src/assets/icones`)

Ícones de 160 px, no enquadramento e na luz dos atuais, para os seis fósseis do B4 e quatro
pegadas: `pegada-rex`, `pegada-triceratops`, `pegada-passaro` e `pegada-capivara` (a do Bosque).
As pegadas podem partir do desenho do `pegada` do museu, com o contorno de cada bicho. Aceite: o
teste de ícones conferindo um por item do álbum.

### B6. Jardim do céu (Nuvens) e a ilha que floresce (sua ilha)

- **Jardim do céu, em `ilhas/nuvens.glb`:** um terraço plano de pelo menos 6 × 6 m numa das nuvens
  altas, fora dos saltos, da corrida de balão e das constelações. Seis canteiros de 1 × 1 m, com as
  âncoras `canteiro-ceu-1` a `canteiro-ceu-6` no centro de cada um, na altura do chão. Caminho a pé
  com as folgas dos pedidos dos portos (faixa de 1,5 m, degraus de até 0,30 m).
- **Plantas do céu, em `arte/itens`:** três espécies (`flor-de-nuvem`, `estrela-trepadeira` e
  `arco-iris-de-petala`), cada uma em três estágios (`broto`, `meio` e `flor`), até 800 triângulos
  por estágio, com emissão leve na flor. Sementes e ícones como os da horta.
- **A ilha que floresce:** flores e moitas pequenas para o gramado da sua ilha, em três níveis de
  florada (`florada-1` a `florada-3`), até 3 mil triângulos por nível somado, instanciáveis. As
  âncoras de onde podem nascer ficam em `mundo/terreno.glb` (`florada-ponto-1` a `florada-ponto-24`),
  fora da casa, da horta, do píer, do Farol e dos lotes. Quando floresce é código (as Nuvens abrem
  o clima, o cuidado com a horta sobe o nível).
- **Aceite:** teste do terraço plano e livre contra os colisores, canteiros alcançáveis a pé e o
  verificador da sua ilha sem queda de quadros no modo leve.

### B7. Móveis de café e banca de feira para casa (kit `arte/casa`, arquivo novo `casa-cafe.glb`)

Peças do construir no padrão dos móveis da cozinha e da sala: footprint em células de 1 m, origem
no chão, frente para +z, miniatura `movel-<nó>.png`.

| Nó | Footprint | Tamanho aproximado | Teto de triângulos |
| --- | --- | --- | --- |
| `cafe-mesa-redonda` | 1 × 1 | 0,8 × 0,75 × 0,8 m | 1.500 |
| `cafe-cadeira` | 1 × 1 | 0,45 × 0,9 × 0,45 m | 1.200 |
| `cafe-balcao` | 2 × 1 | 1,8 × 1,0 × 0,6 m | 3.000 |
| `cafe-vitrine-de-doces` | 1 × 1 | 0,9 × 1,1 × 0,5 m, com vidro | 2.500 |
| `cafe-lousa-do-cardapio` | parede | 0,8 × 0,6 m | 600 |
| `banca-de-feira` | 2 × 1 | 1,8 × 2,0 × 0,9 m, com toldo listrado | 3.500 |
| `banca-caixote` | 1 × 1 | 0,5 × 0,35 × 0,4 m, empilhável | 600 |

Materiais pelo nome, na paleta da casa e da Vila (o rosa e o creme da Vila Doce). Aceite: o teste
de miniaturas (uma por peça) e o do construir colocando cada peça. Abrir com a Vila Doce é código.

### B8. Variações da galeria (`arte/objetos`, dois modelos novos por objeto)

Para cada um dos nove objetos à venda (geladeira, forno, aquário, lareira, banda, fliperama, museu,
casinha e planta), duas variações além da clássica:

- `<objeto>-retro`: formas arredondadas e cores pastéis;
- `<objeto>-moderno`: linhas retas, uma cor forte e madeira clara.

Cada uma com **a mesma caixa e os mesmos nós funcionais** do modelo clássico (a porta que abre, a
tela do fliperama, a vitrine do museu, a água do aquário), porque o molde do objeto
(`contracts/objetos.ts`) e os clipes dependem deles. Até 10 mil triângulos e 450 KB por arquivo,
miniatura de cada uma e o nome de exibição no relatório. Para a Faísca, uma das duas usa só cores
da paleta do Pinta, como a proposta pede ("prontos da galeria com as cores da paleta"). Preço e
catálogo são código. Aceite: o `build_all.py` do kit conferindo nós, clipes e tetos, e o teste da
galeria com três aparências por objeto.

### B9. Decoração de festa para a casa (kit `arte/casa`, arquivo novo `casa-festas.glb`)

Peças pequenas para pôr em casa durante cada festa, colocadas pelo construir:

| Festa | Peças (nó) |
| --- | --- |
| Junina | `junina-bandeirinhas-parede` (2 m), `junina-lanterna-de-papel`, `junina-fogueira-de-enfeite` |
| Carnaval | `carnaval-serpentina-parede`, `carnaval-mascara-de-parede`, `carnaval-confete-no-chao` |
| Fim de ano | `fim-de-ano-arvore` (1 × 1, com luzes que acendem), `fim-de-ano-guirlanda`, `fim-de-ano-estrela-de-janela` |
| Lanternas (quando houver data) | `lanternas-lanterna-de-chao`, `lanternas-varal-de-luz` |

Até 1.500 triângulos por peça (a árvore até 3 mil), o que acende com emissão e miniatura de cada
uma. Aceite: o teste de miniaturas e o do construir. Aparecer só durante a festa é código.

### B10. Barraca do minijogo e brinquedo do festival

- **Vila Doce, em `ilhas/vila-doce-props.glb`:** `barraca-do-jogo`, de 2 × 1,5 m, na praça da
  feira ao lado das barracas atuais, com uma tela de 0,8 × 0,6 m (nó `tela`, um plano com
  coordenadas de textura de 0 a 1, onde o jogo põe a capa do minijogo) e a âncora `jogar` na
  frente, na altura do chão. Até 4 mil triângulos.
- **Pico, em `ilhas/pico-props.glb`:** `brinquedo-do-festival`, um quiosque de 2 × 2 m perto do
  palco do festival, com a mesma tela `tela` e a âncora `jogar`. Até 4 mil triângulos.
- **Aceite:** a âncora `jogar` alcançável a pé e livre de colisor, e o verificador do fliperama
  abrindo o minijogo pela barraca.

### B11. Segredos para os outros movimentos (ajuste nas ilhas antigas)

> **Atualizado em 30/10/2026:** as medidas de cada movimento e os lugares revistos estão em
> `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md` ("As medidas dos movimentos para os
> segredos"). Montaria e balão só existem nas próprias ilhas, e cipó e mergulho precisam de código
> para funcionar na sua ilha; a tabela abaixo é a versão anterior.

Hoje os quatro baús só se alcançam pelo planador. A proposta quer que cada movimento novo abra um
lugar numa ilha anterior. Pedido: um lugar por movimento, com a âncora `segredo-<movimento>` onde
o baú fica e a geometria mínima para que **só** aquele movimento chegue lá:

| Movimento | Ilha | O que acrescentar |
| --- | --- | --- |
| Cipó (Bosque) | Sua ilha | Um galho alto numa árvore perto das pedras, que só se alcança balançando no cipó, com a âncora do cipó |
| Patins (Vila) | Bosque | Uma rampa longa que só a velocidade dos patins vence até uma plataforma |
| Mergulho (Recife) | Sua ilha | Uma gruta pequena sob o píer, com a entrada abaixo da linha d'água |
| Montaria (Vale) | Recife | Um degrau alto na beira da praia que só o salto da montaria sobe |
| Balão (Nuvens) | Pico | Uma plataforma de gelo acima do cume, fora do alcance do planador |

As alturas e distâncias saem dos números de cada modo (`sistemas/modos/`), que esta sessão entrega
quando o lote for aprovado. Aceite: um teste por segredo provando que o movimento certo alcança e
os outros não. O que tem dentro dos baús (páginas extras, Lumi raro) é código e texto.

### B12. Lumis raros (decisão antes)

Duas formas, à sua escolha:

- **Sem arte nova:** o raro é o mesmo modelo com outra paleta e um brilho a mais, feito no código.
- **Com arte:** uma variação por família (sete), no `arte/lumis`, com o mesmo esqueleto, os mesmos
  clipes e o mesmo teto do Lumi comum, e um detalhe que o diferencie (coroa de luz, cauda dupla).
  Nome `<lumi>-raro` e miniatura em `lumis/miniaturas`.

Em qualquer caso, nunca sorteado em troca de moeda (A28).

### B13. Atalhos da corrida pelos telhados (Vila Doce), só se o A41 não bastar

> **Conferido em 30/10/2026:** os telhados atuais não têm atalho (vãos de mais de 5 m com 1,6 m de
> subida). O A41 depende desta arte; especificação final no documento de pedidos de arte.

Se os telhados atuais não ligarem pontos da corrida por um caminho mais curto, acrescentar em
`ilhas/vila-doce.glb` duas pontes de telhado (tábuas de 0,8 m de largura entre dois telhados) e
uma calha para escorregar, com colisores, sem mudar o percurso atual. Aceite: o teste do percurso
com o tempo do atalho menor que o do caminho principal.

### B14. Já pedidos (sem mudança)

O iglu no Pico, o segundo andar da casa, o chão do lote para moldar o terreno e a subida final pelo
Farol estão especificados em `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`, nas seções do
levantamento de 30/10.

### B15 e B16. Opcionais

- **Bolsa de carteiro do Nico:** acessório no `personagens/nico.glb`, preso ao osso do tronco, até
  600 triângulos, sem mudar os clipes. Só se o papel de carteiro (A19) pedir.
- **Roupas de festa novas:** no pipeline do avatar (`community-kids/scripts/avatar-blender`), uma ou
  duas peças por festa, só se as peças atuais não bastarem para o A21.

### Ordem sugerida para a sessão de arte

1. B3 (pet andando) e B1 (silhuetas): pequenos e aparecem o tempo todo.
2. B10 (barraca e brinquedo) e B7 (café e banca): fecham o ciclo do minijogo e da Vila.
3. B4 e B5 (fósseis e ícones) e B6 (jardim do céu e florada).
4. B8 (galeria), B9 (festas) e B11 (segredos).
5. B2, B12, B13, B15 e B16, depois das decisões.
