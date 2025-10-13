#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Framework

def remove_duplicates():
    print("Removing duplicate ISO frameworks...")
    
    # List of duplicate framework names to remove
    duplicates_to_remove = [
        'ISO27001_2022',
        'ISO27002_2022', 
        'ISO27017_2015',
        'ISO27018_2019',
        'Test Framework'
    ]
    
    removed_count = 0
    for duplicate_name in duplicates_to_remove:
        try:
            framework = Framework.objects.get(name=duplicate_name)
            clauses_count = framework.clauses.count()
            framework.delete()
            print(f"✅ Deleted: {duplicate_name} ({clauses_count} clauses)")
            removed_count += 1
        except Framework.DoesNotExist:
            print(f"❌ Not found: {duplicate_name}")
    
    # Show final count
    total_frameworks = Framework.objects.count()
    print(f"\n📊 Summary:")
    print(f"   Removed: {removed_count} duplicate frameworks")
    print(f"   Final count: {total_frameworks} frameworks")
    
    print(f"\n📋 Remaining frameworks:")
    for framework in Framework.objects.all().order_by('name'):
        clauses_count = framework.clauses.count()
        print(f"   - {framework.name} ({clauses_count} clauses)")

if __name__ == "__main__":
    remove_duplicates()



