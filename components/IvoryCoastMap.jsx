"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, LocateFixed, Layers, ChevronRight, AlertCircle, Info } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { cities, ivoryCoastBounds } from "@/data/civCities";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

export default function IvoryCoastMap() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const cityLayerRef = useRef(null);
  const adminLayerRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const initializingRef = useRef(false);

  const [query, setQuery] = useState("");
  const [adminLevel, setAdminLevel] = useState("none");
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    return cities.filter((c) => normalize(c.name).includes(q) || normalize(c.region).includes(q)).slice(0, 8);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapEl.current || mapRef.current || initializingRef.current) return;
      initializingRef.current = true;
      try {
        const mod = await import("leaflet");
        if (cancelled || !mapEl.current) return;
        const L = mod.default || mod;
        leafletRef.current = L;

        const container = mapEl.current;
        if (container._leaflet_id) {
          try { container._leaflet_id = null; } catch {}
        }

        let map;
        try {
          map = L.map(container, {
            zoomControl: true,
            scrollWheelZoom: true
          });
        } catch (err) {
          if (!cancelled) {
            console.error("Leaflet map init failed", err);
            setError("Impossible d'initialiser la carte interactive.");
          }
          return;
        }

        mapRef.current = map;

        if (cancelled) {
          try { map.remove(); } catch {}
          if (mapRef.current === map) mapRef.current = null;
          return;
        }

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map);

        const cityLayer = L.layerGroup().addTo(map);
        cityLayerRef.current = cityLayer;

        const icon = L.divIcon({
          className: "civ-city-marker-wrap",
          html: '<span class="civ-city-marker"></span>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
          popupAnchor: [0, -8]
        });

        cities.forEach((city) => {
          const marker = L.marker([city.latitude, city.longitude], { icon });
          marker.bindPopup(
            `<div class="civ-popup"><h3>${escapeHtml(city.name)}</h3>` +
            `<p><strong>Région :</strong> ${escapeHtml(city.region)}</p>` +
            `<p>${escapeHtml(city.description)}</p>` +
            `<small>${city.latitude}, ${city.longitude}</small></div>`
          );
          marker.on("click", () => {
            try { map.flyTo([city.latitude, city.longitude], 11, { duration: 0.9 }); } catch {}
          });
          marker.addTo(cityLayer);
        });

        try { map.fitBounds(ivoryCoastBounds, { padding: [20, 20] }); } catch {}
        setTimeout(() => { if (!cancelled) try { map.invalidateSize(); } catch {} }, 0);
        if (!cancelled) setMapReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Leaflet map init failed", err);
          setError("Impossible d'initialiser la carte interactive.");
        }
      } finally {
        initializingRef.current = false;
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {}
      cityLayerRef.current = null;
      adminLayerRef.current = null;
      selectedMarkerRef.current = null;
      leafletRef.current = null;
      initializingRef.current = false;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const t = setTimeout(() => {
      try { mapRef.current.invalidateSize(); } catch {}
    }, 150);
    return () => clearTimeout(t);
  }, [mapReady]);

  function focusCity(city) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (selectedMarkerRef.current) {
      try { map.removeLayer(selectedMarkerRef.current); } catch {}
      selectedMarkerRef.current = null;
    }

    const icon = L.divIcon({
      className: "civ-city-marker-wrap",
      html: '<span class="civ-city-marker selected"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -9]
    });

    const marker = L.marker([city.latitude, city.longitude], { icon }).addTo(map);
    marker.bindPopup(
      `<div class="civ-popup"><h3>${escapeHtml(city.name)}</h3>` +
      `<p><strong>Région :</strong> ${escapeHtml(city.region)}</p>` +
      `<p>${escapeHtml(city.description)}</p>` +
      `<small>${city.latitude}, ${city.longitude}</small></div>`
    ).openPopup();

    selectedMarkerRef.current = marker;
    try { map.flyTo([city.latitude, city.longitude], 11, { duration: 0.9 }); } catch {}
    setQuery(city.name);
    setShowResults(false);
  }

  function resetView() {
    const map = mapRef.current;
    if (!map) return;
    if (selectedMarkerRef.current) {
      try { map.removeLayer(selectedMarkerRef.current); } catch {}
      selectedMarkerRef.current = null;
    }
    try { map.fitBounds(ivoryCoastBounds, { padding: [20, 20] }); } catch {}
  }

  async function loadBoundaries() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (adminLayerRef.current) {
      try { map.removeLayer(adminLayerRef.current); } catch {}
      adminLayerRef.current = null;
    }
    setAdminCount(0);
    setError("");

    if (adminLevel === "none") return;

    setLoading(true);
    try {
      const localUrl = `/geo/civ-${String(adminLevel).toLowerCase()}.geojson`;
      let geo = null;

      try {
        const localRes = await fetch(localUrl);
        if (localRes.ok) geo = await localRes.json();
      } catch {}

      if (!geo) {
        const metaRes = await fetch(`https://www.geoboundaries.org/api/current/gbOpen/CIV/${adminLevel}/`);
        if (!metaRes.ok) throw new Error(`Métadonnées indisponibles (HTTP ${metaRes.status})`);
        const meta = await metaRes.json();
        const url = meta && (meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL);
        if (!url) throw new Error("Aucun fichier de limites disponible pour ce niveau");
        const geoRes = await fetch(url);
        if (!geoRes.ok) throw new Error(`Téléchargement des limites impossible (HTTP ${geoRes.status})`);
        geo = await geoRes.json();
      }

      const layer = L.geoJSON(geo, {
        style: () => ({
          color: "#1d634c",
          weight: 1.5,
          opacity: 0.9,
          fillColor: "#2f8a66",
          fillOpacity: 0.12
        }),
        onEachFeature: (feature, lyr) => {
          const props = feature.properties || {};
          const name = props.shapeName || props.shapeName_en || props.NAME_1 || props.NAME_2 || props.name || "Zone administrative";
          const details = Object.entries(props)
            .filter(([k, v]) => v !== null && v !== "" && typeof v !== "object")
            .slice(0, 6)
            .map(([k, v]) => `<p><strong>${escapeHtml(k)} :</strong> ${escapeHtml(v)}</p>`)
            .join("");
          lyr.bindPopup(`<div class="civ-popup"><h3>${escapeHtml(name)}</h3>${details || "<p>Zone administrative</p>"}</div>`);
          lyr.on("mouseover", () => lyr.setStyle({ weight: 3, fillOpacity: 0.28 }));
          lyr.on("mouseout", () => { try { layer.resetStyle(lyr); } catch {} });
        }
      }).addTo(map);

      adminLayerRef.current = layer;
      setAdminCount(layer.getLayers().length);
      const b = layer.getBounds();
      if (b && b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch (e) {
      const msg = e && e.message ? e.message : "";
      if (/Failed to fetch|NetworkError|Load failed|fetch/i.test(msg)) {
        setError("Impossible de charger les limites : données locales inaccessibles et connexion Internet indisponible.");
      } else if (msg) {
        setError(`Impossible de charger les limites : ${msg}`);
      } else {
        setError("Impossible de charger les limites. Réessaie.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="map-explorer">
      <div className="section-title">Explorer</div>
      <div className="group-card inset map-controls-card">
        <div className="map-search-wrap">
          <Search size={18} className="map-search-icon" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Rechercher une ville ou une région"
            aria-label="Rechercher une ville"
          />
        </div>
        {showResults && query.trim() && (
          <div className="map-search-results">
            {results.length === 0 ? (
              <div className="map-search-empty">Aucun résultat</div>
            ) : results.map((c) => (
              <button key={c.name} className="map-search-item" onClick={() => focusCity(c)}>
                <span className="map-search-name">{c.name}</span>
                <span className="map-search-region">{c.region}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="section-title">Découpage administratif</div>
      <div className="group-card inset map-controls-card">
        <div className="map-level-row">
          <Layers size={18} className="map-level-icon" />
          <select value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)} aria-label="Niveau administratif">
            <option value="none">Aucune limite</option>
            <option value="ADM1">ADM1 — Districts / Régions</option>
            <option value="ADM2">ADM2 — Départements</option>
            <option value="ADM3">ADM3 — Sous-préfectures</option>
          </select>
        </div>
        <button className="map-load-btn" onClick={loadBoundaries} disabled={loading || !mapReady}>
          {loading ? "Chargement…" : "Charger les limites"}
        </button>
      </div>

      {error && (
        <div className="inset map-inline-alert error"><AlertCircle size={18} /><span>{error}</span></div>
      )}

      <div className="inset map-stats-row">
        <div className="map-stat"><strong>{cities.length}</strong><span>villes</span></div>
        <div className="map-stat"><strong>{adminCount}</strong><span>zones</span></div>
        <button className="map-reset-btn" onClick={resetView} aria-label="Recentrer la carte" disabled={!mapReady}><LocateFixed size={18} /><span>Recentrer</span></button>
      </div>

      <div className="inset">
        <div className="map-frame">
          <div ref={mapEl} className="leaflet-host" />
          {!mapReady && !error && <div className="map-loading-overlay">Chargement de la carte…</div>}
          {loading && <div className="map-loading-pill">Chargement des limites…</div>}
          <div className="map-legend-float">
            <span><i className="dot-city" /> Ville</span>
            <span><i className="dot-zone" /> Zone</span>
          </div>
        </div>
      </div>

      <div className="section-title">Villes</div>
      <div className="group-card inset list-group">
        {cities.map((city) => (
          <button key={city.name} className="city-list-row" onClick={() => focusCity(city)} disabled={!mapReady}>
            <span className="city-list-text">
              <span className="city-list-name">{city.name}</span>
              <span className="city-list-region">{city.region}</span>
            </span>
            <ChevronRight size={18} className="chevron" />
          </button>
        ))}
      </div>

      <div className="inset foot-note">
        <p><Info size={14} style={{verticalAlign: '-2px'}} /> Carte interactive (OpenStreetMap, sans clé API) : le fond de carte nécessite une connexion Internet. Les limites administratives se chargent depuis les données locales intégrées à l'application (avec repli en ligne si besoin).</p>
      </div>
    </div>
  );
}