/* ==========================================================================
   Rizvi College of Engineering - Operational Analytics & Reports Module
   ========================================================================== */

const analyticsView = {
  activeReportType: 'reportA',
  activeTab: 'attainment',

  render(container) {
    if (this.activeTab === 'reports') {
      this.renderReportsTab(container);
      return;
    }

    const isAdminViewing = app.currentRole === 'admin';
    const totalStudents = app.data.students.length;

    // Use rolled-up assignmentSubmissions where possible for student-based completion
    const asgSubs = app.data.assignmentSubmissions || [];
    const submittedCount = asgSubs.filter(s => s.status === 'submitted' || s.status === 'late').length;
    const partialCount = asgSubs.filter(s => s.status === 'partial').length;
    const notStartedCount = asgSubs.filter(s => s.status === 'not_started').length;

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">Operational Reports & Class Gradebook</h1>
          <p class="page-subtitle">Real-Time Submission Rates, Master Gradebook Roster, & Custom Export Reports</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="analyticsView.exportMasterClassGradebookCSV()">
            📥 Master Gradebook CSV
          </button>
          <button class="btn btn-secondary" onclick="analyticsView.exportCOAttainmentCSV()">
            📥 CO Attainment CSV
          </button>
          ${isAdminViewing ? `
            <button class="btn btn-primary" onclick="analyticsView.exportInstitutionalReportCSV()">
              📥 Full Institutional Report CSV
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Sub-Nav Switcher for Operational Analytics vs Drill-Down Reports -->
      <div class="segmented-control print-hide" style="margin-bottom:20px;">
        <button class="segmented-btn ${this.activeTab !== 'reports' ? 'active' : ''}" onclick="analyticsView.activeTab = 'attainment'; analyticsView.render(document.getElementById('main-content'));">
          📊 Operational Gradebook & Submission Rates
        </button>
        <button class="segmented-btn ${this.activeTab === 'reports' ? 'active' : ''}" onclick="analyticsView.activeTab = 'reports'; analyticsView.renderReportsTab(document.getElementById('main-content'));">
          📋 Drill-Down Reports (Reports A - E)
        </button>
      </div>

      <!-- Operational KPI Scorecards (Student Counts, Not Parameter Counts) -->
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <span class="kpi-label">Total FE Roster</span>
          <span class="kpi-value">${totalStudents}</span>
          <span class="kpi-trend positive">Across ${HARDCODED_BRANCHES.length} Branches</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Fully Submitted Students</span>
          <span class="kpi-value" style="color:var(--success);">${submittedCount}</span>
          <span class="kpi-trend positive">Rolled-Up Completion Roster</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">In Progress (Partial)</span>
          <span class="kpi-value" style="color:var(--warning);">${partialCount}</span>
          <span class="kpi-trend neutral">Attempting Parameters</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Not Started</span>
          <span class="kpi-value" style="color:var(--text-tertiary);">${notStartedCount}</span>
          <span class="kpi-trend neutral">Awaiting Attempt</span>
        </div>
      </div>

      <!-- Master Class Gradebook Table -->
      <div class="card">
        <div class="card-header" style="margin-bottom:16px;">
          <div>
            <h2 class="card-title">Master Class Gradebook Roster</h2>
            <p class="card-subtitle">Consolidated student evaluation record across all published lab assignments</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="analyticsView.exportMasterClassGradebookCSV()">Export Gradebook CSV</button>
        </div>

        ${totalStudents === 0 ? `
          <div class="empty-state">
            <div class="empty-state-emoji">🎓</div>
            <div class="empty-state-title">No Students Enrolled</div>
            <div class="empty-state-subtitle">Enroll students in the Student Master roster to see gradebook data.</div>
          </div>
        ` : `
          <div class="table-container" style="max-height:500px; overflow-y:auto;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th class="sortable" onclick="app._sortTable(app.data.students, 'uin')">UIN</th>
                  <th class="sortable" onclick="app._sortTable(app.data.students, 'name')">Student Name</th>
                  <th>Branch</th>
                  <th>Division / Batch</th>
                  <th>Assignments Submitted</th>
                  <th>Total Marks Earned</th>
                  <th>Evaluation Status</th>
                </tr>
              </thead>
              <tbody>
                ${app.data.students.map(st => {
                  const studentSubs = (app.data.assignmentSubmissions || []).filter(as => as.studentId === st.id);
                  const completedCount = studentSubs.filter(as => as.status === 'submitted' || as.status === 'late').length;
                  let totalMarks = 0;
                  studentSubs.forEach(as => totalMarks += (as.total_marks_awarded || 0));

                  const status = completedCount === 0 ? 'Not Started' : completedCount === (app.data.assignments || []).length ? 'Fully Completed' : 'In Progress';

                  return `
                    <tr>
                      <td class="mono-val" style="font-weight:700;">${st.uin}</td>
                      <td style="font-weight:600;">${st.name}</td>
                      <td><span class="tag tag-co">${st.branch}</span></td>
                      <td><span class="tag tag-bt">Div ${st.division} · ${st.batch}</span></td>
                      <td class="mono-val" style="font-weight:700;">${completedCount} / ${(app.data.assignments || []).length}</td>
                      <td class="mono-val" style="font-weight:800; color:var(--accent-blue);">${totalMarks.toFixed(1)}</td>
                      <td>
                        <span class="col-pill ${completedCount > 0 ? 'pill-verified' : 'pill-draft'}">
                          ${status}
                        </span>
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

  renderReportsTab(container) {
    if (!this.activeReportType) this.activeReportType = 'reportA';

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Institutional Drill-Down Reports</h1>
          <p class="page-subtitle">Generate & Export Custom Academic Reports A through E for Audit & Accreditation</p>
        </div>
        <button class="btn btn-primary" onclick="analyticsView.exportCurrentReportCSV()">
          📥 Export Active Report CSV
        </button>
      </div>

      <!-- Sub-Nav Switcher -->
      <div class="segmented-control print-hide" style="margin-bottom:20px;">
        <button class="segmented-btn ${this.activeTab !== 'reports' ? 'active' : ''}" onclick="analyticsView.activeTab = 'attainment'; analyticsView.render(document.getElementById('main-content'));">
          📊 Operational Gradebook & Submission Rates
        </button>
        <button class="segmented-btn ${this.activeTab === 'reports' ? 'active' : ''}" onclick="analyticsView.activeTab = 'reports'; analyticsView.renderReportsTab(document.getElementById('main-content'));">
          📋 Drill-Down Reports (Reports A - E)
        </button>
      </div>

      <!-- Report Type & Filter Strip -->
      <div class="card" style="margin-bottom:20px;">
        <div style="display:grid; grid-template-columns: 2fr 1fr 1fr auto; gap:16px; align-items:flex-end;">
          <div class="filter-group">
            <label>Select Report Type</label>
            <select id="report-type-select" class="form-select" onchange="analyticsView.activeReportType = this.value; analyticsView.renderReportsTab(document.getElementById('main-content'));">
              <option value="reportA" ${this.activeReportType === 'reportA' ? 'selected' : ''}>Report A: Subject Completion Matrix</option>
              <option value="reportB" ${this.activeReportType === 'reportB' ? 'selected' : ''}>Report B: Parameter Accuracy Leaderboard</option>
              <option value="reportC" ${this.activeReportType === 'reportC' ? 'selected' : ''}>Report C: Student Verification Roster</option>
              <option value="reportD" ${this.activeReportType === 'reportD' ? 'selected' : ''}>Report D: CO/PO Attainment Summary</option>
              <option value="reportE" ${this.activeReportType === 'reportE' ? 'selected' : ''}>Report E: System Audit Log Export</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Branch Filter</label>
            <select id="report-branch-filter" class="form-select" onchange="analyticsView.renderReportTable()">
              <option value="">All Branches</option>
              ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>

          <div class="filter-group">
            <label>Academic Year</label>
            <select id="report-ay-filter" class="form-select" onchange="analyticsView.renderReportTable()">
              <option value="2026-27">AY 2026-27</option>
              <option value="2025-26">AY 2025-26</option>
            </select>
          </div>

          <button class="btn btn-secondary" onclick="analyticsView.renderReportTable()">
            ⚡ Run Report
          </button>
        </div>
      </div>

      <!-- Report Output Container -->
      <div class="card" id="report-output-card">
        ${this.buildReportTableHTML()}
      </div>
    `;
  },

  renderReportTable() {
    const card = document.getElementById('report-output-card');
    if (card) card.innerHTML = this.buildReportTableHTML();
  },

  buildReportTableHTML() {
    const branchFilter = document.getElementById('report-branch-filter')?.value || '';

    switch(this.activeReportType) {
      case 'reportA': {
        const subjects = app.data.subjects || [];
        return `
          <h3 class="card-title" style="margin-bottom:12px;">Report A: Subject Completion Matrix</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Department</th>
                  <th>Assignments Published</th>
                  <th>Total Enrolled Students</th>
                  <th>Submissions Completed</th>
                  <th>Student Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                ${subjects.map(s => {
                  const dept = (app.data.departments || []).find(d => d.id === s.departmentId);
                  const asgs = (app.data.assignments || []).filter(a => a.subjectId === s.id);
                  const enrolled = branchFilter ? app.data.students.filter(st => st.branch === branchFilter) : app.data.students;
                  const completedSubs = (app.data.assignmentSubmissions || []).filter(as => asgs.some(a => a.id === as.assignmentId) && (as.status === 'submitted' || as.status === 'late'));
                  const rate = enrolled.length > 0 ? Math.round((completedSubs.length / (enrolled.length * Math.max(1, asgs.length))) * 100) : 0;
                  return `
                    <tr>
                      <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${s.code}</td>
                      <td style="font-weight:600;">${s.fullName || s.name}</td>
                      <td><span class="tag tag-co">${dept ? dept.shortName : 'FE'}</span></td>
                      <td class="mono-val">${asgs.length}</td>
                      <td class="mono-val">${enrolled.length}</td>
                      <td class="mono-val">${completedSubs.length}</td>
                      <td><span class="tag ${rate >= 70 ? 'tag-success' : rate > 0 ? 'tag-warning' : 'tag-bt'}">${rate}%</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      case 'reportB': {
        const allParams = (app.data.assignments || []).flatMap(a => (a.questions || []).flatMap(q => q.parameters || []));
        return `
          <h3 class="card-title" style="margin-bottom:12px;">Report B: Parameter Accuracy Leaderboard</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Parameter ID</th>
                  <th>Parameter Label</th>
                  <th>Value Marks</th>
                  <th>Attempts Logged</th>
                  <th>Average Score</th>
                  <th>Accuracy Rate</th>
                </tr>
              </thead>
              <tbody>
                ${allParams.map(p => {
                  const subs = app.data.submissions.filter(s => s.parameterId === p.id);
                  const totalEarned = subs.reduce((sum, s) => sum + (s.marksAwarded || 0), 0);
                  const avgScore = subs.length > 0 ? (totalEarned / subs.length).toFixed(2) : 0;
                  const correctCount = subs.filter(s => s.isCorrectValue).length;
                  const accuracyRate = subs.length > 0 ? Math.round((correctCount / subs.length) * 100) : 0;
                  return `
                    <tr>
                      <td class="mono-val" style="font-size:12px;">${p.id}</td>
                      <td style="font-weight:600;">${p.label}</td>
                      <td class="mono-val">${p.valueMarks || 4}</td>
                      <td class="mono-val">${subs.length}</td>
                      <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${avgScore}</td>
                      <td><span class="tag ${accuracyRate >= 70 ? 'tag-success' : accuracyRate >= 40 ? 'tag-warning' : 'tag-danger'}">${accuracyRate}%</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      case 'reportC': {
        const enrolled = branchFilter ? app.data.students.filter(st => st.branch === branchFilter) : app.data.students;
        return `
          <h3 class="card-title" style="margin-bottom:12px;">Report C: Student Verification Roster</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>UIN</th>
                  <th>Student Name</th>
                  <th>Branch</th>
                  <th>Batch</th>
                  <th>Submissions Logged</th>
                  <th>Verified Count</th>
                  <th>Flagged Count</th>
                  <th>Verification Status</th>
                </tr>
              </thead>
              <tbody>
                ${enrolled.map(st => {
                  const subs = app.data.submissions.filter(s => s.studentId === st.id);
                  const verified = subs.filter(s => s.verificationStatus === 'Verified').length;
                  const flagged = subs.filter(s => s.verificationStatus === 'Flagged').length;
                  const status = subs.length === 0 ? 'No Attempts' : verified === subs.length ? 'Fully Verified' : flagged > 0 ? 'Flagged' : 'Pending Verification';
                  return `
                    <tr>
                      <td class="mono-val">${st.uin}</td>
                      <td style="font-weight:600;">${st.name}</td>
                      <td><span class="tag tag-co">${st.branch}</span></td>
                      <td><span class="tag tag-bt">Batch ${st.batch}</span></td>
                      <td class="mono-val">${subs.length}</td>
                      <td class="mono-val" style="color:var(--success); font-weight:700;">${verified}</td>
                      <td class="mono-val" style="color:var(--danger); font-weight:700;">${flagged}</td>
                      <td><span class="tag ${verified === subs.length && subs.length > 0 ? 'tag-success' : flagged > 0 ? 'tag-danger' : 'tag-warning'}">${status}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      case 'reportD': {
        const cos = app.data.courseOutcomes || [];
        return `
          <h3 class="card-title" style="margin-bottom:12px;">Report D: CO/PO Attainment Summary</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Outcome Code</th>
                  <th>Type</th>
                  <th>Outcome Description</th>
                  <th>Target Class Attainment %</th>
                  <th>NBA Status</th>
                </tr>
              </thead>
              <tbody>
                ${cos.map(co => `
                  <tr>
                    <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${co.code}</td>
                    <td><span class="tag ${co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${co.type || 'CO'}</span></td>
                    <td style="font-size:13px;">${co.description}</td>
                    <td class="mono-val" style="font-weight:700;">${app.data.attainmentSettings.classTargetPct}%</td>
                    <td><span class="tag tag-success">✓ Active Outcome</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      case 'reportE':
      default: {
        const logs = app.data.auditLogs || [];
        return `
          <h3 class="card-title" style="margin-bottom:12px;">Report E: System Audit Log (${logs.length} entries)</h3>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>User Email</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(l => `
                  <tr>
                    <td><span class="tag ${l.action === 'created' ? 'tag-success' : l.action === 'deleted' ? 'tag-danger' : 'tag-bt'}">${(l.action || 'updated').toUpperCase()}</span></td>
                    <td style="font-weight:600;">${l.entity_type || '-'}</td>
                    <td class="mono-val" style="font-size:12px;">${l.entity_id || '-'}</td>
                    <td style="font-size:12px; color:var(--accent-blue);">${l.changed_by || 'system'}</td>
                    <td class="mono-val" style="font-size:12px; color:var(--text-secondary);">${l.changed_at ? new Date(l.changed_at).toLocaleString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  },

  exportMasterClassGradebookCSV() {
    if (!app.data.students || app.data.students.length === 0) {
      app.showToast('No student data available to export', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student UIN,Student Name,Email,Branch,Division,Batch,Completed Assignments,Total Marks Earned\n";

    app.data.students.forEach(st => {
      const studentSubs = (app.data.assignmentSubmissions || []).filter(as => as.studentId === st.id);
      const completedCount = studentSubs.filter(as => as.status === 'submitted' || as.status === 'late').length;
      let totalMarks = 0;
      studentSubs.forEach(as => totalMarks += (as.total_marks_awarded || 0));

      csvContent += `"${st.uin}","${st.name}","${st.email}","${st.branch}","${st.division || 'A'}","${st.batch || 'A1'}",${completedCount},${totalMarks}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Class_Gradebook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported Master Class Gradebook for ${app.data.students.length} students`, 'success');
  },

  exportCOAttainmentCSV() {
    if (!app.data.courseOutcomes || app.data.courseOutcomes.length === 0) {
      app.showToast('No course outcomes defined to export', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "CO Code,CO Type,CO Description,Target Class Attainment %\n";

    app.data.courseOutcomes.forEach(co => {
      csvContent += `"${co.code}","${co.type || 'CO'}","${co.description}",${app.data.attainmentSettings.classTargetPct}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CO_Attainment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported CO Attainment Report for ${app.data.courseOutcomes.length} outcomes`, 'success');
  },

  exportInstitutionalReportCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Institutional Academic & Accreditation Summary Report\n";
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Total Students Enrolled,${app.data.students.length}\n`;
    csvContent += `Total Faculty Members,${(app.data.faculty || []).length}\n`;
    csvContent += `Total Subjects Defined,${(app.data.subjects || []).length}\n`;
    csvContent += `Total Assignments Published,${(app.data.assignments || []).length}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Institutional_Summary_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported Institutional Summary Report`, 'success');
  },

  exportCurrentReportCSV() {
    const reportType = this.activeReportType || 'reportA';
    app.showToast(`Exporting ${reportType.toUpperCase()} CSV...`, 'info');
    if (reportType === 'reportE') {
      const logs = app.data.auditLogs || [];
      let csv = "Action,Entity Type,Entity ID,Changed By,Timestamp\n";
      logs.forEach(l => {
        csv += `"${l.action}","${l.entity_type}","${l.entity_id}","${l.changed_by}","${l.changed_at}"\n`;
      });
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Audit_Log_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      this.exportCOAttainmentCSV();
    }
  }
};
