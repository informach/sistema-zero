# Leitor final: integração de a674 e política de rollback

Os três commits publicados após 39fc alteram três arquivos de QA e o contrato
de nomes. A resolução conserva o callback readonly corretamente tipado e a
regressão em ES2022/ESNext. O código de produção emitido por TypeScript e Bun
é exatamente igual ao leitor 598824bd1 qualificado no Linux.

Passaram os 11 controles congelados: símbolos, perfil, dois SDKs, política,
igualdade completa do guest Python e do executável Worker, tipos completos do
Estúdio/Members, três ensaios Chromium do Pro e Biome. O runtime mantém o SHA
670c8c32… e o perfil da629a58…. Os 126 arquivos Windows continuam iguais ao
5667348a…, cuja equivalência lógica ao guest Linux f7c60430… foi comprovada.
Isso permite conservar a imagem qualificada da fonte 598, sem alterar seu rótulo.

As medições do Pro usam serviços controlados e um projeto modular de 60 arquivos.
Não comprovam desempenho do editor de mapas do Pinta. O benchmark local executou
a árvore congelada do merge ainda não commitado; o SHA 598 do artefato identifica
seu pai, e fontes.json registra os cinco arquivos efetivamente testados.
Os dois artefatos gerados em .audits foram arquivados aqui; o arquivo publicado
foi restaurado byte a byte e o novo arquivo temporário removido após comparação,
para preservar a auditoria de outra frente. Nenhuma alteração ocorreu no main.

A política de rollback 12220f13… está incluída no leitor com escrita ainda 4.
Seu carregamento canônico e a distribuição inativa constam no diretório irmão
leitor-linux-598-2026-11-21. Antes de qualquer ativação, faltam a CI geral desta
revisão final e o rollout coordenado em staging. Depois vêm homologação da Vila,
gravador 6, conflitos reais e rollback. A missão integral continua em andamento.

Não há mudança de estilo visual, fonte funcional privada 3D, produção ou PR.
Relatórios foram formatados sem alterar seus dados; hashes.json identifica as cópias.
