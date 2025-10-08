from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.chains import LLMChain
from typing import Dict, Optional, Tuple
import re
from .agent_config import get_router_config, get_agent_list_for_router, get_agent_by_id

class RouterAgent:
    def __init__(self, llm):
        self.llm = llm
        self.config = get_router_config()
        self.system_prompt = self._build_system_prompt()
        
    def _build_system_prompt(self) -> str:
        base_prompt = self.config['systemPrompt']
        agents_list = get_agent_list_for_router()
        
        enhanced_prompt = f"""{base_prompt}

Available specialists with their IDs:
{agents_list}

IMPORTANT: You must end your response with 'ROUTE_TO: [specialist_id]' when you determine the appropriate specialist.
The specialist_id must be one of: personal_injury, business_law, immigration, family_law, real_estate, estate_planning, employment_law, criminal_defense, intellectual_property, contract_law

Be conversational, empathetic, and keep your response to 2-4 sentences before routing."""
        
        return enhanced_prompt
    
    def route(self, user_message: str, conversation_history: str = "") -> Tuple[str, Optional[str]]:
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
            
            route_match = re.search(r'ROUTE_TO:\s*(\w+)', response_text)
            
            if route_match:
                specialist_id = route_match.group(1).strip()
                clean_response = response_text.replace(route_match.group(0), '').strip()
                
                specialist = get_agent_by_id(specialist_id)
                if specialist:
                    return clean_response, specialist_id
                else:
                    return response_text, None
            else:
                return response_text, None
                
        except Exception as e:
            return f"I apologize, but I'm having trouble understanding your request. Could you please rephrase it? Error: {str(e)}", None
    
    def greet(self) -> str:
        return "Welcome to VRG & AI Law! I'm here to help you connect with the right legal specialist. Could you briefly describe your legal situation?"