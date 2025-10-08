import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = '/tmp/flask_session'
    SESSION_PERMANENT = False
    SESSION_USE_SIGNER = True
    SESSION_KEY_PREFIX = 'vrg_law_'
    
    PERMANENT_SESSION_LIFETIME = 86400
    
    MAX_TOKENS = 2000
    TEMPERATURE = 0.7
    
    CORS_ORIGINS = ['http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000', 'https://law.vrgmarketsolutions.com']
    
    ENV = os.environ.get('FLASK_ENV', 'development')
    DEBUG = ENV == 'development'
    
    @staticmethod
    def get_llm_config(provider='openai'):
        configs = {
            'openai': {
                'model_name': 'gpt-4-turbo-preview',
                'temperature': 0.7,
                'max_tokens': 2000
            },
            'anthropic': {
                'model_name': 'claude-3-sonnet-20240229',
                'temperature': 0.7,
                'max_tokens': 2000
            },
            'gpt-3.5': {
                'model_name': 'gpt-3.5-turbo',
                'temperature': 0.7,
                'max_tokens': 2000
            }
        }
        return configs.get(provider, configs['openai'])
