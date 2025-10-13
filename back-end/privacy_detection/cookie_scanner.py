"""
Cookie Scanner for GDPR compliance
A Python-based implementation that analyzes website cookies
"""
import requests
from urllib.parse import urlparse
import json
import re
from datetime import datetime
import time

class CookieScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def analyze_website(self, url):
        """
        Analyze a website for cookies and privacy compliance
        """
        try:
            # Ensure URL has protocol
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'
            
            # Parse URL
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            # Make request to get cookies
            response = self.session.get(url, timeout=30)
            cookies = self.session.cookies
            
            # Analyze cookies
            cookie_analysis = self._analyze_cookies(cookies, domain, url)
            
            # Check for privacy-related headers
            privacy_headers = self._check_privacy_headers(response.headers)
            
            # Generate compliance report
            report = self._generate_report(url, cookie_analysis, privacy_headers)
            
            return report
            
        except requests.exceptions.RequestException as e:
            return {
                'error': f'Failed to analyze website: {str(e)}',
                'url': url,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'error': f'Unexpected error: {str(e)}',
                'url': url,
                'timestamp': datetime.now().isoformat()
            }
    
    def _analyze_cookies(self, cookies, domain, url):
        """
        Analyze cookies for security and privacy issues
        """
        cookie_list = []
        secure_count = 0
        non_secure_count = 0
        third_party_count = 0
        
        for cookie in cookies:
            cookie_info = {
                'name': cookie.name,
                'value': cookie.value[:50] + '...' if len(cookie.value) > 50 else cookie.value,
                'domain': cookie.domain,
                'path': cookie.path,
                'secure': cookie.secure,
                'httponly': getattr(cookie, 'httponly', False),
                'samesite': getattr(cookie, 'samesite', ''),
                'expires': cookie.expires,
                'issues': []
            }
            
            # Check for security issues
            if not cookie.secure:
                cookie_info['issues'].append('Not marked as secure')
                non_secure_count += 1
            else:
                secure_count += 1
            
            if not getattr(cookie, 'httponly', False):
                cookie_info['issues'].append('Not HTTP-only')
            
            # Check for third-party cookies
            if cookie.domain and domain not in cookie.domain:
                cookie_info['issues'].append('Third-party cookie')
                third_party_count += 1
            
            # Check SameSite attribute
            samesite = getattr(cookie, 'samesite', '')
            if samesite not in ['Strict', 'Lax']:
                cookie_info['issues'].append('Weak SameSite policy')
            
            cookie_list.append(cookie_info)
        
        return {
            'cookies': cookie_list,
            'total_cookies': len(cookie_list),
            'secure_cookies': secure_count,
            'non_secure_cookies': non_secure_count,
            'third_party_cookies': third_party_count
        }
    
    def _check_privacy_headers(self, headers):
        """
        Check for privacy-related HTTP headers
        """
        privacy_headers = {}
        
        # Check for privacy headers
        privacy_headers['content_security_policy'] = headers.get('Content-Security-Policy', 'Not set')
        privacy_headers['x_frame_options'] = headers.get('X-Frame-Options', 'Not set')
        privacy_headers['x_content_type_options'] = headers.get('X-Content-Type-Options', 'Not set')
        privacy_headers['referrer_policy'] = headers.get('Referrer-Policy', 'Not set')
        privacy_headers['permissions_policy'] = headers.get('Permissions-Policy', 'Not set')
        
        # Check for cookie consent
        privacy_headers['set_cookie'] = 'Set-Cookie' in headers
        
        return privacy_headers
    
    def _generate_report(self, url, cookie_analysis, privacy_headers):
        """
        Generate comprehensive privacy compliance report
        """
        total_cookies = cookie_analysis['total_cookies']
        secure_cookies = cookie_analysis['secure_cookies']
        non_secure_cookies = cookie_analysis['non_secure_cookies']
        third_party_cookies = cookie_analysis['third_party_cookies']
        
        # Calculate risk score
        risk_score = 0
        if non_secure_cookies > 0:
            risk_score += non_secure_cookies * 2
        if third_party_cookies > 0:
            risk_score += third_party_cookies * 3
        
        # Determine risk level
        if risk_score > 10:
            risk_level = 'HIGH'
        elif risk_score > 5:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # GDPR compliance check
        gdpr_issues = []
        if total_cookies > 0:
            gdpr_issues.append('Website sets cookies without explicit consent')
        if third_party_cookies > 0:
            gdpr_issues.append('Third-party tracking cookies detected')
        if non_secure_cookies > 0:
            gdpr_issues.append('Non-secure cookies detected')
        
        # Generate recommendations
        recommendations = []
        if risk_level == 'HIGH':
            recommendations.extend([
                'URGENT: Implement cookie consent management system',
                'Review and secure all non-secure cookies',
                'Audit third-party cookie usage'
            ])
        elif risk_level == 'MEDIUM':
            recommendations.extend([
                'Implement proper cookie security measures',
                'Add cookie consent banner',
                'Review third-party integrations'
            ])
        else:
            recommendations.extend([
                'Maintain current security practices',
                'Regularly audit cookie usage'
            ])
        
        if non_secure_cookies > 0:
            recommendations.append('Mark all cookies as secure and HTTP-only')
        
        if third_party_cookies > 0:
            recommendations.append('Implement consent for third-party cookies')
        
        return {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'total_cookies': total_cookies,
                'secure_cookies': secure_cookies,
                'non_secure_cookies': non_secure_cookies,
                'third_party_cookies': third_party_cookies,
                'risk_level': risk_level,
                'risk_score': risk_score
            },
            'cookies': cookie_analysis['cookies'],
            'privacy_headers': privacy_headers,
            'gdpr_compliance': {
                'issues': gdpr_issues,
                'compliant': len(gdpr_issues) == 0
            },
            'recommendations': recommendations
        }

# Example usage
if __name__ == "__main__":
    scanner = CookieScanner()
    result = scanner.analyze_website("https://example.com")
    print(json.dumps(result, indent=2))
