from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage
import os
import requests
from typing import Optional, Dict, Any

class LLMFactory:
    @staticmethod
    def create_llm(provider: str, api_key: str, model: Optional[str] = None):
        provider = provider.lower()
        
        if provider in ['openai', 'gpt-4', 'gpt-3.5', 'gpt-4o', 'gpt-4o-mini']:
            model_map = {
                'gpt-4': 'gpt-4-turbo-preview',
                'gpt-4o': 'gpt-4o',
                'gpt-4o-mini': 'gpt-4o-mini',
                'gpt-3.5': 'gpt-3.5-turbo',
                'openai': model or 'gpt-4-turbo-preview'
            }
            model_name = model_map.get(provider, model or 'gpt-4-turbo-preview')
            
            return ChatOpenAI(
                api_key=api_key,
                model=model_name,
                temperature=0.7,
                max_tokens=2000,
                model_kwargs={"response_format": {"type": "text"}}
            )
            
        elif provider in ['anthropic', 'claude', 'claude-sonnet', 'claude-opus']:
            model_map = {
                'claude-sonnet': 'claude-3-5-sonnet-20241022',
                'claude-opus': 'claude-3-opus-20240229',
                'claude': 'claude-3-5-sonnet-20241022',
                'anthropic': model or 'claude-3-5-sonnet-20241022'
            }
            model_name = model_map.get(provider, model or 'claude-3-5-sonnet-20241022')
            
            return ChatAnthropic(
                api_key=api_key,
                model=model_name,
                temperature=0.7,
                max_tokens=2000
            )
            
        elif provider in ['grok', 'xai']:
            return GrokLLM(api_key=api_key, model=model or 'grok-beta')
            
        else:
            raise ValueError(f"Unsupported provider: {provider}")

class GrokLLM:
    def __init__(self, api_key: str, model: str = 'grok-beta'):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.x.ai/v1"
        
    def invoke(self, messages):
        formatted_messages = []
        for msg in messages:
            if isinstance(msg, SystemMessage):
                formatted_messages.append({"role": "system", "content": msg.content})
            elif isinstance(msg, HumanMessage):
                formatted_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, dict):
                formatted_messages.append(msg)
            else:
                formatted_messages.append({"role": "assistant", "content": str(msg.content)})
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        payload = {
            "messages": formatted_messages,
            "model": self.model,
            "stream": False,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            class GrokResponse:
                def __init__(self, content):
                    self.content = content
                    
            return GrokResponse(content)
            
        except Exception as e:
            raise Exception(f"Grok API error: {str(e)}")
    
    def __call__(self, messages):
        return self.invoke(messages)