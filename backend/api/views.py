from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import ArticulationMatrix, Configuration, ProgramOutcome, ProgramSpecificOutcome, User, Department, Course, Student, Mark
from .serializers import ArticulationMatrixSerializer, ConfigurationSerializer, ProgramOutcomeSerializer, ProgramSpecificOutcomeSerializer, UserSerializer, DepartmentSerializer, CourseSerializer, StudentSerializer, MarkSerializer

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Custom logic: Check if the creator has permission to add this role
        creator = request.user
        new_role = request.data.get('role')

        if not creator.is_authenticated:
             # Allow initial setup or handle via specific signup endpoint if needed
             # For now, we fall back to standard permission classes
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
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        department = self.request.query_params.get('department')
        
        if role:
            queryset = queryset.filter(role=role)
        if department:
            queryset = queryset.filter(department=department)
            
        return queryset

    @action(detail=False, methods=['get'])
    def me(self, request):
        # Endpoint to get current logged-in user details
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer

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