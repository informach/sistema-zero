# Firefox: a casca isola sem COEP no Firefox de verdade (20/11/2026)

A conclusão de 18 e 19/11 ("no Firefox, só a casca em outro site com COOP **e** COEP na página
isola o jogo", [`2026-11-19-studio-isolation-host-policies.md`](2026-11-19-studio-isolation-host-policies.md))
vale para o Firefox **do Playwright**, não para o Firefox das famílias.

O Playwright publica o Firefox dele com uma preferência a mais:

```
// Disable cross-process iframes, but not cross-process navigations.
pref("fission.webContentIsolationStrategy", 0);
```

(`browser_patches/firefox/preferences/playwright.cfg`, repositório `microsoft/playwright`). Com 0, um
iframe de outro site roda no MESMO processo da página. O Firefox de mesa usa 1 (isolar todo site,
o Fission). Com 0, só o par COOP + COEP tirava a página do processo comum, e foi isso que as
medições anteriores viram.

## Medição

`packages/studio/scripts/measure-preview-isolation.mjs` ganhou `SZ_MEASURE_FIREFOX_SITE_ISOLATION=1`,
que devolve ao Firefox a preferência do navegador de mesa (`fission.webContentIsolationStrategy: 1`).
Cada linha da saída diz qual valeu (`isolamentoDoFirefox`). Mesmo programa de antes: o filho ocupa a
linha de execução por 5 s com trabalho síncrono nativo; a página mede o maior atraso de um relógio
de 50 ms e quanto demora um clique de verdade.

Windows 11 (a máquina da dona), Firefox 157.0 do Playwright 1.64.1, uma observação por linha.

| Isolamento do Firefox | Cabeçalhos do host | `srcdoc` com sandbox (o de hoje) | Casca em outro site |
|---|---|---|---|
| do Playwright (0) | nenhum | 5.002 ms / 4.530 ms | 5.013 ms / 4.546 ms |
| do Playwright (0) | COOP + COEP | 5.002 ms / 4.524 ms | **57 ms / 40 ms** |
| por site (1, o de mesa) | nenhum | 5.014 ms / 4.542 ms | **67 ms / 82 ms** |
| por site (1, o de mesa) | só COOP (o que os apps mandam) | 5.009 ms / 4.539 ms | **53 ms / 53 ms** |
| por site (1, o de mesa) | só COEP | 5.006 ms / 4.532 ms | **56 ms / 45 ms** |
| por site (1, o de mesa) | COOP + COEP | 5.008 ms / 4.530 ms | **56 ms / 42 ms** |

(atraso do relógio / clique atendido em; isolado = abaixo de 500 ms). O controle da mesma origem
travou nos dois modos (5.001 a 5.006 ms). Dados brutos em
[`2026-11-20-studio-firefox-site-isolation.json`](2026-11-20-studio-firefox-site-isolation.json).

```powershell
cd packages/studio
$env:SZ_MEASURE_FIREFOX_SITE_ISOLATION='1'
$env:SZ_MEASURE_HOST_POLICY_SPLIT='1'
$env:SZ_MEASURE_BROWSERS='firefox'
$env:SZ_MEASURE_ARRANGEMENTS='srcdoc,outro-site'
node scripts/measure-preview-isolation.mjs --json
```

## Consequência

- No Firefox de mesa, a casca em outro site isola o jogo **sem COEP na página**. A página da aula
  continua sem COEP e os vídeos não mudam; o isolamento vale também ali.
- O `srcdoc` sozinho nunca isola no Firefox (o jogo de origem opaca fica no processo da página que
  o criou). Sem a casca, o Firefox continua só com as proteções de hoje (vigia, marca de execução
  interrompida, troca do iframe preso, guarda de laço, limite de mensagens).
- Ligar COOP + COEP na rota do Estúdio deixa de ser necessário. E teria um custo real: a navegação
  suave do Next mantém os cabeçalhos do documento em que a pessoa entrou, então um COEP no
  `/estudio` seguiria para uma aula com vídeo aberta pelo menu.
- Chromium de mesa: o `srcdoc` com sandbox já isolava (medição de 18/11); a casca não acrescenta ali.
- WebKit: nenhum arranjo de iframe isolou (18/11); segue o estudo B4.
- Não medido: Chromium de Android (isolamento por site parcial) e Firefox de Android.
