"""
Data Protection Impact Assessment (DPIA) Analyzer

This module provides comprehensive DPIA analysis including:
1. Data Inventory (Dynamic)
2. Risk Assessment (Dynamic) 
3. Impact Analysis (Static)
4. Mitigation Plan (Static)
5. Compliance Check (Static)
"""

import json
from datetime import datetime
from typing import Dict, List, Any, Optional


class DPIAAnalyzer:
    """Comprehensive Data Protection Impact Assessment analyzer"""
    
    def __init__(self):
        self.pii_patterns = {
            'user_identifiers': [
                'name', 'email', 'phone', 'address', 'aadhaar', 'ssn', 'passport',
                'user_id', 'customer_id', 'employee_id', 'username', 'login'
            ],
            'device_data': [
                'imei', 'device_id', 'mac_address', 'ip_address', 'location',
                'gps', 'coordinates', 'device_info', 'hardware_id'
            ],
            'authentication': [
                'password', 'token', 'key', 'secret', 'biometric', 'fingerprint',
                'face_id', 'pin', 'otp', 'session', 'auth'
            ],
            'financial': [
                'credit_card', 'bank_account', 'payment', 'transaction',
                'billing', 'invoice', 'salary', 'income'
            ],
            'health': [
                'medical', 'health', 'diagnosis', 'treatment', 'prescription',
                'patient', 'doctor', 'hospital', 'insurance'
            ]
        }
        
        self.risk_categories = {
            'data_leakage': ['hardcoded_secrets', 'insecure_storage', 'unencrypted_transmission'],
            'access_control': ['excessive_permissions', 'weak_authentication', 'privilege_escalation'],
            'compliance': ['missing_consent', 'data_retention', 'cross_border_transfer'],
            'third_party': ['sdk_risks', 'api_exposure', 'vendor_management']
        }

    def generate_dpia_report(self, 
                           git_scan_results: Optional[Dict] = None,
                           truffle_scan_results: Optional[Dict] = None,
                           mobile_scan_results: Optional[Dict] = None,
                           security_headers_results: Optional[Dict] = None,
                           cookie_analysis_results: Optional[Dict] = None,
                           project_info: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate comprehensive DPIA report
        
        Args:
            git_scan_results: GitLeaks scan results
            truffle_scan_results: TruffleHog SAST scan results
            mobile_scan_results: MobSF mobile analysis results
            security_headers_results: Security headers analysis
            cookie_analysis_results: Cookie analysis results
            project_info: Project information
            
        Returns:
            Complete DPIA report dictionary
        """
        print("🔍 DEBUG: Initializing DPIA Analyzer...")
        
        # 1. Data Inventory (Dynamic)
        data_inventory = self._build_data_inventory(
            git_scan_results, truffle_scan_results, mobile_scan_results,
            security_headers_results, cookie_analysis_results
        )
        
        # 2. Risk Assessment (Dynamic)
        risk_assessment = self._build_risk_assessment(
            git_scan_results, truffle_scan_results, mobile_scan_results,
            security_headers_results, cookie_analysis_results
        )
        
        # 3. Impact Analysis (Static)
        impact_analysis = self._build_impact_analysis(risk_assessment)
        
        # 4. Mitigation Plan (Static)
        mitigation_plan = self._build_mitigation_plan(risk_assessment)
        
        # 5. Compliance Check (Static)
        compliance_check = self._build_compliance_check(data_inventory, risk_assessment)
        
        # Calculate overall scores
        overall_risk = self._calculate_overall_risk(risk_assessment)
        overall_impact = self._calculate_overall_impact(impact_analysis)
        overall_compliance = self._calculate_overall_compliance(compliance_check)
        
        dpia_report = {
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'report_type': 'Data Protection Impact Assessment (DPIA)',
                'version': '1.0',
                'project_info': project_info or {}
            },
            'executive_summary': self._build_executive_summary(
                overall_risk, overall_impact, overall_compliance, risk_assessment
            ),
            'data_inventory': data_inventory,
            'risk_assessment': risk_assessment,
            'impact_analysis': impact_analysis,
            'mitigation_plan': mitigation_plan,
            'compliance_check': compliance_check,
            'overall_risk': overall_risk,
            'overall_impact': overall_impact,
            'overall_compliance': overall_compliance,
            'recommendations_count': len(mitigation_plan.get('recommendations', [])),
            'mitigation_measures_count': len(mitigation_plan.get('mitigation_measures', []))
        }
        
        print("🔍 DEBUG: DPIA report generated successfully")
        return dpia_report

    def _build_data_inventory(self, git_scan_results, truffle_scan_results, 
                            mobile_scan_results, security_headers_results, 
                            cookie_analysis_results) -> Dict[str, Any]:
        """Build comprehensive data inventory from scan results"""
        
        data_inventory = {
            'pii_categories': {},
            'data_flows': [],
            'third_party_integrations': [],
            'data_retention': {},
            'total_data_points': 0
        }
        
        # Extract PII from TruffleHog (SAST-Scan)
        if truffle_scan_results and truffle_scan_results.get('findings'):
            for finding in truffle_scan_results['findings']:
                if finding.get('detector_type') == 'Hardcoded PII':
                    pii_type = finding.get('detector_name', 'unknown')
                    if pii_type not in data_inventory['pii_categories']:
                        data_inventory['pii_categories'][pii_type] = 0
                    data_inventory['pii_categories'][pii_type] += 1
                    data_inventory['total_data_points'] += 1
        
        # Extract PII from Mobile Analysis
        if mobile_scan_results:
            # Check for PII-related permissions
            permissions = mobile_scan_results.get('permissions', [])
            for permission in permissions:
                if any(pii_type in permission.lower() for pii_type in ['camera', 'location', 'contacts', 'phone']):
                    if 'mobile_permissions' not in data_inventory['pii_categories']:
                        data_inventory['pii_categories']['mobile_permissions'] = 0
                    data_inventory['pii_categories']['mobile_permissions'] += 1
                    data_inventory['total_data_points'] += 1
            
            # Check for third-party SDKs
            sdk_list = mobile_scan_results.get('sdk_list', [])
            for sdk in sdk_list:
                data_inventory['third_party_integrations'].append({
                    'name': sdk.get('name', 'Unknown SDK'),
                    'type': 'Mobile SDK',
                    'risk_level': 'Medium'  # Default risk for third-party SDKs
                })
        
        # Extract data from Cookie Analysis
        if cookie_analysis_results and cookie_analysis_results.get('cookies'):
            for cookie in cookie_analysis_results['cookies']:
                if cookie.get('category') in ['Analytics', 'Advertising', 'Social Media']:
                    data_inventory['third_party_integrations'].append({
                        'name': cookie.get('name', 'Unknown Cookie'),
                        'type': 'Cookie/Tracking',
                        'risk_level': 'Low' if cookie.get('category') == 'Analytics' else 'Medium'
                    })
                    data_inventory['total_data_points'] += 1
        
        # Categorize PII based on patterns
        for category, patterns in self.pii_patterns.items():
            if category not in data_inventory['pii_categories']:
                data_inventory['pii_categories'][category] = 0
        
        return data_inventory

    def _build_risk_assessment(self, git_scan_results, truffle_scan_results,
                             mobile_scan_results, security_headers_results,
                             cookie_analysis_results) -> Dict[str, Any]:
        """Build comprehensive risk assessment"""
        
        risks = []
        risk_distribution = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        
        # Analyze TruffleHog findings
        if truffle_scan_results and truffle_scan_results.get('findings'):
            for finding in truffle_scan_results['findings']:
                if finding.get('detector_type') == 'Hardcoded PII':
                    risk_level = 'Critical' if 'password' in finding.get('detector_name', '').lower() else 'High'
                    risks.append({
                        'id': f"truffle_{finding.get('id', 'unknown')}",
                        'title': f"Hardcoded PII: {finding.get('detector_name', 'Unknown')}",
                        'description': f"Hardcoded PII found in {finding.get('file', 'unknown file')}",
                        'severity': risk_level,
                        'category': 'data_leakage',
                        'source': 'SAST-Scan (TruffleHog)',
                        'recommendation': 'Remove hardcoded PII and use secure configuration management'
                    })
                    risk_distribution[risk_level.lower()] += 1
        
        # Analyze Mobile Analysis findings
        if mobile_scan_results:
            # Check for dangerous permissions
            dangerous_permissions = mobile_scan_results.get('dangerous_permissions', [])
            for permission in dangerous_permissions:
                risks.append({
                    'id': f"mobile_permission_{permission}",
                    'title': f"Dangerous Permission: {permission}",
                    'description': f"App requests dangerous permission: {permission}",
                    'severity': 'High',
                    'category': 'access_control',
                    'source': 'Mobile Analysis (MobSF)',
                    'recommendation': 'Review permission necessity and implement least privilege principle'
                })
                risk_distribution['high'] += 1
            
            # Check for insecure storage
            insecure_storage = mobile_scan_results.get('insecure_storage', [])
            for storage in insecure_storage:
                risks.append({
                    'id': f"mobile_storage_{storage}",
                    'title': f"Insecure Storage: {storage}",
                    'description': f"Data stored insecurely: {storage}",
                    'severity': 'Medium',
                    'category': 'data_leakage',
                    'source': 'Mobile Analysis (MobSF)',
                    'recommendation': 'Implement secure storage mechanisms and encryption'
                })
                risk_distribution['medium'] += 1
        
        # Analyze Security Headers
        if security_headers_results and security_headers_results.get('missing_headers'):
            for header in security_headers_results['missing_headers']:
                risks.append({
                    'id': f"security_header_{header}",
                    'title': f"Missing Security Header: {header}",
                    'description': f"Important security header missing: {header}",
                    'severity': 'Medium',
                    'category': 'data_leakage',
                    'source': 'Security Headers Analysis',
                    'recommendation': f'Implement {header} header for enhanced security'
                })
                risk_distribution['medium'] += 1
        
        # Analyze Cookie Analysis
        if cookie_analysis_results and cookie_analysis_results.get('privacy_risks'):
            for risk in cookie_analysis_results['privacy_risks']:
                risks.append({
                    'id': f"cookie_risk_{risk.get('type', 'unknown')}",
                    'title': f"Cookie Privacy Risk: {risk.get('type', 'Unknown')}",
                    'description': risk.get('description', 'Privacy risk identified in cookie usage'),
                    'severity': 'Low',
                    'category': 'compliance',
                    'source': 'Cookie Analysis',
                    'recommendation': 'Review cookie usage and implement privacy-compliant practices'
                })
                risk_distribution['low'] += 1
        
        total_risks = sum(risk_distribution.values())
        
        return {
            'risks': risks,
            'risk_distribution': risk_distribution,
            'total_risks': total_risks,
            'risk_categories': {
                'data_leakage': len([r for r in risks if r['category'] == 'data_leakage']),
                'access_control': len([r for r in risks if r['category'] == 'access_control']),
                'compliance': len([r for r in risks if r['category'] == 'compliance']),
                'third_party': len([r for r in risks if r['category'] == 'third_party'])
            }
        }

    def _build_impact_analysis(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Build impact analysis with legal, financial, and reputational assessments"""
        
        total_risks = risk_assessment.get('total_risks', 0)
        critical_risks = risk_assessment.get('risk_distribution', {}).get('critical', 0)
        high_risks = risk_assessment.get('risk_distribution', {}).get('high', 0)
        
        # Legal Impact Assessment
        legal_impact = {
            'score': min(100, (critical_risks * 25) + (high_risks * 15) + (total_risks * 2)),
            'gdpr_fines': {
                'potential_fine': f"€{min(20000000, (critical_risks * 5000000) + (high_risks * 2000000)):,}",
                'fine_percentage': f"{min(4, (critical_risks * 1.5) + (high_risks * 0.8)):.1f}% of annual revenue",
                'violations': ['Article 32 - Security of processing', 'Article 25 - Data protection by design']
            },
            'dpdpa_penalties': {
                'potential_penalty': f"₹{min(250000000, (critical_risks * 100000000) + (high_risks * 50000000)):,}",
                'violations': ['Section 8 - Purpose limitation', 'Section 9 - Data minimization']
            },
            'hipaa_violations': {
                'potential_fine': f"${min(1500000, (critical_risks * 500000) + (high_risks * 200000)):,}",
                'violations': ['164.308 - Administrative safeguards', '164.312 - Technical safeguards']
            },
            'ccpa_penalties': {
                'potential_penalty': f"${min(7500, (critical_risks * 2500) + (high_risks * 1000)):,} per violation",
                'violations': ['Section 1798.150 - Consumer rights', 'Section 1798.105 - Right to delete']
            }
        }
        
        # Financial Impact Assessment
        financial_impact = {
            'score': min(100, (critical_risks * 30) + (high_risks * 20) + (total_risks * 3)),
            'investigation_costs': {
                'forensic_analysis': f"${min(500000, (critical_risks * 200000) + (high_risks * 100000)):,}",
                'legal_fees': f"${min(1000000, (critical_risks * 400000) + (high_risks * 200000)):,}",
                'regulatory_consultation': f"${min(200000, (critical_risks * 100000) + (high_risks * 50000)):,}"
            },
            'business_disruption': {
                'system_downtime': f"{min(30, (critical_risks * 10) + (high_risks * 5))} days",
                'revenue_loss': f"${min(5000000, (critical_risks * 2000000) + (high_risks * 1000000)):,}",
                'remediation_costs': f"${min(2000000, (critical_risks * 1000000) + (high_risks * 500000)):,}"
            },
            'customer_impact': {
                'notification_costs': f"${min(500000, (critical_risks * 200000) + (high_risks * 100000)):,}",
                'credit_monitoring': f"${min(1000000, (critical_risks * 500000) + (high_risks * 250000)):,}",
                'customer_churn': f"{min(25, (critical_risks * 10) + (high_risks * 5))}%"
            }
        }
        
        # Reputational Impact Assessment
        reputational_impact = {
            'score': min(100, (critical_risks * 35) + (high_risks * 25) + (total_risks * 4)),
            'trust_loss': {
                'customer_confidence': f"{min(40, (critical_risks * 15) + (high_risks * 8))}% decrease",
                'brand_damage': 'Significant' if critical_risks > 0 else 'Moderate' if high_risks > 2 else 'Low',
                'market_position': 'At risk' if critical_risks > 0 else 'Stable'
            },
            'media_impact': {
                'negative_coverage': 'High' if critical_risks > 0 else 'Medium' if high_risks > 1 else 'Low',
                'social_media_backlash': 'Severe' if critical_risks > 0 else 'Moderate',
                'investor_concern': 'High' if critical_risks > 0 else 'Medium'
            },
            'recovery_time': {
                'trust_rebuilding': f"{min(24, (critical_risks * 8) + (high_risks * 4))} months",
                'market_recovery': f"{min(18, (critical_risks * 6) + (high_risks * 3))} months",
                'brand_restoration': f"{min(36, (critical_risks * 12) + (high_risks * 6))} months"
            }
        }
        
        return {
            'legal_impact': legal_impact,
            'financial_impact': financial_impact,
            'reputational_impact': reputational_impact
        }

    def _build_mitigation_plan(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Build comprehensive mitigation plan"""
        
        mitigation_measures = []
        recommendations = []
        
        # Technical Controls
        technical_controls = [
            {
                'category': 'Data Protection',
                'measures': [
                    'Implement end-to-end encryption for all PII data',
                    'Use strong encryption algorithms (AES-256) for data at rest',
                    'Implement TLS 1.3 for data in transit',
                    'Deploy data loss prevention (DLP) solutions',
                    'Implement database encryption and access controls'
                ]
            },
            {
                'category': 'Access Control',
                'measures': [
                    'Implement multi-factor authentication (MFA)',
                    'Deploy role-based access control (RBAC)',
                    'Implement principle of least privilege',
                    'Use privileged access management (PAM)',
                    'Implement session management and timeout controls'
                ]
            },
            {
                'category': 'Security Monitoring',
                'measures': [
                    'Deploy Security Information and Event Management (SIEM)',
                    'Implement real-time threat detection',
                    'Set up automated incident response',
                    'Deploy user behavior analytics (UBA)',
                    'Implement security orchestration and response (SOAR)'
                ]
            }
        ]
        
        # Administrative Controls
        administrative_controls = [
            {
                'category': 'Policies and Procedures',
                'measures': [
                    'Develop comprehensive data protection policy',
                    'Implement data classification and handling procedures',
                    'Create incident response and breach notification procedures',
                    'Establish vendor risk management program',
                    'Implement data retention and disposal policies'
                ]
            },
            {
                'category': 'Training and Awareness',
                'measures': [
                    'Conduct regular security awareness training',
                    'Implement role-specific data protection training',
                    'Establish security champion program',
                    'Conduct phishing simulation exercises',
                    'Implement data protection certification program'
                ]
            }
        ]
        
        # Compliance Measures
        compliance_measures = [
            {
                'category': 'GDPR Compliance',
                'measures': [
                    'Implement data subject rights management system',
                    'Deploy consent management platform',
                    'Establish data protection impact assessment process',
                    'Implement privacy by design principles',
                    'Create data processing records and documentation'
                ]
            },
            {
                'category': 'DPDPA Compliance',
                'measures': [
                    'Implement data localization requirements',
                    'Establish data principal rights management',
                    'Deploy consent and purpose limitation controls',
                    'Implement data minimization practices',
                    'Create data protection officer (DPO) role'
                ]
            }
        ]
        
        # Generate specific recommendations based on risks
        for risk in risk_assessment.get('risks', []):
            if risk['category'] == 'data_leakage':
                recommendations.append({
                    'priority': 'High',
                    'title': 'Implement Data Leakage Prevention',
                    'description': f"Address {risk['title']} by implementing comprehensive data protection controls",
                    'timeline': '30 days',
                    'effort': 'Medium'
                })
            elif risk['category'] == 'access_control':
                recommendations.append({
                    'priority': 'High',
                    'title': 'Strengthen Access Controls',
                    'description': f"Mitigate {risk['title']} through enhanced access management",
                    'timeline': '45 days',
                    'effort': 'High'
                })
        
        return {
            'technical_controls': technical_controls,
            'administrative_controls': administrative_controls,
            'compliance_measures': compliance_measures,
            'recommendations': recommendations,
            'mitigation_measures': technical_controls + administrative_controls + compliance_measures
        }

    def _build_compliance_check(self, data_inventory: Dict[str, Any], 
                              risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Build comprehensive compliance check against major regulations"""
        
        total_risks = risk_assessment.get('total_risks', 0)
        critical_risks = risk_assessment.get('risk_distribution', {}).get('critical', 0)
        high_risks = risk_assessment.get('risk_distribution', {}).get('high', 0)
        
        # GDPR Compliance Check
        gdpr_compliance = {
            'score': max(0, 100 - (critical_risks * 20) - (high_risks * 10) - (total_risks * 2)),
            'requirements': {
                'lawful_basis': {
                    'status': 'Compliant' if total_risks < 5 else 'Non-compliant',
                    'description': 'Clear lawful basis for data processing established'
                },
                'data_subject_rights': {
                    'status': 'Compliant' if critical_risks == 0 else 'Non-compliant',
                    'description': 'Data subject rights (access, rectification, erasure) implemented'
                },
                'consent_management': {
                    'status': 'Compliant' if high_risks < 3 else 'Non-compliant',
                    'description': 'Valid consent obtained and managed effectively'
                },
                'data_protection_by_design': {
                    'status': 'Non-compliant' if critical_risks > 0 else 'Compliant',
                    'description': 'Privacy and data protection integrated into system design'
                },
                'breach_notification': {
                    'status': 'Compliant',
                    'description': '72-hour breach notification process established'
                }
            },
            'violations': ['Article 32 - Security of processing'] if critical_risks > 0 else []
        }
        
        # DPDPA Compliance Check
        dpdpa_compliance = {
            'score': max(0, 100 - (critical_risks * 25) - (high_risks * 12) - (total_risks * 3)),
            'requirements': {
                'purpose_limitation': {
                    'status': 'Compliant' if total_risks < 3 else 'Non-compliant',
                    'description': 'Data collected only for specified, legitimate purposes'
                },
                'data_minimization': {
                    'status': 'Compliant' if high_risks < 2 else 'Non-compliant',
                    'description': 'Data collection limited to what is necessary'
                },
                'consent_requirement': {
                    'status': 'Compliant' if critical_risks == 0 else 'Non-compliant',
                    'description': 'Valid consent obtained before data processing'
                },
                'data_localization': {
                    'status': 'Compliant',
                    'description': 'Critical personal data stored within India'
                },
                'data_principal_rights': {
                    'status': 'Compliant' if total_risks < 5 else 'Non-compliant',
                    'description': 'Data principal rights (access, correction, erasure) implemented'
                }
            },
            'violations': ['Section 8 - Purpose limitation', 'Section 9 - Data minimization'] if high_risks > 1 else []
        }
        
        # HIPAA Compliance Check
        hipaa_compliance = {
            'score': max(0, 100 - (critical_risks * 30) - (high_risks * 15) - (total_risks * 4)),
            'requirements': {
                'administrative_safeguards': {
                    'status': 'Compliant' if total_risks < 4 else 'Non-compliant',
                    'description': 'Administrative safeguards (policies, procedures, training) implemented'
                },
                'physical_safeguards': {
                    'status': 'Compliant',
                    'description': 'Physical safeguards for PHI protection in place'
                },
                'technical_safeguards': {
                    'status': 'Non-compliant' if critical_risks > 0 else 'Compliant',
                    'description': 'Technical safeguards (access control, audit controls) implemented'
                },
                'breach_notification': {
                    'status': 'Compliant',
                    'description': '60-day breach notification process established'
                },
                'business_associate_agreements': {
                    'status': 'Compliant',
                    'description': 'BAAs established with all third-party vendors'
                }
            },
            'violations': ['164.308 - Administrative safeguards', '164.312 - Technical safeguards'] if critical_risks > 0 else []
        }
        
        # CCPA Compliance Check
        ccpa_compliance = {
            'score': max(0, 100 - (critical_risks * 20) - (high_risks * 10) - (total_risks * 2)),
            'requirements': {
                'consumer_rights': {
                    'status': 'Compliant' if total_risks < 5 else 'Non-compliant',
                    'description': 'Consumer rights (access, deletion, opt-out) implemented'
                },
                'privacy_notice': {
                    'status': 'Compliant',
                    'description': 'Comprehensive privacy notice provided to consumers'
                },
                'data_categories': {
                    'status': 'Compliant' if high_risks < 3 else 'Non-compliant',
                    'description': 'Data categories and purposes clearly disclosed'
                },
                'third_party_disclosure': {
                    'status': 'Compliant' if total_risks < 4 else 'Non-compliant',
                    'description': 'Third-party data sharing practices disclosed'
                },
                'opt_out_mechanism': {
                    'status': 'Compliant',
                    'description': 'Clear opt-out mechanism for data sales provided'
                }
            },
            'violations': ['Section 1798.150 - Consumer rights'] if critical_risks > 0 else []
        }
        
        return {
            'gdpr_compliance': gdpr_compliance,
            'dpdpa_compliance': dpdpa_compliance,
            'hipaa_compliance': hipaa_compliance,
            'ccpa_compliance': ccpa_compliance
        }

    def _build_executive_summary(self, overall_risk: Dict, overall_impact: Dict, 
                               overall_compliance: Dict, risk_assessment: Dict) -> Dict[str, Any]:
        """Build executive summary of the DPIA"""
        
        total_risks = risk_assessment.get('total_risks', 0)
        risk_distribution = risk_assessment.get('risk_distribution', {})
        
        return {
            'overview': f"This DPIA identifies {total_risks} data protection risks across the system, "
                       f"with {risk_distribution.get('critical', 0)} critical and {risk_distribution.get('high', 0)} high-risk findings.",
            'key_findings': [
                f"Overall Risk Level: {overall_risk.get('risk_level', 'Unknown')} ({overall_risk.get('risk_score', 0):.1f}/100)",
                f"Impact Assessment: {overall_impact.get('impact_level', 'Unknown')} ({overall_impact.get('impact_score', 0):.1f}/100)",
                f"Compliance Status: {overall_compliance.get('compliance_level', 'Unknown')} ({overall_compliance.get('compliance_score', 0):.1f}/100)"
            ],
            'recommendations': [
                "Implement comprehensive data protection controls",
                "Strengthen access management and authentication",
                "Deploy security monitoring and incident response",
                "Establish compliance monitoring and reporting"
            ],
            'next_steps': [
                "Review and approve mitigation plan",
                "Implement high-priority security controls",
                "Conduct regular compliance assessments",
                "Establish ongoing monitoring and review process"
            ]
        }

    def _calculate_overall_risk(self, risk_assessment: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall risk score and level"""
        
        total_risks = risk_assessment.get('total_risks', 0)
        risk_distribution = risk_assessment.get('risk_distribution', {})
        
        # Calculate risk score (0-100, higher is worse)
        risk_score = min(100, 
            (risk_distribution.get('critical', 0) * 25) +
            (risk_distribution.get('high', 0) * 15) +
            (risk_distribution.get('medium', 0) * 8) +
            (risk_distribution.get('low', 0) * 3)
        )
        
        # Determine risk level
        if risk_score >= 80:
            risk_level = 'CRITICAL'
        elif risk_score >= 60:
            risk_level = 'HIGH'
        elif risk_score >= 40:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'total_risks': total_risks,
            'risk_distribution': risk_distribution
        }

    def _calculate_overall_impact(self, impact_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall impact score and level"""
        
        legal_score = impact_analysis.get('legal_impact', {}).get('score', 0)
        financial_score = impact_analysis.get('financial_impact', {}).get('score', 0)
        reputational_score = impact_analysis.get('reputational_impact', {}).get('score', 0)
        
        # Calculate weighted average
        impact_score = (legal_score * 0.4) + (financial_score * 0.4) + (reputational_score * 0.2)
        
        # Determine impact level
        if impact_score >= 80:
            impact_level = 'CRITICAL'
        elif impact_score >= 60:
            impact_level = 'HIGH'
        elif impact_score >= 40:
            impact_level = 'MEDIUM'
        else:
            impact_level = 'LOW'
        
        return {
            'impact_score': impact_score,
            'impact_level': impact_level,
            'legal_impact_score': legal_score,
            'financial_impact_score': financial_score,
            'reputational_impact_score': reputational_score
        }

    def _calculate_overall_compliance(self, compliance_check: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate overall compliance score and level"""
        
        gdpr_score = compliance_check.get('gdpr_compliance', {}).get('score', 0)
        dpdpa_score = compliance_check.get('dpdpa_compliance', {}).get('score', 0)
        hipaa_score = compliance_check.get('hipaa_compliance', {}).get('score', 0)
        ccpa_score = compliance_check.get('ccpa_compliance', {}).get('score', 0)
        
        # Calculate weighted average (GDPR and DPDPA weighted higher for global coverage)
        compliance_score = (gdpr_score * 0.3) + (dpdpa_score * 0.3) + (hipaa_score * 0.2) + (ccpa_score * 0.2)
        
        # Determine compliance level
        if compliance_score >= 90:
            compliance_level = 'EXCELLENT'
        elif compliance_score >= 75:
            compliance_level = 'GOOD'
        elif compliance_score >= 60:
            compliance_level = 'FAIR'
        else:
            compliance_level = 'POOR'
        
        return {
            'compliance_score': compliance_score,
            'compliance_level': compliance_level,
            'gdpr_compliance_score': gdpr_score,
            'dpdpa_compliance_score': dpdpa_score,
            'hipaa_compliance_score': hipaa_score,
            'ccpa_compliance_score': ccpa_score
        }
