/** CSS do jogo, injetado pela entrada dentro do próprio elemento (prefixo `arq-`). */
export const ESTILOS = `
.arq-raiz{position:relative;width:100%;height:100%;overflow:hidden;background:#0e1638;color:#1d2340;font:15px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;user-select:none;-webkit-user-select:none;touch-action:none}
.arq-canvas{position:absolute!important;inset:0}
.arq-hud{position:absolute;inset:0;pointer-events:none}
.arq-hud > *{pointer-events:auto}
.arq-cartao{background:rgba(255,255,255,.92);border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.16)}
.arq-necessidades{position:absolute;left:14px;top:14px;padding:10px 12px;display:grid;gap:6px;min-width:170px}
.arq-nec{display:grid;grid-template-columns:22px 1fr;align-items:center;gap:8px;font-weight:700;font-size:13px}
.arq-barra{height:9px;border-radius:9px;background:#e7e3d6;overflow:hidden}
.arq-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.arq-barra i{display:block;height:100%;border-radius:9px;transition:width .6s}
.arq-topo-dir{position:absolute;right:14px;top:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end;max-width:60%}
.arq-pilula{padding:7px 13px;font-weight:800;font-size:14px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 4px 18px rgba(0,0,0,.16);white-space:nowrap}
.arq-botao{border:0;cursor:pointer;font:800 14px system-ui,sans-serif;border-radius:12px;padding:10px 16px;background:#ffc93c;color:#4a3200;box-shadow:0 3px 0 rgba(0,0,0,.15)}
.arq-botao.leve{background:rgba(255,255,255,.92);color:#1d2340}
.arq-botao:focus-visible{outline:3px solid #2f6df6;outline-offset:2px}
.arq-baixo{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;max-width:calc(100% - 28px)}
.arq-acao{padding:8px 16px;font-weight:800;border-radius:999px;background:#141a3a;color:#fff;display:flex;gap:10px;align-items:center}
.arq-tecla{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:6px;background:#ffc93c;color:#4a3200;font-size:13px}
.arq-inventario{display:flex;gap:6px;padding:6px;background:rgba(20,26,58,.82);border-radius:14px;flex-wrap:wrap;justify-content:center}
.arq-item{position:relative;width:46px;height:46px;border-radius:10px;border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);font-size:22px;display:grid;place-items:center;color:#fff;cursor:default}
.arq-item.comida{cursor:pointer;border-color:#ffc93c}
.arq-item b{position:absolute;right:3px;bottom:1px;font-size:11px}
.arq-dica{position:absolute;left:14px;bottom:90px;max-width:min(380px,calc(100% - 28px));display:flex;gap:10px;align-items:flex-start;padding:12px 14px;background:rgba(20,26,58,.92);color:#fff;border-radius:16px;font-weight:700;animation:arq-entra .35s ease}
.arq-zappy{width:22px;height:22px;flex:none;border-radius:50%;background:radial-gradient(circle,#fff8c4 0 30%,#ffc93c 31% 58%,transparent 60%);box-shadow:0 0 14px #ffd84f}
@keyframes arq-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.arq-tela{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:radial-gradient(900px 500px at 50% 0%,#2a3a86,transparent 60%),#0e1638;color:#eef0fb;text-align:center}
.arq-tela h1{font-size:30px;margin:14px 0 8px}
.arq-tela p{max-width:440px;margin:0 auto 18px;color:#c9cdf0;font-size:16px}
.arq-tela .arq-zappy{width:46px;height:46px;margin:0 auto}
.arq-sobre{position:absolute;inset:0;display:grid;place-items:center;background:rgba(14,22,56,.6);padding:20px}
.arq-menu{padding:22px;max-width:420px;width:100%;display:grid;gap:10px;text-align:left}
.arq-ferramentas{display:flex;flex-wrap:wrap;gap:8px}
.arq-menu h2{margin:0 0 4px;font-size:22px}
.arq-menu ul{margin:0;padding-left:18px;color:#4a5070}
.arq-toque{position:absolute;inset:auto 0 0 0;height:0}
.arq-joystick{position:absolute;left:22px;bottom:110px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);touch-action:none}
.arq-joystick i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px;border-radius:50%;background:rgba(255,255,255,.75)}
.arq-botoes-toque{position:absolute;right:22px;bottom:120px;display:flex;flex-direction:column;gap:12px}
.arq-botoes-toque button{width:74px;height:74px;border-radius:50%;font-size:14px}
@media (max-width:640px){.arq-necessidades{min-width:130px;padding:8px}.arq-nec{font-size:0}.arq-dica{bottom:200px}}
`
