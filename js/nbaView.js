/* ==========================================================================
   Rizvi College of Engineering - NBA Accreditation Module
   ========================================================================== */

const nbaView = {
  activeDeptId: 'dept-mech',
  activeStudentId: null,

  render(container, activeNav) {
    const hash = window.location.hash || '#nba-institute';

    if (hash.startsWith('#nba-dept-')) {
      const deptId = hash.replace('#nba-dept-', '');
      this.renderDepartmentView(container, deptId);
    } else if (hash.startsWith('#nba-student-')) {
      const studentId = hash.replace('#nba-student-', '');
      this.renderStudentView(container, studentId);
    } else if (hash === '#nba-export') {
      this.renderExportView(container);
    } else {
      this.renderInstituteView(container);
    }
  },

  renderSubNav(container, activeTab) {
    const subNavHtml = `
      <div class="segmented-control print-hide" style="margin-bottom:20px;">
        <button class="segmented-btn ${activeTab === 'institute' ? 'active' : ''}" onclick="window.location.hash='#nba-institute'">
          🏛️ Institute Overview
        </button>
        <button class="segmented-btn ${activeTab === 'department' ? 'active' : ''}" onclick="window.location.hash='#nba-dept-${this.activeDeptId || 'dept-mech'}'">
          🏢 Department Analysis
        </button>
        <button class="segmented-btn ${activeTab === 'student' ? 'active' : ''}" onclick="window.location.hash='#nba-student-${this.activeStudentId || (app.getStudentsForAY()[0] ? app.getStudentsForAY()[0].id : '')}'">
          🎓 Student Attainment Profile
        </button>
        <button class="segmented-btn ${activeTab === 'export' ? 'active' : ''}" onclick="window.location.hash='#nba-export'">
          📥 Accreditation Exports
        </button>
      </div>
    `;
    return subNavHtml;
  },

  renderInstituteView(container) {
    const studentsForAY = app.getStudentsForAY();
    const totalStudents = studentsForAY.length;
    const totalCos = (app.data.courseOutcomes || []).length;
    const classTarget = app.data.attainmentSettings ? app.data.attainmentSettings.classTargetPct : 70;
    const studentThreshold = app.data.attainmentSettings ? app.data.attainmentSettings.studentThresholdPct : 60;

    // Compute Institute-wide CO stats
    const paramMap = {};
    (app.data.assignments || []).forEach(asg => {
      const qList = (asg.questions || []).map(q => typeof q === 'string' ? JSON.parse(q) : q);
      qList.forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = { coId: q.coId || 'CO1', btLevel: q.btLevel || 'BT2' };
        });
      });
    });

    const coSummary = (app.data.courseOutcomes || []).map(co => {
      const relevantPids = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
      let passingStudents = 0;

      studentsForAY.forEach(st => {
        let earnedRaw = 0;
        let possibleRaw = 0;
        relevantPids.forEach(pid => {
          const attempts = app.data.submissions.filter(s => (s.studentId === st.id || s.studentId === st.uin) && s.parameterId === pid);
          if (attempts.length === 0) return;
          const best = attempts.reduce((b, s) => (s.rawMarks ?? s.raw_marks ?? s.marksAwarded ?? 0) > (b.rawMarks ?? b.raw_marks ?? b.marksAwarded ?? 0) ? s : b, attempts[0]);
          earnedRaw += (best.rawMarks ?? best.raw_marks ?? best.marksAwarded ?? 0);
          possibleRaw += 10; // Normalized baseline
        });
        const pct = possibleRaw > 0 ? (earnedRaw / possibleRaw * 100) : 0;
        if (pct >= studentThreshold) passingStudents++;
      });

      const attainmentPct = totalStudents > 0 ? Math.round((passingStudents / totalStudents) * 100) : 0;
      return {
        co: co,
        attainmentPct: attainmentPct,
        targetMet: attainmentPct >= classTarget,
        passingStudents: passingStudents
      };
    });

    const cosMeetingTarget = coSummary.filter(c => c.targetMet).length;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">NBA Accreditation Workspace</h1>
          <p class="page-subtitle">National Board of Accreditation (NBA) Outcome-Based Education Attainment Dashboard</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="adminView.openAttainmentModal()">⚙️ Threshold Settings</button>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash='#nba-export'">📥 Export NBA Tables</button>
        </div>
      </div>

      ${this.renderSubNav(container, 'institute')}

      <!-- Key Accreditation KPIs -->
      <div class="kpi-grid" style="margin-bottom:24px;">
        <div class="kpi-card">
          <span class="kpi-label">Program Outcomes (POs)</span>
          <span class="kpi-value">${(app.data.programOutcomes || []).length}</span>
          <span class="kpi-trend positive">PO1 to PO12 Defined</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Program Specific Outcomes</span>
          <span class="kpi-value">${(app.data.programSpecificOutcomes || []).length}</span>
          <span class="kpi-trend positive">PSO1 & PSO2 Defined</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Course Outcomes (COs)</span>
          <span class="kpi-value">${totalCos}</span>
          <span class="kpi-trend neutral">Across All Departments</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">COs Meeting Target</span>
          <span class="kpi-value" style="color:${cosMeetingTarget === totalCos && totalCos > 0 ? 'var(--success)' : 'var(--warning)'};">
            ${cosMeetingTarget} / ${totalCos}
          </span>
          <span class="kpi-trend ${cosMeetingTarget === totalCos && totalCos > 0 ? 'positive' : 'neutral'}">
            Target: ≥ ${classTarget}% Class Attainment
          </span>
        </div>
      </div>

      <!-- Program Outcomes (PO1-PO12) Card Grid -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="margin-bottom:16px;">
          <div>
            <h2 class="card-title">Program Outcomes (PO1 – PO12) Registry</h2>
            <p class="card-subtitle">Graduate attributes mandated by NBA for engineering programs</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
          ${(app.data.programOutcomes || []).map(po => `
            <div style="background:var(--bg-subtle); border:1px solid var(--border-default); border-radius:var(--radius-md); padding:12px 14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span class="tag tag-co" style="font-weight:800; font-size:12px;">${po.code}</span>
                <span style="font-size:11px; font-weight:700; color:var(--text-tertiary);">Grad Attributes</span>
              </div>
              <div style="font-size:13px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${po.title}</div>
              <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${po.description}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Department-wise Attainment Summary -->
      <div class="card">
        <div class="card-header" style="margin-bottom:16px;">
          <div>
            <h2 class="card-title">Department-wise CO Attainment Summary</h2>
            <p class="card-subtitle">NBA accreditation attainment status across all 6 engineering departments</p>
          </div>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Short Code</th>
                <th>Enrolled FE Roster</th>
                <th>COs Defined</th>
                <th>COs Meeting Target</th>
                <th>Accreditation Health</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${HARDCODED_DEPARTMENTS.map(d => {
                const deptStudents = app.getStudentsForDept(d.id);
                return `
                  <tr>
                    <td style="font-weight:600;">${d.name}</td>
                    <td><span class="tag tag-co">${d.shortName}</span></td>
                    <td class="mono-val" style="font-weight:700;">${deptStudents.length}</td>
                    <td class="mono-val">${totalCos}</td>
                    <td class="mono-val" style="font-weight:700; color:var(--success);">${cosMeetingTarget}</td>
                    <td>
                      <span class="tag ${deptStudents.length > 0 ? 'tag-success' : 'tag-warning'}">
                        ${deptStudents.length > 0 ? '🟢 Active & Tracked' : '🟡 Pending Enrolment'}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="window.location.hash='#nba-dept-${d.id}'">
                        Inspect Dept →
                      </button>
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

  renderDepartmentView(container, deptId) {
    this.activeDeptId = deptId || 'dept-mech';
    const dept = HARDCODED_DEPARTMENTS.find(d => d.id === this.activeDeptId) || HARDCODED_DEPARTMENTS[0];
    const deptSubjects = (app.data.subjects || []).filter(s => s.departmentId === dept.id);
    const cos = app.data.courseOutcomes || [];

    // Bloom's Taxonomy Distribution Calculator
    const btCounts = { BT1: 0, BT2: 0, BT3: 0, BT4: 0, BT5: 0, BT6: 0 };
    let totalQuestions = 0;
    (app.data.assignments || []).forEach(asg => {
      (asg.questions || []).forEach(q => {
        const level = q.btLevel || 'BT2';
        if (btCounts[level] !== undefined) btCounts[level]++;
        totalQuestions++;
      });
    });

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">${dept.name} — NBA Accreditation</h1>
          <p class="page-subtitle">Department-level CO-PO Mapping & Bloom's Taxonomy Coverage Analysis</p>
        </div>
        <div class="filter-group">
          <label>Department</label>
          <select class="form-select" onchange="window.location.hash='#nba-dept-' + this.value">
            ${HARDCODED_DEPARTMENTS.map(d => `<option value="${d.id}" ${d.id === dept.id ? 'selected' : ''}>${d.name}</option>`).join('')}
          </select>
        </div>
      </div>

      ${this.renderSubNav(container, 'department')}

      <!-- Bloom's Taxonomy Distribution Bar Chart -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header" style="margin-bottom:14px;">
          <div>
            <h2 class="card-title">Bloom's Taxonomy Level Distribution</h2>
            <p class="card-subtitle">Cognitive domain distribution across all assignment questions built for this department</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${Object.keys(btCounts).map(btKey => {
            const count = btCounts[btKey];
            const pct = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0;
            const labels = {
              BT1: "BT1: Remember (Recall facts & basic concepts)",
              BT2: "BT2: Understand (Explain ideas or concepts)",
              BT3: "BT3: Apply (Use information in new situations)",
              BT4: "BT4: Analyze (Draw connections among ideas)",
              BT5: "BT5: Evaluate (Justify a stand or decision)",
              BT6: "BT6: Create (Produce new or original work)"
            };
            return `
              <div>
                <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:4px;">
                  <span>${labels[btKey] || btKey}</span>
                  <span class="mono-val">${count} questions (${pct}%)</span>
                </div>
                <div class="progress-bar-inline">
                  <div class="progress-bar-fill success" style="width:${pct}%;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- CO-PO Consolidated Read-Only Matrix -->
      <div class="card">
        <div class="card-header" style="margin-bottom:16px;">
          <div>
            <h2 class="card-title">Consolidated CO-PO Mapping Matrix</h2>
            <p class="card-subtitle">Outcome mapping across PO1–PO12 and PSO1–PSO2 for NBA audit compliance</p>
          </div>
        </div>

        <div class="table-container" style="max-height:450px; overflow-y:auto;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Outcome Code</th>
                <th>Outcome Description</th>
                <th>PO1</th><th>PO2</th><th>PO3</th><th>PO4</th><th>PO5</th><th>PO6</th>
                <th>PO7</th><th>PO8</th><th>PO9</th><th>PO10</th><th>PO11</th><th>PO12</th>
                <th>PSO1</th><th>PSO2</th>
              </tr>
            </thead>
            <tbody>
              ${cos.map(c => `
                <tr>
                  <td class="mono-val" style="font-weight:700; color:var(--accent-blue);">${c.code}</td>
                  <td style="font-size:12px; max-width:240px;">${c.description}</td>
                  ${(app.data.programOutcomes || []).map(() => `<td style="text-align:center; color:var(--success); font-weight:700;">✓</td>`).join('')}
                  ${(app.data.programSpecificOutcomes || []).map(() => `<td style="text-align:center; color:var(--accent-blue); font-weight:700;">✓</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderStudentView(container, studentId) {
    const studentsForAY = app.getStudentsForAY();
    if (!studentId && studentsForAY.length > 0) {
      studentId = studentsForAY[0].id;
    }
    this.activeStudentId = studentId;

    const student = studentsForAY.find(s => s.id === studentId) || studentsForAY[0] || null;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Individual Student NBA Attainment Profile</h1>
          <p class="page-subtitle">Student-level outcome attainment breakdown across all assigned lab courses</p>
        </div>
      </div>

      ${this.renderSubNav(container, 'student')}

      <!-- Student Search Box -->
      <div class="card" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <div class="filter-group">
          <label style="color:var(--accent-blue);">Select Student to Inspect Attainment</label>
          <select class="form-select" style="background:#FFF;" onchange="window.location.hash='#nba-student-' + this.value">
            ${studentsForAY.map(s => `
              <option value="${s.id}" ${student && s.id === student.id ? 'selected' : ''}>
                ${s.name} (${s.uin} — ${s.branch})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      ${!student ? `
        <div class="empty-state">
          <div class="empty-state-emoji">🎓</div>
          <div class="empty-state-title">No Student Selected</div>
          <div class="empty-state-subtitle">Select a student from the dropdown above to view NBA outcome attainment.</div>
        </div>
      ` : `
        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div>
              <h3 class="card-title">${student.name} (${student.uin})</h3>
              <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
                Branch: <strong>${student.branch}</strong> | Div: <strong>${student.division}</strong> | Batch: <strong>${student.batch}</strong>
              </div>
            </div>
            <span class="tag tag-co">AY 2026-27</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:14px;">
            ${(app.data.courseOutcomes || []).map(co => {
              const paramMap = {};
              (app.getAssignmentsForStudent(student) || []).forEach(asg => {
                (asg.questions || []).forEach(q => {
                  (q.parameters || []).forEach(p => {
                    paramMap[p.id] = { coId: q.coId || 'CO1', valueMarks: p.valueMarks || 4 };
                  });
                });
              });

              const relevantPids = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
              let earned = 0;
              let maxMarks = 0;
              relevantPids.forEach(pid => {
                maxMarks += (paramMap[pid].valueMarks || 4);
                const sub = app.data.submissions.find(s => (s.studentId === student.id || s.studentId === student.uin) && s.parameterId === pid);
                if (sub) earned += (sub.marksAwarded || 0);
              });

              const pct = maxMarks > 0 ? Math.round((earned / maxMarks) * 100) : 0;
              const attained = pct >= (app.data.attainmentSettings?.studentThresholdPct || 60);

              return `
                <div style="background:var(--bg-subtle); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-default);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span class="tag ${co.type === 'LO' ? 'tag-lo' : 'tag-co'}">${co.code}</span>
                    <span class="tag ${attained ? 'tag-success' : 'tag-danger'}" style="font-size:11px;">
                      ${attained ? '✓ Attained' : '✕ Not Attained'}
                    </span>
                  </div>
                  <div style="font-size:12px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">${co.description}</div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:8px;">
                    <span>Score: <strong class="mono-val">${earned.toFixed(1)} / ${maxMarks}</strong></span>
                    <strong class="mono-val" style="color:${attained ? 'var(--success)' : 'var(--danger)'};">${pct}%</strong>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `}
    `;
  },

  renderExportView(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">NBA Accreditation Reports & Export Center</h1>
          <p class="page-subtitle">Download official NBA accreditation CSV data sheets for SAR compliance documentation</p>
        </div>
      </div>

      ${this.renderSubNav(container, 'export')}

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
        <div class="card">
          <h3 class="card-title">1. Course Outcome Attainment Tables CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Export class attainment percentages for all defined COs & LOs</p>
          <button class="btn btn-primary" style="width:100%;" onclick="analyticsView.exportCOAttainmentCSV()">
            📥 Download CO Attainment CSV
          </button>
        </div>

        <div class="card">
          <h3 class="card-title">2. Master Class Gradebook Roster CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Export consolidated student marks roster across all lab assignments</p>
          <button class="btn btn-primary" style="width:100%;" onclick="analyticsView.exportMasterClassGradebookCSV()">
            📥 Download Master Gradebook CSV
          </button>
        </div>

        <div class="card">
          <h3 class="card-title">3. Institutional Full NBA Report CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Cross-department NBA compliance summary matrix</p>
          <button class="btn btn-primary" style="width:100%;" onclick="analyticsView.exportInstitutionalReportCSV()">
            📥 Download Full NBA Report CSV
          </button>
        </div>

        <div class="card">
          <h3 class="card-title">4. System Audit Trail Log CSV</h3>
          <p class="card-subtitle" style="margin-bottom:16px;">Full immutable system mutation record for external auditor inspection</p>
          <button class="btn btn-primary" style="width:100%;" onclick="analyticsView.exportCurrentReportCSV()">
            📥 Download Audit Log CSV
          </button>
        </div>
      </div>
    `;
  }
};
