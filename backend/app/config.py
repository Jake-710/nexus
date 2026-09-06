from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALERT_THRESHOLD: float = 0.65
    ML_WEIGHT: float = 0.7
    RULE_WEIGHT: float = 0.3
    # Severity tier boundaries (runtime-adjustable via the admin API)
    SEVERITY_LOW: float = 0.40
    SEVERITY_MEDIUM: float = 0.60
    SEVERITY_HIGH: float = 0.80
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
