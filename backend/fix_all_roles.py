import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User

def audit_and_fix():
    print("-" * 50)
    print("EXISTING USERS:")
    print(f"{'Username':<20} | {'Email':<30} | {'Role':<15} | {'Superuser?'}")
    print("-" * 50)
    
    users = User.objects.all()
    for u in users:
        print(f"{u.username:<20} | {u.email:<30} | {u.role:<15} | {u.is_superuser}")

    print("-" * 50)
    
    # ASK USER WHICH ONE TO FIX
    target_username = input("\nEnter the username you want to make SUPERADMIN (e.g. superadmin): ")
    
    try:
        user = User.objects.get(username=target_username)
        user.role = 'superadmin'
        user.is_staff = True
        user.is_superuser = True
        user.save()
        print(f"\n✅ SUCCESS! User '{target_username}' is now a SUPERADMIN.")
        print("Please Logout and Login again.")
    except User.DoesNotExist:
        print(f"\n❌ Error: User '{target_username}' not found.")

if __name__ == '__main__':
    audit_and_fix()