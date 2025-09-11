// SMASHERS Badminton Portal Application - Client-Side

class SmashersApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'login-section';
    // The API URL for your backend. For local development, this is correct.
    // For deployment, you will change this to your live server URL.
    // Change this line
    this.apiUrl = 'https://smashers-backend-836155982119.us-central1.run.app/api';

    // No more local data arrays!
    // this.users = [];
    // this.couples = [];
    // this.matches = [];
    // this.attendance = {};

    this.playerRankChart = null;
    this.coupleRankChart = null;
    
    this.init();
  }

  init() {
    // No more sample data!
    // this.createSampleData();
    this.setupEventListeners();
    this.updateNav();
    this.showSection('login-section');
    
    this.startMatchPolling();
  }

  // --- NEW: API HELPER ---
  // A helper function to make API requests and handle errors consistently.
  async apiRequest(endpoint, method = 'GET', body = null) {
      try {
          const options = {
              method,
              headers: {
                  'Content-Type': 'application/json',
              },
          };
          if (body) {
              options.body = JSON.stringify(body);
          }
          const response = await fetch(`${this.apiUrl}${endpoint}`, options);
          const data = await response.json();
          if (!response.ok) {
              throw new Error(data.message || 'An API error occurred');
          }
          return data;
      } catch (error) {
          console.error(`API Error on ${method} ${endpoint}:`, error);
          this.showNotification(error.message, 'error');
          throw error; // Re-throw the error so the calling function can handle it
      }
  }

  // --- AUTHENTICATION (Now uses API) ---
  async login(email, password) {
    try {
        const data = await this.apiRequest('/login', 'POST', { email, password });
        this.currentUser = data.user;
        this.updateNav();
        this.showSection('dashboard-section');
        this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
    } catch (error) {
        // Error notification is already handled by apiRequest
    }
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
    } catch (error) {
        // Error notification is already handled by apiRequest
    }
  }

  // --- NAVIGATION (No changes needed) ---
  updateNav() {
    const navItems = {
      'nav-register': !this.currentUser,
      'nav-login': !this.currentUser,
      'nav-dashboard': !!this.currentUser,
      'nav-approval': this.currentUser?.role === 'Admin',
      'nav-attendance': this.currentUser?.role === 'Admin',
      'nav-game': this.currentUser?.role === 'Admin',
      'nav-matches': !!this.currentUser,
      'nav-rank-players': !!this.currentUser,
      'nav-rank-couples': !!this.currentUser,
      'btn-logout': !!this.currentUser
    };

    Object.entries(navItems).forEach(([id, show]) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle('hidden', !show);
      }
    });
  }

  showSection(sectionId) {
    document.querySelectorAll('main section').forEach(section => {
      section.classList.add('hidden');
    });
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('hidden');
      this.currentSection = sectionId;
    }
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('nav-active');
    });
    const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNav) {
      activeNav.classList.add('nav-active');
    }
    this.loadSectionData(sectionId);
  }

  // --- DATA LOADING (Now fetches from API) ---
  loadSectionData(sectionId) {
    switch (sectionId) {
      case 'dashboard-section':
        this.loadDashboard();
        break;
      case 'approval-section':
        this.loadApprovalPage();
        break;
      case 'attendance-section':
        this.loadAttendancePage();
        break;
      case 'game-section':
        this.loadGamePage();
        break;
      case 'matches-section':
        this.loadMatchesPage();
        break;
      case 'rank-player-section':
        this.loadPlayerRankings();
        break;
      case 'rank-couples-section':
        this.loadCoupleRankings();
        break;
    }
  }

  loadDashboard() {
    const nameElement = document.getElementById('dash-user-name');
    if (nameElement && this.currentUser) {
      nameElement.textContent = this.currentUser.name;
    }
  }

  async loadApprovalPage() {
    const tbody = document.querySelector('#approval-table tbody');
    if (!tbody) return;
    try {
        const pendingUsers = await this.apiRequest('/users/pending');
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
        if (pendingUsers.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No pending approvals</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">Could not load data</td></tr>';
    }
  }

  async approveUser(userId) {
    try {
        await this.apiRequest(`/users/${userId}/approve`, 'PATCH');
        this.showNotification('User approved successfully', 'success');
        this.loadApprovalPage(); // Refresh the list
    } catch (error) {}
  }

  async rejectUser(userId) {
     try {
        await this.apiRequest(`/users/${userId}`, 'DELETE');
        this.showNotification('User rejected', 'info');
        this.loadApprovalPage(); // Refresh the list
    } catch (error) {}
  }
  
  async loadAttendancePage() {
    const dateElement = document.getElementById('attendance-date');
    const listElement = document.getElementById('attendance-list');
    if (dateElement) dateElement.textContent = new Date().toLocaleDateString();
    if (!listElement) return;

    try {
        // Fetch all approved users and today's attendance in parallel
        const [approvedUsers, attendanceData] = await Promise.all([
            this.apiRequest('/users/approved'),
            this.apiRequest('/attendance/today')
        ]);
        const todayAttendance = new Set(attendanceData.presentUsers);

        listElement.innerHTML = approvedUsers.map(user => `
          <div class="attendance-item">
            <input type="checkbox" class="attendance-checkbox" 
                   id="att-${user.id}" 
                   ${todayAttendance.has(user.id) ? 'checked' : ''}>
            <label for="att-${user.id}">${this.escapeHtml(user.name)}</label>
          </div>
        `).join('');
    } catch (error) {
        listElement.innerHTML = '<div class="empty-state">Could not load attendance data</div>';
    }
  }

  async saveAttendance() {
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const presentUsers = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.id.replace('att-', ''));

    try {
        await this.apiRequest('/attendance', 'POST', { presentUsers });
        this.showNotification('Attendance saved', 'success');
    } catch (error) {}
  }

  async loadGamePage() {
    const selects = ['teamA1', 'teamA2', 'teamB1', 'teamB2'];
    try {
        const availablePlayers = await this.apiRequest('/users/available');
        selects.forEach(selectId => {
          const select = document.getElementById(selectId);
          if (select) {
            select.innerHTML = '<option value="">Select Player</option>' +
              availablePlayers.map(player => 
                `<option value="${player.id}">${this.escapeHtml(player.name)}</option>`
              ).join('');
          }
        });
    } catch (error) {
        // Handle error, maybe disable the form
    }
  }

  async createGame(teamA1, teamA2, teamB1, teamB2) {
    try {
        await this.apiRequest('/matches', 'POST', { teamA1, teamA2, teamB1, teamB2 });
        this.showNotification('Game created successfully', 'success');
        document.getElementById('game-form').reset();
        this.showSection('matches-section');
    } catch (error) {}
  }
  
  async loadMatchesPage() {
    const matchesList = document.getElementById('matches-list');
    if (!matchesList) return;
    try {
        const ongoingMatches = await this.apiRequest('/matches/ongoing');
        if (ongoingMatches.length === 0) {
            matchesList.innerHTML = '<div class="empty-state"><h3>No ongoing matches</h3><p>Check back later or create a new game.</p></div>';
            return;
        }

        matchesList.innerHTML = ongoingMatches.map(match => `
            <div class="match-card">
              <div class="match-status match-status--ongoing">Ongoing</div>
              <div class="team-score">
                <span>${this.escapeHtml(match.teamAPlayer1Name)} & ${this.escapeHtml(match.teamAPlayer2Name)}</span>
                <span class="score-display">${match.scoreTeamA}</span>
              </div>
              <div class="vs-divider">VS</div>
              <div class="team-score">
                <span>${this.escapeHtml(match.teamBPlayer1Name)} & ${this.escapeHtml(match.teamBPlayer2Name)}</span>
                <span class="score-display">${match.scoreTeamB}</span>
              </div>
              ${this.currentUser?.role === 'Admin' ? `
                <div class="flex gap-8 mt-8">
                  <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="A" value="${match.scoreTeamA}" min="0" max="30">
                  <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="B" value="${match.scoreTeamB}" min="0" max="30">
                  <button class="btn btn--primary btn--sm" data-action="update-score" data-match-id="${match.id}">Update Score</button>
                  <button class="btn btn--secondary btn--sm" data-action="end-match" data-match-id="${match.id}">End Match</button>
                </div>
              ` : ''}
            </div>
        `).join('');
    } catch (error) {
        matchesList.innerHTML = '<div class="empty-state"><h3>Could not load matches</h3></div>';
    }
  }

  async updateScore(matchId) {
    const scoreAInput = document.querySelector(`input[data-match-id="${matchId}"][data-team="A"]`);
    const scoreBInput = document.querySelector(`input[data-match-id="${matchId}"][data-team="B"]`);
    if (!scoreAInput || !scoreBInput) return;

    const scoreTeamA = parseInt(scoreAInput.value) || 0;
    const scoreTeamB = parseInt(scoreBInput.value) || 0;

    try {
        await this.apiRequest(`/matches/${matchId}/score`, 'PATCH', { scoreTeamA, scoreTeamB });
        this.showNotification('Score updated', 'success');
        
        // Auto-end match logic (optional, can also be handled on backend)
        if ((scoreTeamA >= 21 || scoreTeamB >= 21) && Math.abs(scoreTeamA - scoreTeamB) >= 2) {
          await this.endMatch(matchId);
        } else {
          this.loadMatchesPage();
        }
    } catch (error) {}
  }

  async endMatch(matchId) {
    try {
        await this.apiRequest(`/matches/${matchId}/end`, 'POST');
        this.showNotification('Match completed and ratings updated!', 'success');
        this.loadMatchesPage();
    } catch (error) {}
  }
  
  // RATING LOGIC IS NOW ON THE BACKEND! These functions are removed from the client.
  // updatePlayerRatings() { ... }
  // updateCoupleRatings() { ... }

  async loadPlayerRankings() {
    const ctx = document.getElementById('playerRankChart');
    if (!ctx) return;
    try {
        const players = await this.apiRequest('/rankings/players');
        if (this.playerRankChart) this.playerRankChart.destroy();
        this.playerRankChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: players.map(p => p.name),
            datasets: [{ label: 'Rating', data: players.map(p => p.rating), backgroundColor: '#1FB8CD' }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Top Player Rankings' } } }
        });
    } catch (error) {}
  }

  loadCoupleRankings() {
    // This functionality is currently stubbed on the backend.
    // To implement fully, create a 'couples' collection in Firestore,
    // build the necessary API endpoints, and then fetch/display the data here.
    const ctx = document.getElementById('coupleRankChart');
    if (!ctx) return;
    if (this.coupleRankChart) this.coupleRankChart.destroy();
    this.showNotification('Couple rankings are not yet implemented.', 'info');
  }

  // --- UTILITIES & EVENT LISTENERS (Mostly unchanged) ---
  escapeHtml(unsafe) {
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
    }, 10000); // Poll every 10 seconds
  }

    // Replace the entire setupEventListeners function with this one

  setupEventListeners() {
    // --- NEW: Mobile Menu Logic ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navbar = document.getElementById('navbar');
    const iconMenu = mobileMenuBtn.querySelector('.icon-menu');
    const iconClose = mobileMenuBtn.querySelector('.icon-close');

    mobileMenuBtn.addEventListener('click', () => {
        const isExpanded = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        navbar.classList.toggle('nav-open');
        iconMenu.classList.toggle('hidden');
        iconClose.classList.toggle('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', !isExpanded);
    });
    
    // --- Delegated event handling for navigation and actions ---
    document.addEventListener('click', (e) => {
      // Logo click to go to dashboard
      if (e.target.closest('.logo') && this.currentUser) {
        e.preventDefault();
        this.showSection('dashboard-section');
        return;
      }

      // Navigation
      if (e.target.classList.contains('nav-btn') && e.target.hasAttribute('data-section')) {
        e.preventDefault();
        const targetSection = e.target.getAttribute('data-section');
        this.showSection(targetSection);
        
        // NEW: Close mobile menu after a link is clicked
        if (navbar.classList.contains('nav-open')) {
            navbar.classList.remove('nav-open');
            iconMenu.classList.remove('hidden');
            iconClose.classList.add('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      // Admin actions
      if (e.target.hasAttribute('data-action')) {
        e.preventDefault();
        const action = e.target.getAttribute('data-action');
        const userId = e.target.getAttribute('data-user-id');
        const matchId = e.target.getAttribute('data-match-id');

        switch (action) {
          case 'approve':
            if (userId) this.approveUser(userId);
            break;
          case 'reject':
            if (userId) this.rejectUser(userId);
            break;
          case 'update-score':
            if (matchId) this.updateScore(matchId);
            break;
          case 'end-match':
            if (matchId) this.endMatch(matchId);
            break;
        }
        return;
      }

      // Logout
      if (e.target.id === 'btn-logout') {
        e.preventDefault();
        this.logout();
        return;
      }

      // Form cancel buttons
      if (e.target.id === 'btn-reg-cancel') {
        e.preventDefault();
        const form = document.getElementById('register-form');
        if (form) form.reset();
        this.showSection('login-section');
        return;
      }

      if (e.target.id === 'btn-login-cancel') {
        e.preventDefault();
        const form = document.getElementById('login-form');
        if (form) form.reset();
        return;
      }

      if (e.target.id === 'btn-game-cancel') {
        e.preventDefault();
        const form = document.getElementById('game-form');
        if (form) form.reset();
        this.showSection('dashboard-section');
        return;
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (e.target.id === 'register-form') {
        const userData = {
          name: document.getElementById('reg-name').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          password: document.getElementById('reg-password').value,
          racket: document.getElementById('reg-racket').value.trim(),
          tension: document.getElementById('reg-tension').value.trim()
        };

        if (!userData.name || !userData.email || !userData.password) {
          this.showNotification('Please fill in all required fields', 'error');
          return;
        }

        if (this.register(userData)) {
          this.showNotification('Registration submitted! Awaiting admin approval.', 'success');
          e.target.reset();
          this.showSection('login-section');
        } else {
          this.showNotification('Email already exists', 'error');
        }
        return;
      }

      if (e.target.id === 'login-form') {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
          this.showNotification('Please enter both email and password', 'error');
          return;
        }

        if (this.login(email, password)) {
          this.updateNav();
          this.showSection('dashboard-section');
          this.showNotification(`Welcome back, ${this.currentUser.name}!`, 'success');
        } else {
          this.showNotification('Invalid credentials or account not approved', 'error');
        }
        return;
      }

      if (e.target.id === 'attendance-form') {
        e.preventDefault();
        this.saveAttendance();
        return;
      }

      if (e.target.id === 'game-form') {
        e.preventDefault();
        const teamA1 = document.getElementById('teamA1').value;
        const teamA2 = document.getElementById('teamA2').value;
        const teamB1 = document.getElementById('teamB1').value;
        const teamB2 = document.getElementById('teamB2').value;

        if (!teamA1 || !teamA2 || !teamB1 || !teamB2) {
          this.showNotification('Please select all players', 'error');
          return;
        }

        const allPlayers = [teamA1, teamA2, teamB1, teamB2];
        const uniquePlayers = new Set(allPlayers);
        if (uniquePlayers.size !== 4) {
          this.showNotification('Each player can only be selected once', 'error');
          return;
        }

        this.createGame(teamA1, teamA2, teamB1, teamB2);
        return;
      }
    });
  }

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmashersApp();
});
