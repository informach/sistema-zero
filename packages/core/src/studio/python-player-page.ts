/** Shared static launcher. Approval of a remote runtime remains the server caller's responsibility. */
export function studioPythonPlayerPage(
  runtimeHash: string,
  options: {
    runtimeDirectoryURL?: string
    bootstrap?: 'standalone' | 'playtest'
    previewParentOrigin?: string
  } = {},
) {
  if (!/^[a-f0-9]{64}$/.test(runtimeHash)) throw new Error('Runtime Python inválido.')
  const bootstrap = options.bootstrap ?? 'standalone'
  if (bootstrap !== 'standalone' && bootstrap !== 'playtest')
    throw new Error('Entrada do player Python inválida.')
  const parentOrigin = options.previewParentOrigin
  if (
    parentOrigin !== undefined &&
    (!isStudioPythonWebOrigin(parentOrigin) || new URL(parentOrigin).origin !== parentOrigin)
  )
    throw new Error('Origem do aplicativo inválida.')
  const previewMetadata =
    parentOrigin === undefined
      ? ''
      : `<meta name="studio-python-preview-parent" content="${parentOrigin}">`
  let moduleURL = `./runtime/${runtimeHash}/${bootstrap}.mjs`
  if (options.runtimeDirectoryURL !== undefined) {
    const directory = new URL(options.runtimeDirectoryURL)
    if (
      !['https:', 'http:'].includes(directory.protocol) ||
      directory.username ||
      directory.password ||
      directory.search ||
      directory.hash ||
      directory.pathname !== `/v1/runtimes/${runtimeHash}/` ||
      (directory.protocol === 'http:' &&
        !['localhost', '127.0.0.1', '[::1]'].includes(directory.hostname))
    )
      throw new Error('Diretório do player Python inválido.')
    moduleURL = new URL(`${bootstrap}.mjs`, directory).href
  }
  const html = [
    '<!doctype html>',
    `<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${previewMetadata}<title>Jogo Python</title><link rel="stylesheet" href="./player.css"><script type="module" src="${moduleURL}"></script></head>`,
    '<body><main><h1 id="title">Jogo Python</h1><nav aria-label="Controles do jogo"><button id="start" disabled>Reiniciar</button><button id="stop" disabled>Parar</button><button id="capture" disabled>Salvar imagem</button></nav><p id="status" role="status">Abrindo…</p><div id="stage"></div><form id="input-form" hidden><label id="input-label" for="input">Sua resposta</label><input id="input" maxlength="4096" autocomplete="off"><button type="submit">Enviar</button></form><pre id="output" aria-label="Console do programa" tabindex="0"></pre></main></body></html>',
  ].join('\n')
  const css =
    ':root{color-scheme:dark;font:16px system-ui,sans-serif;background:#131820;color:#f4f5f7}*{box-sizing:border-box}body{margin:0}main{max-width:1100px;margin:auto;padding:16px}h1{font-size:1.4rem;overflow-wrap:anywhere}nav{display:flex;gap:8px;flex-wrap:wrap}button,input{font:inherit;padding:9px 14px;border:1px solid #8090a4;border-radius:8px}button{cursor:pointer;background:#263345;color:inherit}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid #90d8ff;outline-offset:3px}#stage{width:100%;height:min(65vh,680px);min-height:280px}iframe{width:100%;height:100%;border:0;background:#fff;border-radius:8px}#output{white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow:auto;padding:12px;background:#080c12}form:not([hidden]){display:flex;gap:8px;align-items:center;flex-wrap:wrap}input{max-width:100%;min-width:0;background:#080c12;color:inherit}@media(max-width:480px){main{padding:10px}#stage{min-height:240px}button{padding:8px 10px}}'
  return { html, css }
}

import { isStudioPythonWebOrigin } from './python-preview-input'
