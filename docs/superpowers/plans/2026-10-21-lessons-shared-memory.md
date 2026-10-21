# Shared v3 para QA local Admin/Kids

Lote autorizado apenas de QA. R7 executou Chrome e login Admin, mas recusou Next1040,31640625MiB com Browser698,93359375MiB: soma1739,25, inferior ao pool2048 inicialmente reservado. A divisão fixa1024/1024 gerou a recusa. O novo perfil não aumenta esse total nem os prazos.

Contrato: admission version3, profileId `lessons-desktop-shared-r1`, envelope `combinedTreeMiB:2048`, browser≤1024, Nextheap768, crescimento de base128, reserva do SO512 e arredondamento128. Antes de Next continua exigido2688MiB. Antes do browser: `ceil128(max(0,2048-NextWS)+128+512)`. O browser já participa do pool; somar1024 novamente seria contar memória duas vezes. Os recursos disputam o mesmo pool e seus máximos individuais não são promessas de alocação simultânea.

O monitor valida Next+Browser≤2048, Browser≤1024, base≤128 e SOlivre≥512, com valores finitos/não negativos e ownership conhecido. Durante warmup Browser=0. O perfil explícito acompanha plan→job→context→warmup status→handoff→watcher. O hook de cache deve passar `$plan.memoryProfileId` como quinto argumento de `Watch-LessonCompactNextWarmup`; seu default histórico permanececompact-r2. O ramo de cache Next deve aceitar o novo perfil explicitamente e manter heap768/admissão2688. Nenhum cache antigo será reescrito.

Schema v1/v2 e semântica dos recibos históricos permanecem preservados. Version3 adiciona remainingCombinedTreeMiB para descrever a alocação restante; nextGrowthMiB0 nessa versão significa que não há reserva individual extra de Next. O próximo cache será derivado somente após Root integrar/revisar e confirmar novo HEAD.

Controles: R7 real reproduzido sobv2NEG e v3PASS; fronteiras de soma/cap/reserva, warmup, tipos inválidos, ownership desconhecido, SHA/frescor/admissão e propagação profile/status/handoff. Sem browser, serviços ou TSC neste lote. É um replay comparativo da política nova, sem requalificar R7, que continua NEG com cleanup/desconhecido originais preservados.

ACK/catch drain permanece intocado. O RuntimeException genérico e ownershipComplete=false de R7 impedem inferir descoberta completa; não é seguro liberar ACK com base apenas nos processos conhecidos terem saído. Root reconciliou o encerramento depois, em recibo separado. Nenhum prazo ou fallback force muda neste lote.
