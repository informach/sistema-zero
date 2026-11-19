> Registro histórico: a solução intermediária de dois pins abaixo foi substituída em ec060ad92. Por decisão do responsável, os exemplos e executores 3D usam uma única versão atual. Consulte `2026-11-19-studio-three-single-version.md`.

# Three clássico no verificador hospedado

## Regressão da integração

O run `44527819277`, revisão `5e7e09cd4`, reprovou em `three-objectives-smoke.ts`: o documento atual importava Three 0.184.0, enquanto o executor offline só fornecia 0.180.0. A rede permaneceu bloqueada, e o jogo terminou com `SZGame3D is not defined`. Não era um objetivo de movimento incorreto.

Um teste direto do resolvedor da imagem reproduziu a falta: o pedido `https://esm.sh/three@0.184.0` retornava `undefined`; 0.180.0 continuava disponível. O log vermelho está em `packages/studio/.cache/mission/three-pin-red.txt`.

## Correção e compatibilidade

A imagem mantém `three@0.180.0` como dependência anterior e acrescenta um alias interno exato `three-studio = npm:three@0.184.0`, com lock e integridade npm. O resolvedor seleciona somente esses pinos instalados, verificando o nome/versão do pacote antes de servir seus arquivos. Não consulta a rede, não instala bibliotecas por pedido e não admite outra origem ou versão.

Os dois resolvedores compartilham os tetos anteriores de **256 módulos / 32 MiB retidos**, com **4 MiB por arquivo**. Não se concedem 32 MiB adicionais por versão. Caminhos escapados, symlinks, credenciais, arquivos não JS e consultas inesperadas continuam recusados. Projetos 2D não resolvem os pacotes Three. O perfil canônico da imagem foi regenerado e conferido.

Não foram reescritas dependências de projetos nem o pino antigo dos kits Pro. O alias é um recurso interno da verificação clássica; esta correção não amplia a lista pública de dependências do compilador Pro. Projetos novos de cena convertidos com Three 0.184 ainda exigem qualificação separada de seu build Pro hospedado; executar a conversão unitária não comprova esse build.

## Verificação

- Pacotes reais instalados pelo lock; testes conferem o atendimento de 0.180.0 e 0.184.0 e a recusa de 0.181.0.
- Casos de quantidade/bytes demonstram que as duas versões compartilham os mesmos limites.
- Resolvedor, pedidos de verificação, capacidades e grafo de dependências: **33 testes / 401 asserções**, aprovados em 34,90 s. Inclui `npm ci` e `npm ls` independentes sem mudar o lock exportado.
- A primeira repetição do teste npm foi inválida por ENOSPC durante a preparação independente do laboratório Linux. Após liberar espaço, a repetição acima passou. O erro anterior está preservado no log e não foi tratado como regressão da dependência.
- Typecheck do serviço e dos testes aprovado; Biome aprovado; geração canônica `--check` aprovada; auditoria do lock da imagem: **zero vulnerabilidades reportadas**.

A reconstrução da imagem e a prova completa dos objetivos Three precisam rodar na revisão corrigida no GitHub. O Docker local retornou 500 e não foi reiniciado globalmente. Não há deploy nem aprovação da missão global neste relatório.
