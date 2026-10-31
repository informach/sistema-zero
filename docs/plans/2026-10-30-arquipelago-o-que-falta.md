# Arquipélago: o que falta do plano depois da revisão de 30/10

Base: `staging` com a revisão dos lotes (R1, R3, R4 e R5) e o C02b integrados, enviada ao
remoto em 30/10 (`273b85a2f`).
Este documento é a passagem para quem continua. Ele não repete as especificações: aponta para
elas e diz em que ordem fazer, o que é de Blender, o que é de código e o que é decisão da dona.

Fontes: [relatório da revisão](../../.audits/architectural-analysis-2026-10-30-arquipelago-revisao-dos-lotes.md),
[revisão dos lotes recebidos](../../.audits/architectural-analysis-2026-10-30-arquipelago-lotes-recebidos.md)
(com a [QA e o reprodutor das visitas](../qa/2026-10-30-revisao-lotes-recebidos/README.md)),
[índice de estado](../arquipelago-estado-atual.md), [pedidos de arte](2026-10-30-arquipelago-pedidos-de-arte.md)
e [plano do E04](../superpowers/plans/2026-10-30-arquipelago-e04-criacao-avancada.md).

## 0. Primeiro: três defeitos das visitas entre amigos (N08a)

**Corrigido em 31/10/2026** (serviço e repositório, sem migração; regressões em
`tests/db/visitas-de-amigos.test.ts` e o reprodutor atualizado mostra zero, recusa e 20).

A revisão dos lotes recebidos reproduziu, com serviço e repositório reais num Postgres local,
três defeitos que as suítes não cobriam. Eles continuam na `staging` (a API de visitas não mudou
desde a base revisada, `f62ab0807`). Corrigir antes de dar N08a por encerrado e antes de abrir as
visitas para famílias. Detalhes e ajuste sugerido no relatório da revisão (R01 a R03).

| Defeito | Onde | O que acontece | Ajuste |
| --- | --- | --- | --- |
| Gerar outro convite restaura acessos revogados (alta) | `arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-visitas-de-amigos.ts` (linhas 19, 38 e 93) | O aceite guarda só a criança anfitriã, sem o convite que o originou. Apagar o convite para a visita mas mantém os aceites; um código novo para a mesma criança faz o left join reencontrar a linha e devolve o acesso à família revogada, sem novo aceite | Ligar cada aceite ao convite que o originou, ou invalidar os aceites na mesma transação da revogação e da rotação. Pode pedir migração nova |
| Revogar durante a consulta ao Members ainda devolve a casa (alta) | `arquipelago-api/src/application/servico-das-visitas-de-amigos.ts:164` | `casa` confere as permissões, lê o salvamento e espera `lerQuarto`; depois da espera responde sem conferir de novo convite, consentimentos e aceite | Conferir a autorização outra vez depois das esperas externas e antes de responder, como as visitas adultas já fazem |
| Aceites simultâneos passam do limite (média) | `repositorio-visitas-de-amigos.ts:52` | A transação só trava um aceite já existente; dois anfitriões novos ao mesmo tempo leem a mesma contagem. Com 19 casas, dois aceites viraram 21 para um teto de 20 | Serializar as mudanças por família visitante (trava transacional) e contar sob a trava; aceite repetido do mesmo par idempotente |

Reprodução: `bun docs/qa/2026-10-30-revisao-lotes-recebidos/reproduzir-visitas.ts
'postgres://USUARIO:SENHA@127.0.0.1:PORTA/arquipelago_test_review'` (banco NOVO, só localhost e
`arquipelago_test*`). Hoje ele mostra `novoSemAceite: 1`, `devolveuCasa: true` e `casas: 21`.
Depois da correção, a regressão exige zero, recusa e no máximo 20. O script é diagnóstico (sai
com zero mesmo observando o defeito): os testes de regressão vão para a suíte da API.

## 1. Para a sessão com Blender

As quatro entregas abaixo já estão especificadas, com medidas, nomes de nós e aceite, nos
[pedidos de arte](2026-10-30-arquipelago-pedidos-de-arte.md). O código do jogo não desenha peça
nem colisor que falte na arte, então cada uma destrava uma parte do E04.

| Ordem | Entrega | Onde | Seção dos pedidos | Aceite |
| --- | --- | --- | --- | --- |
| 1 | Clareira de 5 × 5 m com `lote-cabana-a`/`-b` para o iglu | `arte/ilhas-b/pico.py` → `src/assets/ilhas/pico.glb` | "o lote do iglu no Pico" | Novo teste em `tests/cabana.test.ts` que confere o lote plano e livre contra os colisores do `pico.glb` (o teste do Pico saiu com o iglu na V20) |
| 2 | Subida final por fora da torre: escada, duas quinas, equilíbrio, corrente de ar, `subida-farol-*` e `vagalume-farol-N` | `arte/mundo/farol.py` → `src/assets/mundo/farol.glb` | "3. A subida final pelo Farol" | Teste no molde de `tests/subida-ao-cume.test.ts` |
| 3 | Segundo andar: `piso-andar-*`, `escada-interna`, `piso-andar-vao`, `guarda-corpo-andar` | kit `arte/casa` → `src/assets/casa/` | "1. Segundo andar da casa" | `tests/faces-coplanares.test.ts` com as peças novas e a escada subida com a cápsula real |
| 4 | Nó `chao-do-lote` separado (e `enfeites-do-lote`) | `arte/mundo/terreno.py` → `src/assets/mundo/terreno.glb` | "2. Moldar o terreno" | Teste que lê o nó, a emenda e confere `alturaDaIlha` igual fora do lote |

A ordem vai do menor e mais isolado (uma clareira) ao que mexe em peça usada por todo o jogo (o
chão da sua ilha). Os caminhos de `arte/` acima são relativos a `packages/arquipelago/`.

Regras de toda entrega (README de cada pasta de `arte/` e seção "Entrega esperada" dos pedidos):
- Regerar pelo script do Blender, nunca editar GLB à mão. Atualizar o `relatorio.json` da pasta
  com as coordenadas finais das âncoras e os limites dos colisores novos.
- Não remover nem renomear nós, colisores, clipes e materiais existentes; conservar origem,
  escala e rotação de cada modelo.
- Sem faces coplanares de materiais diferentes nem emenda em T (`tests/faces-coplanares.test.ts`).
- Colisores `col-*` com forma simples; folgas do pedido dos portos (faixa de 1,5 m, degraus de
  até 0,30 m).
- Os cinco portos do barco já foram entregues e integrados: não refazer.

## 2. Depois da arte (código, sem Blender)

O salvamento V20 está a cerca de 600 bytes do teto no pior caso. Iglu, andar de cima e terreno
vão para um documento à parte no serviço, como descrito no plano do E04 ("O documento próprio da
obra"): `ObraEstendidaSchema` nos contratos, `GET/PUT /obra-estendida` com revisão no serviço,
fila e diário no jogo, desfazer no Construir. O iglu chegou a ter um commit (`3751feaaa`) e saiu
na integração da V20 por falta de espaço; ele volta por esse documento, não pelo salvamento.

A subida final é um percurso `farol-subida` com três estrelas, como os outros. Ela cabe no
documento próprio se a entrada de 96 bytes não couber na V20.

Cada parte precisa do aceite do pedido de arte, colisão com a cápsula real, prova no navegador
em computador e celular emulado e o teste de documento cheio do contrato novo.

## 3. O que não é Blender: conteúdo, operação e decisões

| Pendência | Situação | Quem decide ou faz |
| --- | --- | --- |
| Conteúdo dos quatro baús (§6.24 das regras) | Hoje `abrirSegredo` só grava o achado e o álbum o conta. A proposta pede Lumis raros e páginas extras do diário | A sessão que continuar pode decidir (decisão da dona em 30/10), com criatividade e coerência com o resto do jogo: ver o item abaixo |
| Aplicação do Inventor | A corrida da Vila ainda não comprova pulo com apoio, colisão e dificuldade | Conteúdo dos desafios, sem arte |
| Publicação dos quadros | 54 de 130 entradas locais pedem publicação; Bosque e Vila, nenhuma | Resolver repertório e objetivos antes; não marcar `publicar: true` em lote |
| Noite das Lanternas | Sem data, desligada (`sistemas/festas.ts`) | A dona |
| Publicação, importação e operação | Importar pelo Admin depois de conferir fontes e cursos de cada comunidade; criar no Hub o clube e o canal `fotos-do-arquipelago` com aprovação obrigatória; conferir as migrações 0017/0018 e as versões de API, gateway, BFF, Members, Admin e cliente do jogo juntas | Operação da dona |
| Validação autenticada | Jornada completa nas duas comunidades (curso, desafio, aprovação, cor, prêmio, fliperama, volta e persistência) e consentimento de duas famílias nas visitas | Operação da dona |
| Aparelhos reais | Toque e desempenho em celular físico; SwiftShader e ciclos de memória estáveis não provam 30 ou 60 quadros por segundo | Operação da dona |

### Conteúdo dos baús: o que decidir

A dona deixou a decisão para a sessão que continuar, com criatividade e coerência. Pontos de
partida no código e na proposta:
- São quatro baús, nas ilhas antes do Pico: sua ilha, Bosque, Vila Doce e Recife
  (`sistemas/segredos.ts`, regras §6.24). Cada um só se abre com o planador, do Pico.
- A proposta fala em "baús, Lumis raros e páginas extras do diário em lugares que só o kit de
  movimento completo alcança".
- Já existem 14 espécies de Lumi, uma comum e uma rara por ilha (`ESPECIES_DE_LUMI` em
  `sistemas/lumis.ts`, famílias em `sistemas/borroes.ts`, modelos em `src/assets/lumis/`). Um
  Lumi raro do baú precisa caber nessa régua (ilha, cor do material `corpo`, miniatura do álbum)
  e no salvamento, que está quase cheio (ver o plano do E04).
- As páginas do diário são da Íris (`sistemas/diario.ts`); páginas extras seguem a voz dela e não
  contam o segredo do Farol antes do final.
- Registrar a decisão nas regras §6.24 e, se houver modelo novo, acrescentar o pedido de arte com
  nome, medidas e finalidade antes de modelar.

## 3a. Código fora do E04

- **Python e Pro pelo desafio do jogo:** feito pela outra sessão (item 4). O que ainda falta
  desse assunto: a elegibilidade pelas aprendizagens (hoje o desafio abre com a ilha aberta, e a
  revisão pede ligar às competências que ele cobra; é uma escolha pedagógica a registrar), as
  fontes curriculares do Vale textual, a prova no navegador com o runtime publicado e a pilha
  inteira, e a publicação dos quatro desafios, que seguem `publicar: false`.
- **O arrasto do "Olhar" no Construir:** a Q01 registrou falha na base limpa no verificador de
  móveis (`playground/verificar-moveis-browser.ts`). As duas revisões de 30/10 não reproduziram;
  a causa não está provada e não quer dizer que os móveis estejam quebrados. Investigar antes de
  aceitar aquela qualificação visual, em computador e celular emulado.
- **Documentos desatualizados (R04 da revisão dos lotes recebidos):** o índice de estado foi
  corrigido (R5 de 30/10). Seguem pendentes o programa de ajustes, que mistura instruções e
  estados históricos sem marcar o que já foi integrado depois (C01f e outros), e a Q01, que
  lista `recife-python/`, `pico-python/`, `vale-texto/` e `nuvens-pro/` como pastas (os arquivos
  ficam em `recife`, `pico`, `vale` e `nuvens`). Os dois estão sendo editados pela outra sessão.


## 4. Feito em outra sessão: Python e Pro no jogo

O R2 foi feito pela sessão `implementar-levantamento-arquipelago` e está em `origin/staging`
(push de 30/10, `273b85a2f`): release Python ativa no Recife e no Pico (`d1a14b2ce`) e o C02b
(`42a908ffa`, [plano](../superpowers/plans/2026-10-30-arquipelago-c02b-python-e-pro-no-jogo.md)).
O Python usa um contexto de execução próprio do desafio (`arquipelago`, conferido contra o projeto
inicial no Members); o Pro compila pelo BFF com o modelo do projeto inicial. Zappy, exportação e
REPL ficam fora do desafio. As pendências que sobraram estão no item 3a.

## 5. Antes de começar

- Conferir `git worktree list` e o `git status` de cada worktree: várias sessões trabalham no
  Arquipélago ao mesmo tempo.
- A base foi enviada ao remoto em 30/10 (`origin/staging` = `273b85a2f`); confira se algo
  novo chegou antes de começar.
- Ordem sugerida pelas duas revisões: visitas (item 0), as pendências de Python e Pro (item
  3a), o "Olhar" do Construir, as entregas de Blender e o E04 no código, conteúdo dos baús, e por fim publicação,
  validação autenticada e aparelhos reais. Não anunciar o programa como concluído antes disso.
