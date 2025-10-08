from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from flask_session import Session
import os
import secrets
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
import base64
import json

from config import Config
from utils.llm_factory import LLMFactory
from memory.conversation_memory import conversation_manager
from agents.router_agent import RouterAgent
from agents.specialists import agent_manager
from agents.agent_config import get_all_agents, get_agent_by_id

app = Flask(__name__, static_folder='../frontend', static_url_path='')
app.config.from_object(Config)

Session(app)
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

SECRET_ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')
if not SECRET_ENCRYPTION_KEY:
    SECRET_ENCRYPTION_KEY = base64.urlsafe_b64encode(os.urandom(32))
    print(f"Generated new encryption key: {SECRET_ENCRYPTION_KEY.decode()}")
    print("Add this to your environment: export ENCRYPTION_KEY='{SECRET_ENCRYPTION_KEY.decode()}'")
else:
    SECRET_ENCRYPTION_KEY = SECRET_ENCRYPTION_KEY.encode()

cipher_suite = Fernet(SECRET_ENCRYPTION_KEY)
def encrypt_api_key(api_key: str) -> str:
    return cipher_suite.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    return cipher_suite.decrypt(encrypted_key.encode()).decode()

def get_or_create_session_id():
    if 'session_id' not in session:
        session['session_id'] = secrets.token_urlsafe(32)
        session.permanent = True
    return session['session_id']

@app.route('/')
def serve_frontend():
    return send_from_directory('../', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join('../', path)):
        return send_from_directory('../', path)
    return send_from_directory('../', 'index.html')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'VRG & AI Law Backend',
        'version': '1.0.0'
    })

@app.route('/api/activate', methods=['POST'])
def activate():
    try:
        data = request.json
        api_key = data.get('apiKey')
        provider = data.get('provider', 'openai')
        remember = data.get('remember', False)
        
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400
        
        try:
            llm = LLMFactory.create_llm(provider, api_key)
            test_response = llm.invoke([{"role": "user", "content": "test"}])
            
            encrypted_key = encrypt_api_key(api_key)
            session['api_key'] = encrypted_key
            session['provider'] = provider
            session['authenticated'] = True
            session['remember'] = remember
            
            # Set session permanence based on remember option
            if remember:
                session.permanent = True
                # Session will persist for 7 days (configured in Config)
                expiry = (datetime.now() + timedelta(days=7)).isoformat()
                session['expiry'] = expiry
            else:
                session.permanent = False
                # Session expires when browser closes
                session['expiry'] = None
            
            return jsonify({
                'success': True,
                'message': 'API key validated successfully',
                'provider': provider,
                'remember': remember,
                'expiry': session.get('expiry')
            })
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid API key or provider: {str(e)}'
            }), 401
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/agents', methods=['GET'])
def get_agents():
    try:
        agents = get_all_agents()
        return jsonify({
            'success': True,
            'agents': agents
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/route', methods=['POST'])
def route_message():
    try:
        if not session.get('authenticated'):
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        message = data.get('message')
        
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        
        session_id = get_or_create_session_id()
        
        encrypted_key = session.get('api_key')
        provider = session.get('provider', 'openai')
        api_key = decrypt_api_key(encrypted_key)
        
        llm = LLMFactory.create_llm(provider, api_key)
        router = RouterAgent(llm)
        
        conversation_history = conversation_manager.format_history_for_context(session_id, max_messages=6)
        
        response, specialist_id = router.route(message, conversation_history)
        
        conversation_manager.add_message(session_id, message, is_human=True)
        conversation_manager.add_message(session_id, response, is_human=False)
        
        if specialist_id:
            conversation_manager.set_current_agent(session_id, specialist_id)
            specialist = get_agent_by_id(specialist_id)
            
            return jsonify({
                'success': True,
                'response': response,
                'route_to': specialist_id,
                'specialist': specialist,
                'requires_handoff': True
            })
        else:
            return jsonify({
                'success': True,
                'response': response,
                'requires_handoff': False
            })
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if not session.get('authenticated'):
            return jsonify({'success': False, 'error': 'Not authenticated'}), 401
        
        data = request.json
        message = data.get('message')
        agent_id = data.get('agent_id')
        
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'}), 400
        
        session_id = get_or_create_session_id()
        
        encrypted_key = session.get('api_key')
        provider = session.get('provider', 'openai')
        api_key = decrypt_api_key(encrypted_key)
        
        llm = LLMFactory.create_llm(provider, api_key)
        
        if not agent_id or agent_id == 'router':
            router = RouterAgent(llm)
            conversation_history = conversation_manager.format_history_for_context(session_id, max_messages=6)
            response, specialist_id = router.route(message, conversation_history)
            
            conversation_manager.add_message(session_id, message, is_human=True)
            conversation_manager.add_message(session_id, response, is_human=False)
            
            if specialist_id:
                conversation_manager.set_current_agent(session_id, specialist_id)
                specialist = get_agent_by_id(specialist_id)
                
                agent_manager.set_llm(llm)
                specialist_agent = agent_manager.get_or_create_agent(specialist_id)
                intro = specialist_agent.introduce()
                
                conversation_manager.add_message(session_id, intro, is_human=False)
                
                return jsonify({
                    'success': True,
                    'response': response + "\n\n" + intro,
                    'route_to': specialist_id,
                    'specialist': specialist,
                    'current_agent': specialist_id
                })
            else:
                return jsonify({
                    'success': True,
                    'response': response,
                    'current_agent': 'router'
                })
        else:
            agent_manager.set_llm(llm)
            specialist_agent = agent_manager.get_or_create_agent(agent_id)
            
            conversation_history = conversation_manager.format_history_for_context(session_id, max_messages=8)
            
            response = specialist_agent.respond(message, conversation_history)
            
            conversation_manager.add_message(session_id, message, is_human=True)
            conversation_manager.add_message(session_id, response, is_human=False)
            conversation_manager.set_current_agent(session_id, agent_id)
            
            return jsonify({
                'success': True,
                'response': response,
                'current_agent': agent_id,
                'agent_name': specialist_agent.name
            })
            
    except Exception as e:
        import traceback
        print(f"Chat error: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear', methods=['POST'])
def clear_conversation():
    try:
        session_id = get_or_create_session_id()
        conversation_manager.clear_session(session_id)
        
        current_agent = request.json.get('agent_id')
        if current_agent and current_agent != 'router':
            agent_manager.clear_agent(current_agent)
        
        return jsonify({
            'success': True,
            'message': 'Conversation cleared successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session/status', methods=['GET'])
def session_status():
    return jsonify({
        'authenticated': session.get('authenticated', False),
        'provider': session.get('provider'),
        'session_id': session.get('session_id'),
        'remember': session.get('remember', False),
        'expiry': session.get('expiry')
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    try:
        # Clear all session data
        session.clear()
        
        return jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=port)
