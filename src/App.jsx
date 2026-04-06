import { useEffect, useMemo, useState } from 'react'
import './App.css'

const defaultCategories = ['Wohnung', 'Nebenkosten', 'Energie', 'Telekommunikation']

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const defaultEntries = [
  {
    id: createId(),
    category: 'Wohnung',
    name: 'Kaltmiete',
    amount: 950,
    interval: 'monthly',
    partner: 'Vermieter',
    website: 'https://example.com',
    startDate: '2025-01-01',
    endDate: '',
    noticeMonths: 3,
    notes: 'Monatlich zum 1. fällig',
    entryType: 'shared',
  },
  {
    id: createId(),
    category: 'Nebenkosten',
    name: 'Nebenkosten',
    amount: 220,
    interval: 'monthly',
    partner: 'Hausverwaltung',
    website: 'https://example.com',
    startDate: '2025-01-01',
    endDate: '',
    noticeMonths: 0,
    notes: 'Vorauszahlung',
    entryType: 'shared',
  },
  {
    id: createId(),
    category: 'Energie',
    name: 'Strom',
    amount: 89,
    interval: 'monthly',
    partner: 'Stromanbieter',
    website: 'https://example.com',
    startDate: '2025-02-01',
    endDate: '2027-01-31',
    noticeMonths: 1,
    notes: '',
    entryType: 'shared',
  },
  {
    id: createId(),
    category: 'Energie',
    name: 'Gas',
    amount: 76,
    interval: 'monthly',
    partner: 'Gasanbieter',
    website: 'https://example.com',
    startDate: '2025-02-01',
    endDate: '2026-12-31',
    noticeMonths: 1,
    notes: '',
    entryType: 'shared',
  },
  {
    id: createId(),
    category: 'Telekommunikation',
    name: 'Internet',
    amount: 44.99,
    interval: 'monthly',
    partner: 'Provider',
    website: 'https://example.com',
    startDate: '2025-03-01',
    endDate: '2027-02-28',
    noticeMonths: 3,
    notes: 'Glasfaser 250 Mbit',
    entryType: 'shared',
  },
]

const emptyForm = {
  category: 'Wohnung',
  name: '',
  amount: '',
  interval: 'monthly',
  partner: '',
  website: '',
  startDate: '',
  endDate: '',
  noticeMonths: 0,
  notes: '',
  entryType: 'shared',
}

const intervalLabels = {
  monthly: 'monatlich',
  quarterly: 'vierteljährlich',
  yearly: 'jährlich',
  oneTime: 'einmalig',
}

const currency = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
})

function toMonthlyAmount(amount, interval) {
  if (interval === 'yearly') return amount / 12
  if (interval === 'quarterly') return amount / 3
  if (interval === 'oneTime') return 0
  return amount
}

function toYearlyAmount(amount, interval) {
  if (interval === 'monthly') return amount * 12
  if (interval === 'quarterly') return amount * 4
  if (interval === 'oneTime') return amount
  return amount
}

function formatDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('de-DE').format(new Date(value))
}

function getCancellationDate(endDate, noticeMonths) {
  if (!endDate || noticeMonths === '') return null
  const date = new Date(endDate)
  date.setMonth(date.getMonth() - Number(noticeMonths || 0))
  return date
}

function getContractStatus(endDate) {
  if (!endDate) return { label: 'Laufend', tone: 'neutral' }
  const now = new Date()
  const end = new Date(endDate)
  const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Abgelaufen', tone: 'danger' }
  if (diffDays <= 60) return { label: `Endet in ${diffDays} Tagen`, tone: 'warn' }
  return { label: 'Aktiv', tone: 'success' }
}

function mergeCategories(...lists) {
  return Array.from(new Set(lists.flat().filter(Boolean)))
}

function App() {
  const [entries, setEntries] = useState([])
  const [categories, setCategories] = useState(defaultCategories)
  const [form, setForm] = useState({ ...emptyForm, category: defaultCategories[0] })
  const [editingId, setEditingId] = useState(null)
  const [selectedCategories, setSelectedCategories] = useState(defaultCategories)
  const [selectedEntryType, setSelectedEntryType] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [manageCategories, setManageCategories] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/state', { cache: 'no-store' })
        const data = await res.json()
        const nextEntries = Array.isArray(data.entries) ? data.entries : defaultEntries
        const nextCategories = mergeCategories(defaultCategories, data.categories || [], nextEntries.map((entry) => entry.category))
        setEntries(nextEntries)
        setCategories(nextCategories)
        setSelectedCategories(nextCategories)
        setForm((current) => ({ ...current, category: nextCategories[0] || 'Wohnung' }))
      } catch {
        setEntries(defaultEntries)
        setCategories(defaultCategories)
        setSelectedCategories(defaultCategories)
      } finally {
        setLoaded(true)
      }
    }

    loadState()
  }, [])

  useEffect(() => {
    if (!loaded) return

    const syncedCategories = mergeCategories(defaultCategories, categories, entries.map((entry) => entry.category))

    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries,
        categories: syncedCategories,
      }),
    }).catch(() => {})
  }, [entries, categories, loaded])

  const filteredEntries = useMemo(() => {
    if (!selectedCategories.length) return []
    return entries.filter((entry) => {
      const categoryMatch = selectedCategories.includes(entry.category)
      const typeMatch = selectedEntryType === 'all' || entry.entryType === selectedEntryType
      return categoryMatch && typeMatch
    })
  }, [entries, selectedCategories, selectedEntryType])

  const summary = useMemo(() => {
    const monthly = filteredEntries.reduce((sum, entry) => sum + toMonthlyAmount(entry.amount, entry.interval), 0)
    const yearly = filteredEntries.reduce((sum, entry) => sum + toYearlyAmount(entry.amount, entry.interval), 0)
    const activeContracts = filteredEntries.filter(
      (entry) => !entry.endDate || new Date(entry.endDate) >= new Date(),
    ).length
    return { monthly, yearly, activeContracts }
  }, [filteredEntries])

  const byCategory = useMemo(() => {
    return categories
      .map((category) => {
        const monthly = filteredEntries
          .filter((entry) => entry.category === category)
          .reduce((sum, entry) => sum + toMonthlyAmount(entry.amount, entry.interval), 0)
        return [category, monthly]
      })
      .filter(([, monthly]) => monthly > 0)
  }, [categories, filteredEntries])

  function handleChange(event) {
    const { name, value } = event.target

    if (name === 'category' && value === '__new__') {
      setShowNewCategoryInput(true)
      return
    }

    setForm((current) => ({ ...current, [name]: name === 'noticeMonths' ? Number(value) : value }))
  }

  function resetForm() {
    setForm({ ...emptyForm, category: categories[0] || 'Wohnung' })
    setEditingId(null)
    setFormOpen(false)
    setNewCategory('')
    setShowNewCategoryInput(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextEntry = {
      ...form,
      amount: Number(form.amount),
      id: editingId || createId(),
    }

    if (!categories.includes(nextEntry.category)) {
      const nextCategories = [...categories, nextEntry.category]
      setCategories(nextCategories)
      setSelectedCategories(nextCategories)
    }

    if (editingId) {
      setEntries((current) => current.map((entry) => (entry.id === editingId ? nextEntry : entry)))
    } else {
      setEntries((current) => [nextEntry, ...current])
    }

    resetForm()
  }

  function handleEdit(entry) {
    setEditingId(entry.id)
    setForm({ ...entry })
    setFormOpen(true)
    setShowNewCategoryInput(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDelete(id) {
    const entry = entries.find((item) => item.id === id)
    const label = entry?.name ? `„${entry.name}“` : 'diesen Eintrag'
    const confirmed = window.confirm(`${label} wirklich löschen?`)
    if (!confirmed) return

    setEntries((current) => current.filter((entry) => entry.id !== id))
    if (editingId === id) resetForm()
  }

  function toggleCategory(category) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    )
  }

  function selectAllCategories() {
    setSelectedCategories(categories)
  }

  function addCategory() {
    const value = newCategory.trim()
    if (!value) return
    if (categories.includes(value)) {
      setFormOpen(true)
      setForm((current) => ({ ...current, category: value }))
      setNewCategory('')
      setShowNewCategoryInput(false)
      return
    }

    const nextCategories = [...categories, value]
    setCategories(nextCategories)
    setSelectedCategories(nextCategories)
    setFormOpen(true)
    setForm((current) => ({ ...current, category: value }))
    setNewCategory('')
    setShowNewCategoryInput(false)
  }

  function removeCategory(categoryToRemove) {
    if (defaultCategories.includes(categoryToRemove)) return
    if (entries.some((entry) => entry.category === categoryToRemove)) return

    const confirmed = window.confirm(`Kategorie „${categoryToRemove}“ wirklich entfernen?`)
    if (!confirmed) return

    const nextCategories = categories.filter((category) => category !== categoryToRemove)
    setCategories(nextCategories)
    setSelectedCategories((current) => current.filter((category) => category !== categoryToRemove))

    if (form.category === categoryToRemove) {
      setForm((current) => ({ ...current, category: nextCategories[0] || defaultCategories[0] }))
    }
  }

  function clearCategories() {
    setSelectedCategories([])
  }

  function selectHousingPreset() {
    setSelectedCategories(['Wohnung', 'Nebenkosten', 'Energie'])
  }

  function selectEnergyPreset() {
    setSelectedCategories(['Energie'])
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Kostenüberblick</p>
          <h1>Wohnen, Energie und Telekommunikation auf einen Blick</h1>
          <p className="hero-text">
            Minimal gehalten, schnell erfassbar und flexibel nach Kategorien filterbar.
          </p>
        </div>
        <div className="summary-grid">
          <article className="summary-card accent">
            <span>Monatlich</span>
            <strong>{currency.format(summary.monthly)}</strong>
          </article>
          <article className="summary-card">
            <span>Jährlich</span>
            <strong>{currency.format(summary.yearly)}</strong>
          </article>
          <article className="summary-card">
            <span>Gefilterte Verträge</span>
            <strong>{summary.activeContracts}</strong>
          </article>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel control-panel">
          <div className="control-block">
            <div className="panel-head">
              <div>
                <h2>Ansicht</h2>
                <p className="muted">Wähle nur die Bereiche aus, die du gerade sehen willst.</p>
              </div>
              <div className="quick-actions">
                <button className="ghost-button" type="button" onClick={selectAllCategories}>
                  Alle
                </button>
                <button className="ghost-button" type="button" onClick={clearCategories}>
                  Keine
                </button>
                <button className="ghost-button" type="button" onClick={selectHousingPreset}>
                  Wohnen
                </button>
                <button className="ghost-button" type="button" onClick={selectEnergyPreset}>
                  Nur Energie
                </button>
                <button
                  className={`icon-button ${manageCategories ? 'active-toggle' : ''}`}
                  type="button"
                  onClick={() => setManageCategories((current) => !current)}
                  aria-label={manageCategories ? 'Kategorieverwaltung beenden' : 'Kategorien verwalten'}
                  title={manageCategories ? 'Fertig' : 'Kategorien verwalten'}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="gear-icon">
                    <path
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35A1.724 1.724 0 0 0 5.38 7.752c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.065Z"
                      fill="currentColor"
                    />
                    <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" fill="#f5f5f7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="filter-chips category-chip-list">
              {categories.map((category) => {
                const active = selectedCategories.includes(category)
                const removable = !defaultCategories.includes(category)
                const used = entries.some((entry) => entry.category === category)

                return (
                  <div key={category} className={`chip-wrap ${active ? 'active' : ''}`}>
                    <button
                      type="button"
                      className={`chip ${active ? 'active' : ''}`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                    </button>
                    {manageCategories && removable && (
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => removeCategory(category)}
                        title={used ? 'Kategorie kann erst gelöscht werden, wenn keine Einträge mehr zugeordnet sind' : 'Kategorie entfernen'}
                        disabled={used}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {manageCategories && (
              <p className="manage-hint">
                Eigene Kategorien lassen sich nur löschen, wenn ihnen keine Einträge mehr zugeordnet sind.
              </p>
            )}
          </div>

          <div className="control-block">
            <div className="panel-head">
              <h2>Typ</h2>
            </div>
            <div className="filter-chips">
              <button
                type="button"
                className={`chip ${selectedEntryType === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedEntryType('all')}
              >
                Alle
              </button>
              <button
                type="button"
                className={`chip ${selectedEntryType === 'shared' ? 'active' : ''}`}
                onClick={() => setSelectedEntryType('shared')}
              >
                Geteilt
              </button>
              <button
                type="button"
                className={`chip ${selectedEntryType === 'personal' ? 'active' : ''}`}
                onClick={() => setSelectedEntryType('personal')}
              >
                Persönlich
              </button>
            </div>
          </div>

          <div className="control-block form-block">
            <div className="panel-head">
              <h2>{editingId ? 'Eintrag bearbeiten' : 'Eintrag hinzufügen'}</h2>
              <div className="right-actions">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setFormOpen((current) => !current)}
                  aria-label={formOpen ? 'Eintragsformular ausblenden' : 'Eintragsformular einblenden'}
                  title={formOpen ? 'Formular ausblenden' : 'Formular einblenden'}
                >
                  {formOpen ? '−' : '+'}
                </button>
                {editingId && (
                  <button className="ghost-button" type="button" onClick={resetForm}>
                    Abbrechen
                  </button>
                )}
              </div>
            </div>

            {formOpen && <form className="entry-form" onSubmit={handleSubmit}>
              <label className="full-width">
                Kategorie
                <div className="category-picker">
                  <select name="category" value={showNewCategoryInput ? '__new__' : form.category} onChange={handleChange}>
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                    <option value="__new__">+ Neue Kategorie…</option>
                  </select>

                  {showNewCategoryInput && (
                    <div className="add-category-row inline">
                      <input
                        value={newCategory}
                        onChange={(event) => setNewCategory(event.target.value)}
                        placeholder="Neue Kategorie"
                      />
                      <button className="ghost-button" type="button" onClick={addCategory}>
                        Hinzufügen
                      </button>
                      <button
                        className="ghost-button"
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false)
                          setNewCategory('')
                        }}
                      >
                        Abbrechen
                      </button>
                    </div>
                  )}
                </div>
              </label>

              <label>
                Bezeichnung
                <input name="name" value={form.name} onChange={handleChange} placeholder="z. B. Strom" required />
              </label>

              <label>
                Betrag in EUR
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                />
              </label>

              <label>
                Intervall
                <select name="interval" value={form.interval} onChange={handleChange}>
                  <option value="monthly">Monatlich</option>
                  <option value="quarterly">Vierteljährlich</option>
                  <option value="yearly">Jährlich</option>
                  <option value="oneTime">Einmalig</option>
                </select>
              </label>

              <label>
                Art
                <select name="entryType" value={form.entryType} onChange={handleChange}>
                  <option value="shared">Geteilt</option>
                  <option value="personal">Persönlich</option>
                </select>
              </label>

              <label>
                Vertragspartner
                <input name="partner" value={form.partner} onChange={handleChange} placeholder="z. B. Vattenfall" />
              </label>

              <label>
                Website
                <input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://..." />
              </label>

              <label>
                Vertragsbeginn
                <input name="startDate" type="date" value={form.startDate} onChange={handleChange} />
              </label>

              <label>
                Vertragsende
                <input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
              </label>

              <label>
                Kündigungsfrist (Monate)
                <input
                  name="noticeMonths"
                  type="number"
                  min="0"
                  step="1"
                  value={form.noticeMonths}
                  onChange={handleChange}
                />
              </label>

              <label className="full-width">
                Notizen
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="3" placeholder="Optionale Details" />
              </label>

              <button className="primary-button full-width" type="submit">
                {editingId ? 'Änderungen speichern' : 'Eintrag hinzufügen'}
              </button>
            </form>}
          </div>
        </section>

        <section className="panel insights-panel">
          <h2>Summen nach Auswahl</h2>
          <div className="category-list">
            {byCategory.length ? (
              byCategory.map(([category, monthly]) => (
                <div key={category} className="category-row">
                  <span>{category}</span>
                  <strong>{currency.format(monthly)} / Monat</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">Keine Kategorien ausgewählt.</div>
            )}
          </div>
        </section>

        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Verträge</h2>
            <span>{filteredEntries.length} Einträge</span>
          </div>

          <div className="cards">
            {filteredEntries.length ? (
              filteredEntries.map((entry) => {
                const cancellationDate = getCancellationDate(entry.endDate, entry.noticeMonths)
                const status = getContractStatus(entry.endDate)

                return (
                  <article key={entry.id} className="contract-card">
                    <div className="card-top">
                      <div>
                        <div className="tags-row">
                          <span className="category-tag">{entry.category}</span>
                          {entry.entryType === 'personal' && <span className="type-tag personal">Persönlich</span>}
                          {entry.entryType === 'shared' && <span className="type-tag shared">Geteilt</span>}
                        </div>
                        <h3>{entry.name}</h3>
                      </div>
                      <div className={`status-pill ${status.tone}`}>{status.label}</div>
                    </div>

                    <div className="amount-row">
                      <strong>{currency.format(entry.amount)}</strong>
                      <span>{intervalLabels[entry.interval]}</span>
                    </div>

                    <dl className="meta-grid">
                      <div>
                        <dt>Partner</dt>
                        <dd>{entry.partner || '—'}</dd>
                      </div>
                      <div>
                        <dt>Website</dt>
                        <dd>
                          {entry.website ? (
                            <a href={entry.website} target="_blank" rel="noreferrer">
                              Öffnen
                            </a>
                          ) : (
                            '—'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Beginn</dt>
                        <dd>{formatDate(entry.startDate)}</dd>
                      </div>
                      <div>
                        <dt>Ende</dt>
                        <dd>{formatDate(entry.endDate)}</dd>
                      </div>
                      <div>
                        <dt>Kündigen bis</dt>
                        <dd>{cancellationDate ? formatDate(cancellationDate) : '—'}</dd>
                      </div>
                      <div>
                        <dt>Jahreswert</dt>
                        <dd>{currency.format(toYearlyAmount(entry.amount, entry.interval))}</dd>
                      </div>
                    </dl>

                    {entry.notes && <p className="notes">{entry.notes}</p>}

                    <div className="card-actions">
                      <button className="ghost-button" type="button" onClick={() => handleEdit(entry)}>
                        Bearbeiten
                      </button>
                      <button className="ghost-button danger" type="button" onClick={() => handleDelete(entry.id)}>
                        Löschen
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty-state large">Für diese Auswahl gibt es aktuell keine Einträge.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
