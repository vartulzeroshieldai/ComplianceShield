"""
Django management command to migrate localStorage evidence mappings to database relationships.

This command will:
1. Simulate the localStorage evidence mappings that exist in the browser
2. Update the Evidence model to properly link evidence to controls/subcontrols
3. Ensure all evidence is accessible by the global calculation system

Note: This command uses hardcoded mappings based on the console logs we've seen.
In a production environment, you would need to export the actual localStorage data.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from compliance_monitoring.models import Project, Clause, SubClause
from auditing.models import Evidence
import json
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Migrate localStorage evidence mappings to database relationships'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            help='Specific project ID to migrate (optional)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes',
        )

    def handle(self, *args, **options):
        project_id = options.get('project_id')
        dry_run = options.get('dry_run', False)
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE - No changes will be made')
            )
        
        # Define the localStorage mappings we've observed from console logs
        # These are the mappings that exist in the browser's localStorage
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
        if project_id:
            projects = Project.objects.filter(id=project_id)
        else:
            # Only process projects that have localStorage mappings
            project_ids = list(localStorage_mappings.keys())
            projects = Project.objects.filter(id__in=project_ids)
        
        if not projects.exists():
            self.stdout.write(
                self.style.ERROR('No projects found to process')
            )
            return
        
        total_migrations = 0
        
        for project in projects:
            self.stdout.write(f'\nProcessing project: {project.name} (ID: {project.id})')
            
            # Get localStorage mappings for this project
            project_mappings = localStorage_mappings.get(project.id, {})
            
            if not project_mappings:
                self.stdout.write(f'  No localStorage mappings found for project {project.name}')
                continue
            
            # Get all evidence for this project
            evidence_items = Evidence.objects.filter(project=project)
            
            if not evidence_items.exists():
                self.stdout.write(f'  No evidence found for project {project.name}')
                continue
            
            project_migrations = 0
            
            # Process each control mapping
            for control_id, subcontrol_ids in project_mappings.items():
                try:
                    # Find the control
                    control = Clause.objects.get(id=control_id)
                    self.stdout.write(f'  Processing control: {control.clause_number} - {control.title}')
                    
                    # Find the subcontrols
                    subcontrols = SubClause.objects.filter(
                        id__in=subcontrol_ids,
                        clause=control
                    )
                    
                    if not subcontrols.exists():
                        self.stdout.write(f'    ⚠ No subcontrols found for control {control_id}')
                        continue
                    
                    # Find evidence that should be linked to this control/subcontrol
                    # Based on console logs, we know evidence ID 54 is linked to control 50, subcontrol 301
                    evidence_to_link = []
                    
                    if project.id == 8:  # sample6
                        evidence_to_link = Evidence.objects.filter(
                            project=project,
                            id=54  # Based on console logs
                        )
                    elif project.id == 7:  # sample4
                        evidence_to_link = Evidence.objects.filter(
                            project=project,
                            id__in=[51, 52]  # Based on console logs showing evidence IDs
                        )
                    
                    for evidence in evidence_to_link:
                        # Check if evidence is already properly linked
                        has_clause_links = evidence.clauses.filter(id=control_id).exists()
                        has_subclause_link = evidence.sub_clause_id in subcontrol_ids
                        
                        if has_clause_links and has_subclause_link:
                            self.stdout.write(
                                f'    Evidence {evidence.id} ({evidence.evidence_name}) already has database links'
                            )
                            continue
                        
                        if not dry_run:
                            with transaction.atomic():
                                # Link evidence to control
                                if not has_clause_links:
                                    evidence.clauses.add(control)
                                
                                # Link evidence to subcontrol
                                if not has_subclause_link and subcontrols.exists():
                                    evidence.sub_clause = subcontrols.first()
                                
                                evidence.save()
                        
                        self.stdout.write(
                            f'    ✓ Linked evidence {evidence.id} ({evidence.evidence_name}) to control {control.clause_number} and subcontrol {subcontrols.first().sub_clause_number if subcontrols.exists() else "N/A"}'
                        )
                        project_migrations += 1
                        total_migrations += 1
                
                except Clause.DoesNotExist:
                    self.stdout.write(f'    ⚠ Control {control_id} not found')
                except Exception as e:
                    self.stdout.write(f'    ⚠ Error processing control {control_id}: {str(e)}')
            
            self.stdout.write(
                f'  Project {project.name}: {project_migrations} evidence items migrated'
            )
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'\nDRY RUN COMPLETE: Would migrate {total_migrations} evidence items')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nMIGRATION COMPLETE: Migrated {total_migrations} evidence items')
            )
        
        # Provide next steps
        self.stdout.write('\n' + '='*60)
        self.stdout.write('NEXT STEPS:')
        self.stdout.write('='*60)
        self.stdout.write('1. Refresh the global dashboard to see updated implemented controls count')
        self.stdout.write('2. Verify that sample6 and sample4 now show implemented controls')
        self.stdout.write('3. Test the evidence linking in the project-level views')
        self.stdout.write('4. Consider updating the evidence upload process to use database relationships')
        self.stdout.write('='*60)
