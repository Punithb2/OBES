# backend/api/permissions.py
from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """Allows access only to Super Admins."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.role == 'superadmin')

class IsDepartmentAdmin(permissions.BasePermission):
    """Allows access only to Department Admins."""
    def has_permission(self, request, view):
        # Allow both superadmins (override) and admins
        return bool(request.user and request.user.role in ['admin', 'superadmin'])

class IsFacultyForCourse(permissions.BasePermission):
    """
    Allows faculty to edit ONLY the courses they are assigned to.
    Admins can view/edit everything in their department.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'superadmin':
            return True
            
        course = getattr(obj, 'course', obj) if hasattr(obj, 'course') else obj
        
        # If user is a Department Admin, check if the course belongs to their department
        if request.user.role == 'admin':
            if hasattr(course, 'department'):
                return course.department == request.user.department
            return True # Fallback if no department linked

        # If user is Faculty, check explicit assignment
        if hasattr(course, 'assigned_faculty'):
            return course.assigned_faculty == request.user
            
        return False