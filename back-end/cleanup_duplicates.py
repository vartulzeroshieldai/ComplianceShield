#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Framework

def cleanup_duplicates():
    print("Cleaning up duplicate frameworks...")
    
    # List of duplicate framework names to remove
    duplicates_to_remove = [
        'ISO27001_2022',
        'ISO27002_2022', 
        'ISO27017_2015',
        'ISO27018_2019'
    ]
    
    for duplicate_name in duplicates_to_remove:
        try:
            framework = Framework.objects.get(name=duplicate_name)
            framework.delete()
            print(f"Deleted duplicate: {duplicate_name}")
        except Framework.DoesNotExist:
            print(f"Not found: {duplicate_name}")
    
    # Show final count
    total_frameworks = Framework.objects.count()
    print(f"\nFinal framework count: {total_frameworks}")
    
    print("\nRemaining frameworks:")
    for framework in Framework.objects.all().order_by('name'):
        print(f"- {framework.name}")

if __name__ == "__main__":
    cleanup_duplicates()



