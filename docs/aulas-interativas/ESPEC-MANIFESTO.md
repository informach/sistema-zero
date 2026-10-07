# Especificação do manifesto importável

> Contrato para gerar o `manifesto.json` de cada aula redesenhada. O formato é o mesmo dos
> manifestos v5 do `sistema-zero`, lido direto do validador real em
> `packages/core/src/learning/index.ts` (`isLearningManifest`) em 20/09/2026.
>
> Manifesto que não passa no validador não importa. Siga ao pé da letra.

## Antes de montar o manifesto

As [Diretrizes Pedagógicas](DIRETRIZES-PEDAGOGICAS.md) são a referência única para contexto, Zappy, atividades, paletas, quizzes e adaptações por curso. Este arquivo descreve como representar essas decisões no contrato técnico.

Vídeos planejados e diálogos são blocos diferentes. `blockKeys` conserva sua ordem editorial; `completion.blockIds` inclui evidências obrigatórias, não a fala de orientação. No quiz formativo, incluir a chave do quiz nesse critério. A configuração `videoBeforeActivity` pertence ao curso, não à ordem dos blocos. Não há vídeo a aguardar na seção de quiz.

## 1. A regra das duas colunas

Esta regra **não está no manifesto**. Ela é do player, mora em
`packages/member-shell/src/lib/lesson-split.ts` (`partirSecao`) e é código puro com teste. O
manifesto não escolhe coluna: quem escolhe é o tipo do bloco.

**Vão para a coluna da DIREITA:**

- Bloco de **Estúdio** ou **Pinta** embarcado (`kind: 'studio'` ou `'pinta'`) que não seja galeria
- Bloco **interativo cuja atividade é uma CENA** (`experimentation`) ou um jogo pronto
  (`project-play`), ambos tratados como bancada sem editor
- A **prévia em livro** de um bloco `materials` com `bookPreview: true`; o download do mesmo bloco
  continua na esquerda

**Vai para a coluna da ESQUERDA todo o resto**, na ordem em que aparece na seção:

- vídeo planejado, diálogo do Zappy, texto, quiz
- e, com atenção, **bloco interativo que não é bancada**: pergunta curta (`question`) e experiência
  em HTML (`html`) ficam na **esquerda**. Elas se leem e se respondem no meio da aula, ao contrário
  da cena e do jogo pronto

### O que isso obriga no desenho da seção

1. **A ordem entre colunas não existe.** Colocar um diálogo depois do Estúdio na lista de blocos
   não o põe embaixo do Estúdio: ele vai para a esquerda do mesmo jeito. A ordem só vale **dentro**
   de cada coluna.
2. 🚫 **Ferramenta de criação e experiência nunca dividem a mesma seção.** Regra de produto de
   20/09/2026. Vale para o Estúdio e o Pinta, **embarcados ou externos**. Se a aula precisa das
   duas coisas, são duas seções, com a experiência antes e a ferramenta depois.

   ⚠️ Atenção ao caso que já escapou uma vez: a regra de coluna sozinha **não** pega a ferramenta
   externa, porque `externalTool` é um atalho que mora na coluna da esquerda e não disputa a
   direita. Confira `workspaceKey` **e** `externalTool`.
3. ⚠️ **Toda seção com ferramenta tem vídeo mostrando como se faz.** Regra de produto de
   20/09/2026, sem exceção, inclusive nas seções de entrega. Criança não aprende gesto por escrito.
4. **No máximo uma coisa na direita por seção.** Duas cenas na mesma seção empilham na mesma coluna
   e brigam pelo espaço.
5. **Seção só com a ferramenta ocupa a largura toda.** A divisão só liga quando há conteúdo dos
   dois lados. Uma seção com o Estúdio e mais nada abre inteira, e isso é o comportamento certo.
6. **A divisória só aparece acima de 1080 px de coluna.** Abaixo disso a aula empilha e oferece
   "Ver exemplo" e "Criar". Não escreva na fala nada que dependa de os dois lados estarem visíveis.

### 🚫 Fala que aponta para onde a ferramenta está

A posição da ferramenta em relação à aula **muda com a largura**: ao lado acima de 1080 px,
embaixo abaixo disso. Então qualquer fala que localize a ferramenta ou o jogo fica errada em
metade dos aparelhos.

| Não escreva | Escreva |
|---|---|
| "Nesta bancada aqui do lado" | "Nesta bancada" |
| "Olha a área do jogo, ali do lado" | "Olha a área do jogo" |
| "Olha o seu jogo aí embaixo" | "Olha o seu jogo" |
| "escolha a criação aqui embaixo" | "escolha a criação na lista" |
| "Desce até o estúdio, embaixo do vídeo" | "Abra o Estúdio desta seção" |

⚠️ **Isto vale só para a relação entre a aula e a ferramenta.** Posição *dentro* do Estúdio ou do
Pinta é estável e pode ser dita: "na coluna da esquerda, onde ficam os bloquinhos", "a Prévia, na
coluna da direita", "solta ao lado do Ao iniciar", "o botão ali do lado na janela". Essas não
mudam com a largura da aula.

⚠️ O molde de roteiro herdado traz "olha o seu jogo aí embaixo" como fórmula canônica das três
ações de testar. Ela nasceu no layout antigo, de vídeo em cima e Estúdio embaixo, e **precisa ser
atualizada lá também**.

## 2. Estrutura do arquivo

```json
{
  "version": 5,
  "courseSlug": "nave-contra-asteroides",
  "lessonSlug": "dia-1",
  "title": "A nave ganha vida",
  "retireBlockKeys": ["chave-antiga-1"],
  "blocks": [ ... ],
  "sections": [ ... ]
}
```

- `version` sempre **5**.
- `retireBlockKeys` é opcional. Lista as chaves de blocos importados antes
  que saíram do manifesto. Nenhuma delas pode estar em `blocks`. Desde 07/10/2026 a lista não é
  mais necessária para tirar um bloco do rascunho: ao reimportar, todo bloco que veio de uma
  importação e não está mais em `blocks` sai sozinho, inclusive vídeo já vinculado (o vídeo
  continua no Vimeo). A chave listada só dá nome ao bloco na prévia do Admin. Blocos criados à mão
  no Admin ficam no fim da aula no modo padrão e saem no modo "Substituir o rascunho inteiro".
- `title` é o título da aula, até 200 caracteres.

## 3. Chaves

Toda `key` (de bloco e de seção) casa com `^[a-z][a-z0-9-]{0,79}$`: começa com letra minúscula, só
minúsculas, números e hífen, até 80 caracteres. Sem acento, sem underline, sem maiúscula.

## 4. Blocos

Um bloco tem `key` e **exatamente uma** de duas formas: `plannedVideo` ou `content`.

### 4.1 Vídeo planejado

```json
{ "key": "video-abertura", "plannedVideo": "Título: O que a gente vai fazer hoje\n\nMostrar o jogo do fim do dia rodando..." }
```

O texto vai até 5.000 caracteres.

**Convenção obrigatória do título do vídeo.** O formato não tem campo de título. Então a primeira
linha do `plannedVideo` é sempre `Título: <nome do vídeo>`, seguida de uma linha em branco e das
instruções de produção. Esse título é o que vira a capa do vídeo.

O título é curto, fala com quem assiste e não repete o título da seção quando puder ser mais
específico.

### 4.2 Bloco com conteúdo

O manifesto inclui a configuração completa. Uma aula vazia cria os blocos declarados. Ao reimportar,
a chave mantém o mesmo ID; se houver um único bloco anterior do mesmo tipo, ele conserva o ID e
recebe a nova configuração. O projeto inicial do Estúdio vem sempre do manifesto nos dois modos
de importação; isso não altera entregas ou rascunhos já salvos pelos alunos. O desenho do Pinta,
os itens anexados a materiais e a arte do certificado configurados manualmente são preservados.
Dois blocos candidatos tornam a prévia ambígua e impedem a importação.

**Estúdio:** `initialProject` é um snapshot do formato atual com nome, arquivos, blocos de partida
e `installedExtensions`. Use a versão do manifesto da extensão oficial. `chain`, `level`,
`allowedModes`, `allowBlocks`, `allowLevelReveal`, `purpose`, `gallery` e `showcase` ficam no mesmo
`content`. O mesmo `key` pode ser `workspaceKey` nas seções de construção e aparecer em `blockKeys`
na seção de entrega.

**Pinta:** `initialAsset` é o desenho inicial completo. Em entregas pela galeria, `initialAsset` é
`null` e `gallery` informa `minItems` e `maxItems`; a criança escolhe criações da própria galeria.

**Materiais:** `content` inclui `kind: "materials"`, `title` e `items`; `bookPreview: true` é opcional
quando o primeiro PDF deve aparecer como livro na outra coluna, sem duplicar o bloco nem o upload.
Um item `file` precisa do
`attachmentId` de um arquivo realmente anexado à aula. O manifesto não contém bytes nem URL privada.
No Dia 1 do Desafio e na primeira aula de Corre, Dino! e O Jogo do Meu Jeito, os blocos dos
cadernos já são criados com `items: []`. Os PDFs precisam ser enviados e vinculados no admin;
o PDF vigente do Farol está em `output/pdf/desafio-farol-caderno.pdf`. Gravar os vídeos de apresentação
depois de anexar os arquivos reais. O material atual do Desafio é somente o Caderno do Aluno;
o antigo Mapa dos Pais não integra essa versão.

**Certificado:** `content` inclui `kind: "certificate"` e o texto que aparece no PDF. Uma imagem
base e assinaturas podem ser configuradas depois, quando houver arquivos públicos reais.

Demais conteúdos:

**Diálogo do Zappy** (o balão de fala). Texto até **400 caracteres**.

```json
{ "key": "fala-areas", "content": { "kind": "dialogue", "pose": "speaking", "text": "..." } }
```

`pose` é opcional e aceita `speaking`, `happy`, `thinking` ou `celebrating`.

Use no máximo um diálogo por seção e somente em três funções:

- ponte de conceito: convite geral como "Agora é hora de ver essa ideia funcionando", sem repetir
  os controles e objetivos já escritos na experiência;
- ponte prática: resumo curto do que o vídeo mostrou e convite para montar no projeto;
- introdução de quiz: diz que é hora de conferir o que ficou claro, sem ensinar a resposta.

Se a fala precisa continuar em outro balão, ela não é mais uma intervenção pontual: reescreva ou
leve o conteúdo para o vídeo.

**Texto** até 50.000 caracteres.

```json
{ "key": "apoio", "content": { "kind": "rich_text", "markdown": "..." } }
```

🚫 **Não use em curso infantil.** Decisão de produto de 20/09/2026: **criança não lê texto corrido.**
Todo conteúdo cabe em um de dois lugares:

- **Vídeo**, para passo a passo, orientação de ferramenta e qualquer coisa mais robusta. O gesto
  precisa ser executado na tela, não descrito por escrito.
- **Balão do Zappy**, para o que é curto: um resumo, uma instrução enxuta, uma orientação de uma ou
  duas frases. Nunca um passo a passo.

Se você está escrevendo um texto e ele não cabe num balão de 400 caracteres, **isso é sinal de que
o conteúdo pertence ao vídeo**, não de que o texto deve ficar maior.

**Interativo** (cena, jogo pronto, pergunta ou HTML).

```json
{ "key": "experiencia-tela", "content": {
  "kind": "interactive",
  "title": "Descubra o limite da tela",
  "instructions": "...",
  "hints": [],
  "required": true,
  "activity": { "type": "experimentation", "scene": "stage-size", "cenario": "corre-dino" }
} }
```

O player organiza toda experimentação nesta ordem: HUD e nome, cena, instrução curta do Zappy,
pista solicitada, controles e retorno. Portanto, `instructions` deve orientar a ação sem repetir os
controles nem o vídeo. A instrução fica abaixo da cena e imediatamente antes dos controles.

`required` deve ser **true** sempre que a cena for o critério de conclusão da seção. Este é um
defeito conhecido do material atual: quatro cenas estão como opcionais sendo o único critério.

**Jogo pronto na aula.** Para uma abertura que pede à criança jogar antes de construir, use
`activity.type: "project-play"` dentro de um bloco `interactive`. No admin, a mesma configuração
fica em **Tipo de atividade → Jogo pronto para jogar**: importar o arquivo exportado pelo Estúdio,
criar ou editar uma cópia no Estúdio incorporado, aplicar/cancelar e testar a prévia. Manifesto é
um atalho de cadastro, não uma exigência para editar. `project` é um snapshot clássico do Estúdio
completo e independente do `initialProject` do Estúdio; `stage` declara a largura e altura lógicas
do palco (inteiros de 1 a 8192); `targets` declara cada alvo como `{ id, label, x, y, width, height }`,
com IDs únicos e retângulos dentro do palco. O
player mantém a interação do próprio jogo, sem abrir o editor nem acrescentar botões de busca.
Só a moldura oferece Ampliar jogo, Voltar à aula e Jogar de novo. Reiniciar zera a partida, não
uma conclusão já conquistada; achados de partidas incompletas diferentes não se somam. A conclusão
depende de `completion`:

- `"participation"`: padrão para apresentações novas. Um toque/clique ou comando real de teclado
  dentro do jogo registra `participated: true`, sem exigir vitória. Carregar, focar, mover o mouse,
  ampliar e reiniciar não contam. `targets` pode ser `[]`. Não exige a extensão Jogo 2D.
- `"targets"`: exige de 1 a 12 alvos e a extensão Jogo 2D. Conta os eventos de clique/toque em grupo
  dentro dos retângulos e requer todos os IDs distintos em `foundTargets`. Não é um detector
  genérico de vitória. O admin edita todos os campos dos alvos.
- Ausente: mantém o critério antigo por alvos, inclusive o Cadê Todo Mundo?. Não migrar uma aula
  existente para participação sem uma decisão pedagógica explícita.

Os outros critérios da seção, como assistir ao vídeo, continuam separados. Isso registra
participação, não é uma prova antitrapaça nem uma entrega da criança. O snapshot admite até
1.500.000 caracteres, incluindo recursos. Projetos Pro não são suportados por este player.
Importação inválida não substitui o projeto atual; edições no Estúdio só entram ao aplicar.
Para exigir a brincadeira, marque `required: true` e inclua o bloco na conclusão da seção,
junto do vídeo. No admin, use a opção de atividade essencial e os critérios da seção.
Não admite `prediction` nem `checkpoint`: este bloco conclui pela brincadeira, sem pergunta anexa.
Não use `html` para esse caso: uma atividade HTML obrigatória exige uma pergunta corrigida pelo
servidor, que seria um pedágio artificial para a primeira brincadeira.

**Quiz.** Use o formato dos manifestos atuais. Ele sempre ocupa uma seção própria, acompanhado no
máximo por um diálogo introdutório do Zappy. O quiz não divide seção com vídeo, cena ou ferramenta.

## 5. Seções

Entre 1 e 59 seções. Cada uma:

```json
{
  "key": "areas",
  "title": "O que acontece uma vez e o que acontece sempre",
  "objective": "Separar a preparação da repetição.",
  "intent": "application",
  "blockKeys": ["video-areas", "fala-areas"],
  "workspaceKey": "projeto",
  "externalTool": null,
  "pendingMedia": [],
  "completion": { "version": 1, "blockIds": [], "projectChecks": [ ... ] }
}
```

- `title` até 200 caracteres, **obrigatório em toda seção**.
- `objective` até 2.000 caracteres.
- `intent` é um de: `presentation`, `exploration`, `explanation`, `application`, `delivery`,
  `material`, `closing`.

  ⚠️ **`demonstration` deixou de existir em 20/09/2026.** A plataforma removeu o formato de
  demonstração e ficou só a experimentação, porque todo processo no tempo já é coberto pelo vídeo
  da aula. Nenhuma das 27 aulas anteriores usava demonstração como atividade; as três seções que ainda
  tinham esse `intent` passaram para `explanation`.
- `workspaceKey` aponta a chave do bloco de Estúdio ou Pinta embarcado, ou `null`.
- `externalTool` é `estudio`, `pinta` ou `null`. **Nunca junto com `workspaceKey`.**
- `pendingMedia` é lista de textos, no máximo 20. Deixe `[]`.
- `completion` é obrigatório na versão 5.

### Como declarar o Estúdio da aula

O bloco do Estúdio aparece **uma única vez** em `blockKeys`, na seção onde ele é o conteúdo
principal (normalmente a entrega), e é referenciado por `workspaceKey` em **todas** as seções que
trabalham nele.

## 6. Conclusão de seção

```json
"completion": {
  "version": 1,
  "blockIds": ["chave-do-bloco-avaliado"],
  "projectChecks": [
    { "id": "inicio", "label": "Coloque Ao iniciar.",
      "rule": { "type": "usesBlock", "blockType": "sz_frame_start", "count": 1 } }
  ],
  "platformAction": { ... },
  "materialItems": [ { "blockId": "...", "itemIds": ["..."] } ]
}
```

`blockIds` lista as chaves dos blocos que precisam ser concluídos (vídeo assistido a 90%, cena com
as metas caídas, quiz respondido). `projectChecks` verifica a estrutura do projeto no Estúdio.

Na direção vigente, uma seção com vídeo e atividade nunca conclui por apenas um deles:

- vídeo + experimentação: os dois aparecem em `blockIds`;
- vídeo + Estúdio/Pinta: o vídeo aparece em `blockIds` e a ferramenta entra por seu bloco concluído
  e/ou pelos `projectChecks` que comprovam a etapa;
- vídeo + ferramenta externa: o vídeo entra em `blockIds` e a ação verificável disponível entra no
  critério. Se a plataforma ainda não consegue observar a ação, registre explicitamente a limitação
  na proposta e não finja que houve validação.

Exceção: um fechamento pode reutilizar como `workspaceKey` um Estúdio cuja prática já foi
comprovada em seção anterior, apenas para oferecer uma ação **opcional**, como compartilhar o jogo.
Nesse caso, o bloco do Estúdio continua pertencendo só à seção prática em `blockKeys`; o fechamento
exige o próprio vídeo, não uma segunda entrega nem a ação opcional. Isso não dispensa a evidência da
prática na seção anterior.

Regras de `usesBlock`: `blockType` é o tipo real do bloco do Estúdio, `area` aceita `structure`,
`appearance`, `molds`, `start`, `events` ou `loops`, `count` exige número exato de blocos ativos
(zero confere remoção), `fields` e `inputs` conferem valores, `beforeBlock` confere ordem na mesma
sequência e `inputBlocks` confere o que está encaixado num campo.

Quando um campo admite imagens alternativas, `fieldOptions` declara os nomes aceitos, por exemplo
`fieldOptions: { IMAGE: ['farol-listrado-aceso', 'farol-de-pedra-aceso'] }`. A lista aceita de 1 a 50
nomes distintos e não pode repetir um campo de `fields`. A opção precisa estar no mesmo bloco
ativo e no mesmo encaixe exigido por `inputBlocks`; imagens apagadas e ações no outro ramo não
satisfazem uma regra que pede um farol aceso. O editor do Admin exibe os valores aceitos.

**Regra travada neste projeto:** todo campo que a aula declara livre tem critério em faixa ou não
tem critério, nunca valor exato. Quatro aulas hoje reprovam quem aceita o convite do vídeo.

## 7. Invariantes que o validador cobra

1. Toda chave de bloco aparece em **exatamente uma** seção, em `blockKeys`. Nenhum bloco órfão,
   nenhum repetido.
2. `workspaceKey`, quando não é `null`, precisa existir em `blocks`.
3. Chaves de bloco e de seção são únicas no arquivo.
4. Nenhuma chave de `retireBlockKeys` está em `blocks`.
5. No máximo 200 blocos.
6. `workspaceKey` e `externalTool` nunca aparecem juntos na mesma seção.

## 7b. Cena que ainda não existe no catálogo

⚠️ **Descoberta de 19/09/2026, e ela muda a ordem do projeto.** O validador do core recusa um bloco
interativo cuja `activity.scene` não esteja em `SCENE_IDS`. Ou seja, **um manifesto que usa cena
nova não importa enquanto a cena não for construída**.

Isso não é motivo para trocar a cena por outra nem para tirar a seção. Escreva o manifesto com a
cena certa. O validador deste projeto separa esses casos em `AGUARDA`, e essa lista **é** a fila de
dependências entre a implementação das cenas e a importação das aulas.

Estado em 19/09/2026, depois da construção: o catálogo tem **56 cenas**, e **todas as 11 cenas novas
existem**, com presets onde a especificação pedia. A fila `AGUARDA` está vazia, e a regra acima
continua valendo para qualquer cena que venha a ser especificada daqui para a frente.

O mesmo vale para as metas: uma aula que cobra meta inexistente é `FALHA`, não `AGUARDA`. Com as
metas que faltavam já criadas, as aulas que tinham adiado a lista passam a declarar `setup.goals`
com o subconjunto que elas cobram. ⚠️ Meta marcada `soNoCaso` no catálogo fica fora da missão de
fábrica e **só vale quando declarada**.

## 8. Onde salvar

Um arquivo por aula, ao lado do relatório dela:

```
aulas/{slug-da-aula}.manifesto.json
```

Exemplo: `aulas/nave-contra-asteroides-dia-1.manifesto.json`, ao lado de `aulas/nave-contra-asteroides-dia-1.md`.

## 9. O trio da aula anda junto

Cada aula tem **três arquivos**, e eles descrevem a mesma aula de três ângulos:

| Arquivo | O que guarda |
|---|---|
| `aulas/{slug}.md` | a proposta: intenção de cada seção, diagnóstico, o porquê de cada decisão |
| `aulas/{slug}.manifesto.json` | a estrutura importável: seções, blocos, cenas, critérios de conclusão |
| `aulas/{slug}.roteiro.md` | a fala gravada: o que se lê no microfone, clipe por clipe |

**Regra dura: mudou num, muda nos três.** Nenhuma correção pode ficar só num arquivo. Tirar um
bloco do manifesto sem tirar o clipe do roteiro deixa a gravação com um trecho órfão; corrigir a
fala sem corrigir a proposta faz o próximo leitor reabrir a decisão já tomada.

O que obriga varredura nos três:

- **tirar ou acrescentar bloco, seção ou cena** (some do manifesto, some do roteiro, e a proposta
  registra que saiu e por quê)
- **trocar título de seção, de aula ou de vídeo**
- **trocar rótulo de bloco do Estúdio, caminho da paleta ou nome de menu**
- **trocar valor de campo, meta de cena ou critério de conclusão**
- **tirar um conceito do curso** (a proposta registra a decisão; o manifesto e o roteiro não podem
  guardar resíduo dela)

Confira no fim: a contagem de seções e de clipes no Resumo do relatório bate com o manifesto, e o
roteiro tem um trecho para cada bloco com `plannedVideo`, sem sobra nem falta.

**Exceção:** o campo `Origem:` de um `plannedVideo` cita a chave do clipe da **gravação antiga** de
onde a fala vem. Essa chave é procedência, não resíduo, e continua no arquivo mesmo depois de o
conceito sair do curso.
