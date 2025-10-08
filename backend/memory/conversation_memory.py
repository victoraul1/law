from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from typing import Dict, List, Optional
import json

class ConversationManager:
    def __init__(self):
        self.sessions: Dict[str, Dict] = {}
    
    def get_or_create_memory(self, session_id: str, llm=None) -> ConversationBufferMemory:
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'memory': ConversationBufferMemory(
                    memory_key="chat_history",
                    return_messages=True,
                    output_key="response"
                ),
                'current_agent': 'router',
                'metadata': {}
            }
        return self.sessions[session_id]['memory']
    
    def get_current_agent(self, session_id: str) -> str:
        if session_id in self.sessions:
            return self.sessions[session_id].get('current_agent', 'router')
        return 'router'
    
    def set_current_agent(self, session_id: str, agent_id: str):
        if session_id in self.sessions:
            self.sessions[session_id]['current_agent'] = agent_id
    
    def add_message(self, session_id: str, message: str, is_human: bool = True):
        memory = self.get_or_create_memory(session_id)
        if is_human:
            memory.chat_memory.add_user_message(message)
        else:
            memory.chat_memory.add_ai_message(message)
    
    def get_conversation_history(self, session_id: str) -> List[BaseMessage]:
        if session_id in self.sessions:
            memory = self.sessions[session_id]['memory']
            return memory.chat_memory.messages
        return []
    
    def clear_session(self, session_id: str):
        if session_id in self.sessions:
            del self.sessions[session_id]
    
    def get_session_metadata(self, session_id: str) -> Dict:
        if session_id in self.sessions:
            return self.sessions[session_id].get('metadata', {})
        return {}
    
    def set_session_metadata(self, session_id: str, key: str, value):
        if session_id in self.sessions:
            if 'metadata' not in self.sessions[session_id]:
                self.sessions[session_id]['metadata'] = {}
            self.sessions[session_id]['metadata'][key] = value
    
    def format_history_for_context(self, session_id: str, max_messages: int = 10) -> str:
        messages = self.get_conversation_history(session_id)
        recent_messages = messages[-max_messages:] if len(messages) > max_messages else messages
        
        formatted = []
        for msg in recent_messages:
            if isinstance(msg, HumanMessage):
                formatted.append(f"Client: {msg.content}")
            elif isinstance(msg, AIMessage):
                formatted.append(f"Attorney: {msg.content}")
        
        return "\n".join(formatted)

conversation_manager = ConversationManager()