import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { adToBs, bsToAd, formatBS, MIN_AD_DATE, MAX_AD_DATE, type BSDate, type Locale } from '@coder-safal/bs-calendar';
import { useBSCalendar } from '@coder-safal/bs-calendar/react';
import './style.css';

// A date-only value, computed once for this browser-only demo.
const today = adToBs(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()));

function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [restricted, setRestricted] = useState(false);
  const [selected, setSelected] = useState<BSDate | null>(today);
  const [adInput, setAdInput] = useState(bsToAd(today).toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const calendar = useBSCalendar({
    value: selected, onChange: setSelected, locale, today,
    ...(restricted ? { min: { year: today.year, month: 1, day: 1 }, max: { year: today.year, month: 12, day: 30 }, disabledDates: (date: BSDate) => bsToAd(date).getUTCDay() === 6 } : {}),
  });
  const adLabel = selected ? bsToAd(selected).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Choose a date';

  function convert() {
    try { setSelected(adToBs(adInput)); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Invalid date'); }
  }

  return <>
    <header className="site-header"><a className="brand" href="#"><span className="brand-mark" aria-hidden="true">बि.</span> bs-calendar <span className="version">v0.1</span></a><a className="header-link" href="#get-started">Built for your next idea <span aria-hidden="true">↗</span></a></header>
    <main>
      <section className="hero"><div className="eyebrow"><span className="status-dot" /> BIKRAM SAMBAT, MEET REACT</div><h1>A familiar date.<br /><span>A fresh start.</span></h1><p>A little closer to home. An accessible, headless Nepali<br className="desktop-break" /> calendar that fits right into what you’re building.</p><a className="install" href="#get-started"><span className="prompt">$</span> npm i @coder-safal/bs-calendar <span className="install-arrow" aria-hidden="true">↗</span></a><div className="hero-details">TypeScript native <span>·</span> Zero runtime dependencies <span>·</span> MIT licensed</div></section>
      <section className="playground" aria-labelledby="playground-title">
        <div className="section-heading"><div><span className="eyebrow">01 / THE PLAYGROUND</span><h2 id="playground-title">Make yourself at home.</h2></div><p>Same dates. Your way.</p></div>
        <div className="demo-layout">
          <div className="calendar-panel">
            <div className="calendar-toolbar"><span className="panel-label">YOUR CALENDAR</span><div className="locale-toggle" aria-label="Calendar language"><button aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button><button lang="ne" aria-pressed={locale === 'ne'} onClick={() => setLocale('ne')}>नेपाली</button></div></div>
            <div className="month-navigation"><h3 aria-live="polite">{calendar.monthLabel}</h3><div><button {...calendar.getPreviousMonthProps()} className="nav-button">←</button><button {...calendar.getNextMonthProps()} className="nav-button">→</button></div></div>
            <div {...calendar.getGridProps()} className="calendar-grid">
              <div role="row" className="calendar-week weekday-row">{calendar.weekdays.map(day => <span role="columnheader" aria-label={day.fullLabel} key={day.weekday}>{day.label}</span>)}</div>
              {calendar.weeks.map((week, index) => <div role="row" className="calendar-week" key={index}>{week.map((day, col) => day ? <button {...calendar.getDayProps(day)} key={day.key} className="day">{day.label}</button> : <span role="gridcell" aria-disabled="true" key={col} />)}</div>)}
            </div>
            <div className="calendar-footer"><span><i className="today-dot" /> {locale === 'ne' ? 'आज' : 'Today'}</span><button className="text-button" onClick={() => calendar.goToMonth(today)}>{locale === 'ne' ? 'आजको महिनामा जानुहोस्' : 'Back to this month'} ↗</button></div>
          </div>
          <aside className="details-panel">
            <div className="selected-block"><span className="panel-label">A DATE IN TWO WORLDS</span><h3 aria-live="polite">{selected ? formatBS(selected, { locale }) : 'Select a date'}</h3><p>{adLabel}</p><span className="small-badge">BS ⇄ AD</span></div>
            <div className="options-block"><span className="panel-label">TRY THE DETAILS</span><label className="restriction"><span>Limit dates & disable Saturdays<small>Only this BS year is selectable</small></span><input type="checkbox" checked={restricted} onChange={event => setRestricted(event.target.checked)} /></label><div className="keyboard-hint"><span aria-hidden="true">⌨</span><p>Take the keyboard route.<br /><small>Arrow keys to explore. Enter to select.<br />Page Up / Down to change months.</small></p></div></div>
            <div className="converter"><label className="panel-label" htmlFor="ad-input">OR, START WITH AN AD DATE</label><div className="input-row"><input id="ad-input" type="date" min={MIN_AD_DATE} max={MAX_AD_DATE} value={adInput} onChange={event => { setAdInput(event.target.value); setError(''); }} aria-describedby={error ? 'conversion-error' : undefined} aria-invalid={!!error} /><button onClick={convert} aria-label="Convert AD date to BS">→</button></div>{error && <p id="conversion-error" role="alert" className="error">{error}</p>}</div>
          </aside>
        </div>
        <p className="demo-caption"><span aria-hidden="true">✳</span> This is just one look. The hook is headless. Every pixel is yours.</p>
      </section>
      <section className="features" aria-label="Package features"><article><span className="feature-number">01</span><h3>Your styles. Your rules.</h3><p>Bring Tailwind, your design system, or a little plain CSS. We handle the calendar.</p></article><article><span className="feature-number">02</span><h3>Everyone’s invited.</h3><p>Keyboard navigation, screen reader labels, and English or Nepali. Built in from day one.</p></article><article><span className="feature-number">03</span><h3>Small by intention.</h3><p>Pure conversion utilities. Typed date objects. No heavyweight date library along for the ride.</p></article></section>
      <section className="getting-started" id="get-started"><div><span className="eyebrow">02 / A FEW LINES AWAY</span><h2>Your next project,<br />a little more Nepali.</h2><p>Start with the core. Add the hook when you need it.</p></div><div className="code-card"><div className="code-title"><span>your-next-idea.ts</span><span>TypeScript</span></div><pre><code>{`import { adToBs, formatBS }\n  from '@coder-safal/bs-calendar';\n\nconst date = adToBs('2025-04-14');\n\nformatBS(date, { locale: 'ne' });\n// → २०८२ वैशाख १`}</code></pre></div></section>
    </main><footer><span className="brand">bs-calendar <span className="version">v0.1</span></span><span>Made with care, for the dates we call home.</span><a href="#">Back to top ↑</a></footer>
  </>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
