# 🚀 Rizvi College of Engineering - First Year Assignment Portal

A specialized, high-fidelity web application for **Rizvi College of Engineering (First Year & Core Engineering Labs)** featuring personalized variable assignment sheets, multi-parameter auto-grading, dynamic institutional canvas rendering, and `@eng.rizvi.edu.in` Google Workspace OAuth domain restriction.

---

## 🔒 Strict Google Auth Whitelist Policy (No Unlisted Logins Allowed)

### 1. Single Dual Admin & Faculty Master Account
The portal enforces a single hardcoded master admin & dual-role account:
- **`jugaljagtap@eng.rizvi.edu.in`**: Prof. Jugal Jagtap — Full Institutional Admin & Faculty Lab access with built-in **Profile Switcher Toggle** (`⚡ Admin View` $\leftrightarrow$ `👨‍🏫 Faculty View`).

### 2. Strict Whitelist Enforcement Logic
Even if an email belongs to `@eng.rizvi.edu.in`, **login is strictly denied** if the email is not explicitly pre-enrolled in one of the following rosters:
1. **Master Admin List**: `jugaljagtap@eng.rizvi.edu.in`
2. **Faculty Roster**: Pre-imported Faculty CSV.
3. **360 Student Master**: Pre-imported 360 Student UIN CSV.

> ⛔ **UNLISTED ACCOUNT LOGINS ARE DENIED IMMEDIATELY.** No fallback or guest roles are granted.

---

## 📘 Complete Non-Programmer Publishing & Setup Manual

### STEP 1: Create Accounts on External Platforms

#### **1. Supabase Account (Database & Authentication)**
1. Go to [https://supabase.com](https://supabase.com) and click **Start your project**.
2. Sign up using your institutional email or GitHub.
3. Click **New Project**:
   - **Name**: `Rizvi-FE-Portal`
   - **Database Password**: Choose a strong password and save it securely.
   - **Region**: Select `South Asia (Mumbai)` for maximum speed.
4. Once created, go to **Project Settings $\rightarrow$ API** and copy:
   - `Project URL`
   - `anon public key`

#### **2. Google Cloud Console (Google Workspace Auth for `@eng.rizvi.edu.in`)**
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com).
2. Log in using an Admin Google Account for `eng.rizvi.edu.in`.
3. Create a **New Project**: `Rizvi Portal Auth`.
4. Go to **APIs & Services $\rightarrow$ OAuth consent screen**:
   - Select **Internal** (restricts logins strictly to Rizvi College users).
   - App Name: `Rizvi FE Portal`.
   - User Support Email: `jugaljagtap@eng.rizvi.edu.in`.
5. Go to **Credentials $\rightarrow$ Create Credentials $\rightarrow$ OAuth client ID**:
   - Application Type: **Web Application**.
   - Authorized JavaScript origins: `https://your-app.vercel.app` (or `http://localhost:3000` for testing).
   - Authorized redirect URIs: Paste your Supabase OAuth Callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
6. Copy the **Client ID** and **Client Secret**.

#### **3. Link Google OAuth in Supabase**
1. In Supabase, navigate to **Authentication $\rightarrow$ Providers $\rightarrow$ Google**.
2. Enable Google provider.
3. Paste **Client ID** and **Client Secret**.
4. In **Hosted Domain (hd)** field, enter `eng.rizvi.edu.in`.
5. Click **Save**.

#### **4. Vercel Account (Free One-Click Web Publishing)**
1. Go to [https://vercel.com](https://vercel.com) and sign up.
2. Connect your Vercel account to GitHub.
3. Import this project repository and click **Deploy**.
4. Your website is instantly live at `https://rizvi-fe-portal.vercel.app` with free SSL HTTPS security!

---

## 🔍 Production Safe Student Sheet Inspection (Faculty Portal)

- **Production Mode**: When faculty searches for a student in their search bar and clicks **🔍 Read-Only Sheet Inspection**, a dedicated, high-resolution modal opens displaying that student's UIN, branch, division, batch, variable values, and exact substituted question set **WITHOUT logging out or switching the faculty member's active session role**.

---

## 📤 Bulk CSV Onboarding Templates

### 1. Bulk Student Master CSV Template (360 Students)
```csv
uin,full_name,email,branch,division,batch
24051001,Aarav Sharma,24051001@eng.rizvi.edu.in,Mechanical Engineering,A,A1
24051002,Ananya Patel,24051002@eng.rizvi.edu.in,Computer Engineering,A,A1
```

### 2. Bulk Faculty Roster CSV Template
```csv
full_name,email,department_id,role,assigned_subject_codes
Dr. Ramesh Iyer,ramesh.iyer@eng.rizvi.edu.in,dept-fe,faculty,FEL101
Prof. Priya Nair,priya.nair@eng.rizvi.edu.in,dept-mech,faculty,24051181
```

### 3. Double CSV Solution Key Template (2-Row Format)
```csv
parameter_label,Natural Frequency (rad/s),Static Deflection (mm),Damping Ratio
ans_header,ans_Q001_P01,ans_Q001_P02,ans_Q002_P01
24051001,189.74,0.272,0.0017
24051002,164.75,0.361,0.0014
```

---

## 🏛️ Hardcoded Institutional Branches & Departments

### Hardcoded Engineering Branches (5)
1. `Artificial Intelligence & Data Science`
2. `Civil Engineering`
3. `Computer Engineering`
4. `Electronics & Computer Science`
5. `Mechanical Engineering`

### Hardcoded FE & Core Departments (6)
1. `First Year Engineering Department`
2. `Artificial Intelligence & Data Science`
3. `Civil Engineering`
4. `Computer Engineering`
5. `Electronics & Computer Science`
6. `Mechanical Engineering`

---

## 📌 Student Notice & Deduction Policies

### Notice Rendered Above Question Set
> 📌 **IMPORTANT SUBMISSION NOTICE FOR STUDENTS:**
> - **Your data is unique:** The values given in your questions are assigned only to you. Do not share or compare with others.
> - **Portal submission is not enough:** You must also submit your assignment sheets with complete solutions, diagrams, and working to finish your submission.

### Deduction Policy Rules
- **Attempt 1**: 0% Deduction (Full Marks)
- **Attempt 2**: -10% Deduction
- **Attempt 3**: -20% Deduction (Max 3 attempts)
- **Late Penalty**: -10% per day late after batch deadline (Capped at 30% max)
