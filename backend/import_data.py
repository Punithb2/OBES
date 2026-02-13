import os
import json
import django

# 1. Setup Django Environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import (
    User, Department, Course, Student, Mark, 
    ProgramOutcome, ProgramSpecificOutcome, Configuration, ArticulationMatrix
)

# 2. Path to db.json (Adjust if your folder structure is different)
DB_JSON_PATH = os.path.join(os.path.dirname(__file__), '../frontend/db.json')

def run_import():
    if not os.path.exists(DB_JSON_PATH):
        print(f"Error: db.json not found at {DB_JSON_PATH}")
        return

    print(f"Loading data from {DB_JSON_PATH}...")
    with open(DB_JSON_PATH, 'r') as f:
        data = json.load(f)

    # ---------------------------------------------------------
    # 1. Departments
    # ---------------------------------------------------------
    print("Importing Departments...")
    for dept in data.get('departments', []):
        Department.objects.get_or_create(
            id=dept['id'],
            defaults={'name': dept['name']}
        )

    # ---------------------------------------------------------
    # 2. Users (Faculty/Admin)
    # ---------------------------------------------------------
    print("Importing Users...")
    for u in data.get('users', []):
        # Resolve Department
        dept_instance = None
        if u.get('departmentId'):
            try:
                dept_instance = Department.objects.get(id=u['departmentId'])
            except Department.DoesNotExist:
                print(f"  Warning: Dept {u['departmentId']} not found for user {u['name']}")

        # Check for existing users by email
        existing_users = User.objects.filter(email=u['email'])

        if not existing_users.exists():
            # Create new user
            name_parts = u['name'].strip().split(' ')
            first_name = name_parts[0]
            last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
            
            try:
                User.objects.create_user(
                    username=u['email'], # Use email as username
                    email=u['email'],
                    password='password123', # Default password
                    first_name=first_name,
                    last_name=last_name,
                    display_name=u['name'],
                    role=u['role'],
                    department=dept_instance
                )
                print(f"  Created user: {u['name']}")
            except Exception as e:
                print(f"  Error creating user {u['name']}: {e}")
        else:
            # Update existing user(s) - Handles duplicates without crashing
            for user_obj in existing_users:
                user_obj.role = u['role']
                user_obj.department = dept_instance
                user_obj.display_name = u['name']
                user_obj.save()
                print(f"  Updated existing user: {u['name']} (ID: {user_obj.id})")

    # ---------------------------------------------------------
    # 3. Program Outcomes (POs)
    # ---------------------------------------------------------
    print("Importing POs...")
    for po in data.get('pos', []):
        ProgramOutcome.objects.get_or_create(
            id=po['id'],
            defaults={'description': po['description']}
        )

    # ---------------------------------------------------------
    # 4. Program Specific Outcomes (PSOs)
    # ---------------------------------------------------------
    print("Importing PSOs...")
    default_dept = Department.objects.filter(id='D01').first() or Department.objects.first()
    
    if default_dept:
        for pso in data.get('psos', []):
            ProgramSpecificOutcome.objects.get_or_create(
                id=pso['id'],
                defaults={
                    'description': pso['description'],
                    'department': default_dept
                }
            )
    else:
        print("  Warning: No departments found to assign PSOs.")

    # ---------------------------------------------------------
    # 5. Configurations (Global Settings)
    # ---------------------------------------------------------
    print("Importing Configurations...")
    for config in data.get('configurations', []):
        config_val = config.copy()
        key = config_val.pop('id')
        
        Configuration.objects.update_or_create(
            key=key,
            defaults={'value': config_val}
        )

    # ---------------------------------------------------------
    # 6. Courses
    # ---------------------------------------------------------
    print("Importing Courses...")
    for c in data.get('courses', []):
        try:
            dept = Department.objects.get(id=c['departmentId'])
            
            # Resolve Faculty
            faculty = None
            if c.get('assignedFacultyId'):
                fac_entry = next((u for u in data['users'] if u['id'] == c['assignedFacultyId']), None)
                if fac_entry:
                    # Find first matching user by email
                    faculty = User.objects.filter(email=fac_entry['email']).first()

            Course.objects.update_or_create(
                id=c['id'],
                defaults={
                    'code': c['code'],
                    'name': c['name'],
                    'semester': c['semester'],
                    'credits': c['credits'],
                    'department': dept,
                    'assigned_faculty': faculty,
                    'cos': c.get('cos', []),
                    'assessment_tools': c.get('assessmentTools', []),
                    'settings': c.get('settings', {})
                }
            )
        except Department.DoesNotExist:
            print(f"  Skipping Course {c['code']}: Department {c['departmentId']} not found")

    # ---------------------------------------------------------
    # 7. Students
    # ---------------------------------------------------------
    print("Importing Students...")
    for s in data.get('students', []):
        student, created = Student.objects.get_or_create(
            id=s['id'],
            defaults={
                'name': s['name'],
                'usn': s['usn']
            }
        )
        
        if s.get('courseId'):
            try:
                course = Course.objects.get(id=s['courseId'])
                student.courses.add(course)
            except Course.DoesNotExist:
                print(f"  Warning: Course {s['courseId']} not found for student {s['name']}")

    # ---------------------------------------------------------
    # 8. Marks
    # ---------------------------------------------------------
    print("Importing Marks...")
    for m in data.get('marks', []):
        try:
            student = Student.objects.get(id=m['studentId'])
            course = Course.objects.get(id=m['courseId'])
            
            Mark.objects.update_or_create(
                id=m['id'],
                defaults={
                    'student': student,
                    'course': course,
                    'assessment_name': m['assessment'],
                    'scores': m['scores']
                }
            )
        except (Student.DoesNotExist, Course.DoesNotExist):
            pass

    # ---------------------------------------------------------
    # 9. Articulation Matrix
    # ---------------------------------------------------------
    print("Importing Articulation Matrix...")
    art_matrix_data = data.get('articulationMatrix', {})
    for course_id, matrix in art_matrix_data.items():
        try:
            course = Course.objects.get(id=course_id)
            ArticulationMatrix.objects.update_or_create(
                course=course,
                defaults={'matrix': matrix}
            )
        except Course.DoesNotExist:
            print(f"  Skipping Matrix: Course {course_id} not found")

    print("-------------------------------------------------------")
    print("✅ Data Import Completed Successfully!")
    print("-------------------------------------------------------")

if __name__ == '__main__':
    run_import()