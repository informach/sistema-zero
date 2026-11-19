# Encerramento do processo WebKit no laboratório Windows

O job 135132844393, run 44397955661, reprovou após 55 s. Seus artefatos
confirmaram todas as 12 revisões `exit-0` a `exit-11` em Chromium 148 e WebKit
26.4, incluindo a injeção de aborto nativo. O job permaneceu vermelho.

A repetição local reproduziu a falha no segundo ensaio. Os tempos por fase
separaram o problema: Chromium terminou em 5,36 s; WebKit confirmou as 12
recargas em 9,25 s, confirmou o conflito em 11,19 s e fechou seu contexto em
11,192 s. A espera parou no `browser.close()` nativo, sem resposta até o
limite externo. Isso não era uma recarga lenta nem evidência de perda de dados.

O driver agora mantém posse explícita somente do processo descartável de
WebKit no Windows, com `launchServer`, conexão por WebSocket de loopback e
`BrowserServer.kill()`, APIs públicas do Playwright 1.60.0 instalado. Após
concluir as asserções, termina a árvore do processo que criou, ainda com seu
último contexto aberto, e confirma exitCode/signalCode. Também termina o servidor se a conexão falhar.
Outros motores e o WebKit Linux conservam o encerramento anterior.

Não há fallback que ignore uma asserção ou reconheça save sem confirmação.
O limite de 55 s não mudou. Os tempos por fase e a saída completa do driver
ficam nos artefatos, inclusive quando o subprocesso reprova. A terminação do
helper QA não é apresentada como saída graciosa do navegador do aluno.

A primeira tentativa de posse explícita ainda fechava o último contexto antes
de terminar o servidor. Ela passou em três repetições com aborto, mas reprovou
na suíte com saída nativa normal: a raiz já havia saído e um processo de rede
órfão mantinha os pipes herdados abertos. A implementação instalada do Playwright
espera o evento close do ChildProcess, que depende desses pipes. Não foi
modificada. A correção de ordem evita perder a posse dos descendentes antes de
terminar a árvore. As repetições finais precisam ser qualificadas separadamente.

As três repetições da primeira tentativa com aborto passaram:
17,68 s, 17,55 s e 17,93 s, cada uma com 12 recargas em cada motor e conflito
entre abas. A confirmação de quota foi exercitada no Chromium. Esses números
são duração do ensaio, não latência de edição ou medida de FPS. A nova CI
Windows ainda é obrigatória. O fechamento nativo que travou continua registrado
como limitação do laboratório; não foi corrigido no WebKit upstream.


## Repetições após corrigir a ordem da terminação

Com o último contexto ainda aberto até a terminação da árvore, passaram três
repetições da saída normal (16,01 / 15,73 / 15,73 s) e três com aborto nativo
(17,94 / 17,98 / 17,73 s). Somam 144 recargas verificadas, 12 conflitos entre
abas e seis confirmações de quota, sem aumentar prazos. Cada ensaio criou seus
próprios contextos e verificou os processos que possuía. A aprovação remota
continua necessária; esses resultados locais não apagam o job vermelho original.


A suíte integrada final de estado/persistência passou com 376 testes, zero
falhas e 2075 asserções (35,35 s). O typecheck após integração passou.
