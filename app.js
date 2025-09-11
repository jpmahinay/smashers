// Global state
let currentUser = null;
let isAdmin = false;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    isAdmin = currentUser.email === 'admin@smashers.com'; // Simple admin check
    
    updateUIForLoggedInUser();
  }
  
  // Navigation event listeners
  document.getElementById('nav-home').addEventListener('click', showHome);
  document.getElementById('nav-login').addEventListener('click', showLogin);
  document.getElementById('nav-register').addEventListener('click', showRegister);
  document.getElementById('nav-profile').addEventListener('click', showProfile);
  document.getElementById('nav-matches').addEventListener('click', showOngoingMatches);
  document.getElementById('nav-player-rankings').addEventListener('click', showPlayerRankings);
  document.getElementById('nav-couple-rankings').addEventListener('click', showCoupleRankings);
  
  // Admin navigation (hidden by default)
  if (isAdmin) {
    document.getElementById('nav-admin-dashboard').style.display = 'block';
    document.getElementById('nav-attendance').style.display = 'block';
    document.getElementById('nav-create-game').style.display = 'block';
    
    document.getElementById('nav-admin-dashboard').addEventListener('click', showAdminDashboard);
    document.getElementById('nav-attendance').addEventListener('click', showAttendance);
    document.getElementById('nav-create-game').addEventListener('click', showCreateGame);
  }
  
  // Show home page by default
  showHome();
});

// Navigation functions
function showHome() {
  hideAllSections();
  document.getElementById('home-section').style.display = 'block';
}

function showLogin() {
  hideAllSections();
  document.getElementById('login-section').style.display = 'block';
}

function showRegister() {
  hideAllSections();
  document.getElementById('register-section').style.display = 'block';
}

function showProfile() {
  if (!currentUser) {
    showLogin();
    return;
  }
  
  hideAllSections();
  document.getElementById('profile-section').style.display = 'block';
  
  // Populate profile form
  document.getElementById('profile-name').value = currentUser.name || '';
  document.getElementById('profile-racket').value = currentUser.racketModel || '';
  document.getElementById('profile-tension').value = currentUser.stringTension || '';
}

function showOngoingMatches() {
  hideAllSections();
  document.getElementById('matches-section').style.display = 'block';
  
  loadOngoingMatches();
}

function showPlayerRankings() {
  hideAllSections();
  document.getElementById('player-rankings-section').style.display = 'block';
  
  loadPlayerRankings();
}

function showCoupleRankings() {
  hideAllSections();
  document.getElementById('couple-rankings-section').style.display = 'block';
  
  loadCoupleRankings();
}

function showAdminDashboard() {
  if (!isAdmin) return;
  
  hideAllSections();
  document.getElementById('admin-dashboard-section').style.display = 'block';
  
  loadPendingUsers();
}

function showAttendance() {
  if (!isAdmin) return;
  
  hideAllSections();
  document.getElementById('attendance-section').style.display = 'block';
  
  loadAttendance();
}

function showCreateGame() {
  if (!isAdmin) return;
  
  hideAllSections();
  document.getElementById('create-game-section').style.display = 'block';
  
  loadAvailablePlayers();
}

// Helper functions
function hideAllSections() {
  const sections = document.querySelectorAll('main > section');
  sections.forEach(section => {
    section.style.display = 'none';
  });
}

function updateUIForLoggedInUser() {
  document.getElementById('nav-login').style.display = 'none';
  document.getElementById('nav-register').style.display = 'none';
  document.getElementById('nav-profile').style.display = 'block';
  document.getElementById('nav-logout').style.display = 'block';
  
  if (isAdmin) {
    document.getElementById('nav-admin-dashboard').style.display = 'block';
    document.getElementById('nav-attendance').style.display = 'block';
    document.getElementById('nav-create-game').style.display = 'block';
  }
}

function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// API Functions
async function registerUser(userData) {
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('Registration successful! Waiting for admin approval.', 'success');
      showLogin();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Registration failed. Please try again.', 'error');
    console.error('Registration error:', error);
  }
}

async function loginUser(credentials) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      currentUser = data.user;
      isAdmin = currentUser.email === 'admin@smashers.com';
      
      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      updateUIForLoggedInUser();
      showNotification('Login successful!', 'success');
      showHome();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Login failed. Please try again.', 'error');
    console.error('Login error:', error);
  }
}

async function logout() {
  currentUser = null;
  isAdmin = false;
  localStorage.removeItem('currentUser');
  
  document.getElementById('nav-login').style.display = 'block';
  document.getElementById('nav-register').style.display = 'block';
  document.getElementById('nav-profile').style.display = 'none';
  document.getElementById('nav-logout').style.display = 'none';
  document.getElementById('nav-admin-dashboard').style.display = 'none';
  document.getElementById('nav-attendance').style.display = 'none';
  document.getElementById('nav-create-game').style.display = 'none';
  
  showNotification('Logged out successfully', 'success');
  showHome();
}

async function updateProfile(profileData) {
  try {
    const response = await fetch(`/api/user/${currentUser.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Update current user data
      currentUser = { ...currentUser, ...profileData };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      showNotification('Profile updated successfully!', 'success');
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Profile update failed. Please try again.', 'error');
    console.error('Profile update error:', error);
  }
}

async function changePassword(passwordData) {
  try {
    const response = await fetch(`/api/user/${currentUser.id}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(passwordData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('Password changed successfully!', 'success');
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
      document.getElementById('confirm-password').value = '';
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Password change failed. Please try again.', 'error');
    console.error('Password change error:', error);
  }
}

async function loadPendingUsers() {
  try {
    const response = await fetch('/api/admin/pending-users');
    const users = await response.json();
    
    const container = document.getElementById('pending-users-container');
    container.innerHTML = '';
    
    if (users.length === 0) {
      container.innerHTML = '<p>No pending users</p>';
      return;
    }
    
    users.forEach(user => {
      const userCard = document.createElement('div');
      userCard.className = 'user-card';
      userCard.innerHTML = `
        <h3>${user.name}</h3>
        <p>Email: ${user.email}</p>
        <p>Racket: ${user.racketModel || 'Not specified'}</p>
        <p>Tension: ${user.stringTension || 'Not specified'}</p>
        <div class="user-actions">
          <button class="btn-approve" onclick="approveUser('${user.id}')">Approve</button>
          <button class="btn-reject" onclick="rejectUser('${user.id}')">Reject</button>
        </div>
      `;
      
      container.appendChild(userCard);
    });
  } catch (error) {
    console.error('Error loading pending users:', error);
    showNotification('Failed to load pending users', 'error');
  }
}

async function approveUser(userId) {
  try {
    const response = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, action: 'Approved' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('User approved successfully', 'success');
      loadPendingUsers();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Failed to approve user', 'error');
    console.error('Approve user error:', error);
  }
}

async function rejectUser(userId) {
  try {
    const response = await fetch('/api/admin/user-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, action: 'Rejected' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('User rejected successfully', 'success');
      loadPendingUsers();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Failed to reject user', 'error');
    console.error('Reject user error:', error);
  }
}

async function loadAttendance() {
  try {
    const response = await fetch('/api/attendance/today');
    const attendance = await response.json();
    
    const container = document.getElementById('attendance-container');
    container.innerHTML = '';
    
    // Get all approved users
    const usersResponse = await fetch('/api/users');
    const users = await usersResponse.json();
    
    users.forEach(user => {
      const isPresent = attendance.presentUserIds.includes(user.id);
      
      const attendee = document.createElement('div');
      attendee.className = 'attendee';
      attendee.innerHTML = `
        <label>
          <input type="checkbox" ${isPresent ? 'checked' : ''} onchange="updateAttendance('${user.id}', this.checked)">
          ${user.name}
        </label>
      `;
      
      container.appendChild(attendee);
    });
    
    // Save the current date for updating
    document.getElementById('attendance-date').value = attendance.date;
  } catch (error) {
    console.error('Error loading attendance:', error);
    showNotification('Failed to load attendance', 'error');
  }
}

async function updateAttendance(userId, isPresent) {
  try {
    const date = document.getElementById('attendance-date').value;
    const response = await fetch('/api/attendance/today');
    const attendance = await response.json();
    
    let presentUserIds = attendance.presentUserIds || [];
    
    if (isPresent && !presentUserIds.includes(userId)) {
      presentUserIds.push(userId);
    } else if (!isPresent && presentUserIds.includes(userId)) {
      presentUserIds = presentUserIds.filter(id => id !== userId);
    }
    
    const updateResponse = await fetch('/api/attendance/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date, presentUserIds })
    });
    
    const data = await updateResponse.json();
    
    if (updateResponse.ok) {
      showNotification('Attendance updated successfully', 'success');
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Failed to update attendance', 'error');
    console.error('Update attendance error:', error);
  }
}

async function loadAvailablePlayers() {
  try {
    // Get today's attendance
    const attendanceResponse = await fetch('/api/attendance/today');
    const attendance = await attendanceResponse.json();
    
    // Get all users
    const usersResponse = await fetch('/api/users');
    const users = await usersResponse.json();
    
    // Get ongoing matches to check who's playing
    const matchesResponse = await fetch('/api/matches/ongoing');
    const ongoingMatches = await matchesResponse.json();
    
    const playingUserIds = new Set();
    ongoingMatches.forEach(match => {
      // Extract player IDs from match (this would need to be adjusted based on your data structure)
      // For now, we'll assume we can't easily get IDs, so we'll just enable all present users
    });
    
    // Filter to only present users
    const presentUsers = users.filter(user => attendance.presentUserIds.includes(user.id));
    
    // Populate dropdowns
    const dropdowns = document.querySelectorAll('.player-dropdown');
    dropdowns.forEach(dropdown => {
      dropdown.innerHTML = '<option value="">Select Player</option>';
      
      presentUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        option.disabled = playingUserIds.has(user.id);
        dropdown.appendChild(option);
      });
    });
    
    // Also load couples for couple vs couple mode
    const couplesResponse = await fetch('/api/rankings/couples');
    const couples = await couplesResponse.json();
    
    const coupleDropdowns = document.querySelectorAll('.couple-dropdown');
    coupleDropdowns.forEach(dropdown => {
      dropdown.innerHTML = '<option value="">Select Couple</option>';
      
      couples.forEach(couple => {
        const option = document.createElement('option');
        option.value = couple.id;
        option.textContent = `${couple.player1} & ${couple.player2}`;
        dropdown.appendChild(option);
      });
    });
  } catch (error) {
    console.error('Error loading available players:', error);
    showNotification('Failed to load available players', 'error');
  }
}

async function createGame(gameData) {
  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('Game created successfully!', 'success');
      
      // Reset form
      document.getElementById('create-game-form').reset();
    } else {
      showNotification(data.error, 'error');
    }
  } catch (error) {
    showNotification('Failed to create game', 'error');
    console.error('Create game error:', error);
  }
}

async function loadOngoingMatches() {
  try {
    const response = await fetch('/api/matches/ongoing');
    const matches = await response.json();
    
    const container = document.getElementById('ongoing-matches-container');
    container.innerHTML = '';
    
    if (matches.length === 0) {
      container.innerHTML = '<p>No ongoing matches</p>';
      return;
    }
    
    matches.forEach(match => {
      const matchElement = document.createElement('div');
      matchElement.className = 'match-card';
      matchElement.innerHTML = `
        <h3>${match.teamA.player1} & ${match.teamA.player2} vs ${match.teamB.player1} & ${match.teamB.player2}</h3>
        <p>Score: ${match.scoreTeamA} - ${match.scoreTeamB}</p>
      `;
      
      container.appendChild(matchElement);
    });
  } catch (error) {
    console.error('Error loading ongoing matches:', error);
    showNotification('Failed to load ongoing matches', 'error');
  }
}

async function loadPlayerRankings() {
  try {
    const response = await fetch('/api/rankings/players');
    const rankings = await response.json();
    
    const container = document.getElementById('player-rankings-container');
    container.innerHTML = '';
    
    rankings.forEach((player, index) => {
      const rankElement = document.createElement('div');
      rankElement.className = 'ranking-item';
      rankElement.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="name">${player.name}</span>
        <span class="stats">W: ${player.wins} L: ${player.losses} Win Rate: ${player.winRate}%</span>
      `;
      
      container.appendChild(rankElement);
    });
  } catch (error) {
    console.error('Error loading player rankings:', error);
    showNotification('Failed to load player rankings', 'error');
  }
}

async function loadCoupleRankings() {
  try {
    const response = await fetch('/api/rankings/couples');
    const rankings = await response.json();
    
    const container = document.getElementById('couple-rankings-container');
    container.innerHTML = '';
    
    rankings.forEach((couple, index) => {
      const rankElement = document.createElement('div');
      rankElement.className = 'ranking-item';
      rankElement.innerHTML = `
        <span class="rank">${index + 1}</span>
        <span class="name">${couple.player1} & ${couple.player2}</span>
        <span class="stats">W: ${couple.wins} M: ${couple.matches} Win Rate: ${couple.winRate}%</span>
      `;
      
      container.appendChild(rankElement);
    });
  } catch (error) {
    console.error('Error loading couple rankings:', error);
    showNotification('Failed to load couple rankings', 'error');
  }
}

// Event Listeners
document.getElementById('register-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    racketModel: formData.get('racketModel'),
    stringTension: formData.get('stringTension')
  };
  
  registerUser(userData);
});

document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const credentials = {
    email: formData.get('email'),
    password: formData.get('password')
  };
  
  loginUser(credentials);
});

document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const profileData = {
    name: formData.get('name'),
    racketModel: formData.get('racketModel'),
    stringTension: formData.get('stringTension')
  };
  
  updateProfile(profileData);
});

document.getElementById('change-password-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const passwordData = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword')
  };
  
  if (formData.get('newPassword') !== formData.get('confirmPassword')) {
    showNotification('New passwords do not match', 'error');
    return;
  }
  
  changePassword(passwordData);
});

document.getElementById('create-game-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const gameMode = document.querySelector('input[name="gameMode"]:checked').value;
  
  if (gameMode === 'couples') {
    const couple1 = document.getElementById('couple1').value;
    const couple2 = document.getElementById('couple2').value;
    
    if (!couple1 || !couple2) {
      showNotification('Please select two couples', 'error');
      return;
    }
    
    // For couple mode, we need to get the player IDs from the couple
    // This would require additional API calls to get couple details
    showNotification('Couple vs couple mode not fully implemented yet', 'info');
    
  } else {
    const player1 = document.getElementById('teamA-player1').value;
    const player2 = document.getElementById('teamA-player2').value;
    const player3 = document.getElementById('teamB-player1').value;
    const player4 = document.getElementById('teamB-player2').value;
    
    if (!player1 || !player2 || !player3 || !player4) {
      showNotification('Please select all four players', 'error');
      return;
    }
    
    const gameData = {
      teamAplayer1: player1,
      teamAplayer2: player2,
      teamBplayer1: player3,
      teamBplayer2: player4
    };
    
    createGame(gameData);
  }
});

document.getElementById('nav-logout').addEventListener('click', logout);
