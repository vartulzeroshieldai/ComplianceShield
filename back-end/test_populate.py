#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Framework, Clause, SubClause

def test_populate():
    print("Testing populate functionality...")
    
    # Check current frameworks
    frameworks = Framework.objects.all()
    print(f"Current frameworks count: {frameworks.count()}")
    
    for framework in frameworks:
        print(f"- {framework.name}")
        clauses = Clause.objects.filter(framework=framework)
        print(f"  Clauses: {clauses.count()}")
        for clause in clauses[:3]:  # Show first 3 clauses
            print(f"    - {clause.clause_number}: {clause.title}")
    
    # Test creating a simple framework
    test_framework, created = Framework.objects.get_or_create(
        name="Test Framework",
        defaults={'description': 'Test framework for debugging'}
    )
    
    if created:
        print("Created test framework")
    else:
        print("Test framework already exists")
    
    print("Test completed!")

if __name__ == "__main__":
    test_populate()



