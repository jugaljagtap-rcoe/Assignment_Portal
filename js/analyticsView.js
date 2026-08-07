const analyticsView = {
  render(container) {
    const isAdminViewing = app.currentRole === 'admin';
    const totalStudents = app.data.students.length;
    const totalSubmissions = app.data.submissions.length;
    const courseOutcomes = app.data.courseOutcomes || [];
    const classTarget = app.data.attainmentSettings.classTargetPct;

    // Build a lookup: paramId → { question, assignment } for all assignments
    const paramMap = {};
    app.data.assignments.forEach(asg => {
      (asg.questions || []).forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = {
            coId: q.coId,
            assignmentId: asg.id,
            valueMarks: p.valueMarks || 4,
            questionId: q.id
          };
        });
      });
    });

    const coStats = courseOutcomes.map(co => {
      // Step 1: Find all paramIds whose question is tagged with this CO
      const relevantParamIds = Object.keys(paramMap).filter(
        pid => paramMap[pid].coId === co.code
      );

      // Step 2: Max possible marks for this CO
      const maxMarksForCO = relevantParamIds.reduce(
        (sum, pid) => sum + (paramMap[pid].valueMarks || 4), 0
      );

      let passingStudents = 0;
      const studentBreakdown = [];

      app.data.students.forEach(st => {
        if (maxMarksForCO === 0) {
          // No questions mapped to this CO yet
          studentBreakdown.push({
            student: st,
            earned: 0,
            max: 0,
            pct: 0,
            attained: false
          });
          return;
        }

        // Step 3: For each relevant param, get best attempt marks for this student
        let earnedMarksForCO = 0;
        relevantParamIds.forEach(pid => {
          const attemptsForParam = app.data.submissions.filter(
            s => s.studentId === st.id && s.parameterId === pid
          );
          if (attemptsForParam.length === 0) return;
          const bestAttempt = attemptsForParam.reduce((best, s) =>
            (s.marksAwarded || 0) > (best.marksAwarded || 0) ? s : best
          , attemptsForParam[0]);
          earnedMarksForCO += (bestAttempt.marksAwarded || 0);
        });

        const studentPct = Math.round((earnedMarksForCO / maxMarksForCO) * 100);
        const attained = studentPct >= app.data.attainmentSettings.studentThresholdPct;
        if (attained) passingStudents++;

        studentBreakdown.push({
          student: st,
          earned: earnedMarksForCO,
          max: maxMarksForCO,
          pct: studentPct,
          attained: attained
        });
      });

      const attainmentPct = totalStudents > 0
        ? Math.round((passingStudents / totalStudents) * 100)
        : 0;

      return {
        co: co,
        passingStudents: passingStudents,
        attainmentPct: attainmentPct,
        targetMet: attainmentPct >= classTarget,
        maxMarksForCO: maxMarksForCO,
        relevantParamCount: relevantParamIds.length,
        studentBreakdown: studentBreakdown
      };
    });

    container.innerHTML = `
      ${isAdminViewing ? `
        <div class="card" style="margin-bottom:16px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2); padding:12px 20px;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:13px; color:var(--accent-blue);">
              <strong>Admin View:</strong> Showing college-wide CO/PO attainment across all departments, 
              all faculty assignments, and all enrolled students.
            </div>
            <button class="btn btn-ghost btn-sm" onclick="app.switchNav('dashboard')" 
              style="color:var(--accent-blue); font-size:12px;">
              ← Back to Admin Dashboard
            </button>
          </div>
        </div>
      ` : ''}

      <div class="page-header-container" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">NBA CO/PO Accreditation & Class Gradebook</h1>
          <p class="page-subtitle">Real-Time Course Outcome Attainment & Consolidated Student Gradesheet Roster</p>
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
              📥 Full NBA Report CSV
            </button>
          ` : ''}
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
                <th>Questions Mapped</th>
                <th>Max Marks (CO)</th>
                <th>Students Attaining (≥${app.data.attainmentSettings.studentThresholdPct}%)</th>
                <th>Class Attainment %</th>
                <th>Target Met Status</th>
              </tr>
            </thead>
            <tbody>
              ${coStats.length === 0 ? `
                <tr>
                  <td colspan="9" style="text-align:center; padding:24px; color:var(--text-secondary);">
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
                      <td style="font-weight:600; font-family:var(--font-mono);">
                        ${cs.relevantParamCount > 0 
                          ? `${cs.relevantParamCount} param${cs.relevantParamCount !== 1 ? 's' : ''}` 
                          : '<span style="color:var(--text-secondary); font-size:12px;">No questions mapped</span>'}
                      </td>
                      <td style="font-weight:600; font-family:var(--font-mono);">
                        ${cs.maxMarksForCO > 0 
                          ? `${cs.maxMarksForCO} marks` 
                          : '<span style="color:var(--text-secondary); font-size:12px;">—</span>'}
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

      <!-- Per-Student CO Attainment Drill-Down -->
      <div class="card" style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 class="card-title">Per-Student CO Attainment Drill-Down</h3>
            <p class="card-subtitle">Individual attainment status per student per Course Outcome — required for NBA documentation</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="analyticsView.exportCOAttainmentCSV()">
            📥 Export CO Attainment Report (CSV)
          </button>
        </div>

        ${coStats.length === 0 ? `
          <p style="color:var(--text-secondary); font-size:13px;">No outcomes defined yet.</p>
        ` : coStats.map(cs => `
          <div style="margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
              <span class="tag ${cs.co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${cs.co.type || 'CO'}</span>
              <strong style="font-family:var(--font-mono); color:var(--accent-blue);">${cs.co.code}</strong>
              <span style="font-size:13px; color:var(--text-secondary);">${cs.co.description}</span>
              <span class="tag ${cs.targetMet ? 'tag-success' : 'tag-danger'}" style="margin-left:auto;">
                ${cs.attainmentPct}% Class Attainment — ${cs.targetMet ? '✓ Target Met' : '✕ Target Not Met'}
              </span>
            </div>

            ${cs.maxMarksForCO === 0 ? `
              <div style="background:var(--warning-subtle); border:1px solid var(--warning); border-radius:var(--radius-md); padding:10px 14px; font-size:12px; color:var(--warning);">
                ⚠️ No assignment questions are currently tagged with <strong>${cs.co.code}</strong>. 
                Tag questions with this CO in the Assignment Builder to see attainment data.
              </div>
            ` : `
              <div class="table-container">
                <table class="custom-table" style="font-size:12px;">
                  <thead>
                    <tr>
                      <th>UIN</th>
                      <th>Student Name</th>
                      <th>Branch</th>
                      <th>Batch</th>
                      <th>Marks Earned (CO)</th>
                      <th>Max Possible</th>
                      <th>Score %</th>
                      <th>CO Attainment</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cs.studentBreakdown.length === 0 
                      ? `<tr><td colspan="8" style="text-align:center; padding:16px; color:var(--text-secondary);">No students enrolled.</td></tr>`
                      : cs.studentBreakdown.map(sb => `
                        <tr>
                          <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">${sb.student.uin}</td>
                          <td style="font-weight:600;">${sb.student.name}</td>
                          <td style="font-size:11px;">${sb.student.branch}</td>
                          <td><span class="tag tag-bt">${sb.student.batch || 'A1'}</span></td>
                          <td style="font-weight:700; font-family:var(--font-mono);">${sb.earned}</td>
                          <td style="font-family:var(--font-mono);">${sb.max}</td>
                          <td style="font-weight:700; color:${sb.attained ? 'var(--success)' : 'var(--danger)'};">${sb.pct}%</td>
                          <td>
                            <span class="tag ${sb.attained ? 'tag-success' : 'tag-danger'}">
                              ${sb.attained ? '✓ Attained' : '✕ Not Attained'}
                            </span>
                          </td>
                        </tr>
                      `).join('')
                    }
                  </tbody>
                </table>
              </div>
            `}
          </div>
        `).join('')}
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
                  const maxMarks = stSubms.length > 0
                    ? [...new Set(stSubms.map(s => s.parameterId))].length * 4
                    : 10;
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

      <!-- Branch-wise Submission & Performance Breakdown -->
      <div class="card" style="margin-top:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 class="card-title">Branch-wise Submission & Performance Summary</h3>
            <p class="card-subtitle">Aggregated performance metrics per engineering branch</p>
          </div>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Engineering Branch</th>
                <th>Enrolled Students</th>
                <th>Students Submitted</th>
                <th>Submission Rate</th>
                <th>Avg Marks Earned</th>
                <th>Performance Band</th>
              </tr>
            </thead>
            <tbody>
              ${HARDCODED_BRANCHES.map(branch => {
                const branchStudents = app.data.students.filter(s => s.branch === branch);
                const branchStudentIds = branchStudents.map(s => s.id);
                const branchSubmissions = app.data.submissions.filter(s => branchStudentIds.includes(s.studentId));
                const studentsWhoSubmitted = new Set(branchSubmissions.map(s => s.studentId)).size;
                const branchRate = branchStudents.length > 0 
                  ? Math.round((studentsWhoSubmitted / branchStudents.length) * 100) 
                  : 0;

                let totalMarks = 0;
                branchStudents.forEach(st => {
                  const stSubms = branchSubmissions.filter(s => s.studentId === st.id);
                  const paramIds = [...new Set(stSubms.map(s => s.parameterId))];
                  paramIds.forEach(pid => {
                    const best = stSubms
                      .filter(s => s.parameterId === pid)
                      .reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b, 
                        stSubms.find(s => s.parameterId === pid));
                    totalMarks += best ? (best.marksAwarded || 0) : 0;
                  });
                });

                const avgMarks = studentsWhoSubmitted > 0 
                  ? (totalMarks / studentsWhoSubmitted).toFixed(1) 
                  : '—';

                const band = branchRate >= 80 ? 'Excellent' 
                  : branchRate >= 60 ? 'Satisfactory' 
                  : branchRate >= 30 ? 'Needs Attention' 
                  : branchStudents.length === 0 ? 'No Students' 
                  : 'Critical';

                const bandTag = branchRate >= 80 ? 'tag-success' 
                  : branchRate >= 60 ? 'tag-co' 
                  : branchRate >= 30 ? 'tag-warning' 
                  : 'tag-danger';

                return `
                  <tr>
                    <td style="font-weight:600;">${branch}</td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${branchStudents.length}</td>
                    <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">${studentsWhoSubmitted}</td>
                    <td>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; background:var(--bg-subtle); border-radius:var(--radius-pill); height:6px; min-width:60px;">
                          <div style="width:${branchRate}%; background:${branchRate >= 70 ? 'var(--success)' : branchRate >= 40 ? 'var(--warning)' : 'var(--danger)'}; height:6px; border-radius:var(--radius-pill);"></div>
                        </div>
                        <span style="font-weight:700; font-family:var(--font-mono); font-size:13px;">${branchRate}%</span>
                      </div>
                    </td>
                    <td style="font-family:var(--font-mono); font-weight:700;">${avgMarks}</td>
                    <td><span class="tag ${bandTag}">${band}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  exportInstitutionalReportCSV() {
    if (app.data.students.length === 0) {
      app.showToast('No student data to export', 'warning');
      return;
    }

    // Build paramMap
    const paramMap = {};
    app.data.assignments.forEach(asg => {
      (asg.questions || []).forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = { coId: q.coId, valueMarks: p.valueMarks || 4 };
        });
      });
    });

    const courseOutcomes = app.data.courseOutcomes || [];

    let csvContent = "data:text/csv;charset=utf-8,";

    // Header
    const coHeaders = courseOutcomes.map(co => `"${co.code} Attained"`).join(',');
    csvContent += `Student UIN,Student Name,Branch,Division,Batch,Total Submissions,Total Marks Earned,Overall %,${coHeaders}\n`;

    app.data.students.forEach(st => {
      const stSubms = app.data.submissions.filter(s => s.studentId === st.id);

      // Total marks via best attempt per parameter
      const paramIds = [...new Set(stSubms.map(s => s.parameterId))];
      let totalMarks = 0;
      paramIds.forEach(pid => {
        const best = stSubms
          .filter(s => s.parameterId === pid)
          .reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b,
            stSubms.find(s => s.parameterId === pid));
        totalMarks += best ? (best.marksAwarded || 0) : 0;
      });

      // Max marks
      let maxMarks = 0;
      paramIds.forEach(pid => { maxMarks += paramMap[pid] ? paramMap[pid].valueMarks : 4; });
      const overallPct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

      // Per-CO attainment
      const coAttainments = courseOutcomes.map(co => {
        const relevantPids = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
        const maxForCO = relevantPids.reduce((sum, pid) => sum + (paramMap[pid].valueMarks || 4), 0);
        let earnedForCO = 0;
        relevantPids.forEach(pid => {
          const attempts = stSubms.filter(s => s.parameterId === pid);
          if (attempts.length === 0) return;
          const best = attempts.reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b, attempts[0]);
          earnedForCO += (best.marksAwarded || 0);
        });
        const pct = maxForCO > 0 ? Math.round((earnedForCO / maxForCO) * 100) : 0;
        return pct >= app.data.attainmentSettings.studentThresholdPct ? 'Yes' : 'No';
      });

      csvContent += `"${st.uin}","${st.name}","${st.branch}","${st.division || 'A'}","${st.batch || 'A1'}",${stSubms.length},${totalMarks},${overallPct}%,${coAttainments.join(',')}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Institutional_NBA_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported Institutional NBA Report for ${app.data.students.length} students × ${courseOutcomes.length} outcomes`, 'success');
  },

  exportCOAttainmentCSV() {
    if (!app.data.courseOutcomes || app.data.courseOutcomes.length === 0) {
      app.showToast('No course outcomes defined to export', 'warning');
      return;
    }

    // Rebuild paramMap and coStats inline for export
    const paramMap = {};
    app.data.assignments.forEach(asg => {
      (asg.questions || []).forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = {
            coId: q.coId,
            valueMarks: p.valueMarks || 4
          };
        });
      });
    });

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "CO Code,CO Type,CO Description,Student UIN,Student Name,Branch,Division,Batch,Marks Earned (CO),Max Possible Marks (CO),Score %,CO Attained\n";

    app.data.courseOutcomes.forEach(co => {
      const relevantParamIds = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
      const maxMarksForCO = relevantParamIds.reduce((sum, pid) => sum + (paramMap[pid].valueMarks || 4), 0);
      const type = co.type || 'CO';

      app.data.students.forEach(st => {
        let earned = 0;
        relevantParamIds.forEach(pid => {
          const attempts = app.data.submissions.filter(s => s.studentId === st.id && s.parameterId === pid);
          if (attempts.length === 0) return;
          const best = attempts.reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b, attempts[0]);
          earned += (best.marksAwarded || 0);
        });

        const pct = maxMarksForCO > 0 ? Math.round((earned / maxMarksForCO) * 100) : 0;
        const attained = maxMarksForCO > 0 && pct >= app.data.attainmentSettings.studentThresholdPct ? "Yes" : "No";

        csvContent += `"${co.code}","${type}","${co.description}","${st.uin}","${st.name}","${st.branch}","${st.division || 'A'}","${st.batch || 'A1'}",${earned},${maxMarksForCO},${pct}%,${attained}\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CO_Attainment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast(`Exported CO Attainment Report for ${app.data.courseOutcomes.length} outcomes × ${app.data.students.length} students`, 'success');
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
      const maxMarks = stSubms.length > 0
        ? [...new Set(stSubms.map(s => s.parameterId))].length * 4
        : 10;
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
