# test_report_generation.py
"""
Test script for the compliance report generation system.
Run this from the GRC directory: python test_report_generation.py
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Project, Framework, Clause
from compliance_monitoring.report_builder import ComplianceReportBuilder
from compliance_monitoring.pdf_generator import CompliancePDFGenerator
from accounts.models import User, Organization
from auditing.models import AuditorReview, Risk, ActionItem

def test_report_generation():
    """Test the complete report generation pipeline"""
    
    print("🔍 Testing Compliance Report Generation System")
    print("=" * 50)
    
    try:
        # 1. Check if we have test data
        print("1. Checking for test data...")
        
        projects = Project.objects.all()
        if not projects.exists():
            print("❌ No projects found. Please create some test data first.")
            return
        
        project = projects.first()
        print(f"✅ Found test project: {project.name}")
        
        # 2. Test report builder
        print("\n2. Testing report data builder...")
        
        user = User.objects.first()
        report_builder = ComplianceReportBuilder(project.id, user=user)
        
        # Generate report data
        report_data = report_builder.build_complete_report_data()
        
        print(f"✅ Report data generated successfully")
        print(f"   - Total controls assessed: {report_data['control_assessment']['total_controls_assessed']}")
        print(f"   - Overall compliance: {report_data['compliance_scoring']['overall_compliance_percentage']}%")
        print(f"   - Total risks: {report_data['risk_assessment']['risk_summary']['total_risks']}")
        print(f"   - Action items: {report_data['remediation_planning']['action_items_summary']['total_items']}")
        
        # 3. Test PDF generation
        print("\n3. Testing PDF generation...")
        
        pdf_generator = CompliancePDFGenerator(
            report_data=report_data,
            project=project,
            user=user,
            report_title=f"Test Report - {project.name}"
        )
        
        pdf_buffer = pdf_generator.generate_pdf()
        
        # Save test PDF
        test_pdf_path = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        with open(test_pdf_path, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        print(f"✅ PDF generated successfully: {test_pdf_path}")
        print(f"   - PDF size: {len(pdf_buffer.getvalue())} bytes")
        
        # 4. Test specific data extraction
        print("\n4. Testing specific data components...")
        
        # Test control categorization
        categories = set()
        for control in report_data['control_assessment']['controls']:
            categories.add(control['control_category'])
        
        print(f"✅ Control categories identified: {len(categories)}")
        for category in sorted(categories):
            print(f"   - {category}")
        
        # Test visual elements data
        if report_data['visual_elements']['radar_chart_data']:
            print(f"✅ Radar chart data prepared: {len(report_data['visual_elements']['radar_chart_data'])} categories")
        
        # 5. Test date filtering
        print("\n5. Testing date filtering...")
        
        date_from = datetime.now() - timedelta(days=30)
        date_to = datetime.now()
        
        filtered_data = report_builder.build_complete_report_data(
            date_from=date_from.date(),
            date_to=date_to.date()
        )
        
        print(f"✅ Date filtering works: {filtered_data['control_assessment']['total_controls_assessed']} controls in date range")
        
        print("\n🎉 All tests passed successfully!")
        print(f"📄 Test PDF saved as: {test_pdf_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def create_sample_data():
    """Create some sample data for testing if none exists"""
    
    print("🔧 Creating sample test data...")
    
    try:
        # Create organization if none exists
        org, created = Organization.objects.get_or_create(
            name="Test Organization",
            defaults={
                'description': 'Test organization for report generation',
                'website': 'https://test.example.com'
            }
        )
        
        if created:
            print(f"✅ Created test organization: {org.name}")
        
        # Create user if none exists
        if not User.objects.exists():
            user = User.objects.create_user(
                username='testuser',
                email='test@example.com',
                first_name='Test',
                last_name='User',
                organization=org
            )
            print(f"✅ Created test user: {user.username}")
        else:
            user = User.objects.first()
        
        # Create framework if none exists
        framework, created = Framework.objects.get_or_create(
            name="ISO 27001:2022",
            defaults={
                'description': 'Information security management systems standard'
            }
        )
        
        if created:
            print(f"✅ Created test framework: {framework.name}")
        
        # Create project if none exists
        if not Project.objects.exists():
            project = Project.objects.create(
                name="Test Compliance Project",
                description="Test project for report generation",
                organization=org,
                framework=framework,
                owner=user,
                status='In Progress',
                progress=75
            )
            print(f"✅ Created test project: {project.name}")
        
        # Create some sample clauses if none exist
        if not Clause.objects.filter(framework=framework).exists():
            sample_clauses = [
                ("A.5.1", "Information Security Policies", "Policies for information security"),
                ("A.6.1", "Access Control Management", "Management of access to information"),
                ("A.7.1", "Asset Management", "Responsibility for assets"),
                ("A.8.1", "Human Resource Security", "Prior to employment"),
                ("A.9.1", "Physical Security", "Secure areas")
            ]
            
            for clause_num, title, desc in sample_clauses:
                Clause.objects.create(
                    framework=framework,
                    clause_number=clause_num,
                    title=title,
                    description=desc
                )
            
            print(f"✅ Created {len(sample_clauses)} sample clauses")
        
        # Create some sample reviews
        clauses = Clause.objects.filter(framework=framework)
        if clauses.exists() and not AuditorReview.objects.exists():
            statuses = ['Accepted', 'Rejected', 'Pending Updates']
            
            for i, clause in enumerate(clauses[:3]):
                AuditorReview.objects.create(
                    control=clause,
                    auditor=user,
                    title=f"Review of {clause.title}",
                    status=statuses[i % len(statuses)],
                    evidence=f"Evidence for {clause.title}",
                    evidence_notes=f"Notes for {clause.title}",
                    conclusion=f"Conclusion for {clause.title}"
                )
            
            print(f"✅ Created sample auditor reviews")
        
        # Create sample risks
        if not Risk.objects.exists():
            project = Project.objects.first()
            Risk.objects.create(
                project=project,
                title="Data Breach Risk",
                description="Risk of unauthorized access to sensitive data",
                risk_category="Security",
                impact="High",
                likelihood="3",
                status="open",
                risk_rating="High",
                owner=user,
                mitigation_strategy="Implement access controls and monitoring"
            )
            print(f"✅ Created sample risk")
        
        # Create sample action items
        if not ActionItem.objects.exists():
            project = Project.objects.first()
            ActionItem.objects.create(
                project=project,
                title="Implement Password Policy",
                description="Create and implement comprehensive password policy",
                type="Policy Implementation",
                priority="High",
                status="Pending",
                category="policy_approval",
                assignee=user,
                requester=user
            )
            print(f"✅ Created sample action item")
        
        print("🎉 Sample data creation completed!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create sample data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting Report Generation Test Suite")
    print("=" * 60)
    
    # Check if we need to create sample data
    if not Project.objects.exists():
        print("No test data found. Creating sample data...")
        if not create_sample_data():
            print("❌ Failed to create sample data. Exiting.")
            sys.exit(1)
    
    # Run the tests
    success = test_report_generation()
    
    if success:
        print("\n✅ All tests completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)
