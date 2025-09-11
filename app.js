// SMASHERS Badminton Portal Application - Client-Side v2.1 (FIXED)

class SmashersApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'login-section';
    this.apiUrl = 'https://smashers-backend-836155982119.us-central1.run.app/api'; // Your deployed URL
    
    this.allUsers = [];
    this.allCouples = [];
    
    this.playerRankChart = null;
    this.coupleRankChart = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateNav();
    this.showSection('login-section');
    this.startMatchPolling();
  }

  // --- API HELPER ---
  async apiRequest(endpoint, method = 'GET', body = null) {
      try {
          const options = { method, headers: { 'Content-Type': 'application/json' } };
          if (body) options.body = JSON.stringify(body);
          const response = await fetch(`${this.apiUrl}${endpoint}`, options);
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'An API error occurred');
          return data;
      } catch (error) {
          this.showNotification(error.message, 'error');
          throw error;
      }
  }

  // --- AUTHENTICATION & NAVIGATION ---
  async login(email, password) {
    try {
        const data = await this.apiRequest('/login', 'POST', { email, password });
        this.currentUser = data.user;
        this.updateNav();
        this.showSection('dashboard-section');
        this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
    } catch (error) {}
  }
  logout() {
    this.currentUser = null;
    this.updateNav();
    this.showSection('login-section');
  }
  async register(userData) {
    try {
        await this.apiRequest('/register', 'POST', userData);
        this.showNotification('Registration submitted! Awaiting admin approval.', 'success');
        document.getElementById('register-form').reset();
        this.showSection('login-section');
    } catch (error) {}
  }
  updateNav() {
    const isAdmin = this.currentUser?.role === 'Admin';
    const isLoggedIn = !!this.currentUser;
    const navItems = {
      'nav-register': !isLoggedIn, 'nav-login': !isLoggedIn,
      'nav-dashboard': isLoggedIn, 'nav-matches': isLoggedIn,
      'nav-history': isLoggedIn, 'nav-rank-players': isLoggedIn,
      'nav-rank-couples': isLoggedIn, 'btn-logout': isLoggedIn,
      'nav-approval': isAdmin, 'nav-attendance': isAdmin,
      'nav-game': isAdmin, 'nav-couples': isAdmin,
    };
    Object.entries(navItems).forEach(([id, show]) => {
      document.getElementById(id)?.classList.toggle('hidden', !show);
    });
  }
  showSection(sectionId) {
    document.querySelectorAll('main section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('hidden');
      this.currentSection = sectionId;
    }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-active'));
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('nav-active');
    this.loadSectionData(sectionId);
  }

  // --- DATA LOADING ---
  loadSectionData(sectionId) {
    switch (sectionId) {
      case 'dashboard-section': this.loadDashboard(); break;
      case 'approval-section': this.loadApprovalPage(); break;
      case 'attendance-section': this.loadAttendancePage(); break;
      case 'couples-section': this.loadCouplesManagementPage(); break;
      case 'game-section': this.loadGamePage(); break;
      case 'matches-section': this.loadMatchesPage(); break;
      case 'history-section': this.loadMatchHistoryPage(); break;
      case 'rank-player-section': this.loadPlayerRankings(); break;
      case 'rank-couples-section': this.loadCoupleRankings(); break;
    }
  }

  // --- PAGES & FEATURES ---
    loadDashboard() {
        document.getElementById('dash-user-name').textContent = this.currentUser.name;
    }

    async loadApprovalPage() {
        const tbody = document.querySelector('#approval-table tbody');
        try {
            const pendingUsers = await this.apiRequest('/users/pending');
            if (pendingUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No pending approvals</td></tr>';
                return;
            }
            tbody.innerHTML = pendingUsers.map(user => `
                <tr>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td class="admin-actions">
                        <button class="btn btn--primary btn--sm" data-action="approve" data-user-id="${user.id}">Approve</button>
                        <button class="btn btn--secondary btn--sm" data-action="reject" data-user-id="${user.id}">Reject</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
             tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Could not load users</td></tr>';
        }
    }

    async approveUser(userId) {
        try {
            await this.apiRequest(`/users/${userId}/approve`, 'PATCH');
            this.showNotification('User approved!', 'success');
            this.loadApprovalPage();
        } catch (error) {}
    }

    async rejectUser(userId) {
        try {
            await this.apiRequest(`/users/${userId}`, 'DELETE');
            this.showNotification('User rejected.', 'info');
            this.loadApprovalPage();
        } catch (error) {}
    }

    async loadAttendancePage() {
        const listEl = document.getElementById('attendance-list');
        try {
            const [users, attendanceData] = await Promise.all([this.apiRequest('/users/approved'), this.apiRequest('/attendance/today')]);
            const presentSet = new Set(attendanceData.presentUsers);
            listEl.innerHTML = users.map(user => `
                <div class="attendance-item">
                    <input type="checkbox" class="attendance-checkbox" id="att-${user.id}" ${presentSet.has(user.id) ? 'checked' : ''}>
                    <label for="att-${user.id}">${this.escapeHtml(user.name)}</label>
                </div>
            `).join('');
        } catch (error) {
            listEl.innerHTML = '<div class="empty-state">Could not load attendance data.</div>';
        }
    }

    async saveAttendance() {
        const presentUsers = Array.from(document.querySelectorAll('.attendance-checkbox:checked')).map(cb => cb.id.replace('att-', ''));
        try {
            await this.apiRequest('/attendance', 'POST', { presentUsers });
            this.showNotification('Attendance saved!', 'success');
        } catch (error) {}
    }
  
  async loadCouplesManagementPage() {
    try {
        const [users, couples] = await Promise.all([
            this.apiRequest('/users/approved'),
            this.apiRequest('/couples')
        ]);
        this.allUsers = users;
        this.allCouples = couples;

        const playerOptions = users.map(u => `<option value="${u.id}">${this.escapeHtml(u.name)}</option>`).join('');
        document.getElementById('couple-player1').innerHTML = playerOptions;
        document.getElementById('couple-player2').innerHTML = playerOptions;

        const couplesList = document.getElementById('couples-list');
        if (couples.length === 0) {
            couplesList.innerHTML = `<div class="empty-state">No couples formed yet.</div>`;
            return;
        }
        couplesList.innerHTML = couples.map(c => `
            <div class="couple-item">
                <span>${this.escapeHtml(c.player1Name)} & ${this.escapeHtml(c.player2Name)}</span>
                <button class="btn btn--secondary btn--sm" data-action="disband-couple" data-couple-id="${c.id}">Disband</button>
            </div>
        `).join('');
    } catch (error) {}
  }
  
  async createCouple(player1Id, player2Id) {
    if (player1Id === player2Id) {
        this.showNotification('A player cannot be coupled with themselves.', 'error');
        return;
    }
    try {
        await this.apiRequest('/couples', 'POST', { player1Id, player2Id });
        this.showNotification('Couple created!', 'success');
        this.loadCouplesManagementPage();
    } catch (error) {}
  }

  async disbandCouple(coupleId) {
    if (!confirm('Are you sure you want to disband this couple?')) return;
    try {
        await this.apiRequest(`/couples/${coupleId}`, 'DELETE');
        this.showNotification('Couple disbanded.', 'info');
        this.loadCouplesManagementPage();
    } catch (error) {}
  }

  async loadGamePage() {
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('manual-mode-container').classList.toggle('hidden', e.target.value !== 'manual');
            document.getElementById('couples-mode-container').classList.toggle('hidden', e.target.value !== 'couples');
        });
    });

    try {
        const [availablePlayers, couples] = await Promise.all([
            this.apiRequest('/users/available'),
            this.apiRequest('/couples')
        ]);
        const playerOptions = '<option value="">Select Player</option>' + availablePlayers.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
        document.querySelectorAll('.manual-player-select').forEach(select => select.innerHTML = playerOptions);
        const coupleOptions = '<option value="">Select Couple</option>' + couples.map(c => `<option value="${c.id}" data-p1="${c.player1Id}" data-p2="${c.player2Id}">${this.escapeHtml(c.player1Name)} & ${this.escapeHtml(c.player2Name)}</option>`).join('');
        document.querySelectorAll('.couple-select').forEach(select => select.innerHTML = coupleOptions);
    } catch (error) {}
  }

  async createGame() {
    const mode = document.querySelector('input[name="game-mode"]:checked').value;
    let teamA, teamB;
    if (mode === 'manual') {
        teamA = [document.getElementById('teamA1').value, document.getElementById('teamA2').value];
        teamB = [document.getElementById('teamB1').value, document.getElementById('teamB2').value];
        const allPlayers = [...teamA, ...teamB];
        if (allPlayers.some(p => !p)) { this.showNotification('Please select all players.', 'error'); return; }
        if (new Set(allPlayers).size !== 4) { this.showNotification('Each player must be unique.', 'error'); return; }
    } else {
        const teamACoupleSelect = document.getElementById('teamA-couple');
        const teamBCoupleSelect = document.getElementById('teamB-couple');
        if (!teamACoupleSelect.value || !teamBCoupleSelect.value) { this.showNotification('Please select both couples.', 'error'); return; }
        if (teamACoupleSelect.value === teamBCoupleSelect.value) { this.showNotification('Teams cannot be the same couple.', 'error'); return; }
        const teamAOption = teamACoupleSelect.options[teamACoupleSelect.selectedIndex];
        const teamBOption = teamBCoupleSelect.options[teamBCoupleSelect.selectedIndex];
        teamA = [teamAOption.dataset.p1, teamAOption.dataset.p2];
        teamB = [teamBOption.dataset.p1, teamBOption.dataset.p2];
    }
    try {
        await this.apiRequest('/matches', 'POST', { teamA, teamB });
        this.showNotification('Game created!', 'success');
        this.showSection('matches-section');
    } catch (error) {}
  }
  
    async loadMatchesPage() {
        const listEl = document.getElementById('matches-list');
        try {
            const ongoingMatches = await this.apiRequest('/matches/ongoing');
            if (ongoingMatches.length === 0) {
                listEl.innerHTML = '<div class="empty-state"><h3>No ongoing matches</h3><p>Create a new game from the admin panel.</p></div>';
                return;
            }
            listEl.innerHTML = ongoingMatches.map(match => `
                <div class="match-card">
                  <div class="match-status match-status--ongoing">Ongoing</div>
                  <div class="team-score"><span>${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}</span><span class="score-display">${match.scoreTeamA}</span></div>
                  <div class="vs-divider">VS</div>
                  <div class="team-score"><span>${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}</span><span class="score-display">${match.scoreTeamB}</span></div>
                  ${this.currentUser?.role === 'Admin' ? `
                    <div class="flex gap-8 mt-8 flex-wrap">
                      <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="A" value="${match.scoreTeamA}">
                      <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="B" value="${match.scoreTeamB}">
                      <button class="btn btn--primary btn--sm" data-action="update-score" data-match-id="${match.id}">Update</button>
                      <button class="btn btn--secondary btn--sm" data-action="end-match" data-match-id="${match.id}">End Match</button>
                    </div>` : ''}
                </div>
            `).join('');
        } catch (error) {
            listEl.innerHTML = '<div class="empty-state">Could not load matches.</div>';
        }
    }

    async updateScore(matchId) {
        const scoreA = document.querySelector(`input[data-match-id="${matchId}"][data-team="A"]`).value;
        const scoreB = document.querySelector(`input[data-match-id="${matchId}"][data-team="B"]`).value;
        try {
            await this.apiRequest(`/matches/${matchId}/score`, 'PATCH', { scoreTeamA: parseInt(scoreA), scoreTeamB: parseInt(scoreB) });
            this.showNotification('Score updated.', 'success');
            this.loadMatchesPage();
        } catch(e) {}
    }

    async endMatch(matchId) {
        if (!confirm('Are you sure you want to end this match? Ratings will be updated.')) return;
        try {
            await this.apiRequest(`/matches/${matchId}/end`, 'POST');
            this.showNotification('Match completed!', 'success');
            this.loadMatchesPage();
        } catch (error) {}
    }

  loadMatchHistoryPage() {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    document.getElementById('start-date').value = sevenDaysAgo;
    document.getElementById('end-date').value = today;
    this.fetchMatchHistory();
  }

  async fetchMatchHistory() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (!startDate || !endDate) { this.showNotification('Please select a start and end date.', 'error'); return; }
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = 'Loading...';
    try {
        const history = await this.apiRequest(`/matches/history?startDate=${startDate}&endDate=${endDate}`);
        if (history.length === 0) { listEl.innerHTML = '<div class="empty-state">No completed matches found in this date range.</div>'; return; }
        listEl.innerHTML = history.map(match => {
            const winnerText = match.winnerTeam === 'A' 
                ? `${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}`
                : `${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}`;
            return `
            <div class="history-card">
              <div class="history-card__header"><span>${new Date(match.date).toLocaleDateString()}</span><span class="history-card__winner">🏆 Winner: ${winnerText}</span></div>
              <div class="team-score"><span>${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}</span><span class="score-display">${match.scoreTeamA}</span></div>
              <div class="vs-divider">VS</div>
              <div class="team-score"><span>${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}</span><span class="score-display">${match.scoreTeamB}</span></div>
            </div>`;
        }).join('');
    } catch (error) { listEl.innerHTML = '<div class="empty-state">Could not load match history.</div>'; }
  }

    async loadPlayerRankings() {
        const ctx = document.getElementById('playerRankChart');
        try {
            const players = await this.apiRequest('/rankings/players');
            if (this.playerRankChart) this.playerRankChart.destroy();
            this.playerRankChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: players.map(p => p.name),
                    datasets: [{ label: 'Rating', data: players.map(p => p.rating), backgroundColor: '#1FB8CD' }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Top 10 Player Rankings' } } }
            });
        } catch(e) {}
    }
  
  async loadCoupleRankings() {
    const ctx = document.getElementById('coupleRankChart');
    if (!ctx) return;
    try {
        const couples = await this.apiRequest('/rankings/couples');
        if (this.coupleRankChart) this.coupleRankChart.destroy();
        const coupleNames = couples.map(c => `${this.escapeHtml(c.player1Name)} & ${this.escapeHtml(c.player2Name)}`);
        this.coupleRankChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: coupleNames,
                datasets: [{ label: 'Rating', data: couples.map(c => c.rating), backgroundColor: '#FFC185' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Top 10 Couple Rankings' } } }
        });
    } catch(error) {}
  }
  
  // --- UTILITIES & EVENT LISTENERS ---
    escapeHtml(unsafe) {
        return unsafe?.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") || '';
    }
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }
    startMatchPolling() {
        setInterval(() => {
            if (this.currentSection === 'matches-section' && this.currentUser) {
                this.loadMatchesPage();
            }
        }, 10000);
    }
  
  setupEventListeners() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navbar = document.getElementById('navbar');
    const iconMenu = mobileMenuBtn.querySelector('.icon-menu');
    const iconClose = mobileMenuBtn.querySelector('.icon-close');

    mobileMenuBtn.addEventListener('click', () => {
        navbar.classList.toggle('nav-open');
        iconMenu.classList.toggle('hidden');
        iconClose.classList.toggle('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', navbar.classList.contains('nav-open'));
    });

    document.addEventListener('click', (e) => {
      // Navigation link clicks
      if (e.target.classList.contains('nav-btn')) {
        e.preventDefault();
        this.showSection(e.target.dataset.section);
        if (navbar.classList.contains('nav-open')) mobileMenuBtn.click();
        return;
      }
      // Delegated actions
      if (e.target.dataset.action) {
        e.preventDefault();
        const { action, userId, matchId, coupleId } = e.target.dataset;
        switch (action) {
          case 'approve': this.approveUser(userId); break;
          case 'reject': this.rejectUser(userId); break;
          case 'disband-couple': this.disbandCouple(coupleId); break;
          case 'update-score': this.updateScore(matchId); break;
          case 'end-match': this.endMatch(matchId); break;
        }
        return;
      }
      // Other buttons
      if (e.target.id === 'btn-logout') { e.preventDefault(); this.logout(); }
      if (e.target.id === 'btn-reg-cancel') { this.showSection('login-section'); }
      if (e.target.id === 'btn-game-cancel') { this.showSection('dashboard-section'); }
    });

    document.addEventListener('submit', (e) => {
        e.preventDefault();
        switch (e.target.id) {
            case 'register-form':
                // *** THIS IS THE CORRECTED CODE ***
                const userData = {
                    name: document.getElementById('reg-name').value.trim(),
                    email: document.getElementById('reg-email').value.trim(),
                    password: document.getElementById('reg-password').value,
                    racket: document.getElementById('reg-racket').value.trim(),
                    tension: document.getElementById('reg-tension').value.trim()
                };
                if (!userData.name || !userData.email || !userData.password) {
                    this.showNotification('Name, email, and password are required.', 'error');
                    return;
                }
                this.register(userData);
                break;
            case 'login-form':
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                this.login(email, password);
                break;
            case 'attendance-form': this.saveAttendance(); break;
            case 'couple-form':
                const p1 = document.getElementById('couple-player1').value;
                const p2 = document.getElementById('couple-player2').value;
                this.createCouple(p1, p2);
                break;
            case 'game-form': this.createGame(); break;
            case 'history-filter-form': this.fetchMatchHistory(); break;
        }
    });
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmashersApp();
});
