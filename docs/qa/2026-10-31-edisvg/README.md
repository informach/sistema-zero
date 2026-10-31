# Conferência local da migração ediSVG

Esta pasta registra a implementação em revisão. Ainda não comprova implantação em staging ou
produção. A ordem operacional e as pendências estão no plano da migração de 31/10/2026.

## Interfaces com o tema real

Chrome nativo e Playwright 1.60.0, Node 24.15.0, um worker, sem login nem banco remoto.
O servidor local monta os componentes reais com o CSS do Kids processado pelo Tailwind.
`e2e-scenes/{trail-animation,mascot-idle,quiz-zappy}.spec.ts`: **19 aprovados**, sem skips,
45,4 s. O recibo local está em `.cache/edisvg-themed/results.json`, log `run-r3.log`.

As imagens `trilha-320.png`, `trilha-390.png` e `trilha-1440.png` foram conferidas. A arte não
cruza aulas, balões ou baús, não há rolagem lateral e a reserva continua presente na falha.
Essas larguras são responsividade; não são prova em celular físico.

A tentativa anterior detectou a caixa de arte maior que 9/8 por causa da reserva intrínseca.
O player passou a preencher a caixa em posição absoluta. O oráculo de pixels também foi
corrigido para rasterizar o SVG em fundo transparente, sem contar a cor do tema como desenho.
As falhas originais permanecem em `run-r2.log`; as expectativas de proporção foram preservadas.

## Sessões, voz, baú e falhas

`tests/e2e/verify-edisvg.ts`, no Kids, usa Node nativo, Chrome, React StrictMode, áudio nativo e
um ledger HTTP local. O recibo r9 tem 11 cenários aprovados: desktop, celular emulado, arte fora
da tela, movimento reduzido, economia de dados, baú já aberto, falha de arte, falha do resgate,
prêmio zero, troca e falha após troca. Há prova adicional RED/GREEN do cookie same-origin da
prévia autenticada em `auth-red-r1` e `auth-green-r1`. Repetir a composição no freeze final.

O ledger testa a sequência e a autoridade da UI, não substitui o serviço de prêmios. Não foram
feitas chamadas de resgate ou testes em dados de alunos reais. A cena isolada não substitui os
builds Next, o fluxo autenticado completo nem medições em hardware representativo.

## Origem dos arquivos

O vendor registra origem `2fcead2b1bf72c5d6c37fa304a2483a11d9cc8a7`; player de 598114 bytes,
SHA-256 `0d23ccb8138252537d1d50d738305b741d4ddddd7466e82f62003b239a85860e`.
O manifest do acervo tem 18 variantes, com hashes de fontes e exportações. Os 12 arquivos
originais enviados permanecem preservados. Falando e baú aberto são variantes editáveis
reproduzíveis, sem redesenhar a arte.

Separar o PNG do JSON reduz a transferência duplicada. As reservas WebP são sem perda e a
geração exige os mesmos bytes RGBA após decodificar. Esses números não demonstram aumento de
FPS; medição final e comparação de CPU/memória continuam pendentes no plano.


## Fechamento das verificações de 31/10

Os três builds Next (Admin, Kids e comunidade adulta) passaram. A suíte completa do Kids passou
com 1836 testes e 11016 asserções. A do Admin passou com 960 testes externos e 3965 asserções;
o wrapper inclui sete testes HTTP isolados (não somar o wrapper como outro caso funcional).
A tentativa anterior tinha cinco falhas por mocks globais de outro BFF. A fixture foi isolada
conforme o padrão já usado pelo pacote; nenhuma regra de produção foi afrouxada.

`lifecycle-receipt.json`: 12 cenários reais no Chrome, todos aprovados, agora incluindo o cookie
da prévia same-origin na mesma rodada. Sem quadros de animação pendentes após sair da prévia.
`performance-receipt.json`: uma arte happy ativa, voz e baú fechado pausados, duas janelas de
cerca de 2 s. P95 de intervalo 16,8 ms, TaskDuration 0,310 s ativa e 0,021 s pausada; heap usado
19,1 MB e 20,6 MB, respectivamente. O medidor também agenda seus próprios quadros. Não são
provas de coleta de lixo, consumo total do Chrome, celular real ou comparação justa com Rive.

O pacote puro passou os oito testes em Node 22, dentro de container sem rede externa. O ensaio
Postgres descartável também passou com o migrador real, journal próprio, idempotência, preservação
de dados e leitura pelo ORM antes/depois da contração simulada: um teste, 14 asserções. O banco
e os diretórios de teste foram removidos. Nenhum banco remoto foi usado nesses testes.

`native-export-receipt.json` e `editor-nativo.png`: Electron 44.8.0 / Playwright 1.64.1, projeto
saudacao.edisvg real, menu do app, renderer, IPC, validação e escrita atômica. Seletores de arquivo
foram controlados no perfil descartável; o widget do Windows ainda não foi homologado manualmente.
A fonte manteve seu SHA, JSON e ZIP foram conferidos, encerramento do filho confirmado pelo
observador canônico (232,6 ms na rodada final), sem falhas de limpeza. Os negativos r1/r2 do ensaio
e r4 de prazo de fechamento ficaram no cache. O prazo final é o do verificador nativo compartilhado,
30 s, com confirmação da saída do processo, não somente o evento close do Playwright.

A biblioteca portátil efetivamente exportada também está em `art/edisvg/edi-web-player.zip`,
com exemplos, tipos e licenças. O acervo e esse ZIP ficam no Git, fora das imagens Docker.
Implantação e migração de mídia remota continuam passos separados, registrados no plano.
