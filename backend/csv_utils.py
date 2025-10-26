import pandas as pd
import os
from sqlalchemy.orm import Session
from models import Candidate

def load_candidates_from_csv(db: Session, csv_path: str = "uploads/candidates.csv"):
    """Загружает кандидатов из CSV файла в базу данных"""
    try:
        if not os.path.exists(csv_path):
            print(f"CSV файл {csv_path} не найден")
            return False
            
        # Читаем CSV файл
        df = pd.read_csv(csv_path, encoding='utf-8')
        
        # Проверяем наличие необходимых колонок
        if 'ФИО' not in df.columns or 'Процессы' not in df.columns:
            print("CSV файл должен содержать колонки 'ФИО' и 'Процессы'")
            return False
        
        # Очищаем существующие данные
        db.query(Candidate).delete()
        
        # Добавляем новые данные
        for _, row in df.iterrows():
            full_name = str(row['ФИО']).strip()
            processes = str(row['Процессы']).strip() if pd.notna(row['Процессы']) else ""
            
            if full_name:  # Пропускаем пустые строки
                candidate = Candidate(
                    full_name=full_name,
                    processes=processes
                )
                db.add(candidate)
        
        db.commit()
        print(f"Успешно загружено {len(df)} кандидатов из CSV файла")
        return True
        
    except Exception as e:
        print(f"Ошибка при загрузке CSV файла: {e}")
        db.rollback()
        return False

def find_candidate_by_name(db: Session, full_name: str):
    """Ищет кандидата по ФИО"""
    candidate = db.query(Candidate).filter(Candidate.full_name == full_name).first()
    return candidate
