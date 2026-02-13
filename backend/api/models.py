from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.postgres.fields import ArrayField

class Department(models.Model):
    # db.json uses string IDs like "D01", so we use CharField as primary key
    id = models.CharField(max_length=10, primary_key=True) 
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "superadmin", "Super Admin"
        ADMIN = "admin", "Admin"
        FACULTY = "faculty", "Faculty"
        STUDENT = "student", "Student"

    # We map 'name' from db.json to first_name/last_name or a display name
    display_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FACULTY)
    
    # Link to Department
    department = models.ForeignKey(
        Department, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="users"
    )

    # To maintain hierarchy (Who created this user?)
    created_by = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )

    def save(self, *args, **kwargs):
        if not self.display_name:
            self.display_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

class Scheme(models.Model):
    """
    Defines the rules for a specific academic scheme (e.g., 2018 Scheme, 2022 Scheme).
    Stores thresholds, weightages, and calculation logic parameters.
    """
    id = models.CharField(max_length=20, primary_key=True) # e.g., "SCHEME2022"
    name = models.CharField(max_length=100) # e.g., "2022 Outcome Based Education Scheme"
    
    # Stores all calculation logic in a flexible JSON format
    # Structure example:
    # {
    #   "pass_criteria": 50,
    #   "levels": { "3": 70, "2": 60, "1": 50 },
    #   "internal_split": { "cie": 50, "see": 50 },
    #   "po_weightage": { "direct": 80, "indirect": 20 }
    # }
    settings = models.JSONField(default=dict)

    def __str__(self):
        return self.name

class Course(models.Model):
    id = models.CharField(max_length=20, primary_key=True) # e.g., C101
    code = models.CharField(max_length=20) # e.g., CS101
    name = models.CharField(max_length=255)
    semester = models.IntegerField()
    credits = models.IntegerField()
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="courses")
    assigned_faculty = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="courses")
    scheme = models.ForeignKey(Scheme, on_delete=models.SET_NULL, null=True, blank=True, related_name="courses")
    cos = models.JSONField(default=list, blank=True) 
    assessment_tools = models.JSONField(default=list, blank=True)
    settings = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class Student(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=255)
    usn = models.CharField(max_length=20, unique=True)
    # A student can be in multiple courses, so we use ManyToMany
    courses = models.ManyToManyField(Course, related_name="students")

    def __str__(self):
        return f"{self.name} ({self.usn})"

class Mark(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    assessment_name = models.CharField(max_length=100) # e.g., "Internal Assessment 1"
    scores = models.JSONField(default=dict) # e.g., {"Part A": 10, "Part B": 12}

    class Meta:
        unique_together = ('student', 'course', 'assessment_name')

class ProgramOutcome(models.Model):
    id = models.CharField(max_length=10, primary_key=True) # e.g., PO1
    description = models.TextField()

class ProgramSpecificOutcome(models.Model):
    id = models.CharField(max_length=10, primary_key=True) # e.g., PSO1
    description = models.TextField()
    department = models.ForeignKey(Department, on_delete=models.CASCADE)

class Configuration(models.Model):
    key = models.CharField(max_length=50, primary_key=True) # e.g., "global"
    value = models.JSONField(default=dict)

# Stores the mapping between COs and POs for a course
class ArticulationMatrix(models.Model):
    course = models.OneToOneField(Course, on_delete=models.CASCADE, primary_key=True)
    matrix = models.JSONField(default=dict) # { "CO1": { "PO1": 3, "PO2": 2 } }

class Survey(models.Model):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="surveys")
    # Store ratings as JSON: { "PO1": 2.5, "PO2": 3.0 }
    exit_survey = models.JSONField(default=dict, blank=True)
    employer_survey = models.JSONField(default=dict, blank=True)
    alumni_survey = models.JSONField(default=dict, blank=True)
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Surveys - {self.department.name}"