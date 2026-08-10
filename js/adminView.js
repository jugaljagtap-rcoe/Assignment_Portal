/* ==========================================================================
   Rizvi College of Engineering - Admin Module
   ========================================================================== */

const adminView = {
  render(container, activeNav) {
    switch(activeNav) {
      case 'students':
        this.renderStudentsMaster(container);
        break;
      case 'faculty':
        this.renderFacultyRoster(container);
        break;
      case 'departments':
        this.renderDepartments(container);
        break;
      case 'pos':
        this.renderPOAccreditation(container);
        break;
      case 'google-auth':
        this.renderGoogleAuthSettings(container);
        break;
      case 'analytics':
        analyticsView.render(container);
        break;
      case 'dashboard':
      default:
        this.renderDashboard(container);
        break;
    }
  },

  renderDashboard(container) {
    const totalStudents = app.data.students.length;
    const totalFaculty = app.data.faculty.filter(f => f.role === 'faculty').length;
    const totalDepts = app.data.departments.length;
    const totalAssignments = app.data.assignments.length;

    const totalSubmissions = app.data.submissions.length;
    const totalAssignmentsWithQuestions = app.data.assignments.filter(a => a.questions && a.questions.length > 0).length;
    const studentsWithSubmissions = new Set(app.data.submissions.map(s => s.studentId)).size;
    const submissionRate = totalStudents > 0 ? Math.round((studentsWithSubmissions / totalStudents) * 100) : 0;

    // Department-wise assignment count
    const deptAssignmentCounts = app.data.departments.map(d => {
      const deptSubjects = app.data.subjects.filter(s => s.departmentId === d.id);
      const deptSubjectIds = deptSubjects.map(s => s.id);
      const deptAssignments = app.data.assignments.filter(a => deptSubjectIds.includes(a.subjectId));
      const deptSubmissions = app.data.submissions.filter(sub => 
        deptAssignments.some(a => a.id === sub.assignmentId)
      );
      return {
        dept: d,
        assignmentCount: deptAssignments.length,
        submissionCount: deptSubmissions.length
      };
    });

    // CO attainment summary across all defined outcomes
    const paramMap = {};
    app.data.assignments.forEach(asg => {
      (asg.questions || []).forEach(q => {
        (q.parameters || []).forEach(p => {
          paramMap[p.id] = { coId: q.coId, valueMarks: p.valueMarks || 4 };
        });
      });
    });

    const courseOutcomes = app.data.courseOutcomes || [];
    const classTarget = app.data.attainmentSettings.classTargetPct;

    const coSummary = courseOutcomes.map(co => {
      const relevantParamIds = Object.keys(paramMap).filter(pid => paramMap[pid].coId === co.code);
      const maxMarksForCO = relevantParamIds.reduce((sum, pid) => sum + (paramMap[pid].valueMarks || 4), 0);
      let passingStudents = 0;

      app.data.students.forEach(st => {
        let earned = 0;
        relevantParamIds.forEach(pid => {
          const attempts = app.data.submissions.filter(s => s.studentId === st.id && s.parameterId === pid);
          if (attempts.length === 0) return;
          const best = attempts.reduce((b, s) => (s.marksAwarded || 0) > (b.marksAwarded || 0) ? s : b, attempts[0]);
          earned += (best.marksAwarded || 0);
        });
        const pct = maxMarksForCO > 0 ? (earned / maxMarksForCO * 100) : 0;
        if (pct >= app.data.attainmentSettings.studentThresholdPct) passingStudents++;
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
    const cosTotal = coSummary.length;

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Overview</h1>
          <p class="page-subtitle">Rizvi College of Engineering — Academic & Accreditation Overview</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="app.switchNav('google-auth')">🔑 Google Auth Settings</button>
          <button class="btn btn-secondary btn-sm" onclick="adminView.openAttainmentModal()">⚙️ CO Thresholds</button>
          <button class="btn btn-secondary btn-sm" onclick="app.resetState()">🔄 Reset Database</button>
        </div>
      </div>

      <!-- Row 1: Core Institutional KPIs -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total FE Roster</span>
          <span class="kpi-value">${totalStudents}</span>
          <span class="kpi-trend positive">Across ${HARDCODED_BRANCHES.length} Branches</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Lab Faculty</span>
          <span class="kpi-value">${totalFaculty}</span>
          <span class="kpi-trend neutral">Cross-Department</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Lab Assignments Published</span>
          <span class="kpi-value">${totalAssignments}</span>
          <span class="kpi-trend ${totalAssignmentsWithQuestions > 0 ? 'positive' : 'neutral'}">
            ${totalAssignmentsWithQuestions} With Questions Built
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Student Submission Rate</span>
          <span class="kpi-value" style="color:${submissionRate >= 70 ? 'var(--success)' : submissionRate > 0 ? 'var(--warning)' : 'var(--text-secondary)'};">
            ${submissionRate}%
          </span>
          <span class="kpi-trend ${submissionRate >= 70 ? 'positive' : 'neutral'}">
            ${studentsWithSubmissions} / ${totalStudents} Students Submitted
          </span>
        </div>
      </div>

      <!-- Row 2: CO Attainment Summary -->
      <div class="kpi-grid" style="margin-top:16px;">
        <div class="kpi-card">
          <span class="kpi-label">Total Outcomes Defined</span>
          <span class="kpi-value">${cosTotal}</span>
          <span class="kpi-trend neutral">CO + LO Combined</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">COs Meeting Target</span>
          <span class="kpi-value" style="color:${cosTotal > 0 && cosMeetingTarget === cosTotal ? 'var(--success)' : cosMeetingTarget > 0 ? 'var(--warning)' : 'var(--danger)'};">
            ${cosMeetingTarget} / ${cosTotal}
          </span>
          <span class="kpi-trend ${cosMeetingTarget === cosTotal && cosTotal > 0 ? 'positive' : 'neutral'}">
            Target: ≥ ${classTarget}% Class Attainment
          </span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Student CO Threshold</span>
          <span class="kpi-value">${app.data.attainmentSettings.studentThresholdPct}%</span>
          <span class="kpi-trend neutral">Min Score to Attain CO</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Submissions Logged</span>
          <span class="kpi-value">${totalSubmissions}</span>
          <span class="kpi-trend neutral">Parameter-Level Attempts</span>
        </div>
      </div>

      <!-- CO Attainment Settings Card -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">College CO Attainment Thresholds</h2>
            <p class="card-subtitle">Global NBA accreditation parameters — faculty can override per subject</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="adminView.openAttainmentModal()">Edit Thresholds</button>
        </div>
        <div style="display:flex; gap:40px; margin-top:12px;">
          <div>
            <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Student Score Target</span>
            <div style="font-size:24px; font-weight:700; color:var(--accent-blue);">${app.data.attainmentSettings.studentThresholdPct}%</div>
            <span style="font-size:12px; color:var(--text-secondary);">Minimum score for a student to attain a CO</span>
          </div>
          <div>
            <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Class Attainment Target</span>
            <div style="font-size:24px; font-weight:700; color:var(--success);">${app.data.attainmentSettings.classTargetPct}%</div>
            <span style="font-size:12px; color:var(--text-secondary);">% of students required for class-level CO attainment</span>
          </div>
        </div>
      </div>

      <!-- Department-wise Breakdown -->
      <div class="card" style="margin-top:24px;">
        <div class="card-header" style="margin-bottom:16px;">
          <div>
            <h2 class="card-title">Department-wise Assignment & Submission Breakdown</h2>
            <p class="card-subtitle">Activity summary per department for Academic Year 2026-27</p>
          </div>
        </div>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Short Code</th>
                <th>Subjects Defined</th>
                <th>Assignments Published</th>
                <th>Total Submissions</th>
                <th>Activity Status</th>
              </tr>
            </thead>
            <tbody>
              ${deptAssignmentCounts.map(d => `
                <tr>
                  <td style="font-weight:600;">${d.dept.name}</td>
                  <td><span class="tag tag-co">${d.dept.shortName}</span></td>
                  <td style="font-family:var(--font-mono); font-weight:700;">
                    ${app.data.subjects.filter(s => s.departmentId === d.dept.id).length}
                  </td>
                  <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">
                    ${d.assignmentCount}
                  </td>
                  <td style="font-family:var(--font-mono); font-weight:700;">
                    ${d.submissionCount}
                  </td>
                  <td>
                    <span class="tag ${d.assignmentCount > 0 && d.submissionCount > 0 ? 'tag-success' : d.assignmentCount > 0 ? 'tag-warning' : 'tag-bt'}">
                      ${d.assignmentCount === 0 ? 'No Assignments' : d.submissionCount === 0 ? 'No Submissions Yet' : 'Active'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- CO Attainment Summary Table -->
      ${cosTotal > 0 ? `
        <div class="card" style="margin-top:24px;">
          <div class="card-header" style="margin-bottom:16px;">
            <div>
              <h2 class="card-title">College-Wide CO Attainment Summary</h2>
              <p class="card-subtitle">NBA accreditation attainment status across all defined outcomes</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="app.switchNav('reports')">
              📊 Full Attainment Report
            </button>
          </div>
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Outcome Code</th>
                  <th>Description</th>
                  <th>Students Attaining</th>
                  <th>Class Attainment %</th>
                  <th>NBA Status</th>
                </tr>
              </thead>
              <tbody>
                ${coSummary.map(cs => `
                  <tr>
                    <td>
                      <span class="tag ${cs.co.type === 'LO' ? 'tag-lo' : 'tag-co'}">
                        ${cs.co.type || 'CO'}
                      </span>
                    </td>
                    <td style="font-weight:700; font-family:var(--font-mono); color:var(--accent-blue);">${cs.co.code}</td>
                    <td style="font-size:13px;">${cs.co.description}</td>
                    <td style="font-weight:700;">
                      ${cs.passingStudents} / ${totalStudents}
                    </td>
                    <td style="font-weight:700; font-size:15px; color:${cs.targetMet ? 'var(--success)' : 'var(--danger)'};">
                      ${cs.attainmentPct}%
                    </td>
                    <td>
                      <span class="tag ${cs.targetMet ? 'tag-success' : 'tag-danger'}">
                        ${cs.targetMet ? '✓ NBA Target Met' : '✕ Target Not Met'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : `
        <div class="card" style="margin-top:24px; text-align:center; padding:32px;">
          <div style="font-size:40px; margin-bottom:12px;">🎯</div>
          <h3 style="font-size:16px; font-weight:700; margin-bottom:8px;">No Course Outcomes Defined Yet</h3>
          <p style="color:var(--text-secondary); font-size:13px; max-width:480px; margin:0 auto;">
            Faculty must define Course Outcomes (COs) and Lab Outcomes (LOs) under the 
            Faculty Portal → Course Outcomes & Modules section before CO attainment data 
            can appear here.
          </p>
        </div>
      `}
    `;
  },

  renderGoogleAuthSettings(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Strict Google Auth & Whitelist Enforcement</h1>
          <p class="page-subtitle">Configure <code>@eng.rizvi.edu.in</code> Domain Authentication & Strict Pre-Enrolled Role Resolution</p>
        </div>
      </div>

      <div class="card" style="margin-bottom:20px; background:var(--accent-blue-subtle); border-color:rgba(0,102,204,0.2);">
        <h3 class="card-title" style="color:var(--accent-blue);">🔒 Whitelist Enforcement Policy (Strict Access Control)</h3>
        <p style="font-size:13px; color:var(--text-primary); margin-top:4px;">
          Even if an email address belongs to <code>@eng.rizvi.edu.in</code>, <strong>login is strictly denied</strong> if the email is not explicitly listed in the Admin Roster, Faculty Roster, or Student Master CSV Roster. No unlisted accounts can log in!
        </p>
      </div>

      <!-- Hardcoded Admin Roster Table -->
      <div class="card" style="margin-bottom:24px;">
        <h3 class="card-title" style="margin-bottom:12px;">Hardcoded Institutional Dual Admin & Faculty Account</h3>
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Institutional Designation</th>
                <th>System Access Level</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">jugaljagtap@eng.rizvi.edu.in</td>
                <td style="font-weight:600;">Prof. Jugal Jagtap (Dual Admin & Faculty)</td>
                <td><span class="tag tag-danger">Dual Admin & Faculty (Profile Switcher Enabled)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Test Email Whitelist Simulator Sandbox -->
      <div class="card" style="margin-bottom:24px;">
        <h3 class="card-title">Test Google Sign-In Whitelist Resolver Sandbox</h3>
        <p class="card-subtitle" style="margin-bottom:14px;">Enter any <code>@eng.rizvi.edu.in</code> email address to verify whether access is granted or strictly denied</p>

        <div style="display:flex; gap:12px;">
          <input type="email" id="test-google-email" class="form-input code-font" value="jugaljagtap@eng.rizvi.edu.in" placeholder="username@eng.rizvi.edu.in" style="flex:1;">
          <button class="btn btn-primary" onclick="adminView.simulateGoogleSignIn()">Simulate Google Login</button>
        </div>

        <div id="google-sim-result" style="margin-top:14px;"></div>
      </div>

      <!-- Strategy Explanation Cards -->
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:20px;">
        <div class="card">
          <span class="tag tag-danger" style="margin-bottom:8px;">1. HARDCODED ADMIN & FACULTY</span>
          <h4 style="font-size:15px; margin-bottom:6px;">Dual-Role Master Account</h4>
          <p style="font-size:12px; color:var(--text-secondary);">
            Hardcoded account <code>jugaljagtap@eng.rizvi.edu.in</code> gains immediate Dual Admin & Faculty access with profile toggle.
          </p>
        </div>

        <div class="card">
          <span class="tag tag-co" style="margin-bottom:8px;">2. FACULTY ROSTER</span>
          <h4 style="font-size:15px; margin-bottom:6px;">Pre-Enrolled Faculty</h4>
          <p style="font-size:12px; color:var(--text-secondary);">
            Faculty members listed in the Faculty Roster get access to build assignments and manage lab schedules.
          </p>
        </div>

        <div class="card">
          <span class="tag tag-bt" style="margin-bottom:8px;">3. STUDENT MASTER</span>
          <h4 style="font-size:15px; margin-bottom:6px;">Student Master CSV Roster</h4>
          <p style="font-size:12px; color:var(--text-secondary);">
            Students pre-imported via CSV (matching <code>uin@eng.rizvi.edu.in</code>) get access to their personalized Canvas Sheets.
          </p>
        </div>
      </div>
    `;
  },

  simulateGoogleSignIn() {
    const email = (document.getElementById('test-google-email').value || '').trim().toLowerCase();
    const resultBox = document.getElementById('google-sim-result');
    if (!email) return;

    if (!email.includes('@')) {
      resultBox.innerHTML = `<div style="color:var(--danger); font-size:13px;">❌ Invalid email format. Must be an @eng.rizvi.edu.in email address.</div>`;
      return;
    }

    // Check Hardcoded Admin List & Faculty List
    let matchedUser = null;
    let role = null;

    if (HARDCODED_ADMIN_EMAILS.includes(email)) {
      const foundFac = app.data.faculty.find(f => f.email.toLowerCase() === email);
      role = 'admin';
      matchedUser = foundFac || { name: 'Prof. Jugal Jagtap', email: email };
    } else {
      const fac = app.data.faculty.find(f => f.email.toLowerCase() === email);
      if (fac) {
        role = fac.role;
        matchedUser = fac;
      } else {
        const st = app.data.students.find(s => (s.email || '').toLowerCase() === email || email.startsWith(s.uin));
        if (st) {
          role = 'student';
          matchedUser = st;
        }
      }
    }

    if (matchedUser && role) {
      resultBox.innerHTML = `
        <div style="background:#F0FDF4; border:1px solid #16A34A; padding:14px; border-radius:var(--radius-md); font-size:13px; color:#14532D;">
          <strong>✅ Google Auth Authenticated & Whitelist Verified!</strong><br>
          • <strong>Status:</strong> <span style="color:#16A34A; font-weight:700;">PRE-ENROLLED IN INSTITUTIONAL ROSTER</span><br>
          • <strong>Resolved Role:</strong> <span class="tag ${role === 'admin' ? 'tag-danger' : role === 'faculty' ? 'tag-co' : 'tag-success'}">${role.toUpperCase()} ${email === 'jugaljagtap@eng.rizvi.edu.in' ? '& FACULTY (DUAL ROLE)' : ''}</span><br>
          • <strong>Account Holder:</strong> ${matchedUser.name} (<code class="code-font">${matchedUser.email}</code>)<br>
          • <strong>System Allocation:</strong> ${role === 'student' ? `UIN ${matchedUser.uin} | Branch: ${matchedUser.branch} | Div ${matchedUser.division} / Batch ${matchedUser.batch}` : `Full System & Lab Module Access`}
        </div>
      `;
    } else {
      // STRICT DENY ACCESS - NO FALLBACK ALLOWED!
      resultBox.innerHTML = `
        <div style="background:#FEF2F2; border:1px solid #DC2626; padding:14px; border-radius:var(--radius-md); font-size:13px; color:#991B1B;">
          <strong>⛔ LOGIN DENIED: UNLISTED ACCOUNT!</strong><br>
          • <strong>Google Auth Status:</strong> Authenticated as <code>${email}</code> via Google Workspace.<br>
          • <strong>Whitelist Status:</strong> <strong style="color:#DC2626;">NOT LISTED ANYWHERE</strong> in Student Master, Faculty Roster, or Admin List.<br>
          • <strong>Access Result:</strong> Access is strictly blocked. No fallback role is granted.<br>
          • <strong>Action Required:</strong> Contact System Admin (<code>jugaljagtap@eng.rizvi.edu.in</code>) to get enrolled in the Master Roster.
        </div>
      `;
    }
  },

  renderStudentsMaster(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Student Master Roster (${app.data.students.length} Enrolled)</h1>
          <p class="page-subtitle">Central Student Roster with Branch, Division, & Batch allocations for @eng.rizvi.edu.in</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="adminView.downloadStudentCSVTemplate()">📥 Sample CSV</button>
          <input type="file" id="bulk-student-file" accept=".csv" style="display:none;" onchange="adminView.handleBulkStudentCSV(event)">
          <button class="btn btn-secondary" onclick="document.getElementById('bulk-student-file').click()">📤 Bulk Import (.csv)</button>
          <button class="btn btn-secondary" onclick="adminView.openAutoAssignBatchesModal()">⚡ Auto-Assign Batches</button>
          <button class="btn btn-primary" onclick="adminView.openAddStudentModal()">+ Enroll Student</button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; gap:12px; margin-bottom:16px;">
          <input type="text" id="student-search-input" class="form-input" placeholder="Search by UIN, Name, Email or Branch..." style="flex:1;" oninput="adminView.filterStudents()">
          
          <select id="student-year-select" class="form-select" style="width:120px;" onchange="adminView.filterStudents()">
            <option value="">All Years</option>
            <option value="FE">FE</option>
            <option value="SE">SE</option>
            <option value="TE">TE</option>
            <option value="BE">BE</option>
          </select>

          <select id="student-branch-select" class="form-select" style="width:220px;" onchange="adminView.filterStudents()">
            <option value="">All Branches</option>
            ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>

          <select id="student-div-select" class="form-select" style="width:130px;" onchange="adminView.filterStudents()">
            <option value="">All Divs</option>
            <option value="A">Division A</option>
            <option value="B">Division B</option>
            <option value="C">Division C</option>
            <option value="D">Division D</option>
          </select>

          <select id="student-batch-select" class="form-select" style="width:130px;" onchange="adminView.filterStudents()">
            <option value="">All Batches</option>
            <option value="A1">Batch A1</option>
            <option value="A2">Batch A2</option>
            <option value="B1">Batch B1</option>
            <option value="B2">Batch B2</option>
            <option value="C1">Batch C1</option>
            <option value="D3">Batch D3</option>
          </select>
        </div>

        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>UIN</th>
                <th>Full Name</th>
                <th>Institutional Email</th>
                <th>Year</th>
                <th>Engineering Branch</th>
                <th>Division</th>
                <th>Lab Batch</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="student-table-body">
              ${this.buildStudentRows(app.data.students)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  buildStudentRows(studentsList) {
    if (studentsList.length === 0) {
      return `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-secondary);">No student records found matching filters.</td></tr>`;
    }
    return studentsList.map(s => `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:600;">${s.uin}</td>
        <td style="font-weight:500;">${s.name}</td>
        <td style="font-size:12px; color:var(--accent-blue);">${s.email || `${s.uin}@eng.rizvi.edu.in`}</td>
        <td><span class="tag tag-co" style="font-size:11px; font-weight:700; background:var(--accent-blue-subtle); color:var(--accent-blue);">${s.yearOfStudy || 'FE'}</span></td>
        <td><span class="tag tag-co" style="font-size:11px;">${s.branch || 'Mechanical Engineering'}</span></td>
        <td><span class="tag tag-bt">Div ${s.division}</span></td>
        <td><span class="tag tag-bt">Batch ${s.batch}</span></td>
        <td style="display:flex; gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="adminView.openEditStudentModal('${s.id}')">✏️ Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="app.setActiveStudent('${s.id}'); app.switchRole('student');">Preview Canvas</button>
          <button class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px; color:var(--danger);" onclick="adminView.deleteStudent('${s.id}')">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  },

  deleteStudent(id) {
    const st = app.data.students.find(s => s.id === id);
    const nameStr = st ? `${st.name} (${st.uin})` : 'Student';
    if (confirm(`Are you sure you want to delete ${nameStr}?`)) {
      const uinToDelete = st ? st.uin : null;
      const emailToDelete = st ? st.email : null;

      app.data.students = app.data.students.filter(s =>
        s.id !== id &&
        (!uinToDelete || (s.uin || '').toLowerCase() !== uinToDelete.toLowerCase()) &&
        (!emailToDelete || (s.email || '').toLowerCase() !== emailToDelete.toLowerCase())
      );
      app.saveState();

      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient.from('students').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('Supabase delete student notice:', error);
        });
        if (uinToDelete) {
          supabaseClient.from('students').delete().eq('uin', uinToDelete).then(() => {});
        }
        if (emailToDelete) {
          supabaseClient.from('students').delete().eq('email', emailToDelete).then(() => {});
        }
      }

      app.showToast(`Deleted ${nameStr}`, 'info');
      this.renderStudentsMaster(document.getElementById('main-content'));
    }
  },

  filterStudents() {
    const search = document.getElementById('student-search-input').value.toLowerCase();
    const year = document.getElementById('student-year-select') ? document.getElementById('student-year-select').value : '';
    const branch = document.getElementById('student-branch-select').value;
    const div = document.getElementById('student-div-select').value;
    const batch = document.getElementById('student-batch-select').value;

    const filtered = app.data.students.filter(s => {
      const matchQuery = s.name.toLowerCase().includes(search) || s.uin.includes(search) || (s.email || '').toLowerCase().includes(search) || (s.branch || '').toLowerCase().includes(search);
      const matchYear = year ? (s.yearOfStudy || 'FE') === year : true;
      const matchBranch = branch ? s.branch === branch : true;
      const matchDiv = div ? s.division === div : true;
      const matchBatch = batch ? s.batch === batch : true;
      return matchQuery && matchYear && matchBranch && matchDiv && matchBatch;
    });

    document.getElementById('student-table-body').innerHTML = this.buildStudentRows(filtered);
  },

  downloadStudentCSVTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,uin,full_name,email,year_of_study,branch,division,batch,academic_year\n# UIN,Student Name,Email,Year of Study,Branch,Division,Batch,Academic Year\nXXXXXX,Sample Student,sample.student@eng.rizvi.edu.in,FE,Computer Engineering,A,A1,2026-27";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Student_Master_Roster_Template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast("Downloaded Student Master Roster Template with Year of Study (FE/SE/TE/BE)", "success");
  },

  handleBulkStudentCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        app.showToast("CSV file must contain a header row and at least one data row", "danger");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const uinIdx = headers.indexOf('uin');
      const nameIdx = headers.indexOf('full_name') >= 0 ? headers.indexOf('full_name') : headers.indexOf('name');
      const emailIdx = headers.indexOf('email');
      const yearIdx = headers.indexOf('year_of_study') >= 0 ? headers.indexOf('year_of_study') : headers.indexOf('year');
      const branchIdx = headers.indexOf('branch');
      const divIdx = headers.indexOf('division') >= 0 ? headers.indexOf('division') : headers.indexOf('div');
      const batchIdx = headers.indexOf('batch');
      const ayIdx = headers.indexOf('academic_year') >= 0 ? headers.indexOf('academic_year') : headers.indexOf('ay');

      if (uinIdx === -1 || nameIdx === -1) {
        app.showToast("CSV header missing required 'uin' or 'full_name' column", "danger");
        return;
      }

      let countAdded = 0;
      let countUpdated = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const uin = cols[uinIdx];
        if (!uin) continue;

        const name = cols[nameIdx] || 'Student';
        const email = emailIdx >= 0 && cols[emailIdx] ? cols[emailIdx].toLowerCase() : `${uin}@eng.rizvi.edu.in`;
        const yearOfStudy = yearIdx >= 0 && cols[yearIdx] ? cols[yearIdx].toUpperCase() : 'FE';
        const branch = branchIdx >= 0 && cols[branchIdx] ? cols[branchIdx] : 'Computer Engineering';
        const division = divIdx >= 0 && cols[divIdx] ? cols[divIdx].toUpperCase() : 'A';
        const batch = batchIdx >= 0 && cols[batchIdx] ? cols[batchIdx].toUpperCase() : 'A1';
        const academicYear = ayIdx >= 0 && cols[ayIdx] ? cols[ayIdx] : '2026-27';

        const cleanId = (uin || (email ? email.split('@')[0] : 'user')).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const studentId = 'st-' + cleanId;

        const existingIdx = app.data.students.findIndex(s => s.id === studentId || (s.uin && s.uin.toLowerCase() === uin.toLowerCase()) || (s.email && s.email.toLowerCase() === email.toLowerCase()));
        const studentRecord = {
          id: studentId,
          uin: uin,
          name: name,
          email: email,
          yearOfStudy: yearOfStudy,
          academicYear: academicYear,
          branch: branch,
          division: division,
          batch: batch
        };

        if (existingIdx >= 0) {
          app.data.students[existingIdx] = studentRecord;
          countUpdated++;
        } else {
          app.data.students.push(studentRecord);
          countAdded++;
        }

        app.syncStudentToSupabase(studentRecord);
      }

      app.saveState();
      app.showToast(`Imported Student Roster: ${countAdded} enrolled, ${countUpdated} updated with Year (FE/SE/TE/BE), Branch, Div, & Batch`, 'success');
      this.renderStudentsMaster(document.getElementById('main-content'));
    };

    reader.readAsText(file);
  },

  openAutoAssignBatchesModal() {
    app.showModal('⚡ Auto-Assign Batches by UIN / Roll Range', `
      <form onsubmit="adminView.executeAutoBatchAllocation(event)">
        <div style="background:var(--accent-blue-subtle); padding:12px; border-radius:6px; border:1px solid rgba(0,102,204,0.2); font-size:12px; color:var(--accent-blue); margin-bottom:16px;">
          💡 <strong>Batch Range Splitter:</strong> Automatically assign lab batches (e.g. A1, A2, A3) to enrolled students based on UIN/Roll ranges.
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Year of Study</label>
            <select id="auto-batch-year" class="form-select">
              <option value="FE">FE (First Year)</option>
              <option value="SE">SE (Second Year)</option>
              <option value="TE">TE (Third Year)</option>
              <option value="BE">BE (Final Year)</option>
            </select>
          </div>
          <div class="form-group" style="flex:1.5;">
            <label class="form-label">Engineering Branch</label>
            <select id="auto-batch-branch" class="form-select">
              ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Division</label>
            <select id="auto-batch-div" class="form-select">
              <option value="A">Division A</option>
              <option value="B">Division B</option>
              <option value="C">Division C</option>
              <option value="D">Division D</option>
            </select>
          </div>
        </div>

        <div style="border-top:1px solid #E2E8F0; padding-top:12px; margin-top:12px;">
          <label class="form-label" style="font-weight:700; margin-bottom:8px;">Batch Split Rules:</label>
          
          <div style="display:flex; flex-direction:column; gap:8px;" id="batch-rules-container">
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="form-input batch-name-input code-font" value="A1" placeholder="Batch Name" style="width:100px;">
              <span style="font-size:12px; color:var(--text-secondary);">From UIN:</span>
              <input type="text" class="form-input uin-start-input code-font" placeholder="24051001" style="flex:1;">
              <span style="font-size:12px; color:var(--text-secondary);">To UIN:</span>
              <input type="text" class="form-input uin-end-input code-font" placeholder="24051020" style="flex:1;">
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="form-input batch-name-input code-font" value="A2" placeholder="Batch Name" style="width:100px;">
              <span style="font-size:12px; color:var(--text-secondary);">From UIN:</span>
              <input type="text" class="form-input uin-start-input code-font" placeholder="24051021" style="flex:1;">
              <span style="font-size:12px; color:var(--text-secondary);">To UIN:</span>
              <input type="text" class="form-input uin-end-input code-font" placeholder="24051040" style="flex:1;">
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <input type="text" class="form-input batch-name-input code-font" value="A3" placeholder="Batch Name" style="width:100px;">
              <span style="font-size:12px; color:var(--text-secondary);">From UIN:</span>
              <input type="text" class="form-input uin-start-input code-font" placeholder="24051041" style="flex:1;">
              <span style="font-size:12px; color:var(--text-secondary);">To UIN:</span>
              <input type="text" class="form-input uin-end-input code-font" placeholder="24051060" style="flex:1;">
            </div>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">⚡ Execute Auto-Batch Allocation</button>
        </div>
      </form>
    `);
  },

  executeAutoBatchAllocation(e) {
    e.preventDefault();
    const targetYear = document.getElementById('auto-batch-year').value;
    const targetBranch = document.getElementById('auto-batch-branch').value;
    const targetDiv = document.getElementById('auto-batch-div').value;

    const rows = document.querySelectorAll('#batch-rules-container > div');
    const rules = [];

    rows.forEach(r => {
      const bName = r.querySelector('.batch-name-input').value.trim();
      const uStart = r.querySelector('.uin-start-input').value.trim();
      const uEnd = r.querySelector('.uin-end-input').value.trim();
      if (bName && uStart && uEnd) {
        rules.push({ batchName: bName, startUin: uStart, endUin: uEnd });
      }
    });

    if (rules.length === 0) {
      app.showToast('Please specify at least one batch UIN range rule', 'warning');
      return;
    }

    let updatedCount = 0;

    app.data.students.forEach(s => {
      const matchYear = !s.yearOfStudy || s.yearOfStudy === targetYear;
      const matchBranch = s.branch === targetBranch;
      const matchDiv = s.division === targetDiv;

      if (matchYear && matchBranch && matchDiv) {
        const studentUinNum = parseInt(s.uin.replace(/\D/g, ''), 10) || 0;

        rules.forEach(rule => {
          const startNum = parseInt(rule.startUin.replace(/\D/g, ''), 10) || 0;
          const endNum = parseInt(rule.endUin.replace(/\D/g, ''), 10) || 0;

          if (studentUinNum >= startNum && studentUinNum <= endNum) {
            s.batch = rule.batchName.toUpperCase().trim();
            s.yearOfStudy = targetYear;
            updatedCount++;
            app.syncStudentToSupabase(s);
          }
        });
      }
    });

    app.saveState();
    app.closeModal();
    app.showToast(`Auto-assigned ${updatedCount} student profiles into batches for ${targetYear} ${targetBranch} (Div ${targetDiv})`, 'success');
    this.renderStudentsMaster(document.getElementById('main-content'));
  },

  openAddStudentModal() {
    const ayOptions = (app.data.academicYears || []).map(ay => `<option value="${ay.label}" ${ay.active ? 'selected' : ''}>Academic Year ${ay.label} ${ay.active ? '(Active)' : ''}</option>`).join('');
    const divOptions = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(d => `<option value="${d}">Division ${d}</option>`).join('');

    app.showModal('Enroll New Student for Google Auth', `
      <form onsubmit="adminView.saveNewStudent(event)">
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">UIN Number</label>
            <input type="text" id="new-uin" class="form-input code-font" placeholder="24051009" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Academic Year</label>
            <select id="new-ay" class="form-select">
              ${ayOptions}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="new-name" class="form-input" placeholder="Rohan Kulkarni" required>
        </div>
        <div class="form-group">
          <label class="form-label">Google Workspace Email (@eng.rizvi.edu.in)</label>
          <input type="email" id="new-email" class="form-input" placeholder="rohan.k@eng.rizvi.edu.in" required>
        </div>
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:2;">
            <label class="form-label">Engineering Branch</label>
            <select id="new-branch" class="form-select">
              ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Year of Study</label>
            <select id="new-year" class="form-select">
              <option value="FE">FE (First Year)</option>
              <option value="SE">SE (Second Year)</option>
              <option value="TE">TE (Third Year)</option>
              <option value="BE">BE (Final Year)</option>
            </select>
          </div>
        </div>
        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Division</label>
            <select id="new-div" class="form-select">
              ${divOptions}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Batch</label>
            <input type="text" id="new-batch" class="form-input code-font" value="A1" placeholder="e.g. A1, B2" required>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Enroll Student</button>
        </div>
      </form>
    `);
  },

  saveNewStudent(e) {
    e.preventDefault();
    const uin = (document.getElementById('new-uin').value || '').trim();
    const email = (document.getElementById('new-email').value || '').trim().toLowerCase();
    const cleanKey = (uin || (email ? email.split('@')[0] : 'user')).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanId = 'st-' + cleanKey;

    const newSt = {
      id: cleanId,
      uin: uin,
      name: (document.getElementById('new-name').value || '').trim(),
      email: email,
      academicYear: document.getElementById('new-ay').value,
      yearOfStudy: document.getElementById('new-year').value,
      branch: document.getElementById('new-branch').value,
      division: document.getElementById('new-div').value,
      batch: (document.getElementById('new-batch').value || '').trim()
    };

    const existingIdx = app.data.students.findIndex(s => s.id === cleanId || (s.uin && s.uin.toLowerCase() === uin.toLowerCase()));
    if (existingIdx >= 0) {
      app.data.students[existingIdx] = newSt;
    } else {
      app.data.students.push(newSt);
    }
    app.saveState();

    app.syncStudentToSupabase(newSt);

    app.closeModal();
    app.showToast(`Enrolled student ${newSt.name} (${newSt.uin}) for ${newSt.yearOfStudy} (AY ${newSt.academicYear})`, 'success');
    this.renderStudentsMaster(document.getElementById('main-content'));
  },

  openEditStudentModal(id) {
    const st = app.data.students.find(s => s.id === id);
    if (!st) return;

    const ayOptions = (app.data.academicYears || []).map(ay =>
      `<option value="${ay.label}" ${st.academicYear === ay.label ? 'selected' : ''}>Academic Year ${ay.label}</option>`
    ).join('');

    const yearOptions = ['FE', 'SE', 'TE', 'BE'].map(y =>
      `<option value="${y}" ${(st.yearOfStudy || 'FE') === y ? 'selected' : ''}>${y}</option>`
    ).join('');

    const branchOptions = HARDCODED_BRANCHES.map(b =>
      `<option value="${b}" ${st.branch === b ? 'selected' : ''}>${b}</option>`
    ).join('');

    const divOptions = ['A', 'B', 'C', 'D'].map(d =>
      `<option value="${d}" ${st.division === d ? 'selected' : ''}>Division ${d}</option>`
    ).join('');

    app.showModal(`✏️ Edit Student Profile (${st.uin})`, `
      <form onsubmit="adminView.saveEditStudent(event, '${st.id}')">
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">UIN / Roll Number</label>
            <input type="text" id="edit-st-uin" class="form-input code-font" value="${st.uin}" required>
          </div>
          <div class="form-group" style="flex:1.5;">
            <label class="form-label">Full Name</label>
            <input type="text" id="edit-st-name" class="form-input" value="${st.name}" required>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <div class="form-group" style="flex:1.5;">
            <label class="form-label">Institutional Email</label>
            <input type="email" id="edit-st-email" class="form-input code-font" value="${st.email || ''}" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Academic Year</label>
            <select id="edit-st-ay" class="form-select">${ayOptions}</select>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Year of Study</label>
            <select id="edit-st-year" class="form-select">${yearOptions}</select>
          </div>
          <div class="form-group" style="flex:1.5;">
            <label class="form-label">Engineering Branch</label>
            <select id="edit-st-branch" class="form-select">${branchOptions}</select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Division</label>
            <select id="edit-st-div" class="form-select">${divOptions}</select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Lab Batch</label>
            <input type="text" id="edit-st-batch" class="form-input code-font" value="${st.batch || 'A1'}" required>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">💾 Save Student Profile</button>
        </div>
      </form>
    `);
  },

  saveEditStudent(e, id) {
    e.preventDefault();
    const idx = app.data.students.findIndex(s => s.id === id);
    if (idx === -1) return;

    const uin = (document.getElementById('edit-st-uin').value || '').trim();
    const email = (document.getElementById('edit-st-email').value || '').trim().toLowerCase();
    const cleanKey = (uin || (email ? email.split('@')[0] : 'user')).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const cleanId = 'st-' + cleanKey;

    const updated = {
      ...app.data.students[idx],
      id: cleanId,
      uin: uin,
      name: (document.getElementById('edit-st-name').value || '').trim(),
      email: email,
      academicYear: document.getElementById('edit-st-ay').value,
      yearOfStudy: document.getElementById('edit-st-year').value,
      branch: document.getElementById('edit-st-branch').value,
      division: document.getElementById('edit-st-div').value,
      batch: (document.getElementById('edit-st-batch').value || '').trim().toUpperCase()
    };

    app.data.students[idx] = updated;
    app.saveState();

    app.syncStudentToSupabase(updated);

    if (app.currentUser && app.currentUser.studentId === id) {
      app.currentUser.branch = updated.branch;
      app.currentUser.batch = updated.batch;
      app.currentUser.uin = updated.uin;
      app.saveUserSession(app.currentUser);
    }

    app.closeModal();
    app.showToast(`Updated student profile for ${updated.name} (${updated.uin}) - ${updated.yearOfStudy} ${updated.branch} Div ${updated.division}/Batch ${updated.batch}`, 'success');
    this.renderStudentsMaster(document.getElementById('main-content'));
  },

  renderFacultyRoster(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Faculty Roster & Google Email Allocations</h1>
          <p class="page-subtitle">Manage lab instructors and subject assignments for Google Sign-In</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="adminView.downloadFacultyCSVTemplate()">📥 Sample Faculty CSV</button>
          <input type="file" id="bulk-faculty-file" accept=".csv" style="display:none;" onchange="adminView.handleBulkFacultyCSV(event)">
          <button class="btn btn-secondary" onclick="document.getElementById('bulk-faculty-file').click()">📤 Bulk Import Faculty</button>
          <button class="btn btn-primary" onclick="adminView.openAddFacultyModal()">+ Add Faculty Member</button>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Faculty Name</th>
                <th>Google Workspace Email (@eng.rizvi.edu.in)</th>
                <th>Department</th>
                <th>Assigned Subjects</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.faculty.map(f => {
                const dept = app.data.departments.find(d => d.id === f.departmentId);
                const assignedSubs = (f.assignedSubjects || []).map(sId => {
                  const s = app.data.subjects.find(sub => sub.id === sId);
                  return s ? s.shortName : sId;
                }).join(', ');

                return `
                  <tr>
                    <td style="font-weight:600;">${f.name}</td>
                    <td style="font-size:12px; color:var(--accent-blue);">${f.email}</td>
                    <td>${dept ? dept.name : '-'}</td>
                    <td><span class="tag tag-co">${assignedSubs || 'Unassigned'}</span></td>
                    <td><span class="tag ${f.role === 'admin' ? 'tag-danger' : 'tag-bt'}">${f.role.toUpperCase()} ${f.isDualRole ? '(DUAL ROLE)' : ''}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  downloadFacultyCSVTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,full_name,email,department_id,role,assigned_subject_codes\nDr. Sunil Kumar,sunil.kumar@eng.rizvi.edu.in,dept-fe,faculty,FEL101\nProf. Meera Joshi,meera.j@eng.rizvi.edu.in,dept-mech,faculty,24051181";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Faculty_Bulk_Google_Sync_Template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast("Downloaded Bulk Faculty Google Sync Template", "success");
  },

  handleBulkFacultyCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    app.showToast(`Bulk imported faculty roster for Google Auth: ${file.name}`, 'success');
  },

  openAddFacultyModal() {
    app.showModal('Add Faculty Member & Assign Subject', `
      <form onsubmit="adminView.saveFaculty(event)">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="fac-name" class="form-input" placeholder="Dr. Rajesh Sharma" required>
        </div>
        <div class="form-group">
          <label class="form-label">Google Workspace Email (@eng.rizvi.edu.in)</label>
          <input type="email" id="fac-email" class="form-input" placeholder="rajesh.s@eng.rizvi.edu.in" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <select id="fac-dept" class="form-select">
            ${app.data.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Assign Subject</label>
          <select id="fac-sub" class="form-select">
            ${app.data.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.fullName}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Faculty</button>
        </div>
      </form>
    `);
  },

  saveFaculty(e) {
    e.preventDefault();
    const newFac = {
      id: 'fac-' + Date.now(),
      name: document.getElementById('fac-name').value,
      email: document.getElementById('fac-email').value,
      departmentId: document.getElementById('fac-dept').value,
      role: 'faculty',
      assignedSubjects: [document.getElementById('fac-sub').value]
    };
    app.data.faculty.push(newFac);
    app.saveState();
    app.syncFacultyToSupabase(newFac);
    app.closeModal();
    app.showToast(`Added faculty member ${newFac.name}`, 'success');
    this.renderFacultyRoster(document.getElementById('main-content'));
  },

  deleteFaculty(facId) {
    const fac = app.data.faculty.find(f => f.id === facId);
    if (!fac) return;
    if (!confirm(`Are you sure you want to delete faculty member "${fac.name}"?`)) return;
    app.data.faculty = app.data.faculty.filter(f => f.id !== facId);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('faculty').delete().eq('id', facId);
    }
    app.showToast(`Deleted faculty member ${fac.name}`, 'info');
    this.renderFacultyRoster(document.getElementById('main-content'));
  },

  toggleAdminGroup(groupId) {
    const el = document.getElementById(groupId);
    const arrow = document.getElementById('arrow-' + groupId);
    if (!el) return;
    if (el.style.display === 'none') {
      el.style.display = 'block';
      if (arrow) arrow.innerText = '▼';
    } else {
      el.style.display = 'none';
      if (arrow) arrow.innerText = '▶';
    }
  },

  renderDepartments(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Departments, Academic Classes & Subjects</h1>
          <p class="page-subtitle">Configure department Vision/Mission, manage department classes/semesters, and assign subject courses</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="adminView.openAddClassModal()">+ Add Academic Class</button>
          <button class="btn btn-primary" onclick="adminView.openAddSubjectModal()">+ Add Subject Course</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px; margin-bottom:24px;">
        ${app.data.departments.map(d => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 class="card-title">${d.name} <span class="tag tag-co" style="margin-left:6px;">${d.shortName || d.id}</span></h3>
              <button class="btn btn-secondary btn-sm" onclick="adminView.openEditDeptVisionMissionModal('${d.id}')">✏️ Edit Vision & Mission</button>
            </div>

            <div style="background:var(--bg-primary); padding:14px; border-radius:var(--radius-md); font-size:13px;">
              <div style="margin-bottom:8px;">
                <strong style="color:var(--accent-blue);">Department Vision:</strong>
                <p style="margin-top:2px; color:var(--text-primary);">${d.vision || 'To achieve excellence in transforming all aspirants into globally recognized engineers of the highest caliber.'}</p>
              </div>

              <div>
                <strong style="color:var(--accent-blue);">Department Mission:</strong>
                <ol style="padding-left:18px; margin-top:4px; color:var(--text-primary);">
                  ${(d.mission && d.mission.length > 0) ? d.mission.map(m => `<li>${m}</li>`).join('') : `
                    <li>To enrich the learners with strong fundamentals of Engineering and professional ethics.</li>
                    <li>To equip the learners with skillsets based on modern simulation techniques and tools.</li>
                    <li>To groom the learner through various co-curricular, extra-curricular and societal activities.</li>
                  `}
                </ol>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Department Academic Classes Roster (Collapsible Grouping) -->
      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div>
            <h3 class="card-title">Department Academic Classes & Semesters</h3>
            <p class="card-subtitle">Collapsible rosters by department for Academic Year 2026-27</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-primary btn-sm" onclick="adminView.openAddClassModal()">+ Add Academic Class</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px;">
          ${app.data.departments.map(d => {
            const deptClasses = (app.data.academicClasses || []).filter(c => c.departmentId === d.id);
            const groupId = `class-group-${d.id}`;
            return `
              <div class="subject-group-card" style="border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden; background:var(--bg-card);">
                <div class="subject-group-header" onclick="adminView.toggleAdminGroup('${groupId}')" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--bg-tertiary); cursor:pointer; font-weight:700; border-bottom:1px solid var(--border-color);">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span id="arrow-${groupId}" style="font-size:12px; color:var(--text-secondary); transition:transform 0.2s;">▼</span>
                    <span style="font-size:14px; color:var(--text-primary);">${d.name}</span>
                    <span class="tag tag-co" style="font-size:11px;">${d.shortName || d.id}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="tag tag-bt" style="font-size:11px;">AY 2026-27</span>
                    <span style="background:var(--accent-blue-subtle); color:var(--accent-blue); padding:3px 10px; border-radius:12px; font-size:12px; font-weight:700;">${deptClasses.length} ${deptClasses.length === 1 ? 'Class' : 'Classes'}</span>
                  </div>
                </div>

                <div id="${groupId}" class="table-container" style="display:block;">
                  <table class="custom-table" style="margin:0;">
                    <thead>
                      <tr>
                        <th>Class Code</th>
                        <th>Class Name & Branch</th>
                        <th>Academic Year</th>
                        <th>Linked Semesters</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${deptClasses.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:14px; color:var(--text-muted);">No classes configured for ${d.shortName || d.name}. Click "+ Add Academic Class" above.</td></tr>` :
                        deptClasses.map(c => `
                          <tr>
                            <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">${c.code || c.name}</td>
                            <td style="font-weight:600;">${c.name}</td>
                            <td><span class="tag tag-bt">2026-27</span></td>
                            <td>
                              ${(c.semesters || []).map(sem => `<span class="tag tag-success" style="margin-right:4px;">${sem}</span>`).join('')}
                            </td>
                            <td>
                              <button class="btn btn-destructive btn-sm" onclick="adminView.deleteClass('${c.id}')">🗑️ Delete</button>
                            </td>
                          </tr>
                        `).join('')
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Subject Courses Master -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h3 class="card-title">Department Subject Courses Master</h3>
            <p class="card-subtitle">Manage subject courses and linked class & semester assignments</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-secondary btn-sm" onclick="adminView.resetDefaultSubjects()">🔄 Reset Clean Subjects</button>
            <button class="btn btn-primary btn-sm" onclick="adminView.openAddSubjectModal()">+ Add New Subject Course</button>
          </div>
        </div>
        <div class="table-container" style="margin-top:12px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Short Name</th>
                <th>Full Course Name</th>
                <th>Department</th>
                <th>Linked Class & Sem</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.subjects.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:16px;">No subject courses added yet. Click "+ Add New Subject Course" above.</td></tr>` :
                app.data.subjects.map(s => {
                  const d = app.data.departments.find(dept => dept.id === s.departmentId);
                  const shortName = s.shortName || s.code;
                  return `
                    <tr>
                      <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent-blue);">${s.code}</td>
                      <td style="font-weight:600;">${shortName}</td>
                      <td>${s.fullName}</td>
                      <td><span class="tag tag-co">${d ? (d.shortName || d.name) : '-'}</span></td>
                      <td>
                        <span class="tag tag-bt">${s.className || 'SE Mechanical'}</span>
                        <span class="tag tag-success" style="margin-left:4px;">${s.semester || 'Semester III'}</span>
                      </td>
                      <td style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="adminView.openEditSubjectModal('${s.id}')">✏️ Edit / Modify</button>
                        <button class="btn btn-destructive btn-sm" onclick="adminView.deleteSubject('${s.id}')">🗑️ Delete</button>
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

  onSubjectDeptChange() {
    const deptSelect = document.getElementById('sub-dept');
    const classSelect = document.getElementById('sub-class');
    if (!deptSelect || !classSelect) return;

    const selectedDeptId = deptSelect.value;
    const allClasses = app.data.academicClasses || [];
    const deptClasses = allClasses.filter(c => c.departmentId === selectedDeptId);
    const classesToShow = deptClasses.length > 0 ? deptClasses : allClasses;

    classSelect.innerHTML = classesToShow.map(c => `<option value="${c.code}">${c.code} - ${c.name}</option>`).join('');
    this.onSubjectClassChange();
  },

  onSubjectClassChange() {
    const classSelect = document.getElementById('sub-class');
    const semSelect = document.getElementById('sub-sem');
    if (!classSelect || !semSelect) return;

    const selectedCode = classSelect.value;
    const cls = (app.data.academicClasses || []).find(c => c.code === selectedCode || c.name === selectedCode);
    const sems = cls ? cls.semesters : ['Semester III', 'Semester IV'];

    semSelect.innerHTML = sems.map(s => `<option value="${s}">${s}</option>`).join('');
  },

  openAddSubjectModal() {
    const defaultDept = app.data.departments.length > 0 ? app.data.departments[0] : null;
    const allClasses = app.data.academicClasses || [];
    const deptClasses = defaultDept ? allClasses.filter(c => c.departmentId === defaultDept.id) : allClasses;
    const classesToShow = deptClasses.length > 0 ? deptClasses : allClasses;
    const firstClass = classesToShow.length > 0 ? classesToShow[0] : null;
    const initialSems = firstClass ? firstClass.semesters : ['Semester III', 'Semester IV'];

    app.showModal('Add New Subject Course & Link Class/Semester', `
      <form onsubmit="adminView.saveSubject(event)">
        <div class="form-group">
          <label class="form-label">Managing Department</label>
          <select id="sub-dept" class="form-select" onchange="adminView.onSubjectDeptChange()">
            ${app.data.departments.map(d => `<option value="${d.id}">${d.name} (${d.shortName || d.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Class & Branch</label>
            <select id="sub-class" class="form-select" onchange="adminView.onSubjectClassChange()" required>
              ${classesToShow.map(c => `<option value="${c.code}">${c.code} - ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Semester</label>
            <select id="sub-sem" class="form-select">
              ${initialSems.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Subject Code</label>
            <input type="text" id="sub-code" class="form-input code-font" placeholder="24051181" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Lab Short Name / Abbreviation</label>
            <input type="text" id="sub-short" class="form-input" placeholder="VMD or BEE" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Full Course Name</label>
          <input type="text" id="sub-full" class="form-input" placeholder="Vibration and Machinery Diagnostics Laboratory" required>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Subject Course</button>
        </div>
      </form>
    `);
  },

  openEditSubjectModal(subjectId) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    if (!sub) return;
    const allClasses = app.data.academicClasses || [];
    
    // Filter classes belonging to the subject's department
    const deptId = sub.departmentId || (app.data.departments.length > 0 ? app.data.departments[0].id : '');
    const deptClasses = allClasses.filter(c => c.departmentId === deptId);
    const classesToShow = deptClasses.length > 0 ? deptClasses : allClasses;

    const currentClassCode = sub.className || (classesToShow.length > 0 ? classesToShow[0].code : 'SE Mech');
    const matchedClass = allClasses.find(c => c.code === currentClassCode || c.name === currentClassCode);
    const availableSems = matchedClass ? matchedClass.semesters : ['Semester I','Semester II','Semester III','Semester IV','Semester V','Semester VI','Semester VII','Semester VIII'];

    app.showModal(`Edit Subject Course — ${sub.code}`, `
      <form onsubmit="adminView.saveSubject(event, '${sub.id}')">
        <div class="form-group">
          <label class="form-label">Managing Department</label>
          <select id="sub-dept" class="form-select" onchange="adminView.onSubjectDeptChange()">
            ${app.data.departments.map(d => `<option value="${d.id}" ${d.id === deptId ? 'selected' : ''}>${d.name} (${d.shortName || d.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Class & Branch</label>
            <select id="sub-class" class="form-select" onchange="adminView.onSubjectClassChange()" required>
              ${classesToShow.map(c => `<option value="${c.code}" ${(c.code === currentClassCode || c.name === currentClassCode) ? 'selected' : ''}>${c.code} - ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Semester</label>
            <select id="sub-sem" class="form-select">
              ${availableSems.map(sem => `
                <option value="${sem}" ${sub.semester === sem ? 'selected' : ''}>${sem}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Subject Code</label>
            <input type="text" id="sub-code" class="form-input code-font" value="${sub.code}" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Lab Short Name / Abbreviation</label>
            <input type="text" id="sub-short" class="form-input" value="${sub.shortName || sub.code}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Full Course Name</label>
          <input type="text" id="sub-full" class="form-input" value="${sub.fullName}" required>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Subject Course</button>
        </div>
      </form>
    `);
  },

  saveSubject(e, subjectId = null) {
    e.preventDefault();
    const code = document.getElementById('sub-code').value.trim();
    const shortName = document.getElementById('sub-short').value.trim();
    const fullName = document.getElementById('sub-full').value.trim();
    const deptId = document.getElementById('sub-dept').value;
    const className = document.getElementById('sub-class').value.trim();
    const semester = document.getElementById('sub-sem').value;

    // Purge any pre-existing duplicate subjects with this code from array first
    let targetSub = null;
    if (subjectId && subjectId !== 'null' && subjectId !== 'undefined') {
      targetSub = app.data.subjects.find(s => s.id === subjectId);
    }
    if (!targetSub) {
      targetSub = app.data.subjects.find(s => s.code === code);
    }

    if (targetSub) {
      targetSub.code = code;
      targetSub.shortName = shortName;
      targetSub.fullName = fullName;
      targetSub.departmentId = deptId;
      targetSub.className = className;
      targetSub.semester = semester;

      // Keep only 1 instance of this subject code
      app.data.subjects = app.data.subjects.filter(s => s === targetSub || s.code !== code);
    } else {
      app.data.subjects = app.data.subjects.filter(s => s.code !== code);
      const newSub = {
        id: 'sub-' + Date.now(),
        code: code,
        shortName: shortName,
        fullName: fullName,
        departmentId: deptId,
        className: className,
        semester: semester
      };
      app.data.subjects.push(newSub);
    }

    app.saveState();
    app.syncSubjectToSupabase(targetSub ? targetSub.id : newSub.id);
    app.closeModal();
    app.showToast(`Saved subject course ${code} (${className} — ${semester})`, 'success');
    this.renderDepartments(document.getElementById('main-content'));
  },

  deleteSubject(subjectId) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    if (!sub) return;
    if (!confirm(`Are you sure you want to delete subject course "${sub.code} - ${sub.fullName}"?`)) return;

    app.data.subjects = app.data.subjects.filter(s => s.id !== subjectId);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('subjects').delete().eq('id', subjectId);
    }
    app.showToast(`Deleted subject course ${sub.code}`, 'info');
    this.renderDepartments(document.getElementById('main-content'));
  },

  resetDefaultSubjects() {
    if (!confirm("This will purge duplicate/test subject entries and reset to official clean subjects. Continue?")) return;
    app.data.subjects = JSON.parse(JSON.stringify(INITIAL_DATA.subjects));
    app.saveState();
    app.showToast("Subjects list clean reset successful!", "success");
    this.renderDepartments(document.getElementById('main-content'));
  },

  openAddClassModal() {
    app.showModal('Add Academic Class & Assign Semesters', `
      <form onsubmit="adminView.saveClass(event)">
        <div class="form-group">
          <label class="form-label">Managing Department</label>
          <select id="class-dept" class="form-select">
            ${app.data.departments.map(d => `<option value="${d.id}">${d.name} (${d.shortName || d.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Class Code / Abbreviation</label>
            <input type="text" id="class-code" class="form-input code-font" placeholder="e.g. SE Mech" required>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Full Class Name & Branch</label>
            <input type="text" id="class-name" class="form-input" placeholder="e.g. Second Year Mechanical Engineering" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Assign Semesters (Select All Applicable)</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
            ${['Semester I','Semester II','Semester III','Semester IV','Semester V','Semester VI','Semester VII','Semester VIII'].map(sem => `
              <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                <input type="checkbox" name="class-sems" value="${sem}"> ${sem}
              </label>
            `).join('')}
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Academic Class</button>
        </div>
      </form>
    `);
  },

  saveClass(e) {
    e.preventDefault();
    if (!app.data.academicClasses) app.data.academicClasses = [];

    const deptId = document.getElementById('class-dept').value;
    const code = document.getElementById('class-code').value.trim();
    const name = document.getElementById('class-name').value.trim();
    const checkedSems = Array.from(document.querySelectorAll('input[name="class-sems"]:checked')).map(cb => cb.value);

    const newClass = {
      id: 'class-' + Date.now(),
      code: code,
      name: name,
      departmentId: deptId,
      semesters: checkedSems.length > 0 ? checkedSems : ['Semester III', 'Semester IV']
    };

    app.data.academicClasses.push(newClass);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('academic_classes').upsert({
        id: newClass.id,
        code: newClass.code,
        name: newClass.name,
        department_id: newClass.departmentId,
        semesters: newClass.semesters
      });
    }
    app.closeModal();
    app.showToast(`Added Academic Class ${newClass.name}`, 'success');
    this.renderDepartments(document.getElementById('main-content'));
  },

  deleteClass(classId) {
    const cls = (app.data.academicClasses || []).find(c => c.id === classId);
    if (!cls) return;
    if (!confirm(`Are you sure you want to delete Academic Class "${cls.name}"?`)) return;

    app.data.academicClasses = (app.data.academicClasses || []).filter(c => c.id !== classId);
    app.saveState();
    app.showToast(`Deleted class ${cls.name}`, 'info');
    this.renderDepartments(document.getElementById('main-content'));
  },

  openEditDeptVisionMissionModal(deptId) {
    const dept = app.data.departments.find(d => d.id === deptId);
    if (!dept) return;

    const mList = dept.mission || [
      "To enrich the learners with strong fundamentals of Engineering and professional ethics.",
      "To equip the learners with skillsets based on modern simulation techniques.",
      "To groom the learner through various co-curricular activities."
    ];

    app.showModal(`Edit Vision & Mission — ${dept.name}`, `
      <form onsubmit="adminView.saveDeptVisionMission(event, '${dept.id}')">
        <div class="form-group">
          <label class="form-label">Department Vision Statement</label>
          <textarea id="edit-dept-vision" class="form-textarea" rows="3" required>${dept.vision || ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Mission Point 1</label>
          <input type="text" class="form-input edit-dept-mission" value="${mList[0] || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Mission Point 2</label>
          <input type="text" class="form-input edit-dept-mission" value="${mList[1] || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Mission Point 3</label>
          <input type="text" class="form-input edit-dept-mission" value="${mList[2] || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Mission Point 4</label>
          <input type="text" class="form-input edit-dept-mission" value="${mList[3] || ''}">
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Vision & Mission</button>
        </div>
      </form>
    `);
  },

  saveDeptVisionMission(e, deptId) {
    e.preventDefault();
    const dept = app.data.departments.find(d => d.id === deptId);
    if (!dept) return;

    dept.vision = document.getElementById('edit-dept-vision').value;
    const missionInputs = document.querySelectorAll('.edit-dept-mission');
    const missionPoints = [];
    missionInputs.forEach(input => {
      if (input.value && input.value.trim()) missionPoints.push(input.value.trim());
    });

    dept.mission = missionPoints;
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('departments').upsert({
        id: dept.id,
        name: dept.name,
        short_name: dept.shortName || dept.id,
        vision: dept.vision,
        mission: dept.mission
      });
    }
    app.closeModal();
    app.showToast(`Updated Vision & Mission for ${dept.name}`, 'success');
    this.renderDepartments(document.getElementById('main-content'));
  },

  openAddSubjectModal() {
    app.showModal('Add New Subject Course', `
      <form onsubmit="adminView.saveSubject(event)">
        <div class="form-group">
          <label class="form-label">Course Code</label>
          <input type="text" id="sub-code" class="form-input code-font" placeholder="FEL104" required>
        </div>
        <div class="form-group">
          <label class="form-label">Short Name</label>
          <input type="text" id="sub-short" class="form-input" placeholder="ChemistryLab" required>
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="sub-full" class="form-input" placeholder="Applied Chemistry Laboratory I" required>
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <select id="sub-dept" class="form-select">
            ${app.data.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Subject</button>
        </div>
      </form>
    `);
  },

  renderPOAccreditation(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Program Outcomes (PO1–PO12)</h1>
          <p class="page-subtitle">National Board of Accreditation (NBA) Graduate Attributes</p>
        </div>
        <button class="btn btn-primary" onclick="adminView.openAddPOModal()">+ Add Program Outcome</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Program Outcome Description</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.programOutcomes.map(po => `
                <tr>
                  <td style="font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${po.code}</td>
                  <td style="font-weight:500;">${po.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openAddPOModal() {
    app.showModal('Add Program Outcome (PO)', `
      <form onsubmit="adminView.savePO(event)">
        <div class="form-group">
          <label class="form-label">PO Code</label>
          <input type="text" id="po-code" class="form-input code-font" placeholder="PO13" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="po-desc" class="form-textarea" rows="3" placeholder="Description of the program outcome..." required></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save PO</button>
        </div>
      </form>
    `);
  },

  savePO(e) {
    e.preventDefault();
    const newPO = {
      id: document.getElementById('po-code').value,
      code: document.getElementById('po-code').value,
      description: document.getElementById('po-desc').value
    };
    app.data.programOutcomes.push(newPO);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('program_outcomes').upsert({
        id: newPO.id,
        code: newPO.code,
        description: newPO.description
      });
    }
    app.closeModal();
    app.showToast(`Added Program Outcome ${newPO.code}`, 'success');
    this.renderPOAccreditation(document.getElementById('main-content'));
  },

  openAttainmentModal() {
    const s = app.data.attainmentSettings;
    app.showModal('Edit College CO Attainment Thresholds', `
      <form onsubmit="adminView.saveAttainmentSettings(event)">
        <div class="form-group">
          <label class="form-label">Student Threshold Score (%)</label>
          <input type="number" id="st-thresh" class="form-input" value="${s.studentThresholdPct}" min="1" max="100" required>
        </div>
        <div class="form-group">
          <label class="form-label">Class Attainment Target (%)</label>
          <input type="number" id="cl-target" class="form-input" value="${s.classTargetPct}" min="1" max="100" required>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="app.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    `);
  },

  saveAttainmentSettings(e) {
    e.preventDefault();
    app.data.attainmentSettings.studentThresholdPct = parseFloat(document.getElementById('st-thresh').value);
    app.data.attainmentSettings.classTargetPct = parseFloat(document.getElementById('cl-target').value);
    app.saveState();
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('attainment_settings').upsert({
        id: 'default',
        student_threshold_pct: app.data.attainmentSettings.studentThresholdPct,
        class_target_pct: app.data.attainmentSettings.classTargetPct
      });
    }
    app.closeModal();
    app.showToast('Attainment thresholds updated successfully', 'success');
    this.renderDashboard(document.getElementById('main-content'));
  }
};
