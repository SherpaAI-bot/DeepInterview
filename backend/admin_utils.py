import pandas as pd
import os
from sqlalchemy.orm import Session
from models import Candidate, InterviewAnswer
from typing import List, Dict, Any
from datetime import datetime
import io

def get_candidate_statuses(db: Session) -> List[Dict[str, Any]]:
    """Получает статусы всех кандидатов"""
    candidates = db.query(Candidate).all()
    candidate_statuses = []
    
    for candidate in candidates:
        # Получаем ответы интервью для кандидата
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.candidate_id == candidate.id
        ).all()
        
        if not answers:
            interview_status = "не начато"
            progress_percent = 0
        else:
            total_answers = len(answers)
            valid_answers = len([a for a in answers if a.is_valid])
            
            if total_answers > 0:
                progress_percent = min(int((valid_answers / total_answers) * 100), 100)
                if progress_percent == 100:
                    interview_status = "пройдено"
                else:
                    interview_status = "в процессе"
            else:
                interview_status = "не начато"
                progress_percent = 0
        
        candidate_statuses.append({
            "id": candidate.id,
            "full_name": candidate.full_name,
            "processes": candidate.processes or "",
            "interview_status": interview_status,
            "progress_percent": progress_percent,
            "created_at": candidate.created_at
        })
    
    return candidate_statuses

def get_admin_stats(db: Session) -> Dict[str, int]:
    """Получает статистику для админки"""
    total_candidates = db.query(Candidate).count()
    
    candidates = db.query(Candidate).all()
    completed_interviews = 0
    in_progress_interviews = 0
    not_started_interviews = 0
    
    for candidate in candidates:
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.candidate_id == candidate.id
        ).all()
        
        if not answers:
            not_started_interviews += 1
        else:
            total_answers = len(answers)
            valid_answers = len([a for a in answers if a.is_valid])
            
            if total_answers > 0:
                progress_percent = min(int((valid_answers / total_answers) * 100), 100)
                if progress_percent == 100:
                    completed_interviews += 1
                else:
                    in_progress_interviews += 1
            else:
                not_started_interviews += 1
    
    return {
        "total_candidates": total_candidates,
        "completed_interviews": completed_interviews,
        "in_progress_interviews": in_progress_interviews,
        "not_started_interviews": not_started_interviews
    }

def get_analytics_data(db: Session) -> List[Dict[str, Any]]:
    """Получает аналитические данные"""
    candidates = db.query(Candidate).all()
    analytics_data = []
    
    for candidate in candidates:
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.candidate_id == candidate.id
        ).all()
        
        if not answers:
            continue
        
        # Подсчитываем метрики
        total_time_minutes = 0
        process_count = len(set([a.process for a in answers if a.process]))
        
        # Упрощенный расчет времени (в реальности нужна более сложная логика)
        for answer in answers:
            if answer.is_valid and answer.question_number == 2:  # Вопрос про время
                # Пытаемся извлечь число из ответа
                import re
                numbers = re.findall(r'\d+', answer.answer)
                if numbers:
                    time_minutes = float(numbers[0])
                    total_time_minutes += time_minutes
        
        # Примерная стоимость (ставка из .env или 0.5 по умолчанию)
        rate_per_minute = float(os.getenv("PROCESS_RATE_PER_MINUTE", "0.5"))
        estimated_cost_rub = total_time_minutes * rate_per_minute
        
        analytics_data.append({
            "full_name": candidate.full_name,
            "total_time_minutes": total_time_minutes,
            "estimated_cost_rub": estimated_cost_rub,
            "process_count": process_count
        })
    
    return analytics_data

def export_candidates_data(db: Session) -> str:
    """Экспортирует данные кандидатов в CSV"""
    candidates = db.query(Candidate).all()
    
    data = []
    for candidate in candidates:
        answers = db.query(InterviewAnswer).filter(
            InterviewAnswer.candidate_id == candidate.id
        ).all()
        
        total_questions = len(answers)
        valid_answers = len([a for a in answers if a.is_valid])
        progress_percent = int((valid_answers / total_questions) * 100) if total_questions > 0 else 0
        
        data.append({
            "ФИО": candidate.full_name,
            "Процессы": candidate.processes or "",
            "Кол-во вопросов": total_questions,
            "Валидных ответов": valid_answers,
            "Прогресс %": progress_percent,
            "Время создания": candidate.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    
    df = pd.DataFrame(data)
    
    # Создаем CSV в памяти
    output = io.StringIO()
    df.to_csv(output, index=False, encoding='utf-8')
    return output.getvalue()

def update_candidates_from_csv(db: Session, csv_content: str) -> bool:
    """Обновляет кандидатов из CSV файла"""
    try:
        # Читаем CSV из строки
        df = pd.read_csv(io.StringIO(csv_content))
        
        if 'ФИО' not in df.columns or 'Процессы' not in df.columns:
            return False
        
        for _, row in df.iterrows():
            full_name = str(row['ФИО']).strip()
            processes = str(row['Процессы']).strip() if pd.notna(row['Процессы']) else ""
            
            if full_name:
                # Ищем существующего кандидата
                existing_candidate = db.query(Candidate).filter(
                    Candidate.full_name == full_name
                ).first()
                
                if existing_candidate:
                    # Обновляем существующего кандидата
                    existing_candidate.processes = processes
                else:
                    # Создаем нового кандидата
                    new_candidate = Candidate(
                        full_name=full_name,
                        processes=processes
                    )
                    db.add(new_candidate)
        
        db.commit()
        return True
        
    except Exception as e:
        print(f"Ошибка при обновлении CSV: {e}")
        db.rollback()
        return False

