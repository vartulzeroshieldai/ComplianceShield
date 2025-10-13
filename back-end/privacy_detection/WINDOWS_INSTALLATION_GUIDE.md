# Windows Installation Guide for Code Inspection Tools

This guide will help you install GitSecrets, TruffleHog, and GitLeaks on Windows 10/11.

## Prerequisites

- ✅ Python 3.12.7 (Already installed)
- ✅ Git 2.48.1 (Already installed)
- Windows 10/11
- PowerShell or Command Prompt

## 1. GitSecrets Installation

GitSecrets is primarily designed for Unix systems, but we can use it on Windows.

### Option A: Using Git Bash (Recommended)

1. **Download GitSecrets:**

   ```bash
   # Open Git Bash and run:
   curl -o git-secrets https://raw.githubusercontent.com/awslabs/git-secrets/master/git-secrets
   chmod +x git-secrets
   ```

2. **Install to system PATH:**
   ```bash
   # Move to a directory in your PATH
   sudo mv git-secrets /usr/local/bin/
   ```

### Option B: Using PowerShell (Alternative)

1. **Download using PowerShell:**

   ```powershell
   # Open PowerShell as Administrator
   Invoke-WebRequest -Uri "https://raw.githubusercontent.com/awslabs/git-secrets/master/git-secrets" -OutFile "git-secrets"
   ```

2. **Add to PATH:**
   ```powershell
   # Copy to a directory in your PATH
   Copy-Item "git-secrets" "C:\Windows\System32\git-secrets"
   ```

## 2. TruffleHog Installation

TruffleHog has excellent Windows support.

### Method 1: Using pip (Recommended)

```powershell
# Install TruffleHog
pip install truffleHog3
```

### Method 2: Using Chocolatey

```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install TruffleHog
choco install trufflehog
```

### Method 3: Download Binary

1. Go to: https://github.com/trufflesecurity/trufflehog/releases
2. Download the latest Windows binary
3. Extract and add to PATH

## 3. GitLeaks Installation

GitLeaks has excellent Windows support.

### Method 1: Using Chocolatey

```powershell
choco install gitleaks
```

### Method 2: Using Scoop

```powershell
# Install Scoop first (if not installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install GitLeaks
scoop install gitleaks
```

### Method 3: Download Binary

1. Go to: https://github.com/gitleaks/gitleaks/releases
2. Download the latest Windows binary
3. Extract and add to PATH

## 4. Verification

After installation, verify all tools are working:

```powershell
# Check GitSecrets
git-secrets --version

# Check TruffleHog
trufflehog --version

# Check GitLeaks
gitleaks version
```

## 5. GitHub Token Creation

### Step 1: Create a Personal Access Token

1. Go to GitHub.com and sign in
2. Click your profile picture → Settings
3. Scroll down to "Developer settings" (left sidebar)
4. Click "Personal access tokens" → "Tokens (classic)"
5. Click "Generate new token" → "Generate new token (classic)"

### Step 2: Configure Token Permissions

For **read-only access** (recommended for testing):

**Select scopes:**

- ✅ `repo` (Full control of private repositories)
  - ✅ `repo:status` (Access commit status)
  - ✅ `repo_deployment` (Access deployment status)
  - ✅ `public_repo` (Access public repositories)
  - ✅ `repo:invite` (Access repository invitations)
  - ✅ `security_events` (Read and write security events)

**OR for minimal access:**

- ✅ `public_repo` (Access public repositories only)

### Step 3: Generate and Save Token

1. Click "Generate token"
2. **Copy the token immediately** (you won't see it again)
3. Save it securely (password manager recommended)

### Step 4: Test Token

```powershell
# Test with a public repository
curl -H "Authorization: token YOUR_TOKEN_HERE" https://api.github.com/repos/microsoft/vscode
```

## 6. Testing the Tools

### Test GitSecrets

```bash
# In Git Bash
git clone https://github.com/awslabs/git-secrets.git test-repo
cd test-repo
git-secrets --scan
```

### Test TruffleHog

```powershell
# Scan a repository
trufflehog filesystem . --json
```

### Test GitLeaks

```powershell
# Scan current directory
gitleaks detect --source . --report-format json
```

## 7. Integration with Your Application

Once installed, your Django application will automatically detect these tools and use them instead of mock mode.

### Update Code Inspection Scanner

The scanner will automatically detect the tools:

```python
# The scanner checks for tool availability
result = subprocess.run(["git-secrets", "--version"], capture_output=True, text=True)
if result.returncode == 0:
    # Tool is available, use real scanning
else:
    # Tool not available, use mock mode
```

## 8. Troubleshooting

### Common Issues

1. **"command not found" errors:**

   - Ensure tools are in your PATH
   - Restart your terminal/IDE after installation

2. **Permission errors:**

   - Run PowerShell as Administrator
   - Check file permissions

3. **GitHub API rate limits:**
   - Use the personal access token
   - Consider using a different token for testing

### PATH Configuration

If tools aren't found, add them to your PATH:

```powershell
# Add to PATH permanently
$env:PATH += ";C:\path\to\your\tools"
[Environment]::SetEnvironmentVariable("PATH", $env:PATH, [EnvironmentVariableTarget]::User)
```

## 9. Security Best Practices

1. **Token Security:**

   - Use read-only tokens for testing
   - Set expiration dates
   - Rotate tokens regularly
   - Never commit tokens to code

2. **Tool Usage:**
   - Only scan repositories you own or have permission to scan
   - Be aware of rate limits
   - Use appropriate scan scopes

## 10. Next Steps

After installation:

1. Test each tool individually
2. Create a test repository with some secrets
3. Run scans to verify functionality
4. Update your Django application to use real tools instead of mock mode

## Support

If you encounter issues:

1. Check the official documentation for each tool
2. Verify your PATH configuration
3. Test with simple commands first
4. Check Windows Defender/antivirus settings

---

**Note:** This guide assumes you have administrative privileges on your Windows machine. Some installations may require administrator access.
