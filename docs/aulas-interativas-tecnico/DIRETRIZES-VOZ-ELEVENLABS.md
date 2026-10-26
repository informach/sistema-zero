# Falas para ElevenLabs v4 e intervenções na edição kids

Data: 21/10/2026. Contrato aplicado às 37 aulas da [unificação](../plans/2026-10-21-unificacao-aulas-plataforma-design.md). Conversão textual e exportação realizadas; geração e escuta dos novos áudios continuam pendentes.

## Entregas obrigatórias por aula

| Arquivo | Para quem | Conteúdo |
| --- | --- | --- |
| `{base}.roteiro.md` | Produção e edição | Falas com tags, poucas notas de tela e tabela das substituições kids |
| `{base}.elevenlabs.txt` | Geração da professora | TODA a fala principal, na ordem, somente texto falado, tags e pausas |
| `{base}.debinha.elevenlabs.txt` | Geração da Debinha | Somente as frases dela, na ordem da tabela, com tags e separações |
| `{base}.dede.elevenlabs.txt` | Geração do Dedé | Somente as frases dele, quando existirem |
| `{base}.edicao.json` | Conferência e edição | Ordem dos clipes, intervenções, âncoras e pausas; derivado da fonte |

Os nomes acima usam como base o nome existente da aula. Não criar arquivo vazio de personagem. Manter tudo na pasta única do curso. Se o roteiro é gerado por uma fonte editorial em `qa/`, editar essa fonte também: gerar novamente precisa conservar a fala aprovada e suas intervenções.

## Regras do texto copiável

O usuário precisa abrir o `.elevenlabs.txt`, selecionar tudo e colar no ElevenLabs, sem extrair trechos ou remover notas. Portanto:

- Não colocar título, cabeçalho, nome de falante, número de parte, ID, timestamp, tabela, comentário, Markdown ou instrução visual nesse arquivo.
- Não colocar frases como Na tela, Professora, Debinha, não gravar ou inserir pausa de três segundos. Elas seriam conteúdo indevido para a síntese.
- Conservar integralmente a fala da professora, inclusive a frase que será substituída na edição kids.
- Usar colchetes somente para direção de áudio. Nunca usar `[Debinha]`, `[cortar aqui]` ou `[mostrar o bloco]` como se fossem tags do ElevenLabs.
- Exportar as partes gravadas na ordem do manifesto. Seções sem vídeo, recados da página e textos do Zappy não entram no áudio.
- Manter a aula completa em um arquivo, mesmo quando houver gerações auxiliares por clipe. Conferir o limite do produto/modelo selecionado ao gerar; uma limitação de envio não pode resultar em perda de texto.
- O arquivo principal usa uma voz selecionada. Gerar cada personagem com sua voz selecionada e seu arquivo próprio; não depender de nomes de falantes dentro do texto para trocar a voz.

## Fonte oficial e limites das marcações

Referência consultada em 21/10/2026: [ElevenLabs, Prompting Eleven v4](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices#prompting-eleven-v4).

O v4 aceita audio tags entre colchetes, incluindo direções descritivas, e usa pontuação e estrutura do texto na interpretação. A resposta depende da voz e precisa de escuta. O v4 não aceita `<break>` de SSML. A documentação exemplifica `[curious]`, `[thoughtful]`, `[excited]`, `[warmly]`, `[short pause]` e `[long pause]`. Essas marcações orientam a interpretação; não garantem duração exata ou controle determinístico de cada palavra.

As escolhas abaixo são convenções de produção do Sistema Zero. Não são parâmetros de API nem garantias atribuídas à documentação.

## Direção de voz

Toda frase e segmento falado precisa ter uma direção aplicável no roteiro: tom, ritmo, intenção e pausas. Colocar uma tag antes do segmento a que se aplica e marcar mudanças internas e palavras que precisam de destaque. Não distribuir tags entre todas as palavras por rotina: a frase deve continuar fluindo.

Usar conversa com presença, articulação clara e energia de quem está ensinando algo interessante. A condução mantém o interesse e varia ao longo da aula. Não usar voz calma e uniforme como padrão. Cada frase herda uma intenção adequada até a próxima mudança; marcar também as viradas dentro de um parágrafo, como sair de um encaixe para observar um resultado ou ajudar a corrigir um erro.

Na abertura, convidar com disposição. Na descoberta, mostrar curiosidade. Nos testes, dar impulso para experimentar. Nos resultados, reconhecer com entusiasmo proporcional. Nos encaixes, números e nomes de controles, manter presença e firmeza, dando tempo para acompanhar. Na correção, acolher e orientar com confiança. Energia não exige aumentar volume, acelerar os gestos ou fazer voz infantil. Essa direção foi reforçada expressamente pelo usuário durante a revisão de 21/10/2026.

| Situação | Ponto de partida para ensaio |
| --- | --- |
| Abertura | `[upbeat, welcoming voice]` |
| Condução e explicação | `[engaging, energetic, conversational voice]` |
| Convite para testar ou fazer | `[upbeat, encouraging voice]` |
| Observar uma diferença | `[curious]` |
| Introduzir uma dificuldade possível | `[thoughtful]` |
| Reconhecer um resultado importante | `[pleased, lively voice]`, com entusiasmo proporcional |
| Apontar uma mudança na tela | `[interested, animated voice]` |
| Instrução precisa | `[confident, clear, unhurried voice]`, com presença e tempo para o gesto |
| Correção e ajuda | `[reassuring, encouraging voice]` |
| Intervalo curto de fala | `[short pause]` |
| Fim de parte gravada | `[long pause]` |

Direções descritivas próprias são candidatas de ensaio, não uma lista fechada de tags oficialmente garantidas. Registrar as combinações que funcionarem na voz real. Evitar sussurros, gritos, sarcasmo e risadas por rotina. Humor pode estar no texto e na interpretação, sem efeitos sonoros automáticos.

O texto também sustenta a interpretação: use situações vividas por quem assiste e conversa direta com você. “Sabe quando alguém faz cócegas em você e você não consegue parar de rir?” é a referência aprovada. Evite descrições fabricadas como “vem aquela risada”; varie as entradas e leia a sequência em voz alta. Tags não tornam uma frase escrita em uma fala natural.

Não colocar música, efeitos ou comandos visuais no texto de voz. A edição cuida deles. Reticências podem sugerir pausa; excesso torna a fala arrastada. Usar maiúsculas para ênfase apenas quando a escuta confirmar leitura natural, preservando o nome literal dos controles nas notas e nas legendas.

## Pausas e cortes

- Dentro de uma explicação, usar pontuação natural e pausas curtas nos pontos que ajudam a acompanhar.
- Entre partes gravadas, inserir `[long pause]` isolado, separado por linhas em branco. Uma linha em branco sozinha não garante silêncio.
- O alvo de edição é deixar cerca de três segundos de silêncio entre partes, para haver margem de corte. Conferir o áudio e inserir silêncio na edição quando a geração não alcançar esse intervalo. Este tempo é uma decisão de produção, não uma capacidade garantida da tag.
- Não simular uma duração com `[pause 3s]` ou SSML. Não repetir tags para fingir medição precisa.
- Nos trechos substituíveis, prever pequenas margens naturais antes e depois da frase, sem interromper nomes, encaixes ou gestos contínuos.
- A duração do personagem deve caber no intervalo ou receber um ajuste local de imagem. Não acelerar sua voz de forma artificial para caber. Preservar o master da professora.

## Formato do roteiro de produção

Manter as notas essenciais antes ou depois da fala de cada clipe. Não picotar uma fala contínua com comentários de produção. Cada clipe tem sua chave real do manifesto, um bloco copiável de fala e, se necessário, uma tabela de edição fora dele.

Exemplo de formato usado na produção das aulas:

````markdown
## 4. Faça alguém aparecer

**Clipe:** `video-a1-montagem`

**Na tela:** mostrar o teste. Depois, conferir os três itens nos blocos.

**Fala para ElevenLabs:**

```text
[thoughtful] Talvez você esteja pensando: [short pause] “No meu jogo ainda não funcionou.”
[warmly] Se aconteceu com você, volte aos blocos e confira estes três pontos.
```

**Substituições na edição kids:**

| ID | Personagem | Âncora anterior | Fala exata substituída | Âncora posterior |
| --- | --- | --- | --- | --- |
| K01 | Debinha | Talvez você esteja pensando: | No meu jogo ainda não funcionou. | Se aconteceu com você, volte aos blocos e confira estes três pontos. |

**Áudio da Debinha para K01:**

```text
[thoughtful] No meu jogo ainda não funcionou.
```
````

A chave de clipe no exemplo é ilustrativa. Na aula real, usar a chave já existente no manifesto, sem renomeá-la para caber no exemplo. O exportador lê apenas o bloco sob Fala para ElevenLabs para produzir o arquivo principal; o áudio do personagem é outra origem explicitamente identificada.

## Contrato das substituições

Cada intervenção tem ID único dentro da aula, personagem, chave real do clipe, frase exata da professora, frase do personagem, âncoras anterior e posterior e direção de voz. Registrar também a ocorrência quando o mesmo texto aparece mais de uma vez. O exportador deve recusar âncora inexistente ou ambígua e frase de personagem diferente da frase principal.

A professora grava a frase principal inteira. A edição adulta conserva tudo. Na kids, a edição silencia somente essa frase e coloca o áudio do personagem com sua camada visual. Não sobrepor vozes, repetir a frase nas duas vozes ou remover uma instrução obrigatória. Repetir a mesma frase em arquivos derivados é permitido; escrever uma segunda versão independente da explicação não é.

O trecho de dificuldade aprovado usa a preparação Talvez você esteja pensando e a continuação condicional Se aconteceu com você. Assim, a professora fala naturalmente sozinha, o personagem pode dar voz ao pensamento e quem acertou não recebe uma falsa indicação de erro. Variar a construção quando necessário para evitar uma fórmula a cada parte.

Não pôr respostas exclusivas ao personagem na fala principal, como Boa pergunta, Debinha. Não substituir um trecho enquanto a professora executa um gesto que precisa ser mostrado sem corte. O personagem pode entrar como camada sem cobrir controles nem resultados.

O índice de edição deve guardar esta estrutura, sem credenciais ou dados pessoais. `ocorrencia` começa em 1 e identifica a frase dentro do clipe; `tags` guarda os textos completos entre colchetes, como `[thoughtful]`. O JSON é derivado; a origem da marcação permanece legível no roteiro de produção:

```typescript
interface IntervencaoKids {
  id: string
  clipe: string
  personagem: 'Debinha' | 'Dedé'
  falaPrincipal: string
  falaPersonagem: string
  ancoraAntes: string
  ancoraDepois: string
  ocorrencia: number
  tags: string[]
}
```

## Conferência de cada entrega

1. O arquivo principal contém todas as falas gravadas e nenhuma nota de produção.
2. Os arquivos dos personagens correspondem à tabela, na mesma ordem, sem nomes ou IDs falados.
3. Retirar tags e normalizar aspas/espaços conserva as palavras, números, comandos e ordem da fala aprovada. Pronúncias especiais são registradas e aprovadas separadamente.
4. As tags ficam fora de textos de página, legendas e transcrições públicas.
5. Cada passagem entre partes gravadas tem a marca de pausa longa, sem criar áudio para uma seção sem vídeo.
6. A versão principal soa contínua sem personagens; a edição kids preserva explicação, condição e resultado.
7. Escutar as duas montagens, conferir a pronúncia dos blocos e os intervalos de corte. Texto validado não equivale a áudio aprovado.

Para produção real, registrar voz escolhida, modelo exato disponível, configurações, revisão do roteiro e nomes dos arquivos gerados. Não inventar um identificador de API para v4, nem gerar ou cobrar áudios durante o planejamento.

## Falas do Zappy por etapa da experiência

Direção de 25/10/2026: o vídeo conceitual prepara a investigação e o Zappy acompanha os testes na atividade. Seguir DESCOBERTA-GUIADA.md. Produzir cada fala a partir do registro compartilhado de etapas, sem copiar manualmente uma versão que possa divergir do player. No Cadê, o registro de consulta é zappy-etapas.json; a fonte é scene/garden.ts e o extrator falasDaCena inclui os textos no lote de voz.

A entrada de uma etapa atualiza o texto e a fila do controle Ouvir; não inicia gravação automaticamente. A mudança interrompe uma fala anterior incompatível e respeita o foco de mídia. Usar a chave do texto e do perfil de pronúncia efetivos. Quando o texto muda, não associar o MP3 antigo apenas porque ocupava o mesmo balão.

Registrar separadamente textos por etapa, MP3 produzido, escuta e implantação. A revisão local do roteiro ou do manifesto não comprova essas etapas de produção.
