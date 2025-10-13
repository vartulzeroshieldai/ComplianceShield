#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Project, Clause, SubClause
from auditing.models import Evidence
from django.db import transaction

def migrate_evidence():
    print("Starting evidence migration...")
    
    # Define the localStorage mappings we've observed from console logs
    localStorage_mappings = {
        # Project 8 (sample6) mappings
        8: {
            50: [301],  # Control 50 (A.8) -> Subcontrol 301 (A.8.1)
        },
        # Project 7 (sample4) mappings  
        7: {
            50: [301],  # Control 50 (A.8) -> Subcontrol 301 (A.8.1)
        },
    }
    
    # Get projects to process
    project_ids = list(localStorage_mappings.keys())
    projects = Project.objects.filter(id__in=project_ids)
    
    print(f'Found {projects.count()} projects to process')
    
    if not projects.exists():
        print('No projects found to process')
        return
    
    total_migrations = 0
    
    for project in projects:
        print(f'\nProcessing project: {project.name} (ID: {project.id})')
        
        project_mappings = localStorage_mappings.get(project.id, {})
        
        if not project_mappings:
            print(f'  No localStorage mappings found for project {project.name}')
            continue
        
        evidence_items = Evidence.objects.filter(project=project)
        print(f'  Found {evidence_items.count()} evidence items')
        
        if not evidence_items.exists():
            print(f'  No evidence found for project {project.name}')
            continue
        
        project_migrations = 0
        
        for control_id, subcontrol_ids in project_mappings.items():
            try:
                control = Clause.objects.get(id=control_id)
                print(f'  Processing control: {control.clause_number} - {control.title}')
                
                subcontrols = SubClause.objects.filter(
                    id__in=subcontrol_ids,
                    clause=control
                )
                
                if not subcontrols.exists():
                    print(f'    ⚠ No subcontrols found for control {control_id}')
                    continue
                
                evidence_to_link = []
                
                if project.id == 8:  # sample6
                    evidence_to_link = Evidence.objects.filter(
                        project=project,
                        id=54
                    )
                elif project.id == 7:  # sample4
                    evidence_to_link = Evidence.objects.filter(
                        project=project,
                        id__in=[51, 52]
                    )
                
                print(f'    Found {evidence_to_link.count()} evidence items to link')
                
                for evidence in evidence_to_link:
                    has_clause_links = evidence.clauses.filter(id=control_id).exists()
                    has_subclause_link = evidence.sub_clause_id in subcontrol_ids
                    
                    if has_clause_links and has_subclause_link:
                        print(f'    Evidence {evidence.id} ({evidence.evidence_name}) already has database links')
                        continue
                    
                    with transaction.atomic():
                        if not has_clause_links:
                            evidence.clauses.add(control)
                            print(f'    ✓ Added control link for evidence {evidence.id}')
                        
                        if not has_subclause_link and subcontrols.exists():
                            evidence.sub_clause = subcontrols.first()
                            print(f'    ✓ Added subcontrol link for evidence {evidence.id}')
                        
                        evidence.save()
                    
                    print(f'    ✓ Linked evidence {evidence.id} ({evidence.evidence_name}) to control {control.clause_number}')
                    project_migrations += 1
                    total_migrations += 1
            
            except Clause.DoesNotExist:
                print(f'    ⚠ Control {control_id} not found')
            except Exception as e:
                print(f'    ⚠ Error processing control {control_id}: {str(e)}')
        
        print(f'  Project {project.name}: {project_migrations} evidence items migrated')
    
    print(f'\nMIGRATION COMPLETE: Migrated {total_migrations} evidence items')
    print('\nNext steps:')
    print('1. Refresh the global dashboard to see updated implemented controls count')
    print('2. Verify that sample6 and sample4 now show implemented controls')

if __name__ == '__main__':
    migrate_evidence()
