# CI após integrar a casca do Estúdio

A integração remota `bc1b2ab29` cancelou o CI anterior de staging. O novo
[run 44591419724](https://github.com/informach/sistema-zero/actions/runs/44591419724)
falhou no perfil da imagem e nos dois testes novos da casca no Firefox.
As correções respeitam a autorização de QA/CI; não alteram motores ou Molda.

## Perfil e imagem coerentes

O gerador do perfil inclui fontes do Worker e contratos do core. A nova rota
`classic-shell` mudou essas fontes sem atualizar o perfil. O Dockerfile e seus
scripts funcionais não mudaram, mas o perfil faz parte da imagem imutável:
regenerá-lo exige construir e qualificar outra imagem, sem contornar a guarda.

`check:validation-profile` passou depois da regeneração. A fonte fixa
`cc1a416ae8d3b1a1c44afd9200e70966efe53c38` foi construída em Linux e passou pelos
contratos de imagem/validação, Python e Three reais sem rede externa no
[run 44592954163](https://github.com/informach/sistema-zero/actions/runs/44592954163).

- Perfil: `8151d121eb0ef36103c2aa16717a30ba1d4f316da6f2e7369a6e70f529596d2c`.
- Arquivo comprimido: `7205b347827b2df7af870e7207293910e84bc780fbd8547fd424401b203a6dcd`.
- Imagem: `sha256:d370659ec561760fde97238ca4ba1e2d7371d041f950ba1e5d5f4ad43e063b55`.
- Manifesto privado: `sha256:1411706838fd121e2897ac12c30f9438fbb3d0e9d517539ff84ee60ce387cf0e`.

O tar foi conferido contra o checksum e a configuração contra o ID Linux/amd64.
Após upload por Crane, manifesto e configuração foram lidos novamente do registro.
Credenciais temporárias permaneceram em memória/stdin; configuração e log privados
foram removidos. Nenhuma imagem anterior foi apagada.

O dry-run do Worker contém a nova rota, o leitor `pinta-scene-physics-v1` e o
perfil qualificado, usando referência de imagem por digest. O seletor Python
permanece `f69814b…`. **Sem deploy do Worker/container, ativação de 132 ou liberação
do gravador de nuvem nesta preparação.** Recibos adjacentes registram esses estados.

## Teste do Firefox: duas causas diferentes

`keyboard.insertText` multilinha alterou o programa no Monaco/Firefox. O CI
observou texto truncado; a reprodução Windows duplicou uma linha. A colagem
nativa já usada pelos testes de segurança conserva o texto integral no Firefox
e Chromium. No WebKit Windows, o helper conserva a inserção direta original e
usa Meta para selecionar, conforme o user-agent que também orienta o Monaco.
A asserção continua exigindo o programa inteiro.

A execução revelou outra limitação do ensaio: o Juggler dessa combinação
Firefox/Playwright devolveu frames internos vazios. O teste de pixels confirmou
verde no jogo enquanto a leitura do `body` pelo frameLocator falhava. A prova
final verifica renderização nativa verde, console do editor, Parar com imagem
branca e Rodar com verde novamente. O console precisa estar aberto e a consulta
fica restrita à gaveta; texto igual nos blocos não comprova uma mensagem do jogo.

O sandbox continua sendo inspecionado no navegador quando o driver permite;
no Firefox, confere-se o documento servido, além dos testes unitários do contrato.
Essa conferência não é relatada como leitura do atributo do frame interno.

Na carga longa, uma mensagem confirma início, a medição começa em menos de dez
segundos, dura três e mantém o teto de **500 ms**, antes de a carga de 30 s terminar.
O teste também exige ausência da mensagem de término durante a medição e execução
do programa corrigido após Parar. Não exige que o filho ocupado repinte sua tela
durante o trabalho síncrono. A prova mede a resposta do editor.

## Resultado final no navegador

**Cinco aprovados, uma omissão explícita preexistente, zero falhas, retries ou
instabilidade** na execução final de 2,3 minutos: [resultado](navegadores.json),
[log](navegadores.txt). O funcionamento, console e Parar/Rodar passaram nos três
engines. WebKit conserva a omissão da prova de isolamento já medida como sem suporte.

| Engine da prova de carga | Início após envio | Observação no relógio externo | Maior intervalo no editor |
| --- | ---: | ---: | ---: |
| Chromium completo | 3.790 ms | 3.016 ms | 63 ms |
| Firefox | 4.615 ms | 3.019 ms | 56 ms |

O Chromium usa explicitamente o canal completo, como a suíte de programas hostis.
Na tentativa anterior com headless shell, a mensagem de término apareceu antes
da conferência final: um relógio iniciado depois do bloqueio parecia saudável.
A [catraca adicional](catraca-termino-red.txt) detectou esse falso positivo.
Agora a medição também exige duração externa abaixo de cinco segundos para a
observação de três, além de manter o teto de intervalo em 500 ms e carga não terminada.
O limite de espera do render verde é 15 segundos, igual ao teste original do `body`.

As tentativas falhas anteriores ficam registradas como diagnóstico, não como
aprovações. A rodada final não usou repetição automática. Nada aqui comprova
telefone físico, participantes infantis ou desempenho geral de qualquer aparelho.
