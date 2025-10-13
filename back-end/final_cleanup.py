#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Framework

def final_cleanup():
    print("Final cleanup of frameworks...")
    
    # List of frameworks to remove (duplicates and test data)
    frameworks_to_remove = [
        'ISO27001_2022',
        'ISO27002_2022', 
        'ISO27017_2015',
        'ISO27018_2019',
        'Test Framework'
    ]
    
    removed_count = 0
    for framework_name in frameworks_to_remove:
        try:
            framework = Framework.objects.get(name=framework_name)
            framework.delete()
            print(f"Deleted: {framework_name}")
            removed_count += 1
        except Framework.DoesNotExist:
            print(f"Not found: {framework_name}")
    
    # Show final count
    total_frameworks = Framework.objects.count()
    print(f"\nRemoved {removed_count} frameworks")
    print(f"Final framework count: {total_frameworks}")
    
    print("\nFinal frameworks list:")
    for framework in Framework.objects.all().order_by('name'):
        clauses_count = framework.clauses.count()
        print(f"- {framework.name} ({clauses_count} clauses)")

if __name__ == "__main__":
    final_cleanup()



