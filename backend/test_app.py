#!/usr/bin/env python3
"""
Test script for VRG & AI Law LangChain Backend
This script tests the Flask API endpoints and agent functionality
"""

import requests
import json
import time
import sys
from typing import Dict, Any

class TestVRGLaw:
    def __init__(self, base_url: str = "http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def print_header(self, text: str):
        print("\n" + "="*60)
        print(f"  {text}")
        print("="*60)
        
    def print_test(self, name: str, success: bool, details: str = ""):
        status = "✓" if success else "✗"
        color = "\033[92m" if success else "\033[91m"
        reset = "\033[0m"
        print(f"{color}{status}{reset} {name}")
        if details:
            print(f"  → {details}")
        self.test_results.append((name, success))
        
    def test_health_check(self) -> bool:
        """Test the health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            if response.status_code == 200:
                data = response.json()
                self.print_test(
                    "Health Check", 
                    True, 
                    f"Service: {data.get('service')}, Version: {data.get('version')}"
                )
                return True
            else:
                self.print_test("Health Check", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.print_test("Health Check", False, str(e))
            return False
            
    def test_session_status(self) -> bool:
        """Test session status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/session/status")
            if response.status_code == 200:
                data = response.json()
                self.print_test(
                    "Session Status", 
                    True, 
                    f"Authenticated: {data.get('authenticated')}"
                )
                return True
            else:
                self.print_test("Session Status", False, f"Status code: {response.status_code}")
                return False
        except Exception as e:
            self.print_test("Session Status", False, str(e))
            return False
            
    def test_get_agents(self) -> bool:
        """Test getting list of agents"""
        try:
            response = self.session.get(f"{self.base_url}/api/agents")
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('agents'):
                    agent_count = len(data['agents'])
                    self.print_test(
                        "Get Agents", 
                        True, 
                        f"Found {agent_count} specialist agents"
                    )
                    return True
            self.print_test("Get Agents", False, "Failed to get agents")
            return False
        except Exception as e:
            self.print_test("Get Agents", False, str(e))
            return False
            
    def test_activate_api(self, api_key: str, provider: str = "openai") -> bool:
        """Test API activation"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/activate",
                json={"apiKey": api_key, "provider": provider}
            )
            data = response.json()
            
            if data.get('success'):
                self.print_test(
                    "API Activation", 
                    True, 
                    f"Provider: {data.get('provider')}"
                )
                return True
            else:
                self.print_test(
                    "API Activation", 
                    False, 
                    data.get('error', 'Unknown error')
                )
                return False
        except Exception as e:
            self.print_test("API Activation", False, str(e))
            return False
            
    def test_chat_with_router(self) -> bool:
        """Test chatting with the router agent"""
        try:
            test_message = "I was in a car accident yesterday and got injured. The other driver ran a red light."
            
            response = self.session.post(
                f"{self.base_url}/api/chat",
                json={"message": test_message, "agent_id": "router"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Check if router properly identified personal injury case
                    if data.get('route_to') == 'personal_injury' or 'personal_injury' in str(data.get('current_agent', '')):
                        self.print_test(
                            "Router Chat & Routing", 
                            True, 
                            f"Correctly routed to: {data.get('route_to', data.get('current_agent'))}"
                        )
                        return True
                    else:
                        self.print_test(
                            "Router Chat & Routing", 
                            False, 
                            f"Incorrect routing: {data.get('route_to', 'none')}"
                        )
                        return False
            
            self.print_test("Router Chat", False, f"Status code: {response.status_code}")
            return False
        except Exception as e:
            self.print_test("Router Chat", False, str(e))
            return False
            
    def test_chat_with_specialist(self) -> bool:
        """Test chatting with a specialist agent"""
        try:
            # First, ensure we're routed to personal injury
            self.session.post(
                f"{self.base_url}/api/chat",
                json={"message": "I need help with my car accident case", "agent_id": "router"}
            )
            
            # Now chat with the specialist
            response = self.session.post(
                f"{self.base_url}/api/chat",
                json={
                    "message": "Yes, I went to the ER and have whiplash. Should I get a lawyer?",
                    "agent_id": "personal_injury"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('response'):
                    self.print_test(
                        "Specialist Chat", 
                        True, 
                        f"Agent: {data.get('agent_name', 'Specialist')}"
                    )
                    return True
            
            self.print_test("Specialist Chat", False, "Failed to get response")
            return False
        except Exception as e:
            self.print_test("Specialist Chat", False, str(e))
            return False
            
    def test_conversation_memory(self) -> bool:
        """Test that conversation memory persists"""
        try:
            # Send first message
            self.session.post(
                f"{self.base_url}/api/chat",
                json={"message": "My name is John Smith", "agent_id": "personal_injury"}
            )
            
            # Send follow-up that requires memory
            response = self.session.post(
                f"{self.base_url}/api/chat",
                json={"message": "What was my name again?", "agent_id": "personal_injury"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Check if response mentions the name
                    response_text = data.get('response', '').lower()
                    if 'john' in response_text or 'smith' in response_text:
                        self.print_test(
                            "Conversation Memory", 
                            True, 
                            "Agent remembered previous context"
                        )
                        return True
                    else:
                        self.print_test(
                            "Conversation Memory", 
                            False, 
                            "Agent did not remember context"
                        )
                        return False
            
            self.print_test("Conversation Memory", False, "Failed to test memory")
            return False
        except Exception as e:
            self.print_test("Conversation Memory", False, str(e))
            return False
            
    def test_clear_conversation(self) -> bool:
        """Test clearing conversation"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/clear",
                json={"agent_id": "personal_injury"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.print_test(
                        "Clear Conversation", 
                        True, 
                        "Conversation cleared successfully"
                    )
                    return True
            
            self.print_test("Clear Conversation", False, "Failed to clear")
            return False
        except Exception as e:
            self.print_test("Clear Conversation", False, str(e))
            return False
            
    def run_all_tests(self, api_key: str = None, provider: str = "openai"):
        """Run all tests"""
        self.print_header("VRG & AI Law Backend Test Suite")
        
        # Basic connectivity tests
        self.print_header("1. Basic Connectivity")
        self.test_health_check()
        self.test_session_status()
        self.test_get_agents()
        
        # API activation and agent tests (requires API key)
        if api_key:
            self.print_header("2. API Activation")
            if self.test_activate_api(api_key, provider):
                
                self.print_header("3. Agent Communication")
                self.test_chat_with_router()
                time.sleep(1)  # Small delay between requests
                self.test_chat_with_specialist()
                
                self.print_header("4. Memory & Session Management")
                self.test_conversation_memory()
                self.test_clear_conversation()
        else:
            print("\n⚠️  Skipping API-dependent tests (no API key provided)")
            print("   To run full tests, provide an API key:")
            print("   python test_app.py <api_key> [provider]")
        
        # Print summary
        self.print_header("Test Summary")
        total = len(self.test_results)
        passed = sum(1 for _, success in self.test_results if success)
        failed = total - passed
        
        print(f"\nTotal Tests: {total}")
        print(f"✓ Passed: {passed}")
        if failed > 0:
            print(f"✗ Failed: {failed}")
            
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("\n🎉 All tests passed! Backend is working correctly.")
        elif success_rate >= 80:
            print("\n⚠️  Most tests passed, but some issues detected.")
        else:
            print("\n❌ Multiple test failures. Please check the backend.")
            
        return success_rate == 100

def main():
    # Check if backend is running
    tester = TestVRGLaw()
    
    print("Testing VRG & AI Law Backend...")
    print("Make sure the backend is running: python backend/app.py")
    
    # Get API key from command line if provided
    api_key = sys.argv[1] if len(sys.argv) > 1 else None
    provider = sys.argv[2] if len(sys.argv) > 2 else "openai"
    
    # Check if backend is accessible
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=2)
        if response.status_code != 200:
            print("\n❌ Backend is not responding. Please start it first:")
            print("   cd backend && python app.py")
            sys.exit(1)
    except requests.exceptions.RequestException:
        print("\n❌ Cannot connect to backend at http://localhost:5000")
        print("   Please start the backend first:")
        print("   cd backend && python app.py")
        sys.exit(1)
    
    # Run tests
    success = tester.run_all_tests(api_key, provider)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()