import { useEffect, useMemo, useState } from 'react'
import { Search, PlusCircle, LogIn, LogOut, PackageSearch, MapPin, CalendarDays, ShieldCheck, X, CheckCircle2 } from 'lucide-react'


const API = (import.meta.env.VITE_API_URL || 'https://campusfind-found.onrender.com/api').replace(/\/$/, '')
async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { message: text } }
  if (!res.ok) throw new Error(data.message || data.error || `Request failed (${res.status})`)
  return data
}
const blankItem = { itemName: '', description: '', category: 'Electronics', location: '', itemDate: new Date().toISOString().slice(0,10), type: 'LOST', imageUrl: '' }

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('cf-user')) } catch { return null }
  })
  const [items, setItems] = useState([])
  const [claims, setClaims] = useState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState('home')
  const [authMode, setAuthMode] = useState('login')
  const [auth, setAuth] = useState({ name: '', email: '', password: '' })
  const [itemForm, setItemForm] = useState(blankItem)
  const [claimText, setClaimText] = useState('')
  const [claimItem, setClaimItem] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadItems() {
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      setItems(await request(`/items?${params.toString()}`))
    } catch (e) { setError(`Cannot connect to backend: ${e.message}. Check that Spring Boot is running on port 8081.`) }
  }
  async function loadClaims() {
    try { setClaims(await request('/claims')) } catch (e) { setError(e.message) }
  }
  useEffect(() => { loadItems() }, [query, typeFilter])
  useEffect(() => { if (user?.role === 'ADMIN') loadClaims() }, [user])

  function flash(text) { setMessage(text); setError(''); setTimeout(() => setMessage(''), 3500) }
  function fail(e) { setError(e.message || 'Something went wrong'); setMessage('') }

  async function submitAuth(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register'
      const result = await request(path, { method: 'POST', body: JSON.stringify(auth) })
      setUser(result); sessionStorage.setItem('cf-user', JSON.stringify(result))
      setPage(result.role === 'ADMIN' ? 'admin' : 'home')
      flash(authMode === 'login' ? 'Welcome back!' : 'Account created successfully!')
      setAuth({ name: '', email: '', password: '' })
    } catch (e) { fail(e) } finally { setLoading(false) }
  }
  function logout() { setUser(null); sessionStorage.removeItem('cf-user'); setPage('home'); flash('You have signed out.') }

  async function submitItem(e) {
    e.preventDefault()
    try {
      await request('/items', { method: 'POST', body: JSON.stringify({ ...itemForm, reporterEmail: user.email }) })
      setItemForm(blankItem); setPage('home'); await loadItems(); flash('Your item report was submitted.')
    } catch (e) { fail(e) }
  }
  async function submitClaim(e) {
    e.preventDefault()
    try {
      await request('/claims', { method: 'POST', body: JSON.stringify({ itemId: claimItem.id, claimantEmail: user.email, explanation: claimText }) })
      setClaimItem(null); setClaimText(''); flash('Claim submitted. The administrator can review it.')
    } catch (e) { fail(e) }
  }
  async function updateClaim(id, status) {
    try { await request(`/claims/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }); await loadClaims(); await loadItems(); flash(`Claim ${status.toLowerCase()}.`) }
    catch (e) { fail(e) }
  }
  async function updateStatus(id, status) {
    try { await request(`/items/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); await loadItems(); flash('Item status updated.') }
    catch (e) { fail(e) }
  }

  const stats = useMemo(() => ({
    total: items.length,
    lost: items.filter(i => i.type === 'LOST').length,
    found: items.filter(i => i.type === 'FOUND').length
  }), [items])

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setPage('home')}><span className="brand-icon"><PackageSearch size={23}/></span>CampusFind</button>
      <nav>
        <button className={page === 'home' ? 'nav-active' : ''} onClick={() => setPage('home')}>Home</button>
        {user && <button onClick={() => setPage('report')}>Report Item</button>}
        {user?.role === 'ADMIN' && <button onClick={() => { setPage('admin'); loadClaims() }}>Admin Panel</button>}
        {!user ? <button className="nav-cta" onClick={() => { setAuthMode('login'); setPage('auth') }}><LogIn size={16}/> Sign in</button>
          : <button className="nav-cta" onClick={logout}><LogOut size={16}/> Sign out</button>}
      </nav>
    </header>

    <main>
      {message && <div className="notice success"><CheckCircle2 size={18}/>{message}<button onClick={() => setMessage('')}><X size={16}/></button></div>}
      {error && <div className="notice error">{error}<button onClick={() => setError('')}><X size={16}/></button></div>}

      {page === 'home' && <>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow"><span className="dot"></span> YOUR CAMPUS, CONNECTED</div>
            <h1>Lost something?<br/><span>Let's find it.</span></h1>
            <p>A simple, trusted place for students and staff to report lost items and return found belongings.</p>
            <div className="hero-actions"><button className="primary" onClick={() => { if (!user) { setPage('auth'); setAuthMode('login') } else setPage('report') }}><PlusCircle size={18}/> Report an item</button><button className="secondary" onClick={() => document.getElementById('browse')?.scrollIntoView({ behavior: 'smooth' })}>Browse listings</button></div>
          </div>
          <div className="hero-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="hero-circle"><PackageSearch size={92} strokeWidth={1.25}/></div><div className="float-card float-one"> <span className="float-emoji">🎒</span><span><b>Found it!</b><small>Backpack · Library</small></span></div><div className="float-card float-two"><span className="float-emoji">🔑</span><span><b>Lost item</b><small>Keys · Block C</small></span></div></div>
        </section>
        <section className="stats">
          <div><strong>{stats.total}</strong><span>Active listings</span></div><div><strong>{stats.lost}</strong><span>Items reported lost</span></div><div><strong>{stats.found}</strong><span>Items found</span></div><div><strong>24/7</strong><span>Online access</span></div>
        </section>
        <section id="browse" className="listing-section">
          <div className="section-heading"><div><div className="eyebrow">COMMUNITY LISTINGS</div><h2>Find what you're looking for</h2><p>Search recent lost and found reports from around campus.</p></div></div>
          <div className="filters"><div className="searchbox"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search item name or description..."/></div><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="ALL">All reports</option><option value="LOST">Lost items</option><option value="FOUND">Found items</option></select></div>
          <div className="item-grid">
            {items.map(item => <article className="item-card" key={item.id}><div className="item-visual">{item.imageUrl ? <img src={item.imageUrl} alt={item.itemName}/> : <span>{item.type === 'LOST' ? '🔎' : '🎁'}</span>}<label className={item.type === 'LOST' ? 'tag lost' : 'tag found'}>{item.type}</label></div><div className="item-body"><div className="item-category">{item.category || 'Other'}</div><h3>{item.itemName}</h3><p>{item.description || 'No description provided.'}</p><div className="item-meta"><span><MapPin size={15}/>{item.location || 'Campus'}</span><span><CalendarDays size={15}/>{item.itemDate || 'Date not set'}</span></div><div className="card-bottom"><span className={`status status-${(item.status || '').toLowerCase()}`}>{item.status}</span>{user && user.email.toLowerCase() !== (item.reporterEmail || '').toLowerCase() && item.status !== 'RETURNED' && <button className="text-btn" onClick={() => { setClaimItem(item); setPage('claim') }}>Claim item ↗</button>}{user?.role === 'ADMIN' && <select aria-label="Update item status" value={item.status} onChange={e => updateStatus(item.id, e.target.value)}><option>LOST</option><option>FOUND</option><option>CLAIMED</option><option>RETURNED</option></select>}</div></div></article>)}
            {!items.length && <div className="empty"><PackageSearch size={40}/><h3>No listings found</h3><p>Try another search, or report an item to get started.</p></div>}
          </div>
        </section>
        <section className="bottom-cta"><div><h2>Found something on campus?</h2><p>Help someone get their belongings back. Every report makes a difference.</p></div><button className="primary" onClick={() => { if (user) setPage('report'); else { setPage('auth'); setAuthMode('login') } }}><PlusCircle size={18}/> Create a report</button></section>
      </>}

      {page === 'auth' && <section className="auth-layout"><div className="auth-aside"><div className="eyebrow">WELCOME TO CAMPUSFIND</div><h1>{authMode === 'login' ? 'Good to see you again.' : 'Join your campus community.'}</h1><p>Sign in to report belongings, submit claims, and help bring lost items home.</p><div className="auth-feature"><ShieldCheck/> A safer, more organized campus</div></div><form className="form-card auth-card" onSubmit={submitAuth}><h2>{authMode === 'login' ? 'Sign in' : 'Create account'}</h2><p className="muted">{authMode === 'login' ? 'Enter your details to continue.' : 'It only takes a moment to register.'}</p>{authMode === 'register' && <label>Full name<input required value={auth.name} onChange={e => setAuth({...auth, name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={auth.email} onChange={e => setAuth({...auth, email:e.target.value})} placeholder="you@college.edu"/></label><label>Password<input required type="password" minLength="4" value={auth.password} onChange={e => setAuth({...auth, password:e.target.value})} placeholder="Enter password"/></label><button className="primary full" disabled={loading}>{loading ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>{authMode === 'login' && <div className="demo-login"><b>Admin demo login</b><br/>admin@campusfind.com · admin123</div>}<p className="switch-auth">{authMode === 'login' ? "New to CampusFind?" : 'Already registered?'} <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError('') }}>{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p></form></section>}

      {page === 'report' && <section className="form-page"><div className="eyebrow">CONTRIBUTE TO THE COMMUNITY</div><h1>Report an item</h1><p className="muted">Give enough detail to help the right person recognize it.</p>{!user ? <div className="form-card"><p>Please sign in before reporting an item.</p><button className="primary" onClick={() => setPage('auth')}>Sign in</button></div> : <form className="form-card report-form" onSubmit={submitItem}><div className="type-switch"><button type="button" className={itemForm.type === 'LOST' ? 'chosen' : ''} onClick={() => setItemForm({...itemForm, type:'LOST'})}>I lost an item</button><button type="button" className={itemForm.type === 'FOUND' ? 'chosen' : ''} onClick={() => setItemForm({...itemForm, type:'FOUND'})}>I found an item</button></div><div className="two-col"><label>Item name *<input required value={itemForm.itemName} onChange={e => setItemForm({...itemForm, itemName:e.target.value})} placeholder="e.g. Black wallet"/></label><label>Category<select value={itemForm.category} onChange={e => setItemForm({...itemForm, category:e.target.value})}>{['Electronics','Accessories','Books & Notes','ID Cards','Clothing','Keys','Other'].map(c => <option key={c}>{c}</option>)}</select></label></div><label>Description<textarea required rows="4" value={itemForm.description} onChange={e => setItemForm({...itemForm, description:e.target.value})} placeholder="Color, brand, identifying details..."/></label><div className="two-col"><label>Location *<input required value={itemForm.location} onChange={e => setItemForm({...itemForm, location:e.target.value})} placeholder="e.g. Library, Block A"/></label><label>Date<input type="date" value={itemForm.itemDate} onChange={e => setItemForm({...itemForm, itemDate:e.target.value})}/></label></div><label>Image URL (optional)<input value={itemForm.imageUrl} onChange={e => setItemForm({...itemForm, imageUrl:e.target.value})} placeholder="https://..."/></label><button className="primary full">Submit report</button></form>}</section>}

      {page === 'claim' && claimItem && <section className="form-page"><div className="eyebrow">ITEM CLAIM</div><h1>Claim this item</h1><p className="muted">Tell the administrator why you believe this item belongs to you.</p><div className="form-card"><h3>{claimItem.itemName}</h3><p>{claimItem.description}</p><form onSubmit={submitClaim}><label>Claim details<textarea required rows="5" value={claimText} onChange={e => setClaimText(e.target.value)} placeholder="Describe identifying details only the owner would know..."/></label><button className="primary full">Submit claim</button><button type="button" className="secondary full" onClick={() => setPage('home')}>Cancel</button></form></div></section>}

      {page === 'admin' && <section className="listing-section admin-section"><div className="eyebrow">ADMINISTRATION</div><h1>Admin dashboard</h1><p className="muted">Review claims submitted by campus users.</p>{user?.role !== 'ADMIN' ? <div className="form-card">Admin access is required. <button className="primary" onClick={() => setPage('auth')}>Sign in as admin</button></div> : <div className="table-wrap"><table><thead><tr><th>Claim ID</th><th>Item ID</th><th>Claimant</th><th>Explanation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{claims.map(c => <tr key={c.id}><td>#{c.id}</td><td>#{c.itemId}</td><td>{c.claimantEmail}</td><td>{c.explanation}</td><td><span className={`status status-${c.status.toLowerCase()}`}>{c.status}</span></td><td>{c.status === 'PENDING' && <div className="table-actions"><button className="approve" onClick={() => updateClaim(c.id, 'APPROVED')}>Approve</button><button className="reject" onClick={() => updateClaim(c.id, 'REJECTED')}>Reject</button></div>}</td></tr>)}</tbody></table>{!claims.length && <div className="empty"><p>No claims to review yet.</p></div>}</div>}</section>}
    </main>
    <footer><div className="footer-brand"><PackageSearch size={20}/> CampusFind</div><span>Find it. Claim it. Return it.</span><span>© {new Date().getFullYear()} CampusFind · College Lost & Found</span></footer>
  </div>
}
