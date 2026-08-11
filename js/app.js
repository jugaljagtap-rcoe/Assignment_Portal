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

/* ==========================================================================
   PART 2 — AUDIT HELPER (Fire-and-forget, never awaited)
   ========================================================================== */
function writeAudit(action, entityType, entityId, snapshot) {
  if (!supabaseClient) return;
  supabaseClient.from('audit_log').insert({
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    changed_by: (window.app && window.app.currentUser) ? window.app.currentUser.email : 'system',
    snapshot: snapshot || {}
  }).then(() => {}).catch(err => console.warn('Audit insert notice:', err));
}

class AppEngine {
  constructor() {
    this.data = this.loadState();
    this.currentUser = this.loadUserSession();
    this.currentRole = this.currentUser ? this.currentUser.role : 'faculty'; // 'admin', 'faculty', 'student'
    this.activeTabCategory = 'faculty'; // 'admin', 'faculty', 'student', 'nba'
    this.activeStudentId = this.currentUser && this.currentUser.studentId ? this.currentUser.studentId : (this.data.students.length > 0 ? this.data.students[0].id : null); 
    this.activeNav = this.getNavFromHash() || 'dashboard';
    const savedAsgId = localStorage.getItem('rizvi_fe_active_asg_id');
    const firstAsgId = this.data.assignments.length > 0 ? this.data.assignments[0].id : null;
    this.activeAssignmentId = savedAsgId || firstAsgId || null;
    this.lastSyncedAt = null;
    this.reconcileUserSession();
  }

  getStudentsForDept(deptId) {
    return (this.data.students || []).filter(s => {
      const b = (s.branch || '').toLowerCase();
      const y = (s.yearOfStudy || s.year_of_study || 'FE').toUpperCase();
      if (deptId === 'dept-fe') return y === 'FE';
      if (deptId === 'dept-aids') return b.includes('artificial intelligence');
      if (deptId === 'dept-civil') return b.includes('civil');
      if (deptId === 'dept-comp') return b.includes('computer engineering');
      if (deptId === 'dept-ecs') return b.includes('electronics');
      if (deptId === 'dept-mech') return b.includes('mechanical');
      return false;
    });
  }

  getNavFromHash() {
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (!hash) return null;
    if (hash === 'home') return 'dashboard';
    return hash;
  }

  showSpinner(message = 'Loading portal data…') {
    const overlay = document.getElementById('spinner-overlay');
    const msgEl = document.getElementById('spinner-message');
    if (msgEl) msgEl.textContent = message;
    if (overlay) overlay.classList.add('active');
  }

  hideSpinner() {
    const overlay = document.getElementById('spinner-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  init() {
    this.setupEventListeners();
    this.handleHashChange();
    this.showSpinner('Loading portal data…');
    this.loadAllFromSupabase().then(() => {
      return this.checkSupabaseTables();
    }).finally(() => {
      this.hideSpinner();
      if (!this.currentUser) this.showLoginModal(false);
      else {
        this.renderTopNavTabs();
        this.renderRoleSwitcher();
        this.renderSidebar();
        this.renderCurrentView();
      }
    });

    // Hash-based routing listener
    window.addEventListener('hashchange', () => this.handleHashChange());

    // Cross-tab real-time data sync listener
    window.addEventListener('storage', (e) => {
      if (e.key === 'rizvi_fe_portal_data') {
        this.data = this.loadState();
        this.reconcileUserSession();
        this.renderCurrentView();
      }
    });
  }

  handleHashChange() {
    const hash = window.location.hash || '';
    if (hash.startsWith('#admin')) this.activeTabCategory = 'admin';
    else if (hash.startsWith('#faculty')) this.activeTabCategory = 'faculty';
    else if (hash.startsWith('#student')) this.activeTabCategory = 'student';
    else if (hash.startsWith('#nba')) this.activeTabCategory = 'nba';

    if (hash === '#admin-home' || hash === '#faculty-home' || hash === '#student-home' || hash === '' || hash === '#home') {
      this.activeNav = 'dashboard';
    }

    this.renderTopNavTabs();
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
  }

  /* ==========================================================================
     PART 2 — DATA LOADING ARCHITECTURE (Promise.all Parallel Sync)
     ========================================================================== */
  async loadAllFromSupabase() {
    if (!supabaseClient) {
      this.showToast('Running in offline mode — Supabase not connected. Data saved locally only.', 'warning');
      return;
    }

    try {
      const [
        studentsRes, facultyRes, subjectFacultyRes, subjectsRes, assignmentsRes,
        submissionsRes, assignmentSubmissionsRes, studentVarsRes, studentAnswersRes,
        courseOutcomesRes, modulesRes, auditLogRes, templatesRes, coPoRes
      ] = await Promise.all([
        supabaseClient.from('students').select('*'),
        supabaseClient.from('faculty').select('*'),
        supabaseClient.from('subject_faculty').select('*'),
        supabaseClient.from('subjects').select('*'),
        supabaseClient.from('assignments').select('*'),
        supabaseClient.from('submissions').select('*'),
        supabaseClient.from('assignment_submissions').select('*'),
        supabaseClient.from('student_variables').select('*'),
        supabaseClient.from('student_answers').select('*'),
        supabaseClient.from('course_outcomes').select('*'),
        supabaseClient.from('modules').select('*'),
        supabaseClient.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(500),
        supabaseClient.from('assignment_templates').select('*'),
        supabaseClient.from('co_po_mapping').select('*')
      ]);

      if (studentsRes.data && studentsRes.data.length > 0)
        this.data.students = studentsRes.data.map(s => ({
          ...s,
          yearOfStudy: s.year_of_study || s.yearOfStudy || 'FE'
        }));
      if (facultyRes.data && facultyRes.data.length > 0) this.data.faculty = facultyRes.data;
      if (subjectFacultyRes.data) this.data.subjectFaculty = subjectFacultyRes.data;
      if (subjectsRes.data && subjectsRes.data.length > 0) {
        const dbSubjects = subjectsRes.data.map(s => ({
          ...s,
          fullName: s.full_name || s.fullName || '',
          departmentId: s.department_id || s.departmentId || '',
          className: s.class_name || s.className || ''
        }));
        const merged = [...dbSubjects];
        (this.data.subjects || []).forEach(localSub => {
          if (!merged.some(m => m.id === localSub.id || (m.code === localSub.code && (m.departmentId === localSub.departmentId || m.department_id === localSub.departmentId)))) {
            merged.push(localSub);
          }
        });
        this.data.subjects = merged;
      }
      if (assignmentsRes.data) this.data.assignments = assignmentsRes.data;
      if (submissionsRes.data) this.data.submissions = submissionsRes.data;
      if (assignmentSubmissionsRes.data) this.data.assignmentSubmissions = assignmentSubmissionsRes.data;
      if (studentVarsRes.data) this.data.studentVariables = studentVarsRes.data;
      if (studentAnswersRes.data) this.data.studentAnswers = studentAnswersRes.data;
      if (courseOutcomesRes.data) {
        this.data.courseOutcomes = courseOutcomesRes.data.map(co => ({
          ...co,
          subjectId: co.subject_id || co.subjectId || '',
          btLevel: co.bt_level || co.btLevel || '',
          moduleId: co.module_id || co.moduleId || '',
          assignmentId: co.assignment_id || co.assignmentId || ''
        }));
      }
      if (modulesRes.data) {
        this.data.modules = modulesRes.data.map(m => ({
          ...m,
          subjectId: m.subject_id || m.subjectId || '',
          name: m.module_name || m.name || m.title || ''
        })).filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i);
      }
      if (auditLogRes.data) this.data.auditLogs = auditLogRes.data;
      if (templatesRes.data) this.data.assignmentTemplates = templatesRes.data;
      if (coPoRes && coPoRes.data) this.data.coPOMapping = coPoRes.data;

      // Deduplicate before persisting — this also cleans Supabase of stale duplicates
      await this.cleanDuplicateModules();
      await this.cleanDuplicateCourseOutcomes();

      // Only migrate from localStorage when Supabase tables are genuinely empty
      if (!localStorage.getItem('rizvi_supabase_migrated_v2')) {
        const hasSupabaseModules = (this.data.modules || []).length > 0;
        const hasSupabaseCOs = (this.data.courseOutcomes || []).length > 0;
        if (hasSupabaseModules || hasSupabaseCOs) {
          // Supabase already has data — skip migration, just mark complete
          localStorage.setItem('rizvi_supabase_migrated_v2', '1');
        } else {
          await this.migrateLocalStorageToSupabase();
        }
      }

      this.lastSyncedAt = new Date();
      this.saveState();
      this.reconcileUserSession();
    } catch (e) {
      console.warn('loadAllFromSupabase fetch notice:', e);
    }
  }

  async cleanDuplicateModules() {
    const modules = this.data.modules || [];
    const grouped = {};
    modules.forEach(m => {
      // Normalize key: lowercase code + subject_id for deduplication
      const code = (m.code || m.module_code || m.id || '').trim().toLowerCase();
      const subId = (m.subject_id || m.subjectId || '').toLowerCase();
      const key = `${code}__${subId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });

    const cleaned = [];
    const toDelete = [];
    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        cleaned.push(group[0]);
      } else {
        // Prefer the record whose ID is already lowercase (canonical form)
        const preferred = group.find(m => m.id === (m.id || '').toLowerCase()) || group[0];
        cleaned.push(preferred);
        group.forEach(m => { if (m !== preferred) toDelete.push(m.id); });
      }
    });

    // Delete duplicate records from Supabase
    for (const dupId of toDelete) {
      await this.supabaseDelete('modules', dupId, `duplicate module ${dupId}`);
    }

    this.data.modules = cleaned;
    return cleaned;
  }

  async cleanDuplicateCourseOutcomes() {
    const cos = this.data.courseOutcomes || [];
    const grouped = {};
    cos.forEach(co => {
      // Normalize key: lowercase code + subject_id for deduplication
      const code = (co.code || co.id || '').trim().toLowerCase();
      const subId = (co.subject_id || co.subjectId || '').toLowerCase();
      const key = `${code}__${subId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(co);
    });

    const cleaned = [];
    const toDelete = [];
    Object.values(grouped).forEach(group => {
      if (group.length === 1) {
        cleaned.push(group[0]);
      } else {
        // Prefer the record whose ID is already lowercase (canonical form)
        const preferred = group.find(co => co.id === (co.id || '').toLowerCase()) || group[0];
        cleaned.push(preferred);
        group.forEach(co => { if (co !== preferred) toDelete.push(co.id); });
      }
    });

    // Delete duplicate records from Supabase
    for (const dupId of toDelete) {
      await this.supabaseDelete('course_outcomes', dupId, `duplicate course outcome ${dupId}`);
    }

    this.data.courseOutcomes = cleaned;
    return cleaned;
  }

  async migrateLocalStorageToSupabase() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    this.showToast('Migrating local data to Supabase...', 'info');

    // 1. Fix ESL101 LO subjectId mismatch in local data before migration
    if (Array.isArray(this.data.courseOutcomes)) {
      const esl = (this.data.subjects || []).find(s => s.code === 'ESL101');
      this.data.courseOutcomes.forEach(co => {
        if (co.subjectId === 'sub-esl101' || co.subject_id === 'sub-esl101') {
          if (esl) {
            co.subjectId = esl.id;
            co.subject_id = esl.id;
          }
        }
      });
    }

    try {
      // Upsert course outcomes with normalized lowercase deterministic IDs
      if (Array.isArray(this.data.courseOutcomes) && this.data.courseOutcomes.length > 0) {
        for (const co of this.data.courseOutcomes) {
          const deterministicId = `co-${(co.code || co.id || '').replace(/\./g, '-').toLowerCase()}`;
          // Normalize local record ID to lowercase before upsert
          co.id = deterministicId;
          await supabaseClient.from('course_outcomes').upsert({
            id: deterministicId,
            code: co.code,
            description: co.description,
            type: co.type || 'LO',
            bt_level: co.btLevel || co.bt_level || '',
            subject_id: co.subjectId || co.subject_id || '',
            module_id: co.moduleId || co.module_id || '',
            assignment_id: co.assignmentId || co.assignment_id || ''
          });
        }
      }

      // Upsert modules with normalized lowercase deterministic IDs
      if (Array.isArray(this.data.modules) && this.data.modules.length > 0) {
        for (const m of this.data.modules) {
          const deterministicId = `mod-${(m.code || m.module_code || m.id || '').replace(/\./g, '-').toLowerCase()}`;
          // Normalize local record ID to lowercase before upsert
          m.id = deterministicId;
          await supabaseClient.from('modules').upsert({
            id: deterministicId,
            code: m.code || m.module_code || '',
            module_name: m.title || m.name || m.module_name || '',
            subject_id: m.subjectId || m.subject_id || '',
            topics: m.topics || ''
          });
        }
      }

      // Normalize all in-memory IDs to lowercase so saveState() writes consistent keys
      this.data.courseOutcomes = (this.data.courseOutcomes || []).map(co => ({
        ...co,
        id: `co-${(co.code || co.id || '').replace(/\./g, '-').toLowerCase()}`,
        subject_id: co.subjectId || co.subject_id || ''
      }));
      this.data.modules = (this.data.modules || []).map(m => ({
        ...m,
        id: `mod-${(m.code || m.module_code || m.id || '').replace(/\./g, '-').toLowerCase()}`,
        subject_id: m.subjectId || m.subject_id || ''
      }));

      localStorage.removeItem('rizvi_supabase_migrated');
      localStorage.setItem('rizvi_supabase_migrated_v2', '1');

      this.showToast('Migration complete!', 'success');
    } catch(err) {
      console.warn('Migration warning:', err);
    }
  }

  /* ==========================================================================
     PART 10 — SUBMISSION COUNTING HELPER (Student Counts)
     ========================================================================== */
  getAssignmentCompletionStatus(assignmentId) {
    const asg = (this.data.assignments || []).find(a => a.id === assignmentId);
    if (!asg) return { totalStudents: 0, submitted: 0, partial: 0, notStarted: 0, late: 0 };
    const records = (this.data.assignmentSubmissions || []).filter(r => r.assignment_id === assignmentId || r.assignmentId === assignmentId);
    return {
      totalStudents: records.length,
      submitted: records.filter(r => r.status === 'submitted').length,
      partial: records.filter(r => r.status === 'partial').length,
      notStarted: records.filter(r => r.status === 'not_started').length,
      late: records.filter(r => r.status === 'late').length,
    };
  }

  /* ==========================================================================
     PART 12 — ROLE BOUNDARY ENFORCEMENT
     ========================================================================== */
  canFacultyEditSubject(subjectId) {
    if (this.currentRole === 'admin') return true;
    const activeYear = '2026-27';
    return (this.data.subjectFaculty || []).some(sf =>
      sf.subject_id === subjectId &&
      sf.faculty_id === (this.currentUser?.email || '').trim().toLowerCase() &&
      (sf.academic_year === activeYear || sf.academicYear === activeYear)
    );
  }

  /* ==========================================================================
     PART 15 — ATTEMPT NARRATIVE TAGS (Computed at render time)
     ========================================================================== */
  computeAttemptNarrativeTag(submission, groundTruth, paramObj) {
    const tags = [];
    if (!submission) return ['Not Attempted'];

    const attemptLabel = submission.attemptNumber === 1 ? 'First attempt'
      : submission.attemptNumber === 2 ? 'Second attempt' : `Attempt ${submission.attemptNumber}`;

    if ((submission.attemptDeductionPct || 0) > 0)
      tags.push(`${attemptLabel} — ${submission.attemptDeductionPct}% deduction applied`);
    else
      tags.push(`${attemptLabel} — Full marks eligible`);

    if (submission.isLate && (submission.latePenaltyPct || 0) > 0)
      tags.push(`Late submission — ${submission.latePenaltyPct}% penalty applied`);
    else
      tags.push('Submitted on time ✓');

    if (groundTruth) {
      if (submission.isCorrectValue && submission.isCorrectUnit)
        tags.push('Correct value and unit ✓');
      else if (submission.isCorrectValue && !submission.isCorrectUnit)
        tags.push('Correct value — wrong unit (unit marks forfeited)');
      else {
        const expected = parseFloat(groundTruth.correctValue);
        const submitted = parseFloat(submission.submittedValue);
        if (!isNaN(expected) && expected !== 0) {
          const diffPct = Math.abs(submitted - expected) / Math.abs(expected) * 100;
          if (diffPct <= 5) tags.push('Value within ±5% tolerance — marked correct');
          else if (diffPct <= 10) tags.push('Value within ±10% — partial credit');
          else tags.push(`Value outside tolerance (${diffPct.toFixed(1)}% error) — marked incorrect`);
        }
      }
    }
    return tags;
  }

  /* ==========================================================================
     PART 13.k — GENERIC SORT TABLE HELPER
     ========================================================================== */
  _sortTable(dataArray, colKey, dir = 'asc') {
    if (!Array.isArray(dataArray)) return [];
    return dataArray.slice().sort((a, b) => {
      let valA = a[colKey] !== undefined ? a[colKey] : '';
      let valB = b[colKey] !== undefined ? b[colKey] : '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /* ==========================================================================
     PART 4 — TOP-LEVEL NAVIGATION (4 Tabs: Admin, Faculty, Student, NBA)
     ========================================================================== */
  renderTopNavTabs() {
    const container = document.getElementById('top-nav-tabs');
    if (!container) return;
    container.innerHTML = '';
  }

  loadState() {
    // localStorage is authoritative for instant first render only.
    // After DOMContentLoaded, loadAllFromSupabase() overwrites this with server data.
    let saved = null;
    try {
      saved = localStorage.getItem('rizvi_fe_portal_data');
    } catch (e) {
      // Tracking prevention may block localStorage — fall back to sessionStorage
      try { saved = sessionStorage.getItem('rizvi_fe_portal_data'); } catch (_) {}
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Object.assign({}, INITIAL_DATA, parsed);
      } catch (e) {
        console.error('Failed to parse cached state, loading INITIAL_DATA:', e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  saveState() {
    // localStorage is cache only — Supabase is the authoritative source of truth.
    const serialised = JSON.stringify(this.data);
    try {
      localStorage.setItem('rizvi_fe_portal_data', serialised);
    } catch (e) {
      // Tracking prevention fallback
      try { sessionStorage.setItem('rizvi_fe_portal_data', serialised); } catch (_) {}
      console.warn('localStorage blocked, saved to sessionStorage instead:', e);
    }
  }

  loadUserSession() {
    const saved = localStorage.getItem('rizvi_fe_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  saveUserSession(userObj) {
    this.currentUser = userObj;
    if (userObj) {
      localStorage.setItem('rizvi_fe_user_session', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('rizvi_fe_user_session');
    }
  }

  reconcileUserSession() {
    if (!this.currentUser) return;
    const email = this.currentUser.email ? this.currentUser.email.trim().toLowerCase() : '';
    const uin = this.currentUser.uin ? this.currentUser.uin.trim().toLowerCase() : '';

    if (HARDCODED_ADMIN_EMAILS.includes(email)) {
      this.currentUser.role = 'admin';
      this.currentUser.isDualRole = true;
      this.saveUserSession(this.currentUser);
      return;
    }

    const fac = this.data.faculty.find(f => f.email && f.email.trim().toLowerCase() === email);
    if (fac) {
      this.currentUser.role = fac.role || 'faculty';
      this.currentUser.name = fac.name;
      this.saveUserSession(this.currentUser);
      return;
    }

    const st = this.data.students.find(s =>
      (s.email && s.email.trim().toLowerCase() === email) ||
      (s.uin && s.uin.trim().toLowerCase() === uin)
    );

    if (st) {
      this.currentUser.role = 'student';
      this.currentUser.studentId = st.id;
      this.currentUser.name = st.name;
      this.activeStudentId = st.id;
      this.saveUserSession(this.currentUser);
      return;
    }
  }

  setupEventListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
  }

  switchNav(navId) {
    this.activeNav = navId;
    window.location.hash = '#' + navId;
    this.renderSidebar();
    this.renderCurrentView();
  }

  switchRole(newRole) {
    if (!this.currentUser) return;
    const isDual = this.currentUser.isDualRole || HARDCODED_ADMIN_EMAILS.includes(this.currentUser.email.trim().toLowerCase());
    if (isDual || this.currentUser.role === newRole) {
      this.currentRole = newRole;
      this.activeTabCategory = newRole;
      if (newRole === 'admin') window.location.hash = '#admin-home';
      else if (newRole === 'faculty') window.location.hash = '#faculty-home';
      else if (newRole === 'student') window.location.hash = '#student-home';

      this.renderTopNavTabs();
      this.renderRoleSwitcher();
      this.renderSidebar();
      this.renderCurrentView();
      this.showToast(`Switched active view to ${newRole.toUpperCase()} mode`, 'info');
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
    sidebar.innerHTML = '';
    sidebar.style.display = 'none';
  }

  renderRoleSwitcher() {
    const container = document.getElementById('role-switcher-container');
    const badgeContainer = document.getElementById('active-user-badge');
    if (!container || !badgeContainer) return;

    if (!this.currentUser) {
      container.innerHTML = '';
      badgeContainer.innerHTML = '';
      return;
    }

    const isDual = this.currentUser.isDualRole || HARDCODED_ADMIN_EMAILS.includes(this.currentUser.email.trim().toLowerCase());
    const isNba = this.activeTabCategory === 'nba';

    if (isDual) {
      container.innerHTML = `
        <div class="role-switcher">
          <button class="role-btn ${!isNba && this.currentRole === 'admin' ? 'active' : ''}" onclick="app.switchRole('admin')">Admin</button>
          <button class="role-btn ${!isNba && this.currentRole === 'faculty' ? 'active' : ''}" onclick="app.switchRole('faculty')">Faculty</button>
          <button class="role-btn ${!isNba && this.currentRole === 'student' ? 'active' : ''}" onclick="app.switchRole('student')">Student</button>
          <span class="role-switcher-divider"></span>
          <button class="role-btn ${isNba ? 'active' : ''}" onclick="window.location.hash='#nba-institute'">NBA</button>
        </div>
      `;
    } else if (this.currentUser.role === 'faculty') {
      container.innerHTML = `
        <div class="role-switcher">
          <button class="role-btn ${!isNba ? 'active' : ''}" onclick="app.switchRole('faculty')">Faculty</button>
          <span class="role-switcher-divider"></span>
          <button class="role-btn ${isNba ? 'active' : ''}" onclick="window.location.hash='#nba-institute'">NBA</button>
        </div>
      `;
    } else {
      container.innerHTML = '';
    }

    badgeContainer.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div style="text-align:right;">
          <div style="font-size:12px; font-weight:700; color:var(--text-primary);">${this.currentUser.name || 'User'}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${this.currentUser.email}</div>
        </div>
        <button class="btn btn-ghost btn-sm" style="padding:4px 8px; font-size:11px;" onclick="app.logout()">Logout</button>
      </div>
    `;
  }

  renderCurrentView() {
    const container = document.getElementById('main-content');
    if (!container) return;

    const hash = window.location.hash || '';

    if (hash.startsWith('#nba')) {
      nbaView.render(container, this.activeNav);
      return;
    }

    if (this.currentRole === 'admin' || this.activeTabCategory === 'admin') {
      adminView.render(container, this.activeNav);
    } else if (this.currentRole === 'faculty' || this.activeTabCategory === 'faculty') {
      facultyView.render(container, this.activeNav);
    } else {
      studentView.render(container, this.activeNav);
    }
  }

  showLoginModal(isDismissible = false) {
    this.showModal('🔑 Sign In to Rizvi FE Assignment Portal', `
      <div style="padding:10px 0;">
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
          Use your official <code>@eng.rizvi.edu.in</code> Google account to log in as Faculty, Student, or Admin.
        </p>

        <div style="display:flex; justify-content:center; margin:20px 0;">
          <div id="google-signin-btn-container"></div>
        </div>

        <div style="margin-top:20px; border-top:1px solid var(--border-default); padding-top:16px;">
          <label style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Quick Demo Account Selector</label>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
            <button class="btn btn-primary" onclick="app.loginAsDemo('jugaljagtap@eng.rizvi.edu.in', 'admin')">
              🛡️ Log In as Prof. Jugal Jagtap (Dual Admin & Faculty)
            </button>
          </div>
        </div>
      </div>
    `);

    setTimeout(() => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res) => this.handleGoogleCredentialResponse(res)
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn-container'),
          { theme: 'outline', size: 'large', width: 280 }
        );
      }
    }, 200);
  }

  loginAsDemo(email, role) {
    const userObj = {
      name: email.split('@')[0],
      email: email,
      role: role,
      isDualRole: HARDCODED_ADMIN_EMAILS.includes(email.trim().toLowerCase())
    };
    this.saveUserSession(userObj);
    this.closeModal();
    this.currentRole = role;
    this.reconcileUserSession();
    this.renderTopNavTabs();
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showToast(`Logged in as ${email}`, 'success');
  }

  handleGoogleCredentialResponse(response) {
    const payload = parseJwtToken(response.credential);
    if (!payload || !payload.email) {
      this.showToast('Invalid Google credential token', 'danger');
      return;
    }

    const email = payload.email.trim().toLowerCase();
    if (!email.endsWith('@eng.rizvi.edu.in') && !HARDCODED_ADMIN_EMAILS.includes(email)) {
      this.showToast('Access Denied: Only @eng.rizvi.edu.in domain accounts are allowed', 'danger');
      return;
    }

    const userObj = {
      name: payload.name || email.split('@')[0],
      email: email,
      picture: payload.picture,
      role: 'faculty'
    };

    this.saveUserSession(userObj);
    this.reconcileUserSession();
    this.closeModal();
    this.renderTopNavTabs();
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
    this.showToast(`Welcome back, ${userObj.name}!`, 'success');
  }

  logout() {
    this.saveUserSession(null);
    this.currentRole = 'faculty';
    this.showToast('Logged out successfully', 'info');
    window.location.hash = '#home';
    this.showLoginModal(false);
  }

  showModal(title, bodyHtml) {
    let backdrop = document.getElementById('app-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'app-modal-backdrop';
      backdrop.className = 'modal-overlay';
      document.body.appendChild(backdrop);
    } else {
      backdrop.className = 'modal-overlay';
    }
    backdrop.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="card-title">${title}</h3>
          <button class="modal-close-btn" onclick="app.closeModal()">✕</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    `;
    backdrop.classList.add('active');
  }

  closeModal() {
    const backdrop = document.getElementById('app-modal-backdrop');
    if (backdrop) backdrop.classList.remove('active');
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container print-hide';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  formatQuestionText(text, variablesMap = {}) {
    if (!text) return '';
    let formatted = text;
    formatted = formatted.replace(/\{\{(.*?)\}\}/g, (match, p1) => {
      const key = p1.trim();
      if (variablesMap && variablesMap[key] !== undefined) {
        return `<strong class="mono-val" style="color:var(--accent-blue);">${variablesMap[key]}</strong>`;
      }
      return `<code class="code-font" style="color:var(--warning);">${match}</code>`;
    });
    return formatted;
  }

  getEmbeddableImageUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const fileId = url.split('/file/d/')[1].split('/')[0];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return url;
  }

  getAssignmentSchedule(asgId, batchName = 'A1') {
    const asg = this.data.assignments.find(a => a.id === asgId);
    if (!asg || !asg.schedules || asg.schedules.length === 0) {
      return {
        deadline: '2026-12-31T23:59',
        submissionsOpen: true,
        gradesReleased: true,
        latePenaltyValue: 10,
        lateMaxCap: 30
      };
    }
    const batchSch = asg.schedules.find(s => s.scopeValue === batchName);
    return batchSch || asg.schedules[0];
  }
  /* ==========================================================================
     SUPABASE WRITE WRAPPERS — Always use these instead of direct .from().upsert()
     They handle offline mode, show user-facing toasts, and log errors.
     ========================================================================== */
  async supabaseUpsert(table, record, friendlyName) {
    if (!supabaseClient) {
      this.showToast(`⚠️ Offline: ${friendlyName} saved locally only. Reconnect to sync.`, 'warning');
      return false;
    }
    try {
      const { error } = await supabaseClient.from(table).upsert(record);
      if (error) throw error;
      return true;
    } catch(err) {
      console.error(`Supabase write failed [${table}]:`, err);
      this.showToast(`❌ Failed to save ${friendlyName} to server: ${err.message}. Please retry.`, 'danger');
      return false;
    }
  }

  async supabaseDelete(table, id, friendlyName) {
    if (!supabaseClient) {
      this.showToast(`⚠️ Offline: ${friendlyName} deleted locally only.`, 'warning');
      return false;
    }
    try {
      const { error } = await supabaseClient.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch(err) {
      console.error(`Supabase delete failed [${table}]:`, err);
      this.showToast(`❌ Failed to delete ${friendlyName} from server: ${err.message}`, 'danger');
      return false;
    }
  }

  /* ==========================================================================
     STARTUP HEALTH CHECK — Verify critical Supabase tables exist.
     Shows a persistent admin-only banner for any missing table.
     ========================================================================== */
  async syncSubmissionToSupabase(record) {
    if (!supabaseClient) return;
    try {
      await supabaseClient.from('submissions').upsert({
        id: record.id,
        assignment_id: record.assignmentId,
        student_id: record.studentId,
        parameter_id: record.parameterId,
        attempt_number: record.attemptNumber,
        submitted_value: record.submittedValue,
        submitted_unit: record.submittedUnit,
        is_correct_value: record.isCorrectValue,
        is_correct_unit: record.isCorrectUnit,
        marks_awarded: record.marksAwarded,
        attempt_deduction_pct: record.attemptDeductionPct,
        verification_status: record.verificationStatus,
        submitted_at: record.submittedAt
      });
    } catch(e) { console.warn('Submission sync notice:', e); }
  }

  async checkSupabaseTables() {
    if (!supabaseClient) return;
    const criticalTables = [
      'subjects', 'students', 'faculty', 'subject_faculty',
      'course_outcomes', 'modules', 'co_po_mapping',
      'assignments', 'submissions', 'assignment_submissions'
    ];
    const missingTables = [];
    for (const table of criticalTables) {
      try {
        const { error } = await supabaseClient.from(table).select('id').limit(1);
        if (error && (error.code === '42P01' || error.message?.includes('does not exist') || error.status === 404)) {
          missingTables.push(table);
        }
      } catch (e) {
        missingTables.push(table);
      }
    }
    if (missingTables.length > 0 && this.currentUser && (this.currentUser.role === 'admin' || this.currentUser.isDualRole)) {
      const banner = document.createElement('div');
      banner.id = 'db-health-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b91c1c;color:#fff;padding:10px 16px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:12px;';
      banner.innerHTML = `⚠️ Missing DB tables: <strong>${missingTables.join(', ')}</strong>. Contact system administrator. <button onclick="document.getElementById('db-health-banner').remove()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:#fff;cursor:pointer;padding:4px 10px;border-radius:4px;">Dismiss</button>`;
      document.body.prepend(banner);
    }
  }
}

// Global App Instance
window.app = new AppEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
