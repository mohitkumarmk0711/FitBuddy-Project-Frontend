// ════════════════════════════════════════════════════════════
//  app.js  —  Fitness Tracker Frontend Logic
//  Calls Java backend at http://localhost:8080/api
//  Falls back to localStorage if backend is unreachable
// ════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:8080/api';

// ── Storage Helpers ──────────────────────────────────────────
const store = {
  get: (k, def) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? def; }
    catch { return def; }
  },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

const today = () => new Date().toISOString().split('T')[0];

// ── State ────────────────────────────────────────────────────
let state = {
  calorieGoal: store.get('calorieGoal', 3000),
  proteinGoal: store.get('proteinGoal', 150),
  carbsGoal:   store.get('carbsGoal', 250),
  fatsGoal:    store.get('fatsGoal', 65),
  workouts:    store.get('workouts', []),
  meals:       store.get('meals', []),
  exerciseLib: store.get('exerciseLib', []),
  foodLib:     store.get('foodLib', null),
  currentUser: store.get('currentUser', null),
};

async function loadBackendData() {
  try {
    state.foodLib = [];
    state.exerciseLib = [];
    // Fetch exercises
    const res1 = await fetch("http://localhost:8080/api/exercises");
    const exercises = await res1.json();

    state.exerciseLib = exercises.map(e => ({
      id: e.id,
      name: e.name,
      category: (e.bodyPart || '').trim()
    }));

    // Fetch master foods
    const res2 = await fetch("http://localhost:8080/api/foods");
    const foods = await res2.json();

    state.foodLib = foods.map(f => ({
      id: f.id,
      name: f.name,
      portion: "100g",
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fats: f.fats,
      source: "MASTER"
    }));

    // -------------------------
    // ADD THIS BLOCK
    // -------------------------

    if (state.currentUser) {

      const res3 = await fetch(
        `http://localhost:8080/api/user-food/${state.currentUser.id}`
      );

      const userFoods = await res3.json();

      const mappedUserFoods = userFoods.map(f => ({
        id: f.id,
        name: f.name,
        portion: "100g",
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fats: f.fats,
        source: "USER"
      }));

      state.foodLib = [...state.foodLib, ...mappedUserFoods];
    }

    renderAll();

  } catch (err) {
    console.error("Backend error:", err);
  }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

async function loadLoggedWorkouts() {
  if (!state.currentUser) return;

  try {
    const res = await fetch(`${API_BASE}/logged-workouts/${state.currentUser.id}`);
    const data = await res.json();

    state.workouts = data
  .reverse()
  .map(w => ({
    id: w.id,
    date: w.loggedDate ? w.loggedDate.split('T')[0] : today(),
    name: w.exerciseName,
    sets: w.sets || 0,
    reps: w.reps || 0,
    weight: w.weight || 0
  }));

    save();
    renderAll();
  } catch (err) {
    console.log('Workout load failed', err);
  }
}

async function loadLoggedMeals() {
  if (!state.currentUser) return;

  try {
    const res = await fetch(`${API_BASE}/logged-food/${state.currentUser.id}`);
    const data = await res.json();

    state.meals = data
  .reverse()
  .map(f => ({
    id: f.id,
    date: f.loggedDate
      ? new Date(f.loggedDate).toISOString().split('T')[0]
      : today(),
    time: f.loggedDate
  ? new Date(f.loggedDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  : '',
    name: f.foodName || '',
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fats: Number(f.fats) || 0
  }));

    save();
    renderAll();

  } catch (err) {
    console.log('Meal load failed', err);
  }
}

function save() {
  store.set('calorieGoal', state.calorieGoal);
  store.set('proteinGoal', state.proteinGoal);
  store.set('carbsGoal',   state.carbsGoal);
  store.set('fatsGoal',    state.fatsGoal);
  store.set('workouts',    state.workouts);
  store.set('meals',       state.meals);
  store.set('exerciseLib', state.exerciseLib);
  store.set('foodLib',     state.foodLib);
  store.set('currentUser', state.currentUser);
}

// ── Auth UI ──────────────────────────────────────────────────
function updateAuthUI() {
  const u        = state.currentUser;
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  if (u) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    document.getElementById('user-name-display').textContent = u.name || u.email;
    document.getElementById('user-avatar').textContent = (u.name || u.email).charAt(0).toUpperCase();
  } else {
    loginBtn.style.display = 'inline-flex';
    userInfo.style.display = 'none';
  }
}

function openAuthModal() {
  switchAuthTab('login');
  clearAuthErrors();
  openModal('modal-auth');
}

function switchAuthTab(tab) {
  document.getElementById('auth-login-form').style.display  = tab === 'login'  ? 'block' : 'none';
  document.getElementById('auth-signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  document.getElementById('tab-login-btn').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup-btn').classList.toggle('active', tab === 'signup');
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

function showAuthError(formId, msg) {
  const err = document.getElementById(formId + '-error');
  if (err) { err.textContent = msg; err.classList.add('show'); }
}

function showWelcomePopup() {
  if (!state.currentUser) {
    const popup = document.getElementById('welcome-popup');
    if (popup) {
      popup.style.display = 'flex';
    }
  }
}

function skipWelcomePopup() {
  document.getElementById('welcome-popup').style.display = 'none';
}

function openWelcomeLogin() {
  skipWelcomePopup();
  openAuthModal();
  switchAuthTab('login');
}

function openWelcomeSignup() {
  skipWelcomePopup();
  openAuthModal();
  switchAuthTab('signup');
}

document.addEventListener('DOMContentLoaded', () => {
  loadBackendData();
  renderAll();
  updateAuthUI();
  showWelcomePopup();
});

async function submitLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAuthError('auth-login-form', 'Please fill in all fields.');

  try {
    const res  = await fetch(API_BASE + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    state.currentUser = {
  id: data.id,
  name: data.name,
  email: data.email,
  token: data.token
};

save();
closeModal('modal-auth');
updateAuthUI();

// IMPORTANT
await loadBackendData();
await loadLoggedWorkouts();
await loadLoggedMeals();

toast('Welcome back, ' + (data.name || data.email) + '! 👋');
  } catch (err) {
    // Local fallback (demo only — not secure for production)
    const users = store.get('_users', []);
    const match = users.find(u => u.email === email && u.password === btoa(password));
    if (match) {
      state.currentUser = { id: match.id, name: match.name, email: match.email };
      save(); closeModal('modal-auth'); updateAuthUI();
      toast('Welcome back, ' + (match.name || match.email) + '! 👋');
    } else {
      showAuthError('auth-login-form', 'Invalid credentials. Try signing up first.');
    }
  }
}



async function submitSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  if (!name || !email || !password) return showAuthError('auth-signup-form', 'Please fill in all fields.');
  if (password !== confirm)          return showAuthError('auth-signup-form', 'Passwords do not match.');
  if (password.length < 6)           return showAuthError('auth-signup-form', 'Password must be at least 6 characters.');

  try {
    const res  = await fetch(API_BASE + '/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    state.currentUser = { id: data.id, name: data.name, email: data.email, token: data.token };
    save(); closeModal('modal-auth'); updateAuthUI();
    toast('Account created! Welcome, ' + name + '! 🎉');
  } catch (err) {
    // Local fallback (demo only)
    const users = store.get('_users', []);
    if (users.find(u => u.email === email))
      return showAuthError('auth-signup-form', 'Email already registered.');
    const newUser = { id: uid(), name, email, password: btoa(password) };
    users.push(newUser);
    store.set('_users', users);
    state.currentUser = { id: newUser.id, name, email };
    save(); closeModal('modal-auth'); updateAuthUI();
    toast('Account created! Welcome, ' + name + '! 🎉');
  }
}

function logout() {

  // Clear frontend state
  state.currentUser = null;
  state.workouts = [];
  state.meals = [];
  state.foodLib = [];
  state.exerciseLib = [];

  // Clear localStorage completely
  localStorage.removeItem('currentUser');
  localStorage.removeItem('workouts');
  localStorage.removeItem('meals');
  localStorage.removeItem('foodLib');
  localStorage.removeItem('exerciseLib');

  // Clear in-memory filters
  exerciseSearch = '';
  foodSearch = '';

  // Force save empty state
  store.set('workouts', []);
  store.set('meals', []);
  store.set('currentUser', null);

  updateAuthUI();
  renderAll();

  toast('Logged out successfully.');
  document.getElementById('login-email').value = '';
document.getElementById('login-password').value = '';
}

// ── Navigation ────────────────────────────────────────────────
let currentTab     = 'dashboard';
let exerciseFilter = 'All';
let exerciseSearch = '';
let foodSearch     = '';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === 'tab-' + tab));
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderWorkouts();
  renderNutrition();
  renderBodyPartFilters();
}

// ── Render Dynamic Body Part Filters ──────────────────────────
function renderBodyPartFilters() {
  // Get unique body parts from exercise library
  const bodyParts = ['All', ...new Set(state.exerciseLib.map(e => e.category).filter(c => c && c !== 'All'))];
  
  const filterRow = document.querySelector('.filter-row');
  if (!filterRow) return;
  
  filterRow.innerHTML = bodyParts.map(part => 
  `<button class="filter-btn ${(exerciseFilter || '').trim() === part.trim() ? 'active' : ''}" 
           data-cat="${part}" 
           onclick="setExFilter(this.dataset.cat)">${part}</button>`
).join('');
}

// ── Dashboard ─────────────────────────────────────────────────
let calChart, freqChart;

// Compute consecutive-day streak: both meals AND workout logged each day
function computeStreak() {
  let streak = 0;
  const d = new Date();
  while (true) {
    const dateStr = d.toISOString().split('T')[0];
    const hasMeals   = state.meals.some(m => m.date === dateStr);
    const hasWorkout = state.workouts.some(w => w.date === dateStr);
    if (hasMeals && hasWorkout) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function renderDashboard() {
  const todayWorkouts = state.workouts.filter(w => w.date === today());
  const todayMeals    = state.meals.filter(m => m.date === today());
  const todayCal      = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayProt     = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const totalVol      = todayWorkouts.reduce((s, w) => s + (w.sets * w.reps * w.weight), 0);

  const last7    = getLast7Days();
  const weekCals = last7.map(d => state.meals.filter(m => m.date === d).reduce((s, m) => s + m.calories, 0));

  document.getElementById('stat-workouts').textContent = todayWorkouts.length;
  document.getElementById('stat-calories').textContent = todayCal;
  document.getElementById('stat-volume').textContent   = totalVol.toLocaleString();
  document.getElementById('stat-streak').textContent   = computeStreak();

  // Dashboard protein bar
  const protPct = Math.min(100, Math.round((todayProt / state.proteinGoal) * 100));
  document.getElementById('dash-prot-count').textContent     = todayProt + ' / ' + state.proteinGoal + 'g protein';
  document.getElementById('dash-prot-pct').textContent       = protPct + '%';
  document.getElementById('dash-prot-bar').style.width       = protPct + '%';
  document.getElementById('dash-prot-taken').textContent     = todayProt + 'g taken';
  document.getElementById('dash-prot-remaining').textContent = 'Goal: ' + state.proteinGoal + 'g';

  const weekWorkouts = state.workouts.filter(w => last7.includes(w.date));
  const weekMeals    = state.meals.filter(m => last7.includes(m.date));
  const weekTotalCal = weekMeals.reduce((s, m) => s + m.calories, 0);
  document.getElementById('sum-workouts').textContent = weekWorkouts.length;
  document.getElementById('sum-calories').textContent = weekTotalCal;
  document.getElementById('sum-avg-cal').textContent  = Math.round(weekTotalCal / 7);

  renderCharts(last7, weekCals);
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}
function dayLabel(s) { return new Date(s).toLocaleDateString('en', { weekday: 'short' }); }

function renderCharts(last7, weekCals) {
  const labels   = last7.map(dayLabel);
  const freqData = last7.map(d => state.workouts.filter(w => w.date === d).length);
  const calCtx   = document.getElementById('calChart').getContext('2d');
  const freqCtx  = document.getElementById('freqChart').getContext('2d');
  if (calChart)  calChart.destroy();
  if (freqChart) freqChart.destroy();
  const base = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#e8eef7' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#6b7a91' } },
      y: { grid: { color: '#e8eef7', borderDash: [4,4] }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#6b7a91' }, beginAtZero: true }
    }
  };
  calChart  = new Chart(calCtx,  { type: 'bar',  data: { labels, datasets: [{ data: weekCals,  backgroundColor: 'rgba(59,110,248,0.18)', borderColor: '#3b6ef8', borderWidth: 2, borderRadius: 6 }] }, options: { ...base } });
  freqChart = new Chart(freqCtx, { type: 'line', data: { labels, datasets: [{ data: freqData, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 2.5, pointRadius: 5, pointBackgroundColor: '#22c55e', tension: 0.3, fill: true }] }, options: { ...base } });
}

// ── Workouts ──────────────────────────────────────────────────
function renderWorkouts() {
  const todayWk = state.workouts.filter(w => w.date === today());
  document.getElementById('today-workouts').innerHTML = todayWk.length
    ? todayWk.map(w =>
        `<div class="exercise-item">
          <div>
            <div class="exercise-name">${w.name}</div>
            <div class="exercise-meta">${w.sets} sets × ${w.reps} reps @ ${w.weight} lbs</div>
          </div>
          <button class="delete-btn" onclick="deleteWorkout('${w.id}')">✕</button>
        </div>`).join('')
    : '<div class="empty">No workouts logged today</div>';

  renderExerciseLibrary();

  const grouped = groupByDate(state.workouts);
  const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).slice(0, 10);
  document.getElementById('workout-history').innerHTML = dates.length
    ? dates.map(d =>
        `<div class="history-item" style="flex-direction:column;align-items:flex-start;gap:4px;">
          <div style="font-weight:600;font-size:0.83rem;color:var(--muted)">${formatDate(d)}</div>
          <div style="font-size:0.88rem">${grouped[d].map(w => w.name + ' (' + w.sets + '×' + w.reps + ')').join(', ')}</div>
        </div>`).join('')
    : '<div class="empty">No workout history yet</div>';
}

function renderExerciseLibrary() {
  console.log("Filter:", exerciseFilter);
  console.log("Categories:", state.exerciseLib.map(e => e.category));
  let filtered = state.exerciseLib;

  if (exerciseFilter !== 'All') {
  filtered = filtered.filter(e => {
    return (e.category || '').trim() === exerciseFilter.trim();
  });
}

const q = (exerciseSearch || '').toLowerCase();

if (q) {
  filtered = filtered.filter(e =>
    (e.name || '').toLowerCase().includes(q)
  );
}
  if (!filtered.length) {
    document.getElementById('exercise-library').innerHTML =
      '<div class="empty">No saved exercises yet.</div>';
    return;
  }

  document.getElementById('exercise-library').innerHTML =
    `<div class="ex-lib-grid">${
      filtered.map(e =>
        `<div class="ex-lib-card">
          <div class="ex-lib-name">${e.name}</div>
          <div class="ex-lib-meta">${e.category || 'All'}${e.sets ? ' · ' + e.sets + '×' + e.reps + ' @ ' + e.weight + ' lbs' : ''}</div>
          <button class="btn btn-sm" style="width:100%;margin-top:8px;background:var(--text);color:#fff;border:none"
                  onclick="quickAddExercise('${e.id}')">Use</button>
        </div>`).join('')
    }</div>`;
}

async function addWorkout() {
  const name = document.getElementById('ex-name').value.trim();
  const sets  = parseInt(document.getElementById('ex-sets').value)    || 0;
  const reps  = parseInt(document.getElementById('ex-reps').value)    || 0;
  const wt    = parseFloat(document.getElementById('ex-weight').value) || 0;
  if (!name) return toast('Please enter an exercise name');
  if (!state.currentUser) {
  return toast('Please login first to log workouts');
  }
  const workout = { id: uid(), date: today(), name, sets, reps, weight: wt };

  // Send to Java backend
  if (state.currentUser?.token) {
    try {
      await fetch(API_BASE + '/exercises', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.currentUser.token,
        },
        body: JSON.stringify({ ...workout, userId: state.currentUser.id }),
      });
    } catch (_) { /* backend unavailable — stored locally */ }
  }

  try {
  const res = await fetch(API_BASE + '/logged-workouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: state.currentUser.id,
      exerciseName: name,
      bodyPart: '',
      sets: sets,
      reps: reps,
      weight: wt
    })
  });

  const savedWorkout = await res.json();

 state.workouts.unshift({
  id: savedWorkout.id,
  date: today(),
  name,
  sets,
  reps,
  weight: wt
});

save();
renderWorkouts();
renderDashboard();

} catch (err) {
  console.log(err);
  state.workouts.push(workout);
}
  document.getElementById('ex-name').value = '';
  toast('Exercise logged! 💪');
}

function saveExercise() {
  document.getElementById('modal-ex-name').value     = document.getElementById('ex-name').value.trim();
  document.getElementById('modal-ex-sets').value     = document.getElementById('ex-sets').value   || '3';
  document.getElementById('modal-ex-reps').value     = document.getElementById('ex-reps').value   || '10';
  document.getElementById('modal-ex-weight').value   = document.getElementById('ex-weight').value || '135';
  document.getElementById('modal-ex-category').value = 'All';
  openModal('modal-exercise');
}

async function submitSaveExercise() {
  const name     = document.getElementById('modal-ex-name').value.trim();
  const sets     = parseInt(document.getElementById('modal-ex-sets').value)    || 0;
  const reps     = parseInt(document.getElementById('modal-ex-reps').value)    || 0;
  const weight   = parseFloat(document.getElementById('modal-ex-weight').value) || 0;
  const category = document.getElementById('modal-ex-category').value;
  if (!name) return shakeModal('modal-exercise');

  const exercise = { id: uid(), name, category, sets, reps, weight };

  if (state.currentUser?.token) {
    try {
      await fetch(API_BASE + '/exercise-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.currentUser.token,
        },
        body: JSON.stringify({ ...exercise, userId: state.currentUser.id }),
      });
    } catch (_) { /* fallback to local */ }
  }

  state.exerciseLib.push(exercise);
  save(); renderWorkouts(); closeModal('modal-exercise');
  toast('Exercise saved to library! 🏋️');
}
function quickAddExercise(id) {
  const ex = state.exerciseLib.find(e => e.id == id);
  const input = document.getElementById('ex-name');

  if (!ex || !input) {
    console.log("Error:", ex, input);
    return;
  }

  input.value = ex.name;
}

async function deleteWorkout(id) {

  state.workouts = state.workouts.filter(w => String(w.id) !== String(id));

  save();
  renderWorkouts();
  renderDashboard();

  try {
    await fetch(`${API_BASE}/logged-workouts/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.log(err);
  }
}
function deleteExercise(id) { state.exerciseLib = state.exerciseLib.filter(e => e.id !== id); save(); renderExerciseLibrary(); }

function setExFilter(cat) {
  exerciseFilter = cat;

  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.cat === cat)
  );

  renderExerciseLibrary();
}

// ── Nutrition ─────────────────────────────────────────────────
function renderNutrition() {
  const todayMeals = state.meals.filter(m => m.date === today());
  const todayCal   = todayMeals.reduce((s, m) => s + m.calories, 0);
  const todayProt  = todayMeals.reduce((s, m) => s + (m.protein || 0), 0);
  const todayCarbs = todayMeals.reduce((s, m) => s + (m.carbs || 0), 0);
  const todayFats  = todayMeals.reduce((s, m) => s + (m.fats || 0), 0);
  const calPct     = Math.min(100, Math.round((todayCal   / state.calorieGoal) * 100));
  const protPct    = Math.min(100, Math.round((todayProt  / state.proteinGoal) * 100));
  const carbsPct   = Math.min(100, Math.round((todayCarbs / state.carbsGoal)   * 100));
  const fatsPct    = Math.min(100, Math.round((todayFats  / state.fatsGoal)    * 100));

  document.getElementById('today-cal-count').textContent    = todayCal + ' / ' + state.calorieGoal + ' cal';
  document.getElementById('today-prot-count').textContent   = todayProt + ' / ' + state.proteinGoal + 'g';
  document.getElementById('today-carbs-count').textContent  = todayCarbs + ' / ' + state.carbsGoal + 'g';
  document.getElementById('today-fats-count').textContent   = todayFats + ' / ' + state.fatsGoal + 'g';
  document.getElementById('goal-display').textContent       = state.calorieGoal;
  document.getElementById('calorie-goal-input').value       = state.calorieGoal;
  document.getElementById('protein-goal-input').value       = state.proteinGoal;
  document.getElementById('carbs-goal-input').value         = state.carbsGoal;
  document.getElementById('fats-goal-input').value          = state.fatsGoal;
  document.getElementById('cal-progress-bar').style.width   = calPct + '%';
  document.getElementById('cal-progress-pct').textContent   = todayCal + ' cal consumed';
  document.getElementById('prot-progress-bar').style.width  = protPct + '%';
  document.getElementById('prot-progress-amt').textContent  = todayProt + 'g consumed';
  document.getElementById('carbs-progress-bar').style.width = carbsPct + '%';
  document.getElementById('carbs-progress-amt').textContent = todayCarbs + 'g consumed';
  document.getElementById('fats-progress-bar').style.width  = fatsPct + '%';
  document.getElementById('fats-progress-amt').textContent  = todayFats + 'g consumed';

  // Today's meals — full-width section, show time on right
  document.getElementById('today-meals').innerHTML = todayMeals.length
    ? todayMeals.map(m =>
        `<div class="meal-item">
          <div style="flex:1">
            <div class="exercise-name">${m.name}</div>
            <div class="meal-meta">${m.calories} cal
              ${m.protein ? ' · <span style="color:var(--accent-blue);font-weight:600">' + m.protein + 'g P</span>' : ''}
              ${m.carbs   ? ' · <span style="color:#d97706;font-weight:600">'            + m.carbs   + 'g C</span>' : ''}
              ${m.fats    ? ' · <span style="color:var(--accent-orange);font-weight:600">'+ m.fats   + 'g F</span>' : ''}
            </div>
          </div>
          <div style="text-align:right;margin:0 10px">
            <div style="font-size:0.75rem;color:var(--muted)">${m.time || ''}</div>
          </div>
          <button class="delete-btn" onclick="deleteMeal('${m.id}')">✕</button>
        </div>`).join('')
    : '<div class="empty">No meals logged today</div>';

  // Food library — all foods visible (scroll handles overflow)
  const q        = foodSearch.trim().toLowerCase();
  const allFoods = q ? state.foodLib.filter(f => f.name.toLowerCase().includes(q)) : state.foodLib;

  document.getElementById('food-grid').innerHTML =
  allFoods.map(f =>
    `<div class="food-card">

      ${f.source === "USER" ? `
        <button class="delete-btn food-delete-btn"
          onclick="event.stopPropagation(); deleteUserFood('${f.id}')">
          ✕
        </button>
      ` : ''}

      <div onclick="quickAddFood('${f.id}', '${f.source}')">

        <div class="food-card-name">${f.name}</div>
        <div class="food-card-portion">${f.portion}</div>
        <div class="food-card-cal">${f.calories} cal</div>

        <div class="food-card-prot">
          ${f.protein != null ? f.protein + 'g P' : ''}
        </div>

        <div class="food-card-macros">
          ${f.carbs != null ? f.carbs + 'g C' : ''}
          ${f.carbs != null && f.fats != null ? ' · ' : ''}
          ${f.fats != null ? f.fats + 'g F' : ''}
        </div>

      </div>

    </div>`).join('');

  // Meal history — individual meals sorted newest first, each with date+time on right
  const sortedMeals = [...state.meals].sort((a, b) =>
    (b.date + (b.time || '23:59')).localeCompare(a.date + (a.time || '23:59')));
  const recentMeals = sortedMeals.slice(0, 25);
  document.getElementById('meal-history').innerHTML = recentMeals.length
    ? recentMeals.map(m => {
        const displayDate = m.date === today() ? 'Today' : formatDate(m.date);
        return `<div class="history-item">
          <div style="flex:1">
            <div style="font-weight:600;font-size:0.88rem">${m.name}</div>
            <div style="font-size:0.78rem;color:var(--muted)">${m.calories} cal
              ${m.protein ? ' · ' + m.protein + 'g P' : ''}
              ${m.carbs   ? ' · ' + m.carbs   + 'g C' : ''}
              ${m.fats    ? ' · ' + m.fats    + 'g F' : ''}
            </div>
          </div>
          <div style="text-align:right;white-space:nowrap;margin-left:10px">
            <div style="font-size:0.78rem;font-weight:600;color:var(--accent-orange)">${m.calories} cal</div>
            <div style="font-size:0.74rem;color:var(--muted)">${displayDate}${m.time ? ' · ' + m.time : ''}</div>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty">No meal history yet</div>';
}
async function deleteUserFood(id) {

  const confirmDelete = confirm("Delete this food from library?");

  if (!confirmDelete) return;

  state.foodLib = state.foodLib.filter(f =>
    !(String(f.id) === String(id) && f.source === "USER")
  );

  save();
  renderNutrition();

  try {
    await fetch(`${API_BASE}/user-food/${id}`, {
      method: 'DELETE'
    });

    toast('Food deleted');

  } catch (err) {
    console.log(err);
  }
}
async function addMeal() {
  const name    = document.getElementById('meal-name').value.trim();
  const cal     = parseInt(document.getElementById('meal-cal').value) || 0;
  const protein = parseInt(document.getElementById('meal-protein').value) || 0;
  const carbs   = parseInt(document.getElementById('meal-carbs').value) || 0;
  const fats    = parseInt(document.getElementById('meal-fats').value) || 0;

  if (!state.currentUser) {
  return toast('Please login first to log meals');
  }
  if (!name) return toast('Please enter a meal name');
  if (!cal) return toast('Please enter calories');

  const time = new Date().toLocaleTimeString('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

  try {
    const res = await fetch(API_BASE + '/logged-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
      userId: state.currentUser.id,
      foodId: window.selectedFoodId || null,
      foodSource: window.selectedFoodSource || "USER",
      foodName: name,
      calories: cal,
      protein,
      carbs,
      fats
    })
    });

    const savedFood = await res.json();

    state.meals.unshift({
  id: savedFood.id,
  date: today(),
  time,
  name: savedFood.foodName,
  calories: savedFood.calories,
  protein: savedFood.protein,
  carbs: savedFood.carbs,
  fats: savedFood.fats
});

save();
renderNutrition();
renderDashboard();

  } catch (err) {
    console.log(err);
  }

  document.getElementById('meal-name').value = '';
  document.getElementById('meal-cal').value = '';
  document.getElementById('meal-protein').value = '';
  document.getElementById('meal-carbs').value = '';
  document.getElementById('meal-fats').value = '';

  toast('Meal logged! 🥗');
}
function quickAddFood(id, source) {

  const food = state.foodLib.find(f =>
    String(f.id) === String(id) &&
    String(f.source) === String(source)
  );

  if (!food) return;

  window.selectedFoodSource = food.source;
  window.selectedFoodId = food.id;

  document.getElementById('meal-name').value = food.name;
  document.getElementById('meal-cal').value = food.calories || '';

  if (document.getElementById('meal-protein')) {
    document.getElementById('meal-protein').value = food.protein || '';
  }

  if (document.getElementById('meal-carbs')) {
    document.getElementById('meal-carbs').value = food.carbs || '';
  }

  if (document.getElementById('meal-fats')) {
    document.getElementById('meal-fats').value = food.fats || '';
  }
}
function addFoodToLib() {
  document.getElementById('modal-food-name').value    = '';
  document.getElementById('modal-food-portion').value = '';
  document.getElementById('modal-food-cal').value     = '';
  document.getElementById('modal-food-protein').value = '';
  document.getElementById('modal-food-carbs').value   = '';
  document.getElementById('modal-food-fats').value    = '';
  openModal('modal-food');
}

async function submitAddFood() {

  const name = document.getElementById('modal-food-name').value.trim();
  const portion = document.getElementById('modal-food-portion').value.trim() || '1 serving';
  const cal = parseInt(document.getElementById('modal-food-cal').value) || 0;
  const protein = parseInt(document.getElementById('modal-food-protein').value) || 0;
  const carbs = parseInt(document.getElementById('modal-food-carbs').value) || 0;
  const fats = parseInt(document.getElementById('modal-food-fats').value) || 0;

  if (!name || !cal) return;

  try {

    const res = await fetch(API_BASE + '/user-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: state.currentUser.id,
        name,
        calories: cal,
        protein,
        carbs,
        fats
      })
    });

    const savedFood = await res.json();

    state.foodLib.push({
      id: savedFood.id,
      name: savedFood.name,
      portion,
      calories: savedFood.calories,
      protein: savedFood.protein,
      carbs: savedFood.carbs,
      fats: savedFood.fats,
      source: "USER"
    });

    save();
    renderNutrition();
    closeModal('modal-food');

  } catch (err) {
    console.log(err);
  }
}

function updateGoal() {
  const val = parseInt(document.getElementById('calorie-goal-input').value);
  if (!val || val < 0) return toast('Please enter a valid calorie goal');
  state.calorieGoal = val;
  save(); renderAll();
  toast('Calorie goal updated to ' + val + ' cal! 🔥');
}

function updateProteinGoal() {
  const val = parseInt(document.getElementById('protein-goal-input').value);
  if (!val || val < 0) return toast('Please enter a valid protein goal');
  state.proteinGoal = val;
  save(); renderAll();
  toast('Protein goal updated to ' + val + 'g! 💪');
}

function updateCarbsGoal() {
  const val = parseInt(document.getElementById('carbs-goal-input').value);
  if (!val || val < 0) return toast('Please enter a valid carbs goal');
  state.carbsGoal = val;
  save(); renderAll();
  toast('Carbs goal updated to ' + val + 'g! 🌾');
}

function updateFatsGoal() {
  const val = parseInt(document.getElementById('fats-goal-input').value);
  if (!val || val < 0) return toast('Please enter a valid fats goal');
  state.fatsGoal = val;
  save(); renderAll();
  toast('Fats goal updated to ' + val + 'g! 🥑');
}

async function deleteMeal(id) {

  state.meals = state.meals.filter(m => String(m.id) !== String(id));

  save();
  renderNutrition();
  renderDashboard();

  try {
    await fetch(`${API_BASE}/logged-food/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.log(err);
  }
}

// ── Tools ─────────────────────────────────────────────────────
function switchTool(tool) {
  document.querySelectorAll('.tool-tab').forEach(t  => t.classList.toggle('active', t.dataset.tool === tool));
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('active', p.id === 'tool-' + tool));
}

async function calcBMI() {
  const h = parseFloat(document.getElementById('bmi-height').value);
  const w = parseFloat(document.getElementById('bmi-weight').value);
  if (!h || !w) return toast('Please enter height and weight');
  let bmi, cat, col;
  try {
    const res  = await fetch(API_BASE + '/calculate/bmi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heightCm: h, weightKg: w }),
    });
    const data = await res.json();
    bmi = data.bmi; cat = data.category; col = data.color;
  } catch (_) {
    bmi = w / ((h / 100) ** 2);
    cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
    col = bmi < 18.5 ? '#3b6ef8' : bmi < 25 ? '#22c55e' : bmi < 30 ? '#f97316' : '#ef4444';
  }
  const r = document.getElementById('bmi-result');
  r.innerHTML = '<strong style="color:' + col + '">' + (+bmi).toFixed(1) + '</strong> — ' + cat;
  r.style.display = 'block';
}

async function calcTDEE() {
  const age = parseFloat(document.getElementById('tdee-age').value);
  const w   = parseFloat(document.getElementById('tdee-weight').value);
  const h   = parseFloat(document.getElementById('tdee-height').value);
  const g   = document.getElementById('tdee-gender').value;
  const a   = parseFloat(document.getElementById('tdee-activity').value);
  if (!age || !w || !h) return toast('Please fill in all fields');
  let tdee, bmr;
  try {
    const res  = await fetch(API_BASE + '/calculate/tdee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age, weightKg: w, heightCm: h, gender: g, activityFactor: a }),
    });
    const data = await res.json();
    tdee = data.tdee; bmr = data.bmr;
  } catch (_) {
    bmr  = g === 'male' ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    tdee = Math.round(bmr * a);
  }
  const r = document.getElementById('tdee-result');
  r.innerHTML = 'Estimated TDEE: <strong>' + Math.round(tdee) + ' cal/day</strong><br><small style="color:var(--muted)">BMR: ' + Math.round(bmr) + ' cal/day</small>';
  r.style.display = 'block';
}

async function calcBodyFat() {
  const neck   = parseFloat(document.getElementById('bf-neck').value);
  const waist  = parseFloat(document.getElementById('bf-waist').value);
  const hip    = parseFloat(document.getElementById('bf-hip').value);
  const height = parseFloat(document.getElementById('bf-height').value);
  const g      = document.getElementById('bf-gender').value;
  if (!neck || !waist || !height) return toast('Please fill in all fields');
  let bf;
  try {
    const res  = await fetch(API_BASE + '/calculate/bodyfat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender: g, neckCm: neck, waistCm: waist, hipCm: hip || 0, heightCm: height }),
    });
    const data = await res.json();
    bf = data.bodyFatPercent;
  } catch (_) {
    if (g === 'male') {
      bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      if (!hip) return toast('Enter hip measurement for female');
      bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }
  }
  if (bf == null) return;
  const r = document.getElementById('bf-result');
  r.innerHTML = 'Estimated Body Fat: <strong>' + Math.max(0, bf).toFixed(1) + '%</strong>';
  r.style.display = 'block';
}

async function calcWater() {
  const w   = parseFloat(document.getElementById('water-weight').value);
  const act = document.getElementById('water-activity').value;
  if (!w) return toast('Please enter your weight');
  let liters;
  try {
    const res  = await fetch(API_BASE + '/calculate/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weightKg: w, activityLevel: act }),
    });
    const data = await res.json();
    liters = data.liters;
  } catch (_) {
    liters = w * 0.033;
    if (act === 'moderate') liters += 0.5;
    if (act === 'high')     liters += 1;
  }
  const r = document.getElementById('water-result');
  r.innerHTML = 'Recommended intake: <strong>' + liters.toFixed(1) + 'L / day</strong>';
  r.style.display = 'block';
}

// ── Modal Helpers ─────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
  const first = document.querySelector('#' + id + ' .modal-input');
  if (first) setTimeout(() => first.focus(), 80);
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
}
function shakeModal(id) {
  const el = document.getElementById(id);
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
  toast('Please fill in all required fields');
}

// ── Utility Helpers ───────────────────────────────────────────
function groupByDate(arr) {
  return arr.reduce((acc, i) => {
    (acc[i.date] = acc[i.date] || []).push(i);
    return acc;
  }, {});
}
function formatDate(s) {
  return new Date(s).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' });
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  updateAuthUI();
  await loadBackendData();
  if (!state.currentUser) {
  state.workouts = [];
  state.meals = [];
}
  if (state.currentUser) {
  await loadLoggedWorkouts();
  await loadLoggedMeals();
}
  switchTab('dashboard');

  // Food search listener
  document.getElementById('food-search').addEventListener('input', e => {
    foodSearch = e.target.value;
    renderNutrition();
  });

  // Exercise search listener
  document.getElementById('exercise-search').addEventListener('input', e => {
    exerciseSearch = e.target.value;
    renderExerciseLibrary();
  });

  // Close modals on overlay click
  document.getElementById('modal-overlay').addEventListener('click', () => {
    document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id));
  });

  // Close modals on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id));
  });
});