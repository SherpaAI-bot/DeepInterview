from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

Base = declarative_base()

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, unique=True)
    processes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связь с ответами интервью
    interview_answers = relationship("InterviewAnswer", back_populates="candidate")

class InterviewAnswer(Base):
    __tablename__ = "interview_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    is_valid = Column(Boolean, default=True)
    process = Column(String(255), nullable=False)
    question_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Связь с кандидатом
    candidate = relationship("Candidate", back_populates="interview_answers")
