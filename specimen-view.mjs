/** A local image viewer shared by manual selection and the guided visit. */
export function createSpecimenView({ entries = [] } = {}) {
  const byId = id => document.getElementById(id);
  const figure = byId('specimenFigure');
  const thumbnail = byId('elementSpecimen');
  const caption = byId('specimenCaption');
  const preview = byId('specimenPreview');
  const status = byId('specimenStatus');
  const dialog = byId('specimenDialog');
  const large = byId('specimenLarge');
  const lookup = new Map(entries.map(entry => [Number(entry.number), entry]));
  const warmed = new Set();
  let revision = 0;
  let current = null;
  let loaded = false;

  function close() {
    if (dialog.open) dialog.close();
  }
  function warmNeighbors(number) {
    for (const z of [number - 1, number + 1]) {
      const entry = lookup.get(z);
      if (!entry?.src || warmed.has(entry.src)) continue;
      warmed.add(entry.src);
      const image = new Image();
      image.decoding = 'async';
      image.fetchPriority = 'low';
      image.src = entry.src;
    }
  }
  function unavailable() {
    loaded = false;
    figure.dataset.state = 'error';
    preview.disabled = true;
    preview.removeAttribute('aria-busy');
    thumbnail.removeAttribute('src');
    thumbnail.alt = '';
    status.textContent = 'Visuel indisponible';
    caption.textContent = 'Visuel indisponible';
    caption.title = 'Le visuel de cet élément ne peut pas être affiché.';
  }
  function show(number) {
    close();
    const token = ++revision;
    current = lookup.get(Number(number)) || null;
    loaded = false;
    figure.hidden = false;
    figure.dataset.state = 'loading';
    preview.disabled = true;
    preview.setAttribute('aria-busy', 'true');
    preview.setAttribute('aria-label', `Agrandir le visuel de ${current?.symbol || `l’élément ${number}`}`);
    thumbnail.onload = null;
    thumbnail.onerror = null;
    thumbnail.removeAttribute('src');
    thumbnail.alt = '';
    large.removeAttribute('src');
    large.alt = '';
    status.textContent = 'Chargement du visuel…';
    caption.textContent = current?.caption || 'Visuel de l’élément';
    caption.title = caption.textContent;
    if (!current?.src) { unavailable(); return; }
    const entry = current;
    const pending = new Image();
    pending.decoding = 'async';
    pending.onload = async () => {
      // Decode off screen before replacing the stable thumbnail frame.
      try { await pending.decode(); } catch { /* onload already confirms a usable image */ }
      if (token !== revision) return;
      thumbnail.alt = entry.alt || entry.caption || `Visuel de ${entry.symbol}`;
      thumbnail.onerror = () => { if (token === revision) unavailable(); };
      thumbnail.src = entry.src;
      loaded = true;
      figure.dataset.state = 'ready';
      preview.disabled = false;
      preview.removeAttribute('aria-busy');
      status.textContent = '';
      warmNeighbors(Number(entry.number));
    };
    pending.onerror = () => { if (token === revision) unavailable(); };
    pending.src = entry.src;
  }
  preview.addEventListener('click', () => {
    if (!loaded || !current) return;
    const entry = current;
    byId('specimenKind').textContent = entry.kind === 'photo' ? 'Photographie' : 'Schéma explicatif';
    byId('specimenDialogTitle').textContent = `${byId('elementName').textContent || entry.symbol} · ${entry.symbol} / ${entry.number}`;
    large.src = entry.src;
    large.alt = entry.alt || entry.caption || `Visuel de ${entry.symbol}`;
    byId('specimenFullCaption').textContent = entry.caption || '';
    byId('specimenDescription').textContent = entry.description || '';
    const safeUrl = value => {
      try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
    };
    const writeAttribution = (id, text, url) => {
      const node = byId(id);
      if (!url) { node.textContent = text; return; }
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = text;
      node.replaceChildren(link);
    };
    const sourceUrl = safeUrl(entry.sourceUrl);
    writeAttribution('specimenCredit', entry.credit || 'Crédit non renseigné', sourceUrl);
    writeAttribution('specimenLicense', entry.license || 'Licence non renseignée', safeUrl(entry.licenseUrl));
    const source = byId('specimenSource');
    source.hidden = !sourceUrl;
    if (sourceUrl) source.href = sourceUrl;
    else source.removeAttribute('href');
    dialog.showModal();
    byId('closeSpecimen').focus();
    document.dispatchEvent(new CustomEvent('atlas:specimen-open', { detail: { number: Number(entry.number) } }));
  });
  byId('closeSpecimen').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });
  // Native dialogs handle Escape and focus restoration, including during a paused visit.
  return { show, close };
}


