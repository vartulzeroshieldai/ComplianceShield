from django.core.management.base import BaseCommand
from accounts.models import Organization, User

class Command(BaseCommand):
    help = 'Create default organization and assign users without organization'

    def handle(self, *args, **options):
        self.stdout.write("=== Organization Fix ===")
        
        # Check existing organizations
        organizations = Organization.objects.all()
        self.stdout.write(f"Existing organizations: {organizations.count()}")
        for org in organizations:
            self.stdout.write(f"  - {org.name} (ID: {org.id})")
        
        # Check users without organization
        users_without_org = User.objects.filter(organization__isnull=True)
        self.stdout.write(f"\nUsers without organization: {users_without_org.count()}")
        for user in users_without_org:
            self.stdout.write(f"  - {user.username} (ID: {user.id})")
        
        # Create default organization if none exists
        if organizations.count() == 0:
            self.stdout.write("\n=== Creating Default Organization ===")
            default_org = Organization.objects.create(name="Default Organization")
            self.stdout.write(f"Created organization: {default_org.name} (ID: {default_org.id})")
        else:
            # Use the first existing organization
            default_org = organizations.first()
            self.stdout.write(f"\n=== Using Existing Organization ===")
            self.stdout.write(f"Using organization: {default_org.name} (ID: {default_org.id})")
        
        # Assign all users without organization to the default organization
        if users_without_org.count() > 0:
            self.stdout.write(f"\n=== Assigning Users to Organization ===")
            for user in users_without_org:
                user.organization = default_org
                user.save()
                self.stdout.write(f"  - Assigned {user.username} to {default_org.name}")
        
        # Final check
        self.stdout.write("\n=== Final Status ===")
        final_orgs = Organization.objects.all()
        self.stdout.write(f"Total organizations: {final_orgs.count()}")
        final_users_without_org = User.objects.filter(organization__isnull=True)
        self.stdout.write(f"Users without organization: {final_users_without_org.count()}")
        
        self.stdout.write(self.style.SUCCESS("Organization fix completed successfully!"))


