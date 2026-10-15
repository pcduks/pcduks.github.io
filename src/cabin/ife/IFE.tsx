import { useEffect, useState } from 'react'
import { useCabin, type Screen } from '../store'
import { profile, projects, cabin, asset, type Leg, type Project } from '../../lib/content'
import { windowState } from '../scene/EarthScene'
import { regionName } from '../route'
import './ife.css'

export const channels: { id: Screen; label: string; sub: string; key: string }[] = [
  { id: 'map', label: 'Flight map', sub: 'Where the window is looking', key: '1' },
  { id: 'captain', label: "Captain's log", sub: 'Who is flying this thing', key: '2' },
  { id: 'log', label: 'Legs flown', sub: 'Seven legs, newest first', key: '3' },
  { id: 'films', label: 'Entertainment', sub: 'Things I built', key: '4' },
  { id: 'menu', label: 'Menu', sub: 'What I bring on board', key: '5' },
  { id: 'dutyfree', label: 'Duty free', sub: 'CV, LinkedIn, email', key: '6' },
  { id: 'safety', label: 'Safety', sub: 'Controls and comfort', key: '?' },
]

export default function IFE() {
  const screen = useCabin((s) => s.screen)
  const go = useCabin((s) => s.go)
  return (
    <div className="ife" role="application" aria-label="Seatback screen">
      <StatusBar />
      <div className="ife__body" key={screen}>
        {screen === 'home' && <Home />}
        {screen === 'map' && <FlightMap />}
        {screen === 'captain' && <Captain />}
        {screen === 'log' && <Log />}
        {screen === 'films' && <Films />}
        {screen === 'menu' && <Menu />}
        {screen === 'dutyfree' && <DutyFree />}
        {screen === 'safety' && <Safety />}
      </div>
      <nav className="ife__dock" aria-label="Channels">
        <button className={screen === 'home' ? 'is-active' : ''} onClick={() => go('home')}>
          Home
        </button>
        {channels.map((t) => (
          <button key={t.id} className={screen === t.id ? 'is-active' : ''} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function StatusBar() {
  const [now, setNow] = useState(() => new Date())
  const [where, setWhere] = useState('Night over the Strait of Malacca')
  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date())
      setWhere(`${windowState.sunUp ? 'Day' : 'Night'} over ${regionName(windowState.lat, windowState.lon)}`)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
  const sg = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit' })
  return (
    <header className="ife__status">
      <span className="ife__flight">PP 1990 · SIN</span>
      <span className="ife__where">{where}</span>
      <span className="ife__time">{sg} SGT · 38,000 ft</span>
    </header>
  )
}

/* ---------- Home ---------- */

function Home() {
  const go = useCabin((s) => s.go)
  return (
    <div className="ife__home">
      <section className="ife__hero">
        <p className="ife__kicker">Welcome aboard</p>
        <h1>{profile.name}</h1>
        <p className="ife__lede">{cabin.pitch}</p>
        <ul className="ife__proof">
          {cabin.proof.map((p) => (
            <li key={p.value}>
              <strong>{p.value}</strong>
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      </section>
      <div className="ife__tiles">
        {channels
          .filter((t) => t.id !== 'safety')
          .map((t) => (
            <button key={t.id} className={`ife__tile ife__tile--${t.id}`} onClick={() => go(t.id)}>
              <span className="ife__tile-label">{t.label}</span>
              <span className="ife__tile-sub">{t.sub}</span>
            </button>
          ))}
      </div>
    </div>
  )
}

/* ---------- Flight map ---------- */

function FlightMap() {
  const chapter = useCabin((s) => s.chapter)
  const setChapter = useCabin((s) => s.setChapter)
  const leg = chapter >= 0 ? profile.legs[chapter] : null
  return (
    <div className="ife__map">
      <div className="ife__map-list">
        <p className="ife__kicker">Flight path · newest first</p>
        <ol>
          {profile.legs.map((l, i) => (
            <li key={l.id}>
              <button className={chapter === i ? 'is-active' : ''} onClick={() => setChapter(i)}>
                <span className="ife__leg-num">{String(profile.legs.length - i).padStart(2, '0')}</span>
                <span className="ife__leg-main">
                  <span className="ife__leg-company">{l.company}</span>
                  <span className="ife__leg-title">{l.title}</span>
                </span>
                <span className="ife__leg-when">
                  {l.from}–{l.to}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button className={`ife__leg-idle ${chapter === -1 ? 'is-active' : ''}`} onClick={() => setChapter(-1)}>
          Let the plane fly the whole route
        </button>
      </div>
      <aside className="ife__map-detail">
        {leg ? (
          <>
            <p className="ife__kicker">
              Leg {String(profile.legs.length - chapter).padStart(2, '0')} · gate {leg.gate} · {leg.city}
            </p>
            <h2>{leg.title}</h2>
            <p className="ife__muted">{leg.company}</p>
            <p>{leg.summary}</p>
            {leg.highlights.slice(0, 2).map((h, i) => (
              <p key={i} className="ife__hl">
                {h}
              </p>
            ))}
            <p className="ife__hint">Look out of the window. ↑ ↓ change leg.</p>
          </>
        ) : (
          <>
            <p className="ife__kicker">Moving map</p>
            <h2>The window is the map</h2>
            <p>
              Pick a leg and the plane flies to where it happened. The Earth outside is lit by the real sun for the real
              time, so what you see depends on when you boarded.
            </p>
          </>
        )}
      </aside>
    </div>
  )
}

/* ---------- Captain's log ---------- */

function Captain() {
  return (
    <div className="ife__cols">
      <article>
        <p className="ife__kicker">Captain's log</p>
        <h2>About me</h2>
        {profile.intro.map((p, i) => (
          <p key={i} className={i === 0 ? 'ife__lede' : ''}>
            {p}
          </p>
        ))}
        <h3>{cabin.heading.title}</h3>
        <p>{cabin.heading.body}</p>
        <ul className="ife__principles">
          {cabin.heading.principles.map((p) => (
            <li key={p.title}>
              <strong>{p.title}</strong>
              <span>{p.body}</span>
            </li>
          ))}
        </ul>
      </article>
      <aside className="ife__side">
        <p className="ife__kicker">
          <span className="ife__pulse" /> In flight
        </p>
        <ul className="ife__now">
          {profile.now.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

/* ---------- Legs flown ---------- */

function Log() {
  const setChapter = useCabin((s) => s.setChapter)
  const chapter = useCabin((s) => s.chapter)
  return (
    <div className="ife__log">
      <p className="ife__kicker">Legs flown · newest first</p>
      {profile.legs.map((leg, i) => (
        <Pass key={leg.id} leg={leg} index={profile.legs.length - i} active={chapter === i} onSelect={() => setChapter(i)} />
      ))}
    </div>
  )
}

function Pass({ leg, index, active, onSelect }: { leg: Leg; index: number; active: boolean; onSelect: () => void }) {
  return (
    <article className={`ife__pass ${active ? 'is-active' : ''}`} onMouseEnter={onSelect} onFocus={onSelect}>
      <div className="ife__pass-stub">
        <span className="ife__pass-num">{String(index).padStart(2, '0')}</span>
        <span className="ife__pass-when">
          {leg.from}
          <br />
          {leg.to}
        </span>
        <span className="ife__pass-gate">Gate {leg.gate}</span>
      </div>
      <div className="ife__pass-body">
        <p className="ife__kicker">{leg.company}</p>
        <h3>{leg.title}</h3>
        <p className="ife__muted">✈ {leg.city}</p>
        <p>{leg.summary}</p>
        {leg.highlights.length > 0 && (
          <ul className="ife__bullets">
            {leg.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        )}
        <ul className="ife__chips">
          {leg.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </article>
  )
}

/* ---------- Entertainment ---------- */

function Films() {
  const film = useCabin((s) => s.film)
  const setFilm = useCabin((s) => s.setFilm)
  const open = projects.find((p) => p.repo === film)
  if (open) return <Film project={open} onBack={() => setFilm(null)} />
  return (
    <div>
      <p className="ife__kicker">Now showing</p>
      <h2>Things I build</h2>
      <p className="ife__muted ife__intro">
        I have a weakness for building the thing instead of the spreadsheet about the thing. Most of it is for family and
        friends, some of it is for me, all of it is more elaborate than it needs to be.
      </p>
      <ul className="ife__films">
        {projects.map((p) => (
          <li key={p.repo}>
            <button onClick={() => setFilm(p.repo)}>
              {p.image && <img src={asset(p.image)} alt="" loading="lazy" />}
              <span className="ife__film-meta">
                <span className="ife__film-code">{p.tag}</span>
                <span>{p.status}</span>
              </span>
              <span className="ife__film-title">{p.name}</span>
              <span className="ife__film-kicker">{p.kicker}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Film({ project, onBack }: { project: Project; onBack: () => void }) {
  const isPublic = project.status !== 'Private'
  return (
    <div className="ife__film">
      <button className="ife__back" onClick={onBack}>
        ← All titles
      </button>
      <div className="ife__film-grid">
        {project.image && <img src={asset(project.image)} alt="" />}
        <div>
          <p className="ife__kicker">
            {project.tag} · {project.status} · {project.year}
          </p>
          <h2>{project.name}</h2>
          <p className="ife__film-kicker">{project.kicker}</p>
          <p>{project.description}</p>
          <ul className="ife__chips">
            {project.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {isPublic ? (
            <a className="ife__link" href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer">
              View on GitHub →
            </a>
          ) : (
            <p className="ife__muted">Private repository. Ask me about it.</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Menu ---------- */

function Menu() {
  const t = profile.toolkit
  const courses = [
    { name: 'Starters · Building', items: t.building },
    { name: 'Mains · Leading', items: t.leading },
    { name: 'Dessert · Certified in', items: t.certifications },
  ]
  return (
    <div className="ife__menu">
      <p className="ife__kicker">Menu</p>
      <h2>What I bring on board</h2>
      <div className="ife__courses">
        {courses.map((c) => (
          <section key={c.name}>
            <h3>{c.name}</h3>
            <ul>
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="ife__muted ife__note">
        {cabin.menu.note} Languages: {t.languages.join(', ')}.
      </p>
    </div>
  )
}

/* ---------- Duty free ---------- */

function DutyFree() {
  return (
    <div className="ife__duty">
      <p className="ife__kicker">Duty free</p>
      <h2>Say olá</h2>
      <p className="ife__lede">
        Happy to talk about agentic systems that do real work, go-to-market in Asia, or where to eat in Tokyo in December.
        The fastest route is email.
      </p>
      <ul className="ife__shop">
        {__CV_AVAILABLE__ && (
          <li>
            <a href={asset(profile.cv.file)} download>
              <strong>CV</strong>
              <span>PDF, two pages, no phone number</span>
            </a>
          </li>
        )}
        {profile.links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target={l.href.startsWith('mailto') ? undefined : '_blank'} rel="noreferrer">
              <strong>{l.label}</strong>
              <span>{l.href.replace('mailto:', '').replace('https://', '')}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Safety ---------- */

function Safety() {
  const s = useCabin()
  return (
    <div className="ife__safety">
      <p className="ife__kicker">Safety card</p>
      <h2>Controls and comfort</h2>
      <div className="ife__cols">
        <section>
          <h3>Keys</h3>
          <dl className="ife__keys">
            <dt>
              <kbd>←</kbd> <kbd>→</kbd>
            </dt>
            <dd>Change channel</dd>
            <dt>
              <kbd>↑</kbd> <kbd>↓</kbd>
            </dt>
            <dd>Previous or next leg of the route</dd>
            <dt>
              <kbd>1</kbd>–<kbd>6</kbd>
            </dt>
            <dd>Jump to a channel</dd>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Sit back (home, cabin view)</dd>
            <dt>
              <kbd>L</kbd>
            </dt>
            <dd>Reading light</dd>
            <dt>
              <kbd>W</kbd>
            </dt>
            <dd>Window shade</dd>
            <dt>
              <kbd>M</kbd>
            </dt>
            <dd>Sound on or off</dd>
          </dl>
        </section>
        <section>
          <h3>Cabin</h3>
          <label className="ife__switch">
            <input type="checkbox" checked={s.soundOn} onChange={(e) => s.setSound(e.target.checked)} /> Sound
          </label>
          <label className="ife__switch">
            <input type="checkbox" checked={s.musicOn} onChange={(e) => s.setMusic(e.target.checked)} /> Music
          </label>
          <label className="ife__switch">
            <input type="checkbox" checked={s.voiceOn} onChange={(e) => s.setVoice(e.target.checked)} /> Captain's announcements
          </label>
          <label className="ife__switch">
            <input type="checkbox" checked={s.readingLight} onChange={() => s.toggleLight()} /> Reading light
          </label>
          <label className="ife__switch">
            <input type="checkbox" checked={s.shade > 0.5} onChange={(e) => s.setShade(e.target.checked ? 1 : 0)} /> Window shade
          </label>
          <p className="ife__muted ife__note">
            Prefer a plain page? <a href="?static">Open the static version</a>. It has everything, minus the seat.
          </p>
        </section>
      </div>
    </div>
  )
}
