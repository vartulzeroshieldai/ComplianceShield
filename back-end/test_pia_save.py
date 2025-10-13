#!/usr/bin/env python
"""
Test script to verify PIAResult model can save data
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from django.contrib.auth import get_user_model
from privacy_detection.models import PIAResult
from django.db import connection

User = get_user_model()

print("=" * 60)
print("PIA RESULT MODEL TEST")
print("=" * 60)

# Check if table exists
print("\n1. Checking if table exists...")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%piaresult%';
    """)
    tables = cursor.fetchall()
    print(f"   Tables found: {tables}")

# Try to query
print("\n2. Querying existing records...")
try:
    count = PIAResult.objects.count()
    print(f"   ✓ Total PIAResult records: {count}")
    
    if count > 0:
        print("\n   Existing records:")
        for pia in PIAResult.objects.all()[:5]:
            print(f"     - ID: {pia.id}, Project: {pia.project_name}, Risk: {pia.overall_risk_level}")
except Exception as e:
    print(f"   ✗ Error querying: {e}")

# Try to create a test record
print("\n3. Attempting to create a test PIA result...")
try:
    # Get first user
    user = User.objects.first()
    if not user:
        print("   ✗ No users found. Please create a user first.")
    else:
        test_pia = PIAResult.objects.create(
            user=user,
            project_name="Test PIA Project",
            project_type="Web Application",
            project_url="https://test.example.com",
            overall_risk_level="MEDIUM",
            risk_score=55.5,
            critical_risks=0,
            high_risks=2,
            medium_risks=3,
            low_risks=1,
            total_risks=6,
            total_data_points=10,
            recommendations_count=5,
            full_report={"test": "data"},
            used_git_scan=True,
            used_sast_scan=False,
            used_mobile_scan=True,
            used_security_headers=True,
            used_cookie_analysis=True
        )
        print(f"   ✓ Test PIA created successfully!")
        print(f"     ID: {test_pia.id}")
        print(f"     Project: {test_pia.project_name}")
        print(f"     Risk: {test_pia.overall_risk_level} ({test_pia.risk_score}/100)")
        print(f"     Generated at: {test_pia.generated_at}")
        
        # Clean up test record
        test_pia.delete()
        print(f"   ✓ Test PIA deleted (cleanup)")
        
except Exception as e:
    print(f"   ✗ Error creating test PIA: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)

