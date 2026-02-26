from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from api.models import User, Department, Configuration

class Command(BaseCommand):
    help = 'Bootstraps the OBES database with default departments, configurations, and a Super Admin.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("Starting OBES Database Initialization..."))

        # 1. Create Default Departments
        self.stdout.write("Creating default departments...")
        depts = [
            {"id": "D01", "name": "Computer Science & Engineering"},
            {"id": "D02", "name": "Electronics & Communication Engineering"},
        ]
        for dept in depts:
            Department.objects.get_or_create(id=dept["id"], defaults={"name": dept["name"]})

        # 2. Create Global Configurations
        self.stdout.write("Creating global configurations...")
        Configuration.objects.get_or_create(
            key="global_scheme_settings",
            defaults={
                "value": {
                    "pass_criteria": 50,
                    "attainment_levels": {"level_3": 70, "level_2": 60, "level_1": 50},
                    "weightage": {"direct": 80, "indirect": 20},
                    "po_calculation": {"normalization_factor": 3}
                }
            }
        )

        # 3. Create the Super Admin User
        self.stdout.write("Setting up Super Admin account...")
        admin_email = "admin@obe.com"
        admin_password = "password123"

        if not User.objects.filter(email=admin_email).exists():
            User.objects.create(
                username=admin_email,
                email=admin_email,
                password=make_password(admin_password),
                first_name="System",
                last_name="Administrator",
                display_name="System Administrator",
                role=User.Role.SUPER_ADMIN,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Super Admin created successfully!"))
            self.stdout.write(self.style.SUCCESS(f"   Email: {admin_email}"))
            self.stdout.write(self.style.SUCCESS(f"   Password: {admin_password}"))
        else:
            self.stdout.write(self.style.NOTICE("Super Admin already exists. Skipping."))

        self.stdout.write(self.style.SUCCESS("\n🎉 Initialization Complete! You can now log in to the frontend."))