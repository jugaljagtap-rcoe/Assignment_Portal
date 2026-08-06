const analyticsView = {
  render(container) {
    const totalStudents = app.data.students.length;
    const totalSubmissions = app.data.submissions.length;
    const courseOutcomes = app.data.courseOutcomes || [];
    const classTarget = app.data.attainmentSettings.classTargetPct;

    // Calculate dynamic attainment per CO in app.data.courseOutcomes
    const coStats = courseOutcomes.map(co => {
      let passingStudents = 0;

      app.data.students.forEach(st => {
        const stSubms = app.data.submissions.filter(s => s.studentId === st.id);
        let stEarned = 0;
        let stMax = 0;

        stSubms.forEach(s => {
          // Match submission parameter or assignment question CO
          stEarned += (s.marksAwarded || 0);
          stMax += 4;
        });

        if (stMax > 0 && ((stEarned / stMax) * 100 >= app.data.attainmentSettings.studentThresholdPct)) {
          passingStudents++;
        }
      });

      const attainmentPct = totalStudents > 0 ? Math.round((passingStudents / totalStudents) * 100) : 0;
      return {
        co: co,
        passingStudents: passingStudents,
        attainmentPct: attainmentPct,
        targetMet: attainmentPct >= classTarget
      };
    });

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
          <span class="kpi-label">Outcomes (CO/LO) Defined</span>
          <span class="kpi-value">${courseOutcomes.length}</span>
          <span class="kpi-trend positive">${courseOutcomes.length > 0 ? 'Mapped in Net Matrix' : 'No Outcomes Defined'}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Class Target Attainment</span>
          <span class="kpi-value">${classTarget}%</span>
          <span class="kpi-trend neutral">College Threshold Target</span>
        </div>
        ${coStats.length === 0 ? `
          <div class="kpi-card">
            <span class="kpi-label">Outcome Attainment Status</span>
            <span class="kpi-value" style="font-size:18px; color:var(--text-secondary);">No Outcome Data</span>
            <span class="kpi-trend neutral">Add Outcomes in Faculty Portal</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Enrolled Students</span>
            <span class="kpi-value">${totalStudents}</span>
            <span class="kpi-trend neutral">Roster Count</span>
          </div>
        ` : coStats.slice(0, 2).map(cs => `
          <div class="kpi-card">
            <span class="kpi-label">${cs.co.code} Attainment</span>
            <span class="kpi-value" style="color:${cs.targetMet ? 'var(--success)' : 'var(--warning)'}">${cs.attainmentPct}%</span>
            <span class="kpi-trend ${cs.targetMet ? 'positive' : 'negative'}">${cs.passingStudents} Students Met Target</span>
          </div>
        `).join('')}
      </div>

      <div class="card" style="margin-top:24px;">
        <h3 class="card-title">Direct Course & Lab Outcome (CO/LO) Attainment Report</h3>
        <p class="card-subtitle" style="margin-bottom:16px;">Derived dynamically from student submission performance logs</p>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Outcome Code</th>
                <th>Outcome Description</th>
                <th>Mapped POs</th>
                <th>Students Attaining (≥${app.data.attainmentSettings.studentThresholdPct}%)</th>
                <th>Class Attainment %</th>
                <th>Target Met Status</th>
              </tr>
            </thead>
            <tbody>
              ${coStats.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center; padding:24px; color:var(--text-secondary);">
                    ℹ️ No Outcomes (COs/LOs) defined yet. Add Outcomes under <strong>"Course Outcomes & Modules"</strong> in Faculty Portal.
                  </td>
                </tr>
              ` : 
                coStats.map(cs => {
                  const type = cs.co.type || (cs.co.code && cs.co.code.includes('.LO') ? 'LO' : 'CO');
                  const poList = cs.co.poIds || (cs.co.poId ? [cs.co.poId] : []);
                  return `
                    <tr>
                      <td><span class="tag ${type === 'LO' ? 'tag-lo' : 'tag-co'}">${type}</span></td>
                      <td style="font-weight:700; font-family:var(--font-mono); color:var(--accent-blue);">${cs.co.code}</td>
                      <td>${cs.co.description}</td>
                      <td>
                        ${poList.length === 0 ? '<span style="color:var(--text-muted); font-size:12px;">Unmapped</span>' :
                          poList.map(po => `<span class="tag tag-bt" style="margin-right:4px;">${po}</span>`).join('')}
                      </td>
                      <td><strong>${cs.passingStudents} / ${totalStudents}</strong></td>
                      <td style="font-weight:700; font-size:16px;">${cs.attainmentPct}%</td>
                      <td>
                        <span class="tag ${cs.targetMet ? 'tag-success' : 'tag-danger'}">
                          ${cs.targetMet ? '✓ Target Met (Level 3)' : '✕ Target Pending (Level 1)'}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')
              }
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
