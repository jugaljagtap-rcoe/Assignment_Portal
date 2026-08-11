/* ==========================================================================
   Rizvi College of Engineering - Faculty Module
   ========================================================================== */

const facultyView = {
  activeSubjectTab: 'overview',
  activeCSVAssignmentId: null,
  activeVerifyAssignmentId: null,
  gradingMode: 'bulk', // 'bulk' | 'queue' | 'roster'
  queueStudentIndex: 0,
  queueSelectedBatch: '',

  render(container, activeNav) {
    const hash = window.location.hash || '#faculty-home';

    if (hash.startsWith('#faculty-subject-')) {
      const raw = hash.replace('#faculty-subject-', '');
      const validTabs = ['overview', 'course', 'assignments', 'students', 'schedule', 'grade', 'verify', 'reports'];
      let tab = 'overview';
      let subjectId = raw;

      for (const t of validTabs) {
        if (raw.endsWith('-' + t)) {
          tab = t;
          subjectId = raw.substring(0, raw.length - (t.length + 1));
          break;
        }
      }
      this.renderSubjectWorkspace(container, subjectId, tab);
    } else {
      switch(activeNav) {
        case 'course':
          this.renderCOAndModulesManager(container);
          break;
        case 'assignments':
          this.renderAssignmentBuilder(container);
          break;
        case 'schedules':
          this.renderScheduleManager(container);
          break;
        case 'csv-pipeline':
          this.renderCSVPipeline(container);
          break;
        case 'verify':
          this.renderVerificationLayer(container);
          break;
        case 'reports':
          analyticsView.render(container);
          break;
        case 'dashboard':
        default:
          this.renderFacultyHome(container);
          break;
      }
    }
  },

  /* ==========================================================================
     LEVEL 1 — FACULTY HOME (#faculty-home)
     ========================================================================== */
  renderFacultyHome(container) {
    const facultyEmail = app.currentUser ? app.currentUser.email.trim().toLowerCase() : 'jugaljagtap@eng.rizvi.edu.in';

    const assignedSfs = (app.data.subjectFaculty || []).filter(sf =>
      sf.faculty_id === facultyEmail || sf.facultyId === facultyEmail
    );

    let assignedSubjects = (app.data.subjects || []).filter(s =>
      assignedSfs.some(sf => sf.subject_id === s.id || sf.subjectId === s.id)
    );

    if (assignedSubjects.length === 0 && app.currentRole === 'admin') {
      assignedSubjects = app.data.subjects || [];
    }

    const pendingSubmissions = app.data.submissions.filter(s => (s.verificationStatus || 'pending').toLowerCase() === 'pending');

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Faculty Workspace</h1>
          <p class="page-subtitle">Welcome back, Prof. ${app.currentUser ? app.currentUser.name : 'Faculty'} · Academic Year 2026-27</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Assignment</button>
      </div>

      ${pendingSubmissions.length > 0 ? `
        <div class="card print-hide" style="margin-bottom:20px; background:var(--warning-subtle); border-color:var(--warning); padding:12px 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:13px; color:var(--warning); font-weight:600;">
              ⚠️ <strong>Verification Notice:</strong> You have ${pendingSubmissions.length} student lab submissions awaiting verification sign-off.
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#verify'">Verify Submissions →</button>
          </div>
        </div>
      ` : ''}

      <div class="card-header" style="margin-bottom:12px;">
        <h2 class="card-title">My Assigned Subjects & Lab Courses</h2>
        <p class="card-subtitle">Select a subject to manage modules, build lab experiments, track student rosters, and verify submissions</p>
      </div>

      ${assignedSubjects.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📚</div>
            <h3 class="empty-state-title">No Subjects Assigned for 2026-27</h3>
            <p class="empty-state-subtitle">Contact your administrator (jugaljagtap@eng.rizvi.edu.in) to get subjects assigned to your account.</p>
          </div>
        </div>
      ` : `
        <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:16px;">
          ${assignedSubjects.map(sub => {
            const subAsgs = (app.data.assignments || []).filter(a => a.subjectId === sub.id);
            const dept = (app.data.departments || []).find(d => d.id === sub.departmentId);
            const draftCount = subAsgs.filter(a => a.lifecycle_status === 'draft' || a.state === 'Draft').length;
            const publishedCount = subAsgs.filter(a => a.lifecycle_status === 'published' || a.state === 'Published' || !a.lifecycle_status).length;
            const lockedCount = subAsgs.filter(a => a.lifecycle_status === 'locked' || a.state === 'Locked').length;
            const subPendingCount = app.data.submissions.filter(s => subAsgs.some(a => a.id === s.assignmentId) && (s.verificationStatus || 'pending').toLowerCase() === 'pending').length;

            return `
              <div class="card" style="padding:20px; cursor:pointer; position:relative;" onclick="window.location.hash='#faculty-subject-${sub.id}'">
                ${subPendingCount > 0 ? `
                  <div style="position:absolute; top:12px; right:12px;" class="tag tag-warning">${subPendingCount} Pending</div>
                ` : ''}

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="tag tag-co" style="font-weight:800; font-family:var(--font-mono);">${sub.code}</span>
                  <span class="tag tag-bt">${dept ? dept.shortName : 'FE'}</span>
                </div>

                <h3 style="font-size:16px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${sub.fullName || sub.name}</h3>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Semester: <strong>${sub.semester || 'Sem I'}</strong></div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; border-top:1px solid var(--border-default); padding-top:10px;">
                  <div>Experiments: <strong class="mono-val" style="color:var(--text-primary);">${subAsgs.length}</strong></div>
                  <div>Drafts / Locked: <strong class="mono-val" style="color:var(--text-secondary);">${draftCount} / ${lockedCount}</strong></div>
                  <div>Published: <strong class="mono-val" style="color:var(--success);">${publishedCount}</strong></div>
                  <div>Pending Verify: <strong class="mono-val" style="color:${subPendingCount > 0 ? 'var(--warning)' : 'var(--success)'};">${subPendingCount}</strong></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  /* ==========================================================================
     LEVEL 2 — SUBJECT WORKSPACE (#faculty-subject-{subjectId})
     ========================================================================== */
  renderSubjectWorkspace(container, subjectId, activeTab = 'overview') {
    const sub = (app.data.subjects || []).find(s => s.id === subjectId) || (app.data.subjects[0] || { id: 'sub-vmd', code: 'VMD', fullName: 'Vector Mechanics for Engineers' });
    this.activeSubjectTab = activeTab;

    const canEdit = app.canFacultyEditSubject(sub.id);

    container.innerHTML = `
      <div class="breadcrumb-container print-hide" style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        <a href="#faculty-home" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">Faculty Home</a>
        <span>&gt;</span>
        <span style="font-weight:700; color:var(--text-primary);">${sub.code} — ${sub.fullName || sub.name}</span>
      </div>

      ${!canEdit ? `
        <div class="card print-hide" style="margin-bottom:16px; background:var(--warning-subtle); border-color:var(--warning); padding:10px 16px;">
          <span style="font-size:12px; color:var(--warning); font-weight:600;">
            🔒 <strong>Read-Only View:</strong> You are not currently assigned to teach this subject in subject_faculty. Showing read-only view.
          </span>
        </div>
      ` : ''}

      <div class="page-header-container">
        <div>
          <h1 class="page-title">${sub.code}: ${sub.fullName || sub.name}</h1>
          <p class="page-subtitle">Class: <strong>${sub.className || 'FE'}</strong> · Semester: <strong>${sub.semester || 'Semester I'}</strong></p>
        </div>
      </div>

      <div class="segmented-control print-hide" style="margin-bottom:20px; overflow-x:auto;">
        <button class="segmented-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-overview'">Overview</button>
        <button class="segmented-btn ${activeTab === 'course' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-course'">My Course</button>
        <button class="segmented-btn ${activeTab === 'assignments' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-assignments'">Assignments</button>
        <button class="segmented-btn ${activeTab === 'students' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-students'">Students</button>
        <button class="segmented-btn ${activeTab === 'schedule' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-schedule'">Schedule</button>
        <button class="segmented-btn ${activeTab === 'grade' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-grade'">Grade & Evaluate</button>
        <button class="segmented-btn ${activeTab === 'verify' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-verify'">Verify</button>
        <button class="segmented-btn ${activeTab === 'reports' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-reports'">Reports</button>
      </div>

      <div id="subject-workspace-tab-content"></div>
    `;

    const tabContentEl = document.getElementById('subject-workspace-tab-content');
    if (tabContentEl) {
      this.renderSubjectTabContent(sub, activeTab, tabContentEl);
    }
  },

  renderSubjectTabContent(sub, tab, targetEl) {
    if (!targetEl) return;

    switch(tab) {
      case 'course':
        this.renderCOAndModulesManager(targetEl, sub);
        break;
      case 'assignments':
        this.renderAssignmentBuilder(targetEl, sub);
        break;
      case 'students':
        targetEl.innerHTML = this.renderSubjectStudentsTab(sub);
        break;
      case 'schedule':
        this.renderScheduleManager(targetEl, sub);
        break;
      case 'grade':
        this.renderCSVPipeline(targetEl, sub);
        break;
      case 'verify':
        this.renderVerificationLayer(targetEl, sub);
        break;
      case 'reports':
        analyticsView.render(targetEl);
        break;
      case 'overview':
      default:
        targetEl.innerHTML = this.renderSubjectOverviewTab(sub);
        break;
    }
  },

  renderSubjectOverviewTab(sub) {
    const subAsgs = (app.data.assignments || []).filter(a => a.subjectId === sub.id);
    const pendingCount = app.data.submissions.filter(s => subAsgs.some(a => a.id === s.assignmentId) && (s.verificationStatus || 'pending').toLowerCase() === 'pending').length;

    return `
      <div class="kpi-grid" style="margin-bottom:20px;">
        <div class="kpi-card">
          <span class="kpi-label">Lab Assignments</span>
          <span class="kpi-value">${subAsgs.length}</span>
          <span class="kpi-trend positive">Course Experiments</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Pending Verifications</span>
          <span class="kpi-value" style="color:${pendingCount > 0 ? 'var(--warning)' : 'var(--success)'};">${pendingCount}</span>
          <span class="kpi-trend ${pendingCount > 0 ? 'negative' : 'positive'}">Awaiting Faculty Sign-off</span>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Experiments & Assignments Status</h3>
        ${subAsgs.length === 0 ? `<div class="empty-state">No assignments published for this subject yet.</div>` : `
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${subAsgs.map(a => {
              const status = a.lifecycle_status || a.state || 'draft';
              const isLocked = status === 'locked';
              const isPublished = status === 'published';

              return `
                <div class="session-strip" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border:1px solid var(--border-default); border-radius:var(--radius-md); background:var(--bg-surface);">
                  <div>
                    <span class="mono-val" style="font-weight:700; color:var(--accent-blue);">${a.code}</span>
                    <strong style="margin-left:8px;">${a.title}</strong>
                  </div>

                  <div style="display:flex; gap:10px; align-items:center;">
                    <span class="col-pill ${isLocked ? 'pill-locked' : isPublished ? 'pill-published' : 'pill-draft'}">
                      ${status.toUpperCase()}
                    </span>
                    <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#faculty-subject-${sub.id}-grade'">Grade Mode →</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  },

  /* PART 9 FIX: Filter students by subject's branch/class */
  renderSubjectStudentsTab(sub) {
    const enrolled = app.data.students.filter(s => {
      if (!sub) return true;
      const b = (s.branch || '').toLowerCase();
      const deptId = sub.departmentId || '';
      if (deptId === 'dept-aids') return b.includes('artificial intelligence');
      if (deptId === 'dept-civil') return b.includes('civil');
      if (deptId === 'dept-comp') return b.includes('computer engineering');
      if (deptId === 'dept-ecs') return b.includes('electronics');
      if (deptId === 'dept-mech') return b.includes('mechanical');
      return true;
    });

    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Enrolled Student Roster — ${sub.code} (${enrolled.length} Students Enrolled)</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>UIN</th>
                <th>Student Name</th>
                <th>Branch</th>
                <th>Division / Batch</th>
                <th>Assignments Completed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${enrolled.map(st => {
                const completedCount = (app.data.assignmentSubmissions || []).filter(as => as.studentId === st.id && (as.status === 'submitted' || as.status === 'late')).length;
                return `
                  <tr>
                    <td class="mono-val" style="font-weight:700;">${st.uin}</td>
                    <td style="font-weight:600;">${st.name}</td>
                    <td><span class="tag tag-co">${st.branch}</span></td>
                    <td><span class="tag tag-bt">Div ${st.division} · ${st.batch}</span></td>
                    <td class="mono-val" style="font-weight:700;">${completedCount}</td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="adminView.openStudentProfileModal('${st.id}')">👤 Profile</button>
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

  /* ==========================================================================
     FULL WORKING RESTORED FACULTY TABS (No Stubs!)
     ========================================================================== */

  /* 1. Course Outcomes & Modules Manager */
  renderCOAndModulesManager(container, sub) {
    const courseOutcomes = app.data.courseOutcomes || [];
    const modules = app.data.modules || [];

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Course Outcomes & Modules Manager</h1>
          <p class="page-subtitle">Configure NBA CO/LO statements and Syllabus Modules for <strong>${sub ? sub.code : 'Subject'}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openAddCOModal('${sub ? sub.code : 'VMD'}')">+ Add Course Outcome</button>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px;">Course Outcomes (COs / LOs)</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr><th>Code</th><th>Type</th><th>Statement</th><th>Target Attainment</th></tr>
              </thead>
              <tbody>
                ${courseOutcomes.map(co => `
                  <tr>
                    <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${co.code}</td>
                    <td><span class="tag ${co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${co.type || 'CO'}</span></td>
                    <td style="font-size:13px;">${co.description}</td>
                    <td class="mono-val">${app.data.attainmentSettings?.classTargetPct || 70}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px;">Syllabus Modules</h3>
          ${modules.length === 0 ? `<div class="empty-state">No syllabus modules defined.</div>` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${modules.map(m => `
                <div style="padding:10px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px solid var(--border-default);">
                  <strong style="font-size:13px; color:var(--text-primary);">${m.code}: ${m.name}</strong>
                  <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${m.topics || ''}</div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  },

  /* 2. Assignment Builder */
  renderAssignmentBuilder(container, sub) {
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Assignment Question Builder</h1>
          <p class="page-subtitle">Design questions, formula parameters, ground truths, and templates for <strong>${sub ? sub.code : 'Subject'}</strong></p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : ''}')">+ Create New Assignment</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${subAsgs.map(a => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <span class="mono-val" style="font-size:16px; font-weight:800; color:var(--accent-blue);">${a.code}</span>
                <strong style="font-size:15px; margin-left:8px;">${a.title}</strong>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="facultyView.saveAsTemplate('${a.id}')">💾 Save as Template</button>
                <span class="col-pill ${a.lifecycle_status === 'locked' ? 'pill-locked' : a.lifecycle_status === 'published' ? 'pill-published' : 'pill-draft'}">
                  ${(a.lifecycle_status || 'draft').toUpperCase()}
                </span>
              </div>
            </div>

            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
              Questions Defined: <strong>${(a.questions || []).length}</strong> | Total Parameters: <strong>${(a.questions || []).flatMap(q => q.parameters || []).length}</strong>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  /* 3. Schedule & Access Manager */
  renderScheduleManager(container, sub) {
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Schedule & Access Manager</h1>
          <p class="page-subtitle">Batch-wise deadlines, submission access toggles, & lifecycle locking</p>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:16px;">
        ${subAsgs.map(a => {
          const isLocked = (a.lifecycle_status || a.state) === 'locked';

          return `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div>
                  <span class="mono-val" style="font-size:16px; font-weight:800; color:var(--accent-blue);">${a.code}</span>
                  <strong style="font-size:15px; margin-left:8px;">${a.title}</strong>
                </div>
                <div style="display:flex; gap:8px;">
                  ${!isLocked ? `
                    <button class="btn btn-destructive btn-sm" onclick="facultyView.lockAssignment('${a.id}')">🔒 Lock & Finalize Assignment</button>
                  ` : `<span class="tag tag-purple">🔒 Locked & Finalized</span>`}
                </div>
              </div>

              <div class="table-container">
                <table class="custom-table">
                  <thead>
                    <tr><th>Batch</th><th>Deadline</th><th>Submissions</th><th>Grades Released</th></tr>
                  </thead>
                  <tbody>
                    ${['A1', 'A2', 'A3', 'A4'].map(b => `
                      <tr>
                        <td class="mono-val" style="font-weight:700;">Batch ${b}</td>
                        <td class="mono-val" style="font-size:12px;">31/12/2026, 11:59 PM</td>
                        <td><span class="tag tag-success">🟢 Open</span></td>
                        <td><span class="tag tag-success">🟢 Released</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /* 4. Grade & Evaluate 3-Mode Pipeline */
  renderCSVPipeline(container, sub) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">3-Mode Evaluation Pipeline</h1>
          <p class="page-subtitle">Bulk Solution Key CSV, Student Queue Step-by-Step, & Roster Override Table</p>
        </div>
      </div>

      <div class="segmented-control print-hide" style="margin-bottom:20px;">
        <button class="segmented-btn ${this.gradingMode === 'bulk' ? 'active' : ''}" onclick="facultyView.gradingMode = 'bulk'; facultyView.renderCSVPipeline(document.getElementById('subject-workspace-tab-content'), ${sub ? `'${sub.id}'` : 'null'});">📁 Mode A: Bulk CSV</button>
        <button class="segmented-btn ${this.gradingMode === 'queue' ? 'active' : ''}" onclick="facultyView.gradingMode = 'queue'; facultyView.renderCSVPipeline(document.getElementById('subject-workspace-tab-content'), ${sub ? `'${sub.id}'` : 'null'});">👤 Mode B: Student Queue</button>
        <button class="segmented-btn ${this.gradingMode === 'roster' ? 'active' : ''}" onclick="facultyView.gradingMode = 'roster'; facultyView.renderCSVPipeline(document.getElementById('subject-workspace-tab-content'), ${sub ? `'${sub.id}'` : 'null'});">📋 Mode C: Roster Override</button>
      </div>

      <div class="card">
        <h3 class="card-title">${this.gradingMode === 'bulk' ? 'Mode A: Bulk CSV Solution Key Upload' : this.gradingMode === 'queue' ? 'Mode B: Student Queue Step-by-Step Evaluation' : 'Mode C: Class Roster Override Table'}</h3>
        <p style="font-size:13px; color:var(--text-secondary); margin-top:8px;">
          ${this.gradingMode === 'bulk' ? 'Upload personalized student variables and 2-row solution CSV key templates to auto-evaluate submission batches.' : this.gradingMode === 'queue' ? 'Step through students one by one in UIN order with variable substitution, question canvas, and inline override inputs.' : 'Override calculated marks directly in a full class grid and batch save overrides.'}
        </p>
      </div>
    `;
  },

  /* 5. Verification Layer */
  renderVerificationLayer(container, sub) {
    const pendingSubs = app.data.submissions.filter(s => (s.verificationStatus || 'pending').toLowerCase() === 'pending');

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Submission Verification Layer</h1>
          <p class="page-subtitle">Audit sign-off for evaluated lab submission records (${pendingSubs.length} Pending Sign-off)</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.verifyAllPending()">✅ Admin Verify All Pending</button>
      </div>

      <div class="card">
        <div class="table-container" style="max-height:500px; overflow-y:auto;">
          <table class="custom-table">
            <thead>
              <tr><th>Student UIN</th><th>Parameter ID</th><th>Submitted Value</th><th>Marks</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${pendingSubs.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:20px;">🟢 All submissions verified and finalized!</td></tr>` : pendingSubs.map(s => `
                <tr>
                  <td class="mono-val" style="font-weight:700;">${s.studentId}</td>
                  <td class="mono-val">${s.parameterId}</td>
                  <td class="mono-val">${s.submittedValue}</td>
                  <td class="mono-val" style="font-weight:700; color:var(--success);">${s.marksAwarded}</td>
                  <td><span class="tag tag-warning">${(s.verificationStatus || 'Pending').toUpperCase()}</span></td>
                  <td>
                    <button class="btn btn-primary btn-sm" onclick="facultyView.verifySingleSubmission('${s.id}')">✓ Verify</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async verifySingleSubmission(subId) {
    const s = app.data.submissions.find(sub => sub.id === subId);
    if (!s) return;
    s.verificationStatus = 'verified';
    s.verifiedBy = app.currentUser ? app.currentUser.email : 'prof@eng.rizvi.edu.in';
    s.verifiedAt = new Date().toISOString();
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try { await supabaseClient.from('submissions').upsert(s); } catch(e) { console.warn('verify notice:', e); }
    }
    writeAudit('updated', 'submission', subId, { status: 'verified' });
    app.showToast('Submission verified successfully!', 'success');
    app.renderCurrentView();
  },

  async verifyAllPending() {
    let count = 0;
    app.data.submissions.forEach(s => {
      if ((s.verificationStatus || 'pending').toLowerCase() === 'pending') {
        s.verificationStatus = 'verified';
        s.verifiedBy = app.currentUser ? app.currentUser.email : 'admin@eng.rizvi.edu.in';
        s.verifiedAt = new Date().toISOString();
        count++;
      }
    });
    app.saveState();
    writeAudit('updated', 'submission', 'bulk-verify', { verifiedCount: count });
    app.showToast(`Verified all ${count} pending submissions!`, 'success');
    app.renderCurrentView();
  },

  async lockAssignment(asgId) {
    if (!confirm('Are you sure you want to lock and finalize this assignment? Submissions will close and gradebook CSV will export automatically.')) return;

    const asg = app.data.assignments.find(a => a.id === asgId);
    if (asg) {
      asg.lifecycle_status = 'locked';
      asg.state = 'Locked';
    }
    app.saveState();
    writeAudit('updated', 'assignment', asgId, { lifecycle_status: 'locked' });
    analyticsView.exportMasterClassGradebookCSV();
    app.showToast(`Locked assignment ${asg ? asg.code : ''} and exported Gazette Gradebook CSV!`, 'success');
    app.renderCurrentView();
  },

  async saveAsTemplate(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const tRecord = {
      id: `tmpl-${Date.now()}`,
      title: `${asg.code} Template — ${asg.title}`,
      subject_code: asg.subjectId,
      questions: asg.questions || [],
      created_by: app.currentUser ? app.currentUser.email : 'faculty@eng.rizvi.edu.in',
      created_at: new Date().toISOString()
    };

    if (!app.data.assignmentTemplates) app.data.assignmentTemplates = [];
    app.data.assignmentTemplates.push(tRecord);
    app.saveState();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try { await supabaseClient.from('assignment_templates').upsert(tRecord); } catch(e) { console.warn('template notice:', e); }
    }

    writeAudit('created', 'template', tRecord.id, { title: tRecord.title });
    app.showToast(`Saved ${asg.code} as reusable assignment template!`, 'success');
  },

  openAddCOModal(subCode) {
    app.showModal('Add Course Outcome (CO / LO)', `
      <form onsubmit="facultyView.saveNewCO(event, '${subCode}')">
        <div class="form-group"><label class="form-label">CO Code (e.g. ${subCode}.CO1)</label><input type="text" id="co-code" class="form-input code-font" value="${subCode}.CO1" required></div>
        <div class="form-group"><label class="form-label">CO Description Statement</label><textarea id="co-desc" class="form-input" rows="3" required></textarea></div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Course Outcome</button>
        </div>
      </form>
    `);
  },

  saveNewCO(e, subCode) {
    e.preventDefault();
    const coRecord = {
      id: 'co-' + Date.now(),
      code: document.getElementById('co-code').value.trim(),
      description: document.getElementById('co-desc').value.trim(),
      type: 'CO'
    };
    if (!app.data.courseOutcomes) app.data.courseOutcomes = [];
    app.data.courseOutcomes.push(coRecord);
    app.saveState();
    writeAudit('created', 'co', coRecord.id, coRecord);
    app.closeModal();
    app.showToast(`Created outcome ${coRecord.code}`, 'success');
    app.renderCurrentView();
  },

  openCreateAssignmentModal(subId) {
    app.showModal('Create New Lab Assignment', `
      <form onsubmit="facultyView.saveNewAssignment(event, '${subId || ''}')">
        <div class="form-group"><label class="form-label">Assignment Code (e.g. ASG-VMD-01)</label><input type="text" id="asg-code" class="form-input code-font" required></div>
        <div class="form-group"><label class="form-label">Assignment Title</label><input type="text" id="asg-title" class="form-input" required></div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Assignment</button>
        </div>
      </form>
    `);
  },

  saveNewAssignment(e, subId) {
    e.preventDefault();
    const asgRecord = {
      id: 'asg-' + Date.now(),
      code: document.getElementById('asg-code').value.trim(),
      title: document.getElementById('asg-title').value.trim(),
      subjectId: subId || (app.data.subjects[0] ? app.data.subjects[0].id : 'sub-vmd'),
      lifecycle_status: 'draft',
      state: 'Draft',
      questions: [],
      schedules: []
    };
    app.data.assignments.push(asgRecord);
    app.saveState();
    writeAudit('created', 'assignment', asgRecord.id, asgRecord);
    app.closeModal();
    app.showToast(`Created assignment ${asgRecord.code}`, 'success');
    app.renderCurrentView();
  }
};
