# Lote 8.5 — Publicação pela oficina e leitura autorizada

19/11/2026 · staging · continuação da base `874b23afd`.

**O 8.5 continua aberto.** Este recorte implementa e verifica rotas, hosts e confirmação na oficina. A leitura autorizada está disponível no BFF; o consumidor nativo do Arquipélago e a prova com o personagem real no `/macro` ainda faltam. Não houve implantação nem abertura a membros.

## Implementação

- Members expõe preparo, reserva e consulta da versão para a equipe. Confirmação e leitura publicada usam rotas internas exclusivas do `member-shell`. O gateway permite somente os caminhos e métodos declarados. O navegador não afirma recebimento de arquivos nem escolhe autor/espaço.
- O BFF autoriza a revisão antes de ler o armazenamento, confere o manifesto para reservar recursos e confere também o conteúdo real do pacote antes de confirmar. Reutiliza upload imutável e cota existentes. Transporta os bytes UTF-8 sem perder BOM. Resposta com outra revisão, manifesto, versão ou destino é recusada.
- A leitura do jogador passa primeiro por `/arquipelago/acesso`, inclusive quando a oficina está fechada. Só depois consulta o perfil publicado ou um arquivo vinculado à publicação. Não consulta bibliotecas privadas. Sessão ausente, troca de perfil, acesso negado, perfil desconhecido e chave/digest/MIME divergentes não recebem links de arquivo.
- Hosts HTTP e de memória usam o mesmo contrato. O ensaio local mantém publicações separadas de contas reais, permite somente fontes do espaço da equipe e preserva recursos publicados após apagar a fonte. O repositório SQL consulta um recurso pelo índice de publicação/hash, sem listar o inventário inteiro a cada arquivo.
- A interface existente de exportação oferece **Publicar no Arquipélago** para fontes guardadas da equipe. Mostra revisão → ilha → nova versão, informa qual versão será substituída e exige a confirmação dessa ação concreta. Usa os botões, tipografia, tokens e temas do Molda.
- Compilação e publicação reaproveitam a fila, o cancelamento e o compilador existentes. Mudança de destino cancela a operação e limpa o aceite; revisão alterada exige reabrir; conflito de publicação exige conferir a versão corrente; nova tentativa após resposta perdida conserva a operação, evitando publicação duplicada.
- Os dados de proveniência/licenças são conferidos pela mesma função pura no núcleo, com tradução para erro de domínio no Members. Identificadores genéricos continuam válidos no núcleo/ensaio; a persistência e as rotas Members exigem UUID.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| Núcleo completo, `bun test` | 362 testes; 10.660 verificações |
| Oficina completa, `bun test` | 126 testes; 841 verificações |
| Serviço e HTTP Members, três arquivos | 36 testes; 231 verificações |
| Publicação/leitura/regressão BFF, três arquivos | 40 testes; 220 verificações |
| PostgreSQL real, publicação e leitura por hash | 8 testes; 31 verificações |
| Gateway, rotas e políticas | 6 testes; 327 verificações |
| Tipagem completa do núcleo | Aprovada |
| Tipagem completa da oficina | Aprovada |
| Tipagem focada Members, serviço/repositório/rotas/testes | Aprovada |
| Tipagem focada BFF com configuração do pacote e TypeScript 5.9.3 instalado | Aprovada |
| Navegador: publicação com arte, terreno e água reais | Desktop 1440×900 claro e viewport 390×844 escuro; sem erros de página |
| Navegador: regressão da exportação anterior | ZIP/GLB, licença, autoria, foco, cancelamento e descarte conferidos |

O fluxo do navegador comprovou: botão bloqueado sem confirmação; sete ilhas disponíveis; troca de ilha limpa o aceite; interrupção não publica; resposta perdida retorna a mesma versão; publicação concorrente pede nova conferência; atualização do destino limpa o aceite; versão seguinte é publicada; alteração da fonte aberta impede nova publicação. São ensaios de navegador desktop, incluindo emulação de viewport/toque; não representam aprovação em aparelho físico, animação ou arte final.

Capturas: [confirmação clara](evidencias/lote8-publicacao/1440-light-confirmacao.png), [resultado claro](evidencias/lote8-publicacao/1440-light-publicado.png), [confirmação escura estreita](evidencias/lote8-publicacao/390-dark-confirmacao.png), [resultado escuro estreito](evidencias/lote8-publicacao/390-dark-publicado.png). [Resultados do ensaio](evidencias/lote8-publicacao/resultado.json). Vídeos: [desktop](evidencias/lote8-publicacao/1440-light-fluxo.webm), [viewport estreito](evidencias/lote8-publicacao/390-dark-fluxo.webm).

Reprodução do ensaio de interface: iniciar `bun run dev:oficina` no pacote e executar `node playground/oficina/verificar-publicacao-oficina.mjs`. Reutiliza a fixture local de compilação, com binários do acervo fora do Git. A fixture agora aceita espaço de ensaio; o padrão pessoal dos ensaios anteriores permanece.

Os logs detalhados ficam em `output/cenarios-reforma/lote8-raylib/publicacao-*.log`. A prova de banco usa somente o banco local descartável `cenarios_publicacoes85`, com credenciais injetadas no processo sem impressão. Duas execuções falharam no hook de preparação do schema por timeout, antes dos testes. Uma sonda isolada executou os mesmos 97 comandos DDL em 608 ms (autocommit) e 552 ms (transação). A execução instrumentada passou; retirados os logs temporários, os oito testes passaram novamente em 4,16 s com o limite original. A causa da intermitência de preparação não foi estabelecida; nenhum aumento de timeout ou mudança no SQL de produção foi mantido.

## Revisão deste recorte e limites

Revisados contratos de identidade, fonte e proveniência, ordenação de autorização/conferência, repetição, CAS, namespaces de arquivos, limite exclusivo dos envelopes internos, leitura por índice, cancelamento e ciclo de recursos da interface. A inspeção visual confirmou os dois temas e ausência de transbordamento nos dois layouts. O CSS novo foi colocado nas regras carregadas pela oficina, sem acrescentar estilos à interface antiga.

Ainda necessários para fechar 8.5: perfil de propriedades do jogo; carregamento canônico com troca segura da composição, física Rapier e personagem nativos; leitura/câmera/nado/retomada/recarga e versão 1→2 no `/macro`; regressão e builds integrados. A tipagem global Members/BFF não está aprovada por substituição pelos checks focados. O fechamento 8.6, lotes 9–10, composição final da Faísca, full review, CI, implantação e validação real de staging permanecem posteriores.
