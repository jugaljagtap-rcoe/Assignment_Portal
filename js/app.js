/* ==========================================================================
   Rizvi College of Engineering - App Engine & Router
   ========================================================================== */

class AppEngine {
  constructor() {
    this.data = this.loadState();
    this.currentUser = this.loadUserSession();
    this.currentRole = this.currentUser ? this.currentUser.role : 'faculty'; // 'admin', 'faculty', 'student'
    this.activeStudentId = this.currentUser && this.currentUser.studentId ? this.currentUser.studentId : 'st-101'; 
    this.activeNav = 'dashboard';
    this.activeAssignmentId = 'asg-001';
  }

  init() {
    this.setupEventListeners();
    if (!this.currentUser) {
      // Prompt Google Auth Sign-In Modal on startup if not logged in
      this.showLoginModal(false);
    }
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
  }

  loadUserSession() {
    const saved = localStorage.getItem('rizvi_fe_portal_user');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { console.error('Failed to parse user session:', e); }
    }
    return null; // Default to null (logged out)
  }

  saveUserSession(user) {
    if (user) {
      localStorage.setItem('rizvi_fe_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('rizvi_fe_portal_user');
    }
    this.currentUser = user;
  }

  login(emailInput) {
    const email = (emailInput || '').trim().toLowerCase();
    if (!email) return false;

    let matchedUser = null;
    let role = null;
    let studentId = null;

    if (HARDCODED_ADMIN_EMAILS.includes(email)) {
      const foundFac = this.data.faculty.find(f => f.email.toLowerCase() === email);
      role = 'admin';
      matchedUser = foundFac || { name: 'Prof. Jugal Jagtap', email: email, department: 'First Year Engineering' };
    } else {
      const fac = this.data.faculty.find(f => (f.email || '').toLowerCase() === email);
      if (fac) {
        role = fac.role || 'faculty';
        matchedUser = fac;
      } else {
        const st = this.data.students.find(s => (s.email || '').toLowerCase() === email || (s.uin && email.startsWith(s.uin.toLowerCase())));
        if (st) {
          role = 'student';
          matchedUser = st;
          studentId = st.id;
        }
      }
    }

    if (matchedUser && role) {
      const sessionUser = {
        name: matchedUser.name || 'User',
        email: matchedUser.email || email,
        role: role,
        studentId: studentId,
        uin: matchedUser.uin || null,
        branch: matchedUser.branch || null,
        batch: matchedUser.batch || null,
        loggedInAt: new Date().toISOString()
      };
      this.saveUserSession(sessionUser);
      this.currentRole = role;
      if (studentId) this.activeStudentId = studentId;
      this.closeModal();
      this.showToast(`Welcome back, ${sessionUser.name}! (${sessionUser.email})`, 'success');
      this.renderRoleSwitcher();
      this.renderSidebar();
      this.renderCurrentView();
      return true;
    } else {
      return false;
    }
  }

  logout() {
    this.saveUserSession(null);
    this.showToast('Logged out of Rizvi FE Portal', 'info');
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showLoginModal(false);
  }

  showLoginModal(canClose = false) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    const facultyOptions = this.data.faculty.map(f => `<option value="${f.email}">${f.name} (${f.email})</option>`).join('');
    const studentOptions = this.data.students.map(s => `<option value="${s.email}">${s.uin} - ${s.name} (${s.branch} - ${s.batch})</option>`).join('');

    overlay.innerHTML = `
      <div class="modal-card" style="max-width:540px; border-radius:var(--radius-xl); border:1px solid var(--border-strong); box-shadow:var(--shadow-level-4);">
        <div class="modal-header" style="background:var(--bg-subtle); border-bottom:1px solid var(--border-default); padding:16px 20px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; background:var(--accent-blue); color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">R</div>
            <div>
              <h3 class="modal-title" style="font-size:16px; font-weight:700;">Google Workspace Sign-In</h3>
              <div style="font-size:12px; color:var(--text-secondary);">Restricted to <code style="color:var(--accent-blue); font-weight:600;">@eng.rizvi.edu.in</code></div>
            </div>
          </div>
          ${canClose ? '<button class="close-btn" onclick="app.closeModal()">✕</button>' : ''}
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="background:var(--accent-blue-subtle); border:1px solid rgba(0,102,204,0.2); padding:12px 14px; border-radius:var(--radius-md); font-size:12px; color:var(--accent-blue); margin-bottom:18px;">
            <strong>🔒 Whitelist Policy Enforced:</strong> Unlisted Google accounts are strictly denied access. Select an enrolled roster profile or enter your <code class="code-font">@eng.rizvi.edu.in</code> institutional email below.
          </div>

          <!-- Quick Login Roster Buttons -->
          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:8px; letter-spacing:0.5px;">1-Click Whitelisted Accounts</label>

            <button class="btn btn-primary" onclick="app.login('jugaljagtap@eng.rizvi.edu.in')" style="width:100%; justify-content:center; padding:10px; font-weight:600; margin-bottom:10px; font-size:13px;">
              ⚡ Sign In as Dual Admin & Faculty (Prof. Jugal Jagtap)
            </button>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:14px;">
              <div>
                <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">👨‍🏫 Faculty Roster:</label>
                <select id="quick-faculty-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                  <option value="">-- Select Faculty --</option>
                  ${facultyOptions}
                </select>
              </div>

              <div>
                <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">🎓 Student Master (360):</label>
                <select id="quick-student-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                  <option value="">-- Select Student --</option>
                  ${studentOptions}
                </select>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; margin:16px 0; color:var(--text-tertiary); font-size:11px;">
            <div style="flex:1; height:1px; background:var(--border-default);"></div>
            <span style="padding:0 10px; font-weight:600; text-transform:uppercase;">OR ENTER CUSTOM EMAIL</span>
            <div style="flex:1; height:1px; background:var(--border-default);"></div>
          </div>

          <!-- Custom Email Login Input -->
          <div style="margin-bottom:14px;">
            <label style="display:block; font-size:12px; font-weight:600; margin-bottom:6px;">Google Institutional Email (@eng.rizvi.edu.in):</label>
            <div style="display:flex; gap:8px;">
              <input type="email" id="modal-login-email" class="form-control" placeholder="user@eng.rizvi.edu.in" style="flex:1; font-size:13px;" value="jugaljagtap@eng.rizvi.edu.in">
              <button class="btn btn-secondary" onclick="app.handleCustomLogin()" style="font-size:13px; font-weight:600; white-space:nowrap;">
                🔑 Sign In
              </button>
            </div>
          </div>

          <div id="modal-login-feedback" style="margin-top:10px;"></div>
        </div>
      </div>
    `;

    setTimeout(() => overlay.classList.add('active'), 10);
  }

  handleCustomLogin() {
    const input = document.getElementById('modal-login-email');
    const feedback = document.getElementById('modal-login-feedback');
    if (!input || !feedback) return;

    const email = input.value.trim();
    if (!email) {
      feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Please enter your @eng.rizvi.edu.in email address.</div>`;
      return;
    }

    const success = this.login(email);
    if (!success) {
      feedback.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
          <strong>⛔ LOGIN DENIED: UNLISTED ACCOUNT!</strong><br>
          • <strong>Status:</strong> Authenticated as <code>${email}</code> via Google Workspace.<br>
          • <strong>Whitelist Status:</strong> NOT listed in Student Master, Faculty Roster, or Admin list.<br>
          • <strong>Access Result:</strong> Access is strictly blocked. Contact System Admin (<code style="color:#DC2626;">jugaljagtap@eng.rizvi.edu.in</code>).
        </div>
      `;
    }
  }

  loadState() {
    let state = null;
    const saved = localStorage.getItem('rizvi_fe_portal_data');
    if (saved) {
      try { state = JSON.parse(saved); } catch(e) { console.error('Failed to parse state:', e); }
    }
    if (!state) {
      state = JSON.parse(JSON.stringify(INITIAL_DATA));
    }

    // Force strict 6 Hardcoded Departments
    state.departments = JSON.parse(JSON.stringify(HARDCODED_DEPARTMENTS));

    return state;
  }

  saveState() {
    localStorage.setItem('rizvi_fe_portal_data', JSON.stringify(this.data));
  }

  resetState() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.saveState();
    this.showToast('Database reset to default seed state', 'success');
    this.renderCurrentView();
  }

  getAssignmentSchedule(asgId, batchName) {
    const asg = this.data.assignments.find(a => a.id === asgId) || this.data.assignments[0];
    if (asg && asg.schedules && asg.schedules.length > 0) {
      const match = asg.schedules.find(s => s.scopeValue === batchName);
      if (match) return match;
      return asg.schedules[0];
    }
    return {
      publishDate: asg ? asg.publishDate : "2026-08-01T09:00",
      deadline: asg ? asg.deadline : "2026-08-10T23:59",
      submissionsOpen: true,
      gradesReleased: true,
      latePenaltyValue: 10,
      lateMaxCap: 30
    };
  }

  switchRole(role) {
    this.currentRole = role;
    this.activeNav = 'dashboard';
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showToast(`Switched view to ${role.toUpperCase()} mode`, 'info');
  }

  switchNav(navId) {
    this.activeNav = navId;
    this.renderSidebar();
    this.renderCurrentView();
  }

  renderRoleSwitcher() {
    const switcher = document.getElementById('role-switcher-container');
    if (!switcher) return;

    if (!this.currentUser) {
      switcher.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="app.showLoginModal(false)" style="font-size:12px; font-weight:600;">
          🔑 Google Sign-In (@eng.rizvi.edu.in)
        </button>
      `;
    } else if (this.currentUser.email === 'jugaljagtap@eng.rizvi.edu.in' || HARDCODED_ADMIN_EMAILS.includes(this.currentUser.email)) {
      // jugaljagtap@eng.rizvi.edu.in Dual-Role Profile Switcher Toggle
      switcher.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="display:flex; align-items:center; gap:6px; background:var(--accent-blue-subtle); padding:4px 10px; border-radius:var(--radius-md); border:1px solid rgba(0,102,204,0.2);">
            <span style="font-size:11px; font-weight:700; color:var(--accent-blue);">PROFILER TOGGLE:</span>
            <button class="btn ${this.currentRole === 'admin' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('admin')" style="padding:2px 8px; font-size:11px;">⚡ Admin View</button>
            <button class="btn ${this.currentRole === 'faculty' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('faculty')" style="padding:2px 8px; font-size:11px;">👨‍🏫 Faculty View</button>
            <button class="btn ${this.currentRole === 'student' ? 'btn-secondary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('student')" style="padding:2px 8px; font-size:11px;">🎓 Student Preview</button>
          </div>
        </div>
      `;
    } else {
      switcher.innerHTML = `
        <span class="tag ${this.currentRole === 'faculty' ? 'tag-co' : 'tag-success'}" style="font-size:12px; padding:4px 10px;">
          ${this.currentRole.toUpperCase()} SESSION
        </span>
      `;
    }

    const userBadge = document.getElementById('active-user-badge');
    if (userBadge) {
      if (!this.currentUser) {
        userBadge.innerHTML = `<span style="font-size:12px; color:var(--text-tertiary);">Not Logged In</span>`;
      } else if (this.currentRole === 'student') {
        const student = this.data.students.find(s => s.id === this.activeStudentId) || this.currentUser;
        userBadge.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="avatar-dot"></span>
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${student ? student.name : 'Student'} (${student ? student.uin || '' : ''})</span>
            <button class="btn btn-ghost btn-sm" onclick="app.logout()" style="color:var(--danger); font-weight:600; padding:3px 8px; font-size:11px; margin-left:6px; border:1px solid rgba(255,59,48,0.2); background:var(--danger-subtle);">
              🚪 Log Out
            </button>
          </div>
        `;
      } else {
        userBadge.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="avatar-dot"></span>
            <span style="font-size:13px; font-weight:600; color:var(--text-primary);">${this.currentUser.name} (${this.currentUser.role.toUpperCase()})</span>
            <button class="btn btn-ghost btn-sm" onclick="app.logout()" style="color:var(--danger); font-weight:600; padding:3px 8px; font-size:11px; margin-left:6px; border:1px solid rgba(255,59,48,0.2); background:var(--danger-subtle);">
              🚪 Log Out
            </button>
          </div>
        `;
      }
    }
  }

  setActiveStudent(studentId) {
    this.activeStudentId = studentId;
    this.renderCurrentView();
    this.showToast(`Switched active student perspective`, 'info');
  }

  renderSidebar() {
    const sidebar = document.getElementById('sidebar-nav');
    if (!sidebar) return;

    let items = [];
    if (this.currentRole === 'admin') {
      items = [
        { id: 'dashboard', label: 'Admin Dashboard', icon: '⚡' },
        { id: 'students', label: 'Student Master (360)', icon: '🎓' },
        { id: 'faculty', label: 'Faculty Roster', icon: '👨‍🏫' },
        { id: 'departments', label: 'Departments & Vision/Mission', icon: '🏛️' },
        { id: 'google-auth', label: 'Google Auth & Roles', icon: '🔑' },
        { id: 'pos', label: 'Program Outcomes (POs)', icon: '🎯' },
        { id: 'analytics', label: 'CO/PO Accreditation', icon: '📊' }
      ];
    } else if (this.currentRole === 'faculty') {
      items = [
        { id: 'dashboard', label: 'Faculty Dashboard', icon: '📋' },
        { id: 'assignments', label: 'Assignment Builder', icon: '📝' },
        { id: 'outcomes', label: 'Course Outcomes & Modules', icon: '🎯' },
        { id: 'rubrics', label: 'Rubric Builder', icon: '📐' },
        { id: 'schedules', label: 'Multi-Batch Schedules', icon: '📅' },
        { id: 'csv-pipeline', label: 'CSV Upload & Solutions', icon: '📂' },
        { id: 'analytics', label: 'CO Attainment Report', icon: '📊' }
      ];
    } else {
      items = [
        { id: 'dashboard', label: 'My Experiments & Labs', icon: '🔬' },
        { id: 'solver', label: 'Active Canvas Sheet', icon: '✏️' },
        { id: 'grades', label: 'My Submissions & Rubric', icon: '🏆' }
      ];
    }

    sidebar.innerHTML = items.map(item => `
      <div class="nav-item ${this.activeNav === item.id ? 'active' : ''}" onclick="app.switchNav('${item.id}')">
        <span>${item.icon}</span>
        <span>${item.label}</span>
      </div>
    `).join('');
  }

  renderCurrentView() {
    const main = document.getElementById('main-content');
    if (!main) return;

    if (!this.currentUser) {
      main.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px 20px; text-align:center;">
          <div style="width:64px; height:64px; background:var(--accent-blue-subtle); color:var(--accent-blue); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:16px;">🔑</div>
          <h2 style="font-size:20px; font-weight:700; margin-bottom:8px;">Authentication Required</h2>
          <p style="color:var(--text-secondary); max-width:420px; font-size:13px; margin-bottom:20px;">Please sign in using your institutional <code class="code-font">@eng.rizvi.edu.in</code> Google account to access your assignment portal.</p>
          <button class="btn btn-primary" onclick="app.showLoginModal(false)" style="padding:10px 20px; font-weight:600;">
            🔑 Sign In with Google Workspace
          </button>
        </div>
      `;
      return;
    }

    if (this.currentRole === 'admin') {
      adminView.render(main, this.activeNav);
    } else if (this.currentRole === 'faculty') {
      facultyView.render(main, this.activeNav);
    } else {
      studentView.render(main, this.activeNav);
    }
  }

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentUser) this.closeModal();
    });
  }

  showModal(title, contentHtml) {
    let overlay = document.getElementById('global-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'global-modal-overlay';
      overlay.className = 'modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="close-btn" onclick="app.closeModal()">✕</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
      </div>
    `;

    setTimeout(() => overlay.classList.add('active'), 10);
  }

  closeModal() {
    const overlay = document.getElementById('global-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'danger' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 200);
    }, 3500);
  }
}

const app = new AppEngine();
document.addEventListener('DOMContentLoaded', () => app.init());
