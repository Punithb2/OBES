from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from .calculation_services import calculate_course_attainment
from .permissions import IsSuperAdmin, IsDepartmentAdmin, IsFacultyForCourse
from .models import *
from .serializers import *

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    
    def get_permissions(self):
        # ONLY Super Admins can create or edit Departments
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsSuperAdmin()]
        # Anyone logged in can view the department list
        return [permissions.IsAuthenticated()]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Custom logic: Check if the creator has permission to add this role
        creator = request.user
        new_role = request.data.get('role')

        if not creator.is_authenticated:
             pass
        elif creator.role == User.Role.SUPER_ADMIN:
            if new_role == User.Role.SUPER_ADMIN:
                return Response({"error": "Cannot create another Super Admin"}, status=403)
        elif creator.role == User.Role.ADMIN:
            if new_role != User.Role.FACULTY:
                return Response({"error": "Admins can only create Faculty"}, status=403)
        elif creator.role == User.Role.FACULTY:
            return Response({"error": "Faculty cannot create users"}, status=403)

        return super().create(request, *args, **kwargs)
    
    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all()

        # 1. SECURITY FILTRATION 
        if not user.is_authenticated:
            return User.objects.none()
            
        elif user.role == User.Role.ADMIN or user.role == 'admin':
            # Department Admins MUST ONLY see users in their own department
            if user.department:
                queryset = queryset.filter(department=user.department)
            else:
                return User.objects.none()
                
        # (SuperAdmins bypass this and see everyone)

        # 2. URL PARAMETER FILTRATION
        role_param = self.request.query_params.get('role')
        if role_param:
            queryset = queryset.filter(role=role_param)
            
        department_param = self.request.query_params.get('department')
        if department_param:
            queryset = queryset.filter(department=department_param)
            
        return queryset.distinct()

    @action(detail=False, methods=['get'])
    def me(self, request):
        # Endpoint to get current logged-in user details
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class SchemeViewSet(viewsets.ModelViewSet):
    queryset = Scheme.objects.all()
    serializer_class = SchemeSerializer
    
    def get_permissions(self):
        # ONLY Department Admins (and Super Admins) can create or edit Schemes
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsDepartmentAdmin()]
        return [permissions.IsAuthenticated()]

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Course.objects.all()

        # 1. SECURITY FILTRATION (The Fix for the Data Bleed)
        if not user.is_authenticated:
            return Course.objects.none()
            
        elif user.role == User.Role.ADMIN or user.role == 'admin':
            # Department Admins MUST ONLY see courses in their own department
            if user.department:
                queryset = queryset.filter(department=user.department)
            else:
                return Course.objects.none()
                
        elif user.role == User.Role.FACULTY or user.role == 'faculty':
            # Faculty MUST ONLY see courses explicitly assigned to them
            queryset = queryset.filter(assigned_faculty=user)

        # (Note: SuperAdmins bypass the above if/elif and get all courses)


        # 2. URL PARAMETER FILTRATION (For specific frontend requests)
        department_param = self.request.query_params.get('department')
        if department_param:
            queryset = queryset.filter(department=department_param)

        assigned_faculty_id = self.request.query_params.get('assignedFacultyId')
        if assigned_faculty_id:
            queryset = queryset.filter(assigned_faculty__id=assigned_faculty_id)

        # Use .distinct() in case of multiple overlapping joins
        return queryset.distinct()

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer

    def get_queryset(self):
        queryset = Student.objects.all()
        department = self.request.query_params.get('department')
        
        if department:
            # Find students enrolled in ANY course belonging to this department
            queryset = queryset.filter(courses__department=department).distinct()
            
        return queryset

class MarkViewSet(viewsets.ModelViewSet):
    queryset = Mark.objects.all()
    serializer_class = MarkSerializer
    # Faculty can only edit marks for their courses
    permission_classes = [permissions.IsAuthenticated, IsFacultyForCourse]

    def get_queryset(self):
        """
        Filters data so Faculty only download marks for their own subjects.
        """
        queryset = Mark.objects.all()
        user = self.request.user
        
        # Security Filtration
        if user.role == 'faculty':
            queryset = queryset.filter(course__assigned_faculty=user)
        elif user.role == 'student':
            queryset = queryset.filter(student__usn=user.username)
        elif user.role == 'admin':
            queryset = queryset.filter(course__department=user.department)

        # Performance Filtration (URL Params)
        course_id = self.request.query_params.get('course')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
            
        return queryset

class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramOutcome.objects.all()
    serializer_class = ProgramOutcomeSerializer

class ProgramSpecificOutcomeViewSet(viewsets.ModelViewSet):
    queryset = ProgramSpecificOutcome.objects.all()
    serializer_class = ProgramSpecificOutcomeSerializer

class ConfigurationViewSet(viewsets.ModelViewSet):
    queryset = Configuration.objects.all()
    serializer_class = ConfigurationSerializer
    
    # Custom lookup field to find by 'key' (e.g., /configurations/global/)
    lookup_field = 'key' 

class ArticulationMatrixViewSet(viewsets.ModelViewSet):
    queryset = ArticulationMatrix.objects.all()
    serializer_class = ArticulationMatrixSerializer

class SurveyViewSet(viewsets.ModelViewSet):
    queryset = Survey.objects.all()
    serializer_class = SurveySerializer

    def get_queryset(self):
        queryset = Survey.objects.all()
        # Allow filtering by department: /api/surveys/?department=D01
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department=dept_id)
        return queryset

class CourseAttainmentReportView(APIView):
    # We will add strict permissions here in Phase 3!
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, course_id):
        """
        Generates and returns the full CO/PO attainment report for a course.
        """
        report_data = calculate_course_attainment(course_id)
        
        if "error" in report_data:
            return Response(report_data, status=404)
            
        return Response(report_data, status=200)