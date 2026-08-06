/* ==========================================================================
   Supabase Cloud & Google OAuth Configuration
   ========================================================================== */
const SUPABASE_URL = 'https://xnwfnheyrivufthstdff.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhud2ZuaGV5cml2dWZ0aHN0ZGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MzY3NDYsImV4cCI6MjEwMTUxMjc0Nn0.1uym3rtdMJmOM6LvOHdfyl3LdVJvueherHkkBf1Wulk';

let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase client initialization notice:', e);
  }
}

const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '46812612247-sm9usgtn5e55a5mtk4o8lap3jqhr1vu1.apps.googleusercontent.com';

function parseJwtToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google ID Token:', e);
    return null;
  }
}

class AppEngine {
  constructor() {
    this.data = this.loadState();
    this.currentUser = this.loadUserSession();
    this.currentRole = this.currentUser ? this.currentUser.role : 'faculty'; // 'admin', 'faculty', 'student'
    this.activeStudentId = this.currentUser && this.currentUser.studentId ? this.currentUser.studentId : (this.data.students.length > 0 ? this.data.students[0].id : null); 
    this.activeNav = 'dashboard';
    this.activeAssignmentId = 'asg-001';
  }

  init() {
    this.setupEventListeners();
    this.syncWithSupabase();
    if (!this.currentUser) {
      // Prompt Google Auth Sign-In Modal on startup if not logged in
      this.showLoginModal(false);
    }
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
  }

  async syncWithSupabase() {
    if (!supabaseClient) return;
    try {
      // Fetch students from Supabase
      const { data: stData, error: stErr } = await supabaseClient.from('students').select('*');
      if (!stErr && stData && Array.isArray(stData) && stData.length > 0) {
        stData.forEach(st => {
          const existingIdx = this.data.students.findIndex(s => s.id === st.id || s.email === st.email || s.uin === st.uin);
          const formattedSt = {
            id: st.id,
            uin: st.uin,
            name: st.name,
            email: st.email,
            academicYear: st.academic_year || st.academicYear || '2026-27',
            branch: st.branch,
            division: st.division,
            batch: st.batch
          };
          if (existingIdx >= 0) {
            this.data.students[existingIdx] = formattedSt;
          } else {
            this.data.students.push(formattedSt);
          }
        });
        this.saveState();
        this.renderCurrentView();
      }

      // Fetch faculty from Supabase
      const { data: facData, error: facErr } = await supabaseClient.from('faculty').select('*');
      if (!facErr && facData && Array.isArray(facData) && facData.length > 0) {
        facData.forEach(f => {
          const existingIdx = this.data.faculty.findIndex(fac => fac.id === f.id || fac.email === f.email);
          const formattedFac = {
            id: f.id,
            name: f.name,
            email: f.email,
            departmentId: f.department_id || f.departmentId,
            role: f.role,
            assignedSubjects: f.assigned_subjects || f.assignedSubjects || [],
            isDualRole: f.is_dual_role || f.isDualRole || false
          };
          if (existingIdx >= 0) {
            this.data.faculty[existingIdx] = formattedFac;
          } else {
            this.data.faculty.push(formattedFac);
          }
        });
        this.saveState();
        this.renderCurrentView();
      }
    } catch (e) {
      console.warn('Supabase cloud sync background notice:', e);
    }
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

  login(emailInput, googlePayload = null) {
    const email = (emailInput || '').trim().toLowerCase();
    if (!email) return false;

    let matchedUser = null;
    let role = null;
    let studentId = null;

    if (HARDCODED_ADMIN_EMAILS.some(e => e.trim().toLowerCase() === email)) {
      const foundFac = (this.data.faculty || []).find(f => (f.email || '').trim().toLowerCase() === email);
      role = 'admin';
      matchedUser = foundFac || { name: googlePayload ? googlePayload.name : 'Prof. Jugal Jagtap', email: email, department: 'First Year Engineering' };
    } else {
      const fac = (this.data.faculty || []).find(f => (f.email || '').trim().toLowerCase() === email);
      if (fac) {
        role = fac.role || 'faculty';
        matchedUser = fac;
      } else {
        const st = (this.data.students || []).find(s => {
          const sEmail = (s.email || '').trim().toLowerCase();
          const sUin = (s.uin || '').trim().toLowerCase();
          return (sEmail && sEmail === email) || (sEmail && email.startsWith(sEmail)) || (sUin && (email === sUin || email.startsWith(sUin)));
        });
        if (st) {
          role = 'student';
          matchedUser = st;
          studentId = st.id;
        }
      }
    }

    if (matchedUser && role) {
      const sessionUser = {
        name: (googlePayload && googlePayload.name) || matchedUser.name || 'User',
        email: matchedUser.email || email,
        role: role,
        studentId: studentId,
        uin: matchedUser.uin || null,
        branch: matchedUser.branch || null,
        batch: matchedUser.batch || null,
        picture: googlePayload ? googlePayload.picture : null,
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

  handleGoogleCredentialResponse(response) {
    const feedback = document.getElementById('modal-login-feedback');
    if (!response || !response.credential) {
      if (feedback) feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Google Sign-In failed. Please try again.</div>`;
      return;
    }

    const payload = parseJwtToken(response.credential);
    if (!payload || !payload.email) {
      if (feedback) feedback.innerHTML = `<div style="color:var(--danger); font-size:12px; font-weight:600;">⚠️ Failed to process Google account data.</div>`;
      return;
    }

    const email = payload.email.toLowerCase();
    const domain = email.split('@')[1];

    // Enforce Institutional Domain Restriction
    if (domain !== 'eng.rizvi.edu.in' && payload.hd !== 'eng.rizvi.edu.in') {
      if (feedback) {
        feedback.innerHTML = `
          <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
            <strong>⛔ INSTITUTIONAL ACCESS ONLY!</strong><br>
            Signed in as <code>${email}</code>.<br>
            Only official <strong>@eng.rizvi.edu.in</strong> Google Workspace accounts are permitted.
          </div>
        `;
      }
      return;
    }

    const success = this.login(email, payload);
    if (!success && feedback) {
      feedback.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #DC2626; padding:12px; border-radius:var(--radius-md); font-size:12px; color:#991B1B; margin-top:8px;">
          <strong>⛔ UNLISTED ACCOUNT!</strong><br>
          • Authenticated via Google Workspace as <code>${email}</code>.<br>
          • Account is not currently whitelisted in Student Master or Faculty Roster.<br>
          • Contact System Administrator (<code style="color:#DC2626;">jugaljagtap@eng.rizvi.edu.in</code>).
        </div>
      `;
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

    const isPlaceholderClientId = GOOGLE_CLIENT_ID.includes('YOUR_GOOGLE_CLIENT_ID');

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
          ${canClose ? '<button class="close-btn" aria-label="Close modal" onclick="app.closeModal()">✕</button>' : ''}
        </div>
        <div class="modal-body" style="padding:20px;">
          <div style="background:var(--accent-blue-subtle); border:1px solid rgba(0,102,204,0.2); padding:12px 14px; border-radius:var(--radius-md); font-size:12px; color:var(--accent-blue); margin-bottom:18px;">
            <strong>🔒 Whitelist Policy Enforced:</strong> Official Google Workspace accounts with <code class="code-font">@eng.rizvi.edu.in</code> domain are authenticated automatically.
          </div>

          <!-- Official Google Identity Services OAuth Container -->
          <div style="margin-bottom:20px; text-align:center;">
            <label style="display:block; font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; margin-bottom:10px; letter-spacing:0.5px;">Official Google Authentication</label>
            <div id="google-signin-btn-container" style="display:flex; justify-content:center; min-height:44px; align-items:center;"></div>
            ${isPlaceholderClientId ? `
              <div style="margin-top:8px; font-size:11px; color:#D97706; background:#FEF3C7; padding:8px; border-radius:6px;">
                💡 <strong>Developer Tip:</strong> Update <code>GOOGLE_CLIENT_ID</code> in <code>js/app.js</code> with your Google Cloud Console Client ID to activate live Google Sign-In.
              </div>
            ` : ''}
          </div>

          <!-- Collapsible Roster Test Bypass -->
          <details style="border-top:1px solid var(--border-default); padding-top:14px; margin-top:14px;">
            <summary style="font-size:12px; font-weight:600; color:var(--text-secondary); cursor:pointer; user-select:none;">
              ⚙️ Local Testing / Roster Quick-Select (Dev Bypass)
            </summary>
            <div style="margin-top:12px; padding-top:8px;">
              <button class="btn btn-primary" onclick="app.login('jugaljagtap@eng.rizvi.edu.in')" style="width:100%; justify-content:center; padding:9px; font-weight:600; margin-bottom:10px; font-size:12px;">
                ⚡ Sign In as Dual Admin & Faculty (Prof. Jugal Jagtap)
              </button>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:12px;">
                <div>
                  <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">👨‍🏫 Faculty Roster:</label>
                  <select id="quick-faculty-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                    <option value="">-- Select Faculty --</option>
                    ${facultyOptions}
                  </select>
                </div>

                <div>
                  <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">🎓 Student Master (${this.data.students.length}):</label>
                  <select id="quick-student-select" class="form-control" style="font-size:12px;" onchange="if(this.value) app.login(this.value)">
                    <option value="">-- Select Student --</option>
                    ${studentOptions}
                  </select>
                </div>
              </div>

              <div>
                <label style="display:block; font-size:11px; font-weight:600; margin-bottom:4px;">Enter Institutional Email:</label>
                <div style="display:flex; gap:8px;">
                  <input type="email" id="modal-login-email" class="form-control" placeholder="user@eng.rizvi.edu.in" style="flex:1; font-size:12px;" value="jugaljagtap@eng.rizvi.edu.in">
                  <button class="btn btn-secondary" onclick="app.handleCustomLogin()" style="font-size:12px; font-weight:600; white-space:nowrap;">
                    🔑 Test Login
                  </button>
                </div>
              </div>
            </div>
          </details>

          <div id="modal-login-feedback" style="margin-top:10px;"></div>
        </div>
      </div>
    `;

    setTimeout(() => {
      overlay.classList.add('active');
      this.initGoogleAuth();
    }, 10);
  }

  initGoogleAuth() {
    if (window.google && window.google.accounts) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => this.handleGoogleCredentialResponse(response),
          auto_select: false,
          hd: 'eng.rizvi.edu.in'
        });

        const container = document.getElementById('google-signin-btn-container');
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 300
          });
        }

        // Trigger Google One-Tap popup prompt
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('Google Identity Services initialization failed or missing Client ID:', e);
      }
    }
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

    if (!state.students) state.students = [];
    if (!state.faculty) state.faculty = JSON.parse(JSON.stringify(INITIAL_DATA.faculty));
    if (!state.courseOutcomes) state.courseOutcomes = [];
    if (!state.programSpecificOutcomes) state.programSpecificOutcomes = JSON.parse(JSON.stringify(INITIAL_DATA.programSpecificOutcomes));
    state.academicClasses = JSON.parse(JSON.stringify(INITIAL_DATA.academicClasses));
    state.rubricPresets = JSON.parse(JSON.stringify(INITIAL_DATA.rubricPresets));
    if (!state.assignments) state.assignments = [];
    if (!state.submissions) state.submissions = [];

    // Clean and deduplicate subjects by subject code
    const initialSubs = JSON.parse(JSON.stringify(INITIAL_DATA.subjects));
    if (!state.subjects || state.subjects.length === 0 || state.subjects.filter(s => s.code === '24051181').length > 1) {
      state.subjects = initialSubs;
    } else {
      const uniqueSubMap = new Map();
      state.subjects.forEach(s => {
        if (s && s.code && !uniqueSubMap.has(s.code)) {
          uniqueSubMap.set(s.code, s);
        }
      });
      state.subjects = Array.from(uniqueSubMap.values());
    }

    // Force strict 6 Hardcoded Departments
    state.departments = JSON.parse(JSON.stringify(HARDCODED_DEPARTMENTS));

    // Ensure backwards compatibility for COs/LOs
    state.courseOutcomes.forEach(co => {
      if (!co.type) co.type = (co.code && co.code.includes('.LO')) ? 'LO' : 'CO';
      if (!co.poIds) co.poIds = co.poId ? [co.poId] : ['PO1'];
      if (!co.psoIds) co.psoIds = [];
      if (!co.moduleIds) co.moduleIds = [];
      if (!co.experimentIds) co.experimentIds = [];
    });

    return state;
  }

  getDepartmentShortName(deptId) {
    const dept = (this.data.departments || []).find(d => d.id === deptId);
    if (!dept) return 'FE';
    if (dept.shortName) return dept.shortName;
    if (dept.id === 'dept-fe') return 'FE';
    if (dept.id === 'dept-aids') return 'AI&DS';
    if (dept.id === 'dept-civil') return 'Civil';
    if (dept.id === 'dept-comp') return 'Comp';
    if (dept.id === 'dept-ecs') return 'ECS';
    if (dept.id === 'dept-mech') return 'Mech';
    return 'FE';
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
        { id: 'students', label: `Student Master (${this.data.students.length})`, icon: '🎓' },
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
          <button class="close-btn" aria-label="Close modal" onclick="app.closeModal()">✕</button>
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
