from typing import List, Dict, Tuple
import re

# Список подбадриваний
ENCOURAGEMENTS = [
    "Вы отлично справляетесь!",
    "Полпути пройдено, держитесь!",
    "Спасибо, это помогает!"
]

# Список вопросов для каждого процесса
INTERVIEW_QUESTIONS = [
    "Как начинается процесс?",
    "Сколько времени занимает одна итерация (в минутах)?",
    "Как часто процесс повторяется (раз в день/неделю/месяц)?",
    "Сколько раз процесс повторяется за одну сессию?",
    "Как понимаете, что процесс завершён?",
    "Какие программы или инструменты вы используете?"
]

class InterviewManager:
    def __init__(self):
        self.interview_states = {}  # Хранит состояние интервью для каждого пользователя
    
    def validate_answer(self, answer: str, question: str) -> bool:
        """Проверяет валидность ответа пользователя"""
        answer_lower = answer.lower()
        
        # Проверяем на неопределенные слова
        vague_words = ["иногда", "по-разному", "обычно", "когда как"]
        if any(word in answer_lower for word in vague_words):
            return False
        
        # Проверяем наличие цифр для вопросов про время или частоту
        time_questions = ["время", "минут", "часто", "раз", "сессию"]
        if any(word in question.lower() for word in time_questions):
            # Ищем цифры в ответе
            if not re.search(r'\d+', answer):
                return False
        
        return True
    
    def get_clarification_question(self, question: str) -> str:
        """Возвращает уточняющий вопрос"""
        if any(word in question.lower() for word in ["время", "минут", "часто", "раз", "сессию"]):
            return "Пожалуйста, уточните точнее (в минутах или количестве)."
        return "Пожалуйста, уточните ваш ответ более конкретно."
    
    def get_next_question(self, full_name: str, processes: List[str]) -> Tuple[str, int, int]:
        """Возвращает следующий вопрос для пользователя"""
        if full_name not in self.interview_states:
            self.interview_states[full_name] = {
                'current_process_index': 0,
                'current_question_index': 0,
                'valid_answers_count': 0,
                'processes': processes
            }
        
        state = self.interview_states[full_name]
        process_index = state['current_process_index']
        question_index = state['current_question_index']
        
        # Если все процессы завершены
        if process_index >= len(processes):
            return "Интервью завершено", 100, 0
        
        current_process = processes[process_index]
        current_question = INTERVIEW_QUESTIONS[question_index]
        
        # Формируем вопрос с указанием текущего процесса
        formatted_question = f"Процесс: {current_process}\n\n{current_question}"
        
        return formatted_question, process_index, question_index
    
    def process_answer(self, full_name: str, answer: str, question: str, is_valid: bool) -> Tuple[str, int]:
        """Обрабатывает ответ пользователя и возвращает следующий шаг"""
        if full_name not in self.interview_states:
            return "Ошибка: состояние интервью не найдено", 0
        
        state = self.interview_states[full_name]
        
        if not is_valid:
            # Возвращаем уточняющий вопрос
            clarification = self.get_clarification_question(question)
            return clarification, self.calculate_progress(state)
        
        # Увеличиваем счетчик валидных ответов
        state['valid_answers_count'] += 1
        
        # Переходим к следующему вопросу
        state['current_question_index'] += 1
        
        # Если вопросы по текущему процессу закончились
        if state['current_question_index'] >= len(INTERVIEW_QUESTIONS):
            state['current_question_index'] = 0
            state['current_process_index'] += 1
        
        # Если все процессы завершены
        if state['current_process_index'] >= len(state['processes']):
            return "Ваше интервью завершено! Спасибо за участие!", 100
        
        # Получаем следующий вопрос
        next_question, _, _ = self.get_next_question(full_name, state['processes'])
        
        # Добавляем подбадривание каждые 3 валидных ответа
        if state['valid_answers_count'] % 3 == 0 and state['valid_answers_count'] > 0:
            encouragement = ENCOURAGEMENTS[(state['valid_answers_count'] // 3 - 1) % len(ENCOURAGEMENTS)]
            next_question = f"{encouragement}\n\n{next_question}"
        
        progress = self.calculate_progress(state)
        return next_question, progress
    
    def calculate_progress(self, state: Dict) -> int:
        """Вычисляет процент завершения интервью"""
        total_questions = len(state['processes']) * len(INTERVIEW_QUESTIONS)
        completed_questions = state['current_process_index'] * len(INTERVIEW_QUESTIONS) + state['current_question_index']
        return min(int((completed_questions / total_questions) * 100), 100)
    
    def get_current_process(self, full_name: str) -> str:
        """Возвращает текущий процесс"""
        if full_name not in self.interview_states:
            return ""
        
        state = self.interview_states[full_name]
        if state['current_process_index'] >= len(state['processes']):
            return ""
        
        return state['processes'][state['current_process_index']]

# Глобальный экземпляр менеджера интервью
interview_manager = InterviewManager()
