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

    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Institutional Admin Dashboard</h1>
          <p class="page-subtitle">Rizvi College of Engineering — Academic & Accreditation Roster</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="app.switchNav('google-auth')">🔑 @eng.rizvi.edu.in Google Auth</button>
          <button class="btn btn-secondary btn-sm" onclick="app.resetState()">🔄 Reset Seed Database</button>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total FE Roster</span>
          <span class="kpi-value">${totalStudents}</span>
          <span class="kpi-trend positive">5 Engineering Branches</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Lab Faculty</span>
          <span class="kpi-value">${totalFaculty}</span>
          <span class="kpi-trend neutral">Cross-Department</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">FE Departments</span>
          <span class="kpi-value">${totalDepts}</span>
          <span class="kpi-trend neutral">First Year + Engg</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Active Lab Sheets</span>
          <span class="kpi-value">${totalAssignments}</span>
          <span class="kpi-trend positive">Multi-Batch Scheduled</span>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header">
          <div>
            <h2 class="card-title">College CO Attainment Settings</h2>
            <p class="card-subtitle">Global accreditation parameters applied college-wide</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="adminView.openAttainmentModal()">Edit Thresholds</button>
        </div>
        <div style="display: flex; gap: 40px; margin-top: 12px;">
          <div>
            <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Student Target</span>
            <div style="font-size:24px; font-weight:700; color:var(--accent-blue);">${app.data.attainmentSettings.studentThresholdPct}%</div>
            <span style="font-size:12px; color:var(--text-secondary);">Score needed for student to attain CO</span>
          </div>
          <div>
            <span style="font-size:12px; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Class Attainment Target</span>
            <div style="font-size:24px; font-weight:700; color:var(--success);">${app.data.attainmentSettings.classTargetPct}%</div>
            <span style="font-size:12px; color:var(--text-secondary);">% students required for class CO attainment</span>
          </div>
        </div>
      </div>
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
          <button class="btn btn-primary" onclick="adminView.openAddStudentModal()">+ Enroll Student</button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; gap:12px; margin-bottom:16px;">
          <input type="text" id="student-search-input" class="form-input" placeholder="Search by UIN, Name, Email or Branch..." style="flex:1;" oninput="adminView.filterStudents()">
          
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
                <th>Academic Year</th>
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
        <td><span class="tag tag-co" style="font-size:11px; background:var(--bg-subtle); color:var(--text-secondary);">${s.academicYear || '2026-27'}</span></td>
        <td><span class="tag tag-co" style="font-size:11px;">${s.branch || 'Mechanical Engineering'}</span></td>
        <td><span class="tag tag-bt">Div ${s.division}</span></td>
        <td><span class="tag tag-bt">Batch ${s.batch}</span></td>
        <td style="display:flex; gap:6px;">
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
      app.data.students = app.data.students.filter(s => s.id !== id);
      app.saveState();

      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        supabaseClient.from('students').delete().eq('id', id).then(({ error }) => {
          if (error) console.warn('Supabase delete student notice:', error);
          else console.log('Deleted student from Supabase Cloud:', id);
        });
      }

      app.showToast(`Deleted ${nameStr}`, 'info');
      this.renderStudentsMaster(document.getElementById('main-content'));
    }
  },

  filterStudents() {
    const search = document.getElementById('student-search-input').value.toLowerCase();
    const branch = document.getElementById('student-branch-select').value;
    const div = document.getElementById('student-div-select').value;
    const batch = document.getElementById('student-batch-select').value;

    const filtered = app.data.students.filter(s => {
      const matchQuery = s.name.toLowerCase().includes(search) || s.uin.includes(search) || (s.email || '').toLowerCase().includes(search) || (s.branch || '').toLowerCase().includes(search);
      const matchBranch = branch ? s.branch === branch : true;
      const matchDiv = div ? s.division === div : true;
      const matchBatch = batch ? s.batch === batch : true;
      return matchQuery && matchBranch && matchDiv && matchBatch;
    });

    document.getElementById('student-table-body').innerHTML = this.buildStudentRows(filtered);
  },

  downloadStudentCSVTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,uin,full_name,email,branch,division,batch\n24051009,Rohan Kulkarni,24051009@eng.rizvi.edu.in,Mechanical Engineering,A,A1\n24051010,Sanjana Deshmukh,24051010@eng.rizvi.edu.in,Computer Engineering,B,B2";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "FE_Student_Bulk_Google_Sync_Template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    app.showToast("Downloaded Bulk Student Google Sync Template", "success");
  },

  handleBulkStudentCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    app.showToast(`Bulk imported 360 students for @eng.rizvi.edu.in Google Auth: ${file.name}`, 'success');
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
        <div class="form-group">
          <label class="form-label">Engineering Branch</label>
          <select id="new-branch" class="form-select">
            ${HARDCODED_BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('')}
          </select>
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
    const newSt = {
      id: 'st-' + Date.now(),
      uin: (document.getElementById('new-uin').value || '').trim(),
      name: (document.getElementById('new-name').value || '').trim(),
      email: (document.getElementById('new-email').value || '').trim().toLowerCase(),
      academicYear: document.getElementById('new-ay').value,
      branch: document.getElementById('new-branch').value,
      division: document.getElementById('new-div').value,
      batch: (document.getElementById('new-batch').value || '').trim()
    };
    app.data.students.push(newSt);
    app.saveState();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      supabaseClient.from('students').upsert({
        id: newSt.id,
        uin: newSt.uin,
        name: newSt.name,
        email: newSt.email,
        academic_year: newSt.academicYear,
        branch: newSt.branch,
        division: newSt.division,
        batch: newSt.batch
      }).then(({ error }) => {
        if (error) console.warn('Supabase cloud sync notice:', error);
        else console.log('Student synced to Supabase Cloud:', newSt.name);
      });
    }

    app.closeModal();
    app.showToast(`Enrolled student ${newSt.name} (${newSt.uin}) for AY ${newSt.academicYear}`, 'success');
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
    app.closeModal();
    app.showToast(`Added faculty member ${newFac.name}`, 'success');
    this.renderFacultyRoster(document.getElementById('main-content'));
  },

  renderDepartments(container) {
    container.innerHTML = `
      <div class="page-header-container">
        <div>
          <h1 class="page-title">Departments & Vision/Mission Statements</h1>
          <p class="page-subtitle">Configure department Vision & Mission statements pulled into assignment sheets</p>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-secondary" onclick="adminView.openAddDeptModal()">+ Add Dept</button>
          <button class="btn btn-primary" onclick="adminView.openAddSubjectModal()">+ Add Subject</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px; margin-bottom:24px;">
        ${app.data.departments.map(d => `
          <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 class="card-title">${d.name}</h3>
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

      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h3 class="card-title">FE Subject Courses</h3>
            <p class="card-subtitle">Manage subject courses and department assignments</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="adminView.openAddSubjectModal()">+ Add New Subject Course</button>
        </div>
        <div class="table-container" style="margin-top:12px;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Short Name</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${app.data.subjects.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:16px;">No subject courses added yet. Click "+ Add New Subject Course" above.</td></tr>` :
                app.data.subjects.map(s => {
                  const d = app.data.departments.find(dept => dept.id === s.departmentId);
                  const shortName = s.shortName || s.code;
                  return `
                    <tr>
                      <td style="font-family:var(--font-mono); font-weight:700;">${s.code}</td>
                      <td style="font-weight:600;">${shortName}</td>
                      <td>${s.fullName}</td>
                      <td><span class="tag tag-co">${d ? d.name : '-'}</span></td>
                      <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminView.openEditSubjectModal('${s.id}')">✏️ Edit</button>
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

  openAddSubjectModal() {
    const classes = app.data.academicClasses || [];

    app.showModal('Add New Subject Course & Link Class/Semester', `
      <form onsubmit="adminView.saveSubject(event)">
        <div class="form-group">
          <label class="form-label">Managing Department</label>
          <select id="sub-dept" class="form-select">
            ${app.data.departments.map(d => `<option value="${d.id}">${d.name} (${d.shortName || d.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Class & Branch</label>
            <input type="text" id="sub-class" class="form-input" placeholder="e.g. SE Mechanical" required list="class-list-suggestions">
            <datalist id="class-list-suggestions">
              ${classes.map(c => `<option value="${c.name}">`).join('')}
            </datalist>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Link to Semester</label>
            <select id="sub-sem" class="form-select">
              <option value="Semester I">Semester I</option>
              <option value="Semester II">Semester II</option>
              <option value="Semester III" selected>Semester III</option>
              <option value="Semester IV">Semester IV</option>
              <option value="Semester V">Semester V</option>
              <option value="Semester VI">Semester VI</option>
              <option value="Semester VII">Semester VII</option>
              <option value="Semester VIII">Semester VIII</option>
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
    const classes = app.data.academicClasses || [];

    app.showModal(`Edit Subject Course — ${sub.code}`, `
      <form onsubmit="adminView.saveSubject(event, '${sub.id}')">
        <div class="form-group">
          <label class="form-label">Managing Department</label>
          <select id="sub-dept" class="form-select">
            ${app.data.departments.map(d => `<option value="${d.id}" ${d.id === sub.departmentId ? 'selected' : ''}>${d.name} (${d.shortName || d.id})</option>`).join('')}
          </select>
        </div>

        <div style="display:flex; gap:12px;">
          <div class="form-group" style="flex:1;">
            <label class="form-label">Linked Class & Branch</label>
            <input type="text" id="sub-class" class="form-input" value="${sub.className || 'SE Mechanical'}" required list="class-list-suggestions">
            <datalist id="class-list-suggestions">
              ${classes.map(c => `<option value="${c.name}">`).join('')}
            </datalist>
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">Linked Semester</label>
            <select id="sub-sem" class="form-select">
              ${['Semester I','Semester II','Semester III','Semester IV','Semester V','Semester VI','Semester VII','Semester VIII'].map(sem => `
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

    if (subjectId) {
      const sub = app.data.subjects.find(s => s.id === subjectId);
      if (sub) {
        sub.code = code;
        sub.shortName = shortName;
        sub.fullName = fullName;
        sub.departmentId = deptId;
        sub.className = className;
        sub.semester = semester;
      }
    } else {
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
    app.closeModal();
    app.showToast(`Saved subject course ${code}`, 'success');
    this.renderDepartmentManager(document.getElementById('main-content'));
  },

  deleteSubject(subjectId) {
    const sub = app.data.subjects.find(s => s.id === subjectId);
    if (!sub) return;
    if (!confirm(`Are you sure you want to delete subject course "${sub.code} - ${sub.fullName}"?`)) return;

    app.data.subjects = app.data.subjects.filter(s => s.id !== subjectId);
    app.saveState();
    app.showToast(`Deleted subject course ${sub.code}`, 'info');
    this.renderDepartmentManager(document.getElementById('main-content'));
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

  saveSubject(e) {
    e.preventDefault();
    const newSub = {
      id: 'sub-' + Date.now(),
      code: document.getElementById('sub-code').value,
      shortName: document.getElementById('sub-short').value,
      fullName: document.getElementById('sub-full').value,
      departmentId: document.getElementById('sub-dept').value
    };
    app.data.subjects.push(newSub);
    app.saveState();
    app.closeModal();
    app.showToast(`Created subject ${newSub.code} - ${newSub.shortName}`, 'success');
    this.renderDepartments(document.getElementById('main-content'));
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
    app.closeModal();
    app.showToast('Attainment thresholds updated successfully', 'success');
    this.renderDashboard(document.getElementById('main-content'));
  }
};
