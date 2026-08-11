/* ==========================================================================
   Rizvi College of Engineering - Faculty Module
   ========================================================================== */

const facultyView = {
  activeCSVAssignmentId: null,
  activeVerifyAssignmentId: null,
  gradingMode: 'bulk', // 'bulk' | 'queue' | 'roster'
  queueStudentIndex: 0,
  queueSelectedBatch: '',
  asgTabMode: 'builder', // 'builder' | 'roster'
  tempModalParameters: [],

  render(container, activeNav) {
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
        this.renderDashboard(container);
        break;
    }
  },

  renderDashboard(container) {
    const uniqueEvaluatedStudents = new Set(app.data.submissions.map(s => s.studentId)).size;
    const totalStudents = app.data.students.length;
    const scheduledBatchesCount = app.data.assignments.reduce((sum, a) => sum + (a.schedules ? a.schedules.length : 0), 0);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Overview</h1>
          <p class="page-subtitle">Manage lab assignments, student variables, and solution CSV pipelines</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Assignment</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Active Experiments</span>
          <span class="kpi-value">${app.data.assignments.length}</span>
          <span class="kpi-trend positive">Faculty Dashboard</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Scheduled Batches</span>
          <span class="kpi-value">${scheduledBatchesCount}</span>
          <span class="kpi-trend neutral">Batches Configured</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Submissions Evaluated</span>
          <span class="kpi-value">${uniqueEvaluatedStudents} / ${totalStudents}</span>
          <span class="kpi-trend positive">Unique Students</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Submissions</span>
          <span class="kpi-value">${app.data.submissions.length}</span>
          <span class="kpi-trend positive">Across All Assignments</span>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 class="card-title">My Lab Assignments</h2>
            <p class="card-subtitle">Select an assignment to build questions, edit schedules, or upload CSV solution keys</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="facultyView.openCreateAssignmentModal()">+ Create Assignment</button>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Assignment Code</th>
                <th>Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.assignments.map(asg => {
                const isOpen = asg.schedules && asg.schedules[0] && asg.schedules[0].submissionsOpen;
                return `
                  <tr>
                    <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono); font-size:12px;">${asg.code || 'RCOE/2026-27/FE/FEL101_A001'}</td>
                    <td style="font-weight:600;">${asg.title}</td>
                    <td><span class="tag ${isOpen ? 'tag-success' : 'tag-danger'}">${isOpen ? 'Open' : 'Closed'}</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm" onclick="app.startAssignment('${asg.id}');">View →</button>
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

  deleteAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    if (!confirm(`Are you sure you want to delete "${asg.title}" (${asg.code})?\n\nThis will also delete all submissions, student variables, and solution keys for this assignment. This cannot be undone.`)) return;

    // Remove from local data
    app.data.assignments = app.data.assignments.filter(a => a.id !== asgId);

    // Also clean up related local data
    app.data.submissions = app.data.submissions.filter(s => s.assignmentId !== asgId);
    app.data.studentVariables = app.data.studentVariables.filter(v => v.assignmentId !== asgId);
    app.data.studentAnswers = app.data.studentAnswers.filter(a => a.assignmentId !== asgId);

    app.saveState();

    // Sync deletion to Supabase
    app.deleteAssignmentFromSupabase(asgId);

    app.showToast(`Deleted assignment ${asg.code} and all related data`, 'info');
    if (app.activeNav === 'assignments') {
      this.renderAssignmentBuilder(document.getElementById('main-content'));
    } else {
      this.renderDashboard(document.getElementById('main-content'));
    }
  },

  searchStudentSheet() {
    const q = (document.getElementById('faculty-student-search').value || '').toLowerCase().trim();
    const container = document.getElementById('student-search-results');
    if (!q) { container.innerHTML = ''; return; }

    const matches = app.data.students.filter(s => s.uin.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q));
    if (matches.length === 0) {
      container.innerHTML = `<div style="font-size:13px; color:var(--danger);">No student records found matching "${q}".</div>`;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:12px; font-weight:600; color:var(--text-secondary);">Found ${matches.length} matching student(s):</div>
        ${matches.map(st => {
          const vars = app.data.studentVariables.filter(v => v.studentId === st.id);
          return `
            <div style="background:#FFF; padding:10px 14px; border-radius:var(--radius-md); border:1px solid var(--border-default); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong>${st.name}</strong> (<code class="code-font">${st.uin}</code>) | Branch: ${st.branch} | Div ${st.division} / Batch ${st.batch}
                <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                  Vars: ${vars.length > 0 ? vars.map(v => `${v.key}=${v.value}`).join(', ') : 'Default variables'}
                </div>
              </div>
              <div>
                <button class="btn btn-primary btn-sm" onclick="facultyView.openStudentSheetInspectionModal('${st.id}', '${app.activeAssignmentId || 'asg-001'}')">🔍 Read-Only Inspection</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openStudentSheetInspectionModal(studentId, assignmentId) {
    const student = app.data.students.find(s => s.id === studentId);
    if (!student) return;

    const asg = app.data.assignments.find(a => a.id === assignmentId) || app.data.assignments[0];
    const subject = app.data.subjects.find(s => s.id === asg.subjectId);
    const department = subject ? app.data.departments.find(d => d.id === subject.departmentId) : null;
    const deptName = department ? department.name.toUpperCase() : 'FIRST YEAR ENGINEERING DEPARTMENT';

    const studentVarsMap = {};
    app.data.studentVariables.forEach(v => {
      if (v.studentId === student.id && (v.assignmentId === asg.id || v.assignmentId === asg.originalId || ('asg-' + (asg.code || '').toLowerCase().replace(/[^a-z0-9_-]/g, '')) === v.assignmentId)) {
        studentVarsMap[v.key] = v.value;
      }
    });

    app.showModal(`Read-Only Sheet Inspection — ${student.name} (${student.uin})`, `
      <div style="max-height:80vh; overflow-y:auto; padding:10px;">
        <div style="background:var(--accent-blue-subtle); padding:10px 14px; border-radius:var(--radius-md); font-size:12px; margin-bottom:16px; color:var(--accent-blue);">
          ℹ️ <strong>Faculty Inspection Mode:</strong> Viewing ${asg.code} for UIN ${student.uin}. Your faculty session remains active.
        </div>

        <div style="background:#FFF; padding:20px; border:1px solid #000; font-family:sans-serif;">
          <div style="display:flex; align-items:center; gap:20px; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:10px;">
            <img src="assets/rizvi_logo.png" style="height:70px;" alt="Logo">
            <div style="flex:1; text-align:center;">
              <div style="font-size:11px; font-weight:700;">RIZVI EDUCATION SOCIETY's</div>
              <div style="font-size:18px; font-weight:800; color:#000;">RIZVI COLLEGE OF ENGINEERING</div>
              <div style="font-size:10px; font-weight:600;">Approved by AICTE | Recognized by DTE | Affiliated to University of Mumbai</div>
              <div style="font-size:11px; font-weight:800; text-transform:uppercase;">DEPARTMENT OF ${deptName}</div>
            </div>
          </div>

          <div style="font-size:12px; margin-bottom:12px;">
            <strong>Student UIN:</strong> <code class="code-font">${student.uin}</code> | <strong>Name:</strong> ${student.name} | <strong>Branch:</strong> ${student.branch} | <strong>Div/Batch:</strong> ${student.division}/${student.batch}
          </div>

          <!-- Full Width Rubric & Prominent Bloom's Taxonomy Section -->
          <div style="border:1px solid #000; padding:12px; margin-bottom:14px;">
            <div style="font-size:11px; font-weight:700; margin-bottom:6px; text-align:center; text-transform:uppercase;">Auto-Graded Performance Rubric</div>
            <table style="width:100%; border-collapse:collapse; font-size:10px; margin-bottom:12px;" border="1">
              <tr style="background:#F0F0F0; font-weight:700; text-align:center;">
                <td>Criteria Title</td>
                <td>Level 03 (≥ 90%)</td>
                <td>Level 02 (≥ 50%)</td>
                <td>Level 01 (< 50%)</td>
                <td>Level 00 (0%)</td>
              </tr>
              <tr>
                <td style="font-weight:600; padding:4px;">Numerical Values</td>
                <td style="text-align:center;">4 Marks</td>
                <td style="text-align:center;">3 Marks</td>
                <td style="text-align:center;">1 Marks</td>
                <td style="text-align:center;">0 Marks</td>
              </tr>
              <tr>
                <td style="font-weight:600; padding:4px;">Units Precision</td>
                <td style="text-align:center;">3 Marks</td>
                <td style="text-align:center;">2 Marks</td>
                <td style="text-align:center;">1 Marks</td>
                <td style="text-align:center;">0 Marks</td>
              </tr>
            </table>

            <div style="border-top:1px solid #000; padding-top:10px; text-align:center;">
              <div style="font-size:10px; font-weight:700; margin-bottom:6px; text-transform:uppercase; color:#333;">Bloom's Taxonomy Cognitive Domain Levels</div>
              <img src="assets/blooms_taxonomy.png" style="max-width:100%; height:220px; display:block; margin:0 auto; object-fit:contain;" alt="Bloom's Taxonomy">
            </div>
          </div>

          <div style="margin-top:16px;">
            <h4 style="font-size:13px; font-weight:700; margin-bottom:10px;">Substituted Question Set (${asg.title}):</h4>
            ${asg.questions.map(q => {
              const substitutedText = app.formatQuestionText(q.text, studentVarsMap);

              return `
                <div style="border:1px solid var(--border-default); padding:12px; border-radius:6px; margin-bottom:12px; background:#FAFAFA;">
                  <div style="font-weight:700; font-size:13px; margin-bottom:6px;">${q.sectionLabel}: ${q.coId} (${q.btLevel})</div>
                  <div style="font-size:13px; line-height:1.5;">${substitutedText}</div>
                  <div style="margin-top:10px; font-size:12px; color:var(--text-secondary);">
                    <strong>Expected Parameters:</strong>
                    ${q.parameters.map(p => `
                      <div style="margin-top:4px;">
                        • ${app.formatNaturalMath(p.label)}: Tol ±${p.tolerancePct}% | Accepted: [${p.acceptedUnits.map(u => app.formatNaturalMath(u)).join(', ')}]
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:16px;">
          <button class="btn btn-secondary" onclick="app.closeModal()">Close Inspection</button>
        </div>
      </div>
    `);
  },

  activeOutcomesSubTab: 'list',
  activeMatrixSubjectId: 'all',

  switchOutcomesSubTab(tabName) {
    this.activeOutcomesSubTab = tabName;
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  renderCOAndModulesManager(container) {
    const isList = this.activeOutcomesSubTab === 'list';
    const isMatrix = this.activeOutcomesSubTab === 'matrix';

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">My Course</h1>
          <p class="page-subtitle">Manage Syllabus Modules, COs/LOs, and comprehensive Net Mapping Matrix across POs, PSOs, Modules & Labs</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="facultyView.openAddModuleModal()">+ Add Subject Module</button>
          <button class="btn btn-primary" onclick="facultyView.openAddCOModal()">+ Add Outcome (CO / LO)</button>
        </div>
      </div>

      <!-- Sub-Tabs Navigation Bar -->
      <div class="sub-tabs-container">
        <button class="sub-tab-btn ${isList ? 'active' : ''}" onclick="facultyView.switchOutcomesSubTab('list')">
          📚 Outcomes & Syllabus Modules
        </button>
        <button class="sub-tab-btn ${isMatrix ? 'active' : ''}" onclick="facultyView.switchOutcomesSubTab('matrix')">
          🕸️ Net Mapping Matrix (CO/LO ↔ PO ↔ PSO ↔ Modules ↔ Experiments)
        </button>
      </div>

      ${isList ? this.renderOutcomesListHTML() : this.renderNetMappingMatrixHTML()}
    `;
  },

  collapsedSubjectIds: {},

  toggleSubjectGroup(groupKey) {
    this.collapsedSubjectIds[groupKey] = !this.collapsedSubjectIds[groupKey];
    if (app.activeNav === 'assignments') {
      this.renderAssignmentBuilder(document.getElementById('main-content'));
    } else {
      this.renderCOAndModulesManager(document.getElementById('main-content'));
    }
  },

  renderOutcomesListHTML() {
    const subjects = app.data.subjects || [];
    const allModules = app.data.modules || [];
    const allOutcomes = app.data.courseOutcomes || [];

    // 1. Render Grouped Syllabus Modules by Subject
    const groupedModulesHTML = subjects.map(sub => {
      const subMods = allModules.filter(m => m.subjectId === sub.id);
      if (subMods.length === 0) return '';
      const groupKey = 'mod-' + sub.id;
      const isCollapsed = !!this.collapsedSubjectIds[groupKey];

      return `
        <div class="subject-group-card">
          <div class="subject-group-header" onclick="facultyView.toggleSubjectGroup('${groupKey}')">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="subject-group-toggle-icon">${isCollapsed ? '►' : '▼'}</span>
              <span class="subject-code-badge">${sub.code}</span>
              <h4 class="subject-title-text">${sub.fullName}</h4>
            </div>
            <div>
              <span class="tag tag-bt" style="font-weight:600;">${subMods.length} Module${subMods.length > 1 ? 's' : ''} Defined</span>
            </div>
          </div>
          ${!isCollapsed ? `
            <div class="table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th style="min-width:140px;">Module Code</th>
                    <th>Module Title</th>
                    <th style="width:120px;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${subMods.map(m => `
                    <tr>
                      <td style="font-weight:700; font-family:var(--font-mono); color:var(--accent-blue);">${m.code}</td>
                      <td style="font-weight:500;">${m.title}</td>
                      <td style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditModuleModal('${m.id}')">✏️ Edit</button>
                        <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteModule('${m.id}')">🗑️ Delete</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // 2. Render Grouped Outcomes (COs & LOs) by Subject
    const groupedOutcomesHTML = subjects.map(sub => {
      const subCOs = allOutcomes.filter(co => co.subjectId === sub.id);
      if (subCOs.length === 0) return '';
      const groupKey = 'co-' + sub.id;
      const isCollapsed = !!this.collapsedSubjectIds[groupKey];
      const coCount = subCOs.filter(c => (c.type || (c.code && c.code.includes('.LO') ? 'LO' : 'CO')) === 'CO').length;
      const loCount = subCOs.filter(c => (c.type || (c.code && c.code.includes('.LO') ? 'LO' : 'CO')) === 'LO').length;

      return `
        <div class="subject-group-card">
          <div class="subject-group-header" onclick="facultyView.toggleSubjectGroup('${groupKey}')">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="subject-group-toggle-icon">${isCollapsed ? '►' : '▼'}</span>
              <span class="subject-code-badge">${sub.code}</span>
              <h4 class="subject-title-text">${sub.fullName}</h4>
            </div>
            <div style="display:flex; gap:8px;">
              ${coCount > 0 ? `<span class="tag tag-co" style="font-weight:600;">${coCount} CO${coCount > 1 ? 's' : ''}</span>` : ''}
              ${loCount > 0 ? `<span class="tag tag-lo" style="font-weight:600;">${loCount} LO${loCount > 1 ? 's' : ''}</span>` : ''}
            </div>
          </div>
          ${!isCollapsed ? `
            <div class="table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Outcome Code</th>
                    <th>Description</th>
                    <th>Mapped POs</th>
                    <th>Mapped PSOs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${subCOs.map(co => {
                    const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
                    const poList = (co.poIds && co.poIds.length > 0) ? co.poIds : (co.poId ? [co.poId] : []);
                    const psoList = co.psoIds || [];
                    return `
                      <tr>
                        <td><span class="tag ${type === 'LO' ? 'tag-lo' : 'tag-co'}">${type === 'LO' ? '🧪 Lab (LO)' : '📖 Course (CO)'}</span></td>
                        <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${co.code}</td>
                        <td style="font-weight:500;">${co.description}</td>
                        <td>
                          ${poList.length === 0 ? '<span style="color:var(--text-muted); font-size:12px;">Unmapped</span>' :
                            poList.map(po => `<span class="tag tag-bt" style="margin-right:4px;">${po}</span>`).join('')}
                        </td>
                        <td>
                          ${psoList.length === 0 ? '<span style="color:var(--text-muted); font-size:12px;">Unmapped</span>' :
                            psoList.map(pso => `<span class="tag tag-success" style="margin-right:4px;">${pso}</span>`).join('')}
                        </td>
                        <td style="display:flex; gap:6px;">
                          <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditCOModal('${co.id}')">✏️ Edit</button>
                          <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteCO('${co.id}')">🗑️ Delete</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Handle orphan outcomes (if subjectId not matching any subject)
    const orphanCOs = allOutcomes.filter(co => !subjects.some(s => s.id === co.subjectId));
    let orphanHTML = '';
    if (orphanCOs.length > 0) {
      const groupKey = 'co-orphan';
      const isCollapsed = !!this.collapsedSubjectIds[groupKey];
      orphanHTML = `
        <div class="subject-group-card">
          <div class="subject-group-header" onclick="facultyView.toggleSubjectGroup('${groupKey}')">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="subject-group-toggle-icon">${isCollapsed ? '►' : '▼'}</span>
              <span class="subject-code-badge" style="background:var(--warning-subtle); color:var(--warning);">OTHER</span>
              <h4 class="subject-title-text">Unassigned / General Outcomes</h4>
            </div>
            <div>
              <span class="tag tag-warning">${orphanCOs.length} Outcomes</span>
            </div>
          </div>
          ${!isCollapsed ? `
            <div class="table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Outcome Code</th>
                    <th>Description</th>
                    <th>Mapped POs</th>
                    <th>Mapped PSOs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${orphanCOs.map(co => {
                    const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
                    const poList = (co.poIds && co.poIds.length > 0) ? co.poIds : (co.poId ? [co.poId] : []);
                    const psoList = co.psoIds || [];
                    return `
                      <tr>
                        <td><span class="tag ${type === 'LO' ? 'tag-lo' : 'tag-co'}">${type === 'LO' ? '🧪 Lab (LO)' : '📖 Course (CO)'}</span></td>
                        <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${co.code}</td>
                        <td style="font-weight:500;">${co.description}</td>
                        <td>
                          ${poList.length === 0 ? '<span style="color:var(--text-muted); font-size:12px;">Unmapped</span>' :
                            poList.map(po => `<span class="tag tag-bt" style="margin-right:4px;">${po}</span>`).join('')}
                        </td>
                        <td>
                          ${psoList.length === 0 ? '<span style="color:var(--text-muted); font-size:12px;">Unmapped</span>' :
                            psoList.map(pso => `<span class="tag tag-success" style="margin-right:4px;">${pso}</span>`).join('')}
                        </td>
                        <td style="display:flex; gap:6px;">
                          <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditCOModal('${co.id}')">✏️ Edit</button>
                          <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteCO('${co.id}')">🗑️ Delete</button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div style="margin-bottom:32px;">
        <h3 class="card-title" style="margin-bottom:14px; font-size:16px;">Syllabus Modules (Grouped by Subject / Lab)</h3>
        ${allModules.length === 0 ? `
          <div class="card" style="text-align:center; padding:24px; color:var(--text-muted);">
            No modules defined yet. Click "+ Add Subject Module" above.
          </div>
        ` : (groupedModulesHTML || '<div class="card" style="text-align:center; padding:24px; color:var(--text-muted);">No modules defined for active subjects.</div>')}
      </div>

      <div>
        <h3 class="card-title" style="margin-bottom:14px; font-size:16px;">Course Outcomes (COs) & Lab Outcomes (LOs) (Grouped by Subject / Lab)</h3>
        ${allOutcomes.length === 0 ? `
          <div class="card" style="text-align:center; padding:24px; color:var(--text-muted);">
            No outcomes defined yet. Click "+ Add Outcome (CO / LO)" above.
          </div>
        ` : (groupedOutcomesHTML + orphanHTML)}
      </div>
    `;
  },

  renderNetMappingMatrixHTML() {
    const subjects = app.data.subjects || [];
    const outcomes = (app.data.courseOutcomes || []).filter(co => {
      if (this.activeMatrixSubjectId === 'all') return true;
      return co.subjectId === this.activeMatrixSubjectId;
    });

    const pos = app.data.programOutcomes || [];
    const psos = app.data.programSpecificOutcomes || [];

    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 class="card-title" style="margin-bottom:4px;">Outcome Net Mapping Matrix</h3>
            <p style="font-size:13px; color:var(--text-secondary);">Click on any PO or PSO chip in the grid to instantly toggle mapping for that outcome.</p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <label style="font-size:13px; font-weight:600;">Filter Subject:</label>
            <select class="form-select" style="width:auto; padding:6px 12px;" onchange="facultyView.activeMatrixSubjectId = this.value; facultyView.renderCOAndModulesManager(document.getElementById('main-content'));">
              <option value="all" ${this.activeMatrixSubjectId === 'all' ? 'selected' : ''}>All Subjects</option>
              ${subjects.map(s => `<option value="${s.id}" ${this.activeMatrixSubjectId === s.id ? 'selected' : ''}>${s.code} - ${s.shortName || s.fullName}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="table-container" style="overflow-x:auto;">
          <table class="matrix-table">
            <thead>
              <tr>
                <th style="text-align:left; min-width:140px;">Outcome Code</th>
                <th style="min-width:70px;">Type</th>
                <th style="text-align:left; min-width:220px;">Outcome Description</th>
                <th colspan="${pos.length}">Program Outcomes (POs)</th>
                <th colspan="${psos.length}">Program Specific Outcomes (PSOs)</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                ${pos.map(p => `<th title="${p.description}" style="font-family:var(--font-mono); font-size:11px;">${p.code}</th>`).join('')}
                ${psos.map(pso => `<th title="${pso.description}" style="font-family:var(--font-mono); font-size:11px;">${pso.code}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${outcomes.length === 0 ? `
                <tr>
                  <td colspan="${3 + pos.length + psos.length}" style="text-align:center; padding:24px; color:var(--text-muted);">
                    No outcomes defined for this selection. Click "+ Add Outcome (CO / LO)" to create outcomes.
                  </td>
                </tr>
              ` : outcomes.map(co => {
                const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
                const poList = co.poIds || (co.poId ? [co.poId] : []);
                const psoList = co.psoIds || [];

                return `
                  <tr>
                    <td style="text-align:left; font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">
                      ${co.code}
                      <button class="btn btn-secondary btn-sm" style="padding:1px 5px; font-size:10px; margin-left:4px;" title="Edit Outcome" onclick="facultyView.openEditCOModal('${co.id}')">✏️</button>
                    </td>
                    <td><span class="tag ${type === 'LO' ? 'tag-lo' : 'tag-co'}">${type}</span></td>
                    <td style="text-align:left; font-size:12px; max-width:280px; white-space:normal;">${co.description}</td>
                    ${pos.map(po => {
                      const isMapped = poList.includes(po.code);
                      return `
                        <td class="matrix-cell-toggle" onclick="facultyView.toggleOutcomeMapping('${co.id}', '${po.code}', 'PO')">
                          <span class="matrix-toggle-chip ${isMapped ? (type === 'LO' ? 'active-lo' : 'active') : ''}">${po.code}</span>
                        </td>
                      `;
                    }).join('')}
                    ${psos.map(pso => {
                      const isMapped = psoList.includes(pso.code);
                      return `
                        <td class="matrix-cell-toggle" onclick="facultyView.toggleOutcomeMapping('${co.id}', '${pso.code}', 'PSO')">
                          <span class="matrix-toggle-chip ${isMapped ? (type === 'LO' ? 'active-lo' : 'active') : ''}">${pso.code}</span>
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  toggleOutcomeMapping(coId, code, type) {
    const co = app.data.courseOutcomes.find(c => c.id === coId);
    if (!co) return;

    if (type === 'PO') {
      if (!co.poIds) co.poIds = co.poId ? [co.poId] : [];
      if (co.poIds.includes(code)) {
        co.poIds = co.poIds.filter(p => p !== code);
      } else {
        co.poIds.push(code);
      }
      co.poId = co.poIds[0] || '';
    } else if (type === 'PSO') {
      if (!co.psoIds) co.psoIds = [];
      if (co.psoIds.includes(code)) {
        co.psoIds = co.psoIds.filter(p => p !== code);
      } else {
        co.psoIds.push(code);
      }
    }

    app.saveState();
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  deleteModule(moduleId) {
    const mod = (app.data.modules || []).find(m => m.id === moduleId);
    if (!mod) return;
    if (!confirm(`Are you sure you want to delete module "${mod.code}: ${mod.title}"?`)) return;

    app.data.modules = (app.data.modules || []).filter(m => m.id !== moduleId);
    app.saveState();
    app.showToast(`Deleted module ${mod.code}`, 'info');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  deleteCO(coId) {
    const co = app.data.courseOutcomes.find(c => c.id === coId);
    if (!co) return;
    if (!confirm(`Are you sure you want to delete Outcome "${co.code}"?`)) return;

    app.data.courseOutcomes = app.data.courseOutcomes.filter(c => c.id !== coId);
    app.saveState();
    app.showToast(`Deleted Outcome ${co.code}`, 'info');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  openEditModuleModal(moduleId) {
    const mod = (app.data.modules || []).find(m => m.id === moduleId);
    if (!mod) return;

    app.showModal(`Edit Subject Module (${mod.code})`, `
      <form onsubmit="facultyView.updateModule(event, '${mod.id}')">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="edit-mod-sub" class="form-select">
            ${app.data.subjects.map(s => `<option value="${s.id}" ${s.id === mod.subjectId ? 'selected' : ''}>${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Module Code</label>
          <input type="text" id="edit-mod-code" class="form-input code-font" value="${mod.code}" required style="font-weight:700; color:var(--accent-blue);">
        </div>

        <div class="form-group">
          <label class="form-label">Module Title</label>
          <input type="text" id="edit-mod-title" class="form-input" value="${mod.title}" required>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Module</button>
        </div>
      </form>
    `);
  },

  updateModule(e, moduleId) {
    e.preventDefault();
    const mod = (app.data.modules || []).find(m => m.id === moduleId);
    if (!mod) return;

    mod.subjectId = document.getElementById('edit-mod-sub').value;
    mod.code = document.getElementById('edit-mod-code').value.trim();
    mod.title = document.getElementById('edit-mod-title').value.trim();

    app.saveState();
    app.closeModal();
    app.showToast(`Updated module ${mod.code}`, 'success');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  openEditCOModal(coId) {
    const co = (app.data.courseOutcomes || []).find(c => c.id === coId);
    if (!co) return;

    const currentType = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');

    app.showModal(`Edit Outcome (${co.code})`, `
      <form onsubmit="facultyView.updateCO(event, '${co.id}')">
        <div class="form-group">
          <label class="form-label">Outcome Category Type</label>
          <div style="display:flex; gap:16px; margin-top:6px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:14px;">
              <input type="radio" name="edit-co-type" value="CO" ${currentType === 'CO' ? 'checked' : ''}> 📖 Course Outcome (CO)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:14px;">
              <input type="radio" name="edit-co-type" value="LO" ${currentType === 'LO' ? 'checked' : ''}> 🧪 Lab Outcome (LO)
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="edit-co-sub" class="form-select">
            ${app.data.subjects.map(s => `<option value="${s.id}" ${s.id === co.subjectId ? 'selected' : ''}>${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Outcome Code</label>
          <input type="text" id="edit-co-code" class="form-input code-font" value="${co.code}" required style="font-weight:700; color:var(--accent-blue);">
        </div>

        <div class="form-group">
          <label class="form-label">Outcome Description</label>
          <textarea id="edit-co-desc" class="form-textarea" rows="3" required>${co.description}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Outcome</button>
        </div>
      </form>
    `);
  },

  updateCO(e, coId) {
    e.preventDefault();
    const co = (app.data.courseOutcomes || []).find(c => c.id === coId);
    if (!co) return;

    const typeRadio = document.querySelector('input[name="edit-co-type"]:checked');
    co.type = typeRadio ? typeRadio.value : 'CO';
    co.subjectId = document.getElementById('edit-co-sub').value;
    co.code = document.getElementById('edit-co-code').value.trim();
    co.description = document.getElementById('edit-co-desc').value.trim();

    app.saveState();
    app.closeModal();
    app.showToast(`Updated outcome ${co.code}`, 'success');
    this.renderCOAndModulesManager(document.getElementById('main-content'));
  },

  autoGenerateModuleCode(subjectId) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    const subPrefix = sub ? (sub.code || 'MOD') : 'MOD';
    const existing = (app.data.modules || []).filter(m => m.subjectId === subjectId);
    const count = existing.length + 1;
    return `${subPrefix}.MO${count}`;
  },

  updateModuleCodePreview() {
    const subId = document.getElementById('mod-sub').value;
    const autoCode = this.autoGenerateModuleCode(subId);
    const codeInput = document.getElementById('mod-code');
    if (codeInput) codeInput.value = autoCode;
  },

  openAddModuleModal() {
    const firstSubId = app.data.subjects.length > 0 ? app.data.subjects[0].id : '';
    const initialCode = firstSubId ? this.autoGenerateModuleCode(firstSubId) : '24051181.MO1';

    app.showModal('Add Subject Module', `
      <form id="mod-form" onsubmit="facultyView.saveModule(event, false)">
        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="mod-sub" class="form-select" onchange="facultyView.updateModuleCodePreview()">
            ${app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Auto-Generated Module Code (Subject-Prefixed)</label>
          <input type="text" id="mod-code" class="form-input code-font" value="${initialCode}" required style="font-weight:700; color:var(--accent-blue);">
        </div>

        <div class="form-group">
          <label class="form-label">Module Title</label>
          <input type="text" id="mod-title" class="form-input" placeholder="e.g. Module 01: Free Vibrations & Damping Analysis" required autofocus>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:12px; border-top:1px solid var(--border-color);">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Close / Done</button>
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-primary" onclick="facultyView.saveModule(event, true)">+ Save & Add Next</button>
            <button type="submit" class="btn btn-secondary">Save & Close</button>
          </div>
        </div>
      </form>
    `);
  },

  saveModule(e, keepOpen = false) {
    if (e) e.preventDefault();

    const titleInput = document.getElementById('mod-title');
    const codeInput = document.getElementById('mod-code');
    const subSelect = document.getElementById('mod-sub');

    if (!titleInput || !titleInput.value.trim()) {
      app.showToast('Please enter a module title', 'warning');
      if (titleInput) titleInput.focus();
      return;
    }

    if (!app.data.modules) app.data.modules = [];

    const newMod = {
      id: 'mod-' + Date.now(),
      subjectId: subSelect ? subSelect.value : '',
      code: codeInput ? codeInput.value.trim() : 'MO1',
      title: titleInput.value.trim()
    };

    app.data.modules.push(newMod);
    app.saveState();

    app.showToast(`Added module ${newMod.code}`, 'success');

    if (keepOpen) {
      titleInput.value = '';
      this.updateModuleCodePreview();
      titleInput.focus();
      this.renderCOAndModulesManager(document.getElementById('main-content'));
    } else {
      app.closeModal();
      this.renderCOAndModulesManager(document.getElementById('main-content'));
    }
  },

  autoGenerateOutcomeCode(subjectId, type) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    const subPrefix = sub ? (sub.code || 'CO') : 'CO';
    const existing = (app.data.courseOutcomes || []).filter(c => c.subjectId === subjectId && (c.type === type || (c.code && c.code.includes('.' + type))));
    const count = existing.length + 1;
    return `${subPrefix}.${type}${count}`;
  },

  updateOutcomeCodePreview() {
    const subId = document.getElementById('co-sub').value;
    const type = document.querySelector('input[name="co-type-radio"]:checked').value;
    const autoCode = this.autoGenerateOutcomeCode(subId, type);
    const codeInput = document.getElementById('co-code');
    if (codeInput) codeInput.value = autoCode;
  },

  openAddCOModal() {
    const firstSubId = app.data.subjects.length > 0 ? app.data.subjects[0].id : '';
    const initialCode = firstSubId ? this.autoGenerateOutcomeCode(firstSubId, 'CO') : '24051181.CO1';

    app.showModal('Add Course / Lab Outcome (CO / LO)', `
      <form id="co-form" onsubmit="facultyView.saveCO(event, false)">
        <div class="form-group">
          <label class="form-label">Outcome Category Type</label>
          <div style="display:flex; gap:16px; margin-top:6px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:14px;">
              <input type="radio" name="co-type-radio" value="CO" checked onchange="facultyView.updateOutcomeCodePreview()"> 📖 Course Outcome (CO)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:600; font-size:14px;">
              <input type="radio" name="co-type-radio" value="LO" onchange="facultyView.updateOutcomeCodePreview()"> 🧪 Lab Outcome (LO)
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Subject</label>
          <select id="co-sub" class="form-select" onchange="facultyView.updateOutcomeCodePreview()">
            ${app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Auto-Generated Outcome Code (Subject-Prefixed)</label>
          <input type="text" id="co-code" class="form-input code-font" value="${initialCode}" required style="font-weight:700; color:var(--accent-blue);">
        </div>

        <div class="form-group">
          <label class="form-label">Outcome Description</label>
          <textarea id="co-desc" class="form-textarea" rows="3" placeholder="Enter clear, measurable outcome description..." required autofocus></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:12px; border-top:1px solid var(--border-color);">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Close / Done</button>
          <div style="display:flex; gap:10px;">
            <button type="button" class="btn btn-primary" onclick="facultyView.saveCO(event, true)">+ Save & Add Next</button>
            <button type="submit" class="btn btn-secondary">Save & Close</button>
          </div>
        </div>
      </form>
    `);
  },

  saveCO(e, keepOpen = false) {
    if (e) e.preventDefault();

    const descInput = document.getElementById('co-desc');
    const codeInput = document.getElementById('co-code');
    const subSelect = document.getElementById('co-sub');
    const typeRadio = document.querySelector('input[name="co-type-radio"]:checked');

    if (!descInput || !descInput.value.trim()) {
      app.showToast('Please enter an outcome description', 'warning');
      if (descInput) descInput.focus();
      return;
    }

    const type = typeRadio ? typeRadio.value : 'CO';
    const subjectId = subSelect ? subSelect.value : '';
    const code = codeInput ? codeInput.value.trim() : 'CO1';
    const description = descInput.value.trim();

    const newCO = {
      id: (type === 'LO' ? 'lo-' : 'co-') + Date.now(),
      type: type,
      subjectId: subjectId,
      code: code,
      description: description,
      poIds: [],
      psoIds: [],
      moduleIds: [],
      experimentIds: []
    };

    app.data.courseOutcomes.push(newCO);
    app.saveState();

    app.showToast(`Added ${type} outcome ${newCO.code}`, 'success');

    if (keepOpen) {
      descInput.value = '';
      this.updateOutcomeCodePreview();
      descInput.focus();
      this.renderCOAndModulesManager(document.getElementById('main-content'));
    } else {
      app.closeModal();
      this.renderCOAndModulesManager(document.getElementById('main-content'));
    }
  },

  selectAssignmentToEdit(asgId) {
    if (asgId) {
      app.activeAssignmentId = asgId;
      localStorage.setItem('rizvi_fe_active_asg_id', asgId);
    }
    this.renderAssignmentBuilder(document.getElementById('main-content'));
    setTimeout(() => {
      const qbEl = document.getElementById('question-builder-section');
      if (qbEl) {
        qbEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  },

  renderAssignmentBuilder(container) {
    const assignments = app.data.assignments || [];
    const subjects = app.data.subjects || [];

    // Ensure active assignment ID is valid if assignments exist
    if (assignments.length > 0 && !assignments.some(a => a.id === app.activeAssignmentId)) {
      app.activeAssignmentId = assignments[0].id;
    }
    const selectedAsg = assignments.find(a => a.id === app.activeAssignmentId) || assignments[0] || null;

    // Group assignments by subjectId
    const subjectGroupMap = new Map();
    assignments.forEach(asg => {
      const subId = asg.subjectId || 'unassigned';
      if (!subjectGroupMap.has(subId)) subjectGroupMap.set(subId, []);
      subjectGroupMap.get(subId).push(asg);
    });

    // Section 1: Page Header
    let html = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Assignments</h1>
          <p class="page-subtitle">Manage lab assignments, questions, and student sheet inspection</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">
          + Create New Assignment
        </button>
      </div>
    `;

    // Section 2: Assignment List (collapsible, subject-wise grouping)
    if (assignments.length === 0) {
      html += `
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📑</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Assignments Yet</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create your first assignment to start adding questions and scheduling batches.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Assignment</button>
        </div>
      `;
    } else {
      subjectGroupMap.forEach((subAsgs, subId) => {
        const sub = subjects.find(s => s.id === subId) || { id: subId, code: 'FE-LAB', fullName: 'General Engineering Laboratory' };
        const groupKey = 'asg-' + subId;
        const isCollapsed = !!this.collapsedSubjectIds[groupKey];

        html += `
          <div class="subject-group-card" style="margin-bottom:16px;">
            <div class="subject-group-header" onclick="facultyView.toggleSubjectGroup('${groupKey}')">
              <div style="display:flex; align-items:center; gap:12px;">
                <span class="subject-group-toggle-icon">${isCollapsed ? '►' : '▼'}</span>
                <span class="subject-code-badge">${sub.code || 'FE'}</span>
                <h4 class="subject-title-text">${sub.fullName || sub.name || sub.code}</h4>
              </div>
              <div>
                <span class="tag tag-bt" style="font-weight:600;">${subAsgs.length} Assignment${subAsgs.length > 1 ? 's' : ''}</span>
              </div>
            </div>
            ${!isCollapsed ? `
              <div class="table-container">
                <table class="custom-table">
                  <thead>
                    <tr>
                      <th>Assignment Code</th>
                      <th>Title</th>
                      <th>Semester</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${subAsgs.map(asg => {
                      const isOpen = asg.schedules && asg.schedules[0] && asg.schedules[0].submissionsOpen;
                      const isSelected = selectedAsg && asg.id === selectedAsg.id;
                      return `
                        <tr style="${isSelected ? 'background:var(--accent-blue-subtle);' : ''}">
                          <td style="font-family:var(--font-mono); font-weight:600; color:var(--accent-blue); font-size:12px;">${asg.code}</td>
                          <td style="font-weight:600;">${asg.title}</td>
                          <td><span class="tag tag-co">${asg.semester || 'Sem 1'}</span></td>
                          <td><span class="tag ${isOpen ? 'tag-success' : 'tag-danger'}">${isOpen ? 'Open' : 'Closed'}</span></td>
                          <td style="display:flex; gap:6px;">
                            <button class="btn btn-secondary btn-sm" onclick="facultyView.selectAssignmentToEdit('${asg.id}')">✏️ Edit Questions</button>
                            <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteAssignment('${asg.id}')">🗑️ Delete</button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    // Section 3: Student Sheet Inspection
    html += `
      <div class="page-separator">
        <span class="page-separator__text">🔍 Student Sheet Inspection</span>
      </div>

      <div class="card" style="background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <h3 class="card-title" style="font-size:15px; color:var(--accent-blue);">Inspect Student Question & Variable Set</h3>
            <div style="font-size:12px; color:var(--text-secondary);">Type UIN or Name to inspect a student's personalized sheet for the selected assignment</div>
          </div>
          <span class="tag tag-co" style="font-size:11px;">Read-Only · Session Safe</span>
        </div>
        <div style="display:flex; gap:12px;">
          <input type="text" id="faculty-student-search" class="form-input" placeholder="Search by UIN or Name..." style="flex:1; background:#FFF;" oninput="facultyView.searchStudentSheet()">
          <button class="btn btn-primary btn-sm" onclick="facultyView.searchStudentSheet()">Inspect Sheet</button>
        </div>
        <div id="student-search-results" style="margin-top:12px;"></div>
      </div>
    `;

    // Section 4: Question Builder
    html += `
      <div id="question-builder-section" class="page-separator">
        <span class="page-separator__text">📝 Question Builder</span>
      </div>
    `;

    if (selectedAsg) {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px; background:var(--bg-secondary); padding:10px 16px; border-radius:8px; border:1px solid var(--border-default);">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; flex:1; min-width:280px;">
            <span style="font-size:12px; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">Editing Assignment:</span>
            <select class="form-select" style="flex:1; max-width:480px; font-size:13px; font-weight:600; color:var(--accent-blue); background:var(--bg-primary); border:1px solid var(--border-default); border-radius:6px; padding:6px 12px; cursor:pointer;"
              onchange="facultyView.selectAssignmentToEdit(this.value)">
              ${assignments.map(a => `
                <option value="${a.id}" ${a.id === selectedAsg.id ? 'selected' : ''}>
                  ${a.code} — ${a.title}
                </option>
              `).join('')}
            </select>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditAssignmentModal('${selectedAsg.id}')">
              ✏️ Edit Details
            </button>
            <button class="btn btn-primary btn-sm" onclick="facultyView.openAddQuestionModal('${selectedAsg.id}')">
              + Add Question
            </button>
          </div>
        </div>

        <div class="card" style="margin-bottom: 14px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2); padding:14px 18px;">
          <div style="display:flex; gap:12px; align-items:center;">
            <span style="font-size:20px;">💡</span>
            <div style="font-size:13px; color:var(--accent-blue);">
              <strong>Dynamic Student Variables Syntax:</strong> Write placeholders like <code class="code-font">{{var_m_kg}}</code> in question text. You can add multiple evaluation parameters per question and paste Google Drive diagram URLs!
            </div>
          </div>
        </div>

        ${selectedAsg.questions.length === 0 ? `
          <div class="card" style="text-align:center; padding:20px; color:var(--text-muted);">
            No questions added to this assignment yet. Click "+ Add Question" above to start building.
          </div>
        ` : selectedAsg.questions.map((q, idx) => `
          <div class="question-block">
            <div class="question-header">
              <div style="display:flex; gap:12px; align-items:center;">
                <span class="question-number">${q.sectionLabel}</span>
                <span class="tag tag-co">${q.coId}</span>
                <span class="tag tag-bt">${q.btLevel}</span>
              </div>
              <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditQuestionModal('${selectedAsg.id}', '${q.id}')">
                  ✏️ Edit Question
                </button>
                <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteQuestion('${selectedAsg.id}', '${q.id}')">
                  🗑️ Delete Question
                </button>
              </div>
            </div>
            <div class="question-text">${app.formatQuestionText(q.text)}</div>

            ${q.imageUrl ? `
              <div class="question-diagram-container" style="margin:12px 0;">
                <img src="${app.getEmbeddableImageUrl(q.imageUrl)}" 
                     class="question-diagram" 
                     alt="Experiment Diagram" 
                     style="max-height:280px; width:auto; border:1px solid var(--border-default); border-radius:var(--radius-md); display:block; max-width:100%; margin:10px 0;"
                     onerror="app.handleImageError(this, ${JSON.stringify(q.imageUrl || '')})">
              </div>
            ` : ''}

            <div style="margin-top:16px;">
              <div style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Evaluation Parameters (${q.parameters.length}):</div>
              ${q.parameters.map(p => `
                <div class="parameter-input-row">
                  <span class="param-label">${app.formatNaturalMath(p.label)} <code class="code-font" style="font-size:11px; color:var(--accent-blue);">(${p.code})</code></span>
                  <span style="font-size:12px; color:var(--text-secondary);">Marks: ${p.valueMarks}v + ${p.unitMarks}u</span>
                  <span style="font-size:12px; color:var(--text-secondary);">Tol: ±${p.tolerancePct}%</span>
                  <span style="font-size:12px; color:var(--text-secondary);">Accepted: [${p.acceptedUnits.map(u => app.formatNaturalMath(u)).join(', ')}]</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      `;
    }

    // Section 5: Rubric Presets
    html += `
      <div class="page-separator">
        <span class="page-separator__text">📐 Rubric Presets</span>
      </div>

      <div style="display:flex; justify-content:flex-end; margin-bottom:16px;">
        <button class="btn btn-primary btn-sm" onclick="facultyView.openAddRubricModal()">
          + Create Rubric Preset
        </button>
      </div>

      ${this.getRubricCardsHTML()}
    `;

    container.innerHTML = html;
  },

  openAddQuestionModal(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    const nextQNum = asg ? (asg.questions.length + 1) : 1;
    this.tempModalParameters = [
      { label: `Q${nextQNum}: Parameter 1`, acceptedUnits: ["none"], valueMarks: 4, unitMarks: 1, tolerancePct: 5 }
    ];

    const subjectId = asg ? asg.subjectId : '';
    const filteredCOs = (app.data.courseOutcomes || []).filter(co => !subjectId || co.subjectId === subjectId);
    const targetCOs = filteredCOs.length > 0 ? filteredCOs : (app.data.courseOutcomes || []);

    const coOptions = (targetCOs.length > 0) ?
      targetCOs.map(co => {
        const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
        return `<option value="${co.code}">[${type}] ${co.code}</option>`;
      }).join('') :
      '<option value="">-- No Outcomes Defined For This Subject --</option>';

    app.showModal('Add Question with Multiple Parameters', `
      <form onsubmit="facultyView.saveQuestion(event, '${asgId}')">
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Section Label</label>
            <input type="text" id="q-label" class="form-input code-font" value="Q${nextQNum}" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Course Outcome</label>
            <select id="q-co" class="form-select">
              ${coOptions}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Bloom's Level</label>
            <select id="q-bt" class="form-select">
              <option value="BT1">BT1 (Remember)</option>
              <option value="BT2">BT2 (Understand)</option>
              <option value="BT3" selected>BT3 (Apply)</option>
              <option value="BT4">BT4 (Analyze)</option>
              <option value="BT5">BT5 (Evaluate)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Text (Use {{variable_name}} syntax & math notation like m^2, N/(m^2), \frac{a}{b})</label>
          <textarea id="q-text" class="form-textarea" rows="3" placeholder="Enter question text using {{var_name}} placeholders and natural math expressions..." oninput="facultyView.updateQuestionLivePreview(this.value)" required></textarea>
          <div style="margin-top:8px; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-default); border-radius:var(--radius-md); font-size:13px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:4px;">✨ Live Natural Math & Variable Preview:</div>
            <div id="q-text-live-preview" style="color:var(--text-primary); line-height:1.5;"><em>Type above to see natural math and variable preview...</em></div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Attach Evaluation Rubric</label>
          <select id="q-rubric" class="form-select">
            ${(app.data.rubricPresets || []).map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Diagram Image URL / Google Drive Share Link / Local File</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="q-img" class="form-input" placeholder="https://drive.google.com/... or paste image URL / Data URI" style="flex:1;">
            <input type="file" id="q-img-file" accept="image/*" style="display:none;" onchange="facultyView.handleDiagramFileUpload(event)">
            <button type="button" class="btn btn-secondary btn-sm" style="white-space:nowrap;" onclick="document.getElementById('q-img-file').click()">📁 Upload Image</button>
          </div>
          <span style="font-size:11px; color:var(--text-muted); display:block; margin-top:4px;">Google Drive share links are automatically converted to embeddable images.</span>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:16px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label class="form-label" style="margin-bottom:0;">Evaluation Parameters (Multiple Answers)</label>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addModalParameterField()">+ Add Another Parameter</button>
          </div>

          <div id="modal-parameters-list">
            ${this.buildModalParametersHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Question</button>
        </div>
      </form>
    `);
  },

  buildModalParametersHTML() {
    return this.tempModalParameters.map((p, idx) => `
      <div style="background:var(--bg-primary); padding:12px; border-radius:var(--radius-md); margin-bottom:10px;">
        <div style="display:flex; gap:12px; margin-bottom:8px; align-items:flex-end;">
          <div style="flex:1;">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Parameter Label</label>
            <input type="text" class="form-input p-label-input" value="${p.label}" required style="background:#FFF;">
          </div>
          <div style="width:140px;">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Accepted Units</label>
            <input type="text" class="form-input p-units-input" value="${(p.acceptedUnits || []).join(', ')}" style="background:#FFF;">
          </div>
          <div style="width:140px;">
            <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Unit Hint to Student</label>
            <input type="text" class="form-input p-unit-hint-input" value="${p.unitHint || ''}" placeholder="e.g. SI units, rad/s" style="background:#FFF;">
          </div>
          ${this.tempModalParameters.length > 1 ? `
            <button type="button" class="btn btn-destructive btn-sm" style="padding:6px 10px;" title="Remove Parameter" onclick="facultyView.removeModalParameterField(${idx})">🗑️</button>
          ` : ''}
        </div>
        <div style="display:flex; gap:12px; font-size:12px; align-items:center;">
          <div>Value Marks: <input type="number" class="p-vmarks-input" value="${p.valueMarks}" style="width:50px;"></div>
          <div>Unit Marks: <input type="number" class="p-umarks-input" value="${p.unitMarks}" style="width:50px;"></div>
          <div>Tolerance %: <input type="number" class="p-tol-input" value="${p.tolerancePct}" style="width:50px;"></div>
        </div>
      </div>
    `).join('');
  },

  updateQuestionLivePreview(val) {
    const el = document.getElementById('q-text-live-preview');
    if (!el) return;
    if (!val || !val.trim()) {
      el.innerHTML = '<em>Type above to see natural math and variable preview...</em>';
      return;
    }
    el.innerHTML = app.formatQuestionText(val);
  },

  openEditQuestionModal(asgId, qId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const q = asg.questions.find(x => x.id === qId);
    if (!q) return;

    this.tempModalParameters = JSON.parse(JSON.stringify(q.parameters || []));

    const subjectId = asg.subjectId || '';
    const filteredCOs = (app.data.courseOutcomes || []).filter(co => !subjectId || co.subjectId === subjectId);
    const targetCOs = filteredCOs.length > 0 ? filteredCOs : (app.data.courseOutcomes || []);

    const coOptions = (targetCOs.length > 0) ?
      targetCOs.map(co => {
        const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
        const isSel = co.code === q.coId ? 'selected' : '';
        return `<option value="${co.code}" ${isSel}>[${type}] ${co.code}</option>`;
      }).join('') :
      '<option value="">-- No Outcomes Defined --</option>';

    const btOptions = ['BT1', 'BT2', 'BT3', 'BT4', 'BT5'].map(bt =>
      `<option value="${bt}" ${q.btLevel === bt ? 'selected' : ''}>${bt}</option>`
    ).join('');

    app.showModal('Edit Question & Evaluation Parameters', `
      <form onsubmit="facultyView.saveEditedQuestion(event, '${asgId}', '${qId}')">
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Section Label</label>
            <input type="text" id="q-label" class="form-input code-font" value="${q.sectionLabel}" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Course Outcome</label>
            <select id="q-co" class="form-select">${coOptions}</select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Bloom's Level</label>
            <select id="q-bt" class="form-select">${btOptions}</select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Text (Use {{variable_name}} syntax & math notation like m^2, N/(m^2))</label>
          <textarea id="q-text" class="form-textarea" rows="3" oninput="facultyView.updateQuestionLivePreview(this.value)" required>${q.text}</textarea>
          <div style="margin-top:8px; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-default); border-radius:var(--radius-md); font-size:13px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:4px;">✨ Live Natural Math & Variable Preview:</div>
            <div id="q-text-live-preview" style="color:var(--text-primary); line-height:1.5;">${app.formatQuestionText(q.text)}</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Diagram Image URL / Google Drive Share Link / Local File</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="q-img" class="form-input" value="${q.imageUrl || ''}" placeholder="Image URL / Drive link" style="flex:1;">
            <input type="file" id="q-img-file" accept="image/*" style="display:none;" onchange="facultyView.handleDiagramFileUpload(event)">
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('q-img-file').click()">📁 Upload Image</button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:16px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label class="form-label" style="margin-bottom:0;">Evaluation Parameters (Multiple Answers)</label>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addModalParameterField()">+ Add Another Parameter</button>
          </div>
          <div id="modal-parameters-list">${this.buildModalParametersHTML()}</div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Question</button>
        </div>
      </form>
    `);
  },

  saveEditedQuestion(e, asgId, qId) {
    e.preventDefault();
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const qIndex = asg.questions.findIndex(x => x.id === qId);
    if (qIndex === -1) return;

    const paramLabels = document.querySelectorAll('.p-label-input');
    const paramUnits = document.querySelectorAll('.p-units-input');
    const paramUnitHints = document.querySelectorAll('.p-unit-hint-input');
    const paramVMarks = document.querySelectorAll('.p-vmarks-input');
    const paramUMarks = document.querySelectorAll('.p-umarks-input');
    const paramTols = document.querySelectorAll('.p-tol-input');

    const cleanAsgKey = (asg.id || asg.code).replace(/[^a-z0-9_-]/gi, '');
    const currentQId = asg.questions[qIndex].id || `q-${cleanAsgKey}-q${qIndex+1}`;

    const paramsList = [];
    paramLabels.forEach((el, idx) => {
      paramsList.push({
        id: (asg.questions[qIndex].parameters && asg.questions[qIndex].parameters[idx] && asg.questions[qIndex].parameters[idx].id) ? asg.questions[qIndex].parameters[idx].id : `${currentQId}-p${idx+1}`,
        code: `Q00${qIndex+1}_P0${idx+1}`,
        order: idx + 1,
        label: el.value,
        acceptedUnits: (paramUnits[idx] ? paramUnits[idx].value : '').split(',').map(u => u.trim()),
        unitHint: (paramUnitHints[idx] ? paramUnitHints[idx].value : '').trim(),
        unitRequired: true,
        valueMarks: parseFloat(paramVMarks[idx] ? paramVMarks[idx].value : 4),
        unitMarks: parseFloat(paramUMarks[idx] ? paramUMarks[idx].value : 1),
        tolerancePct: parseFloat(paramTols[idx] ? paramTols[idx].value : 2)
      });
    });

    asg.questions[qIndex].sectionLabel = document.getElementById('q-label').value;
    asg.questions[qIndex].text = document.getElementById('q-text').value;
    asg.questions[qIndex].imageUrl = app.getEmbeddableImageUrl(document.getElementById('q-img').value || '');
    asg.questions[qIndex].coId = document.getElementById('q-co').value;
    asg.questions[qIndex].btLevel = document.getElementById('q-bt').value;
    asg.questions[qIndex].parameters = paramsList;

    app.saveState();
    app.syncAssignmentToSupabase(asg);
    app.closeModal();
    app.showToast('Updated Question & Parameters successfully', 'success');
    this.renderAssignmentBuilder(document.getElementById('main-content'));
  },

  syncModalParametersFromDOM() {
    const paramLabels = document.querySelectorAll('.p-label-input');
    const paramUnits = document.querySelectorAll('.p-units-input');
    const paramUnitHints = document.querySelectorAll('.p-unit-hint-input');
    const paramVMarks = document.querySelectorAll('.p-vmarks-input');
    const paramUMarks = document.querySelectorAll('.p-umarks-input');
    const paramTols = document.querySelectorAll('.p-tol-input');

    if (!paramLabels || paramLabels.length === 0) return;

    this.tempModalParameters = Array.from(paramLabels).map((el, idx) => ({
      label: el.value,
      acceptedUnits: paramUnits[idx] ? paramUnits[idx].value.split(',').map(u => u.trim()).filter(Boolean) : ["none"],
      unitHint: (paramUnitHints[idx] ? paramUnitHints[idx].value : '').trim(),
      valueMarks: parseFloat(paramVMarks[idx] ? paramVMarks[idx].value : 4),
      unitMarks: parseFloat(paramUMarks[idx] ? paramUMarks[idx].value : 1),
      tolerancePct: parseFloat(paramTols[idx] ? paramTols[idx].value : 2)
    }));
  },

  addModalParameterField() {
    this.syncModalParametersFromDOM();
    this.tempModalParameters.push({
      label: `Parameter ${this.tempModalParameters.length + 1}`,
      acceptedUnits: ["ratio", "none"],
      unitHint: "",
      valueMarks: 4,
      unitMarks: 1,
      tolerancePct: 2
    });
    const container = document.getElementById('modal-parameters-list');
    if (container) container.innerHTML = this.buildModalParametersHTML();
  },

  removeModalParameterField(idx) {
    this.syncModalParametersFromDOM();
    if (this.tempModalParameters.length > 1) {
      this.tempModalParameters.splice(idx, 1);
      const container = document.getElementById('modal-parameters-list');
      if (container) container.innerHTML = this.buildModalParametersHTML();
    }
  },

  saveQuestion(e, asgId) {
    e.preventDefault();
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const paramLabels = document.querySelectorAll('.p-label-input');
    const paramUnits = document.querySelectorAll('.p-units-input');
    const paramUnitHints = document.querySelectorAll('.p-unit-hint-input');
    const paramVMarks = document.querySelectorAll('.p-vmarks-input');
    const paramUMarks = document.querySelectorAll('.p-umarks-input');
    const paramTols = document.querySelectorAll('.p-tol-input');

    const qOrder = asg.questions.length + 1;
    const cleanAsgKey = (asg.id || asg.code).replace(/[^a-z0-9_-]/gi, '');
    const qId = `q-${cleanAsgKey}-q${qOrder}`;

    const paramsList = [];
    paramLabels.forEach((el, idx) => {
      paramsList.push({
        id: `${qId}-p${idx+1}`,
        code: `Q00${qOrder}_P0${idx+1}`,
        order: idx + 1,
        label: el.value,
        acceptedUnits: (paramUnits[idx] ? paramUnits[idx].value : '').split(',').map(u => u.trim()),
        unitHint: (paramUnitHints[idx] ? paramUnitHints[idx].value : '').trim(),
        unitRequired: true,
        valueMarks: parseFloat(paramVMarks[idx] ? paramVMarks[idx].value : 4),
        unitMarks: parseFloat(paramUMarks[idx] ? paramUMarks[idx].value : 1),
        tolerancePct: parseFloat(paramTols[idx] ? paramTols[idx].value : 2)
      });
    });

    const newQ = {
      id: qId,
      order: qOrder,
      sectionLabel: document.getElementById('q-label').value,
      text: document.getElementById('q-text').value,
      imageUrl: app.getEmbeddableImageUrl(document.getElementById('q-img').value || ''),
      coId: document.getElementById('q-co').value,
      btLevel: document.getElementById('q-bt').value,
      parameters: paramsList
    };

    asg.questions.push(newQ);
    app.saveState();
    app.syncAssignmentToSupabase(asg);
    app.closeModal();
    app.showToast(`Added Question with ${paramsList.length} evaluation parameters`, 'success');
    this.renderAssignmentBuilder(document.getElementById('main-content'));
  },

  handleDiagramFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      app.showToast('Image file size should be under 3MB', 'warning');
      return;
    }
    app.showToast('Local image attached for preview only. Use a Google Drive share link for permanent storage — local images are not saved to the cloud.', 'warning');
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgInput = document.getElementById('q-img');
      if (imgInput) imgInput.value = event.target.result;
      app.showToast('Diagram image attached successfully', 'success');
    };
    reader.readAsDataURL(file);
  },

  getRubricLevelData(c, levelIndex) {
    if (c.levels && c.levels[levelIndex]) {
      return c.levels[levelIndex];
    }
    if (levelIndex === 0) return { marks: 4, description: c.level3 || '≥ 90% correct (Exemplary)' };
    if (levelIndex === 1) return { marks: 3, description: c.level2 || '≥ 50% correct (Satisfactory)' };
    if (levelIndex === 2) return { marks: 1, description: c.level1 || '< 50% correct (Needs Improvement)' };
    return { marks: 0, description: 'No submission' };
  },

  renderRubricBuilder(container) {
    if (container && container.id === 'main-content') {
      this.renderAssignmentBuilder(container);
      return;
    }
    container.innerHTML = this.getRubricBuilderHTML();
  },

  getRubricCardsHTML() {
    const rubrics = app.data.rubricPresets || [];
    if (rubrics.length === 0) {
      return `<div class="card"><p>No rubric presets found. Click "+ Create Rubric Preset" to create one.</p></div>`;
    }

    return rubrics.map(rub => `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h3 class="card-title">${rub.name}</h3>
            <span style="font-size:12px; color:var(--text-secondary);">Criteria Count: <strong>${(rub.criteria || []).length} Criteria</strong> | Total Rubric Marks: <strong>${rub.totalMarks || 10} Marks</strong></span>
          </div>
          <div>
            <span class="tag tag-co" style="margin-right:8px;">${rub.isShared ? 'Shared College Preset' : 'Private'}</span>
            <button class="btn btn-secondary btn-sm" onclick="facultyView.openEditRubricModal('${rub.id}')">✏️ Edit Criteria & Levels</button>
            <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteRubric('${rub.id}')">🗑️ Delete</button>
          </div>
        </div>

        <div class="rubric-card">
          <table class="custom-table" style="font-size:13px;">
            <thead>
              <tr>
                <th>Criteria Title</th>
                <th>Auto-Grader Mode</th>
                <th>Level 03 (≥ 90%)</th>
                <th>Level 02 (≥ 50%)</th>
                <th>Level 01 (< 50%)</th>
                <th>Level 00 (0%)</th>
              </tr>
            </thead>
            <tbody>
              ${(rub.criteria || []).map(c => {
                const l0 = this.getRubricLevelData(c, 0);
                const l1 = this.getRubricLevelData(c, 1);
                const l2 = this.getRubricLevelData(c, 2);
                const l3 = this.getRubricLevelData(c, 3);
                return `
                  <tr>
                    <td style="font-weight:600; color:var(--accent-blue);">${c.title}</td>
                    <td>
                      <span class="tag ${c.type === 'auto_numerical' ? 'tag-success' : c.type === 'auto_units' ? 'tag-co' : 'tag-bt'}">
                        ${c.type === 'auto_numerical' ? '🤖 Auto (Tolerance ±5%)' : c.type === 'auto_units' ? '🤖 Auto (Units)' : '✋ Manual Grading'}
                      </span>
                    </td>
                    <td><strong style="color:var(--success);">${l0.marks}m</strong> (${l0.description})</td>
                    <td><strong style="color:var(--accent-blue);">${l1.marks}m</strong> (${l1.description})</td>
                    <td><strong style="color:var(--warning);">${l2.marks}m</strong> (${l2.description})</td>
                    <td><strong style="color:var(--danger);">${l3.marks}m</strong> (${l3.description})</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
  },

  getRubricBuilderHTML() {
    return `
      <div class="page-header-container">
        <div>
          <h1 class="page-title" style="font-size:18px;">Lab Rubric Builder & Custom Criteria Presets</h1>
          <p class="page-subtitle">Configure 2 to 4+ custom criteria variables per rubric depending on assignment needs</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="facultyView.openAddRubricModal()">+ Create Rubric Preset</button>
      </div>

      ${this.getRubricCardsHTML()}
    `;
  },

  openEditRubricModal(rubricId) {
    const rub = app.data.rubricPresets.find(r => r.id === rubricId) || app.data.rubricPresets[0];
    this.editingRubricCriteria = JSON.parse(JSON.stringify(rub.criteria || []));

    app.showModal(`Edit Rubric — ${rub.name}`, `
      <form onsubmit="facultyView.saveEditedRubric(event, '${rub.id}')">
        <div class="form-group">
          <label class="form-label">Rubric Preset Name</label>
          <input type="text" id="edit-rub-name" class="form-input" value="${rub.name}" required>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:12px; margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="font-size:14px; margin-bottom:0;">Rubric Criteria List (Freedom for 2, 3, or 4 Criteria):</h4>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addRubricCriteriaRow()">+ Add Criteria Row</button>
          </div>

          <div id="edit-rubric-criteria-container">
            ${this.buildRubricCriteriaRowsHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Rubric Preset</button>
        </div>
      </form>
    `);
  },

  buildRubricCriteriaRowsHTML() {
    if (!this.editingRubricCriteria || this.editingRubricCriteria.length === 0) {
      return `<div style="font-size:13px; color:var(--text-secondary);">No criteria configured. Click "+ Add Criteria Row" above.</div>`;
    }

    return this.editingRubricCriteria.map((c, idx) => {
      const l0 = this.getRubricLevelData(c, 0);
      const l1 = this.getRubricLevelData(c, 1);
      const l2 = this.getRubricLevelData(c, 2);
      const l3 = this.getRubricLevelData(c, 3);
      return `
        <div style="background:var(--bg-primary); padding:12px; border-radius:var(--radius-md); margin-bottom:12px; border:1px solid var(--border-default);">
          <div style="display:flex; gap:12px; margin-bottom:8px; align-items:center;">
            <div style="flex:1;">
              <label class="form-label" style="margin-bottom:2px;">Criteria ${idx+1} Title</label>
              <input type="text" class="form-input edit-crit-title" value="${c.title}" required style="background:#FFF;">
            </div>
            <div style="width:180px;">
              <label class="form-label" style="margin-bottom:2px;">Evaluation Mode</label>
              <select class="form-select edit-crit-type" style="background:#FFF;">
                <option value="auto_numerical" ${c.type === 'auto_numerical' ? 'selected' : ''}>Auto (Numerical ±5%)</option>
                <option value="auto_units" ${c.type === 'auto_units' ? 'selected' : ''}>Auto (Unit Precision)</option>
                <option value="manual" ${c.type === 'manual' ? 'selected' : ''}>Manual Instructor Review</option>
              </select>
            </div>
            <button type="button" class="btn btn-destructive btn-sm" style="margin-top:16px;" onclick="facultyView.removeRubricCriteriaRow(${idx})">❌</button>
          </div>

          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; font-size:11px;">
            <div>
              <label style="font-weight:600; color:var(--success);">Level 3 Marks</label>
              <input type="number" class="form-input edit-crit-m3" value="${l0.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--accent-blue);">Level 2 Marks</label>
              <input type="number" class="form-input edit-crit-m2" value="${l1.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--warning);">Level 1 Marks</label>
              <input type="number" class="form-input edit-crit-m1" value="${l2.marks}" style="background:#FFF; height:32px;">
            </div>
            <div>
              <label style="font-weight:600; color:var(--danger);">Level 0 Marks</label>
              <input type="number" class="form-input edit-crit-m0" value="${l3.marks}" style="background:#FFF; height:32px;">
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  addRubricCriteriaRow() {
    if (!this.editingRubricCriteria) this.editingRubricCriteria = [];
    const count = this.editingRubricCriteria.length + 1;
    this.editingRubricCriteria.push({
      id: "crit-" + Date.now() + "-" + count,
      title: `Criteria 0${count} (New Variable)`,
      type: "manual",
      levels: [
        { level: "Level 3", minPct: 90, marks: 3, description: "Exemplary" },
        { level: "Level 2", minPct: 50, marks: 2, description: "Satisfactory" },
        { level: "Level 1", minPct: 1,  marks: 1, description: "Needs Improvement" },
        { level: "Level 0", minPct: 0,  marks: 0, description: "Unsatisfactory" }
      ]
    });
    const container = document.getElementById('edit-rubric-criteria-container');
    if (container) container.innerHTML = this.buildRubricCriteriaRowsHTML();
  },

  removeRubricCriteriaRow(idx) {
    if (!this.editingRubricCriteria) return;
    this.editingRubricCriteria.splice(idx, 1);
    const container = document.getElementById('edit-rubric-criteria-container');
    if (container) container.innerHTML = this.buildRubricCriteriaRowsHTML();
  },

  saveEditedRubric(e, rubricId) {
    e.preventDefault();
    const rub = app.data.rubricPresets.find(r => r.id === rubricId);
    if (!rub) return;

    rub.name = document.getElementById('edit-rub-name').value;
    const titles = document.querySelectorAll('.edit-crit-title');
    const types = document.querySelectorAll('.edit-crit-type');
    const m3s = document.querySelectorAll('.edit-crit-m3');
    const m2s = document.querySelectorAll('.edit-crit-m2');
    const m1s = document.querySelectorAll('.edit-crit-m1');
    const m0s = document.querySelectorAll('.edit-crit-m0');

    const updatedCriteria = [];
    let totalMarks = 0;

    titles.forEach((el, idx) => {
      const m3 = parseFloat(m3s[idx] ? m3s[idx].value : 4);
      const m2 = parseFloat(m2s[idx] ? m2s[idx].value : 3);
      const m1 = parseFloat(m1s[idx] ? m1s[idx].value : 1);
      const m0 = parseFloat(m0s[idx] ? m0s[idx].value : 0);
      totalMarks += m3;

      updatedCriteria.push({
        id: (this.editingRubricCriteria[idx] && this.editingRubricCriteria[idx].id) ? this.editingRubricCriteria[idx].id : ('crit-' + Date.now() + '-' + idx),
        title: el.value,
        type: types[idx] ? types[idx].value : 'auto_numerical',
        levels: [
          { level: "Level 3", minPct: 90, marks: m3, description: "≥ 90% correct" },
          { level: "Level 2", minPct: 50, marks: m2, description: "≥ 50% correct" },
          { level: "Level 1", minPct: 1,  marks: m1, description: "< 50% correct" },
          { level: "Level 0", minPct: 0,  marks: m0, description: "No submission" }
        ]
      });
    });

    rub.criteria = updatedCriteria;
    rub.totalMarks = totalMarks;
    app.saveState();
    app.closeModal();
    app.showToast(`Saved rubric with ${updatedCriteria.length} criteria (${totalMarks} total marks)`, 'success');
    this.renderRubricBuilder(document.getElementById('main-content'));
  },

  openAddRubricModal() {
    this.editingRubricCriteria = [
      {
        id: "crit-1",
        title: "Criteria 01 (Numerical Values)",
        type: "auto_numerical",
        levels: [
          { level: "Level 3", minPct: 90, marks: 4, description: "≥ 90% parameters within ±5% tolerance" },
          { level: "Level 2", minPct: 50, marks: 3, description: "≥ 50% parameters within ±5% tolerance" },
          { level: "Level 1", minPct: 1,  marks: 1, description: "< 50% parameters within ±10% tolerance" },
          { level: "Level 0", minPct: 0,  marks: 0, description: "0% parameters correct" }
        ]
      },
      {
        id: "crit-2",
        title: "Criteria 02 (Units)",
        type: "auto_units",
        levels: [
          { level: "Level 3", minPct: 90, marks: 3, description: "≥ 90% units correct" },
          { level: "Level 2", minPct: 50, marks: 2, description: "≥ 50% units correct" },
          { level: "Level 1", minPct: 1,  marks: 1, description: "< 50% units correct" },
          { level: "Level 0", minPct: 0,  marks: 0, description: "No correct units" }
        ]
      }
    ];

    app.showModal('Create Custom Rubric Preset', `
      <form onsubmit="facultyView.saveNewRubric(event)">
        <div class="form-group">
          <label class="form-label">Rubric Name</label>
          <input type="text" id="new-rub-name" class="form-input" placeholder="e.g. 2-Criteria Physics Lab Rubric" required>
        </div>

        <div style="border-top:1px solid var(--border-default); padding-top:12px; margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="font-size:14px; margin-bottom:0;">Rubric Criteria List (Freedom for 2, 3, or 4 Criteria):</h4>
            <button type="button" class="btn btn-secondary btn-sm" onclick="facultyView.addRubricCriteriaRow()">+ Add Criteria Row</button>
          </div>

          <div id="edit-rubric-criteria-container">
            ${this.buildRubricCriteriaRowsHTML()}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Rubric</button>
        </div>
      </form>
    `);
  },

  saveNewRubric(e) {
    e.preventDefault();
    const name = document.getElementById('new-rub-name').value;
    const titles = document.querySelectorAll('.edit-crit-title');
    const types = document.querySelectorAll('.edit-crit-type');
    const m3s = document.querySelectorAll('.edit-crit-m3');
    const m2s = document.querySelectorAll('.edit-crit-m2');
    const m1s = document.querySelectorAll('.edit-crit-m1');
    const m0s = document.querySelectorAll('.edit-crit-m0');

    const criteriaList = [];
    let totalMarks = 0;

    titles.forEach((el, idx) => {
      const m3 = parseFloat(m3s[idx] ? m3s[idx].value : 4);
      const m2 = parseFloat(m2s[idx] ? m2s[idx].value : 3);
      const m1 = parseFloat(m1s[idx] ? m1s[idx].value : 1);
      const m0 = parseFloat(m0s[idx] ? m0s[idx].value : 0);
      totalMarks += m3;

      criteriaList.push({
        id: 'crit-' + Date.now() + '-' + idx,
        title: el.value,
        type: types[idx] ? types[idx].value : 'auto_numerical',
        levels: [
          { level: "Level 3", minPct: 90, marks: m3, description: "≥ 90% correct" },
          { level: "Level 2", minPct: 50, marks: m2, description: "≥ 50% correct" },
          { level: "Level 1", minPct: 1,  marks: m1, description: "< 50% correct" },
          { level: "Level 0", minPct: 0,  marks: 0, description: "No submission" }
        ]
      });
    });

    const activeFac = app.data.faculty.find(f => f.email === app.currentUser?.email);
    const resolvedFacultyId = activeFac?.id || app.currentUser?.email || 'faculty';

    const newRub = {
      id: 'rub-' + Date.now(),
      name: name,
      isShared: true,
      facultyId: resolvedFacultyId,
      totalMarks: totalMarks,
      criteria: criteriaList
    };

    app.data.rubricPresets.push(newRub);
    app.saveState();
    app.closeModal();
    app.showToast(`Created rubric "${name}" with ${criteriaList.length} criteria`, 'success');
    this.renderRubricBuilder(document.getElementById('main-content'));
  },

  deleteRubric(rubricId) {
    const rub = (app.data.rubricPresets || []).find(r => r.id === rubricId);
    if (!rub) return;
    if (!confirm(`Are you sure you want to delete rubric preset "${rub.name}"?`)) return;

    app.data.rubricPresets = (app.data.rubricPresets || []).filter(r => r.id !== rubricId);
    app.saveState();
    app.showToast(`Deleted rubric preset "${rub.name}"`, 'info');
    this.renderRubricBuilder(document.getElementById('main-content'));
  },

  renderScheduleManager(container) {
    const asg = app.data.assignments.find(a => a.id === app.activeAssignmentId) || app.data.assignments[0];
    if (!asg) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Schedule & Access</h1>
            <p class="page-subtitle">No active lab assignments found</p>
          </div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📅</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Active Assignment Schedules</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create an assignment to configure multi-batch submission deadlines, attempt penalty rules, and release policies.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
      `;
      return;
    }

    const lateSubmissions = app.data.submissions.filter(s => s.assignmentId === asg.id && s.isLate === true);
    const onTimeSubmissions = app.data.submissions.filter(s => s.assignmentId === asg.id && !s.isLate);

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Schedule & Access</h1>
          <p class="page-subtitle">Configure Publish Dates, Deadlines, Attempt Deductions, & Late Penalties</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          ${asg.state === 'Locked' ? `
            <span class="col-pill pill-locked" style="font-size:12px; padding:6px 14px;">🔒 Locked — Read Only</span>
          ` : `
            <button class="btn btn-secondary btn-sm" style="color:var(--purple); border-color:var(--purple);" onclick="facultyView.lockAssignment('${asg.id}')">
              🔒 Lock & Finalize Assignment
            </button>
          `}
          <button class="btn btn-primary btn-sm" onclick="facultyView.openAddScheduleModal('${asg.id}')">
            + Add Batch Schedule
          </button>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px; background:var(--warning-subtle); border-color:rgba(255,159,10,0.3);">
        <h3 class="card-title" style="color:#D97706; font-size:16px;">⚡ Attempt & Late Submission Deduction Policy</h3>
        <p class="card-subtitle" style="margin-bottom:14px;">Rules governing student retries and late submission penalties for this assignment</p>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:13px;">
          <div style="background:#FFF; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
            <strong>Attempt Penalty Rules:</strong>
            <ul style="margin-top:6px; padding-left:18px;">
              <li><strong>Attempt 1:</strong> 0% Deduction (Full Marks)</li>
              <li><strong>Attempt 2:</strong> -10% Deduction on earned marks</li>
              <li><strong>Attempt 3:</strong> -20% Deduction on earned marks (Max 3 attempts enforced)</li>
            </ul>
          </div>
          <div style="background:#FFF; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
            <strong>Late Submission Penalty Rules:</strong>
            <ul style="margin-top:6px; padding-left:18px;">
              <li><strong>Rate:</strong> -10% per day late after batch deadline</li>
              <li><strong>Max Cap:</strong> Capped at 30% maximum deduction</li>
              <li><strong>Overdue Status:</strong> Submissions flagged as late for faculty review</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="card">
        <h3 class="card-title" style="margin-bottom:16px;">Active Schedules for ${asg.code || asg.title}</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Scope Target</th>
                <th>Target Value</th>
                <th>Publish Date</th>
                <th>Submission Deadline</th>
                <th>Late Penalty Policy</th>
                <th>Submissions Open</th>
                <th>Grades Released</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${asg.schedules.map(s => `
                <tr>
                  <td><span class="tag tag-bt">${s.scopeType.toUpperCase()}</span></td>
                  <td style="font-weight:700; font-family:var(--font-mono);">${s.scopeValue}</td>
                  <td style="font-size:12px;">${new Date(s.publishDate || '2026-08-01T09:00').toLocaleString()}</td>
                  <td style="font-weight:600;">${new Date(s.deadline).toLocaleString()}</td>
                  <td>${s.latePenaltyValue}% / day (Cap ${s.lateMaxCap}%)</td>
                  <td>
                    <button class="btn ${s.submissionsOpen ? 'btn-secondary' : 'btn-destructive'} btn-sm" onclick="facultyView.toggleScheduleToggle('${asg.id}', '${s.id}', 'submissionsOpen')">
                      ${s.submissionsOpen ? '🟢 Open' : '🔴 Closed'}
                    </button>
                  </td>
                  <td>
                    <button class="btn ${s.gradesReleased ? 'btn-secondary' : 'btn-ghost'} btn-sm" onclick="facultyView.toggleScheduleToggle('${asg.id}', '${s.id}', 'gradesReleased')">
                      ${s.gradesReleased ? '✅ Released' : '⏳ Hidden'}
                    </button>
                  </td>
                  <td>
                    <button class="btn btn-destructive btn-sm" onclick="facultyView.deleteSchedule('${asg.id}', '${s.id}')">
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <h3 class="card-title" style="margin-bottom:12px;">Late Submission Summary — ${asg.code}</h3>
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">On-Time Submissions</span>
            <span class="kpi-value" style="color:var(--success);">${onTimeSubmissions.length}</span>
            <span class="kpi-trend positive">No Penalty Applied</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Late Submissions</span>
            <span class="kpi-value" style="color:var(--danger);">${lateSubmissions.length}</span>
            <span class="kpi-trend negative">Late Penalty Applied</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Total Submissions</span>
            <span class="kpi-value">${lateSubmissions.length + onTimeSubmissions.length}</span>
            <span class="kpi-trend neutral">Across All Batches</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Late Penalty Policy</span>
            <span class="kpi-value" style="font-size:18px;">-${asg.schedules[0] ? asg.schedules[0].latePenaltyValue : 10}%/day</span>
            <span class="kpi-trend neutral">Cap: ${asg.schedules[0] ? asg.schedules[0].lateMaxCap : 30}% Max</span>
          </div>
        </div>
      </div>
    `;
  },

  toggleScheduleToggle(asgId, scheduleId, key) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;
    const sch = asg.schedules.find(s => s.id === scheduleId);
    if (!sch) return;
    sch[key] = !sch[key];
    app.saveState();

    // Sync the full assignment (including updated schedules JSONB) to Supabase
    app.syncAssignmentToSupabase(asg);

    const keyLabel = key === 'submissionsOpen' 
      ? (sch[key] ? 'Submissions opened' : 'Submissions closed')
      : key === 'gradesReleased'
      ? (sch[key] ? 'Grades released to students' : 'Grades hidden from students')
      : `Updated ${key}`;

    app.showToast(keyLabel, 'success');
    this.renderScheduleManager(document.getElementById('main-content'));
  },

  openAddScheduleModal(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    // Default publish date to now, deadline to 7 days from now
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const formatForInput = (d) => d.toISOString().slice(0, 16);

    app.showModal(`Add Batch Schedule — ${asg.code}`, `
      <form onsubmit="facultyView.saveNewSchedule(event, '${asg.id}')">

        <div class="form-group">
          <label class="form-label">Schedule Scope Type</label>
          <select id="sch-scope-type" class="form-select" onchange="facultyView.onScheduleScopeTypeChange()">
            <option value="batch">Batch (e.g. A1, B2)</option>
            <option value="division">Division (e.g. A, B)</option>
            <option value="all">All Students</option>
          </select>
        </div>

        <div class="form-group" id="sch-scope-value-group">
          <label class="form-label">Scope Value (Batch or Division Name)</label>
          <input type="text" id="sch-scope-value" class="form-input code-font" 
            placeholder="e.g. A1 or B2 or C1" required>
          <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">
            Enter the exact batch or division name this schedule applies to. 
            Students are matched by their batch field from the Student Master roster.
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Publish Date & Time</label>
            <input type="datetime-local" id="sch-publish" class="form-input" 
              value="${formatForInput(now)}" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Submission Deadline</label>
            <input type="datetime-local" id="sch-deadline" class="form-input" 
              value="${formatForInput(sevenDaysLater)}" required>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Late Penalty (% per day)</label>
            <input type="number" id="sch-late-penalty" class="form-input" 
              value="10" min="0" max="100" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Late Penalty Cap (%)</label>
            <input type="number" id="sch-late-cap" class="form-input" 
              value="30" min="0" max="100" required>
          </div>
        </div>

        <div style="display:flex; gap:20px; margin-top:8px; margin-bottom:16px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:600;">
            <input type="checkbox" id="sch-open" checked> 
            Submissions Open on Publish
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; font-weight:600;">
            <input type="checkbox" id="sch-grades"> 
            Grades Released Immediately
          </label>
        </div>

        <div style="background:var(--warning-subtle); border:1px solid var(--warning); border-radius:var(--radius-md); padding:10px 14px; font-size:12px; color:var(--warning); margin-bottom:16px;">
          ⚠️ If a schedule already exists for this scope value, adding a new one will create a duplicate. 
          Check the existing schedules table before adding. Each batch should have only one schedule.
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Schedule</button>
        </div>
      </form>
    `);
  },

  onScheduleScopeTypeChange() {
    const scopeType = document.getElementById('sch-scope-type').value;
    const scopeValueGroup = document.getElementById('sch-scope-value-group');
    const scopeValueInput = document.getElementById('sch-scope-value');

    if (scopeType === 'all') {
      scopeValueGroup.style.display = 'none';
      if (scopeValueInput) scopeValueInput.removeAttribute('required');
    } else {
      scopeValueGroup.style.display = 'block';
      if (scopeValueInput) scopeValueInput.setAttribute('required', 'required');
    }
  },

  saveNewSchedule(e, asgId) {
    e.preventDefault();
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const scopeType = document.getElementById('sch-scope-type').value;
    const scopeValue = scopeType === 'all' 
      ? 'ALL' 
      : (document.getElementById('sch-scope-value').value || '').trim().toUpperCase();

    if (scopeType !== 'all' && !scopeValue) {
      app.showToast('Please enter a scope value (batch or division name)', 'warning');
      return;
    }

    const publishDate = document.getElementById('sch-publish').value;
    const deadline = document.getElementById('sch-deadline').value;
    const latePenaltyValue = parseInt(document.getElementById('sch-late-penalty').value) || 10;
    const lateMaxCap = parseInt(document.getElementById('sch-late-cap').value) || 30;
    const submissionsOpen = document.getElementById('sch-open').checked;
    const gradesReleased = document.getElementById('sch-grades').checked;

    if (new Date(deadline) <= new Date(publishDate)) {
      app.showToast('Deadline must be after the publish date', 'danger');
      return;
    }

    const newSchedule = {
      id: 'sch-' + Date.now(),
      scopeType: scopeType,
      scopeValue: scopeValue,
      publishDate: publishDate,
      deadline: deadline,
      submissionsOpen: submissionsOpen,
      gradesReleased: gradesReleased,
      latePenaltyValue: latePenaltyValue,
      lateMaxCap: lateMaxCap
    };

    if (!asg.schedules) asg.schedules = [];
    asg.schedules.push(newSchedule);
    app.saveState();

    // Sync to Supabase
    app.syncAssignmentToSupabase(asg);

    app.closeModal();
    app.showToast(`Added schedule for ${scopeType === 'all' ? 'All Students' : scopeValue} — deadline ${new Date(deadline).toLocaleString()}`, 'success');
    this.renderScheduleManager(document.getElementById('main-content'));
  },

  deleteSchedule(asgId, scheduleId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const sch = asg.schedules.find(s => s.id === scheduleId);
    if (!sch) return;

    if (!confirm(`Delete schedule for "${sch.scopeType === 'all' ? 'All Students' : sch.scopeValue}"? Students in this scope will lose their deadline configuration.`)) return;

    asg.schedules = asg.schedules.filter(s => s.id !== scheduleId);
    app.saveState();

    // Sync updated assignment (with removed schedule) to Supabase
    app.syncAssignmentToSupabase(asg);

    app.showToast(`Deleted schedule for ${sch.scopeValue || 'All Students'}`, 'info');
    this.renderScheduleManager(document.getElementById('main-content'));
  },

  getActiveCSVAssignment() {
    let asg = (app.data.assignments || []).find(a => a.id === this.activeCSVAssignmentId);
    if (!asg && app.activeAssignmentId) {
      asg = (app.data.assignments || []).find(a => a.id === app.activeAssignmentId);
      if (asg) this.activeCSVAssignmentId = asg.id;
    }
    if (!asg && app.data.assignments && app.data.assignments.length > 0) {
      asg = app.data.assignments[0];
      this.activeCSVAssignmentId = asg.id;
    }
    return asg;
  },

  renderCSVPipeline(container) {
    const selectedAsg = this.getActiveCSVAssignment();

    if (!selectedAsg) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Grade & Evaluate</h1>
            <p class="page-subtitle">No active lab assignments found</p>
          </div>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
        <div class="card" style="text-align:center; padding:48px 24px;">
          <div style="font-size:48px; margin-bottom:12px;">📂</div>
          <h3 style="font-size:18px; font-weight:700; margin-bottom:8px;">No Assignments for CSV Pipeline</h3>
          <p style="color:var(--text-secondary); max-width:480px; margin:0 auto 20px auto; font-size:13px;">
            Create an assignment to upload personalized question variables and 2-row ground truth solution CSV keys.
          </p>
          <button class="btn btn-primary" onclick="facultyView.openCreateAssignmentModal()">+ Create New Lab Sheet</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Grade & Evaluate</h1>
          <p class="page-subtitle">Upload question variables & 2-row solution keys with retroactive grading</p>
        </div>
        <button class="btn btn-primary" onclick="facultyView.triggerRetroactiveGrading('${selectedAsg.id}')">⚡ Trigger Retroactive Re-Grading</button>
      </div>

      <div class="card" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div style="display:flex; align-items:center; gap:16px;">
          <label class="form-label" style="margin-bottom:0; color:var(--accent-blue);">Select Assignment for CSV Pipeline:</label>
          <select id="csv-assignment-selector" class="form-select" style="flex:1; background:#FFF;" onchange="facultyView.selectCSVAssignment(this.value)">
            ${app.data.assignments.map(a => `<option value="${a.id}" ${a.id === selectedAsg.id ? 'selected' : ''}>${a.code || a.id} — ${a.title}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="card">
          <h3 class="card-title">1. Question Variables CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Upload personalized variable values per student UIN</p>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-bottom:10px;" onclick="facultyView.downloadQuestionCSVTemplate()">📥 Download Question CSV Template</button>
          <input type="file" id="question-csv-file" accept=".csv" style="display:none;" onchange="facultyView.handleQuestionCSVUpload(event)">
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="document.getElementById('question-csv-file').click()">📤 Upload Question CSV File</button>
        </div>

        <div class="card">
          <h3 class="card-title">2. Ground Truth Solution CSV Key</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">2-Row Format: Row 1 Human Labels, Row 2 Machine Codes</p>
          <button class="btn btn-secondary btn-sm" style="width:100%; margin-bottom:10px;" onclick="facultyView.downloadSolutionCSVTemplate()">📥 Download Pre-Filled 2-Row Template</button>
          <input type="file" id="solution-csv-file" accept=".csv" style="display:none;" onchange="facultyView.handleSolutionCSVUpload(event)">
          <button class="btn btn-primary btn-sm" style="width:100%;" onclick="document.getElementById('solution-csv-file').click()">📤 Upload Solution CSV File</button>
        </div>
      </div>

      <div class="card" style="margin-top:24px;">
        <h3 class="card-title">Future Formula Evaluator Layer Sandbox</h3>
        <p class="card-subtitle" style="margin-bottom:12px;">Test automated solution calculations without uploading solution CSVs</p>

        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="formula-sandbox-input" class="form-input code-font" value="sqrt(var_k_Nmm * 1000 / var_m_kg)" style="flex:1;">
          <button class="btn btn-secondary" onclick="facultyView.testFormula()">Test Formula</button>
        </div>
        <div id="formula-test-result" style="margin-top:10px; font-size:13px;"></div>
      </div>
    `;
  },

  selectCSVAssignment(asgId) {
    this.activeCSVAssignmentId = asgId;
    app.activeAssignmentId = asgId;
    app.showToast('Selected assignment for CSV Pipeline', 'info');
    this.renderCSVPipeline(document.getElementById('main-content'));
  },

  testFormula() {
    document.getElementById('formula-test-result').innerHTML = `
      <div style="color:var(--success); font-weight:600;">✓ Formula Valid! Calculated ω_n = 189.74 rad/s for Sample Student (m=12.5kg, k=450N/mm).</div>
    `;
  },

  downloadQuestionCSVTemplate() {
    const selectedAsg = this.getActiveCSVAssignment();
    if (!selectedAsg) {
      app.showToast('No assignment selected for template download', 'warning');
      return;
    }

    // Extract all variable placeholders {{var}} across questions in this assignment
    const variableKeysSet = new Set();
    (selectedAsg.questions || []).forEach(q => {
      const matches = (q.text || '').match(/\{\{(.*?)\}\}/g) || [];
      matches.forEach(m => {
        const key = m.replace(/\{\{|\}\}/g, '').trim();
        if (key) variableKeysSet.add(key);
      });
    });

    const variableKeys = Array.from(variableKeysSet);
    if (variableKeys.length === 0) {
      app.showToast(`No {{variable}} placeholders found in questions for ${selectedAsg.code || selectedAsg.title}. Add placeholders like {{var_m}} or {{A}} in question text first.`, 'warning');
      return;
    }

    // Build header: uin, var1, var2, ...
    const headers = ['uin', ...variableKeys];

    // Build data rows for roster students
    const students = app.data.students || [];
    let dataRows = [];

    if (students.length > 0) {
      dataRows = students.map(st => {
        const rowVals = [st.uin];
        variableKeys.forEach(vk => {
          const existingVar = (app.data.studentVariables || []).find(v => 
            v.studentId === st.id && v.assignmentId === selectedAsg.id && v.key === vk
          );
          rowVals.push(existingVar ? existingVar.value : '');
        });
        return rowVals.join(',');
      });
    } else {
      // Sample row with empty values if no roster exists yet
      dataRows = [`XXXXXX,${variableKeys.map(() => '').join(',')}`];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n'
      + dataRows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Question_Variables_${selectedAsg.code ? selectedAsg.code.replace(/[\/]/g, '_') : 'Template'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    app.showToast(`Downloaded Question Variables Template for ${selectedAsg.code || selectedAsg.title} (${variableKeys.length} variable columns: ${variableKeys.join(', ')})`, "success");
  },

  deleteQuestion(asgId, questionId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const q = asg.questions.find(q => q.id === questionId);
    if (!q) return;

    if (!confirm(`Delete question "${q.sectionLabel}"? This will also remove all student submissions for this question's parameters. This cannot be undone.`)) return;

    // Collect parameter IDs for this question
    const paramIds = (q.parameters || []).map(p => p.id);

    // Remove the question
    asg.questions = asg.questions.filter(q => q.id !== questionId);

    // Remove related submissions locally
    app.data.submissions = app.data.submissions.filter(s => !paramIds.includes(s.parameterId));

    // Remove related student answers locally
    app.data.studentAnswers = app.data.studentAnswers.filter(a => !paramIds.includes(a.parameterId));

    app.saveState();

    // Sync updated assignment to Supabase
    app.syncAssignmentToSupabase(asg);

    // Delete related submissions from Supabase
    if (window.supabaseClient) {
      paramIds.forEach(pid => {
        supabaseClient.from('submissions').delete().eq('parameter_id', pid)
          .then(({ error }) => { if (error) console.warn('Supabase delete submissions for param:', error); });
        supabaseClient.from('student_answers').delete().eq('parameter_id', pid)
          .then(({ error }) => { if (error) console.warn('Supabase delete student_answers for param:', error); });
      });
    }

    app.showToast(`Deleted question ${q.sectionLabel} and ${paramIds.length} related parameter records`, 'info');
    this.renderAssignmentBuilder(document.getElementById('main-content'));
  },

  downloadSolutionCSVTemplate() {
    const selectedAsg = this.getActiveCSVAssignment();
    if (!selectedAsg) {
      app.showToast('No assignment selected for template download', 'warning');
      return;
    }

    if (!selectedAsg.questions || selectedAsg.questions.length === 0) {
      app.showToast('This assignment has no questions yet. Build questions first before downloading the solution template.', 'warning');
      return;
    }

    // Build header rows from actual parameters
    const humanLabels = ['parameter_label'];
    const machineCodes = ['ans_header'];

    selectedAsg.questions.forEach(q => {
      (q.parameters || []).forEach(p => {
        humanLabels.push(p.label);
        machineCodes.push(`ans_${p.code}`);
      });
    });

    // Build example data rows for enrolled students
    const students = app.data.students.slice(0, 3); // show up to 3 example rows
    const exampleRows = students.length > 0
      ? students.map(st => {
          const values = [st.uin];
          selectedAsg.questions.forEach(q => {
            (q.parameters || []).forEach(() => values.push('0.000'));
          });
          return values.join(',');
        })
      : [`XXXXXX,${selectedAsg.questions.flatMap(q => q.parameters || []).map(() => '0.000').join(',')}`];

    const csvContent = "data:text/csv;charset=utf-8,"
      + humanLabels.join(',') + '\n'
      + machineCodes.join(',') + '\n'
      + exampleRows.join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Solution_Key_${selectedAsg.code.replace(/[\/]/g, '_')}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    const paramCount = selectedAsg.questions.flatMap(q => q.parameters || []).length;
    app.showToast(`Downloaded solution template for ${selectedAsg.code} — ${paramCount} parameter column${paramCount !== 1 ? 's' : ''} from actual assignment`, 'success');
  },

  handleQuestionCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length < 2) {
        app.showToast("CSV must have at least 2 rows (header + data)", "danger");
        return;
      }

      const headerParts = lines[0].split(',').map(c => c.trim());
      const variableKeys = headerParts.slice(1);
      const selectedAsg = this.getActiveCSVAssignment();
      if (!selectedAsg) {
        app.showToast('Please select or create an assignment before uploading variables CSV', 'warning');
        return;
      }
      const assignmentId = selectedAsg.id;

      if (!app.data.studentVariables) {
        app.data.studentVariables = [];
      }

      let updatedCount = 0;
      let matchedStudentCount = 0;
      const matchedStudents = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const uin = parts[0];
        if (!uin) continue;

        const cleanUin = uin.trim().toLowerCase();
        const student = app.data.students.find(s =>
          (s.uin || '').trim().toLowerCase() === cleanUin ||
          (s.id || '').trim().toLowerCase() === cleanUin ||
          (s.email || '').trim().toLowerCase().split('@')[0] === cleanUin
        );
        if (!student) continue;

        matchedStudentCount++;
        matchedStudents.push(student);

        variableKeys.forEach((key, idx) => {
          const val = parts[idx + 1];
          if (val === undefined || val === '') return;

          let existing = app.data.studentVariables.find(v =>
            v.studentId === student.id &&
            v.assignmentId === assignmentId &&
            v.key === key
          );

          if (existing) {
            existing.value = val;
          } else {
            app.data.studentVariables.push({
              id: 'svar-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
              studentId: student.id,
              assignmentId: assignmentId,
              key: key,
              value: val
            });
          }
          updatedCount++;
        });
      }

      app.saveState();
      matchedStudents.forEach(student => {
        app.syncStudentVariablesToSupabase(student.id, this.activeCSVAssignmentId);
      });
      app.showToast(`Loaded question variables for ${matchedStudentCount} students (${updatedCount} variable entries updated)`, 'success');
      this.renderCSVPipeline(document.getElementById('main-content'));
    };
    reader.readAsText(file);
  },

  handleSolutionCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 3) {
        app.showToast("CSV file must have at least 3 rows (Row 1 Header, Row 2 Codes, Row 3+ Data)", "danger");
        return;
      }

      const selectedAsg = app.data.assignments.find(a => a.id === this.activeCSVAssignmentId);
      if (!selectedAsg || !selectedAsg.questions || selectedAsg.questions.length === 0) {
        app.showToast('Please select an assignment with questions before uploading the solution CSV', 'warning');
        return;
      }

      const paramCodeToId = {};
      selectedAsg.questions.forEach(q => {
        (q.parameters || []).forEach(p => {
          if (p.code) {
            paramCodeToId[p.code] = p.id;
          }
        });
      });

      const paramCodes = lines[1].split(',').map(c => c.trim().replace('ans_', ''));
      let updatedCount = 0;

      for (let i = 2; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        const uin = parts[0];
        if (!uin) continue;

        const cleanUin = uin.trim().toLowerCase();
        const student = app.data.students.find(s =>
          (s.uin || '').trim().toLowerCase() === cleanUin ||
          (s.id || '').trim().toLowerCase() === cleanUin ||
          (s.email || '').trim().toLowerCase().split('@')[0] === cleanUin
        );
        if (!student) continue;

        paramCodes.forEach((code, idx) => {
          if (idx === 0) return;
          const val = parts[idx];
          if (!val) return;

          const parameterId = paramCodeToId[code];
          if (!parameterId) return;

          const paramObj = selectedAsg.questions
            .flatMap(q => q.parameters || [])
            .find(p => p.id === parameterId);
          const correctUnit = (paramObj && paramObj.acceptedUnits && paramObj.acceptedUnits.length > 0) ? paramObj.acceptedUnits[0] : '';

          let existingAns = app.data.studentAnswers.find(a => a.studentId === student.id && a.parameterId === parameterId);
          if (existingAns) {
            existingAns.correctValue = val;
            existingAns.correctUnit = correctUnit;
          } else {
            app.data.studentAnswers.push({
              id: 'sans-' + student.id + '-' + parameterId,
              assignmentId: this.activeCSVAssignmentId,
              studentId: student.id,
              parameterId: parameterId,
              correctValue: val,
              correctUnit: correctUnit
            });
          }
          updatedCount++;
        });
      }

      app.saveState();
      const processedStudentIds = [...new Set(
        app.data.studentAnswers
          .filter(a => a.assignmentId === this.activeCSVAssignmentId)
          .map(a => a.studentId)
      )];
      processedStudentIds.forEach(sid => {
        app.syncStudentAnswersToSupabase(sid, this.activeCSVAssignmentId);
      });
      app.showToast(`Parsed Solution CSV Key: Updated ${updatedCount} ground truth answers`, 'success');
      this.triggerRetroactiveGrading(this.activeCSVAssignmentId);
    };
    reader.readAsText(file);
  },

  triggerRetroactiveGrading(asgId) {
    let reEvaluated = 0;
    const asgObj = app.data.assignments.find(a => a.id === asgId);
    app.data.submissions.forEach(subm => {
      if (subm.assignmentId === asgId || (asgObj && subm.assignmentId === asgObj.originalId)) {
        const gt = app.data.studentAnswers.find(a => a.studentId === subm.studentId && a.parameterId === subm.parameterId);
        if (gt) {
          const expectedVal = parseFloat(gt.correctValue);
          const submittedVal = parseFloat(subm.submittedValue);
          let diffPct = 0;
          if (!isNaN(expectedVal) && expectedVal !== 0) {
            diffPct = (Math.abs(submittedVal - expectedVal) / Math.abs(expectedVal)) * 100;
          } else if (expectedVal === 0) {
            diffPct = Math.abs(submittedVal) === 0 ? 0 : 100;
          }

          const paramObj = (asgObj && asgObj.questions ? asgObj.questions : []).flatMap(q => q.parameters || []).find(p => p.id === subm.parameterId);
          const acceptedUnits = (paramObj?.acceptedUnits || [gt.correctUnit || '']).map(u => u.toLowerCase().trim()).filter(Boolean);

          subm.isCorrectValue = diffPct <= 5.0;
          subm.isCorrectUnit = acceptedUnits.length > 0 ? acceptedUnits.includes((subm.submittedUnit || '').toLowerCase().trim()) : true;

          // Base marks from value correctness + unit correctness
          const vMarks = paramObj?.valueMarks ?? 4;
          const uMarks = paramObj?.unitMarks ?? 1;
          const baseMarks = (subm.isCorrectValue ? vMarks : (diffPct <= 10.0 ? Math.round(vMarks / 2) : 0)) + (subm.isCorrectUnit ? uMarks : 0);

          // Re-apply attempt deduction
          const attemptDeductionPct = subm.attemptDeductionPct || subm.deductionPct || 0;
          const afterAttemptDeduction = baseMarks * (1 - attemptDeductionPct / 100);

          // Re-apply late penalty
          const student = app.data.students.find(s => s.id === subm.studentId);
          const studentBatch = student ? student.batch : 'A1';
          const schedule = app.getAssignmentSchedule(subm.assignmentId, studentBatch);
          let latePenaltyPct = 0;
          if (schedule && schedule.deadline && subm.submittedAt) {
            const deadlineMs = new Date(schedule.deadline).getTime();
            const submittedMs = new Date(subm.submittedAt).getTime();
            if (submittedMs > deadlineMs) {
              const daysLate = Math.ceil((submittedMs - deadlineMs) / (1000 * 60 * 60 * 24));
              latePenaltyPct = Math.min(daysLate * (schedule.latePenaltyValue || 10), schedule.lateMaxCap || 30);
            }
          }

          subm.latePenaltyPct = latePenaltyPct;
          subm.isLate = latePenaltyPct > 0;
          subm.marksAwarded = Math.max(0, Math.round(afterAttemptDeduction * (1 - latePenaltyPct / 100)));
          reEvaluated++;
        }
      }
    });
    app.saveState();
    app.data.submissions
      .filter(s => s.assignmentId === asgId || (asgObj && s.assignmentId === asgObj.originalId))
      .forEach(s => app.syncSubmissionToSupabase(s));
    app.showToast(`Retroactive Auto-Grading Complete: ${reEvaluated} submissions re-evaluated against ground truth`, 'success');
  },

  generateAssignmentCode(subjectId) {
    const sub = (app.data.subjects || []).find(s => s.id === subjectId);
    const deptShort = app.getDepartmentShortName(sub ? sub.departmentId : 'dept-fe');
    const ay = (app.data.academicYears || []).find(a => a.active);
    const ayLabel = ay ? ay.label : '2026-27';
    
    let labShort = 'LAB';
    if (sub) {
      labShort = (sub.shortName || sub.code).replace(/[^a-zA-Z0-9]/g, '');
      if (!labShort) labShort = sub.code || 'LAB';
    }

    const num = (app.data.assignments || []).length + 1;
    const padNum = String(num).padStart(3, '0');
    return `RCOE/${deptShort}/${ayLabel}/${labShort}_A${padNum}`;
  },

  onAssignmentSubjectChange() {
    const subSelect = document.getElementById('new-asg-subject');
    if (!subSelect) return;
    const selectedSubId = subSelect.value;
    const sub = (app.data.subjects || []).find(s => s.id === selectedSubId);

    // 1. Update Auto Assignment Code
    const codeInput = document.getElementById('new-asg-code');
    if (codeInput) {
      codeInput.value = this.generateAssignmentCode(selectedSubId);
    }

    // 2. Auto-fill Class & Branch and Semester
    const classInput = document.getElementById('new-asg-class');
    const semInput = document.getElementById('new-asg-sem');
    if (sub) {
      if (classInput) classInput.value = sub.className || 'SE Mechanical';
      if (semInput) semInput.value = sub.semester || 'Semester III';
    }

    // 3. Filter Modules Covered for this Subject Only
    const modSelect = document.getElementById('new-asg-module');
    if (modSelect) {
      const filteredMods = (app.data.modules || []).filter(m => m.subjectId === selectedSubId);
      if (filteredMods.length > 0) {
        modSelect.innerHTML = filteredMods.map(m => `<option value="${m.code}: ${m.title}">${m.code}: ${m.title}</option>`).join('');
      } else {
        modSelect.innerHTML = '<option value="">-- No Modules Defined For This Subject --</option>';
      }
    }

    // 4. Filter Outcomes Covered for this Subject Only
    const coSelect = document.getElementById('new-asg-co');
    if (coSelect) {
      const filteredCOs = (app.data.courseOutcomes || []).filter(c => c.subjectId === selectedSubId);
      if (filteredCOs.length > 0) {
        coSelect.innerHTML = filteredCOs.map(co => {
          const type = co.type || (co.code && co.code.includes('.LO') ? 'LO' : 'CO');
          return `<option value="${co.code}: ${co.description}">[${type}] ${co.code}: ${co.description}</option>`;
        }).join('');
      } else {
        coSelect.innerHTML = '<option value="">-- No Outcomes Defined For This Subject --</option>';
      }
    }
  },

  openCreateAssignmentModal() {
    const subjectOptions = (app.data.subjects && app.data.subjects.length > 0) ?
      app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('') :
      '<option value="">-- No Subjects Defined Yet --</option>';

    const firstSubId = app.data.subjects && app.data.subjects.length > 0 ? app.data.subjects[0].id : '';
    const initialCode = this.generateAssignmentCode(firstSubId);

    app.showModal('Create New Lab Assignment Sheet', `
      <form onsubmit="facultyView.saveAssignment(event)">
        <div class="form-group">
          <label class="form-label">Auto Assignment Code (Editable)</label>
          <input type="text" id="new-asg-code" class="form-input code-font" value="${initialCode}" required style="font-weight:700; color:var(--accent-blue);">
        </div>

        <div class="form-group">
          <label class="form-label">Select Subject Course</label>
          <select id="new-asg-subject" class="form-select" required onchange="facultyView.onAssignmentSubjectChange()">
            ${subjectOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Title</label>
          <input type="text" id="new-asg-title" class="form-input" placeholder="e.g. Lab Sheet 01: Free Vibrations Analysis" required>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Class & Branch</label>
            <input type="text" id="new-asg-class" class="form-input" placeholder="e.g. FE Mechanical" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Semester</label>
            <input type="text" id="new-asg-sem" class="form-input" placeholder="e.g. Semester I" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Modules Covered</label>
          <select id="new-asg-module" class="form-select">
            <option value="">-- Select Subject First --</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Lab Outcome/s Covered (Course Outcomes)</label>
          <select id="new-asg-co" class="form-select">
            <option value="">-- Select Subject First --</option>
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Publish Date & Time</label>
            <input type="datetime-local" id="new-asg-pub" class="form-input" value="2026-08-01T09:00" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Submission Deadline</label>
            <input type="datetime-local" id="new-asg-dead" class="form-input" value="2026-08-10T23:59" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Attach Rubric Preset</label>
          <select id="new-asg-rub" class="form-select">
            ${app.data.rubricPresets.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Assignment</button>
        </div>
      </form>
    `);

    // Trigger dependent dropdown population for default subject
    setTimeout(() => this.onAssignmentSubjectChange(), 50);
  },

  saveAssignment(e) {
    e.preventDefault();
    const selectedSubId = document.getElementById('new-asg-subject').value;
    const code = (document.getElementById('new-asg-code').value || '').trim();
    const cleanId = 'asg-' + code.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const existingIdx = app.data.assignments.findIndex(a => a.id === cleanId || (a.code && a.code.toLowerCase() === code.toLowerCase()));
    const existingQuestions = (existingIdx >= 0 && app.data.assignments[existingIdx].questions) ? app.data.assignments[existingIdx].questions : [];

    const activeFac = app.data.faculty.find(f => f.email === app.currentUser?.email);
    const resolvedFacultyId = activeFac?.id || app.currentUser?.email || 'faculty';

    const newAsg = {
      id: cleanId,
      code: code,
      subjectId: selectedSubId,
      facultyId: resolvedFacultyId,
      number: existingIdx >= 0 ? app.data.assignments[existingIdx].number : (app.data.assignments.length + 1),
      title: document.getElementById('new-asg-title').value,
      className: document.getElementById('new-asg-class').value,
      semester: document.getElementById('new-asg-sem').value,
      assessmentType: 'Direct',
      modulesCovered: document.getElementById('new-asg-module').value,
      outcomeCovered: document.getElementById('new-asg-co').value,
      publishDate: document.getElementById('new-asg-pub').value,
      deadline: document.getElementById('new-asg-dead').value,
      rubricPresetId: document.getElementById('new-asg-rub').value,
      createdAt: new Date().toISOString().split('T')[0],
      schedules: (existingIdx >= 0 && app.data.assignments[existingIdx].schedules && app.data.assignments[existingIdx].schedules.length > 0)
        ? app.data.assignments[existingIdx].schedules
        : [
            {
              id: 'sch-' + cleanId,
              scopeType: 'batch',
              scopeValue: 'All Students',
              publishDate: document.getElementById('new-asg-pub').value,
              deadline: document.getElementById('new-asg-dead').value,
              submissionsOpen: true,
              gradesReleased: true,
              latePenaltyValue: 10,
              lateMaxCap: 30
            }
          ],
      questions: existingQuestions
    };

    if (existingIdx >= 0) {
      app.data.assignments[existingIdx] = newAsg;
    } else {
      app.data.assignments.push(newAsg);
    }
    app.saveState();
    app.syncAssignmentToSupabase(newAsg);
    app.closeModal();
    app.showToast(`Saved assignment ${newAsg.code}`, 'success');
    this.renderDashboard(document.getElementById('main-content'));
  },

  openEditAssignmentModal(asgId) {
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) {
      app.showToast('Please select an assignment to edit', 'warning');
      return;
    }

    const subjects = app.data.subjects || [];
    const rubrics = app.data.rubricPresets || [];

    app.showModal('Edit Assignment Details', `
      <form onsubmit="facultyView.saveEditAssignment(event, '${asg.id}')">
        <div class="form-group">
          <label class="form-label">Subject Course</label>
          <select id="edit-asg-subject" class="form-select" required>
            ${subjects.map(s => `
              <option value="${s.id}" ${s.id === asg.subjectId ? 'selected' : ''}>
                ${s.code} — ${s.fullName}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Code Key</label>
          <input type="text" id="edit-asg-code" class="form-input code-font" value="${asg.code || ''}" required readonly style="background:var(--bg-subtle);">
        </div>

        <div class="form-group">
          <label class="form-label">Assignment Title</label>
          <input type="text" id="edit-asg-title" class="form-input" value="${asg.title || ''}" required>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Class Target</label>
            <input type="text" id="edit-asg-class" class="form-input" value="${asg.className || 'FE Mech'}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Semester</label>
            <select id="edit-asg-sem" class="form-select" required>
              <option value="Semester I" ${(asg.semester || '') === 'Semester I' ? 'selected' : ''}>Semester I</option>
              <option value="Semester II" ${(asg.semester || '') === 'Semester II' ? 'selected' : ''}>Semester II</option>
              <option value="Semester III" ${(asg.semester || '') === 'Semester III' ? 'selected' : ''}>Semester III</option>
              <option value="Semester IV" ${(asg.semester || '') === 'Semester IV' ? 'selected' : ''}>Semester IV</option>
              <option value="Semester V" ${(asg.semester || '') === 'Semester V' ? 'selected' : ''}>Semester V</option>
              <option value="Semester VI" ${(asg.semester || '') === 'Semester VI' ? 'selected' : ''}>Semester VI</option>
              <option value="Semester VII" ${(asg.semester || '') === 'Semester VII' ? 'selected' : ''}>Semester VII</option>
              <option value="Semester VIII" ${(asg.semester || '') === 'Semester VIII' ? 'selected' : ''}>Semester VIII</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Modules Covered</label>
            <input type="text" id="edit-asg-module" class="form-input" value="${asg.modulesCovered || 'Module 1-2'}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Outcome Covered (CO)</label>
            <input type="text" id="edit-asg-co" class="form-input" value="${asg.outcomeCovered || 'CO1'}" required>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-group">
            <label class="form-label">Publish Date & Time</label>
            <input type="datetime-local" id="edit-asg-pub" class="form-input" value="${asg.publishDate || '2026-08-01T09:00'}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Submission Deadline</label>
            <input type="datetime-local" id="edit-asg-dead" class="form-input" value="${asg.deadline || '2026-08-10T23:59'}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Attach Rubric Preset</label>
          <select id="edit-asg-rub" class="form-select" required>
            ${rubrics.map(r => `
              <option value="${r.id}" ${r.id === asg.rubricPresetId ? 'selected' : ''}>
                ${r.name || r.title} (${r.maxMarks || 10} Marks)
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Assignment Details</button>
        </div>
      </form>
    `);
  },

  saveEditAssignment(e, asgId) {
    e.preventDefault();
    const asg = (app.data.assignments || []).find(a => a.id === asgId);
    if (!asg) return;

    asg.subjectId = document.getElementById('edit-asg-subject').value;
    asg.title = document.getElementById('edit-asg-title').value;
    asg.className = document.getElementById('edit-asg-class').value;
    asg.semester = document.getElementById('edit-asg-sem').value;
    asg.modulesCovered = document.getElementById('edit-asg-module').value;
    asg.outcomeCovered = document.getElementById('edit-asg-co').value;
    asg.publishDate = document.getElementById('edit-asg-pub').value;
    asg.deadline = document.getElementById('edit-asg-dead').value;
    asg.rubricPresetId = document.getElementById('edit-asg-rub').value;

    app.saveState();
    app.syncAssignmentToSupabase(asg);
    app.closeModal();
    app.showToast(`Updated assignment details for ${asg.code}`, 'success');
    this.renderAssignmentBuilder(document.getElementById('main-content'));
  },

  /* ==========================================================================
     VERIFICATION LAYER & THREE-MODE PIPELINE IMPLEMENTATIONS
     ========================================================================== */

  renderVerificationLayer(container) {
    const assignments = (app.data.assignments || []).filter(a => {
      if (app.currentRole === 'admin') return true;
      return (a.facultyId || '').trim().toLowerCase() === (app.currentUser?.email || '').trim().toLowerCase();
    });

    if (assignments.length === 0) {
      container.innerHTML = `
        <div class="page-header-container">
          <div>
            <h1 class="page-title">Verify Submissions</h1>
            <p class="page-subtitle">Second-person verification layer for student auto-graded submissions</p>
          </div>
        </div>
        <div class="empty-state">
          <div class="empty-state-emoji">🔍</div>
          <div class="empty-state-title">No Assignments Found</div>
          <div class="empty-state-subtitle">Build and publish lab assignments first to verify student submissions.</div>
        </div>
      `;
      return;
    }

    if (!this.activeVerifyAssignmentId) {
      this.activeVerifyAssignmentId = assignments[0].id;
    }

    const asg = assignments.find(a => a.id === this.activeVerifyAssignmentId) || assignments[0];
    const subs = app.data.submissions.filter(s => s.assignmentId === asg.id);

    const totalSubs = subs.length;
    const verifiedCount = subs.filter(s => s.verificationStatus === 'Verified').length;
    const flaggedCount = subs.filter(s => s.verificationStatus === 'Flagged').length;
    const pendingCount = subs.filter(s => (s.verificationStatus || 'Pending') === 'Pending').length;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Verify Submissions</h1>
          <p class="page-subtitle">Audit trail & manual verification for auto-graded student marks</p>
        </div>
        <div style="display:flex; gap:10px;">
          ${app.currentRole === 'admin' ? `
            <button class="btn btn-primary btn-sm" onclick="facultyView.verifyAllForAssignment('${asg.id}')">
              ✅ Override & Verify All (${subs.length})
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Assignment Selector & Stats Bar -->
      <div class="card" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div class="filter-group" style="min-width:280px;">
            <label>Select Assignment to Verify</label>
            <select class="form-select" onchange="facultyView.activeVerifyAssignmentId = this.value; facultyView.renderVerificationLayer(document.getElementById('main-content'));">
              ${assignments.map(a => `<option value="${a.id}" ${a.id === asg.id ? 'selected' : ''}>${a.code}: ${a.title}</option>`).join('')}
            </select>
          </div>

          <div style="display:flex; gap:16px; align-items:center;">
            <div class="roster-status-strip" style="margin-bottom:0;">
              <span>🟢 Verified: <strong class="mono-val" style="color:var(--success);">${verifiedCount}</strong></span>
              <span>🟡 Pending: <strong class="mono-val" style="color:var(--warning);">${pendingCount}</strong></span>
              <span>🔴 Flagged: <strong class="mono-val" style="color:var(--danger);">${flaggedCount}</strong></span>
              <span>Total: <strong class="mono-val">${totalSubs}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Submissions Verification Table -->
      <div class="card">
        ${subs.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-emoji">📥</div>
            <div class="empty-state-title">No Submissions Found for ${asg.code}</div>
            <div class="empty-state-subtitle">Once students submit or faculty uploads retroactive solution keys, submissions will appear here for verification.</div>
          </div>
        ` : `
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th class="sortable">Student UIN</th>
                  <th>Student Name</th>
                  <th>Param ID</th>
                  <th>Submitted Value</th>
                  <th>Ground Truth</th>
                  <th>Marks Awarded</th>
                  <th>Status</th>
                  <th>Verified By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${subs.map(s => {
                  const student = app.data.students.find(st => st.id === s.studentId);
                  const ans = app.data.studentAnswers.find(a => a.studentId === s.studentId && a.parameterId === s.parameterId);
                  const status = s.verificationStatus || 'Pending';
                  
                  return `
                    <tr>
                      <td class="mono-val">${student ? student.uin : s.studentId}</td>
                      <td style="font-weight:500;">${student ? student.name : 'Student'}</td>
                      <td class="mono-val" style="font-size:12px;">${s.parameterId}</td>
                      <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${s.submittedValue} ${s.submittedUnit || ''}</td>
                      <td class="mono-val" style="color:var(--text-secondary);">${ans ? ans.correctValue : '-'} ${ans ? (ans.correctUnit || '') : ''}</td>
                      <td class="mono-val" style="font-weight:800; color:var(--success);">${s.marksAwarded}</td>
                      <td>
                        <span class="col-pill ${status === 'Verified' ? 'pill-verified' : status === 'Flagged' ? 'pill-flagged' : 'pill-pending'}">
                          ${status}
                        </span>
                      </td>
                      <td style="font-size:11px; color:var(--text-secondary);">${s.verifiedBy || '-'}</td>
                      <td style="display:flex; gap:4px;">
                        <button class="btn ${status === 'Verified' ? 'btn-secondary' : 'btn-primary'} btn-sm" style="padding:2px 8px; font-size:11px;" onclick="facultyView.toggleSubmissionVerification('${s.id}', 'Verified')">
                          ${status === 'Verified' ? 'Unverify' : '✓ Verify'}
                        </button>
                        <button class="btn btn-destructive btn-sm" style="padding:2px 6px; font-size:11px;" onclick="facultyView.toggleSubmissionVerification('${s.id}', 'Flagged')">
                          🚩 Flag
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  async toggleSubmissionVerification(subId, newStatus) {
    const sub = app.data.submissions.find(s => s.id === subId);
    if (!sub) return;

    if (sub.verificationStatus === newStatus && newStatus === 'Verified') {
      sub.verificationStatus = 'Pending';
      sub.verifiedBy = null;
      sub.verifiedAt = null;
    } else {
      sub.verificationStatus = newStatus;
      sub.verifiedBy = app.currentUser ? app.currentUser.email : 'faculty';
      sub.verifiedAt = new Date().toISOString();
    }

    app.saveState();
    await app.syncSubmissionToSupabase(sub);
    app.writeAudit('verified', 'submission', sub.id, { status: sub.verificationStatus });

    const asgSubs = app.data.submissions.filter(s => s.assignmentId === sub.assignmentId);
    if (asgSubs.length > 0 && asgSubs.every(s => s.verificationStatus === 'Verified')) {
      const asg = app.data.assignments.find(a => a.id === sub.assignmentId);
      if (asg && asg.schedules) {
        asg.schedules.forEach(sch => sch.gradesReleased = true);
        await app.syncAssignmentToSupabase(asg);
        app.showToast(`All submissions verified! Grades released to students for ${asg.code}.`, 'success');
      }
    }

    this.renderVerificationLayer(document.getElementById('main-content'));
  },

  async verifyAllForAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    app.showSpinner('Verifying all submissions...');
    const subs = app.data.submissions.filter(s => s.assignmentId === asg.id);
    for (const sub of subs) {
      sub.verificationStatus = 'Verified';
      sub.verifiedBy = app.currentUser ? app.currentUser.email : 'admin';
      sub.verifiedAt = new Date().toISOString();
      await app.syncSubmissionToSupabase(sub);
    }

    if (asg.schedules) {
      asg.schedules.forEach(sch => sch.gradesReleased = true);
      await app.syncAssignmentToSupabase(asg);
    }

    app.saveState();
    app.hideSpinner();
    app.writeAudit('verify_all', 'assignment', asg.id, { totalVerified: subs.length });
    app.showToast(`Successfully verified all ${subs.length} submissions and released grades!`, 'success');
    this.renderVerificationLayer(document.getElementById('main-content'));
  },

  async lockAssignment(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    if (!asg.questions || asg.questions.length === 0) {
      app.showToast('Cannot lock assignment: At least 1 question must be added', 'warning');
      return;
    }
    if (!asg.schedules || asg.schedules.length === 0) {
      app.showToast('Cannot lock assignment: Schedules must be configured', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to Lock & Finalize ${asg.code}? Locked assignments are strictly Read-Only, close all student submissions, and auto-export the official Gazette Gradebook CSV.`)) return;

    app.showSpinner('Locking assignment and exporting Gazette Gradebook...');

    asg.state = 'Locked';
    asg.schedules.forEach(s => {
      s.submissionsOpen = false;
      s.gradesReleased = true;
    });

    await app.syncAssignmentToSupabase(asg);
    app.saveState();
    app.writeAudit('locked', 'assignment', asg.id, { title: asg.title });

    this.exportGazetteGradebookCSV(asg);

    app.hideSpinner();
    app.showToast(`Assignment ${asg.code} is now Locked & Finalized! Gazette CSV downloaded.`, 'success');
    this.renderScheduleManager(document.getElementById('main-content'));
  },

  exportGazetteGradebookCSV(asg) {
    const enrolledStudents = app.sortTable(app.data.students, 'uin', 'asc');
    const allParams = (asg.questions || []).flatMap(q => q.parameters || []);

    let csv = `Official Gazette Gradebook — ${asg.code}: ${asg.title}\n`;
    csv += `UIN,Student Name,Branch,Division,Batch,${allParams.map(p => `"${p.label} (Max ${p.valueMarks})"`).join(',')},Total Marks,Verification Status\n`;

    enrolledStudents.forEach(st => {
      let total = 0;
      const paramMarks = allParams.map(p => {
        const sub = app.data.submissions.find(s => s.studentId === st.id && s.parameterId === p.id);
        const m = sub ? sub.marksAwarded : 0;
        total += m;
        return m;
      });

      const stSubs = app.data.submissions.filter(s => s.studentId === st.id && s.assignmentId === asg.id);
      const isVerified = stSubs.length > 0 && stSubs.every(s => s.verificationStatus === 'Verified');

      csv += `"${st.uin}","${st.name}","${st.branch}","${st.division}","${st.batch}",${paramMarks.join(',')},${total.toFixed(2)},"${isVerified ? 'VERIFIED' : 'PENDING'}"\n`;
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Gazette_Gradebook_${asg.code}_Finalized.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async saveAssignmentAsTemplate(asgId) {
    const asg = app.data.assignments.find(a => a.id === asgId);
    if (!asg) return;

    const tmplId = `tmpl-${Date.now()}`;
    const templateObj = {
      id: tmplId,
      code: asg.code,
      title: asg.title,
      subjectCode: asg.subjectId,
      questions: asg.questions || [],
      rubricPresetId: asg.rubricPresetId,
      createdBy: app.currentUser ? app.currentUser.email : 'faculty',
      createdAt: new Date().toISOString()
    };

    if (!app.data.assignmentTemplates) app.data.assignmentTemplates = [];
    app.data.assignmentTemplates.push(templateObj);
    app.saveState();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('assignment_templates').upsert({
          id: templateObj.id,
          code: templateObj.code,
          title: templateObj.title,
          subject_code: templateObj.subjectCode,
          questions: templateObj.questions,
          rubric_preset_id: templateObj.rubricPresetId,
          created_by: templateObj.createdBy,
          created_at: templateObj.createdAt
        });
      } catch(e) { console.warn('Template save notice:', e); }
    }

    app.writeAudit('created_template', 'assignment_template', tmplId, { title: templateObj.title });
    app.showToast(`Saved ${asg.code} as a reusable assignment template!`, 'success');
  }
};

