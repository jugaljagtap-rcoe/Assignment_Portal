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

  getAsgQuestions(asg) {
    if (!asg) return [];
    if (Array.isArray(asg.questions)) return asg.questions;
    if (typeof asg.questions === 'string') {
      try { return JSON.parse(asg.questions); } catch(_) { return []; }
    }
    return [];
  },

  render(container, activeNav) {
    const hash = window.location.hash || '#faculty-home';

    if (hash.startsWith('#faculty-subject-')) {
      const raw = hash.replace('#faculty-subject-', '');
      const validTabs = ['overview', 'course', 'assignments', 'rubrics', 'students', 'schedule', 'grade', 'verify', 'reports'];
      let tab = 'overview';
      let subjectId = raw;
      let targetAsgId = null;

      if (raw.includes('-assignments-')) {
        const parts = raw.split('-assignments-');
        subjectId = parts[0];
        targetAsgId = parts[1];
        tab = 'assignments';
      } else {
        for (const t of validTabs) {
          const suffix = '-' + t;
          if (raw.endsWith(suffix)) {
            const candidate = raw.slice(0, raw.length - suffix.length);
            if (candidate.length > 0) {
              tab = t;
              subjectId = candidate;
              break;
            }
          }
        }
      }

      const knownSubject = (app.data.subjects || []).find(s => s.id === subjectId);
      if (!knownSubject && app.data.subjects.length > 0) {
        // hash is malformed — fall back to faculty home
        this.renderFacultyHome(container);
        return;
      }

      this.renderSubjectWorkspace(container, subjectId, tab, targetAsgId);
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
    if (!app.currentUser) {
      container.innerHTML = `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">
            <div class="empty-state-emoji">🔒</div>
            <h3 class="empty-state-title">Authentication Required</h3>
            <p class="empty-state-subtitle">Please log in to access the Faculty Workspace.</p>
          </div>
        </div>
      `;
      return;
    }

    const facultyEmail = app.currentUser.email ? app.currentUser.email.trim().toLowerCase() : '';

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
  renderSubjectWorkspace(container, subjectId, activeTab = 'overview', targetAsgId = null) {
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
        <button class="segmented-btn ${activeTab === 'rubrics' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-rubrics'">Rubric Manager</button>
        <button class="segmented-btn ${activeTab === 'students' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-students'">Students</button>
        <button class="segmented-btn ${activeTab === 'schedule' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-schedule'">Schedule</button>
        <button class="segmented-btn ${activeTab === 'grade' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-grade'">Grade & Evaluate</button>
        <button class="segmented-btn ${activeTab === 'verify' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-verify'">Verify</button>
        <button class="segmented-btn ${activeTab === 'reports' ? 'active' : ''}" onclick="window.location.hash='#faculty-subject-${sub.id}-reports'">Reports</button>
      </div>

      <div id="subject-workspace-tab-content"></div>
    `;

    requestAnimationFrame(() => {
      const tabContentEl = document.getElementById('subject-workspace-tab-content');
      if (tabContentEl) this.renderSubjectTabContent(sub, activeTab, tabContentEl, targetAsgId);
    });
  },

  renderSubjectTabContent(sub, tab, targetEl, targetAsgId = null) {
    if (!targetEl) return;

    switch(tab) {
      case 'course':
        this.renderCOAndModulesManager(targetEl, sub);
        break;
      case 'assignments':
        if (targetAsgId) {
          const asg = (app.data.assignments || []).find(a => a.id === targetAsgId);
          if (asg) {
            this.renderAssignmentQuestionEditor(targetEl, sub, asg);
          } else {
            this.renderAssignmentBuilder(targetEl, sub);
          }
        } else {
          this.renderAssignmentBuilder(targetEl, sub);
        }
        break;
      case 'rubrics':
        this.renderRubricManager(targetEl, sub);
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

      // KPI Counts
      const totalAsgs = subAsgs.length;
      const publishedCount = subAsgs.filter(a => (a.lifecycle_status || a.state || 'draft').toLowerCase() === 'published').length;
      const draftCount = subAsgs.filter(a => (a.lifecycle_status || a.state || 'draft').toLowerCase() === 'draft').length;

      // Group assignments by series_type
      const TYPE_MAP = {
        'L': 'Lab Practicals (L)',
        'A': 'Assignments (A)',
        'T': 'Tests & Quizzes (T)',
        'P': 'Projects (P)'
      };

      const seriesOrder = ['L', 'A', 'T', 'P'];
      const groupedAsgs = { 'L': [], 'A': [], 'T': [], 'P': [] };

      subAsgs.forEach(a => {
        let type = (a.series_type || a.seriesType || 'A').toUpperCase();
        if (!groupedAsgs[type]) type = 'A';
        groupedAsgs[type].push(a);
      });

      const rubricPresets = (app.data && app.data.rubricPresets) || [];

      return `
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : ''}')">+ Create Assignment</button>
          <button class="btn btn-secondary btn-sm" onclick="facultyView.openAddCOModal('${sub ? sub.code : 'VMD'}')">+ Add CO</button>
          <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#faculty-subject-${sub ? sub.id : ''}-students'">👥 View Enrolled Students</button>
        </div>

        <div class="kpi-grid" style="margin-bottom:20px;">
          <div class="kpi-card">
            <div class="kpi-card-content">
              <span class="kpi-label">Total Assignments</span>
              <span class="kpi-value">${totalAsgs}</span>
              <span class="kpi-trend" style="font-size:11px;">All series types combined</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card-content">
              <span class="kpi-label">Published</span>
              <span class="kpi-value" style="color:var(--success);">${publishedCount}</span>
              <span class="kpi-trend positive" style="font-size:11px;">Live & active</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card-content">
              <span class="kpi-label">Drafts</span>
              <span class="kpi-value" style="color:var(--warning);">${draftCount}</span>
              <span class="kpi-trend" style="font-size:11px;">In preparation</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card-content">
              <span class="kpi-label">Pending Verifications</span>
              <span class="kpi-value" style="color:${pendingCount > 0 ? 'var(--warning)' : 'var(--text-primary)'};">${pendingCount}</span>
              <span class="kpi-trend ${pendingCount > 0 ? 'negative' : 'positive'}" style="font-size:11px;">Awaiting Sign-off</span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 class="card-title" style="margin-bottom:16px;">Experiments & Assignments Status</h3>
          ${subAsgs.length === 0 ? `
            <div class="empty-state" style="padding:24px; text-align:center;">
              <p style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">No assignments created for this subject yet.</p>
              <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Click below to create your first experiment assignment.</p>
              <button class="btn btn-primary btn-sm" onclick="facultyView.openCreateAssignmentModal('${sub ? sub.id : ''}')">+ Create Assignment</button>
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${seriesOrder.map(type => {
                const list = groupedAsgs[type];
                if (!list || list.length === 0) return '';
                const typeTitle = TYPE_MAP[type] || 'Assignments';

                return `
                  <div>
                    <h4 style="font-size:13px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.04em; margin:0 0 10px 0;">${typeTitle} (${list.length})</h4>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                      ${list.map(a => {
                        const questions = facultyView.getAsgQuestions(a);
                        const totalParams = questions.flatMap(q => q.parameters || []).length;
                        const totalMaxMarks = questions.reduce((sum, q) => sum + (q.max_marks || q.maxMarks || 10), 0);
                        const status = (a.lifecycle_status || a.state || 'draft').toLowerCase();
                        const isDraft = status === 'draft';
                        const titleText = isDraft
                          ? (a.working_title || a.title || 'Untitled Draft')
                          : (a.display_code || a.working_title || a.title || 'Assignment');

                        const rubricId = a.rubric_preset_id || a.rubricPresetId;
                        const rubric = rubricId ? rubricPresets.find(r => r.id === rubricId) : null;
                        let rubricName = 'No Rubric';
                        if (rubric) {
                          if (rubric.is_preset || rubric.isPreset || rubric.id === 'rub-inst-001') {
                            rubricName = 'Institutional Rubric';
                          } else {
                            rubricName = rubric.name || 'Custom Rubric';
                          }
                        }

                        return `
                          <div class="session-strip" style="display:flex; justify-content:space-between; align-items:center;">
                            <div class="session-strip-info">
                              <div class="session-strip-title">
                                <span>${titleText}</span>
                              </div>
                              <div class="session-strip-meta">
                                ${questions.length} Questions &nbsp;·&nbsp; ${totalParams} Parameters &nbsp;·&nbsp; ${totalMaxMarks} Marks
                              </div>
                            </div>

                            <div class="session-strip-pills">
                              ${a.btLevel || a.bt_level ? `<span class="tag tag-bt">${a.btLevel || a.bt_level}</span>` : ''}
                              <span class="col-pill ${status === 'locked' ? 'pill-locked' : status === 'published' ? 'pill-published' : 'pill-draft'}">${status.toUpperCase()}</span>
                              <span class="tag tag-co">${rubricName}</span>
                            </div>

                            <div class="session-strip-actions">
                              <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#faculty-subject-${sub ? sub.id : ''}-grade'">Grade Mode →</button>
                            </div>
                          </div>
                        `;
                      }).join('')}
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

    const allTargets = [...(app.data.programOutcomes || []).map(p => p.code), ...(app.data.programSpecificOutcomes || []).map(p => p.code)];

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
    const deterministicCoPoId = `copo-${coId}-${targetPoCode}`.toLowerCase();
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

  /* 2. Assignment Builder — Level 1: Cards List */
  renderAssignmentBuilder(container, sub) {
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);
    const migratedAsgs = subAsgs.filter(a => a.is_migrated || a.isMigrated);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Assignment Builder</h1>
          <p class="page-subtitle">Manage assignments and experiments for <strong>${sub ? sub.code : 'all subjects'}</strong></p>
        </div>
        ${sub ? `<button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal('${sub.id}')">+ Create New Assignment</button>` : ''}
      </div>

      ${migratedAsgs.length > 0 ? `
        <div style="margin-bottom:16px;">
          ${migratedAsgs.map(a => `
            <div style="background:var(--warning-subtle); border:1px solid var(--warning); border-radius:var(--radius-md); padding:10px 14px; margin-bottom:8px; font-size:12px; color:var(--warning); display:flex; justify-content:space-between; align-items:center;">
              <div>
                ⚠️ <strong>Legacy assignment (${a.display_code || a.working_title || a.title || 'Draft'})</strong> — auto-migrated to institutional rubric with default parameter types. Please review question marks and parameter types for accuracy.
              </div>
              <button class="btn btn-secondary btn-sm" style="margin-left:12px; padding:2px 8px; font-size:11px;" onclick="facultyView.dismissLegacyWarning(event, '${a.id}')">Dismiss</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

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
        <div class="dept-blocks-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-bottom:28px;">
          ${subAsgs.map(a => {
            const questions = facultyView.getAsgQuestions(a);
            const totalParams = questions.flatMap(q => q.parameters || []).length;
            const totalMaxMarks = questions.reduce((sum, q) => sum + (q.max_marks || q.maxMarks || 10), 0);
            const status = a.lifecycle_status || a.state || 'draft';
            const targetSubId = sub ? sub.id : (a.subjectId || a.subject_id || '');

            const isDraft = status === 'draft';
            const titleText = isDraft
              ? (a.working_title || a.title || 'Untitled Draft')
              : (a.display_code || a.working_title || a.title || 'Assignment');

            const rubricId = a.rubric_preset_id || a.rubricPresetId;
            const rubricPresets = (app.data && app.data.rubricPresets) || [];
            const rubric = rubricId ? rubricPresets.find(r => r.id === rubricId) : null;

            let rubricName = 'No Rubric';
            if (rubric) {
              if (rubric.is_preset || rubric.isPreset || rubric.id === 'rub-inst-001') {
                rubricName = 'Institutional Rubric';
              } else {
                rubricName = rubric.name || 'Custom Rubric';
              }
            }

            return `
              <div class="card" id="asg-card-${a.id}" style="padding:18px; display:flex; flex-direction:column; justify-content:space-between; transition:all 0.15s ease;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span class="tag tag-bt">${a.btLevel || a.bt_level || 'BT'}</span>
                    <span class="col-pill ${status === 'locked' ? 'pill-locked' : status === 'published' ? 'pill-published' : 'pill-draft'}">${status.toUpperCase()}</span>
                  </div>

                  <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:12px; line-height:1.35; word-break:break-word;">
                    ${titleText}
                  </h3>
                </div>

                <div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; font-size:12px; color:var(--text-secondary); margin-top:12px; padding-top:12px; border-top:1px solid var(--border-default);">
                    <div>Questions: <strong class="mono-val" style="color:var(--text-primary);">${questions.length}</strong></div>
                    <div>Parameters: <strong class="mono-val" style="color:var(--text-primary);">${totalParams}</strong></div>
                    <div>Max Marks: <strong class="mono-val" style="color:var(--text-primary);">${totalMaxMarks}</strong></div>
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${rubricName}">Rubric: <strong style="color:var(--text-primary);">${rubricName}</strong></div>
                  </div>

                  <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:14px; padding-top:12px; border-top:1px solid var(--border-default);">
                    ${status === 'draft' ? `
                      <button class="btn btn-primary btn-sm" onclick="facultyView.openPublishModal('${a.id}')">📢 Publish</button>
                      <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteDraftAssignment('${a.id}')" title="Delete Draft">🗑️</button>
                    ` : status === 'published' ? `
                      <button class="btn btn-secondary btn-sm" onclick="facultyView.lockAssignment('${a.id}')">🔒 Lock</button>
                      <button class="btn btn-destructive btn-sm" onclick="facultyView.retractAssignment('${a.id}')">↩ Retract</button>
                    ` : status === 'locked' ? `
                      <span class="tag tag-purple">🔒 Locked</span>
                    ` : status === 'retracted' ? `
                      <span class="tag tag-warning">↩ Retracted</span>
                      <button class="btn btn-secondary btn-sm" onclick="facultyView.rebuildFromRetracted('${a.id}')">🔄 Rebuild</button>
                    ` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="facultyView.saveAsTemplate('${a.id}')" title="Save as template">💾</button>
                    <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="window.location.hash='#faculty-subject-${targetSubId}-assignments-${a.id}'">
                      Manage Questions →
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  /* 2b. Assignment Builder — Level 2: Question Editor for Single Assignment */
  renderAssignmentQuestionEditor(container, sub, asg) {
    const questions = facultyView.getAsgQuestions(asg);
    const totalParams = questions.flatMap(q => q.parameters || []).length;
    const status = asg.lifecycle_status || asg.state || 'draft';
    const isLocked = status === 'locked';

    container.innerHTML = `
      <div class="breadcrumb-container print-hide" style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary); margin-bottom:12px;">
        <a href="#faculty-home" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">Faculty Home</a>
        <span>&gt;</span>
        <a href="#faculty-subject-${sub.id}-assignments" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">${sub.code}</a>
        <span>&gt;</span>
        <a href="#faculty-subject-${sub.id}-assignments" style="color:var(--accent-blue); font-weight:600; text-decoration:none;">Assignments</a>
        <span>&gt;</span>
        <span style="font-weight:700; color:var(--text-primary);">${asg.display_code || asg.working_title || asg.title}</span>
      </div>

      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <h2 class="card-title" style="font-size:18px; display:flex; align-items:center; gap:10px;">
              ${asg.display_code ? `<span class="mono-val" style="color:var(--accent-blue);">${asg.display_code}</span>` : ''}
              <span>${asg.working_title || asg.title}</span>
              ${!asg.display_code ? `<span class="tag tag-warning">[DRAFT]</span>` : ''}
              ${asg.btLevel || asg.bt_level ? `<span class="tag tag-bt">${asg.btLevel || asg.bt_level}</span>` : ''}
            </h2>
            <div style="font-size:12px; color:var(--text-secondary); margin-top:6px; display:flex; gap:16px;">
              <span>Questions: <strong>${questions.length}</strong></span>
              <span>Parameters: <strong>${totalParams}</strong></span>
              <span>Lifecycle: <strong class="col-pill ${status === 'locked' ? 'pill-locked' : status === 'published' ? 'pill-published' : 'pill-draft'}">${status.toUpperCase()}</strong></span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${status === 'draft' ? `
              <button class="btn btn-primary btn-sm" onclick="facultyView.openPublishModal('${asg.id}')">📢 Publish Assignment</button>
              <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteDraftAssignment('${asg.id}')">🗑️ Delete Draft</button>
            ` : status === 'published' ? `
              <button class="btn btn-secondary btn-sm" onclick="facultyView.lockAssignment('${asg.id}')">🔒 Lock</button>
              <button class="btn btn-destructive btn-sm" onclick="facultyView.retractAssignment('${asg.id}')">↩ Retract</button>
            ` : status === 'locked' ? `
              <span class="tag tag-purple">🔒 Locked</span>
            ` : status === 'retracted' ? `
              <span class="tag tag-warning">↩ Retracted</span>
              <button class="btn btn-secondary btn-sm" onclick="facultyView.rebuildFromRetracted('${asg.id}')">🔄 Rebuild as New Draft</button>
            ` : ''}
            <button class="btn btn-ghost btn-sm" onclick="facultyView.saveAsTemplate('${asg.id}')" title="Save as template">💾</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 class="card-title" style="margin:0;">Questions & Parameters</h3>
          ${!isLocked ? `
            <button class="btn btn-primary btn-sm" onclick="facultyView.openAddQuestionModal('${asg.id}')">
              ➕ Add Question
            </button>
          ` : ''}
        </div>

        ${questions.length === 0 ? `
          <div style="text-align:center; padding:24px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px dashed var(--border-default); color:var(--text-secondary); font-size:13px;">
            No questions added to this assignment yet. Click <strong>+ Add Question</strong> to begin.
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${questions.map((q, qi) => {
              const a = asg;
              const qParams = Array.isArray(q.parameters) ? q.parameters : [];
              return `
                <div style="background:var(--bg-subtle); border-radius:var(--radius-md); border:1px solid var(--border-default); overflow:hidden;">
                  <!-- Question Row -->
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:12px 14px; border-bottom:1px solid var(--border-default);">
                    <div style="flex:1; min-width:0;">
                      <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Q${qi + 1}${q.section ? ' · ' + q.section : ''}</span>
                      ${q.btLevel ? `<span class="tag tag-bt" style="margin-left:6px; font-size:10px;">${q.btLevel}</span>` : ''}
                      <p style="font-size:13px; color:var(--text-primary); margin:4px 0 0; line-height:1.5; word-break:break-word;">${app.formatQuestionText(q.text, {})}</p>
                      ${q.imageUrl ? `
                        <div style="margin-top:8px;">
                          <img src="${app.getEmbeddableImageUrl ? app.getEmbeddableImageUrl(q.imageUrl) : q.imageUrl}" alt="Question Diagram" style="max-width:100%; max-height:250px; border-radius:var(--radius-sm); border:1px solid var(--border-default);">
                        </div>
                      ` : ''}
                    </div>
                    ${!isLocked ? `
                      <div style="display:flex; gap:6px; flex-shrink:0; margin-left:10px;">
                        <button class="btn btn-ghost btn-sm"
                          onclick="facultyView.openEditQuestionModal('${a.id}', '${q.id}')">
                          ✏️ Edit Question
                        </button>
                        <button class="btn btn-ghost btn-sm"
                          onclick="facultyView.openAddParameterModal('${asg.id}', '${q.id}')">
                          + Add Parameter
                        </button>
                      </div>
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

        ${!isLocked ? `
          <div style="margin-top:14px; display:flex; justify-content:flex-start;">
            <button class="btn btn-secondary btn-sm" onclick="facultyView.openAddQuestionModal('${asg.id}')">
              ➕ Add Question
            </button>
          </div>
        ` : ''}
      </div>
    `;
  },

  /* 3. Schedule & Access Manager */
  renderScheduleManager(container, sub) {
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);
    const batches = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Schedule & Access Manager</h1>
          <p class="page-subtitle">Batch-wise deadlines, submission access toggles, & lifecycle locking</p>
        </div>
      </div>

      ${subAsgs.length === 0 ? `
        <div class="card" style="padding:40px; text-align:center;">
          <div class="empty-state">No assignments available to schedule.</div>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:20px;">
          ${subAsgs.map(a => {
            const isLocked = (a.lifecycle_status || a.state) === 'locked';
            const parsedSchedules = Array.isArray(a.schedules) ? a.schedules :
              (typeof a.schedules === 'string' ? (()=>{ try{return JSON.parse(a.schedules);}catch(_){return [];} })() : []);

            return `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                  <div>
                    <span class="mono-val" style="font-size:16px; font-weight:800; color:var(--accent-blue);">${a.display_code || 'Draft'}</span>
                    <strong style="font-size:15px; margin-left:8px;">${a.working_title || a.title}</strong>
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="facultyView.saveAssignmentSchedule('${a.id}')">💾 Save Schedule</button>
                    ${!isLocked ? `
                      <button class="btn btn-destructive btn-sm" onclick="facultyView.lockAssignment('${a.id}')">🔒 Lock & Finalize</button>
                    ` : `<span class="tag tag-purple">🔒 Locked</span>`}
                  </div>
                </div>

                <div class="table-container">
                  <table class="custom-table">
                    <thead>
                      <tr><th>Batch</th><th>Deadline</th><th>Submissions Open</th><th>Grades Released</th></tr>
                    </thead>
                    <tbody>
                      ${batches.map(b => {
                        const sch = parsedSchedules.find(s => s.scopeValue === b);
                        const deadlineVal = sch?.deadline || '';
                        const subOpen = sch ? (sch.submissionsOpen ?? true) : true;
                        const gradesRel = sch ? (sch.gradesReleased ?? false) : false;

                        return `
                          <tr>
                            <td class="mono-val" style="font-weight:700;">Batch ${b}</td>
                            <td>
                              <input type="datetime-local" id="deadline-${a.id}-${b}" class="form-input code-font btn-sm" value="${deadlineVal}" style="padding:4px 8px; width:220px;">
                            </td>
                            <td>
                              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" id="submissions-open-${a.id}-${b}" ${subOpen ? 'checked' : ''} style="accent-color:var(--success); width:16px; height:16px;">
                                <span style="font-size:12px; font-weight:600;">${subOpen ? '🟢 Open' : '🔴 Closed'}</span>
                              </label>
                            </td>
                            <td>
                              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                <input type="checkbox" id="grades-released-${a.id}-${b}" ${gradesRel ? 'checked' : ''} style="accent-color:var(--accent-blue); width:16px; height:16px;">
                                <span style="font-size:12px; font-weight:600;">${gradesRel ? '🟢 Released' : '⚪ Hidden'}</span>
                              </label>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  async saveAssignmentSchedule(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const batches = ['A1','A2','A3','A4','B1','B2','B3','B4'];
    const schedules = batches.map(b => ({
      scopeType: 'batch',
      scopeValue: b,
      deadline: document.getElementById(`deadline-${asgId}-${b}`)?.value || '',
      submissionsOpen: document.getElementById(`submissions-open-${asgId}-${b}`)?.checked ?? true,
      gradesReleased: document.getElementById(`grades-released-${asgId}-${b}`)?.checked ?? false
    })).filter(s => s.deadline !== '');

    asg.schedules = schedules;
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: asg.id,
      title: asg.title,
      display_code: asg.display_code || null,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: JSON.stringify(schedules)
    }, `Schedule for ${asg.display_code || asg.working_title}`);

    writeAudit('updated', 'assignment_schedule', asgId, { schedules });
    app.showToast('Schedule saved successfully.', 'success');
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
    const subAsgs = (app.data.assignments || []).filter(a => !sub || a.subjectId === sub.id || a.subject_id === sub.id);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Submission Verification & Deductions Layer</h1>
          <p class="page-subtitle">Audit sign-off for evaluated lab submission records (${pendingSubs.length} Pending Sign-off)</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="facultyView.applySemesterEndDeductions('${sub ? sub.id : ''}')">⚡ Semester-End Apply Deductions</button>
          <button class="btn btn-primary" onclick="facultyView.verifyAllPending()">✅ Admin Verify All Pending</button>
        </div>
      </div>

      <div class="card">
        <div class="table-container" style="max-height:500px; overflow-y:auto;">
          <table class="custom-table">
            <thead>
              <tr><th>Student UIN</th><th>Parameter ID</th><th>Submitted Value</th><th>Raw Marks</th><th>Final Marks (After Deductions)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${pendingSubs.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding:20px;">🟢 All submissions verified and finalized!</td></tr>` : pendingSubs.map(s => {
                const rawVal = (s.rawMarks ?? s.raw_marks ?? s.marksAwarded ?? 0);
                const finalVal = (s.marksAwarded ?? s.finalMarks ?? 0);
                return `
                  <tr>
                    <td class="mono-val" style="font-weight:700;">${s.studentId}</td>
                    <td class="mono-val">${s.parameterId}</td>
                    <td class="mono-val">${s.submittedValue}</td>
                    <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${rawVal.toFixed(2)}</td>
                    <td class="mono-val" style="font-weight:700; color:var(--success);">${finalVal.toFixed(2)}</td>
                    <td><span class="tag tag-warning">${(s.verificationStatus || 'Pending').toUpperCase()}</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm" onclick="facultyView.verifySingleSubmission('${s.id}')">✓ Verify</button>
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

  async applySemesterEndDeductions(subId) {
    if (!confirm('Apply attempt & late penalty deductions to all completed assignment submissions for this semester? All audit logs will be updated.')) return;

    let count = 0;
    app.data.submissions.forEach(s => {
      const raw = s.rawMarks ?? s.raw_marks ?? s.marksAwarded ?? 0;
      const attDed = s.attemptDeductionPct || 0;
      const final = Math.max(0, raw * (1 - attDed / 100));
      s.marksAwarded = final;
      s.finalMarks = final;
      count++;
    });

    app.saveState();
    writeAudit('updated', 'semester_deductions', subId || 'all_subjects', { submissions_processed: count, applied_at: new Date().toISOString() });
    app.showToast(`Applied semester-end deductions to ${count} submission records. Audit logged.`, 'success');
    app.renderCurrentView();
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
    const asgCodeLabel = asg ? (asg.display_code || asg.working_title || asg.id) : '';
    app.showToast(`Locked assignment ${asgCodeLabel} and exported Gazette Gradebook CSV!`, 'success');
    app.renderCurrentView();
  },

  async saveAsTemplate(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const asgCodeLabel = asg.display_code || asg.working_title || asg.id;

    const tRecord = {
      id: `tmpl-${Date.now()}`,
      title: `${asgCodeLabel} Template — ${asg.title || asg.working_title || ''}`,
      subject_code: asg.subjectId,
      questions: facultyView.getAsgQuestions(asg),
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
    app.showToast(`Saved ${asgCodeLabel} as reusable assignment template!`, 'success');
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
    const sub = (app.data.subjects || []).find(s => s.id === subId) || app.data.subjects[0];
    if (!sub) {
      app.showToast('No valid subject found to create assignment', 'warning');
      return;
    }

    const subCOs = (app.data.courseOutcomes || []).filter(co =>
      co.subjectId === sub.id || co.subject_id === sub.id
    );
    const subModules = (app.data.modules || []).filter(m =>
      m.subjectId === sub.id || m.subject_id === sub.id
    );

    const academicYears = app.getAcademicYears();
    const activeAy = app.getActiveAcademicYear();

    const dept = (app.data.departments || HARDCODED_DEPARTMENTS).find(d => d.id === sub.departmentId);
    const deptShort = dept ? dept.shortName : 'FE';

    const defaultAbbr = sub.abbr || app.deriveAbbreviation(sub.fullName || sub.name);
    const defaultPrefix = `${defaultAbbr}Lab`;

    window.updateDisplayCodePreview = function() {
      const prefix = (document.getElementById('asg-series-prefix')?.value || '').trim();
      const type = document.getElementById('asg-series-type')?.value || 'L';
      const ay = document.getElementById('asg-academic-year')?.value || activeAy;
      const previewEl = document.getElementById('asg-code-preview');
      if (previewEl) {
        previewEl.textContent = `RCOE/${deptShort}/${ay}/${prefix}_${type}NNN`;
      }
    };

    app.showModal('📋 Create New Assignment Draft', `
      <form onsubmit="facultyView.saveNewAssignment(event, '${sub.id}')" style="min-width:520px;">

        <!-- Section 1 — Identity -->
        <div style="background:var(--bg-subtle); border-left:4px solid var(--accent-blue); padding:12px 14px; border-radius:var(--radius-md); margin-bottom:16px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary);">Subject Workspace</div>
          <div style="font-size:14px; font-weight:800; color:var(--accent-blue); margin-top:2px;">${sub.code} — ${sub.fullName || sub.name}</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">Department: <strong>${deptShort}</strong></div>
        </div>

        <!-- Section 2 — Working Title -->
        <div class="form-group">
          <label class="form-label">Working Title <span style="font-size:11px; font-weight:400; color:var(--text-tertiary);">(internal, not shown to students)</span></label>
          <input type="text" id="asg-working-title" class="form-input" placeholder="e.g. Experiment on Concurrent Force Systems" required>
        </div>

        <!-- Section 3 — Series Configuration -->
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Academic Year</label>
            <select id="asg-academic-year" class="form-select" onchange="window.updateDisplayCodePreview()" required>
              ${academicYears.map(ay => `<option value="${ay.label}" ${ay.label === activeAy ? 'selected' : ''}>${ay.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Series Prefix</label>
            <input type="text" id="asg-series-prefix" class="form-input code-font" value="${defaultPrefix}" oninput="window.updateDisplayCodePreview()" required>
          </div>
          <div class="form-group">
            <label class="form-label">Series Type</label>
            <select id="asg-series-type" class="form-select" onchange="window.updateDisplayCodePreview()" required>
              <option value="A">A — Assignment</option>
              <option value="L" selected>L — Lab Practical</option>
              <option value="T">T — Test/Quiz</option>
              <option value="P">P — Project</option>
            </select>
          </div>
        </div>

        <!-- Section 4 — Display Code Preview -->
        <div class="form-group">
          <label class="form-label">Display Code Preview (NNN assigned on Publish)</label>
          <div style="background:var(--bg-subtle); border:1px solid var(--border-default); padding:10px 14px; border-radius:var(--radius-md);">
            <div id="asg-code-preview" style="font-size:16px; font-weight:800; font-family:var(--font-mono); color:var(--accent-blue);">
              RCOE/${deptShort}/${activeAy}/${defaultPrefix}_LNNN
            </div>
            <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">The sequence number is assigned only when you publish. You can save as Draft now.</div>
          </div>
        </div>

        <!-- Section 5 — Academic Metadata & Rubric -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Primary BT Level</label>
            <select id="asg-bt-level" class="form-select" required>
              ${['BT1 — Remember', 'BT2 — Understand', 'BT3 — Apply', 'BT4 — Analyze', 'BT5 — Evaluate', 'BT6 — Create'].map((lbl, i) => `<option value="BT${i+1}" ${i===2 ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Grading Rubric Preset</label>
            <div style="display:flex; gap:6px;">
              <select id="asg-rubric-preset" class="form-select" style="flex:1;" required>
                ${(app.data.rubricPresets || []).map(r => `
                  <option value="${r.id}" ${r.is_preset ? 'selected' : ''}>
                    ${r.name} ${r.is_preset ? '(Institutional Standard)' : ''}
                  </option>
                `).join('')}
              </select>
              <button type="button" class="btn btn-secondary btn-sm" onclick="app.closeModal(); facultyView.openRubricModal();" title="Create New Rubric">+ New</button>
            </div>
          </div>
        </div>

        ${subCOs.length > 0 ? `
        <div class="form-group">
          <label class="form-label">Course Outcomes Mapping</label>
          <div style="display:flex; flex-direction:column; gap:6px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md); border:1px solid var(--border-default); max-height:130px; overflow-y:auto;">
            ${subCOs.map(co => `
              <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:pointer;">
                <input type="checkbox" name="asg-cos" value="${co.id}" style="margin-top:2px; accent-color:var(--accent-blue);">
                <span><strong style="color:var(--accent-blue);">${co.code}</strong> — ${co.description}</span>
              </label>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${subModules.length > 0 ? `
        <div class="form-group">
          <label class="form-label">Module Coverage</label>
          <div style="display:flex; flex-direction:column; gap:6px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md); border:1px solid var(--border-default); max-height:130px; overflow-y:auto;">
            ${subModules.map(m => `
              <label style="display:flex; align-items:flex-start; gap:8px; font-size:12px; cursor:pointer;">
                <input type="checkbox" name="asg-modules" value="${m.id}" style="margin-top:2px; accent-color:var(--accent-blue);">
                <span><strong>${m.code || m.module_code || ''}</strong> — ${m.name || m.module_name || m.title}</span>
              </label>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">💾 Save as Draft</button>
        </div>
      </form>
    `);
  },

  async saveNewAssignment(e, subId) {
    e.preventDefault();
    const sub = (app.data.subjects || []).find(s => s.id === subId);
    if (!sub) return;

    const workingTitle = document.getElementById('asg-working-title').value.trim();
    const seriesPrefix = document.getElementById('asg-series-prefix').value.trim();
    const seriesType = document.getElementById('asg-series-type').value;
    const academicYear = document.getElementById('asg-academic-year').value;
    const btLevel = document.getElementById('asg-bt-level').value;
    const rubricPresetId = document.getElementById('asg-rubric-preset').value;
    const selectedCOIds = Array.from(document.querySelectorAll('input[name="asg-cos"]:checked')).map(cb => cb.value);
    const selectedModuleIds = Array.from(document.querySelectorAll('input[name="asg-modules"]:checked')).map(cb => cb.value);

    // Deterministic internal ID — timestamp-free base with Date.now() for multiple draft uniqueness
    const deterministicAsgId = `asg-${subId}-${seriesPrefix.toLowerCase()}-${seriesType.toLowerCase()}-${Date.now()}`;

    const asgRecord = {
      id: deterministicAsgId,
      working_title: workingTitle,
      title: workingTitle, // title = working_title until publish assigns display_code
      subjectId: subId,
      subject_id: subId,
      series_prefix: seriesPrefix,
      seriesPrefix: seriesPrefix,
      series_type: seriesType,
      seriesType: seriesType,
      academic_year: academicYear,
      lifecycle_status: 'draft',
      state: 'Draft',
      display_code: null, // assigned at publish
      btLevel: btLevel,
      bt_level: btLevel,
      rubric_preset_id: rubricPresetId,
      rubricPresetId: rubricPresetId,
      coIds: selectedCOIds,
      co_ids: JSON.stringify(selectedCOIds),
      modules_covered: JSON.stringify(selectedModuleIds),
      questions: [],
      schedules: []
    };

    if (!app.data.assignments) app.data.assignments = [];
    app.data.assignments.push(asgRecord);
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: asgRecord.id,
      code: asgRecord.id,
      title: asgRecord.title,
      working_title: asgRecord.working_title,
      subject_id: subId,
      series_prefix: seriesPrefix,
      series_type: seriesType,
      lifecycle_status: 'draft',
      display_code: null,
      bt_level: btLevel,
      rubric_preset_id: rubricPresetId,
      co_ids: asgRecord.co_ids,
      modules_covered: asgRecord.modules_covered,
      questions: JSON.stringify([]),
      schedules: JSON.stringify([])
    }, `Draft assignment — ${workingTitle}`);

    writeAudit('created', 'assignment', asgRecord.id, { working_title: workingTitle, subject_id: subId });
    app.closeModal();
    app.showToast(`Draft saved: "${workingTitle}" — questions can now be added.`, 'success');
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

    const asgCodeLabel = asg.display_code || asg.working_title || asg.id;

    app.showModal(`➕ Add Question — ${asgCodeLabel}`, `
      <form onsubmit="facultyView.saveNewQuestion(event, '${asgId}')" style="min-width:480px;">
        <div class="form-group">
          <label class="form-label">Question Text</label>
          <textarea id="q-text" class="form-input" rows="4"
            placeholder="e.g. Find the resultant of two concurrent forces {{F1}} N and {{F2}} N at angle {{theta}}°."
            required></textarea>
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">Use {{variable}} placeholders for student-specific values.</div>
          <div style="margin-top:6px;">
            <a href="javascript:void(0)" onclick="const g=this.nextElementSibling; g.style.display=g.style.display==='none'?'block':'none';" style="font-size:11px; color:var(--accent-blue); text-decoration:none; font-weight:600; cursor:pointer;">ℹ️ Formatting Guide</a>
            <div style="display:none; margin-top:6px; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-sm); font-size:11px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <th style="padding:2px 4px; font-weight:600;">You type</th>
                    <th style="padding:2px 4px; font-weight:600;">Renders as</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style="padding:2px 4px;"><code>omega</code>, <code>theta</code>, <code>alpha</code></td><td style="padding:2px 4px;">ω, θ, α</td></tr>
                  <tr><td style="padding:2px 4px;"><code>x^2</code>, <code>v^{max}</code></td><td style="padding:2px 4px;">x², v^max</td></tr>
                  <tr><td style="padding:2px 4px;"><code>k_1</code>, <code>x_{eq}</code></td><td style="padding:2px 4px;">k₁, x_eq</td></tr>
                  <tr><td style="padding:2px 4px;"><code>N/(m^2)</code></td><td style="padding:2px 4px;">N/m² fraction</td></tr>
                  <tr><td style="padding:2px 4px;"><code>sqrt(k/m)</code></td><td style="padding:2px 4px;">√(k/m)</td></tr>
                  <tr><td style="padding:2px 4px;"><code>$\frac{k}{m}$</code></td><td style="padding:2px 4px;">Full KaTeX fraction</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Section Label <span style="color:var(--text-tertiary); font-weight:400;">(optional)</span></label>
          <input type="text" id="q-section" class="form-input" placeholder="e.g. Section A — Numerical">
        </div>
        <div class="form-group">
          <label class="form-label">Question Diagram Image URL <span style="color:var(--text-tertiary); font-weight:400;">(optional)</span></label>
          <input type="text" id="q-image-url" class="form-input code-font" placeholder="https://drive.google.com/file/d/...">
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">⚠️ Ensure Google Drive file access is set to 'Anyone with the link' before pasting the URL here.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Per-Student Variables</label>
          <div style="display:flex; align-items:center; gap:10px; padding:10px; background:var(--bg-subtle); border-radius:var(--radius-md);">
            <input type="checkbox" id="q-use-vars" style="width:16px; height:16px; accent-color:var(--accent-blue);">
            <div>
              <div style="font-size:13px; font-weight:600;">This question uses per-student variable values</div>
              <div style="font-size:11px; color:var(--text-secondary);">e.g. F1, F2, theta differ per student. You'll upload variable assignments after saving questions.</div>
            </div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Question Max Marks</label>
            <input type="number" id="q-max-marks" class="form-input" min="1" step="0.5" value="10" placeholder="e.g. 10" required>
          </div>
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
    const questions = facultyView.getAsgQuestions(asg);

    const qId = `q-${asgId}-${Date.now()}`;
    const qRecord = {
      id: qId,
      text: document.getElementById('q-text').value.trim(),
      section: document.getElementById('q-section').value.trim(),
      imageUrl: document.getElementById('q-image-url').value.trim(),
      usePerStudentVariables: document.getElementById('q-use-vars').checked,
      variableNames: [],
      max_marks: parseFloat(document.getElementById('q-max-marks').value) || 10,
      maxMarks: parseFloat(document.getElementById('q-max-marks').value) || 10,
      coId: document.getElementById('q-co').value,
      btLevel: document.getElementById('q-bt').value,
      parameters: []
    };
    questions.push(qRecord);
    asg.questions = JSON.stringify(questions);
    app.saveState();

    const asgCode = asg.display_code || asg.id;
    const asgCodeLabel = asg.display_code || asg.working_title || asg.id;

    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asgCode,
      title: asg.title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: JSON.stringify(asg.schedules || [])
    }, `Assignment ${asgCodeLabel} (questions)`);

    writeAudit('created', 'question', qId, qRecord);
    app.closeModal();
    app.showToast(`Added question to ${asgCodeLabel}`, 'success');
    app.renderCurrentView();
  },

  openEditQuestionModal(asgId, qId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const q = facultyView.getAsgQuestions(asg).find(q => q.id === qId);
    if (!q) return;

    const subCOs = (app.data.courseOutcomes || []).filter(co =>
      co.subjectId === asg.subjectId || co.subject_id === asg.subjectId ||
      co.subject_id === asg.subject_id
    );

    app.showModal('✏️ Edit Question', `
      <form onsubmit="facultyView.saveEditedQuestion(event, '${asgId}', '${qId}')" style="min-width:480px;">
        <div class="form-group">
          <label class="form-label">Question Text</label>
          <textarea id="q-text" class="form-input" rows="4"
            placeholder="e.g. Find the resultant of two concurrent forces {{F1}} N and {{F2}} N at angle {{theta}}°."
            required>${q.text || ''}</textarea>
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">Use {{variable}} placeholders for student-specific values.</div>
          <div style="margin-top:6px;">
            <a href="javascript:void(0)" onclick="const g=this.nextElementSibling; g.style.display=g.style.display==='none'?'block':'none';" style="font-size:11px; color:var(--accent-blue); text-decoration:none; font-weight:600; cursor:pointer;">ℹ️ Formatting Guide</a>
            <div style="display:none; margin-top:6px; padding:8px 10px; background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:var(--radius-sm); font-size:11px;">
              <table style="width:100%; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <th style="padding:2px 4px; font-weight:600;">You type</th>
                    <th style="padding:2px 4px; font-weight:600;">Renders as</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style="padding:2px 4px;"><code>omega</code>, <code>theta</code>, <code>alpha</code></td><td style="padding:2px 4px;">ω, θ, α</td></tr>
                  <tr><td style="padding:2px 4px;"><code>x^2</code>, <code>v^{max}</code></td><td style="padding:2px 4px;">x², v^max</td></tr>
                  <tr><td style="padding:2px 4px;"><code>k_1</code>, <code>x_{eq}</code></td><td style="padding:2px 4px;">k₁, x_eq</td></tr>
                  <tr><td style="padding:2px 4px;"><code>N/(m^2)</code></td><td style="padding:2px 4px;">N/m² fraction</td></tr>
                  <tr><td style="padding:2px 4px;"><code>sqrt(k/m)</code></td><td style="padding:2px 4px;">√(k/m)</td></tr>
                  <tr><td style="padding:2px 4px;"><code>$\frac{k}{m}$</code></td><td style="padding:2px 4px;">Full KaTeX fraction</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Section Label <span style="color:var(--text-tertiary); font-weight:400;">(optional)</span></label>
          <input type="text" id="q-section" class="form-input" placeholder="e.g. Section A — Numerical" value="${q.section || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Question Diagram Image URL <span style="color:var(--text-tertiary); font-weight:400;">(optional)</span></label>
          <input type="text" id="q-image-url" class="form-input code-font" placeholder="https://drive.google.com/file/d/..." value="${q.imageUrl || ''}">
          <div style="font-size:11px; color:var(--text-tertiary); margin-top:4px;">⚠️ Ensure Google Drive file access is set to 'Anyone with the link' before pasting the URL here.</div>
        </div>
        <div class="form-group">
          <label class="form-label">Per-Student Variables</label>
          <div style="display:flex; align-items:center; gap:10px; padding:10px; background:var(--bg-subtle); border-radius:var(--radius-md);">
            <input type="checkbox" id="q-use-vars" ${q.usePerStudentVariables ? 'checked' : ''} style="width:16px; height:16px; accent-color:var(--accent-blue);">
            <div>
              <div style="font-size:13px; font-weight:600;">This question uses per-student variable values</div>
              <div style="font-size:11px; color:var(--text-secondary);">e.g. F1, F2, theta differ per student. You'll upload variable assignments after saving questions.</div>
            </div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Question Max Marks</label>
            <input type="number" id="q-max-marks" class="form-input" min="1" step="0.5" value="${q.max_marks || q.maxMarks || 10}" placeholder="e.g. 10" required>
          </div>
          <div class="form-group">
            <label class="form-label">CO Mapping</label>
            <select id="q-co" class="form-select">
              <option value="">— None —</option>
              ${subCOs.map(co => `<option value="${co.id}" ${q.coId === co.id ? 'selected' : ''}>${co.code} — ${co.description.substring(0,40)}…</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">BT Level</label>
            <select id="q-bt" class="form-select">
              ${['BT1 — Remember','BT2 — Understand','BT3 — Apply','BT4 — Analyze','BT5 — Evaluate','BT6 — Create'].map((l,i)=>`<option value="BT${i+1}" ${(q.btLevel || 'BT3') === `BT${i+1}` ? 'selected':''}>BT${i+1} — ${l.split('—')[1].trim()}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `);
  },

  async saveEditedQuestion(e, asgId, qId) {
    e.preventDefault();
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const questions = facultyView.getAsgQuestions(asg);
    const q = questions.find(q => q.id === qId);
    if (!q) return;

    q.text = document.getElementById('q-text').value.trim();
    q.section = document.getElementById('q-section').value.trim();
    q.imageUrl = document.getElementById('q-image-url').value.trim();
    q.usePerStudentVariables = document.getElementById('q-use-vars').checked;
    q.max_marks = parseFloat(document.getElementById('q-max-marks').value) || 10;
    q.maxMarks = q.max_marks;
    q.coId = document.getElementById('q-co').value;
    q.btLevel = document.getElementById('q-bt').value;

    delete asg.is_migrated;
    delete asg.isMigrated;

    asg.questions = JSON.stringify(questions);
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asg.display_code || asg.id,
      title: asg.title || asg.working_title,
      working_title: asg.working_title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      rubric_preset_id: asg.rubric_preset_id || asg.rubricPresetId || 'rub-inst-001',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: JSON.stringify(asg.schedules || [])
    }, `Assignment ${asg.display_code || asg.id}`);

    writeAudit('updated', 'question', qId, q);
    app.closeModal();
    app.showToast('Question updated', 'success');
    app.renderCurrentView();
  },

  openAddParameterModal(asgId, questionId) {
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;
    const q = facultyView.getAsgQuestions(asg).find(q => q.id === questionId);
    if (!q) return;

    const asgCodeLabel = asg.display_code || asg.working_title || asg.id;

    app.showModal(`⚙️ Add Parameter — ${asgCodeLabel}`, `
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
            <label class="form-label">Parameter Type</label>
            <select id="param-type" class="form-select" required>
              <option value="given">Given (1x multiplier)</option>
              <option value="intermediate" selected>Intermediate (2x multiplier)</option>
              <option value="final">Final (3x multiplier)</option>
            </select>
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
    const questions = facultyView.getAsgQuestions(asg);
    const q = questions.find(q => q.id === questionId);
    if (!q) return;
    if (!Array.isArray(q.parameters)) q.parameters = [];

    const paramId = `param-${questionId}-${Date.now()}`;
    const correctValue = document.getElementById('param-correct').value.trim();
    const paramType = document.getElementById('param-type').value;
    const paramRecord = {
      id: paramId,
      label: document.getElementById('param-label').value.trim(),
      unitHint: document.getElementById('param-unit').value.trim(),
      parameter_type: paramType,
      parameterType: paramType,
      correctValue: correctValue
    };
    q.parameters.push(paramRecord);
    asg.questions = JSON.stringify(questions);
    app.saveState();

    const asgCode = asg.display_code || asg.id;
    const asgCodeLabel = asg.display_code || asg.working_title || asg.id;

    // Upsert the full assignment (JSONB questions column)
    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asgCode,
      title: asg.title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: JSON.stringify(asg.schedules || [])
    }, `Assignment ${asgCodeLabel} (parameters)`);

    writeAudit('created', 'parameter', paramId, paramRecord);
    app.closeModal();
    app.showToast(`Added parameter "${paramRecord.label}" to question`, 'success');
    app.renderCurrentView();
  },

  openPublishModal(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const questions = facultyView.getAsgQuestions(asg);

    const allParams = questions.flatMap(q => q.parameters || []);
    const paramsWithGroundTruth = allParams.filter(p => p.correctValue && p.correctValue.trim() !== '');
    const questionsWithVars = questions.filter(q => q.usePerStudentVariables === true);

    // Check enrolled students have variables assigned for variable questions
    const subStudents = app.getStudentsForDept(
      (app.data.subjects || []).find(s => s.id === (asg.subjectId || asg.subject_id))?.departmentId || ''
    );

    let varCoverage = true;
    if (questionsWithVars.length > 0) {
      subStudents.forEach(st => {
        const hasVars = (app.data.studentVariables || []).some(v =>
          v.studentId === st.id && (v.assignmentId === asg.id)
        );
        if (!hasVars) varCoverage = false;
      });
    }

    const checks = [
      { label: 'At least one question added', pass: questions.length > 0 },
      { label: 'All questions have at least one parameter', pass: questions.every(q => (q.parameters || []).length > 0) },
      { label: `Ground truth set for ${paramsWithGroundTruth.length}/${allParams.length} parameters`, pass: paramsWithGroundTruth.length > 0, warn: paramsWithGroundTruth.length < allParams.length },
      { label: 'Per-student variables assigned for all enrolled students', pass: varCoverage, skip: questionsWithVars.length === 0 }
    ];

    const checklistHtml = checks.map(c => {
      if (c.skip) return `<div style="color:var(--text-tertiary); font-size:13px;">⊘ ${c.label} (not applicable)</div>`;
      if (c.pass && !c.warn) return `<div style="color:var(--success); font-size:13px;">✓ ${c.label}</div>`;
      if (c.warn) return `<div style="color:var(--warning); font-size:13px;">⚠ ${c.label}</div>`;
      return `<div style="color:var(--danger); font-size:13px;">✕ ${c.label}</div>`;
    }).join('');

    const hasBlocker = checks.some(c => !c.skip && !c.pass && !c.warn);

    // Series config for display code preview
    const seriesPrefix = asg.series_prefix || asg.seriesPrefix || '';
    const seriesType = asg.series_type || asg.seriesType || 'A';
    const academicYear = asg.academic_year || app.getActiveAcademicYear();
    const sub = (app.data.subjects || []).find(s => s.id === (asg.subjectId || asg.subject_id));
    const dept = (app.data.departments || HARDCODED_DEPARTMENTS).find(d => d.id === (sub?.departmentId || sub?.department_id));
    const deptShort = dept ? dept.shortName : 'FE';

    // Get next number for preview
    const seqId = `seq-${asg.subjectId || asg.subject_id}-${academicYear}-${seriesPrefix}-${seriesType}`.toLowerCase().replace(/[^a-z0-9\-]/g, '-');
    const seqRecord = (app.data.assignmentSequences || []).find(s => s.id === seqId);
    const nextNum = seqRecord ? seqRecord.last_number + 1 : 1;
    const previewCode = `RCOE/${deptShort}/${academicYear}/${seriesPrefix}_${seriesType}${String(nextNum).padStart(3, '0')}`;

    app.showModal(`📢 Publish Assignment — ${asg.working_title || asg.title}`, `
      <div style="display:flex; flex-direction:column; gap:16px; min-width:480px;">

        <div style="background:var(--accent-blue-subtle); border:1px solid var(--accent-blue); border-radius:var(--radius-md); padding:14px 18px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--accent-blue); margin-bottom:4px;">Display Code to be Assigned</div>
          <div style="font-size:22px; font-weight:800; font-family:var(--font-mono); color:var(--accent-blue);">${previewCode}</div>
          <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">This code is permanent and cannot be changed after publishing.</div>
        </div>

        <div style="background:var(--bg-subtle); border-radius:var(--radius-md); padding:14px 18px;">
          <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:10px;">Pre-Publish Checklist</div>
          <div style="display:flex; flex-direction:column; gap:6px;">${checklistHtml}</div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button class="btn btn-primary" onclick="facultyView.confirmPublish('${asgId}')" ${hasBlocker ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
            📢 Confirm Publish
          </button>
        </div>
      </div>
    `);
  },

  async confirmPublish(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    app.closeModal();
    app.showSpinner('Assigning display code & publishing…');

    try {
      const seriesPrefix = asg.series_prefix || asg.seriesPrefix || '';
      const seriesType = asg.series_type || asg.seriesType || 'A';
      const academicYear = asg.academic_year || app.getActiveAcademicYear();
      const subjectId = asg.subjectId || asg.subject_id;

      // This increments the counter and returns the display code
      const displayCode = await app.generateDisplayCode(subjectId, seriesPrefix, seriesType, academicYear);

      asg.display_code = displayCode;
      asg.lifecycle_status = 'published';
      asg.state = 'Published';
      asg.title = displayCode; // title becomes the display code after publish

      app.saveState();

      await app.supabaseUpsert('assignments', {
        id: asg.id,
        code: displayCode,
        title: displayCode,
        working_title: asg.working_title,
        display_code: displayCode,
        subject_id: subjectId,
        series_prefix: seriesPrefix,
        series_type: seriesType,
        lifecycle_status: 'published',
        bt_level: asg.btLevel || asg.bt_level || '',
        co_ids: typeof asg.co_ids === 'string' ? asg.co_ids : JSON.stringify(asg.coIds || []),
        modules_covered: typeof asg.modules_covered === 'string' ? asg.modules_covered : JSON.stringify(asg.modulesCovered || []),
        questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
        schedules: typeof asg.schedules === 'string' ? asg.schedules : JSON.stringify(asg.schedules || [])
      }, `Assignment ${displayCode}`);

      writeAudit('updated', 'assignment', asgId, { display_code: displayCode, lifecycle_status: 'published' });
      app.showToast(`✅ Published as ${displayCode} — students can now see this assignment.`, 'success');
    } catch(err) {
      app.showToast(`Failed to publish: ${err.message}`, 'danger');
    } finally {
      app.hideSpinner();
      app.renderCurrentView();
    }
  },

  async retractAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const subSubs = (app.data.submissions || []).filter(s => s.assignmentId === asgId || s.assignment_id === asgId);

    if (subSubs.length > 0) {
      if (!confirm(`This assignment has ${subSubs.length} student submission(s). Retracting will hide it from students but preserve all submission records. The display code ${asg.display_code} will be permanently retired. Continue?`)) return;
    } else {
      if (!confirm(`Retract ${asg.display_code}? This will hide it from students. Since there are no submissions, you can rebuild and republish under the same code slot by creating a new draft.`)) return;
    }

    asg.lifecycle_status = 'retracted';
    asg.state = 'Retracted';
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: asg.id,
      title: asg.title,
      display_code: asg.display_code,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: 'retracted',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: typeof asg.schedules === 'string' ? asg.schedules : JSON.stringify(asg.schedules || [])
    }, `Assignment ${asg.display_code}`);

    writeAudit('updated', 'assignment', asgId, { lifecycle_status: 'retracted' });
    app.showToast(`↩ ${asg.display_code} retracted — hidden from students.`, 'info');
    app.renderCurrentView();
  },

  async deleteDraftAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    if ((asg.lifecycle_status || 'draft') !== 'draft') {
      app.showToast('Only draft assignments can be deleted. Use Retract for published assignments.', 'warning');
      return;
    }

    if (!confirm(`Delete draft "${asg.working_title || asg.title}"? This cannot be undone. No display code was assigned so the sequence is unaffected.`)) return;

    // Cascade delete student_variables and student_answers for this draft
    const draftVars = (app.data.studentVariables || []).filter(v => v.assignmentId === asgId);
    for (const v of draftVars) {
      await app.supabaseDelete('student_variables', v.id, `Student variable ${v.id}`);
    }
    app.data.studentVariables = (app.data.studentVariables || []).filter(v => v.assignmentId !== asgId);

    const draftAnswers = (app.data.studentAnswers || []).filter(a => a.assignmentId === asgId);
    for (const a of draftAnswers) {
      await app.supabaseDelete('student_answers', a.id, `Student answer ${a.id}`);
    }
    app.data.studentAnswers = (app.data.studentAnswers || []).filter(a => a.assignmentId !== asgId);

    // Delete the assignment
    app.data.assignments = app.data.assignments.filter(a => a.id !== asgId);
    await app.supabaseDelete('assignments', asgId, `Draft assignment ${asg.working_title || asg.title}`);

    app.saveState();
    writeAudit('deleted', 'assignment', asgId, { working_title: asg.working_title, reason: 'draft_deleted' });
    app.showToast(`Deleted draft "${asg.working_title || asg.title}"`, 'info');
    app.renderCurrentView();
  },

  async rebuildFromRetracted(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const subId = asg.subjectId || asg.subject_id;
    const newAsgId = `asg-${subId}-${(asg.series_prefix || 'asg').toLowerCase()}-${Date.now()}`;

    const newDraft = {
      ...JSON.parse(JSON.stringify(asg)),
      id: newAsgId,
      lifecycle_status: 'draft',
      state: 'Draft',
      display_code: null,
      title: `${asg.working_title || asg.title} (Rebuilt)`
    };

    app.data.assignments.push(newDraft);
    app.saveState();

    await app.supabaseUpsert('assignments', {
      id: newDraft.id,
      title: newDraft.title,
      working_title: newDraft.working_title || newDraft.title,
      subject_id: subId,
      series_prefix: newDraft.series_prefix || newDraft.seriesPrefix || '',
      series_type: newDraft.series_type || newDraft.seriesType || 'A',
      lifecycle_status: 'draft',
      display_code: null,
      bt_level: newDraft.bt_level || newDraft.btLevel || '',
      questions: typeof newDraft.questions === 'string' ? newDraft.questions : JSON.stringify(newDraft.questions || []),
      schedules: JSON.stringify([])
    }, `Rebuilt draft assignment`);

    writeAudit('created', 'assignment', newDraft.id, { rebuilt_from: asgId });
    app.showToast(`Rebuilt as new draft: "${newDraft.title}"`, 'success');
    app.renderCurrentView();
  },

  /* ==========================================================================
     RUBRIC MANAGER
     ========================================================================== */
  renderRubricManager(container, sub) {
    const rubrics = app.data.rubricPresets || [];
    const currentUserEmail = (app.currentUser?.email || '').trim().toLowerCase();

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Grading Rubric Manager</h1>
          <p class="page-subtitle">Global pool of rubric presets for auto-evaluation, band tolerances, and deduction rules</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openRubricModal()">+ Create New Rubric</button>
      </div>

      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:16px;">
        ${rubrics.map(r => {
          const isInst = r.is_preset || r.isPreset;

          return `
            <div class="card" style="padding:18px; position:relative; ${isInst ? 'border-left:4px solid var(--accent-blue);' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div>
                  <h3 style="font-size:15px; font-weight:700; color:var(--text-primary); margin:0;">
                    ${isInst ? '🔒 ' : ''}${r.name}
                  </h3>
                  <span style="font-size:11px; color:var(--text-secondary);">
                    By: <strong>${r.created_by || 'Institutional'}</strong> ${isInst ? '<span class="tag tag-co" style="font-size:9px;">Preset</span>' : ''}
                  </span>
                </div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin:12px 0; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md);">
                <div>Tolerances: <br><strong class="mono-val">Ex: ±${r.tolerance_exemplary}% | Pr: ±${r.tolerance_proficient}% | Dev: ±${r.tolerance_developing}%</strong></div>
                <div>Weight Distribution: <br><strong class="mono-val">Num: ${r.numerical_weight}% | Unit: ${r.units_weight}%</strong></div>
                <div>Param Multipliers: <br><strong class="mono-val">G:${r.given_multiplier}x | I:${r.intermediate_multiplier}x | F:${r.final_multiplier}x</strong></div>
                <div>Deduction Rules: <br><strong style="color:${r.attempt_deductions_enabled ? 'var(--warning)' : 'var(--text-tertiary)'};">Att: ${r.attempt_deductions_enabled ? 'ON' : 'OFF'}</strong> | <strong style="color:${r.late_penalty_enabled ? 'var(--warning)' : 'var(--text-tertiary)'};">Late: ${r.late_penalty_enabled ? 'ON' : 'OFF'}</strong></div>
              </div>

              <div style="display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="facultyView.cloneRubric('${r.id}')">📋 Clone</button>
                ${!isInst ? `
                  <button class="btn btn-ghost btn-sm" onclick="facultyView.openRubricModal('${r.id}')">✏️ Edit</button>
                  <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteRubric('${r.id}')">🗑️ Delete</button>
                ` : `<span style="font-size:11px; color:var(--text-tertiary); align-self:center;">Protected Institutional Preset</span>`}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openRubricModal(rubricId = null) {
    const existing = rubricId ? (app.data.rubricPresets || []).find(r => r.id === rubricId) : null;
    const isEdit = !!existing;

    app.showModal(`${isEdit ? '✏️ Edit Rubric' : '➕ Create New Rubric'}`, `
      <form onsubmit="facultyView.saveRubric(event, ${isEdit ? `'${existing.id}'` : 'null'})" style="min-width:480px;">
        <div class="form-group">
          <label class="form-label">Rubric Name</label>
          <input type="text" id="rub-name" class="form-input" placeholder="e.g. Mechanical Lab Calculation Rubric" value="${existing ? existing.name : ''}" required>
        </div>

        <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin:14px 0 6px 0;">Tolerance Bands (% Error)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label class="form-label">Exemplary (100%)</label>
            <input type="number" id="rub-tol-ex" class="form-input" min="0" step="0.5" value="${existing ? existing.tolerance_exemplary : 2}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Proficient (75%)</label>
            <input type="number" id="rub-tol-pr" class="form-input" min="0" step="0.5" value="${existing ? existing.tolerance_proficient : 5}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Developing (50%)</label>
            <input type="number" id="rub-tol-dev" class="form-input" min="0" step="0.5" value="${existing ? existing.tolerance_developing : 10}" required>
          </div>
        </div>

        <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin:14px 0 6px 0;">Parameter Multipliers</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
          <div class="form-group">
            <label class="form-label">Given (1x)</label>
            <input type="number" id="rub-mult-given" class="form-input" min="0.5" step="0.5" value="${existing ? existing.given_multiplier : 1}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Intermediate (2x)</label>
            <input type="number" id="rub-mult-inter" class="form-input" min="0.5" step="0.5" value="${existing ? existing.intermediate_multiplier : 2}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Final (3x)</label>
            <input type="number" id="rub-mult-final" class="form-input" min="0.5" step="0.5" value="${existing ? existing.final_multiplier : 3}" required>
          </div>
        </div>

        <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin:14px 0 6px 0;">Weight Share (% total parameter mark)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group">
            <label class="form-label">Numerical Weight %</label>
            <input type="number" id="rub-weight-num" class="form-input" min="0" max="100" value="${existing ? existing.numerical_weight : 70}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Units Weight % (Tracked)</label>
            <input type="number" id="rub-weight-unit" class="form-input" min="0" max="100" value="${existing ? existing.units_weight : 30}" required>
          </div>
        </div>

        <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--text-tertiary); margin:14px 0 6px 0;">Deduction Rules</div>
        <div style="display:flex; flex-direction:column; gap:8px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-md);">
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
            <input type="checkbox" id="rub-ded-att" ${existing?.attempt_deductions_enabled ? 'checked' : ''} style="accent-color:var(--accent-blue);">
            <span>Enable Attempt Deductions (Attempt 2: -10%, Attempt 3: -20%)</span>
          </label>
          <label style="display:flex; align-items:center; gap:8px; font-size:12px; cursor:pointer;">
            <input type="checkbox" id="rub-ded-late" ${existing?.late_penalty_enabled ? 'checked' : ''} style="accent-color:var(--accent-blue);">
            <span>Enable Late Penalty (≤24h: -10%, ≤48h: -20%, >48h: -30%)</span>
          </label>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">💾 Save Rubric</button>
        </div>
      </form>
    `);
  },

  async saveRubric(e, rubricId) {
    e.preventDefault();
    const isEdit = !!rubricId;
    const rubId = isEdit ? rubricId : `rub-${Date.now()}`;
    const currentUserEmail = (app.currentUser?.email || 'jugaljagtap@eng.rizvi.edu.in').trim().toLowerCase();

    const rubricRecord = {
      id: rubId,
      name: document.getElementById('rub-name').value.trim(),
      created_by: currentUserEmail,
      is_preset: false,
      tolerance_exemplary: parseFloat(document.getElementById('rub-tol-ex').value) || 2,
      tolerance_proficient: parseFloat(document.getElementById('rub-tol-pr').value) || 5,
      tolerance_developing: parseFloat(document.getElementById('rub-tol-dev').value) || 10,
      given_multiplier: parseFloat(document.getElementById('rub-mult-given').value) || 1,
      intermediate_multiplier: parseFloat(document.getElementById('rub-mult-inter').value) || 2,
      final_multiplier: parseFloat(document.getElementById('rub-mult-final').value) || 3,
      numerical_weight: parseFloat(document.getElementById('rub-weight-num').value) || 70,
      units_weight: parseFloat(document.getElementById('rub-weight-unit').value) || 30,
      attempt_deductions_enabled: document.getElementById('rub-ded-att').checked,
      late_penalty_enabled: document.getElementById('rub-ded-late').checked,
      created_at: new Date().toISOString()
    };

    if (!app.data.rubricPresets) app.data.rubricPresets = [];
    const idx = app.data.rubricPresets.findIndex(r => r.id === rubId);
    if (idx >= 0) app.data.rubricPresets[idx] = rubricRecord;
    else app.data.rubricPresets.push(rubricRecord);

    app.saveState();
    await app.supabaseUpsert('rubric_presets', rubricRecord, `Rubric ${rubricRecord.name}`);
    writeAudit(isEdit ? 'updated' : 'created', 'rubric_preset', rubId, rubricRecord);

    app.closeModal();
    app.showToast(`Saved rubric "${rubricRecord.name}"`, 'success');
    app.renderCurrentView();
  },

  async cloneRubric(rubricId) {
    const existing = (app.data.rubricPresets || []).find(r => r.id === rubricId);
    if (!existing) return;

    const newId = `rub-${Date.now()}`;
    const currentUserEmail = (app.currentUser?.email || 'jugaljagtap@eng.rizvi.edu.in').trim().toLowerCase();

    const cloned = {
      ...JSON.parse(JSON.stringify(existing)),
      id: newId,
      name: `${existing.name} (Copy)`,
      created_by: currentUserEmail,
      is_preset: false,
      created_at: new Date().toISOString()
    };

    app.data.rubricPresets.push(cloned);
    app.saveState();

    await app.supabaseUpsert('rubric_presets', cloned, `Rubric ${cloned.name}`);
    writeAudit('created', 'rubric_preset', newId, { cloned_from: rubricId });

    app.showToast(`Cloned rubric as "${cloned.name}"`, 'success');
    app.renderCurrentView();
  },

  async deleteRubric(rubricId) {
    const existing = (app.data.rubricPresets || []).find(r => r.id === rubricId);
    if (!existing) return;
    if (existing.is_preset || existing.isPreset) {
      app.showToast('Institutional preset rubric cannot be deleted.', 'warning');
      return;
    }

    if (!confirm(`Delete rubric "${existing.name}"? This cannot be undone.`)) return;

    app.data.rubricPresets = app.data.rubricPresets.filter(r => r.id !== rubricId);
    app.saveState();

    await app.supabaseDelete('rubric_presets', rubricId, `Rubric ${existing.name}`);
    writeAudit('deleted', 'rubric_preset', rubricId, { name: existing.name });

    app.showToast(`Deleted rubric "${existing.name}"`, 'info');
    app.renderCurrentView();
  },

  async dismissLegacyWarning(e, asgId) {
    if (e) e.stopPropagation();
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;

    delete asg.is_migrated;
    delete asg.isMigrated;

    app.saveState();
    await app.supabaseUpsert('assignments', {
      id: asg.id,
      code: asg.display_code || asg.code || asg.id,
      title: asg.title || asg.working_title,
      working_title: asg.working_title || asg.title,
      subject_id: asg.subjectId || asg.subject_id,
      lifecycle_status: asg.lifecycle_status || 'draft',
      display_code: asg.display_code || null,
      bt_level: asg.btLevel || asg.bt_level || '',
      rubric_preset_id: asg.rubric_preset_id || asg.rubricPresetId || 'rub-inst-001',
      questions: typeof asg.questions === 'string' ? asg.questions : JSON.stringify(asg.questions || []),
      schedules: typeof asg.schedules === 'string' ? asg.schedules : JSON.stringify(asg.schedules || [])
    }, `Dismissed legacy warning for ${asg.display_code || asg.working_title || asg.id}`);

    writeAudit('updated', 'legacy_warning_dismissed', asg.id, { dismissed_at: new Date().toISOString() });
    app.showToast('Dismissed legacy warning.', 'info');
    app.renderCurrentView();
  }
};
