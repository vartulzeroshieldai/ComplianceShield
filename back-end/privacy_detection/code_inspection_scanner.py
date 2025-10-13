"""
Code Inspection Scanner Module
Integrates TruffleHog and GitLeaks for repository security scanning
"""

import subprocess
import tempfile
import os
import json
import re
from typing import Dict, List, Any, Optional
from datetime import datetime

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


class CodeInspectionScanner:
    """
    Main class for code inspection scanning using various tools
    """
    
    def __init__(self):
        self.temp_dir = None
        
    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp()
        print(f"🔍 DEBUG: Created temporary directory: {self.temp_dir}")
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.temp_dir and os.path.exists(self.temp_dir):
            import shutil
            import stat
            print(f"🔍 DEBUG: Cleaning up temporary directory: {self.temp_dir}")
            try:
                # Handle Windows file permission issues with Git repositories
                def handle_remove_readonly(func, path, exc):
                    """Error handler for Windows readonly files"""
                    os.chmod(path, stat.S_IWRITE)
                    func(path)
                
                shutil.rmtree(self.temp_dir, onerror=handle_remove_readonly)
                print(f"🔍 DEBUG: Successfully deleted temporary directory")
            except Exception as e:
                print(f"🔍 DEBUG: Failed to delete temporary directory: {str(e)}")
                # Try force delete on Windows
                if os.name == 'nt':  # Windows
                    try:
                        subprocess.run(['rd', '/s', '/q', self.temp_dir], shell=True, check=False)
                        print(f"🔍 DEBUG: Force deleted using Windows rd command")
                    except Exception as e2:
                        print(f"🔍 DEBUG: Force delete also failed: {str(e2)}")
    
    def clone_repository(self, repository_url: str, access_token: str) -> str:
        """
        Clone repository to temporary directory using git clone
        """
        try:
            clone_dir = os.path.join(self.temp_dir, "repo")
            
            print(f"🔍 DEBUG: Cloning repository from: {repository_url}")
            print(f"🔍 DEBUG: Clone destination: {clone_dir}")
            
            # Construct the clone URL with authentication token if provided
            if access_token and "github.com" in repository_url:
                # Insert token into URL for authentication
                # https://github.com/user/repo.git -> https://TOKEN@github.com/user/repo.git
                auth_url = repository_url.replace("https://", f"https://{access_token}@")
            else:
                auth_url = repository_url
            
            # Use git clone command
            result = subprocess.run(
                ["git", "clone", auth_url, clone_dir],
                capture_output=True,
                text=True,
                timeout=120  # 2 minute timeout for cloning
            )
            
            if result.returncode != 0:
                print(f"🔍 DEBUG: Git clone failed - Return code: {result.returncode}")
                print(f"🔍 DEBUG: Git clone stderr: {result.stderr}")
                raise Exception(f"Git clone failed: {result.stderr}")
            
            print(f"🔍 DEBUG: Repository cloned successfully to: {clone_dir}")
            return clone_dir
            
        except subprocess.TimeoutExpired:
            raise Exception("Repository clone timed out after 2 minutes")
        except Exception as e:
            raise Exception(f"Repository clone failed: {str(e)}")
    
    def run_truffle_scan(self, repo_path: str) -> Dict[str, Any]:
        """
        Run TruffleHog scan on repository
        """
        print(f"🔍 DEBUG: Starting TruffleHog scan on: {repo_path}")
        
        try:
            # Check if trufflehog3 is installed
            print("🔍 DEBUG: Checking TruffleHog3 installation...")
            result = subprocess.run(
                ["trufflehog3", "--version"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            
            print(f"🔍 DEBUG: TruffleHog version check - Return code: {result.returncode}")
            print(f"🔍 DEBUG: TruffleHog version output: {result.stdout}")
            print(f"🔍 DEBUG: TruffleHog version error: {result.stderr}")
            
            if result.returncode != 0:
                print("🔍 DEBUG: TruffleHog not working, returning error")
                return {
                    "tool": "TruffleHog",
                    "status": "error",
                    "message": "TruffleHog is not installed. Please install TruffleHog3 to run scans.",
                    "total_findings": 0,
                    "secrets_found": 0,
                    "findings": [],
                    "scan_time": datetime.now().isoformat(),
                    "debug_info": {
                        "version_check_returncode": result.returncode,
                        "version_check_stdout": result.stdout,
                        "version_check_stderr": result.stderr
                    }
                }
            
            # Run trufflehog3 scan on the cloned repository with JSON output
            print(f"🔍 DEBUG: Running TruffleHog3 scan on repository: {repo_path}")
            result = subprocess.run(
                ["trufflehog3", repo_path, "--format", "JSON"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=60
            )
            
            print(f"🔍 DEBUG: TruffleHog scan completed - Return code: {result.returncode}")
            print(f"🔍 DEBUG: TruffleHog scan stdout length: {len(result.stdout)}")
            print(f"🔍 DEBUG: TruffleHog scan stderr: {result.stderr}")
            print(f"🔍 DEBUG: TruffleHog scan stdout (first 500 chars): {result.stdout[:500]}")
            
            findings = []
            secrets_found = 0
            
            if result.stdout:
                print("🔍 DEBUG: Processing TruffleHog3 JSON output...")
                try:
                    # Parse JSON output
                    import json
                    trufflehog_data = json.loads(result.stdout)
                    
                    if isinstance(trufflehog_data, list):
                        for item in trufflehog_data:
                            # Extract rule information
                            rule = item.get('rule', {})
                            context = item.get('context', {})
                            
                            # Get the actual secret content from context
                            secret_content = item.get('secret', '')
                            if not secret_content and context:
                                # Try to get content from context
                                context_lines = list(context.values())
                                if context_lines:
                                    secret_content = context_lines[0]
                            
                            finding = {
                                "file": item.get('path', 'unknown'),
                                "line": str(item.get('line', 'unknown')),
                                "content": secret_content,
                                "type": rule.get('id', 'potential_secret') if isinstance(rule, dict) else str(rule),
                                "severity": rule.get('severity', 'MEDIUM') if isinstance(rule, dict) else 'MEDIUM',
                                "commit": item.get('commit', ''),
                                "branch": item.get('branch', ''),
                                "date": item.get('date', ''),
                                "reason": rule.get('message', '') if isinstance(rule, dict) else '',
                                "rule_id": rule.get('id', '') if isinstance(rule, dict) else '',
                                "pattern": rule.get('pattern', '') if isinstance(rule, dict) else '',
                                "context": context
                            }
                            findings.append(finding)
                            secrets_found += 1
                            print(f"🔍 DEBUG: Found secret in {finding['file']}:{finding['line']} - {finding['content'][:50]}...")
                    else:
                        print("🔍 DEBUG: TruffleHog3 output is not a list")
                        
                except json.JSONDecodeError as e:
                    print(f"🔍 DEBUG: Failed to parse TruffleHog3 JSON output: {str(e)}")
                    print(f"🔍 DEBUG: Raw output: {result.stdout}")
                    # Fall back to empty results if JSON parsing fails
                    findings = []
                    secrets_found = 0
            
            print(f"🔍 DEBUG: TruffleHog scan found {secrets_found} secrets")
            
            return {
                "tool": "TruffleHog",
                "status": "completed",
                "total_findings": len(findings),
                "secrets_found": secrets_found,
                "findings": findings,
                "scan_time": datetime.now().isoformat(),
                "output": result.stdout,
                "errors": result.stderr if result.stderr else None,
                "debug_info": {
                    "return_code": result.returncode,
                    "stdout_length": len(result.stdout),
                    "stderr": result.stderr,
                    "raw_output_preview": result.stdout[:500]
                }
            }
            
        except subprocess.TimeoutExpired:
            print("🔍 DEBUG: TruffleHog scan timed out")
            return {
                "tool": "TruffleHog",
                "status": "error",
                "error": "Scan timed out after 60 seconds",
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"🔍 DEBUG: TruffleHog scan error: {str(e)}")
            return {
                "tool": "TruffleHog",
                "status": "error",
                "error": str(e),
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
    
    def run_gitleaks_scan(self, repo_path: str) -> Dict[str, Any]:
        """
        Run GitLeaks scan on repository
        """
        print(f"🔍 DEBUG: Starting GitLeaks scan on: {repo_path}")
        
        try:
            # Try system-installed gitleaks first, then fall back to tools directory
            gitleaks_path = "gitleaks"  # System-installed version
            
            # Check if system gitleaks is available
            system_check = subprocess.run(
                ["which", "gitleaks"],
                capture_output=True,
                text=True
            )
            
            if system_check.returncode != 0:
                # Fall back to tools directory
                tools_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tools")
                gitleaks_path = os.path.join(tools_dir, "gitleaks.exe")
                
                # If gitleaks.exe doesn't exist, try without .exe extension (for Linux)
                if not os.path.exists(gitleaks_path):
                    gitleaks_path = os.path.join(tools_dir, "gitleaks")
            
            print(f"🔍 DEBUG: GitLeaks path: {gitleaks_path}")
            print(f"🔍 DEBUG: GitLeaks path exists: {os.path.exists(gitleaks_path)}")
            
            # Check if gitleaks is installed
            print("🔍 DEBUG: Checking GitLeaks installation...")
            result = subprocess.run(
                [gitleaks_path, "version"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore'
            )
            
            print(f"🔍 DEBUG: GitLeaks version check - Return code: {result.returncode}")
            print(f"🔍 DEBUG: GitLeaks version output: {result.stdout}")
            print(f"🔍 DEBUG: GitLeaks version error: {result.stderr}")
            
            if result.returncode != 0:
                print("🔍 DEBUG: GitLeaks not working, returning error")
                return {
                    "tool": "GitLeaks",
                    "status": "error",
                    "message": "GitLeaks is not installed. Please install GitLeaks to run scans.",
                    "total_findings": 0,
                    "secrets_found": 0,
                    "findings": [],
                    "scan_time": datetime.now().isoformat(),
                    "debug_info": {
                        "gitleaks_path": gitleaks_path,
                        "path_exists": os.path.exists(gitleaks_path),
                        "version_check_returncode": result.returncode,
                        "version_check_stdout": result.stdout,
                        "version_check_stderr": result.stderr
                    }
                }
            
            # Run gitleaks scan on the cloned repository
            print(f"🔍 DEBUG: Running GitLeaks scan on repository: {repo_path}")
            
            # Create a temporary file for GitLeaks JSON report
            import tempfile
            report_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
            report_path = report_file.name
            report_file.close()
            
            print(f"🔍 DEBUG: GitLeaks report will be saved to: {report_path}")
            
            # Set console code page to UTF-8 for Windows
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            
            result = subprocess.run(
                [gitleaks_path, "detect", "--source", repo_path, "--report-path", report_path, "--report-format", "json"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=60,
                env=env
            )
            
            print(f"🔍 DEBUG: GitLeaks scan completed - Return code: {result.returncode}")
            print(f"🔍 DEBUG: GitLeaks scan stdout length: {len(result.stdout)}")
            print(f"🔍 DEBUG: GitLeaks scan stderr: {result.stderr}")
            print(f"🔍 DEBUG: GitLeaks scan stdout (first 500 chars): {result.stdout[:500]}")
            
            findings = []
            secrets_found = 0
            
            # Read the JSON report file
            try:
                if os.path.exists(report_path):
                    print(f"🔍 DEBUG: Reading GitLeaks report from: {report_path}")
                    with open(report_path, 'r', encoding='utf-8') as f:
                        report_content = f.read()
                        print(f"🔍 DEBUG: Report file size: {len(report_content)} bytes")
                        
                        if report_content.strip():
                            try:
                                findings_data = json.loads(report_content)
                                print(f"🔍 DEBUG: GitLeaks JSON parsed successfully, found {len(findings_data) if isinstance(findings_data, list) else 0} findings")
                                
                                if isinstance(findings_data, list):
                                    for i, finding in enumerate(findings_data):
                                        file_path = finding.get("File", "unknown")
                                        line_num = finding.get("StartLine", "unknown")
                                        rule_id = finding.get("RuleID", "unknown")
                                        secret = finding.get("Secret", "")[:100]  # Truncate secret to 100 chars
                                        
                                        findings.append({
                                            "file": file_path,
                                            "line": str(line_num),
                                            "content": secret,
                                            "severity": "HIGH",
                                            "type": rule_id
                                        })
                                        secrets_found += 1
                                        print(f"🔍 DEBUG: GitLeaks finding {i+1}: {rule_id} in {file_path}:{line_num}")
                                else:
                                    print(f"🔍 DEBUG: GitLeaks JSON is not a list: {type(findings_data)}")
                            except json.JSONDecodeError as e:
                                print(f"🔍 DEBUG: Failed to parse GitLeaks JSON: {str(e)}")
                        else:
                            print("🔍 DEBUG: GitLeaks report file is empty - no secrets found")
                    
                    # Clean up the report file
                    try:
                        os.unlink(report_path)
                        print(f"🔍 DEBUG: Deleted report file: {report_path}")
                    except Exception as e:
                        print(f"🔍 DEBUG: Failed to delete report file: {str(e)}")
                else:
                    print(f"🔍 DEBUG: GitLeaks report file not found: {report_path}")
            except Exception as e:
                print(f"🔍 DEBUG: Error reading GitLeaks report: {str(e)}")
            
            print(f"🔍 DEBUG: GitLeaks scan found {secrets_found} secrets")
            
            return {
                "tool": "GitLeaks",
                "status": "completed",
                "total_findings": len(findings),
                "secrets_found": secrets_found,
                "findings": findings,
                "scan_time": datetime.now().isoformat(),
                "output": result.stdout,
                "errors": result.stderr if result.stderr else None,
                "debug_info": {
                    "gitleaks_path": gitleaks_path,
                    "path_exists": os.path.exists(gitleaks_path),
                    "return_code": result.returncode,
                    "stdout_length": len(result.stdout),
                    "stderr": result.stderr,
                    "raw_output_preview": result.stdout[:500]
                }
            }
            
        except subprocess.TimeoutExpired:
            print("🔍 DEBUG: GitLeaks scan timed out")
            return {
                "tool": "GitLeaks",
                "status": "error",
                "error": "Scan timed out after 60 seconds",
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"🔍 DEBUG: GitLeaks scan error: {str(e)}")
            return {
                "tool": "GitLeaks",
                "status": "error",
                "error": str(e),
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
    
    def test_repository_connection(self, repository_url: str, access_token: str) -> Dict[str, Any]:
        """
        Test repository connection without cloning
        """
        try:
            if not REQUESTS_AVAILABLE:
                return {
                    "status": "error",
                    "message": "Requests library not available. Please install it with: pip install requests"
                }
            
            # Test GitHub API connection
            if "github.com" in repository_url:
                # Extract owner/repo from URL
                url_parts = repository_url.replace("https://github.com/", "").split("/")
                if len(url_parts) >= 2:
                    owner, repo = url_parts[0], url_parts[1].replace(".git", "")
                    
                    headers = {}
                    if access_token:
                        headers["Authorization"] = f"token {access_token}"
                    
                    try:
                        response = requests.get(
                            f"https://api.github.com/repos/{owner}/{repo}",
                            headers=headers,
                            timeout=10
                        )
                        
                        if response.status_code == 200:
                            repo_data = response.json()
                            return {
                                "status": "success",
                                "message": "Repository connection successful",
                                "repository": {
                                    "name": repo_data.get("name"),
                                    "full_name": repo_data.get("full_name"),
                                    "private": repo_data.get("private"),
                                    "clone_url": repo_data.get("clone_url"),
                                    "default_branch": repo_data.get("default_branch")
                                }
                            }
                        else:
                            return {
                                "status": "error",
                                "message": f"GitHub API error: {response.status_code} - {response.text}"
                            }
                    except requests.exceptions.RequestException as e:
                        return {
                            "status": "error",
                            "message": f"Network error connecting to GitHub: {str(e)}"
                        }
            
            # Test GitLab API connection
            elif "gitlab.com" in repository_url:
                # Extract project path from URL
                url_parts = repository_url.replace("https://gitlab.com/", "").split("/")
                if len(url_parts) >= 2:
                    project_path = "/".join(url_parts)
                    
                    headers = {}
                    if access_token:
                        headers["PRIVATE-TOKEN"] = access_token
                    
                    response = requests.get(
                        f"https://gitlab.com/api/v4/projects/{project_path.replace('/', '%2F')}",
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        repo_data = response.json()
                        return {
                            "status": "success",
                            "message": "Repository connection successful",
                            "repository": {
                                "name": repo_data.get("name"),
                                "path_with_namespace": repo_data.get("path_with_namespace"),
                                "visibility": repo_data.get("visibility"),
                                "http_url_to_repo": repo_data.get("http_url_to_repo"),
                                "default_branch": repo_data.get("default_branch")
                            }
                        }
                    else:
                        return {
                            "status": "error",
                            "message": f"GitLab API error: {response.status_code} - {response.text}"
                        }
            
            
            return {
                "status": "error",
                "message": "Unsupported repository platform"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection test failed: {str(e)}"
            }

    def run_sast_scan(self, uploaded_file) -> Dict[str, Any]:
        """
        Run SAST-Scan (Static Application Security Testing) on uploaded file
        Creates temporary file, scans it, then deletes it
        """
        print(f"🔍 DEBUG: Starting SAST-Scan on uploaded file: {uploaded_file.name}")
        
        temp_file_path = None
        scan_target = None
        try:
            # Create temporary file
            temp_file_path = os.path.join(self.temp_dir, uploaded_file.name)
            print(f"🔍 DEBUG: Creating temporary file: {temp_file_path}")
            
            # Write uploaded file content to temporary file (always use binary mode)
            with open(temp_file_path, 'wb') as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
            
            print(f"🔍 DEBUG: Temporary file created, size: {os.path.getsize(temp_file_path)} bytes")
            
            # Check if the file is a ZIP archive - extract it first
            if uploaded_file.name.lower().endswith('.zip'):
                print(f"🔍 DEBUG: Detected ZIP file, extracting...")
                import zipfile
                
                extract_dir = os.path.join(self.temp_dir, "extracted")
                os.makedirs(extract_dir, exist_ok=True)
                
                try:
                    with zipfile.ZipFile(temp_file_path, 'r') as zip_ref:
                        zip_ref.extractall(extract_dir)
                    scan_target = extract_dir
                    print(f"🔍 DEBUG: ZIP extracted to: {extract_dir}")
                except Exception as zip_error:
                    print(f"🔍 DEBUG: ZIP extraction failed: {str(zip_error)}")
                    # If extraction fails, scan the file as-is
                    scan_target = temp_file_path
            else:
                # For non-ZIP files, scan directly
                scan_target = temp_file_path
            
            # Run TruffleHog scan on the target (file or directory)
            print(f"🔍 DEBUG: Running TruffleHog scan on: {scan_target}")
            
            # Set environment variables for better encoding handling
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            
            result = subprocess.run(
                ["trufflehog3", scan_target, "--format", "JSON"],
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=120,  # Increased timeout for larger projects
                env=env
            )
            
            print(f"🔍 DEBUG: SAST-Scan completed - Return code: {result.returncode}")
            print(f"🔍 DEBUG: SAST-Scan stdout length: {len(result.stdout)}")
            print(f"🔍 DEBUG: SAST-Scan stderr: {result.stderr}")
            
            findings = []
            secrets_found = 0
            
            if result.stdout:
                print("🔍 DEBUG: Processing SAST-Scan JSON output...")
                try:
                    # Parse JSON output from TruffleHog3
                    import json
                    trufflehog_data = json.loads(result.stdout)
                    
                    if isinstance(trufflehog_data, list):
                        for item in trufflehog_data:
                            # Extract rule information
                            rule = item.get('rule', {})
                            context = item.get('context', {})
                            
                            # Get the actual secret content from context
                            secret_content = item.get('secret', '')
                            if not secret_content and context:
                                # Try to get content from context
                                context_lines = list(context.values())
                                if context_lines:
                                    secret_content = context_lines[0]
                            
                            finding = {
                                "file": item.get('path', uploaded_file.name),
                                "line": str(item.get('line', 'unknown')),
                                "content": secret_content,
                                "type": rule.get('id', 'potential_secret') if isinstance(rule, dict) else str(rule),
                                "severity": rule.get('severity', 'MEDIUM') if isinstance(rule, dict) else 'MEDIUM',
                                "commit": item.get('commit', ''),
                                "branch": item.get('branch', ''),
                                "date": item.get('date', ''),
                                "reason": rule.get('message', '') if isinstance(rule, dict) else '',
                                "rule_id": rule.get('id', '') if isinstance(rule, dict) else '',
                                "pattern": rule.get('pattern', '') if isinstance(rule, dict) else '',
                                "context": context
                            }
                            findings.append(finding)
                            secrets_found += 1
                            print(f"🔍 DEBUG: ✅ Added finding #{secrets_found}: {finding['file']}:{finding['line']}")
                    else:
                        print("🔍 DEBUG: TruffleHog3 output is not a list")
                        
                except json.JSONDecodeError as e:
                    print(f"🔍 DEBUG: Failed to parse TruffleHog3 JSON output: {str(e)}")
                    print(f"🔍 DEBUG: Raw output: {result.stdout}")
                    # Fall back to empty results if JSON parsing fails
                    findings = []
                    secrets_found = 0
            
            print(f"🔍 DEBUG: SAST-Scan found {secrets_found} secrets")
            
            # Categorize findings by type based on severity/content
            categories = {
                'high_entropy': 0,
                'api_keys': 0,
                'tokens': 0,
                'passwords': 0,
                'encryption_keys': 0,
                'aws_keys': 0,
                'github_tokens': 0,
                'private_keys': 0,
                'database_credentials': 0,
                'other_secrets': 0
            }
            
            for finding in findings:
                severity = finding.get('severity', '').upper()
                content = finding.get('content', '').lower()
                
                # Categorize based on severity and content keywords
                if 'HIGH ENTROPY' in severity or 'ENTROPY' in severity:
                    categories['high_entropy'] += 1
                elif 'AWS' in content.upper() or 'aws' in content:
                    categories['aws_keys'] += 1
                elif 'GITHUB' in content.upper() or 'github' in content or 'gh_' in content or 'ghp_' in content:
                    categories['github_tokens'] += 1
                elif 'API' in content.upper() or 'api_key' in content or 'apikey' in content:
                    categories['api_keys'] += 1
                elif 'TOKEN' in content.upper() or 'token' in content or 'bearer' in content:
                    categories['tokens'] += 1
                elif 'PASSWORD' in content.upper() or 'passwd' in content or 'pwd' in content:
                    categories['passwords'] += 1
                elif 'PRIVATE KEY' in content.upper() or 'private_key' in content or '-----BEGIN' in content.upper():
                    categories['private_keys'] += 1
                elif 'ENCRYPTION' in content.upper() or 'encrypt' in content or 'secret_key' in content:
                    categories['encryption_keys'] += 1
                elif 'DATABASE' in content.upper() or 'db_' in content or 'mysql' in content or 'postgres' in content or 'mongodb' in content:
                    categories['database_credentials'] += 1
                else:
                    categories['other_secrets'] += 1
            
            return {
                "tool": "SAST-Scan",
                "status": "completed",
                "total_findings": len(findings),
                "secrets_found": secrets_found,
                "findings": findings,
                "categories": categories,
                "scan_time": datetime.now().isoformat(),
                "output": result.stdout,
                "errors": result.stderr if result.stderr else None,
                "debug_info": {
                    "return_code": result.returncode,
                    "stdout_length": len(result.stdout),
                    "stderr": result.stderr,
                    "raw_output_preview": result.stdout[:500],
                    "file_name": uploaded_file.name,
                    "file_size": uploaded_file.size
                }
            }
            
        except subprocess.TimeoutExpired:
            print("🔍 DEBUG: SAST-Scan timed out")
            return {
                "tool": "SAST-Scan",
                "status": "error",
                "error": "Scan timed out after 60 seconds",
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"🔍 DEBUG: SAST-Scan error: {str(e)}")
            return {
                "tool": "SAST-Scan",
                "status": "error",
                "error": str(e),
                "total_findings": 0,
                "secrets_found": 0,
                "findings": [],
                "scan_time": datetime.now().isoformat()
            }
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.remove(temp_file_path)
                    print(f"🔍 DEBUG: Temporary file deleted: {temp_file_path}")
                except Exception as e:
                    print(f"🔍 DEBUG: Error deleting temporary file: {str(e)}")
