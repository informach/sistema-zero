# Provas do fechamento de mapas no Estúdio

Ensaios nesta máquina, com Chromium headless. O harness usa `PintaClient`, `StudioEditor`,
o adapter de biblioteca e os bancos reais do produto, em um perfil UUID sintético.
As requisições `/api/` são abortadas: isso prova o caminho local/offline, não login ou nuvem.
O projeto vazio é produzido pela factory pública e os snapshots vêm dos callbacks públicos
do editor. A volta de foco é emitida explicitamente, pois o Chromium headless mantém as
duas páginas focadas.

- [Pinta completo](pinta-suite.log): 2.080 aprovados, nenhuma falha; três provas Pygame
  opcionais omitidas nesse comando, 176 arquivos, 18.995 asserções, 169,17 s.
- Tipos [do Pinta](pinta-typecheck.log) e [completos do Estúdio](studio-typecheck.json):
  aprovados. O tipo completo e os cinco ensaios do navegador foram repetidos após integrar
  a staging `2ab6ff947`, preservando os 43 arquivos locais por SHA-256. A instalação pelo
  [lockfile congelado](install.log) confirmou que as dependências continuavam iguais.
- [Navegador](browser.log), [relatório](browser.json): cinco aprovados. Jogo estruturado e
  atualização sem perder programa ou layout; atualização pelas peças; importação da Vila com
  Cabana; importação de documento nativo 6 autocontido com animação e peças de 48 px; falha
  de quota síncrona no segundo `put`, conservando biblioteca, projeto e marcador de mudança.
- [Estúdio](studio-tests.log): 23 testes aprovados em cinco arquivos; os wrappers também
  executam 22 casos de biblioteca pessoal e 50 da janela de importação em processos isolados.
- [Ciclo de vida do host](host-ownership.log): wrappers aprovados com 31 casos de importação
  e seis da ponte, incluindo cancelamento e troca de perfil durante operações pendentes.
- [Host infantil](kids-host.log): sete aprovados; envio, reemissão, erro de biblioteca e
  isolamento dos perfis infantil e adulto.
- [Autoridade offline](authority.log), [relatório](authority.json): sete aprovados em 14,3 s;
  clipboard 2, leitor nativo 5 diante do 6, reprodução 026 com RAM antiga real, abas atuais,
  lápide, falha no segundo put, recuperação no editor e captura com 500 sprites.
- [Galeria Python Monsters](python-monsters-check.log): 66 desenhos e 70 documentos conferidos
  pelo gerador em modo `--check`, sem mudança das artes após retirar operadores de vírgula.
  [Perfil do runtime](profile-check.log): aprovado.
- [Guardas do projeto](project-guards.log): 15 aprovados, incluindo recusa quando a leitura
  remove uma cena 2, orçamento e abort transacional. A [inspeção do código publicado](published-reader-inspection.json)
  confirmou que o Estúdio ativo de staging ainda não declara a cena, mas seu guard de
  conservação é byte a byte igual ao guard testado, após normalizar LF. A validação publicada
  chama esse guard. Isso é inspeção do código histórico e ensaio do guard; não é um ensaio
  completo do build histórico do Estúdio no navegador.

## Regressões reproduzidas antes da correção

O [ensaio de layout sem a correção](layout-red.log) recoloca apenas o refresh incondicional
das miniaturas. Falha na igualdade de `blocksState`: uma pilha muda suas coordenadas quando
o mapa é atualizado. O arquivo corrigido foi restaurado e conferido por SHA-256 antes da
execução positiva, sem retirar a comparação de posições ou IDs.

O [ensaio de gravação parcial](atomic-red.log) recoloca apenas `idb-keyval.setMany` no lote.
O navegador lança `QuotaExceededError` no segundo `put`. A promessa falha, mas a primeira chave
vai ao disco por auto-commit; o teste encontra `asset:<id>` quando deveria encontrar zero.
Com o escritor transacional existente do Estúdio, a mesma falha aborta a primeira gravação,
e o teste passa. Não foi simulada uma resposta de sucesso do banco.

As imagens mostram dados sintéticos da homologação. Não são capturas da conta fornecida
pelo usuário. Este lote não repete provas em motores externos: não alterou seus adaptadores;
as provas nativas anteriores estão nas pastas `recursos` e `referencias`.
