# Integração do lote público b2c8 e fechamento de QA

O merge limpo preserva Pinta cf5233178 e incorpora o lote publicado b2c8d5e7b,
incluindo as mudanças de Members já implantadas por outra sessão. Nenhum trabalho
privado do diretório principal foi copiado. Os arquivos funcionais de Molda/3D
vieram do remoto; as correções próprias deste lote são de QA e suas dependências.
O Pinta conserva sua identidade visual.

## CI anterior e correções comprovadas

A CI 44781842284 falhou em três jobs. Ela permanece registrada como falha:
1. A fixture de movimento executava o inspetor real sem o fragmento real de texto
que inicializa _paintedLastFrame. A reprodução isolada falhou; carregar o fragmento
canônico, sem imitar sua variável, fez os dez contratos Node24 passarem, inclusive
o wrapper Bun. Nenhuma lógica do motor foi alterada para satisfazer a fixture.
2. Reino Zero passou a adiar a renderização da cauda fora da vista. O teste somava
somente nós no DOM e exigia mais de mil. Agora soma os nós renderizados e a contagem
real publicada pelo controlador de cauda para essa verificação de integridade.
O limite inferior continua >1000. Os tetos de DOM, tempo e bytes não aumentaram.
3. O Firefox r1555 traz a regressão upstream de foco entre documentos. Playwright
QA do Estúdio foi fixado em 1.65.1/r1572; onze entradas de lockfile não relacionadas
foram preservadas, e bun install --frozen-lockfile passou. Além disso, o despachante
Juggler envia teclas pelo textInputProcessor do quadro principal, que não representa
o documento remoto realmente focado. O caso usa W3C WebDriver para selecionar o
contexto já focado e enviar a ação nativa. Não chama focus(), não clica na prévia,
não usa dispatchEvent e não desliga o isolamento de sites.

O teste continua criando o projeto pela interface, digitando o programa no Monaco,
verificando os três documentos focados e lendo a saída do console real do Estúdio.
Repete Parar/Rodar/tecla três vezes e exige evento isTrusted em cada volta. O driver
Mozilla 0.37.1 vem do release oficial, com hash fixado e releitura do arquivo antes
de extrair; tem prazo total, comandos limitados e encerramento da sessão/processo.
Não há navegador autenticado nessa fixture. O executável não entra no repositório.

Referências primárias: [regressão de foco](https://github.com/microsoft/playwright/issues/43506),
[teste/correção upstream](https://github.com/microsoft/playwright/pull/43720),
[despacho Juggler](https://github.com/microsoft/playwright/blob/v1.65.1/browser_patches/firefox/juggler/content/PageAgent.js),
[driver Mozilla](https://github.com/mozilla/geckodriver/releases/tag/v0.37.1).

## Verificações e limites

As tentativas ficam separadas: a primeira checagem integrada encontrou somente a
ordem de imports de um teste novo do remoto; o ajuste foi seguido por nova checagem
global. Os seis gates finais precisam passar antes de criar esta pasta. Os logs
registram 640 testes de componentes, 12 de integração, 36 de diagnóstico, 32 do BFF
e cinco de Members. A suíte Firefox passou nos 14 casos; a versão final mais estrita
do caso nativo foi repetida com saída própria para conservar o relatório JSON.
O caso de startup que ficou intermitente na CI passou nas três repetições locais.
Essas execuções não são somadas em um total fictício nem apagam as falhas anteriores.

A imagem Linux do perfil db27 passou no fluxo 44781914334, fonte cf5233178.
O download, SHA-256, image ID, digest de manifesto e leitura no registry de staging
foram conferidos. Armazenar a imagem não é implantá-la. Worker ativo, política,
seletor Python e gravador não foram ativados por esta prova. A única diferença
no escopo do runtime em relação à imagem é a fixture de teste, fora dos COPY do
Dockerfile; a compatibilidade funcional do candidato deve ser conferida de novo
antes da implantação. Ainda são necessárias nova CI geral e homologação hospedada.

Os navegadores rodaram nesta máquina Windows. Firefox aqui significa o binário
fornecido pelo Playwright, conduzido por Juggler ou pelo WebDriver conforme o caso;
não se afirma validação manual do Firefox de distribuição nem teclado físico,
celular real, participante infantil ou qualquer publicação em produção.
