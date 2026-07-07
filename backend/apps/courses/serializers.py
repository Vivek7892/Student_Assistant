from rest_framework import serializers
from .models import Semester, Subject, StudyMaterial, StudentSemesterEnrollment, LearningResource, PlannerTask, YouTubeResource, VideoFolder


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
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'uploaded_by', 'is_processed', 'download_count']

    def get_file_url(self, obj):
        url = obj.file_url or ''
        if 'cloudinary.com' in url and '/raw/upload/' in url:
            if 'fl_attachment:false,fl_inline' not in url:
                url = url.replace('/raw/upload/', '/raw/upload/fl_attachment:false,fl_inline/')
        return url

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


class VideoFolderSerializer(serializers.ModelSerializer):
    video_count = serializers.SerializerMethodField()

    class Meta:
        model = VideoFolder
        fields = ['id', 'name', 'color', 'video_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_video_count(self, obj):
        return obj.videos.count()


class YouTubeResourceSerializer(serializers.ModelSerializer):
    folder_name = serializers.CharField(source='folder.name', read_only=True, default=None)

    class Meta:
        model = YouTubeResource
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'added_by', 'youtube_id', 'title', 'thumbnail', 'channel', 'duration', 'view_count']


class PlannerTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannerTask
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user']
