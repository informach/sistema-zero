# Revisão da integração: Admin, oficinas e comunidades

Data: 23/10/2026. Base integrada: `1546f7256e85b33541ce8b56ff3493c2250f2615`.

## Escopo

Conciliação do Admin local com `origin/staging` (`ccbc2db4e`): nova sala da equipe,
lentes Kids/Adultos, autoria e inscrições das oficinas, agenda e sala de encontros,
jornada configurável, criação de perfis com nascimento obrigatório e integração Molda/Pinta.
O diff também contém alterações do Molda e correções do Estúdio já presentes no remoto.
Os seis conflitos foram resolvidos preservando os fluxos de ambas as frentes.

Não foram recuperadas indiscriminadamente versões antigas de motores, roteiros ou experimentos
de outros worktrees. Nenhuma fala de curso foi reescrita neste lote de revisão.

## Achados corrigidos

| Prioridade | Problema reproduzido | Correção e regressão |
| --- | --- | --- |
| P1 | A leitura de rascunho da jornada apagava a proposta antes de comparar a versão publicada. Uma tela somente leitura também podia consumir o rascunho. | Consumo condicionado à versão e à permissão. Uma base diferente permanece guardada; recuperação/descarte são escolhas explícitas. Recuperar não publica e exige nova comparação. Testes de persistência e do editor real. |
| P2 | Paginação antiga da agenda podia reaparecer depois de atualizar a lista; cliques rápidos duplicavam a consulta. | Cada leitura possui cursor, cancelamento e identidade próprios. Respostas e finalizações obsoletas não alteram a leitura vigente; saída cancela a paginação. Quatro cenários do hook real em ambiente isolado. |
| P2 | No cadastro das oficinas, Kids → Adultos → Kids permitia que uma página da primeira visita contaminasse a terceira. Dois cliques disparavam duas consultas. | Identidade por leitura, cancelamento na troca/saída, reserva síncrona da paginação e cursor codificado. Regressões reais da tela reproduziram a turma obsoleta e duas consultas antes da correção. |
| P2/QA | O CI falhava ao salvar paleta Molda quando outro teste deixava um mock parcial do Pinta no processo compartilhado. | Os dez casos originais executam em processo isolado, preservando suas asserções. Controle com o mock contaminante reproduziu a falha e passou com isolamento. Nenhum comportamento de produto foi alterado para acomodar o teste. |
| QA | Testes antigos de criação de perfil não preenchiam nascimento, exigido pela política nova. | Dados válidos atualizados; acrescentadas recusas de nascimento ausente/inválido e de tentativa pública de bypass legado. Guardas de UUID e repetição preservadas. |

Também foi corrigida uma quebra de formatação em `PreCheckoutModal.tsx`, sem alterar o fluxo.

## Contratos conferidos

- A lente do Admin seleciona conteúdo da comunidade; a agenda global conserva ambas. A
  identidade da comunidade de um curso existente não é redefinida pelo seletor do painel.
- Papéis e modo somente leitura continuam sujeitos à autorização do BFF/servidor. Botões
  desabilitados não substituem autorização. Os passos da jornada não publicam automaticamente.
- Cada aula publicada do curso ao vivo produz um encontro. Cadastro de turma conserva fuso,
  ordem das datas, vagas, prazo de acesso, responsáveis e abertura explícita das inscrições.
- Cadastro adulto usa a conta como participante; cadastro Kids distingue família, criança e
  reserva. O picker não inventa identificadores de aluno.
- A sala conserva o trabalho durante reconexão. Acompanhar a turma só navega para partes já
  abertas; não concede conclusão. A saída usa navegação completa para liberar o contexto de
  câmera/isolamento do navegador, preservando o destino correto de retorno ao Admin.
- A contagem de colegas é calculada no servidor antes do filtro de participantes e entrega
  apenas o número. Não revela a lista de outras crianças.
- Nascimento é obrigatório para criar novos perfis. A restauração dos perfis antigos continua
  aceitando registros sem nascimento. Este diff não introduz migração de banco.
- Documentação, testes, caches e provas continuam excluídos do contexto Docker.

## Evidências locais

Comandos executados em série, com Bun 1.3.11. Logs privados em
`.cache/release-integration-20261023/qa/`; não incluem credenciais no relatório versionado.

| Superfície | Comando (no respectivo pacote) | Resultado |
| --- | --- | --- |
| Kids completo | `bun test` | 1.612 testes, zero falhas; 9.163 asserções; 138,41 s. Os dez casos Molda são executados pela fixture isolada e não contados novamente nesta tabela. |
| Admin completo, após as correções | `bun test` | 909 testes, zero falhas; 3.790 asserções; 75,09 s. |
| Oficinas Admin | `bun test ./tests/live-workshops-admin.test.tsx` | 10 testes, zero falhas; 47 asserções. |
| Members: domínio e HTTP das oficinas | `bun test` com nove arquivos live selecionados | 121 testes, zero falhas; 628 asserções. Inclui autorização, curso ao vivo, workspace, Pro, publicação e materiais. |
| Auth: perfil e HTTP | `bun test` com cinco arquivos de perfil/servidor | 148 testes, zero falhas; 542 asserções. |
| BFF de perfis e Studio cloud | `bun test` com dois arquivos selecionados | 12 testes, zero falhas; 28 asserções. |
| BFF: voz, leitura, preferências e jornada ao vivo | `bun test` com cinco arquivos selecionados | 40 testes, zero falhas; 106 asserções. |
| Controle de contaminação Molda | `bun --no-env-file test ./tests/fixtures/molda-polluted-parent.fixture.ts` | Um wrapper passou; seus dez casos originais passaram no processo filho. |
| Lint global | `biome ci . --diagnostic-level=error --max-diagnostics=10 --colors=off` | 11.072 arquivos conferidos; exit 0; 19 s. |

As provas negativas foram preservadas: perda de rascunho, leitura sem permissão, resposta
atrasada, duas paginações, contaminação de módulos e fixtures de nascimento desatualizadas.

## Gates de liberação ainda necessários

Este registro local **não é aceite de deploy**. Antes da promoção:
CI do snapshot final (tipos, builds, banco, Windows/macOS e navegadores), deploy
de staging e prova da interface publicada com sessão autenticada. O navegador de staging foi
aberto; login solicitado à responsável. Manter explicitamente bloqueada a prova autenticada
enquanto não houver sessão e versão nova publicada.

Fluxos de navegador prioritários: navegação e lentes do Admin; oficinas/cadastro e retorno ao
editor; agenda/entrada/saída da sala; editor da jornada sem publicação; Estúdio JS/Python.
Testes DOM não substituem essa prova do serviço publicado.

A implantação de produção deve respeitar a compatibilidade de criação de perfis: publicar o
formulário que exige nascimento antes de endurecer a API Auth; depois seguir as ondas canônicas,
incluindo Auth/Members juntos e a conferência de configuração carregada dos serviços afetados.

Qualificação de mídia real, carga, desempenho de jogos e conteúdo comercial não são provados
por essas suítes. Não liberar `LIVE_MEDIA_READY` por inferência a partir destes resultados.
