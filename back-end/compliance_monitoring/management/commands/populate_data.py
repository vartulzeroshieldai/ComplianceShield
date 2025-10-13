# compliance_monitoring/management/commands/populate_data.py
import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings
import os
from compliance_monitoring.models import Framework, Clause, SubClause
from django.db import transaction

class Command(BaseCommand):
    """
    A Django management command to populate the database with compliance data
    from various CSV file formats.
    """
    help = 'Populates the database with frameworks, clauses, and sub-clauses from a CSV file.'

    @transaction.atomic
    def handle(self, *args, **options):
        """
        The main logic for the management command.
        Wrapped in a transaction to ensure data integrity.
        """
        # --- Configuration ---
        # IMPORTANT: Change these two lines to match the file you want to import.
        framework_name = "Act on the Protection of Personal Information (APPI)"
        csv_file_name = "Act on the Protection of Personal Information (APPI).csv"

        # --- End Configuration ---

        file_path = os.path.join(settings.BASE_DIR, 'compliance_monitoring', csv_file_name)
        self.stdout.write(self.style.SUCCESS(f"Starting data population from '{file_path}'..."))

        try:
            df = pd.read_csv(file_path)
            # Use object type to avoid dtype warnings with mixed types
            for col in df.columns:
                df[col] = df[col].astype('object')
            df.fillna("", inplace=True)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"Error: The file '{csv_file_name}' was not found."))
            return

        # --- Detect Column Names ---
        # Detects correct column names for different CSV formats
        if 'Clause' in df.columns:
            CLAUSE_TITLE_COLUMN = 'Clause'
        elif 'Control Title' in df.columns:
            CLAUSE_TITLE_COLUMN = 'Control Title'
        else:
            self.stdout.write(self.style.ERROR("Could not find a 'Clause' or 'Control Title' column."))
            return

        CLAUSE_NUMBER_COLUMN = 'Reference'
        CLAUSE_DESCRIPTION_COLUMN = 'Description'
        self.stdout.write(self.style.WARNING(f"Columns found in CSV: {list(df.columns)}"))

        # --- Clear and Recreate Framework ---
        self.stdout.write(self.style.WARNING(f"Clearing old data for framework '{framework_name}'..."))
        Framework.objects.filter(name=framework_name).delete()

        framework = Framework.objects.create(name=framework_name, description=f"Compliance data for {framework_name}")
        self.stdout.write(self.style.SUCCESS(f"Framework '{framework.name}' created."))

        created_clauses = {}

        # --- First Pass: Create All Main Clauses ---
        self.stdout.write("--- Populating Main Clauses ---")
        for index, row in df.iterrows():
            clause_num_str = str(row[CLAUSE_NUMBER_COLUMN]).strip()
            if not clause_num_str:
                continue

            parts = clause_num_str.split('.')
            is_main_clause = False

            # REFACTORED LOGIC: Define what a main clause is
            if clause_num_str.startswith('CLD.'): # Rule: All CLD clauses are main clauses
                is_main_clause = True
            elif len(parts) == 1 and parts[0].isdigit(): # Rule: A single number is a main clause (e.g., "4")
                is_main_clause = True
            elif len(parts) == 2 and parts[0].isalpha() and parts[1].isdigit(): # Rule: Letter.Number is a main clause (e.g., "A.5", "C.4")
                is_main_clause = True

            if is_main_clause:
                clause, created = Clause.objects.get_or_create(
                    framework=framework,
                    clause_number=clause_num_str,
                    defaults={'title': row[CLAUSE_TITLE_COLUMN], 'description': row[CLAUSE_DESCRIPTION_COLUMN]}
                )
                if created:
                    self.stdout.write(f"  Created Clause: {clause_num_str}")
                created_clauses[clause_num_str] = clause

        # --- Second Pass: Create Sub-Clauses and Link to Parents ---
        self.stdout.write("--- Populating Sub-Clauses ---")
        for index, row in df.iterrows():
            sub_clause_num = str(row[CLAUSE_NUMBER_COLUMN]).strip()
            if not sub_clause_num or sub_clause_num not in df[CLAUSE_NUMBER_COLUMN].unique():
                continue # Skip empty or non-unique numbers if any

            parts = sub_clause_num.split('.')
            is_main_clause = sub_clause_num in created_clauses # Check if it's already a main clause
            
            if not is_main_clause and '.' in sub_clause_num:
                # Determine parent based on format
                if sub_clause_num.startswith(('A.', 'C.')): # e.g., "C.4.1" -> parent is "C.4"
                    parent_num = f"{parts[0]}.{parts[1]}"
                elif parts[0].isdigit(): # e.g., "6.1.1" -> parent is "6"
                    parent_num = parts[0]
                else:
                    parent_num = None # Should not happen with current data

                if parent_num and parent_num in created_clauses:
                    parent_clause = created_clauses[parent_num]
                    sub_clause, created = SubClause.objects.get_or_create(
                        clause=parent_clause,
                        sub_clause_number=sub_clause_num,
                        defaults={'title': row[CLAUSE_TITLE_COLUMN], 'description': row[CLAUSE_DESCRIPTION_COLUMN]}
                    )
                    if created:
                        self.stdout.write(f"  Created Sub-Clause: {sub_clause_num} (Parent: {parent_num})")
                else:
                    self.stdout.write(self.style.ERROR(f"  Could not find parent clause '{parent_num}' for sub-clause '{sub_clause_num}'. Skipping."))

        self.stdout.write(self.style.SUCCESS("Data population complete!"))
