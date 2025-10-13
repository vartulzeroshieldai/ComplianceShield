import os
import django
import sys

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from django.db import connection
from privacy_detection.models import PIAResult

# Check if table exists
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='privacy_detection_piaresult';
    """)
    table_exists = cursor.fetchone()
    
    print(f"Table 'privacy_detection_piaresult' exists: {bool(table_exists)}")
    
    if table_exists:
        # Count records
        try:
            count = PIAResult.objects.count()
            print(f"Total PIAResult records: {count}")
            
            # Show all records
            if count > 0:
                print("\nExisting PIA Results:")
                for pia in PIAResult.objects.all():
                    print(f"  - ID: {pia.id}, Project: {pia.project_name}, Risk: {pia.overall_risk_level}, Score: {pia.risk_score}")
            else:
                print("\nNo PIA results found in database.")
        except Exception as e:
            print(f"Error querying PIAResult: {e}")
    else:
        print("\nTable does not exist! Run migrations:")
        print("  python manage.py migrate privacy_detection")

