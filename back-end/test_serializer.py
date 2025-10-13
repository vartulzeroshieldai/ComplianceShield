import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grc_project.settings')
django.setup()

from compliance_monitoring.serializers import EvidenceSerializer
from auditing.models import Evidence
import json

print("=== TESTING EVIDENCE SERIALIZER ===")

# Get evidence from sample6 and sample4
evidence = Evidence.objects.filter(project_id__in=[7, 8]).first()

if evidence:
    print(f"Testing evidence: {evidence.id} - {evidence.evidence_name}")
    print(f"Database sub_clause: {evidence.sub_clause_id}")
    print(f"Database clauses: {list(evidence.clauses.values_list('id', flat=True))}")
    
    # Test serializer
    serializer = EvidenceSerializer(evidence)
    serialized_data = serializer.data
    
    print("\nSerialized data:")
    print(f"  sub_clause: {serialized_data.get('sub_clause')}")
    print(f"  clauses: {serialized_data.get('clauses')}")
    print(f"  sub_clause_number: {serialized_data.get('sub_clause_number')}")
    
    # Pretty print the full serialized data
    print("\nFull serialized data:")
    print(json.dumps(serialized_data, indent=2, default=str))
else:
    print("No evidence found for projects 7 and 8")
