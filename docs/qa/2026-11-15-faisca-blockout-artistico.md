# Faísca V2: blockout artístico e ritmo

Verificação local em 15/11/2026, branch `feat/arquipelago-v2`. Fundação anterior recuperável em `4f73b5370`. Este marco está no playground `/macro`; não foi publicado nem integrado à campanha da plataforma.

## Resultado construído

A Faísca mantém o território de referência de 520 m. O coração habitado foi concentrado: porta–praça 13 m, praça–horta aproximadamente 20 m, praça–Pátio aproximadamente 25 m. Seis distritos, anel, atalhos e ramais para as seis cabeceiras têm dados de percurso compartilhados pelo mapa e pela cena. A altura desenhada e a física vêm da mesma função. Costa, Bosque e regiões externas ainda são blockout de exploração, com referências de lugares, não ambientes finalizados.

A região piloto reúne 23 modelos do Adventure Land e da coleção própria Reino: Farol, moinho, casas de referência, poço, canteiros, vegetação, objetos e ponte curta. O lote da Morada está reservado; as casas do pack não substituem a casa do aluno. A coelha tem clipes, pequeno percurso e conversa com enquadramento na cabeça, usando o estilo existente dos moradores. É um estudo da Íris, ainda sem acessórios, gestos de ofício ou rotina narrativa completa.

Os modelos privados vêm exclusivamente dos objetos Git de `artes-3d` no commit `7816a7aca0ba6f7d93a90fe4c15f40638b01525f`. O manifesto registra origem, dimensões, SHA-256, imagens e clipes. Duas exportações consecutivas produziram manifesto idêntico; os 23 GLBs somam 8,39 MB e ficam em `output/faisca-arte`, ignorado pelo Git. Reino é criação própria; Kingdom oficial é referência estética, não a origem declarada desses arquivos.

## Velocidade

O padrão do ensaio é Exploração: **1,5 m/s andando e 3,4 m/s correndo**, com escala 1 e altura aproximada de 1,16 m. A passada usa IK e cadência sincronizada à distância, preservando comprimentos dos ossos. Cápsula e altura do pulo permanecem nativas. A velocidade horizontal maior também aumenta o alcance horizontal do salto, que deve entrar nos próximos testes de obstáculos.

| Porta → Praça, controlador real | Distância medida | Tempo ativo |
|---|---:|---:|
| Referência anterior, andando | 12,9 m | 12,5 s |
| Exploração, andando | 12,7 m | 7,8 s |
| Exploração, correndo | 12,8 m | 3,6 s |

O medidor termina a 0,5 m da chegada; diferenças pequenas de distância vêm desse limiar e da amostragem por quadro. O modificador de humor já existente continua ativo: as velocidades configuradas na ferramenta são valores de base. O teste de exploração também pausou por um segundo e confirmou que o relógio do percurso fica congelado. Posicionamento inicial pela ferramenta não entra na distância; salto de posição durante a medição a cancela.

`?ritmo=referencia` recupera o perfil anterior; `?ritmo=agil` permite comparar 1,7/3,9 m/s. São perfis locais para avaliação. A ponte longa Faísca–Bosque continua com 232,23 m: a 3,4 m/s, a estimativa constante é de aproximadamente 68 segundos, antes de modificadores e paradas. Ela ainda precisa de avaliação de interesse, transporte e retorno; aumentar a velocidade não torna sua duração automaticamente aprovada.

## Percursos e arte real

- Caminhada contínua casa–praça e corrida pelo teclado; deslocamento e pulo com toque emulado.
- Praça–horta percorrida entre os modelos: 21,1 m. O verificador dessa rota usa pulsos de teclado e pausas de leitura; seus 22,5 s não representam caminhada contínua nem servem de comparação de velocidade.
- Conversa com a coelha pelo controlador e fechamento por teclado e toque. O painel técnico fica oculto durante o diálogo.
- Ponte curta dos Campos atravessada de sul a norte: posições observadas `(58,04; 4,52; 134,90)`, `(58,12; 4,47; 127,18)` e `(57,78; 4,52; 119,11)`, sem queda. A posição vertical do modelo foi ajustada pela altura real do piso do GLB, eliminando o degrau na entrada.
- Chegadas de Pátio e Farol fora dos volumes sólidos. O salvamento local rejeita posições sob construções, canteiros e ponte. O mapa permite retornar a marcos visitados.
- Falha HTTP 503 no modelo da coelha após carga parcial: diagnóstico visível, referências provisórias utilizáveis, tentativa explícita recuperou os 23 modelos. Nenhum erro de JavaScript observado nesses fluxos.

## Recursos e desempenho observado

O piloto usa instâncias para decoração estática, clone de esqueleto para a coelha e liberação explícita do lote ao sair da região. Texturas iguais são compartilhadas considerando conteúdo e parâmetros de amostragem. O oceano continua compartilhado; o lago dos Campos tem área de água própria registrada no controlador.

Na última execução completa, em três ciclos de saída/reentrada, perto da praça houve 134 geometrias, 41 texturas, 91–94 chamadas e cerca de 103–104 mil triângulos. No Bosque distante, 96–100 geometrias, 33 texturas, 50–52 chamadas e cerca de 32–36 mil triângulos. A reentrada voltou a 41 texturas nos três ciclos, sem crescimento cumulativo observado. Foram registrados 60 FPS nesses pontos; na repetição isolada de recursos a faixa foi 58–60 FPS.

Esses são contadores do renderer, não medição de heap nem teste prolongado de memória. Arte parcial, navegador desktop e toque emulado não certificam desempenho em celular/Chromebook físicos ou com toda a ilha povoada. O Chrome automatizado foi iniciado sem redução de atividade de janelas em segundo plano, que havia distorcido medições iniciais.

## Reprodução e evidências

Verificação final do pacote: **2.063 testes aprovados, 1 pulado, 0 falhas**, em 240 arquivos (146,87 s). A integração Postgres de tempo é pulada sem a variável de banco descartável; os testes com os clipes privados reais foram executados. Tipagem passou; build `20261115165146` gerou 188 arquivos/48,28 MB; Biome conferiu os 32 arquivos de código alterados/novos sem erros. `git diff --check` passou.

Preparar avatar e arte conforme `packages/arquipelago/README.md`; iniciar o playground com `AVATAR_QA_DIR` e `PORTA=4530`. No diretório do pacote:

```powershell
node playground/verificar-faisca-browser.mjs
node playground/verificar-faisca-mundo-browser.mjs
node playground/verificar-faisca-mundo-browser.mjs --recursos
node playground/verificar-faisca-toque-browser.mjs
```

Evidências locais ignoradas em `output/faisca-qa`: `ritmo.json`, `mundo.json`, `recursos.json`, `toque.json`; capturas `praca-dia.png`, `praca-noite.png`, `mapa.png`, `ponte-campos.png`, `farol.png`, `iris-toque.png`, `mapa-toque.png` e `falha-arte.png`. O verificador aguarda e confirma a chegada antes de ler recursos; `mundo.json` registra a execução completa final e `recursos.json`, uma repetição isolada dos três ciclos.

## Limites e continuação

Não houve migração de coordenadas ou alteração de contas, inventário, avatar compartilhado, Morada ou projetos. Este layout usa apenas `arquipelago:faisca:ensaio`. A identidade visual de adulto/Kids permanece preservada; mapa e medições são ferramentas internas, e a conversa reaproveita o estilo do jogo.

Ainda faltam aceite humano do ritmo/composição, testes com crianças e aparelhos físicos, terreno/material definitivo, densidade final, Íris completa e outros moradores, Morada integrada, campanha e salvamento da plataforma. A reconstrução da ponte neste ensaio é uma ferramenta administrativa e não concede progresso narrativo. O próximo marco de conteúdo depende da avaliação deste mapa jogável.
