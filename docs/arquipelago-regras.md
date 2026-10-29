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
  - Fechada, a ponte tem só o primeiro quarto, do lado da sua ilha (`TRECHO_QUEBRADO = 0,25`,
    `mundo/medidas.ts`), com a placa no fim. Ao abrir, ela cresce do fim desse trecho até a ilha
    (`fracaoMontada`), e o chão que segura o corpo acompanha as tábuas: quem está em cima do
    trecho quebrado continua de pé durante a montagem (antes, o chão da ponte sumia nos 4,5 s e a
    criança caía na água). Os corrimãos entram quando ela termina.
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
| Responsável do Kids | contexto `parent`, na própria conta | não joga; lê e muda o limite diário e as permissões de visita da família, lê a semana das crianças, e só vê o cartão do jogo se alguma criança da conta vê o jogo |
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

### O cartão do Arquipélago na área dos pais

O cartão "Arquipélago Vagalume" da Família (a semana das crianças, o tempo livre por dia e as
permissões de visita) só aparece para a família em que pelo menos uma criança vê o jogo
(28/10/2026). A semana e as permissões estão na seção seguinte.

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

### A semana das crianças e as permissões de visita (fase1-18, 28/10/2026)

O mesmo cartão mostra, para cada criança que vê o jogo, o que ela fez nos últimos dias, e guarda
com quem as crianças da conta podem interagir. Contrato em `arquipelago-contracts/src/familia.ts`;
serviço em `arquipelago-api/src/application/servico-da-familia.ts` e regra pura em
`domain/semana-da-familia.ts`.

**A semana** (`GET /arquipelago/familia/semana?perfis=`, só o responsável, só leitura):

- **A janela:** hoje e os 6 dias anteriores, pelo dia de São Paulo (o mesmo dia do tempo livre).
  O cartão escreve "Dos últimos 7 dias, de 22/10 a 28/10."
- **Quem aparece:** os perfis que o BFF manda (os mesmos do limite) e que veem o jogo pela
  `decidirAcesso`. Desses, só são lidos os que o serviço já viu guardar o jogo NESTA conta.
- **A posse da criança:** a tabela `perfis_da_conta` (migração 0008) liga o perfil à conta que vem
  do login da própria criança (`x-auth-account-id`), gravada uma vez na primeira gravação aceita do
  salvamento. Pedir a semana com o id de uma criança de outra conta devolve essa criança em
  `aindaSemJogo`, sem nenhum número. Quem jogou antes desta versão entra na próxima gravação; até
  lá o cartão diz "Ainda sem números do jogo. Eles aparecem quando a criança jogar."
- **Desafios do Estúdio aprovados:** as primeiras conclusões (o principal passou) com a data na
  janela. "De ilhas anteriores" são as de ilhas antes da ilha mais nova aberta para a criança
  (pela posição dela na jornada, lida do Members). Sem a jornada, esse número fica `null` e o
  cartão não o escreve. Com os desafios desligados (`ARQUIPELAGO_DESAFIOS`, ou `equipe` numa
  família de fora), a linha inteira some (`desafios: null`).
- **Objetos criados:** os projetos azuis do salvamento com a aparência vinda do Pinta e do Molda
  (`projetos[id].aparencia.origem`). O salvamento não guarda quando a aparência foi feita, então é
  o total DESDE O COMEÇO, e o cartão diz isso. Salvamento que não abre: `objetos: null`, sem linha.
- **Tempo livre:** os segundos de `tempo_diario` da criança na janela e em quantos dias, escritos
  ao lado do limite diário que vale agora ("2 h 13 min em 4 dias (limite de 45 min por dia).").
- **Nomes:** o serviço do jogo nunca sabe nomes. O BFF põe o nome da grade de perfis do Auth e
  descarta qualquer id que não esteja na grade.
- **Voltou ao curso depois de jogar (29/10/2026):** em quantos dias da janela ela concluiu uma
  aula do curso até 24 horas depois de uma sessão no jogo terminar (`HORAS_DA_VOLTA_AO_CURSO`, no
  contrato; regra pura `diasDeVoltaAoCurso`).
  - **As sessões** vêm do próprio jogo: cada linha de `sessoes_de_tempo` guarda o começo
    (`criado_em`) e até onde o tempo foi contado (`cursor`), que é o fim de cada vez que ela
    jogou. Sessão que abriu e não contou tempo não conta. O dia é o do fim da sessão, em São Paulo.
  - **As aulas** vêm do Members: `GET /members/internal/arquipelago/aulas-concluidas?usuarios=&de=&ate=`
    (token de leitura do jogo, até 20 pessoas e 9 dias) devolve a hora de cada aula CONCLUÍDA
    (`lesson_completions.completed_at`). Aula só aberta não conta: concluir é o sinal de verdade.
    O serviço do jogo faz uma ida só para a família toda, do fim da primeira sessão até agora.
  - A aula precisa vir DEPOIS do fim da sessão (durante a sessão não conta) e até 24 horas.
  - O cartão diz o fato, nunca a causa. Desde 29/10/2026 a semana aparece em ladrilhos: o da volta
    ao curso mostra "2 de 4" com "dias de jogo com aula concluída depois" e "aula do curso, até
    24 h depois de jogar".
  - **A Medição da equipe usa a mesma conta** (a mesma regra e a mesma rota do Members, somadas):
    "Dias de jogo" (cada criança em cada dia) e "Com aula concluída depois". Só entram sessões com
    as 24 horas já passadas, e grupos com menos de 5 crianças viram "Poucos dados". As leituras
    vão em lotes de 20 crianças e 9 dias; com leituras demais (mais de 200) ou com o Members fora,
    o número não aparece e a lista "O que estes dados ainda não mostram" explica.
  - **Na dúvida, some:** Members não ligado ou fora do ar dá `voltaAoCurso: null` e a linha não
    aparece; sem tempo de jogo na janela também não. O campo é opcional no contrato para o serviço
    e o app subirem em qualquer ordem.

**As permissões de visita** (`GET` e `PUT /arquipelago/familia/permissoes`, só o responsável),
ECA Digital (Lei 15.211/2025, art. 21): restrito por padrão, quem libera são os pais.

| Permissão | Padrão | Campo |
|---|---|---|
| Visitas de irmãos | ligada | `visitasDeIrmaos` |
| Visitas de outras crianças | desligada | `visitasDeOutrasCriancas` |
| Fotos no Clube | desligada | `fotosNoClube` |

- São da conta (`permissoes_da_familia`), valem para todas as crianças dela. Sem linha gravada,
  vale `PERMISSOES_PADRAO`.
- O `PUT` leva as três de uma vez (`PermissoesDaFamiliaSchema`, objeto estrito). Suporte somente
  leitura recebe 403 `SOMENTE_LEITURA`.
- Quem obedece a "Visitas de irmãos" desde 29/10/2026: os recordes da família e as visitas (§6.20).
  As outras duas ainda só se gravam, leem e mostram.

**No cartão:** cada parte só aparece com a leitura dela. Limite que falha ou jogo fechado para a
família esconde o cartão inteiro (e a semana e as permissões nem são pedidas); semana ou
permissões que falham somem sozinhas, e o resto fica. Um interruptor que não grava volta ao que
estava e avisa ("Não consegui salvar agora.").

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

- **Versão:** `VERSAO_SALVAMENTO = 10` (`SalvamentoV10Schema`, estrito: campo desconhecido é
  recusado). A V2 (27/10/2026) é a V1 mais o melhor resultado de cada percurso. A V3 (28/10/2026) é
  a V2 mais a Capi e os bichos do Bosque. A V4 (28/10/2026) é a V3 mais o modo construção e os
  projetos azuis. A V5 acrescenta `presenteDosBichosEntregue`, sem alterar os formatos anteriores.
  A V6 (29/10/2026) guarda as `aparencias` de cada projeto azul (a galeria, §9.9). A V7
  (29/10/2026) acrescenta o Bento em `moradores.bento`, no mesmo formato da Capi (§6.15.1). A V8
  (29/10/2026) acrescenta os turnos nos balcões da Vila Doce (`turnos`, §6.15.2). A V9
  (29/10/2026) acrescenta os Lumis presos (`lumis`, §6.15.3). A V10 (29/10/2026) acrescenta a
  rotina de cada Lumi preso (`rotinas`, §8.2).
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
  - o Bento (`moradores.bento`, desde a V7): os mesmos campos da Capi (`MoradorSchema`);
  - os turnos da Vila Doce (`turnos`, desde a V8), um por balcão de `POSTOS_DA_VILA` (padaria,
    sorveteria, sucos): o último dia em que pagou, as melhores estrelas (de 1 a 3) e quantos
    turnos ela já fez ali (até 9999);
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
    guardado (alimento → quantidade, no máximo 12 no total, `GELADEIRA_GUARDA`);
  - as rotinas dos Lumis (`rotinas`, desde a V10): uma por espécie, só das que ela já prendeu, com
    os cartões no formato de `arquipelago-contracts/src/rotinas.ts` e os tetos de §8.2.
- **Teto:** `SALVAMENTO_MAX_BYTES = 64 * 1024` (64 KB do documento em JSON). O serviço recusa acima
  disso com 413 `SALVAMENTO_GRANDE_DEMAIS`. O corpo inteiro de uma chamada do jogo vai até 96 KB
  (`MAX_REQUEST_BODY_BYTES`, em `env.ts`).
- **Mudar o formato:** crie a próxima versão e escreva a migração da anterior em
  `migrarSalvamento`. Assim ninguém perde o progresso.
- **As versões de antes continuam valendo:** um salvamento antigo é lido já migrado (`migrarDaV1`:
  tudo igual e nenhum percurso corrido; `migrarDaV2`: tudo igual, a Capi com amizade 0, nenhum
  bicho achado e nenhum adotado; `migrarDaV3`: tudo igual, a casa de antes, nenhuma cabana e
  nenhum projeto azul; `migrarDaV4`: tudo igual e `presenteDosBichosEntregue: false`;
  `migrarDaV5`: a aparência em uso vira a única guardada; `migrarDaV6`: tudo igual e o Bento sem
  amizade, conversa, presente nem pedido, `MORADOR_NOVO`; `migrarDaV7`: nenhum turno feito;
  `migrarDaV8`: nenhum Lumi preso; `migrarDaV9`: nenhuma rotina montada).
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
- **A lua** (`mundo/ceu.tsx`, aj-visual-01): a noite é azul de lua, não preta. O céu e a névoa da
  noite são `#16224f`, e a luz de preenchimento (hemisfério) passa para o azul da lua (`#a9bcff` de
  cima, `#33456a` de baixo) sem cair abaixo de 0,5, então o mar, a praia e as casas longe continuam
  visíveis, como nas prévias noturnas do Blender. De dia nada muda.
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
- **Descansar (fase2-13, combinado com a dona em 29/10/2026):** sentar num banco ou deitar na cama
  devolve a energia aos poucos (`sistemas/descanso.ts`, `ENERGIA_POR_SEGUNDO`):
  - **banco:** 0,55 por segundo (de vazia a cheia em uns 3 minutos). Hoje são os três bancos da
    praça da Vila Doce (`col-banco-N`), com "Sentar no banco" a 1,5 m;
  - **cama** (ou beliche) do quarto: 1,7 por segundo (cheia em 1 minuto), com "Deitar na cama" a
    2,6 m (`mundo/casa.tsx`). Só aparece com cama ou beliche no quarto. A tela escurece um pouco em
    volta e a barrinha "Soneca" mostra a energia subindo; cheia, o Zappy diz "Que soneca boa. A
    energia voltou toda." e ela levanta sozinha;
  - andar, pular ou usar levantam a qualquer hora (depois de meio segundo, para o mesmo toque que
    sentou não levantar), e o que voltou fica. Fome e diversão não mudam descansando;
  - o corpo do jogo fica de pé ao lado do banco ou da cama (fora do móvel) e só o desenho vai para o
    assento ou o colchão, com os clipes "Sentar" e "Deitar" (`arte/avatar/locomocao.py`). O banco
    da Vila é alto para o avatar: sentado, os pés ficam balançando;
  - o cochilo com a energia no zero continua igual (acorda em casa com 60).
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
| Fubá, leite, ovo, polvilho, queijo, cacau | não é comida (ingrediente das receitas do Bento) |
| Bolo de fubá | fome +50 |
| Pão de queijo | fome +30 |
| Brigadeiro | fome +10, diversão +20 |
| Chocolate quente | fome +15, energia +15 |

- **Teto por item:** 999 (`adicionar`). Também é o teto do salvamento.
- **Item desconhecido** (de uma versão futura) é ignorado pelo jogo.
- **Na mochila,** a pessoa come um item clicando nele.

### 6.5 Receitas

Arquivos: `sistemas/receitas.ts` (`RECEITAS`), `mundo/bancada.tsx`, `interface/receitas.tsx` (a
lista com o que falta, na bancada e no forno) e, para as do Bento, `sistemas/conversa-do-bento.ts`.

| Receita | Precisa | Faz | Onde | Quem ensina |
|---|---|---|---|---|
| Salada da horta | 1 alface e 1 tomate | 1 salada | bancada | já se sabe |
| Pipoca | 1 milho | 2 pipocas | bancada | já se sabe |
| Bolo de fubá | 1 fubá, 1 leite e 1 ovo | 1 bolo | forno | o Bento, com 1 coração |
| Pão de queijo | 1 polvilho e 1 queijo | 3 pães | forno | o Bento, com 2 corações |
| Brigadeiro | 1 cacau e 2 leites | 4 brigadeiros | bancada | o Bento, com 3 corações |
| Chocolate quente | 1 cacau e 1 leite | 1 caneca | bancada | o Bento, com 4 corações |

Os números das receitas do Bento seguem a proposta (bolo de fubá fome +50, pão de queijo +30) e
são de exemplo, para ajustar.

- **A bancada** (o fogão e a pia da ilha): com uma receita só possível, faz na hora; com mais de
  uma, ou nenhuma, abre a lista das que ela sabe, cada uma com o que precisa e o que falta.
- **O forno** (projeto azul da casa): o painel dele tem a mesma lista, com as receitas do forno.
- Só aparecem as receitas que ela já sabe (`receitasConhecidas`, pelos corações com o Bento); a
  lista diz quantas o Bento ainda vai lembrar.
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
  no Blender. O Bosque e, desde 29/10/2026, a Vila Doce têm a completa (`ILHAS_COMPLETAS` em
  `mundo/ilha-completa.tsx`). Na Vila Doce o percurso dos telhados já se pisa (caixotes a 1 m,
  casinhas a 2,0, 2,8 e 3,6 m, terraço da sorveteria a 4,4 m); o Bento, as lojas e as entregas vêm
  nas próximas etapas.
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

Arquivos: `sistemas/percurso.ts` (`PERCURSO_DAS_COPAS`), `mundo/bosque.ts`,
`mundo/bosque-vivo.tsx` e `mundo/corrida-na-ilha.tsx` (o mesmo componente da entrega pelos
telhados, §6.13.1).

- **Largada:** a placa "Percurso nas copas" ao lado do pé da escada da casa na árvore
  (`PLACA_DA_LARGADA`), com uma marca acesa no chão. Perto dela: "E Começar o percurso nas copas".
  O Zappy diz: "Valendo. Suba a escada e siga pelas copas até o escorregador."
- **Pontos de volta:** cada um dos 4 deques (`RAIOS_DOS_DEQUES`: 2,9, 2,0, 2,1 e 2,0). Um deque
  conta quando o corpo está em cima dele (os pés até 0,3 abaixo do piso, `folgaDoDeque`).
- **Queda:** depois do primeiro deque, pisar no chão da ilha (pés a menos de 0,6 do tampo, o que o
  corpo sobe sozinho do chão; até 29/10/2026 eram 0,25, e cair perto da placa, onde o terreno fica
  0,31 acima do tampo, não contava) volta
  ao último deque alcançado, na borda de dentro do lado em que o caminho segue, a 0,7 da borda
  (`VOLTA_PARA_DENTRO_DO_DEQUE`), olhando para lá. Antes do primeiro deque, cair da escada não
  conta. Nunca volta para a largada.
- **Corte suave:** a tela escurece em 0,26 s, o corpo é levado e ela clareia em 0,34 s
  (`corteSaiMs`, `corteVoltaMs`).
- **Desistir sem castigo:** sair da ilha (1 além da borda), se afastar mais de 7 da largada antes
  de subir (`distanciaParaDesistir`), tocar "Parar" no cronômetro ou passar de 1 hora. Nada se
  perde.
- **Cronômetro:** discreto no alto da tela, só durante a corrida, com os vagalumes pegos e o botão
  "Parar". Durante a corrida a barra Viver/Construir some (no computador as duas ficavam no mesmo
  lugar e a barra cobria o cronômetro). Conta o tempo de jogo, quadro a quadro, como a física: menu, ferramenta aberta, aba
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

### 6.13.1 Entrega pelos telhados (Vila Doce, fase2-05)

Arquivos: `sistemas/percurso.ts` (`PERCURSO_DOS_TELHADOS`), `mundo/telhados.ts` (os pontos, lidos
das âncoras `telhados-*` e `fonte` do `vila-doce.glb`) e `mundo/vila-viva.tsx`. As contas são as
do percurso nas copas (§6.13); muda só o que está aqui.

- **Largada:** no chão da praça, 2 m na frente dos caixotes (`LARGADA_ANTES_DOS_CAIXOTES`). Perto:
  "E Começar a entrega pelos telhados". O Zappy diz: "Valendo. Suba nos caixotes e leve o bolo
  pelos telhados até o terraço da sorveteria."
- **Paradas (pontos de volta):** o caixote alto (raio 0,6) e o topo plano das três casinhas (raio
  1,5, `RAIOS_DAS_PARADAS`). A volta depois de uma queda é o meio do topo da última parada.
- **Queda:** depois da primeira parada, pisar no chão da praça (pés a menos de 0,25 dele) volta à
  última parada com o corte suave. Antes da primeira parada, sair andando mais de 6 m da largada
  desiste (`distanciaParaDesistir`).
- **Chegada:** a 1,2 do ponto do terraço da sorveteria (`raioDaChegada`), depois da última casinha.
- **Confeitos:** 4, um no meio de cada pulo (do caixote para a primeira casinha, entre as casinhas e
  da última para o terraço), 0,2 acima do centro do corpo em pé na parada mais alta do pulo
  (`CONFEITO_ACIMA_DO_CORPO`): o pulo leva o centro a uns 1,5 m acima do de saída e os pulos daqui
  sobem no máximo 1 m. Cor-de-rosa, só durante a corrida, pegos a 0,8 do centro do corpo. O
  primeiro fica sobre a beirada da primeira casinha e também se pega andando perto dela.
- **As três estrelas:** chegar; chegar em até 15 segundos (`tempoAlvoMs = 15_000`: o caminho tem
  uns 19 m no plano e quatro pulos para cima); pegar os 4 confeitos na mesma corrida.
- **O que fica guardado:** `percursos['vila-telhados']`, como o das copas (cada estrela para sempre,
  o melhor tempo é o menor). O id entrou no contrato sem versão nova do salvamento.
- **O prêmio:** quem chega ao terraço sem patins na mochila ganha um par (`premio` da config,
  `receberPatins` em `sistemas/patins.ts`). O Zappy junta à fala do resultado: "O Bento mandou um
  presente pela entrega: um par de patins. Toque neles na mochila para calçar." Com o par na
  mochila, as chegadas seguintes não dão outro.
- **Ainda não tem:** uma placa desenhada na largada (o "Começar" aparece perto do lugar).
- Testes: `tests/entrega-pelos-telhados.test.ts` (lê o `vila-doce.glb`); navegador:
  `bun playground/verificar-percursos-browser.ts` (a entrega, o par na mochila e o percurso nas
  copas).

### 6.13.2 Os patins (fase2-05)

Arquivos: `sistemas/patins.ts`, o perfil `PERFIS.patins` em `sistemas/movimento.ts`, o modo chão
(`sistemas/modos/chao.ts`), o botão na mochila (`interface/hud.tsx`) e o par nos pés
(`personagem/patins-nos-pes.tsx`).

- **Calçar:** o item `patins` (🛼) da mochila é um botão: um toque calça ("Patins calçados. Solte o
  controle e o corpo segue deslizando."), outro guarda ("Patins guardados na mochila."). Calçar
  não fica salvo: o jogo abre sempre descalço. Patins não se comem nem se dão de presente
  (`equipamento`, `itensParaDar`).
- **Deslizar:** calçados e fora da água, andar e correr vão 1,3 vezes mais rápido
  (`RAPIDEZ_DOS_PATINS`: 2,9 e 6 m/s). No chão a velocidade segue o perfil `patins` (aceleração 8,
  freio 5 m/s²): chega na corrida em uns 0,75 s e, soltando, ainda desliza uns 3,6 m em 1,2 s. No ar
  vale o perfil de sempre. Nadando, no cipó, na escada, no tronco e na escalada os patins não mudam
  nada. As pernas andam no passo de sempre (a velocidade das animações é dividida pela rapidez),
  então os pés deslizam.
- **No desenho:** o `patins.glb` é um par de patins de bota feito nas medidas do avatar: a bota
  envolve o pé, a perna e a barra da calça ou da fantasia de bicho (vestidos e saias longas passam
  por fora), com a boca logo acima do tornozelo e um fundo acolchoado escuro por onde a perna entra.
  No jogo cada malha do patim vira uma malha com o esqueleto do avatar: a sola, o chassi, as rodas e
  a parte de baixo da bota seguem o pé; o cano segue a canela (de 5 a 17 cm de altura passa de um
  para o outro, `pesoDaCanela`). Assim a perna e a calça nunca escapam da bota, em nenhuma pose.
  Com os patins calçados o calçado do avatar some (a bota fica no lugar dele). O avatar sobe
  `ELEVACAO_DOS_PATINS` (0,089) para as rodinhas tocarem o chão parado: elas ficam 0,11 abaixo da sola
  na pose de referência, e na pose parada o calçado desce 2,1 cm abaixo de onde o pé o deixaria. O
  corpo do Rapier não muda.
- Testes: `tests/patins.test.ts` e `tests/patins-nos-pes.test.ts` (os pesos, e a calça, a perna e
  as fantasias das peças do avatar dentro da bota); navegador: `bun playground/verificar-patins-browser.ts`
  (calçar, os dois patins nos pés com as rodinhas no chão, o deslize depois de soltar e guardar).
  Playground: `?patins=1` põe um par na mochila; na sala de arte, `/arte?caso=patins&vestido=1&vista=tres`
  (ou `frente`, `lado`, `tras`, `cima`) mostra os pés de perto, com `&calcado=`, `&calca=` e
  `&roupa=` para trocar as peças do avatar.

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
- **Presente pelos quatro bichos:** conversar com a Capi depois de achar cachorro, gato, coelho e
  porquinho entrega uma **Salada da horta** (`salada`, item já existente), uma única vez. A salada
  combina com a horta da Capi e pode alimentar a pessoa ou o bicho adotado. A regra pura
  `receberPresenteDosBichos` atualiza o inventário e `presenteDosBichosEntregue` no mesmo
  salvamento V5. Não depende de amizade, adoção, pedido ou primeira conversa do dia. As falas de
  agradecimento ficam no fim, depois da página do diário se ela também chegar nessa conversa.
  Com 999 saladas ou sem espaço nos 64 KB, a entrega fica pendente e a Capi pede para liberar
  espaço. Reabrir a conversa, recarregar ou mudar de dia não repete um presente entregue.
  O playground aceita `?bichos=achados`; use `?novo=1&bichos=achados` para começar do zero.
  Testes: `capi-presente.test.ts`, `salvamento-v5.test.ts`, `salvamento-duravel.test.ts` e os
  testes HTTP e Postgres local do serviço.
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

### 6.15.1 O Bento da Vila Doce (fase2-02)

Arquivos: `arquipelago/src/sistemas/bento.ts` (gostos, aniversário, pedidos, onde ele fica e os
textos), `conversa-do-bento.ts` (a conversa sobre o salvamento) e as contas de amizade de
`moradores.ts`, as mesmas da Capi; no mundo, `mundo/bento.tsx` (montado por `mundo/vila-viva.tsx`
com a Vila Doce completa ativa) sobre o morador genérico `mundo/morador.tsx`, e o painel
`interface/bento.tsx`. Testes: `tests/bento.test.ts`; no navegador,
`bun playground/verificar-bento-browser.ts`.

- **Quem é:** o tamanduá confeiteiro da Vila Doce. Quando a cor foi embora ele esqueceu as
  receitas, e cada pedido entregue o ajuda a lembrar um pedaço. Abrir as receitas pela amizade com
  ele é a fase2-04.
- **Onde ele fica:** na âncora `morador` do `vila-doce.glb`, na frente da padaria, de costas para a
  porta (a âncora `padaria`) e olhando para a praça. A até 7 m (`BENTO_NA_VILA.olharDe`) ele se
  vira para a criança e acena quando ela chega (no máximo uma vez a cada 45 s). Segura o corpo
  (cilindro de 0,45 de raio e 1,6 de altura; o chapéu passa um pouco), e a câmera passa por ele.
  Pisca, fala enquanto a conversa está aberta e comemora presente e pedido entregue.
- **Conversar** (E perto dele, a até 2,2 m): a mesma caixa da Capi, com "Bento", os corações, as
  falas e as escolhas (entregar o pedido do dia, dar um presente, "Tchau, Bento"). A câmera da
  conversa é a mesma (§6.15). Na Vila Doce não aparece mais o "Olhar em volta" da ilha.
- **Amizade:** as mesmas contas da Capi (`AMIZADE`, `coracoes`): 10 pela primeira conversa do dia,
  30 pelo pedido do dia, 20 por presente de que ele gosta e 8 por comum, de 0 a 500. A amizade de
  um morador não mexe na do outro, e cada um tem a sua loja da conversa (a comemoração de um não
  faz o outro comemorar).
- **Presentes** (`GOSTOS_DO_BENTO`): milho (o fubá do bolo) e pipoca são os preferidos; salada,
  alface e tomate são comuns. O resto segue a regra da Capi: o que não é comida volta, e só o
  primeiro presente do dia conta.
- **Aniversário** (`ANIVERSARIO_DO_BENTO`): 24 de junho, dia de São João. O presente vale o dobro,
  ele agradece lembrando o São João e, na primeira conversa do dia, fala do aniversário.
- **Pedido do dia** (`PEDIDOS_DO_BENTO`, `pedidoDoDiaDoBento`): dois milhos, um milho, duas
  pipocas, uma salada ou dois tomates. O sorteio usa `bento:`, o perfil e o dia, então é o mesmo o
  dia inteiro em qualquer aparelho e não segue o da Capi. Fica guardado em `moradores.bento.pedido`.
  Pedido de outro dia não se entrega (o painel mostra só o de hoje).
- **As receitas que ele lembra** (fase2-04, `FALA_DA_RECEITA`): a cada coração novo ele lembra
  uma receita (bolo de fubá, pão de queijo, brigadeiro, chocolate quente, §6.5), conta como se faz
  e dá os ingredientes da primeira vez. Vale na conversa, no presente e na entrega, quando a
  amizade passa o coração. Quem já tinha os corações antes da fase2-04 já sabe as receitas (vêm da
  amizade, nada novo no salvamento), sem a fala nem os ingredientes da primeira vez.
- **A cesta da despensa** (`cestaDoBento`): cada pedido entregue traz os ingredientes de uma
  receita que ele já ensinou (sorteada pelo dia), menos no pedido que o fez lembrar uma agora.
  Antes do primeiro coração não há cesta. Os turnos nos balcões (§6.15.2) também pagam em
  ingredientes.
- **O forno** chega como projeto azul com o primeiro coração (`ganharProjetos`).
- **Conversa** (`falasDoBento`): no primeiro encontro ele se apresenta, conta das receitas
  esquecidas e já diz o pedido. Na primeira conversa do dia: o aniversário (se for), uma fala do
  nível de amizade (duas por nível, trocando pelo dia) e o pedido. As outras conversas do mesmo dia
  são só uma despedida. Mesmas regras de texto (sem travessão, sem exclamação, sem começar com
  pergunta), conferidas no teste.
- **Moedas:** nada disto paga moedas.

### 6.15.2 Os turnos nos balcões da Vila Doce (fase2-03)

Arquivos: `sistemas/turnos.ts` (as regras), `estado/turno.ts` (a loja do painel),
`interface/turno.tsx` (o painel), `mundo/balcoes-da-vila.tsx` (onde se pede o turno). Profissão
de mentirinha: ela atende o balcão, sem gastar nada do inventário.

- **Os balcões** (`BALCOES`, `POSTOS_DA_VILA` no contrato): a padaria do Bento (pela conversa com
  ele, "Ajudar no balcão"), a sorveteria (E / Usar a até `ALCANCE_DO_BALCAO`, 1,8 m, da âncora
  `sorveteria`) e a barraca de sucos da feira (a âncora `barraca-5`). Cada balcão tem quatro
  produtos: pão francês, pão de queijo, bolo de fubá e sonho; morango, chocolate, coco e milho;
  laranja, uva, melancia e abacaxi.
- **O turno:** seis fregueses (`TAMANHO_DOS_PEDIDOS`), moradores e Lumis (`FREGUESES`, todos
  diferentes no mesmo turno), pedindo 1, 1, 2, 2, 3 e 3 coisas. Ela toca no que o freguês pediu
  (vai para a bandeja, no máximo `MAXIMO_NA_BANDEJA`, 5; tocar na bandeja tira um) e entrega.
  Certo, vem o próximo; errado, conta um engano, a bandeja esvazia e o freguês repete o pedido.
  Bandeja vazia não entrega. Não há relógio: ninguém perde por demorar.
- **Os pedidos** são sorteados pelo balcão, o dia e quantos turnos ela já fez ali
  (`pedidosDoTurno`): o mesmo turno repete os pedidos, o seguinte traz outros.
- **Estrelas** (`estrelasDoTurno`): nenhum engano, 3; até dois, 2; mais, 1. O salvamento guarda as
  melhores de cada balcão.
- **Pagamento:** só o primeiro turno do dia em cada balcão paga (`pagoEm`). Padaria: 1 fubá, 1
  leite e 1 ovo; sorveteria: 1 cacau e 1 leite; sucos: 1 semente de tomate e 1 de milho. O turno
  pago na padaria também vale `AMIZADE.turno` (10) com o Bento e, se passar um coração, traz a
  receita nova e a página do diário (`ajudarOBento`). Os outros turnos do dia são só pela diversão
  e pelas estrelas.
- **Moedas:** os turnos ainda não pagam moedas. A proposta prevê moedas baixas nos turnos, dentro
  do teto semanal, mas cada recompensa precisa ser autorizada no serviço antes de ligar (o
  salvamento é escrito pelo aparelho).
- **Textos:** as falas dos fregueses concordam em número e gênero (`itensPorExtenso`) e seguem as
  regras de texto (sem travessão, sem exclamação, sem começar com pergunta), conferidas no teste.
- Testes: `tests/turnos.test.ts`; navegador: `bun playground/verificar-turnos-browser.ts`.

### 6.15.3 Os borrões da noite e os Lumis da Vila Doce (fase2-06)

Arquivos: `arquipelago/src/sistemas/borroes.ts` (regras), `mundo/borroes-da-vila.tsx` (no mundo),
`personagem/lanterna-na-mao.tsx` (a lanterna acesa na mão). Salvamento V9: `lumis`, quantos de
cada espécie ela já prendeu.

- **A lanterna:** o Bento dá do segundo encontro em diante, por último na conversa
  (`receberLanterna`; o primeiro encontro fica só com a apresentação e o pedido). Se ela sumir da
  mochila, ele dá de novo. Na mochila é um equipamento (não se come nem se dá de presente); o botão
  dela acende e apaga (`FALA_DE_ACENDER`, `FALA_DE_APAGAR`). Acesa, ela aparece pendurada na mão
  direita, com o papel brilhando (sem luz de verdade na cena). Acesa não é salvo: ao abrir o jogo
  ela começa apagada.
- **Os borrões:** só à noite (`ambiente.noite`, os últimos 4 minutos de cada dia de 16), dois por
  noite (`BORROES_POR_NOITE`), perto de duas âncoras `lumi-N` diferentes, puxados 1,5 m para o meio
  da praça. Os borrões de cada noite e o Lumi que cada um vira saem do dia do jogo (os mesmos em
  qualquer aparelho). Um em cada `RARO_A_CADA` (5) vira o raro, o Brigadeiro; o primeiro Lumi de
  todos é sempre o comum, o Quindim.
- **Sem a lanterna acesa:** quem chega a `FOGE_A` (3 m) faz o borrão fugir (`RAPIDEZ_DA_FUGA`, 3,2
  m/s) até ficar a `FOGE_ATE` (4,5 m), sem sair de `SOLTO_ATE` (3 m) do lugar dele. Enquanto a criança
  continua por perto, ele espera parado; depois volta devagar para o lugar dele. Na primeira fuga
  da noite o Zappy diz `FALA_DO_BORRAO_FUGINDO`.
- **Com a lanterna acesa:** ele não foge. A `PRENDE_A` (2,2 m) aparece "Prender com a luz" (E /
  Usar): ele chacoalha na luz (`PRESO_POR`, 1,2 s), se desfaz em faíscas (`VIRANDO_POR`, 1,5 s,
  clipe `virar`) e o Lumi entra no salvamento na hora (`prenderBorrao`, até 999 de cada), com a
  fala do Zappy (`falaDoLumiNovo`). Tensão boa, sem dano: deixar um borrão para trás não custa nada.
- **Os já presos na noite:** ficam no aparelho, por perfil (`arquipelago:borroes-presos:<perfil>`),
  para recarregar a página na mesma noite não trazer de volta os já presos. Na noite seguinte saem
  outros dois.
- **Os Lumis da Vila:** moram nas quatro âncoras `lumi-N`, de dia e de noite (`lumisNaVila`): o
  primeiro Quindim, o primeiro Brigadeiro e depois mais Quindins e Brigadeiros, até as quatro.
  Chegam comemorando (`feliz`), descansam virados para a praça, olham para a criança a menos de 4 m
  e piscam. Um cilindro só para o corpo (`col-morador-lumi-*`). Perto deles aparece "Ensinar a
  rotina", que abre o painel da rotina daquele Lumi (§8.2).
- **Textos:** sem travessão, sem exclamação, sem começar com pergunta, conferidos no teste.
- Testes: `tests/borroes.test.ts` (e a lanterna na conversa em `tests/bento.test.ts`); navegador:
  `bun playground/verificar-borroes-browser.ts`. Playground: `?lanterna=1`, `?lumis=quindim:2` e
  `?adiantar=12` (a noite já chegou); na sala de arte, `?caso=lanterna&vestido=1`.

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
  fechar algo ocupado dentro de casa. Tetos do jogo: 320 arestas e 200 trechos de parede por lote
  (o salvamento guarda trechos: tocos soltos gastam um trecho cada). A loja ainda confere a obra
  inteira contra o contrato antes de gravar.
- **Apagar** tira as paredes do caminho (as do quarto ficam) e as portas e janelas delas.
- **Cômodo:** as células que as paredes fecham (o que não se alcança da borda do lote sem passar
  por parede; porta e janela não abrem a parede para isso). Cômodo novo nasce com piso de tábua;
  a ferramenta Piso troca o piso do cômodo inteiro (tábua, ladrilho ou azulejo). Voltar para a
  tábua tira o registro; no máximo 30 cômodos com piso trocado. O quarto tem o piso da plataforma.
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
  - **Cabana no Bosque** (28/10/2026): o lote fica na ponta de campo do Bosque, de x −18 a −12 e
    de z −4 a 4 no modelo (6 × 8 células, chão plano a 1 m, céu aberto para o telhado), lido das
    âncoras `lote-cabana-a` e `-b` (`loteDaCabana`). Começa vazio e não tem quarto fixo. O
    Construir abre a cabana quando a criança está no lote ou a até 3 m dele (`PERTO_DO_LOTE`,
    conferido a cada 0,25 s); longe dele abre a casa, como antes. Valem as mesmas regras e
    ferramentas, menos Canteiro e Objetos (a horta e o projeto azul são da casa). Tetos da cabana:
    80 arestas de parede, 12 aberturas, 6 pisos, 60 arestas de cerca, 48 células de caminho. A
    obra fica em `construcao.cabanas.bosque`; o Desfazer vale para a obra aberta. Sair da ilha com
    o Construir da cabana aberto fecha o Construir.
- **Projeto azul** (`sistemas/construcao/projeto-azul.ts`, catálogo e moldes no contrato,
  `objetos.ts`): o objeto chega com a função pronta e funciona em holograma; com aparência fica
  completo.
  - **De onde vem** (`ganharProjetos`, conferido a cada mudança do salvamento): a geladeira, do
    primeiro pedido entregue (hoje o da Capi, o único pedido do jogo); a casinha, de adotar um bicho
    no Bosque. O Zappy avisa: "Chegou o projeto azul: geladeira. Ponha em casa no modo Construir.".
    Os outros objetos (forno, aquário, lareira, banda, fliperama, museu) estão no catálogo com o
    molde; a função e a origem deles entram com as ilhas de cada um.
  - **Onde vai** (`LUGAR_DO_OBJETO`, ferramenta Objetos do Construir): a geladeira e os outros
    dentro de um cômodo novo (todas as células no mesmo cômodo; no quarto não); a casinha no
    quintal (fora de casa, sem caminho nem canteiro). Cada objeto uma vez só: pôr de novo muda de
    lugar; "Girar" vira um quarto de volta. Parede não corta objeto ao meio. Apagar tira o objeto,
    que volta a ficar guardado com a função e o que tem dentro; se o cômodo dele deixa de existir,
    ele também volta.
  - **No mundo** (`mundo/objetos-da-casa.tsx`): a geladeira usa o holograma do Blender
    (`geladeira-holograma.glb`, `projetoAzul` somando luz); os outros, o modelo com os materiais
    trocados por um azul translúcido. Com aparência, o modelo de verdade. Perto do objeto, "Abrir a
    geladeira" (ou "Ver ...") abre o painel. Colide só para o corpo (`col-objeto-*`).
  - **A geladeira** (`GELADEIRA_GUARDA`): guarda 4 alimentos no holograma e 12 com aparência, um
    por vez, da mochila para dentro e de volta. Só alimento (item que se come). "Conserva" fica para
    quando a comida estragar (hoje nada estraga).
  - **A aparência** (painel do objeto, `interface/projeto-azul.tsx`): "Pintar no Pinta" (a frente,
    os lados e o topo da caixa; só com as faces no modelo, hoje só a geladeira) e "Modelar no
    Molda" (abre no posto Explorador(a) de Mundos, `POSICAO_DO_MOLDA`) pedem `abrirFerramenta` com
    `proposito: 'objeto'` e o molde do contrato. Pronto: a aparência fica guardada (`aparencia` com
    a origem e o id da criação). "Usar uma criação minha" entra com o cartão dele.
  - **Da galeria** (fase1-13, 29/10/2026; o terceiro cartão, ao lado do Pinta e do Molda): a
    aparência pronta, comprada com moedas Zappy. Regras na seção 9.9.
    - O cartão mostra a miniatura (`MINIATURA_DO_OBJETO`), o nome, o preço e o saldo ("Você tem
      100 moedas."). "Comprar" pede confirmação ("Comprar a Geladeira clássica por 60 moedas",
      "Sobram 40 moedas.", "Comprar" e "Agora não"); depois de pago, o holograma vira o modelo e o
      painel diz "Pronto. A Geladeira clássica é sua e já está no lugar."
    - Sem saldo, o botão diz "Faltam 50 moedas" e o cartão sugere "Um desafio do Quadro das Cores
      paga 20 moedas." (o prêmio padrão, `MOEDAS_PADRAO.principal`).
    - Já é dela: "Usar, já é sua" (não cobra). Em uso: o selo "Em uso".
    - Galeria fora do ar: "A galeria não abriu agora." no cartão, sem preço inventado; na compra,
      "A galeria não respondeu agora. Tente de novo daqui a pouco: a mesma compra nunca é cobrada
      duas vezes." Saldo que não carregou: "Seu saldo não carregou agora." (dá para comprar: o
      serviço confere). Suporte olhando: "Olhando o jogo como a criança, não dá para comprar."
  - **Suas aparências** (abaixo dos cartões, só com mais de uma): as que ela já tem para aquele
    objeto (as feitas por ela e as da galeria pagas), com a em uso marcada. Trocar não cobra.
    Salvamento V6: cada projeto azul guarda `aparencias` (até 12, `APARENCIAS_GUARDADAS_MAXIMO`); a
    em uso é sempre uma delas, e no teto sai a mais antiga (a da galeria continua paga no serviço e
    volta pela lista). Na V5 a aparência em uso vira a única guardada.
  - **O Pinta e o Molda de verdade no molde** (28/10/2026, ponte em
    `member-shell/src/lib/arquipelago-objeto.ts`): a página abre a ferramenta da plataforma por cima
    do jogo, com o mesmo acesso de criar no jogo, e o cabeçalho diz "Molde: Geladeira".
    - **Pinta:** abre (ou reabre, pelo nome `molde-<objeto>`) um cenário de pixel com a
      **planificação** da caixa (`planificacaoDoMolde` no contrato): os lados ao lado da frente, o
      topo em cima dela, cada face na proporção certa e a tela com o lado maior de 192 pontos
      (`LADO_DA_PLANIFICACAO`; a geladeira fica com 165 × 192). O contorno de cada face mora numa
      camada de baixo, "Molde", trancada; a frente vem em rosa. A criança pinta na camada de cima,
      "Pintura". O editor abre com a planificação inteira à vista (o maior zoom em que ela cabe em
      480 pontos de tela: a geladeira abre em 2×). O fliperama abre só com a tela (192 × 144).
      Objeto sem faces: "Este objeto ainda não tem as faces para pintar."
    - **Molda:** abre (ou reabre pelo mesmo nome) um modelo com a **caixa do molde** como peça de
      começo, com o nome do objeto. A escala é 16 unidades da grade por célula do jogo, encolhida
      quando o objeto não cabe (o maior lado chega a 30 na grade, que tem 32): a banda, de
      2,85 de largura, sai com 30. O lado da caixa anda em meio bloco, centrado (a geladeira fica
      com 13 × 28 × 13,5).
    - **Guia da frente no Molda:** na oficina, a caixa do molde aparece em contorno e a frente
      (a face +z, onde o avatar usa o objeto) ganha um véu e um contorno rosa. É ajudante de tela,
      como o chão quadriculado: não é tocado, não sai na foto da galeria nem no arquivo exportado.
    - **Conferências no Molda:** um cartão "Molde: Geladeira" no topo do painel de peças diz
      "Cabe no molde" (ou "Passou do molde. Traga para dentro da caixa."), "A frente está na marca
      rosa" (ou "Encoste a frente na marca rosa.") e "Leve para a ilha: 12 de 5.000 triângulos"
      (ou "Pesado para a ilha: …. Simplifique alguma peça."). Cabe = todas as peças visíveis dentro
      da caixa; frente = o modelo encosta na face +z; o teto é o `triangulosMaximos` do molde
      (5.000). Folga de meio passo da grade (1/32). Criação vazia: "Comece a modelar dentro da
      caixa." O cartão avisa, não impede: "Usar no jogo" continua valendo.
    - **A volta:** "Usar no jogo" guarda a criação na conta e devolve o id dela, que vira a
      `aparencia` do projeto azul. Sem acesso à ferramenta, o jogo diz "O Pinta ainda não está
      liberado para você." (ou "O Molda"); qualquer outro motivo, "O molde não abriu agora. Tente
      de novo daqui a pouco." (`recadoDaFerramentaFechada`).
    - **Plataforma de mentira:** responde pronto em 0,4 s com as mesmas recusas da página (sem
      faces no Pinta, Estúdio não abre objeto); `?objetos=sem-acesso` no playground simula a
      ferramenta não liberada.

### 6.16.1 Aconchego dos cômodos (fase1-15)

Regra pura `sistemas/construcao/aconchego.ts`, calculada pela planta da obra da casa ou cabana.
Não entra no salvamento. Cada objeto pertence ao cômodo da célula onde foi posto; objetos no
quintal e projetos guardados sem colocação não contam. Os móveis da plataforma contam somente
no quarto fixo, incluindo peças de parede e em cima de móveis, pelo ID do catálogo compartilhado.

Balanceamento inicial escolhido para esta entrega, ainda sujeito a observação com crianças:

| Parte | Regra | Motivo |
|---|---|---|
| Variedade | 2 por tipo diferente, até 6 tipos, máximo 12 | Premia usos diferentes sem pedir acúmulo |
| Luz | 2 por tipo de janela, até 3 tipos, mais 2 por tipo de objeto que ilumina, até 2 tipos, máximo 10 | Uma janela ou fonte já ajuda; repetir não multiplica |
| Plantas | 2 por tipo, até 3 tipos, máximo 6 | Variedade de plantas, sem tarefa de encher de vasos |
| Capricho | 2 pelo piso, 2 por ter porta, 2 por ter janela e 2 pelo espaço útil, máximo 8 | Escolhas de construção acessíveis sem compra |
| Feito por você | 1 por tipo com uma aparência do Pinta, Molda ou criação guardada entre as que o objeto guarda (mesmo usando a da galeria), até 3 tipos, máximo 3 | Extra pequeno pela autoria; comprar na galeria nunca tira este ponto (29/10/2026) |

- Os três pisos valem igual, inclusive a tábua inicial. O salvamento não diferencia tábua
  escolhida e padrão. O piso do quarto também recebe a mesma parcela.
- Espaço útil: pelo menos 9 células e até 36 células. Acima de 36, soma os mesmos 2 se houver
  pelo menos um tipo diferente de objeto ou móvel para cada 12 células, arredondando para cima.
  Repetição não preenche essa proporção. Cômodo pequeno ou grande vazio apenas não recebe esse
  bônus, sem subtrair pontos das outras partes.
- Aberturas só contam sobre paredes existentes. Janela compartilhada soma para os dois cômodos;
  largura da janela não multiplica a pontuação. Cada tipo soma uma vez por cômodo.
- Luzes reconhecidas: lareira na obra; luminária, vela, luminária de mesa, lâmpada de lava,
  varal de luzes e letreiro neon no quarto. A janela decorativa do quarto também conta como
  um tipo de janela. A conta independe da hora do dia e da animação do fogo.
- Plantas do quarto: planta, árvore, cacto, vaso de flores e planta pendurada. Nos cômodos novos
  e nas cabanas, a **planta de interior** (29/10/2026): um projeto azul de 1 × 1 que chega com a
  primeira obra (da casa ou de uma cabana) e vai dentro de um cômodo novo. Cada objeto vai uma
  vez só, então por enquanto ela vale um tipo (2 pontos) na casa toda. Quando ela já foi ganha,
  a dica de um cômodo novo sem planta sugere pôr. Canteiro do quintal não soma dentro de casa.
  Pedido de arte em `docs/plans/2026-10-28-arquipelago-aconchego-arte.md`.
- Comprado e holograma têm parcelas idênticas. Nenhuma origem gera desconto. Criação própria
  acrescenta somente o bônus, por tipo colocado. É possível atingir a faixa máxima com objetos
  comprados e sem plantas, conforme o teste.
- Níveis: Começando desde 0, Gostoso desde 6, Aconchegante desde 12 e Muito aconchegante desde
  22 pontos. São de uma a quatro estrelas, acompanhadas de texto, não apenas de cor.
  Teto da soma: 39 pontos. `ACONCHEGO_QUE_CHAMA_VISITA` = 12 e `ACONCHEGO_DA_FESTA` = 22,
  alinhados aos dois níveis de cima. Visitas e festas ficam para outra fase; estes números
  ainda não acionam moradores, recompensas ou eventos.
- Olhar: toque de até 6 px seleciona o cômodo no chão; arrastar continua movendo a câmera.
  A célula observada é transitória, para continuar no mesmo lugar quando o ID do cômodo muda.
  O botão Aconchego abre o painel da barra, com seletor acessível para teclado e toque.
  O piso do cômodo recebe um destaque amarelo com uma única malha simples, sem corpo físico.
- O painel mostra as cinco parcelas e uma dica positiva. Não recomenda plantas em lugares
  onde não podem ser colocadas. Fechar o painel ou escolher outra ferramenta libera a vista.
  A conta só muda por edição da obra, projeto ou quarto, nunca no laço da física.

Testes: `tests/aconchego.test.ts` e `playground/verificar-aconchego-browser.ts`, usando plataforma
falsa e sem persistência. Prints e evidências em `docs/qa/2026-10-28-arquipelago-aconchego.md`.

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
  - A da Vila Doce (fase2-12) fica com o Bento, com a mesma regra: ele entrega com 2 corações
    (`CORACOES_DA_PAGINA_DA_VILA`), na conversa, no presente ou na entrega que fizer a amizade
    passar desse ponto, dizendo "Arrumando a despensa, achei isto: uma página do diário da Íris." e
    "Ela escreveu sobre o meu bolo de fubá. Guarde no seu diário, no menu."
    (`FALA_DA_PAGINA_DO_BENTO`, `ganhouAPaginaDaVila`), depois da fala da receita do mesmo coração.
    O texto, da proposta: "O Bento me pediu a receita do bolo de fubá. Eu disse que ainda não estava
    boa. Estava boa."
- **Receitas** (fase2-12, `colecaoDeReceitas`): todas as receitas do jogo (§6.5). As que ela sabe
  mostram onde se fazem (a bancada da ilha ou o forno da casa) e o que precisam; as que o Bento
  ainda vai lembrar mostram com quantos corações e quantos faltam.
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

### 6.17.1 O álbum de coleções e o modo foto (fase2-09, 29/10/2026)

Da proposta: o álbum é o "museu para completar" (como no Animal Crossing), as fotos são expressão
e coisa da família, e vale a regra "nada se perde por faltar". Arquivos: `sistemas/album.ts`,
`sistemas/modo-foto.ts`, `estado/foto.ts`, `interface/album.tsx`, `interface/foto.tsx` e
`mundo/foto.tsx`. Testes: `tests/album.test.ts`; navegador: `playground/verificar-album-browser.ts`.

- **Abrir o álbum:** "🏛️ Álbum de coleções" no menu do jogo (`PAINEL_DO_ALBUM`). O personagem fica
  parado, e Esc ou "Voltar ao jogo" fecham. Ele só mostra; nada ali muda o jogo, e tudo sai do que o
  salvamento já guarda (o álbum não tem campo próprio).
- **Cada seção** diz quantos ela tem, de quantos ("Receitas: 2 de 6"), e quantos faltam ("Faltam
  4.", "Falta 1." ou "Completa."). O que falta aparece apagado com a dica de onde procurar, nunca
  como perda: "O que falta não se perde: continua esperando por você nas ilhas."
- **As seções:**

  | Seção | De onde sai | Conta | Total |
  |---|---|---|---|
  | Bichos do Bosque | `colecaoDoBosque` (a mesma do diário, §6.17) | achados e o adotado | 4 |
  | Receitas | `colecaoDeReceitas` (a mesma do diário) | as que ela sabe | todas as receitas (§6.5) |
  | Estrelas dos percursos | `salvamento.percursos`, com `PERCURSOS_DO_JOGO` | cada estrela ganha | 3 por percurso (6 com as copas e os telhados) |
  | Aparências guardadas | `projetos[*].aparencias` | objetos da casa com pelo menos uma aparência | os objetos da casa (9) |
  | Lumis presos | `salvamento.lumis` (V9) | espécies com pelo menos um preso | as 14 de `LUMIS` |

  - Os bichos e as receitas aparecem do mesmo jeito do diário (`Bicho` e `Receita`, exportados de
    `interface/diario.tsx`).
  - Cada percurso mostra a ilha, as três estrelas com o texto da tela do resultado e o melhor tempo
    ("Ainda não correu." antes da primeira corrida).
  - Cada objeto mostra a miniatura e os nomes das aparências guardadas (os mesmos de "Suas
    aparências", §6.16). Ganho e sem aparência: "Na casa, abra o objeto para dar uma aparência a
    ele." (o painel do objeto tem o Pinta, o Molda e a galeria) Ainda não ganho: a miniatura em silhueta e de onde ele vem (a `origem` do
    catálogo de objetos).
  - Os Lumis: as 14 espécies na ordem de `LUMIS`, com a ilha e se a espécie é comum ou rara. Os
    presos mostram o nome e quantos ("Presos: 3."), com a cor do corpo do modelo (`ESPECIES_DE_LUMI`
    em `sistemas/album.ts`: nome, ilha e cor do README e dos scripts de `arte/lumis`; o teste confere
    a cor contra o material `corpo` de cada GLB). Os que ainda não vieram aparecem como silhueta, com
    "Ainda não encontrado" e a ilha, sem o nome. Os nomes da praia (Estrelinha e Búzio) continuam
    provisórios, como no README de lá. Ainda não há miniatura desenhada de cada Lumi: o álbum usa um
    círculo da cor do corpo, com o coração de luz.
- **Modo foto:** "📷 Modo foto" no menu ou a tecla F (sem Ctrl, Alt ou Meta, fora de campo de texto)
  com o jogo correndo (nada de menu, painel, ferramenta ou resultado aberto). É um painel
  (`PAINEL_DA_FOTO`): o personagem fica parado e a câmera gira e aproxima como sempre (arrastar,
  roda, pinça, + e -).
  - O HUD inteiro some: necessidades, relógio, tempo livre, menu, a fala do Zappy e as dicas, a ação
    perto, a mochila e o toque. Ficam o cartão "📷 Modo foto" com "Gire e aproxime a câmera para
    enquadrar.", "Voltar" no alto e "Tirar foto" embaixo à direita. Nenhum deles fica na metade
    esquerda de baixo, onde mora o direcional do toque.
  - "Tirar foto" desenha o quadro e lê o canvas na mesma chamada (`gl.render` e depois `toBlob`,
    `capturarQuadro`), sem ligar `preserveDrawingBuffer` no jogo todo (custa no celular a cada
    quadro). O PNG é oferecido para baixar no aparelho, com o nome
    `arquipelago-AAAA-MM-DD-HHhMM.png` (a hora do aparelho), e o cartão diz "Foto pronta. Ela ficou
    só neste aparelho." com "Baixar de novo". Se falhar: "A foto não saiu agora. Tente de novo."
  - Esc ou "Voltar" saem, e o HUD volta.
  - Com menos movimento (do aparelho ou do menu), a barra entra sem animação.
  - **Nada vai para o serviço nem para o Clube:** fotos no Clube estão desligadas por padrão
    (`PERMISSOES_PADRAO`, ECA Digital, art. 21; §3). A foto não fica no salvamento.
- **Moedas:** nada disto paga moedas.

### 6.18 Qualidade automática em aparelho fraco

O jogo procura manter **60 quadros por segundo no computador** e **30 no celular, tablet,
Chromebook ou computador de até quatro núcleos**. São metas, não garantia de que qualquer aparelho
consiga alcançá-las. A detecção usa o ponteiro de toque (`pointer: coarse`), a identificação
`CrOS` do navegador e o número de núcleos informado pelo aparelho. Se essa última informação
faltar, ela não é tratada como zero. Até dois núcleos começa leve; os demais aparelhos da meta
de 30 começam médios; o computador da meta de 60 começa completo.

| Desenho | Completo | Médio | Leve |
| --- | --- | --- | --- |
| Resolução máxima (DPR) | 1,75 | 1,25 | 0,75 |
| Amplitude visual das plantas | 100% | 50% | Zero |
| Ondinhas do lago | Ligadas | Ligadas | Desligadas |
| Névoa começa / termina | 70 / 210 m | 70 / 190 m | 70 / 170 m |

A resolução também respeita a densidade da tela. Menos movimento do aparelho continua reduzindo
o vento por cima desses valores. A névoa preserva a ilha central e só aproxima seu fim; não
remove terreno, objetos nem colisores. Não se conta a névoa sozinha como economia de geometria.
No leve, as ondinhas deixam de montar e atualizar sua malha. O lago, o tronco, o nado e o vento
que movimenta as cordas continuam com a mesma física.

O jogo observa a **média do tempo dos quadros a cada dois segundos**. Duas janelas seguidas
mais de 20% acima do orçamento reduzem um nível, com pelo menos oito segundos entre mudanças.
Isso corresponde a menos de 50 quadros na meta de 60 e menos de 25 na meta de 30. Para aumentar,
precisa de cinco janelas seguidas até 5% acima do orçamento e de vinte segundos desde a última
mudança. A faixa intermediária mantém o nível. Um intervalo acima de um segundo, uma pausa ou
uma troca de visibilidade da aba limpa a amostra, sem aproveitar medidas antigas.

No menu **Conforto**, **Qualidade: Automática / Leve / Completa** muda na hora e fica guardada
no aparelho. Automática é o padrão, inclusive para preferências antigas. A escolha manual não
é trocada pelo medidor. `?qualidade=leve` e `?qualidade=completa` forçam o desenho para conferência
sem gravar a preferência. A meta não é um limitador de quadros: esta versão deixa o navegador
desenhar mais quando consegue. O passo físico permanece **1/60 s** em todos os níveis.

Regra: `sistemas/qualidade.ts`. O medidor `__arquipelagoDesenho` inclui nível, meta, DPR e
amplitude do vento; as medidas das plantas e das ondas mostram o efeito aplicado. Testes:
`tests/qualidade.test.ts` e `bun run test:qualidade-browser`. Ainda é necessária conferência
prolongada em celular, tablet e Chromebook reais, incluindo aquecimento e bateria.

### 6.19 Festas da estação na Vila Doce (fase2-10, 29/10/2026)

As festas voltam todo ano. Faltar não tira itens, progresso ou oportunidades futuras.
A pipoca já feita continua no inventário depois da festa. Esta entrega liga decoração
e receita; não acrescenta roupas nem prêmios de presença.

O calendário usa o dia real de São Paulo, separado do relógio acelerado do jogo.
`CALENDARIO_DAS_FESTAS` concentra as datas e seus motivos:

- Carnaval: de sábado à terça-feira de Carnaval (a terça é 47 dias antes da Páscoa gregoriana; `sabadoDeCarnaval` volta três dias). Janela aprovada pela dona em 29/10/2026.
- Festa Junina: de 1 a 30 de junho, inclusive.
- Fim de ano: **proposta de 20/12 a 06/01, ainda desativada**. A dona precisa aprovar a janela.
- Noite das Lanternas: **sem data e fora do calendário**, aguardando decisão da dona.

A data é relida a cada 30 segundos e ao voltar à aba. Abrir a fogueira e fazer a receita
também conferem a festa atual, sem esperar essa atualização visual.

Os arquivos GLB são catálogos. O jogo copia apenas os nós de cada peça. Na Junina há
três barracas, três segmentos de bandeirinhas emendados por `ponta-esq` e `ponta-dir`,
balão e fogueira com o clipe `crepitar`. Carnaval, Lanternas e fim de ano usam as peças
dos respectivos catálogos; os fogos tocam uma vez e param no último quadro.
Materiais luminosos seguem a noite. A fogueira também usa uma luz quente de alcance
de 5 metros, intensidade 2 à noite e zero de dia, sem produzir sombras extras.

Não havia âncoras de festa no modelo da Vila. As posições ficam em `arranjo-da-festa.ts`,
no espaço local da ilha: barracas em x -1, 1,5 e 4, z 9,5, y 1; fogueira em x 6,8,
z 7, y 1. A aproximação livre da fogueira fica a leste, em x 8,5. Os testes leem os
colisores reais da Vila e protegem chegada, frente das lojas, moradores e percurso
dos telhados. Apenas peças com volume no chão recebem colisores simples.

Perto da fogueira, durante a Junina, E ou Usar abre a lista de receitas existente.
**Um milho vira uma pipoca de festa**. Comer recupera fome +15 e diversão +30, com teto
100, usando as necessidades já existentes. O diário informa o local e o mês da receita.

O Zappy avisa uma vez por festa e ano, por perfil neste dispositivo. O registro fica no
localStorage; se estiver bloqueado, a sessão mantém o aviso em memória. Nada da festa
entra no formato de salvamento. Ao sair da Vila ou terminar a festa, o jogo retira
interação e painel, cancela carregamento pendente e libera os recursos gráficos próprios.

Somente no playground, `?festa=carnaval|junina|lanternas|fim-de-ano` permite conferir as
quatro montagens fora de época. Evidências e pendências em
`docs/qa/2026-10-29-primeira-festa-da-estacao.md`.

### 6.20 Recordes da família e visitas (fase3-12, 29/10/2026)

Entre as crianças da MESMA conta, sempre dentro da permissão "Visitas de irmãos" dos responsáveis
(§3, as permissões de visita). Plano com as decisões: `docs/plans/2026-10-29-arquipelago-recordes-e-visitas.md`.
Arquivos: no contrato, `familia.ts` (`IrmaosDoJogadorSchema`, `IrmaosParaOJogoSchema`,
`CasaDoIrmaoSchema`, `VERSAO_DAS_VISITAS`); no serviço, `servico-das-visitas.ts` e
`rotas-das-visitas.ts`; no Auth, `list-siblings.service.ts`; no BFF, `arquipelagoIrmaos` e
`arquipelagoCasaDoIrmao`; no jogo, `sistemas/visitas.ts`, `estado/familia.ts`,
`interface/visitas.tsx` e `plataforma/familia-falsa.ts`. Testes: `arquipelago-api`
(`tests/integration/visitas.test.ts`, `tests/unit/visitas.test.ts`, o bloco dos irmãos de
`tests/db/familia.test.ts`), `arquipelago/tests/visitas.test.ts`, o teste dos irmãos no Auth e
os do gateway e do BFF; navegador: `arquipelago/playground/verificar-visitas-browser.ts`.

- **Quem é irmão:** quem guardou o jogo logado na mesma conta (`perfis_da_conta`), não é a própria
  criança e vê o jogo pela mesma decisão de acesso. Irmão que nunca jogou nesta conta não aparece.
  A comunidade adulta não tem família.
- **A permissão:** "Visitas de irmãos" (`visitasDeIrmaos`, padrão ligada) liga as duas coisas.
  Desligada, a lista vem `desligado` e a casa dá 403 `VISITAS_DESLIGADAS`. As outras duas
  permissões não mudam nada aqui. O jogo relê a lista a cada resultado e a cada abertura do painel.
- **As rotas** (só leitura, de quem joga, fora de `/arquipelago/familia/`):
  - `GET /arquipelago/irmaos`: os irmãos com o melhor de cada percurso e se já construíram a casa;
  - `GET /arquipelago/irmaos/:perfilId/casa`: a obra da casa com o quintal, a horta, os objetos com
    aparência e o quarto (29/10/2026, o da plataforma, que o serviço pede ao Members só depois de
    todas as conferências), de um irmão. Quem não é irmão (outra conta, a própria criança, id torto) dá 404
    `IRMAO_NAO_ENCONTRADO`, sem dizer por quê.
- **Os nomes:** o serviço do jogo nunca sabe nomes. O BFF pede ao Auth os irmãos da sessão de perfil
  (`GET /auth/profile-session/siblings`: só id e nome dos outros perfis ativos da conta; fora da
  sessão de perfil, 403) e põe o nome de cada um. Quem não está na lista do Auth sai; sem a
  resposta do Auth, 502 (o jogo nunca mostra irmão sem nome).
- **Recordes da família:** no resultado de cada percurso com tempo (`PERCURSOS_DO_JOGO`), embaixo
  dos tempos, "Recordes da família": ela ("Você") e cada irmão, com as estrelas (★★☆) e o melhor
  tempo, do menor para o maior; quem ainda não correu aquele percurso vem no fim, com "Ainda não
  correu". No empate, ela vem antes. Sem irmão ou com a permissão desligada, a parte não aparece;
  lendo, "Lendo os recordes da família."; sem resposta, "Os recordes da família não carregaram
  agora."
- **Visitas:** "🏡 Visitar um irmão" no menu abre o painel (`PAINEL_DAS_VISITAS`) com cada irmão
  ("Já construiu a casa." ou "Ainda mora na casa de antes.") e "Ver a casa".
  - Na visita, o jogo desenha a casa, o quintal e a horta do irmão (os objetos com aparência com o
    modelo). O personagem vai para a frente da casa (`CHEGADA_DA_VISITA`) e o Zappy diz "Você está
    na casa de Ana. Aqui você só olha.".
  - No lugar de Viver e Construir, a faixa no alto: "🏡 Você está na casa de Ana. Aqui você só
    olha." com "Voltar para a minha casa" (no celular, abaixo das necessidades, longe do
    direcional). O menu troca o item para "🏡 Voltar para a minha casa".
  - **Nada é gravado:** o `mudar` da loja não faz nada durante a visita (nem horta, nem obra, nem
    necessidades, nem a posição). Os canteiros e os objetos não oferecem ação, o Construir some e a
    rotina dos Lumis espera a volta (se estava andando, para; o colhido já está na mochila). O que
    ela mudou antes de entrar ainda pode ser gravado nos primeiros 20 segundos (a fila do jogo).
    Nada do mundo oferece ação (nem a cama do irmão, nem a porta nova, nem a bancada, nem a largada
    de uma corrida).
  - Sair da ilha central (passar da praia, `RAIO_DA_VISITA`, 29 m) termina a visita sozinho, e o
    Zappy diz "Você saiu da casa de Ana. O seu jogo volta a ser guardado.". Lá fora o jogo é dela.
  - O quarto de dentro é o do irmão (29/10/2026), como o Meu quarto dele mostra: os móveis, o tema, o
    bichinho e os troféus. Se não chegar (o Members não respondeu), aparece vazio e o Zappy completa
    a fala da chegada com "O quarto de Ana não abriu agora.".
  - Volta: "Voltar para a minha casa" devolve a casa, a horta e os objetos dela, leva para a frente
    da casa e o Zappy diz "De volta para a sua casa.". Recarregar a página também volta.
- **Recados do painel:** "As visitas entre irmãos estão desligadas. Quem decide são os
  responsáveis.", "Ainda não há irmãos jogando o Arquipélago nesta conta.", "As visitas não
  carregaram agora. Tente de novo daqui a pouco." (com "Tentar de novo") e "Não deu para abrir esta
  casa agora.".
- **Playground:** `?familia=irmaos` (a Ana, com a casa da obra de exemplo e um quarto do espaço com
  beliche e cachorro, e o Tomás, com a casa de antes e o quarto que não abriu), `sozinha` (padrão),
  `desligada` e `fora-do-ar`.
- **Moedas:** nada disto paga moedas. O salvamento não mudou (continua na V10).

## 7. Desafios

Arquivos principais:

- `arquipelago-contracts/src/desafios.ts` e `arquipelago-contracts/src/aprenda.ts`;
- `arquipelago-api/src/domain/desafios.ts` e `arquipelago-api/src/domain/desafio-do-dia.ts`;
- `arquipelago-api/src/application/servico-dos-desafios.ts` (quem joga);
- `arquipelago-api/src/application/servico-da-equipe.ts` (Admin).

No navegador, o Quadro das Cores (7.11) chama `/desafios` e `/desafios/:id/recompensa-vista` e
abre o Estúdio de desafio pela plataforma; o caderno dos Lumis (8.1) chama `/cartas`. As regras
abaixo são as do serviço.

### 7.1 Tipos e quadros

- **Tipos** (`TIPOS_DE_DESAFIO`): `quadro-das-cores`, `desafio-do-dia`, `pedido-de-morador`. O
  Quadro das Cores tem um número de quadro. O desafio do dia tem a escolha de cada dia e nunca
  pinta a ilha (7.12). Regra própria para o pedido de morador não encontrada no código.
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
  0,4 s. Com `desafios: 'desligados'`, responde 403. O desafio do dia de mentira está em 7.12.

### 7.12 O desafio do dia

Arquivos: `arquipelago-api/src/domain/desafio-do-dia.ts` (regra pura, `escolherDesafioDoDia`),
`arquipelago-api/src/application/servico-dos-desafios.ts` (o campo `doDia` da lista), a tabela
`desafio_do_dia` (migração `0007_desafio_do_dia`) e o cartão em
`arquipelago/src/interface/quadro-das-cores.tsx`.

- **De onde vem:** dos desafios publicados de tipo `desafio-do-dia` do público da pessoa, de uma
  ilha já aberta para ela e com todos os blocos exigidos que ela já tem. Os que ela já fez também
  entram, mas vêm depois.
- **A ordem:**
  1. os ainda não feitos vêm primeiro;
  2. feitos todos, o banco recomeça pelo feito há mais tempo (a data da conclusão);
  3. **dia par puxa a ilha mais nova** (a de posição mais alta entre os desafios da etapa 1 ou 2)
     e **dia ímpar, as anteriores**. Sem desafio no grupo do dia, vale qualquer ilha;
  4. no mesmo grupo, a ordem da equipe e depois o id. A escolha nunca é sorteada.
- **Par ou ímpar:** conta os dias desde 1º de janeiro de 1970 (`diaPar`). Assim os dias se
  alternam sempre, sem repetir na virada do mês (do dia 31 para o dia 1). Exemplo: 28/10/2026 é
  ímpar e 29/10/2026 é par.
- **Fixo no dia de São Paulo** (`diaDeSaoPaulo`): a escolha é guardada na primeira leitura de
  `GET /arquipelago/desafios` do dia (tabela `desafio_do_dia`: pessoa, dia, desafio, quando foi
  escolhido e quando foi feito). Ela não muda até a meia-noite, mesmo se a equipe publicar outro.
  Duas leituras ao mesmo tempo: vale a que gravou primeiro.
- **Arquivado no meio do dia:** o desafio guardado some, e `doDia` volta `null` até o dia
  seguinte.
- **Suporte** vê a escolha do dia sem gravar nada.
- **A resposta:** `doDia: { id, dia, feito }` ou `null` quando não há desafio do dia ao alcance da
  pessoa. O campo é opcional, para o jogo antigo continuar lendo. Com `?ilha=`, o desafio do dia
  vem na lista mesmo quando é de outra ilha.
- **Feito:** quando a conferência passa no principal do desafio do dia de hoje, o dia fica feito
  ("Amanhã tem outro" até a meia-noite de São Paulo). Refazer é permitido. Quem refaz um desafio
  que já tinha concluído em outro dia marca o dia como feito, mas não ganha moedas de novo (a
  conclusão é uma só, 7.8).
- **O prêmio:** o padrão é 10 moedas e mais 5 no extra (`MOEDAS_PADRAO_POR_TIPO`). A cor é sempre
  desligada: o contrato recusa a cor ligada (`corPermitida`, em `CriarDesafioSchema`,
  `GravarDesafioSchema` e `DesafioDoManifestoSchema`, com a mensagem "O desafio do dia nunca pinta
  a ilha: a cor fica desligada."). No Admin, a caixa da cor fica desligada e trocar o tipo traz o
  prêmio padrão do novo tipo.
- **Não conta no Quadro das Cores:** ele não tem número de quadro e não pinta a ilha.
- **O cartão "Desafio de hoje"** fica em cima dos seis quadros do painel:
  - por fazer: o título, a ilha, o prêmio e "Fazer o desafio". Quando o banco recomeçou (desafio
    já feito antes), no lugar do prêmio aparece "Você já fez este. Desta vez é para treinar, sem
    moedas.";
  - feito: "Feito hoje. Amanhã tem outro.";
  - sem desafio: "Ainda não há desafio de hoje.".
- **O aviso do Zappy:** ao chegar numa ilha completa (onde fica o cavalete), com o desafio do dia
  por fazer, o Zappy diz "Tem desafio novo hoje no Quadro das Cores." Ele avisa uma vez por dia,
  por perfil e por aparelho (`localStorage` `arquipelago:aviso-do-dia:<perfil>`). Numa aba anônima
  o aviso pode se repetir.
- **Plataforma de mentira:** "A corrida das pedras" no Bosque, com `?dia=pronto` (padrão),
  `?dia=feito` ou `?dia=nenhum` no playground. "Fazer o desafio" deixa o dia feito.

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
- **Comunidade adulta:** o mesmo painel e os mesmos textos, na pele adulta do jogo (fase3-13: as
  cores, a letra e os botões do community); os cursos do "Aprenda isso em" são os adultos, porque
  vêm do serviço.
- **Montar a rotina:** o botão "Montar a rotina de um Lumi", embaixo do caderno, abre o painel
  "Rotina" (§8.2). O caderno continua só mostrando a coleção.
- **Plataforma de mentira** (`src/plataforma/cartas-falsas.ts`, mesma régua do contrato): no
  playground a pessoa tem Repetir e Se; Esperar não tem curso; no adulto os cursos levam
  "(adulto)" no nome. `?cartas=todas` dá a visão da equipe, `?cartas=desligadas` responde 403 e
  `?cartas=fora-do-ar` 424.

### 8.2 A rotina dos Lumis (fase2-07, 29/10/2026)

Da proposta: "você ensina a rotina deles com cartões, que são blocos com outra roupa"; o exemplo é
a "Rotina da Pitanga" (quando amanhecer, voar até a horta, para cada canteiro regar, se está maduro
colher, voar até a geladeira, guardar tudo, com um botão "Testar"); "mais postos, mais cartões:
repetição no começo, condições e variáveis depois". O que a proposta não diz e precisou ser
decidido está marcado como **proposta** abaixo, para a dona confirmar ou trocar.

Arquivos: `arquipelago-contracts/src/rotinas.ts` (o formato e os tetos), `salvamento.ts` (V10,
`rotinas`), `arquipelago/src/sistemas/rotina.ts` (validar, montar e o intérprete),
`src/estado/rotina.ts` (a fila e o que o Lumi faz agora), `src/interface/rotina.tsx` (o painel e
o aviso no HUD) e `src/mundo/rotina-dos-lumis.tsx` (o Lumi na horta). Testes:
`arquipelago-contracts/tests/salvamento-v10.test.ts` e `arquipelago/tests/rotina.test.ts`;
navegador: `arquipelago/playground/verificar-rotina-browser.ts`.

- **Abrir:** "Montar a rotina de um Lumi" no caderno dos Lumis (§8.1), ou "Ensinar a rotina" (E /
  Usar) perto de um Lumi da Vila (a 1,6 m, de fundo: nunca toma o E do "Prender com a luz").
  O personagem fica parado (`PAINEL_DA_ROTINA`), e Esc ou "Voltar ao jogo" fecham. Cada abertura
  lê `GET /cartas` de novo, como o caderno.
- **O painel:** escolhe o Lumi (as espécies presas, `salvamento.lumis`), mostra a rotina guardada
  dele (ou só "Quando amanhecer", a de começo) e os cartões que ela tem ("Seus cartões"). Um cartão
  escolhido entra no fim da rotina, ou dentro do controle marcado com "Pôr cartões aqui". Um
  Quando troca o começo (a rotina só tem um). Cada cartão sobe, desce e sai; os números e as
  condições trocam no próprio cartão. Embaixo, o motivo da primeira coisa que falta, ou "Pronta
  para testar.". Sem nenhum Lumi preso, o painel conta como prender um.
- **Validar** (`validarRotina`), sempre com o motivo e sem castigo (nada muda no jogo):
  - começa com um Quando ("Comece com um cartão Quando: Quando amanhecer ou Quando anoitecer."),
    e só ele é Quando;
  - tem pelo menos um cartão depois do Quando;
  - cada cartão de controle está com ela, pela leitura do serviço: "O cartão Para cada ainda não
    está com você. Ele chega quando você aprende o bloco num curso." Sem a leitura: "Não deu para
    conferir os seus cartões agora. Tente de novo daqui a pouco." (uma rotina sem controle vale
    mesmo assim);
  - nenhum controle vazio ("Ponha pelo menos um cartão dentro do Repetir."), e o Escolha com
    cartão em pelo menos um caso;
  - os tetos abaixo.
- **O que cada cartão faz** (**proposta** nos detalhes que a proposta não diz):

  | Cartão | Na rotina |
  |---|---|
  | Quando amanhecer / Quando anoitecer | Quando a rotina começa sozinha: a noite indo embora ou chegando (o mesmo `ambiente.noite` dos borrões, §6.15.3). Abrir o jogo de noite não conta como a noite chegando. |
  | Voar até | Até a horta da ilha central (o primeiro canteiro) ou a geladeira da casa. Sem a geladeira posta na casa, para: "A geladeira ainda não está na casa. Ponha a geladeira no Construir antes de voar até ela." |
  | Regar | Rega o canteiro em que o Lumi está, com a regra da horta (`regar`, §6.3). Sem semente ou já regado, não muda nada ("O canteiro 3 está vazio."). Fora da horta, para. |
  | Colher | Colhe o maduro com a regra da horta (`colher`): o colhido e uma semente vão para a mochila, como na mão da criança, e o Lumi lembra o que colheu. |
  | Guardar tudo | Na geladeira, leva o que o Lumi colheu da mochila para a geladeira, um por um (`guardarNaGeladeira`), até a capacidade; o que não cabe fica na mochila. Fora da geladeira, para. |
  | Repetir | Os de dentro de 2 a 9 vezes. |
  | Para cada | Os de dentro em cada canteiro da horta, um de cada vez: o Lumi voa até o canteiro antes. |
  | Se / Enquanto | Uma condição: o canteiro está maduro, o canteiro precisa de água, o Lumi carrega alguma coisa, ou o número que ele lembra é menor que um número (de 1 a 99). O Enquanto confere de novo a cada volta. |
  | Escolha | Um caso para cada jeito do canteiro em que o Lumi está: vazio, precisa de água, crescendo, maduro. Só os casos com cartão ficam guardados. |
  | Esperar | De 1 a 10 segundos parado. |
  | Guardar na memória | O Lumi lembra de um número (de 0 a 99). O cartão fala em "número ou palavra"; por enquanto só número, porque nenhum cartão usa uma palavra. |
  | Contar mais um | Soma 1 ao número que o Lumi lembra (sem número, para com o motivo). |

- **Os tetos** (`LIMITES_DA_ROTINA`, **proposta** pelo espaço que sobra nos 64 KB): até 16 cartões
  numa rotina, contando os de dentro; até 32 somando as rotinas de todos os Lumis; cartão dentro de
  cartão até 3 níveis. O pior caso de todo o salvamento com tudo no teto (as duas obras cheias, as
  aparências, os 14 Lumis, os turnos, os percursos e as rotinas) dá 65.246 de 65.536 bytes
  (teste). Para crescer, é preciso tirar espaço de outro lugar ou mudar o formato.
- **Uma execução** (`proximoPasso` e `aplicarPasso`, passo a passo, sem criar nada no laço do
  quadro): olha no máximo `CARTOES_POR_EXECUCAO` (200) cartões; passando disso, para com "A rotina
  passou de 200 cartões e parou. Confira se um Enquanto um dia termina e se os Repetir não estão
  grandes demais.". Como o colhido já está na mochila desde o Colher, parar no meio (erro,
  "Parar" ou a página fechando) nunca perde nada.
- **No mundo** (`RotinaDosLumis`, montado na cena): um Lumi de cada vez (os outros esperam na
  fila) aparece um pouco acima do primeiro canteiro, com o GLB da espécie na escala 0,5, e faz os
  passos: `andar` voando, `trabalhar` em cada Regar, Colher e Guardar tudo, `parado` no Esperar e
  `feliz` no fim, antes de sumir. O ritmo (`RITMO_DA_ROTINA`, **proposta**): voo a 2 m/s, 0,9 m
  acima da terra do canteiro e 0,1 m acima do topo da geladeira, 1,2 s de trabalho e 1,6 s de festa.
  Cada passo vale no salvamento na hora em que termina. Com o jogo parado (menu, painel), o Lumi
  espera. O Lumi atravessa as paredes para chegar à geladeira.
- **O aviso no HUD:** "Rotina do Quindim: regando o canteiro 2" com "Parar", no alto à direita
  (abaixo do relógio; no celular a 154 px do topo, longe do direcional). No fim, o Zappy diz "A
  rotina do Quindim terminou." ou "A rotina do Quindim parou no meio. O motivo está no painel
  Rotina.".
- **Testar:** confere a rotina e faz uma prévia no mesmo instante. Se ela pararia no meio, o
  motivo fica no painel ("No teste, a rotina pararia: ...") e o Lumi não sai. Se vai até o fim, o
  painel fecha e o Lumi faz a rotina de verdade (rega e colhe a horta dela). Não precisa guardar
  antes.
- **Guardar:** a rotina vai para o salvamento ("Rotina guardada. O Lumi faz sozinho quando o dia
  nascer."), sem os casos vazios do Escolha. "Apagar a rotina" esquece a guardada.
- **A última vez:** o painel mostra como foi a última vez de cada Lumi nesta sessão (o que ele fez,
  passo a passo, e o motivo se parou), aberta quando parou no meio.
- **Fica para depois (proposta):** o "jeito próprio" de cada Lumi da proposta ("um é rápido, outro
  carrega muito, outro brilha à noite") ainda não muda a rotina; todos voam e trabalham no mesmo
  ritmo. Os lugares são só a horta e a geladeira da ilha central.
- **Moedas:** nada disto paga moedas.

### Mini estúdio de blocos dos Lumis (fase2-14)

- A plataforma abre a ferramenta `rotina-lumi` por cima do jogo. O botão “Montar com blocos” fica no painel Rotina. Cancelar ou falhar mantém os cartões e o rascunho; “Testar”, o Lumi no mundo, o HUD e “Da última vez” continuam no jogo.
- Contrato transitório versão 1 em `arquipelago-contracts/src/rotina-ferramenta.ts`: espécie, id da abertura, rotina compacta, cartões das outras rotinas, cartões do serviço e mundo pequeno (horta, mochila, geladeira). O retorno contém só a rotina, espécie e abertura. Sem campo novo no salvamento V10.
- `rotina-execucao.ts`, `rotina-validacao.ts`, `horta.ts` e `rotina-mundo.ts` no contrato são o núcleo puro compartilhado. O jogo adapta o salvamento; a prévia usa uma cópia. A horta e a geladeira normais também usam as operações extraídas. Não há import do jogo pela plataforma.
- A ponte comum relê `GET /cartas` ao abrir e ao guardar. Os controles dependem dessa resposta, inclusive Contar mais um. O jogo confere novamente permissões, espécie, versão, abertura, alterações concorrentes e teto de 32 antes de guardar sobre o estado atual.
- Editor Blockly em `member-shell/src/components/arquipelago-rotina/` (a porta da plataforma para o jogo; saiu do Studio em 29/10/2026 para o Studio não depender dos contratos do jogo), carregado sob demanda pela plataforma, com conversão nos dois sentidos. Do Studio ele usa só o visual do Blockly (`@sistemazero/studio/blockly-theme`). Cada bloco corresponde a um cartão. Até 16 blocos, 3 níveis e 32 no conjunto. Peças soltas, controles vazios e cartões bloqueados impedem guardar.
- No computador, blocos e prévia ficam lado a lado. No celular, “Blocos” e “Prévia” alternam a área. A miniatura esquemática mostra canteiros e geladeira, o Lumi no passo, o bloco destacado e o registro. “Prever”, “Pausar prévia”, “Próximo passo” e “Recomeçar” nunca mudam o jogo. Como o antigo teste completo, a prévia usa o instante da abertura, sem acelerar o crescimento da horta pelo Esperar.
- Tema da comunidade Kids, com os tokens oficiais de cores, fontes Baloo 2/Nunito do host, botões com degrau e foco visível. A área do Blockly recebe as mesmas cores; seus menus ficam dentro do diálogo e voltam ao host ao fechar.
- JavaScript/TypeScript somente, sem Python, seletor de linguagem ou código livre. A aparência futura da miniatura pode receber arte própria; nenhum GLB foi alterado.
- Playground `?rotina=editor&lumis=quindim:1&cartas=todas` carrega um host de QA da plataforma, fora do bundle do jogo. `rotina=cancelado` e `rotina=indisponivel` exercitam as reservas. `cartas=fora-do-ar`/`desligadas` mantém as recusas do serviço.
- Provas: `member-shell/tests/arquipelago-rotina-blocks.test.ts`, `arquipelago/tests/mini-estudio-lumis.test.ts`, rotina existente e teto V10. Navegador: `arquipelago/playground/verificar-mini-estudio-browser.ts`.

## 9. Moedas e prêmios

### 9.1 Valores por desafio

| Regra | Valor | Arquivo e nome |
|---|---|---|
| Padrão do prêmio principal | 20 moedas | `arquipelago-contracts/src/desafios.ts`, `MOEDAS_PADRAO.principal` |
| Padrão do extra | 10 moedas | `MOEDAS_PADRAO.extra` |
| Padrão do desafio do dia | 10 moedas e mais 5 no extra | `MOEDAS_PADRAO_POR_TIPO['desafio-do-dia']` |
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

### 9.9 Gastar na galeria (fase1-13, 29/10/2026)

O único gasto de moedas do jogo. A função do objeto já vale no projeto azul; a galeria só compra o
visual. Catálogo em `arquipelago-contracts/src/galeria.ts` (`GALERIA`).

| Aparência | Objeto | Preço |
|---|---|---|
| Planta no vaso (`planta-interior-classica`) | Planta de interior | 30 |
| Casinha de madeira (`casinha-classica`) | Casinha de bicho | 40 |
| Forno clássico (`forno-classico`) | Forno | 50 |
| Geladeira clássica (`geladeira-classica`) | Geladeira | 60 |
| Lareira de pedra (`lareira-classica`) | Lareira | 60 |
| Aquário do recife (`aquario-classico`) | Aquário | 70 |
| Instrumentos da banda (`banda-classica`) | Instrumentos da banda | 70 |
| Fliperama clássico (`fliperama-classico`) | Fliperama | 70 |
| Museu dos fósseis (`museu-classico`) | Museu dos fósseis | 70 |

- **Por que esses preços:** de 2 a 4 desafios principais (20 moedas cada), ou uns 4 a 7 desafios do
  dia (10 e 5); a planta, um enfeite pequeno, custa um desafio e meio. O piso é um desafio (`PRECO_MINIMO_DA_GALERIA` 20) e o teto é metade do teto
  semanal do jogo (`PRECO_MAXIMO_DA_GALERIA` 75, de 150): algumas tarefas, nunca uma semana
  inteira. Fica dentro da faixa da loja do quarto e do avatar (30 a 300, mediana 70).
- **O modelo:** hoje cada aparência é o modelo do Blender do próprio objeto (`modelo: 'objeto'`,
  `arquipelago/src/assets/objetos/<objeto>.glb`). Os ids são estáveis (estão no banco e nos
  salvamentos): nunca renomear.
- **Variações (outras cores e estilos):** o catálogo já recebe mais de uma por objeto. Cada uma é
  uma entrada nova em `IDS_DA_GALERIA` e `GALERIA`, com nome, preço e um `modelo` novo em
  `MODELOS_DA_GALERIA`; o arquivo vai para `src/assets/objetos/`, e o jogo escolhe o arquivo pelo
  `modelo` em `mundo/objetos-da-casa.tsx` (hoje toda aparência mostra o `<objeto>.glb`). A
  miniatura do cartão é a do objeto (`MINIATURA_DO_OBJETO`); a variação pede a dela.
- **Como cobra** (`arquipelago-api/src/application/servico-da-galeria.ts`):
  1. `POST /arquipelago/galeria/compras` com `{aparencia, chave}` (o preço vem do catálogo, nunca
     do corpo).
  2. Já paga: devolve o que ela tem, sem cobrar.
  3. Guarda a compra `pendente` com a chave e o preço (`compras_da_galeria`, uma linha por pessoa
     e aparência). Uma compra pendente que já existe mantém a chave e o preço dela.
  4. Pede ao Members o débito pela porta de moedas (`operation: 'debit'`, a mesma carteira, a
     mesma trava e o mesmo livro de moedas da loja do quarto). A chave é a da compra: repetir
     nunca cobra duas vezes, nem com outro valor.
  5. O Members confirmou: a compra vira `paga` e só então vale.
- **Saldo curto:** 409 `SALDO_INSUFICIENTE` com o preço e o saldo de agora. Nada é cobrado, e a
  reserva sai (a próxima tentativa começa do zero).
- **Porta de moedas sem resposta:** 424 e a compra fica `pendente` (não se sabe se cobrou); o
  próximo pedido repete a mesma chave e, se o Members já tinha cobrado, só confirma.
- **Recusa definitiva** (dono diferente, chave com outro valor): log
  `arquipelago.galeria.debito_recusado` e 424.
- **Suporte olhando** (somente leitura): 403 `SOMENTE_LEITURA`, nada é cobrado nem guardado.
- **Equipe:** compra sem gastar (como na loja do quarto); o cartão diz "Equipe: comprar não gasta
  moedas."
- **O salvamento só aceita a da galeria paga:** ao gravar, toda aparência `galeria` precisa estar
  paga e ser do objeto dela; senão, 422 `APARENCIA_NAO_COMPRADA` (o jogo nunca a ganha escrevendo
  no salvamento).
- **O saldo** vem do Members pela leitura interna `GET /members/internal/arquipelago/saldo` (token
  de leitura do jogo); fora do ar, o cartão diz que o saldo não carregou e a compra segue (quem
  confere é o débito).

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
| Nome, ilha e cor de cada Lumi no álbum | 14 espécies (§6.17.1) | `arquipelago/src/sistemas/album.ts`, `ESPECIES_DE_LUMI` |
| Tetos da rotina dos Lumis | 16 por rotina, 32 somando, 3 níveis (§8.2) | `arquipelago-contracts/src/rotinas.ts`, `LIMITES_DA_ROTINA` |
| Cartões olhados numa execução | 200 | `arquipelago/src/sistemas/rotina.ts`, `CARTOES_POR_EXECUCAO` |
| Ritmo do Lumi na rotina | voo 2 m/s, trabalho 1,2 s, festa 1,6 s | `rotina.ts`, `RITMO_DA_ROTINA` |
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
| Energia descansando | banco 0,55 e cama 1,7 por segundo | `arquipelago/src/sistemas/descanso.ts`, `ENERGIA_POR_SEGUNDO` |
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
| Moedas padrão | 20 e 10; desafio do dia 10 e 5 | `desafios.ts`, `MOEDAS_PADRAO` e `MOEDAS_PADRAO_POR_TIPO` |
| Máximo de moedas por desafio | 100 e 50 | `desafios.ts`, `LIMITES_DO_DESAFIO.moedas` e `.moedasExtra` |
| Teto semanal de moedas do jogo | 150 | `members/src/infrastructure/persistence/drizzle/arquipelago-coins.repository.ts`, `ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS` |
| Preços da galeria | 30 a 70 (seção 9.9) | `arquipelago-contracts/src/galeria.ts`, `GALERIA` |
| Faixa de preço da galeria | 20 a 75 | `galeria.ts`, `PRECO_MINIMO_DA_GALERIA` e `PRECO_MAXIMO_DA_GALERIA` |
| Aparências guardadas por objeto | 12 | `salvamento.ts`, `APARENCIAS_GUARDADAS_MAXIMO` |
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

A estação Mecanismos em `/movimento` usa o arranjo da sala (`ARRANJO_DA_SALA`: tudo logo atrás da porta). No Bosque (`bosque.glb` regerado em 28/10/2026), a porta fica na parede da casa na árvore virada para a escada (âncoras `mecanismos-casa`, a dobradiça, e `mecanismos-rumo`, para dentro). A parede virada para o tronco não serve: entre ela e o tronco não passa ninguém. A placa, o caixote e o alçapão ficam no anel do deque do outro lado do tronco (âncoras `mecanismos-placa`, `-caixote` e `-alcapao`, lidas por `BosqueVivo` como `arranjo`), perto da guarda. O lado do tronco fica livre para o percurso, e o alçapão fica onde a guarda não o segura ao abrir. As medidas estão em `CASA_NA_ARVORE` e `MECANISMOS_NO_DEQUE` (`arte/ilhas/bosque.py`):
- a casa tem 1,7 × 1,8 m e 2,2 m de altura;
- a verga fica a 2,1 m: a cápsula do corpo vai a 1,8 m dos pés, mais a folga do controlador;
- o vão é 10 cm mais largo que a folha;
- a folha fica fora da espessura da parede, porque a folha colide com a casa e, encostada, abria sozinha.

O caixote que cai abaixo do chão (meio metro) volta ao começo: na troca da ilha o chão pode chegar depois dele. Testes contra o GLB: `tests/casa-na-arvore.test.ts` (a passagem pela porta, a cabeça sob a verga, o caminho do caixote, onde empurrar, o anel livre e o giro inteiro do alçapão). No navegador: `bun playground/verificar-mecanismos-browser.ts` (a criança atravessa a porta, empurra o caixote até a placa e o alçapão abre, 1,24 rad).


### Física viva: vento (28/10/2026)

O campo puro `sistemas/vento.ts` e sua versão GLSL usam a mesma conta. A hora vem do relógio do jogo; rajadas variam no espaço. `vegetacao-ao-vento.ts` encadeia os shaders existentes de pintura e pontes, incluindo cópias transparentes. Só deforma materiais de plantas e galhos altos, com raiz parada. Movimento reduzido usa 20% da amplitude visual, sem mudar a física.

Cipós livres recebem vento no passo fixo. O tronco do lago recebe força proporcional à parte exposta. Duas peças soltas tocáveis (folha e pena) têm arrasto e dormem ao cair. Folhas presas nas árvores e capim não têm corpos. Tudo monta apenas com o Bosque ativo, sem novos GLBs.


### Física viva: materiais e fogo (28/10/2026)

`sistemas/estados-dos-materiais.ts` guarda umidade, calor e combustível. A grade usa acumulador criado antes da simulação e lê todos os estados antes de propagar. Só passa calor entre peças do mesmo recinto. `MATERIAIS` concentra ignição, duração, calor e secagem. Pedra não acende; água zera o calor e apaga imediatamente.

A fogueira de `mundo/fogueira-viva.tsx` tem quatro peças dentro das pedras e um balde acessível. Só ilumina. Não causa dano nem consome inventário. Casas e plantas não são cadastradas no fogo. Posição no Bosque: `FOGUEIRA_DO_BOSQUE`, com teste de passagem contra o GLB. Estados transitórios reiniciam ao remontar a ilha. Modelos de arte não foram modificados nesta etapa.


### Física viva: mundo que reage (28/10/2026)

`objetos-reativos.tsx` monta quatro peças soltas no Bosque ativo. O controlador empurra os corpos dinâmicos, sem reposicionar o desenho para fingir empurrão. Colisores simples, peças paradas dormem e quedas para fora da ilha têm retorno. O galho baixo fora das copas quebra ao pisar; duas partes já montadas substituem o corpo inteiro, sem gerar geometria no passo. As posições ficam em `bosque.ts` e são conferidas contra o GLB.

`mundo-reativo.ts` guarda um conjunto fixo de 16 ondas. `ondinhas.tsx` lê a entrada e o deslocamento da criança e do tronco, desenha em uma malha instanciada e recorta no limite do lago. Não há simulação de fluido nem partículas criadas por quadro. Movimento reduzido baixa a opacidade. Estados transitórios pertencem à ilha ativa. Estações Peças soltas e Galho seco em `/movimento` usam as mesmas peças.

⚠️ Até 28/10/2026 os colisores da ilha completa e das pontes vivas iam com `collisionGroups={cond ? GRUPO : undefined}`. O `@react-three/rapier` aplica `undefined` como o grupo 0, então nenhum corpo dinâmico tocava a ilha: o caixote, as peças soltas, o galho, a folha e a pena atravessavam o chão e voltavam ao lugar. Só o personagem, cujo controlador não olha grupos, pisava. Use `gruposDoColisor` (`mundo/grupos.ts`); `tests/grupos-de-colisao.test.ts` recusa o padrão. O plano da física viva registra medições, notas do cartão e a conferência que falta em celular físico.

### Nico, Estrelinha e Búzio na praia (28/10/2026)

- Nico fica na areia da ilha central em `(0, 25)`, olhando para o interior da ilha. Respira
  parado e acena quando a criança chega a menos de quatro metros. Não repete enquanto ela
  permanece perto e espera pelo menos oito segundos entre acenos. A até seis metros ele vira
  para a criança e, longe, volta a olhar para o interior da ilha. Ainda não entrega cartas
  nem abre conversa.
- Estrelinha, comum, fica em `(2, 25)`; Búzio, raro, em `(3, 26)`. Usam escala 0,5 (uns 37 cm, para
  aparecerem na areia vistos da câmera) e a animação de descanso, em fases diferentes. São presenças visuais: não geram conchas nem recompensas
  e não são adicionados à coleção da pessoa. Captura e rotinas continuam para a etapa dos Lumis.
- Os três têm um cilindro arredondado menor que o desenho. A câmera atravessa esse colisor.
  Os Lumis mantêm colisores pequenos, que o personagem pode transpor como um pequeno degrau.
- As animações param com a pausa do jogo e ficam mais lentas com movimento reduzido.
  Um modelo que falha ao carregar não bloqueia a cena nem deixa um obstáculo invisível.

Arquivos: `sistemas/habitantes-da-praia.ts`, `mundo/habitantes-da-praia.tsx`,
`mundo/habitantes-da-praia-colisao.ts` e `tests/habitantes-da-praia.test.ts`.
Decisões: `docs/plans/2026-10-28-arquipelago-praia-nico-e-lumis.md`.

## Luneta do píer e placas das pontes (geral-04, 28/10/2026)

- A luneta fica na ponta do píer: x = -5, y = 0,61 e z = 35,8. O alcance de E / Usar é
  1,8 m. A criança precisa estar fora da água e na altura do píer. Um cilindro arredondado
  de raio 0,32 m e altura 1,06 m segura só o corpo, como as estacas.
- A próxima ilha fechada é a primeira do anel com posto acima do atual, segundo `ILHAS` do
  contrato. A partir do posto que abre as Nuvens, a luneta mostra o Farol na ilha central.
  A luneta não concede posto, cor, moeda nem progresso.
- O Zappy informa o nome da ilha e o nome do posto, sem número nem cobrança. Exemplo:
  "Lá é a Vila Doce. A ponte abre quando você chegar a Inventor(a)." Com o anel todo aberto:
  "Lá está o Farol, ao lado da sua casa." Os rótulos kids foram conferidos em
  `community-kids/src/lib/level-info.ts`, sem importar a plataforma dentro do jogo.
- O painel `luneta` pausa o personagem. A câmera guarda posição, orientação e campo de visão;
  faz um corte para a vista óptica e um zoom curto até 45 graus. A inclinação é 0,32 rad e a
  distância mínima é 36 m, aumentada para caber uma margem de 17 m de cada lado da ilha.
  Em tela estreita, o enquadramento se afasta. Esc e Voltar restauram a vista anterior.
- A vista aparece numa lente redonda com aro de latão (`.arq-luneta`): o círculo encosta no
  lado menor da tela e o resto fica escuro, com o nome da ilha, o Voltar e a fala do Zappy por cima.
- O tubo gira para o alvo em dois eixos, descontando os 18 graus da inclinação de origem
  do modelo. Nenhum GLB foi regenerado. A luneta só monta o interativo e o colisor quando
  seu modelo carrega; falha de arquivo fica contida na reserva desse componente.
- A observação usa a ilha leve já existente. Na ilha vista há um vulto de bicho e um brilho
  dourado, feitos com quatro malhas simples, sem corpos físicos. O ciclo dura 6 s, o vulto
  percorre até 2,6 m para cada lado e a escala do brilho varia de 0,65 a 1. Esses sinais só
  existem enquanto a luneta está aberta. O rastro da criança fica no píer, portanto a vista
  não pede a ilha completa ao carregador.
- Com `prefers-reduced-motion` ou Menos movimento do jogo, não há zoom animado, deslocamento
  do vulto nem pulsação do brilho. A mudança de vista continua disponível.
- Cada ponte fechada recebe a placa existente `placa-quadro.glb`, no fim das tábuas visíveis,
  0,5 m antes da borda e 0,6 m para o lado. Ela fica voltada para quem vem da praia.
  O texto ocupa a face `texto` do modelo, sem sobrepor outra face. A caixa simples da placa
  mede 0,96 × 1 × 0,18 m e só segura o corpo. O recado também pode ser lido com E / Usar
  a até 2,3 m: "Tem mais para descobrir. A ponte abre em [nome do posto]. Íris."
  Ao abrir a ponte, a placa sai com seu interativo, material e textura próprios.

Arquivos: `sistemas/luneta.ts`, `mundo/luneta-medidas.ts`, `mundo/luneta.tsx`,
`mundo/placa-da-ponte.tsx`, `interface/luneta.tsx`, `sistemas/perfis-de-camera.ts` e
`personagem/camera.tsx`. Integrações pequenas em `ilha-central.tsx`, `anel.tsx` e `hud.tsx`.
Testes puros e dos GLBs: `tests/luneta.test.ts`. Visita real no playground:
`playground/verificar-luneta-browser.ts`. Celular físico ainda precisa de conferência.

## Recife completo e apresentação da Maré (fase3-01, 29/10/2026)

- A ilha completa entra pelo mesmo ciclo do Bosque e da Vila Doce. O Quadro das Cores fica
  perto da chegada e usa os desafios publicados, sem inventar novos desafios nesta fase.
- A lagoa usa o nó `agua` e a bacia do GLB recebido em `02cfe22f4`: o fundo tem 0,85 de
  profundidade e rampa para sair andando. A leitura da superfície segue o Bosque e só fica
  registrada enquanto a ilha completa está ativa.
- A parte do Recife de `aj-ligar-10` considera a caverna fora do círculo da ilha leve. Proposta
  de medida: 24 unidades para a área visitável, cobrindo a boca a cerca de 21,3 do centro,
  mais 2 de aproximação por fora e folga do corpo. A roda de nado conserva as 4,6 unidades
  de folga das outras ilhas e fica a 28,6. Isso amplia a espera pelos colisores e o mar livre,
  sem desenhar ou criar chão invisível. As plataformas das Nuvens continuam fora desta fase.
- A Maré fica na âncora `casa-mare`, voltada à marca `morador`, com os mesmos gestos e controles
  dos outros moradores. Proposta de medidas baseada no GLB: cilindro com raio 0,46, altura
  1,45 e câmera da conversa a 1,2 dos pés. Só o corpo colide, sem prender a câmera. Olhar a
  7, conversar a 2,2, intervalo de aceno de 45 segundos e rapidez de giro 3 seguem o Bento.
- A apresentação proposta é “Sou Maré. Faço mapas do mar.” e “Sem meus mapas, o mar perdeu
  as rotas.” Base: a tartaruga cartógrafa da proposta fornecida em HTML. Não há amizade,
  pedidos ou presentes e a conversa não grava no salvamento. A amizade espera uma próxima
  versão, fora da V10 que está sendo feita por outra sessão.
- Navio, labirinto e mergulho ficam para a fase3-02. Não foi necessário gerar arte nesta
  integração. O teste dos lagos confere fundo e rampa; o roteiro de navegador confere ponte,
  cais, caverna, lagoa e conversa no playground, com `?posicao=4`.
- Sob o teto, a câmera compara uma posição baixa com as posições acima do ombro. Usa a folga
  existente de 0,35 abaixo do alvo, só troca com ganho de espaço maior que 0,5 e suaviza o desvio.
  A sonda continua impedindo atravessar paredes e teto. A preferência de inclinação não muda.
  O teste de navegador confere o enquadramento no computador e no celular emulado.

Plano: `docs/plans/2026-10-29-arquipelago-recife.md`. Evidências e limites da conferência:
`docs/qa/2026-10-29-recife/README.md`.

## Minijogos aprovados viram brinquedos (desafios-16, 29/10/2026)

- Passar nos objetivos principais de um desafio com recompensa.atracao guarda uma cópia do
  projeto conferido. Há uma por jogador e desafio. Refazer e passar troca somente essa cópia;
  reprovar não a muda. A primeira aprovação permanece datada para a medição.
- Teto: LIMITES_DO_DESAFIO.projetoCaracteres, hoje 1.500.000 caracteres do JSON serializado.
  Conferência e persistência verificam o teto. Sessão somente leitura não grava.
- O primeiro minijogo entregue dá o projeto azul do fliperama, pela mesma regra dos outros
  objetos. A lista é relida ao voltar do Estúdio e ao abrir o fliperama. Aparência não é
  requisito para jogar. O objeto posto em casa abre a lista e cada Jogar abre o player do
  Estúdio por cima do jogo. Voltar ou Esc retorna ao lugar em que a criança estava.
- A tela do fliperama usa a capa escolhida do minijogo atualizado mais recentemente, quando
  houver. Aceita imagens PNG, JPEG e WebP embutidas de até 400 mil caracteres
  (`CAPA_DO_MINIJOGO_CARACTERES`); maior que isso, o minijogo fica sem capa. Não inventa capa nem
  busca imagem externa.
- Rotas próprias GET /arquipelago/minijogos e /arquipelago/minijogos/:id. A lista traz resumo
  e capa; a rota de abertura traz o projeto. Nenhuma delas entrega o gabarito do desafio.
- Pais: GET /arquipelago/familia/minijogos/:perfil e /:perfil/:id. O serviço exige a ligação
  da criança à conta; a plataforma confere a grade do Auth e usa o portão dos pais no Kids.
  O cartão Minijogos que [nome] fez lê independentemente da semana e some se vazio ou falhar.
- A Medição conta uma primeira aprovação por jogador e desafio na categoria minijogos.
  Refazer não duplica a contagem; aplicam-se os grupos mínimos e filtros já existentes.
  Não sai dado pessoal.
- Não é possível recuperar projetos de conclusões antigas, que nunca foram guardados. Uma
  nova aprovação cria a cópia. Não há modelo novo nem mudança no formato do salvamento.

Plano: docs/plans/2026-10-29-arquipelago-minijogos.md. Testes, implantação e prints:
 docs/qa/2026-10-29-arquipelago-minijogos.md.

## Barco entre a ilha central e o Recife (fase3-04, 29/10/2026)

Decisão proposta nesta implementação: viagem guiada, disponível somente quando o Recife já
está aberto pela jornada. E ou Usar junto da âncora de embarque inicia a ida ou a volta.
Andar e pular não soltam a criança no mar. Os controles de andar, pular e Construir saem da
tela durante a viagem; o menu continua disponível. Não há horário nem localização persistente
do barco. Em repouso há um barco em cada porto, com o do Recife montado só com a ilha ativa.

- As posições vêm das âncoras `barco` e `embarque` do píer e `barco` e `cais` do Recife.
  A âncora `passageiro`, filha do nó animado, leva o desenho do avatar junto do balanço.
  O grupo de navegação fica fora da raiz do mixer. A atualização manual do mixer e da âncora
  acontece entre a física e o desenho do personagem, sem atraso de um quadro.
- O barco substitui `barquinho-decorativo` e `col-barco-1`. Casco e cabine têm caixas simples
  que seguram só o corpo. Durante a travessia, o modo `barco` passa pelo controlador livre do
  Rapier; a cápsula mantém as colisões com o mundo. Obstrução no embarque devolve ao cais.
- Rota proposta: saída pela proa por 8 m, guia a 60 m do centro no setor 110 graus, entre
  Nuvens e Vale dos Dinos, depois arco a 120 m pelo leste até o setor menos 70 graus e o cais
  do Recife. São 10 graus entre guias e 20 amostras por trecho, preparadas uma vez.
  O trajeto atual mede aproximadamente 524,44 m. A volta inverte a mesma rota.
- Velocidade máxima de 12 m/s. Os 10 m próximos de cada cais misturam suavemente até 2 m/s,
  para aproximar e atracar sem arrancada. Embarque e desembarque duram 1,5 s, com elevação
  de até 0,6 m para passar pela amurada. Alcance do interativo: 1,25 m junto da âncora.
- O corredor tem 5 m de meia largura nas linhas de boias. Só boias e trechos de corda que
  ocupam o caminho saem do desenho. A correnteza dos nadadores continua igual.
- O Recife continua no ciclo normal de carregar e soltar. O barco espera a 27 m do centro,
  dentro da zona de troca e fora da espera pelo chão. Só prossegue com colisores montados
  e opacidade de pelo menos 0,99. Depois de 20 s de espera sem carga, retorna ao porto de
  origem. Isso não libera ilha, não desembarca na silhueta e não deixa a criança na água.
- Pausa congela viagem e balanço. Perfil de câmera `barco`: distância mínima de 13 m e
  inclinação mínima de 0,55 radiano, para o casco caber também na tela estreita. Não força giro nem acompanha o balanço; movimento
  reduzido mantém essa câmera estável e reduz o ritmo do clipe pela metade.
- O estado é transitório. O relógio não guarda posição durante a viagem; nenhum campo foi
  acrescentado ao salvamento. Fechar o jogo mantém a última posição segura já guardada.
- Metadados dos portos são lidos do JSON dos GLBs, sem criar outra ilha completa na GPU.
  As amostras e os objetos do passo físico são reaproveitados, sem alocação no laço.

Conferência: `?novo=1&barco=central` e `?novo=1&barco=recife`, com o posto do Recife por
padrão. `posicao=2` permite conferir a recusa antes da abertura. Medidas em
`__arquipelagoDesenho.barco`. Plano: `docs/plans/2026-10-29-arquipelago-barco.md`.
Testes: `barco.test.ts`, `barco-colisao.test.ts` e `ancoras-do-barco.test.ts`.
Navegador: `playground/verificar-barco-browser.ts`; evidências em `docs/qa/2026-10-29-barco/`.

## Pico Gelado completo e apresentação do Floco (fase3-06, 29/10/2026)

- A ilha completa entra pelo mesmo ciclo do Bosque, da Vila Doce e do Recife, com o `pico.glb`
  do commit `d5fa00281`: os colisores vêm todos do arquivo (aj-ligar-01) e cabem no contorno da
  ilha leve, então a espera pelo chão é a de sempre. O Quadro das Cores fica perto da chegada.
- O Floco fica em cima do tablado do palco (âncora `palco`, no topo dele, a 0,45 do chão), voltado
  à marca `morador`, na frente do palco. Medidas tiradas do `floco.glb`: cilindro com raio 0,43 e
  altura 1,49 (o cavaquinho, que sai para o lado, fica fora), câmera da conversa a 1,19 dos pés. Só
  o corpo colide. Olhar a 7, aceno a cada 45 segundos e giro 3 seguem o Bento e a Maré; o alcance
  da conversa é 2,6 (o da Maré é 2,2), para alcançar o Floco no tablado a partir da marca da frente.
- A apresentação proposta é "Sou Floco. Toco cavaquinho no palco do Pico Gelado." e "Ainda falta
  gente para a banda tocar no festival de inverno." Base: o pinguim músico de cachecol e cavaquinho
  da arte e a banda e o festival de inverno da fase3-08. Não há amizade, pedidos ou presentes, e a
  conversa não grava no salvamento (V10).
- A trilha até o cume se anda desde já (o platô fica a uns 8 m do chão). O percurso com tempo, o
  trenó e a caverna de cristal ficam para a fase3-07; o iglu, o festival e a banda, para a fase3-08.
- O painel da apresentação é o mesmo da Maré, agora genérico (`PainelDeApresentacao`).
- Testes: `tests/pico.test.ts` e `tests/colisores-do-pico.test.ts`. Navegador:
  `playground/verificar-pico-browser.ts`, com `?posicao=5`, computador e celular emulado: chegada
  pela ponte, conversa com o Floco, de pé no começo da trilha e no platô do cume, e a ilha que solta
  ao sair e volta.

## Subida ao cume, trenó e caverna de cristal do Pico (fase3-07, 29/10/2026)

- **Subida ao cume.** Nas bandeirinhas do começo da trilha, "Começar a subida ao cume". Ao
  começar, o Zappy diz "Valendo. Suba a trilha em volta da montanha até a bandeira do cume.". Quatro
  paradas na trilha (em 1/4, 1/2 e 3/4 do caminho e na boca do platô) e a chegada ao lado da
  bandeira, no meio do platô (raio 1,2 m). Cinco flocos de neve flutuam na linha do meio da trilha,
  20 cm acima do centro do corpo de quem anda nela: pega-se andando. Cair da trilha no chão em volta
  volta à última parada, com o corte suave. Longe da largada, no chão, antes da primeira parada,
  ou fora da ilha, a subida para: "A subida parou. Nas bandeirinhas da trilha dá para começar de novo quando
  quiser.". Três estrelas: chegar, chegar em até 18 s e pegar os cinco flocos ("Três
  estrelas. Você chegou ao cume com todos os flocos de neve."). O caminho tem uns 30 m: correndo,
  uns 7 s; andando sem parar, uns 14 s. Os 18 s ficam para quem sobe andando sem parar, como nos
  outros percursos (Copas 24 s para 19 s andando, Vila 15 s para 9 s). As estrelas e o melhor tempo
  ficam em `percursos['pico-cume']` e entram no álbum, sem prêmio de item. Sem versão nova do
  salvamento.
- **Trenó.** No platô, perto do trenó (1,6 m), "Descer de trenó" senta a criança. O Zappy diz
  "Segure firme. Para os lados, o trenó vai junto. Para sair antes, é só pular.". O trenó desce pela
  própria trilha, pela linha do meio, até o pé. As contas são as do escorregador
  (`a = g × (sen θ − μ × cos θ)`) com o atrito do gelo (0,05) e teto de 4,5 m/s (o escorregador
  vai a 5,5): a trilha faz curva e é longa. Nunca para no meio; pedir o lado mexe dentro de 1,4 m
  da trilha; pular sai. No pé, a velocidade vira passo no chão, e o trenó volta ao platô. Andar na
  trilha não senta no trenó: só o "Descer de trenó", do começo. Durante a subida contra o relógio o
  trenó espera. A pausa segura o trenó onde está (o escorregador do Bosque também passou a parar na
  pausa). A câmera usa o perfil do escorregador.
- **Caverna de cristal.** Atrás da montanha, com a boca virada para o mar. A espera pelo chão e a
  roda de nado do Pico crescem para o lado dela, como no Recife. No alto da saliência do fundo, de
  pé nela, "Pegar o cristal" põe o cristal rosa na mochila: "O cristal rosa está na mochila. Ele
  brilha como o gelo da caverna.". Uma vez por jogo: com ele na mochila, o cristal some do
  pedestal. É uma lembrança: não se come nem se dá de presente. Não vai para o álbum nesta fase.

Plano: `docs/plans/2026-10-29-arquipelago-pico-percurso-treno-caverna.md`. Testes:
`tests/subida-ao-cume.test.ts`, `tests/cristal-raro.test.ts`, o trenó em `tests/modos.test.ts` e
os colisores em `tests/colisores-do-pico.test.ts`. Navegador: `playground/verificar-pico-browser.ts`.

## Vale dos Dinos completo e apresentação da Jade (fase4-01, 29/10/2026)

- `vale-dos-dinos.glb` entra em `ILHAS_COMPLETAS` e `ValeVivo` em `ILHAS_VIVAS`. Usa os 62
  colisores existentes, prepara antes da troca e libera os recursos ao sair, como o Pico.
  O Quadro das Cores usa a montagem compartilhada perto da chegada.
- A borda inclinada do terreno ultrapassa os 14,4 m da ilha leve. A maior distância medida
  nos vértices é 15,614 m, na saia submersa. `RAIO_VISITAVEL_DO_VALE` vale 16 m, cobrindo todo
  o terreno com a folga de 0,35 m do corpo. É apenas a espera pelo carregamento dos colisores;
  não muda a versão leve nem cria um piso no mar. O teste verifica todos os vértices do terreno
  e as bordas dos colisores simples, não só seus centros.
- Proposta de posição: Jade fica na âncora `morador`, no chão diante do observatório, voltada
  à `chegada`. A torre é fechada e não há subida à varanda nesta fase; a conversa deve ser
  alcançável pelo caminho da criança. Os degraus existentes continuam sustentando o corpo.
- `JADE_NO_VALE`, em `sistemas/jade.ts`: raio 0,41 m e altura 1,5 m, medidos no material `penas`
  do `jade.glb` (x até ±0,405827, topo y 1,5). Asas, chapéu e lupa não ampliam o cilindro.
  `col-morador-jade` segura só o corpo, não a câmera. A câmera da conversa mira y 1,15 dos pés,
  centro dos olhos de material `iris` (y 1,045 a 1,255). Os clipes `parado`, `andar`, `falar`,
  `acenar` e `feliz` existem; as três malhas dos olhos têm `piscar` e `feliz`.
- Olhar a 7 m, alcance da conversa 2,2 m, aceno a cada 45 segundos e rapidez de giro 3 seguem
  a Maré. O morador genérico mantém as animações e o respeito à preferência de menos movimento.
- Apresentação proposta: “Sou Jade. Estudo os fósseis do Vale dos Dinos.” e “Minha lupa ajuda a
  olhar os detalhes dos fósseis.” Base: a coruja dos fósseis e a lupa da arte. O painel genérico
  mostra uma fala de cada vez. Sem amizade, presentes, pedidos ou mudanças no salvamento V10.
  Pegadas, escavação e ninhos interativos são da fase4-02; filhote e museu, da fase4-03.
- Testes da integração: `tests/vale.test.ts`. Os testes de colisores e faces coplanares já
  incluem o Vale. Navegador: `playground/verificar-vale-browser.ts`, com `?posicao=6`, computador
  e celular emulado. Plano e decisões em `docs/plans/2026-10-29-arquipelago-vale.md`.
  Nenhuma arte foi alterada e não foi necessário solicitar modelo ou âncora ao Blender.

## Mergulho do Recife (fase3-02, 29/10/2026)

- Na marca de mergulho do Recife, use **Mergulhar** depois que o cenário carregar. A direção
  segue a câmera. Espaço sobe e Q desce; no toque há Subir e Descer. No controle físico, o botão
  inferior sobe e o esquerdo desce. Soltar mantém a profundidade. Subir até a superfície volta
  ao nado comum. O menu, uma ferramenta aberta e a aba escondida pausam o movimento.
- Não existe contador de fôlego, dano ou perda por demorar, nem no Kids nem no adulto. A subida
  é escolhida pela pessoa, evitando empurrar o corpo contra o teto do porão. O limite diário do
  Kids continua sendo o tempo livre da família, sem regra nova de tempo para o mergulho.
- Velocidade até 2,6 m/s na horizontal e 1,4 m/s na vertical. Aceleração 6 m/s², freio 4 m/s².
  A física continua em passos de 1/60 s, mesmo quando o desenho fica a 30 quadros por segundo.
  Nos últimos 3 m do volume de 48 m de raio, a corrente cresce suavemente até 3,2 m/s para dentro,
  mais que o nado: ninguém sai do volume pelo lado (antes eram 1,2 m/s e dava para sair nadando).
  A descida automática da entrada dura 1 s de jogo; o relógio do modo para com o jogo pausado.
- O navio fica em (18, 0, -30) e o labirinto em (-1, 0, 27), coordenadas locais do Recife.
  O navio e o labirinto saem da água, então o Recife tem três rodas de boias: a da ilha (28,6 m),
  uma em volta do navio e outra em volta do labirinto (o contorno de cada modelo mais a folga de
  4,6 m), cada uma encostada na da ilha. As boias que caem dentro de outra roda da mesma ilha não
  aparecem. Uma roda só para os dois (52,6 m, como saiu na primeira entrega) encostava na roda da
  sua ilha e abria o mar até o centro sem ponte. A prova confere que entre cada roda do Recife e as
  outras rodas sobra a faixa inteira da correnteza, e a folga dos modelos para o barco e as pontes.
  O fundo continua a -3,5 m.
- O baú e o tesouro das pérolas entram no álbum e dão diversão +15 cada, até o teto 100, só uma
  vez. A página abre o relato do Recife no diário. São descobertas, sem moedas ou item novo.
  As três marcas ficam juntas no salvamento V11. V1 a V10 migram sem perder o que já havia.
- Reabrir o jogo durante o mergulho volta à entrada segura e mantém os achados. A posição
  temporária no fundo não substitui o ponto seguro. Não há retorno automático que retire progresso.
- A câmera chega até 3 m, com foco baixo para enxergar dentro do porão, sem balanço nem giro
  automático no mergulho. Fora da água o desvio da câmera (girar para o lado livre, subir pelo
  ombro) vale com ou sem menos movimento, como antes. A preferência de menos movimento, do menu
  ou do aparelho, pausa o balanço dos cenários.
- Os achados: "Guardar o baú do navio", "Guardar a página do Recife" e "Guardar as pérolas do
  labirinto"; ao guardar, "O baú do navio entrou no álbum." e "As pérolas do labirinto entraram no
  álbum.", com a diversão. O botão Descer do toque solta sozinho quando o mergulho acaba.
- O corpo e seus colisores continuam os mesmos. Os colisores do navio e do labirinto vêm dos GLBs
  existentes.
- O mergulho carrega e libera seus modelos junto com o Recife. Falha parcial ou resposta tardia
  libera os recursos; não se entra antes de os colisores estarem prontos.

Plano: `docs/plans/2026-10-29-arquipelago-mergulho.md`. Conferência local e limites das provas:
`docs/qa/2026-10-29-mergulho/README.md`.

### Visão nos corredores estreitos

Quando a colisão aproxima a câmera a menos de 1,4 m do centro do corpo no mergulho, só o desenho
do avatar fica oculto, para não mostrar seu interior. Ele reaparece a partir de 1,65 m. Essa
folga evita piscar na borda. A cápsula, a posição, as animações e os comandos não mudam.
A escolha da ilha completa é única nas áreas de carga sobrepostas; durante o mergulho, o Recife
mantém a prioridade até a saída, mesmo que a pessoa se aproxime da área de outra ilha.

## Pegadas, escavação e cuidado dos ninhos do Vale (fase4-02, 29/10/2026)

- O rastro de três dedos vai da chegada até a escavação, passando pela abertura da cerca.
  A espécie não é identificada: a arte não informa qual dino deixou a marca. Não associar
  o desenho da pegada ao osso encontrado. As pegadas reaproveitam as elipses e a malha
  instanciada do Bosque, cujas medidas permanecem iguais.
- A busca considera os colisores da ilha e o cavalete do Quadro das Cores. Converte os
  colisores preparados e girados para o referencial das âncoras. Grade de 12,5 cm, corpo
  de 35 cm de raio e folga de 3 cm para evitar as quinas das costelas. Confere também
  os segmentos entre células, em vez de apenas os centros. O rastro é calculado ao montar
  a ilha, nunca no passo da física. Marca de 60 cm, alternância lateral de 13 cm, passo de 70 cm.
- Seguir começo, meio e fim, em ordem, registra o rastro no diário. A tolerância é 1,3 m.
  Não é preciso pisar em cada marca. A escavação também pode ser encontrada por outro caminho.
- Escavar tem três ações de E/Usar: tirar areia, limpar com o pincel e observar o fóssil.
  Não há tempo, perda ou consumo. O nó osso do GLB de props existente aparece com metade
  da altura coberta na primeira ação e inteiro na segunda. Observar conclui o registro
  no diário. Seu tamanho medido é 1,56 m de largura e 0,28 m de altura; a posição reserva
  raio de 0,8 m dentro da cerca, fora do esqueleto. Osso miúdo no chão não segura o corpo.
- Em cada um dos três ninhos, observar os ovos sem tocar e andar para longe dá espaço ao
  ninho. E/Usar alcança 2,2 m, como a conversa da Jade. Afastar-se 3 m conclui o cuidado.
  São parâmetros da brincadeira, não medidas biológicas. Zappy explica e informa quantos
  ninhos já receberam cuidado. O diário guarda cada ninho, e a Jade reconhece os três.
  Não há perigo, inimigos, ovos quebrados, castigo ou contagem regressiva.
- Pausa, visita e sessão somente leitura não avançam as descobertas. Sair da ilha cancela
  apenas a observação ainda não concluída. Não há animação extra de câmera ou balanço,
  então o movimento reduzido mantém a mesma brincadeira estática.
- A V12 guarda pegadas seguidas, etapa da escavação e ids dos ninhos cuidados. V1 a V11 migram
  sem perder conquistas. Retomar mantém inclusive a escavação parcial. Duas sessões conciliam
  as descobertas por união dos ninhos, maior etapa e rastro concluído, sem duplicar recompensas.
- Nenhuma mudança de GLB, gerador, amizade ou inventário. Filhote e museu continuam na fase4-03.

Plano: `docs/plans/2026-10-29-arquipelago-vale-pegadas-ninhos.md`. Conferência e capturas:
`docs/qa/2026-10-29-vale-pegadas-ninhos/README.md`.

## Ilha das Nuvens completa e apresentação da Iriê (fase4-06, 29/10/2026)

- A ilha completa usa os 50 colisores de `nuvens.glb`, no mesmo ciclo de preparação, troca e
  descarte do Pico e do Vale. O Quadro das Cores fica perto da chegada. A ponte termina em
  y 8,12 m, acompanhando os 7 m de elevação da ilha, sem criar um salto na chegada.
- Iriê fica na âncora morador, olhando para chegada. Cilindro de raio 0,39 m e altura 1,49 m,
  medido nas penas da cabeça principal e do corpo, sem asas, cauda, topete ou tear de mão.
  A câmera mira os olhos a 1,19 m dos pés. A apresentação usa o painel e os clipes do morador
  genérico, incluindo o movimento reduzido do sistema.
- Falas: “Sou Iriê. Teço o arco-íris com estes fios.” e “O tear fica aqui na Ilha das Nuvens.”
  São descrições da arte. A conversa não concede amizade, pedidos ou presentes e não muda
  o salvamento.
- Os vértices dos colisores chegam a 18,7404 m do centro. Esperar o chão até 19,2 m inclui
  as plataformas externas e a folga do corpo. Isso não cria terreno na versão leve.
- Os quatro tampos ficam originalmente a 3,2, 5, 6,8 e 8,6 m no modelo, além dos 7 m da ilha.
  Cada um sobe 2,4 m em 6 segundos, espera 4 segundos, desce em 6 e espera mais 4.
  Vizinhos alternam as pontas. Há quatro segundos para saltar com a próxima plataforma
  0,6 m mais baixa. Os vãos maiores pedem corrida e pulo.
- A velocidade aumenta e diminui suavemente, até 0,6 m/s. Desenho, âncora e tampo se movem
  juntos. O personagem usa o mesmo controlador de colisão das pontes vivas. Pausa congela;
  menos movimento mantém este transporte, necessário para subir, sem balanço ou giro extra.
- Esta fase não liga corrida, constelações, clima ou passeio de balão. Não muda o salvamento,
  não altera geradores e não regrava GLBs. Testes e capturas em
  `docs/qa/2026-10-29-nuvens/README.md`.
