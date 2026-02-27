/* ============================================
   RideShare - Frontend Application
   ============================================ */

const API = '';
let currentUser = null;
let token = localStorage.getItem('token');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(el => el.min = today);

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
  });

  // Animate stats on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const statsSection = document.querySelector('.stats-section');
  if (statsSection) observer.observe(statsSection);

  // Check authentication
  if (token) {
    fetchProfile();
  }

  // Load featured rides on home page
  loadFeaturedRides();

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      const dropdown = document.getElementById('userDropdown');
      if (dropdown) dropdown.classList.add('hidden');
    }
  });
});

// ============================================
// PAGE NAVIGATION
// ============================================
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');

  // Auth-required pages
  const authPages = ['offer', 'myrides', 'profile'];
  if (authPages.includes(page) && !currentUser) {
    showToast('Please log in to access this page', 'info');
    showPage('login');
    return;
  }

  // Page-specific loads
  if (page === 'myrides') loadMyRides();
  if (page === 'profile') loadProfile();
  if (page === 'search') loadAllRides();

  // Close mobile menu
  document.getElementById('navLinks')?.classList.remove('active');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// AUTHENTICATION
// ============================================
async function register(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    token = result.token;
    localStorage.setItem('token', token);
    currentUser = result.user;
    updateAuthUI();
    showToast('Welcome to RideShare! 🎉', 'success');
    showPage('home');
    form.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function login(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    token = result.token;
    localStorage.setItem('token', token);
    currentUser = result.user;
    updateAuthUI();
    showToast(`Welcome back, ${currentUser.name}!`, 'success');
    showPage('home');
    form.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
  showPage('home');
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Session expired');
    currentUser = await res.json();
    updateAuthUI();
  } catch {
    token = null;
    localStorage.removeItem('token');
  }
}

function updateAuthUI() {
  const authBtns = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  const authRequired = document.querySelectorAll('.auth-required');

  if (currentUser) {
    authBtns.classList.add('hidden');
    userMenu.classList.remove('hidden');
    document.getElementById('userAvatar').textContent = currentUser.avatar || '🧑';
    document.getElementById('userName').textContent = currentUser.name;
    authRequired.forEach(el => el.style.display = '');
  } else {
    authBtns.classList.remove('hidden');
    userMenu.classList.add('hidden');
    authRequired.forEach(el => el.style.display = 'none');
  }
}

function toggleUserDropdown() {
  document.getElementById('userDropdown').classList.toggle('hidden');
}

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('active');
}

// ============================================
// RIDES
// ============================================
async function loadFeaturedRides() {
  try {
    const res = await fetch(`${API}/api/rides`);
    const rides = await res.json();
    
    const container = document.getElementById('featuredRides');
    if (rides.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1">
          <i class="fas fa-road"></i>
          <h3>No rides available yet</h3>
          <p>Be the first to offer a ride!</p>
        </div>`;
      return;
    }

    container.innerHTML = rides.slice(0, 6).map(ride => createRideCard(ride)).join('');
  } catch {
    document.getElementById('featuredRides').innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load rides</h3>
        <p>Please try again later</p>
      </div>`;
  }
}

async function loadAllRides() {
  try {
    const res = await fetch(`${API}/api/rides`);
    const rides = await res.json();
    renderSearchResults(rides);
  } catch {
    document.getElementById('searchResults').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Could not load rides</h3>
      </div>`;
  }
}

function heroSearch() {
  const origin = document.getElementById('heroFrom').value;
  const destination = document.getElementById('heroTo').value;
  const date = document.getElementById('heroDate').value;

  document.getElementById('searchFrom').value = origin;
  document.getElementById('searchTo').value = destination;
  document.getElementById('searchDate').value = date;

  showPage('search');
  searchRides();
}

async function searchRides() {
  const origin = document.getElementById('searchFrom').value;
  const destination = document.getElementById('searchTo').value;
  const date = document.getElementById('searchDate').value;

  const params = new URLSearchParams();
  if (origin) params.append('origin', origin);
  if (destination) params.append('destination', destination);
  if (date) params.append('date', date);

  try {
    const res = await fetch(`${API}/api/rides/search?${params}`);
    const rides = await res.json();
    renderSearchResults(rides);
  } catch {
    showToast('Failed to search rides', 'error');
  }
}

function renderSearchResults(rides) {
  const container = document.getElementById('searchResults');
  if (rides.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-search"></i>
        <h3>No rides found</h3>
        <p>Try adjusting your search criteria or check back later</p>
      </div>`;
    return;
  }

  container.innerHTML = rides.map(ride => `
    <div class="ride-list-card" onclick="viewRide(${ride.id})">
      <div class="ride-list-route">
        <div class="ride-list-cities">
          <span>${ride.origin}</span>
          <i class="fas fa-arrow-right arrow"></i>
          <span>${ride.destination}</span>
        </div>
        <div class="ride-list-meta">
          <span><i class="fas fa-calendar-alt"></i> ${formatDate(ride.departure_date)}</span>
          <span><i class="fas fa-clock"></i> ${formatTime(ride.departure_time)}</span>
          <span><i class="fas fa-chair"></i> ${ride.seats_available} seat${ride.seats_available > 1 ? 's' : ''}</span>
          ${ride.car_model ? `<span><i class="fas fa-car"></i> ${ride.car_model}</span>` : ''}
        </div>
      </div>
      <div class="ride-list-driver">
        <span class="driver-avatar">${ride.driver_avatar || '🧑'}</span>
        <div>
          <div class="driver-name" style="font-weight:600;font-size:0.9rem">${ride.driver_name}</div>
          <div style="font-size:0.8rem;color:#f59e0b">★ ${ride.driver_rating?.toFixed(1) || '5.0'}</div>
        </div>
      </div>
      <div class="ride-list-price">
        <div class="amount">₹${ride.price}</div>
        <div class="label">per seat</div>
      </div>
    </div>
  `).join('');
}

function createRideCard(ride) {
  return `
    <div class="ride-card" onclick="viewRide(${ride.id})">
      <div class="ride-card-top">
        <div class="ride-route">
          <div class="route-dots">
            <div class="route-dot"></div>
            <div class="route-line"></div>
            <div class="route-dot end"></div>
          </div>
          <div class="route-info">
            <div class="route-city">${ride.origin}</div>
            <div class="route-time">${formatDate(ride.departure_date)} at ${formatTime(ride.departure_time)}</div>
            <div class="route-city" style="margin-top:8px">${ride.destination}</div>
          </div>
        </div>
      </div>
      <div class="ride-card-body">
        <div class="ride-meta">
          <div class="ride-meta-item"><i class="fas fa-chair"></i> ${ride.seats_available} seat${ride.seats_available > 1 ? 's' : ''}</div>
          ${ride.car_model ? `<div class="ride-meta-item"><i class="fas fa-car"></i> ${ride.car_model}</div>` : ''}
          ${ride.car_color ? `<div class="ride-meta-item"><i class="fas fa-palette"></i> ${ride.car_color}</div>` : ''}
        </div>
      </div>
      <div class="ride-card-footer">
        <div class="driver-info">
          <span class="driver-avatar">${ride.driver_avatar || '🧑'}</span>
          <div class="driver-details">
            <div class="driver-name">${ride.driver_name}</div>
            <div class="driver-rating">★ ${ride.driver_rating?.toFixed(1) || '5.0'} · ${ride.driver_trips || 0} trips</div>
          </div>
        </div>
        <div class="ride-price">₹${ride.price}<span>/seat</span></div>
      </div>
    </div>`;
}

async function viewRide(id) {
  try {
    const res = await fetch(`${API}/api/rides/${id}`);
    const ride = await res.json();

    const isOwner = currentUser && currentUser.id === ride.driver_id;
    const alreadyBooked = ride.bookings?.some(b => b.passenger_id === currentUser?.id);

    document.getElementById('rideModalContent').innerHTML = `
      <div class="modal-ride-header">
        <h2>${ride.origin} → ${ride.destination}</h2>
        <span class="badge badge-${ride.status}">${ride.status}</span>
      </div>
      
      <div class="modal-ride-detail"><i class="fas fa-calendar-alt"></i> <strong>Date:</strong> ${formatDate(ride.departure_date)}</div>
      <div class="modal-ride-detail"><i class="fas fa-clock"></i> <strong>Time:</strong> ${formatTime(ride.departure_time)}</div>
      <div class="modal-ride-detail"><i class="fas fa-chair"></i> <strong>Available Seats:</strong> ${ride.seats_available}</div>
      <div class="modal-ride-detail"><i class="fas fa-rupee-sign"></i> <strong>Price:</strong> ₹${ride.price} per seat</div>
      ${ride.car_model ? `<div class="modal-ride-detail"><i class="fas fa-car"></i> <strong>Car:</strong> ${ride.car_model}${ride.car_color ? ` (${ride.car_color})` : ''}</div>` : ''}
      ${ride.description ? `<div class="modal-ride-detail"><i class="fas fa-info-circle"></i> <strong>Notes:</strong> ${ride.description}</div>` : ''}
      
      <div class="modal-ride-detail" style="border:none;">
        <i class="fas fa-user"></i>
        <strong>Driver:</strong> ${ride.driver_avatar || '🧑'} ${ride.driver_name} · ★ ${ride.driver_rating?.toFixed(1) || '5.0'}
      </div>

      ${ride.bookings?.length > 0 ? `
        <div style="margin-top:16px">
          <strong style="font-size:0.9rem;color:var(--text-light)">Passengers (${ride.bookings.length})</strong>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            ${ride.bookings.map(b => `<span style="background:var(--bg);padding:6px 12px;border-radius:8px;font-size:0.85rem">${b.passenger_avatar} ${b.passenger_name}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div class="modal-ride-actions">
        ${!currentUser ? `<button class="btn btn-primary btn-lg btn-block" onclick="closeModal();showPage('login')"><i class="fas fa-sign-in-alt"></i> Log in to Book</button>` : ''}
        ${currentUser && !isOwner && !alreadyBooked && ride.seats_available > 0 && ride.status === 'active' ? `<button class="btn btn-success btn-lg btn-block" onclick="bookRide(${ride.id})"><i class="fas fa-check-circle"></i> Book This Ride</button>` : ''}
        ${alreadyBooked ? `<button class="btn btn-outline btn-lg btn-block" disabled><i class="fas fa-check"></i> Already Booked</button>` : ''}
        ${isOwner ? `<button class="btn btn-danger btn-lg btn-block" onclick="cancelRide(${ride.id})"><i class="fas fa-times-circle"></i> Cancel This Ride</button>` : ''}
      </div>
    `;

    document.getElementById('rideModal').classList.remove('hidden');
  } catch {
    showToast('Failed to load ride details', 'error');
  }
}

function closeModal() {
  document.getElementById('rideModal').classList.add('hidden');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'rideModal') closeModal();
});

// ============================================
// OFFER A RIDE
// ============================================
async function offerRide(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.seats_available = parseInt(data.seats_available);
  data.price = parseFloat(data.price);

  try {
    const res = await fetch(`${API}/api/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    showToast('Ride published successfully! 🚗', 'success');
    form.reset();
    showPage('myrides');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// BOOKINGS
// ============================================
async function bookRide(rideId) {
  try {
    const res = await fetch(`${API}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ride_id: rideId })
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.error);

    showToast('Ride booked successfully! 🎉', 'success');
    closeModal();
    loadFeaturedRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelRide(rideId) {
  if (!confirm('Are you sure you want to cancel this ride?')) return;
  try {
    const res = await fetch(`${API}/api/rides/${rideId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    showToast('Ride cancelled', 'info');
    closeModal();
    loadMyRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function cancelBooking(bookingId) {
  if (!confirm('Cancel this booking?')) return;
  try {
    const res = await fetch(`${API}/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);

    showToast('Booking cancelled', 'info');
    loadMyRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ============================================
// MY RIDES
// ============================================
async function loadMyRides() {
  // Load bookings
  try {
    const res = await fetch(`${API}/api/bookings/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const bookings = await res.json();

    const container = document.getElementById('myBookings');
    if (bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-ticket-alt"></i>
          <h3>No bookings yet</h3>
          <p>Find a ride and book your first trip!</p>
        </div>`;
    } else {
      container.innerHTML = bookings.map(b => `
        <div class="ride-list-card">
          <div class="ride-list-route">
            <div class="ride-list-cities">
              <span>${b.origin}</span>
              <i class="fas fa-arrow-right arrow"></i>
              <span>${b.destination}</span>
            </div>
            <div class="ride-list-meta">
              <span><i class="fas fa-calendar-alt"></i> ${formatDate(b.departure_date)}</span>
              <span><i class="fas fa-clock"></i> ${formatTime(b.departure_time)}</span>
              <span><i class="fas fa-chair"></i> ${b.seats_booked} seat${b.seats_booked > 1 ? 's' : ''}</span>
              <span class="badge badge-${b.status}">${b.status}</span>
            </div>
          </div>
          <div class="ride-list-driver">
            <span class="driver-avatar">${b.driver_avatar || '🧑'}</span>
            <div>
              <div style="font-weight:600;font-size:0.9rem">${b.driver_name}</div>
              <div style="font-size:0.8rem;color:#f59e0b">★ ${b.driver_rating?.toFixed(1) || '5.0'}</div>
            </div>
          </div>
          <div class="ride-list-price">
            <div class="amount">₹${b.price}</div>
            <div class="label">per seat</div>
          </div>
          ${b.status === 'confirmed' ? `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})"><i class="fas fa-times"></i> Cancel</button>` : ''}
        </div>
      `).join('');
    }
  } catch {
    document.getElementById('myBookings').innerHTML = '<div class="empty-state"><p>Failed to load bookings</p></div>';
  }

  // Load offered rides
  try {
    const res = await fetch(`${API}/api/rides/my/offered`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const rides = await res.json();

    const container = document.getElementById('myOfferedRides');
    if (rides.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-car"></i>
          <h3>No rides offered</h3>
          <p>Share your journey with others!</p>
        </div>`;
    } else {
      container.innerHTML = rides.map(r => `
        <div class="ride-list-card" onclick="viewRide(${r.id})" style="cursor:pointer">
          <div class="ride-list-route">
            <div class="ride-list-cities">
              <span>${r.origin}</span>
              <i class="fas fa-arrow-right arrow"></i>
              <span>${r.destination}</span>
            </div>
            <div class="ride-list-meta">
              <span><i class="fas fa-calendar-alt"></i> ${formatDate(r.departure_date)}</span>
              <span><i class="fas fa-clock"></i> ${formatTime(r.departure_time)}</span>
              <span><i class="fas fa-users"></i> ${r.booked_seats || 0}/${r.seats_available + (r.booked_seats || 0)} booked</span>
              <span class="badge badge-${r.status}">${r.status}</span>
            </div>
          </div>
          <div class="ride-list-price">
            <div class="amount">₹${r.price}</div>
            <div class="label">per seat</div>
          </div>
        </div>
      `).join('');
    }
  } catch {
    document.getElementById('myOfferedRides').innerHTML = '<div class="empty-state"><p>Failed to load rides</p></div>';
  }
}

// ============================================
// PROFILE
// ============================================
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profileAvatar').textContent = currentUser.avatar || '🧑';
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileRating').textContent = currentUser.rating?.toFixed(1) || '5.0';
  document.getElementById('profileTrips').textContent = currentUser.trips_count || 0;
}

// ============================================
// TABS
// ============================================
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

  event.target.closest('.tab').classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// UTILITIES
// ============================================
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.count);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target.toLocaleString() + '+';
    }
    requestAnimationFrame(update);
  });
}
