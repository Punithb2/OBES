import os
import json
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User, Department

# Load db.json
# ADJUST THE PATH below if db.json is in a different location
with open('../frontend/db.json', 'r') as f:
    data = json.load(f)

def run_import():
    print("Importing Departments...")
    for dept in data['departments']:
        Department.objects.get_or_create(
            id=dept['id'],
            defaults={'name': dept['name']}
        )
    
    print("Importing Users...")
    for u in data['users']:
        # Map db.json fields to Django User model
        dept_instance = None
        if u.get('departmentId'):
            try:
                dept_instance = Department.objects.get(id=u['departmentId'])
            except Department.DoesNotExist:
                print(f"Warning: Department {u['departmentId']} not found for user {u['name']}")

        # Create user if not exists
        if not User.objects.filter(email=u['email']).exists():
            User.objects.create_user(
                username=u['email'], # Use email as username
                email=u['email'],
                password='password123', # Default password for all imported users
                first_name=u['name'].split(' ')[0],
                last_name=' '.join(u['name'].split(' ')[1:]),
                display_name=u['name'],
                role=u['role'],
                department=dept_instance
            )
            print(f"Created user: {u['name']}")
        else:
            print(f"User already exists: {u['name']}")

if __name__ == '__main__':
    run_import()