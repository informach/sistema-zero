# A voz do Zappy nas aulas

As falas do Zappy e as instruções das cenas saem na voz dele, gravada no ElevenLabs, em vez da voz
do sistema operacional da criança. Este é o guia operacional: como ligar, quanto custa, o que fazer
quando algo não fala.

Decidido em 17/09/2026; roteiro de pronúncia implementado em 18/09/2026.

⚠️ **A voz é a do André**, uma criança de 12 anos — é ele que faz o Zappy. No ElevenLabs ela se
chama `AndrePro` (clonada, pt), id `0zTjt1MBEwfzcDnBGtaL`. Quem trocar a voz um dia troca só a env:
o id entra no hash do arquivo, então nada do que já está no ar se mistura com a voz nova.

## A ideia em uma frase

**O texto da aula é fixo; quem muda é a criança que ouve.** Então o áudio é gerado UMA vez, na
autoria, no admin — e o que chega no navegador da criança é um MP3 no R2, como qualquer outra mídia
de aula.

O que isso compra:

- **Custo**: paga-se por FRASE, não por clique. Trezentas crianças ouvindo a mesma instrução é uma
  geração só. **Medido nos 27 manifestos v6**: 91 balões do Zappy e 38 cenas dão **129 falas
  únicas e ~19 mil caracteres**; somando as perguntas herdadas do catálogo, algo perto de **31 mil**.
  A base inteira cabe com folga num mês do menor plano pago do ElevenLabs — e só se paga uma vez.
- **Desempenho**: a criança espera o CDN da Cloudflare, não a síntese (que leva 1 a 2 segundos).
- **Segurança**: a chave do ElevenLabs vive só no admin. O community e o kids não a conhecem.
- **Resiliência**: o ElevenLabs fora do ar não derruba a aula. Nem o áudio faltando derruba: sem
  ele, o "Ouvir" volta para a voz do navegador, como sempre foi.

## Ligar (uma vez por ambiente)

Duas envs no serviço **admin** — e só nele:

```
ELEVENLABS_API_KEY=<a chave>
ELEVENLABS_VOICE_ID=0zTjt1MBEwfzcDnBGtaL   # opcional: o código já usa esta voz
```

⚠️ Localmente a chave vai no `.env`; **nunca** commitada. ⚠️ `KEY=` vazio quebra o boot (o Zod trata
ausente ≠ vazio) — deixe COMENTADA quando não for usar. Sem a chave, o botão responde 503 e as aulas
continuam na voz do navegador: nada quebra, só não gera.

A licença do ElevenLabs precisa permitir uso comercial e distribuição do áudio gerado.

## Usar (o dia a dia)

No editor da aula, ao lado de "Revisar para publicar", há o botão **"Gerar a voz do Zappy"**. Ele
diz quantos blocos estão sem voz; quando está tudo em dia, diz "Voz do Zappy: em dia".

Um clique cuida da aula inteira: **o que já tem voz é reaproveitado, o que teve o texto ou o roteiro
alterado é gerado de novo, e o que ainda não tem é gerado.** Não é preciso saber o que mudou, e
rodar duas vezes seguidas não custa nada na segunda.

O que ganha voz:

| Bloco | O que é falado |
| --- | --- |
| Fala do Zappy (`dialogue`) | o balão inteiro |
| Experimentação e demonstração | a instrução, a pergunta do palpite com as opções, a pergunta do fim |

Depois de gerar, **publique a aula**: o dicionário viaja no bloco, como qualquer outro conteúdo.

## Ajustar uma pronúncia

Em cada cena e balão há o painel **Como o Zappy fala**. Ele mostra duas colunas:

- **A criança lê**: a frase editorial, sempre a fonte pedagógica e com a grafia correta.
- **Como o Zappy fala**: o roteiro enviado ao ElevenLabs. Ele só deve mudar quando a prévia mostrar
  uma pronúncia ruim, uma letra isolada ou quando a frase pedir uma pausa.

Use **Gerar e ouvir** para conferir a voz real. Essa prévia chama a mesma rota e o mesmo cache do
botão da aula, portanto não há uma voz de teste diferente da voz final. Quando o texto estiver bom,
clique em **Gerar a voz do Zappy** para gravar o dicionário completo no bloco e publique a aula.

O campo aceita texto normal e apenas pausas curtas neste formato:

```
Pense um pouco.<break time="0.5s" />Agora tente.
```

São aceitas pausas de 0,1 a 3 segundos. Não há HTML nem SSML livre no campo.

O perfil padrão já lê **X** como “xis” e **Y** como “ípsilon” quando são letras isoladas. Inglês e
palavras cuja pronúncia depende da frase ficam no roteiro daquela fala, depois de ouvir a prévia.
Use **Restaurar padrão** para apagar uma exceção. Se o texto que a criança vê mudar, o ajuste antigo
é descartado automaticamente: uma pronúncia não pode escapar de uma frase para outra.

## Como o áudio casa com o texto

⚠️⚠️ **A chave do dicionário é o roteiro efetivo do Zappy, com a versão do perfil de pronúncia**,
nunca um id de bloco. A frase visível fica para a criança ler e para a contingência do navegador;
o roteiro é o que encontra o MP3. Assim, corrigir uma instrução ou a pronúncia dela não encontra o
áudio antigo: até gerar de novo, a cena inteira cai para a voz do navegador em vez de misturar duas
vozes.

O arquivo no R2 também incorpora voz, modelo, versão do perfil e roteiro. Pelo mesmo motivo o botão
sabe sozinho o que está desatualizado, sem guardar nenhum controle.

### Primeira geração depois desta mudança

O formato anterior do dicionário não é aceito pelo player novo. Como as aulas interativas ainda não
foram publicadas para alunos, não há migração nem compatibilidade legada: abra cada aula que tenha
voz, clique **Gerar a voz do Zappy** e publique. Os MP3 que coincidirem no cache são reaproveitados;
as falas cujo roteiro mudou serão sintetizadas de novo.

## O que NÃO ganha voz do Zappy, e por quê

- **A pista que a criança pede**, a legenda "Parte N" da demonstração e a frase de situação: o motor
  monta esses textos na hora, a partir do estado da cena. Não dá para pré-gerar.
- **O retorno da resposta** ("Certo! …" com a explicação) e a frase do palpite retomado também são
  montados na hora, com a escolha da criança dentro.
- Quando uma fala inclui um desses trechos, **a fala inteira** sai na voz do navegador — nunca
  metade em cada voz. Uma leitura em que o Zappy diz a instrução e a voz robótica emenda a pergunta
  seria pior que qualquer uma das duas sozinha. Na prática o Zappy cobre o caminho principal
  (abrir a cena, ouvir a instrução, ouvir a pergunta que trava o palco) e sai de cena quando a
  criança pede ajuda ou já respondeu.
- Na **demonstração** ele fala na parte 1, onde a legenda é a própria instrução do professor; das
  partes seguintes em diante a legenda passa a ser montada pelo motor e a voz volta à do navegador.
- **A cena do leitor de tela** fala a frase que a criança acabou de escrever. Além de impossível de
  pré-gerar, ali a voz robótica é didaticamente certa: a cena ensina o que um leitor de tela faz, e
  leitor de tela de verdade usa exatamente essa voz.
- No **balão do Zappy** não há queda para a voz do navegador: sem áudio, o botão simplesmente não
  aparece. Na instrução da cena o botão é muleta de quem ainda não lê e qualquer voz serve; no balão
  ele é a voz do personagem, e a voz do sistema seria outro personagem falando no lugar dele.

## Reimportar um manifesto apaga a voz daquela aula

O manifesto não carrega o dicionário: a voz é gerada depois, no admin. Reimportar reescreve os
blocos e leva o dicionário junto. **Basta clicar no botão de novo** — o áudio continua no R2 e é
reaproveitado, então a regeração não custa crédito nenhum. (A ordem de importação e o resto do
procedimento estão em `aulas-interativas/raio-x-implantacao.md`.)

## Quando alguma coisa não fala

1. **O botão não aparece na aula**: a aula não tem bloco de fala do Zappy nem cena.
2. **O botão responde "indisponível"**: falta `ELEVENLABS_API_KEY` no admin (503), ou a cota do
   ElevenLabs acabou. O detalhe do erro fica no log do admin.
3. **O botão diz "em dia" mas a criança não ouve o Zappy**: confira primeiro se a aula foi gerada
   depois da mudança de roteiro. Se foi, aquela fala provavelmente inclui um trecho dinâmico (pista
   pedida, legenda de parte) — é o comportamento esperado, descrito acima.
4. **A pronúncia saiu errada**: abra **Como o Zappy fala**, escreva a pronúncia como ela deve soar,
   use pontuação ou uma pausa curta se ajudar, clique **Gerar e ouvir** e depois gere a aula inteira.
5. **A prévia toca, mas a aula ainda usa a voz do navegador**: a prévia não publica o dicionário;
   clique **Gerar a voz do Zappy** e publique a aula.
6. **Algumas frases não saíram**: o toast diz quantas. Uma frase que falha não derruba as outras;
   clique de novo e só as que faltam são tentadas.
7. **O Zappy fica parado enquanto o áudio toca**: ele cai no desenho estático quando o aparelho
   pediu menos movimento (`prefers-reduced-motion`), quando a economia de dados está ligada ou se o
   Rive não subiu. Com o Rive no ar, a boca anda em laço do primeiro ao último segundo do áudio.
8. **O Zappy se mexe sem ninguém apertar nada**: é o esperado nos balões SEM botão "Ouvir" (pista,
   retorno da resposta, instrução sem voz gravada) e nos balões em que a autora escolheu outra cara
   que não "falando". A voz rege só a boca da pose "falando".

## Onde mora o quê

| Peça | Arquivo |
| --- | --- |
| A chave, a fila e o extrator de textos (puros, testados) | `packages/core/src/learning/scene/voz.ts` |
| A geração (ElevenLabs + R2) | `packages/admin/src/server/voz-zappy.ts` |
| A rota | `packages/admin/src/app/api/media/voz-zappy/route.ts` |
| O botão | `packages/admin/src/components/editor/voz-zappy-button.tsx` |
| O painel de pronúncia | `packages/admin/src/components/editor/zappy-speech-editor.tsx` |
| O "Ouvir" da cena | `packages/member-shell/src/components/use-scene-voice.ts` |
| O balão que fala | `packages/member-shell/src/components/dialogue-block.tsx` |
| A boca do Zappy (contexto) | `packages/member-shell/src/components/zappy-fala-context.tsx` |
| O mascote animado | `packages/community-kids/src/components/kids/mascot-rive*.tsx` + `public/zappy/fala.riv` |

Os MP3 ficam no bucket R2 **público**, em `aulas/voz/<hash>.mp3`, com cache imutável. O hash cobre o
roteiro efetivo, o perfil, a voz e o modelo: trocar qualquer um deles não quebra nada no ar — os
arquivos antigos continuam existindo e as novas falas nascem em arquivo próprio.

## Full review (correções) — 17/09/2026

Revisão do lote logo depois de escrevê-lo, medindo em vez de argumentar. Nove achados, todos
corrigidos; a maioria só apareceu porque a medição foi feita em estados que o caminho feliz não
visita.

- ⭐⭐ **O teto da chave reprovaria a PUBLICAÇÃO de um bloco legítimo (ALTO).** `VOZ_LIMITS.chave`
  nasceu em 600, mas a autoria aceita pergunta de **5000** caracteres e a fala dela soma o rótulo e
  todas as opções. Um dicionário acima do teto faz o guard da atividade devolver falso, e a
  mensagem que sobra na publicação é "Configure a atividade e sua verificação" — castigando quem
  escreveu uma pergunta longa por causa do áudio. O teto do VALIDADOR passou a acompanhar a
  autoria (6000); quem decide o que vale a pena GRAVAR é o admin, com teto próprio (1200) e um
  recado que diz quantas falas ficaram de fora e que elas seguem na voz do navegador.
- ⭐⭐ **Áudio inválido derrubava a CENA INTEIRA (ALTO).** O `isPublicInteractiveBlock` roda no
  navegador, contra o core que o app tem; com o members um deploy à frente (a ordem de deploy manda
  members primeiro), um teto novo faria o kids antigo recusar a atividade e mostrar "esta atividade
  precisa de uma configuração válida" no lugar do palco. É a mesma arapuca já documentada para o
  `revealOn`. Agora `sceneActivityForReading` DESCARTA o dicionário inválido e a cena abre igual.
- ⭐⭐ **A geração sequencial flertava com o 524 do Cloudflare (ALTO).** Uma aula com 20 falas novas
  a ~3 s cada passava de um minuto numa requisição só — o modo de falha exato do incidente do livro
  3D. Agora são 8 em paralelo (`mapPool`), 24 falas por pedido e 20 s de teto por frase: ~60 s no
  pior caso, abaixo do corte de ~100 s.
- ⭐ **O botão loteava de 60 em 60 contra uma rota que aceitava 24 (ALTO, introduzido pela correção
  acima).** A constante estava duplicada entre cliente e servidor, e toda aula grande responderia
  400 antes de gerar uma frase. O número virou fonte única em `lib/voz-zappy-limites.ts` (fora do
  `server-only`, que é o motivo de a duplicata ter existido).
- ⭐ **Faltava a prova de que o gerador e o player casam (ALTO, cobertura).** A chave é o texto
  falado, então os dois lados precisam produzir a MESMA string — e nada avisa quando divergem: o
  dicionário simplesmente não responde e a fala cai na voz do navegador, o que parece "não foi
  gerado". `community-kids/tests/lesson-voz-zappy.test.tsx` monta o dicionário com a mesma função do
  botão do admin e prova que o clique toca o MP3, com a voz do navegador CALADA como anti-vácuo.
- **Evento de áudio atrasado atropelava a fala seguinte (MÉDIO).** O elemento é reaproveitado e o
  `error` que o próprio "parar" provoca chega depois de a próxima fala começar. Um contador de
  geração invalida os callbacks das falas mortas.
- **Um bloco de rascunho inválido derrubava o editor (MÉDIO).** `falasDaAula` roda no RENDER, sobre
  o rascunho — que guarda estado inválido de propósito. Uma cena com id fora do catálogo faz os
  resolvedores do core lançarem, e a exceção subia no render do editor inteiro. Agora o bloco torto
  fica de fora até a autora terminar.
- **A mensagem de erro culpava o ElevenLabs (MÉDIO).** O R2 fora do ar derruba tudo do mesmo jeito,
  e mandar conferir a cota de um serviço saudável é a pista errada que custa uma tarde.
- **O botão do balão ficaria chapado no kids (MÉDIO).** O kids dá relevo 3D por um seletor que casa
  `button[data-slot="button"]`; o `<button>` cru seria o único controle sem relevo dentro do balão.

**Uma hipótese minha que estava ERRADA, e vale registrar:** eu concluí que a demonstração nunca
falaria na voz do Zappy, porque o "Ouvir" lê a legenda da parte e não a instrução do professor. O
teste provou o contrário — na parte 1 a legenda É a instrução do professor (a legenda da parte só
entra depois de ela tocar, porque descreve o resultado), então a demonstração fala justamente no
momento em que a criança pergunta o que vai acontecer. O teste que eu tinha escrito para
"documentar a limitação" virou o teste que prova o comportamento.
