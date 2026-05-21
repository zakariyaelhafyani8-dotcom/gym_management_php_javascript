// ============================================
// GymPro Manager - Main JS Application
// ============================================

const API = 'php/api.php';

// ---- STATE ----
let currentPage = 'dashboard';
let currentUser = null;
let allClients = [];
let allSeances = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

async function checkSession() {
    const res = await apiCall('check_session', 'GET');
    if (res.logged) {
        currentUser = res;
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    // Populate user info
    document.getElementById('sidebar-username').textContent = currentUser.name;
    document.getElementById('sidebar-role').textContent = currentUser.role === 'admin' ? 'Administrateur' : 'Coach';
    document.getElementById('sidebar-avatar').textContent = getInitials(currentUser.name);
    updateDate();
    // Show/hide admin-only nav items
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
    });
    // Show coach space only for coaches
    if (currentUser.role === 'admin') {
        document.getElementById('nav-coach').style.display = 'none';
    }
    navigateTo('dashboard');
}

// ============================================
// NAVIGATION
// ============================================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const pageEl = document.getElementById('page-' + page);
    if (pageEl) pageEl.classList.add('active');
    const navEl = document.querySelector(`[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');
    currentPage = page;
    // Update topbar title
    const titles = {
        dashboard: 'Tableau de bord', clients: 'Gestion des clients',
        abonnements: 'Abonnements', seances: 'Planning des séances',
        paiements: 'Paiements', coach: 'Espace Coach', stats: 'Statistiques'
    };
    document.getElementById('topbar-title').textContent = titles[page] || page;
    // Load page data
    loadPageData(page);
    closeSidebar();
}

function loadPageData(page) {
    switch(page) {
        case 'dashboard':    loadDashboard(); break;
        case 'clients':      loadClients(); break;
        case 'abonnements':  loadAbonnements(); break;
        case 'seances':      loadSeances(); break;
        case 'paiements':    loadPaiements(); break;
        case 'coach':        loadCoachSpace(); break;
        case 'stats':        loadStats(); break;
    }
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    const stats = await apiCall('get_stats', 'GET');
    if (stats.error) return;
    document.getElementById('stat-clients').textContent    = stats.clients_actifs;
    document.getElementById('stat-total').textContent      = stats.total_clients;
    document.getElementById('stat-expires').textContent    = stats.abonnements_expires;
    document.getElementById('stat-seances').textContent    = stats.seances_today;
    document.getElementById('stat-revenus').textContent    = formatMoney(stats.revenus_mois) + ' MAD';
    renderRevenueChart(stats.revenus_chart);
    loadRecentClients();
}

function renderRevenueChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    if (window._revenueChart) window._revenueChart.destroy();
    const labels = data.map(d => d.mois);
    const values = data.map(d => parseFloat(d.total));
    window._revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenus (MAD)',
                data: values,
                backgroundColor: 'rgba(139,0,0,0.6)',
                borderColor: '#B22222',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(178,34,34,0.8)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
            }
        }
    });
}

async function loadRecentClients() {
    const clients = await apiCall('get_clients', 'GET');
    const tbody = document.getElementById('recent-clients-tbody');
    const recent = clients.slice(0, 6);
    tbody.innerHTML = recent.map(c => `
        <tr>
            <td>
                <div class="client-cell">
                    <div class="client-avatar">${getInitials(c.prenom + ' ' + c.nom)}</div>
                    <div>
                        <div class="client-name">${c.prenom} ${c.nom}</div>
                        <div class="client-email">${c.email}</div>
                    </div>
                </div>
            </td>
            <td>${statusBadge(c.statut_reel)}</td>
            <td class="text-muted">${c.date_fin ? formatDate(c.date_fin) : '—'}</td>
        </tr>
    `).join('');
}

// ============================================
// CLIENTS
// ============================================
async function loadClients() {
    allClients = await apiCall('get_clients', 'GET');
    renderClientsTable(allClients);
}

function renderClientsTable(clients) {
    const tbody = document.getElementById('clients-tbody');
    if (!clients.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><p>Aucun client trouvé</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = clients.map(c => `
        <tr>
            <td>
                <div class="client-cell">
                    <div class="client-avatar">${getInitials(c.prenom + ' ' + c.nom)}</div>
                    <div>
                        <div class="client-name">${c.prenom} ${c.nom}</div>
                        <div class="client-email">${c.email}</div>
                    </div>
                </div>
            </td>
            <td class="text-muted">${c.telephone || '—'}</td>
            <td>${statusBadge(c.statut_reel)}</td>
            <td class="text-muted">${c.date_fin ? formatDate(c.date_fin) : 'Aucun abo'}</td>
            <td class="text-muted">${formatDate(c.date_inscription)}</td>
            <td>
                <div class="flex gap-2">
                    <button class="btn-icon" onclick="openEditClient(${c.id})" title="Modifier">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn-icon" onclick="viewClientHistory(${c.id}, '${c.prenom} ${c.nom}')" title="Historique">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="btn-icon del" onclick="deleteClient(${c.id}, '${c.prenom} ${c.nom}')" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function searchClients(q) {
    const query = q.toLowerCase();
    const filtered = allClients.filter(c =>
        (c.nom + ' ' + c.prenom + ' ' + c.email).toLowerCase().includes(query)
    );
    renderClientsTable(filtered);
}

function openAddClient() {
    document.getElementById('client-modal-title').textContent = 'Ajouter un client';
    const inputs = document.querySelectorAll('#client-modal input');
    inputs.forEach(input => input.value = '');
    document.getElementById('client-id').value = '';
    openModal('client-modal');
}

async function openEditClient(id) {
    const client = await apiCall('get_client&id=' + id, 'GET');
    document.getElementById('client-modal-title').textContent = 'Modifier le client';
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-nom').value = client.nom;
    document.getElementById('client-prenom').value = client.prenom;
    document.getElementById('client-email').value = client.email;
    document.getElementById('client-telephone').value = client.telephone || '';
    document.getElementById('client-dob').value = client.date_naissance || '';
    document.getElementById('client-adresse').value = client.adresse || '';
    openModal('client-modal');
}

async function saveClient() {
    const id = document.getElementById('client-id').value;
    const data = {
        nom: document.getElementById('client-nom').value,
        prenom: document.getElementById('client-prenom').value,
        email: document.getElementById('client-email').value,
        telephone: document.getElementById('client-telephone').value,
        date_naissance: document.getElementById('client-dob').value,
        adresse: document.getElementById('client-adresse').value,
    };
    if (!data.nom || !data.prenom || !data.email) {
        showToast('Nom, prénom et email sont requis', 'error'); return;
    }
    const action = id ? 'update_client' : 'add_client';
    if (id) data.id = id;
    const res = await apiCall(action, 'POST', data);
    if (res.success) {
        showToast(res.message, 'success');
        closeModal('client-modal');
        loadClients();
    } else {
        showToast(res.message || 'Erreur', 'error');
    }
}

async function deleteClient(id, name) {
    if (!confirm(`Supprimer le client "${name}" ? Cette action est irréversible.`)) return;
    const res = await apiCall('delete_client', 'POST', { id });
    if (res.success) {
        showToast(res.message, 'success');
        loadClients();
    }
}

async function viewClientHistory(id, name) {
    const abos = await apiCall('get_abonnements_client&client_id=' + id, 'GET');
    const paiements = await apiCall('get_paiements&client_id=' + id, 'GET');
    let html = `<h4 class="mb-2">${name}</h4>`;
    html += `<p class="text-muted mb-3" style="font-size:0.85rem">Abonnements :</p>`;
    if (abos.length) {
        html += `<table><thead><tr><th>Type</th><th>Début</th><th>Fin</th><th>Statut</th><th>Montant</th></tr></thead><tbody>`;
        html += abos.map(a => `
            <tr>
                <td>${a.type_abonnement}</td>
                <td>${formatDate(a.date_debut)}</td>
                <td>${formatDate(a.date_fin)}</td>
                <td>${statusBadge(a.statut_reel)}</td>
                <td>${formatMoney(a.montant)} MAD</td>
            </tr>
        `).join('');
        html += '</tbody></table>';
    } else html += '<p class="text-muted">Aucun abonnement</p>';

    html += `<p class="text-muted mt-3 mb-2" style="font-size:0.85rem">Paiements :</p>`;
    if (paiements.length) {
        html += `<table><thead><tr><th>Date</th><th>Montant</th><th>Mode</th><th>Statut</th></tr></thead><tbody>`;
        html += paiements.map(p => `
            <tr>
                <td>${formatDateTime(p.date_paiement)}</td>
                <td>${formatMoney(p.montant)} MAD</td>
                <td>${p.mode_paiement}</td>
                <td>${payStatusBadge(p.statut)}</td>
            </tr>
        `).join('');
        html += '</tbody></table>';
    } else html += '<p class="text-muted">Aucun paiement</p>';

    document.getElementById('history-body').innerHTML = html;
    openModal('history-modal');
}

// ============================================
// ABONNEMENTS
// ============================================
async function loadAbonnements() {
    const abos = await apiCall('get_abonnements', 'GET');
    renderAbonnements(abos);
    // Populate client select
    if (!allClients.length) allClients = await apiCall('get_clients', 'GET');
    const sel = document.getElementById('abo-client-id');
    sel.innerHTML = '<option value="">-- Choisir un client --</option>' +
        allClients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join('');
}

function renderAbonnements(abos) {
    const tbody = document.getElementById('abonnements-tbody');
    if (!abos.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-id-card"></i><p>Aucun abonnement</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = abos.map(a => `
        <tr>
            <td>
                <div class="client-cell">
                    <div class="client-avatar">${getInitials(a.prenom + ' ' + a.nom)}</div>
                    <div>
                        <div class="client-name">${a.prenom} ${a.nom}</div>
                        <div class="client-email">${a.email}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge badge-info">${a.type_abonnement}</span></td>
            <td class="text-muted">${formatDate(a.date_debut)}</td>
            <td class="text-muted">${formatDate(a.date_fin)}</td>
            <td>${statusBadge(a.statut_reel)}</td>
            <td class="text-muted">${formatMoney(a.montant)} MAD</td>
            <td>
                <button class="btn-icon del" onclick="deleteAbonnement(${a.id})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Auto-fill price when type changes
function updateAboPrice() {
    const prices = { mensuel: 250, trimestriel: 600, annuel: 2000 };
    const type = document.getElementById('abo-type').value;
    document.getElementById('abo-montant').value = prices[type] || '';
    // Auto set end date
    const start = document.getElementById('abo-debut').value;
    if (start) {
        const durations = { mensuel: 30, trimestriel: 90, annuel: 365 };
        const d = new Date(start);
        d.setDate(d.getDate() + durations[type]);
        document.getElementById('abo-fin').value = d.toISOString().split('T')[0];
    }
}

function updateAboFin() {
    const type = document.getElementById('abo-type').value;
    const start = document.getElementById('abo-debut').value;
    if (!start) return;
    const durations = { mensuel: 30, trimestriel: 90, annuel: 365 };
    const d = new Date(start);
    d.setDate(d.getDate() + durations[type]);
    document.getElementById('abo-fin').value = d.toISOString().split('T')[0];
}

async function saveAbonnement() {
    const data = {
        client_id: document.getElementById('abo-client-id').value,
        type_abonnement: document.getElementById('abo-type').value,
        date_debut: document.getElementById('abo-debut').value,
        date_fin: document.getElementById('abo-fin').value,
        montant: document.getElementById('abo-montant').value,
        mode_paiement: document.getElementById('abo-mode').value,
    };
    if (!data.client_id || !data.date_debut || !data.date_fin) {
        showToast('Veuillez remplir tous les champs requis', 'error'); return;
    }
    const res = await apiCall('add_abonnement', 'POST', data);
    if (res.success) {
        showToast(res.message, 'success');
        closeModal('abo-modal');
        loadAbonnements();
    } else showToast(res.message || 'Erreur', 'error');
}

async function deleteAbonnement(id) {
    if (!confirm('Supprimer cet abonnement ?')) return;
    const res = await apiCall('delete_abonnement', 'POST', { id });
    if (res.success) { showToast(res.message, 'success'); loadAbonnements(); }
}

// ============================================
// SÉANCES
// ============================================
async function loadSeances() {
    allSeances = await apiCall('get_seances', 'GET');
    renderSeances(allSeances);
    // Populate coach select
    const coachs = await apiCall('get_coachs', 'GET');
    const sel = document.getElementById('seance-coach-id');
    sel.innerHTML = coachs.map(c => `<option value="${c.id}">${c.prenom} ${c.nom} - ${c.specialite}</option>`).join('');
}

function renderSeances(seances) {
    const container = document.getElementById('seances-container');
    if (!seances.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar"></i><p>Aucune séance planifiée</p></div>`;
        return;
    }
    // Group by date
    const grouped = {};
    seances.forEach(s => {
        if (!grouped[s.date_seance]) grouped[s.date_seance] = [];
        grouped[s.date_seance].push(s);
    });
    let html = '';
    Object.entries(grouped).forEach(([date, slist]) => {
        html += `<h4 style="font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;margin-top:20px">${formatDateFull(date)}</h4>`;
        html += '<div class="planning-grid">';
        slist.forEach(s => {
            const pct = s.capacite_max > 0 ? Math.min(100, (s.nb_inscrits / s.capacite_max) * 100) : 0;
            const full = s.nb_inscrits >= s.capacite_max;
            html += `
            <div class="seance-card">
                <div class="time-badge"><i class="fas fa-clock"></i> ${s.heure_debut.slice(0,5)} – ${s.heure_fin.slice(0,5)}</div>
                <h4>${s.titre}</h4>
                <div class="coach-info"><i class="fas fa-user-tie"></i> ${s.coach_prenom} ${s.coach_nom} · ${s.salle || '—'}</div>
                <div class="capacity-bar"><div class="capacity-fill" style="width:${pct}%"></div></div>
                <div class="capacity-text">${s.nb_inscrits} / ${s.capacite_max} participants</div>
                <div class="flex gap-2">
                    <button class="btn btn-outline btn-xs" onclick="openInscriptions(${s.id}, '${s.titre}')">
                        <i class="fas fa-users"></i> Gérer
                    </button>
                    ${currentUser.role === 'admin' ? `
                    <button class="btn btn-danger btn-xs" onclick="deleteSeance(${s.id})">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>`;
        });
        html += '</div>';
    });
    container.innerHTML = html;
}

async function saveSeance() {
    const data = {
        titre: document.getElementById('seance-titre').value,
        description: document.getElementById('seance-desc').value,
        coach_id: document.getElementById('seance-coach-id').value,
        date_seance: document.getElementById('seance-date').value,
        heure_debut: document.getElementById('seance-hdebut').value,
        heure_fin: document.getElementById('seance-hfin').value,
        capacite_max: document.getElementById('seance-capacite').value,
        salle: document.getElementById('seance-salle').value,
    };
    if (!data.titre || !data.date_seance || !data.heure_debut) {
        showToast('Champs requis manquants', 'error'); return;
    }
    const res = await apiCall('add_seance', 'POST', data);
    if (res.success) {
        showToast(res.message, 'success');
        closeModal('seance-modal');
        loadSeances();
    } else showToast(res.message || 'Erreur', 'error');
}

async function deleteSeance(id) {
    if (!confirm('Supprimer cette séance ?')) return;
    const res = await apiCall('delete_seance', 'POST', { id });
    if (res.success) { showToast(res.message, 'success'); loadSeances(); }
}

// Gestion des inscriptions à une séance
async function openInscriptions(seanceId, titre) {
    document.getElementById('inscriptions-titre').textContent = titre;
    document.getElementById('current-seance-id').value = seanceId;
    // Load clients for select
    if (!allClients.length) allClients = await apiCall('get_clients', 'GET');
    const sel = document.getElementById('inscrit-client-id');
    sel.innerHTML = '<option value="">-- Choisir un client --</option>' +
        allClients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join('');
    await loadInscrits(seanceId);
    openModal('inscriptions-modal');
}

async function loadInscrits(seanceId) {
    const inscrits = await apiCall('get_inscrits_seance&seance_id=' + seanceId, 'GET');
    const tbody = document.getElementById('inscrits-tbody');
    if (!inscrits.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">Aucun inscrit</td></tr>`;
        return;
    }
    tbody.innerHTML = inscrits.map(i => `
        <tr>
            <td><strong>${i.prenom} ${i.nom}</strong></td>
            <td class="text-muted">${i.email}</td>
            <td>${statusBadge(i.abo_statut)}</td>
            <td>
                <button class="btn btn-danger btn-xs" onclick="desinscrire(${i.id}, ${document.getElementById('current-seance-id').value})">
                    <i class="fas fa-user-minus"></i> Retirer
                </button>
            </td>
        </tr>
    `).join('');
}

async function inscrireClient() {
    const client_id = document.getElementById('inscrit-client-id').value;
    const seance_id = document.getElementById('current-seance-id').value;
    if (!client_id) { showToast('Sélectionnez un client', 'error'); return; }
    const res = await apiCall('inscrire_client', 'POST', { client_id, seance_id });
    if (res.success) {
        showToast(res.message, 'success');
        loadInscrits(seance_id);
    } else showToast(res.message, 'error');
}

async function desinscrire(client_id, seance_id) {
    const res = await apiCall('desinscrire_client', 'POST', { client_id, seance_id });
    if (res.success) {
        showToast(res.message, 'success');
        loadInscrits(seance_id);
    }
}

// ============================================
// PAIEMENTS
// ============================================
async function loadPaiements() {
    const paiements = await apiCall('get_paiements', 'GET');
    renderPaiements(paiements);
    if (!allClients.length) allClients = await apiCall('get_clients', 'GET');
    const sel = document.getElementById('paiement-client-id');
    sel.innerHTML = '<option value="">-- Choisir un client --</option>' +
        allClients.map(c => `<option value="${c.id}">${c.prenom} ${c.nom}</option>`).join('');
}

function renderPaiements(paiements) {
    const tbody = document.getElementById('paiements-tbody');
    if (!paiements.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-credit-card"></i><p>Aucun paiement</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = paiements.map(p => `
        <tr>
            <td>
                <div class="client-cell">
                    <div class="client-avatar">${getInitials(p.prenom + ' ' + p.nom)}</div>
                    <div>
                        <div class="client-name">${p.prenom} ${p.nom}</div>
                    </div>
                </div>
            </td>
            <td class="text-muted">${p.type_abonnement || '—'}</td>
            <td><strong style="color:var(--success)">${formatMoney(p.montant)} MAD</strong></td>
            <td class="text-muted">${p.mode_paiement}</td>
            <td>${payStatusBadge(p.statut)}</td>
            <td class="text-muted">${formatDateTime(p.date_paiement)}</td>
        </tr>
    `).join('');
}

async function savePaiement() {
    const data = {
        client_id: document.getElementById('paiement-client-id').value,
        montant: document.getElementById('paiement-montant').value,
        mode_paiement: document.getElementById('paiement-mode').value,
        note: document.getElementById('paiement-note').value,
    };
    if (!data.client_id || !data.montant) {
        showToast('Client et montant requis', 'error'); return;
    }
    const res = await apiCall('add_paiement', 'POST', data);
    if (res.success) {
        showToast(res.message, 'success');
        closeModal('paiement-modal');
        loadPaiements();
    } else showToast(res.message || 'Erreur', 'error');
}

// ============================================
// COACH SPACE
// ============================================
async function loadCoachSpace() {
    document.getElementById('coach-name-display').textContent = currentUser.name;
    document.getElementById('coach-avatar-display').textContent = getInitials(currentUser.name);
    const seances = await apiCall('get_seances&coach_id=' + currentUser.id, 'GET');
    renderCoachSeances(seances);
}

function renderCoachSeances(seances) {
    const container = document.getElementById('coach-seances-list');
    if (!seances.length) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucune séance assignée</p></div>`;
        return;
    }
    container.innerHTML = '<div class="planning-grid">' + seances.map(s => {
        const pct = s.capacite_max > 0 ? Math.min(100, (s.nb_inscrits / s.capacite_max) * 100) : 0;
        return `
        <div class="seance-card">
            <div class="time-badge">${formatDateShort(s.date_seance)} · ${s.heure_debut.slice(0,5)}–${s.heure_fin.slice(0,5)}</div>
            <h4>${s.titre}</h4>
            <div class="coach-info"><i class="fas fa-door-open"></i> ${s.salle || '—'}</div>
            <div class="capacity-bar"><div class="capacity-fill" style="width:${pct}%"></div></div>
            <div class="capacity-text">${s.nb_inscrits} / ${s.capacite_max} inscrits</div>
            <button class="btn btn-outline btn-xs mt-1" onclick="openInscriptions(${s.id}, '${s.titre}')">
                <i class="fas fa-list"></i> Voir les inscrits
            </button>
        </div>`;
    }).join('') + '</div>';
}

// ============================================
// STATS
// ============================================
async function loadStats() {
    const stats = await apiCall('get_stats', 'GET');
    document.getElementById('stats-actifs').textContent   = stats.clients_actifs;
    document.getElementById('stats-total').textContent    = stats.total_clients;
    document.getElementById('stats-expires').textContent  = stats.abonnements_expires;
    document.getElementById('stats-revenus').textContent  = formatMoney(stats.revenus_mois) + ' MAD';
    renderStatsChart(stats.revenus_chart);
    loadExpiredAbonnements();
}

function renderStatsChart(data) {
    const ctx = document.getElementById('statsChart');
    if (!ctx) return;
    if (window._statsChart) window._statsChart.destroy();
    window._statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.mois),
            datasets: [{
                label: 'Revenus (MAD)',
                data: data.map(d => parseFloat(d.total)),
                borderColor: '#B22222',
                backgroundColor: 'rgba(139,0,0,0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8B0000',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
            }
        }
    });
}

async function loadExpiredAbonnements() {
    const abos = await apiCall('get_abonnements', 'GET');
    const expired = abos.filter(a => a.statut_reel === 'expiré');
    const tbody = document.getElementById('expired-tbody');
    if (!expired.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">Aucun abonnement expiré</td></tr>`;
        return;
    }
    tbody.innerHTML = expired.map(a => `
        <tr>
            <td><strong>${a.prenom} ${a.nom}</strong></td>
            <td class="text-muted">${a.email}</td>
            <td><span class="badge badge-info">${a.type_abonnement}</span></td>
            <td style="color:var(--danger)">${formatDate(a.date_fin)}</td>
            <td>${statusBadge(a.statut_reel)}</td>
        </tr>
    `).join('');
}

// ============================================
// LOGIN
// ============================================
async function doLogin() {
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');
    if (!email || !password) { showToast('Remplissez tous les champs', 'error'); return; }
    btn.innerHTML = '<div class="loader"></div> Connexion...';
    btn.disabled = true;
    const res = await apiCall('login', 'POST', { email, password });
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    btn.disabled = false;
    if (res.success) {
        currentUser = res;
        currentUser.id = null; // will be fetched from check_session
        await checkSession();
    } else {
        showToast(res.message || 'Connexion échouée', 'error');
    }
}

async function doLogout() {
    await apiCall('logout', 'POST');
    currentUser = null;
    showLogin();
    showToast('Déconnexion réussie', 'info');
}

// ============================================
// MODAL HELPERS
// ============================================
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// Close on overlay click
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'info') {
    const icons = { success: 'fa-check', error: 'fa-times', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
        <div class="toast-msg">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// ============================================
// SIDEBAR MOBILE
// ============================================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-backdrop').classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('active');
}

// ============================================
// API HELPER
// ============================================
async function apiCall(action, method = 'GET', data = null) {
    try {
        const opts = { method, headers: {} };
        if (method === 'POST') {
            const form = new FormData();
            form.append('action', action);
            if (data) Object.entries(data).forEach(([k, v]) => form.append(k, v));
            opts.body = form;
        }
        const url = method === 'GET' ? `${API}?action=${action}` : API;
        const res = await fetch(url, opts);
        return await res.json();
    } catch (e) {
        console.error('API Error:', e);
        return { error: e.message };
    }
}

// ============================================
// FORMAT HELPERS
// ============================================
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
}

function formatDateFull(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR') + ' ' + new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatMoney(v) {
    return parseFloat(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function getInitials(name) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function updateDate() {
    const el = document.getElementById('topbar-date');
    if (el) el.textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

// ============================================
// BADGE HELPERS
// ============================================
function statusBadge(statut) {
    const map = {
        'actif':    '<span class="badge badge-actif"><i class="fas fa-circle"></i> Actif</span>',
        'expiré':   '<span class="badge badge-expire"><i class="fas fa-times-circle"></i> Expiré</span>',
        'suspendu': '<span class="badge badge-suspendu"><i class="fas fa-pause-circle"></i> Suspendu</span>',
    };
    return map[statut] || `<span class="badge">${statut || '—'}</span>`;
}

function payStatusBadge(statut) {
    const map = {
        'payé':       '<span class="badge badge-paye">Payé</span>',
        'en attente': '<span class="badge badge-attente">En attente</span>',
        'remboursé':  '<span class="badge badge-info">Remboursé</span>',
    };
    return map[statut] || `<span class="badge">${statut || '—'}</span>`;
}

// Enter key on login form
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') {
        doLogin();
    }
});
