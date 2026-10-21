# Continuidade versionada — Estúdio Python

Para mudar de computador, comece por [RETOMAR.md](RETOMAR.md): contém a mensagem
pronta para a nova sessão e o download remoto verificado do ZIP complementar.

Este diretório preserva os planos, arquivos preparados para testes, fixtures,
observadores e recibos selecionados das quatro worktrees em 21/10/2026.
O estado do trabalho e a ordem de retomada estão no
[relatório consolidado](../../superpowers/plans/2026-10-21-transferencia-estudio-python.md).

São **382 snapshots, 4.185.267 bytes**, com o conteúdo original conferido por
SHA-256. `inventory.json` mapeia o caminho de origem, o caminho neste diretório,
o tamanho, o hash e o papel de cada arquivo. `original-transfer-inventory.json.snapshot`
preserva o inventário original do pacote de transferência.

Os arquivos em `snapshots/` são material de continuidade histórica. O sufixo
`.snapshot` preserva os arquivos como dados, evitando que testes e operadores
antigos sejam descobertos/executados automaticamente. Seus bytes não foram
formatados, corrigidos ou atualizados para parecer atuais. Os documentos `.md`
mantêm sua extensão para facilitar a leitura. Os caminhos curtos evitam exceder
os limites de checkout do Git no Windows. Os atributos locais preservam finais
de linha e whitespace originais dos snapshots, em vez de alterar seus hashes.
As cópias de fontes já rastreadas
de branches antigas são referências; não devem substituir o código integrado.

## Retomar com segurança e sem repetir o trabalho

1. Execute `./verify.ps1` em PowerShell 7 nesta pasta. Ele apenas confere os
   hashes dos arquivos versionados; não inicia testes, serviços ou provedores.
2. Leia os planos e propostas necessários através do mapeamento no inventário.
3. Restaure apenas os arquivos da preparação que será efetivamente retomada,
   em diretório novo e revisado, removendo o sufixo `.snapshot` quando aplicável.
   Preserve o mapeamento entre a origem e a nova localização.
4. Recrie bindings, paths, pins, ferramentas, prazos e ownership para o novo
   ambiente antes de executar. A existência do script no Git não torna válido
   um comando antigo, seal ou janela de execução.
5. Não reaplique patches já integrados nem faça merge integral das branches
   Games/Lessons antigas. Siga as pendências e ressalvas dos anexos.

Há **43 arquivos somente no pacote de transferência**: payloads gerados do runtime
e dois ZIPs de projetos exportados com mídias. O inventário mantém seus hashes e
tamanhos, além do descritor da distribuição. Eles não são código-fonte novo ou
planos de implementação. Foram preservados no pacote compacto; não é necessário
versionar novamente Pyodide/WASM, stdlib comprimida ou mídias dos jogos.

O pacote também exclui 24 arquivos de ambiente/binários e dois logs. Reinstalar
ferramentas, venv e dependências pelo lock. Nenhuma cópia de `.env`, autenticação,
cookie, perfil de navegador ou banco local foi selecionada.

Este acervo não declara aceite funcional completo nem liberação de produção.
Recibos negativos continuam negativos. O relatório principal distingue CI verde,
implantação, arquivos armazenados e homologação real.
