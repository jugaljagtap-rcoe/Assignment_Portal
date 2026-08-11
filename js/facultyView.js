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
      const parts = hash.replace('#faculty-subject-', '').split('-');
      const subjectId = parts[0] + (parts[1] && !['overview','course','assignments','students','schedule','grade','verify','reports'].includes(parts[1]) ? '-' + parts[1] : '');
      const tab = parts[parts.length - 1] && ['overview','course','assignments','students','schedule','grade','verify','reports'].includes(parts[parts.length - 1]) ? parts[parts.length - 1] : 'overview';
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
    const activeYear = '2026-27';

    // Query subject_faculty for subjects assigned to this faculty
    const assignedSfs = (app.data.subjectFaculty || []).filter(sf =>
      sf.faculty_id === facultyEmail || sf.facultyId === facultyEmail
    );

    let assignedSubjects = (app.data.subjects || []).filter(s =>
      assignedSfs.some(sf => sf.subject_id === s.id || sf.subjectId === s.id)
    );

    // If admin viewing or no explicitly assigned subjects, show all subjects for preview
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

      <!-- Global Notification Alerts Strip -->
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

      <!-- Subject Cards Grid -->
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
      <!-- Breadcrumb Navigation -->
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

      <!-- Internal 8-Tab Navigation Bar -->
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

      <div id="subject-workspace-tab-content">
        ${this.renderSubjectTabContent(sub, activeTab)}
      </div>
    `;
  },

  renderSubjectTabContent(sub, tab) {
    switch(tab) {
      case 'course': return this.renderCOAndModulesManager(document.getElementById('subject-workspace-tab-content'));
      case 'assignments': return this.renderAssignmentBuilder(document.getElementById('subject-workspace-tab-content'));
      case 'students': return this.renderSubjectStudentsTab(sub);
      case 'schedule': return this.renderScheduleManager(document.getElementById('subject-workspace-tab-content'));
      case 'grade': return this.renderCSVPipeline(document.getElementById('subject-workspace-tab-content'));
      case 'verify': return this.renderVerificationLayer(document.getElementById('subject-workspace-tab-content'));
      case 'reports': return analyticsView.render(document.getElementById('subject-workspace-tab-content'));
      case 'overview':
      default: return this.renderSubjectOverviewTab(sub);
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

      <!-- Session-Strip Style Assignment List -->
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

  renderSubjectStudentsTab(sub) {
    const enrolled = app.data.students;
    return `
      <div class="card">
        <h3 class="card-title" style="margin-bottom:12px;">Enrolled Student Roster — ${sub.code}</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>UIN</th>
                <th>Student Name</th>
                <th>Branch</th>
                <th>Division / Batch</th>
                <th>Evaluation Status</th>
              </tr>
            </thead>
            <tbody>
              ${enrolled.map(st => `
                <tr>
                  <td class="mono-val" style="font-weight:700;">${st.uin}</td>
                  <td style="font-weight:600;">${st.name}</td>
                  <td><span class="tag tag-co">${st.branch}</span></td>
                  <td><span class="tag tag-bt">Div ${st.division} · ${st.batch}</span></td>
                  <td><span class="tag tag-success">✓ Enrolled</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* Placeholder sub-component renders preserving core functionality */
  renderCOAndModulesManager(container) { container.innerHTML = `<div class="card"><h3>My Course: Modules & CO Manager</h3></div>`; },
  renderAssignmentBuilder(container) { container.innerHTML = `<div class="card"><h3>Assignments Builder</h3></div>`; },
  renderScheduleManager(container) { container.innerHTML = `<div class="card"><h3>Schedule & Access Manager</h3></div>`; },
  renderCSVPipeline(container) { container.innerHTML = `<div class="card"><h3>Grade & Evaluate (Modes A, B, C)</h3></div>`; },
  renderVerificationLayer(container) { container.innerHTML = `<div class="card"><h3>Verification Layer</h3></div>`; },
  openCreateAssignmentModal() { app.showToast('Create Assignment Modal opened', 'info'); }
};
