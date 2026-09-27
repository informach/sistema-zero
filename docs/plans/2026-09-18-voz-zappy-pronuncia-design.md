# Voz do Zappy: pronúncia e roteiro de síntese

## Objetivo

Permitir que o Zappy fale com pronúncia e entonação adequadas sem alterar o texto correto que a criança lê na aula.

## Decisão

Cada fala terá duas representações, mas só uma delas será escrita normalmente pela autoria:

1. **Texto na tela** é a fonte pedagógica e visual. Continua em português correto, com palavras estrangeiras escritas corretamente e sem grafia fonética.
2. **Roteiro do Zappy** é derivado automaticamente do texto na tela por um perfil central de pronúncia. Uma autora poderá substituí-lo em uma fala específica quando precisar testar uma palavra estrangeira, uma letra isolada ou uma pausa.

O fluxo normal não pede que a autora mantenha duas cópias da aula. A substituição é uma exceção editorial, guardada junto da frase de origem. Se o texto visível mudar, uma substituição cuja origem não corresponda mais deixa de valer automaticamente, impedindo que a criança leia uma frase e escute outra antiga.

## Perfil central

O core terá um perfil versionado de pronúncia em português brasileiro. A primeira versão resolve letras isoladas recorrentes, como `X` para “xis” e `Y` para “ípsilon”. Termos em inglês e palavras que dependem da voz clonada serão ajustados por fala, depois de ouvidos no Admin, em vez de receber uma regra global adivinhada.

O roteiro permite pontuação normal e pausas explícitas limitadas a tags `<break time="…s" />` de 0,1 a 3 segundos. Nenhuma outra marcação é aceita. Isso dá controle de cadência sem tornar o campo um editor de SSML livre.

## Modelo e cache

O modelo guarda:

- no balão `dialogue`, uma substituição opcional com o texto visível de origem e o roteiro a ser falado;
- na atividade de cena, substituições opcionais por trecho: instrução, contexto do palpite, pergunta do palpite e pergunta final;
- no dicionário de MP3, uma chave construída a partir do roteiro efetivo e da versão do perfil.

A chave do R2 incluirá a voz, o modelo, o roteiro efetivo e a versão do perfil de pronúncia. Logo, qualquer mudança de voz, perfil ou roteiro cria um arquivo novo e torna o áudio salvo anterior desatualizado. Não haverá reutilização silenciosa de um MP3 com pronúncia antiga.

## Autoria e prévia

Ao lado do botão de geração da aula, o Admin mostrará o painel “Como o Zappy fala”. Cada linha mostra o texto que a criança lê e o roteiro efetivo enviado ao ElevenLabs. A autora pode restaurar a pronúncia automática, ajustar o roteiro e ouvir aquela fala na voz real do Zappy. A prévia usa o mesmo endpoint e o mesmo cache que a geração final, portanto não há uma voz de teste diferente da publicada.

Depois de editar, “Gerar a voz do Zappy” continua sendo o comando de lote: ele detecta as novas chaves, gera apenas o que mudou e substitui o dicionário do bloco por entradas ainda válidas.

## Player infantil

O navegador continua mostrando e usando o texto da tela para legendas e para a voz de contingência. Quando existe MP3, ele procura a chave do roteiro efetivo. Quando falta qualquer trecho de uma fala, preserva a regra atual de não misturar a voz do Zappy com a do navegador na mesma leitura.

## Testes

- Core: perfil, letras isoladas, pausas permitidas, substituição válida, substituição vencida e chaves versionadas.
- Admin: extração das falas, estado “em dia”, edição e restauração de roteiro e geração com a fala efetiva.
- Contrato Kids: texto visível correto, MP3 correspondente ao roteiro correto e nenhuma queda para a voz do navegador quando o dicionário cobre a fala.
- Servidor: hash do R2 varia com o perfil e com o roteiro, e a requisição ao ElevenLabs recebe somente o roteiro efetivo.

## Fora de escopo

Não mudaremos o modelo de voz do Zappy nem dependeremos de um dicionário configurado manualmente no painel externo do ElevenLabs. O perfil interno e os ajustes por fala resolvem o problema atual, deixam o conteúdo no repositório auditável e evitam uma configuração externa que poderia mudar sem invalidar o cache.
