"""
Django management command to migrate localStorage evidence mappings to database relationships.

This command will:
1. Read localStorage evidence mappings from the browser (via API endpoint)
2. Update the Evidence model to properly link evidence to controls/subcontrols
3. Ensure all evidence is accessible by the global calculation system
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
        
        # Get projects to process
        if project_id:
            projects = Project.objects.filter(id=project_id)
        else:
            projects = Project.objects.all()
        
        if not projects.exists():
            self.stdout.write(
                self.style.ERROR('No projects found to process')
            )
            return
        
        total_migrations = 0
        
        for project in projects:
            self.stdout.write(f'\nProcessing project: {project.name} (ID: {project.id})')
            
            # Get all evidence for this project
            evidence_items = Evidence.objects.filter(project=project)
            
            if not evidence_items.exists():
                self.stdout.write(f'  No evidence found for project {project.name}')
                continue
            
            project_migrations = 0
            
            for evidence in evidence_items:
                # Check if evidence is already properly linked
                has_clause_links = evidence.clauses.exists()
                has_subclause_link = evidence.sub_clause is not None
                
                if has_clause_links or has_subclause_link:
                    self.stdout.write(
                        f'  Evidence {evidence.id} ({evidence.evidence_name}) already has database links'
                    )
                    continue
                
                # Try to find the control this evidence should be linked to
                # This is a heuristic approach - we'll look for controls that might match
                potential_controls = Clause.objects.filter(
                    framework=project.framework
                )
                
                # For now, we'll create a simple mapping based on evidence name patterns
                # In a real scenario, you might need more sophisticated logic
                linked_control = None
                linked_subcontrol = None
                
                # Try to match evidence to controls based on naming patterns
                evidence_name_lower = evidence.evidence_name.lower()
                
                for control in potential_controls:
                    control_title_lower = control.title.lower()
                    
                    # Simple keyword matching (you can improve this logic)
                    if any(keyword in evidence_name_lower for keyword in [
                        'administrator', 'operational', 'procedures', 'cloud'
                    ]) and any(keyword in control_title_lower for keyword in [
                        'administrator', 'operational', 'procedures', 'cloud'
                    ]):
                        linked_control = control
                        break
                    
                    if any(keyword in evidence_name_lower for keyword in [
                        'shared', 'roles', 'responsibilities', 'cloud'
                    ]) and any(keyword in control_title_lower for keyword in [
                        'shared', 'roles', 'responsibilities', 'cloud'
                    ]):
                        linked_control = control
                        break
                
                if linked_control:
                    if not dry_run:
                        with transaction.atomic():
                            # Link evidence to control
                            evidence.clauses.add(linked_control)
                            evidence.save()
                    
                    self.stdout.write(
                        f'  ✓ Linked evidence {evidence.id} ({evidence.evidence_name}) to control {linked_control.id} ({linked_control.title})'
                    )
                    project_migrations += 1
                    total_migrations += 1
                else:
                    self.stdout.write(
                        f'  ⚠ Could not determine control for evidence {evidence.id} ({evidence.evidence_name})'
                    )
            
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
        
        # Provide instructions for manual mapping
        self.stdout.write('\n' + '='*60)
        self.stdout.write('MANUAL MAPPING INSTRUCTIONS:')
        self.stdout.write('='*60)
        self.stdout.write('For evidence items that could not be automatically mapped:')
        self.stdout.write('1. Go to the project in the web interface')
        self.stdout.write('2. Navigate to the Evidence tab')
        self.stdout.write('3. Use the "Link to Control" feature to manually link evidence')
        self.stdout.write('4. Or use the Django admin to edit evidence relationships')
        self.stdout.write('='*60)
