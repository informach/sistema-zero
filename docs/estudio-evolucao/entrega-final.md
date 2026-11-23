# Entrega final da missão (seção 20), 21/11/2026

Fecho do plano de 21/11 (lotes 1 a 8). A régua é [`missao-original.md`](missao-original.md); o
estado por seção, com a evidência de cada uma, fica em [`mapa-da-missao.md`](mapa-da-missao.md).
Tudo está na `staging`, em commits pequenos; nada foi para a `main` nem para produção (decisão da
dona). Este documento responde aos 17 entregáveis da seção 20, lista o que ficou concluído e o que
ficou pendente, e diz como retomar. Trabalho parcial não aparece aqui como concluído.

## Conclusão do plano de 22/11/2026 (lotes 1 a 9 e 7b)

O fecho de 21/11 deixou cinco itens abertos, e ela respondeu: "Resolva tudo aqui, sem ficar
esperando ou dependendo de outras frentes". O plano de conclusão (lotes 1 a 9 e 7b) foi feito na
`staging`, com um review entre cada lote e um full review final de oito revisores. Detalhe por
frente:

| Item aberto em 21/11 | O que virou | Onde está a prova |
|---|---|---|
| A busca no Reino Zero Ultra travando o Chrome conectado | o corpo escondido de bloco recolhido fica adiado, abrir desenha só perto da vista e do alvo, e "Mostrar o bloco" não muda o projeto salvo nem o desfazer (no full review final: o afastamento da pilha solta é reconhecido pelo grupo de eventos do gesto, sem relógio; provado com a CPU 4× mais lenta) | [`classico-em-escala.md`](classico-em-escala.md), `e2e/collapsed-reveal.spec.ts`, `e2e/classic-reveal-scale.spec.ts` |
| Regiões 3D e os jogos D e E | formato e pertença conferida na leitura, carga por regiões no motor dos cenários e no SDK, o bloco "Quando … entrar na região" nos três motores 3D, a ferramenta Regiões no Molda Cenários (interruptor `CENARIOS_REGIOES`), regiões no Raylib 3D do Python; o jogo D (2D grande, 96 × 72 peças, 603 entidades) e o jogo E (3D de exploração, 384 m em vez de 1 km, porque 1 km passa dos tetos de hoje), os dois na galeria só da equipe | [`regioes-3d-especificacao.md`](regioes-3d-especificacao.md), `evidencias/jogo-d-2026-11-22/` (sessão de 10 minutos verde no CI 45087601282), `evidencias/jogo-e-regioes-2026-11-22/` |
| Custo da medida dos painéis e os casos dos testes do aluno | medido por runtime (abaixo de 5% em todos), e os casos chave, porta, vida, placar, fim, compilação e tempo no JavaScript, no Python e no Pro | `evidencias/custo-da-medida-2026-11-22/`, `e2e/student-tests.spec.ts` |
| Build hospedado com dependências reais | prova automática na imagem (`templates-smoke.ts`, agora também no `ci.yml` e no `studio-runtime-image.yml`) e conferência no Worker de staging; no full review final, o import de biblioteca não declarada passou a ser recusado com o recado da criança | `../qa/2026-11-22-studio-lote9-staging.md`, `evidencias/build-hospedado-staging-2026-11-22/` |
| As oito lacunas de persistência | as oito fechadas; no full review final, a cópia de saída passou a seguir a ordem das edições (o `AbortError` não dizia que a edição foi copiada) | [`persistencia-matriz.md`](persistencia-matriz.md) |

## Os 17 entregáveis

| # | Entregável | Onde está | Estado |
|---|---|---|---|
| 1 | Diagnóstico técnico inicial | [`README.md`](README.md) ("Diagnóstico de partida"), [`diagnostico-windows.md`](diagnostico-windows.md), [`linha-de-base-linux.md`](linha-de-base-linux.md) | feito |
| 2 | Plano executado, com o estado das etapas | [`mapa-da-missao.md`](mapa-da-missao.md), [`plano-execucao.md`](plano-execucao.md) | feito |
| 3 | Implementação funcional | os commits da missão na `staging` (lista abaixo) | feito no que está marcado como concluído |
| 4 | Matriz de compatibilidade dos cursos protegidos | `docs/aulas-interativas-tecnico/qa/matriz-compatibilidade.md` (43 testes) | feito |
| 5 | Evidência de que os blocos e percursos ensinados funcionam | `protectedCourses.test.ts`, as cinco aulas refeitas pelo robô (`protected-lessons.spec.ts`), [`homologacao-a-h.md`](homologacao-a-h.md) A e B, `../qa/2026-11-20-studio-casca-staging.md` e `../qa/2026-11-21-studio-casca-staging.md` | feito: as 13 capturas e os 66 objetivos depois das mudanças de 20 e 21/11 estão em `evidencias/a3-depois-2026-11-21-ci/` (homologação 44949817617, `d2f238b62`) |
| 6 | Relatórios de desempenho antes e depois | [`classico-em-escala.md`](classico-em-escala.md), [`pro-em-escala.md`](pro-em-escala.md), [`motores-inventario.md`](motores-inventario.md), [`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md) | parcial: falta o relatório consolidado com p50 e p95 por máquina e fixture |
| 7 | Evidência de jogos grandes | Clássico com 10 mil blocos e Reino Zero Ultra (7.297 blocos); Pro com 60 arquivos (e o serviço de linguagem com mil) | parcial: os jogos D (2D grande) e E (3D de exploração) não existem |
| 8 | Relatório de consumo de memória | seção "Consumo de memória" abaixo | parcial: reúne o que foi medido e diz o que não foi |
| 9 | Revisão de segurança e isolamento | [`isolamento-da-previa.md`](isolamento-da-previa.md), [`homologacao-a-h.md`](homologacao-a-h.md) H | feito no Chromium e no Firefox; o WebKit fica sem isolamento por decisão (B4) |
| 10 | Testes de salvamento, recuperação e compatibilidade | [`persistencia-matriz.md`](persistencia-matriz.md), [`salvar-e-executar.md`](salvar-e-executar.md), [`historico-do-projeto.md`](historico-do-projeto.md) | feito, com oito lacunas escritas na matriz |
| 11 | Manual do Estúdio Clássico | [`manual-classico.md`](manual-classico.md) | feito |
| 12 | Manual do Estúdio Pro | [`manual-pro.md`](manual-pro.md) | feito |
| 13 | Capacidades dos runtimes | [`capacidades-dos-runtimes.md`](capacidades-dos-runtimes.md) | feito |
| 14 | Guia de profiling e depuração | [`guia-desempenho-e-depuracao.md`](guia-desempenho-e-depuracao.md) | feito |
| 15 | Documentação da exportação | [`exportacao.md`](exportacao.md) | feito |
| 16 | Lista de funcionalidades concluídas e pendências | este documento | feito |
| 17 | Pull Request com os commits verificados | substituído por decisão da dona: commits pequenos direto na `staging`, sem PR | substituído |

## Funcionalidades concluídas

### Isolamento e segurança da prévia (seção 5)
- A prévia do Clássico em outro site (a casca do Worker), ligada no staging e conferida logada nos
  dois apps: teclas sem clicar no palco, Parar com o jogo preso, aula com vídeo, Verificar e Enviar
  numa aula de cada curso com a casca ligada (21/11; no Desafio, os 6 de 6 da parte 4 com a casca
  ficaram sem conferir).
- Os nove programas hostis da missão no CI (Chromium com a prévia direta e com a casca; Firefox com
  a casca), com o editor salvando durante o pior (`6c07e0343`).
- A liberação de recursos medida do lado do jogo e o documento preso por Parar consertado
  (`a70c17033`, `830a85b6b`).
- A troca de perfil com gravação em voo conferida no app (`e6d880a23`).

### Clássico em escala (seção 6)
- 10 mil blocos abrem e geram código nas três engines (`43f20c03d`).
- A sequência única de 10 mil não derruba o editor nem perde blocos (`2b54c17e5`); o Python em
  blocos guarda e compara sequências longas sem recursão (`fce7540e4`).
- "Procurar no programa" com "Mostrar o bloco", também na parte que ainda não foi desenhada
  (`fe622cf3f`, `f84f54255`).
- O mesmo estado e o mesmo código com e sem montagem sob demanda, num job do CI
  (`studio-classic-equivalence.yml`, `6d495f877`).

### Motores (seção 8)
- Inventário medido dos cinco motores; os tetos que cortavam calados passaram a avisar; o Jogo 2D
  13% menor em bytes e o 3D Avançado 2,2 KB menor, com os tetos descidos (`33cd419d8`,
  `64e7f6281`).
- A GPU dos três motores 3D estável em 10 recomeços (`engine-gpu-cycles.spec.ts`).
- O tocador de cenas do Pinta desenha só os objetos perto da câmera (16.384 para 1.358 desenhos
  por quadro numa cena no limite, `719fade30`).

### Pinta, Molda e Zappy (seções 12 e 15)
- Fixtures congeladas dos contratos e a recusa sem perda de campo ou versão desconhecida
  (`1136c01a1`); prova da exportação 2D nas três engines; o contrato de um cenário completo do
  Molda pelo domínio, pelo compilador e pela importação (`fa4872992`).
- O Zappy recebe, na hora da pergunta, os valores e as medidas que as abas Investigar e Desempenho
  mostram, com a regra de não inventar (`fa4872992`, `ee8a17e9d`).

### Pro e persistência (seções 7 e 13)
- O "ENOENT" cru some da tela enquanto o Pro prepara (`74c852e78`).
- "Organizar as importações" (`f3b11d15a`); "Arrumar código" que mantém os espaços e o tempo de
  "Onde isto é usado", "Trocar nome em todo lugar" e "Arrumar código" abaixo de 200 ms
  (`9d8934d5a`).
- O ensaio com uma dependência de verdade no WebContainer, com o erro antigo da página que não fica
  contado depois do conserto (`c2142a528`, `bf96c7a56`).
- O Pro convertido mostra de onde veio e abre a versão em blocos (`6c96234f2`).
- O Histórico do projeto: versões neste computador, comparar com agora e voltar (`7fb0c4f30`).
- A matriz de quedas por borda de escrita (`74c852e78`); P1 a P4 da persistência v4.

### Fluxo profissional (seção 14)
- A exportação do Pro leva a trava do grafo aprovado e é conferida fora do Estúdio: `npm ci` e o
  build duas vezes igual nos 15 projetos, e o mesmo build no Linux e no Windows (`ee82d0dfd`).
- Avaliação escrita do Git no Pro ([`git-no-pro-avaliacao.md`](git-no-pro-avaliacao.md): sem Git
  agora).

## Full review final (21/11)

Seis revisões independentes, uma por frente. Nada de gravidade alta; os achados médios e os baixos
de conserto barato foram consertados, cada um com teste vermelho antes:

- a trava da exportação calcula as marcas (`dev`, `optional`, `devOptional`, `peer`) para o projeto,
  e os 14 modelos têm de sair com ela (`efd8a4d12`);
- o recorte do Pinta não corta mais conjuntos e pede as imagens ao criar a cena, com o teto do
  fragmento descido de 26.600 para 26.500 (`78f854bae`);
- no Pro, o erro de uma página anterior sai também do Investigar e do Zappy; a observação das abas
  cede no orçamento do pedido, com os campos dela tratados como dado não confiável (`b817a7ab1`);
- o Histórico do projeto grava numa transação só, respeita a lápide do projeto apagado noutra aba,
  apaga pelas chaves do banco e não promete versões onde não as guarda (`0fe5d470e`);
- a carga dos blocos Python não desliga o "Desfazer" da página, e a busca ignora o rótulo de botões
  em bloco travado (`0179cbf52`);
- cada caminho que enche um grupo do Jogo 2D tem teste próprio (`fab54bc52`), e o teste da busca
  que passava por sorte espera o evento do Blockly (`b182d1313`);
- os documentos foram conferidos contra o código (nomes de tela, menus, atalhos, constantes, SHAs)
  e corrigidos.

A conferência logada no staging (apps em `7b00717b6`,
[`../qa/2026-11-21-studio-lote8-staging.md`](../qa/2026-11-21-studio-lote8-staging.md)) confirmou as
três propostas na tela (origem do Pro, Histórico do projeto, Procurar no programa) e achou mais
três defeitos, consertados com teste e implantados em `1750d5881`:
- o Pro recém-convertido abria com 42 problemas nos arquivos de apoio da plataforma (`10b267b0b`);
- "Ver mudanças" não contava um arquivo novo vazio (`51bef14ec`);
- "Mostrar o bloco" abria todas as funções recolhidas acima do alvo e mudava o projeto salvo; no
  Reino Zero Ultra a aba do Chrome conectado travou por cerca de três minutos (`1750d5881`).

O fecho do plano (noite de 21/11) consertou mais três coisas, cada uma com teste que reprova sem o
conserto, implantadas em `4eddccb1b` (community, community-kids e admin):
- "Erro ao salvar" num projeto de 7 mil blocos com a aba escondida: o registro de recuperação passa
  do teto da cópia síncrona, e agora a cópia nativa confirmada basta enquanto a página segue viva
  (`ed9412f96`);
- o intermitente do `ProjectList.creationScope`: a janela de projeto novo escolhia a linguagem num
  efeito, e o primeiro quadro mostrava a escolha errada (`ff230c579`);
- o intermitente do `css-learning.spec.ts`, que era perda de código: trocando da Ponte para os
  Blocos no meio da tradução, a carga velha dos blocos podia regenerar os arquivos por cima do código
  digitado (`4eddccb1b`, com o e2e `bridge-blocks-race.spec.ts`).

Conferido de novo no staging (mesmo relatório): a busca no Reino Zero Ultra abre só a função que
envolve o alvo, o Pro convertido abre sem problemas, "Ver mudanças" conta o arquivo novo vazio e a
aba escondida (simulada) não mostra mais "Erro ao salvar". O gesto da busca ainda trava o Chrome
conectado por minutos; medido, o texto em SVG é cerca de 90 vezes mais lento naquele navegador que
no mesmo Chrome 157 noutra máquina, e o mesmo gesto no playground tem tarefa máxima de 522 ms.

## Pendências

Atualizada no fecho do plano de 22/11. Saíram daqui, feitos: regiões 3D e o bloco de região, os
jogos D e E, o recorte de sprites no Jogo 2D, o custo da medida dos painéis e os casos dos testes
do aluno, as oito lacunas de persistência e o build hospedado com dependências reais (conferido
no Worker de staging).

| Pendência | Por que ficou | O que destrava |
|---|---|---|
| A versão nova do motor Python (`2026-11-22-areas-1`: o "repetir a cada" do Turtle e os blocos de região do Raylib 3D) no staging | o envio ao R2 trava nesta máquina (o `workerd` local não sobe) e o serviço temporário de promoção pede a aprovação operacional e um segredo de operador | decisão dela: aprovar o serviço temporário, ou rodar o `upload` numa máquina onde o `workerd` sobe; depois, o seletor `1dd32fdc…` e o catálogo `01c079c1…` no Members |
| Meus testes do Pro: o erro do jogo ou um valor que não aparece num teste vira "Tente de novo" para o lote inteiro (C2 do full review final) | o executor trata essa observação como falha dele, regra que as aulas também usam (lá, um erro do jogo não reprova a criança); mudar exige um modo próprio dos testes da criança no executor e uma imagem nova | um lote do executor |
| O jogo D: quando o "Quando entrar em área" troca de cena, a mesma passada confere os objetos da cena velha (G2); a grade do 2D Avançado guardada por referência (G5) | gravidade baixa; o conserto mexe no fragmento do cenário, que os cursos usam | um lote do motor 2D |
| Python: `entrou_na_regiao` consome a entrada na primeira leitura (E9) | exige uma versão nova do motor Python | a próxima versão do motor |
| O teclado preso nos jogos 3D sem placa de vídeo | diagnosticado (`756ce2cfa`), sem conserto | um lote de entrada do 3D |
| A prévia isolada no WebKit (Safari, iPad) | decisão B4: nenhum arranjo de iframe isola no WebKit | nada: decisão dela |
| Abrir nos blocos a sequência única de 10 mil | hoje abre pelo código, sem perda | carga de cadeia por partes no Blockly |
| IR, avisos e código refeitos só no evento mexido | o gesto com 10 mil blocos leva 220 a 354 ms; a meta de 50 ms vale até cerca de 2 mil | processamento semântico incremental |
| O jogo E com 1 km e 30 quadros por segundo com placa de vídeo de verdade | 1 km passa dos tetos de hoje (pela geometria do relevo, não pelo chão pintado; corrigido em 23/11/2026); a medida dos quadros é com GPU emulada | decidido em 23/11/2026: mundos de 2 km sem subir tetos e medida em aparelho real, no plano `docs/plans/2026-11-23-mundos-de-2km.md` |
| Relatório consolidado de p50 e p95 por máquina e fixture | os números estão espalhados pelos documentos | um lote de medição |
| A lentidão do Chrome conectado com projetos de milhares de blocos | o texto em SVG é cerca de 90 vezes mais lento naquele navegador; o trabalho do gesto caiu (5.752 para 393 blocos redesenhados), mas o tempo lá não foi medido de novo (a extensão do Chrome estava desconectada no fecho) | conferir o gesto num computador de família |
| Aparelhos físicos | decisão da dona: só emulação no CI | nada: decisão dela |
| Produção | decisão da dona: só staging | a dona pedir a release |

## Consumo de memória

| O quê | Medida | Onde | Evidência |
|---|---|---|---|
| Página do editor do Pro depois de 10 Parar e Rodar | +1,5% (Linux e Windows) | CI, homologação de `1dd1f51c6` | [`pro-em-escala.md`](pro-em-escala.md), `evidencias/pro-ensaio-2026-11-21/` |
| Jogo do Clássico no processo da prévia, do 1º ao 10º Rodar | Mini plataforma 1,8 e 1,8 MB; Cubo girando 3,7 e 3,7 MB; Defesa da Torre 4,4 e 4,5 MB | Windows local | [`isolamento-da-previa.md`](isolamento-da-previa.md), `evidencias/liberacao-de-recursos-2026-11-21/` |
| O vazamento que essa medida achou | o Jogo 2D ia de 2,0 para 3,4 MB em 10 ciclos (um documento preso por Parar); consertado | Windows local | `830a85b6b` |
| Objetos de GPU dos três motores 3D em 10 recomeços | contas vivas iguais nos quatro últimos recomeços | Windows local, CI Linux | [`motores-inventario.md`](motores-inventario.md), `evidencias/motores-gpu-2026-11-21/` |
| WebContainer do Pro | 2,4 a 2,7 GiB | diagnóstico de 17/11 | [`README.md`](README.md) |

Não medido: a memória do interpretador Python por parte, o Pygame nativo, a memória por processo
do navegador no Linux, a memória de GPU em bytes e os triângulos dos jogos 3D, a memória da prova
2D em ciclos e as sessões prolongadas num mundo grande.

## Limitações registradas

- **"Abrir a versão em blocos"** diz "A versão em blocos foi apagada" quando a cópia em blocos não
  está neste computador: num computador novo, antes de a lista descer da nuvem, a cópia pode
  existir só na nuvem ([`historico-do-projeto.md`](historico-do-projeto.md)).
- **Tetos de 200 ms** das operações do editor do Pro: medidos no Windows local (56, 97 e 87 ms);
  no CI podem oscilar.
- **Emulado** é só CPU do editor desacelerada no Chromium; Firefox e WebKit não têm essa emulação.
- O texto da missão chama a busca de "Pesquisar"; no Estúdio ela se chama "Procurar no programa",
  porque "Pesquisar" já é a busca de blocos da paleta. Ela, a montagem sob demanda e o recado "Não
  deu para abrir estes blocos" são do editor de blocos em JavaScript; o Python em blocos não os tem.
- **Recuperar a prévia presa** espera 1,2 s de silêncio do jogo (o batimento é de 1 por segundo):
  um jogo com quadros muito longos, editado bem nessa janela, pode ter o código de topo rodado de
  novo. Escolha de projeto, registrada.
- **No Pro**, um erro atrasado da página antiga que chegue depois do aviso de começo da página nova
  (são dois canais, sem ordem garantida entre eles) volta a contar; nenhum erro da página nova é
  escondido. Com a prévia defasada (código editado depois de rodar), o Zappy recebe os valores do
  jogo que roda e o código do editor, sem aviso.
- **A liberação de recursos do jogo** mede documentos, quadros, CPU e memória; a contagem de
  processos vai só para a evidência, sem critério (iframes com sandbox da mesma página dividem um
  processo).

## Como retomar

1. Ler [`mapa-da-missao.md`](mapa-da-missao.md) e a tabela de pendências acima.
2. Conferir a homologação integral mais recente (`gh run list --workflow studio-mission.yml`) e o
   registro dela em [`homologacao-a-h.md`](homologacao-a-h.md).
3. Seguir a ordem: regiões 3D com a frente do Molda (destrava D e E), recorte de sprites no 2D,
   lacunas de persistência, painéis (custo da medida e casos), consolidado de desempenho.
4. Regras que valem para qualquer lote: [`missao-original.md`](missao-original.md) (decisões no
   topo) e `packages/studio/CLAUDE.md`.
