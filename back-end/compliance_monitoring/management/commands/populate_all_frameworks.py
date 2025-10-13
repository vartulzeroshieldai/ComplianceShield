# compliance_monitoring/management/commands/populate_all_frameworks.py
import pandas as pd
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from compliance_monitoring.models import Framework, Clause, SubClause


class Command(BaseCommand):
    """
    Enhanced Django management command to populate the database with compliance data
    from multiple CSV file formats with different structures.
    """
    help = 'Populates the database with frameworks, clauses, and sub-clauses from multiple CSV files.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--framework',
            type=str,
            help='Specific framework to populate (optional). If not provided, all frameworks will be processed.',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Clear existing data before populating new data.',
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Define framework configurations
        self.framework_configs = {
            'APPI': {
                'file': 'Act_on_the_Protection_of_Personal_Information_(APPI).csv',
                'name': 'Act on the Protection of Personal Information (APPI)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description '
                },
                'parser': 'standard'
            },
            'China_AI': {
                'file': 'China_Generative_AI_Measures_Checklist_V 1.2.xlsx - Sheet1.csv',
                'name': 'China Generative AI Measures',
                'columns': {
                    'reference': 'Clause',
                    'title': 'Requirement',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'COBIT': {
                'file': 'COBIT_2019_Checklist_V 1.1.xlsx - Sheet1.csv',
                'name': 'COBIT 2019',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'DORA': {
                'file': 'DORA_Checklist_V 1.1.xlsx - DORA RTS Audit Checklist.csv',
                'name': 'DORA (Digital Operational Resilience Act)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'DPDPA': {
                'file': 'DPDPA_India_Checklist V1.1.xlsx - DPDPA Checklist.csv',
                'name': 'Digital Personal Data Protection Act (India)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'ePrivacy': {
                'file': 'ePrivacy Directive_Checklist_V 1.1.xlsx - Art1-18 Checklist.csv',
                'name': 'ePrivacy Directive',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'EU_AI_Act': {
                'file': 'EU_AI_Act_Checklist_V 1.0.xlsx - EU AI Act with References.csv',
                'name': 'EU AI Act',
                'columns': {
                    'reference': 'Clause',
                    'title': 'Reference',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'DPF': {
                'file': 'DPF_Principles_Checklist_V 1.1.xlsx - Sheet1.csv',
                'name': 'Data Privacy Framework (DPF)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Principle',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'GDPR': {
                'file': 'GDPR_Checklist_V 1.1.xlsx - Chapter I (Art.1–4).csv',
                'name': 'GDPR (General Data Protection Regulation)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'HIPAA': {
                'file': 'HIPAA_Checklist_V 1.1.xlsx - Privacy Rule.csv',
                'name': 'HIPAA Privacy Rule',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'IEEE_EAD': {
                'file': 'IEEE_EAD_Checklist_V 1.0.xlsx - Aggregated Checklist.csv',
                'name': 'IEEE Ethical AI Design',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'ISO27001': {
                'file': 'ISO27001_2022.csv',
                'name': 'ISO 27001:2022',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'ISO27002': {
                'file': 'ISO27002_2022.csv',
                'name': 'ISO 27002:2022',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'ISO27017': {
                'file': 'ISO27017_2015.csv',
                'name': 'ISO 27017:2015',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'ISO27018': {
                'file': 'ISO27018_2019.csv',
                'name': 'ISO 27018:2019',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'LGPD': {
                'file': 'LGPD_Checklist_V 1.1.xlsx - LGPD Audit Checklist.csv',
                'name': 'LGPD (Brazilian Data Protection Law)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'OECD_AI': {
                'file': 'OECD_AI_Principles_Checklist_V 1.0.xlsx - Audit Checklist.csv',
                'name': 'OECD AI Principles',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'PIPEDA': {
                'file': 'PIPEDA_Checklist_V 1.1.xlsx - PIPEDA Checklist.csv',
                'name': 'PIPEDA (Canada)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            },
            'PIPL': {
                'file': 'PIPL_Checklist_V 1.1.xlsx - PIPL Audit Checklist.csv',
                'name': 'PIPL (China Personal Information Protection Law)',
                'columns': {
                    'reference': 'Reference',
                    'title': 'Clause',
                    'description': 'Description'
                },
                'parser': 'standard'
            }
        }

    @transaction.atomic
    def handle(self, *args, **options):
        """Main logic for populating frameworks from CSV files."""
        framework_name = options.get('framework')
        clear_existing = options.get('clear_existing', False)

        if framework_name:
            # Process specific framework
            if framework_name in self.framework_configs:
                self.process_framework(framework_name, clear_existing)
            else:
                self.stdout.write(
                    self.style.ERROR(f"Framework '{framework_name}' not found. Available frameworks: {list(self.framework_configs.keys())}")
                )
        else:
            # Process all frameworks
            self.stdout.write(self.style.SUCCESS("Processing all frameworks..."))
            for framework_key in self.framework_configs.keys():
                self.process_framework(framework_key, clear_existing)

    def process_framework(self, framework_key, clear_existing=False):
        """Process a single framework from its CSV file."""
        config = self.framework_configs[framework_key]
        framework_name = config['name']
        csv_file = config['file']
        
        self.stdout.write(self.style.SUCCESS(f"\n=== Processing {framework_name} ==="))
        
        # Build file path
        file_path = os.path.join(settings.BASE_DIR, 'compliance_monitoring', csv_file)
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        try:
            # Read CSV file
            df = pd.read_csv(file_path)
            self.stdout.write(f"Loaded {len(df)} rows from {csv_file}")
            
            # Clean data
            for col in df.columns:
                df[col] = df[col].astype('object')
            df.fillna("", inplace=True)
            
            # Clear existing data if requested
            if clear_existing:
                self.stdout.write(f"Clearing existing data for {framework_name}...")
                Framework.objects.filter(name=framework_name).delete()
            
            # Create or get framework
            framework, created = Framework.objects.get_or_create(
                name=framework_name,
                defaults={'description': f"Compliance data for {framework_name}"}
            )
            
            if created:
                self.stdout.write(f"Created framework: {framework_name}")
            else:
                self.stdout.write(f"Using existing framework: {framework_name}")
            
            # Process the data based on parser type
            if config['parser'] == 'standard':
                self.process_standard_format(framework, df, config)
            else:
                self.stdout.write(self.style.ERROR(f"Unknown parser type: {config['parser']}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing {framework_name}: {str(e)}"))

    def process_standard_format(self, framework, df, config):
        """Process CSV files with standard format (Reference, Title, Description)."""
        ref_col = config['columns']['reference']
        title_col = config['columns']['title']
        desc_col = config['columns']['description']
        
        # Check if required columns exist
        missing_cols = []
        for col in [ref_col, title_col, desc_col]:
            if col not in df.columns:
                missing_cols.append(col)
        
        if missing_cols:
            self.stdout.write(self.style.ERROR(f"Missing columns: {missing_cols}"))
            self.stdout.write(f"Available columns: {list(df.columns)}")
            return
        
        created_clauses = {}
        created_subclauses = 0
        
        # Process each row
        for index, row in df.iterrows():
            ref = str(row[ref_col]).strip()
            title = str(row[title_col]).strip()
            description = str(row[desc_col]).strip()
            
            if not ref or not title:
                continue
            
            # Determine if this is a main clause or sub-clause
            if self.is_main_clause(ref):
                # Create main clause
                clause, created = Clause.objects.get_or_create(
                    framework=framework,
                    clause_number=ref,
                    defaults={
                        'title': title,
                        'description': description
                    }
                )
                if created:
                    self.stdout.write(f"  Created Clause: {ref} - {title}")
                created_clauses[ref] = clause
            else:
                # Create sub-clause
                parent_ref = self.get_parent_reference(ref)
                if parent_ref and parent_ref in created_clauses:
                    parent_clause = created_clauses[parent_ref]
                    sub_clause, created = SubClause.objects.get_or_create(
                        clause=parent_clause,
                        sub_clause_number=ref,
                        defaults={
                            'title': title,
                            'description': description
                        }
                    )
                    if created:
                        self.stdout.write(f"  Created Sub-Clause: {ref} - {title} (Parent: {parent_ref})")
                        created_subclauses += 1
                else:
                    # If parent doesn't exist, create as main clause
                    clause, created = Clause.objects.get_or_create(
                        framework=framework,
                        clause_number=ref,
                        defaults={
                            'title': title,
                            'description': description
                        }
                    )
                    if created:
                        self.stdout.write(f"  Created Clause (orphaned): {ref} - {title}")
                    created_clauses[ref] = clause
        
        self.stdout.write(f"Summary: {len(created_clauses)} clauses, {created_subclauses} sub-clauses")

    def is_main_clause(self, reference):
        """Determine if a reference represents a main clause."""
        if not reference:
            return False
        
        # Common patterns for main clauses
        patterns = [
            r'^[A-Z]\.\d+$',  # A.5, C.4
            r'^\d+$',         # 1, 2, 3
            r'^Art\.\s*\d+$', # Art. 1, Art. 2
            r'^Article\s+\d+$', # Article 1, Article 2
            r'^Sec\.\s*\d+$', # Sec. 1, Sec. 2
            r'^Section\s+\d+$', # Section 1, Section 2
            r'^[A-Z]{2,}\d+$', # EDM01, APO01
        ]
        
        import re
        for pattern in patterns:
            if re.match(pattern, reference):
                return True
        
        return False

    def get_parent_reference(self, reference):
        """Get the parent reference for a sub-clause."""
        if not reference:
            return None
        
        # Common patterns for sub-clauses
        if '.' in reference:
            parts = reference.split('.')
            if len(parts) >= 2:
                # For patterns like A.5.1 -> A.5
                if len(parts) == 3 and parts[0].isalpha() and parts[1].isdigit():
                    return f"{parts[0]}.{parts[1]}"
                # For patterns like 6.1.1 -> 6
                elif len(parts) == 3 and parts[0].isdigit():
                    return parts[0]
                # For patterns like Art. 17.1 -> Art. 17
                elif reference.startswith('Art.') and len(parts) == 3:
                    return f"{parts[0]}.{parts[1]}"
        
        return None




