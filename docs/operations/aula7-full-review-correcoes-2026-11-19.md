# Correções do full review da Aula 7 — 19/11/2026

Escopo: cinco achados registrados em `.audits/aula7-full-review-2026-11-19`.

## Alterações

- BUG-002: todo autor Kids passa pela identidade pública atual, inclusive perfil com UUID igual ao da conta. Perfis têm precedência; equipe é confirmada pelo diretório interno do Auth. Conta comum, perfil arquivado ou falha de identidade não recuperam o nome do snapshot.
- BUG-003: sessão infantil é classificada pelos headers autenticados na fronteira e passa `profileSession` ao emissor. O primeiro certificado exige nome completo confirmado; reemissão conserva o registro imutável.
- BUG-004: oficinas projetam apelidos inteiros atuais em participantes, mensagens antigas e autorização de mídia. A consulta ao Auth é em lote, fora da transação. UUIDs de colegas continuam redigidos. Turmas adultas e professoras preservam suas regras. O Arquipélago recebe o apelido inteiro.
- BUG-005: checkout informa mensal, anual ou `a cada N meses`, conforme a recorrência real.
- BUG-001: o conjunto já publicado e estas correções serão preservados em commits próprios para staging e main, sem integrar o trabalho paralelo do Studio. O journal de produção precisa incluir também migrations anteriores já aplicadas, que ainda faltavam no seu repositório.

## Regressões e verificação

As quatro reproduções da revisão falharam antes da correção e passaram depois. Os testes permanentes estão nos pacotes, incluindo legado com UUID igual, nome confirmado e replay, identidade pública de equipe, mensagens antigas, mudança de apelido, indisponibilidade de Auth, projeção após liberar trava e periodicidades 1/3/6/12 meses.

- Members: 2.244 aprovados, dois ignorados, zero falhas na rodada final de testes unitários/integração.
- Hub: 188 aprovados, 53 ignorados, zero falhas.
- Member-shell: 2.544 aprovados, zero falhas.
- Community: 118 aprovados, zero falhas.
- Produção isolada: 44 testes direcionados aprovados, zero falhas.
- Kids: checagem de tipos aprovada; suíte completa e builds registrados na evidência local.
- Biome: 19 arquivos da correção conferidos, sem ajustes pendentes.

A árvore principal de staging tinha erros de tipos no trabalho paralelo `studio/src/ir/symbolNames.ts` (`ReadonlySet`), além do limite padrão de memória do compilador. Não foram suprimidos erros nem incluídas mudanças do Studio neste escopo. As validações isoladas da entrega e seus limites ficam registradas no relatório de publicação.

Evidências de comandos, logs, manifestos explícitos de arquivos e verificação de releases ficam em `.cache/aula7-pendencias-20261119` (ignoradas pelo Git). Não há nova migration para os quatro ajustes funcionais, nova cobrança nem alteração de cadastro real nesta revisão.

## Fechamento da entrega em 20/11/2026

Os cinco achados estão corrigidos e publicados. Staging usa `c7e9c70a4de5ea889c1af4819283887a33add461`, aprovado na CI `44654026267`; produção usa `5440aa0ddf9180476eb59a006b375e9b394879fc`, promoção do PR #275 e da CI completa `44705588479`. As 22 implantações terminaram saudáveis, com instâncias antigas retiradas; SHA e contexto foram conferidos dentro dos onze processos de cada ambiente. A consulta final ao Railway encontrou zero divergências.

As jornadas reais com contas sintéticas passaram nos dois ambientes: presente na conta existente, replay sem reiniciar prazo, nome completo privado e apelido público, limite de um perfil, código de aparelho, entrada no Cadê, autorização/revogação de voz e emissão do certificado com nome completo. Os PDFs emitido/reemitido contêm o mesmo texto, sem o apelido. Em produção, o checkout adulto reutilizou a conta e o checkout sem gerar pagamento ou cobrança. Os quatro cursos temporários foram arquivados e as duas contas de QA bloqueadas.

Main foi integrado em staging sem força, preservando as migrations e o trabalho concorrente. A integração local teve 44 regressões e 584 testes de componentes aprovados. Uma corrida de teste do Pinta foi corrigida para aguardar a galeria após o flush do botão Voltar; a suíte completa de 19 casos, incluindo CPU 4x, passou. Os commits `392af7a88`, `9a422832d` e `00e4fbede` preservam esse histórico. Uma alteração posterior de Molda Cenários, `c831c0c5a`, cancelou a CI intermediária; seu novo pipeline `44714649731` ainda está em andamento e não é tratado como aprovado. Os oito arquivos de runtime conferidos da Aula 7 continuam idênticos nas duas fontes publicadas e na staging integrada.

A Aula 7 original continua em rascunho nos dois ambientes, com três vídeos planejados, campanha `vilao-em-aliado-cade` e presente fora dos requisitos do certificado. Geração e edição dos vídeos permanecem com o usuário; depois será necessário vincular as gravações reais e publicar pelo Admin.

Os oito depoimentos usados nos slides foram separados, sem recorte nem recompressão, em `C:/Users/tocha/Downloads/Depoimentos - Transformando o vilão em aliado`. Os arquivos têm aula/parte/ordem no nome; o LEIA-ME informa a duração e a fala após a qual inserir cada um. A extração foi conferida por SHA-256 e decodificação integral do áudio e vídeo.
