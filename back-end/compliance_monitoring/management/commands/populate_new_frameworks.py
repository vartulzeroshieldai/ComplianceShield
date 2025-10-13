import os
import csv
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from compliance_monitoring.models import Framework, Clause, SubClause

class Command(BaseCommand):
    help = 'Populates the database with ISO 27799:2016 and ISO 42001:2023 frameworks from CSV files.'

    def add_arguments(self, parser):
        parser.add_argument('--framework', type=str, help='Specific framework to populate (ISO27799 or ISO42001).')
        parser.add_argument('--clear-existing', action='store_true', help='Clear existing data before populating new data.')

    def handle(self, *args, **options):
        self.stdout.write("🔍 Starting population of new frameworks...")
        
        # Check current state
        self.show_current_frameworks()
        
        # Populate frameworks based on options
        if options['framework']:
            if options['framework'].upper() == 'ISO27799':
                self.populate_iso27799(options['clear_existing'])
            elif options['framework'].upper() == 'ISO42001':
                self.populate_iso42001(options['clear_existing'])
            else:
                self.stdout.write(self.style.ERROR(f"Unknown framework: {options['framework']}"))
        else:
            # Populate both frameworks
            self.populate_iso27799(options['clear_existing'])
            self.populate_iso42001(options['clear_existing'])
        
        # Show final state
        self.stdout.write("\n=== Final Database State ===")
        self.show_current_frameworks()

    def show_current_frameworks(self):
        """Display current frameworks in database"""
        frameworks = Framework.objects.all().order_by('name')
        self.stdout.write(f"\n📋 Current frameworks ({frameworks.count()} total):")
        for framework in frameworks:
            clauses_count = framework.clauses.count()
            self.stdout.write(f"   - {framework.name} ({clauses_count} clauses)")
        
        # Check for new frameworks
        iso27799_exists = Framework.objects.filter(name="ISO 27799:2016").exists()
        iso42001_exists = Framework.objects.filter(name="ISO 42001:2023").exists()
        
        self.stdout.write(f"\n📊 New Framework Status:")
        self.stdout.write(f"   ISO 27799:2016 - {'✅ Exists' if iso27799_exists else '❌ Missing'}")
        self.stdout.write(f"   ISO 42001:2023 - {'✅ Exists' if iso42001_exists else '❌ Missing'}")

    def populate_iso27799(self, clear_existing=False):
        """Populate ISO 27799:2016 framework"""
        self.stdout.write("\n=== Populating ISO 27799:2016 ===")
        
        # Check if already exists
        framework_name = "ISO 27799:2016"
        framework, created = Framework.objects.get_or_create(
            name=framework_name,
            defaults={'description': 'Health informatics - Information security management in health using ISO/IEC 27002'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✅ Created new framework: {framework_name}"))
        else:
            self.stdout.write(self.style.WARNING(f"⚠️  Framework already exists: {framework_name}"))
            if clear_existing:
                framework.clauses.all().delete()
                self.stdout.write("   Cleared existing clauses for fresh import")
        
        # Read CSV file
        csv_file = os.path.join(settings.BASE_DIR, 'compliance_monitoring', 'ISO27799_2016_Checklist_V 1.1.xlsx.csv')
        
        if not os.path.exists(csv_file):
            self.stdout.write(self.style.ERROR(f"❌ CSV file not found: {csv_file}"))
            return
        
        clauses_created = 0
        subclauses_created = 0
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                reference = row.get('Reference', '').strip()
                clause_title = row.get('Clause', '').strip()
                description = row.get('Description', '').strip()
                
                if not reference or not clause_title:
                    continue
                
                # Determine if it's a main clause or sub-clause
                if '.' in reference and not reference.startswith('A.'):
                    # This is a sub-clause (like A.5.1.1)
                    parts = reference.split('.')
                    if len(parts) >= 3:
                        parent_clause_ref = '.'.join(parts[:-1])  # A.5.1
                        sub_clause_number = parts[-1]  # 1
                        
                        # Find parent clause
                        try:
                            parent_clause = Clause.objects.get(
                                framework=framework,
                                clause_number=parent_clause_ref
                            )
                            
                            subclause, created = SubClause.objects.get_or_create(
                                clause=parent_clause,
                                sub_clause_number=sub_clause_number,
                                defaults={
                                    'title': clause_title,
                                    'description': description
                                }
                            )
                            
                            if created:
                                subclauses_created += 1
                            else:
                                # Update existing
                                subclause.title = clause_title
                                subclause.description = description
                                subclause.save()
                                
                        except Clause.DoesNotExist:
                            self.stdout.write(f"   ⚠️  Parent clause not found for sub-clause: {reference}")
                            continue
                else:
                    # This is a main clause
                    clause, created = Clause.objects.get_or_create(
                        framework=framework,
                        clause_number=reference,
                        defaults={
                            'title': clause_title,
                            'description': description
                        }
                    )
                    
                    if created:
                        clauses_created += 1
                    else:
                        # Update existing
                        clause.title = clause_title
                        clause.description = description
                        clause.save()
        
        self.stdout.write(f"   📊 Created/Updated: {clauses_created} clauses, {subclauses_created} sub-clauses")

    def populate_iso42001(self, clear_existing=False):
        """Populate ISO 42001:2023 framework"""
        self.stdout.write("\n=== Populating ISO 42001:2023 ===")
        
        # Check if already exists
        framework_name = "ISO 42001:2023"
        framework, created = Framework.objects.get_or_create(
            name=framework_name,
            defaults={'description': 'Artificial intelligence - Management system - Requirements'}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f"✅ Created new framework: {framework_name}"))
        else:
            self.stdout.write(self.style.WARNING(f"⚠️  Framework already exists: {framework_name}"))
            if clear_existing:
                framework.clauses.all().delete()
                self.stdout.write("   Cleared existing clauses for fresh import")
        
        # Read CSV file
        csv_file = os.path.join(settings.BASE_DIR, 'compliance_monitoring', 'ISO42001_2023_Checklist_V 1.1.xlsx.csv')
        
        if not os.path.exists(csv_file):
            self.stdout.write(self.style.ERROR(f"❌ CSV file not found: {csv_file}"))
            return
        
        clauses_created = 0
        subclauses_created = 0
        
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                reference = row.get('Reference', '').strip()
                clause_title = row.get('Clause', '').strip()
                description = row.get('Description ', '').strip()  # Note the space in column name
                
                if not reference or not clause_title:
                    continue
                
                # Skip objective entries (not implementable controls)
                if 'Objective (not a control)' in clause_title or 'N/A — objective' in description:
                    continue
                
                # Determine if it's a main clause or sub-clause
                if '.' in reference and not reference.startswith('C.'):
                    # This is a sub-clause (like A.2.2)
                    parts = reference.split('.')
                    if len(parts) >= 3:
                        parent_clause_ref = '.'.join(parts[:-1])  # A.2
                        sub_clause_number = parts[-1]  # 2
                        
                        # Find parent clause
                        try:
                            parent_clause = Clause.objects.get(
                                framework=framework,
                                clause_number=parent_clause_ref
                            )
                            
                            subclause, created = SubClause.objects.get_or_create(
                                clause=parent_clause,
                                sub_clause_number=sub_clause_number,
                                defaults={
                                    'title': clause_title,
                                    'description': description
                                }
                            )
                            
                            if created:
                                subclauses_created += 1
                            else:
                                # Update existing
                                subclause.title = clause_title
                                subclause.description = description
                                subclause.save()
                                
                        except Clause.DoesNotExist:
                            self.stdout.write(f"   ⚠️  Parent clause not found for sub-clause: {reference}")
                            continue
                else:
                    # This is a main clause
                    clause, created = Clause.objects.get_or_create(
                        framework=framework,
                        clause_number=reference,
                        defaults={
                            'title': clause_title,
                            'description': description
                        }
                    )
                    
                    if created:
                        clauses_created += 1
                    else:
                        # Update existing
                        clause.title = clause_title
                        clause.description = description
                        clause.save()
        
        self.stdout.write(f"   📊 Created/Updated: {clauses_created} clauses, {subclauses_created} sub-clauses")
















