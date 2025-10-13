import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Project, Clause, SubClause
from auditing.models import Evidence
from django.db import transaction

print("=== EVIDENCE MIGRATION SCRIPT ===")
print("Starting evidence migration...")

# Check if projects exist
projects = Project.objects.filter(id__in=[7, 8])
print(f"Found {projects.count()} projects:")
for p in projects:
    print(f"  - {p.name} (ID: {p.id})")

# Check evidence
evidence = Evidence.objects.filter(project_id__in=[7, 8])
print(f"\nFound {evidence.count()} evidence items:")
for e in evidence:
    print(f"  - Evidence {e.id}: {e.evidence_name} (Project: {e.project_id})")
    print(f"    Current clauses: {list(e.clauses.values_list('id', flat=True))}")
    print(f"    Current sub_clause: {e.sub_clause_id}")

# Check controls
controls = Clause.objects.filter(id=50)
print(f"\nFound {controls.count()} controls with ID 50:")
for c in controls:
    print(f"  - Control {c.id}: {c.clause_number} - {c.title}")

# Check subcontrols
subcontrols = SubClause.objects.filter(id=301)
print(f"\nFound {subcontrols.count()} subcontrols with ID 301:")
for s in subcontrols:
    print(f"  - Subcontrol {s.id}: {s.sub_clause_number} - {s.title}")

print("\n=== MIGRATION PROCESS ===")

# Perform migration
total_migrations = 0

for project in projects:
    print(f"\nProcessing project: {project.name} (ID: {project.id})")
    
    # Get evidence for this project
    project_evidence = Evidence.objects.filter(project=project)
    print(f"  Found {project_evidence.count()} evidence items")
    
    for evidence_item in project_evidence:
        print(f"  Processing evidence {evidence_item.id}: {evidence_item.evidence_name}")
        
        # Check current links
        current_clauses = list(evidence_item.clauses.values_list('id', flat=True))
        current_subclause = evidence_item.sub_clause_id
        
        print(f"    Current clauses: {current_clauses}")
        print(f"    Current sub_clause: {current_subclause}")
        
        # Link to control 50 if not already linked
        if 50 not in current_clauses:
            try:
                control = Clause.objects.get(id=50)
                evidence_item.clauses.add(control)
                print(f"    ✓ Added link to control 50")
                total_migrations += 1
            except Clause.DoesNotExist:
                print(f"    ⚠ Control 50 not found")
        
        # Link to subcontrol 301 if not already linked
        if current_subclause != 301:
            try:
                subcontrol = SubClause.objects.get(id=301)
                evidence_item.sub_clause = subcontrol
                evidence_item.save()
                print(f"    ✓ Added link to subcontrol 301")
                total_migrations += 1
            except SubClause.DoesNotExist:
                print(f"    ⚠ Subcontrol 301 not found")

print(f"\n=== MIGRATION COMPLETE ===")
print(f"Total migrations performed: {total_migrations}")
print("\nNext steps:")
print("1. Refresh the global dashboard")
print("2. Check if sample6 and sample4 now show implemented controls")
