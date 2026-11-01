# Publicação única de cursos e navegação adulta

## Pedido e limites

Cadastrar uma vez no Kids de staging, promover para Kids de produção com mídias próprias de produção e copiar de Kids para adulto dentro de cada ambiente. Criar destinos ausentes, substituir toda a grade ativa, publicar curso e aulas, conservar identidades correspondentes e histórico dos alunos. O menu principal adulto deve ser igual dentro e fora da aula.

A implantação deve incluir os commits concluídos de staging local e o palco de gravação do EdiAula no Railway. Não usar promoção real de Cadê Todo Mundo como teste: o PDF do Kids de produção foi atualizado pela dona durante o trabalho e pode ser mais recente que staging. Nenhum teste escreve em bancos de staging ou produção.

## Estado verificável

| Lote | Estado e evidência |
| --- | --- |
| Kids para adulto | Cadê Todo Mundo aplicado e conferido nos dois ambientes anteriormente. `docs/qa/2026-11-01-sincronizacao-cade-adulto.md`. |
| Menu adulto | Correção canônica de tema no commit `ce49cc979`. Comparação do mesmo componente dentro e fora da aula em `docs/qa/2026-11-01-menu-adulto/`. |
| Grade e progresso | Arquiva excedentes, recupera IDs ao restaurar, conserva progresso, conclusões e conquistas. Migration 0145. Publicador compartilhado por CLI e serviço. |
| Trabalho durável | Migrations 0146 a 0148, prévia, aprovação, cancelamento, retomada, leases e publicação atômica com conhecimento do tutor. |
| Promoção entre ambientes | Implementada em duas fases no worker de produção. Staging apresenta a prévia, produção possui o único trabalho. Prova com dois bancos locais separados e rotas reais. |
| Mídias | Inventário e substituições explícitas, R2 condicional público/privado, ediSVG com hash e validação, Vimeo nativo com registro de intenção anterior ao POST, voz e extração do tutor no destino. |
| Interface | Ações separadas de copiar ao adulto e promover Kids para produção, prévia, acompanhamento, cancelamento e retomada. Cinco fluxos de navegador aprovados em 1366×1000 e 390×844. |
| Operação | Operador `members/scripts/publish-course.ts` chama o mesmo serviço e worker. Runbook em `docs/operations/publicar-cursos.md`. |
| Configuração Railway | Portas de publicação configuradas no Members e Admin dos dois ambientes, sem reiniciar. Schemas locais validados com as variáveis reais do Railway e leitura sem `.env` local. |
| Palco | Criado em staging, ID `a9c67d3c-9880-4707-bb16-22a5e7a52c30`. Variáveis por referência ao Kids, configuração e ID do CI registrados. 21 testes atuais e build de produção dos últimos ajustes aprovados. Endereço `palco-gravacao-staging.up.railway.app` provisionado. Ainda falta publicar e conferir a sessão real. |
| Entrega final | Revisão e verificações finais, commit/push, migrações e deploys ainda pendentes neste checkpoint. Não tratar configuração como implantação. |

## Arquitetura implementada

O planejador puro fica em `members/src/domain/course-publication/course-sync.ts`; o executor canônico e o índice do tutor ficam na infraestrutura Drizzle. Nenhuma requisição web executa shell ou Railway CLI. O worker do Members usa portas HTTP específicas de mídia no Admin, onde vivem R2, Vimeo e ElevenLabs.

Produção possui o único trabalho da promoção. Os dois Members continuam sem endereço público: as chamadas entre ambientes atravessam portas específicas do Admin, com destinos fixos e tokens diferentes para delegação, leitura da origem e mídia de cada ambiente. A origem exportada exige trabalho aprovado e hash atual. Corpo de curso tem teto de 64 MB; recursos e comandos têm limites menores. O proxy do Next não bufferiza essas portas, que autenticam antes de ler o corpo. O navegador não recebe capturas, chaves privadas, transcrições ou credenciais.

A preparação instala primeiro as transferências, depois as tarefas de voz, vídeo e fontes do tutor. A troca de fase e suas tarefas entram na mesma transação. Um vídeo aguardando o provedor não bloqueia a preparação dos demais; o adiamento de 30 segundos é durável. O trabalho tem prazo de duas horas, lease de 90 segundos e renovação a cada 20 segundos. Origem, destino, arquivos e perfil de configuração são reconferidos antes da publicação.

No R2, a chave do destino deriva da versão da origem e o CopyObject é condicional ao ETag. Público permanece público, privado permanece privado. Arte de módulo preserva a extensão do pacote ediSVG e confere SHA, tamanho e o validador portátil; os recursos do pacote são incorporados. Vimeo usa cópia nativa, sem recodificação, e confere arquivos, transcrições, pasta, privacidade e domínios. Seu registro privado tem fases imutáveis: uma réplica atrasada não apaga uma confirmação concluída. Uma resposta incerta nunca autoriza repetir o POST de cópia.

A grade substitui somente a árvore ativa. A retirada de aulas arquiva registros; não apaga dados dos alunos. O índice do Zappy usa transcrições, texto e PDFs autorizados no destino. Fontes antigas são retiradas na mesma transação; conversas e entregas de alunos não são copiadas. O hash canônico desta funcionalidade passou a ordenar chaves por código Unicode, sem depender da localidade do processo; planos operacionais anteriores devem ser preparados novamente. Identidades derivadas de listas de strings permanecem iguais.

## Evidências e próximos passos

- `docs/qa/2026-11-01-publicacao-cursos/README.md`: interface, protocolos, dois bancos e limites da fixture.
- `docs/qa/2026-11-01-promocao-midias.md`: provas reais de R2 e cópia Vimeo, com objetos temporários removidos.
- Testes focados de sincronização: 39 aprovados, 206 asserções, incluindo o operador e sua configuração.
- Testes do leitor limitado do core: 10 aprovados, 38 asserções com inventário de mídia.
- A fixture de navegador usa provedores determinísticos. Não equivale a uma publicação integral de curso com provedores pagos reais.
- Suítes amplas: Members 2.217 aprovados, 563 ignorados de outros ambientes; Admin 981 aprovados, zero falhas na execução final r4. Cópia real Vimeo, reutilização e limpeza confirmadas.
- Build de produção do Admin e tipos do Members aprovados. Lint global aprovado. O teste de autorização que excedeu cinco segundos sob concorrência passou isolado e na repetição ampla final sem build concorrente.
- Integrar e implantar a versão exata nos dois ambientes, com migrations 0145 a 0148 e configuração já preparada.
- Conferir o palco publicado, a autenticação da equipe e a ponte `window.__gravacao` com o EdiAula. Python continua fora do suporte do palco atual; isso não altera o Estúdio real.
