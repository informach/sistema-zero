# Pensa v2 — segunda revisão completa

Revisão de 14/10/2026, solicitada após a primeira revisão. Escopo: implementação do Pensa v2 e suas integrações, incluindo as nove correções da [rodada anterior](architectural-analysis-2026-10-14-pensa-v2.md). O trabalho concorrente de aulas, Molda, oficinas ao vivo e marketing não foi revertido nem incluído como entrega desta revisão.

**Resultado: quatro novos problemas reproduzidos e corrigidos.** O mais importante era a interação entre restauração do Pensa e resolução de conflitos da nuvem do Estúdio. Os outros afetavam navegação, cancelamento de áudio e encaminhamento à próxima missão.

## Achados desta rodada

### R2-01 — Alta: um upload pendente podia desfazer a restauração escolhida

**Caminho:** Pensa restaura uma versão; o aparelho ainda tem uma edição pendente do mesmo jogo; `pullMissing()` esvazia a fila antes da descida. O tratamento genérico de base vencida copiava o jogo remoto para outro ID e promovia a base local para subir novamente. Assim, o arquivo ligado ao guia restaurado podia voltar a conter o jogo anterior, embora ambas as versões sobrevivessem em arquivos distintos. A proteção de abertura adicionada na primeira revisão não cobria esse caminho.

**Correção:** `studio-cloud.ts:443` impede a promoção automática de uma base vencida dos IDs de jogo do Pensa. A fila apresenta uma orientação para sair do editor e reabrir. A reconciliação existente, com o editor fechado, preserva a edição local como cópia e restaura a versão remota no ID associado ao plano. Após confirmar a revisão, reavalia o produtor e limpa o erro da fila sem reenviar um conteúdo que já está sincronizado. O comportamento dos jogos comuns permanece coberto pelos testes existentes.

**Evidência:** teste de adaptador reproduziu a promoção indevida antes da correção. Agora verifica base preservada durante o conflito, nenhum restauro enquanto o jogo está aberto, cópia do rascunho ao fechar, versão restaurada no ID correto e produtor sem upload quando tudo já está sincronizado. Teste da fila confirma a orientação, ausência de PUT e revisão remota intacta.

**Implicação de uso:** conflitos desses arquivos exigem fechar e reabrir o editor. A regra também alcança arquivos legados com o mesmo padrão de ID do Pensa; isso preserva o vínculo estável com o plano.

### R2-02 — Média: conclusão tardia de uma ação podia interromper outro jogo

**Caminho:** arquivar o jogo A → voltar à lista → abrir B → chegar a resposta do arquivamento. O callback chamava `home()` e fechava B. A primeira correção filtrava a aplicação dos dados, mas não todos os efeitos posteriores da ação.

**Correção:** `JourneyApp.tsx:199` fornece uma verificação da visita atual para os efeitos assíncronos. Arquivar/excluir só navegam na visita original; revisar/ajustar só abrem a conversa correspondente; retorno de teste/restauração não limpa campos de outra visita. Leituras de projetos já abandonados não iniciam uma nova sequência capaz de invalidar a leitura atual. Erros de lista/polling também respeitam o descarte da visita. O polling evita requisições sobrepostas e continua consultando a jornada mesmo quando a tentativa de retomar o worker falha.

**Evidência:** teste reproduziu o fechamento de B com uma resposta de arquivamento deliberadamente atrasada. Após a correção, B permanece aberto e disponível. Os cenários anteriores de resposta atrasada, troca de perfil, rascunho e reenvio continuam aprovados. A verificação específica do novo teste cobre arquivamento; exclusão e foco compartilham a mesma cerca de visita, conferida no código.

### R2-03 — Média: cancelar a voz podia voltar a indicar reprodução

**Caminho:** o áudio já foi recebido, `audio.play()` ainda está pendente e a criança cancela. A resolução posterior de `play()` recolocava o botão em “Parar”, mesmo com o áudio pausado. A retomada por segundo gesto também não conferia se ainda pertencia à solicitação atual.

**Correção:** `private-zappy-voice.tsx` invalida o controlador ao parar e verifica solicitação/foco antes de iniciar a chamada, aplicar o áudio e atualizar a reprodução após `play()`. O caminho de segundo gesto continua chamando `play()` dentro do gesto, sem buscar novamente o áudio preparado.

**Evidência:** teste controla a promessa de `play()`, cancela e depois a resolve. Antes falhava; agora o áudio continua pausado e o botão volta a “Ouvir”. Os testes de resposta tardia, foco de outra mídia e troca de perfil continuam aprovados.

### R2-04 — Média: “próxima missão” ignorava o estado atual do plano

**Caminho:** o editor estava aberto e, em outra tela, a jornada era pausada, arquivada ou mudava para observação/encerramento. O encaminhamento consultava a próxima tarefa sem conferir o estado da jornada. Também aceitava um ID de tarefa ausente do recorte ativo.

**Correção:** `pensa-next-mission.ts` só abre outra ferramenta quando o plano está ativo, em construção e sem pausa, e a tarefa pertence às missões atuais. Nos outros estados retorna ao Pensa, onde a criança pode retomar, testar ou escolher o próximo passo.

**Evidência:** seis testes novos cobrem pausa, arquivamento, observação, preparação, encerramento, tarefa fora do recorte e encaminhamento válido ao Pinta. Os seis falharam antes da correção e passaram depois.

## Cobertura da revisão

Além dos cenários novos, foram conferidos os contratos e as fronteiras entre interface, BFF, worker e persistência: autorização por perfil/conta, separação JWT/HMAC, acesso real às ferramentas, catálogo por dimensão, publicação de planos, reservas e débitos, leases, voz privada, proteção de arquivos, restauração de evidências, encerramento, incrementos e exclusão. Testes no Postgres local exercitaram concorrência, publicação atômica, quota compartilhada, restauração, reparos, tentativas de narração e limpeza.

As decisões de produto permanecem coerentes com a proposta: criança constrói; Zappy organiza e orienta; primeiro resultado reduzido com incrementos; analogia ZERO; OpenRouter no planejamento/transcrição; ElevenLabs na escuta opcional; conhecimento oficial e recursos efetivamente liberados; guias v2 sem exigir marcar cada instrução. A revisão não acrescentou geração automática do jogo.

Os tokens e fontes compartilhados continuam sendo usados. Testes verificam componentes, estados e guias; não substituem observação visual renderizada nem avaliação de compreensão por crianças.

## Verificações desta rodada

Testes distintos executados novamente nesta revisão, sem contar repetições:

| Suíte | Aprovados |
| --- | ---: |
| Core / contrato Pensa | 7 |
| Pensa completo | 105 |
| Member-shell: planejamento, contexto, permissões, voz, proteção e legado | 172 |
| Comunidade Kids: guias, handoff, voz, retomada, sincronização e fila de criações | 149 |
| Members: Postgres e rotas | 26 |
| Estúdio: guia, persistência e exemplos | 34 |
| Pinta: galeria, guia e salvamento | 40 |
| Gateway: configuração e rotas | 61 |
| **Total** | **594** |

É uma seleção ampliada das suítes relacionadas, não a suíte inteira do monorepo. OpenRouter, ElevenLabs e R2 são simulados nesses testes; o Postgres é local real. A diferença em relação aos 532 da primeira rodada inclui a suíte da fila de criações e novos casos de regressão.

Biome passou nos dez arquivos de código/teste modificados nesta rodada; `git diff --check` passou nos caminhos verificados. Typechecks de **core, Pensa, members e member-shell** aprovados. O **build completo da Comunidade Kids** (`bun run build`) terminou com saída 0: compilação em 42 s, TypeScript em 49 s e geração das 73 páginas. Foi executado após as correções finais de código.

Comandos de teste: mesmos grupos da primeira revisão, acrescidos de `tests/pensa-next-mission.test.ts` e `tests/creations-cloud.test.ts` em community-kids. A execução final desse pacote aprovou 149 testes em 12 arquivos. O primeiro teste da fila precisou aguardar `confirm()` para observar a conclusão do tratamento assíncrono de conflito; a correção foi no teste, e a execução completa passou depois.

## Limites e próximos critérios de liberação

- O navegador integrado foi consultado novamente e retornou `[]`. Inspeção visual, teclado real, dispositivos móveis e leitores de tela continuam pendentes.
- Não foram feitas chamadas pagas nem execução com R2 real. O percurso completo com OpenRouter/ElevenLabs e proteção/restauração no armazenamento do piloto ainda precisa ser exercitado.
- Catálogo autorizado e revisão por modelo não provam executabilidade de toda combinação de mecânicas. Os jogos de referência e a avaliação dos guias com crianças continuam necessários antes da liberação.
- Permanecem os limites operacionais registrados na entrega: retomada do worker por visita/polling, flag por ambiente, ausência de expiração automática dos blobs de voz do tutor e consumo do limite por checkpoints cuja cópia falhou até a exclusão do plano.
- A tela e o repositório ainda concentram muitas responsabilidades. Não foi feita uma reorganização ampla durante a correção. O helper `nextPensaMission` permanece fora do caminho real de seleção do servidor, como registrado na primeira revisão.

Nenhuma migração remota, publicação ou ativação de flags foi feita nesta rodada. O relatório anterior foi preservado como histórico; esta rodada complementa seus resultados e corrige as lacunas descritas acima.
