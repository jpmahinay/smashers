// SMASHERS Badminton Portal Application

class SmashersApp {
  constructor() {
    this.currentUser = null;
    this.currentSection = 'login-section';
    this.users = [];
    this.couples = [];
    this.matches = [];
    this.attendance = {};
    this.playerRankChart = null;
    this.coupleRankChart = null;
    
    this.init();
  }

  init() {
    this.createSampleData();
    this.setupEventListeners();
    this.updateNav();
    this.showSection('login-section');
    
    // Start polling for ongoing matches
    this.startMatchPolling();
  }

  // Data Management - removed localStorage dependencies
  createSampleData() {
    const sampleUsers = [
      { id: 'admin1', name: 'Admin User', email: 'admin@smashers.com', password: 'admin123', role: 'Admin', status: 'Approved', racket: 'Yonex Astrox 99', tension: '26 lbs', rating: 1600 },
      { id: 'user1', name: 'Jane Doe', email: 'jane@example.com', password: 'password123', role: 'Player', status: 'Approved', racket: 'Yonex Astrox 88S', tension: '24 lbs', rating: 1500 },
      { id: 'user2', name: 'John Smith', email: 'john@example.com', password: 'password123', role: 'Player', status: 'Approved', racket: 'Victor Thruster K9900', tension: '25 lbs', rating: 1520 },
      { id: 'user3', name: 'Alice Wong', email: 'alice@example.com', password: 'password123', role: 'Player', status: 'Approved', racket: 'Li-Ning Aeronaut 9000', tension: '23 lbs', rating: 1480 },
      { id: 'user4', name: 'Bob Chen', email: 'bob@example.com', password: 'password123', role: 'Player', status: 'Approved', racket: 'Yonex Duora 10', tension: '26 lbs', rating: 1530 },
      { id: 'user5', name: 'Emma Liu', email: 'emma@example.com', password: 'password123', role: 'Player', status: 'Pending', racket: 'Victor Jetspeed S12', tension: '24 lbs', rating: 1500 }
    ];
    
    this.users = sampleUsers;
    
    // Create sample couples
    this.couples = [
      { id: 'couple1', player1Id: 'user1', player2Id: 'user2', dateFormed: '2024-01-15', totalWins: 8, totalMatches: 12, rating: 1510 },
      { id: 'couple2', player1Id: 'user3', player2Id: 'user4', dateFormed: '2024-02-01', totalWins: 6, totalMatches: 10, rating: 1505 }
    ];
    
    // Create sample ongoing match
    this.matches = [
      {
        id: 'match1',
        teamAplayer1: 'user1',
        teamAplayer2: 'user2',
        teamBplayer1: 'user3',
        teamBplayer2: 'user4',
        scoreTeamA: 15,
        scoreTeamB: 12,
        status: 'Ongoing',
        date: new Date().toISOString()
      }
    ];
    
    // Set today's attendance
    const today = new Date().toISOString().split('T')[0];
    this.attendance[today] = ['user1', 'user2', 'user3', 'user4'];
  }

  // Authentication
  login(email, password) {
    const user = this.users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password && 
      u.status === 'Approved'
    );
    
    if (user) {
      this.currentUser = user;
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    this.updateNav();
    this.showSection('login-section');
  }

  register(userData) {
    // Check if email already exists
    const existingUser = this.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
      return false;
    }

    const newUser = {
      id: 'user' + Date.now(),
      ...userData,
      role: 'Player',
      status: 'Pending',
      rating: 1500,
      partnerId: null
    };
    
    this.users.push(newUser);
    return true;
  }

  // Navigation
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
    // Hide all sections
    document.querySelectorAll('main section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show target section
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('hidden');
      this.currentSection = sectionId;
    }

    // Update navigation active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('nav-active');
    });

    const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNav) {
      activeNav.classList.add('nav-active');
    }

    // Load section-specific data
    this.loadSectionData(sectionId);
  }

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

  // Dashboard
  loadDashboard() {
    const nameElement = document.getElementById('dash-user-name');
    if (nameElement && this.currentUser) {
      nameElement.textContent = this.currentUser.name;
    }
  }

  // User Approval (Admin)
  loadApprovalPage() {
    const tbody = document.querySelector('#approval-table tbody');
    if (!tbody) return;

    const pendingUsers = this.users.filter(u => u.status === 'Pending');
    
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
  }

  approveUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.status = 'Approved';
      this.showNotification('User approved successfully', 'success');
      this.loadApprovalPage();
    }
  }

  rejectUser(userId) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
      this.users.splice(userIndex, 1);
      this.showNotification('User rejected', 'info');
      this.loadApprovalPage();
    }
  }

  // Attendance
  loadAttendancePage() {
    const today = new Date().toISOString().split('T')[0];
    const dateElement = document.getElementById('attendance-date');
    const listElement = document.getElementById('attendance-list');
    
    if (dateElement) {
      dateElement.textContent = new Date().toLocaleDateString();
    }

    if (!listElement) return;

    const approvedUsers = this.users.filter(u => u.status === 'Approved' && u.role === 'Player');
    const todayAttendance = this.attendance[today] || [];

    listElement.innerHTML = approvedUsers.map(user => `
      <div class="attendance-item">
        <input type="checkbox" class="attendance-checkbox" 
               id="att-${user.id}" 
               ${todayAttendance.includes(user.id) ? 'checked' : ''}>
        <label for="att-${user.id}">${this.escapeHtml(user.name)}</label>
      </div>
    `).join('');
  }

  saveAttendance() {
    const today = new Date().toISOString().split('T')[0];
    const checkboxes = document.querySelectorAll('.attendance-checkbox');
    const presentUsers = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.id.replace('att-', ''));

    this.attendance[today] = presentUsers;
    this.showNotification('Attendance saved', 'success');
  }

  // Game Creation
  loadGamePage() {
    const selects = ['teamA1', 'teamA2', 'teamB1', 'teamB2'];
    const availablePlayers = this.getAvailablePlayers();

    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '<option value="">Select Player</option>' +
          availablePlayers.map(player => 
            `<option value="${player.id}">${this.escapeHtml(player.name)}</option>`
          ).join('');
      }
    });
  }

  getAvailablePlayers() {
    const today = new Date().toISOString().split('T')[0];
    const presentUsers = this.attendance[today] || [];
    const ongoingMatches = this.matches.filter(m => m.status === 'Ongoing');
    const playingUsers = new Set();

    ongoingMatches.forEach(match => {
      playingUsers.add(match.teamAplayer1);
      playingUsers.add(match.teamAplayer2);
      playingUsers.add(match.teamBplayer1);
      playingUsers.add(match.teamBplayer2);
    });

    return this.users.filter(u => 
      u.status === 'Approved' && 
      u.role === 'Player' &&
      presentUsers.includes(u.id) &&
      !playingUsers.has(u.id)
    );
  }

  createGame(teamA1, teamA2, teamB1, teamB2) {
    const newMatch = {
      id: 'match' + Date.now(),
      teamAplayer1: teamA1,
      teamAplayer2: teamA2,
      teamBplayer1: teamB1,
      teamBplayer2: teamB2,
      scoreTeamA: 0,
      scoreTeamB: 0,
      status: 'Ongoing',
      date: new Date().toISOString()
    };

    this.matches.push(newMatch);
    this.showNotification('Game created successfully', 'success');
    
    // Reset form
    const form = document.getElementById('game-form');
    if (form) form.reset();
    this.showSection('matches-section');
  }

  // Matches
  loadMatchesPage() {
    const matchesList = document.getElementById('matches-list');
    if (!matchesList) return;

    const ongoingMatches = this.matches.filter(m => m.status === 'Ongoing');

    if (ongoingMatches.length === 0) {
      matchesList.innerHTML = '<div class="empty-state"><h3>No ongoing matches</h3><p>Check back later or create a new game.</p></div>';
      return;
    }

    matchesList.innerHTML = ongoingMatches.map(match => {
      const teamAPlayer1 = this.users.find(u => u.id === match.teamAplayer1);
      const teamAPlayer2 = this.users.find(u => u.id === match.teamAplayer2);
      const teamBPlayer1 = this.users.find(u => u.id === match.teamBplayer1);
      const teamBPlayer2 = this.users.find(u => u.id === match.teamBplayer2);

      return `
        <div class="match-card">
          <div class="match-status match-status--ongoing">Ongoing</div>
          <div class="team-score">
            <span>${this.escapeHtml(teamAPlayer1?.name || 'Unknown')} & ${this.escapeHtml(teamAPlayer2?.name || 'Unknown')}</span>
            <span class="score-display">${match.scoreTeamA}</span>
          </div>
          <div class="vs-divider">VS</div>
          <div class="team-score">
            <span>${this.escapeHtml(teamBPlayer1?.name || 'Unknown')} & ${this.escapeHtml(teamBPlayer2?.name || 'Unknown')}</span>
            <span class="score-display">${match.scoreTeamB}</span>
          </div>
          ${this.currentUser?.role === 'Admin' ? `
            <div class="flex gap-8 mt-8">
              <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="A" value="${match.scoreTeamA}" min="0" max="21">
              <input type="number" class="form-control score-input" data-match-id="${match.id}" data-team="B" value="${match.scoreTeamB}" min="0" max="21">
              <button class="btn btn--primary btn--sm" data-action="update-score" data-match-id="${match.id}">Update Score</button>
              <button class="btn btn--secondary btn--sm" data-action="end-match" data-match-id="${match.id}">End Match</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  updateScore(matchId) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;

    const scoreAInput = document.querySelector(`input[data-match-id="${matchId}"][data-team="A"]`);
    const scoreBInput = document.querySelector(`input[data-match-id="${matchId}"][data-team="B"]`);

    if (!scoreAInput || !scoreBInput) return;

    const scoreA = parseInt(scoreAInput.value) || 0;
    const scoreB = parseInt(scoreBInput.value) || 0;

    match.scoreTeamA = scoreA;
    match.scoreTeamB = scoreB;

    // Auto-end match if someone reaches 21 and leads by 2
    if ((scoreA >= 21 || scoreB >= 21) && Math.abs(scoreA - scoreB) >= 2) {
      this.endMatch(matchId);
      return;
    }

    this.showNotification('Score updated', 'success');
    this.loadMatchesPage();
  }

  endMatch(matchId) {
    const match = this.matches.find(m => m.id === matchId);
    if (!match) return;

    match.status = 'Completed';
    match.winnerTeam = match.scoreTeamA > match.scoreTeamB ? 'A' : 'B';

    // Update player ratings using ELO
    this.updatePlayerRatings(match);

    this.showNotification('Match completed', 'success');
    this.loadMatchesPage();
  }

  updatePlayerRatings(match) {
    const kFactor = 32;
    const teamAPlayers = [
      this.users.find(u => u.id === match.teamAplayer1),
      this.users.find(u => u.id === match.teamAplayer2)
    ].filter(Boolean);
    const teamBPlayers = [
      this.users.find(u => u.id === match.teamBplayer1),
      this.users.find(u => u.id === match.teamBplayer2)
    ].filter(Boolean);

    if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) return;

    const teamARating = (teamAPlayers[0].rating + teamAPlayers[1].rating) / 2;
    const teamBRating = (teamBPlayers[0].rating + teamBPlayers[1].rating) / 2;

    const teamAWon = match.winnerTeam === 'A';
    const expectedA = 1 / (1 + Math.pow(10, (teamBRating - teamARating) / 400));
    const expectedB = 1 - expectedA;

    const actualA = teamAWon ? 1 : 0;
    const actualB = teamAWon ? 0 : 1;

    const ratingChangeA = kFactor * (actualA - expectedA);
    const ratingChangeB = kFactor * (actualB - expectedB);

    // Update individual ratings
    teamAPlayers.forEach(player => {
      player.rating = Math.round(player.rating + ratingChangeA);
    });
    teamBPlayers.forEach(player => {
      player.rating = Math.round(player.rating + ratingChangeB);
    });

    // Update couple ratings
    this.updateCoupleRatings(match);
  }

  updateCoupleRatings(match) {
    // Find if teams are couples
    const coupleA = this.couples.find(c => 
      (c.player1Id === match.teamAplayer1 && c.player2Id === match.teamAplayer2) ||
      (c.player1Id === match.teamAplayer2 && c.player2Id === match.teamAplayer1)
    );
    const coupleB = this.couples.find(c => 
      (c.player1Id === match.teamBplayer1 && c.player2Id === match.teamBplayer2) ||
      (c.player1Id === match.teamBplayer2 && c.player2Id === match.teamBplayer1)
    );

    if (coupleA) {
      coupleA.totalMatches++;
      if (match.winnerTeam === 'A') coupleA.totalWins++;
      const player1 = this.users.find(u => u.id === coupleA.player1Id);
      const player2 = this.users.find(u => u.id === coupleA.player2Id);
      if (player1 && player2) {
        coupleA.rating = Math.round((player1.rating + player2.rating) / 2);
      }
    }

    if (coupleB) {
      coupleB.totalMatches++;
      if (match.winnerTeam === 'B') coupleB.totalWins++;
      const player1 = this.users.find(u => u.id === coupleB.player1Id);
      const player2 = this.users.find(u => u.id === coupleB.player2Id);
      if (player1 && player2) {
        coupleB.rating = Math.round((player1.rating + player2.rating) / 2);
      }
    }
  }

  // Rankings
  loadPlayerRankings() {
    const ctx = document.getElementById('playerRankChart');
    if (!ctx) return;

    const players = this.users
      .filter(u => u.role === 'Player' && u.status === 'Approved')
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    if (this.playerRankChart) {
      this.playerRankChart.destroy();
    }

    this.playerRankChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: players.map(p => p.name),
        datasets: [{
          label: 'Rating',
          data: players.map(p => p.rating),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Top Player Rankings'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: players.length > 0 ? Math.min(...players.map(p => p.rating)) - 50 : 1400
          }
        }
      }
    });
  }

  loadCoupleRankings() {
    const ctx = document.getElementById('coupleRankChart');
    if (!ctx) return;

    const couples = this.couples
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    if (this.coupleRankChart) {
      this.coupleRankChart.destroy();
    }

    const coupleNames = couples.map(c => {
      const player1 = this.users.find(u => u.id === c.player1Id);
      const player2 = this.users.find(u => u.id === c.player2Id);
      return `${player1?.name || 'Unknown'} & ${player2?.name || 'Unknown'}`;
    });

    this.coupleRankChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: coupleNames,
        datasets: [{
          label: 'Rating',
          data: couples.map(c => c.rating),
          backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Top Couple Rankings'
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: couples.length > 0 ? Math.min(...couples.map(c => c.rating)) - 50 : 1400
          }
        }
      }
    });
  }

  // Utilities
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  startMatchPolling() {
    setInterval(() => {
      if (this.currentSection === 'matches-section') {
        this.loadMatchesPage();
      }
    }, 10000); // Poll every 10 seconds
  }

  // Event Listeners
  setupEventListeners() {
    // Delegated event handling for navigation and actions
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
      if (e.target.id === 'register-form') {
        e.preventDefault();
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
        e.preventDefault();
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new SmashersApp();
});
