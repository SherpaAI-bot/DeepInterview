from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/deepinterview")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    """Создает все таблицы в базе данных"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Возвращает сессию базы данных"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
