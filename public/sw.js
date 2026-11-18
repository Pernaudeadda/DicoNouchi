const CACHE_NAME = "diconouchi-static-v12";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/logo-diconouchi.jpg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  "/images/hero.svg",
  // "/images/cote-divoire-map.svg",
  "/images/empty-search.svg",
  "/images/empty-favorites.svg",
  "/images/empty-history.svg",
  "/images/categories/toutes.svg",
  "/images/categories/salutations.svg",
  "/images/categories/amitie.svg",
  "/images/categories/amour-et-relations.svg",
  "/images/categories/sexualite-et-intimite.svg",
  "/images/categories/relations.svg",
  "/images/categories/famille.svg",
  "/images/categories/personnalite.svg",
  "/images/categories/expressions.svg",
  "/images/categories/expressions-populaires.svg",
  "/images/categories/argot-ivoirien.svg",
  "/images/categories/argent-et-commerce.svg",
  "/images/categories/travail-et-metiers.svg",
  "/images/categories/education-et-ecole.svg",
  "/images/categories/transport.svg",
  "/images/categories/nourriture.svg",
  "/images/categories/mode.svg",
  "/images/categories/loisirs.svg",
  "/images/categories/musique-et-danse.svg",
  "/images/categories/humour-et-plaisanteries.svg",
  "/images/categories/insultes-et-provocations.svg",
  "/images/categories/vie-quotidienne.svg",
  "/images/categories/conflit.svg",
  "/images/categories/proverbes-africains.svg",
  "/images/categories/dictons-traditionnels.svg",
  "/images/categories/motivation-et-sagesse.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        if (request.mode === "navigate") {
          return (await caches.match("/")) || Response.error();
        }
        return Response.error();
      });
    })
  );
});



