from rest_framework import serializers
from .models import Folder, Document, DocumentSummary


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'created_at']
        read_only_fields = ['id', 'created_at']


class DocumentSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentSummary
        fields = ['summary_md', 'key_points', 'created_at', 'model_used']


class DocumentSerializer(serializers.ModelSerializer):
    summary = DocumentSummarySerializer(read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'name', 'folder', 'file', 'file_type', 'size_bytes',
                  'mime', 'uploaded_at', 'summary']
        read_only_fields = ['id', 'uploaded_at', 'size_bytes', 'mime']

    def create(self, validated_data):
        file = validated_data.get('file')
        if file:
            validated_data['size_bytes'] = file.size
            validated_data['mime'] = getattr(file, 'content_type', '')
        return super().create(validated_data)
