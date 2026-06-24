from rest_framework import serializers
from .models import Semester, Subject, StudyMaterial, StudentSemesterEnrollment, LearningResource


class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    materials_count = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_materials_count(self, obj):
        return obj.materials.count()


class SemesterSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)
    subjects_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Semester
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_subjects_count(self, obj):
        return obj.subjects.count()


class StudyMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, default='')

    class Meta:
        model = StudyMaterial
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by', 'is_processed', 'download_count']

    def validate_subject(self, value):
        return value


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'added_by']


class EnrollmentSerializer(serializers.ModelSerializer):
    semester_detail = SemesterSerializer(source='semester', read_only=True)

    class Meta:
        model = StudentSemesterEnrollment
        fields = '__all__'
        read_only_fields = ['id', 'enrolled_at', 'student']
