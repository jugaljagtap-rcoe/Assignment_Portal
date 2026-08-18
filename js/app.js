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
    id: crypto.randomUUID(),
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    changed_by: (window.app && window.app.currentUser) ? window.app.currentUser.email : 'system',
    changed_at: new Date().toISOString(),
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
    this.activeSubjectId = null;
    this.lastSyncedAt = null;
    this.reconcileUserSession();
  }

  getStudentsForAY(ay = this.getActiveAcademicYear()) {
    return (this.data.students || []).filter(s => s.academic_year === ay);
  }

  getSubjectsForStudent(student) {
    if (!student) return [];
    const activeAY = this.getActiveAcademicYear();
    const activeSFSubjectIds = new Set(
      (this.data.subjectFaculty || [])
        .filter(sf => sf.academic_year === activeAY)
        .map(sf => sf.subject_id)
    );
    if (student.yearOfStudy === 'FE') {
      return (this.data.subjects || []).filter(s =>
        s.departmentId === 'dept-fe' &&
        ['Semester I', 'Semester II'].includes(s.semester) &&
        activeSFSubjectIds.has(s.id)
      );
    }
    const branchMap = {
      'Artificial Intelligence & Data Science': 'dept-aids',
      'Civil Engineering': 'dept-civil',
      'Computer Engineering': 'dept-comp',
      'Electronics & Computer Science': 'dept-ecs',
      'Mechanical Engineering': 'dept-mech'
    };
    const deptId = branchMap[student.branch];
    if (!deptId) return [];
    const semMap = {
      'SE': ['Semester III', 'Semester IV'],
      'TE': ['Semester V', 'Semester VI'],
      'BE': ['Semester VII', 'Semester VIII']
    };
    const allowedSemesters = semMap[student.yearOfStudy] || [];
    return (this.data.subjects || []).filter(s =>
      s.departmentId === deptId &&
      allowedSemesters.includes(s.semester) &&
      activeSFSubjectIds.has(s.id)
    );
  }

  getAssignmentsForStudent(student) {
    const activeAY = this.getActiveAcademicYear();
    const subjects = this.getSubjectsForStudent(student);
    const subjectIds = new Set(subjects.map(s => s.id));
    let assignments = (this.data.assignments || []).filter(a =>
      subjectIds.has(a.subjectId || a.subject_id) && (!a.academic_year || a.academic_year === activeAY)
    );
    if (this.currentRole !== 'admin' && !this.currentUser?.isDualRole) {
      assignments = assignments.filter(a => a.lifecycle_status !== 'draft');
    }
    return assignments;
  }

  getStudentsForSubject(subject) {
    if (!subject) return [];
    const activeAY = this.getActiveAcademicYear();
    const semester = subject.semester || '';
    let yearOfStudy = '';
    if (['Semester I', 'Semester II'].includes(semester)) yearOfStudy = 'FE';
    else if (['Semester III', 'Semester IV'].includes(semester)) yearOfStudy = 'SE';
    else if (['Semester V', 'Semester VI'].includes(semester)) yearOfStudy = 'TE';
    else if (['Semester VII', 'Semester VIII'].includes(semester)) yearOfStudy = 'BE';

    const deptId = subject.departmentId || subject.department_id;
    const students = this.getStudentsForAY(activeAY);
    if (deptId === 'dept-fe') {
      return students.filter(s => s.yearOfStudy === 'FE');
    }
    return students.filter(s => {
      const b = (s.branch || '').toLowerCase();
      const y = (s.yearOfStudy || s.year_of_study || 'FE').toUpperCase();
      if (y !== yearOfStudy) return false;
      if (deptId === 'dept-aids') return b.includes('artificial intelligence');
      if (deptId === 'dept-civil') return b.includes('civil');
      if (deptId === 'dept-comp') return b.includes('computer engineering');
      if (deptId === 'dept-ecs') return b.includes('electronics');
      if (deptId === 'dept-mech') return b.includes('mechanical');
      return false;
    });
  }

  getFacultySubjects(facultyEmail) {
    if (this.currentRole === 'admin') return this.data.subjects || [];
    const activeAY = this.getActiveAcademicYear();
    const email = (facultyEmail || '').trim().toLowerCase();
    const sfRecords = (this.data.subjectFaculty || []).filter(sf =>
      (sf.faculty_id || '').trim().toLowerCase() === email &&
      sf.academic_year === activeAY
    );
    const sfSubjectIds = new Set(sfRecords.map(sf => sf.subject_id));
    return (this.data.subjects || []).filter(s => sfSubjectIds.has(s.id));
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
        if (this.currentUser) {
          this.renderCurrentView();
        }
      }
    });
  }

  handleHashChange() {
    if (!this.currentUser) {
      const mc = document.getElementById('main-content');
      if (mc) mc.innerHTML = '';
      return;
    }
    const hash = window.location.hash || '';
    if (hash.startsWith('#admin')) {
      this.activeTabCategory = 'admin';
      this.currentRole = 'admin';
    } else if (hash.startsWith('#faculty')) {
      this.activeTabCategory = 'faculty';
      this.currentRole = 'faculty';
    } else if (hash.startsWith('#student')) {
      this.activeTabCategory = 'student';
      this.currentRole = 'student';
    } else if (hash.startsWith('#nba')) {
      this.activeTabCategory = 'nba';
    }

    if (hash === '#admin-home' || hash === '#faculty-home' || hash === '#student-home' || hash === '' || hash === '#home') {
      this.activeNav = 'dashboard';
    }

    this.renderTopNavTabs();
    this.renderRoleSwitcher();
    this.renderSidebar();
    this.renderCurrentView();
  }

  async fetchAllRows(table, queryFn = null) {
    if (!supabaseClient) return [];
    const PAGE_SIZE = 1000;
    let offset = 0;
    let allRows = [];
    while (true) {
      let query = supabaseClient.from(table).select('*').range(offset, offset + PAGE_SIZE - 1);
      if (queryFn) query = queryFn(query);
      const { data, error } = await query;
      if (error || !data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return allRows;
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
        assignmentSubmissionsRes,
        courseOutcomesRes, modulesRes, auditLogRes, templatesRes, coPoRes,
        programOutcomesRes, assignmentSequencesRes, rubricPresetsRes, portalSettingsRes
      ] = await Promise.all([
        supabaseClient.from('students').select('*'),
        supabaseClient.from('faculty').select('*'),
        supabaseClient.from('subject_faculty').select('*'),
        supabaseClient.from('subjects').select('*'),
        supabaseClient.from('assignments').select('*'),
        supabaseClient.from('assignment_submissions').select('*').limit(10000),
        supabaseClient.from('course_outcomes').select('*'),
        supabaseClient.from('modules').select('*'),
        supabaseClient.from('audit_log').select('*').order('changed_at', { ascending: false }).limit(500),
        supabaseClient.from('assignment_templates').select('*'),
        supabaseClient.from('co_po_mapping').select('*'),
        supabaseClient.from('program_outcomes').select('*').order('id'),
        supabaseClient.from('assignment_sequences').select('*'),
        supabaseClient.from('rubric_presets').select('*'),
        supabaseClient.from('portal_settings').select('*')
      ]);

      const [submissionsData, studentVarsData, studentAnswersData] = await Promise.all([
        this.fetchAllRows('submissions'),
        this.fetchAllRows('student_variables'),
        this.fetchAllRows('student_answers')
      ]);

      if (portalSettingsRes && portalSettingsRes.data) {
        const settingsObj = {};
        portalSettingsRes.data.forEach(row => {
          if (row.key) settingsObj[row.key] = row.value;
        });
        this.data.portalSettings = settingsObj;
      }

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
      if (assignmentsRes.data) {
        this.data.assignments = assignmentsRes.data.map(a => ({
          ...a,
          subjectId: a.subject_id || a.subjectId || '',
          subject_id: a.subject_id || a.subjectId || ''
        }));
      }
      if (submissionsData && submissionsData.length > 0) this.data.submissions = submissionsData;
      if (assignmentSubmissionsRes.data) this.data.assignmentSubmissions = assignmentSubmissionsRes.data;
      if (studentVarsData && studentVarsData.length > 0) {
        this.data.studentVariables = studentVarsData.map(v => ({
          ...v,
          studentId: v.student_id || v.studentId || '',
          assignmentId: v.assignment_id || v.assignmentId || ''
        }));
      }
      if (studentAnswersData && studentAnswersData.length > 0) this.data.studentAnswers = studentAnswersData;
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

      // program_outcomes — split into POs and PSOs
      if (programOutcomesRes.data && programOutcomesRes.data.length > 0) {
        this.data.programOutcomes = programOutcomesRes.data.filter(p => p.type === 'PO' || !p.type);
        this.data.programSpecificOutcomes = programOutcomesRes.data.filter(p => p.type === 'PSO');
      }

      // assignment_sequences
      if (assignmentSequencesRes.data) {
        this.data.assignmentSequences = assignmentSequencesRes.data;
      }

      // rubric_presets
      if (rubricPresetsRes && rubricPresetsRes.data && rubricPresetsRes.data.length > 0) {
        this.data.rubricPresets = rubricPresetsRes.data;
      } else {
        // Seed institutional preset if table is empty
        const instPreset = {
          id: "rub-inst-001",
          name: "RCOE Institutional Standard Rubric",
          created_by: "jugaljagtap@eng.rizvi.edu.in",
          is_preset: true,
          tolerance_exemplary: 2,
          tolerance_proficient: 5,
          tolerance_developing: 10,
          numerical_weight: 70,
          units_weight: 30,
          given_multiplier: 1,
          intermediate_multiplier: 2,
          final_multiplier: 3,
          attempt_deductions_enabled: false,
          late_penalty_enabled: false,
          created_at: new Date().toISOString()
        };
        this.data.rubricPresets = [instPreset];
        await this.supabaseUpsert('rubric_presets', instPreset, 'Institutional Standard Rubric');
      }

      // Auto-migrate legacy assignments lacking rubric/marks architecture
      await this.autoMigrateLegacyAssignments();

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
        }
      }

      // Invalidate stale localStorage cache — rewrite from fresh Supabase data only
      try {
        localStorage.removeItem('rizvi_fe_portal_data');
        sessionStorage.removeItem('rizvi_fe_portal_data');
      } catch(_) {}

      this.lastSyncedAt = new Date();
      this.saveState();
      this.reconcileUserSession();
      if (this.currentUser && document.getElementById('main-content')) {
        this.renderCurrentView();
      }
    } catch (e) {
      console.warn('loadAllFromSupabase fetch notice:', e);
    }
  }

  async autoMigrateLegacyAssignments() {
    const assignments = this.data.assignments || [];
    const defaultRubricId = 'rub-inst-001';

    for (const asg of assignments) {
      let needsMigration = false;

      // Check if assignment has no rubric_preset_id
      if (!asg.rubric_preset_id && !asg.rubricPresetId) {
        asg.rubric_preset_id = defaultRubricId;
        asg.rubricPresetId = defaultRubricId;
        needsMigration = true;
      }

      // Check questions and parameters
      let questions = [];
      if (Array.isArray(asg.questions)) {
        questions = asg.questions;
      } else if (typeof asg.questions === 'string') {
        try { questions = JSON.parse(asg.questions); } catch(_) { questions = []; }
      }

      let questionsUpdated = false;
      for (const q of questions) {
        // Check max_marks on question
        if (q.max_marks === undefined && q.maxMarks === undefined) {
          const params = q.parameters || [];
          let sumVal = 0;
          params.forEach(p => {
            if (p.valueMarks !== undefined) sumVal += parseFloat(p.valueMarks) || 0;
          });
          const calculatedMax = sumVal > 0 ? sumVal : 10;
          q.max_marks = calculatedMax;
          q.maxMarks = calculatedMax;
          questionsUpdated = true;
          needsMigration = true;
        }

        // Check parameter_type on parameters
        if (Array.isArray(q.parameters)) {
          for (const p of q.parameters) {
            if (!p.parameter_type && !p.parameterType) {
              p.parameter_type = 'given';
              p.parameterType = 'given';
              questionsUpdated = true;
              needsMigration = true;
            }
          }
        }
      }

      if (needsMigration) {
        asg.is_migrated = true;
        asg.questions = typeof asg.questions === 'string' ? JSON.stringify(questions) : questions;

        await this.supabaseUpsert('assignments', {
          id: asg.id,
          code: asg.display_code || asg.code || asg.id,
          title: asg.title || asg.working_title,
          working_title: asg.working_title || asg.title,
          subject_id: asg.subjectId || asg.subject_id,
          academic_year: asg.academic_year || this.getActiveAcademicYear(),
          lifecycle_status: asg.lifecycle_status || 'draft',
          display_code: asg.display_code || null,
          bt_level: asg.btLevel || asg.bt_level || '',
          rubric_preset_id: asg.rubric_preset_id || defaultRubricId,
          questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
          schedules: typeof asg.schedules === 'string' ? asg.schedules : JSON.stringify(asg.schedules || [])
        }, `Auto-migrated assignment ${asg.display_code || asg.working_title || asg.id}`);

        writeAudit('migrated', 'assignment_rubric_architecture', asg.id, {
          rubric_preset_id: asg.rubric_preset_id,
          questions_count: questions.length
        });
      }
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

  getRubricPreset(rubricId) {
    const presets = this.data.rubricPresets || [];
    if (!rubricId) {
      return presets.find(r => r.is_preset || r.isPreset) || presets[0] || null;
    }
    return presets.find(r => r.id === rubricId) || presets.find(r => r.is_preset || r.isPreset) || presets[0] || null;
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
    const activeYear = this.getActiveAcademicYear();
    return (this.data.subjectFaculty || []).some(sf =>
      sf.subject_id === subjectId &&
      sf.faculty_id === (this.currentUser?.email || '').trim().toLowerCase() &&
      (!sf.academic_year || sf.academic_year === activeYear || sf.academicYear === activeYear)
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
    if (!this.currentUser) {
      container.innerHTML = '';
      return;
    }
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
    if (this.currentUser.googleVerified !== true) {
      this.logout();
      return;
    }
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
      this.currentRole = 'student';
      this.activeTabCategory = 'student';
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

  startAssignment(asgId) {
    this.activeAssignmentId = asgId;
    localStorage.setItem('rizvi_fe_active_asg_id', asgId);
    this.activeNav = 'solver';
    this.renderCurrentView();
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
    if (!this.currentUser) {
      const mc = document.getElementById('main-content');
      if (mc) mc.innerHTML = '';
      return;
    }
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
      role: 'faculty',
      googleVerified: true
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
    const mc = document.getElementById('main-content');
    if (mc) mc.innerHTML = '';
    this.currentUser = null;
    this.currentRole = 'faculty';
    this.activeTabCategory = 'faculty';
    this.showToast('Logged out successfully', 'info');
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

    // Step 1 — Extract and protect {{variables}}
    const varTokens = [];
    let protectedText = text.replace(/\{\{(.*?)\}\}/g, (match, key) => {
      varTokens.push({ key: key.trim(), original: match });
      return `\x00VAR${varTokens.length - 1}\x00`;
    });

    // Step 2 — Extract and protect manual KaTeX blocks ($$...$$ and $...$)
    const katexTokens = [];
    let katexProtected = protectedText
      // Display math $$...$$
      .replace(/\$\$([^\$]+)\$\$/g, (match, inner) => {
        katexTokens.push({ display: true, code: inner });
        return `\x00KATEX${katexTokens.length - 1}\x00`;
      })
      // Inline math $...$
      .replace(/\$([^\$]+)\$/g, (match, inner) => {
        katexTokens.push({ display: false, code: inner });
        return `\x00KATEX${katexTokens.length - 1}\x00`;
      });

    // Step 3 — Auto-detection math conversions on non-KaTeX text
    let out = katexProtected;

    // A. Greek letter names -> symbols
    const greeks = [
      [/\bomega\b/g, 'ω'],
      [/\btheta\b/g, 'θ'],
      [/\balpha\b/g, 'α'],
      [/\bbeta\b/g, 'β'],
      [/\bdelta\b/g, 'δ'],
      [/\bDelta\b/g, 'Δ'],
      [/\bphi\b/g, 'φ'],
      [/\bmu\b/g, 'μ'],
      [/\bsigma\b/g, 'σ'],
      [/\bpi\b/g, 'π'],
      [/\blambda\b/g, 'λ'],
      [/\brho\b/g, 'ρ']
    ];
    greeks.forEach(([reg, sym]) => {
      out = out.replace(reg, sym);
    });

    // B. Fractions: word/word or unit/unit or word/unit (e.g. N/m, N/m^2, rad/s, km/h)
    out = out.replace(/\b([A-Za-z0-9_]+)\/([A-Za-z0-9_\^]+)\b/g, (match, num, den) => {
      if (typeof window !== 'undefined' && window.katex && window.katex.renderToString) {
        try {
          return window.katex.renderToString(`\\frac{${num}}{${den}}`, { throwOnError: false, displayMode: false });
        } catch (_) {}
      }
      return `<span class="math-frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    });

    // C. Superscripts: word^number or word^{expr}
    out = out.replace(/([A-Za-z0-9_]+)\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
    out = out.replace(/([A-Za-z0-9_]+)\^(-?[0-9a-zA-Z]+)/g, '$1<sup>$2</sup>');

    // D. Subscripts: word_number or word_word or word_{expr}
    out = out.replace(/([A-Za-z]+)\{([^}]+)\}/g, '$1<sub>$2</sub>');
    out = out.replace(/([A-Za-z]+)_([0-9a-zA-Z]+)/g, '$1<sub>$2</sub>');

    // E. sqrt
    out = out.replace(/sqrt\(([^)]+)\)/g, '√<span style="text-decoration:overline;">$1</span>');

    // F. Multiply symbol
    out = out.replace(/ \* /g, ' × ');

    // Step 4 — Restore and render KaTeX tokens
    katexTokens.forEach((kt, i) => {
      let rendered = `$${kt.code}$`;
      if (typeof window !== 'undefined' && window.katex && window.katex.renderToString) {
        try {
          rendered = window.katex.renderToString(kt.code, { throwOnError: false, displayMode: kt.display });
        } catch (e) {
          console.warn('KaTeX render error:', e);
        }
      }
      out = out.replace(`\x00KATEX${i}\x00`, rendered);
    });

    // Step 5 — Restore variables
    varTokens.forEach((vt, i) => {
      const val = variablesMap[vt.key];
      const html = val !== undefined
        ? `<strong class="mono-val" style="color:var(--accent-blue);">${val}</strong>`
        : `<code class="code-font" style="color:var(--warning);">{{${vt.key}}}</code>`;
      out = out.replace(`\x00VAR${i}\x00`, html);
    });

    return out;
  }

  getEmbeddableImageUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const fileId = url.split('/file/d/')[1].split('/')[0];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    return url;
  }

  getPortalSetting(key) {
    const rawVal = (this.data && this.data.portalSettings && this.data.portalSettings[key]) || '';
    return this.getEmbeddableImageUrl(rawVal);
  }

  getAssignmentSchedule(asgId, batchName = 'A1') {
    const asg = this.data.assignments.find(a => a.id === asgId);
    if (!asg) {
      return {
        deadline: '2026-12-31T23:59',
        submissionsOpen: true,
        gradesReleased: true,
        latePenaltyValue: 10,
        lateMaxCap: 30
      };
    }
    let schedules = asg.schedules;
    if (typeof schedules === 'string') {
      try { schedules = JSON.parse(schedules); } catch(_) { schedules = []; }
    }
    if (!Array.isArray(schedules)) schedules = [];
    if (schedules.length === 0) {
      return {
        deadline: '2026-12-31T23:59',
        submissionsOpen: true,
        gradesReleased: true,
        latePenaltyValue: 10,
        lateMaxCap: 30
      };
    }
    const batchSch = schedules.find(s => s.scopeValue === batchName);
    return batchSch || schedules[0];
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
      'assignments', 'submissions', 'assignment_submissions',
      'student_variables'
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

  async generateDisplayCode(subjectId, seriesPrefix, seriesType, academicYear) {
    // Build the unique sequence key
    const seqId = `seq-${subjectId}-${academicYear}-${seriesPrefix}-${seriesType}`.toLowerCase().replace(/[^a-z0-9\-]/g, '-');

    // Find existing sequence record
    let seqRecord = (this.data.assignmentSequences || []).find(s => s.id === seqId);

    const nextNumber = seqRecord ? seqRecord.last_number + 1 : 1;
    const paddedNumber = String(nextNumber).padStart(3, '0');

    // Get department short name via subject
    const sub = (this.data.subjects || []).find(s => s.id === subjectId);
    const dept = (this.data.departments || HARDCODED_DEPARTMENTS).find(d => d.id === (sub?.departmentId || sub?.department_id));
    const deptShort = dept ? dept.shortName : 'FE';

    const displayCode = `RCOE/${deptShort}/${academicYear}/${seriesPrefix}_${seriesType}${paddedNumber}`;

    // Upsert sequence record to Supabase
    const updatedSeq = {
      id: seqId,
      subject_id: subjectId,
      academic_year: academicYear,
      series_prefix: seriesPrefix,
      series_type: seriesType,
      last_number: nextNumber,
      updated_at: new Date().toISOString()
    };

    // Update in-memory
    if (seqRecord) {
      seqRecord.last_number = nextNumber;
      seqRecord.updated_at = updatedSeq.updated_at;
    } else {
      if (!this.data.assignmentSequences) this.data.assignmentSequences = [];
      this.data.assignmentSequences.push(updatedSeq);
    }

    // Persist to Supabase
    await this.supabaseUpsert('assignment_sequences', updatedSeq, `Sequence ${seqId}`);
    this.saveState();

    return displayCode;
  }

  deriveAbbreviation(fullName) {
    if (!fullName) return '';
    const skipWords = new Set(['and','of','the','for','a','an','in','to','at','by','with','from','on']);
    const cleaned = fullName
      .replace(/\(.*?\)/g, '')  // remove parentheses content
      .replace(/[^a-zA-Z\s]/g, '') // remove special chars
      .trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 0 && !skipWords.has(w.toLowerCase()));
    const abbr = words.map(w => w[0].toUpperCase()).join('');
    return abbr.length >= 2 ? abbr : abbr.padEnd(2, 'X');
  }

  buildSubjectId(universityCode, abbreviation) {
    const code = (universityCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const abbr = (abbreviation || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `sub-${code}-${abbr}`;
  }

  getAcademicYears() {
    return this.data.academicYears || ACADEMIC_YEARS;
  }

  getActiveAcademicYear() {
    const active = (this.data.academicYears || ACADEMIC_YEARS).find(ay => ay.active);
    return active ? active.label : '2026-27';
  }

  /* ==========================================================================
     ASSIGNMENT SHEET RENDERER & MODAL OVERLAY
     ========================================================================== */
  renderAssignmentSheet(assignmentId, studentId = null) {
    // 1. Fetch assignment
    const assignment = (this.data.assignments || []).find(a => a.id === assignmentId || a.code === assignmentId || (a.originalId && a.originalId === assignmentId));
    if (!assignment) {
      this.showToast('Assignment not found for rendering sheet.', 'danger');
      return;
    }

    // 2. Fetch subject & department
    const subject = (this.data.subjects || []).find(s => s.id === (assignment.subjectId || assignment.subject_id)) || null;
    const deptId = subject ? (subject.departmentId || subject.department_id) : 'dept-fe';
    const department = (this.data.departments || HARDCODED_DEPARTMENTS).find(d => d.id === deptId) || HARDCODED_DEPARTMENTS[0];

    // Class | Semester lookup via subject & academicClasses
    let className = '—';
    if (subject) {
      if (subject.className || subject.class_name) {
        className = subject.className || subject.class_name;
      } else {
        const clsObj = (this.data.academicClasses || []).find(c => c.departmentId === deptId || c.id === subject.classId || c.id === subject.class_id);
        if (clsObj) className = clsObj.name || clsObj.code || '—';
      }
    }
    const semesterName = (subject && (subject.semester || subject.semester_name)) || '—';

    // Lab Name & Lab Code with safe fallbacks
    const labName = (subject && (subject.fullName || subject.full_name || subject.name)) || '—';
    const labCode = (subject && subject.code) || '—';

    // 3. Determine student profile & variables
    let student = null;
    if (studentId) {
      student = (this.data.students || []).find(s => s.id === studentId);
    }
    if (!student) {
      // Faculty preview mode or fallback: use first enrolled student for subject
      const enrolled = this.getStudentsForSubject(subject);
      student = enrolled.length > 0 ? enrolled[0] : null;
    }

    const studentVars = {};
    if (student && student.id) {
      (this.data.studentVariables || []).forEach(v => {
        if (v.studentId === student.id && (v.assignmentId === assignment.id || v.assignmentId === assignment.code || v.assignmentId === assignment.originalId)) {
          studentVars[v.key] = v.value;
        }
      });
    }

    const isDraft = (assignment.lifecycle_status || assignment.state || 'draft').toLowerCase() === 'draft';

    // 4. Portal settings images
    const collegeLogoUrl = this.getPortalSetting('college_logo');
    const bloomsPyramidUrl = this.getPortalSetting('blooms_taxonomy_image');

    // 5. Parse questions
    let questions = [];
    if (Array.isArray(assignment.questions)) {
      questions = assignment.questions;
    } else if (typeof assignment.questions === 'string') {
      try { questions = JSON.parse(assignment.questions); } catch(_) { questions = []; }
    }

    // Check if any question uses per-student variables
    let usePerStudentVariables = false;
    questions.forEach(q => {
      if (q.usePerStudentVariables === true || (q.text && /\{\{.*?\}\}/.test(q.text))) {
        usePerStudentVariables = true;
      }
    });

    // 6. Assignment Metadata
    // Format published date as DD/MM/YYYY
    let formattedDate = '—';
    if (assignment.created_at || assignment.createdAt || assignment.published_at || assignment.publishedAt) {
      const rawDate = new Date(assignment.created_at || assignment.createdAt || assignment.published_at || assignment.publishedAt);
      if (!isNaN(rawDate.getTime())) {
        const day = String(rawDate.getDate()).padStart(2, '0');
        const month = String(rawDate.getMonth() + 1).padStart(2, '0');
        const year = rawDate.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }
    }

    // Modules covered
    const modulesCoveredIds = assignment.modules_covered || assignment.modulesCovered || assignment.module_ids || [];
    const moduleNamesList = (this.data.modules || [])
      .filter(m => modulesCoveredIds.includes(m.id) || modulesCoveredIds.includes(m.code))
      .map(m => m.module_name || m.name || m.title || m.code);
    const modulesCoveredStr = moduleNamesList.length > 0 ? moduleNamesList.join(', ') : 'All Modules';

    // COs covered
    const coIds = assignment.co_ids || assignment.coIds || [];
    const coList = (this.data.courseOutcomes || [])
      .filter(co => coIds.includes(co.id) || coIds.includes(co.code))
      .map(co => `${co.code}${co.description ? ' - ' + co.description : ''}`);
    const cosCoveredStr = coList.length > 0 ? coList.join(', ') : 'All Course Outcomes';

    // 7. Rubric lookup
    const rubricPresetId = assignment.rubric_preset_id || assignment.rubricPresetId;
    const rubric = this.getRubricPreset(rubricPresetId) || {
      tolerance_exemplary: 2,
      tolerance_proficient: 5,
      tolerance_developing: 10
    };
    const tolExemplary = rubric.tolerance_exemplary !== undefined ? rubric.tolerance_exemplary : 2;
    const tolProficient = rubric.tolerance_proficient !== undefined ? rubric.tolerance_proficient : 5;
    const tolDeveloping = rubric.tolerance_developing !== undefined ? rubric.tolerance_developing : 10;
       // BT Level labels
    const btLabelsMap = {
      'BT1': 'R - Remember',
      'BT2': 'U - Understand',
      'BT3': 'AP - Apply',
      'BT4': 'AN - Analyze',
      'BT5': 'E - Evaluate',
      'BT6': 'C - Create',
      'R': 'R - Remember',
      'U': 'U - Understand',
      'AP': 'AP - Apply',
      'AN': 'AN - Analyze',
      'E': 'E - Evaluate',
      'C': 'C - Create'
    };

    // Total assignment marks calculation
    const totalMaxMarks = questions.reduce((sum, q) => sum + (parseFloat(q.max_marks || q.maxMarks || 0) || 0), 0);
    const totalMarksText = totalMaxMarks > 0 
      ? `Total Assignment Marks: <strong>${totalMaxMarks}</strong> marks` 
      : `Total Marks: <em>Not yet defined</em>`;

    // Rubric deduction flags
    const attemptDeductionsEnabled = !!(rubric.attempt_deductions_enabled || rubric.attemptDeductionsEnabled);
    const latePenaltyEnabled = !!(rubric.late_penalty_enabled || rubric.latePenaltyEnabled);

    // Construct Sheet HTML
    const html = `
      <div id="assignment-sheet-modal-overlay" class="assignment-sheet-modal-overlay">
        <div class="assignment-sheet-modal-container">
          <div class="assignment-sheet-modal-actions print-hide">
            ${isDraft ? `
              <div style="margin-right:auto; display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; color:var(--warning);">
                <span>⚠️ Preview Mode — This assignment is still a draft</span>
              </div>
            ` : ''}
            <button class="btn btn-primary" onclick="(function(){ const prev = document.title; document.title = '${(assignment.display_code || 'DRAFT')}_${student ? student.uin : 'UIN'}_${student ? student.name.replace(/\s+/g, '_') : 'Name'}'; window.print(); window.onafterprint = function(){ document.title = prev; }; })()">🖨️ Print / Save as PDF</button>
            <button class="btn btn-secondary" onclick="app.closeAssignmentSheetModal()">✕ Close</button>
          </div>
          
          ${isDraft ? `
            <div class="print-hide" style="background:var(--warning-subtle); border:1px solid var(--warning); border-radius:var(--radius-md); padding:10px 16px; font-size:13px; font-weight:600; color:var(--warning); display:flex; align-items:center; gap:8px;">
              ⚠️ Draft Preview — Variables and parameters may be incomplete
            </div>
          ` : ''}

          <div class="assignment-sheet-printable">

            <!-- PAGE 1 CONTENT WRAPPER -->
            <div class="assignment-sheet-page1">
              <!-- A. COLLEGE HEADER -->
              <div class="sheet-header">
                ${collegeLogoUrl ? `<img src="${collegeLogoUrl}" alt="College Logo" class="sheet-college-logo">` : ''}
                <div class="sheet-header-text">
                  <div class="res-title">RIZVI EDUCATION SOCIETY's</div>
                  <div class="college-title">RIZVI COLLEGE OF ENGINEERING</div>
                  <div class="college-subtext">Approved by AICTE | Recognized by DTE | Affiliated to University of Mumbai</div>
                  <div class="nba-badge-text">Accredited by NBA</div>
                  <div class="dept-title">DEPARTMENT OF ${(department.name || 'FIRST YEAR ENGINEERING').toUpperCase()}</div>
                </div>
              </div>

              <!-- B. ASSIGNMENT NO & DATE TABLE -->
              <table class="sheet-table sheet-no-date-table">
                <tr>
                  <td style="width:50%; font-weight:700;">
                    Assignment No: 
                    ${assignment.display_code ? `<span class="mono-val">${assignment.display_code}</span>` : `<span class="mono-val" style="color:var(--warning); font-weight:700;">[DRAFT — Unpublished]</span>`}
                  </td>
                  <td style="width:50%; text-align:right; font-weight:700;">Date: <span class="mono-val">${formattedDate}</span></td>
                </tr>
              </table>

              <!-- C & D. SIDE-BY-SIDE LAYOUT: VISION & MISSION (55%) | BLOOM'S TAXONOMY (45%) -->
              <div class="sheet-side-by-side-grid">
                <!-- Left Column: Vision & Mission -->
                <div class="sheet-section sheet-vision-mission" style="margin-bottom:0;">
                  <div class="vision-block">
                    <strong>Vision:</strong> <em>${department.vision || ''}</em>
                  </div>
                  <div class="mission-block" style="margin-top:6px;">
                    <strong>Mission:</strong>
                    <ol style="margin-left:20px; margin-top:2px;">
                      ${(department.mission || []).map(m => `<li><em>${m}</em></li>`).join('')}
                    </ol>
                  </div>
                </div>

                <!-- Right Column: Bloom's Taxonomy -->
                <div class="sheet-section sheet-blooms-section" style="margin-bottom:0;">
                  <div class="sheet-section-title">Bloom's Taxonomy Levels:</div>
                  <div class="sheet-blooms-legend">R - Remember, U - Understand, AP - Apply, AN - Analyze, E - Evaluate, C – Create</div>
                  ${bloomsPyramidUrl ? `<img src="${bloomsPyramidUrl}" alt="Bloom's Taxonomy Pyramid" class="sheet-blooms-img">` : ''}
                </div>
              </div>

              <!-- E. ASSIGNMENT META TABLE -->
              <table class="sheet-table sheet-meta-table">
                <tr>
                  <td><strong>Class:</strong> ${className}</td>
                  <td><strong>Semester:</strong> ${semesterName}</td>
                </tr>
                <tr>
                  <td><strong>Lab Name:</strong> ${labName}</td>
                  <td><strong>Lab Code:</strong> ${labCode}</td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Type of assessment:</strong> Direct</td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Modules covered:</strong> ${modulesCoveredStr}</td>
                </tr>
                <tr>
                  <td colspan="2"><strong>Lab Outcome/s covered:</strong> ${cosCoveredStr}</td>
                </tr>
              </table>

              <!-- F. RUBRIC TABLE -->
              <div class="sheet-section sheet-rubric-container">
                <div class="sheet-total-marks-banner" style="background:var(--accent-blue-subtle, #EBF4FF); border:1px solid var(--accent-blue, #1889E6); border-radius:var(--radius-sm, 4px); padding:8px 12px; margin-bottom:8px; font-size:13px; color:#000;">
                  ${totalMarksText}
                </div>

                <div class="sheet-table-title">Rubrics for Numerical Problems</div>
                <table class="sheet-table sheet-rubric-table">
                  <thead>
                    <tr>
                      <th style="width:20%;">Level / Marks</th>
                      <th style="width:32%;">Criteria 01 (Answers)</th>
                      <th style="width:28%;">Criteria 02 (Units)</th>
                      <th style="width:20%;">Marks Awarded</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Unsatisfactory (00)</strong></td>
                      <td>Beyond ±${tolDeveloping}%</td>
                      <td>Wrong or missing unit</td>
                      <td>0 marks</td>
                    </tr>
                    <tr>
                      <td><strong>Developing (01)</strong></td>
                      <td>Within ±${tolDeveloping}%</td>
                      <td>Unit partially correct or wrong notation</td>
                      <td>50% of parameter marks</td>
                    </tr>
                    <tr>
                      <td><strong>Proficient (02)</strong></td>
                      <td>Within ±${tolProficient}%</td>
                      <td>Correct unit, minor notation difference</td>
                      <td>75% of parameter marks</td>
                    </tr>
                    <tr>
                      <td><strong>Exemplary (03)</strong></td>
                      <td>Within ±${tolExemplary}%</td>
                      <td>Exact correct unit as specified</td>
                      <td>100% of parameter marks</td>
                    </tr>
                  </tbody>
                </table>

                <div class="sheet-rubric-footnotes" style="font-size:11px; font-style:italic; color:var(--text-secondary, #555); margin-top:4px; line-height:1.45;">
                  <div>* Marks are calculated per parameter based on numerical accuracy and unit correctness.</div>
                  ${attemptDeductionsEnabled ? `
                    <div>* Attempt penalty: 2nd attempt −10%, 3rd attempt −20% of parameter marks.</div>
                  ` : ''}
                  ${latePenaltyEnabled ? `
                    <div>* Late submission penalty: ≤24hrs −10%, >24hrs −20%, >48hrs −30% of total assignment marks.</div>
                  ` : ''}
                  ${(!attemptDeductionsEnabled || !latePenaltyEnabled) ? `
                    <div>* Attempt and late submission deductions are at faculty discretion and may be applied at semester end.</div>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- PAGE 2 CONTENT WRAPPER -->
            <div class="assignment-sheet-page2 assignment-sheet-page-break">
              <!-- G. STUDENT IDENTITY ROW -->
              <div class="sheet-student-row">
                ${student ? `
                  <strong>UIN & Name:</strong> <span class="mono-val">${student.uin}</span> — <strong>${student.name}</strong>
                ` : `
                  <strong>UIN & Name:</strong> <span class="mono-val">____________________</span> — <strong>________________________________________</strong>
                `}
              </div>

              <!-- H. NOTICE BOXES -->
              <div class="sheet-notice-container">
                ${usePerStudentVariables ? `
                  <div class="sheet-notice-box notice-box-unique">
                    ⚠️ <strong>Notice:</strong> Your data is unique. The values given in your questions are assigned only to you. Do not share or compare with others.
                  </div>
                ` : ''}
                <div class="sheet-notice-box notice-box-submission">
                  📌 <strong>Important:</strong> Portal submission is not enough. You must also submit your assignment sheets with complete solutions, diagrams, and working to finish your submission.
                </div>
              </div>

              <!-- I. QUESTIONS TABLE -->
              <div class="sheet-section" style="margin-top:12px;">
              <table class="sheet-table sheet-questions-table">
                <thead>
                  <tr>
                    <th style="width:5%;">Q.No</th>
                    <th style="width:80%;">Question</th>
                    <th style="width:15%;">Mapping</th>
                  </tr>
                </thead>
                <tbody>
                  ${questions.map((q, idx) => {
                    const rawText = q.text || q.question_text || '';
                    const qPrefix = `Q${idx + 1}_`;
                    const qStudentVars = {};
                    Object.keys(studentVars).forEach(k => {
                      if (k.startsWith(qPrefix)) {
                        qStudentVars[k.slice(qPrefix.length)] = studentVars[k];
                      }
                    });
                    const formattedQText = this.formatQuestionText(rawText, qStudentVars);

                    // Image rendering
                    const qImgUrl = q.imageUrl || q.image_url ? this.getEmbeddableImageUrl(q.imageUrl || q.image_url) : '';

                    // Parameters table
                    const params = q.parameters || [];

                    // Lookups
                    const coObj = (this.data.courseOutcomes || []).find(co => co.id === q.coId || co.code === q.coId);
                    const coCode = coObj ? coObj.code : (q.coId || 'CO1');

                    const btCode = q.btLevel || q.bt_level || 'AP';
                    const btFull = btLabelsMap[btCode] || btCode;

                    const modObj = (this.data.modules || []).find(m => m.id === q.moduleId || m.code === q.moduleId);
                    const modCode = modObj ? (modObj.code || modObj.module_code) : (q.moduleId || 'M1');

                    return `
                      <tr>
                        <td style="text-align:center; font-weight:700; vertical-align:top;">Q${idx + 1}</td>
                        <td style="vertical-align:top;">
                          <div class="question-text">${formattedQText}</div>
                          <div style="text-align:right; font-size:11px; font-weight:700; color:#000; margin-top:6px;">[Max Marks: ${parseFloat(q.max_marks || q.maxMarks || 0)}]</div>
                          ${qImgUrl ? `<div style="margin-top:8px;"><img src="${qImgUrl}" alt="Question Diagram" class="question-image" style="border:none; background:transparent; display:block; margin:8px auto;"></div>` : ''}
                          ${params.length > 0 ? `
                            <div class="question-params-subtable-container" style="margin-top:8px;">
                              <table class="question-params-subtable">
                                <thead>
                                  <tr>
                                    <th>Variable Name</th>
                                    <th>Value</th>
                                    <th>Unit</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${params.map(p => {
                                    const pKey = p.key || p.name || '';
                                    const val = (studentVars && studentVars[pKey] !== undefined) ? studentVars[pKey] : (p.defaultValue || p.default_value || '[??]');
                                    return `
                                      <tr>
                                        <td>${p.label || pKey}</td>
                                        <td><strong>${val}</strong></td>
                                        <td>${p.unit || ''}</td>
                                      </tr>
                                    `;
                                  }).join('')}
                                </tbody>
                              </table>
                            </div>
                          ` : ''}
                        </td>
                        <td style="vertical-align:top; font-size:11px; text-align:center;">
                          <div class="sheet-mapping-stack" style="display:flex; flex-direction:column; gap:6px; align-items:center;">
                            <div class="sheet-mapping-item">
                              <span style="font-size:9px; text-transform:uppercase; color:#666; display:block; font-weight:700; line-height:1;">CO</span>
                              <span class="tag tag-co" style="font-weight:700; font-size:10px; padding:1px 6px; margin-top:2px; display:inline-block;">${coCode}</span>
                            </div>
                            <div class="sheet-mapping-item">
                              <span style="font-size:9px; text-transform:uppercase; color:#666; display:block; font-weight:700; line-height:1;">BT Level</span>
                              <strong style="color:#000; font-size:10px; display:block; margin-top:1px;">${btFull}</strong>
                            </div>
                            <div class="sheet-mapping-item">
                              <span style="font-size:9px; text-transform:uppercase; color:#666; display:block; font-weight:700; line-height:1;">Module</span>
                              <strong style="color:#000; font-size:10px; display:block; margin-top:1px;">${modCode}</strong>
                            </div>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

    // Remove old modal if exists
    const oldModal = document.getElementById('assignment-sheet-modal-overlay');
    if (oldModal) oldModal.remove();

    // Append new modal overlay to body
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    document.body.appendChild(div.firstChild);
  }

  closeAssignmentSheetModal() {
    const modal = document.getElementById('assignment-sheet-modal-overlay');
    if (modal) modal.remove();
  }
}

// Global App Instance
window.app = new AppEngine();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
