from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import time
import io

from database import create_tables, get_db
from models import InterviewAnswer
from schemas import (
    CandidateRegister, CandidateResponse, ChatRequest, ChatResponse,
    AdminLogin, AdminToken, CandidateStatus, AnalyticsData, AdminStats
)
from csv_utils import load_candidates_from_csv, find_candidate_by_name
from interview_logic import interview_manager
from interview_logic import INTERVIEW_QUESTIONS
from auth import authenticate_admin, create_access_token, get_current_admin
from admin_utils import (
    get_candidate_statuses, get_admin_stats, get_analytics_data,
    export_candidates_data, update_candidates_from_csv
)
from report_generator import generate_report_files
from ai_helper import generate_follow_up  # ✅ важно: импорт наверху, а не внизу
from pydantic import BaseModel

app = FastAPI(title="DeepInterview API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_database():
    """Initialize database connection and create tables"""
    max_retries = 10
    retry_count = 0

    while retry_count < max_retries:
        try:
            create_tables()
            db = next(get_db())
            load_candidates_from_csv(db)
            db.close()
            print("✅ Database initialized successfully")
            return True
        except Exception as e:
            retry_count += 1
            print(f"Database connection failed ({retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                time.sleep(2)
            else:
                print("❌ Failed to connect to database after maximum retries")
                raise


@app.on_event("startup")
async def startup_event():
    init_database()


@app.get("/")
async def root():
    return {"message": "DeepInterview API is running"}


@app.get("/api/ping")
async def ping():
    return {"status": "ok"}


@app.post("/api/register", response_model=CandidateResponse)
async def register_candidate(candidate_data: CandidateRegister, db: Session = Depends(get_db)):
    """Регистрация кандидата"""
    try:
        candidate = find_candidate_by_name(db, candidate_data.full_name)

        if candidate:
            processes_list = []
            if candidate.processes:
                processes_list = [p.strip() for p in candidate.processes.split(",") if p.strip()]

            return CandidateResponse(
                status="ok",
                message="allowed",
                processes=processes_list
            )

        return CandidateResponse(status="error", message="forbidden")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_bot(chat_request: ChatRequest, db: Session = Depends(get_db)):
    """Чат с ботом для проведения интервью"""
    try:
        candidate = find_candidate_by_name(db, chat_request.full_name)
        if not candidate:
            raise HTTPException(status_code=404, detail="Кандидат не найден")

        processes = [p.strip() for p in (candidate.processes or "").split(",") if p.strip()]
        if not processes:
            raise HTTPException(status_code=400, detail="У кандидата нет назначенных процессов")

        # Если пользователь просит начать интервью
        if chat_request.message.lower() == "начать интервью":
            current_question, process_index, question_index = interview_manager.get_next_question(
                chat_request.full_name, processes
            )
            if current_question == "Интервью завершено":
                return ChatResponse(bot_message="Ваше интервью завершено! Спасибо за участие!", progress=100)
            return ChatResponse(bot_message=current_question, progress=0)

        # Обработка ответа пользователя
        # Сначала сохраняем ответ, затем получаем следующий вопрос
        state_key = chat_request.full_name
        if state_key not in interview_manager.interview_states:
            raise HTTPException(status_code=400, detail="Интервью ещё не начато. Отправьте 'начать интервью'")
        
        state = interview_manager.interview_states[state_key]
        process_index = state['current_process_index']
        question_index = state['current_question_index']
        
        # Проверяем, не завершено ли интервью
        if process_index >= len(processes):
            return ChatResponse(bot_message="Ваше интервью завершено! Спасибо за участие!", progress=100)
        
        # Получаем текущий вопрос
        current_process = processes[process_index]
        current_question = INTERVIEW_QUESTIONS[question_index]
        formatted_question = f"Процесс: {current_process}\n\n{current_question}"
        
        # Валидируем ответ
        is_valid = interview_manager.validate_answer(chat_request.message, current_question)

        # Сохраняем ответ
        interview_answer = InterviewAnswer(
            candidate_id=candidate.id,
            question=formatted_question,
            answer=chat_request.message,
            is_valid=is_valid,
            process=current_process,
            question_number=question_index + 1
        )
        db.add(interview_answer)
        db.commit()

        # Обрабатываем ответ и получаем следующий вопрос
        bot_message, progress = interview_manager.process_answer(
            chat_request.full_name,
            chat_request.message,
            current_question,
            is_valid
        )

        return ChatResponse(bot_message=bot_message, progress=progress)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- ADMIN ROUTES ---

@app.post("/api/admin/login", response_model=AdminToken)
async def admin_login(admin_data: AdminLogin):
    if not authenticate_admin(admin_data.username, admin_data.password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": admin_data.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/admin/dashboard", response_model=List[CandidateStatus])
async def admin_dashboard(current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    return get_candidate_statuses(db)


@app.get("/api/admin/stats", response_model=AdminStats)
async def admin_stats(current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    stats = get_admin_stats(db)
    return AdminStats(**stats)


@app.get("/api/admin/analytics", response_model=List[AnalyticsData])
async def admin_analytics(current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    analytics = get_analytics_data(db)
    return [AnalyticsData(**item) for item in analytics]


@app.post("/api/admin/upload")
async def admin_upload_csv(
    file: UploadFile = File(...),
    current_admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be CSV")

    content = await file.read()
    csv_content = content.decode("utf-8")

    if update_candidates_from_csv(db, csv_content):
        return {"message": "CSV uploaded successfully"}
    raise HTTPException(status_code=400, detail="Failed to process CSV file")


@app.get("/api/admin/export")
async def admin_export(current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    csv_content = export_candidates_data(db)
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates_export.csv"}
    )


@app.get("/api/admin/report/{candidate_id}")
async def generate_pdf_report(candidate_id: int, current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    try:
        pdf_path, _ = generate_report_files(db, candidate_id)
        if not pdf_path:
            raise HTTPException(status_code=404, detail="Кандидат не найден")
        return FileResponse(pdf_path, media_type="application/pdf", filename=f"report_candidate_{candidate_id}.pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации отчёта: {str(e)}")


@app.get("/api/admin/report_excel/{candidate_id}")
async def generate_excel_report(candidate_id: int, current_admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    try:
        _, excel_path = generate_report_files(db, candidate_id)
        if not excel_path:
            raise HTTPException(status_code=404, detail="Кандидат не найден")
        return FileResponse(
            excel_path,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=f"report_candidate_{candidate_id}.xlsx"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка генерации отчёта: {str(e)}")


@app.get("/api/health")
async def health():
    try:
        from database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# --- НОВЫЙ ЭНДПОИНТ AI HELPER ---
class AIHelperIn(BaseModel):
    question: str
    answer: str
    context: Dict[str, Any] = {}
    step_counter: int = 0


class AIHelperOut(BaseModel):
    follow_up_question: str
    motivation_phrase: str


@app.post("/api/interview/ai-helper", response_model=AIHelperOut)
def ai_helper(payload: AIHelperIn = Body(...)):
    data = generate_follow_up(
        current_question=payload.question,
        user_answer=payload.answer,
        profile_context=payload.context,
        step_counter=payload.step_counter
    )
    return AIHelperOut(**data)


# --- ВНИМАНИЕ: этот блок всегда внизу ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
