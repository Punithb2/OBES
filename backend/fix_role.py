import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import User

def fix_superadmin():
    # 1. Find the user. Replace 'superadmin@obe.com' if your email is different
    # or use username='superadmin' if you didn't use an email
    try:
        # Try finding by username first (createsuperuser usually sets username)
        user = User.objects.filter(is_superuser=True).first()
        
        if not user:
            print("No Superuser found! Please run 'python manage.py createsuperuser' first.")
            return

        print(f"Found Superuser: {user.username} (Current Role: {user.role})")
        
        # 2. Update the role
        user.role = 'superadmin'
        user.save()
        
        print(f"✅ Success! Updated {user.username} role to 'superadmin'.")
        print("Please logout and login again.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    fix_superadmin()