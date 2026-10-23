# Revisão da continuação do Estúdio Python — 22/10/2026

**Base da transferência:** `c133a2ff5693d3f1a036854be8a85d04ddd18cc5`.
**Corte revisado:** `c4222471a7c9105d6af4c303f265dcbcb9a80e85`.
**Conferência final do remoto:** 22/10/2026, aproximadamente 08:40 UTC.

O staging local foi atualizado por fast-forward e está no mesmo commit do remoto.
Há 103 commits no intervalo, incluindo merges de outras frentes. Esta revisão se
concentra na continuação do Python e nos contratos que ela atravessa: runtime,
publicação, capacidades, player, Pinta, aulas/Pro e ferramentas de homologação.
Não é uma auditoria integral dos quizzes, marketing e de todas as alterações
editoriais que entraram no mesmo intervalo.

## Avaliação

Houve avanço substancial e coerente em relação à transferência. As principais
decisões estão bem encaminhadas: release nova para novas capacidades, receita de
publicação versionada mantendo o leitor v1, retirada da análise do player público,
camada retida do Turtle e preservação das capacidades JavaScript do Pro completo.
Não encontrei novo P1 produtivo demonstrado nos recortes examinados.

Ainda não há aceite completo. Há falhas concretas nas ferramentas de medição e
isolamento, lacunas no resumo da homologação e pendências reais de implantação e
integração. Os resultados de navegador publicados pela outra máquina são relatos
de execução; os recibos atuais do cache daquela máquina não estão neste checkout.
Os testes focados abaixo foram efetivamente reexecutados nesta revisão.

## Achados prioritários

### P2 — A pilha dita isolada pode carregar configurações ambientais dos pacotes

`scripts/local-studio-stack/lib.ts:356` filtra apenas a herança de `process.env`.
Os serviços são iniciados com `bun run` no diretório de cada pacote
(`lib.ts:63` em diante e `up.ts:63`), sem bloquear a descoberta de dotenv. O Next
também executa seu próprio `loadEnvConfig`, independentemente do Bun.

Reprodução leve: um diretório novo de teste recebeu exclusivamente um `.env` com
marcador sintético. Um filho iniciado com o `childEnv()` real e o mesmo padrão de
execução carregou esse marcador. Nenhuma credencial real foi lida e nenhum serviço
ou chamada de rede foi iniciado. Existem arquivos `.env` nos pacotes deste
checkout; foi consultada somente sua presença.

Isso contraria a promessa de isolamento do README. As URLs/tokens explicitamente
locais continuam sobrescrevendo parte da configuração, mas opções deliberadamente
ausentes podem reaparecer. Por exemplo, Auth ativa o cliente de mensagens quando
encontra `GATEWAY_URL` e `AUTH_HMAC_SECRET` (`auth/src/composition-root.ts:154`).
Não há evidência nesta revisão de envio indevido ou de vazamento já ocorrido.

**Correção recomendada:** impedir o autoload do Bun e tratar também os arquivos
descobertos pelo Next. Um preflight que recuse o início ao encontrar dotenv
conflitante nos caminhos efetivamente pesquisados é uma opção simples; informar
somente os caminhos, sem mover/apagar arquivos do usuário ou imprimir valores.
Provar os dois caminhos com marcadores sintéticos. Não iniciar essa pilha neste
checkout até fechar esse isolamento.

### P2 — O oráculo de latência não prova resposta causal à entrada

`packages/studio/e2e-runtime/gamePerformance.ts:122` calcula o tempo do input até
o segundo repaint subsequente. Não correlaciona o repaint com a entrega da entrada
ao Python nem com sua consequência visual. Um jogo animado pode continuar
redesenhando enquanto o evento está atrasado ou é ignorado.

O mesmo valor é usado como gate de 100 ms em F3 e Space Arena. Um contraexemplo
com uma sequência sintética de repaints a 60 Hz produziu 16,67 ms, mesmo declarando
efeito da aplicação apenas em 500 ms. Esse contraexemplo testa a transformação do
oráculo; não é uma execução do jogo ou uma medição nova de latência real.

**Correção recomendada:** registrar um identificador da entrada e confirmar
entrega/tratamento e efeito observável correspondente antes de medir apresentação.
Preservar a medição de cadência de frames como métrica separada. Não concluir que
os números antigos são falsos; eles não demonstram a propriedade anunciada.

### Lacuna de gate — F1 registra orçamento excedido sem reprovar o teste

`packages/studio/e2e-python-editor/live-performance.spec.ts:297` grava
`passed: milliseconds <= targetMs`, mas não faz uma asserção contra esse orçamento
nem reprova posteriormente pelos registros. Os `expect` próximos conferem
consistência de relógios, pixels, respostas e bytes; não os tetos de
12.000/3.000/1.500 ms.

O próprio spec se identifica como diagnóstico, o que é válido. A lacuna é
considerar seu status verde como fechamento automático do aceite F1 sem outro
gate estatístico. Os valores relatados podem estar abaixo das metas; o problema
não demonstra erro no relógio ou nas medições publicadas.

**Correção recomendada:** preservar a amostra e seus diagnósticos, então exigir o
orçamento contratado. Se a decisão de aceite for estatística, agregar e exigir o
p95 da série completa e sua quantidade mínima, conforme o contrato, em vez de
confundir `passed` informativo com falha de teste.

### Lacuna de aceite — F3 por dez minutos não está comprovada pelos arquivos disponíveis

O contrato F3 exige dez minutos (`docs/plans/2026-10-16-estudio-python-desempenho.md:33`).
O novo spec usa 60.000 ms por padrão (`python-f3-performance.spec.ts:19`). Há
override por `SZ_F3_PLAY_MS`, mas não localizei recibo acessível demonstrando
600.000 ms; os cerca de 3.240 intervalos relatados são compatíveis com aproximadamente
um minuto. A partida de dez minutos do Space Arena é outra carga e não substitui F3.

**Correção recomendada:** tornar explícita a separação diagnóstico/aceite e guardar
o recibo de F3 com dez minutos. O entendimento do limite de frames como dois
quadros, registrado como decisão do usuário em 21/10, deve ser conciliado com o
documento original; não restaurar unilateralmente o limite literal anterior.

### Lacuna de aceite — `python-live` não fecha todo o fluxo de aulas e salas reais

`experiments/studio-python-runtime/liveService.ts:9` usa repositórios em memória;
o ownership é fixo e os atores são sintéticos. Em `:140`, o fixture explicita a
ausência de vídeo e renova a supervisão pelo serviço de sala.

É uma prova útil de integração dos serviços e do editor, incluindo autoridade e
revogação. Não fecha autenticação/perfis reais, banco persistente, mídia, gravação
e pausa da gravação, nem Admin→aula gravada→aluno. A linha R05/R06/R07/R10 em
`2026-10-21-lacunas-conclusao.md:40` deve enumerar essas fronteiras restantes,
em vez de deixar apenas “contas hospedadas”.

## Ajustes menores

- **Portabilidade da pilha:** `python-local.ts:37` fixa
  `C:/Users/julio/.../distributions-transfer`. O argumento `--distribution` permite
  apontar outro local, mas o comando padrão do setup não funciona em um clone
  novo nesta máquina. Derivar o local de `ROOT` ou exigir input explícito validado.
- **Continuidade dos artefatos novos:** a distribuição `65c9bffd…` e os recibos
  recentes estão descritos como cache da outra máquina. O rascunho de release
  disponível ainda é o pacote da transferência original, com a distribuição
  anterior. Publicar um complemento com os novos bytes e recibos sanitizados, ou
  documentar e provar sua reprodução determinística a partir dos inputs remotos.
  Hashes sem acesso aos bytes não permitem conferir a execução narrada.
- **Aviso do Admin:** `lesson-manifest-import.tsx:275` promete preservação após
  “Vincular ao destino aberto”, mas `change()` não altera o modo previamente
  selecionado. Se o operador escolheu Substituir, esse modo permanece. A confirmação
  posterior ainda existe; o problema é o aviso contraditório. Tornar a mensagem
  condicional ao modo, sem mudar silenciosamente a escolha do operador.
- **Status documental:** os documentos de retomada/lacunas contêm histórico ainda
  dizendo que faltam push, correções dos 16 testes e que o Pro Kids não abre.
  Isso foi superado pelos commits posteriores e pelo CI atual. Preservar histórico,
  mas adicionar um quadro de estado atual para não reabrir problemas encerrados.

## O que conferi positivamente

| Área | Avaliação desta revisão |
| --- | --- |
| Publicação v1/v2 | v1 mantém leitura/hash/replay; v2 verifica bytes canônicos e correspondência com fonte, entrypoint, extensão e lock. JS mantém a serialização anterior. |
| Retenção | Histórico e registros ilegíveis são preservados. O GC não coleta runtimes compartilhados; `retention.runtimes` é inventário, não uma autorização/fence de coleta desses runtimes. |
| Capacidades | BFF de publicação exige `publish`; Zappy exige `assist`; a release candidata tem identidade nova, mantendo a imutabilidade do piloto. |
| Player público | Núcleo recebe análise nula e não importa o cliente de análise como valor; operações de análise/REPL continuam recusadas. |
| Turtle | Não confirmei bug novo na camada retida/scheduler. Há invalidação para alterações visuais, ordem, fundo e resize, com testes focados verdes. Isso não substitui novo aceite gráfico. |
| Aula sem payload | O POST sem corpo agora abre o contexto, mantendo JSON malformado recusado e baseline validada. |
| Pro da equipe Kids | Decisão compartilhada por página e preparação; perfil ativo e permissões da jornada são preservados. Crianças não recebem a prévia administrativa. |
| Oferta Python | Galeria respeita a oferta do host e volta para JavaScript quando ela desaparece; `staff` não equivale a admin/superadmin. |
| Pinta | Linhagem do documento cancela importação após substituição, distinguindo isso de uma edição normal. |
| Producer Hosted | Prepara estrutura isolada e origem/audiência. Ainda não implementa sozinho o percurso gravado JS Pro completo; a documentação reconhece essa pendência. |

## Verificação executada nesta máquina

Todas as suítes abaixo rodaram serialmente com Bun 1.3.11,
`--no-env-file --smol`, no diretório canônico do pacote:

| Pacote / foco | Testes | Asserções |
| --- | ---: | ---: |
| Core: receita Python + capacidades | 10 | 69 |
| Studio Runtime: v1/v2, replay e GC | 7 | 110 |
| Studio: camada retida | 9 | 11 |
| Studio: scheduler | 5 | 23 |
| Studio: oferta da galeria | 3 | 9 |
| Member Shell: POST do contexto | 2 | 7 |
| Member Shell: publicação Python | 45 | 366 |
| Kids: acesso Pro | 8 | 22 |
| **Total** | **89** | **617** |

Zero falhas e zero skips nessas execuções. O comando
`bun --no-env-file --smol run scripts/validation-profile.ts --check`, no Runtime,
também passou. Fingerprint atual:
`735f1c2799803d872315254c857c793d9000e53a6a196e97bc2a2f1eb07521a9`.

Logs e duas reproduções sintéticas estão em
`.cache/review-continuation-20261022/`. Nenhum navegador, servidor, container,
deploy ou rotação de credenciais foi iniciado por esta revisão. Antes do relatório,
o checkout estava limpo; a única alteração desta revisão é este documento.

## CI e operação

No corte `c4222471a`:

- [CI 39704535639](https://github.com/informach/sistema-zero/actions/runs/39704535639):
  nove jobs de validação aprovados. `deploy-staging` falhou na etapa
  “Provar SSH readonly antes de qualquer apply/deploy”.
- [Diagnóstico 39704535627](https://github.com/informach/sistema-zero/actions/runs/39704535627):
  falhou na prova de deployment atual, sem alteração dos serviços.

Portanto o workflow vermelho não equivale a falha das suítes do código neste SHA;
também não comprova implantação bem-sucedida. A sessão responsável pela rotação
de chaves Railway foi informada pelo usuário e permanece dona dessa frente.

O [status oficial do Railway](https://status.railway.com/) consultado nesta revisão
anuncia incidente de segurança e invalidação de todos os tokens da API. Em
22/10 às 08:01 UTC, informa builds disponíveis para Pro/Enterprise e filas maiores
que o normal. É diferente da pausa geral descrita nos documentos de 21/10.
Não atribuí a rejeição SSH específica a uma causa única sem evidência.

## Ordem recomendada para concluir

1. Corrigir isolamento dotenv, oráculos de latência/F1 e o status documental.
   Disponibilizar os artefatos/evidências novos para conferir a mesma distribuição.
2. Fechar compilador Pro, preparação determinística de projetos JS antigos,
   inspeção Python e Pyright com Docker local ou serviço hospedado qualificado.
3. Depois da frente de chaves, conferir preflight SSH e estado atual de Auth,
   Members, Hub e aplicativos; retomar o deploy consistente do SHA aprovado.
4. Observar baseline fresco do Cloudflare e Members e regenerar o plano aditivo
   se necessário. Promover os 43 objetos da `audio-2`/`65c9bffd…`; implantar o par
   Worker/imagem com perfil coerente e ativar catálogo/hosts nos serviços corretos.
   Não repetir planos baseados em ausência histórica como se fossem atuais.
5. Receita v2 exige Worker atômico. Após a primeira publicação v2, um rollback
   para leitor anterior ao merge v2 quebraria essas publicações. Coordenar a
   reversão com leitores compatíveis, sem improvisar rollback antigo.
6. Homologar em staging Admin→gravada→aluno, salas com identidade/persistência e
   mídia reais, JavaScript clássico/Pro preservados, Python clássico/Pro,
   Mural→player anônimo, Zappy e negativos de capacidade/origem/revisão.
7. Fechar F3 de dez minutos com latência causal e o restante F4/F7/F8/F9,
   memória incremental e pico de 128 MiB do promotor. Completar as partidas e
   áudio ouvido por pessoa ainda declarados pendentes. Depois executar o computador
   de referência e os recortes móveis acordados.
8. Full review final e decisão explícita de produção. O código integrado, o CI
   verde e a homologação local são avanços distintos desse aceite.

Para gravações, liberar por percurso JavaScript efetivamente homologado e com a
interface/vocabulário publicados e estabilizados. Não exigir concluir toda a
matriz Python para gravar um percurso JS aprovado, nem inferir aprovação de todas
as aulas a partir do smoke do Estúdio livre.
