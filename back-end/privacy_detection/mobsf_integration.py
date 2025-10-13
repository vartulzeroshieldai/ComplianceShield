import requests
import json
import os
import tempfile
from django.conf import settings

class MobSFIntegration:
    def __init__(self):
        self.api_url = getattr(settings, 'MOBSF_API_URL', 'http://localhost:8001')
        # Use the correct MobSF API key from the logs
        self.api_key = getattr(settings, 'MOBSF_API_KEY', 'dev-mobsf-key-123')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': self.api_key
            # Don't set Content-Type - let requests handle it for multipart/form-data
        })
    
    def health_check(self):
        """Check if MobSF service is running"""
        try:
            response = self.session.get(f"{self.api_url}/")
            return {
                'status': 'success' if response.status_code == 200 else 'error',
                'message': 'MobSF is running' if response.status_code == 200 else f'MobSF returned status {response.status_code}',
                'status_code': response.status_code
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to connect to MobSF: {str(e)}',
                'status_code': None
            }
    
    def upload_file(self, file_content, file_name):
        """Upload APK/IPA file to MobSF"""
        try:
            # Create temporary file with timestamp and random suffix to avoid cache issues
            import time
            import random
            timestamp = str(int(time.time()))
            random_suffix = str(random.randint(1000, 9999))
            temp_filename = f"{timestamp}_{random_suffix}_{file_name}"
            
            # Determine file extension based on original filename
            file_ext = '.apk' if file_name.lower().endswith('.apk') else '.ipa'
            
            # Create a modified version of the file content to force different hash
            # Add a small comment/metadata to the end of the file to change its hash
            cache_bust_comment = f"\n# Cache bust: {timestamp}_{random_suffix}\n".encode('utf-8')
            modified_content = file_content + cache_bust_comment
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                temp_file.write(modified_content)
                temp_file_path = temp_file.name
            
            # Upload file to MobSF
            with open(temp_file_path, 'rb') as f:
                files = {'file': (temp_filename, f, 'application/octet-stream')}
                headers = {'Authorization': self.api_key}
                response = requests.post(
                    f"{self.api_url}/api/v1/upload",
                    files=files,
                    headers=headers,
                    timeout=60
                )
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'success',
                    'message': 'File uploaded successfully',
                    'file_name': data.get('file_name'),
                    'hash': data.get('hash')
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Upload failed: {response.text}',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Upload error: {str(e)}',
                'status_code': None
            }
    
    def scan_file(self, file_hash, scan_type='static'):
        """Start scanning the uploaded file"""
        try:
            data = {
                'hash': file_hash,
                'scan_type': scan_type
            }
            # MobSF API expects form data, not JSON
            response = self.session.post(
                f"{self.api_url}/api/v1/scan",
                data=data,
                timeout=120
            )
            
            if response.status_code == 200:
                return {
                    'status': 'success',
                    'message': 'Scan started successfully',
                    'scan_type': scan_type
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Scan failed: {response.text}',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Scan error: {str(e)}',
                'status_code': None
            }
    
    def get_scan_report(self, file_hash, scan_type='static'):
        """Get scan results"""
        try:
            response = self.session.post(
                f"{self.api_url}/api/v1/report_json",
                data={'hash': file_hash},
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'success',
                    'message': 'Report retrieved successfully',
                    'report': data
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Report retrieval failed: {response.text}',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Report error: {str(e)}',
                'status_code': None
            }
    
    def get_scorecard(self, file_hash):
        """Get app scorecard"""
        try:
            response = self.session.post(
                f"{self.api_url}/api/v1/scorecard",
                data={'hash': file_hash},
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'status': 'success',
                    'message': 'Scorecard retrieved successfully',
                    'scorecard': data
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Scorecard retrieval failed: {response.text}',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Scorecard error: {str(e)}',
                'status_code': None
            }
    
    def delete_scan(self, file_hash):
        """Delete scan results from MobSF to force fresh analysis"""
        try:
            response = self.session.post(
                f"{self.api_url}/api/v1/delete_scan",
                data={'hash': file_hash},
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'status': 'success',
                    'message': 'Scan deleted successfully'
                }
            else:
                return {
                    'status': 'error',
                    'message': f'Delete failed: {response.text}',
                    'status_code': response.status_code
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Delete error: {str(e)}',
                'status_code': None
            }
    
    def scan_mobile_app(self, file_content, file_name, scan_type='static'):
        """Complete mobile app scanning workflow"""
        try:
            # Step 1: Upload file with cache-busting filename
            upload_result = self.upload_file(file_content, file_name)
            if upload_result['status'] != 'success':
                return upload_result
            
            file_hash = upload_result['hash']
            
            # Step 2: Start scan (cache-busting filename ensures fresh analysis)
            scan_result = self.scan_file(file_hash, scan_type)
            if scan_result['status'] != 'success':
                return scan_result
            
            # Step 3: Get report
            report_result = self.get_scan_report(file_hash, scan_type)
            if report_result['status'] != 'success':
                return report_result
            
            # Step 4: Get scorecard
            scorecard_result = self.get_scorecard(file_hash)
            
            # Step 5: Process and format results
            processed_results = self._process_scan_results(
                report_result['report'], 
                scorecard_result.get('scorecard', {}),
                file_name,
                file_hash
            )
            
            # Check if we got meaningful results
            if (processed_results.get('app_name') == 'N/A' and 
                processed_results.get('package_name') == 'N/A' and
                processed_results.get('security_score', 0) == 0):
                
                return {
                    'status': 'warning',
                    'message': 'Analysis completed but no meaningful results extracted. This may be due to MobSF internal analysis errors.',
                    'file_name': file_name,
                    'file_hash': file_hash,
                    'scan_type': scan_type,
                    'results': processed_results,
                    'debug_info': {
                        'report_status': report_result['status'],
                        'scorecard_status': scorecard_result.get('status', 'unknown'),
                        'note': 'Check MobSF logs for AttributeError in macho.py - this is a known MobSF bug'
                    }
                }
            
            return {
                'status': 'success',
                'message': 'Mobile app scan completed successfully',
                'file_name': file_name,
                'file_hash': file_hash,
                'scan_type': scan_type,
                'results': processed_results
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Mobile app scan error: {str(e)}',
                'status_code': None
            }
    
    def _process_scan_results(self, report, scorecard, file_name, file_hash):
        """Process and format scan results for the compliance system"""
        try:
            # Extract key information from MobSF report - handle iOS vs Android differences
            app_name = report.get('app_name', file_name)
            
            # Check if this is an APK (Android) or IPA (iOS) based on file extension or app_type
            is_android = file_name.lower().endswith('.apk') or report.get('app_type', '').lower() == 'android'
            is_ios = file_name.lower().endswith('.ipa') or report.get('app_type', '').lower() == 'ios'
            
            if is_android:
                # Android APK - use Android-specific fields
                package_name = report.get('package_name', 'Unknown')
                version_name = report.get('version_name', 'Unknown')
                target_sdk = report.get('target_sdk', 'Unknown')
                min_sdk = report.get('min_sdk', 'Unknown')
            elif is_ios:
                # iOS IPA - use iOS-specific fields
                package_name = report.get('bundle_id', 'Unknown')  # iOS uses bundle_id instead of package_name
                version_name = report.get('app_version', 'Unknown')  # iOS uses app_version instead of version_name
                target_sdk = report.get('sdk_name', 'Unknown')  # iOS uses sdk_name instead of target_sdk
                min_sdk = report.get('min_os_version', 'Unknown')  # iOS uses min_os_version instead of min_sdk
            else:
                # Fallback for unknown types
                package_name = report.get('package_name', report.get('bundle_id', 'Unknown'))
                version_name = report.get('version_name', report.get('app_version', 'Unknown'))
                target_sdk = report.get('target_sdk', report.get('sdk_name', 'Unknown'))
                min_sdk = report.get('min_sdk', report.get('min_os_version', 'Unknown'))
            
            # Get the appsec data which contains the structured findings
            appsec = report.get('appsec', {})
            permissions = report.get('permissions', {})
            malware_permissions = report.get('malware_permissions', {})
            certificate_analysis = report.get('certificate_analysis', {})
            
            # Calculate security score from scorecard
            security_score = scorecard.get('security_score', 0)
            
            # Process findings by severity from appsec
            findings = {
                'high': [],
                'medium': [],
                'low': [],
                'info': []
            }
            
            # Process appsec findings (high, warning, info, secure)
            for severity_level in ['high', 'warning', 'info']:
                if severity_level in appsec:
                    for finding in appsec[severity_level]:
                        if isinstance(finding, dict):
                            # Map warning to medium for consistency
                            mapped_severity = 'medium' if severity_level == 'warning' else severity_level
                            findings[mapped_severity].append({
                                'title': finding.get('title', 'Unknown Issue'),
                                'description': finding.get('description', ''),
                                'category': finding.get('section', 'Unknown').title()
                            })
            
            # Process certificate findings
            certificate_findings = certificate_analysis.get('certificate_findings', [])
            for cert_issue in certificate_findings:
                if isinstance(cert_issue, list) and len(cert_issue) >= 3:
                    severity = cert_issue[0].lower()  # First element is severity
                    title = cert_issue[2] if len(cert_issue) > 2 else 'Unknown Issue'  # Third element is title
                    description = cert_issue[1] if len(cert_issue) > 1 else ''  # Second element is description
                    
                    # Map warning to medium for consistency
                    mapped_severity = 'medium' if severity == 'warning' else severity
                    if mapped_severity in findings:
                        findings[mapped_severity].append({
                            'title': title,
                            'description': description,
                            'category': 'Certificate'
                        })
            
            # Count total findings
            total_findings = sum(len(findings[severity]) for severity in findings)
            
            # Extract original MobSF PII data
            original_pii_data = self._extract_original_pii_data(report)
            
            # Process permissions - handle both APK and IPA differently
            permissions_total = 0
            permissions_dangerous = 0
            permissions_normal = 0
            
            # Check if this is an APK (Android) or IPA (iOS) based on file extension or app_type
            is_android = file_name.lower().endswith('.apk') or report.get('app_type', '').lower() == 'android'
            is_ios = file_name.lower().endswith('.ipa') or report.get('app_type', '').lower() == 'ios'
            
            if is_android:
                # Android APK - use malware_permissions structure
                if isinstance(malware_permissions, dict):
                    permissions_total = malware_permissions.get('total_malware_permissions', 0) + malware_permissions.get('total_other_permissions', 0)
                    permissions_dangerous = malware_permissions.get('total_malware_permissions', 0)
                    permissions_normal = malware_permissions.get('total_other_permissions', 0)
            elif is_ios:
                # iOS IPA - use permissions structure (different format)
                if isinstance(permissions, dict):
                    # Count total permissions from the permissions dictionary
                    permissions_total = len(permissions)
                    # Count dangerous permissions (status: 'dangerous')
                    permissions_dangerous = sum(1 for perm_data in permissions.values() 
                                              if isinstance(perm_data, dict) and perm_data.get('status') == 'dangerous')
                    # Count normal permissions (status: 'normal' or other)
                    permissions_normal = permissions_total - permissions_dangerous
            
            # Process certificate info
            certificate_signed = False
            certificate_vulnerabilities = 0
            
            if isinstance(certificate_analysis, dict):
                certificate_info = certificate_analysis.get('certificate_info', '')
                if isinstance(certificate_info, str) and 'Binary is signed' in certificate_info:
                    certificate_signed = True
                
                certificate_summary = certificate_analysis.get('certificate_summary', {})
                certificate_vulnerabilities = certificate_summary.get('warning', 0)
            
            return {
                'app_name': app_name,
                'package_name': package_name,
                'version_name': version_name,
                'target_sdk': target_sdk,
                'min_sdk': min_sdk,
                'security_score': security_score,
                'total_findings': total_findings,
                'findings': findings,
                'permissions': {
                    'total': permissions_total,
                    'dangerous': permissions_dangerous,
                    'normal': permissions_normal
                },
                'certificate_info': {
                    'signed': certificate_signed,
                    'vulnerabilities': certificate_vulnerabilities
                },
                'original_pii_data': original_pii_data,
                'file_info': {
                    'name': file_name,
                    'hash': file_hash,
                    'size': report.get('size', 'Unknown')
                }
            }
        except Exception as e:
            return {
                'error': f'Error processing scan results: {str(e)}',
                'raw_report': report
            }
    
    def _extract_original_pii_data(self, report):
        """Extract original PII data that MobSF naturally detects"""
        try:
            # Helper function to extract strings from MobSF data structure
            def extract_strings_from_mobsf_data(data_list):
                """Extract actual strings from MobSF's nested data structure"""
                extracted_strings = []
                if isinstance(data_list, list):
                    for item in data_list:
                        if isinstance(item, dict):
                            # Handle structure like {'emails': [...], 'path': '...'}
                            for key, value in item.items():
                                if key != 'path' and isinstance(value, list):
                                    extracted_strings.extend(value)
                        elif isinstance(item, str):
                            # Handle direct string lists
                            extracted_strings.append(item)
                return extracted_strings
            
            # Extract the original PII data that MobSF finds
            raw_emails = report.get('emails', [])
            raw_urls = report.get('urls', [])
            raw_domains = report.get('domains', [])
            raw_secrets = report.get('secrets', [])
            raw_strings = report.get('strings', [])
            raw_trackers = report.get('trackers', [])
            raw_firebase_urls = report.get('firebase_urls', [])
            raw_libraries = report.get('libraries', [])
            
            # Extract actual strings from the nested structure
            pii_data = {
                'emails': extract_strings_from_mobsf_data(raw_emails),
                'urls': extract_strings_from_mobsf_data(raw_urls),
                'domains': extract_strings_from_mobsf_data(raw_domains),
                'secrets': extract_strings_from_mobsf_data(raw_secrets),
                'strings': extract_strings_from_mobsf_data(raw_strings)[:50],  # Limit to first 50 strings
                'trackers': extract_strings_from_mobsf_data(raw_trackers),
                'firebase_urls': extract_strings_from_mobsf_data(raw_firebase_urls),
                'libraries': extract_strings_from_mobsf_data(raw_libraries)
            }
            
            # Count total PII items found
            total_pii_count = 0
            for key, value in pii_data.items():
                if isinstance(value, list):
                    total_pii_count += len(value)
                elif isinstance(value, dict):
                    total_pii_count += len(value)
            
            return {
                'total_pii_found': total_pii_count,
                'data': pii_data,
                'summary': {
                    'emails_count': len(pii_data['emails']),
                    'urls_count': len(pii_data['urls']),
                    'domains_count': len(pii_data['domains']),
                    'secrets_count': len(pii_data['secrets']),
                    'strings_count': len(pii_data['strings']),
                    'trackers_count': len(pii_data['trackers']),
                    'firebase_urls_count': len(pii_data['firebase_urls']),
                    'libraries_count': len(pii_data['libraries'])
                }
            }
        except Exception as e:
            return {
                'total_pii_found': 0,
                'data': {},
                'summary': {},
                'error': f'Error extracting PII data: {str(e)}'
            }