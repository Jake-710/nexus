import time
from collections import deque
from typing import Dict, List

class BehavioralStateManager:
    def __init__(self, window_size: int = 50):
        self.window_size = window_size
        self.user_histories: Dict[str, deque] = {}

    def add_event(self, user_id: str, event_type: str, payload: dict) -> List[dict]:
        if user_id not in self.user_histories:
            self.user_histories[user_id] = deque(maxlen=self.window_size)
        
        event = {
            "timestamp": time.time(),
            "event_type": event_type,
            "payload": payload
        }
        self.user_histories[user_id].append(event)
        return list(self.user_histories[user_id])

    def get_history(self, user_id: str) -> List[dict]:
        return list(self.user_histories.get(user_id, []))