#!/usr/bin/env python
import os
import sys
import django
import csv
import re

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.models import Framework, Clause, SubClause

class ComprehensiveFrameworkPopulator:
    def __init__(self):
        self.framework_configs = {
            # Privacy Laws
            'AUD_Checklist_V 1.0.xlsx - Sheet1.csv': {
                'name': 'Australian Privacy Act 2023',
                'description': 'Australian Privacy Act 2023 - Privacy Principles and Requirements',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'CPPA_Checklist_V 1.1.xlsx - Index.csv': {
                'name': 'California Privacy Protection Act (CPPA)',
                'description': 'California Privacy Protection Act - Consumer privacy rights and business obligations',
                'columns': {'reference': 'Reference', 'title': 'Title', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'PDPA_Singapore_Checklist_V 1.1.xlsx - Sheet1.csv': {
                'name': 'Singapore PDPA',
                'description': 'Singapore Personal Data Protection Act (PDPA)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'PDPA_Thailand_Checklist_V 1.1.xlsx - Thailand PDPA Audit.csv': {
                'name': 'Thailand PDPA',
                'description': 'Thailand Personal Data Protection Act (PDPA)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'PDPL_Saudi_Checklist_V 1.1.xlsx - Articles.csv': {
                'name': 'Saudi Arabia PDPL',
                'description': 'Saudi Arabia Personal Data Protection Law (PDPL)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'PDPL_Vietnam_Checklist_V 1.1.xlsx - PDPL 2025 Audit.csv': {
                'name': 'Vietnam PDPL',
                'description': 'Vietnam Personal Data Protection Law (PDPL) 2025',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'POPIA_Checklist_V 1.1.xlsx - POPIA Audit.csv': {
                'name': 'South Africa POPIA',
                'description': 'South Africa Protection of Personal Information Act (POPIA)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            'US_State_Privacy_Laws_Checklist_V1.1.xlsx - US State Privacy Laws.csv': {
                'name': 'US State Privacy Laws',
                'description': 'US State Privacy Laws - Comprehensive coverage of state-level privacy regulations',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'privacy_law'
            },
            
            # Security Frameworks
            'CIS_CAS__Checklist_V 1.1.xlsx - CIS CAS IG1 Audit.csv': {
                'name': 'CIS Critical Security Controls',
                'description': 'CIS Critical Security Controls (CIS Controls) Implementation Group 1',
                'columns': {'reference': 'Reference', 'title': 'Control', 'description': 'Description'},
                'parser': 'cis_controls'
            },
            'NIST_CSF_Checklist_V 1.1.xlsx.csv': {
                'name': 'NIST Cybersecurity Framework 2.0',
                'description': 'NIST Cybersecurity Framework (CSF) 2.0 - Core guidance for managing cybersecurity risk',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'nist_csf'
            },
            'NIST_AI_RMF_Checklist_V 1.1.xlsx - Sheet1.csv': {
                'name': 'NIST AI Risk Management Framework',
                'description': 'NIST AI Risk Management Framework (AI RMF) 1.0',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'NIST_SP800_39_Checklist_V1.1.xlsx - Sheet1.csv': {
                'name': 'NIST SP 800-39',
                'description': 'NIST Special Publication 800-39 - Managing Information Security Risk',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'HITRUST_CSF_Checklist_V 1.1.xlsx - Sheet1.csv': {
                'name': 'HITRUST CSF',
                'description': 'HITRUST Common Security Framework (CSF)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'PCI_DSS_Checklist_V 1.1.xlsx - All Requirements.csv': {
                'name': 'PCI DSS',
                'description': 'Payment Card Industry Data Security Standard (PCI DSS)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'SOC2_Checklist_V_1.1.xlsx.csv': {
                'name': 'SOC 2',
                'description': 'Service Organization Control 2 (SOC 2) - Trust Services Criteria',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            
            # Cloud Security
            'CSA _STAR_Checklist_V 1.1.xlsx - Sheet1.csv': {
                'name': 'CSA STAR',
                'description': 'Cloud Security Alliance Security, Trust & Assurance Registry (STAR)',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'csa_star'
            },
            
            # AI Governance
            'FEAT_Principles_Checklist_V 1.2.xlsx - Checklist.csv': {
                'name': 'FEAT Principles',
                'description': 'Fairness, Ethics, Accountability, and Transparency (FEAT) Principles',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'feat_principles'
            },
            'US_AI_State_Laws_Checklist_ V 1.1.xlsx - US State AI Laws.csv': {
                'name': 'US State AI Laws',
                'description': 'US State Artificial Intelligence Laws and Regulations',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'ai_governance'
            },
            'WHO_AI_Governance_Checklist_V 1.1.xlsx - Sheet1.csv': {
                'name': 'WHO AI Governance',
                'description': 'World Health Organization AI Governance Framework',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'ai_governance'
            },
            
            # Financial Regulations
            'GLBA_Checklist_V 1.1.xlsx - Title V Privacy.csv': {
                'name': 'GLBA',
                'description': 'Gramm-Leach-Bliley Act (GLBA) - Financial Privacy Rule',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'RBI_CS_Checklist_V 1.1.xlsx - Checklist.csv': {
                'name': 'RBI Cyber Security Framework',
                'description': 'Reserve Bank of India Cyber Security Framework',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            },
            'SEBI_CSCRF_Checklist_V 1.0.xlsx - CSCRF Checklist.csv': {
                'name': 'SEBI CSCRF',
                'description': 'Securities and Exchange Board of India Cyber Security and Resilience Framework',
                'columns': {'reference': 'Reference', 'title': 'Clause', 'description': 'Description'},
                'parser': 'standard'
            }
        }

    def show_current_frameworks(self):
        """Display current frameworks in database"""
        frameworks = Framework.objects.all().order_by('name')
        print(f"\n📋 Current frameworks in database ({frameworks.count()} total):")
        for framework in frameworks:
            clauses_count = framework.clauses.count()
            print(f"   - {framework.name} ({clauses_count} clauses)")
        return frameworks

    def check_framework_exists(self, framework_name):
        """Check if framework already exists"""
        return Framework.objects.filter(name=framework_name).exists()

    def parse_reference(self, reference, parser_type):
        """Parse reference based on framework type"""
        if not reference:
            return None, None, None
        
        reference = reference.strip()
        
        if parser_type == 'nist_csf':
            # NIST CSF like GV.OC-01
            if '.' in reference and '-' in reference:
                parts = reference.split('.')
                if len(parts) >= 2:
                    return parts[0], parts[1], 'subclause'
            return reference, None, 'clause'
        
        elif parser_type == 'cis_controls':
            # CIS Controls like 1.1-1.6 or 2.1
            if '-' in reference:
                return reference.split('-')[0], reference.split('-')[1], 'subclause'
            elif '.' in reference:
                parts = reference.split('.')
                if len(parts) >= 2:
                    return parts[0], parts[1], 'subclause'
            return reference, None, 'clause'
        
        elif parser_type == 'csa_star':
            # CSA STAR like A&A-01.1
            if '-' in reference and '.' in reference:
                parts = reference.split('-')
                if len(parts) >= 2:
                    sub_parts = parts[1].split('.')
                    if len(sub_parts) >= 2:
                        return f"{parts[0]}-{sub_parts[0]}", sub_parts[1], 'subclause'
            return reference, None, 'clause'
        
        elif parser_type == 'feat_principles':
            # FEAT Principles like 1, 2, 3
            return reference, None, 'clause'
        
        elif parser_type == 'privacy_law':
            # Privacy laws - various formats
            if '.' in reference:
                parts = reference.split('.')
                if len(parts) >= 3:
                    return '.'.join(parts[:-1]), parts[-1], 'subclause'
                else:
                    return reference, None, 'clause'
            return reference, None, 'clause'
        
        else:  # standard parser
            if '.' in reference:
                parts = reference.split('.')
                if len(parts) >= 3:
                    return '.'.join(parts[:-1]), parts[-1], 'subclause'
                else:
                    return reference, None, 'clause'
            return reference, None, 'clause'

    def populate_framework(self, csv_file, config):
        """Populate a single framework from CSV"""
        framework_name = config['name']
        framework_description = config['description']
        columns = config['columns']
        parser_type = config['parser']
        
        print(f"\n=== Processing {framework_name} ===")
        
        # Check if framework exists
        framework_exists = self.check_framework_exists(framework_name)
        
        if framework_exists:
            print(f"⚠️  Framework already exists: {framework_name}")
            framework = Framework.objects.get(name=framework_name)
            # Clear existing clauses to avoid duplicates
            framework.clauses.all().delete()
            print(f"   Cleared existing clauses for fresh import")
        else:
            print(f"✅ Creating new framework: {framework_name}")
            framework = Framework.objects.create(
                name=framework_name,
                description=framework_description
            )
        
        # Read CSV file
        csv_path = os.path.join('compliance_monitoring', csv_file)
        
        if not os.path.exists(csv_path):
            print(f"❌ CSV file not found: {csv_path}")
            return False
        
        clauses_created = 0
        subclauses_created = 0
        skipped = 0
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row_num, row in enumerate(reader, 1):
                    reference = row.get(columns['reference'], '').strip()
                    title = row.get(columns['title'], '').strip()
                    description = row.get(columns['description'], '').strip()
                    
                    if not reference or not title:
                        skipped += 1
                        continue
                    
                    # Skip objective entries for certain frameworks
                    if 'Objective (not a control)' in title or 'N/A — objective' in description:
                        skipped += 1
                        continue
                    
                    # Parse reference
                    parent_ref, sub_ref, item_type = self.parse_reference(reference, parser_type)
                    
                    if item_type == 'subclause' and parent_ref and sub_ref:
                        # This is a sub-clause
                        try:
                            parent_clause = Clause.objects.get(
                                framework=framework,
                                clause_number=parent_ref
                            )
                            
                            subclause, created = SubClause.objects.get_or_create(
                                clause=parent_clause,
                                sub_clause_number=sub_ref,
                                defaults={
                                    'title': title,
                                    'description': description
                                }
                            )
                            
                            if created:
                                subclauses_created += 1
                            else:
                                # Update existing
                                subclause.title = title
                                subclause.description = description
                                subclause.save()
                                
                        except Clause.DoesNotExist:
                            print(f"   ⚠️  Parent clause not found for sub-clause: {reference}")
                            # Create the parent clause first
                            parent_clause = Clause.objects.create(
                                framework=framework,
                                clause_number=parent_ref,
                                title=f"Section {parent_ref}",
                                description="Auto-created parent clause"
                            )
                            
                            subclause, created = SubClause.objects.get_or_create(
                                clause=parent_clause,
                                sub_clause_number=sub_ref,
                                defaults={
                                    'title': title,
                                    'description': description
                                }
                            )
                            
                            if created:
                                subclauses_created += 1
                    
                    else:
                        # This is a main clause
                        clause, created = Clause.objects.get_or_create(
                            framework=framework,
                            clause_number=reference,
                            defaults={
                                'title': title,
                                'description': description
                            }
                        )
                        
                        if created:
                            clauses_created += 1
                        else:
                            # Update existing
                            clause.title = title
                            clause.description = description
                            clause.save()
        
        except Exception as e:
            print(f"❌ Error processing {csv_file}: {str(e)}")
            return False
        
        print(f"   📊 Results: {clauses_created} clauses, {subclauses_created} sub-clauses, {skipped} skipped")
        return True

    def populate_all_frameworks(self):
        """Populate all frameworks from CSV files"""
        print("🚀 Starting population of all new frameworks...")
        
        # Show current state
        self.show_current_frameworks()
        
        # Process each framework
        success_count = 0
        total_count = len(self.framework_configs)
        
        for csv_file, config in self.framework_configs.items():
            if self.populate_framework(csv_file, config):
                success_count += 1
        
        # Show final state
        print(f"\n=== Final Results ===")
        print(f"✅ Successfully processed: {success_count}/{total_count} frameworks")
        self.show_current_frameworks()
        
        print(f"\n🎉 Population complete!")

def main():
    populator = ComprehensiveFrameworkPopulator()
    populator.populate_all_frameworks()

if __name__ == "__main__":
    main()
