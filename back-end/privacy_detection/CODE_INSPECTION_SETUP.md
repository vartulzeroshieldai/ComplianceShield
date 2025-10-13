# Code Inspection Setup Guide

This guide explains how to set up the required tools for the Code Inspection feature in the Privacy Detection module.

## Required Tools

The Code Inspection feature integrates with two popular secret scanning tools:

### 1. TruffleHog

TruffleHog finds secrets in your codebase by searching through git history and branches.

**Installation:**

**Using pip:**

```bash
pip install truffleHog
```

**Using Docker:**

```bash
docker pull trufflesecurity/trufflehog
```

**Manual Installation:**

```bash
# Download binary from GitHub releases
wget https://github.com/trufflesecurity/trufflehog/releases/latest/download/trufflehog_3.63.3_linux_amd64.tar.gz
tar -xzf trufflehog_3.63.3_linux_amd64.tar.gz
sudo mv trufflehog /usr/local/bin/
```

### 2. GitLeaks

GitLeaks is a fast, light-weight, portable solution for detecting secrets, passwords, and other sensitive data in git repositories.

**Installation:**

**Ubuntu/Debian:**

```bash
sudo apt-get install gitleaks
```

**macOS:**

```bash
brew install gitleaks
```

**Using Docker:**

```bash
docker pull zricethezav/gitleaks
```

**Manual Installation:**

```bash
# Download binary from GitHub releases
wget https://github.com/zricethezav/gitleaks/releases/latest/download/gitleaks_8.18.0_linux_x64.tar.gz
tar -xzf gitleaks_8.18.0_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

## Verification

After installation, verify that all tools are working:

```bash
# Check TruffleHog
trufflehog --version

# Check GitLeaks
gitleaks version
```

## Usage

Once the tools are installed, the Code Inspection feature will automatically detect and use them. If a tool is not installed, the system will return a "not_installed" status with appropriate messaging.

## API Endpoints

The following API endpoints are available for code inspection:

- `POST /api/privacy-detection/test-repository-connection/` - Test repository connection
- `POST /api/privacy-detection/truffle-scan/` - Run TruffleHog scan
- `POST /api/privacy-detection/gitleaks-scan/` - Run GitLeaks scan

## Request Format

All scan endpoints expect the following JSON payload:

```json
{
  "repository_url": "https://github.com/username/repository",
  "access_token": "your_access_token_here"
}
```

## Response Format

All scan endpoints return results in the following format:

```json
{
  "tool": "ToolName",
  "status": "completed|error|not_installed",
  "total_findings": 0,
  "secrets_found": 0,
  "findings": [],
  "scan_time": "2024-01-15T14:30:00Z",
  "output": "raw_tool_output",
  "errors": "error_message_if_any"
}
```

## Security Notes

- Access tokens are used only for repository access and are not stored
- All temporary repository clones are automatically cleaned up
- Scan results are returned immediately and not persisted unless explicitly saved

## Troubleshooting

### Common Issues

1. **Tool not found**: Ensure the tool is installed and available in PATH
2. **Permission denied**: Check file permissions and repository access
3. **Network issues**: Verify internet connectivity and repository accessibility
4. **Timeout errors**: Large repositories may take longer to scan

### Logs

Check Django logs for detailed error messages and debugging information.

## Development

For development and testing, you can use mock repositories or small test repositories to verify functionality without installing all tools.
