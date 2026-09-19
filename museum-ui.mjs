const byId = id => document.getElementById(id);
const search = byId('searchDialog');
const about = byId('aboutDialog');
const legend = byId('familyLegend');
const mobile = matchMedia('(max-width: 900px)');
const setNav = id => document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.id === id));
function resetNav() { setNav('exploreNav'); }
function openDialog(dialog, navId) {
  if (search.open) search.close();
  if (about.open) about.close();
  dialog.showModal();
  setNav(navId);
  if (dialog === search) byId('searchInput').focus();
}
byId('searchNav').addEventListener('click', () => openDialog(search, 'searchNav'));
byId('aboutNav').addEventListener('click', () => openDialog(about, 'aboutNav'));
for (const dialog of [search, about]) {
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', resetNav);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
}
byId('aboutExplore').addEventListener('click', () => { about.close(); byId('resetCamera').click(); });
function explore() {
  if (search.open) search.close();
  if (about.open) about.close();
  resetNav();
  byId('resetCamera').click();
}
byId('exploreNav').addEventListener('click', explore);
document.querySelector('.brand').addEventListener('click', explore);
function setLegend(visible) {
  legend.setAttribute('aria-hidden', String(!visible));
  legend.inert = !visible;
  legend.classList.toggle('mobile-collapsed', !visible && mobile.matches);
  byId('familiesNav').setAttribute('aria-expanded', String(visible));
}
setLegend(!mobile.matches);
byId('familiesNav').addEventListener('click', () => {
  const visible = legend.getAttribute('aria-hidden') !== 'false';
  setLegend(visible);
  setNav(visible ? 'familiesNav' : 'exploreNav');
});
mobile.addEventListener('change', () => { setLegend(!mobile.matches); resetNav(); });
byId('searchResults').addEventListener('click', event => {
  if (event.target.closest('.search-result')) search.close();
});
byId('searchInput').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') {
    const first = byId('searchResults').querySelector('.search-result');
    if (first) { event.preventDefault(); first.focus(); }
  }
  if (event.key === 'Enter') {
    const results = byId('searchResults').querySelectorAll('.search-result');
    if (results.length === 1) { event.preventDefault(); results[0].click(); }
  }
});
// The scene owns the search results; expose each result to keyboard users as it arrives.
new MutationObserver(() => {
  byId('searchResults').querySelectorAll('.search-result').forEach(result => {
    if (result.tagName !== 'BUTTON') { result.tabIndex = 0; result.setAttribute('role', 'button'); }
  });
}).observe(byId('searchResults'), {childList: true});
byId('searchResults').addEventListener('keydown', event => {
  const result = event.target.closest('.search-result');
  if (!result) return;
  if ((event.key === 'Enter' || event.key === ' ') && result.tagName !== 'BUTTON') { event.preventDefault(); result.click(); }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    (event.key === 'ArrowDown' ? result.nextElementSibling : result.previousElementSibling)?.focus();
  }
});
const tabs = [...document.querySelectorAll('#panelTabs [role="tab"]')];
function selectTab(tab, focus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    byId(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (focus) tab.focus();
}
for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    let index = tabs.indexOf(tab);
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else return;
    event.preventDefault(); selectTab(tabs[index], true);
  });
}
new MutationObserver(() => selectTab(tabs[0])).observe(byId('elementNumber'), {childList: true});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  if (byId('elementPanel').classList.contains('open')) byId('closePanel').click();
});
