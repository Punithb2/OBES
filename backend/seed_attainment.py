import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import ProgramOutcome, Configuration, Department, Course, User

def seed():
    print("Seeding POs...")
    for i in range(1, 13):
        ProgramOutcome.objects.get_or_create(
            id=f"PO{i}",
            defaults={"description": f"Program Outcome {i} description"}
        )

    print("Seeding Global Configuration...")
    Configuration.objects.get_or_create(
        key="global",
        defaults={
            "value": {
                "attainmentRules": {
                    "finalWeightage": {"direct": 80, "indirect": 20}
                }
            }
        }
    )

    # Ensure at least one course exists for attainment to show
    dept = Department.objects.first()
    if dept:
        print(f"Adding dummy course to {dept.name}...")
        Course.objects.get_or_create(
            id="C101",
            defaults={
                "code": "18CS51",
                "name": "Management and Entrepreneurship",
                "semester": 5,
                "credits": 3,
                "department": dept,
                "cos": ["CO1", "CO2", "CO3", "CO4", "CO5"]
            }
        )
    
    print("Seeding Complete!")

if __name__ == '__main__':
    seed()