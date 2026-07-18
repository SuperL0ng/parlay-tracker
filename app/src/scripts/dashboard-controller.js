(() => {
  'use strict';

  class DashboardController {
    constructor({ storage, root, status }) {
      this.storage = storage;
      this.root = root;
      this.status = status;
      this.state = {
        sort: 'saved',
        direction: 'desc',
        filter: 'all',
        expandedIds: new Set(),
        selectedIds: new Set(),
        selectMode: false,
        actionMenuId: ''
      };
      this.onClick = this.onClick.bind(this);
      this.onChange = this.onChange.bind(this);
      this.onStorage = this.onStorage.bind(this);
    }

    start() {
      document.addEventListener('click', this.onClick);
      document.addEventListener('change', this.onChange);
      window.addEventListener('storage', this.onStorage);
      window.addEventListener('parlay:storage-changed', this.onStorage);
      this.render();
    }

    stop() {
      document.removeEventListener('click', this.onClick);
      document.removeEventListener('change', this.onChange);
      window.removeEventListener('storage', this.onStorage);
      window.removeEventListener('parlay:storage-changed', this.onStorage);
    }

    clean(value) { return String(value ?? '').trim(); }
    esc(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    time(value) { const n = Date.parse(value || ''); return Number.isFinite(n) ? n : null; }
    savedTime(record) { return this.time(record.savedAt) ?? this.time(record.createdAt) ?? this.time(record.updatedAt); }
    settledTime(record) { return this.time(record.settledAt); }
    outcome(record) { return this.clean(record.liveOutcome || 'PENDING').toUpperCase(); }

    recordsForRender() {
      const records = this.storage.load();
      const filtered = records.filter(record => {
        if (this.state.filter === 'all') return true;
        if (this.state.filter === 'active') return this.clean(record.status).toLowerCase() !== 'completed';
        if (this.state.filter === 'completed') return this.clean(record.status).toLowerCase() === 'completed';
        return this.outcome(record) === this.state.filter.toUpperCase();
      });
      const eligible = this.state.sort === 'settled'
        ? filtered.filter(record => this.settledTime(record) !== null)
        : filtered;
      const direction = this.state.direction === 'asc' ? 1 : -1;
      return eligible
        .map((record, sourceIndex) => ({ record, sourceIndex }))
        .sort((a, b) => {
          const av = this.state.sort === 'settled' ? this.settledTime(a.record) : this.savedTime(a.record);
          const bv = this.state.sort === 'settled' ? this.settledTime(b.record) : this.savedTime(b.record);
          if (av === null && bv === null) return a.sourceIndex - b.sourceIndex;
          if (av === null) return 1;
          if (bv === null) return -1;
          if (av !== bv) return (av - bv) * direction;
          return a.sourceIndex - b.sourceIndex;
        })
        .map(item => item.record);
    }

    render() {
      const all = this.storage.load();
      const validIds = new Set(all.map(record => String(record.id)));
      for (const id of [...this.state.expandedIds]) if (!validIds.has(id)) this.state.expandedIds.delete(id);
      for (const id of [...this.state.selectedIds]) if (!validIds.has(id)) this.state.selectedIds.delete(id);
      if (this.state.actionMenuId && !validIds.has(this.state.actionMenuId)) this.state.actionMenuId = '';

      const records = this.recordsForRender();
      this.root.replaceChildren();
      if (!records.length) {
        const empty = document.createElement('div');
        empty.className = 'emptyState';
        empty.textContent = all.length ? 'No tickets match this view.' : 'No saved tickets yet.';
        this.root.appendChild(empty);
      } else {
        const fragment = document.createDocumentFragment();
        for (const record of records) fragment.appendChild(this.ticketCard(record));
        this.root.appendChild(fragment);
      }
      this.renderBulkBar();
      this.status.textContent = `${records.length} of ${all.length} ticket${all.length === 1 ? '' : 's'}`;
    }

    ticketCard(record) {
      const id = String(record.id);
      const ticket = record.ticket || {};
      const article = document.createElement('article');
      article.className = `savedTicket${this.state.selectMode ? ' selectable' : ''}`;
      article.dataset.ticketId = id;
      article.dataset.outcome = this.outcome(record);
      const type = this.clean(ticket.type).toUpperCase();
      const league = this.clean(ticket.league || ticket.legs?.find(leg => this.clean(leg.league))?.league || 'MLB').toUpperCase();
      const legs = Array.isArray(ticket.legs) ? ticket.legs : [];
      const count = type === 'STRAIGHT' ? '' : `${legs.length} legs`;
      const meta = [type, league, ticket.game, count].filter(Boolean).join(' · ');
      const saved = this.formatStamp(record.savedAt || record.createdAt, 'Saved');
      const settled = this.formatStamp(record.settledAt, 'Settled');
      const open = this.state.expandedIds.has(id);
      const selected = this.state.selectedIds.has(id);

      article.innerHTML = `
        <input class="ticketSelectBox" type="checkbox" data-ticket-select="${this.esc(id)}" aria-label="Select ticket" ${selected ? 'checked' : ''}>
        <div class="savedTicketTop">
          <div>
            <div class="savedTitleRow">
              ${record.sportsbook ? `<span class="bookBadge">${this.esc(record.sportsbook)}</span>` : ''}
              <h3>${this.esc(ticket.title || 'Untitled')}</h3>
              <span class="stateBadge">${this.esc(this.outcome(record))}</span>
            </div>
            <div class="savedMeta">${this.esc(meta)}</div>
            <div class="savedTimes">${this.esc([saved, settled].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
        <div class="savedActions">
          <button class="primary" type="button" data-ticket-action="view" data-ticket-id="${this.esc(id)}">Open Ticket</button>
          <button type="button" data-ticket-action="toggle-details" data-ticket-id="${this.esc(id)}" aria-expanded="${open}">${open ? 'Hide' : 'Show'} ${type === 'STRAIGHT' ? 'Pick' : 'Legs'}</button>
          <button type="button" data-ticket-action="menu" data-ticket-id="${this.esc(id)}" aria-expanded="${this.state.actionMenuId === id}">Actions</button>
        </div>
        <div class="ticketDetails" ${open ? '' : 'hidden'}>${this.legsHtml(record)}</div>
      `;
      return article;
    }

    legsHtml(record) {
      const ticket = record.ticket || {};
      const legs = Array.isArray(ticket.legs) ? ticket.legs : [];
      if (!legs.length) return '<div class="emptyState">No legs in this ticket.</div>';
      return legs.map(leg => {
        const meta = ticket.type === 'sgp' ? [leg.team, leg.player] : [leg.game, leg.team, leg.player];
        return `<div class="dashboardLeg"><div><div class="dashboardLegLabel">${this.esc(leg.label || leg.type || 'Untitled leg')}</div><div class="dashboardLegMeta">${this.esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegValue">${this.esc(leg.current ?? leg.target ?? '')}</div></div>`;
      }).join('');
    }

    formatStamp(value, prefix) {
      const time = this.time(value);
      if (time === null) return '';
      return `${prefix} ${new Date(time).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    }

    renderBulkBar() {
      this.root.parentElement.querySelector('.dashboardBulkBar')?.remove();
      if (!this.state.selectMode) return;
      const bar = document.createElement('div');
      bar.className = 'dashboardBulkBar';
      bar.innerHTML = `<span>${this.state.selectedIds.size} selected</span><button class="danger" type="button" data-dashboard-action="delete-selected" ${this.state.selectedIds.size ? '' : 'disabled'}>Delete Selected</button>`;
      this.root.insertAdjacentElement('afterend', bar);
    }

    showActions(id, anchor) {
      this.closeActions();
      this.state.actionMenuId = id;
      const menu = document.createElement('div');
      menu.className = 'savedActionsMenu';
      menu.dataset.actionMenuFor = id;
      menu.innerHTML = `
        <button type="button" data-ticket-action="copy" data-ticket-id="${this.esc(id)}">Copy Code</button>
        <button type="button" data-ticket-action="share" data-ticket-id="${this.esc(id)}">Share</button>
        <button type="button" data-ticket-action="toggle-status" data-ticket-id="${this.esc(id)}">Complete / Activate</button>
        <button type="button" data-ticket-action="duplicate" data-ticket-id="${this.esc(id)}">Duplicate</button>
        <button type="button" data-ticket-action="edit" data-ticket-id="${this.esc(id)}">Edit</button>
        <button class="danger" type="button" data-ticket-action="delete" data-ticket-id="${this.esc(id)}">Delete</button>
      `;
      document.body.appendChild(menu);
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth - 20);
      menu.style.left = `${Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width))}px`;
      menu.style.top = `${Math.min(window.innerHeight - menu.offsetHeight - 10, rect.bottom + 6)}px`;
      anchor.setAttribute('aria-expanded', 'true');
    }

    closeActions() {
      document.querySelector('.savedActionsMenu')?.remove();
      document.querySelectorAll('[data-ticket-action="menu"][aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      this.state.actionMenuId = '';
    }

    showSortFilter() {
      let panel = document.querySelector('.sortFilterPanel');
      if (!panel) {
        panel = document.createElement('section');
        panel.className = 'sortFilterPanel';
        panel.innerHTML = `
          <div class="sortFilterGrid">
            <label>Sort<select data-filter-field="sort"><option value="saved">Saved date</option><option value="settled">Settlement date</option></select></label>
            <label>Order<select data-filter-field="direction"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
            <label>Show<select data-filter-field="filter"><option value="all">All</option><option value="active">Active</option><option value="completed">Completed</option><option value="won">Won</option><option value="lost">Lost</option><option value="push">Push</option></select></label>
          </div>
          <div class="savedActions"><button type="button" data-dashboard-action="clear-filter">Clear</button><button class="primary" type="button" data-dashboard-action="apply-filter">Apply</button></div>
        `;
        document.body.appendChild(panel);
      }
      panel.querySelector('[data-filter-field="sort"]').value = this.state.sort;
      panel.querySelector('[data-filter-field="direction"]').value = this.state.direction;
      panel.querySelector('[data-filter-field="filter"]').value = this.state.filter;
      panel.hidden = false;
    }

    applySortFilter() {
      const panel = document.querySelector('.sortFilterPanel');
      if (!panel) return;
      this.state.sort = panel.querySelector('[data-filter-field="sort"]').value;
      this.state.direction = panel.querySelector('[data-filter-field="direction"]').value;
      this.state.filter = panel.querySelector('[data-filter-field="filter"]').value;
      this.state.expandedIds.clear();
      this.state.selectMode = false;
      this.state.selectedIds.clear();
      panel.hidden = true;
      this.render();
    }

    onClick(event) {
      const dashboardAction = event.target.closest('[data-dashboard-action]');
      if (dashboardAction) {
        const action = dashboardAction.dataset.dashboardAction;
        if (action === 'refresh') this.refresh();
        if (action === 'select-mode') { this.state.selectMode = !this.state.selectMode; if (!this.state.selectMode) this.state.selectedIds.clear(); this.render(); }
        if (action === 'sort-filter') this.showSortFilter();
        if (action === 'apply-filter') this.applySortFilter();
        if (action === 'clear-filter') { this.state.sort = 'saved'; this.state.direction = 'desc'; this.state.filter = 'all'; this.applySortFilter(); }
        if (action === 'delete-selected') this.deleteSelected();
        return;
      }

      const ticketAction = event.target.closest('[data-ticket-action]');
      if (!ticketAction) { if (!event.target.closest('.savedActionsMenu')) this.closeActions(); return; }
      const action = ticketAction.dataset.ticketAction;
      const id = ticketAction.dataset.ticketId;
      if (action === 'toggle-details') { this.state.expandedIds.has(id) ? this.state.expandedIds.delete(id) : this.state.expandedIds.add(id); this.render(); }
      if (action === 'menu') this.state.actionMenuId === id ? this.closeActions() : this.showActions(id, ticketAction);
      if (action === 'delete') this.deleteOne(id);
      if (action === 'toggle-status') this.toggleStatus(id);
      if (action === 'duplicate') this.duplicate(id);
      if (action === 'view') window.dispatchEvent(new CustomEvent('parlay:open-ticket', { detail: { id } }));
      if (action === 'edit') window.dispatchEvent(new CustomEvent('parlay:edit-ticket', { detail: { id } }));
      if (action === 'copy') window.dispatchEvent(new CustomEvent('parlay:copy-ticket', { detail: { id } }));
      if (action === 'share') window.dispatchEvent(new CustomEvent('parlay:share-ticket', { detail: { id } }));
    }

    onChange(event) {
      const box = event.target.closest('[data-ticket-select]');
      if (!box) return;
      box.checked ? this.state.selectedIds.add(box.dataset.ticketSelect) : this.state.selectedIds.delete(box.dataset.ticketSelect);
      this.renderBulkBar();
    }

    onStorage(event) {
      if (event.key && event.key !== this.storage.KEY) return;
      this.render();
    }

    refresh() {
      this.closeActions();
      this.status.textContent = 'Refreshing…';
      window.dispatchEvent(new CustomEvent('parlay:refresh-requested'));
      this.render();
    }

    deleteOne(id) {
      this.closeActions();
      if (!confirm('Delete this saved ticket?')) return;
      this.storage.remove([id]);
    }

    deleteSelected() {
      if (!this.state.selectedIds.size) return;
      if (!confirm(`Delete ${this.state.selectedIds.size} selected ticket${this.state.selectedIds.size === 1 ? '' : 's'}?`)) return;
      this.storage.remove(this.state.selectedIds);
      this.state.selectedIds.clear();
      this.state.selectMode = false;
    }

    toggleStatus(id) {
      this.closeActions();
      this.storage.update(id, record => {
        const active = this.clean(record.status).toLowerCase() !== 'completed';
        record.status = active ? 'completed' : 'active';
        record.manualActiveOverride = !active;
        record.updatedAt = new Date().toISOString();
        return record;
      });
    }

    duplicate(id) {
      this.closeActions();
      const records = this.storage.load();
      const sourceIndex = records.findIndex(record => String(record.id) === String(id));
      if (sourceIndex < 0) return;
      const copy = this.storage.clone(records[sourceIndex]);
      const now = new Date().toISOString();
      copy.id = this.storage.makeId();
      copy.savedAt = now;
      copy.createdAt = now;
      copy.updatedAt = now;
      copy.status = 'active';
      delete copy.liveOutcome;
      delete copy.settledAt;
      delete copy.settlementSource;
      delete copy.autoCompleted;
      delete copy.manualActiveOverride;
      if (copy.ticket) copy.ticket.title = `${copy.ticket.title || 'Untitled'} Copy`;
      if (copy.canonical) copy.canonical.title = `${copy.canonical.title || 'Untitled'} Copy`;
      records.splice(sourceIndex + 1, 0, copy);
      this.storage.save(records);
    }
  }

  window.DashboardController = DashboardController;
})();
