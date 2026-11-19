# Perfil da imagem após a integração de cenas Pro

O commit `4b26a3e69` integrou novos contratos em `core/src/studio` para
consumir cenas Molda no Pro. Esses contratos pertencem ao fingerprint da
imagem hospedada. A conferência oficial reprovou localmente: perfil
desatualizado. Não se tratava de elevar cotas ou trocar a versão do Three.

O perfil foi regenerado com Bun 1.3.11 pelo comando do pacote. A única
saída alterada foi `runtime/validation-profile.json`: fingerprint
`f11aa057992edd156158a56a51b1b0f76969ab90cc8099b828315b26d9b64eb1`.
Os três módulos de contratos gerados, dependências, lockfile, limites e
permissões não mudaram. Não houve construção ou implantação de imagem
de produção nesta sessão.

`check:validation-profile` passou após a geração. Os dez testes de
`contracts.test.ts` passaram, com 51 asserções. O recorte combinado também
detectou uma instalação local antiga do runtime (Three 0.180.0, diante do
pin 0.184.0): o teste de confiança bloqueou corretamente esses bytes.
Depois de encerrar a suíte geral do Estúdio, a instalação foi reconciliada
com o lockfile usando `npm ci --ignore-scripts --no-audit --no-fund --prefix runtime`.
O recorte combinado passou: **19 testes, 343 asserções, nenhuma falha**
(912 ms, Windows/Bun 1.3.11). Não foi removida nem afrouxada a verificação
do pacote instalado. Isso valida os contratos locais; não equivale a
construir ou homologar uma imagem implantada.

```powershell
cd packages/studio-runtime
bun run gen:validation-profile
bun run check:validation-profile
npm ci --ignore-scripts --no-audit --no-fund --prefix runtime
bun test tests/contracts.test.ts tests/check-javascript-modules.test.mjs
```
