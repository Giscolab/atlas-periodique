"""Serve the Atlas locally with explicit JavaScript and GLB MIME types."""
import argparse
import errno
import shutil
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    disable_nagle_algorithm = True

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.glb': 'model/gltf-binary', '.json': 'application/json',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def copyfile(self, source, outputfile):
        # This Windows environment intermittently truncated large writes,
        # including 64 KiB transfers. Bounded 16 KiB writes passed repeated
        # concurrent, hash-verified downloads of JS, images and the full GLB.
        shutil.copyfileobj(source, outputfile, length=16 * 1024)


class LocalServer(ThreadingHTTPServer):
    # Windows must reject an occupied port instead of sharing it with an old server.
    allow_reuse_address = False
    # The import map loads several modules at once. Windows may reset incoming
    # connections when HTTPServer's default backlog of five is exceeded.
    request_queue_size = 64


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8084)
    parser.add_argument('--auto-port', action='store_true', help='Choisir un port libre si nécessaire')
    parser.add_argument('--open', action='store_true', help='Ouvrir le navigateur')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('Le port doit être compris entre 1 et 65535.')
    root = Path(__file__).resolve().parent
    if not (root / 'index.html').is_file():
        raise SystemExit('index.html est introuvable. Extraire tout le projet avant de le lancer.')
    handler = partial(Handler, directory=str(root))
    server = None
    for port in range(args.port, min(65536, args.port + (20 if args.auto_port else 1))):
        try:
            server = LocalServer(('127.0.0.1', port), handler)
            break
        except OSError as error:
            if not args.auto_port or error.errno not in (errno.EADDRINUSE, errno.EACCES):
                raise SystemExit(f'Impossible de démarrer sur le port {port} : {error}') from error
    if server is None:
        raise SystemExit('Aucun port disponible. Fermer les anciens serveurs Atlas puis réessayer.')
    url = f'http://127.0.0.1:{server.server_port}/'
    print(f'Atlas V4 : {url}\nDossier : {root}\nGarder cette fenêtre ouverte pendant la visite.', flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
