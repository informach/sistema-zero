const CACHE_PREFIX = 'sz-project-'

export const PWA_HEAD_TAGS = `<link rel="manifest" href="manifest.webmanifest" />
<link rel="icon" href="icon.svg" type="image/svg+xml" />
<meta name="theme-color" content="#10b981" />
<meta name="mobile-web-app-capable" content="yes" />`

/**
 * Registra o service worker e, depois que ele assume o controle, informa os
 * recursos que o navegador realmente carregou. Isso inclui os módulos indiretos
 * do Three/esm.sh, que não aparecem no importmap e precisam estar no CacheStorage
 * para a próxima abertura funcionar offline.
 */
export const PWA_REGISTRATION_SCRIPT = `<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').then(function () {
      return navigator.serviceWorker.ready;
    }).then(function (registration) {
      var resources = performance.getEntriesByType('resource').map(function (entry) {
        return entry.name;
      });
      if (registration.active) {
        registration.active.postMessage({ type: 'SZ_CACHE_URLS', urls: resources });
      }
    }).catch(function () {
      // O site continua funcionando normalmente quando o host não oferece HTTPS.
    });
  });
}
</script>`

export const PWA_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Sistema Zero">
  <rect width="512" height="512" rx="112" fill="#07111f"/>
  <path d="M96 354 256 78l160 276-160 80Z" fill="#10b981"/>
  <path d="m256 78 160 276-160-78Z" fill="#34d399"/>
  <path d="m96 354 160-78v158Z" fill="#059669"/>
  <circle cx="256" cy="276" r="48" fill="#07111f"/>
</svg>
`

export function buildWebAppManifest(projectName: string): string {
  const name = projectName.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Projeto Sistema Zero'
  const shortName = name.slice(0, 24)
  return `${JSON.stringify(
    {
      name,
      short_name: shortName,
      description: 'Projeto interativo criado no Sistema Zero Studio',
      lang: 'pt-BR',
      start_url: './',
      scope: './',
      display: 'standalone',
      orientation: 'any',
      background_color: '#07111f',
      theme_color: '#10b981',
      icons: [
        {
          src: './icon.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    },
    null,
    2,
  )}\n`
}

/** Fingerprint de conteúdo para cada export instalar um cache novo e atômico. */
export function buildPwaRevision(files: Record<string, string | Uint8Array>): string {
  let hash = 0x811c9dc5
  const addByte = (value: number) => {
    hash ^= value
    hash = Math.imul(hash, 0x01000193)
  }
  const addText = (value: string) => {
    for (const byte of new TextEncoder().encode(value)) addByte(byte)
  }

  for (const path of Object.keys(files).sort()) {
    addText(path)
    const content = files[path]
    if (typeof content === 'string') addText(content)
    else if (content) for (const byte of content) addByte(byte)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Converte um caminho `public/...` no URL relativo usado pelo service worker. */
export function publicPathToUrl(path: string): string {
  const relative = path.startsWith('public/') ? path.slice('public/'.length) : path
  return `./${relative.split('/').map(encodeURIComponent).join('/')}`
}

export function buildServiceWorker(precacheUrls: string[], revision: string): string {
  const urls = [...new Set(precacheUrls)].sort()
  const cacheName = `${CACHE_PREFIX}${revision.replace(/[^a-z0-9_-]/gi, '') || 'v1'}`
  return `const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(urls)};

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names
          .filter(function (name) { return name.indexOf(${JSON.stringify(CACHE_PREFIX)}) === 0 && name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function fetchAndCache(request) {
  return fetch(request).then(function (response) {
    if (response.ok || response.type === 'opaque') {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { return cache.put(request, copy); });
    }
    return response;
  });
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetchAndCache(event.request).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetchAndCache(event.request);
    })
  );
});

self.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || data.type !== 'SZ_CACHE_URLS' || !Array.isArray(data.urls)) return;
  var jobs = data.urls.slice(0, 256).map(function (url) {
    try {
      var parsed = new URL(url, self.location.href);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return Promise.resolve();
      var request = new Request(parsed.href, { mode: parsed.origin === self.location.origin ? 'same-origin' : 'cors' });
      return caches.match(request).then(function (cached) {
        return cached ? undefined : fetchAndCache(request).then(function () { return undefined; });
      }).catch(function () { return undefined; });
    } catch (_error) {
      return Promise.resolve();
    }
  });
  event.waitUntil(Promise.all(jobs));
});
`
}
