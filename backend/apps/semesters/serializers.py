from rest_framework import serializers
from .models import Semester, Subject


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = '__all__'
        read_only_fields = ['id', 'semester', 'created_at', 'updated_at']


class SemesterSerializer(serializers.ModelSerializer):
    subjects = SubjectSerializer(many=True, read_only=True)

    class Meta:
        model = Semester
        fields = '__all__'
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
