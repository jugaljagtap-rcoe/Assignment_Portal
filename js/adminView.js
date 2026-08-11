/* ==========================================================================
   Rizvi College of Engineering - Admin Module
   ========================================================================== */

const adminView = {
  activeDeptTab: 'overview',

  render(container, activeNav) {
    const hash = window.location.hash || '#admin-home';

    if (hash.startsWith('#admin-dept-')) {
      const raw = hash.replace('#admin-dept-', '');
      const validTabs = ['overview', 'classes', 'subjects', 'students', 'faculty', 'vm'];
      let tab = 'overview';
      let deptId = raw;

      for (const t of validTabs) {
        if (raw.endsWith('-' + t)) {
          tab = t;
          deptId = raw.substring(0, raw.length - (t.length + 1));
          break;
        }
      }
      this.renderDepartmentWorkspace(container, deptId, tab);
    } else {
      switch(activeNav) {
        case 'students':
          this.renderStudentsMaster(container);
          break;
        case 'faculty':
          this.renderFacultyRoster(container);
          break;
        case 'departments':
          this.renderDepartments(container);
          break;
        case 'pos':
          this.renderPOAccreditation(container);
          break;
        case 'google-auth':
          this.renderGoogleAuthSettings(container);
          break;
        case 'analytics':
          analyticsView.render(container);
          break;
        case 'dashboard':
        default:
          this.renderAdminHome(container);
          break;
      }
    }
  },

  /* ==========================================================================
     LEVEL 1 — ADMIN HOME (#admin-home)
     ========================================================================== */
  renderAdminHome(container) {
    const totalStudents = app.data.students.length;
    const totalFaculty = app.data.faculty.filter(f => f.role === 'faculty' || f.role === 'admin').length;
    const totalAssignments = app.data.assignments.length;
    const pendingVerifications = app.data.submissions.filter(s => (s.verificationStatus || 'pending').toLowerCase() === 'pending').length;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Admin Dashboard</h1>
          <p class="page-subtitle">Rizvi College of Engineering — Academic Administration & Department Control</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#google-auth'">🔑 Audit Trail & Access</button>
          <button class="btn btn-secondary btn-sm" onclick="adminView.openAttainmentModal()">⚙️ Threshold Settings</button>
        </div>
      </div>

      <!-- SECTION 1: DEPARTMENT BLOCKS GRID (6 Cards) -->
      <div class="card-header" style="margin-bottom:12px;">
        <h2 class="card-title">Department Workspaces</h2>
        <p class="card-subtitle">Select a department to inspect classes, subjects, students, faculty, and vision & mission</p>
      </div>

      <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-bottom:28px;">
        ${HARDCODED_DEPARTMENTS.map(d => {
          const deptSubjects = (app.data.subjects || []).filter(s => s.departmentId === d.id);
          const deptStudents = app.data.students.filter(s => {
            const b = s.branch || '';
            if (d.id === 'dept-aids') return b.includes('Artificial Intelligence');
            if (d.id === 'dept-civil') return b.includes('Civil');
            if (d.id === 'dept-comp') return b.includes('Computer Engineering');
            if (d.id === 'dept-ecs') return b.includes('Electronics');
            if (d.id === 'dept-mech') return b.includes('Mechanical');
            return true;
          });

          const deptAsgs = (app.data.assignments || []).filter(a => deptSubjects.some(s => s.id === a.subjectId));
          const deptAsgSubs = (app.data.assignmentSubmissions || []).filter(as => deptAsgs.some(a => a.id === as.assignmentId));
          const completedStudents = new Set(deptAsgSubs.filter(as => as.status === 'submitted' || as.status === 'late').map(as => as.studentId)).size;
          const rate = deptStudents.length > 0 ? Math.round((completedStudents / deptStudents.length) * 100) : 0;
          const hasPendingVerifications = app.data.submissions.some(s => deptAsgs.some(a => a.id === s.assignmentId) && (s.verificationStatus || 'pending').toLowerCase() === 'pending');

          return `
            <div class="card" style="padding:18px; cursor:pointer; position:relative; transition:all 0.15s ease;" onclick="window.location.hash='#admin-dept-${d.id}'">
              ${hasPendingVerifications ? `
                <div style="position:absolute; top:12px; right:12px; width:10px; height:10px; border-radius:50%; background:var(--danger);" title="Pending verifications in this department"></div>
              ` : ''}
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                <span class="tag tag-co" style="font-weight:800; font-size:12px;">${d.shortName}</span>
                <span style="font-size:11px; color:var(--text-secondary); font-weight:600;">AY 2026-27</span>
              </div>
              <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">${d.name}</h3>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; color:var(--text-secondary); margin-top:12px;">
                <div>Subjects: <strong class="mono-val" style="color:var(--text-primary);">${deptSubjects.length}</strong></div>
                <div>Students: <strong class="mono-val" style="color:var(--text-primary);">${deptStudents.length}</strong></div>
                <div>Active Labs: <strong class="mono-val" style="color:var(--accent-blue);">${deptAsgs.length}</strong></div>
                <div>Completion: <strong class="mono-val" style="color:${rate >= 70 ? 'var(--success)' : 'var(--warning)'};">${rate}%</strong></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- SECTION 2: GLOBAL MANAGEMENT BLOCKS -->
      <div class="card-header" style="margin-bottom:12px;">
        <h2 class="card-title">Global Management & Administration</h2>
        <p class="card-subtitle">Cross-departmental system settings, access control, audit logs, and accreditation parameters</p>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:16px;">
        <div class="card" style="padding:16px; cursor:pointer;" onclick="app.switchNav('pos')">
          <span class="tag tag-co" style="margin-bottom:8px;">ACCREDITATION</span>
          <h4 style="font-size:15px; font-weight:700; margin-bottom:4px;">Program Outcomes (PO1–PO12)</h4>
          <p style="font-size:12px; color:var(--text-secondary);">Manage global NBA Program Outcomes and Program Specific Outcomes (PSO1–PSO2).</p>
        </div>

        <div class="card" style="padding:16px; cursor:pointer;" onclick="app.switchNav('google-auth')">
          <span class="tag tag-danger" style="margin-bottom:8px;">SECURITY & AUDIT</span>
          <h4 style="font-size:15px; font-weight:700; margin-bottom:4px;">Google Auth & Audit Trail Log</h4>
          <p style="font-size:12px; color:var(--text-secondary);">Inspect immutable system audit trail logs and test @eng.rizvi.edu.in whitelist resolution.</p>
        </div>

        <div class="card" style="padding:16px; cursor:pointer;" onclick="adminView.openAttainmentModal()">
          <span class="tag tag-bt" style="margin-bottom:8px;">SETTINGS</span>
          <h4 style="font-size:15px; font-weight:700; margin-bottom:4px;">Academic Years & Thresholds</h4>
          <p style="font-size:12px; color:var(--text-secondary);">Configure NBA attainment score thresholds and active academic year schedules.</p>
        </div>

        <div class="card" style="padding:16px; cursor:pointer;" onclick="app.switchNav('analytics')">
          <span class="tag tag-co" style="margin-bottom:8px;">REPORTS</span>
          <h4 style="font-size:15px; font-weight:700; margin-bottom:4px;">Portal-Wide Analytics</h4>
          <p style="font-size:12px; color:var(--text-secondary);">Master gradebook rosters, completion matrices, and institutional performance metrics.</p>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     LEVEL 2 — DEPARTMENT WORKSPACE (#admin-dept-{deptId})
     ========================================================================== */
  renderDepartmentWorkspace(container, deptId, activeTab = 'overview') {
    const dept = HARDCODED_DEPARTMENTS.find(d => d.id === deptId) || HARDCODED_DEPARTMENTS[0];
    this.activeDeptTab = activeTab;

    container.innerHTML = `
      <!-- Breadcrumb Navigation -->
      <div class="breadcrumb-container" style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        <a href="#admin-home" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">Admin Home</a>
        <span>&gt;</span>
        <span style="font-weight:700; color:var(--text-primary);">${dept.name}</span>
      </div>

      <div class="page-header-container">
        <div>
          <h1 class="page-title">${dept.name} Workspace</h1>
          <p class="page-subtitle">Department Code: <strong class="mono-val" style="color:var(--accent-blue);">${dept.shortName}</strong> · Academic Year 2026-27</p>
        </div>
      </div>

      <!-- Internal 6-Tab Navigation Bar -->
      <div class="segmented-control print-hide" style="margin-bottom:20px;">
        <button class="segmented-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-overview'">Overview</button>
        <button class="segmented-btn ${activeTab === 'classes' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-classes'">Classes</button>
        <button class="segmented-btn ${activeTab === 'subjects' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-subjects'">Subjects</button>
        <button class="segmented-btn ${activeTab === 'students' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-students'">Students</button>
        <button class="segmented-btn ${activeTab === 'faculty' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-faculty'">Faculty</button>
        <button class="segmented-btn ${activeTab === 'vm' ? 'active' : ''}" onclick="window.location.hash='#admin-dept-${dept.id}-vm'">Vision & Mission</button>
      </div>

      <div id="admin-dept-tab-content">
        ${this.renderDeptTabContent(dept, activeTab)}
      </div>
    `;
  },

  renderDeptTabContent(dept, tab) {
    switch(tab) {
      case 'classes': return this.renderDeptClassesTab(dept);
      case 'subjects': return this.renderDeptSubjectsTab(dept);
      case 'students': return this.renderDeptStudentsTab(dept);
      case 'faculty': return this.renderDeptFacultyTab(dept);
      case 'vm': return this.renderDeptVisionMissionTab(dept);
      case 'overview':
      default: return this.renderDeptOverviewTab(dept);
    }
  },

  renderDeptOverviewTab(dept) {
    const deptSubjects = (app.data.subjects || []).filter(s => s.departmentId === dept.id);
    const deptStudents = app.data.students.filter(s => {
      const b = s.branch || '';
      if (dept.id === 'dept-aids') return b.includes('Artificial Intelligence');
      if (dept.id === 'dept-civil') return b.includes('Civil');
      if (dept.id === 'dept-comp') return b.includes('Computer Engineering');
      if (dept.id === 'dept-ecs') return b.includes('Electronics');
      if (dept.id === 'dept-mech') return b.includes('Mechanical');
      return true;
    });

    const deptAsgs = (app.data.assignments || []).filter(a => deptSubjects.some(s => s.id === a.subjectId));
    const deptAsgSubs = (app.data.assignmentSubmissions || []).filter(as => deptAsgs.some(a => a.id === as.assignmentId));
    const completedStudents = new Set(deptAsgSubs.filter(as => as.status === 'submitted' || as.status === 'late').map(as => as.studentId)).size;
    const rate = deptStudents.length > 0 ? Math.round((completedStudents / deptStudents.length) * 100) : 0;
    const recentAudits = (app.data.auditLogs || []).filter(l => l.entity_type === 'subject' || l.entity_type === 'student' || l.entity_type === 'faculty').slice(0, 5);

    return `
      <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card">
          <span class="kpi-label">Enrolled Students</span>
          <span class="kpi-value">${deptStudents.length}</span>
          <span class="kpi-trend positive">Department Roster</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Subjects Defined</span>
          <span class="kpi-value">${deptSubjects.length}</span>
          <span class="kpi-trend neutral">Across All Semesters</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Lab Assignments</span>
          <span class="kpi-value">${deptAsgs.length}</span>
          <span class="kpi-trend positive">Active Experiments</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Student Submission Rate</span>
          <span class="kpi-value" style="color:${rate >= 70 ? 'var(--success)' : 'var(--warning)'};">${rate}%</span>
          <span class="kpi-trend ${rate >= 70 ? 'positive' : 'neutral'}">Student Roster Completion</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Recent Audit Activity for ${dept.shortName}</h3>
        ${recentAudits.length === 0 ? `<div class="empty-state">No audit logs recorded for this department yet.</div>` : `
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User Email</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${recentAudits.map(l => `
                  <tr>
                    <td><span class="tag ${l.action === 'created' ? 'tag-success' : 'tag-bt'}">${(l.action || 'updated').toUpperCase()}</span></td>
                    <td style="font-weight:600;">${l.entity_type} (${l.entity_id})</td>
                    <td style="font-size:12px; color:var(--accent-blue);">${l.changed_by || 'system'}</td>
                    <td class="mono-val" style="font-size:11px;">${l.changed_at ? new Date(l.changed_at).toLocaleString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  renderDeptClassesTab(dept) {
    const classes = (INITIAL_DATA.academicClasses || []).filter(c => c.departmentId === dept.id || dept.id === 'dept-fe');
    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Academic Classes — ${dept.name}</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Class Code</th>
                <th>Class Name</th>
                <th>Semesters</th>
                <th>Enrolled Students</th>
              </tr>
            </thead>
            <tbody>
              ${classes.map(c => {
                const count = app.data.students.filter(s => s.yearOfStudy === c.code || (c.code === 'FE' && (!s.yearOfStudy || s.yearOfStudy === 'FE'))).length;
                return `
                  <tr>
                    <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${c.code}</td>
                    <td style="font-weight:600;">${c.name}</td>
                    <td><span class="tag tag-co">${(c.semesters || []).join(', ')}</span></td>
                    <td class="mono-val" style="font-weight:700;">${count}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderDeptSubjectsTab(dept) {
    const subjects = (app.data.subjects || []).filter(s => s.departmentId === dept.id);
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 class="card-title">Subject Courses — ${dept.name}</h3>
          <button class="btn btn-primary btn-sm" onclick="adminView.openAddSubjectModal('${dept.id}')">+ Add New Subject</button>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Full Name</th>
                <th>Semester</th>
                <th>Assigned Faculty (Cross-Dept Allowed)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => {
                const sf = (app.data.subjectFaculty || []).find(f => f.subject_id === s.id || f.subjectId === s.id);
                const assignedFac = sf ? app.data.faculty.find(f => f.email === sf.faculty_id || f.email === sf.facultyId) : null;
                return `
                  <tr>
                    <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${s.code}</td>
                    <td style="font-weight:600;">${s.fullName || s.name}</td>
                    <td><span class="tag tag-co">${s.semester || 'Sem I'}</span></td>
                    <td>
                      ${assignedFac ? `
                        <span class="tag tag-success" style="font-weight:600;">
                          ${assignedFac.name} (${assignedFac.email})
                        </span>
                      ` : `<span class="tag tag-warning">Unassigned</span>`}
                    </td>
                    <td style="display:flex; gap:6px;">
                      <button class="btn btn-secondary btn-sm" onclick="adminView.openAssignFacultyModal('${s.id}')">👨‍🏫 Assign Faculty</button>
                      ${sf ? `<button class="btn btn-destructive btn-sm" onclick="adminView.removeSubjectFaculty('${sf.id}')">Remove</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* PART 8 FIX: renderDeptStudentsTab returns HTML string filtered by dept branch */
  renderDeptStudentsTab(dept) {
    const deptStudents = app.data.students.filter(s => {
      const b = s.branch || '';
      if (dept.id === 'dept-aids') return b.includes('Artificial Intelligence');
      if (dept.id === 'dept-civil') return b.includes('Civil');
      if (dept.id === 'dept-comp') return b.includes('Computer Engineering');
      if (dept.id === 'dept-ecs') return b.includes('Electronics');
      if (dept.id === 'dept-mech') return b.includes('Mechanical');
      return true;
    });

    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Enrolled Student Roster — ${dept.name} (${deptStudents.length} Students)</h3>
        <div class="table-container" style="max-height:500px; overflow-y:auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>UIN</th>
                <th>Student Name</th>
                <th>Email</th>
                <th>Branch</th>
                <th>Division / Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.buildStudentRows(deptStudents)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderDeptFacultyTab(dept) {
    const deptFaculty = (app.data.faculty || []).filter(f => f.departmentId === dept.id || f.role === 'admin');
    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Home Department Faculty Roster — ${dept.name}</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Currently Teaching</th>
              </tr>
            </thead>
            <tbody>
              ${deptFaculty.map(f => {
                const taughtSfs = (app.data.subjectFaculty || []).filter(sf => sf.faculty_id === f.email || sf.facultyId === f.email);
                const subCodes = taughtSfs.map(sf => {
                  const sub = app.data.subjects.find(s => s.id === sf.subject_id || s.id === sf.subjectId);
                  return sub ? sub.code : sf.subject_id;
                });
                return `
                  <tr>
                    <td style="font-weight:600;">${f.name}</td>
                    <td class="mono-val" style="font-size:12px; color:var(--accent-blue);">${f.email}</td>
                    <td><span class="tag ${f.role === 'admin' ? 'tag-danger' : 'tag-co'}">${f.role.toUpperCase()}</span></td>
                    <td><span class="tag tag-bt">${subCodes.length > 0 ? subCodes.join(', ') : 'None'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderDeptVisionMissionTab(dept) {
    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Department Vision & Mission Statements</h3>
        <form onsubmit="adminView.saveDeptVisionMission(event, '${dept.id}')">
          <div class="form-group">
            <label class="form-label">Department Vision Statement</label>
            <textarea id="dept-vision-input" class="form-input" rows="3" required>${dept.vision || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Department Mission Points (One per line)</label>
            <textarea id="dept-mission-input" class="form-input" rows="5" required>${(dept.mission || []).join('\n')}</textarea>
          </div>

          <button type="submit" class="btn btn-primary">💾 Save Vision & Mission Statements</button>
        </form>
      </div>
    `;
  },

  async saveDeptVisionMission(e, deptId) {
    e.preventDefault();
    const dept = HARDCODED_DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return;

    dept.vision = document.getElementById('dept-vision-input').value;
    dept.mission = document.getElementById('dept-mission-input').value.split('\n').map(l => l.trim()).filter(Boolean);

    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('departments').upsert({
          id: dept.id,
          name: dept.name,
          short_name: dept.shortName,
          vision: dept.vision,
          mission: dept.mission
        });
      } catch(err) { console.warn('Dept V&M save notice:', err); }
    }

    writeAudit('updated', 'department', dept.id, { vision: dept.vision });
    app.showToast(`Updated Vision & Mission for ${dept.name}`, 'success');
  },

  /* ==========================================================================
     CROSS-DEPARTMENT FACULTY ASSIGNMENT MODAL
     ========================================================================== */
  openAssignFacultyModal(subjectId) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    if (!sub) return;

    const facultyByDeptMap = new Map();
    HARDCODED_DEPARTMENTS.forEach(d => facultyByDeptMap.set(d.id, []));

    app.data.faculty.forEach(f => {
      const deptId = f.departmentId || 'dept-fe';
      if (!facultyByDeptMap.has(deptId)) facultyByDeptMap.set(deptId, []);
      facultyByDeptMap.get(deptId).push(f);
    });

    let optionsHtml = '';
    facultyByDeptMap.forEach((facList, dId) => {
      const deptObj = HARDCODED_DEPARTMENTS.find(d => d.id === dId) || { name: 'General' };
      if (facList.length > 0) {
        optionsHtml += `<optgroup label="${deptObj.name}">`;
        facList.forEach(f => {
          optionsHtml += `<option value="${f.email}">${f.name} (${f.email})</option>`;
        });
        optionsHtml += `</optgroup>`;
      }
    });

    app.showModal(`Assign Teaching Faculty to ${sub.code}`, `
      <form onsubmit="adminView.saveSubjectFacultyAssignment(event, '${sub.id}')">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <input type="text" class="form-input code-font" value="${sub.code}: ${sub.fullName || sub.name}" readonly style="background:var(--bg-subtle);">
        </div>

        <div class="form-group">
          <label class="form-label">Select Faculty Member (All Departments Grouped)</label>
          <select id="assign-faculty-select" class="form-select" required>
            ${optionsHtml}
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Assign Faculty to Subject</button>
        </div>
      </form>
    `);
  },

  async saveSubjectFacultyAssignment(e, subjectId) {
    e.preventDefault();
    const facultyEmail = document.getElementById('assign-faculty-select').value;
    const sfRecord = {
      id: `sf-${subjectId}-${Date.now()}`,
      subject_id: subjectId,
      faculty_id: facultyEmail,
      academic_year: '2026-27',
      assigned_by: app.currentUser ? app.currentUser.email : 'jugaljagtap@eng.rizvi.edu.in',
      assigned_at: new Date().toISOString()
    };

    if (!app.data.subjectFaculty) app.data.subjectFaculty = [];
    app.data.subjectFaculty.push(sfRecord);
    app.saveState();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('subject_faculty').upsert(sfRecord);
      } catch(err) { console.warn('subject_faculty upsert notice:', err); }
    }

    writeAudit('created', 'subject_faculty', sfRecord.id, { subjectId, facultyEmail });
    app.closeModal();
    app.showToast(`Assigned ${facultyEmail} to teach subject!`, 'success');
    app.renderCurrentView();
  },

  async removeSubjectFaculty(sfId) {
    if (!confirm('Remove this faculty assignment?')) return;
    app.data.subjectFaculty = (app.data.subjectFaculty || []).filter(sf => sf.id !== sfId);
    app.saveState();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('subject_faculty').delete().eq('id', sfId);
      } catch(err) { console.warn('subject_faculty delete notice:', err); }
    }

    writeAudit('deleted', 'subject_faculty', sfId, {});
    app.showToast('Removed faculty assignment', 'info');
    app.renderCurrentView();
  },

  /* ==========================================================================
     STUDENTS MASTER ROSTER & MODALS
     ========================================================================== */
  renderStudentsMaster(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Student Master Roster</h1>
          <p class="page-subtitle">Central Enrolment Directory & Academic Profile Management</p>
        </div>
        <button class="btn btn-primary" onclick="adminView.openAddStudentModal()">+ Add Individual Student</button>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap:12px; align-items:flex-end;">
          <div class="filter-group">
            <label>Search Roster</label>
            <input type="text" id="student-search-input" class="form-input" placeholder="Search by UIN or Name..." oninput="adminView.filterStudentRoster()">
          </div>
          <div class="filter-group">
            <label>Branch</label>
            <select id="student-branch-filter" class="form-select" onchange="adminView.filterStudentRoster()">
              <option value="">All Branches</option>
              ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label>Division</label>
            <select id="student-div-filter" class="form-select" onchange="adminView.filterStudentRoster()">
              <option value="">All Divisions</option>
              <option value="A">Div A</option>
              <option value="B">Div B</option>
              <option value="C">Div C</option>
            </select>
          </div>
          <button class="btn btn-secondary" onclick="adminView.filterStudentRoster()">Filter</button>
        </div>
      </div>

      <div class="card">
        <div class="table-container" style="max-height:500px; overflow-y:auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th class="sortable" onclick="app._sortTable(app.data.students, 'uin')">UIN</th>
                <th class="sortable" onclick="app._sortTable(app.data.students, 'name')">Student Name</th>
                <th>Email</th>
                <th>Branch</th>
                <th>Division / Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="student-table-body">
              ${this.buildStudentRows(app.data.students)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  buildStudentRows(studentsList) {
    if (studentsList.length === 0) return `<tr><td colspan="6" style="text-align:center; padding:20px;">No student records found.</td></tr>`;
    return studentsList.map(s => `
      <tr>
        <td class="mono-val" style="font-weight:700;">${s.uin}</td>
        <td style="font-weight:600;">${s.name}</td>
        <td style="font-size:12px; color:var(--accent-blue);">${s.email || `${s.uin}@eng.rizvi.edu.in`}</td>
        <td><span class="tag tag-co">${s.branch}</span></td>
        <td><span class="tag tag-bt">Div ${s.division} · ${s.batch}</span></td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-primary btn-sm" onclick="adminView.openStudentProfileModal('${s.id}')">👤 Profile</button>
          <button class="btn btn-ghost btn-sm" onclick="adminView.openEditStudentModal('${s.id}')">✏️ Edit</button>
        </td>
      </tr>
    `).join('');
  },

  filterStudentRoster() {
    const q = (document.getElementById('student-search-input')?.value || '').toLowerCase();
    const bFilter = document.getElementById('student-branch-filter')?.value || '';
    const dFilter = document.getElementById('student-div-filter')?.value || '';

    const filtered = app.data.students.filter(s => {
      const matchQ = (s.name || '').toLowerCase().includes(q) || (s.uin || '').includes(q);
      const matchB = !bFilter || s.branch === bFilter;
      const matchD = !dFilter || s.division === dFilter;
      return matchQ && matchB && matchD;
    });

    const body = document.getElementById('student-table-body');
    if (body) body.innerHTML = this.buildStudentRows(filtered);
  },

  openStudentProfileModal(studentId) {
    const s = app.data.students.find(st => st.id === studentId);
    if (!s) return;

    app.showModal(`🎓 Academic Profile: ${s.name}`, `
      <div style="display:flex; flex-direction:column; gap:16px; min-width:540px;">
        <div class="card" style="background:var(--bg-subtle); border-color:var(--border-strong); padding:16px;">
          <h2 style="font-size:18px; font-weight:800; color:var(--text-primary); margin-bottom:2px;">${s.name}</h2>
          <div style="font-size:12px; color:var(--text-secondary);">
            UIN: <strong class="mono-val">${s.uin}</strong> | Email: <strong style="color:var(--accent-blue);">${s.email}</strong>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <span class="tag tag-co">${s.yearOfStudy || 'FE'}</span>
            <span class="tag tag-co">${s.branch}</span>
            <span class="tag tag-bt">Div ${s.division}</span>
            <span class="tag tag-bt">Batch ${s.batch}</span>
          </div>
        </div>
      </div>
    `);
  },

  /* PART 4 FIX: Full implementations for admin modals */
  openAddStudentModal() {
    app.showModal('Add New Student to Master Roster', `
      <form onsubmit="adminView.saveNewStudent(event)">
        <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="st-name" class="form-input" required></div>
        <div class="form-group"><label class="form-label">UIN (Unique Identification Number)</label><input type="text" id="st-uin" class="form-input code-font" required></div>
        <div class="form-group"><label class="form-label">Email Address</label><input type="email" id="st-email" class="form-input code-font" required></div>
        <div class="form-group">
          <label class="form-label">Branch</label>
          <select id="st-branch" class="form-select" required>
            ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group"><label class="form-label">Division</label><input type="text" id="st-div" class="form-input" value="A" required></div>
          <div class="form-group"><label class="form-label">Batch</label><input type="text" id="st-batch" class="form-input" value="A1" required></div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Student</button>
        </div>
      </form>
    `);
  },

  async saveNewStudent(e) {
    e.preventDefault();
    const stRecord = {
      id: 'st-' + Date.now(),
      uin: document.getElementById('st-uin').value.trim(),
      name: document.getElementById('st-name').value.trim(),
      email: document.getElementById('st-email').value.trim(),
      branch: document.getElementById('st-branch').value,
      division: document.getElementById('st-div').value,
      batch: document.getElementById('st-batch').value,
      yearOfStudy: 'FE'
    };

    app.data.students.push(stRecord);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try { await supabaseClient.from('students').upsert(stRecord); } catch(err) { console.warn('Student insert notice:', err); }
    }
    writeAudit('created', 'student', stRecord.id, stRecord);
    app.closeModal();
    app.showToast(`Added student ${stRecord.name}`, 'success');
    app.renderCurrentView();
  },

  openEditStudentModal(id) {
    const s = app.data.students.find(st => st.id === id);
    if (!s) return;
    app.showModal(`Edit Student: ${s.name}`, `
      <form onsubmit="adminView.saveEditedStudent(event, '${s.id}')">
        <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="st-edit-name" class="form-input" value="${s.name}" required></div>
        <div class="form-group"><label class="form-label">UIN</label><input type="text" id="st-edit-uin" class="form-input code-font" value="${s.uin}" required></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="st-edit-email" class="form-input code-font" value="${s.email}" required></div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Student</button>
        </div>
      </form>
    `);
  },

  async saveEditedStudent(e, id) {
    e.preventDefault();
    const s = app.data.students.find(st => st.id === id);
    if (!s) return;
    s.name = document.getElementById('st-edit-name').value;
    s.uin = document.getElementById('st-edit-uin').value;
    s.email = document.getElementById('st-edit-email').value;
    app.saveState();
    writeAudit('updated', 'student', id, s);
    app.closeModal();
    app.showToast('Updated student profile', 'success');
    app.renderCurrentView();
  },

  openAddSubjectModal(deptId) {
    app.showModal('Add New Subject Course', `
      <form onsubmit="adminView.saveNewSubject(event, '${deptId}')">
        <div class="form-group"><label class="form-label">Subject Code (e.g. VMD, EM)</label><input type="text" id="sub-code" class="form-input code-font" required></div>
        <div class="form-group"><label class="form-label">Full Subject Name</label><input type="text" id="sub-fullname" class="form-input" required></div>
        <div class="form-group">
          <label class="form-label">Semester</label>
          <select id="sub-sem" class="form-select" required>
            <option value="Semester I">Semester I</option>
            <option value="Semester II">Semester II</option>
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Subject</button>
        </div>
      </form>
    `);
  },

  async saveNewSubject(e, deptId) {
    e.preventDefault();
    const subRecord = {
      id: 'sub-' + Date.now(),
      code: document.getElementById('sub-code').value.trim(),
      name: document.getElementById('sub-fullname').value.trim(),
      fullName: document.getElementById('sub-fullname').value.trim(),
      departmentId: deptId,
      semester: document.getElementById('sub-sem').value
    };
    app.data.subjects.push(subRecord);
    app.saveState();
    writeAudit('created', 'subject', subRecord.id, subRecord);
    app.closeModal();
    app.showToast(`Created subject ${subRecord.code}`, 'success');
    app.renderCurrentView();
  },

  openAttainmentModal() {
    app.showModal('⚙️ Attainment Threshold Settings', `
      <form onsubmit="adminView.saveAttainmentSettings(event)">
        <div class="form-group">
          <label class="form-label">Student Target Score Threshold (%)</label>
          <input type="number" id="threshold-student" class="form-input" value="${app.data.attainmentSettings?.studentThresholdPct || 60}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Class Attainment Target (%)</label>
          <input type="number" id="threshold-class" class="form-input" value="${app.data.attainmentSettings?.classTargetPct || 70}" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Settings</button>
        </div>
      </form>
    `);
  },

  saveAttainmentSettings(e) {
    e.preventDefault();
    app.data.attainmentSettings = {
      studentThresholdPct: parseInt(document.getElementById('threshold-student').value),
      classTargetPct: parseInt(document.getElementById('threshold-class').value)
    };
    app.saveState();
    app.closeModal();
    app.showToast('Attainment thresholds saved!', 'success');
  },

  renderFacultyRoster(container) {
    container.innerHTML = `
      <div class="page-header-container"><div><h1 class="page-title">Faculty Roster</h1></div></div>
      <div class="card">
        <div class="table-container">
          <table class="custom-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
            <tbody>${app.data.faculty.map(f => `<tr><td>${f.name}</td><td>${f.email}</td><td>${f.role}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderDepartments(container) { this.renderAdminHome(container); },
  renderPOAccreditation(container) { nbaView.renderInstituteView(container); },
  renderGoogleAuthSettings(container) { analyticsView.renderReportsTab(container); }
};
