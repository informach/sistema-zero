# Mapa da missão: cada seção do texto original e o estado dela

Registro vivo, atualizado a cada lote. A régua é [`missao-original.md`](missao-original.md), com
as decisões da dona anotadas no topo dele. Uma seção só passa a **feita** com implementação, teste
e evidência versionada; o resto fica na coluna "O que falta", sem ser apresentado como concluído.
Tudo aqui é staging: nada foi para a `main` nem para produção.

Lotes do plano de 21/11: 1 fechar o que já está no staging; 2 isolamento; 3 Clássico; 4 motores e
streaming; 5 Pinta, Molda e Zappy; 6 persistência e Pro; 7 fluxo profissional; 8 homologação e
entregáveis.

## Estado em 21/11/2026 (fim do lote 8 e do full review final)

| Seção | Estado | Evidência | O que falta (lote) |
|---|---|---|---|
| 2. Cursos protegidos | feito | matriz (43 testes), `protectedCourses.test.ts` (15), as cinco aulas no CI (399 gestos, 66 objetivos); Verificar, Enviar e Concluir no app de staging em 20/11 ([`../qa/2026-11-20-studio-casca-staging.md`](../qa/2026-11-20-studio-casca-staging.md)); aula com vídeo e casca ligada em 21/11 ([`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md)) | capturas de depois das mudanças de 20 e 21/11 (8); vídeos gravados nunca acessados, registrado como lacuna |
| 4. Etapa 0, linha de base | parcial | `linha-de-base-linux.md`, `e2e/engine-baseline.spec.ts` (cinco motores, 10 ciclos), `classico-em-escala.md`, `pro-em-escala.md`, [`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md) | relatório consolidado com p50 e p95 por máquina e fixture; custos medidos dos dez runtimes (4 e 8) |
| 5. Etapa 1, isolamento | parcial | casca em outro site **ligada no staging e conferida logada nos dois apps em 21/11**: teclas sem clicar no palco, sem laço de foco, programa hostil (50 ms de atraso no editor), Parar em 846 ms; os nove programas hostis da missão no CI no Chromium (prévia direta e casca) e no Firefox (casca), sem o WebKit (B4); lote 2: os nove programas hostis com o salvar durante o pior, o vigia que não troca o documento preso em si mesmo (`6c07e0343`), a liberação de recursos do jogo medida (`a70c17033`) e o vazamento de um quadro por Parar consertado (revisão do lote 2), a troca de perfil com gravação em voo no app (`e6d880a23`) e a decisão do WebKit (B4: fica a proteção de hoje) | o teclado preso nos jogos 3D sem placa de vídeo (diagnóstico de 756ce2cfa); o WebKit sem isolamento, por decisão |
| 6. Etapa 2, Clássico em escala | parcial | 10 mil blocos abrem e geram código no formato dos jogos nas três engines (`43f20c03d`, `classico-em-escala.md`); lote 3: o Python com cadeias longas (`fce7540e4`), a sequência única de 10 mil sem derrubar o editor nem perder blocos (`2b54c17e5`), "Procurar no programa" com "Mostrar o bloco" (`fe622cf3f`), o mesmo estado e o mesmo código com e sem montagem sob demanda com 10 mil blocos, depois de abrir e depois de editar, num job do CI (`studio-classic-equivalence.yml`, evidência bruta em `evidencias/classico-equivalencia-2026-11-21/`), e o gesto com 10 mil sem duas das três serializações inteiras (perfil antes e depois) | abrir a sequência única de 10 mil nos blocos (hoje abre pelo código, sem perda); IR, avisos e código refeitos só no evento mexido (o gesto com 10 mil é uma tarefa de 220 a 354 ms; a meta de 50 ms vale até ~2 mil blocos) |
| 7. Etapa 3, Pro em escala | critérios atingidos | 60 arquivos com as quatro medidas no Linux e no Windows; ensaio com tudo ligado (`22ffac242`, `pro-em-escala.md`); lote 6: o "ENOENT" cru corrigido (`74c852e78`); "Organizar as importações" (`f3b11d15a`); "Onde isto é usado", "Trocar nome" e "Arrumar código" abaixo de 200 ms, com o "Arrumar código" que tirava os espaços consertado (`9d8934d5a`); ensaio com uma dependência de verdade no WebContainer (`c2142a528`); o Histórico do projeto, com comparação e volta (`7fb0c4f30`, `0fe5d470e`), no CI na homologação de `d2f238b62` | build hospedado com dependências; Meus testes do Pro no navegador |
| 8. Etapa 4, motores e streaming | parcial | inventário dos cinco motores ([`motores-inventario.md`](motores-inventario.md)); os cinco tetos que cortavam calados passaram a avisar (8.4); o Jogo 2D sem os 54,7 KB de comentários de bloco (−13% em bytes, −21% em gzip) e o 3D Avançado 2,2 KB menor, com os tetos de payload descidos; a GPU dos três motores 3D estável em 10 recomeços (contas do WebGL, recomeço que recria a cena conferido, com sabotagem; o Mundo 3D prova só o recomeço leve); desenhar sprites fora do palco medido (0,45 ms por grupo cheio fora da tela: o recorte pede separar o estado do quadro do desenho) ; proposta 4 (aprovada em 21/11), parte 2D: o tocador do Pinta desenha só os objetos perto da câmera (16.384 → 1.358 desenhos por quadro numa cena no limite, `719fade30`; a instância de conjunto fica fora do recorte e as imagens são pedidas ao criar a cena, `78f854bae`) | feito no plano de 22/11 (lotes 5 a 8, ver a seção abaixo): regiões 3D, o recorte de sprites fora do palco e os jogos D e E. Fica o relatório consolidado de p50 e p95 por máquina |
| 9 a 11. Investigar, Desempenho, Meus testes | entregues pela proposta aprovada | [`paineis-proposta.md`](paineis-proposta.md); Python no staging com a distribuição nova, num projeto novo: Investigar, Pausar, Avançar 1 quadro (exato), Desempenho (59 quadros por segundo) e teclas (21/11) | custo da medida (< 5%) medido no navegador; casos de chave, porta, vida, placar, fim, compilação e tempo (8) |
| 12. Pinta e Molda | parcial | fixtures congeladas dos contratos e a regra do campo desconhecido (`1136c01a1`); prova da exportação 2D nas três engines, as três verdes na homologação de `1dd1f51c6` (`70934d023`, `61ef65f2d`); lote 5: contrato de um cenário real do Molda com tudo o que a seção pede (relevo, água, caminhos, grupos e conjuntos, colisões, partidas, marcadores, iluminação, materiais e regiões), pelo domínio e pelo compilador reais e a importação do Estúdio (`src/core/scene3d/__tests__/moldaFullScenario.contract.test.ts`, 15 casos) | streaming por regiões (o formato v1 não tem lista de regiões e o Estúdio carrega a cena inteira: entrega externa e proposta); textura de biblioteca e a carga no Three do cenário completo (provar no navegador); memória da prova 2D em ciclos (4) |
| 13. Persistência | parcial | P1, P2 e P4 corrigidos; P3 pela opção 1 (`88eab2a15`); v4 homologada em parte (`../qa/2026-11-19-studio-v4-homologacao.md`); lote 6: a matriz de quedas por borda de escrita com o teste de cada célula e as lacunas ([`persistencia-matriz.md`](persistencia-matriz.md)); o vínculo Clássico→Pro conferido nos dados e MOSTRADO à criança (proposta aprovada em 21/11: "Feito a partir de…" no cartão e "Abrir a versão em blocos" no menu ⋯); a gravação do Python na primeira abertura conferida (é de propósito) | as oito lacunas fechadas no lote 1 do plano de 22/11 ([`persistencia-matriz.md`](persistencia-matriz.md)) |
| 14. Fluxo profissional | parcial | lote 7: a exportação do Pro leva a trava do grafo aprovado (`package-lock.json`, os 14 modelos) e foi conferida fora do Estúdio, `npm ci` e build duas vezes idêntico, 15 de 15 no Windows local e num job do CI no Linux e no Windows ([`exportacao.md`](exportacao.md)); avaliação escrita do Git ([`git-no-pro-avaliacao.md`](git-no-pro-avaliacao.md): sem Git agora) ; o Histórico do projeto do Pro (proposta aprovada em 21/11: versões neste computador, comparar com agora e voltar, [`historico-do-projeto.md`](historico-do-projeto.md)); o mesmo build byte a byte no Linux e no Windows para os 15 projetos (CI em `ee82d0dfd`) | build hospedado com dependências (staging) |
| 15. Zappy | parcial | revisão exata já existia; lote 5: com a aba Investigar ou Desempenho ligada, o Zappy recebe na hora da pergunta os valores e as medidas que a aba mostra, com a regra de não inventar nada (`zappy-e-as-abas.md`) | o Zappy não pede sozinho para ligar uma aba (de propósito); sugerir testes e refatorações seguem pelo contexto de código |
| 16. Aparelhos de referência | **emulado** (decisão dela) | CPU 4x e 6x no CI, só no Chromium: Firefox e WebKit não têm essa emulação ([`aparelho-modesto-emulado.md`](aparelho-modesto-emulado.md), `studio-modest-device.yml`) | nenhum aparelho físico, por decisão |
| 17. Homologação A a H | A, B, D e E feitas (E com 384 m); C, F, G e H parciais | [`homologacao-a-h.md`](homologacao-a-h.md); `studio-mission.yml` (sob pedido ou em branch `estudio-missao-*`): 44949817617 em `d2f238b62`, 11 de 12 verdes (a falha era um teste consertado em `b182d1313`); a final, 44972735574 em `4eddccb1b`, 12 de 12 verdes; capturas dos cursos depois das mudanças (`evidencias/a3-depois-2026-11-21-ci/`); Verificar e Enviar com a casca ligada | os itens de C, F, G e H listados no documento |
| 18. Branch, worktree e PR | substituída (decisão dela) | trabalho direto na `staging`, com commits pequenos e push | — |
| 20. Entregáveis | feito, com as lacunas escritas | [`entrega-final.md`](entrega-final.md) (os 17 entregáveis, o concluído, o pendente, a memória e como retomar), [`manual-classico.md`](manual-classico.md), [`manual-pro.md`](manual-pro.md), [`guia-desempenho-e-depuracao.md`](guia-desempenho-e-depuracao.md), [`exportacao.md`](exportacao.md), [`homologacao-a-h.md`](homologacao-a-h.md) | relatório consolidado de desempenho (p50 e p95 por máquina e fixture); o PR foi substituído por decisão dela |

## Lote 1 (21/11): o que fechou

- Casca isolada de volta ao staging (Worker da frente do Pinta, apps em `61ef65f2d` com
  `STUDIO_CLASSIC_SHELL_ENABLED=1`) e conferida logada no app adulto, numa aula com vídeo e no
  Kids: [`../qa/2026-11-21-studio-casca-staging.md`](../qa/2026-11-21-studio-casca-staging.md).
- Distribuição Python nova ativa no staging; painéis conferidos num projeto novo. Os cinco projetos
  Python antigos de teste e QA foram apagados pela interface, com a lista confirmada por ela.
- Texto original da missão versionado (`missao-original.md`).
- O lint do CI estava vermelho desde `61ef65f2d` por quatro JSON brutos meus, sem a formatação do
  Biome (`15e34d911`, valores conferidos iguais). A outra falha antiga do CI, o processo zumbi do
  `studio-runtime`, já tinha conserto em `5155bc5e8`.

## Lote 8 e full review final (21/11)

- Lote 8: o documento A a H, os manuais do Clássico e do Pro, o guia de desempenho e depuração e a
  entrega final; a homologação integral em `d2f238b62`; as capturas dos cursos depois das mudanças;
  Verificar e Enviar com a casca ligada no staging.
- Full review final, em seis frentes independentes (isolamento e Clássico, motores e Pinta, Zappy e
  persistência, editor e histórico do Pro, exportação, veracidade dos documentos). Consertos, cada
  um com teste vermelho antes: a trava da exportação com as marcas calculadas para o projeto
  (`efd8a4d12`); o recorte do Pinta que cortava conjuntos e pedia imagens tarde (`78f854bae`, com o
  teto do fragmento descido para 26.500); o erro antigo do Pro no Investigar e no Zappy e a
  observação que não cedia no orçamento (`b817a7ab1`); o histórico numa transação só e sem
  promessas falsas (`0fe5d470e`); a carga dos blocos Python e a busca em bloco travado
  (`0179cbf52`); os avisos dos grupos do Jogo 2D (`fab54bc52`); o teste da busca que passava por
  sorte (`b182d1313`). Os documentos foram conferidos contra o código e corrigidos.

## Fecho do plano (noite de 21/11)

- **"Erro ao salvar" com a aba escondida** num projeto de 7 mil blocos: o registro de recuperação do
  Reino Zero Ultra aberto tem 3.068.580 caracteres e não cabe na cópia síncrona (teto de 2
  milhões); com a página viva, a cópia nativa confirmada basta (`ed9412f96`,
  [`persistencia-matriz.md`](persistencia-matriz.md)).
- **Os dois intermitentes da homologação 44954172658, pela causa**: a janela de projeto novo
  escolhia a linguagem num efeito (`ff230c579`); e a troca da Ponte para os Blocos no meio da
  tradução podia regenerar os arquivos a partir da carga velha dos blocos, apagando o código
  digitado (`4eddccb1b`, e2e `bridge-blocks-race.spec.ts`).
- **Conferido de novo no staging** (apps em `4eddccb1b`,
  [`../qa/2026-11-21-studio-lote8-staging.md`](../qa/2026-11-21-studio-lote8-staging.md)): a busca no
  Reino Zero Ultra, o Pro convertido sem problemas, "Ver mudanças" com o arquivo novo vazio e a aba
  escondida (simulada) sem "Erro ao salvar". O gesto da busca ainda leva minutos no Chrome
  conectado, onde o texto em SVG é cerca de 90 vezes mais lento que no mesmo Chrome noutra máquina;
  no playground a maior tarefa é de 522 ms.

## Plano de conclusão de 22/11 (lotes 1 a 9 e 7b)

Pedido dela: "Resolva tudo aqui, sem ficar esperando ou dependendo de outras frentes". Os cinco
itens abertos em 21/11 viraram o plano de conclusão, feito na `staging` com um review entre cada
lote e um full review final de oito revisores. Resumo e pendências em
[`entrega-final.md`](entrega-final.md) (seção "Conclusão do plano de 22/11/2026").

- Lote 1: as oito lacunas da persistência ([`persistencia-matriz.md`](persistencia-matriz.md)).
- Lote 2: a busca em projeto grande (corpos escondidos adiados, abrir só para mostrar;
  [`classico-em-escala.md`](classico-em-escala.md)).
- Lote 3: o custo da medida dos painéis (abaixo de 5% em todos os runtimes) e os casos dos testes
  do aluno.
- Lote 4: o build hospedado com dependências reais (CI e Worker de staging).
- Lotes 5 a 7 e 7b: regiões 3D (formato, carga por regiões, o bloco nos três motores 3D, a
  ferramenta Regiões no Molda Cenários e o Raylib 3D do Python) e o jogo E.
- Lote 8: o jogo D (2D de grande porte), com a sessão de 10 minutos verde no CI.
- Lote 9: os jogos D e E na galeria (só da equipe), a implantação no staging, a conferência logada
  ([`../qa/2026-11-22-studio-lote9-staging.md`](../qa/2026-11-22-studio-lote9-staging.md)) e o
  full review final. A conferência achou o jogo E abrindo em branco na galeria (o arquivo levava a
  IR vazia do projeto do modo Ponte), consertado em `c9f69bf6b`; a segunda achou o editor sem os
  blocos (a galeria montava os blocos antes das regras do Jogo 3D) e as moedas quebrando a física,
  consertados em `73f8fbc34`; a terceira, o céu preto dos cenários no Estúdio (a esfera do céu
  maior que o alcance da câmera), consertado em `abc47abbe`; a quarta, o aviso da tela sem
  descrição, em `b1b3de3ab`.
- Não implantado: a versão nova do motor Python (o envio ao R2 trava nesta máquina; o outro
  caminho pede aprovação dela).
