# Arquipélago Vagalume: regras do jogo

Levantamento de 27/10/2026, feito lendo o código. Para a visão geral dos pacotes e de como o jogo
chega à criança, veja `docs/arquipelago.md`.

## 1. Como ler este documento

- **Vale o que está no código.** Cada regra traz o arquivo e o nome da constante ou da função onde
  ela mora. Para mudar uma regra, mude ali. Este documento precisa ser atualizado junto.
- Os caminhos começam em `packages/`. Os quatro pacotes do jogo são:
  - `arquipelago-contracts`: os formatos e as regras divididas entre o jogo e o serviço.
  - `arquipelago`: o jogo que roda no navegador.
  - `arquipelago-api`: o serviço do jogo (salvamento, tempo livre, desafios, prêmios).
  - `members`: guarda as moedas, a jornada e os blocos conquistados nos cursos.
- Onde a documentação antiga diz outra coisa, este documento segue o código. A lista dessas
  diferenças fica na última seção.
- Quando algo não existe no código, o texto diz "não encontrado no código".

## 2. O mundo: ilhas, postos e posições, o Farol

### As oito ilhas

Arquivo: `arquipelago-contracts/src/ilhas.ts`, constante `MAPA` (lista `ILHAS`). Este é o único
lugar do mapa ilha → posto.

| Ilha (`id`) | Nome | Posto que abre | Posição | Ângulo no anel |
|---|---|---|---|---|
| `sua-ilha` | Sua ilha | `noob` | 1 | centro |
| `bosque` | Bosque dos Bichos | `coder` | 2 | 20° |
| `vila-doce` | Vila Doce | `hacker` | 3 | -40° |
| `recife` | Recife Coral | `explorer` | 4 | -100° |
| `pico` | Pico Gelado | `elite` | 5 | -160° |
| `vale-dos-dinos` | Vale dos Dinos | `architect` | 6 | 140° |
| `nuvens` | Ilha das Nuvens | `champion` | 7 | 80° |
| `farol` | O Farol | `god` | 8 | fica na sua ilha |

- **Postos em ordem:** `POSTOS_DA_JORNADA` (`noob`, `coder`, `hacker`, `explorer`, `elite`,
  `architect`, `champion`, `god`). Eles espelham `JOURNEY_LEVEL_SLUGS` do core
  (`core/src/journey/catalog.ts`). A posição 1 é a Faísca no Kids. Os nomes que a criança vê
  ficam na plataforma, não no jogo.
- **Total de posições:** `POSICOES_DA_JORNADA = 8`.
- **Regra de abertura:** `ilhaAberta(id, posicao)` diz que a ilha está aberta quando a posição
  da pessoa é maior ou igual à posição da ilha. A sua ilha está sempre aberta (posição 1).
- **Posto desconhecido vira posição 1:** `posicaoDoPostoKids` devolve 1 quando o posto não está
  na lista.
- **O jogo nunca dá posto.** Ele só lê a posição.

### De onde vem a posição

- **Kids:** a posição do posto conquistado na Jornada do Criador
  (`members/src/application/arquipelago/arquipelago-reads.service.ts`, método `jogador`).
- **Adulto:** a posição da etapa da jornada adulta. A Lenda é a posição depois da última etapa.
  Sem jornada configurada, a posição é 1.

### Conferência do mapa contra a jornada publicada

Arquivo: `arquipelago-contracts/src/membros.ts`, função `conferirMapaDasIlhas`. Quem chama é
`arquipelago-api/src/application/mapa-das-ilhas.ts` (`ConferenciaDoMapa`), uma vez, quando o
serviço sobe.

- **Kids:** os postos publicados no Members precisam ser exatamente os do mapa, na mesma ordem.
  Política do Kids não publicada (versão 0) gera o problema `politica-nao-publicada`.
- **Adulto:** a jornada precisa ter 7 etapas (`POSICOES_DA_JORNADA - 1`), uma por ilha antes do
  Farol.
- **Problema encontrado não derruba o serviço.** O resultado vai ao log
  (`arquipelago.mapa_das_ilhas_invalido`) e ao `/readyz`, que continua respondendo 200. As
  situações possíveis são `desligada`, `pendente`, `ok`, `com-problemas` e `indisponivel`.

### No mundo 3D

Arquivo: `arquipelago/src/mundo/medidas.ts`.

- **Distâncias:** as ilhas do anel ficam a `RAIO_DO_ANEL = 82` do centro e têm raio
  `RAIO_DA_ILHA_DO_ANEL = 13`. O gramado da sua ilha vai até 24 (`RAIO_DO_GRAMADO`), a praia até 29
  (`RAIO_DA_PRAIA`) e o raso até 36 (`RAIO_DO_RASO`). Uma unidade é mais ou menos 1 metro.
- **A ponte:** quando a ilha abre, a ponte aparece e a cor escorre pela ilha em 4,5 segundos
  (`DURACAO_DA_CHEGADA_MS = 4500`, em `arquipelago/src/mundo/anel.tsx`). O Zappy avisa: "A ponte
  para o ... ficou pronta". Essa chegada aparece uma vez só. A ilha entra em
  `pontesVistas` no salvamento.
- **Ilha aberta hoje:** chegar perto mostra a ação "Olhar em volta". O Zappy explica que os
  moradores e os bichos chegam numa próxima fase. No Bosque, que já tem a Capi (seção 6.15), essa
  ação não aparece (`ILHAS_VIVAS` em `arquipelago/src/mundo/anel.tsx`).
- **O Farol** fica na sua ilha, ao lado da casa (`FAROL = { x: -12, z: -13 }`). Ele acende quando a
  posição é 8 ou mais (`arquipelago/src/mundo/farol.tsx`, `aceso = jornada >= 8`).
- **Primeira entrada:** a pessoa aparece no quarto (`INICIO`). Enquanto a porta nova não foi
  aberta (`casa.portaNova` falso), o Zappy diz: "Só o seu quarto ainda tem cor. Vamos abrir a
  porta nova e acender o resto?".

## 3. Quem pode jogar

### Quem é quem

Arquivo: `arquipelago-api/src/interfaces/http/identidade.ts`.

| Quem | Como o serviço reconhece | O que pode |
|---|---|---|
| Criança do Kids | sessão de perfil (`x-auth-account-id`), contexto `student` ou sem contexto | joga; o salvamento e o tempo usado são do perfil; o limite é da conta da família |
| Membro adulto | sem perfil e sem contexto do Kids | joga, sem limite de tempo |
| Responsável do Kids | contexto `parent`, na própria conta | não joga; só lê e muda o limite diário da família, e só vê o cartão do tempo livre se alguma criança da conta vê o jogo |
| Equipe | papel `superadmin`, `admin` ou `staff` (`PAPEIS_DA_EQUIPE`) | entra sempre que o jogo está ligado; vê todas as ilhas abertas e todos os blocos |
| Suporte | sessão com `x-auth-impersonator-id` | só olha; nada é gravado |

### As chaves de quem vê o jogo

Arquivo: `arquipelago-api/src/infrastructure/config/env.ts`. Elas mudam sem deploy da plataforma.
"Deploy" aqui quer dizer `NODE_ENV=production`, o que vale para staging e para produção.

| Chave | Valores | Sem valor, no desenvolvimento | Sem valor, em deploy |
|---|---|---|---|
| `ARQUIPELAGO_MODO` | `desligado`, `lista`, `aberto` | `aberto` | `desligado` |
| `ARQUIPELAGO_PUBLICOS` | `kids`, `adulto` (separados por vírgula) | `kids` | `kids` |
| `ARQUIPELAGO_LISTA` | ids de perfil ou de conta, separados por vírgula | vazia | vazia |
| `ARQUIPELAGO_DESAFIOS` | `desligado`, `equipe`, `aberto` | `aberto` | `desligado` |

### A ordem da decisão

Arquivo: `arquipelago-api/src/domain/acesso.ts`, função `decidirAcesso`. A ordem é esta:

1. **Modo `desligado`:** ninguém entra, nem a equipe. O motivo é `desligado`. Pausar o jogo é
   imediato.
2. **Equipe:** entra.
3. **Público fora de `ARQUIPELAGO_PUBLICOS`:** bloqueado, com o motivo `publico-desligado`.
4. **Modo `lista`:** só entra quem tem o id do perfil ou o id da conta da família na lista. Os
   outros recebem o motivo `fora-da-lista`.
5. **Os demais:** entram.

Bloqueado recebe 403 `ACESSO_BLOQUEADO` com o motivo. O jogo mostra a tela de bloqueio.

### O cartão do tempo livre na área dos pais

O cartão "Tempo livre no Arquipélago" só aparece para a família em que pelo menos uma criança vê
o jogo (28/10/2026).

- **Quem decide:** o serviço, com a mesma `decidirAcesso` de quando a criança abre o jogo
  (`algumaCriancaVe`, em `arquipelago-api/src/domain/acesso.ts`). Cada perfil da conta passa pela
  ordem acima como criança do Kids, com o id do perfil e o id da conta.
- **De onde vêm os perfis:** o BFF dos pais (`member-shell/src/routes/arquipelago.ts`) lê a grade de
  perfis da conta no Auth e manda os ids dos perfis prontos em
  `GET /arquipelago/familia/limite?perfis=`. A resposta
  traz `algumaCriancaVe` junto com o limite (`LeituraDoLimiteDaFamiliaSchema`, no contrato). Até 20
  perfis por pedido (`PERFIS_DA_FAMILIA_MAXIMO`).
- **Na prática:**
  - Modo `desligado`: o cartão some para todos.
  - Modo `lista`: aparece só se `kids` está em `ARQUIPELAGO_PUBLICOS` e um dos perfis, ou a
    conta, está em `ARQUIPELAGO_LISTA`.
  - Modo `aberto`: aparece para toda família com pelo menos um perfil, se `kids` está em
    `ARQUIPELAGO_PUBLICOS`.
  - Conta sem perfil: o cartão não aparece.
  - Conta da equipe: os perfis entram com o papel da conta, então o cartão aparece sempre que o
    jogo está ligado, como o jogo para essas crianças.
- **Na dúvida, some:** se a leitura falha (serviço fora, grade de perfis indisponível, resposta sem
  `algumaCriancaVe`), o cartão fica escondido. Ele nunca aparece por engano.
- **Perfil recém-criado:** enquanto entra na jornada (`admissionState` pendente) ele não conta,
  porque a criança ainda não abre esse perfil. Conta assim que fica pronto.
- **O serviço não confere de quem são os ids:** não há leitura da grade de perfis no serviço do
  jogo (nem rota no Members para isso), então ele acredita nos ids que o BFF manda. Quem chamar o
  gateway direto com outros ids só muda o próprio cartão e descobre se aquele id está na lista;
  não ganha acesso ao jogo, que continua decidido pela sessão da criança.
- **Atualização:** o serviço e o app do Kids precisam subir juntos. Com só um deles novo, o cartão
  some para todos até o outro subir (o formato da leitura mudou dos dois lados).

### Suporte somente leitura

Ao olhar o jogo como a pessoa, o suporte:

- Lê o salvamento.
- Não grava salvamento nem limite: recebe 403 `SOMENTE_LEITURA`.
- Não gasta o tempo livre da criança. O serviço só lê o total
  (`ServicoDoJogo.registrarTempo`).
- Confere um desafio e vê o resultado. A tentativa não é guardada, nada é concluído e nenhum
  prêmio é dado (`ServicoDosDesafios.verificar`).
- Não dispara a cobrança de prêmios pendentes e não marca a festa do prêmio como vista.

A escrita no Admin do jogo também fica bloqueada numa sessão de suporte (`lerEquipe`,
`podeEscrever`).

## 4. Tempo livre do Kids

### Os números

Arquivo: `arquipelago-contracts/src/limites.ts`.

| Regra | Valor | Nome |
|---|---|---|
| Limite padrão por dia | 30 minutos | `LIMITE_DIARIO_PADRAO_MINUTOS` |
| Mínimo que os pais escolhem | 10 minutos | `LIMITE_DIARIO_MINIMO_MINUTOS` |
| Máximo que os pais escolhem | 240 minutos | `LIMITE_DIARIO_MAXIMO_MINUTOS` |
| Passo | 5 minutos | `LIMITE_DIARIO_PASSO_MINUTOS` |

- **Arredondamento:** `normalizarLimiteDiario` arredonda o que os pais escolhem para o múltiplo de
  5 mais próximo e prende entre 10 e 240. Um valor inválido vira 30.
- **Adulto:** não tem limite. O limite vem como `null`.
- **O limite é da família, o tempo é de cada criança.** O limite fica na conta do responsável
  (`contaId`). O tempo usado é contado por perfil. Com o limite de 30 minutos, cada criança da
  família tem 30 minutos.
- **Quem muda o limite:** só o responsável, pelas rotas `GET` e `PUT /arquipelago/familia/limite`.
  Sem nada gravado, vale o padrão de 30.

### O dia de São Paulo

`diaDeSaoPaulo` (`limites.ts`) devolve o dia civil no fuso `America/Sao_Paulo`. O contador zera à
meia-noite de São Paulo.

### Quando o tempo conta

Arquivo: `arquipelago/src/estado/relogios.tsx`. Um segundo conta quando tudo isto vale ao mesmo
tempo:

- a aba do jogo está visível;
- o menu não está aberto;
- nenhuma ferramenta da plataforma (Pinta, Molda, Estúdio) está aberta por cima do jogo;
- o tempo do dia ainda não acabou;
- o jogo não está pausado por erro do tempo.

### Como o tempo chega ao serviço

1. **O serviço conta o tempo de uma sessão do perfil.** O jogo pede uma concessão curta em
   `POST /tempo/sessao`: `iniciar`, `pulsar` e `pausar` carregam um id de sessão e sequência.
2. **A concessão dura até 20 segundos**, limitada também pelo saldo diário. O cliente pulsa a
   cada 10 segundos e pede pausa quando a aba some, o menu abre ou uma ferramenta cobre o jogo.
   Se a página desaparecer sem avisar, a contagem para no vencimento, sem depender do unload.
3. **Quem mede o intervalo e o dia é o servidor.** No navegador, `performance.now()` verifica
   apenas a validade da concessão, descontando a latência; alterar a hora do aparelho não a estende.
4. **Resposta perdida não gera outra cobrança.** A tentativa repete o mesmo comando. O jogo pausa
   quando não consegue confirmar a sessão e oferece tentar novamente.
5. **Transição das versões antigas:** somente lotes já presentes no IndexedDB são entregues por
   `fila-tempo.ts` a `/tempo/recuperar`. O cliente atual não cria lotes novos; `/tempo` retorna 410.

### O que o serviço faz com o tempo

Arquivos: `arquipelago-api/src/application/servico-do-jogo.ts` (`comandarSessaoTempo`),
`domain/sessao-de-tempo.ts` e `infrastructure/persistence/drizzle/repositorio-sessoes-tempo.ts`.

- **Concorrência:** bloqueia o perfil e grava sessão e parcelas na mesma transação. Uma nova
  sessão substitui a anterior; pulsos simultâneos e comandos repetidos não duplicam intervalos.
- **Virada do dia:** divide o intervalo pelo dia de São Paulo; não aceita um dia escolhido pelo cliente.
- **Limite atualizado:** cada pulso considera o limite atual da família; o vencimento nunca
  concede tempo além do saldo diário. Esgotado o saldo, a resposta tem situação `limite`.
- **Recuperação legada:** lotes de 1 a 120 segundos mantêm idempotência e respeitam o teto de
  24 horas por dia. Uma data futura de aparelho adiantado é contabilizada no dia do recebimento;
  a data original continua identificando o lote. Essa rota não é o contador da sessão atual.

### No jogo

- **Abrir com o tempo esgotado** leva direto à tela de descanso (`arquipelago/src/jogo.tsx`,
  `carregar`).
- **O tempo acaba durante o jogo:** a tela de descanso aparece por cima e oferece voltar para a
  plataforma.
- **O que falta:** a pílula "Hoje: N min" mostra os minutos restantes, arredondados para cima
  (`arquipelago/src/sistemas/tempo-livre.ts`, `minutosRestantes`).
- O tempo livre é um controle dos pais, aplicado pela concessão do serviço. A comunidade adulta
  e as consultas de suporte não gastam tempo de criança.

## 5. Salvamento

### O formato

Arquivo: `arquipelago-contracts/src/salvamento.ts`.

- **Versão:** `VERSAO_SALVAMENTO = 4` (`SalvamentoV4Schema`, estrito: campo desconhecido é
  recusado). A V2 (27/10/2026) é a V1 mais o melhor resultado de cada percurso. A V3 (28/10/2026) é
  a V2 mais a Capi e os bichos do Bosque. A V4 (28/10/2026) é a V3 mais o modo construção e os
  projetos azuis.
- **O que guarda:**
  - as necessidades (fome, energia, diversão, cada uma de 0 a 100);
  - a horta (até 24 canteiros);
  - o inventário (item → quantidade, de 0 a 999; id do item com até 40 caracteres);
  - a posição do personagem;
  - as pontes já vistas;
  - se a porta nova da casa foi aberta;
  - o melhor de cada percurso (`percursos`): as três estrelas, cada uma guardada à parte, e o
    melhor tempo em milissegundos (de 0 a 1 hora). Hoje o único percurso é `bosque-copas`
    (`PERCURSOS`);
  - a Capi (`moradores.capi`): a amizade (de 0 a 500, `AMIZADE_MAXIMA`), o último dia de conversa e
    de presente e o pedido do dia (o dia, qual é e se já foi entregue). Os dias são `AAAA-MM-DD`
    no horário do aparelho;
  - os bichos do Bosque (`bichos`): os achados (cada um no máximo uma vez, de `BICHOS_DO_BOSQUE`:
    cachorro, gato, coelho e porquinho) e o adotado, com nome (de 1 a 16 letras), fase (filhote
    ou adulto), fome, limpeza e carinho (de 0 a 100), os dias bem cuidado e o truque (sessões, o
    último dia de sessão e se já aprendeu);
  - a construção (`construcao`): a obra da casa (`casa`, `null` enquanto a casa é a de antes, do
    `casa.glb`) e as cabanas (`cabanas`, hoje só a do Bosque, `ILHAS_COM_CABANA`). Cada obra
    (`ObraSchema`) guarda as paredes e as cercas em trechos retos na linha da grade (o ponto de
    saída, o eixo e quantas células), as portas e janelas (`TIPOS_DE_ABERTURA`, pelo ponto em que
    começam), o piso de cada cômodo (por uma célula de dentro dele: tábua, ladrilho ou azulejo), os
    objetos com função (a célula e o giro, cada objeto uma vez só), o caminho do quintal (pedra ou
    grama, por célula) e os canteiros do quintal. Coordenadas inteiras de -60 a 60. Tetos por
    obra: 200 trechos de parede, 60 aberturas, 30 pisos, 120 trechos de cerca, 240 células de
    caminho e 18 canteiros (com a casa e a cabana cheias, o salvamento ainda cabe em 64 KB, há
    teste);
  - os projetos azuis ganhos (`projetos`, por objeto de `OBJETOS_DA_CASA`): quando foi ganho, a
    aparência (de onde veio e o id, ou `null` enquanto é holograma) e, na geladeira, o que está
    guardado (alimento → quantidade, no máximo 12 no total, `GELADEIRA_GUARDA`).
- **Teto:** `SALVAMENTO_MAX_BYTES = 64 * 1024` (64 KB do documento em JSON). O serviço recusa acima
  disso com 413 `SALVAMENTO_GRANDE_DEMAIS`. O corpo inteiro de uma chamada do jogo vai até 96 KB
  (`MAX_REQUEST_BODY_BYTES`, em `env.ts`).
- **Mudar o formato:** crie a próxima versão e escreva a migração da anterior em
  `migrarSalvamento`. Assim ninguém perde o progresso.
- **A V1, a V2 e a V3 continuam valendo:** um salvamento antigo é lido já migrado (`migrarDaV1`:
  tudo igual e nenhum percurso corrido; `migrarDaV2`: tudo igual, a Capi com amizade 0, nenhum
  bicho achado e nenhum adotado; `migrarDaV3`: tudo igual, a casa de antes, nenhuma cabana e
  nenhum projeto azul).
- **Aba aberta antes da atualização:** ela ainda grava a versão antiga. O serviço aceita e guarda
  já migrado, mas responde na versão atual, que a aba antiga não lê. Só a primeira gravação dela fica; as seguintes
  falham (e voltam para a fila a cada 20 s) até a página recarregar. Isso vale para qualquer
  mudança de formato; resolver de vez pede que a plataforma recarregue o jogo quando o manifesto
  muda.

### O salvamento inicial

Função `criarSalvamentoInicial`:

| Campo | Valor inicial |
|---|---|
| Fome | 80 |
| Energia | 100 |
| Diversão | 70 |
| Canteiros | 6 vazios (`c1` a `c6`) |
| Inventário | 3 sementes de alface, 2 de tomate, 1 de milho |
| Posição | nenhuma (começa no quarto) |
| Pontes vistas | nenhuma |
| Porta nova | fechada |
| Percursos | nenhum corrido |

### Revisão e conflito

Arquivos: `arquipelago/src/sistemas/salvar.ts` (`criarFilaDeSalvamento`),
`arquipelago-api/src/application/servico-do-jogo.ts` (`gravarSalvamento`) e o repositório.

- **Quando o jogo grava:** cada alteração agenda uma transação no IndexedDB por público e perfil.
  O envio ao servidor junta alterações a cada 20 segundos (`intervaloMs`) e também é tentado quando
  a aba some. Fechar a página não depende de uma última requisição: o diário confirmado no aparelho
  é recuperado na próxima abertura. Uma interrupção antes do commit local ainda pode perder essa
  última transação; o navegador também permite apagar seus dados locais.
- **A trava da revisão:** cada gravação manda a revisão que o jogo conhece (`revisaoBase`). A
  revisão 0 quer dizer que nada foi guardado ainda. O banco grava numa instrução só. Se outro
  aparelho gravou antes, a revisão não bate e o serviço responde 409 `SALVAMENTO_DESATUALIZADO`
  com o que está guardado.
- **Conflito não apaga mudanças silenciosamente.** A fila compara a base, a cópia local mais nova
  e a remota. Progresso cumulativo pode ser conciliado; horta, inventário, necessidades, Capi e
  bicho são tratados juntos para não duplicar consumo/recompensas. Divergência nesse grupo pausa
  o jogo e pede escolher a cópia local ou online, com opção de baixar a cópia local antes da escolha.
- **Resposta perdida:** o diário preserva o snapshot enviado. Antes de substituir um envio incerto,
  a fila consulta o servidor; alterações feitas durante a requisição continuam pendentes.
- **Duas abas do mesmo perfil:** uma trava do navegador permite apenas uma montagem gravadora.
  Fechar a aba libera a trava. Outro aparelho continua protegido pela revisão do servidor.
- **Falha de armazenamento local:** pausa as mutações e oferece tentar novamente. Uma falha de
  rede conserva o diário confirmado localmente e tenta o envio posteriormente.
- **Suporte:** não abre diário gravador nem altera o salvamento da pessoa consultada.
- **Jogo novo:** com a revisão 0, o salvamento inicial entra na fila logo na abertura.
- **Salvamento guardado que não passa no formato atual:** o serviço responde 409
  `SALVAMENTO_ILEGIVEL` e nunca devolve "vazio". Isso impede o jogo de criar um salvamento novo
  por cima. O jogo mostra a tela de erro.
- **Revisão máxima:** `REVISAO_MAXIMA = 2_147_483_647` (`api.ts`), o limite da coluna do banco.
- **A posição do personagem** é guardada a cada 15 segundos de jogo ativo, se ele andou mais de 1
  unidade (`relogios.tsx`).

## 6. Sistemas do jogo

As regras puras ficam em `arquipelago/src/sistemas/`. Os números de cena ficam em
`arquipelago/src/mundo/medidas.ts` e nos componentes citados.

### 6.1 Dia e noite

Arquivo: `sistemas/tempo-do-dia.ts`.

- **Duração:** um dia do jogo dura 16 minutos de verdade (`DURACAO_DO_DIA_MS = 16 * 60 * 1000`).
- **Dia e noite:** a parte clara é 75% do dia (`PARTE_CLARA = 0.75`). São 12 minutos de dia (6h às
  18h no relógio do jogo) e 4 minutos de noite (18h às 6h).
- **Contagem dos dias:** o relógio parte do momento em que o salvamento foi criado (`criadoEm`).
  O "Dia 1" é o primeiro. Ele não precisa ser salvo e é igual em qualquer aparelho.
- **A luz** (`luzDoSol`): 0,25 no nascer e no pôr do sol, 1 ao meio-dia. Na noite, escurece nos
  primeiros 15% e clareia nos últimos 15%. No meio da noite, a luz é 0.
- **O relógio** aparece no topo da tela como "Dia N · HH:MM", com sol ou lua.

### 6.2 Necessidades

Arquivos: `sistemas/necessidades.ts` e `estado/relogios.tsx`.

- **Quanto cai por minuto de jogo ativo** (`QUEDA_POR_MINUTO`):
  - fome: 2;
  - energia: 1,2 (o dobro correndo);
  - diversão: 1.
- **Atualização:** a cada 2 segundos de jogo ativo. As regras de "ativo" são as do tempo livre
  (seção 4).
- **Faixa:** cada necessidade fica entre 0 e 100.
- **Cochilo:** com a energia em 0, o personagem volta para casa e a energia vai para 60. O Zappy
  diz: "Você cansou e tirou um cochilo em casa. Nada se perdeu." Nada é castigado.
- **Cama:** dormir na cama (ou no beliche) do quarto devolve a energia toda, 100 (`dormir`). Só
  funciona se a pessoa tiver uma cama ou um beliche no quarto. O raio da ação é 2,6
  (`mundo/casa.tsx`).
- **Comer:** soma o valor da comida a cada necessidade (`comer`). A tabela está em 6.4.
- **Humor** (`humor`):
  - `cansado`: energia ou fome abaixo de 15;
  - `otimo`: fome, energia e diversão acima de 60;
  - `bem`: o resto.
- **Ritmo:** o humor muda a velocidade de andar (`ritmo`). Ótimo é 1,1 vezes, bem é 1 vez, cansado
  é 0,8 vez.

### 6.3 Horta

Arquivos: `sistemas/horta.ts` e `mundo/horta.tsx`.

- **Os canteiros:** 6 no começo, numa grade de 3 colunas por 2 linhas (`HORTA` em `medidas.ts`).
- **As sementes:** `SEMENTES` = alface, tomate, milho.
- **O ciclo:** plantar, regar, esperar, colher. A planta só cresce depois de regada.
- **Tempo para crescer, contado da rega** (`CRESCIMENTO_MS`). O código avisa que estes tempos são
  curtos de propósito, para dar para ver crescer numa sessão:
  - alface: 3 minutos;
  - tomate: 5 minutos;
  - milho: 8 minutos.
- **Estágios** (`estagio`):
  - `vazio`;
  - `semente`: plantada e não regada;
  - `brotando`: menos de 40% do tempo;
  - `crescendo`: o resto do tempo;
  - `maduro`: 100%.
- **A horta cresce no tempo de verdade,** também com o jogo fechado.
- **Colheita** (`COLHEITA`): alface 2, tomate 3, milho 2. Cada colheita devolve também 1 semente
  da mesma planta, então a horta nunca acaba.
- **Qual semente vai no canteiro:** o canteiro vazio planta a primeira semente que a pessoa tiver,
  nesta ordem: alface, tomate, milho (`ORDEM` em `mundo/horta.tsx`).

### 6.4 Itens

Arquivo: `sistemas/itens.ts`, constante `ITENS`.

| Item | Comer repõe |
|---|---|
| Semente de alface, de tomate, de milho | não é comida |
| Alface | fome +8 |
| Tomate | fome +10 |
| Milho | fome +10 |
| Salada da horta | fome +40, energia +5 |
| Pipoca | fome +15, diversão +25 |

- **Teto por item:** 999 (`adicionar`). Também é o teto do salvamento.
- **Item desconhecido** (de uma versão futura) é ignorado pelo jogo.
- **Na mochila,** a pessoa come um item clicando nele.

### 6.5 Receitas

Arquivos: `sistemas/receitas.ts` (`RECEITAS`) e `mundo/bancada.tsx`.

| Receita | Precisa | Faz |
|---|---|---|
| Salada da horta | 1 alface e 1 tomate | 1 salada |
| Pipoca | 1 milho | 2 pipocas |

- **A bancada** oferece a primeira receita da lista que dá para fazer (`receitaPossivel`).
- **Sem ingrediente,** o Zappy lista as receitas e o que cada uma precisa.
- O raio da ação é 2,2.

### 6.6 O personagem

Arquivo: `arquipelago/src/personagem/personagem.tsx`.

| Regra | Valor | Nome |
|---|---|---|
| Andar | 2,2 por segundo | `CORPO.andar` (`sistemas/corpo.ts`) |
| Correr | 4,6 por segundo | `CORPO.correr` |
| Nadar | 2,6 por segundo | `CORPO.nadar` |
| Pulo | 8,5 para cima (sobe 1,5 m) | `CORPO.pulo` |
| Degrau que sobe andando | 0,45 (de frente, numa parede reta, uns 0,43) | `CORPO.degrau` |
| Rampa que sobe / escorrega | até 52° / acima de 60° | `CORPO.sobeAte`, `CORPO.escorregaAcimaDe` |
| Gravidade | 24 para baixo | `GRAVIDADE` (`mundo/medidas.ts`) |
| Aceleração no chão / freio | 18 / 24 por segundo² | `PERFIS.chao` (`sistemas/movimento.ts`) |
| Aceleração no ar / freio | 7 / 3 por segundo² | `PERFIS.ar` |
| Aceleração na água / freio | 6 / 4 por segundo² | `PERFIS.agua` |
| Coyote time (pular depois de sair da beirada) | 0,12 s | `TOLERANCIA_DO_PULO.coyote` |
| Jump buffer (o toque antes de pousar vale) | 0,12 s | `TOLERANCIA_DO_PULO.buffer` |

A velocidade final é multiplicada pelo ritmo do humor (6.2).

- **Com peso** (controlador universal, 28/10/2026): a velocidade vai até a pedida em vez de pular
  para ela. Andar chega em 0,12 s, correr em 0,26 s; parar da corrida leva 0,19 s; pedir para trás
  freia antes de ir. Os números iniciais dos levantamentos da dona (andar 4,2, correr 6,5,
  gravidade 20) não foram adotados: as ilhas, as pontes e o percurso nas copas foram medidos com
  as velocidades acima, e mudar exigiria medir tudo de novo.
- **Um toque, um pulo**: segurar o pulo não fica pulando a cada aterrissagem; o toque até 0,12 s
  antes de pousar vale ao pousar, e logo depois de sair da beirada ainda dá para pular.
- **Física em passos fixos** de 1/60 s (`PASSO_DA_FISICA`), com o desenho suavizado entre passos: o
  mesmo movimento a 30, 60 ou 144 quadros por segundo.
- **Até onde o pulo chega** (`alcanceDoPulo`, `alcanceMaximoDoPulo`, `beiradaMaximaDoPulo` em
  `sistemas/corpo.ts`): sem ajuda, 1,5 m de altura e 1,56 m de vão andando ou 3,26 m correndo. O pé
  redondo pega a borda antes do meio do corpo chegar (um raio de cada lado): com o humor ótimo, o
  vão mais largo fica em 2,4 m andando e 4,3 m correndo. O degrau automático só vale pisando (até
  28/10/2026 ele também valia no ar, uma ajuda escondida que levava a beirada a uns 1,95 m): no ar,
  quem chega perto de uma quina marcada a agarra (abaixo), e a beirada mais alta passa a uns 3,65 m
  (`beiradaMaximaAgarrando`). Para desenhar vãos e beiradas: abaixo do alcance sem ajuda passa
  sempre; acima do máximo, nunca; beirada entre 1,5 e 3,65 m só com a quina marcada para agarrar.
- **Agarrar a borda** (`sistemas/modos/borda.ts`): no ar, caindo (ou quase no alto do pulo), com as
  mãos (0,9 m acima do meio do corpo) a até 0,35 m acima ou abaixo de uma quina marcada e até 0,6 m
  dela do lado de fora (0,35 mais 0,25 de assistência), longe 0,2 m das pontas, o corpo pendura
  rente à parede. Frente (para a parede) sobe: do pendurado até de pé em cima, 0,6 m para dentro da
  quina, em 0,5 s. Os lados andam pela quina a 0,8 m/s; trás ou usar soltam (e a mesma quina só pega
  de novo depois de 0,5 s); pular sai para longe da parede. No Bosque, a pedra de agarrar (2 × 2 m,
  2,1 m de altura) fica entre os deques da T3 e da T4; os deques não têm quina de agarrar (o
  guarda-corpo segura quem sobe).
- **Equilíbrio no tronco caído** (`sistemas/modos/equilibrio.ts`): andando ao longo do tampo de um
  tronco estreito, o corpo fica preso ao eixo e anda a 1,6 m/s; pedir o lado inclina o corpo (até
  0,25) e a inclinação volta sozinha em 0,3 s. Sai nas pontas (seguindo o passo), pulando, ou
  pedindo o lado com força por 0,8 s (desce para aquele lado). Ninguém cai por erro pequeno. Os
  braços abrem (animação Equilibrar). No Bosque, o tronco caído fica ao lado da trilha do lago.
- **Escada reta** (`sistemas/modos/escada.ts`): andando contra os degraus embaixo (0,15 s) ou para a
  escada, do deque, em cima, o corpo pega nela; frente e trás sobem e descem a 1,5 m/s. No alto sai
  sozinho para o deque; embaixo solta; pular solta para trás. No Bosque, a escada vai do chão ao
  deque do escorregador.
- **Escorregador** (`sistemas/modos/escorregar.ts`): pisar na pista senta; a velocidade cresce com a
  inclinação (a gravidade do jogo e o atrito 0,3 do plástico), até 5,5 m/s, e nunca para no meio;
  pedir o lado mexe um pouco dentro da pista. No fim, continua correndo um pouco. A câmera fica
  atrás, olhando à frente (perfil `escorregar`).
- **Sala de testes** (`bun run dev`, `/movimento`; `playground/sala-de-movimento.ts`): pista com
  faixas a cada 2 m, degraus de 0,2, 0,35, 0,4 e 0,5, rampas de 25°, 42° e 55°, beiradas de 1,2,
  2,6 e 4,1 m (a quina da frente marcada para agarrar), plataformas com vãos de 1,2, 2,8 e 4,8 m, parede, árvore e corredor para a câmera e um
  laguinho com rampa de entrada. Cada estação tem um que passa e um que não passa, medidos pelos
  números do corpo (`tests/sala-de-movimento.test.ts`), e o painel mostra a velocidade, o modo, o
  último pulo, o tranco da câmera e os quadros por segundo. Conferido no navegador em 28/10/2026:
  2,44 m/s andando e 5,10 correndo (com o humor ótimo), degraus e rampas como acima, beirada de
  1,9 m alcançada e de 2,4 não (com o degrau no ar, antes da borda), vão de 1,2 andando, 2,9 só
  correndo e 5 m nunca, nado no meio do laguinho e saída andando pela rampa. Com a borda: a beirada
  de 1,2 no pulo, a de 2,6 pulando, agarrando e subindo, a de 4,1 nunca.

- **No ar com embalo** (depois de soltar um cipó ou pular do tronco): a velocidade do embalo fica
  até pisar ou cair no mar (a água freia), e a direção pedida só corrige 45% do normal
  (`CONTROLE_NO_AR = 0.45`).
- **Controles** (os mesmos em todo o jogo, `controles/`): teclado (WASD ou setas, Shift corre,
  espaço pula, E usa, C põe a câmera nas costas, + e - aproximam), toque (joystick que nasce onde o
  polegar pousa na metade esquerda de baixo, botões Pular e Usar, arrastar gira a câmera, pinça
  aproxima) e controle físico (analógico esquerdo anda e, todo empurrado, corre; direito gira a
  câmera a 2,6 rad/s e inclina a 1,4 rad/s; botão de baixo pula; o da direita usa; gatilho direito
  corre; clique no analógico direito recentraliza; Start faz o que o Esc faz; zona morta 0,15).
- **Conforto da câmera** (no menu, `sistemas/conforto.ts`, guardado no aparelho, o mesmo para Kids
  e Adultos): rapidez ao girar (devagar 0,6, normal 1, rápida 1,5 vezes), distância de partida
  (perto 6, normal 9, longe 13 m; a roda e a pinça seguem valendo), inverter para cima e para
  baixo, a câmera voltar sozinha para as costas (desligada por padrão: começa depois de 2,5 s
  andando sem mexer nela) e menos movimento da câmera (soma com o pedido do aparelho). O jogo não
  tem tremor de câmera.
- **Pular** conta cada toque (`controle.pulos`): o toque rápido que desce e sobe no mesmo quadro
  também solta o cipó e pula do tronco, e no chão cada toque é um pulo (`passoDoPulo`).
- **Braços:** no cipó e no tronco o avatar segura com os braços para cima
  (`personagem/bracos.ts`, `RUMOS`). As poses da plataforma não têm essa; o jogo aponta os ossos
  depois da pose.
- **As medidas do corpo** (raio 0,35, do centro aos pés 0,9) e as velocidades de andar e correr
  moram em `sistemas/corpo.ts` (`CORPO`), divididas com o cipó, a escalada e os testes.

As velocidades foram casadas com o corpo do avatar em 28/10/2026: ele é chibi (perna de 0,5 m
num corpo de 2,2 m), e com os antigos 4,2 e 7,2 as pernas teriam de girar rápido demais ou o pé
patinaria. Correndo, ele vai um pouco mais rápido que o "andar" antigo; o pulo correndo alcança
3,3 m sem ajuda (o pulo andando antigo alcançava 3,0 m).

**As animações** (`arquipelago/src/sistemas/locomocao.ts`, clipes em
`src/assets/avatar/locomocao.glb`, gerados por `arte/avatar/locomocao.py`):

| Animação | Quando | Medida |
|---|---|---|
| Parado | abaixo de 0,15 m/s (sai do parado até 0,9 m/s) | a pose "Idle" da plataforma |
| Andar | ciclo de 0,43 s, passada de 0,62 m (1,43 m/s no ritmo do clipe) | `CICLO_DE_ANDAR` |
| Correr | ciclo de 0,37 s, passada de 1,3 m (3,55 m/s no ritmo do clipe) | `CICLO_DE_CORRER` |
| Pulo | sai do chão subindo; começa no empurrão e fica encolhido até descer | `PULO_COMECA_EM` |
| Queda | descendo, ou mais de 0,16 s no ar sem ter pulado | `AR_SEM_QUEDA` |
| Aterrissagem | ao tocar o chão depois de mais de 0,3 s no ar; dura 0,33 s, mais leve correndo | `AR_PARA_ATERRISSAR` |
| Nado | na água (o corpo deita para a frente) | `TRANSICAO.agua` |
| Pendurado | segurando o cipó: as pernas soltas vão e voltam, uma contra a outra, num laço de 1,6 s; os braços são mirados na corda por cima do clipe | `DURACAO_DO_PENDURADO` |
| Escalar | agarrado no tronco: o pé apoiado desce em relação ao corpo, o outro sai da casca e sobe, e a mão do lado oposto alcança no alto; ciclo de 0,8 s para 0,5 m de subida, tocado pela velocidade de verdade (parado no tronco, o clipe para) | `CICLO_DE_ESCALAR` |

- Entre parado, andar e correr, as animações se misturam pela velocidade de verdade (a
  distância andada, não a tecla). Andar e correr são tocados na mesma fase, e a fase anda pela
  distância dividida pela passada, por isso o pé no chão não patina.
- Acima de 3,4 ciclos por segundo (`CICLOS_POR_SEGUNDO_MAXIMO`), as pernas não aceleram mais;
  a passada estica.
- Transições: 0,18 s no chão, 0,12 s no ar e 0,3 s na água.
- O desenho desce 6 cm (`FOLGA_DO_CONTROLADOR`), a folga que o controlador do Rapier deixa entre
  a cápsula e o chão. Sem isso, o avatar anda flutuando.
- Nas curvas o avatar inclina para dentro, no máximo 0,14 rad (`INCLINACAO_NA_CURVA`,
  `INCLINACAO_MAXIMA`, em `personagem.tsx`).
- Para conferir os clipes fora do jogo: `bun run dev` e abra `/animacoes?v=2.2` (há também
  `?varrer=1`, `?pulo=1`, `?nado=1`, `?cipo=1` e `?escalar=1`). O chão quadriculado corre na
  velocidade pedida.

**Onde o personagem aparece** (`arquipelago/src/sistemas/ponto-de-partida.ts`). Cada criança
arruma o quarto de um jeito, então o ponto de começo pode cair em cima de um móvel:

- jogo novo: o ponto de sempre (`INICIO`, na frente do quarto);
- posição salva dentro de casa: o lugar onde ela parou;
- se esse ponto estiver ocupado, o jogo procura o lugar livre mais perto, de 25 em 25 cm
  (`PASSO_DA_PROCURA`), com 50 cm de folga dos móveis e das paredes (`FOLGA_DO_CORPO`);
- só contam os móveis de chão: peças de parede e peças em cima de outra não ocupam o chão;
- quarto todo tomado: o personagem aparece do lado de fora da porta;
- se a criança mudar o quarto com o jogo aberto e um móvel cair em cima dela, o personagem vai
  para o lugar livre mais perto.

### 6.7 O Zappy

Arquivo: `sistemas/zappy.ts`. O Zappy voa ao lado do personagem.

| Regra | Valor | Nome |
|---|---|---|
| Distância para a direita | 0,75 | `LADO_DO_ZAPPY` |
| Distância para trás | 0,35 | `ATRAS_DO_ZAPPY` |
| Altura acima do centro do corpo | 1,3 | `ALTURA_DO_ZAPPY` |
| Abaixo desta velocidade, ela conta como parada | 0,3 por segundo | `VELOCIDADE_DE_ANDAR` |
| Tempo parada antes de ele virar para ela | 0,6 s | `ESPERA_PARA_OLHAR_PARA_ELA` |
| Primeira espiada na câmera | 3,5 s parada | `PRIMEIRA_ESPIADA` |
| Espiada de novo a cada | 7 s | `PERIODO_DA_ESPIADA` |
| Duração da espiada | 1,4 s | `DURACAO_DA_ESPIADA` |
| Rapidez para dar a volta numa virada | 3,5 | `RAPIDEZ_EM_VOLTA` |
| Inclinação nas curvas | 0,16 por giro, até 0,5 | `GANHO_DA_INCLINACAO`, `INCLINACAO_MAXIMA` |
| Inclinação para a frente andando | até 0,22 | `MERGULHO_MAXIMO` |

- **O lugar dele** (`lugarAoLado`): à direita e um pouco atrás de onde ela olha. Numa virada, ele
  dá a volta pelo lado curto e não atravessa o corpo (`suavizarAngulo`).
- **Para onde ele olha** (`paraOndeOlhar`): andando, para onde ela vai. Parada, para ela, com uma
  espiada na câmera de tempos em tempos.
- **As falas do Zappy** aparecem na tela por 7 segundos (`Dica`, em `interface/hud.tsx`).

### 6.8 Câmera

Arquivos: `sistemas/camera.ts`, `personagem/camera.tsx` e `mundo/medidas.ts`.

- **Controle da pessoa:**
  - arrastar gira em volta do personagem;
  - a inclinação fica entre 0,12 e 1,25;
  - a roda do mouse aproxima ou afasta, de 4 a 18;
  - a distância inicial é 9.
- **Perfis** (controlador universal, parte 5, `sistemas/perfis-de-camera.ts`): cada atividade
  ajusta o ângulo e a distância que a pessoa deixou, e a câmera passa de um perfil para o outro em
  0,5 s (`TROCA_DE_PERFIL`), nunca de um quadro para o outro. Vale um de cada vez, nesta ordem:

  | Perfil | Quando | O que muda |
  |---|---|---|
  | Conversa | painel de conversa aberto (a Capi) | ângulo 0,2 e no máximo 5 m (mais abaixo) |
  | Casa | dentro de casa | ângulo de pelo menos 0,95 e no máximo 8 m |
  | Escorregador | descendo o escorregador | ângulo de pelo menos 0,45, pelo menos 7 m, o olhar 0,35 s à frente, e a câmera vira para as costas |
  | Percurso | corrida do percurso em andamento | ângulo de pelo menos 0,6, pelo menos 11 m, e o olhar 0,4 s à frente de quem corre (até 2 m) |
  | Exploração | o resto | nada: vale o que a pessoa escolheu |

  O "lá no alto" e a colisão continuam valendo por cima de todos (no deque, a câmera do percurso
  também desce e chega perto, por baixo das copas). No percurso só o olhar vai à frente: a câmera
  e a bolinha que testa as paredes continuam saindo do corpo. Com menos movimento, não antecipa.
  Conferido no navegador em 28/10/2026: ao sair de casa o ângulo vai de 1,03 a 0,60 em uns 0,8 s;
  ao começar o percurso a distância vai de 9,5 a 11,5 m.
- **Parede ou tronco atrás do personagem:**
  - a câmera encosta na hora e nunca atravessa (`distanciaDaCamera`);
  - para antes da parede, com folga de 0,35 (`FOLGA_DA_CAMERA`);
  - testa o caminho com uma bolinha de raio 0,45 (`RAIO_DA_SONDA_DA_CAMERA`);
  - nunca chega a menos de 0,4 do personagem (`DISTANCIA_MINIMA_DA_CAMERA`);
  - quando a parede sai da frente, volta para longe aos poucos, com rapidez 3 por segundo
    (`VOLTA_DA_CAMERA`).
- **Tapada de perto** (`GRUA_DA_CAMERA`): quando o espaço livre é menor que 60% da distância
  (`tapada: 0.6`):
  - primeiro a câmera gira para o lado livre, testando giros de 0,5 e 1,0 (`giros`);
  - um lado serve quando sobram 90% da distância (`basta: 0.9`), e o giro anda 1,5 por segundo
    (`giroPorSegundo`);
  - sem lado livre, sobe por cima do ombro (`subidas` 0,45 e 0,9, até a inclinação 1,25), se
    ganhar pelo menos 0,5 de espaço (`ganhoMinimo`).
- **Lá no alto** (`CAMERA_NO_ALTO`): a 2,5 acima do chão da ilha (deques e pontes), a câmera desce
  o ângulo (até 0,3) e chega mais perto (até 6,5), para mostrar o caminho por baixo das copas
  (`pesoNoAlto`).
- **Copas, troncos e telhados** entre a câmera e o personagem ficam transparentes, até a opacidade
  0,25 (`OPACIDADE_DA_COPA_NA_FRENTE`), em 0,3 segundo (`DURACAO_DO_ESMAECER_DA_COPA`).
- **Encostado num tronco:** a bolinha que começa encostando e se afasta não conta como batida
  (`stopAtPenetration: false` em `personagem/camera.tsx`). Antes, perto de um tronco (escalando,
  ou ao lado do primeiro cipó), a câmera ia para a distância mínima, dentro da cabeça do avatar.
- **No cipó** (`personagem/camera.tsx`): a câmera olha para um ponto entre o corpo e o meio do
  cipó, 55% do caminho (`FOCO_NO_CIPO = 0.55`), e segue mais devagar (6 por segundo vira 3,5:
  `SEGUIR_NO_CIPO = 2.5`). O balanço passa pela tela sem ela correr atrás.
- **Menos movimento** (`prefers-reduced-motion` do aparelho): no cipó ela olha só para o meio do
  cipó (`FOCO_NO_CIPO_COM_MENOS_MOVIMENTO = 1`) e fica quase parada; os vagalumes param de
  flutuar.

**O que a pessoa controla** (`CONTROLE_DA_CAMERA`, em `arquipelago/src/mundo/medidas.ts`; como no
The Sims):

- arrastar com o mouse ou com um dedo gira a câmera em volta do avatar (de lado) e sobe ou desce o
  ângulo (para cima e para baixo), de 7° (quase rente ao chão) até 72° (quase de cima);
- a rodinha do mouse, a pinça de dois dedos e as teclas + e - chegam mais perto ou mais longe, de
  4 a 18 m, com suavidade;
- dois cliques (ou dois toques) rápidos no mesmo lugar põem a câmera de volta nas costas do avatar;
- uma vez, se a pessoa não mexer na câmera nos primeiros 9 s, o Zappy conta como girar e
  aproximar (guardado no aparelho, não volta).

### 6.9 Ilhas completas

Arquivos: `sistemas/ilhas-completas.ts`, `mundo/ilha-completa.tsx` e `mundo/medidas.ts`.

- **Duas versões:** cada ilha do anel tem uma versão leve e pode ter uma versão completa, feita
  no Blender. Hoje só o Bosque tem a completa (`ILHAS_COMPLETAS` em `mundo/ilha-completa.tsx`).
- **O ciclo** (`proximoEstadoDaIlha`): `longe` → `carregando` → `pronta` → `ativa` →
  `descarregando` → `longe`.
- **Quando busca:** a ilha precisa estar aberta. A busca começa quando a pessoa entra na faixa da
  ponte (`BUSCA_NA_PONTE`: meia largura 3, começa 4 antes da ponte, vai até 2 depois) ou fica a
  menos de 43 do centro da ilha (`nivelDeDetalhe`: raio da ilha + 30).
- **Quando troca:** a completa toma o lugar da leve a menos de 30 do centro da ilha, no meio da
  ponte (`DISTANCIA_DA_TROCA = RAIO_DA_ILHA_DO_ANEL + 17`). A troca esmaece em 0,8 segundo
  (`DURACAO_DA_TROCA`).
- **Colisão:** só a versão ativa colide. Nos outros estados, a leve colide.
- **Voltar para a ilha central** solta a completa da memória.
- **Falha ao carregar:** fica a versão leve, e o jogo só tenta de novo quando a pessoa se afasta e
  volta.
- **Jogo aberto em cima de uma ilha completa:** o personagem espera no ar até o chão de verdade
  chegar (margem de 1 além da borda, `MARGEM_DA_ESPERA_PELO_CHAO`).

### 6.10 Cipó

Arquivos: `sistemas/cipo.ts` (`CIPO`), `personagem/personagem.tsx` e `mundo/bosque-vivo.tsx`.

- **Onde:** os três cipós do galho por cima do lago do Bosque (nós `cipo-1` a `cipo-3` do
  `bosque.glb`, pivô no galho, a 5,3 a 5,6 do chão). O primeiro fica na margem; os outros dois,
  sobre a água. Só existem com a ilha completa ativa.
- **Pegar no chão:** perto da corda (a até 1,3 no chão, `raioDaDica`) aparece "E Pegar o cipó" (no
  toque, o botão Usar). Só no chão da ilha, não de cima de um deque.
- **Pegar no ar:** pulando ou voando de outro cipó, as mãos pegam a corda que passar a até 0,65
  delas (`raioDaPegadaNoAr`). O cipó que acabou de soltar só pega de novo depois de 0,45 s
  (`esperaParaPegarDeNovo`).
- **Onde as mãos seguram** (`comprimentoDaPegada`): o mais longe do galho que deixa os pés a 0,35 do
  chão no ponto mais baixo (`folgaDosPes`), nunca menos de 1,6 (`comprimentoMinimo`). No Bosque dá
  de 3,7 a 4,1. As mãos ficam 0,3 acima do centro do corpo, 1,2 acima dos pés
  (`maosAcimaDoCentro`): o avatar é chibi (ombro a 1,01 do pé, 0,36 do ombro ao punho), e as mãos
  dele não passam da altura do queixo. Logo depois de pegar, o corpo vai suave até o lugar do
  balanço em 0,22 s (`encaixe`).
- **O balanço** é um pêndulo com a gravidade do personagem (24, `GRAVIDADE_DO_CIPO`):
  - bombear: pedir para o lado em que o balanço já vai empurra 9 m/s² ao longo do arco
    (`bombear`); pedir para o outro lado não freia; parado, pedir dá o primeiro empurrão;
  - pedir de lado vira o plano do balanço, até 1 radiano por segundo (`giroDoBalanco`);
  - o maior ângulo é 1,1 radiano, uns 63° (`anguloMaximo`);
  - segurando, o balanço perde 0,12 por segundo (`amortecimento`); solto, o cipó para sozinho,
    perdendo 0,8 por segundo (`amortecimentoSolto`).
- **Bater em algo** no balanço (o tronco da árvore, por exemplo): o corpo para ali e o balanço
  devolve 30% para o outro lado.
- **Soltar** (Espaço, o botão Soltar, ou E): sai com a velocidade do balanço vezes 1,15
  (`impulsoAoSoltar`) mais 3,2 para cima (`subidaAoSoltar`). Do primeiro cipó dá para pegar o
  segundo, do segundo o terceiro, e do terceiro se cai em terra do outro lado do lago.
- **Cair no lago** não é castigo: o personagem nada (6.12).
- **A corda é física** (`sistemas/cordas.ts`, `CORDAS`): cada cipó é uma corrente de 18 elos de
  uns 25 cm presa no galho, com a gravidade do personagem, como os jogos fazem com corda (Verlet
  com restrições). Ela encosta e não atravessa:
  - no corpo desenhado do personagem (o tronco como cápsula e a cabeça grande como bola,
    `CORPO.desenho`; o Rapier segue com a cápsula dele). Andar contra um cipó solto empurra a
    corda, que balança;
  - no tronco da árvore dos cipós: ela bate na casca e volta;
  - nos outros cipós: um cipó que bate em outro faz o outro balançar;
  - no chão.
  Segurando, o ponto da pegada fica preso nas mãos e a corda de cima fica esticada até o galho (o
  peso da criança); a de baixo cai solta e encosta no corpo, então a barriga e as pernas empurram a
  ponta para a frente. O cipó seguro empurra os soltos. Quem acabou de soltar não empurra a corda
  até sair de perto dela (`esperandoOCorpoSair`). O cipó solto para sozinho, perdendo 0,8 por
  segundo.
- **O desenho da corda** (`mundo/cipo-desenhado.ts`): a corda reta do `bosque.glb` é trocada, com a
  ilha completa ativa, por um tubo refeito a cada quadro em cima da corrente (2 anéis por elo, 6
  lados, o mesmo material e a mesma tinta da ilha). A alça vai na ponta e as folhas acompanham a
  curva.
- **O desenho do corpo:** no cipó toca a animação Pendurado (6.6). A corda passa ao lado do rosto,
  do lado esquerdo e à frente (`CORDA_NO_CORPO`, em `personagem/bracos.ts`), como quem pendura
  numa corda de verdade. As duas mãos fecham nela por IK de dois ossos, a esquerda acima da direita.
  O corpo pende 0,3 rad para trás em volta das mãos (`INCLINACAO_NO_CIPO`), mais o ângulo do
  balanço.

### 6.11 Escalada

Arquivos: `sistemas/escalada.ts` (`ESCALADA`), `mundo/bosque.ts` (`TRONCO_DOS_CIPOS`) e
`personagem/personagem.tsx`.

- **Onde:** o tronco da árvore do galho dos cipós, no Bosque. Uma trepadeira em espiral (desenhada
  no código) mostra que ele sobe. O tronco é um cone um pouco torto, do tamanho da casca
  desenhada: de 0,86 de raio no chão a 0,5 lá em cima, até a altura 6,5. Ainda não há nó no GLB
  para ele (veja o README de `arte/ilhas`).
- **Grudar:** andar contra a casca, a menos de 0,3 dela (`distanciaParaGrudar`), por 0,2 s
  (`esperaParaGrudar`). Pulando nele, gruda na hora. Perto do tronco, no chão, aparece
  "E Escalar o tronco".
- **Agarrado:** frente e trás sobem e descem a 1,7 por segundo (`subir`); os lados dão a volta no
  tronco a 1,6 por segundo medido na casca (`deLado`), no sentido da tela. O corpo fica a 0,08 da
  casca (`folga`).
- **Alturas:** o centro do corpo fica de 0,95 acima do pé do tronco (`acimaDoChao`) até as mãos 1,4
  abaixo do topo (`abaixoDoTopo`), abaixo do galho dos cipós. Aqui as mãos esticadas no alto ficam
  1 acima do centro (`ESCALADA.maosAcimaDoCentro`; o clipe Escalar alcança acima da cabeça).
- **Soltar:** descer no pé do tronco solta no chão; E solta com um passinho para fora; pular solta
  para fora a 4,5 e para cima a 6,5 (`saltoParaFora`, `saltoParaCima`), ou para onde a criança
  pede, se for para longe do tronco. Lá do alto, o pulo para fora cai no primeiro cipó. Depois de
  soltar, só gruda de novo após 0,5 s (`esperaDepoisDeSoltar`).
- **O desenho:** agarrado, toca a animação Escalar (6.6) no ritmo da velocidade de verdade
  (subindo, descendo ou dando a volta). Parado no tronco, o clipe para no quadro em que está.

### 6.12 Água rasa (o lago do Bosque)

Arquivos: `mundo/bosque-vivo.tsx` e `personagem/personagem.tsx`.

- O lago do Bosque (nó `agua`, a elipse da caixa dele) tem fundo na colisão do chão: uma bacia de
  0,85 m no meio, com rampa até debaixo da areia molhada da beira (até uns 43°; a criança sobe
  52°). A água do desenho é opaca e cobre o fundo (`bacia` em `arte/ilhas/bosque.py`).
- Nadar segue a mesma regra no mar e no lago: em pé no fundo, a criança começa a nadar quando a
  água passa da cintura por 0,12 m (`ENTRAR_NO_NADO`) e só volta a andar quando pisa e a cintura sai
  da água (`SAIR_DO_NADO`, 0,02). Nadando: velocidade 2,6, sem pular, deitada, e a cintura boia na
  linha da água.
- **O tronco que boia** (`mundo/tronco-no-lago.tsx`, física viva etapa 2): um tronco de madeira de
  1,6 m e raio de 0,16 m (uns 64 kg) no meio do lago, com quatro pontos de flutuação
  (`sistemas/empuxo.ts`). Em cada passo, cada ponto dentro da água recebe o empuxo pela
  profundidade dele e o arrasto da água: o tronco cai, balança e assenta com metade de fora
  (madeira tem metade da densidade da água, `sistemas/materiais-fisicos.ts`). A criança empurra
  (peso de 30 kg, `MASSA_DA_CRIANCA`): na água ele desliza devagar; dá para tirar pela rampa e pôr
  de volta. Se cair da ilha, volta para o meio do lago.

#### O limite do mar: a correnteza mansa

Arquivos: `sistemas/correnteza.ts`, `sistemas/modos/chao.ts`, `mundo/boias.tsx` e `mundo/anel.tsx`.

O caminho para as outras ilhas é a ponte. Nadar até lá não é castigado: não há tubarão, a energia
não cai e ninguém é levado de volta para casa. O mar só não deixa passar.

- **Boias:** uma linha de boias vermelhas e brancas, ligadas por uma corda com flutuadores, em volta
  da sua ilha a 42 m do centro (`BOIAS_DA_ILHA_CENTRAL`), depois da parte rasa (36 m). Cada ilha do
  anel aberta ganha a sua, a 19 m do centro dela (`BOIAS_DA_ILHA_DO_ANEL`); a Ilha das Nuvens fica
  no alto e não tem. Uma boia a cada uns 6 m (`ESPACO_ENTRE_BOIAS`). Os 19 m passam por fora do
  Bosque completo; o Recife completo (cais a 21,6 m, navio e labirinto no mar) vai pedir uma roda
  maior quando for ligado.
- **Correnteza:** dentro de qualquer linha de boias, o mar é livre. Fora de todas, a água leva para
  o centro da ilha de que se está mais perto. Ela começa de leve na boia e chega na força toda 6 m
  depois (`CORRENTEZA.faixa`), a 3,6 por segundo (`CORRENTEZA.forca`), mais que o nado mais rápido
  (2,6, até uns 2,9 com o humor ótimo). Ninguém passa de uns 4 a 5 m além das boias. Parando de
  nadar, a água leva de volta para dentro.
- **Mar aberto:** entre as ilhas, o mar continua fechado. Quem cai de uma ponte é levado para a
  beira mais perto, seja a da ilha de onde veio, seja a da ilha para onde ia.
- **Aviso:** quando a correnteza chega a um quarto da força (`CORRENTEZA.aviso`), o Zappy diz uma
  vez por abertura do jogo: "A correnteza aqui é forte e leva a gente de volta para a praia. Para ir
  às outras ilhas, o caminho é pela ponte."
- Só vale nadando na superfície do mar. No lago do Bosque e andando no raso não há correnteza. Ela
  soma ao deslocamento, não à velocidade do nado, então o clipe de nadar continua o mesmo.

### 6.13 Percurso nas copas

Arquivos: `sistemas/percurso.ts` (`PERCURSO_DAS_COPAS`), `mundo/bosque.ts` e
`mundo/bosque-vivo.tsx`.

- **Largada:** a placa "Percurso nas copas" ao lado do pé da escada da casa na árvore
  (`PLACA_DA_LARGADA`), com uma marca acesa no chão. Perto dela: "E Começar o percurso nas copas".
  O Zappy diz: "Valendo. Suba a escada e siga pelas copas até o escorregador."
- **Pontos de volta:** cada um dos 4 deques (`RAIOS_DOS_DEQUES`: 2,9, 2,0, 2,1 e 2,0). Um deque
  conta quando o corpo está em cima dele (os pés até 0,3 abaixo do piso, `folgaDoDeque`).
- **Queda:** depois do primeiro deque, pisar no chão da ilha (pés a menos de 0,25 do tampo) volta
  ao último deque alcançado, na borda de dentro do lado em que o caminho segue, a 0,7 da borda
  (`VOLTA_PARA_DENTRO_DO_DEQUE`), olhando para lá. Antes do primeiro deque, cair da escada não
  conta. Nunca volta para a largada.
- **Corte suave:** a tela escurece em 0,26 s, o corpo é levado e ela clareia em 0,34 s
  (`corteSaiMs`, `corteVoltaMs`).
- **Desistir sem castigo:** sair da ilha (1 além da borda), se afastar mais de 7 da largada antes
  de subir (`distanciaParaDesistir`), tocar "Parar" no cronômetro ou passar de 1 hora. Nada se
  perde.
- **Cronômetro:** discreto no alto da tela, só durante a corrida, com os vagalumes pegos e o botão
  "Parar". Conta o tempo de jogo, quadro a quadro, como a física: menu, ferramenta aberta, aba
  escondida, tempo pausado e o corte não contam. Passar de 1 hora desiste sozinho
  (`MELHOR_TEMPO_MAXIMO_MS`, no contrato), porque o salvamento não guarda tempo maior.
- **Chegada:** a 1,4 do fim do escorregador (`raioDaChegada`), depois do último deque.
- **Vagalumes:** 5 (`vagalumes`), só aparecem durante a corrida e são pegos a 0,8 do centro do
  corpo (`raioDoVagalume`). Ficam em `VAGALUMES_DAS_COPAS`:
  1. no meio da escada (pega subindo);
  2. no alto, no meio da ponte comprida (pega pulando);
  3. no deque da terceira árvore, do outro lado do tronco (pega dando a volta);
  4. no meio da última ponte;
  5. no meio do escorregador.
- **As três estrelas:**
  1. chegar;
  2. chegar em até 24 segundos (`tempoAlvoMs = 24_000`). O caminho tem uns 42 m: correndo sem
     errar dá uns 9 s, andando uns 19 s. Com uma queda, só correndo;
  3. pegar os 5 vagalumes na mesma corrida.
- **Resultado:** uma tela curta com as estrelas desta corrida, o tempo, o melhor tempo (com
  "Recorde novo" quando bate o de antes), os vagalumes, "Correr de novo" (volta à largada com o
  corte e já começa) e "Continuar". O Zappy comemora.
- **O que fica guardado** (`juntarResultado`, no salvamento, seção 5): cada estrela ganha fica para
  sempre, mesmo que venha de corridas diferentes, e o melhor tempo é o menor de todas as corridas
  que chegaram. Corrida que desistiu não muda nada.

### 6.14 Colisão

Arquivos: `mundo/colisao-da-ilha-central.ts` (o que tem medida do jogo), os nós `col-*` dos
modelos do Blender (o que o Blender espalha) e `mundo/colisores-da-ilha.ts` (lê os nós e diz quem
a câmera ignora).

- **A regra:** tudo o que se vê de pé e tem o tamanho de um objeto segura o corpo. A colisão é
  sempre uma forma simples (caixa ou cilindro, com a borda arredondada em 3 cm), nunca o desenho.
  Só o chão usa a malha.
- **O que é sólido na ilha central:** a casa (paredes, quinas, alicerce, floreiras das janelas,
  vasinhos e colunas da varanda, a porta nova fechada no vão ou aberta para fora), os troncos das
  árvores e a saia de galhos dos pinheiros, as moitas, as pedras, os canteiros da horta, a
  bancada, o farol com as pedras do pé e os degraus, o píer com as estacas, o poste e a lanterna
  do lampião, o barquinho e a corda das pontes inteiras.
- **O que é sólido no Bosque:** além do percurso nas copas, da cabana e do cercadinho, as moitas,
  as pedras, os cogumelos, as tocas, as floreiras da cabana, as pernas do escorregador e o
  cavalete do Quadro das Cores.
- **O que se atravessa:** capim, flores, pedras do caminho, estrelas-do-mar, vitórias-régias,
  taboas, raízes e as copas acima da cabeça. São baixos ou macios demais para parar alguém.
- **Tamanho:** o que é macio (moita, folhagem, cogumelo) fica um pouco menor que o desenho, para o
  corpo encostar nas folhas sem entrar. O que é duro (parede, tronco, pedra) fica do tamanho do
  desenho.
- **O degrau:** o degrau automático é de 0,45 (de frente, numa parede reta, ele sobe uns 0,43;
  medido na sala de testes), e com a curva do pé o personagem ainda escorrega por cima de uma quina
  até uns 0,58. Pedras pequenas, cogumelos pequenos, as pedras da beira do lago
  do Bosque e as tocas ficam abaixo disso (ele sobe nelas). Moitas e canteiros têm pelo menos 0,7
  (`ALTURA_QUE_SEGURA`): ele para na borda. A parte de cima que passa do desenho não aparece.
- **A câmera:** moitas, folhagem, cogumelos e peças finas (postes, estacas, colunas, floreiras,
  vasos, canteiros, barquinho, cavalete, corda das pontes e guarda-corpos) seguram só o corpo e a
  câmera passa por eles. Paredes, troncos, pedras, torre e cabana tapam a câmera, que encosta
  antes deles.
- **Onde mudar:** moitas e pedras da ilha central em `arte/mundo/terreno.py` (`MOITA_RAIO`,
  `MOITA_ALTO`, `PEDRA_RAIO`, `PEDRA_ALTO`); pedras do farol em `arte/mundo/farol.py`; estacas,
  lampião e barquinho em `arte/mundo/pier.py`; enfeites do Bosque em `arte/ilhas/bosque.py`
  (`MOITA_COL`, `PEDRA_COL`, `COGUMELO_COL`, `PEDRA_DO_LAGO_ALTA`). Depois de mudar um script,
  gere o GLB de novo (README de `arte/mundo` ou de `arte/ilhas`). O resto está em
  `colisao-da-ilha-central.ts`. Quem a câmera ignora: `SO_PARA_O_CORPO` em `colisores-da-ilha.ts`.
- **O pé do tronco de escalar fica livre:** nenhuma pedra perto dele (as do lago e a primeira
  pedra do Bosque foram afastadas), porque quem dá a volta no tronco lá embaixo passaria por dentro
  delas (`LONGE_DO_TRONCO_DE_ESCALAR`, em `arte/ilhas/bosque.py`).

### 6.15 A Capi e os bichos do Bosque

Arquivos: `arquipelago/src/sistemas/moradores.ts` (a Capi), `falas-da-capi.ts` (os textos dela),
`conversa-da-capi.ts` (a conversa sobre o salvamento), `esconde.ts` (o esconde-esconde) e
`bichos.ts` (o bicho adotado); no mundo, `mundo/capi.tsx` e o painel `interface/capi.tsx`. Testes:
`tests/moradores.test.ts`, `tests/bichos.test.ts`, `tests/caminho.test.ts` e
`tests/esconde-no-bosque.test.ts` e `tests/cuidar.test.ts`. A Capi, o esconde-esconde e o bicho
adotado já estão no jogo. O plano da parte que falta:
`docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`.

- **Onde ela fica:** na âncora `morador` do `bosque.glb`, na frente da cabana, de costas para a
  porta. A até 7 m (`CAPI_NO_BOSQUE.olharDe`) ela se vira para a criança e acena quando ela chega
  (no máximo uma vez a cada 45 s). Ela segura o corpo (um cilindro de 0,45 de raio), mas a câmera
  passa por ela. Pisca de vez em quando, fala enquanto a conversa está aberta e comemora presente
  e pedido entregue.
- **Conversar** (E perto dela, a até 2,2 m): uma caixa embaixo da tela com o nome, os corações (o
  que está enchendo aparece pela metade), uma fala por vez ("Continuar") e depois as escolhas:
  entregar o pedido do dia (aparece só com tudo na mochila; senão a caixa mostra o que falta),
  dar um presente (a lista da mochila) e "Tchau, Capi". O jogo fica parado enquanto ela está
  aberta, e o Esc fecha.
- **A câmera da conversa** (`personagem/camera.tsx`): a criança vira para a Capi e a câmera vai
  para trás e para o lado dela, do lado de fora da ilha (o miolo tem árvores e escadas), a não ser
  que a sonda ache esse lado tapado e o outro livre. Fica a 5 m, baixa, e olha um pouco abaixo das
  cabeças para as duas aparecerem acima da caixa. Com menos movimento pedido no sistema, ela não
  gira, só muda o ponto que olha.
- **O dia:** tudo o que é "uma vez por dia" conta pelo dia do calendário no horário do aparelho
  (`diaDe`), não pelo dia e noite do jogo.
- **Amizade com a Capi** (`AMIZADE`): de 0 a 500 (`AMIZADE_MAXIMA`, no contrato), 5 corações de 100
  (`coracoes`). A primeira conversa do dia dá 10, entregar o pedido do dia dá 30, um presente de que
  ela gosta dá 20 e um comum dá 8. Só a primeira conversa e o primeiro presente do dia contam. A
  amizade nunca desce.
- **Presentes** (`darPresente`, `GOSTOS_DA_CAPI`): milho e salada são os preferidos; pipoca,
  alface e tomate são comuns. O que não é comida ela devolve e o item fica com a criança. Depois
  do primeiro presente do dia ela pede para guardar para amanhã, e o item também fica.
- **Aniversário** (`ANIVERSARIO_DA_CAPI`): 12 de março. O presente vale o dobro e ela fala dele.
- **Pedido do dia** (`PEDIDOS_DA_CAPI`, `pedidoDoDia`): duas alfaces, dois tomates, um milho, uma
  salada ou duas pipocas e, enquanto houver bicho escondido, achar mais um bicho. O sorteio usa o
  dia e o perfil, então o pedido é o mesmo o dia inteiro em qualquer aparelho, e fica guardado no
  salvamento. Entregar tira os itens do inventário (`entregarPedido`). O de achar só se cumpre com
  um bicho achado depois do pedido.
- **Conversa** (`falasDaCapi`): no primeiro encontro ela conta a história dos bichos escondidos. Na
  primeira conversa do dia: o aniversário (se for), uma fala do nível de amizade (duas por nível,
  trocando pelo dia), quantos bichos já foram achados, o bicho adotado e o pedido. As outras
  conversas do mesmo dia são só uma despedida. Os textos seguem as regras do jogo: sem travessão,
  sem exclamação e sem começar com pergunta (o teste confere).
- **Esconde-esconde** (`ESCONDERIJOS`, `mundo/bichos-do-bosque.tsx`): cada bicho fica sempre no
  mesmo lugar (uma criança pode contar para outra): o cachorro atrás da moita da beira norte, o
  gato entre os cogumelos e as pedras do lago, o coelho na boca da toca do oeste e o porquinho
  atrás da cabana. As posições vêm das âncoras `esconderijo-1` a `esconderijo-4` do
  `bosque.glb` (para mudar, mexa em `ESCONDERIJOS` no `arte/ilhas/bosque.py` e em
  `ESCONDERIJOS_NO_MODELO` no `mundo/bosque.ts`, que precisam bater). De longe o bicho não
  aparece; a uns 5,6 m ele surge aos poucos, e a 4 m (`RAIO_DA_PISTA`) ele balança de contente e o Zappy fala da pista
  (rabinho, orelhas, farfalhar ou focinho, `FALA_DA_PISTA`). A 1,4 m (`RAIO_DE_ACHAR`) aparece
  "Achar o gato frajola": o achado fica guardado para sempre, o bicho comemora e corre pelo chão
  até o cercadinho da Capi, entrando pela porteira (`sistemas/caminho.ts`: busca numa grade de
  25 cm que contorna o que é duro e atravessa moitas e cogumelos). No cercadinho cada um tem o
  seu lugar, pela ordem em que foi achado (`LUGARES_NO_CERCADO`), fica parado ou sentado e olha
  para a criança que chega. Achar os quatro faz o Zappy pedir para contar para a Capi.
- **O Zappy no esconde-esconde:** depois de conhecer a Capi, ele avisa quando a criança esquenta,
  sempre do escondido mais perto (`maisPertoEscondido`): morno (até 15 m), quentinho (até 7 m) ou
  pertinho (até 2,1 m), só quando muda para mais quente e no máximo uma vez a cada 12 s
  (`deveFalarDoCalor`, `INTERVALO_DO_CALOR`). Esfriar não diz nada.
- **Adotar** (`adotar`, `nomeValido`, `motivoDoNome`, `adotarPelaCapi`): depois do primeiro bicho
  achado, a conversa com a Capi ganha "Adotar um bicho". A criança escolhe um dos achados e dá um
  nome de 1 a 16 caracteres, só letras, espaço e hífen, começando por letra; nome que não serve
  mostra o motivo embaixo do campo. Um bicho por vez nesta fase. O nome fica só no salvamento da
  criança e ninguém mais vê. O bicho chega com 80 em cada medida e sai do cercadinho para andar
  com ela. As falas usam o nome e nenhum pronome: é a criança quem decide quem o bicho é.
- **Seguir** (`sistemas/seguir.ts`, `mundo/bicho-adotado.tsx`): o bicho anda atrás da criança pela
  ilha central e pelo Bosque com um controlador de personagem do Rapier próprio (sobe degrau de
  0,3, para na parede). Começa a andar quando ela passa de 2,6 m, para a 1,6 m (dois passos),
  corre acima de 5 m e senta depois de 6 s parado. No cipó, no tronco, nadando ou com o jogo
  parado, ele espera. Mais longe que 14 m (a criança atravessou a ponte correndo, voltou para casa
  no cochilo), caído da ilha (abaixo de 0,5 m sob o mar, `abaixoDoMar`) ou preso contra uma
  parede por 2,5 s querendo andar (`presoPor`), ele reaparece dois passos atrás dela. A criança
  passa por ele: o bicho nunca prende nem empurra (os dois corpos são cinemáticos e se ignoram).
- **Cuidar** (`sistemas/cuidar.ts`, painel `interface/bicho.tsx`): perto dele aparece "Cuidar de"
  e o nome, só quando nenhum outro botão está ao alcance (a Capi, o "Achar", a porta e o Quadro
  vêm antes: o bicho anda sempre perto e não pode tomar o E deles; `deFundo` em
  `mundo/interativos.ts`). O painel mostra barriga, limpeza e carinho, a última fala e os cuidados: comida da
  mochila (repõe o dobro do que repõe na criança), banho (só perto do lago do Bosque ou dentro de
  casa; repõe 60), carinho (repõe 25), a aula do truque e, depois de aprendido, pedir o truque.
  Fome cai 1,5, limpeza 0,8 e carinho 1 por minuto JOGADO (`QUEDA_DO_BICHO_POR_MINUTO`, nos
  relógios do jogo, junto com as necessidades da criança). Abaixo de 30 em qualquer medida ele fica
  triste e não faz o truque (`tristinho`). Ele nunca morre nem foge.
- **Crescer** (`contarDiaCuidado`, `crescer`): um dia conta como bem cuidado quando as três medidas
  passam de 60 em algum momento dele (conferido depois de cada cuidado). No sétimo dia assim o
  filhote vira adulto na hora, com festa, e o modelo troca pelo adulto.
- **Truque** (`ensinar`, `fazTruque`, `TRUQUE`, `TRUQUE_FEITO`): uma aula por dia, com as três
  medidas acima de 50. Na quinta aula ele aprende e passa a fazer o truque quando pedem (dar a
  pata, rolar no chão, dar um pulinho ou girar no lugar), tocando o clipe "truque".
- **Moedas:** nada disto paga moedas.

### 6.16 O modo construção (a grade e as paredes)

Arquivos: `arquipelago/src/sistemas/construcao/` (`lote.ts`, `grade.ts`, `comodos.ts`, `obra.ts`,
`pecas.ts`). Plano e decisões: `docs/plans/2026-10-28-arquipelago-modo-construcao.md`.

- **O lote da casa** (`LOTE_DA_CASA`): a grade de 1 célula por unidade, nas coordenadas do mundo,
  de x -13 a 14 e de z -12 a 8. É onde o chão da sua ilha é plano: em toda célula livre o chão
  fica entre 0,15 abaixo e 0,02 acima do topo da terra (teste).
- **Células ocupadas** (não se constrói em cima nem se fecha dentro de casa): a varanda, a horta,
  a bancada, as duas árvores perto da casa, o pé do farol, as cinco moitas do terreno e o
  morrinho na frente da varanda. Um teste confere que todo colisor do lote (horta, bancada,
  farol, árvores, moitas) cai numa célula ocupada.
- **O quarto da plataforma** (x -6 a 6, z -8 a 0) é um cômodo fixo. As paredes da esquerda e do
  fundo são da plataforma (fixas: sem porta nem janela). As da frente e da direita viram paredes
  do kit na primeira obra (travadas: aceitam porta e janela, mas não se apagam), com a porta nova e
  as duas janelas no lugar das do `casa.glb`.
- **Parede:** fica nas linhas da grade. Arrastar estica a parede reto, pelo eixo em que o dedo
  andou mais. Não dá em cima do que está ocupado, dentro do quarto nem fora do lote, e não dá para
  fechar algo ocupado dentro de casa. Teto do jogo: 320 arestas de parede por lote.
- **Apagar** tira as paredes do caminho (as do quarto ficam) e as portas e janelas delas.
- **Cômodo:** as células que as paredes fecham (o que não se alcança da borda do lote sem passar
  por parede; porta e janela não abrem a parede para isso). Cômodo novo nasce com piso de tábua;
  a ferramenta Piso troca o piso do cômodo inteiro (tábua, ladrilho ou azulejo). O quarto tem o
  piso da plataforma.
- **Lambri ou lisa** (o jogo decide): parede com cômodo dos dois lados é lisa; com cômodo de um
  lado só, lambri, com a fachada para fora.
- **Porta e janela** (`LARGURA_DA_ABERTURA`): porta e janela grande ocupam 3 células, a janela em
  arco 2 e a redonda 1. Entram com o meio na aresta tocada e precisam caber inteiras numa parede
  do kit, sem outra abertura no caminho e sem parede chegando no meio delas. Teto: 48 por lote.
- **Quinas:** em toda ponta solta de parede, em toda dobra em L e onde uma parede em pé encontra
  uma cortada na mesma linha; nada no T, no cruzamento e na emenda reta.
- **Colisão:** as paredes em pé (sempre altas, o corte é só desenho), com o vão de 2,2 por 3 de
  cada porta livre, e as quinas. As paredes fixas colidem pela casa de antes.
- **A casa construída** (`mundo/obra.tsx`, montada pela `Casa`): enquanto
  `salvamento.construcao.casa` é `null`, a casa é a de antes (`casa.glb`). Com obra, o kit desenha as
  paredes, as quinas, as portas, as janelas e os pisos dos cômodos novos, e do `casa.glb` ficam o
  revestimento de fora das paredes da plataforma, o telhado do quarto e a varanda (a porta nova
  vira a porta do kit, no mesmo lugar). As janelas do kit acendem à noite.
- **Porta do kit:** abre sozinha quando a pessoa chega a 2,2 do meio do vão (`PERTO_DA_PORTA`) e
  fecha quando ela se afasta; a de fora (lambri) abre para fora. O vão nunca colide.
- **Playground:** `?obra=exemplo` começa a casa com a obra de exemplo
  (`src/plataforma/obra-de-exemplo.ts`: um cômodo na frente do quarto e um à direita, com a porta
  nova saindo do quarto).
- **Viver e Construir** (`interface/construir.tsx`, loja `estado/construcao.ts`): os dois botões no
  alto da tela aparecem depois que a porta nova abriu, quando nada mais está por cima do jogo.
  Construir para o personagem (`PAINEL_DE_CONSTRUIR` em `painelAberto`); "Pronto", "Viver" ou Esc
  voltam. Na primeira vez, a casa de antes vira a obra inicial do lote (na hora de abrir, para a
  criança já ver as paredes do quarto como peças do kit).
- **No Construir** (`mundo/construir.tsx`): todas as paredes ficam cortadas, o telhado do quarto
  sai e a grade do lote aparece no chão, com o que está ocupado tingido de vermelho. A câmera de
  obra (`CAMERA_DE_OBRA`) abre sempre de frente para a casa, a 24 de distância e 0,95 de
  inclinação, olhando para (0, -3); os botões giram um oitavo de volta e aproximam ou afastam 4
  (de 8 a 40); a roda aproxima; setas e W A S D andam; Q e E giram; arrastar com o botão direito
  gira e inclina. Ela toma o lugar da câmera do jogo só enquanto o Construir está aberto.
- **Ferramentas:** Parede (arrastar estica), Porta, Janela (grande, em arco ou redonda), Piso (do
  cômodo inteiro: tábua, ladrilho ou azulejo), Apagar (arrastar apaga paredes; um toque tira a
  porta ou a janela, e sem ela a parede) e Olhar (arrastar anda pela obra). A prévia mostra em
  verde o que dá (em azul para porta e janela) e em vermelho o que não dá; o Zappy explica a
  recusa (`sistemas/construcao/falas.ts`). "Desfazer" volta até 30 mudanças
  (`LEMBRA_PARA_TRAS`), só enquanto o Construir está aberto.
- **Corte das paredes** (`sistemas/construcao/telhado.ts`, `paredesCortadasNoViver`): no
  Construir, todas as paredes do kit ficam cortadas. No Viver, com a pessoa numa célula de dentro
  de casa (o quarto ou um cômodo novo), fica cortada toda parede cuja linha separa a câmera da
  pessoa; fora de casa, nenhuma. O jogo confere a cada 0,12 s. As paredes fixas da plataforma
  nunca são cortadas. A parede cortada continua segurando o corpo, mas a câmera passa por ela
  (`col-obra-cortada-*`, como o guarda-corpo dos deques).
- **Telhado** (`telhadoDoComodo`): cada cômodo novo retangular ganha o telhado de duas águas do kit,
  com a cumeeira correndo em x, beirais, águas (meia água no meio quando o fundo é ímpar),
  cumeeira com as pontas, testeiras e oitões nas duas pontas, a partir de 4 de altura e subindo
  0,5 por célula (`TELHADO`). Cômodo que não é retângulo fica sem telhado. O telhado sai no
  Construir e com a pessoa dentro da obra; o do quarto (do `casa.glb`) sai junto.
- **Quintal** (`sistemas/construcao/quintal.ts`): tudo fora de casa, no mesmo lote.
  - **Cerca:** nas arestas da grade, esticada arrastando como a parede; não vai em cima de parede,
    dentro de casa, do que está ocupado nem encostada num canteiro. Não fecha cômodo. Teto: 200
    arestas. Segura o corpo; a câmera passa (`col-cerca-*`). Madeira de 0,9 de altura (formas do
    código: o kit ainda não tem cerca, anotado no README de `arte/casa`).
  - **Caminho:** de pedra ou de grama, pintado arrastando pelas células (reto, pelo eixo em que o
    dedo andou mais); pintar por cima com o outro tipo troca. Não vai dentro de casa nem em cima
    de canteiro. Teto: 240 células. Caminho que ficar dentro de um cômodo novo sai.
  - **Canteiro:** um toque numa célula livre do quintal (sem caminho, sem cerca nem parede em
    volta). Vira um canteiro da horta no salvamento (`q` e a célula, `idDoCanteiro`), que planta,
    rega e colhe como os seis da horta; a horta tem lugar para 24 (6 de antes e 18 do quintal).
    Parede não encosta nem fecha canteiro dentro de casa. Apagar só tira canteiro vazio.
  - **Apagar:** arrastar tira paredes e cercas do caminho; um toque perto de uma aresta (até 0,3)
    tira a porta, a janela, a parede ou a cerca dali; longe dela, o canteiro vazio ou o caminho
    da célula. O que cada ferramenta faz com o dedo é regra pura: `sistemas/construcao/ferramentas.ts`.
  - **Cabana:** a do Bosque ainda não existe no jogo: o `bosque.glb` não tem terreno livre para o
    lote (pedido no README de `arte/casa`). O salvamento já guarda a obra dela
    (`construcao.cabanas.bosque`). No quintal da casa dá para fazer uma cabana solta.

### 6.17 O diário e as pegadas

Arquivos: `sistemas/diario.ts`, `sistemas/pegadas.ts`, `interface/diario.tsx`,
`interface/pegadas.tsx` e `mundo/rastro-de-pegadas.tsx`. Testes: `tests/diario.test.ts` e
`tests/pegadas.test.ts`. Tudo sai do que o salvamento já guarda: o diário não tem campo próprio.

- **Abrir:** "📖 Diário" no menu do jogo. O personagem fica parado, e Esc ou "Voltar ao jogo"
  fecham (`PAINEL_DO_DIARIO`). Ele só mostra; nada ali muda o jogo.
- **Páginas do diário da Íris** (`ILHAS_DO_DIARIO`): uma em cada ilha do anel e a última no alto
  do Farol, 7 ao todo. Juntas, contam por que ela foi embora.
  - A do Bosque fica com a Capi. Ela entrega quando a amizade chega a 2 corações
    (`CORACOES_DA_PAGINA`, 200 pontos): na conversa, no presente ou na entrega do pedido que fizer
    a amizade passar desse ponto, ela diz "Achei uma coisa na minha cabana e guardei para você:
    uma página do diário da Íris." e "Ela vinha muito ao bosque desenhar. Guarde no seu diário, no
    menu." (`FALA_DA_PAGINA`, `ganhouAPagina`). Quem já tinha os corações acha a página no diário.
  - O texto é o da proposta do jogo: "Hoje desenhei uma ponte e apaguei três vezes. Ninguém viu o
    desenho. Talvez seja melhor assim." (`TEXTO_DA_PAGINA`), assinado "Í.".
  - Antes de chegar, o diário diz quantos corações faltam. As das outras ilhas dizem onde estão
    ("Fica na Vila Doce, com quem mora lá."); chegam com os moradores de cada ilha.
- **Bichos e pegadas do Bosque** (`colecaoDoBosque`): os quatro do esconde-esconde. Escondido
  aparece como "Ainda escondido" com a dica de seguir as pegadas; achado mostra o bicho, onde ele
  está (no cercadinho da Capi, ou com a criança, com o nome que ela deu) e a pegada, com o que
  olhar nela (`PEGADA_DO_BICHO`): o cachorro deixa a marca das unhas e o gato não; a pata de trás
  do coelho é comprida; o porquinho-da-índia tem quatro dedos na frente e três atrás.
- **O rastro no chão** (`rastroNoCaminho`, `RASTRO`): cada bicho ainda escondido deixa pegadas no
  caminho entre o cercadinho, de onde fugiu, e o esconderijo, pela mesma grade que contorna o que
  é duro (`sistemas/caminho.ts`). Elas vão de 1,2 a 8 m do esconderijo, a cada 0,55 m, alternando
  os lados, todas apontando para ele, com o desenho da pegada daquele bicho em 0,32 m. O rastro
  sai quando o navegador está à toa depois de a ilha ficar ativa, e some quando o bicho é achado.
- **Moedas:** nada disto paga moedas.

## 7. Desafios

Arquivos principais:

- `arquipelago-contracts/src/desafios.ts` e `arquipelago-contracts/src/aprenda.ts`;
- `arquipelago-api/src/domain/desafios.ts`;
- `arquipelago-api/src/application/servico-dos-desafios.ts` (quem joga);
- `arquipelago-api/src/application/servico-da-equipe.ts` (Admin).

No navegador, o Quadro das Cores (7.11) chama `/desafios` e `/desafios/:id/recompensa-vista` e
abre o Estúdio de desafio pela plataforma; o caderno dos Lumis (8.1) chama `/cartas`. As regras
abaixo são as do serviço.

### 7.1 Tipos e quadros

- **Tipos** (`TIPOS_DE_DESAFIO`): `quadro-das-cores`, `desafio-do-dia`, `pedido-de-morador`. Hoje
  só o Quadro das Cores tem regra própria: ele tem um número de quadro. Regra própria para os
  outros dois tipos não encontrada no código.
- **Seis quadros por ilha** (`QUADROS_POR_ILHA = 6`).
  - Só o Quadro das Cores tem número de quadro, de 1 a 6, e ele sempre tem
    (`MetadadosDoDesafioSchema`).
  - Cada número de quadro pode ter um desafio só por público e ilha, fora os arquivados (índice
    `desafios_quadro_unico`). Outro desafio no mesmo quadro recebe 409 `QUADRO_OCUPADO`.
- **Públicos** (`PUBLICOS_DO_DESAFIO`): `kids` e `adulto`. Cada desafio é de um público só e vale
  para todas as pessoas desse público. Não é individual.
- **Identificador (`slug`):** letras minúsculas, números e hífen, até 80 caracteres, único entre
  todos os desafios (409 `SLUG_EM_USO`).
- **Ordem:** de 0 a 10.000.
- **A cor da ilha** é o número de quadros distintos do Quadro das Cores que a pessoa concluiu na
  ilha, dividido por 6.
  - O serviço manda `quadro.feitos` e `quadro.total = 6` em `GET /arquipelago/desafios`
    (função `quadrosFeitos`).
  - Concluídos de desafios arquivados também contam.
  - `feitos` nunca passa de 6.
  - A ilha considerada é a ilha onde o desafio está cadastrado hoje.

### 7.2 Os limites do cadastro

Arquivo: `arquipelago-contracts/src/desafios.ts`, constante `LIMITES_DO_DESAFIO`.

| Regra | Valor | Nome |
|---|---|---|
| Título | 80 caracteres | `titulo` |
| Enunciado | 2.000 caracteres | `enunciado` |
| Cada dica | 300 caracteres | `dica` |
| Número de dicas | 5 | `dicas` |
| Objetivos | 20 | `objetivos` |
| Objetivos que rodam o jogo | 8 | `objetivosQueRodam` |
| Moedas do prêmio principal | até 100 | `moedas` |
| Moedas do extra | até 50 | `moedasExtra` |
| Blocos acrescentados ou retirados à mão | 200 de cada | `blocosManuais` |
| Tamanho do projeto inicial ou do gabarito | 1.500.000 caracteres | `projetoCaracteres` |

Outros limites do mesmo arquivo:

- texto de cada objetivo: até 200 caracteres;
- id de cada objetivo: até 80 caracteres;
- título do desafio extra: até 80 caracteres;
- texto do desafio extra: até 500 caracteres.

O Members confere de novo os 20 objetivos e os 8 que rodam o jogo
(`members/src/application/arquipelago/arquipelago-objectives.service.ts`,
`LIMITES_DOS_OBJETIVOS`; o 8 vem de `EXECUTION_LIMITS.maxObjectives` em
`core/src/learning/project-execution.ts`). As esperas somadas dos objetivos que rodam o jogo vão
até 40 segundos (`maxSectionWaitMs`).

### 7.3 Só JavaScript

O objetivo aceita só `programmingLanguage: 'javascript'` (`ObjetivoDoDesafioSchema`). A análise
do Members recusa projeto ou objetivo em Python (`PROJETO_PYTHON`, `OBJETIVO_PYTHON`) e projeto do
Pro (`PROJETO_PRO`).

### 7.4 Blocos exigidos

- **A conta** (`blocosExigidos`, em `aprenda.ts`): os blocos do gabarito, mais os que a equipe
  acrescentou, menos os que ela retirou.
- **O que não conta como bloco do gabarito.** O Members só considera blocos que existem no catálogo
  do Estúdio. Ficam de fora:
  - os blocos de moldura (`contract.domain === 'frame'`), que estão sempre disponíveis;
  - os blocos que já vêm no projeto inicial.
  
  A regra fica em `arquipelago-objectives.service.ts`.
- **A lista fica congelada na publicação** (`blocosExigidos` em `desafio_publicacoes`). Mudar um
  curso depois não muda o que o desafio pede até a próxima publicação.

### 7.5 Como um desafio fica disponível

Arquivo: `arquipelago-api/src/domain/desafios.ts`, função `situacaoDoDesafio`. A ordem é esta:

1. **`concluido`:** a pessoa já concluiu. Nada mais é conferido.
2. **`ilha-fechada`:** a posição da pessoa ainda não abre a ilha do desafio.
3. **`faltam-blocos`:** falta algum bloco exigido entre os blocos que a pessoa conquistou nos
   cursos.
4. **`disponivel`:** a ilha está aberta e a pessoa tem todos os blocos.

- **As ilhas abrem pelo posto.** Os desafios abrem pelos blocos conquistados nos cursos.
- **De onde vêm a posição e os blocos:** do Members (`GET /members/internal/arquipelago/jogador`).
  O serviço guarda a resposta por 30 segundos (seção 9.7).
- **Equipe:** vê todas as ilhas abertas (posição 8) e tem todos os blocos.
- **Desafio fechado:** abrir ou conferir um desafio que não está disponível recebe 403
  `DESAFIO_BLOQUEADO`, com a situação.

### 7.6 "Aprenda isso em"

Arquivo: `arquipelago-contracts/src/aprenda.ts`, função `aprendaIssoEm`.

- **O que mostra:** para cada bloco que falta, os cursos publicados que liberam esse bloco.
- **A ordem:** do posto mais cedo para o mais tarde. Curso sem posto (como Maestria) vai por
  último. No mesmo posto, a ordem é pelo título.
- **De onde vêm os cursos:** do currículo do Members (`GET /curriculo-de-blocos`). Só entram cursos
  publicados que liberam algum bloco.

Para a equipe, `coberturaDosBlocos` dá três avisos por bloco exigido:

- `sem-curso`: nenhum curso publicado libera o bloco;
- `bloco-desconhecido`: o bloco não existe no catálogo do Estúdio;
- `curso-depois-da-ilha`: o curso mais cedo fica num posto depois do posto da ilha, ou não tem
  posto. A criança chega à ilha antes de poder fazer o desafio.

### 7.7 Cadastro, análise e publicação (Admin)

Arquivo: `arquipelago-api/src/application/servico-da-equipe.ts`.

- **Quem lê:** a equipe (`superadmin`, `admin`, `staff`), na própria conta, sem perfil.
- **Quem escreve:** só `superadmin` e `admin`, fora de sessão de suporte (`lerEquipe`). Os outros
  recebem 403 `SEM_PERMISSAO`.
- **Criar:** o desafio nasce como `rascunho`, na revisão 1.
- **Gravar:** toda gravação manda a revisão que a pessoa da equipe abriu. Se alguém gravou antes, a
  resposta é 409 `DESAFIO_DESATUALIZADO` com o que está guardado. Cada gravação soma 1 à revisão.
- **Analisar:** mostra o que a publicação congelaria e não grava nada. Ela traz:
  - os blocos do gabarito e os blocos exigidos;
  - a cobertura dos cursos;
  - os problemas;
  - se o gabarito passa em cada objetivo;
  - se o projeto inicial já passa em algum objetivo, o que seria um aviso de desafio resolvido
    de saída.
- **Publicar:**
  - só publica a revisão que foi analisada;
  - é recusado com 422 `DESAFIO_COM_PROBLEMAS` enquanto houver qualquer problema;
  - grava uma cópia imutável em `desafio_publicacoes` (conteúdo, blocos, a vista dos objetivos e
    a análise) e marca o desafio como `publicado`.
- **Problemas que impedem publicar:**
  - conferidos no serviço do jogo (`problemasLocais`): `SEM_OBJETIVO_OBRIGATORIO`,
    `OBJETIVO_REPETIDO`, `EXTRA_SEM_TEXTO` (há objetivo opcional sem título e texto do extra) e
    `MOEDAS_DEMAIS`;
  - conferidos no Members: projeto ou gabarito inválido, Python ou Pro, objetivos demais, regra
    inválida, espera demais e executor fora do ar. O mais importante é `GABARITO_NAO_PASSA`: o
    gabarito precisa passar em todos os objetivos obrigatórios.
- **Revisão publicada:** quem joga recebe sempre a última publicação. Mudanças gravadas depois de
  publicar não chegam às crianças até publicar de novo. A lista do Admin mostra isso como
  `alteradoDepoisDePublicar`.
- **Arquivar:** o desafio sai da lista de quem joga. Quem estava com ele aberto e tenta conferir
  recebe 409 `DESAFIO_MUDOU`. As conclusões já feitas continuam valendo.
- **Reativar:** volta a `publicado` se já teve publicação, senão volta a `rascunho`. Se outro
  desafio ocupou o quadro nesse meio tempo, a resposta é 409 `QUADRO_OCUPADO`.
- **Publicar de novo a mesma revisão** (por exemplo, depois de reativar) mantém a primeira cópia.

### 7.8 Jogar e conferir

Arquivo: `arquipelago-api/src/application/servico-dos-desafios.ts`.

- **Abrir** (`GET /arquipelago/desafios/:id`):
  - devolve o título, o enunciado, as dicas, o desafio extra, os objetivos como a criança os vê e
    o projeto inicial;
  - o gabarito e as regras dos objetivos nunca vão para o navegador;
  - os últimos resultados só aparecem se forem da mesma revisão publicada.
- **Conferir** (`POST /arquipelago/desafios/:id/verificar`, com a revisão aberta e o projeto). O
  corpo vai até 4 MB (`CORPO_DA_CONFERENCIA`).
  1. **A revisão:** a revisão que a pessoa abriu continua conferível enquanto existir. Desafio
     arquivado recebe 409 `DESAFIO_MUDOU`.
  2. **Disponibilidade:** se ainda não foi concluído, o serviço confere de novo a ilha e os
     blocos antes de gastar o executor.
  3. **A conferência:** o Members confere o projeto com o mesmo verificador das aulas. Se o
     executor estiver fora, cheio ou recusar, a resposta é 424, 429, 409 ou 400 e nada é
     guardado.
  4. **Suporte:** recebe o resultado e para aqui.
  5. **A tentativa:** os resultados são guardados (`desafio_progresso`).
  6. **O principal passa** quando todos os objetivos obrigatórios passaram
     (`passouNosObrigatorios`). Desafio sem objetivo obrigatório nunca passa. A conclusão é
     gravada uma vez só.
  7. **O extra passa** quando todos os objetivos opcionais passaram na mesma conferência em que
     o principal passou. Ele é marcado uma vez só.
  8. **Os prêmios** desse desafio são cobrados na hora (seção 9).
- **Refazer:** a pessoa pode abrir e conferir de novo um desafio concluído. A conclusão não se
  repete. O extra pode ser ganho numa conferência posterior, sempre com o principal passando
  junto.
- **A festa do prêmio:** `POST /desafios/:id/recompensa-vista` marca que o jogo já mostrou a
  festa, para não mostrar de novo.

### 7.9 Feito continua feito

Depois de concluído, o desafio nunca é recalculado:

- `situacaoDoDesafio` devolve `concluido` antes de olhar a ilha e os blocos;
- abrir e conferir não exigem disponibilidade de quem já concluiu;
- as conclusões incluem desafios arquivados.

Mudar os blocos de um curso, a lista da pessoa ou o desafio não tira o que ela fez.

### 7.10 O liga e desliga

- **A chave:** `ARQUIPELAGO_DESAFIOS` (`env.ts`).
  - `desligado`: ninguém usa os desafios (403 `DESAFIOS_DESLIGADOS`).
  - `equipe`: só a equipe, para testar.
  - `aberto`: todos que podem jogar.
- **Sem valor:** aberto no desenvolvimento, desligado em deploy.
- **A política de acesso** (seção 3) vem antes da chave.
- **Members não configurado** (`MEMBERS_URL` e `ARQUIPELAGO_MEMBERS_TOKEN`): os desafios
  respondem 424 `PLATAFORMA_INDISPONIVEL`, e o resto do jogo segue.

### 7.11 O Quadro das Cores no jogo

Arquivos: `arquipelago/src/sistemas/quadro-das-cores.ts` (regra pura),
`src/estado/desafios.ts` (loja), `src/mundo/quadro-das-cores.tsx` (o cavalete no mundo) e
`src/interface/quadro-das-cores.tsx` (o painel).

- **Onde fica:** um cavalete perto da chegada da ponte de cada ilha completa (hoje só o Bosque),
  3,2 m para dentro e 2,4 m para o lado (`LUGAR_DO_QUADRO`), de frente para quem chega. Ele
  aparece junto com a versão completa da ilha.
- **Abrir:** a até 2,6 m (`ALCANCE_DO_QUADRO`) aparece "Ver o Quadro das Cores" (tecla E ou
  toque). O painel congela o personagem; Esc ou "Voltar ao jogo" fecha.
- **Os seis quadros:** cada quadro mostra o desafio da equipe com o número dele. A situação vem
  sempre do serviço (`GET /desafios`):
  - `concluido`: "Cor de volta", com "Fazer de novo";
  - `disponivel`: "Pronto para fazer", com "Fazer o desafio";
  - ilha fechada: "Abre quando a ilha abrir";
  - faltam blocos: "Aprenda primeiro em:" e o primeiro curso de cada bloco que falta;
  - sem desafio publicado: "A equipe ainda vai pendurar este desafio".
- **Jogar:** o botão pede `abrirFerramenta` com o molde do desafio. O Estúdio de desafio abre
  por cima e o jogo fica pausado. Na volta, a lista é lida de novo, porque a situação e a cor
  nunca são decididas pelo jogo.
- **A festa da cor:** um quadro que passou a `concluido` entre duas leituras faz o painel fechar
  sozinho. O Zappy diz "Mais uma cor voltou para o ...", e a mancha `cor-N` do cavalete sai do
  cinza em 1,6 s (`DURACAO_DA_COR_S`). Depois de 4 s o jogo avisa o serviço
  (`recompensa-vista`), para a festa não se repetir em outro aparelho. Na primeira leitura ao
  chegar na ilha, o que já está feito aparece pintado, sem festa.
- **Fechado:** com os desafios desligados ou sem acesso (403), o painel diz que os desafios
  ainda não abriram. Com o serviço fora do ar, diz que não conseguiu ler e oferece "Tentar de
  novo".
- **A cor da ilha** (`arquipelago/src/sistemas/cor-da-ilha.ts`, tinta em
  `src/mundo/pintura-da-ilha.ts`): cada ilha do anel é dividida em seis pedaços, como fatias em
  volta do centro. O pedaço 1 fica do lado da chegada da ponte e os outros seguem em volta.
  - ponte fechada: a ilha toda cinza;
  - ponte aberta: um pouco de cor na ilha inteira, 30% (`COR_AO_ABRIR`). O Zappy diz "A ponte para
    o ... ficou pronta. A cor começou a voltar para lá.";
  - quadro feito: o pedaço dele ganha a cor inteira. Na festa, a cor escorre em 2,4 s
    (`DURACAO_DA_TINTA_S`);
  - quadro sem desafio publicado: o pedaço já vem colorido, para a criança nunca ficar presa num
    cinza sem ter o que fazer. Ilha sem nenhum desafio fica toda colorida;
  - desafios desligados ou serviço fora do ar: a ilha toda colorida (como antes dos desafios);
  - entre dois pedaços a cor se mistura numa faixa (`BORDA_DOS_PEDACOS`), e bem no meio da ilha
    vale a média dos seis.
  A mesma tinta vale para a versão leve, a completa e as copas que esmaecem.
- **Plataforma de mentira** (`src/plataforma/desafios-falsos.ts`): no playground, o Bosque tem o
  quadro 1 pronto, o 2 esperando o curso Repetições e o 3 feito. "Fazer o desafio" conclui em
  0,4 s. Com `desafios: 'desligados'`, responde 403.

## 8. Cartões dos Lumis

Arquivo: `arquipelago-contracts/src/cartas-lumi.ts`, constante `CARTAS_LUMI`. O catálogo fica no
código, não no Admin, porque o que cada cartão faz na rotina é código do jogo.

| Cartão | Tipo | Bloco do Estúdio que libera |
|---|---|---|
| Quando amanhecer | quando | nenhum, sempre disponível |
| Quando anoitecer | quando | nenhum, sempre disponível |
| Voar até | ação | nenhum, sempre disponível |
| Regar | ação | nenhum, sempre disponível |
| Colher | ação | nenhum, sempre disponível |
| Guardar tudo | ação | nenhum, sempre disponível |
| Repetir | controle | `sz_js_repeat` |
| Para cada | controle | `sz_js_for_each` |
| Enquanto | controle | `sz_js_while` |
| Se | controle | `sz_js_if_else` |
| Escolha | controle | `sz_js_switch` |
| Esperar | controle | `sz_js_set_timeout_seconds` |
| Guardar na memória | controle | `sz_js_var_create` |
| Contar mais um | controle | `sz_js_var_increment` |

- **Quem tem cada cartão** (`cartaConquistada`):
  - cartões sem bloco ficam com todos;
  - cartões de controle ficam com quem conquistou o bloco num curso, com a mesma fonte dos
    desafios;
  - a equipe tem todos.
- **A rota** é `GET /arquipelago/cartas` (`arquipelago-api/src/application/servico-das-cartas.ts`).
  Ela exige a política de acesso liberada. Para os cartões que faltam, ela traz o "Aprenda isso
  em".
- **No Admin,** a cobertura mostra de onde se aprende cada cartão. Para cartão, o aviso
  `curso-depois-da-ilha` usa a Lenda (`god`) como limite.
- **Members fora ou não configurado:** 424.
- **Comunidade adulta** (conferido de ponta a ponta em 28/10/2026): a mesma régua, com os blocos
  e os cursos adultos. O jogador sem perfil e sem contexto do Kids é adulto
  (`arquipelago-api/src/interfaces/http/identidade.ts`); o serviço pergunta ao Members com
  `audience: 'adult'` e a própria conta (`leituras-dos-membros.ts`). No Members, os blocos
  conquistados (`GetStudioUnlocksService.read`) só contam cursos do mesmo público
  (`courses.audience` e `xp_events.audience` em `studio-unlock-eligibility.ts`, e as concessões
  congeladas por público), e o "Aprenda isso em" usa os cursos adultos publicados com o posto do
  currículo adulto (`arquipelago-reads.service.ts`). Um bloco que só existe em curso Kids não
  conta nem é sugerido ao adulto. Testes: `arquipelago-api/tests/integration/http.test.ts`
  ("cartões dos Lumis na comunidade adulta"), `members/tests/application/arquipelago-reads.test.ts`
  e `members/tests/db/studio-unlock-eligibility.test.ts` (SQL real, Postgres local). Não houve
  conserto a fazer no código.

### 8.1 O caderno dos Lumis no jogo

Arquivos: `arquipelago/src/sistemas/caderno-dos-lumis.ts` (regra pura),
`src/estado/cartas.ts` (loja, uma por montagem) e `src/interface/caderno-dos-lumis.tsx` (o painel).

- **Abrir:** no menu do jogo, "📒 Caderno dos Lumis". O menu fecha e o caderno abre por cima; o
  personagem fica parado (`painelAberto`). Esc ou "Voltar ao jogo" fecha.
- **Cada abertura lê `GET /cartas` de novo**, porque um curso concluído no meio do jogo libera
  cartões novos. Quem tem cada cartão vem sempre do serviço; o jogo só arruma para a tela.
- **Três seções, nesta ordem:** Quando ("A hora em que a rotina começa."), Ação ("O que o Lumi faz
  na ilha.") e Controle ("Os mesmos blocos do Estúdio. Cada um chega quando você aprende o bloco
  num curso."). Cada seção mostra quantos cartões estão prontos ("Controle: 2 de 8"), e o topo
  diz "Você tem 8 de 14 cartões. Com eles você vai montar as rotinas dos Lumis.".
- **Cada cartão:** nome, o que faz e a situação:
  - na mão: "Pronto para usar";
  - faltando, com curso: "Aprenda isso em:" e o primeiro curso da lista do serviço (o do posto
    mais cedo);
  - faltando, sem curso publicado que ensine o bloco: "Nenhum curso ensina este cartão por
    enquanto.".
- **Fechado:** 403 (jogo bloqueado para a pessoa) diz "O caderno ainda não abriu para você.".
  Serviço ou Members fora (424, rede, resposta estranha) diz que não conseguiu ler e oferece
  "Tentar de novo". Uma leitura que falha não apaga a coleção que já estava na tela.
- **Comunidade adulta:** o mesmo painel e os mesmos textos (o jogo não tem pele adulta); os cursos
  do "Aprenda isso em" são os adultos, porque vêm do serviço.
- **Fica para a Fase 2:** montar a rotina com os cartões e o Lumi executar. O caderno só mostra a
  coleção.
- **Plataforma de mentira** (`src/plataforma/cartas-falsas.ts`, mesma régua do contrato): no
  playground a pessoa tem Repetir e Se; Esperar não tem curso; no adulto os cursos levam
  "(adulto)" no nome. `?cartas=todas` dá a visão da equipe, `?cartas=desligadas` responde 403 e
  `?cartas=fora-do-ar` 424.

## 9. Moedas e prêmios

### 9.1 Valores por desafio

| Regra | Valor | Arquivo e nome |
|---|---|---|
| Padrão do prêmio principal | 20 moedas | `arquipelago-contracts/src/desafios.ts`, `MOEDAS_PADRAO.principal` |
| Padrão do extra | 10 moedas | `MOEDAS_PADRAO.extra` |
| Máximo do principal | 100 moedas | `LIMITES_DO_DESAFIO.moedas` |
| Máximo do extra | 50 moedas | `LIMITES_DO_DESAFIO.moedasExtra` |

- **Prêmio 0:** o Admin pode pôr 0. O prêmio fica `nenhuma` e nada é cobrado.
- **O valor pago** é o da revisão em que a pessoa concluiu o principal, para os dois prêmios. O
  valor fica gravado em `desafios_concluidos`. Se a equipe mudar o prêmio depois, quem já concluiu
  recebe o valor antigo, inclusive no extra feito mais tarde.

### 9.2 O teto semanal

Arquivo: `members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository.ts`,
constante `ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS = 150`.

- **A semana:** de segunda a domingo, no horário de São Paulo
  (`date_trunc('week', ...)` no fuso `America/Sao_Paulo`).
- **O que conta:** a soma dos créditos do Arquipélago na semana, por pessoa e por público.
- **Tudo ou nada:** se o prêmio inteiro não cabe no que sobra da semana, nada é pago e o Members
  responde `WEEKLY_LIMIT`. O prêmio nunca é pago pela metade.
- **Separado do teto dos cursos.** O teto diário de 100 moedas dos cursos (`DAILY_COIN_CAP`, em
  `members/src/domain/gamification/coins.ts`) não inclui as moedas do jogo
  (`applyDailyCap`).

### 9.3 A conta que levou ao 150

Decisão de 27/10/2026. Os valores dos cursos estão em `members/src/domain/gamification/coins.ts`
(`COIN_VALUES`, `quizPassedCoins`) e em `members/src/domain/gamification/missions.ts`.

| Atividade nos cursos | Moedas |
|---|---|
| Aula concluída | 5 (`LESSON_COMPLETE`) |
| Quiz aprovado | 10 a 15 (`QUIZ_PASSED_BASE` 10 mais até 5 de bônus pela nota) |
| Objetivos do Estúdio aprovados | 15 (`quizPassedCoins(100)`) |
| Baú do fim do módulo | 15 (`UNIT_COMPLETE`) |
| Missões | diárias de 10 a 15; semanais e mensais com valores maiores (`missions.ts`) |

- **Quem estuda com regularidade** ganha entre 150 e 300 moedas por semana nos cursos.
- **Quem usa muito** chega a cerca de 700 por semana, limitado pelo teto diário (7 dias × 100).
  Os marcos de sequência de dias ficam fora do teto diário.
- **O jogo dá no máximo metade** do que ganha quem estuda com regularidade (cerca de 300 por
  semana). Por isso o teto é 150, e os cursos continuam sendo a fonte principal de moedas.
- **Gasto só cosmético.** São 138 itens pagos de avatar e de quarto, de 30 a 300 moedas, com
  mediana de 70:
  - 74 peças do avatar, em `members/src/domain/avatar/avatar3d-catalog.ts`;
  - 64 do quarto (móveis, decoração, temas, pisos e iluminação), em
    `members/src/domain/room/room-catalog.ts`.

### 9.4 Cada prêmio é pago uma vez

Arquivo: `arquipelago-api/src/domain/desafios.ts`, função `chaveDasMoedas`.

- **A chave:** cada prêmio tem uma chave fixa, um UUIDv5 de jogador + desafio + qual prêmio
  (`principal` ou `extra`). O espaço de nomes é fixo (`NAMESPACE`).
- **Repetir não paga de novo.** Repetir ou reenviar manda sempre a mesma chave. O Members não
  paga duas vezes: a mesma chave com o mesmo valor devolve "já pago".
- **A mesma chave com outro valor** é recusada (`KEY_CONFLICT`).
- **No serviço do jogo,** a conclusão e o extra também são gravados uma vez só
  (`concluir`, `marcarExtra`).

### 9.5 As situações de um prêmio

Arquivo: `arquipelago-api/src/domain/desafios.port.ts`, tipo `SituacaoDasMoedas`.

| Situação | Quando |
|---|---|
| `nenhuma` | prêmio 0, ou o extra ainda não foi feito |
| `pendente` | ganhou e ainda não foi confirmado pelo Members |
| `creditado` | o Members confirmou, agora ou antes, com a mesma chave |
| `teto` | o teto da semana estava cheio; a semana fica em `moedas_teto_semana` (ou `moedas_extra_teto_semana`) |

### 9.6 Quando bate no teto

Arquivo: `arquipelago-api/src/application/servico-dos-desafios.ts`, método `cobrarPendentes`.

- **O prêmio não se perde.** Ele fica em `teto`, com a semana anotada (`semanaDeSaoPaulo`: a
  segunda-feira da semana, em São Paulo).
- **Na mesma semana,** não se tenta de novo.
- **Numa semana seguinte,** o prêmio volta a ser cobrado.
- **Bateu no teto, para tudo:** depois de um `teto`, o serviço não tenta os outros prêmios
  daquela vez, porque o teto vale para todos eles naquela semana.

### 9.7 Quando a cobrança acontece

- **Ao ler a lista de desafios:** até 3 prêmios por leitura (`COBRANCAS_POR_LISTA = 3`). O resto
  fica para a próxima.
- **Ao concluir ou fazer o extra:** os prêmios daquele desafio, até 2, na hora.
- **Prazo da porta de moedas:** 5 segundos (`TEMPO_DAS_MOEDAS_MS`, em
  `arquipelago-api/src/infrastructure/members/moedas-http.ts`). Pagar nunca segura a resposta do
  jogo.
- **Suporte não dispara cobrança.**

### 9.8 Members fora do ar

- **Porta de moedas sem resposta** (rede, prazo ou resposta estranha): o prêmio fica `pendente`
  e é cobrado de novo na próxima leitura ou conferência. A cobrança para naquela vez.
- **Recusa definitiva** (por exemplo, dono diferente ou chave com outro valor): vai ao log
  `arquipelago.moedas_recusadas` e o prêmio continua `pendente`.
- **Sem `ARQUIPELAGO_COINS_TOKEN`:** a porta de moedas não existe e todos os prêmios ficam
  `pendente`, esperando a configuração.
- **Leituras do Members fora** (posição, blocos, currículo, conferência): os desafios e os cartões
  respondem 424, e o resto do jogo segue (salvamento, tempo livre, acesso).
- **Prazos das leituras** (`arquipelago-api/src/infrastructure/members/membros-http.ts`):
  - 5 segundos por leitura (`TEMPO_DA_LEITURA_MS`);
  - 160 segundos para conferir um projeto (`TEMPO_DA_CONFERENCIA_MS`).
- **Cache das leituras** (`arquipelago-api/src/application/leituras-dos-membros.ts`):
  - currículo de blocos: 5 minutos (`VALIDADE_DO_CURRICULO_MS`);
  - posição e blocos da pessoa: 30 segundos (`VALIDADE_DO_JOGADOR_MS`);
  - no máximo 5.000 pessoas no cache (`MAXIMO_DE_JOGADORES`), e a mais antiga sai primeiro;
  - falha não fica no cache.

## 10. Onde mudar cada número

| Regra | Valor atual | Arquivo e nome |
|---|---|---|
| Ilha → posto | tabela da seção 2 | `arquipelago-contracts/src/ilhas.ts`, `MAPA` |
| Ordem dos postos | 8 postos | `arquipelago-contracts/src/ilhas.ts`, `POSTOS_DA_JORNADA` |
| Posições da jornada | 8 | `arquipelago-contracts/src/ilhas.ts`, `POSICOES_DA_JORNADA` |
| Farol aceso | posição 8 | `arquipelago/src/mundo/farol.tsx`, `aceso` |
| Chegada da cor na ilha | 4,5 s | `arquipelago/src/mundo/anel.tsx`, `DURACAO_DA_CHEGADA_MS` |
| Modo do jogo | aberto em dev, desligado em deploy | `arquipelago-api/src/infrastructure/config/env.ts`, `ARQUIPELAGO_MODO` |
| Públicos | `kids` | `env.ts`, `ARQUIPELAGO_PUBLICOS` |
| Lista | vazia | `env.ts`, `ARQUIPELAGO_LISTA` |
| Desafios ligados | aberto em dev, desligado em deploy | `env.ts`, `ARQUIPELAGO_DESAFIOS` |
| Papéis da equipe | superadmin, admin, staff | `arquipelago-api/src/domain/jogador.ts`, `PAPEIS_DA_EQUIPE` |
| Quem escreve desafios | superadmin, admin | `arquipelago-api/src/interfaces/http/identidade.ts`, `PAPEIS_QUE_ESCREVEM_DESAFIOS` |
| Tempo livre padrão | 30 min | `arquipelago-contracts/src/limites.ts`, `LIMITE_DIARIO_PADRAO_MINUTOS` |
| Tempo livre mínimo | 10 min | `limites.ts`, `LIMITE_DIARIO_MINIMO_MINUTOS` |
| Tempo livre máximo | 240 min | `limites.ts`, `LIMITE_DIARIO_MAXIMO_MINUTOS` |
| Passo do tempo livre | 5 min | `limites.ts`, `LIMITE_DIARIO_PASSO_MINUTOS` |
| Perfis por leitura do cartão dos pais | 20 | `arquipelago-contracts/src/api.ts`, `PERFIS_DA_FAMILIA_MAXIMO` |
| Lote de tempo | 10 s | `arquipelago/src/sistemas/armazem-tempo.ts`, `TAMANHO_LOTE` |
| Segundos por envio de tempo | 1 a 120 | `arquipelago-contracts/src/api.ts`, `RegistrarTempoSchema` |
| Teto de tempo por dia | 86.400 s | `arquipelago-api/src/infrastructure/persistence/drizzle/repositorio.ts`, `TETO_DO_DIA` |
| Teto do salvamento | 64 KB | `arquipelago-contracts/src/salvamento.ts`, `SALVAMENTO_MAX_BYTES` |
| Corpo das chamadas do jogo | 96 KB | `env.ts`, `MAX_REQUEST_BODY_BYTES` |
| Intervalo do salvamento | 20 s | `arquipelago/src/sistemas/salvar.ts`, `intervaloMs` |
| Salvamento inicial | tabela da seção 5 | `salvamento.ts`, `criarSalvamentoInicial` |
| Duração do dia do jogo | 16 min | `arquipelago/src/sistemas/tempo-do-dia.ts`, `DURACAO_DO_DIA_MS` |
| Parte clara do dia | 75% | `tempo-do-dia.ts`, `PARTE_CLARA` |
| Queda das necessidades | fome 2, energia 1,2, diversão 1 por minuto | `arquipelago/src/sistemas/necessidades.ts`, `QUEDA_POR_MINUTO` |
| Energia depois do cochilo | 60 | `arquipelago/src/estado/relogios.tsx` |
| Humor e ritmo | 15 e 60; 1,1, 1, 0,8 | `necessidades.ts`, `humor` e `ritmo` |
| Crescimento da horta | 3, 5 e 8 min | `arquipelago/src/sistemas/horta.ts`, `CRESCIMENTO_MS` |
| Colheita | 2, 3 e 2 | `horta.ts`, `COLHEITA` |
| Comida dos itens | tabela da seção 6.4 | `arquipelago/src/sistemas/itens.ts`, `ITENS` |
| Receitas | tabela da seção 6.5 | `arquipelago/src/sistemas/receitas.ts`, `RECEITAS` |
| Velocidades do personagem | 2,2, 4,6 e 2,6 | `arquipelago/src/sistemas/corpo.ts` (`CORPO.andar`, `CORPO.correr`) e `personagem.tsx` (`NADAR`) |
| Ciclos de andar e correr | 0,43 s e 0,62 m; 0,37 s e 1,3 m | `arquipelago/arte/avatar/locomocao.py` (`ANDAR`, `CORRER`) e `src/sistemas/locomocao.ts` (`CICLO_DE_ANDAR`, `CICLO_DE_CORRER`), sempre os dois juntos |
| Transições das animações | 0,18, 0,12 e 0,3 s | `arquipelago/src/sistemas/locomocao.ts`, `TRANSICAO` |
| Posição do Zappy | 0,75, 0,35 e 1,3 | `arquipelago/src/sistemas/zappy.ts`, `LADO_DO_ZAPPY`, `ATRAS_DO_ZAPPY`, `ALTURA_DO_ZAPPY` |
| Controle da câmera | 7° a 72°, 4 a 18 m, dois toques em 0,32 s | `arquipelago/src/mundo/medidas.ts`, `CONTROLE_DA_CAMERA` |
| Câmera | seção 6.8 | `arquipelago/src/mundo/medidas.ts`, `GRUA_DA_CAMERA`, `CAMERA_NO_ALTO` e vizinhos |
| Troca da ilha completa | 30 do centro, 0,8 s | `medidas.ts`, `DISTANCIA_DA_TROCA`, `DURACAO_DA_TROCA` |
| Percursos guardados | `bosque-copas` | `arquipelago-contracts/src/salvamento.ts`, `PERCURSOS` |
| Controle no ar com embalo | 45% | `arquipelago/src/personagem/personagem.tsx`, `CONTROLE_NO_AR` |
| Mãos no cipó | corda ao lado esquerdo do rosto, 0,24 para o lado e 0,4 à frente, a 1,2 do pé; corpo 0,3 rad para trás | `arquipelago/src/personagem/bracos.ts`, `CORDA_NO_CORPO`, `INCLINACAO_NO_CIPO` |
| Física dos cipós | 18 elos, raio 0,06, 12 voltas por passo | `arquipelago/src/sistemas/cordas.ts`, `CORDAS` |
| Corpo que as cordas enxergam | tronco de 0,45 a 1,05 do pé, raio 0,37; cabeça a 1,7, raio 0,45 | `arquipelago/src/sistemas/corpo.ts`, `CORPO.desenho` |
| Câmera no cipó | 55% para o meio do cipó; 100% com menos movimento | `arquipelago/src/personagem/camera.tsx`, `FOCO_NO_CIPO`, `FOCO_NO_CIPO_COM_MENOS_MOVIMENTO`, `SEGUIR_NO_CIPO` |
| Pegar o cipó | 1,3 no chão, 0,65 no ar, 0,45 s para pegar de novo | `arquipelago/src/sistemas/cipo.ts`, `CIPO.raioDaDica`, `.raioDaPegadaNoAr`, `.esperaParaPegarDeNovo` |
| Onde as mãos seguram o cipó | pés a 0,35 do chão; nunca menos de 1,6; mãos 0,3 acima do centro | `cipo.ts`, `CIPO.folgaDosPes`, `.comprimentoMinimo`, `.maosAcimaDoCentro` |
| Balanço do cipó | bombear 9, virar 1 por s, até 1,1 rad | `cipo.ts`, `CIPO.bombear`, `.giroDoBalanco`, `.anguloMaximo` |
| Perda do balanço | 0,12 segurando, 0,8 solto (na corda solta) | `cipo.ts`, `CIPO.amortecimento`, `.amortecimentoSolto` |
| Soltar o cipó | 1,15 vez o balanço, mais 3,2 para cima | `cipo.ts`, `CIPO.impulsoAoSoltar`, `.subidaAoSoltar` |
| Tronco de escalar | árvore dos cipós, raio 0,86 a 0,5 | `arquipelago/src/mundo/bosque.ts`, `TRONCO_DOS_CIPOS` |
| Grudar no tronco | a 0,3, depois de 0,2 s | `arquipelago/src/sistemas/escalada.ts`, `ESCALADA.distanciaParaGrudar`, `.esperaParaGrudar` |
| Subir e dar a volta | 1,7 e 1,6 por segundo | `escalada.ts`, `ESCALADA.subir`, `.deLado` |
| Alturas da escalada | 0,95 acima do pé; mãos 1,4 abaixo do topo | `escalada.ts`, `ESCALADA.acimaDoChao`, `.abaixoDoTopo` |
| Pulo do tronco | 4,5 para fora, 6,5 para cima | `escalada.ts`, `ESCALADA.saltoParaFora`, `.saltoParaCima` |
| Placa da largada | ao lado do pé da escada | `arquipelago/src/mundo/bosque.ts`, `PLACA_DA_LARGADA` |
| Vagalumes do percurso | 5, pegos a 0,8 | `bosque.ts`, `VAGALUMES_DAS_COPAS`; `arquipelago/src/sistemas/percurso.ts`, `PERCURSO_DAS_COPAS.vagalumes`, `.raioDoVagalume` |
| Tempo-alvo (segunda estrela) | 24 s | `percurso.ts`, `PERCURSO_DAS_COPAS.tempoAlvoMs` |
| Corrida mais longa (e melhor tempo guardado) | 1 hora | `arquipelago-contracts/src/salvamento.ts`, `MELHOR_TEMPO_MAXIMO_MS` |
| Pontos de volta | 4 deques; 0,7 para dentro da borda | `bosque.ts`, `RAIOS_DOS_DEQUES`, `VOLTA_PARA_DENTRO_DO_DEQUE` |
| Chegada e desistência | 1,4 do fim do escorregador; 7 da largada | `percurso.ts`, `PERCURSO_DAS_COPAS.raioDaChegada`, `.distanciaParaDesistir` |
| Corte suave | 0,26 s e 0,34 s | `percurso.ts`, `PERCURSO_DAS_COPAS.corteSaiMs`, `.corteVoltaMs` |

| Colisão das peças | seção 6.14 | `arquipelago/src/mundo/colisao-da-ilha-central.ts`, os scripts de `arquipelago/arte` e `colisores-da-ilha.ts`, `SO_PARA_O_CORPO` |
| Quadros por ilha | 6 | `arquipelago-contracts/src/desafios.ts`, `QUADROS_POR_ILHA` |
| Lugar e alcance do Quadro das Cores | 3,2 e 2,4 m; 2,6 m | `arquipelago/src/mundo/quadro-das-cores.tsx`, `LUGAR_DO_QUADRO`, `ALCANCE_DO_QUADRO` |
| Pedaços da ilha | 30% ao abrir a ponte; 2,4 s de tinta; borda de 18% | `arquipelago/src/sistemas/cor-da-ilha.ts`, `COR_AO_ABRIR`, `DURACAO_DA_TINTA_S`, `BORDA_DOS_PEDACOS` |
| Festa da cor | 1,6 s na mancha; 4 s até avisar o serviço | `quadro-das-cores.tsx`, `DURACAO_DA_COR_S`; `arquipelago/src/interface/quadro-das-cores.tsx`, `FESTA_MS` |
| Limites do cadastro | seção 7.2 | `desafios.ts`, `LIMITES_DO_DESAFIO` |
| Moedas padrão | 20 e 10 | `desafios.ts`, `MOEDAS_PADRAO` |
| Máximo de moedas por desafio | 100 e 50 | `desafios.ts`, `LIMITES_DO_DESAFIO.moedas` e `.moedasExtra` |
| Teto semanal de moedas do jogo | 150 | `members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository.ts`, `ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS` |
| Teto diário dos cursos | 100 | `members/src/domain/gamification/coins.ts`, `DAILY_COIN_CAP` |
| Prêmios cobrados por leitura da lista | 3 | `arquipelago-api/src/application/servico-dos-desafios.ts`, `COBRANCAS_POR_LISTA` |
| Prazo da porta de moedas | 5 s | `arquipelago-api/src/infrastructure/members/moedas-http.ts`, `TEMPO_DAS_MOEDAS_MS` |
| Cache do currículo | 5 min | `arquipelago-api/src/application/leituras-dos-membros.ts`, `VALIDADE_DO_CURRICULO_MS` |
| Cache da pessoa | 30 s | `leituras-dos-membros.ts`, `VALIDADE_DO_JOGADOR_MS` |
| Cartões dos Lumis | tabela da seção 8 | `arquipelago-contracts/src/cartas-lumi.ts`, `CARTAS_LUMI` |

## 11. Diferenças encontradas entre documentação e código

O levantamento de 27/10/2026 achou dez pontos em que a documentação ou um comentário do código
dizia outra coisa. Todos foram corrigidos no mesmo dia, seguindo o código:

1. `docs/plans/2026-10-27-arquipelago-desafios.md` (linha "Moedas"): o teto semanal passou de 100
   para 150, e o prêmio que bate no teto é cobrado de novo numa semana seguinte (antes dizia que
   não era cobrado de novo).
2. `docs/arquipelago.md` ("Ligado e pendente", item 2): o serviço do jogo já paga as moedas dos
   desafios pela porta do Members.
3. `packages/arquipelago-api/CLAUDE.md` ("Deploy"): o serviço já está registrado em `.railway/` e
   no gateway; o que falta é provisionar e validar.
4. `packages/arquipelago-contracts/CLAUDE.md`: a lista ganhou `desafios.ts`, `aprenda.ts`,
   `cartas-lumi.ts` e os cartões em `api.ts`.
5. `packages/arquipelago/CLAUDE.md` (`sistemas/`): a lista ganhou câmera, Zappy, ilhas completas
   e os dois arquivos do tempo livre.
6. "10 conferências por minuto por pessoa": hoje é o limite da rota `arquipelago-desafio-verificar`
   no gateway (`packages/api-gateway/src/infrastructure/config/arquipelago-routes.ts`); o plano
   passou a dizer isso.
7. Comentário de `LIMITES_DO_DESAFIO.moedas`: 150 por semana.
8. Comentário de `teto` em `arquipelago-api/src/domain/moedas.port.ts`: tenta de novo numa semana
   seguinte.
9. Comentário de `RegistrarTempoSchema.segundos`: lotes de até 10 s, e também ao esconder a aba ou
   fechar o jogo.

Na mesma data, com o cipó, a escalada e o percurso nas copas:

10. Este documento dizia "Versão: `VERSAO_SALVAMENTO = 1`". O salvamento passou para a V2 (com os
    percursos) e a seção 5 foi atualizada, assim como `docs/arquipelago.md`, o `CLAUDE.md` do jogo
    e o do contrato.
11. A seção 6.6 tratava o avatar como sempre na mesma pose. No cipó e no tronco os braços sobem,
    e o giro do corpo passou a ser aplicado antes da inclinação (`rotation.order = 'YXZ'`): nadar
    agora inclina para a frente do avatar em qualquer direção (antes, inclinava em volta do eixo x
    do mundo).

Se aparecer outra diferença, vale o código: corrija o documento e anote aqui.

## Conferência do escorregador, física viva etapa 3

O modo existente foi preservado. `tests/modos.test.ts` compara a descida, a posição final e o embalo em 30, 60 e 144 quadros por segundo, sempre com passos físicos de 1/60 s. A sala `/movimento?estacao=Escorregador` permite conferir a entrada e a saída no controlador real.

## Pontes vivas, etapa 4

As três pontes do Bosque cedem até 0,10 m e balançam até 0,025 m. A mola usa rigidez 32 e amortecimento 9, com velocidade vertical limitada a 0,3 m/s. As pontas têm deslocamento zero. As caixas contínuas do piso e dos corrimãos são plataformas cinemáticas marcadas por `plataformaDoMundo`, aceitas pelo controlador sem fazer o bicho adotado bloquear o caminho. Desenho e colisão usam a mesma deformação. Arquivos: `sistemas/pontes-vivas.ts` e `mundo/pontes-vivas.tsx`.

A ponte usa uma mola limitada com duas pontas fixas, em vez de adaptar a corda dos cipós, que tem uma ponta presa e outra livre. Isso mantém o percurso previsível. O GLB atual já fornece âncoras e caixas suficientes. Nada precisa ser regerado nesta etapa. O medidor, dentro de `Physics`, passa a informar `fisica.corposAtivos`, `fisica.passoMs` e `pontes`.


### Física viva: mecanismos (28/10/2026)

`mundo/mecanismos.tsx` usa duas dobradiças Rapier, com limites e mola. A porta abre pelo empurrão normal do controlador. A placa lê o caixote apoiado, não a proximidade do personagem. O chão sob o alçapão fica inteiro. Colisores simples e fora do grupo da câmera. A porta tem folga acima da placa para não prender a dobradiça.

A estação Mecanismos em `/movimento` funciona com a arte atual. No Bosque, só montar quando existirem `mecanismos-casa` e `mecanismos-rumo`. O script `arte/ilhas/bosque.py` cria as âncoras e paredes com vão. Falta regerar o GLB e conferir a casa após a outra sessão terminar a arte. Não montar a porta sobre a casa fechada antiga.


### Física viva: vento (28/10/2026)

O campo puro `sistemas/vento.ts` e sua versão GLSL usam a mesma conta. A hora vem do relógio do jogo; rajadas variam no espaço. `vegetacao-ao-vento.ts` encadeia os shaders existentes de pintura e pontes, incluindo cópias transparentes. Só deforma materiais de plantas e galhos altos, com raiz parada. Movimento reduzido usa 20% da amplitude visual, sem mudar a física.

Cipós livres recebem vento no passo fixo. O tronco do lago recebe força proporcional à parte exposta. Duas peças soltas tocáveis (folha e pena) têm arrasto e dormem ao cair. Folhas presas nas árvores e capim não têm corpos. Tudo monta apenas com o Bosque ativo, sem novos GLBs.


### Física viva: materiais e fogo (28/10/2026)

`sistemas/estados-dos-materiais.ts` guarda umidade, calor e combustível. A grade usa acumulador criado antes da simulação e lê todos os estados antes de propagar. Só passa calor entre peças do mesmo recinto. `MATERIAIS` concentra ignição, duração, calor e secagem. Pedra não acende; água zera o calor e apaga imediatamente.

A fogueira de `mundo/fogueira-viva.tsx` tem quatro peças dentro das pedras e um balde acessível. Só ilumina. Não causa dano nem consome inventário. Casas e plantas não são cadastradas no fogo. Posição no Bosque: `FOGUEIRA_DO_BOSQUE`, com teste de passagem contra o GLB. Estados transitórios reiniciam ao remontar a ilha. Modelos de arte não foram modificados nesta etapa.


### Física viva: mundo que reage (28/10/2026)

`objetos-reativos.tsx` monta quatro peças soltas no Bosque ativo. O controlador empurra os corpos dinâmicos, sem reposicionar o desenho para fingir empurrão. Colisores simples, peças paradas dormem e quedas para fora da ilha têm retorno. O galho baixo fora das copas quebra ao pisar; duas partes já montadas substituem o corpo inteiro, sem gerar geometria no passo. As posições ficam em `bosque.ts` e são conferidas contra o GLB.

`mundo-reativo.ts` guarda um conjunto fixo de 16 ondas. `ondinhas.tsx` lê a entrada e o deslocamento da criança e do tronco, desenha em uma malha instanciada e recorta no limite do lago. Não há simulação de fluido nem partículas criadas por quadro. Movimento reduzido baixa a opacidade. Estados transitórios pertencem à ilha ativa. Estações Peças soltas e Galho seco em `/movimento` usam as mesmas peças.

A casa da etapa 5 segue pendente de regeneração do `bosque.glb` pela sessão da arte. Código pronto não equivale a mecanismo já visível no modelo antigo. O plano da física viva registra medições, notas do cartão e a conferência que falta em celular físico.
