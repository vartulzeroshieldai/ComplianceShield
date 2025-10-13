# GitHub Personal Access Token Creation Guide

This guide will help you create a read-only GitHub Personal Access Token for testing the Code Inspection tools.

## Step 1: Access GitHub Settings

1. **Sign in to GitHub.com**
2. **Click your profile picture** (top-right corner)
3. **Click "Settings"** from the dropdown menu

## Step 2: Navigate to Developer Settings

1. **Scroll down** in the left sidebar
2. **Click "Developer settings"** (at the bottom of the left menu)
3. **Click "Personal access tokens"**
4. **Click "Tokens (classic)"**

## Step 3: Generate New Token

1. **Click "Generate new token"**
2. **Click "Generate new token (classic)"**

## Step 4: Configure Token Settings

### Basic Information

- **Note**: `Code Inspection Testing Token`
- **Expiration**: `30 days` (recommended for testing)
- **Description**: `Token for testing code inspection tools in privacy detection application`

### Select Scopes (Permissions)

For **read-only access** (recommended for testing):

#### ✅ Required Scopes:

- **`repo`** - Full control of private repositories
  - ✅ `repo:status` - Access commit status
  - ✅ `repo_deployment` - Access deployment status
  - ✅ `public_repo` - Access public repositories
  - ✅ `repo:invite` - Access repository invitations
  - ✅ `security_events` - Read and write security events

#### 🔒 Alternative Minimal Scopes (if you only want public repo access):

- **`public_repo`** - Access public repositories only

### ⚠️ Security Note:

- **Never select `delete_repo`** or other destructive permissions
- **Start with minimal permissions** and add more if needed
- **Use expiration dates** to limit token lifetime

## Step 5: Generate and Save Token

1. **Click "Generate token"** (green button at bottom)
2. **⚠️ IMPORTANT: Copy the token immediately**
   - The token will look like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - You will **NOT** be able to see this token again
3. **Save the token securely:**
   - Use a password manager
   - Store in a secure note
   - **Never commit to code repositories**

## Step 6: Test Your Token

### Test with curl (PowerShell):

```powershell
# Replace YOUR_TOKEN_HERE with your actual token
$token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$headers = @{ "Authorization" = "token $token" }
Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/vscode" -Headers $headers
```

### Test with Python:

```python
import requests

token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
headers = {"Authorization": f"token {token}"}
response = requests.get("https://api.github.com/repos/microsoft/vscode", headers=headers)
print(f"Status: {response.status_code}")
print(f"Repository: {response.json()['name']}")
```

## Step 7: Use Token in Your Application

### In the Privacy Detection UI:

1. **Go to Privacy Detection** → **Code Inspection**
2. **Enter your repository URL**: `https://github.com/username/repository.git`
3. **Enter your access token**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. **Click "Test Repository Connection"**

### Expected Results:

- ✅ **Success**: "Repository connection successful"
- ❌ **Error**: Check token permissions and repository URL

## Step 8: Security Best Practices

### Token Security:

- ✅ **Use read-only tokens** for testing
- ✅ **Set expiration dates** (30 days max for testing)
- ✅ **Rotate tokens regularly**
- ✅ **Store securely** (password manager)
- ❌ **Never commit tokens** to code
- ❌ **Never share tokens** in plain text
- ❌ **Never use in public repositories**

### Repository Access:

- ✅ **Only scan repositories you own** or have permission to scan
- ✅ **Be aware of rate limits** (5000 requests/hour for authenticated users)
- ✅ **Use appropriate scan scopes**
- ❌ **Don't scan private repositories** without explicit permission

## Step 9: Troubleshooting

### Common Issues:

#### "401 Unauthorized"

- **Check token validity** (not expired)
- **Verify token permissions** (repo scope selected)
- **Ensure token is correctly formatted**

#### "403 Forbidden"

- **Check repository permissions** (private repo access)
- **Verify token has correct scopes**
- **Check rate limits** (too many requests)

#### "404 Not Found"

- **Verify repository URL** is correct
- **Check repository exists** and is accessible
- **Ensure repository is public** or you have access

### Token Management:

```powershell
# Check token validity
$token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$headers = @{ "Authorization" = "token $token" }
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    Write-Host "Token is valid for user: $($response.login)"
} catch {
    Write-Host "Token is invalid or expired: $($_.Exception.Message)"
}
```

## Step 10: Token Lifecycle

### Regular Maintenance:

- **Monitor token usage** in GitHub settings
- **Rotate tokens** every 30-90 days
- **Revoke unused tokens** immediately
- **Update application** when tokens change

### Revoking Tokens:

1. Go to **Settings** → **Developer settings** → **Personal access tokens**
2. Find your token in the list
3. Click **"Delete"** to revoke
4. **Update your application** with new token

## Example Token Usage in Code

### Python Example:

```python
import requests
from privacy_detection.code_inspection_scanner import CodeInspectionScanner

# Your token
token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
repo_url = "https://github.com/username/repository.git"

# Test connection
scanner = CodeInspectionScanner()
result = scanner.test_repository_connection(repo_url, token)

if result["status"] == "success":
    print("✅ Repository connection successful!")
    print(f"Repository: {result['repository']['name']}")
else:
    print(f"❌ Connection failed: {result['message']}")
```

### JavaScript Example:

```javascript
// Test token with fetch
const token = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const headers = {
  Authorization: `token ${token}`,
  Accept: "application/vnd.github.v3+json",
};

fetch("https://api.github.com/user", { headers })
  .then((response) => response.json())
  .then((data) => console.log("Token valid for:", data.login))
  .catch((error) => console.error("Token invalid:", error));
```

---

## Summary

1. ✅ **Create token** with read-only permissions
2. ✅ **Test token** with API calls
3. ✅ **Use in application** for repository scanning
4. ✅ **Monitor and rotate** regularly
5. ✅ **Follow security best practices**

Your token should now work with the Code Inspection tools in your Privacy Detection application!
