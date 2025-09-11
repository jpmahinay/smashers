// SMASHERS Badminton Portal Application - Client-Side v2

class SmashersApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'login-section';
    this.apiUrl = 'https://smashers-backend-836155982119.us-central1.run.app/api'; // <-- IMPORTANT: Use your deployed URL
    
    // Client-side cache for data frequently used
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

  // --- API HELPER (no changes) ---
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

  // --- AUTHENTICATION & NAVIGATION (updated) ---
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
  async loadApprovalPage() { /* ... no changes ... */ }
  async approveUser(userId) { /* ... no changes ... */ }
  async rejectUser(userId) { /* ... no changes ... */ }
  async loadAttendancePage() { /* ... no changes ... */ }
  async saveAttendance() { /* ... no changes ... */ }
  
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
        this.loadCouplesManagementPage(); // Refresh the page
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
    // Setup mode switcher listener
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

        // Populate manual selection dropdowns
        const playerOptions = '<option value="">Select Player</option>' + availablePlayers.map(p => `<option value="${p.id}">${this.escapeHtml(p.name)}</option>`).join('');
        document.querySelectorAll('.manual-player-select').forEach(select => select.innerHTML = playerOptions);

        // Populate couple selection dropdowns
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
        if (allPlayers.some(p => !p)) {
            this.showNotification('Please select all players.', 'error'); return;
        }
        if (new Set(allPlayers).size !== 4) {
            this.showNotification('Each player must be unique.', 'error'); return;
        }
    } else { // Couples mode
        const teamACoupleSelect = document.getElementById('teamA-couple');
        const teamBCoupleSelect = document.getElementById('teamB-couple');
        if (!teamACoupleSelect.value || !teamBCoupleSelect.value) {
            this.showNotification('Please select both couples.', 'error'); return;
        }
        if (teamACoupleSelect.value === teamBCoupleSelect.value) {
            this.showNotification('Teams cannot be the same couple.', 'error'); return;
        }
        const teamAOption = teamACoupleSelect.options[teamACoupleSelect.selectedIndex];
        const teamBOption = teamBCoupleSelect.options[teamBCoupleSelect.selectedIndex];
        teamA = [teamAOption.dataset.p1, teamAOption.dataset.p2];
        teamB = [teamBOption.dataset.p1, teamBOption.dataset.p2];
    }
    
    try {
        await this.apiRequest('/matches', 'POST', { teamA, teamB });
        this.showNotification('Game created successfully!', 'success');
        this.showSection('matches-section');
    } catch (error) {}
  }
  
  async loadMatchesPage() { /* ... no changes ... */ }
  async updateScore(matchId) { /* ... no changes ... */ }
  async endMatch(matchId) { /* ... no changes ... */ }

  loadMatchHistoryPage() {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    document.getElementById('start-date').value = sevenDaysAgo;
    document.getElementById('end-date').value = today;
    this.fetchMatchHistory(); // Fetch initial view for the last 7 days
  }

  async fetchMatchHistory() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    if (!startDate || !endDate) {
        this.showNotification('Please select a start and end date.', 'error');
        return;
    }

    const listEl = document.getElementById('history-list');
    listEl.innerHTML = 'Loading...';

    try {
        const history = await this.apiRequest(`/matches/history?startDate=${startDate}&endDate=${endDate}`);
        if (history.length === 0) {
            listEl.innerHTML = '<div class="empty-state">No completed matches found in this date range.</div>';
            return;
        }
        listEl.innerHTML = history.map(match => {
            const winnerText = match.winnerTeam === 'A' 
                ? `${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}`
                : `${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}`;
            
            return `
            <div class="history-card">
              <div class="history-card__header">
                <span>${new Date(match.date).toLocaleDateString()}</span>
                <span class="history-card__winner">🏆 Winner: ${winnerText}</span>
              </div>
              <div class="team-score">
                <span>${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}</span>
                <span class="score-display">${match.scoreTeamA}</span>
              </div>
              <div class="vs-divider">VS</div>
              <div class="team-score">
                <span>${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}</span>
                <span class="score-display">${match.scoreTeamB}</span>
              </div>
            </div>`;
        }).join('');
    } catch (error) {
        listEl.innerHTML = '<div class="empty-state">Could not load match history.</div>';
    }
  }

  async loadPlayerRankings() { /* ... no changes ... */ }
  
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
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Top Couple Rankings' } } }
        });
    } catch(error) {}
  }
  
  // --- UTILITIES & EVENT LISTENERS ---
  escapeHtml(unsafe) { /* ... no changes ... */ }
  showNotification(message, type = 'info') { /* ... no changes ... */ }
  startMatchPolling() { /* ... no changes ... */ }
  
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
      // Delegated actions (approve, reject, disband, end match, etc.)
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
      // Other specific buttons
      if (e.target.id === 'btn-logout') { e.preventDefault(); this.logout(); }
    });

    document.addEventListener('submit', (e) => {
        e.preventDefault();
        switch (e.target.id) {
            case 'register-form':
                const userData = { /* ... get user data ... */ };
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
