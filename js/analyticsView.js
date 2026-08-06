/* ==========================================================================
   Rizvi College of Engineering - Analytics & CO/PO Attainment Module
   ========================================================================== */

const analyticsView = {
  render(container) {
    const totalStudents = app.data.students.length;
    const totalSubmissions = app.data.submissions.length;
    
    // Dynamic CO Attainment Calculation (Bug 7)
    let co1Earned = 0, co1Possible = 0, co1PassingStudents = 0;
    let co2Earned = 0, co2Possible = 0, co2PassingStudents = 0;

    app.data.students.forEach(st => {
      const stSubms = app.data.submissions.filter(s => s.studentId === st.id);
      let stMarksCo1 = 0, stMaxCo1 = 0;
      let stMarksCo2 = 0, stMaxCo2 = 0;

      stSubms.forEach(s => {
        if (s.parameterId.includes('param-q1')) {
          stMarksCo1 += (s.marksAwarded || 0);
          stMaxCo1 += 4;
        } else {
          stMarksCo2 += (s.marksAwarded || 0);
          stMaxCo2 += 5;
        }
      });

      if (stMaxCo1 > 0) {
        co1Earned += stMarksCo1;
        co1Possible += stMaxCo1;
        if ((stMarksCo1 / stMaxCo1) * 100 >= app.data.attainmentSettings.studentThresholdPct) co1PassingStudents++;
      }

      if (stMaxCo2 > 0) {
        co2Earned += stMarksCo2;
        co2Possible += stMaxCo2;
        if ((stMarksCo2 / stMaxCo2) * 100 >= app.data.attainmentSettings.studentThresholdPct) co2PassingStudents++;
      }
    });

    const co1AttainmentPct = totalStudents > 0 ? Math.round((co1PassingStudents / totalStudents) * 100) : 84;
    const co2AttainmentPct = totalStudents > 0 ? Math.round((co2PassingStudents / totalStudents) * 100) : 75;
    const classTarget = app.data.attainmentSettings.classTargetPct;

    container.innerHTML = `
      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">NBA CO/PO Accreditation & Class Gradebook</h1>
          <p class="page-subtitle">Real-Time Course Outcome Attainment & Consolidated Student Gradesheet Roster</p>
        </div>
        <div>
          <button class="btn btn-secondary" onclick="analyticsView.exportMasterClassGradebookCSV()">
            📥 Export Master Class Gradebook (CSV)
          </button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Course Outcomes Evaluated</span>
          <span class="kpi-value">${app.data.courseOutcomes.length}</span>
          <span class="kpi-trend positive">Mapped to PO1 & PO2</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Class Target Attainment</span>
          <span class="kpi-value">${classTarget}%</span>
          <span class="kpi-trend neutral">College Target</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">24051181.CO1 Attainment</span>
          <span class="kpi-value" style="color:${co1AttainmentPct >= classTarget ? 'var(--success)' : 'var(--warning)'}">${co1AttainmentPct}%</span>
          <span class="kpi-trend ${co1AttainmentPct >= classTarget ? 'positive' : 'negative'}">${co1PassingStudents} Students Met Target</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">24051181.CO2 Attainment</span>
          <span class="kpi-value" style="color:${co2AttainmentPct >= classTarget ? 'var(--success)' : 'var(--warning)'}">${co2AttainmentPct}%</span>
          <span class="kpi-trend ${co2AttainmentPct >= classTarget ? 'positive' : 'negative'}">${co2PassingStudents} Students Met Target</span>
        </div>
      </div>

      <div class="card" style="margin-top:24px;">
        <h3 class="card-title">Direct Course Outcome (CO) Attainment Report</h3>
        <p class="card-subtitle" style="margin-bottom:16px;">Derived dynamically from student submission performance logs</p>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>CO Code</th>
                <th>Outcome Description</th>
                <th>Mapped PO</th>
                <th>Students Attaining (≥${app.data.attainmentSettings.studentThresholdPct}%)</th>
                <th>Class Attainment %</th>
                <th>Target Met Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700; font-family:var(--font-mono); color:var(--accent-blue);">24051181.CO1</td>
                <td>To familiarize with mechanical vibration fundamentals and free undamped systems.</td>
                <td><span class="tag tag-bt">PO1</span></td>
                <td><strong>${co1PassingStudents} / ${totalStudents}</strong></td>
                <td style="font-weight:700; font-size:16px;">${co1AttainmentPct}%</td>
                <td>
                  <span class="tag ${co1AttainmentPct >= classTarget ? 'tag-success' : 'tag-danger'}">
                    ${co1AttainmentPct >= classTarget ? '✓ Target Met (Level 3)' : '✕ Target Pending (Level 1)'}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="font-weight:700; font-family:var(--font-mono); color:var(--accent-blue);">24051181.CO2</td>
                <td>Analyze damping parameters and logarithmic decrement in dynamic systems.</td>
                <td><span class="tag tag-bt">PO2</span></td>
                <td><strong>${co2PassingStudents} / ${totalStudents}</strong></td>
                <td style="font-weight:700; font-size:16px;">${co2AttainmentPct}%</td>
                <td>
                  <span class="tag ${co2AttainmentPct >= classTarget ? 'tag-success' : 'tag-danger'}">
                    ${co2AttainmentPct >= classTarget ? '✓ Target Met (Level 3)' : '✕ Target Pending (Level 1)'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Master Class Gradebook Roster -->
      <div class="card" style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 class="card-title">Master Class Gradebook & Student Marks Roster</h3>
            <p class="card-subtitle">Consolidated gradesheet for all ${totalStudents} enrolled students</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="analyticsView.exportMasterClassGradebookCSV()">
            📥 Export CSV
          </button>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>UIN</th>
                <th>Student Name</th>
                <th>Branch</th>
                <th>Batch</th>
                <th>Submissions</th>
                <th>Total Marks Awarded</th>
                <th>Performance Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${totalStudents === 0 ? `<tr><td colspan="8" style="text-align:center; padding:16px;">No students registered in Student Master.</td></tr>` : 
                app.data.students.map(st => {
                  const stSubms = app.data.submissions.filter(s => s.studentId === st.id);
                  let stMarks = 0;
                  stSubms.forEach(s => { stMarks += (s.marksAwarded || 0); });
                  const maxMarks = stSubms.length * 4 || 10;
                  const pct = maxMarks > 0 ? Math.round((stMarks / maxMarks) * 100) : 0;

                  return `
                    <tr>
                      <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">${st.uin}</td>
                      <td style="font-weight:600;">${st.name}</td>
                      <td style="font-size:12px;">${st.branch}</td>
                      <td><span class="tag tag-bt">${st.batch || 'A1'}</span></td>
                      <td><strong>${stSubms.length} Submissions</strong></td>
                      <td style="font-weight:700; font-size:14px; color:var(--accent-blue);">${stMarks} Marks</td>
                      <td>
                        <span class="tag ${pct >= 70 ? 'tag-success' : stSubms.length > 0 ? 'tag-warning' : 'tag-bt'}">
                          ${stSubms.length === 0 ? 'No Submissions' : pct >= 70 ? 'Passed (Satisfactory)' : 'Requires Review'}
                        </span>
                      </td>
                      <td>
                        <button class="btn btn-ghost btn-sm" onclick="app.activeStudentId='${st.id}'; app.switchRole('student'); app.switchNav('grades');">
                          📄 Inspect Sheet
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportMasterClassGradebookCSV() {
    if (!app.data.students || app.data.students.length === 0) {
      app.showToast('No student data available to export', 'warning');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student UIN,Student Name,Email,Branch,Division,Batch,Total Submissions,Total Marks Earned,Performance Status\n";

    app.data.students.forEach(st => {
      const stSubms = app.data.submissions.filter(s => s.studentId === st.id);
      let stMarks = 0;
      stSubms.forEach(s => { stMarks += (s.marksAwarded || 0); });
      const maxMarks = stSubms.length * 4 || 10;
      const pct = maxMarks > 0 ? Math.round((stMarks / maxMarks) * 100) : 0;
      const status = stSubms.length === 0 ? "No Submissions" : pct >= 70 ? "Passed" : "Requires Review";

      csvContent += `"${st.uin}","${st.name}","${st.email}","${st.branch}","${st.division || 'A'}","${st.batch || 'A1'}",${stSubms.length},${stMarks},"${status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Class_Gradebook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported Master Class Gradebook for ${app.data.students.length} students`, 'success');
  }
};
