"""
Privacy Impact Assessment (PIA) Analyzer
Aggregates findings from Git-Scan, Security Headers, and Cookie Analyzer
to generate a comprehensive PIA report for PII leakage risk assessment.
"""
from datetime import datetime
from typing import Dict, List, Any


class PIAAnalyzer:
    """Analyzes privacy tool outputs and generates PIA reports"""
    
    def __init__(self):
        self.risk_severity_weights = {
            'CRITICAL': 100,
            'HIGH': 75,
            'MEDIUM': 50,
            'LOW': 25,
            'INFO': 10
        }
    
    def generate_pia_report(
        self,
        git_scan_results: Dict[str, Any] = None,
        security_headers_results: Dict[str, Any] = None,
        cookie_analysis_results: Dict[str, Any] = None,
        truffle_scan_results: Dict[str, Any] = None,
        mobile_scan_results: Dict[str, Any] = None,
        project_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive PIA report from tool outputs
        Includes: GitLeaks, Security Headers, Cookies, TruffleHog, Mobile Analysis
        """
        
        # Extract data from each tool
        data_inventory = self._build_data_inventory(
            git_scan_results,
            cookie_analysis_results,
            truffle_scan_results,
            mobile_scan_results
        )
        
        risk_assessment = self._build_risk_assessment(
            git_scan_results,
            security_headers_results,
            cookie_analysis_results,
            truffle_scan_results,
            mobile_scan_results
        )
        
        impact_analysis = self._build_impact_analysis(risk_assessment)
        
        mitigation_plan = self._build_mitigation_plan(
            git_scan_results,
            security_headers_results,
            cookie_analysis_results,
            truffle_scan_results,
            mobile_scan_results
        )
        
        compliance_check = self._build_compliance_check(risk_assessment)
        
        # Calculate overall risk score
        overall_risk = self._calculate_overall_risk(risk_assessment)
        
        return {
            'report_id': f"PIA-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            'generated_at': datetime.now().isoformat(),
            'project_info': project_info or {},
            'executive_summary': self._build_executive_summary(
                overall_risk,
                risk_assessment,
                data_inventory
            ),
            'data_inventory': data_inventory,
            'risk_assessment': risk_assessment,
            'impact_analysis': impact_analysis,
            'mitigation_plan': mitigation_plan,
            'compliance_check': compliance_check,
            'overall_risk': overall_risk,
            'recommendations_count': len(mitigation_plan.get('recommendations', [])),
            'high_risk_count': len(risk_assessment.get('high_risks', [])),
            'medium_risk_count': len(risk_assessment.get('medium_risks', [])),
            'low_risk_count': len(risk_assessment.get('low_risks', []))
        }
    
    def _build_data_inventory(
        self,
        git_scan_results: Dict[str, Any],
        cookie_analysis_results: Dict[str, Any],
        truffle_scan_results: Dict[str, Any],
        mobile_scan_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build data inventory from tool outputs"""
        
        data_points = []
        
        # PII detection patterns
        pii_patterns = {
            'email': ['email', '@', 'mail', 'e-mail'],
            'phone': ['phone', 'mobile', 'telephone', 'cell', 'tel:', '+1', '+91'],
            'ssn': ['ssn', 'social security', 'social_security'],
            'credit_card': ['card', 'credit', 'cvv', 'visa', 'mastercard'],
            'address': ['address', 'street', 'city', 'zip', 'postal'],
            'name': ['firstname', 'lastname', 'full_name', 'username'],
            'dob': ['dob', 'birth', 'birthday', 'date_of_birth'],
            'passport': ['passport', 'passport_number'],
            'license': ['license', 'driver', 'dl_number'],
            'aadhaar': ['aadhaar', 'aadhar', 'uid']
        }
        
        # Extract potential PII from Git-Scan findings
        if git_scan_results and git_scan_results.get('findings'):
            for finding in git_scan_results['findings']:
                content = finding.get('content', '').lower()
                finding_type = finding.get('type', '').lower()
                
                # Check if secret might expose PII endpoints
                if any(keyword in content or keyword in finding_type for keyword in 
                       ['email', 'phone', 'user', 'customer', 'profile', 'personal']):
                    data_points.append({
                        'category': 'Potential PII Exposure via Secrets',
                        'source': 'Git-Scan (GitLeaks)',
                        'description': f"Secret found that may expose PII: {finding['type']}",
                        'location': f"{finding.get('file', 'Unknown')}:{finding.get('line', 'N/A')}",
                        'risk_level': 'HIGH'
                    })
        
        # Extract PII from TruffleHog findings
        if truffle_scan_results and truffle_scan_results.get('findings'):
            for finding in truffle_scan_results['findings']:
                content = finding.get('content', '').lower()
                finding_type = finding.get('type', '').lower()
                file_path = finding.get('file', 'Unknown')
                
                # Detect PII type
                pii_type = 'Unknown PII'
                detected_patterns = []
                
                for pii_cat, patterns in pii_patterns.items():
                    if any(pattern in content or pattern in finding_type or pattern in file_path.lower() 
                           for pattern in patterns):
                        detected_patterns.append(pii_cat.upper())
                
                if detected_patterns:
                    pii_type = ', '.join(detected_patterns)
                    data_points.append({
                        'category': f'PII Found in Code: {pii_type}',
                        'source': 'SAST-Scan (TruffleHog)',
                        'description': f"Hardcoded PII detected - {finding.get('type', 'Sensitive data')}",
                        'location': f"{file_path}:{finding.get('line', 'N/A')}",
                        'risk_level': 'CRITICAL' if any(p in ['SSN', 'CREDIT_CARD', 'PASSPORT', 'AADHAAR'] 
                                                         for p in detected_patterns) else 'HIGH'
                    })
                else:
                    # Generic secret that might expose PII
                    data_points.append({
                        'category': 'Potential PII-Related Secret',
                        'source': 'SAST-Scan (TruffleHog)',
                        'description': f"Secret found: {finding.get('type', 'Unknown type')}",
                        'location': f"{file_path}:{finding.get('line', 'N/A')}",
                        'risk_level': 'HIGH'
                    })
        
        # Extract PII from Mobile Analysis
        if mobile_scan_results:
            # Check for dangerous permissions related to PII
            permissions = mobile_scan_results.get('permissions', [])
            pii_permissions = {
                'READ_CONTACTS': 'Contact Information (Names, Phone Numbers, Emails)',
                'READ_SMS': 'SMS Messages',
                'READ_CALL_LOG': 'Call History',
                'ACCESS_FINE_LOCATION': 'Precise Location Data',
                'ACCESS_COARSE_LOCATION': 'Approximate Location Data',
                'CAMERA': 'Photos/Videos (potential biometric data)',
                'RECORD_AUDIO': 'Audio Recordings',
                'READ_CALENDAR': 'Calendar Events',
                'READ_EXTERNAL_STORAGE': 'Stored Files (may contain PII)',
                'GET_ACCOUNTS': 'Account Information'
            }
            
            for permission in permissions:
                perm_name = permission.get('permission', '') if isinstance(permission, dict) else permission
                for pii_perm, pii_desc in pii_permissions.items():
                    if pii_perm in perm_name:
                        data_points.append({
                            'category': f'Mobile App PII Collection: {pii_desc}',
                            'source': 'Mobile Analysis (MobSF)',
                            'description': f"App requests permission to access {pii_desc}",
                            'location': f"Android Manifest Permission: {perm_name}",
                            'risk_level': 'HIGH' if pii_perm in ['READ_CONTACTS', 'ACCESS_FINE_LOCATION', 'READ_SMS'] else 'MEDIUM'
                        })
            
            # Check for insecure data storage (PII at risk)
            security_findings = mobile_scan_results.get('security', {})
            if isinstance(security_findings, dict):
                # Look for storage-related issues
                storage_issues = security_findings.get('file_analysis', {})
                if storage_issues:
                    data_points.append({
                        'category': 'Insecure PII Storage in Mobile App',
                        'source': 'Mobile Analysis (MobSF)',
                        'description': 'App stores data insecurely - PII may be vulnerable to device compromise',
                        'location': 'Mobile application storage',
                        'risk_level': 'HIGH'
                    })
        
        # Extract tracking data from Cookie Analyzer
        if cookie_analysis_results:
            cookies = cookie_analysis_results.get('cookies', [])
            third_party_count = cookie_analysis_results.get('summary', {}).get('third_party_cookies', 0)
            
            if third_party_count > 0:
                data_points.append({
                    'category': 'User Tracking via Cookies',
                    'source': 'Cookie Analyzer',
                    'description': f"{third_party_count} third-party tracking cookies detected",
                    'location': 'Website cookies',
                    'risk_level': 'MEDIUM'
                })
            
            # Check for session cookies that might contain PII
            for cookie in cookies:
                if cookie.get('name', '').lower() in ['session', 'user', 'userid', 'email']:
                    data_points.append({
                        'category': 'Session/User Data in Cookies',
                        'source': 'Cookie Analyzer',
                        'description': f"Cookie '{cookie['name']}' may contain user identifiers",
                        'location': f"Domain: {cookie.get('domain', 'Unknown')}",
                        'risk_level': 'HIGH' if not cookie.get('secure') else 'MEDIUM'
                    })
        
        return {
            'total_data_points': len(data_points),
            'data_points': data_points,
            'categories_detected': list(set(dp['category'] for dp in data_points)),
            'summary': f"Identified {len(data_points)} potential PII-related data points across code and web infrastructure"
        }
    
    def _build_risk_assessment(
        self,
        git_scan_results: Dict[str, Any],
        security_headers_results: Dict[str, Any],
        cookie_analysis_results: Dict[str, Any],
        truffle_scan_results: Dict[str, Any],
        mobile_scan_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build comprehensive risk assessment including mobile and SAST findings"""
        
        critical_risks = []
        high_risks = []
        medium_risks = []
        low_risks = []
        
        # PII detection patterns for severity assessment
        high_severity_pii = ['ssn', 'social security', 'credit', 'cvv', 'passport', 'aadhaar', 'aadhar']
        
        # Analyze Git-Scan findings
        if git_scan_results and git_scan_results.get('findings'):
            for finding in git_scan_results['findings']:
                severity = finding.get('severity', 'MEDIUM')
                risk = {
                    'type': 'Hardcoded Secrets in Code',
                    'description': f"{finding['type']} found in codebase",
                    'location': f"{finding.get('file', 'Unknown')}:{finding.get('line', 'N/A')}",
                    'impact': 'Could expose PII endpoints or data to unauthorized access',
                    'severity': severity,
                    'tool': 'Git-Scan',
                    'recommendation': f"Remove hardcoded {finding['type']} and use secure secret management"
                }
                
                if severity == 'HIGH' or severity == 'CRITICAL':
                    critical_risks.append(risk)
                elif severity == 'MEDIUM':
                    high_risks.append(risk)
                else:
                    medium_risks.append(risk)
        
        # Analyze Security Headers
        if security_headers_results:
            missing_headers = security_headers_results.get('missing_headers', [])
            weak_headers = security_headers_results.get('weak_headers', [])
            security_score = security_headers_results.get('summary', {}).get('security_score', 0)
            
            # Missing HSTS
            if 'Strict Transport Security' in missing_headers:
                high_risks.append({
                    'type': 'Missing HSTS Header',
                    'description': 'HTTP Strict Transport Security not configured',
                    'location': 'Web server configuration',
                    'impact': 'PII transmitted over HTTP could be intercepted (MITM attacks)',
                    'severity': 'HIGH',
                    'tool': 'Security Headers',
                    'recommendation': 'Enable HSTS with max-age=31536000; includeSubDomains'
                })
            
            # Missing CSP
            if 'Content Security Policy' in missing_headers:
                medium_risks.append({
                    'type': 'Missing Content Security Policy',
                    'description': 'No CSP header to prevent XSS attacks',
                    'location': 'Web server configuration',
                    'impact': 'XSS vulnerabilities could lead to PII theft via script injection',
                    'severity': 'MEDIUM',
                    'tool': 'Security Headers',
                    'recommendation': 'Implement Content-Security-Policy header'
                })
            
            # Missing X-Frame-Options
            if 'X-Frame-Options' in missing_headers:
                medium_risks.append({
                    'type': 'Missing X-Frame-Options',
                    'description': 'Application vulnerable to clickjacking attacks',
                    'location': 'Web server configuration',
                    'impact': 'Users could be tricked into submitting PII to malicious sites',
                    'severity': 'MEDIUM',
                    'tool': 'Security Headers',
                    'recommendation': 'Set X-Frame-Options: DENY or SAMEORIGIN'
                })
            
            # Low security score
            if security_score < 50:
                high_risks.append({
                    'type': 'Poor Security Headers Configuration',
                    'description': f'Security score: {security_score}% - Multiple headers missing',
                    'location': 'Web server',
                    'impact': 'Overall weak security posture increases PII leakage risk',
                    'severity': 'HIGH',
                    'tool': 'Security Headers',
                    'recommendation': 'Review and implement all recommended security headers'
                })
        
        # Analyze Cookie Security
        if cookie_analysis_results:
            summary = cookie_analysis_results.get('summary', {})
            non_secure_cookies = summary.get('non_secure_cookies', 0)
            third_party_cookies = summary.get('third_party_cookies', 0)
            risk_level = summary.get('risk_level', 'LOW')
            
            if non_secure_cookies > 0:
                high_risks.append({
                    'type': 'Insecure Cookies Detected',
                    'description': f'{non_secure_cookies} cookies transmitted without Secure flag',
                    'location': 'Website cookies',
                    'impact': 'Cookies containing PII could be intercepted over insecure connections',
                    'severity': 'HIGH',
                    'tool': 'Cookie Analyzer',
                    'recommendation': 'Enable Secure and HttpOnly flags on all cookies'
                })
            
            if third_party_cookies > 0:
                severity = 'HIGH' if third_party_cookies > 5 else 'MEDIUM'
                target_list = high_risks if severity == 'HIGH' else medium_risks
                target_list.append({
                    'type': 'Third-Party Tracking Cookies',
                    'description': f'{third_party_cookies} third-party cookies tracking user behavior',
                    'location': 'Website cookies',
                    'impact': 'User PII and behavior shared with external trackers without consent',
                    'severity': severity,
                    'tool': 'Cookie Analyzer',
                    'recommendation': 'Implement cookie consent mechanism and review third-party integrations'
                })
            
            # Check GDPR compliance
            gdpr_issues = cookie_analysis_results.get('gdpr_compliance', {}).get('issues', [])
            if gdpr_issues:
                medium_risks.append({
                    'type': 'GDPR Cookie Compliance Issues',
                    'description': f"{len(gdpr_issues)} GDPR compliance issues detected",
                    'location': 'Cookie management',
                    'impact': 'Non-compliance with GDPR cookie consent requirements',
                    'severity': 'MEDIUM',
                    'tool': 'Cookie Analyzer',
                    'recommendation': 'Implement compliant cookie consent management system'
                })
        
        # Analyze TruffleHog/SAST findings for hardcoded PII
        if truffle_scan_results and truffle_scan_results.get('findings'):
            for finding in truffle_scan_results['findings']:
                content = finding.get('content', '').lower()
                finding_type = finding.get('type', '').lower()
                file_path = finding.get('file', 'Unknown')
                
                # Check if finding contains high-severity PII
                is_critical_pii = any(pii_term in content or pii_term in finding_type 
                                      for pii_term in high_severity_pii)
                
                severity = 'CRITICAL' if is_critical_pii else 'HIGH'
                impact_desc = 'CRITICAL PII (SSN/Credit Card/Passport) hardcoded in source code' if is_critical_pii else 'PII or sensitive data hardcoded in source code'
                
                risk = {
                    'type': 'Hardcoded PII in Source Code',
                    'description': f"{finding.get('type', 'Sensitive data')} found in uploaded code",
                    'location': f"{file_path}:{finding.get('line', 'N/A')}",
                    'impact': f"{impact_desc} - Direct PII exposure risk and potential GDPR/DPDPA violations",
                    'severity': severity,
                    'tool': 'SAST-Scan (TruffleHog)',
                    'recommendation': f"Remove hardcoded PII from code immediately and implement secure data handling"
                }
                
                if severity == 'CRITICAL':
                    critical_risks.append(risk)
                else:
                    high_risks.append(risk)
        
        # Analyze Mobile App findings for PII-related risks
        if mobile_scan_results:
            # Dangerous permissions related to PII
            permissions = mobile_scan_results.get('permissions', [])
            dangerous_pii_perms = {
                'READ_CONTACTS': ('HIGH', 'Access to user contacts (names, phone numbers, emails)'),
                'READ_SMS': ('HIGH', 'Access to SMS messages containing potential PII'),
                'READ_CALL_LOG': ('HIGH', 'Access to call history with phone numbers'),
                'ACCESS_FINE_LOCATION': ('HIGH', 'Precise location tracking (latitude/longitude)'),
                'CAMERA': ('MEDIUM', 'Access to camera for photos/videos (biometric data)'),
                'RECORD_AUDIO': ('MEDIUM', 'Audio recording capability'),
                'READ_CALENDAR': ('MEDIUM', 'Access to calendar events'),
                'GET_ACCOUNTS': ('MEDIUM', 'Access to device accounts')
            }
            
            for permission in permissions:
                perm_name = permission.get('permission', '') if isinstance(permission, dict) else permission
                for danger_perm, (severity, impact) in dangerous_pii_perms.items():
                    if danger_perm in perm_name:
                        risk = {
                            'type': f'Mobile App PII Permission: {danger_perm}',
                            'description': f'App requests permission to access sensitive user data',
                            'location': f'Android Manifest: {perm_name}',
                            'impact': f'{impact} - Potential unauthorized PII collection',
                            'severity': severity,
                            'tool': 'Mobile Analysis (MobSF)',
                            'recommendation': f'Ensure explicit user consent and implement data minimization for {danger_perm}'
                        }
                        
                        if severity == 'HIGH':
                            high_risks.append(risk)
                        else:
                            medium_risks.append(risk)
            
            # Check for insecure storage (PII vulnerability)
            security = mobile_scan_results.get('security', {})
            if isinstance(security, dict):
                # Insecure data storage
                if security.get('file_analysis') or security.get('shared_preferences'):
                    high_risks.append({
                        'type': 'Insecure Data Storage in Mobile App',
                        'description': 'App stores data without encryption',
                        'location': 'Mobile app storage/shared preferences',
                        'impact': 'User PII vulnerable to device compromise, malware, or unauthorized access',
                        'severity': 'HIGH',
                        'tool': 'Mobile Analysis (MobSF)',
                        'recommendation': 'Implement encrypted storage for all PII using Android Keystore/iOS Keychain'
                    })
                
                # Insecure network communication
                if security.get('network_security') or security.get('ssl_pinning') == False:
                    high_risks.append({
                        'type': 'Insecure Network Communication',
                        'description': 'App transmits data over insecure connections',
                        'location': 'Mobile app network layer',
                        'impact': 'PII transmitted over network vulnerable to interception (Man-in-the-Middle attacks)',
                        'severity': 'HIGH',
                        'tool': 'Mobile Analysis (MobSF)',
                        'recommendation': 'Implement TLS 1.2+, certificate pinning, and network security configuration'
                    })
            
            # Check for privacy policy (GDPR/DPDPA requirement)
            app_details = mobile_scan_results.get('app_name', '')
            if mobile_scan_results.get('permissions') and not mobile_scan_results.get('privacy_policy'):
                medium_risks.append({
                    'type': 'Missing Privacy Policy',
                    'description': 'Mobile app collects PII but lacks privacy policy',
                    'location': 'Mobile application',
                    'impact': 'GDPR/DPDPA non-compliance - Users not informed about data collection',
                    'severity': 'MEDIUM',
                    'tool': 'Mobile Analysis (MobSF)',
                    'recommendation': 'Implement comprehensive privacy policy and display during onboarding'
                })
        
        return {
            'critical_risks': critical_risks,
            'high_risks': high_risks,
            'medium_risks': medium_risks,
            'low_risks': low_risks,
            'total_risks': len(critical_risks) + len(high_risks) + len(medium_risks) + len(low_risks),
            'risk_distribution': {
                'critical': len(critical_risks),
                'high': len(high_risks),
                'medium': len(medium_risks),
                'low': len(low_risks)
            }
        }
    
    def _build_impact_analysis(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Build static impact analysis template based on risk levels"""
        
        total_risks = risk_assessment['total_risks']
        critical_count = len(risk_assessment.get('critical_risks', []))
        high_count = len(risk_assessment.get('high_risks', []))
        
        # Determine severity level
        if critical_count > 0 or high_count >= 3:
            severity = 'SEVERE'
        elif high_count > 0 or total_risks >= 5:
            severity = 'MODERATE'
        else:
            severity = 'MINOR'
        
        return {
            'severity': severity,
            'legal_impact': {
                'title': 'Legal & Regulatory Impact',
                'risks': [
                    {
                        'regulation': 'GDPR (EU General Data Protection Regulation)',
                        'impact': 'Fines up to €20 million or 4% of global annual turnover, whichever is higher',
                        'violations': [
                            'Art. 5 - Failure to secure personal data',
                            'Art. 32 - Inadequate security measures',
                            'Art. 33 - Breach notification requirements (72 hours)'
                        ],
                        'severity': severity
                    },
                    {
                        'regulation': 'DPDPA (Digital Personal Data Protection Act, India)',
                        'impact': 'Penalties up to ₹250 crores for data breaches and non-compliance',
                        'violations': [
                            'Sec. 8 - Breach of data security safeguards',
                            'Sec. 6 - Failure to implement reasonable security practices',
                            'Sec. 7 - Non-compliance with breach notification'
                        ],
                        'severity': severity
                    },
                    {
                        'regulation': 'CCPA (California Consumer Privacy Act)',
                        'impact': 'Civil penalties of $2,500 per violation, $7,500 per intentional violation',
                        'violations': [
                            'Failure to implement reasonable security',
                            'Unauthorized disclosure of personal information',
                            'Non-compliance with consumer rights requests'
                        ],
                        'severity': severity
                    }
                ],
                'additional_risks': [
                    'Class-action lawsuits from affected individuals',
                    'Regulatory investigations and audits',
                    'Mandatory breach notifications to authorities and users',
                    'Potential criminal charges for gross negligence'
                ]
            },
            'reputational_impact': {
                'title': 'Reputational & Brand Impact',
                'risks': [
                    {
                        'area': 'Customer Trust',
                        'impact': 'Severe erosion of customer confidence and loyalty',
                        'consequences': [
                            'Loss of existing customers (30-50% churn rate post-breach)',
                            'Difficulty acquiring new customers',
                            'Negative word-of-mouth and social media backlash',
                            'Reduced customer lifetime value'
                        ]
                    },
                    {
                        'area': 'Media & Public Perception',
                        'impact': 'Widespread negative media coverage and public scrutiny',
                        'consequences': [
                            'Headlines highlighting security failures',
                            'Trending on social media platforms',
                            'Investigative journalism exposing vulnerabilities',
                            'Loss of industry credibility'
                        ]
                    },
                    {
                        'area': 'Business Partnerships',
                        'impact': 'Damaged relationships with partners and vendors',
                        'consequences': [
                            'Contract terminations or penalties',
                            'Failed security audits for enterprise clients',
                            'Exclusion from partnership opportunities',
                            'Increased vendor scrutiny and requirements'
                        ]
                    },
                    {
                        'area': 'Employee Morale',
                        'impact': 'Internal reputation damage affecting talent retention',
                        'consequences': [
                            'Difficulty recruiting top security talent',
                            'Employee departures due to brand damage',
                            'Reduced productivity during crisis management',
                            'Loss of institutional knowledge'
                        ]
                    }
                ],
                'recovery_time': '12-24 months to rebuild reputation after major breach'
            },
            'financial_impact': {
                'title': 'Financial Impact',
                'direct_costs': [
                    {
                        'category': 'Regulatory Fines',
                        'estimated_cost': 'GDPR: Up to €20M or 4% revenue | DPDPA: Up to ₹250 crores',
                        'probability': 'High if breach occurs'
                    },
                    {
                        'category': 'Incident Response',
                        'estimated_cost': '$500,000 - $5,000,000',
                        'components': [
                            'Forensic investigation and root cause analysis',
                            'Legal counsel and compliance consultants',
                            'Public relations and crisis management',
                            'Breach notification costs (mailings, call centers)'
                        ]
                    },
                    {
                        'category': 'Remediation',
                        'estimated_cost': '$200,000 - $2,000,000',
                        'components': [
                            'Security infrastructure upgrades',
                            'Software patches and code fixes',
                            'Third-party security audits',
                            'Enhanced monitoring and detection systems'
                        ]
                    },
                    {
                        'category': 'Victim Compensation',
                        'estimated_cost': '$50 - $500 per affected user',
                        'components': [
                            'Credit monitoring services (1-2 years)',
                            'Identity theft insurance',
                            'Settlement payouts for lawsuits'
                        ]
                    }
                ],
                'indirect_costs': [
                    {
                        'category': 'Revenue Loss',
                        'impact': '15-30% revenue decline in year following breach',
                        'factors': [
                            'Customer churn and cancellations',
                            'Failed customer acquisition',
                            'Lost sales opportunities',
                            'Contract penalties and terminations'
                        ]
                    },
                    {
                        'category': 'Stock Price Impact',
                        'impact': 'Average 7.5% decline in stock price post-breach (for public companies)',
                        'duration': 'Can take 12+ months to recover'
                    },
                    {
                        'category': 'Insurance Premiums',
                        'impact': '50-200% increase in cyber insurance premiums',
                        'duration': '3-5 years of elevated rates'
                    },
                    {
                        'category': 'Opportunity Cost',
                        'impact': 'Delayed product launches and strategic initiatives',
                        'factors': [
                            'Diverted engineering resources to remediation',
                            'Postponed marketing campaigns',
                            'Cancelled expansion plans'
                        ]
                    }
                ],
                'total_estimated_cost': '$2M - $10M+ depending on breach severity and company size',
                'cost_per_record': '$150 - $300 per compromised PII record (industry average)'
            },
            'overall_severity': severity,
            'impact_summary': self._get_impact_summary(severity, total_risks)
        }
    
    def _get_impact_summary(self, severity: str, total_risks: int) -> str:
        """Generate impact summary based on severity"""
        if severity == 'SEVERE':
            return (
                f"CRITICAL: {total_risks} significant PII leakage risks detected. "
                "Immediate action required to prevent severe legal, reputational, and financial consequences. "
                "Potential fines in millions, major brand damage, and substantial customer loss expected if risks materialize."
            )
        elif severity == 'MODERATE':
            return (
                f"MODERATE: {total_risks} PII leakage risks identified. "
                "Timely remediation recommended to avoid regulatory penalties and reputational damage. "
                "Estimated financial impact could reach hundreds of thousands if not addressed."
            )
        else:
            return (
                f"MINOR: {total_risks} low-level PII risks detected. "
                "While immediate impact is limited, addressing these issues will strengthen overall security posture "
                "and prevent escalation to more serious vulnerabilities."
            )
    
    def _build_mitigation_plan(
        self,
        git_scan_results: Dict[str, Any],
        security_headers_results: Dict[str, Any],
        cookie_analysis_results: Dict[str, Any],
        truffle_scan_results: Dict[str, Any],
        mobile_scan_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build actionable mitigation plan including SAST and Mobile recommendations"""
        
        recommendations = []
        
        # Git-Scan recommendations
        if git_scan_results and git_scan_results.get('findings'):
            for finding in git_scan_results['findings']:
                recommendations.append({
                    'priority': 'CRITICAL',
                    'category': 'Secret Management',
                    'issue': f"Hardcoded {finding['type']} in code",
                    'location': f"{finding.get('file', 'Unknown')}:{finding.get('line', 'N/A')}",
                    'action': 'Remove hardcoded secret and implement secure secret management',
                    'implementation': [
                        'Immediately revoke/rotate the exposed credential',
                        'Remove hardcoded value from code and Git history',
                        'Use environment variables or secret management service (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)',
                        'Implement pre-commit hooks to prevent future secret commits'
                    ],
                    'tools': ['git-secrets', 'AWS Secrets Manager', 'Azure Key Vault', 'HashiCorp Vault'],
                    'estimated_effort': '2-4 hours',
                    'compliance_impact': 'GDPR Art. 32, DPDPA Sec. 8'
                })
        
        # Security Headers recommendations
        if security_headers_results:
            missing_headers = security_headers_results.get('missing_headers', [])
            
            if missing_headers:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Security Headers',
                    'issue': f"{len(missing_headers)} critical security headers missing",
                    'location': 'Web server configuration',
                    'action': 'Configure missing security headers',
                    'implementation': [
                        'Enable HSTS: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
                        'Add CSP: Content-Security-Policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'',
                        'Set X-Frame-Options: DENY or SAMEORIGIN',
                        'Enable X-Content-Type-Options: nosniff',
                        'Configure Referrer-Policy: strict-origin-when-cross-origin',
                        'Test headers using securityheaders.com'
                    ],
                    'tools': ['Nginx/Apache config', 'Helmet.js (Node.js)', 'SecurityHeaders middleware'],
                    'estimated_effort': '4-8 hours',
                    'compliance_impact': 'GDPR Art. 32 (Security measures)'
                })
        
        # Cookie recommendations
        if cookie_analysis_results:
            summary = cookie_analysis_results.get('summary', {})
            
            if summary.get('non_secure_cookies', 0) > 0:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Cookie Security',
                    'issue': f"{summary['non_secure_cookies']} cookies lacking security flags",
                    'location': 'Cookie configuration',
                    'action': 'Enable Secure, HttpOnly, and SameSite flags on all cookies',
                    'implementation': [
                        'Set Secure flag to ensure HTTPS-only transmission',
                        'Enable HttpOnly to prevent JavaScript access',
                        'Configure SameSite=Strict or Lax for CSRF protection',
                        'Review and minimize cookie expiration times',
                        'Encrypt sensitive cookie values'
                    ],
                    'tools': ['Express-session (Node.js)', 'Cookie middleware', 'Django session settings'],
                    'estimated_effort': '2-4 hours',
                    'compliance_impact': 'GDPR Art. 5 (Integrity and confidentiality)'
                })
            
            if summary.get('third_party_cookies', 0) > 0:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'Privacy Compliance',
                    'issue': f"{summary['third_party_cookies']} third-party tracking cookies detected",
                    'location': 'Website tracking',
                    'action': 'Implement cookie consent management system',
                    'implementation': [
                        'Deploy cookie consent banner before any tracking',
                        'Categorize cookies (strictly necessary, functional, analytics, marketing)',
                        'Allow users to accept/reject cookie categories',
                        'Store consent preferences and respect user choices',
                        'Review necessity of each third-party integration',
                        'Consider privacy-focused alternatives (e.g., Plausible vs Google Analytics)'
                    ],
                    'tools': ['Cookiebot', 'OneTrust', 'Osano', 'CookieYes'],
                    'estimated_effort': '8-16 hours',
                    'compliance_impact': 'GDPR Art. 7 (Consent), CCPA (User rights)'
                })
        
        # TruffleHog/SAST recommendations
        if truffle_scan_results and truffle_scan_results.get('findings'):
            for finding in truffle_scan_results['findings']:
                content = finding.get('content', '').lower()
                finding_type = finding.get('type', '').lower()
                
                # Check for critical PII
                high_severity_pii = ['ssn', 'social security', 'credit', 'cvv', 'passport', 'aadhaar']
                is_critical = any(pii in content or pii in finding_type for pii in high_severity_pii)
                
                recommendations.append({
                    'priority': 'CRITICAL' if is_critical else 'HIGH',
                    'category': 'PII Leakage Prevention',
                    'issue': f"Hardcoded PII found: {finding.get('type', 'Sensitive data')}",
                    'location': f"{finding.get('file', 'Code')}:{finding.get('line', 'N/A')}",
                    'action': 'Remove hardcoded PII and implement secure data handling',
                    'implementation': [
                        'IMMEDIATELY remove the hardcoded PII from source code',
                        'Rotate any exposed credentials or tokens',
                        'Store PII securely in encrypted database with proper access controls',
                        'Use environment variables for configuration secrets',
                        'Implement data encryption at rest (AES-256)',
                        'Add pre-commit hooks to prevent future PII commits (GitLeaks/TruffleHog)',
                        'Conduct git history cleanup to remove PII from all commits'
                    ],
                    'tools': ['Git-crypt', 'HashiCorp Vault', 'AWS Secrets Manager', 'Azure Key Vault'],
                    'estimated_effort': '4-8 hours',
                    'compliance_impact': 'GDPR Art. 5 (Security), DPDPA Sec. 8 (Data breach), CCPA (Security practices)'
                })
        
        # Mobile Analysis recommendations
        if mobile_scan_results:
            permissions = mobile_scan_results.get('permissions', [])
            
            # Check for dangerous PII-related permissions
            dangerous_perms = ['READ_CONTACTS', 'READ_SMS', 'READ_CALL_LOG', 'ACCESS_FINE_LOCATION']
            has_dangerous = any(any(dp in (p.get('permission', '') if isinstance(p, dict) else p) 
                                   for dp in dangerous_perms) for p in permissions)
            
            if has_dangerous:
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Mobile Privacy',
                    'issue': 'Mobile app requests access to sensitive PII',
                    'location': 'Android Manifest permissions',
                    'action': 'Implement runtime permission requests with clear justification',
                    'implementation': [
                        'Request permissions at runtime (not at install time)',
                        'Provide clear explanation before requesting each permission',
                        'Implement graceful degradation if permission denied',
                        'Only request minimum necessary permissions (data minimization)',
                        'Add privacy policy link in app and Play Store',
                        'Implement opt-in for location tracking and contacts access',
                        'Use Android 13+ photo picker instead of storage permissions'
                    ],
                    'tools': ['Android Permission API', 'Privacy Policy Generator'],
                    'estimated_effort': '8-16 hours',
                    'compliance_impact': 'GDPR Art. 7 (Consent), DPDPA Sec. 6 (Notice), CCPA (Consumer rights)'
                })
            
            # Check for insecure storage
            security = mobile_scan_results.get('security', {})
            if isinstance(security, dict) and (security.get('file_analysis') or security.get('shared_preferences')):
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Mobile Security',
                    'issue': 'Mobile app stores PII without encryption',
                    'location': 'App local storage',
                    'action': 'Implement encrypted storage for all sensitive data',
                    'implementation': [
                        'Use Android Keystore/iOS Keychain for credential storage',
                        'Encrypt SharedPreferences/UserDefaults with AES-256',
                        'Never store PII in plain text files or SQLite without encryption',
                        'Implement certificate pinning for API communications',
                        'Use encrypted realm/SQLCipher for local databases',
                        'Enable app-specific encryption on Android 10+',
                        'Implement secure data wipe on app uninstall'
                    ],
                    'tools': ['Android Keystore', 'SQLCipher', 'Realm Encryption', 'Jetpack Security Crypto'],
                    'estimated_effort': '12-24 hours',
                    'compliance_impact': 'GDPR Art. 32 (Encryption), DPDPA Sec. 8 (Security safeguards)'
                })
            
            # Check for network security
            if isinstance(security, dict) and (security.get('network_security') or security.get('ssl_pinning') == False):
                recommendations.append({
                    'priority': 'HIGH',
                    'category': 'Mobile Network Security',
                    'issue': 'Mobile app transmits PII over insecure connections',
                    'location': 'Network communication layer',
                    'action': 'Enforce TLS 1.2+ and implement certificate pinning',
                    'implementation': [
                        'Configure Network Security Config (Android) / App Transport Security (iOS)',
                        'Enforce TLS 1.2 or higher for all API calls',
                        'Implement certificate pinning for backend APIs',
                        'Disable cleartext traffic (HTTP)',
                        'Use HTTPS for all endpoints transmitting PII',
                        'Implement SSL/TLS verification with proper error handling',
                        'Add integrity checks for API responses'
                    ],
                    'tools': ['OkHttp Certificate Pinning', 'Network Security Config', 'TrustKit'],
                    'estimated_effort': '6-12 hours',
                    'compliance_impact': 'GDPR Art. 32 (Transmission security), DPDPA Sec. 8 (Technical safeguards)'
                })
        
        # General best practices
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Data Minimization',
            'issue': 'Implement data minimization principles',
            'location': 'Application-wide',
            'action': 'Review and minimize PII collection and retention',
            'implementation': [
                'Audit all PII fields collected across application',
                'Remove unnecessary PII collection points',
                'Implement data retention policies (auto-delete after N days)',
                'Anonymize or pseudonymize data where possible',
                'Encrypt PII at rest using AES-256',
                'Mask PII in logs and error messages'
            ],
            'tools': ['Database encryption', 'Log masking libraries', 'Data retention scripts'],
            'estimated_effort': '16-40 hours',
            'compliance_impact': 'GDPR Art. 5 (Data minimization), DPDPA Sec. 4'
        })
        
        recommendations.append({
            'priority': 'MEDIUM',
            'category': 'Secure Development',
            'issue': 'Establish secure SDLC practices',
            'location': 'Development pipeline',
            'action': 'Integrate security into development lifecycle',
            'implementation': [
                'Add SAST/DAST tools to CI/CD pipeline',
                'Implement mandatory security code reviews',
                'Conduct regular security training for developers',
                'Perform quarterly penetration testing',
                'Establish incident response plan',
                'Enable automated vulnerability scanning'
            ],
            'tools': ['SonarQube', 'Snyk', 'OWASP ZAP', 'GitLeaks', 'Dependabot'],
            'estimated_effort': '40+ hours initial setup',
            'compliance_impact': 'GDPR Art. 32 (Technical measures)'
        })
        
        # Sort by priority
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 99))
        
        return {
            'recommendations': recommendations,
            'total_recommendations': len(recommendations),
            'critical_count': len([r for r in recommendations if r['priority'] == 'CRITICAL']),
            'high_count': len([r for r in recommendations if r['priority'] == 'HIGH']),
            'medium_count': len([r for r in recommendations if r['priority'] == 'MEDIUM']),
            'estimated_total_effort': '2-4 weeks for complete implementation',
            'immediate_actions': [r for r in recommendations if r['priority'] in ['CRITICAL', 'HIGH']][:3]
        }
    
    def _build_compliance_check(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Build compliance checklist"""
        
        total_risks = risk_assessment['total_risks']
        high_risk_count = len(risk_assessment.get('high_risks', [])) + len(risk_assessment.get('critical_risks', []))
        
        return {
            'regulations': [
                {
                    'name': 'GDPR (General Data Protection Regulation)',
                    'jurisdiction': 'European Union',
                    'compliance_status': 'NON_COMPLIANT' if high_risk_count > 0 else 'PARTIAL',
                    'key_requirements': [
                        {
                            'article': 'Art. 5 - Principles',
                            'requirement': 'Lawful, fair, transparent processing; data minimization',
                            'status': 'REVIEW_REQUIRED',
                            'notes': 'Review data collection and retention policies'
                        },
                        {
                            'article': 'Art. 6 - Lawfulness',
                            'requirement': 'Valid legal basis for processing (consent, contract, etc.)',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Ensure consent mechanisms are properly implemented'
                        },
                        {
                            'article': 'Art. 32 - Security',
                            'requirement': 'Appropriate technical and organizational measures',
                            'status': 'NON_COMPLIANT' if high_risk_count > 0 else 'PARTIAL',
                            'notes': f'{total_risks} security risks identified requiring remediation'
                        },
                        {
                            'article': 'Art. 33 - Breach Notification',
                            'requirement': 'Report breaches within 72 hours to supervisory authority',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Ensure incident response plan includes breach notification procedures'
                        },
                        {
                            'article': 'Art. 25 - Privacy by Design',
                            'requirement': 'Data protection by design and by default',
                            'status': 'REVIEW_REQUIRED',
                            'notes': 'Implement privacy-first architecture principles'
                        }
                    ],
                    'penalties': 'Up to €20 million or 4% of global annual turnover',
                    'authority': 'Data Protection Authority (DPA) in each EU member state'
                },
                {
                    'name': 'DPDPA (Digital Personal Data Protection Act)',
                    'jurisdiction': 'India',
                    'compliance_status': 'NON_COMPLIANT' if high_risk_count > 0 else 'PARTIAL',
                    'key_requirements': [
                        {
                            'section': 'Sec. 4 - Obligations',
                            'requirement': 'Process data lawfully, with consent, for specified purpose',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Verify consent collection mechanisms'
                        },
                        {
                            'section': 'Sec. 6 - General Obligations',
                            'requirement': 'Implement reasonable security safeguards',
                            'status': 'NON_COMPLIANT' if high_risk_count > 0 else 'PARTIAL',
                            'notes': f'{total_risks} security gaps identified'
                        },
                        {
                            'section': 'Sec. 8 - Data Breach',
                            'requirement': 'Notify Board and affected individuals of breaches',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Establish breach notification procedures'
                        },
                        {
                            'section': 'Sec. 10 - Data Localization',
                            'requirement': 'Store certain data within India (if applicable)',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Review data storage locations for sensitive categories'
                        }
                    ],
                    'penalties': 'Up to ₹250 crores per violation',
                    'authority': 'Data Protection Board of India'
                },
                {
                    'name': 'CCPA (California Consumer Privacy Act)',
                    'jurisdiction': 'California, USA',
                    'compliance_status': 'PARTIAL',
                    'key_requirements': [
                        {
                            'section': '1798.100 - Right to Know',
                            'requirement': 'Disclose categories and specific PII collected',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Ensure privacy policy includes required disclosures'
                        },
                        {
                            'section': '1798.105 - Right to Delete',
                            'requirement': 'Allow consumers to request deletion of PII',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Implement data deletion workflows'
                        },
                        {
                            'section': '1798.120 - Right to Opt-Out',
                            'requirement': 'Provide opt-out for sale of personal information',
                            'status': 'MANUAL_REVIEW',
                            'notes': 'Add "Do Not Sell My Personal Information" link if applicable'
                        },
                        {
                            'section': '1798.150 - Security',
                            'requirement': 'Implement reasonable security measures',
                            'status': 'REVIEW_REQUIRED' if total_risks > 0 else 'COMPLIANT',
                            'notes': f'{total_risks} security issues to address'
                        }
                    ],
                    'penalties': '$2,500 per violation; $7,500 per intentional violation',
                    'authority': 'California Attorney General'
                }
            ],
            'overall_compliance': 'NON_COMPLIANT' if high_risk_count >= 3 else 'PARTIAL',
            'compliance_score': max(0, 100 - (high_risk_count * 20) - (total_risks * 5)),
            'recommendations': [
                'Conduct full privacy audit with legal counsel',
                'Appoint Data Protection Officer (DPO) if required',
                'Document data processing activities (ROPA - Record of Processing Activities)',
                'Implement Data Subject Rights (access, deletion, portability) workflows',
                'Establish vendor due diligence for third-party processors',
                'Conduct regular compliance training for employees'
            ]
        }
    
    def _calculate_overall_risk(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall risk score and level"""
        
        critical_risks = len(risk_assessment.get('critical_risks', []))
        high_risks = len(risk_assessment.get('high_risks', []))
        medium_risks = len(risk_assessment.get('medium_risks', []))
        low_risks = len(risk_assessment.get('low_risks', []))
        
        # Weighted risk score (0-100)
        risk_score = min(100, (
            critical_risks * 100 +
            high_risks * 75 +
            medium_risks * 50 +
            low_risks * 25
        ) / 10)
        
        # Determine risk level
        if critical_risks > 0 or risk_score >= 80:
            risk_level = 'CRITICAL'
            risk_color = '#DC2626'  # Red
        elif high_risks >= 3 or risk_score >= 60:
            risk_level = 'HIGH'
            risk_color = '#EA580C'  # Orange
        elif high_risks > 0 or risk_score >= 40:
            risk_level = 'MEDIUM'
            risk_color = '#F59E0B'  # Amber
        else:
            risk_level = 'LOW'
            risk_color = '#10B981'  # Green
        
        return {
            'risk_level': risk_level,
            'risk_score': round(risk_score, 1),
            'risk_color': risk_color,
            'risk_distribution': {
                'critical': critical_risks,
                'high': high_risks,
                'medium': medium_risks,
                'low': low_risks
            },
            'total_risks': critical_risks + high_risks + medium_risks + low_risks,
            'description': self._get_risk_description(risk_level, risk_score)
        }
    
    def _get_risk_description(self, level: str, score: float) -> str:
        """Get risk level description"""
        descriptions = {
            'CRITICAL': f'CRITICAL risk level ({score}/100). Immediate action required to prevent severe PII leakage and regulatory violations.',
            'HIGH': f'HIGH risk level ({score}/100). Significant PII leakage risks identified. Prompt remediation recommended.',
            'MEDIUM': f'MEDIUM risk level ({score}/100). Moderate PII risks detected. Address issues to strengthen security posture.',
            'LOW': f'LOW risk level ({score}/100). Minor risks identified. Continue monitoring and implement best practices.'
        }
        return descriptions.get(level, f'Risk level: {level} ({score}/100)')
    
    def _build_executive_summary(
        self,
        overall_risk: Dict[str, Any],
        risk_assessment: Dict[str, Any],
        data_inventory: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build executive summary"""
        
        return {
            'title': 'Privacy Impact Assessment - Executive Summary',
            'risk_level': overall_risk['risk_level'],
            'risk_score': overall_risk['risk_score'],
            'key_findings': [
                f"{data_inventory['total_data_points']} potential PII-related data points identified",
                f"{risk_assessment['total_risks']} privacy and security risks detected",
                f"{len(risk_assessment.get('critical_risks', []))} critical issues requiring immediate attention",
                f"{len(risk_assessment.get('high_risks', []))} high-priority risks needing prompt remediation"
            ],
            'summary': (
                f"This Privacy Impact Assessment identified {risk_assessment['total_risks']} risks "
                f"related to potential PII leakage across code, web infrastructure, and data handling practices. "
                f"The overall risk level is assessed as {overall_risk['risk_level']} with a risk score of "
                f"{overall_risk['risk_score']}/100. "
                f"{'Immediate action is required to address critical security gaps and prevent regulatory violations.' if overall_risk['risk_level'] in ['CRITICAL', 'HIGH'] else 'Timely remediation is recommended to strengthen privacy protections.'}"
            ),
            'urgency': 'IMMEDIATE' if overall_risk['risk_level'] == 'CRITICAL' else 'HIGH' if overall_risk['risk_level'] == 'HIGH' else 'MEDIUM'
        }

