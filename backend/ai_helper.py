# ai_helper.py
import random

def generate_follow_up(current_question: str, user_answer: str, profile_context: dict, step_counter: int):
    """
    Имитация интеллектуального помощника.
    В реальном проекте здесь будет обращение к LLM (например, GPT),
    который формулирует уточняющие вопросы и мотивационные фразы.
    """
    # Если ответ слишком короткий, задаем уточнение
    if len(user_answer.strip()) < 10:
        follow_up = f"Можете чуть подробнее рассказать: {current_question.lower()}?"
    else:
        follow_up = "Спасибо! Можете описать следующий шаг этого процесса?"

    # Подбадривание
    motivation_phrases = [
        "Отлично, продолжайте в том же духе!",
        "Вы очень чётко формулируете, спасибо!",
        "Хорошо идём, расскажите чуть подробнее 👇",
        "Замечательно! Теперь уточним один момент..."
    ]

    return {
        "follow_up_question": follow_up,
        "motivation_phrase": random.choice(motivation_phrases)
    }
