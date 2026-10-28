# Review do avanço remoto — 28/10/2026

## Versão e alcance

- Base: `b1723d7aaa49416d61ea13e53ce924b3a1d088b3`.
- Revisada: `742e9f66e6deb997a9e6a4aa2b535a0b4104a009` (origin/staging confirmado novamente ao fechar a revisão).
- 37 commits, 193 arquivos: desafios, publicação e recompensas; Members/gateway/BFF; cenário e movimentos do Arquipélago; ferramentas embarcadas; navegação e limite dos pais; contratos e migração.
- Revisão em worktree separado. A árvore principal contém trabalho de outra sessão e não foi alterada. Nenhuma correção produtiva, configuração remota ou implantação foi feita nesta revisão.

## Achados

### R1 — P1: rascunho altera publicação e localização do progresso concluído

`packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-de-desafios.ts:93`, `:270`, `:293`.

`gravar` substitui público, ilha, tipo, quadro e ordem na mesma linha usada pelas consultas de publicações. A publicação congela conteúdo e objetivos, mas não esses metadados. Salvar a revisão 2 de um desafio publicado na revisão 1 mantém a situação publicada e já muda o público/local em que a revisão 1 aparece, sem nova publicação/análise.

Além disso, `conclusoes` lê ilha/tipo/quadro do cadastro atual. Uma conclusão no Bosque passa a contar no Recife quando a equipe apenas muda a ilha no rascunho. Isso altera a cor/progresso já conquistado e contradiz a regra de preservação das conquistas.

Reprodução leve com os repositórios em memória existentes: revisão publicada 1 + rascunho 2 → público `adulto`; conclusão antes `bosque`, depois `recife`. A consulta Drizzle usa a mesma regra, conferida por leitura. Não foi executado Postgres real nesta revisão.

Correção: separar metadados de rascunho dos metadados publicados e preservar a referência histórica de localização de cada conclusão. Cobrir salvar sem publicar, trocar público/ilha/quadro e reler conclusões antigas.

### R2 — P2: arquivamento não invalida uma publicação concorrente

`packages/arquipelago-api/src/infrastructure/persistence/drizzle/repositorio-de-desafios.ts:152`.

`mudarSituacao` compara `revisaoBase`, mas não avança a revisão. Se a análise da publicação começou na revisão 1 e outra requisição arquiva o desafio, a primeira publicação ainda encontra revisão 1 e o reativa. A mesma revisão também permite que uma aba antiga reverta a situação mais recente.

Reprodução com o fake existente: publicar revisão 1 → arquivar revisão 1 → publicar com revisão 1 retorna sucesso e estado `publicado`. O SQL tem a mesma condição de escrita.

Correção: usar uma versão de escrita que avance também nas mudanças de situação, separando-a da identidade imutável do conteúdo publicado se necessário. Provar a corrida com análise suspensa e arquivamento concorrente no Postgres.

### R3 — P2: saída da ilha não encerra todos os recursos e carregamentos

`packages/arquipelago/src/mundo/ilha-completa.tsx:245`, `:270`.

O caminho normal de retorno a `longe` chama `soltarExtras`; o cleanup de desmontagem chama somente `soltarIlha`. Os materiais transparentes criados por `separarCopas` ficam fora da cena quando a copa está opaca, e `soltarIlha` só libera materiais atualmente anexados às malhas. A desmontagem também não avança `v.carga`, permitindo que a continuação de `aquecer` prossiga depois dela. Se a carga for invalidada enquanto aquece, o retorno após `await aquecer` também deixa os extras locais sem liberação explícita.

Reprodução com os objetos Three e funções produtivas, sem WebGL: ao executar o caminho de liberação da desmontagem, um material opaco recebe `dispose`, mas a cópia transparente recebe zero. Isso confirma a lacuna de ownership/liberação; não é uma medição de vazamento de GPU em navegador.

Correção: invalidar a carga ao desmontar e liberar ambas as famílias de materiais; garantir descarte também da preparação local que terminar após cancelamento. Validar com compilação pendente e abrir/fechar o cenário repetidamente.

### R4 — P2: cronômetro do percurso continua enquanto o personagem está bloqueado

`packages/arquipelago/src/mundo/bosque-vivo.tsx:364`, comparado com `packages/arquipelago/src/personagem/personagem.tsx:278`.

O personagem recusa comandos em `tempoSincronizando`, `tempoAcabou` e `painelAberto`. O novo cronômetro do percurso não verifica esses estados: ele continua somando tempo enquanto a criança não consegue andar, prejudicando o resultado/estrela do tempo. A cena continua desenhando nesses estados; somente ferramenta aberta muda o frameloop para `never`.

Confirmado por fluxo de código; não houve reprodução gráfica. Correção: usar uma política explícita e coerente de pausa para personagem e percurso, com testes de perda de sincronização e abertura de painel durante a corrida.

## Entrega ainda incompleta, distinta de regressão

`packages/member-shell/src/components/arquipelago-host.tsx:246` recusa todo pedido com `molde`. Todo desafio cria justamente um molde em `packages/arquipelago/src/estado/desafios.ts:88`. Portanto, o botão “Fazer o desafio” encontra `indisponivel/em-breve` na plataforma real; a ferramenta genérica continua sendo outro fluxo.

O plano prevê um Estúdio específico para desafios sem exigir o produto Estúdio Completo. Ainda faltam esse host/editor, a conferência pelo endpoint novo e a seção Jogo do Admin (há API, mas não implementação correspondente em `packages/admin/src`). Não resolver removendo a recusa e abrindo o Estúdio Completo genérico: isso aplicaria a política de acesso errada.

`ARQUIPELAGO_DESAFIOS` nasce desligado em produção. `ARQUIPELAGO_MEMBERS_TOKEN` é necessário nos dois serviços, junto de `MEMBERS_URL`; a migração nova é `0003_desafios.sql`. Esses nomes novos não constam de `.railway/variables.ts`, condição já declarada na documentação como preparação pendente. Esta revisão não consultou valores remotos nem certifica configuração/implantação. Não ativar desafios só mudando a variável enquanto o fluxo acima não existir.

O teto semanal novo é 150 moedas, com decisão posterior documentada no plano de 27/10; não foi classificado como defeito por divergir da decisão inicial de 100.

## Verificação executada

Instalação congelada sem scripts na cópia isolada, seguida de testes:

| Escopo | Passaram | Falharam | Pulados |
|---|---:|---:|---:|
| Arquipélago, contratos, API unit/integration | 316 | 0 | 1 |
| Members, objetivos, conquistas, gateway e política Kids | 63 | 0 | 0 |
| Host, porta, rotas e diálogo de ferramentas | 24 | 0 | 0 |
| Cartão de limite dos pais | 5 | 0 | 0 |
| Total | 408 | 0 | 1 |

O teste pulado exige Postgres. As suítes específicas de banco em `tests/db` não foram executadas. Sem navegador, typecheck completo ou medição de desempenho nesta revisão. Testes unitários positivos não fecham o aceite funcional do fluxo de desafios.

Reproduções adicionais: `packages/arquipelago/review-repros.ts`, saída `review-repros.log` na raiz deste worktree. São diagnósticos locais, não testes de aceitação do banco nem novos arquivos de produto. Logs das seleções: `review-tests.log`, `review-integration-tests.log`, `review-shell-tests.log`, `review-kids-tests.log`.

## CI da versão revisada

Execução: https://github.com/informach/sistema-zero/actions/runs/40653226712

Na última consulta ainda rodavam `ci` e três shards Chromium. `desktop-windows` já falhou no teste `mutual authentication, independent clients, invalid proof rejected`: `Cannot establish private pipe ACL`, em `packages/agent-runtime/src/process/security.ts:49`. O job teve 61 testes positivos e uma falha, e pulou a etapa seguinte de desktop/mídia.

O arquivo de segurança não mudou neste intervalo. O helper tem prazo de 10 s e o teste falhou em aproximadamente 10,6 s, compatível com esgotamento desse prazo, mas o log não prova a causa raiz. Não atribuir essa falha ao jogo, não remover a proteção de ACL e não tratar o CI como aprovado. Log obtido diretamente do job `122698004814`, em `review-ci-windows.log`.

## Ordem recomendada de fechamento

1. Corrigir a separação rascunho/publicação/conclusão e a concorrência de arquivamento; executar provas reais de banco.
2. Corrigir lifecycle da ilha e pausa do percurso; validar o cenário em navegador.
3. Concluir Admin e host do desafio antes da ativação, com limites e acesso próprios.
4. Diagnosticar a falha Windows, concluir CI e só então avaliar configuração e implantação da versão corrigida.
