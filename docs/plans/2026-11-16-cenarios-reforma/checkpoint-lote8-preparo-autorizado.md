# Lote 8.3 — Preparação autorizada da revisão

19/11/2026. Continuação da `staging` em `d25ab3981`. Este recorte conecta o preparo de exportação ao documento realmente salvo, às permissões da conta e às licenças atuais. **8.3 continua aberto** até concluir sua interface e ensaios de download; não é fechamento do lote 8.

## Implementação

`POST /members/cenarios/cenarios/:id/exportacao` recebe a revisão esperada. O Members lê o cenário por sua autorização existente, confere revisão, bibliotecas e recursos confirmados no mesmo espaço e devolve documento, fonte, digest e contexto de licenças. O papel de equipe vem do ator autenticado; suporte não recebe esse privilégio para exportar bibliotecas restritas. A revisão é conferida novamente antes da resposta para recusar edição concorrente.

O servidor não aceita documento, licenças ou papel enviados pelo cliente como fonte de autoridade. A rota tem repasse explícito no BFF e gateway, corpo limitado a 1 KiB, autenticação JWT, conta ativa e limite de 30 pedidos/minuto. O Kids segue a política já existente. A resposta do BFF é privada e não armazenável; o preparo não assina uploads nem grava cenário, campanha ou publicação.

O núcleo extrai referências visíveis sem calcular posições ou fingir alturas. Compilador e autorização reutilizam essa seleção: objetos, camadas/pastas, conjuntos fixados e suas peças internas, águas e caminhos de catálogo, texturas de aparência, solo, panorama e recursos do relevo. As alturas reais continuam obrigatórias na compilação. Bibliotecas ociosas não bloqueiam a exportação nem aparecem como recursos distribuídos.

`CenariosHost.prepararExportacao` tem implementações memória/HTTP equivalentes. O HTTP envia somente revisão e prova de perfil, propaga cancelamento e confere cenário/revisão/digest da resposta antes de atualizar seus mapas de espaço. O host de ensaio conserva arquivos de modelos por espaço, registra seu papel e mantém recursos fixados após remoção do catálogo. Uma exclusão concorrente do cenário impede entregar uma cópia já removida, com teste de regressão vermelho/verde.

## Revisão e verificações

- Autorização de conta/espaço, biblioteca restrita, suporte, revisão divergente, recurso ausente ou com papel incorreto, biblioteca ausente e edição concorrente estão cobertos nos testes do serviço.
- Contrato HTTP, limite de corpo, rotas explícitas, prova de perfil, cache privado e passagem pelo gateway/Kids estão cobertos nos testes das três fronteiras. Campos de autoria/permissão não substituem os dados do servidor.
- A suíte PostgreSQL isolada passou com **42 testes e 378 verificações**, incluindo reabertura do serviço, revisão real, licença alterada na biblioteca e modelo fixado que saiu do catálogo sem perder seus bytes referenciados. Isso valida persistência e metadados confirmados; não é um teste novo de uploads R2 remotos.
- No Bun instalado 1.3.11, uma asserção `.rejects` sobre chamadas postgres.js em conexão aquecida impediu o IO de avançar. Um reprodutor mínimo com três consultas passou em conexão fria, bloqueou após aquecimento e passou com `expect(await chamada.catch(...))`. A suíte usa essa última forma, já adotada pelos demais testes PostgreSQL; timeout não foi aumentado na verificação final e nenhuma regra de produção foi alterada para acomodar o teste.
- A tipagem do Members atingiu o heap padrão de 4 GiB tanto na base anterior isolada por leitura quanto nesta alteração. Com os **6 GiB já previstos no CI**, passou: 137,36 s, cerca de 4,16 GiB reportados pelo compilador. Não houve mudança de configuração nem supressão de erros de tipos.

[Registro dos ensaios atuais](evidencias/lote8-preparo/verificacao.json): regressão com **802 testes e 17.303 verificações**, zero falhas, cobrindo núcleo, motor, oficina, serviço/histórico/HTTP Members, BFF e gateway. Tipagem dos seis pacotes passou em sequência, com nova conferência da oficina após a última correção. Build Vite 8.3.4 aprovado; aviso conhecido de chunks acima de 500 kB permanece.

Recompilados quatro cenários no Chrome (plano/terreno com catálogo, com/sem junção), três ciclos cada, com autoria intacta, comparações visuais e provas físicas. O runtime portátil foi regenerado e conferido pela fonte canônica: SHA-256 `0a9ed85ce3544ef030d28d9847c70bda3320b0f2c69fd41ed59d6f8c2f4a7b65`. O ZIP real voltou a abrir sem sessão: 36 arquivos, 6.153.443 bytes, conteúdo extraído conferido, exploração e toque aprovados. Reabertura local em 337,9 ms, sem afirmar desempenho em aparelhos físicos.

Revisados separação entre seleção de referências e geometria, bibliotecas realmente usadas, autorização e tipos dos recursos, revisão/digest, exclusão/edição concorrentes, cancelamento, dados somente leitura e equivalência dos hosts. Nenhum cenário foi publicado nem dados de campanha foram concedidos por este recorte.

Próximo passo exclusivo: [interface completa de exportação](../../superpowers/plans/2026-11-19-cenarios-lote8-interface-exportacao.md), mantendo a identidade do Molda, guarda de revisão, medidas reais, licenças nominais, progresso/cancelamento e download válido. Raylib/Estúdio e publicação/perfil continuam em 8.4/8.5; lotes 9–10 e encerramento global ainda faltam. Implantação e validação remotas somente no encerramento global.
