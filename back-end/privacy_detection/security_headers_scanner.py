"""
Security Headers Scanner for web applications
A Python-based implementation that analyzes website security headers
"""
import requests
from urllib.parse import urlparse
import json
from datetime import datetime
import time

# Try to import shcheck, but don't fail if it's not available
try:
    import shcheck
    SHCHECK_AVAILABLE = True
except ImportError:
    SHCHECK_AVAILABLE = False
    print("Warning: shcheck package not available. Using manual header analysis.")

class SecurityHeadersScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def analyze_website(self, url):
        """
        Analyze a website for security headers compliance
        """
        try:
            # Ensure URL has protocol
            if not url.startswith(('http://', 'https://')):
                url = f'https://{url}'
            
            # Parse URL
            parsed_url = urlparse(url)
            domain = parsed_url.netloc
            
            # Make request to get headers
            response = self.session.get(url, timeout=30)
            headers = dict(response.headers)
            
            # Use shcheck to analyze security headers
            security_analysis = self._analyze_security_headers(headers, url)
            
            # Generate compliance report
            report = self._generate_report(url, security_analysis, headers)
            
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
    
    def _analyze_security_headers(self, headers, url):
        """
        Analyze security headers using shcheck if available, otherwise use manual analysis
        """
        # If shcheck is not available, use manual analysis
        if not SHCHECK_AVAILABLE:
            print("Header scan not available, using manual header analysis")
            return self._manual_header_analysis(headers)
        
        try:
            # Use shcheck to analyze the headers and capture detailed output
            import subprocess
            import sys
            
            try:
                # Run shcheck using subprocess to capture all output
                result = subprocess.run([
                    sys.executable, '-c', 
                    f"from shcheck.shcheck import main; import sys; sys.argv = ['shcheck', '{url}']; main()"
                ], capture_output=True, text=True, timeout=30)
                
                # Get the output
                shcheck_output = result.stdout
                shcheck_errors = result.stderr
                
                # Combine stdout and stderr as shcheck might use both
                combined_output = shcheck_output + shcheck_errors
                
                # Output captured successfully
                
                # Use combined output for parsing
                shcheck_output = combined_output
                    
            except Exception as shcheck_error:
                # If shcheck fails, fall back to manual analysis
                print(f"shcheck failed: {shcheck_error}")
                return self._manual_header_analysis(headers)
            
            # shcheck_output and shcheck_errors are now set from subprocess result
            
            # Parse shcheck results from the output
            security_headers = {}
            missing_headers = []
            weak_headers = []
            secure_headers = []
            detailed_findings = []
            
            # Define important security headers
            important_headers = {
                'Content-Security-Policy': 'Content Security Policy',
                'X-Frame-Options': 'X-Frame-Options',
                'X-Content-Type-Options': 'X-Content-Type-Options',
                'X-XSS-Protection': 'X-XSS-Protection',
                'Strict-Transport-Security': 'Strict Transport Security',
                'Referrer-Policy': 'Referrer Policy',
                'Permissions-Policy': 'Permissions Policy',
                'Cross-Origin-Embedder-Policy': 'Cross-Origin-Embedder-Policy',
                'Cross-Origin-Opener-Policy': 'Cross-Origin-Opener-Policy',
                'Cross-Origin-Resource-Policy': 'Cross-Origin-Resource-Policy'
            }
            
            # Parse shcheck output for detailed findings
            # Strip ANSI color codes from output
            clean_output = self._strip_ansi_codes(shcheck_output)
            lines = clean_output.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Parse different types of shcheck output
                if '[+]' in line or '[*]' in line:
                    # Present header - extract header name dynamically
                    if 'Header' in line and 'is present!' in line:
                        # Extract header name from the line
                        # Format: [*] Header X-Frame-Options is present! (Value: SAMEORIGIN)
                        try:
                            # Find the header name between "Header " and " is present!"
                            start = line.find('Header ') + 7
                            end = line.find(' is present!')
                            if start > 6 and end > start:
                                header_name = line[start:end].strip()
                                value = self._extract_header_value(line)
                                
                                # Only process if it's in our important headers list
                                if header_name in important_headers:
                                    security_headers[header_name] = {
                                        'present': True,
                                        'value': value,
                                        'status': 'secure',
                                        'shcheck_finding': line
                                    }
                                    secure_headers.append(important_headers[header_name])
                                    detailed_findings.append({
                                        'type': 'present',
                                        'header': header_name,
                                        'message': line,
                                        'status': 'secure'
                                    })
                        except Exception as e:
                            print(f"Error parsing header line: {line}, Error: {e}")
                
                elif '[!]' in line:
                    # Missing or problematic header
                    if 'Missing security header:' in line:
                        header_name = line.split('Missing security header: ')[1].strip()
                        if header_name in important_headers:
                            security_headers[header_name] = {
                                'present': False,
                                'value': None,
                                'status': 'missing',
                                'shcheck_finding': line
                            }
                            missing_headers.append(important_headers[header_name])
                            detailed_findings.append({
                                'type': 'missing',
                                'header': header_name,
                                'message': line,
                                'status': 'missing'
                            })
            
            # Fill in any headers not found in shcheck output
            for header_name, display_name in important_headers.items():
                if header_name not in security_headers:
                    security_headers[header_name] = {
                        'present': False,
                        'value': None,
                        'status': 'missing',
                        'shcheck_finding': f'Header {header_name} not analyzed'
                    }
                    missing_headers.append(display_name)
            
            # Calculate security score
            total_headers = len(important_headers)
            secure_count = len(secure_headers)
            weak_count = len(weak_headers)
            missing_count = len(missing_headers)
            
            security_score = (secure_count / total_headers) * 100
            
            # Determine risk level
            if security_score >= 80:
                risk_level = 'LOW'
            elif security_score >= 60:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'HIGH'
            
            return {
                'security_headers': security_headers,
                'secure_headers': secure_headers,
                'weak_headers': weak_headers,
                'missing_headers': missing_headers,
                'security_score': security_score,
                'risk_level': risk_level,
                'total_headers_checked': total_headers,
                'secure_count': secure_count,
                'weak_count': weak_count,
                'missing_count': missing_count,
                'detailed_findings': detailed_findings,
                'shcheck_output': shcheck_output,
                'shcheck_errors': shcheck_errors
            }
            
        except Exception as e:
            return {
                'error': f'Failed to analyze security headers: {str(e)}',
                'security_headers': {},
                'secure_headers': [],
                'weak_headers': [],
                'missing_headers': [],
                'security_score': 0,
                'risk_level': 'UNKNOWN'
            }
    
    def _extract_header_value(self, line):
        """Extract header value from shcheck output line"""
        try:
            if '(Value:' in line and ')' in line:
                start = line.find('(Value: ') + 8
                end = line.find(')', start)
                return line[start:end]
            return None
        except:
            return None
    
    def _strip_ansi_codes(self, text):
        """Remove ANSI color codes from text"""
        import re
        ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
        return ansi_escape.sub('', text)
    
    def _manual_header_analysis(self, headers):
        """Fallback manual header analysis if shcheck fails"""
        security_headers = {}
        missing_headers = []
        weak_headers = []
        secure_headers = []
        
        # Define important security headers
        important_headers = {
            'Content-Security-Policy': 'Content Security Policy',
            'X-Frame-Options': 'X-Frame-Options',
            'X-Content-Type-Options': 'X-Content-Type-Options',
            'X-XSS-Protection': 'X-XSS-Protection',
            'Strict-Transport-Security': 'Strict Transport Security',
            'Referrer-Policy': 'Referrer Policy',
            'Permissions-Policy': 'Permissions Policy',
            'Cross-Origin-Embedder-Policy': 'Cross-Origin-Embedder-Policy',
            'Cross-Origin-Opener-Policy': 'Cross-Origin-Opener-Policy',
            'Cross-Origin-Resource-Policy': 'Cross-Origin-Resource-Policy'
        }
        
        # Check each important header
        for header_name, display_name in important_headers.items():
            if header_name in headers:
                header_value = headers[header_name]
                security_headers[header_name] = {
                    'present': True,
                    'value': header_value,
                    'status': self._evaluate_header_strength(header_name, header_value)
                }
                
                if security_headers[header_name]['status'] == 'secure':
                    secure_headers.append(display_name)
                elif security_headers[header_name]['status'] == 'weak':
                    weak_headers.append(display_name)
            else:
                security_headers[header_name] = {
                    'present': False,
                    'value': None,
                    'status': 'missing'
                }
                missing_headers.append(display_name)
        
        # Calculate security score
        total_headers = len(important_headers)
        secure_count = len(secure_headers)
        weak_count = len(weak_headers)
        missing_count = len(missing_headers)
        
        security_score = (secure_count / total_headers) * 100
        
        # Determine risk level
        if security_score >= 80:
            risk_level = 'LOW'
        elif security_score >= 60:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'HIGH'
        
        return {
            'security_headers': security_headers,
            'secure_headers': secure_headers,
            'weak_headers': weak_headers,
            'missing_headers': missing_headers,
            'security_score': security_score,
            'risk_level': risk_level,
            'total_headers_checked': total_headers,
            'secure_count': secure_count,
            'weak_count': weak_count,
            'missing_count': missing_count
        }
    
    def _evaluate_header_strength(self, header_name, header_value):
        """
        Evaluate the strength of a security header
        """
        if not header_value:
            return 'missing'
        
        header_value = header_value.lower()
        
        if header_name == 'Content-Security-Policy':
            if 'unsafe-inline' in header_value or 'unsafe-eval' in header_value:
                return 'weak'
            return 'secure'
        
        elif header_name == 'X-Frame-Options':
            if header_value in ['deny', 'sameorigin']:
                return 'secure'
            return 'weak'
        
        elif header_name == 'X-Content-Type-Options':
            if header_value == 'nosniff':
                return 'secure'
            return 'weak'
        
        elif header_name == 'X-XSS-Protection':
            if '1; mode=block' in header_value:
                return 'secure'
            return 'weak'
        
        elif header_name == 'Strict-Transport-Security':
            if 'max-age' in header_value and 'includeSubDomains' in header_value:
                return 'secure'
            elif 'max-age' in header_value:
                return 'weak'
            return 'weak'
        
        elif header_name == 'Referrer-Policy':
            if header_value in ['strict-origin-when-cross-origin', 'no-referrer']:
                return 'secure'
            return 'weak'
        
        elif header_name == 'Permissions-Policy':
            if 'camera=()' in header_value and 'microphone=()' in header_value:
                return 'secure'
            return 'weak'
        
        else:
            # For other headers, just check if they exist
            return 'secure'
    
    def _generate_report(self, url, security_analysis, headers):
        """
        Generate comprehensive security headers compliance report
        """
        security_score = security_analysis.get('security_score', 0)
        risk_level = security_analysis.get('risk_level', 'UNKNOWN')
        secure_headers = security_analysis.get('secure_headers', [])
        weak_headers = security_analysis.get('weak_headers', [])
        missing_headers = security_analysis.get('missing_headers', [])
        
        # Generate recommendations
        recommendations = []
        
        if risk_level == 'HIGH':
            recommendations.extend([
                'URGENT: Implement missing security headers immediately',
                'Review and strengthen weak security headers',
                'Consider implementing a Web Application Firewall (WAF)'
            ])
        elif risk_level == 'MEDIUM':
            recommendations.extend([
                'Implement missing security headers',
                'Strengthen weak security headers',
                'Regular security headers audit recommended'
            ])
        else:
            recommendations.extend([
                'Maintain current security headers configuration',
                'Regular security headers audit recommended'
            ])
        
        # Specific recommendations based on missing headers
        if 'Content Security Policy' in missing_headers:
            recommendations.append('Implement Content Security Policy (CSP) to prevent XSS attacks')
        
        if 'Strict Transport Security' in missing_headers:
            recommendations.append('Implement HSTS to enforce HTTPS connections')
        
        if 'X-Frame-Options' in missing_headers:
            recommendations.append('Implement X-Frame-Options to prevent clickjacking attacks')
        
        if 'X-Content-Type-Options' in missing_headers:
            recommendations.append('Implement X-Content-Type-Options to prevent MIME sniffing')
        
        # Generate compliance status
        compliance_status = 'COMPLIANT' if risk_level == 'LOW' else 'NON_COMPLIANT'
        
        return {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'security_score': security_score,
                'risk_level': risk_level,
                'compliance_status': compliance_status,
                'total_headers_checked': security_analysis.get('total_headers_checked', 0),
                'secure_count': security_analysis.get('secure_count', 0),
                'weak_count': security_analysis.get('weak_count', 0),
                'missing_count': security_analysis.get('missing_count', 0)
            },
            'security_headers': security_analysis.get('security_headers', {}),
            'secure_headers': secure_headers,
            'weak_headers': weak_headers,
            'missing_headers': missing_headers,
            'recommendations': recommendations,
            'raw_headers': headers,
            'detailed_findings': security_analysis.get('detailed_findings', []),
            'shcheck_output': security_analysis.get('shcheck_output', ''),
            'shcheck_errors': security_analysis.get('shcheck_errors', '')
        }

# Example usage
if __name__ == "__main__":
    scanner = SecurityHeadersScanner()
    result = scanner.analyze_website("https://example.com")
    print(json.dumps(result, indent=2))
