import {esc,icon,nav} from './primitives.js';

export function workspaceShell(s,content) {
  const title=nav.find(n=>n[0]===s.page)?.[2]||'Assessment';
  const canEdit=['Admin','Super Admin','Assessor','Energy Manager'].includes(s.user.role);
  return `
  <aside class="sidebar" aria-label="Primary navigation">
    <a class="brand" href="#dashboard" aria-label="Bolide Energy Pro home"><img class="brand-full" src="/assets/bolide-logo.png" alt="Bolide"><img class="brand-mark" src="/assets/bolide-mark.jpg" alt="Bolide"><span>ENERGY PRO</span></a>
    <div class="workspace-label">WORKSPACE <span>SA</span></div>
    <div class="workspace"><img src="/assets/bolide-mark.jpg" alt=""><div>Bolide Energy Pro<small>${s.config.demo?'Demonstration portfolio':'Organisation portfolio'}</small></div></div>
    <div class="nav-label">ENERGY MANAGEMENT</div>
    <nav>${nav.filter(([id])=>id!=='team'||['Admin','Super Admin'].includes(s.user.role)).map(([id,i,label])=>`<a href="#${id}" class="nav-item ${s.page===id?'active':''}" aria-label="${label}" title="${label}" ${s.page===id?'aria-current="page"':''}>${icon(i)}<span class="nav-text">${label}</span>${id==='assessments'?`<span class="nav-count">${s.data.assessments.filter(a=>a.status==='Under Review').length}</span>`:''}</a>`).join('')}</nav>
    <div class="suite-links"><span class="nav-label">BOLIDE WORKSPACE</span><a href="https://bolide.co.za/crm/" target="_blank" rel="noopener" title="Open Bolide CRM">${icon('building')}<span>CRM</span>${icon('arrow')}</a><a href="https://bolide.co.za/leadgenerator/" target="_blank" rel="noopener" title="Open Township Prospector">${icon('search')}<span>Township Prospector</span>${icon('arrow')}</a></div>
    <div class="sidebar-bottom"><div class="platform-state"><span class="dot"></span>${s.config.staticDemo?'PUBLIC SHOWCASE':s.config.demo?'LOCAL DEMO':'PRIVATE WORKSPACE'}</div><div class="user"><span class="avatar">${esc(s.user.name.slice(0,2).toUpperCase())}</span><div>${esc(s.user.name)}<small>${esc(s.config.staticDemo?'Read-only demo':s.user.role)}</small></div><button class="icon-button" data-action="logout" title="Sign out" aria-label="Sign out">${icon('logout')}</button></div></div>
  </aside>
  <div class="scrim" data-action="menu"></div>
  <div class="app-main">
    <header class="topbar">
      <div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button><button class="icon-button desktop-collapse" data-action="collapse" title="${s.compactNav?'Show':'Hide'} menu names" aria-label="${s.compactNav?'Expand':'Collapse'} navigation">${icon('menu')}</button><div class="product-title">Energy Pro<small>${esc(title)}</small></div></div>
      <button class="workspace-search" data-action="workspace-search" aria-label="Search workspace">${icon('search')}<span>Search workspace</span><kbd>Ctrl K</kbd></button>
      <div class="top-actions"><span class="connection-status" id="connection-status"><span class="dot"></span>Connected</span>${canEdit?`<button class="primary header-create" data-action="import">${icon('plus')}<span>Import data</span></button>`:''}<button class="icon-button" data-action="theme" title="Toggle light and dark appearance" aria-label="Toggle light and dark appearance">${icon('sun')}</button><details class="account-menu"><summary class="avatar small" aria-label="Account menu" title="Account menu">${esc(s.user.name.slice(0,2).toUpperCase())}</summary><div class="account-popover"><b>${esc(s.user.name)}</b><small>${esc(s.user.email)}</small><span>${esc(s.user.role)}</span><button data-action="account">Account details</button><button data-action="logout">Sign out</button></div></details></div>
    </header>
    <div id="offline-banner" class="offline-banner" role="status" hidden>You are offline. Saved information remains visible. Keep this window open; reconnect before saving changes.</div>
    ${s.config.demo?'<div class="demo-strip">DEMONSTRATION <span>Synthetic portfolio · illustrative benchmarks · certificate activation disabled</span><button data-action="demo-switch">Switch role</button></div>':''}
    <main id="main" class="workspace-main" data-page="${esc(s.page)}">${content}</main>
    <footer><span>© ${new Date().getFullYear()} Bolide · Energy Pro</span><div><a href="https://github.com/inzaloyamaqhawe-tech/epc" target="_blank" rel="noopener">GitHub</a><button data-action="legal" data-id="privacy">Privacy</button><button data-action="legal" data-id="terms">Terms</button><button data-action="legal" data-id="cookies">Cookie preferences</button></div></footer>
  </div>`;
}
