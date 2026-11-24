# Seleção da escrita verificada de paletas

As páginas autenticadas de Community e Kids, incluindo o Arquipélago, resolvem a identidade do aluno no servidor. O Pinta e a biblioteca de paletas compartilhada no editor de modelos recebem o mesmo escopo. O Estúdio consome os desenhos do Pinta. A biblioteca pessoal fica desabilitada nos blocos de aula.

O build precisa conter `NEXT_PUBLIC_PINTA_CAUSAL_CLIENT_V1=1`. No BFF, a opção exclusiva de paletas é `PINTA_PALETTE_WRITE_CANDIDATE=1`. Ela requer HMAC, storage privado e coincidência exata de audiência, conta e perfil em `PINTA_CAUSAL_QA_PROFILES`. A conta ou o perfil precisa estar ativo. A sessão de responsável e a impersonação somente leitura ficam fora. A configuração do Members também precisa aceitar o candidato e o perfil. O portão da galeria causal é independente.

O cliente selecionado pede `paletteWrite=palette-cas-v1` ao ler o item reservado. Só um cabeçote retornado pela autoridade pode qualificar sua geração e revisão. O BFF confere novamente a sessão do documento e o perfil. O primeiro commit selado publica a geração e o recibo. Repetir o mesmo nonce vigente recupera esse recibo mesmo depois de vencer o ticket de upload. A troca de conta libera a fila da sessão anterior. Na ponte do editor de modelos, a troca de política renova apenas a biblioteca do Pinta.

A configuração padrão segue no protocolo individual. Se a conta já adotou a escrita verificada, desligar a opção mantém o documento no IndexedDB, o envio pendente e a cerca no banco. O usuário pode continuar editando localmente. Reabilitar a opção permite retomar o nonce ou ler o estado da conta e reconciliar. A purga solicitada da conta mantém o fluxo normal de eliminação de dados. As opções e a lista precisam ser definidas separadamente no ambiente de QA.

## Verificação

Em `packages/member-shell`, execute `bun --no-env-file test tests/pinta-palette-session.test.ts tests/pinta-studio-bridge.test.ts tests/pinta-palette-writes.test.ts`. Os processos isolados cobrem opção desabilitada, armazenamento ausente, sessão inválida, igualdade de audiência/conta/perfil e descarte da fila ao trocar de identidade.

Em `packages/community-kids`, execute `bun --no-env-file test tests/molda-client.test.tsx tests/pinta-palette-writer.test.ts`. O ensaio de montagem abre o adaptador compartilhado, observa a leitura negociada, desliga a política no mesmo perfil e salva uma nova paleta no disco sem remontar o editor. O ensaio do transporte confere a forma do 404 e do ACK, o nonce, a geração, a revisão e a recuperação da escrita pendente.
