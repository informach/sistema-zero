# Full review: paridade técnica da comunidade adulta

Revisão concluída em 18/10/2026. Implementação local da proposta técnica, sem publicação ou alterações de dados remotos. Base sincronizada inicialmente em `61a106ec0`; avanços concorrentes até `660e91ecb` preservados. Alterações paralelas do Molda não foram revertidas nem incorporadas artificialmente ao escopo adulto.

## Resultado

Não foram encontradas regressões Kids nas verificações executadas. Os dois builds de produção passaram. O adulto usa a própria conta como aluno, sem criar criança fictícia. Identidade, armazenamento, direitos e progressão têm contratos explícitos por público; apresentação e operação específicas permanecem nos aplicativos.

| Verificação final | Resultado |
| --- | --- |
| CI Biome da raiz | Exit 0, 9.297 arquivos; 12 avisos e 159 informações, sem erros |
| Arquivos alterados da implementação | 456 arquivos verificados sem erro no checkpoint, seguidos de CI integral aprovado |
| Build community | Exit 0 |
| Build community-kids | Exit 0 |
| Typecheck members / Admin / member-shell | Exit 0 em cada pacote |
| Suíte completa Kids | 1.423 passaram, 0 falharam, 8.541 asserts |
| Suíte completa member-shell | 1.460 passaram, 0 falharam, 8.503 asserts |
| Members unitários + integração | 1.326 passaram, 0 falharam, 10.464 asserts |
| Hub unitários + integração | 153 passaram, 0 falharam, 555 asserts |
| Admin completo | 614 passaram, 0 falharam, 2.043 asserts |
| Gateway, configuração real | 42 passaram, 0 falharam, 201 asserts |
| Browser integrado adulto e compatibilidade familiar | 6 passaram, 0 falharam |
| Browser Kids existente | 16 passaram, 0 falharam |
| PostgreSQL: ledger e builder | 22 passaram, 111 asserts; builder repetido após ajustar executor: 13 passaram |
| PostgreSQL: benefícios de oficina | 1 passou, 7 asserts |
| Pensa nativo, migrações e concorrência | 24 passaram, 0 falharam, 167 asserts; escopo selecionado sem o preflight que depende de ferramentas ausentes |
| Assets do avatar | 182 arquivos idênticos entre os aplicativos, sem extras |

O teste de manutenção completa do Pensa exige `pg_dump` e `pg_restore`, ausentes da distribuição PostgreSQL embarcada desta máquina. A tentativa integral anterior registrou 24 passagens e uma falha de ambiente nesse preflight. A repetição final executou explicitamente os demais oito arquivos, incluindo o fluxo adulto e migrações. Não classificar esse preflight como aprovado. Ele pertence à operação específica de cutover/rollback do Pensa, não ao uso cotidiano dos novos recursos adultos.

## Reaproveitamento e limites de responsabilidade

**84 arquivos alterados do Kids viraram adaptadores/reexports finos**, deslocando **17.012 linhas** de implementação para o núcleo compartilhado. Isso é transferência de responsabilidade, não uma segunda cópia do aplicativo.

- `core`: contratos de público, identidade, direitos e jornada adulta.
- `members`: regras de negócio e persistência por público; serviços comuns com repositórios/configuração próprios onde necessário.
- `hub`: autorização de destino, publicação, moderação e integração com direitos adultos.
- `member-shell`: BFF, hosts dos editores, sincronização, bibliotecas, player público, avatar e ambiente pessoal.
- `community` e `community-kids`: composição, navegação, texto e apresentação próprios. O adulto não importa componentes do aplicativo Kids.
- Pacotes Estúdio, Pinta, Molda e Pensa continuam responsáveis por seus editores e persistência interna.

Separar tabelas adultas de preferências, tutoriais, desafios e fences protege dados, slugs e índices Kids existentes. Não são implementações paralelas dos mesmos serviços. Assets estáticos são servidos na origem de cada aplicativo; renderers e catálogos são compartilhados.

## Pontos corrigidos no review

1. Identidade HTTP adulta centralizada: perfil infantil e sessão parental Kids não podem selecionar dados adultos, mesmo quando a conta é a mesma ou há bypass de equipe.
2. Queries, chaves R2, bibliotecas locais, caches e recompensas segregados por público. Identidade de armazenamento local não substitui o ID HTTP real.
3. Versões antigas do backend são verificadas por leitura antes de mutações adultas de nuvem, execução de IA e builder. Ausência de suporte não vira fallback Kids.
4. Execuções pagas, histórico e exclusão do builder são separados; orçamento financeiro continua por conta. Callback adulto depende de endpoint adulto configurado e nunca usa o Kids como alternativa.
5. Perfil público e voz são escolhas revogáveis do próprio adulto; snapshots antigos não reativam nomes/perfis privados. Preferência de voz é relida em cada pedido.
6. Provas de oficina incluem público e revisão. Vaga adulta não concede perfis infantis nem mural Kids. Acesso à ferramenta da aula não exige compra livre adicional.
7. Recebimento repetido de pagamento não duplica direitos; cancelamento adulto preserva a licença Kids preexistente. Compra não concede capacidade avançada.
8. Feedback de gamificação não desmonta editores; atualização de totais permanece autoritativa. Nomes e textos adultos não entram na guarda de vocabulário Kids.
9. Testes mobile Kids aguardam o sinal público de player pronto antes de medir/marcar o iframe. A tela de carregamento é substituída por projeto compilado; as verificações de tamanho e continuidade da partida foram preservadas e passaram.
10. Launcher local corrige links de diretório inválidos emitidos pelo tracing standalone no Windows, somente na cópia descartável de QA. Não modifica links ou ambientes-fonte.

## O que foi exercitado no navegador

Login real com conta sintética que também possui criança, entrada adulta sem seletor familiar, progresso persistido, ferramentas básicas disponíveis e Pensa avançado bloqueado; edição/revogação de perfil público; galerias Estúdio/Pinta/Molda; criação, recarga e retomada de jogo com Blockly; projeto presente somente na biblioteca adulta; avatar realmente desenhado no WebGL com assets da origem adulta e ambiente 3D; área parental Kids preservada e token parental real recusado pelo gateway/backend adulto.

Os testes mobile Kids conservam o harness existente de projetos instrumentados: controles, rotação, proporção, teclado, continuidade da partida, pad próprio e tela cheia. Esses projetos são fixtures, não publicações reais no R2.

## Pendências operacionais antes da venda

- Publicar conteúdo e configurar política de jornada, referências adultas de oferta, espaço/canais e permissões da Mostra.
- Aplicar migrations 0130–0134 e implantar serviços/gateway antes de ativar o aplicativo adulto. Drenar versões antigas antes de aceitar gravações adultas.
- Validar upload/download R2 e checkout/pagamento/entrega/revogação em homologação com a configuração real. O teste de webhook usa catálogo de fixture e não cobra dinheiro.
- Configurar runtime, callback e limites de IA quando houver formação avançada. Voz depende também da opção individual.
- A venda automática de vagas ao vivo continua uma integração específica de reserva, lotação, pagamento, estorno e grants. O fluxo existente de vagas é manual; a proposta pedia essa auditoria, não autoriza tratar o fluxo manual como checkout automático.

Não reverter members para versão que desconhece público depois de gravar dados adultos. Retirar primeiro o app adulto e conservar backend/schema compatíveis. O detalhamento de direitos, rollout, QA local e operação está em `2026-10-18-comunidade-adulta-operacao.md`.

Os logs detalhados e artefatos visuais locais estão em `.cache/adult-full-review-*` e nas pastas Playwright ignoradas dos aplicativos. Nenhum segredo de produção é necessário para reproduzir o harness isolado.

## Conciliação remota e publicação

A rodada posterior integrou `origin/staging` em `88981ff91`, corrigiu o isolamento de curso adulto contra perfil Kids no serviço central e validou novamente os três builds, Members e os navegadores. O usuário autorizou commit e push de todas as alterações locais, incluindo recortes do Molda. Relatório e evidências atualizados: [conciliação e full review](2026-10-18-comunidade-adulta-conciliacao-full-review.md).
