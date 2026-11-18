"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Heart, Clock3, Home, Settings, ArrowLeft,
  Share2, Volume2, X, ChevronRight, BookOpen,
  Info, Pause, Grid3X3, Map as MapIcon, ChevronLeft
} from "lucide-react";
import dynamic from "next/dynamic";

const IvoryCoastMap = dynamic(() => import("@/components/IvoryCoastMap"), { ssr: false });
import { dictionary } from "@/data/dictionary";
import { categoryMeta } from "@/data/categoryMeta";

const STORAGE = {
  favorites: "diconouchi:favorites:v1",
  history: "diconouchi:history:v1",
  theme: "diconouchi:theme:v1"
};

const LEGACY_STORAGE = {
  favorites: "nouchipro:favorites:v1",
  history: "nouchipro:history:v1",
  theme: "nouchipro:theme:v1"
};

function readStorage(key, fallback, legacyKey) {
  try {
    const value = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getMeta(name) {
  return categoryMeta[name] || { slug: "toutes", subtitle: "Explorer", emoji: "📚", image: "/images/categories/toutes.svg" };
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("home");
  const [homeCategory, setHomeCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState("");
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  const categories = useMemo(() => Object.keys(categoryMeta), []);
  const categoryCounts = useMemo(() => {
    const counts = { Toutes: dictionary.length };
    for (const word of dictionary) {
      counts[word.category] = (counts[word.category] || 0) + 1;
    }
    return counts;
  }, []);

  useEffect(() => {
    setFavorites(readStorage(STORAGE.favorites, [], LEGACY_STORAGE.favorites));
    setHistory(readStorage(STORAGE.history, [], LEGACY_STORAGE.history));
    setDark(readStorage(STORAGE.theme, false, LEGACY_STORAGE.theme));
    try {
      localStorage.removeItem("diconouchi:custom-words:v1");
      localStorage.removeItem("nouchipro:custom-words:v1");
    } catch {}
    setReady(true);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
    localStorage.setItem(STORAGE.history, JSON.stringify(history));
    localStorage.setItem(STORAGE.theme, JSON.stringify(dark));
  }, [favorites, history, dark, ready]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("fr");
    if (!q) return [];
    return dictionary.filter((w) =>
      [w.word, w.meaning, w.translation, w.example, w.exampleFr, w.category, w.kind]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(q)
    );
  }, [query]);

  const homeList = useMemo(() => {
    if (!homeCategory) return [];
    if (homeCategory === "Toutes") return dictionary;
    return dictionary.filter((w) => w.category === homeCategory);
  }, [homeCategory]);

  const favoriteList = useMemo(() => dictionary.filter((w) => favorites.includes(w.id)), [favorites]);
  const historyList = useMemo(() => history.map((id) => dictionary.find((w) => w.id === id)).filter(Boolean), [history]);

  function openWord(word) {
    stopAudio();
    setSelected(word);
    setHistory((old) => [word.id, ...old.filter((id) => id !== word.id)].slice(0, 60));
  }

  function goBack() {
    stopAudio();
    setSelected(null);
  }

  function switchTab(next) {
    stopAudio();
    setSelected(null);
    setTab(next);
    if (next !== "home") {
      setHomeCategory(null);
      setQuery("");
    }
  }

  function goHome() {
    stopAudio();
    setSelected(null);
    setHomeCategory(null);
    setQuery("");
    setTab("home");
  }

  function toggleFavorite(id) {
    setFavorites((old) => (old.includes(id) ? old.filter((x) => x !== id) : [id, ...old]));
  }

  async function shareWord(word) {
    const parts = [
      word.word,
      word.meaning ? `Sens : ${word.meaning}` : "",
      word.translation ? `Français : ${word.translation}` : "",
      word.example ? `Exemple : ${word.example}` : "",
      word.exampleFr ? `Exemple (français) : ${word.exampleFr}` : "",
      "",
      "DicoNouchi"
    ].filter(Boolean);
    const text = parts.join("\n");
    const title = word.word || "DicoNouchi";

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }

    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {}
    if (!copied && typeof document !== "undefined") {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        copied = document.execCommand("copy") || copied;
        document.body.removeChild(ta);
      } catch {}
    }

    try {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      if (typeof window !== "undefined") {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      setNotice(copied ? "Texte copié, ouverture de WhatsApp…" : "Ouverture de WhatsApp…");
    } catch {
      if (copied) setNotice("Texte copié dans le presse-papiers");
      else setNotice("Impossible de partager pour le moment");
    }
  }

  function speak(word) {
    try {
      if (playingId === word.id) {
        stopAudio();
        return;
      }
      stopAudio();
      const audio = new Audio(`/audio/${word.id}.mp3`);
      audioRef.current = audio;
      setPlayingId(word.id);
      audio.onended = () => {
        setPlayingId(null);
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.onerror = () => {
        setPlayingId(null);
        if (audioRef.current === audio) audioRef.current = null;
        setNotice("Audio indisponible");
      };
      audio.play().catch(() => {
        setPlayingId(null);
        if (audioRef.current === audio) audioRef.current = null;
        setNotice("Impossible de lire l'audio");
      });
    } catch {
      setPlayingId(null);
      setNotice("Audio indisponible");
    }
  }

  if (!ready) {
    return (
      <main className="loading-screen">
        <img src="/logo-diconouchi.jpg" alt="" className="loading-logo" />
        <p>DicoNouchi</p>
      </main>
    );
  }

  const q = query.trim();
  const showingSearch = tab === "home" && q.length > 0;

  const renderWordRow = (word) => (
    <article className="word-row" key={word.id}>
      <button className="word-row-main" onClick={() => openWord(word)}>
        <span className="word-avatar">{word.word.trim().charAt(0).toLocaleUpperCase("fr")}</span>
        <span className="word-row-text">
          <span className="word-row-title">{word.word}</span>
          <span className="word-row-sub">{word.meaning}</span>
          <span className="word-row-meta">{word.category}{word.kind ? ` · ${word.kind}` : ""}</span>
        </span>
        <ChevronRight size={20} className="chevron" />
      </button>
      <button
        className={`fav-btn ${favorites.includes(word.id) ? "saved" : ""}`}
        onClick={() => toggleFavorite(word.id)}
        aria-label={favorites.includes(word.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart size={20} fill={favorites.includes(word.id) ? "currentColor" : "none"} />
      </button>
    </article>
  );

  const renderEmpty = (image, title, text) => (
    <div className="empty-state">
      <img src={image} alt="" className="empty-illustration" />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );

  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>
      {selected ? (
        <div className="screen detail-screen">
          <header className="nav-bar">
            <button className="nav-back" onClick={goBack}><ChevronLeft size={24} /><span>Retour</span></button>
            <div className="nav-title" />
            <div className="nav-spacer" />
          </header>
          <div className="scroll-content detail-content">
            <div className="detail-hero-card">
              <img src={getMeta(selected.category).image} alt="" className="detail-hero-img" />
              <div className="detail-hero-overlay">
                <span className="pill">{selected.category}</span>
                <h1>{selected.word}</h1>
                {selected.kind && <p className="detail-kind">{selected.kind}</p>}
              </div>
            </div>

            {selected.pronunciation && (
              <div className="group-card inset">
                <div className="row-static"><span className="row-label">Prononciation</span><span className="row-value">{selected.pronunciation}</span></div>
              </div>
            )}

            <div className="inset">
              <button className={`primary-action ${playingId === selected.id ? "playing" : ""}`} onClick={() => speak(selected)}>
                {playingId === selected.id ? <Pause size={22} /> : <Volume2 size={22} />}
                <span>{playingId === selected.id ? "Pause" : "Écouter la prononciation"}</span>
              </button>
            </div>

            <div className="section-title">Définition</div>
            <div className="group-card inset"><p className="body-text">{selected.meaning}</p></div>

            <div className="section-title">Exemple</div>
            <div className="group-card inset">
              <p className="example-text">« {selected.example || "Exemple à compléter."} »</p>
              {selected.exampleFr && <p className="muted-text">{selected.exampleFr}</p>}
            </div>

            <div className="section-title">Traduction</div>
            <div className="group-card inset"><p className="body-text">{selected.translation}</p></div>

            {selected.note && (
              <>
                <div className="section-title">Note</div>
                <div className="group-card inset note-card"><Info size={18} /><p>{selected.note}</p></div>
              </>
            )}

            <div className="inset detail-actions-row">
              <button className={`secondary-action ${favorites.includes(selected.id) ? "active" : ""}`} onClick={() => toggleFavorite(selected.id)}>
                <Heart size={20} fill={favorites.includes(selected.id) ? "currentColor" : "none"} />
                <span>{favorites.includes(selected.id) ? "Favori" : "Ajouter"}</span>
              </button>
              <button className="secondary-action" onClick={() => shareWord(selected)}>
                <Share2 size={20} /><span>Partager</span>
              </button>
            </div>
          </div>
        </div>
      ) : tab === "map" ? (
        <div className="screen">
          <header className="large-title-bar"><h1>Carte</h1></header>
          <div className="scroll-content">
            <IvoryCoastMap />
          </div>
        </div>
      ) : tab === "settings" ? (
        <div className="screen">
          <header className="large-title-bar"><h1>Réglages</h1></header>
          <div className="scroll-content">
            <div className="section-title">Apparence</div>
            <div className="group-card inset">
              <div className="setting-row-ios">
                <div className="setting-text"><span className="setting-name">Mode sombre</span><span className="setting-desc">Adapter l'apparence de l'application</span></div>
                <label className="ios-switch">
                  <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} aria-label="Activer le mode sombre" />
                  <span className="ios-switch-track" />
                </label>
              </div>
            </div>

            <div className="section-title">À propos</div>
            <div className="group-card inset about-group">
              <div className="about-header">
                <img src="/logo-diconouchi.jpg" alt="" className="about-logo" />
                <div><div className="about-name">DicoNouchi</div><div className="about-ver">Dictionnaire Nouchi–Français</div></div>
              </div>
              <p className="about-text">DicoNouchi rassemble des mots, expressions, salutations, proverbes et citations pour découvrir le parler populaire ivoirien. Les entrées sont des exemples de démonstration et doivent être relues et validées par des locuteurs avant diffusion.</p>
              <div className="about-dev">Développé par <strong>PernaudeDev</strong></div>
            </div>

            <div className="section-title">Audio</div>
            <div className="group-card inset"><p className="about-text">Chaque entrée dispose d'une prononciation audio intégrée pour une écoute claire, sans dépendre de la voix de l'appareil.</p></div>

            <div className="inset foot-note"><p>Aucun compte, serveur ou service externe n'est requis pour consulter le dictionnaire.</p></div>
          </div>
        </div>
      ) : tab === "favorites" ? (
        <div className="screen">
          <header className="large-title-bar"><h1>Favoris</h1></header>
          <div className="scroll-content">
            {favoriteList.length === 0
              ? renderEmpty("/images/empty-favorites.svg", "Aucun favori", "Ajoute des mots et expressions à tes favoris pour les retrouver ici.")
              : <div className="group-card inset list-group">{favoriteList.map(renderWordRow)}</div>}
          </div>
        </div>
      ) : tab === "history" ? (
        <div className="screen">
          <header className="large-title-bar"><h1>Historique</h1></header>
          <div className="scroll-content">
            {historyList.length === 0
              ? renderEmpty("/images/empty-history.svg", "Aucun historique", "Les mots et expressions que tu consultes apparaîtront ici.")
              : <div className="group-card inset list-group">{historyList.map(renderWordRow)}</div>}
          </div>
        </div>
      ) : (
        <div className="screen">
          <header className="large-title-bar home-title-bar">
            <div className="home-brand">
              <img src="/logo-diconouchi.jpg" alt="" className="home-brand-logo" />
              <div>
                <h1>DicoNouchi</h1>
                <p>Le Nouchi, le langage en partage</p>
              </div>
            </div>
          </header>
          <div className="scroll-content">
            <div className="inset search-wrap">
              <label className="search-field">
                <Search size={18} className="search-icon" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setHomeCategory(null); }}
                  placeholder="Rechercher"
                  aria-label="Rechercher dans le dictionnaire"
                />
                {query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="Effacer"><X size={16} /></button>}
              </label>
            </div>

            {showingSearch ? (
              <>
                <div className="section-title">Résultats · {searchResults.length}</div>
                {searchResults.length === 0
                  ? renderEmpty("/images/empty-search.svg", "Aucun résultat", "Essaie un autre mot ou vérifie l'orthographe.")
                  : <div className="group-card inset list-group">{searchResults.map(renderWordRow)}</div>}
              </>
            ) : homeCategory ? (
              <>
                <div className="inset">
                  <button className="back-pill" onClick={() => setHomeCategory(null)}><ChevronLeft size={18} /><span>Catégories</span></button>
                </div>
                <div className="inset">
                  <div className="category-hero">
                    <img src={getMeta(homeCategory).image} alt="" />
                    <div className="category-hero-info">
                      <h2>{homeCategory}</h2>
                      <p>{getMeta(homeCategory).subtitle} · {homeList.length} entrée{homeList.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </div>
                <div className="group-card inset list-group">{homeList.map(renderWordRow)}</div>
              </>
            ) : (
              <>
                <div className="inset stats-row">
                  <div className="stat-chip"><strong>{dictionary.length}</strong><span>entrées</span></div>
                  <div className="stat-chip"><strong>{categories.length - 1}</strong><span>catégories</span></div>
                  <div className="stat-chip"><strong>Audio</strong><span>intégré</span></div>
                </div>

                <div className="section-title">Catégories</div>
                <div className="inset category-grid-ios">
                  {categories.map((name) => {
                    const meta = getMeta(name);
                    const count = categoryCounts[name] || 0;
                    return (
                      <button key={name} className="cat-card" onClick={() => setHomeCategory(name)}>
                        <img src={meta.image} alt="" loading="lazy" className="cat-card-img" />
                        <div className="cat-card-body">
                          <div className="cat-card-top"><span className="cat-emoji">{meta.emoji}</span><span className="cat-count">{count}</span></div>
                          <div className="cat-name">{name}</div>
                          <div className="cat-sub">{meta.subtitle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <nav className="tab-bar" aria-label="Navigation principale">
        <button className={`tab-item ${tab === "home" && !selected ? "active" : ""}`} onClick={goHome}><Home size={24} /><span>Accueil</span></button>
        <button className={`tab-item ${tab === "favorites" && !selected ? "active" : ""}`} onClick={() => switchTab("favorites")}><Heart size={24} /><span>Favoris</span></button>
        <button className={`tab-item ${tab === "history" && !selected ? "active" : ""}`} onClick={() => switchTab("history")}><Clock3 size={24} /><span>Historique</span></button>
        <button className={`tab-item ${tab === "map" && !selected ? "active" : ""}`} onClick={() => switchTab("map")}><MapIcon size={24} /><span>Carte</span></button>
        <button className={`tab-item ${tab === "settings" && !selected ? "active" : ""}`} onClick={() => switchTab("settings")}><Settings size={24} /><span>Réglages</span></button>
      </nav>

      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fermer"><X size={18} /></button></div>}
    </div>
  );
}
