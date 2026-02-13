from rest_framework import serializers
from .models import User, Department, Course, Student, Mark, ArticulationMatrix, Configuration, ProgramOutcome, ProgramSpecificOutcome, Survey, Scheme

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'role', 'department', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # This handles hashing the password when a user is created
        password = validated_data.pop('password', None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

class SchemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scheme
        fields = '__all__'

class CourseSerializer(serializers.ModelSerializer):
    # Optional: nested serializer to show faculty name instead of just ID
    assigned_faculty_name = serializers.ReadOnlyField(source='assigned_faculty.display_name')
    scheme_details = SchemeSerializer(source='scheme', read_only=True)
    
    class Meta:
        model = Course
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class MarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mark
        fields = '__all__'

class ProgramOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramOutcome
        fields = '__all__'

class ProgramSpecificOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramSpecificOutcome
        fields = '__all__'

class ConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuration
        fields = '__all__'

class ArticulationMatrixSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArticulationMatrix
        fields = '__all__'

class SurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = Survey
        fields = ['id', 'department', 'exit_survey', 'employer_survey', 'alumni_survey', 'updated_at']