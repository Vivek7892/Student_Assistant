import os
import json
import logging
from pathlib import Path
from django.conf import settings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import ConversationalRetrievalChain
from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage, SystemMessage
import pypdf
import docx
from pptx import Presentation

logger = logging.getLogger(__name__)


class DocumentProcessor:
    SUPPORTED_TYPES = {'.pdf', '.docx', '.pptx', '.txt'}

    def extract_text(self, file_path: str) -> str:
        ext = Path(file_path).suffix.lower()
        if ext == '.pdf':
            return self._extract_pdf(file_path)
        elif ext == '.docx':
            return self._extract_docx(file_path)
        elif ext == '.pptx':
            return self._extract_pptx(file_path)
        elif ext == '.txt':
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        raise ValueError(f'Unsupported file type: {ext}')

    def _extract_pdf(self, file_path: str) -> str:
        text = []
        with open(file_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                text.append(page.extract_text() or '')
        return '\n'.join(text)

    def _extract_docx(self, file_path: str) -> str:
        doc = docx.Document(file_path)
        return '\n'.join(para.text for para in doc.paragraphs)

    def _extract_pptx(self, file_path: str) -> str:
        prs = Presentation(file_path)
        text = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, 'text'):
                    text.append(shape.text)
        return '\n'.join(text)


class RAGPipeline:
    def __init__(self):
        self._llm = None
        self._embeddings = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        self.persist_dir = str(settings.CHROMA_PERSIST_DIR)
        os.makedirs(self.persist_dir, exist_ok=True)

    @property
    def llm(self):
        if not self._llm:
            key = settings.OPENAI_API_KEY
            if not key:
                raise ValueError('OpenAI API key not configured')
            self._llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.3, openai_api_key=key)
        return self._llm

    @property
    def embeddings(self):
        if not self._embeddings:
            key = settings.OPENAI_API_KEY
            if not key:
                raise ValueError('OpenAI API key not configured')
            self._embeddings = OpenAIEmbeddings(openai_api_key=key)
        return self._embeddings

    def get_vectorstore(self, collection_name: str):
        return Chroma(
            collection_name=collection_name,
            embedding_function=self.embeddings,
            persist_directory=self.persist_dir,
        )

    def index_document(self, text: str, collection_name: str, metadata: dict = None) -> int:
        chunks = self.text_splitter.split_text(text)
        metadatas = [metadata or {} for _ in chunks]
        vectorstore = self.get_vectorstore(collection_name)
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        vectorstore.persist()
        return len(chunks)

    def query(self, question: str, collection_name: str, chat_history: list = None, language: str = 'english') -> dict:
        vectorstore = self.get_vectorstore(collection_name)
        retriever = vectorstore.as_retriever(search_kwargs={'k': 5})

        lang_instruction = 'Respond in Kannada.' if language == 'kannada' else 'Respond in English.'

        system_prompt = f"""You are an intelligent study assistant for students. 
        Answer questions based on the provided context from study materials.
        If you don't find the answer in the context, say so clearly.
        Be concise, accurate, and educational. {lang_instruction}
        """

        prompt_template = PromptTemplate(
            input_variables=['context', 'question'],
            template=f"""{system_prompt}

Context:
{{context}}

Question: {{question}}

Answer:"""
        )

        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=retriever,
            return_source_documents=True,
            combine_docs_chain_kwargs={'prompt': prompt_template},
        )

        history = chat_history or []
        result = chain({'question': question, 'chat_history': history})

        sources = []
        for doc in result.get('source_documents', []):
            sources.append({
                'content': doc.page_content[:200],
                'metadata': doc.metadata,
            })

        return {
            'answer': result['answer'],
            'sources': sources,
        }

    def generate_quiz(self, text: str, num_questions: int = 10, difficulty: str = 'medium') -> list:
        prompt = f"""Based on the following study material, generate {num_questions} multiple choice questions 
        with difficulty level: {difficulty}.
        
        Return ONLY a valid JSON array with this exact structure:
        [
          {{
            "question": "Question text",
            "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
            "correct_answer": "A",
            "explanation": "Brief explanation"
          }}
        ]
        
        Study Material:
        {text[:4000]}
        """
        response = self.llm.invoke([HumanMessage(content=prompt)])
        try:
            content = response.content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return json.loads(content.strip())
        except json.JSONDecodeError:
            logger.error('Failed to parse quiz JSON')
            return []

    def generate_flashcards(self, text: str, num_cards: int = 15) -> list:
        prompt = f"""Based on the following study material, generate {num_cards} flashcards.
        
        Return ONLY a valid JSON array:
        [
          {{
            "front": "Key term or question",
            "back": "Definition or answer"
          }}
        ]
        
        Study Material:
        {text[:4000]}
        """
        response = self.llm.invoke([HumanMessage(content=prompt)])
        try:
            content = response.content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return json.loads(content.strip())
        except json.JSONDecodeError:
            logger.error('Failed to parse flashcards JSON')
            return []

    def summarize(self, text: str) -> str:
        prompt = f"""Summarize the following study material in a clear, structured way with key points:

{text[:6000]}

Provide:
1. Brief Overview (2-3 sentences)
2. Key Concepts (bullet points)
3. Important Details
4. Summary
"""
        response = self.llm.invoke([HumanMessage(content=prompt)])
        return response.content

    def generate_study_plan(self, subjects: list, duration_days: int, exam_date: str) -> dict:
        subjects_text = '\n'.join([f'- {s}' for s in subjects])
        prompt = f"""Create a detailed study plan for a student with the following:
        
Subjects: 
{subjects_text}

Duration: {duration_days} days
Exam Date: {exam_date}

Return a JSON object:
{{
  "overview": "Brief plan description",
  "daily_schedule": [
    {{
      "day": 1,
      "date": "YYYY-MM-DD",
      "tasks": [
        {{
          "subject": "Subject name",
          "topic": "Topic to study",
          "duration_hours": 2,
          "type": "study/revision/practice"
        }}
      ]
    }}
  ],
  "tips": ["tip1", "tip2"]
}}
"""
        response = self.llm.invoke([HumanMessage(content=prompt)])
        try:
            content = response.content.strip()
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
            return json.loads(content.strip())
        except json.JSONDecodeError:
            return {'overview': response.content, 'daily_schedule': [], 'tips': []}


rag_pipeline = RAGPipeline()
doc_processor = DocumentProcessor()
