from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from typing import Dict, Optional
from .agent_config import get_agent_by_id, get_all_agents

class SpecialistAgent:
    def __init__(self, agent_id: str, llm, memory: Optional[ConversationBufferMemory] = None):
        self.agent_id = agent_id
        self.llm = llm
        self.config = get_agent_by_id(agent_id)
        
        if not self.config:
            raise ValueError(f"Agent with id {agent_id} not found")
        
        self.memory = memory or ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="response"
        )
        
        self.system_prompt = self.config['systemPrompt']
        self.name = self.config['name']
        self.specialty = self.config['specialty']
    
    def respond(self, user_message: str, conversation_history: str = "") -> str:
        try:
            messages = [
                SystemMessage(content=self.system_prompt)
            ]
            
            if conversation_history:
                messages.append(SystemMessage(content=f"Previous conversation:\n{conversation_history}"))
            
            messages.append(HumanMessage(content=user_message))
            
            response = self.llm.invoke(messages)
            
            if hasattr(response, 'content'):
                response_text = response.content
            else:
                response_text = str(response)
            
            return response_text
            
        except Exception as e:
            return f"I apologize for the technical difficulty. Let me try to help you another way. What specific aspect of {self.specialty.lower()} can I assist you with?"
    
    def introduce(self) -> str:
        intros = {
            'personal_injury': "Hello, I'm Sarah Mitchell. I understand you've been injured. First, are you okay? Tell me what happened.",
            'business_law': "Hi, I'm Robert Chen. Let's talk about your business needs. What's the main issue you're facing?",
            'immigration': "Hello, I'm Maria Rodriguez. I know immigration matters can be stressful. What's your current situation?",
            'family_law': "Hi, I'm Jennifer Adams. I understand family matters are difficult. What brings you here today?",
            'real_estate': "Hello, I'm David Thompson. What property matter can I help you with today?",
            'estate_planning': "Hi, I'm William Harrison. Estate planning is about protecting your family. What prompted you to think about this?",
            'employment_law': "Hello, I'm Patricia Lee. I'm here to help with your workplace issue. What happened?",
            'criminal_defense': "I'm Michael Foster. First, don't discuss this case with anyone else but me. What are you charged with?",
            'intellectual_property': "Hi, I'm Dr. Alan Kumar. Tell me about what you've created or what IP issue you're facing.",
            'contract_law': "Hello, I'm Rachel Barnes. What contract issue are you dealing with?"
        }
        
        return intros.get(self.agent_id, f"Hello, I'm {self.name}. How can I help you with {self.specialty}?")

class AgentManager:
    def __init__(self):
        self.agents: Dict[str, SpecialistAgent] = {}
        self.llm = None
    
    def set_llm(self, llm):
        self.llm = llm
    
    def get_or_create_agent(self, agent_id: str, memory: Optional[ConversationBufferMemory] = None) -> SpecialistAgent:
        if not self.llm:
            raise ValueError("LLM not set. Call set_llm() first.")
        
        if agent_id not in self.agents:
            self.agents[agent_id] = SpecialistAgent(agent_id, self.llm, memory)
        
        return self.agents[agent_id]
    
    def get_available_agents(self) -> list:
        return get_all_agents()
    
    def clear_agent(self, agent_id: str):
        if agent_id in self.agents:
            del self.agents[agent_id]

agent_manager = AgentManager()