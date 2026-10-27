import { useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ArrowRight, Check, ChevronDown, Clock3, ExternalLink, Gamepad2, Heart, Menu,
  Play, RotateCcw, Search, Shuffle, Sparkles, Users, X,
} from 'lucide-react'
import { fetchGames } from './api'
import { DEFAULT_SORT, type Game, type SortMode } from './data'
import './App.css'

function Logo() {
  return (
    <a className="brand" href="#top" aria-label="Piksel ana sayfa">
      <svg viewBox="0 0 38 38" aria-hidden="true">
        <path d="M3 3h14v14H3zM21 3h14v14H21zM3 21h14v14H3z" fill="currentColor" />
        <path d="M21 21h14v14H21z" fill="currentColor" opacity=".35" />
      </svg>
      <span>piksel<span className="brand-dot">.</span></span>
    </a>
  )
}

interface GameCardProps {
  game: Game
  favorite: boolean
  onFavorite: (id: string) => void
  onOpen: (game: Game) => void
}

function GameCard({ game, favorite, onFavorite, onOpen }: GameCardProps) {
  return (
    <article className="game-card">
      <div className="game-cover">
        <button className="cover-button" onClick={() => onOpen(game)} aria-label={`${game.title} önizlemesini aç`}>
          <img className="cover-art" src={game.thumbnailUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <span className="play-pill"><Play size={15} fill="currentColor" /> Hemen oyna</span>
        </button>
        <button
          className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
          onClick={() => onFavorite(game.id)}
          aria-label={favorite ? `${game.title} favorilerden çıkar` : `${game.title} favorilere ekle`}
          aria-pressed={favorite}
        >
          <Heart size={19} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <span className="category-badge">{game.category}</span>
        {game.isNew && <span className="new-badge">Yeni</span>}
      </div>
      <div className="game-info">
        <div className="game-title-row">
          <button className="game-title" onClick={() => onOpen(game)}>{game.title}</button>
          {game.duration && <span className="rating"><Clock3 size={15} /> {game.duration}</span>}
        </div>
        {game.players && (
          <div className="game-meta">
            <span><Users size={14} /> {game.players} oyuncu</span>
          </div>
        )}
      </div>
    </article>
  )
}

export default function App() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Tümü')
  const [sort, setSort] = useState<SortMode>(DEFAULT_SORT)
  // Filtre değişince görülen kart sayısını resetle — effect yerine render-sırası ayarlaması
  // (React dokümanı "Adjusting state when props change" pattern'i)
  const [visible, setVisible] = useState({ filtersKey: '', count: 6 })
  const [favoriteOnly, setFavoriteOnly] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('piksel-favorites') || '[]') } catch { return [] }
  })

  const loadCatalog = (signal?: AbortSignal) => {
    fetchGames(signal)
      .then((list) => setGames(list))
      .catch((err) => { if (!signal?.aborted) setLoadError(err instanceof Error ? err.message : 'Bilinmeyen hata') })
  }

  useEffect(() => {
    const controller = new AbortController()
    loadCatalog(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    localStorage.setItem('piksel-favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenu(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const categories = useMemo(() => {
    const list = ['Tümü', ...new Set((games ?? []).map((game) => game.category))]
    return list
  }, [games])

  const filteredGames = useMemo(() => {
    const source = games ?? []
    const normalized = query.trim().toLocaleLowerCase('tr-TR')
    const result = source.filter((game) => {
      const matchesQuery = !normalized || `${game.title} ${game.category}`.toLocaleLowerCase('tr-TR').includes(normalized)
      const matchesCategory = activeCategory === 'Tümü' || game.category === activeCategory
      const matchesFavorites = !favoriteOnly || favorites.includes(game.id)
      return matchesQuery && matchesCategory && matchesFavorites
    })
    return [...result].sort((a, b) => {
      const alpha = a.title.localeCompare(b.title, 'tr-TR')
      if (sort === 'new') return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || alpha
      return alpha
    })
  }, [games, query, activeCategory, favoriteOnly, favorites, sort])

  const filtersKey = `${query}|${activeCategory}|${favoriteOnly}|${sort}`
  if (visible.filtersKey !== filtersKey) {
    setVisible({ filtersKey, count: 6 })
  }
  const visibleCount = visible.count

  const scrollToGames = () => document.getElementById('kesfet')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const openGame = (game: Game) => { setSelectedGame(game) }
  const toggleFavorite = (id: string) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  const resetFilters = () => {
    setQuery(''); setActiveCategory('Tümü'); setFavoriteOnly(false); setSort(DEFAULT_SORT)
  }
  const showFavorites = () => {
    setFavoriteOnly(true); setMobileMenu(false)
    window.setTimeout(scrollToGames, 20)
  }
  const showNew = () => {
    setSort('new'); setFavoriteOnly(false); setActiveCategory('Tümü'); setMobileMenu(false)
    window.setTimeout(scrollToGames, 20)
  }
  const focusSearch = () => {
    setMobileMenu(false); scrollToGames()
    window.setTimeout(() => searchRef.current?.focus(), 450)
  }
  const randomGame = () => {
    const list = games ?? []
    if (list.length) openGame(list[Math.floor(Math.random() * list.length)])
  }
  const featured = useMemo(() => games?.find((game) => game.featured) ?? games?.[0] ?? null, [games])
  const catalogEmpty = games !== null && games.length === 0

  return (
    <div id="top" className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Ana menü">
            <a href="#kesfet">Keşfet</a>
            <a href="#kategoriler">Kategoriler</a>
            <button onClick={showNew}>Yeni eklenenler</button>
          </nav>
          <div className="header-actions">
            <button className="icon-button search-shortcut" onClick={focusSearch} aria-label="Oyun ara"><Search size={20} /></button>
            <button className="favorites-link" onClick={showFavorites} aria-label={`Favorileri göster, ${favorites.length} oyun`}>
              <Heart size={18} /> <span>Favoriler</span><b>{favorites.length}</b>
            </button>
            <button className="icon-button menu-button" onClick={() => setMobileMenu((value) => !value)} aria-expanded={mobileMenu} aria-label="Menüyü aç veya kapat">
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {mobileMenu && (
          <nav className="mobile-nav" aria-label="Mobil menü">
            <a href="#kesfet" onClick={() => setMobileMenu(false)}>Keşfet <ArrowRight size={18} /></a>
            <a href="#kategoriler" onClick={() => setMobileMenu(false)}>Kategoriler <ArrowRight size={18} /></a>
            <button onClick={showNew}>Yeni eklenenler <Sparkles size={18} /></button>
            <button onClick={randomGame}>Rastgele oyun <Shuffle size={18} /></button>
          </nav>
        )}
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span /> Tarayıcıda oyun, beklemeden eğlence</div>
            <h1 id="hero-title">Aç. Oyna.<br /><em>Tekrarla.</em></h1>
            <p>İndirme yok, kurulum yok. Küçük web oyunlarıyla aradığın hızlı eğlence tek tık uzağında.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => featured && openGame(featured)} disabled={!featured}><Play size={19} fill="currentColor" /> Hemen oyna <ArrowRight size={19} /></button>
              <button className="text-button" onClick={randomGame} disabled={!games?.length}><Shuffle size={18} /> Rastgele seç</button>
            </div>
            <ul className="hero-benefits" aria-label="Platform özellikleri">
              <li><Check size={15} /> Ücretsiz</li>
              <li><Check size={15} /> Mobil uyumlu</li>
              <li><Check size={15} /> Kurulumsuz</li>
            </ul>
          </div>
          <div className="hero-visual" aria-label={featured ? `Haftanın öne çıkan oyunu ${featured.title}` : 'Öne çıkan oyun yükleniyor'}>
            <div className="featured-frame">
              {featured ? (
                <>
                  <div className="featured-topline"><span>HAFTANIN OYUNU</span><span>{(games?.length ?? 0)} OYUN</span></div>
                  <img className="featured-art" src={featured.thumbnailUrl} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
                  <div className="featured-caption">
                    <div><strong>{featured.title}</strong><span>{featured.description.split('.')[0]}.</span></div>
                    <button onClick={() => openGame(featured)} aria-label={`${featured.title} önizlemesini aç`}><ArrowRight size={24} /></button>
                  </div>
                </>
              ) : (
                <div className="featured-loading"><Gamepad2 size={40} /><span>{loadError ? 'Katalog yüklenemedi' : 'Katalog yükleniyor…'}</span></div>
              )}
            </div>
          </div>
        </section>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[0, 1].map((copy) => <div className="ticker-content" key={copy}>
              <span>İNDİRME YOK</span><i>✦</i><span>TEK TIKLA OYNA</span><i>✦</i><span>HER YERDE EĞLENCE</span><i>✦</i><span>YENİ OYUNLAR</span><i>✦</i>
            </div>)}
          </div>
        </div>

        <section id="kesfet" className="catalog-section" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <span className="section-index">OYUN KÜTÜPHANESİ / {games?.length ?? 0} oyun</span>
              <h2 id="catalog-title">Sıradaki favorin burada.</h2>
            </div>
            <p>Kısa bir mola ya da uzun bir rekabet. Moduna uyan oyunu seç.</p>
          </div>

          <div className="catalog-tools">
            <label className="search-field">
              <Search size={21} />
              <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Oyun ara..." aria-label="Oyun ara" />
              {query && <button onClick={() => setQuery('')} aria-label="Aramayı temizle"><X size={18} /></button>}
            </label>
            <label className="sort-field">
              <span className="sr-only">Oyunları sırala</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                <option value="alpha">A — Z</option>
                <option value="new">Yeni eklenenler</option>
              </select>
              <ChevronDown size={18} aria-hidden="true" />
            </label>
          </div>

          <div id="kategoriler" className="filter-row" aria-label="Oyun kategorileri">
            <div className="category-filters">
              {categories.map((category) => (
                <button key={category} className={activeCategory === category && !favoriteOnly ? 'active' : ''} onClick={() => { setActiveCategory(category); setFavoriteOnly(false) }} aria-pressed={activeCategory === category && !favoriteOnly}>{category}</button>
              ))}
            </div>
            <button className={`favorites-filter ${favoriteOnly ? 'active' : ''}`} onClick={() => setFavoriteOnly((value) => !value)} aria-pressed={favoriteOnly}><Heart size={16} fill={favoriteOnly ? 'currentColor' : 'none'} /> Favorilerim</button>
          </div>

          <div className="results-line" aria-live="polite">
            <span>{games === null ? 'Katalog yükleniyor…' : `${filteredGames.length} oyun bulundu`}</span>
            {(query || activeCategory !== 'Tümü' || favoriteOnly) && <button onClick={resetFilters}><RotateCcw size={14} /> Filtreleri temizle</button>}
          </div>

          {loadError ? (
            <div className="error-state" role="alert">
              <Gamepad2 size={46} />
              <h3>Katalog yüklenemedi.</h3>
              <p>{loadError}</p>
              <button className="secondary-button" onClick={() => { setLoadError(null); loadCatalog() }}>Tekrar dene</button>
            </div>
          ) : games === null ? (
            <div className="catalog-loading"><span className="pulse-dot" /><span className="pulse-dot" /><span className="pulse-dot" /><span className="sr-only">Oyun kataloğu yükleniyor</span></div>
          ) : filteredGames.length > 0 ? (
            <>
              <div className="games-grid">
                {filteredGames.slice(0, visibleCount).map((game) => (
                  <GameCard key={game.id} game={game} favorite={favorites.includes(game.id)} onFavorite={toggleFavorite} onOpen={openGame} />
                ))}
              </div>
              {visibleCount < filteredGames.length && (
                <div className="load-more-wrap"><button className="secondary-button" onClick={() => setVisible((state) => ({ ...state, count: state.count + 6 }))}>Daha fazla oyun göster <ArrowRight size={18} /></button></div>
              )}
            </>
          ) : catalogEmpty ? (
            <div className="empty-state">
              <Gamepad2 size={46} />
              <h3>Kütüphane henüz boş.</h3>
              <p>Games klasörüne yeni bir oyun ekleyip manifest dosyası oluşturun; kataloğa otomatik düşer.</p>
            </div>
          ) : (
            <div className="empty-state">
              <Gamepad2 size={46} />
              <h3>Burada bir oyun bulamadık.</h3>
              <p>Arama kelimeni değiştir ya da filtreleri temizleyerek yeniden dene.</p>
              <button className="secondary-button" onClick={resetFilters}>Tüm oyunları göster</button>
            </div>
          )}
        </section>

        <section className="closing-banner" aria-label="Oyun çağrısı">
          <div className="closing-icon"><Gamepad2 size={45} strokeWidth={1.6} /></div>
          <div><span>MOLA BİTTİ Mİ?</span><h2>Bir tur daha atmaya değer.</h2></div>
          <button className="primary-button" onClick={randomGame} disabled={!games?.length}>Şansını dene <Shuffle size={18} /></button>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main"><Logo /><p>Küçük oyunlar. Büyük molalar.</p></div>
        <nav aria-label="Alt menü"><a href="#kesfet">Tüm oyunlar</a><button onClick={showNew}>Yeni eklenenler</button><button onClick={showFavorites}>Favoriler</button></nav>
        <div className="footer-bottom"><span>© 2026 Piksel</span><span>Tarayıcıda oyna, keyfine bak.</span></div>
      </footer>

      <Dialog.Root open={Boolean(selectedGame)} onOpenChange={(open) => { if (!open) setSelectedGame(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          {selectedGame && (
            <Dialog.Content className="game-dialog" aria-describedby="game-description">
              <Dialog.Close className="dialog-close" aria-label="Önizlemeyi kapat"><X size={22} /></Dialog.Close>
              <div className="dialog-stage">
                <iframe
                  className="game-frame"
                  src={selectedGame.buildUrl}
                  title={selectedGame.title}
                  allow="fullscreen; gamepad"
                  allowFullScreen
                />
              </div>
              <div className="dialog-details">
                <div className="dialog-heading">
                  <div><span className="dialog-category">{selectedGame.category}</span><Dialog.Title>{selectedGame.title}</Dialog.Title></div>
                  {selectedGame.duration && <span className="dialog-rating"><Clock3 size={18} /> {selectedGame.duration}</span>}
                </div>
                <Dialog.Description id="game-description">{selectedGame.description}</Dialog.Description>
                <div className="controls-block"><span>KONTROLLER</span><div>{selectedGame.controls.map((control) => <kbd key={control}>{control}</kbd>)}</div></div>
                <p className="demo-note">Oyun portalın üzerinde iframe ile gömülü çalışır; yeni sekmede tam ekrana geçebilirsin.</p>
                <div className="dialog-actions">
                  <a className="primary-button" href={selectedGame.buildUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={18} /> Yeni sekmede tam ekran aç</a>
                  <button className={`dialog-favorite ${favorites.includes(selectedGame.id) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(selectedGame.id)} aria-pressed={favorites.includes(selectedGame.id)}><Heart size={18} fill={favorites.includes(selectedGame.id) ? 'currentColor' : 'none'} />{favorites.includes(selectedGame.id) ? 'Favorilerde' : 'Favorilere ekle'}</button>
                </div>
              </div>
            </Dialog.Content>
          )}
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
