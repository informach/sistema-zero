import { studioPythonPlayerPage } from '@sistemazero/core/studio/python-player-page'
import { pythonFrameContentSecurityPolicy } from '@sistemazero/core/studio/python-runtime-policy'
import type { ExportFileMap } from './fileMap'

/** Generated files live outside project/, so author files can never overwrite the launcher. */
export function pythonWebTemplates(runtimeHash: string): ExportFileMap {
  const launcher = studioPythonPlayerPage(runtimeHash)
  const framePolicy = pythonFrameContentSecurityPolicy(
    `http://127.0.0.1:1/runtime/${runtimeHash}/`,
  ).replaceAll('http://127.0.0.1:1', '{origin}')
  const pagePolicy =
    "default-src 'none'; script-src 'self'; connect-src 'self'; frame-src 'self'; img-src data: blob:; style-src 'self'; base-uri 'none'; object-src 'none'; form-action 'none'"
  return {
    'index.html': launcher.html,
    'player.css': launcher.css,
    'serve.py': `"""Serve only this exported package. Never import or execute the learner program."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
# Windows file APIs need an extended-length namespace for valid portable files
# inside deep export directories. Keep the same resolved root for confinement.
if os.name == "nt" and not str(ROOT).startswith("\\\\\\\\?\\\\"):
    resolved = str(ROOT)
    ROOT = Path("\\\\\\\\?\\\\UNC\\\\" + resolved[2:] if resolved.startswith("\\\\\\\\") else "\\\\\\\\?\\\\" + resolved)
RUNTIME = ${JSON.stringify(`runtime/${runtimeHash}/`)}
FRAME_POLICY = ${JSON.stringify(framePolicy)}
PAGE_POLICY = ${JSON.stringify(pagePolicy)}
ROOT_FILES = {"index.html", "player.css", "payload.json", "asset-attributions.json"}

class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.deliver(head=True)

    def do_GET(self):
        self.deliver(head=False)

    def deliver(self, head):
        port = self.server.server_port
        host = self.headers.get("Host", "")
        if host not in {f"127.0.0.1:{port}", f"localhost:{port}"}:
            self.send_error(400)
            return
        origin = f"http://{host}"
        try:
            parsed = urlsplit(self.path)
            path = unquote(parsed.path, errors="strict").lstrip("/") or "index.html"
            if parsed.scheme or parsed.netloc or "\\\\" in path or any(p in {"", ".", ".."} for p in path.split("/")):
                raise ValueError("invalid path")
            if path not in ROOT_FILES and not path.startswith(("project/", RUNTIME)):
                raise ValueError("unlisted path")
            target = (ROOT / path).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():
                raise ValueError("outside package")
            size = target.stat().st_size
        except (ValueError, OSError, UnicodeError):
            self.send_error(404)
            return
        mime = "text/javascript" if target.suffix == ".mjs" else "application/wasm" if target.suffix == ".wasm" else mimetypes.guess_type(path)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", FRAME_POLICY.format(origin=origin) if path.startswith(RUNTIME) else PAGE_POLICY)
        if path.startswith(RUNTIME):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        self.end_headers()
        if not head:
            try:
                with target.open("rb") as stream:
                    while data := stream.read(65536):
                        self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Abra http://127.0.0.1:{server.server_port}/ — Ctrl+C para parar", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
`,
    'LEIA-ME.txt': `Jogo Python para navegador

Este pacote inclui o programa em project/, seus materiais e o runtime Python versionado em runtime/.
Inclui os arquivos originais necessários para executar; a compressão usada pelo Estúdio não é necessária neste pacote.
Não exige login nem conexão com os serviços do Estúdio. Abra por HTTP, não por file://.

Para testar no computador, instale Python 3.10 ou mais recente e execute nesta pasta:
python serve.py
Abra http://127.0.0.1:8000/ no Chrome ou Edge. Para outra porta: python serve.py --port 8080
Esse servidor apenas fornece arquivos estáticos; o programa Python é executado no navegador.

Para hospedagem pública, use HTTPS. A hospedagem precisa fornecer os tipos MIME text/javascript para .mjs e application/wasm para .wasm, Access-Control-Allow-Origin: * e Cross-Origin-Resource-Policy: cross-origin nos arquivos runtime/, e a política CSP indicada em hosting-headers.json. Substitua ORIGIN pela origem HTTPS real, sem barra final. Não remova sandbox ou adicione allow-same-origin. Uma hospedagem estática sem configuração desses cabeçalhos não é suficiente.

Os hashes em payload.json verificam o conteúdo do programa. Os metadados em runtime-deployment.json identificam o ambiente aprovado e suas licenças. Não altere arquivos internos do runtime.
Para continuar programando com Turtle original no VS Code, use a exportação de fonte nativa do Estúdio. Este ZIP foi preparado para jogar no navegador.
`,
    'hosting-headers.json': JSON.stringify(
      {
        version: 1,
        page: {
          'Content-Security-Policy': pagePolicy,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        },
        runtime: {
          prefix: `/runtime/${runtimeHash}/`,
          'Content-Security-Policy': framePolicy.replaceAll('{origin}', 'ORIGIN'),
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        },
      },
      null,
      2,
    ),
  }
}
