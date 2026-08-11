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
        <!-- Assignment creation is done inside a subject workspace only -->
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

    const subClass = (INITIAL_DATA.academicClasses || []).find(c =>
      c.departmentId === sub.departmentId &&
      (c.semesters || []).includes(sub.semester)
    );
    const classLabel = subClass ? subClass.code : (sub.className || sub.class_name || '—');

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
          <p class="page-subtitle">Class: <strong>${classLabel}</strong> · Semester: <strong>${sub.semester || 'Semester I'}</strong></p>
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

  coManagerSubTab: 'co_modules',

  switchCOManagerSubTab(subTab, subjectId) {
    this.coManagerSubTab = subTab;
    const sub = (app.data.subjects || []).find(s => s.id === subjectId);
    const container = document.getElementById('subject-workspace-tab-content');
    if (container && sub) {
      this.renderCOAndModulesManager(container, sub);
    } else {
      app.renderCurrentView();
    }
  },

  renderSubjectOverviewTab(sub) {
    try {
      const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);
      const subAsgIds = subAsgs.map(a => a.id);
      const pendingCount = (app.data.submissions || []).filter(s => subAsgIds.includes(s.assignmentId) && (s.verificationStatus || 'pending').toLowerCase() === 'pending').length;

      const subjectAuditLogs = (app.data.auditLogs || []).filter(log => {
        if (!sub) return true;
        if (log.entity_id === sub.id) return true;
        if (subAsgIds.includes(log.entity_id)) return true;
        if (log.snapshot && (log.snapshot.subjectId === sub.id || log.snapshot.subject_id === sub.id)) return true;
        return false;
      }).slice(0, 5);

      return `
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : ''}')">+ Create Assignment</button>
          <button class="btn btn-secondary btn-sm" onclick="facultyView.openAddCOModal('${sub ? sub.code : 'VMD'}')">+ Add CO</button>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#faculty-subject-${sub ? sub.id : ''}-students'">👥 View Enrolled Students</button>
        </div>

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

        <div class="card" style="margin-bottom:20px;">
          <h3 class="card-title" style="margin-bottom:12px;">Experiments & Assignments Status</h3>
          ${subAsgs.length === 0 ? `
            <div class="empty-state" style="padding:24px; text-align:center;">
              <p style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">No assignments created for this subject yet.</p>
              <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Click below to create your first experiment assignment.</p>
              <button class="btn btn-primary btn-sm" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : ''}')">+ Create Assignment</button>
            </div>
          ` : `
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
                      <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#faculty-subject-${sub ? sub.id : ''}-grade'">Grade Mode →</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:12px;">Recent Audit Activity — ${sub ? sub.code : ''}</h3>
          ${subjectAuditLogs.length === 0 ? `
            <p style="font-size:12px; color:var(--text-secondary); margin:0;">No recent audit activity logged for this subject.</p>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${subjectAuditLogs.map(log => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-subtle); border-radius:var(--radius-md); font-size:12px;">
                  <div>
                    <span class="tag tag-co" style="font-weight:700;">${log.action ? log.action.toUpperCase() : 'LOG'}</span>
                    <span style="font-weight:600; color:var(--text-primary); margin-left:6px;">${log.entity_type || 'entity'}</span>
                    <span style="color:var(--text-secondary);">by ${log.changed_by || 'system'}</span>
                  </div>
                  <span class="mono-val" style="color:var(--text-tertiary); font-size:11px;">${log.changed_at ? new Date(log.changed_at).toLocaleString() : ''}</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } catch(err) {
      console.error('renderSubjectOverviewTab error:', err);
      return `<div class="empty-state">Error loading overview for this subject.</div>`;
    }
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

  renderCOAndModulesManager(container, sub) {
    const activeSubTab = this.coManagerSubTab || 'co_modules';

    const courseOutcomes = (app.data.courseOutcomes || []).filter(co =>
      !sub || co.subjectId === sub?.id || co.subject_id === sub?.id
    );
    const modules = (app.data.modules || []).filter(m =>
      !sub || m.subjectId === sub?.id || m.subject_id === sub?.id
    );

    const allTargets = [...PO_LIST.map(p => p.code), ...PSO_LIST.map(p => p.code)];

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Course Outcomes & Modules Manager</h1>
          <p class="page-subtitle">Configure NBA CO/LO statements, Bloom's Taxonomy, Syllabus Modules, and CO-PO-PSO Attainment Matrix for <strong>${sub ? sub.code : 'Subject'}</strong></p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-sm" onclick="facultyView.openAddModuleModal('${sub ? sub.id : ''}')">+ Add Module</button>
          <button class="btn btn-primary btn-sm" onclick="facultyView.openAddCOModal('${sub ? sub.code : 'VMD'}')">+ Add Course Outcome</button>
        </div>
      </div>

      <div class="segmented-control print-hide" style="margin-bottom:20px; overflow-x:auto;">
        <button class="segmented-btn ${activeSubTab === 'co_modules' ? 'active' : ''}" onclick="facultyView.switchCOManagerSubTab('co_modules', '${sub ? sub.id : ''}')">
          🎯 Course Outcomes & Syllabus Modules
        </button>
        <button class="segmented-btn ${activeSubTab === 'co_po_matrix' ? 'active' : ''}" onclick="facultyView.switchCOManagerSubTab('co_po_matrix', '${sub ? sub.id : ''}')">
          📊 CO–PO–PSO Mapping Matrix
        </button>
        <button class="segmented-btn ${activeSubTab === 'co_bt_module' ? 'active' : ''}" onclick="facultyView.switchCOManagerSubTab('co_bt_module', '${sub ? sub.id : ''}')">
          🧠 CO–BT–Module Mapping
        </button>
      </div>

      ${activeSubTab === 'co_modules' ? `
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
          <div class="card">
            <h3 class="card-title" style="margin-bottom:12px;">Course Outcomes (COs / LOs)</h3>
            <div class="table-container">
              <table class="custom-table">
                <thead>
                  <tr><th>Code</th><th>Type</th><th>Statement</th><th>Target Attainment</th><th>CO → BT Level</th></tr>
                </thead>
                <tbody>
                  ${courseOutcomes.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-secondary);">No course outcomes created yet.</td></tr>` : courseOutcomes.map(co => `
                    <tr>
                      <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${co.code}</td>
                      <td><span class="tag ${co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${co.type || 'CO'}</span></td>
                      <td style="font-size:13px;">${co.description}</td>
                      <td class="mono-val">${app.data.attainmentSettings?.classTargetPct || 70}%</td>
                      <td>
                        <select class="form-select btn-sm" onchange="facultyView.saveCOBTLevel('${co.id}', this.value)" style="padding:2px 6px; font-size:12px; font-weight:700;">
                          ${['BT1', 'BT2', 'BT3', 'BT4', 'BT5', 'BT6'].map(bt => `<option value="${bt}" ${(co.btLevel || co.bt_level || 'BT2') === bt ? 'selected' : ''}>${bt}</option>`).join('')}
                        </select>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 class="card-title" style="margin:0;">Syllabus Modules</h3>
              <button class="btn btn-ghost btn-sm" onclick="facultyView.openAddModuleModal('${sub ? sub.id : ''}')">+ Add</button>
            </div>
            ${modules.length === 0 ? `<div class="empty-state">No syllabus modules defined.</div>` : `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${modules.map(m => `
                  <div style="padding:10px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px solid var(--border-default);">
                    <strong style="font-size:13px; color:var(--text-primary);">${m.code || m.module_code || ''}: ${m.name || m.module_name || m.title || 'Unnamed Module'}</strong>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${m.topics || ''}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      ` : activeSubTab === 'co_po_matrix' ? `
        <!-- SUB-TAB B: CO-PO-PSO MAPPING MATRIX -->
        <div class="card">
          <div style="margin-bottom:14px;">
            <h3 class="card-title">CO–PO–PSO Attainment Mapping Matrix (${sub ? sub.code : ''})</h3>
            <p class="card-subtitle" style="font-size:12px; color:var(--text-secondary);">Set correlation strength: 1 = Low (Direct Mapping), 2 = Medium (Moderate Correlation), 3 = High (Strong Alignment)</p>
          </div>

          ${courseOutcomes.length === 0 ? `<div class="empty-state">Please create Course Outcomes (COs) for this subject first before configuring the PO/PSO matrix.</div>` : `
            <div class="table-container" style="overflow-x:auto;">
              <table class="custom-table" style="font-size:12px;">
                <thead>
                  <tr>
                    <th style="min-width:70px;">CO Code</th>
                    <th style="min-width:200px;">CO Statement</th>
                    ${allTargets.map(t => `<th style="text-align:center; min-width:55px;">${t}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${courseOutcomes.map(co => `
                    <tr>
                      <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${co.code}</td>
                      <td style="font-size:12px; max-width:240px; white-space:normal; line-height:1.3;">${co.description}</td>
                      ${allTargets.map(targetCode => {
                        const existingMap = (app.data.coPOMapping || []).find(m =>
                          (m.co_id === co.id || m.coId === co.id) &&
                          (m.po_id === targetCode || m.poId === targetCode)
                        );
                        const curStrength = existingMap ? (existingMap.strength || '') : '';
                        return `
                          <td style="padding:4px; text-align:center;">
                            <select class="form-select btn-sm" style="padding:2px; font-size:11px; width:52px; text-align:center; font-weight:700;" onchange="facultyView.saveCOPOMapping('${co.id}', '${targetCode}', this.value, '${sub ? sub.id : ''}')">
                              <option value="" ${curStrength === '' ? 'selected' : ''}>-</option>
                              <option value="1" ${curStrength == 1 ? 'selected' : ''}>1</option>
                              <option value="2" ${curStrength == 2 ? 'selected' : ''}>2</option>
                              <option value="3" ${curStrength == 3 ? 'selected' : ''}>3</option>
                            </select>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr style="background:var(--bg-subtle); font-weight:800; border-top:2px solid var(--border-strong);">
                    <td colspan="2" style="text-align:right; font-size:12px; color:var(--text-primary);">Column Mapping Averages:</td>
                    ${allTargets.map(targetCode => {
                      const colMappings = (app.data.coPOMapping || []).filter(m =>
                        courseOutcomes.some(co => co.id === m.co_id || co.id === m.coId) &&
                        (m.po_id === targetCode || m.poId === targetCode) &&
                        m.strength
                      );
                      const sum = colMappings.reduce((s, m) => s + (parseInt(m.strength) || 0), 0);
                      const avg = colMappings.length > 0 ? (sum / colMappings.length).toFixed(1) : '-';
                      return `<td style="text-align:center; color:var(--accent-blue); font-size:11px; font-weight:800;">${avg}</td>`;
                    }).join('')}
                  </tr>
                </tfoot>
              </table>
            </div>
          `}
        </div>
      ` : `
        <!-- SUB-TAB C: CO-BT-MODULE MAPPING -->
        <div class="card">
          <div style="margin-bottom:14px;">
            <h3 class="card-title">CO–BT Level & Primary Syllabus Module Mapping (${sub ? sub.code : ''})</h3>
            <p class="card-subtitle" style="font-size:12px; color:var(--text-secondary);">Map Course Outcomes directly to Bloom's Taxonomy Cognitive Level, Primary Syllabus Module, and Target Assignment/Experiment</p>
          </div>

          ${courseOutcomes.length === 0 ? `<div class="empty-state">No Course Outcomes defined for this subject yet.</div>` : `
            <div class="table-container">
              <table class="custom-table" style="font-size:13px;">
                <thead>
                  <tr>
                    <th style="width:90px;">CO Code</th>
                    <th style="min-width:220px;">CO Statement</th>
                    <th style="min-width:140px;">Bloom's Taxonomy Level</th>
                    <th style="min-width:200px;">Primary Syllabus Module</th>
                    <th style="min-width:200px;">Target Assessment / Experiment</th>
                  </tr>
                </thead>
                <tbody>
                  ${courseOutcomes.map(co => {
                    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);
                    const curBT = co.btLevel || co.bt_level || 'BT2';
                    const curModId = co.moduleId || co.module_id || '';
                    const curAsgId = co.assignmentId || co.assignment_id || '';

                    return `
                      <tr>
                        <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${co.code}</td>
                        <td style="font-size:12px; max-width:260px; white-space:normal; line-height:1.3;">${co.description}</td>
                        <td>
                          <select class="form-select btn-sm" onchange="facultyView.saveCODetailMapping('${co.id}', 'btLevel', this.value)" style="padding:4px 8px; font-size:12px; font-weight:700;">
                            ${['BT1', 'BT2', 'BT3', 'BT4', 'BT5', 'BT6'].map(bt => `<option value="${bt}" ${curBT === bt ? 'selected' : ''}>${bt}</option>`).join('')}
                          </select>
                        </td>
                        <td>
                          <select class="form-select btn-sm" onchange="facultyView.saveCODetailMapping('${co.id}', 'moduleId', this.value)" style="padding:4px 8px; font-size:12px; max-width:220px;">
                            <option value="">-- Select Module --</option>
                            ${modules.map(m => `<option value="${m.id}" ${curModId === m.id ? 'selected' : ''}>${m.code || m.module_code || ''}: ${m.name || m.module_name || m.title || 'Module'}</option>`).join('')}
                          </select>
                        </td>
                        <td>
                          <select class="form-select btn-sm" onchange="facultyView.saveCODetailMapping('${co.id}', 'assignmentId', this.value)" style="padding:4px 8px; font-size:12px; max-width:220px;">
                            <option value="">-- Select Assessment --</option>
                            ${subAsgs.map(a => `<option value="${a.id}" ${curAsgId === a.id ? 'selected' : ''}>${a.code} — ${a.title}</option>`).join('')}
                          </select>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `}
    `;
  },

  openAddModuleModal(subjectId) {
    const sub = (app.data.subjects || []).find(s => s.id === subjectId);
    app.showModal(`+ Add Syllabus Module ${sub ? '— ' + sub.code : ''}`, `
      <form onsubmit="facultyView.saveNewModule(event, '${subjectId}')">
        <div class="form-group">
          <label class="form-label">Module Code (e.g. Module 1, MOD-01)</label>
          <input type="text" id="mod-code" class="form-input code-font" placeholder="Module 1" required>
        </div>
        <div class="form-group">
          <label class="form-label">Module Title / Name</label>
          <input type="text" id="mod-name" class="form-input" placeholder="e.g. Kinematics of Particles" required>
        </div>
        <div class="form-group">
          <label class="form-label">Topics / Syllabus Coverage Summary</label>
          <textarea id="mod-topics" class="form-input" rows="4" placeholder="List key sub-topics covered in this module..." required></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Module</button>
        </div>
      </form>
    `);
  },

  async saveNewModule(e, subjectId) {
    e.preventDefault();
    const code = document.getElementById('mod-code').value.trim();
    const modName = document.getElementById('mod-name').value.trim();
    const deterministicModId = `mod-${code.replace(/\./g, '-').toLowerCase()}`;
    const modRecord = {
      id: deterministicModId,
      code: code,
      name: modName,
      module_code: code,
      module_name: modName,
      title: modName,
      topics: document.getElementById('mod-topics').value.trim(),
      subjectId: subjectId,
      subject_id: subjectId
    };

    if (!app.data.modules) app.data.modules = [];
    app.data.modules.push(modRecord);
    app.saveState();

    await app.supabaseUpsert('modules', {
      id: modRecord.id,
      code: modRecord.code,
      module_name: modRecord.name,
      topics: modRecord.topics,
      subject_id: subjectId
    }, `Module ${modRecord.code}`);

    writeAudit('created', 'module', modRecord.id, modRecord);
    app.closeModal();
    app.showToast(`Added module ${modRecord.code}`, 'success');
    app.renderCurrentView();
  },

  async saveCODetailMapping(coId, fieldKey, val) {
    const co = (app.data.courseOutcomes || []).find(c => c.id === coId);
    if (!co) return;

    if (fieldKey === 'btLevel') {
      co.btLevel = val;
      co.bt_level = val;
    } else if (fieldKey === 'moduleId') {
      co.moduleId = val;
      co.module_id = val;
    } else if (fieldKey === 'assignmentId') {
      co.assignmentId = val;
      co.assignment_id = val;
    }

    app.saveState();

    await app.supabaseUpsert('course_outcomes', {
      id: co.id,
      code: co.code,
      description: co.description,
      type: co.type || 'CO',
      subject_id: co.subjectId || co.subject_id || '',
      bt_level: co.btLevel || co.bt_level || 'BT2',
      module_id: co.moduleId || co.module_id || null
    }, `Course outcome ${co.code}`);

    writeAudit('updated', 'course_outcome', coId, { [fieldKey]: val });
    app.showToast(`Updated CO mapping detail`, 'success');
  },

  async saveCOBTLevel(coId, newBtLevel) {
    return this.saveCODetailMapping(coId, 'btLevel', newBtLevel);
  },

  async saveCOPOMapping(coId, targetPoCode, val, subjectId) {
    if (!app.data.coPOMapping) app.data.coPOMapping = [];

    const existingIdx = app.data.coPOMapping.findIndex(m =>
      (m.co_id === coId || m.coId === coId) &&
      (m.po_id === targetPoCode || m.poId === targetPoCode)
    );

    const strengthVal = val ? parseInt(val) : null;
    const deterministicCoPoId = `copo-${coId}-${targetPoCode.toLowerCase()}`;
    const mapRecord = {
      id: existingIdx >= 0 ? app.data.coPOMapping[existingIdx].id : deterministicCoPoId,
      co_id: coId,
      coId: coId,
      po_id: targetPoCode,
      poId: targetPoCode,
      strength: strengthVal,
      subject_id: subjectId,
      subjectId: subjectId
    };

    if (strengthVal !== null) {
      if (existingIdx >= 0) {
        app.data.coPOMapping[existingIdx] = mapRecord;
      } else {
        app.data.coPOMapping.push(mapRecord);
      }
    } else if (existingIdx >= 0) {
      app.data.coPOMapping.splice(existingIdx, 1);
    }

    app.saveState();

    if (strengthVal !== null) {
      await app.supabaseUpsert('co_po_mapping', {
        id: mapRecord.id,
        co_id: coId,
        po_id: targetPoCode,
        strength: strengthVal,
        subject_id: subjectId
      }, `CO-PO mapping ${coId} → ${targetPoCode}`);
    } else {
      await app.supabaseDelete('co_po_mapping', mapRecord.id, `CO-PO mapping ${coId} → ${targetPoCode}`);
    }

    writeAudit('updated', 'co_po_mapping', mapRecord.id, mapRecord);
    app.showToast('Updated CO–PO mapping matrix', 'success');
  },

  /* 2. Assignment Builder */
  renderAssignmentBuilder(container, sub) {
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Assignment Question Builder</h1>
          <p class="page-subtitle">Design questions, formula parameters, ground truths, and templates for <strong>${sub ? sub.code : 'all subjects'}</strong></p>
        </div>
        ${sub ? `<button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal('${sub.id}')">+ Create New Assignment</button>` : ''}
      </div>

      ${subAsgs.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">📋</div>
            <h3 class="empty-state-title">No Assignments Yet</h3>
            <p class="empty-state-subtitle">Create your first assignment to start building questions and parameters.</p>
            ${sub ? `<button class="btn btn-primary" style="margin-top:12px;" onclick="facultyView.openCreateAssignmentModal('${sub.id}')">+ Create Assignment</button>` : ''}
          </div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:20px;">
          ${subAsgs.map(a => {
            const questions = Array.isArray(a.questions) ? a.questions :
              (typeof a.questions === 'string' ? (()=>{ try{return JSON.parse(a.questions);}catch(_){return [];} })() : []);
            const totalParams = questions.flatMap(q => q.parameters || []).length;
            const isLocked = (a.lifecycle_status || a.state) === 'locked';

            return `
              <div class="card">
                <!-- Assignment Header -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
                  <div>
                    <span class="mono-val" style="font-size:16px; font-weight:800; color:var(--accent-blue);">${a.code}</span>
                    <strong style="font-size:15px; margin-left:8px;">${a.title}</strong>
                    ${a.btLevel ? `<span class="tag tag-bt" style="margin-left:8px;">${a.btLevel}</span>` : ''}
                  </div>
                  <div style="display:flex; gap:8px; align-items:center; flex-shrink:0;">
                    <button class="btn btn-secondary btn-sm" onclick="facultyView.saveAsTemplate('${a.id}')">💾 Template</button>
                    ${!isLocked ? `<button class="btn btn-ghost btn-sm" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : a.subjectId || ''}')" title="Create another assignment">+</button>` : ''}
                    <span class="col-pill ${isLocked ? 'pill-locked' : (a.lifecycle_status === 'published' ? 'pill-published' : 'pill-draft')}">
                      ${(a.lifecycle_status || 'draft').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:14px; display:flex; gap:16px;">
                  <span>Questions: <strong>${questions.length}</strong></span>
                  <span>Parameters: <strong>${totalParams}</strong></span>
                </div>

                <!-- Questions Tree -->
                ${questions.length === 0 ? `
                  <div style="text-align:center; padding:16px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px dashed var(--border-default); color:var(--text-secondary); font-size:13px;">
                    No questions yet. Click <strong>+ Add Question</strong> to begin.
                  </div>
                ` : `
                  <div style="display:flex; flex-direction:column; gap:12px;">
                    ${questions.map((q, qi) => {
                      const qParams = Array.isArray(q.parameters) ? q.parameters : [];
                      return `
                        <div style="background:var(--bg-subtle); border-radius:var(--radius-md); border:1px solid var(--border-default); overflow:hidden;">
                          <!-- Question Row -->
                          <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px; border-bottom:1px solid var(--border-default);">
                            <div style="flex:1; min-width:0;">
                              <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Q${qi + 1}${q.section ? ' · ' + q.section : ''}</span>
                              ${q.btLevel ? `<span class="tag tag-bt" style="margin-left:6px; font-size:10px;">${q.btLevel}</span>` : ''}
                              <p style="font-size:13px; color:var(--text-primary); margin:4px 0 0; line-height:1.5; word-break:break-word;">${q.text}</p>
                            </div>
                            ${!isLocked ? `
                              <button class="btn btn-ghost btn-sm" style="flex-shrink:0; margin-left:10px;"
                                onclick="facultyView.openAddParameterModal('${a.id}', '${q.id}')">
                                + Add Parameter
                              </button>
                            ` : ''}
                          </div>

                          <!-- Parameters -->
                          ${qParams.length === 0 ? `
                            <div style="padding:8px 14px; font-size:12px; color:var(--text-tertiary);">No parameters defined yet.</div>
                          ` : `
                            <div style="padding:8px 14px;">
                              <div style="display:flex; flex-direction:column; gap:4px;">
                                ${qParams.map((p, pi) => `
                                  <div style="display:flex; align-items:center; gap:10px; font-size:12px; padding:6px 10px; background:var(--bg-surface); border-radius:var(--radius-sm); border:1px solid var(--border-default);">
                                    <span style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono); min-width:20px;">P${pi+1}</span>
                                    <span style="flex:1; font-weight:600; color:var(--text-primary);">${p.label}</span>
                                    ${p.unitHint ? `<span class="tag tag-co" style="font-size:10px;">${p.unitHint}</span>` : ''}
                                    <span style="color:var(--text-secondary);">Marks: <strong>${p.valueMarks}</strong></span>
                                    ${p.correctValue ? `<span style="color:var(--success); font-family:var(--font-mono); font-weight:700;">✓ ${p.correctValue}</span>` : `<span style="color:var(--text-tertiary);">No ground truth</span>`}
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                          `}
                        </div>
                      `;
                    }).join('')}
                  </div>
                `}

                <!-- Add Question Button -->
                ${!isLocked ? `
                  <div style="margin-top:14px; display:flex; justify-content:flex-start;">
                    <button class="btn btn-secondary btn-sm" onclick="facultyView.openAddQuestionModal('${a.id}')">
                      ➕ Add Question
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
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
    await app.supabaseUpsert('submissions', {
      id: s.id,
      student_id: s.student_id || s.studentId || '',
      assignment_id: s.assignment_id || s.assignmentId || '',
      submitted_value: s.submittedValue || s.submitted_value || null,
      submitted_unit: s.submittedUnit || s.submitted_unit || null,
      verification_status: s.verificationStatus,
      verified_by: s.verifiedBy,
      verified_at: s.verifiedAt
    }, `Submission ${subId}`);
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

    await app.supabaseUpsert('assignment_templates', {
      id: tRecord.id,
      title: tRecord.title,
      subject_code: tRecord.subject_code,
      questions: tRecord.questions,
      created_by: tRecord.created_by,
      created_at: tRecord.created_at
    }, `Template ${tRecord.title}`);

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

  async saveNewCO(e, subCode) {
    e.preventDefault();
    const sub = (app.data.subjects || []).find(s => s.code === subCode || s.id === subCode);
    const coCode = document.getElementById('co-code').value.trim();
    const deterministicCoId = `co-${coCode.replace(/\./g, '-').toLowerCase()}`;
    const coRecord = {
      id: deterministicCoId,
      code: coCode,
      description: document.getElementById('co-desc').value.trim(),
      type: 'CO',
      subjectId: sub?.id || '',
      subject_id: sub?.id || ''
    };
    if (!app.data.courseOutcomes) app.data.courseOutcomes = [];
    app.data.courseOutcomes.push(coRecord);
    app.saveState();

    await app.supabaseUpsert('course_outcomes', {
      id: coRecord.id,
      code: coRecord.code,
      description: coRecord.description,
      type: coRecord.type,
      subject_id: coRecord.subject_id,
      bt_level: '',
      module_id: null
    }, `Course outcome ${coRecord.code}`);

    writeAudit('created', 'co', coRecord.id, coRecord);
    app.closeModal();
    app.showToast(`Created outcome ${coRecord.code}`, 'success');
    app.renderCurrentView();
  },

  openCreateAssignmentModal(subId) {
    const sub = (app.data.subjects || []).find(s => s.id === subId);
    if (!sub) {
      app.showToast('Please open a subject workspace first before creating an assignment.', 'warning');
      return;
    }
    const subCOs = (app.data.courseOutcomes || []).filter(co => co.subjectId === subId || co.subject_id === subId);
    const suggestedCode = `ASG-${(sub.code || 'SUB').toUpperCase()}-${String(((app.data.assignments || []).filter(a => a.subjectId === subId || a.subject_id === subId).length) + 1).padStart(2, '0')}`;

    app.showModal(`📋 Create New Lab Assignment — ${sub.code}`, `
      <form onsubmit="facultyView.saveNewAssignment(event, '${subId}')" style="min-width:480px;">

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px; background:var(--bg-subtle); padding:12px; border-radius:var(--radius-md); border-left:4px solid var(--accent-blue);">
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:2px;">Subject</div>
            <div style="font-size:13px; font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${sub.code}</div>
            <div style="font-size:12px; color:var(--text-secondary);">${sub.fullName || sub.name}</div>
          </div>
          <div>
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin-bottom:2px;">Semester</div>
            <div style="font-size:13px; font-weight:700; color:var(--text-primary);">${sub.semester || 'Semester I'}</div>
            <div style="font-size:12px; color:var(--text-secondary);">Academic Year 2026-27</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Assignment Code</label>
            <input type="text" id="asg-code" class="form-input code-font" value="${suggestedCode}" placeholder="ASG-VMD-01" required>
          </div>
          <div class="form-group">
            <label class="form-label">Primary BT Level</label>
            <select id="asg-bt-level" class="form-select" required>
              ${['BT1 — Remember', 'BT2 — Understand', 'BT3 — Apply', 'BT4 — Analyze', 'BT5 — Evaluate', 'BT6 — Create'].map((lbl, i) => `<option value="BT${i+1}" ${i===2 ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Title</label>
          <input type="text" id="asg-title" class="form-input" placeholder="e.g. Experiment 1: Concurrent Force System" required>
        </div>

        ${subCOs.length > 0 ? `
        <div class="form-group">
          <label class="form-label">Map to Course Outcomes (select all that apply)</label>
          <div style="display:flex; flex-direction:column; gap:6px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md); border:1px solid var(--border-default); max-height:160px; overflow-y:auto;">
            ${subCOs.map(co => `
              <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:pointer;">
                <input type="checkbox" name="asg-cos" value="${co.id}" style="margin-top:2px; accent-color:var(--accent-blue);">
                <span><strong style="color:var(--accent-blue);">${co.code}</strong> — ${co.description}</span>
              </label>
            `).join('')}
          </div>
        </div>
        ` : `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:12px; padding:8px; background:var(--bg-subtle); border-radius:var(--radius-md);">ℹ️ No Course Outcomes defined yet for ${sub.code}. You can add COs from the <strong>My Course</strong> tab and link them later.</div>`}

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">📋 Create Assignment</button>
        </div>
      </form>
    `);
  },

  async saveNewAssignment(e, subId) {
    e.preventDefault();
    const asgCode = document.getElementById('asg-code').value.trim();
    const sub = subId ? (app.data.subjects || []).find(s => s.id === subId) : app.data.subjects[0];
    const subCode = sub ? (sub.code || 'sub') : 'sub';
    const deterministicAsgId = `asg-${subCode.toLowerCase()}-${asgCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Collect selected CO IDs
    const selectedCOIds = Array.from(document.querySelectorAll('input[name="asg-cos"]:checked')).map(cb => cb.value);
    const btLevel = document.getElementById('asg-bt-level')?.value || 'BT3';

    const asgRecord = {
      id: deterministicAsgId,
      code: asgCode,
      title: document.getElementById('asg-title').value.trim(),
      subjectId: subId || (app.data.subjects[0] ? app.data.subjects[0].id : 'sub-vmd'),
      lifecycle_status: 'draft',
      state: 'Draft',
      btLevel: btLevel,
      coIds: selectedCOIds,
      questions: [],
      schedules: []
    };
    app.data.assignments.push(asgRecord);
    app.saveState();
    await app.supabaseUpsert('assignments', {
      id: asgRecord.id,
      code: asgRecord.code,
      title: asgRecord.title,
      subject_id: asgRecord.subjectId,
      lifecycle_status: 'draft',
      questions: JSON.stringify([]),
      schedules: JSON.stringify([])
    }, `Assignment ${asgRecord.code}`);
    writeAudit('created', 'assignment', asgRecord.id, asgRecord);
    app.closeModal();
    app.showToast(`✅ Created assignment ${asgRecord.code}`, 'success');
    window.location.hash = `#faculty-subject-${subId}-assignments`;
  },

  /* ==========================================================================
     ASSIGNMENT BUILDER — Question & Parameter Modals
     ========================================================================== */
  openAddQuestionModal(asgId) {
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;
    const subCOs = (app.data.courseOutcomes || []).filter(co =>
      co.subjectId === asg.subjectId || co.subject_id === asg.subjectId ||
      co.subject_id === asg.subject_id
    );

    app.showModal(`➕ Add Question — ${asg.code}`, `
      <form onsubmit="facultyView.saveNewQuestion(event, '${asgId}')" style="min-width:480px;">
        <div class="form-group">
          <label class="form-label">Question Text</label>
          <textarea id="q-text" class="form-input" rows="4"
            placeholder="e.g. Find the resultant of two concurrent forces {{F1}} N and {{F2}} N at angle {{theta}}°."
            required></textarea>
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">Use {{variable}} placeholders for student-specific values.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Section Label <span style="color:var(--text-tertiary); font-weight:400;">(optional)</span></label>
          <input type="text" id="q-section" class="form-input" placeholder="e.g. Section A — Numerical">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">CO Mapping</label>
            <select id="q-co" class="form-select">
              <option value="">— None —</option>
              ${subCOs.map(co => `<option value="${co.id}">${co.code} — ${co.description.substring(0,40)}…</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">BT Level</label>
            <select id="q-bt" class="form-select">
              ${['BT1 — Remember','BT2 — Understand','BT3 — Apply','BT4 — Analyze','BT5 — Evaluate','BT6 — Create'].map((l,i)=>`<option value="BT${i+1}" ${i===2?'selected':''}>BT${i+1} — ${l.split('—')[1].trim()}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Question</button>
        </div>
      </form>
    `);
  },

  async saveNewQuestion(e, asgId) {
    e.preventDefault();
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;
    if (!Array.isArray(asg.questions)) asg.questions = [];

    const qId = `q-${asgId}-${Date.now()}`;
    const qRecord = {
      id: qId,
      text: document.getElementById('q-text').value.trim(),
      section: document.getElementById('q-section').value.trim(),
      coId: document.getElementById('q-co').value,
      btLevel: document.getElementById('q-bt').value,
      parameters: []
    };
    asg.questions.push(qRecord);
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asg.code,
      title: asg.title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      questions: JSON.stringify(asg.questions),
      schedules: JSON.stringify(asg.schedules || [])
    }, `Assignment ${asg.code} (questions)`);

    writeAudit('created', 'question', qId, qRecord);
    app.closeModal();
    app.showToast(`Added question to ${asg.code}`, 'success');
    app.renderCurrentView();
  },

  openAddParameterModal(asgId, questionId) {
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;

    app.showModal(`⚙️ Add Parameter — ${asg.code}`, `
      <form onsubmit="facultyView.saveNewParameter(event, '${asgId}', '${questionId}')" style="min-width:440px;">
        <div class="form-group">
          <label class="form-label">Parameter Label / Symbol</label>
          <input type="text" id="param-label" class="form-input code-font" placeholder="e.g. Resultant Force R" required>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Unit Hint</label>
            <input type="text" id="param-unit" class="form-input code-font" placeholder="e.g. N, m/s², kN·m">
          </div>
          <div class="form-group">
            <label class="form-label">Value Marks</label>
            <input type="number" id="param-marks" class="form-input" min="0" step="0.5" value="2" required>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Correct Value (Ground Truth)</label>
          <input type="text" id="param-correct" class="form-input code-font"
            placeholder="e.g. 141.42 or leave blank for formula-derived">
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">This is the expected answer against which student submissions are auto-checked.</div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Parameter</button>
        </div>
      </form>
    `);
  },

  async saveNewParameter(e, asgId, questionId) {
    e.preventDefault();
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;
    const q = (asg.questions || []).find(q => q.id === questionId);
    if (!q) return;
    if (!Array.isArray(q.parameters)) q.parameters = [];

    const paramId = `param-${questionId}-${Date.now()}`;
    const correctValue = document.getElementById('param-correct').value.trim();
    const paramRecord = {
      id: paramId,
      label: document.getElementById('param-label').value.trim(),
      unitHint: document.getElementById('param-unit').value.trim(),
      valueMarks: parseFloat(document.getElementById('param-marks').value) || 2,
      correctValue: correctValue
    };
    q.parameters.push(paramRecord);
    app.saveState();

    // Upsert the full assignment (JSONB questions column)
    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asg.code,
      title: asg.title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      questions: JSON.stringify(asg.questions),
      schedules: JSON.stringify(asg.schedules || [])
    }, `Assignment ${asg.code} (parameters)`);

    writeAudit('created', 'parameter', paramId, paramRecord);
    app.closeModal();
    app.showToast(`Added parameter "${paramRecord.label}" to question`, 'success');
    app.renderCurrentView();
  }
};
