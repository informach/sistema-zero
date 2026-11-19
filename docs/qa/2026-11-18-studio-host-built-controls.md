# Controles do Pro compilado pelo hospedeiro

## Problemas reproduzidos

O dispatcher público `StudioProjectPlayer` encaminhava a referência do iframe para
Python e JavaScript publicado, mas a perdia no ramo `proBuild`. Esse ramo também
não encaminhava `onReady`. O iframe existia, porém um host que usa a referência
pública para enviar teclado ou áudio não conseguia alcançá-lo.

Além disso, `BuiltProPlayer` incluía `onError` nas dependências do efeito de build.
Um callback inline novo do hospedeiro recompilava um jogo já pronto, mesmo com
projeto e compilador idênticos. O teste reproduziu duas compilações onde deveria
haver uma.

## Correção

O ramo compilado encaminha a referência até o iframe de `ProArtifactPreview`,
preservando a referência interna usada pela ponte de armazenamento. Ao desmontar,
a referência externa é liberada. O evento `onReady` é emitido quando a ponte real
do artefato se conecta; não é antecipado pela conclusão do build.

Callbacks do host são lidos de uma referência atualizada. Apenas projeto ou
compilador diferentes reiniciam o efeito de build. Abortar e descartar resultados
obsoletos continuam usando o `AbortController` existente. Sandbox, autorização,
origem, classes e estilo visual permanecem os mesmos.

## Verificação

- Teste de referência com StrictMode: falhou antes (referência nula apesar do iframe
  montado); passou após o encaminhamento, incluindo liberação ao desmontar.
- Teste de callback novo: falhou antes (duas compilações); passou após corrigir as
  dependências. Arquivo `BuiltProPlayer.test.tsx`: quatro testes, zero falhas.
- Playwright com Chromium completo 148, Windows local, trace desligado por falta
  de espaço: dois casos aprovados em 18 segundos. O novo caso compila com Vite e
  packer reais, recebe o artefato pelo caminho do host e verifica readiness,
  teclado Enter, áudio silenciado/restaurado e sandbox. O caso de publicação
  existente continua verificando progresso entre revisões e isolamento do editor.
- Biome nos seis arquivos alterados aprovado. O typecheck completo deste lote
  ainda deve ser confirmado no SHA final pelo GitHub; a aprovação do job Linux
  anterior (`44289781987`, SHA `1d486e19b`) não verifica essas mudanças posteriores.

Não foram usados assets privados, WebContainer ou serviço de produção. O bucket
é em memória no teste; build remoto Docker e sua auditoria são gates separados.
Essa correção não encerra a missão nem a homologação dos executores.
