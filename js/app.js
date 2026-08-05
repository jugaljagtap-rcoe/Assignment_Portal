/* ==========================================================================
   Rizvi College of Engineering - App Engine & Router
   ========================================================================== */

class AppEngine {
  constructor() {
    this.data = this.loadState();
    this.currentRole = 'faculty'; // 'admin', 'faculty', 'student'
    this.activeStudentId = 'st-101'; // Default student preview
    this.activeNav = 'dashboard';
    this.activeAssignmentId = 'asg-001';
  }

  init() {
    this.setupEventListeners();
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
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
    this.showToast(`Switched view to ${role.toUpperCase()} mode (jugaljagtap@eng.rizvi.edu.in)`, 'info');
  }

  switchNav(navId) {
    this.activeNav = navId;
    this.renderSidebar();
    this.renderCurrentView();
  }

  renderRoleSwitcher() {
    const switcher = document.getElementById('role-switcher-container');
    if (!switcher) return;

    // jugaljagtap@eng.rizvi.edu.in Dual-Role Profile Switcher Toggle
    switcher.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <div style="display:flex; align-items:center; gap:6px; background:var(--accent-blue-subtle); padding:4px 10px; border-radius:var(--radius-md); border:1px solid rgba(0,102,204,0.2);">
          <span style="font-size:11px; font-weight:700; color:var(--accent-blue);">PROFILER TOGGLE (jugaljagtap@eng.rizvi.edu.in):</span>
          <button class="btn ${this.currentRole === 'admin' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('admin')" style="padding:2px 8px; font-size:11px;">⚡ Admin View</button>
          <button class="btn ${this.currentRole === 'faculty' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('faculty')" style="padding:2px 8px; font-size:11px;">👨‍🏫 Faculty View</button>
          <button class="btn ${this.currentRole === 'student' ? 'btn-secondary' : 'btn-ghost'} btn-sm" onclick="app.switchRole('student')" style="padding:2px 8px; font-size:11px;">🎓 Student Preview</button>
        </div>
      </div>
    `;

    const userBadge = document.getElementById('active-user-badge');
    if (userBadge) {
      if (this.currentRole === 'student') {
        const student = this.data.students.find(s => s.id === this.activeStudentId);
        userBadge.innerHTML = `
          <span class="avatar-dot"></span>
          <span>${student ? student.name : 'Student'} (${student ? student.uin : ''})</span>
          <select style="margin-left:6px; font-size:11px; padding:2px 4px;" onchange="app.setActiveStudent(this.value)">
            ${this.data.students.map(s => `<option value="${s.id}" ${s.id === this.activeStudentId ? 'selected' : ''}>${s.uin} - ${s.name} (${s.batch})</option>`).join('')}
          </select>
        `;
      } else if (this.currentRole === 'faculty') {
        userBadge.innerHTML = `<span class="avatar-dot"></span><span>Prof. Jugal Jagtap (Faculty Profile)</span>`;
      } else {
        userBadge.innerHTML = `<span class="avatar-dot"></span><span>Prof. Jugal Jagtap (Institutional Admin)</span>`;
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
      if (e.key === 'Escape') this.closeModal();
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
