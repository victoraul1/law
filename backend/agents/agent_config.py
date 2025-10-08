import json
import os

def load_agent_config():
    config_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'agents.json')
    with open(config_path, 'r') as f:
        return json.load(f)

AGENT_CONFIG = load_agent_config()

def get_router_config():
    return AGENT_CONFIG['router']

def get_agent_by_id(agent_id: str):
    for agent in AGENT_CONFIG['agents']:
        if agent['id'] == agent_id:
            return agent
    return None

def get_all_agents():
    return AGENT_CONFIG['agents']

def get_agent_list_for_router():
    agents_info = []
    for agent in AGENT_CONFIG['agents']:
        agents_info.append(f"- {agent['id']}: {agent['name']} - {agent['specialty']}")
    return "\n".join(agents_info)