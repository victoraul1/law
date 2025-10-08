/**
 * Main Application Logic for VRG & AI Law - Backend Version
 * This version communicates with the Python Flask backend
 */

// Backend API configuration
const API_BASE_URL = window.location.origin;

// Initialize global variables
let currentConversation = [];
let currentAgent = 'router';
let isAuthenticated = false;

// API Service for backend communication
const BackendAPI = {
    async checkSession() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/session/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            return data.authenticated;
        } catch (error) {
            console.error('Session check error:', error);
            return false;
        }
    },

    async activate(apiKey, provider, remember = false) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ apiKey, provider, remember })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Activation error:', error);
            return { success: false, error: error.message };
        }
    },

    async sendMessage(message, agentId = null) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    message, 
                    agent_id: agentId || currentAgent 
                })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Chat error:', error);
            return { success: false, error: error.message };
        }
    },

    async getAgents() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/agents`, {
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Get agents error:', error);
            return { success: false, error: error.message };
        }
    },

    async clearConversation() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/clear`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ agent_id: currentAgent })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Clear conversation error:', error);
            return { success: false, error: error.message };
        }
    },

    async logout() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Toast notification system
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// Dark mode management
function initDarkMode() {
    const darkModeToggles = document.querySelectorAll('.dark-mode-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateDarkModeIcons(true);
    }
    
    darkModeToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateDarkModeIcons(!isDark);
        });
    });
}

function updateDarkModeIcons(isDark) {
    document.querySelectorAll('.sun-icon').forEach(icon => {
        icon.classList.toggle('hidden', isDark);
    });
    document.querySelectorAll('.moon-icon').forEach(icon => {
        icon.classList.toggle('hidden', !isDark);
    });
}

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.page').forEach(screen => {
        screen.classList.add('hidden');
screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
	targetScreen.classList.add('active');
}

    if (screenId === 'chat-page') {
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.focus();
        }
    }
}

// Provider selection
function selectProvider(provider) {
    document.querySelectorAll('.provider-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
    
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyInput = document.getElementById('api-key');
    const apiKeyLabel = document.querySelector('label[for="api-key-input"]');
    
    apiKeySection.classList.remove('hidden');
    
    let placeholder = '';
    let labelText = '';
    
    switch(provider) {
        case 'openai':
        case 'gpt-4':
        case 'gpt-4o':
        case 'gpt-4o-mini':
        case 'gpt-3.5':
            placeholder = 'sk-...';
            labelText = 'OpenAI API Key';
            break;
        case 'anthropic':
        case 'claude-sonnet':
        case 'claude-opus':
            placeholder = 'sk-ant-...';
            labelText = 'Anthropic API Key';
            break;
        case 'grok':
            placeholder = 'xai-...';
            labelText = 'Grok API Key';
            break;
    }
    
    apiKeyInput.placeholder = placeholder;
    apiKeyLabel.textContent = labelText;
    apiKeyInput.dataset.provider = provider;
}

// API activation
async function activateAPI() {
    const apiKeyInput = document.getElementById('api-key');
    const apiKey = apiKeyInput.value.trim();
    const provider = document.getElementById('api-provider').value;
    const rememberCheckbox = document.getElementById('remember-checkbox');
    const remember = rememberCheckbox ? rememberCheckbox.checked : false;
    
    if (!apiKey) {
        showToast('Please enter your API key');
        return;
    }
    
    if (!provider) {
        showToast('Please select a provider');
        return;
    }
    
    const activateBtn = document.getElementById('activate-btn');
    activateBtn.disabled = true;
    activateBtn.textContent = 'Validating...';
    
    try {
        const result = await BackendAPI.activate(apiKey, provider, remember);
        
        if (result.success) {
            isAuthenticated = true;
            showToast('Connected successfully!');
            localStorage.setItem('lastProvider', provider);
            
            // Store session info for display
            if (result.expiry) {
                sessionStorage.setItem('sessionExpiry', result.expiry);
            }
            sessionStorage.setItem('sessionRemember', remember);
            
            await initializeChatScreen();
            showScreen('chat-page');
        } else {
            showToast(result.error || 'Failed to validate API key');
            activateBtn.disabled = false;
            activateBtn.textContent = 'Activate';
        }
    } catch (error) {
        showToast('Connection error. Please try again.');
        activateBtn.disabled = false;
        activateBtn.textContent = 'Activate';
    }
}

// Initialize chat screen
async function initializeChatScreen() {
    const chatMessages = document.getElementById('messages-container');
    chatMessages.innerHTML = '';
    currentConversation = [];
    currentAgent = 'router';
    
    // Add welcome message
    addMessage('assistant', 
        "Welcome to VRG & AI Law! I'm here to help you connect with the right legal specialist. Could you briefly describe your legal situation?",
        'Legal Assistant'
    );
    
    // Update session status display
    updateSessionStatus();
    
    // Load available agents
    const result = await BackendAPI.getAgents();
    if (result.success && result.agents) {
        updateAgentList(result.agents);
    }
}

// Update session status indicator
function updateSessionStatus() {
    const sessionText = document.getElementById('session-text');
    if (!sessionText) return;
    
    const remember = sessionStorage.getItem('sessionRemember') === 'true';
    const expiry = sessionStorage.getItem('sessionExpiry');
    
    if (remember && expiry) {
        const expiryDate = new Date(expiry);
        const formattedDate = expiryDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
        sessionText.textContent = `Logged in until ${formattedDate}`;
    } else {
        sessionText.textContent = 'Session expires on browser close';
    }
}

// Update agent list in UI
function updateAgentList(agents) {
    const agentList = document.getElementById('agent-list');
    if (!agentList) return;
    
    agentList.innerHTML = '';
    
    // Add router option
    const routerOption = document.createElement('div');
    routerOption.className = 'agent-option active';
    routerOption.dataset.agentId = 'router';
    routerOption.onclick = () => switchAgent('router');
    routerOption.innerHTML = `
        <div class="agent-name">Legal Assistant</div>
        <div class="agent-specialty">Initial Consultation</div>
    `;
    agentList.appendChild(routerOption);
    
    // Add specialist options
    agents.forEach(agent => {
        const agentOption = document.createElement('div');
        agentOption.className = 'agent-option';
        agentOption.dataset.agentId = agent.id;
        agentOption.onclick = () => switchAgent(agent.id);
        agentOption.innerHTML = `
            <div class="agent-name">${agent.name}</div>
            <div class="agent-specialty">${agent.specialty}</div>
        `;
        agentList.appendChild(agentOption);
    });
}

// Switch to a different agent
async function switchAgent(agentId) {
    currentAgent = agentId;
    
    // Update UI
    document.querySelectorAll('.agent-option').forEach(option => {
        option.classList.toggle('active', option.dataset.agentId === agentId);
    });
    
    // Update current agent display
    const currentAgentDisplay = document.getElementById('current-agent');
    if (currentAgentDisplay) {
        const agentName = agentId === 'router' ? 'Legal Assistant' : 
            document.querySelector(`.agent-option[data-agent-id="${agentId}"] .agent-name`)?.textContent || agentId;
        currentAgentDisplay.textContent = agentName;
    }
    
    showToast(`Switched to ${agentId === 'router' ? 'Legal Assistant' : 'specialist'}`);
}

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Disable input while processing
    messageInput.disabled = true;
    const sendButton = document.getElementById('send-button');
    if (sendButton) sendButton.disabled = true;
    
    // Add user message to UI
    addMessage('user', message);
    messageInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const result = await BackendAPI.sendMessage(message, currentAgent);
        
        hideTypingIndicator();
        
        if (result.success) {
            // Handle routing if needed
            if (result.route_to && result.specialist) {
                currentAgent = result.route_to;
                updateAgentList(await getAgentsFromBackend());
                document.querySelectorAll('.agent-option').forEach(option => {
                    option.classList.toggle('active', option.dataset.agentId === currentAgent);
                });
                
                const currentAgentDisplay = document.getElementById('current-agent');
                if (currentAgentDisplay) {
                    currentAgentDisplay.textContent = result.specialist.name;
                }
            }
            
            // Add assistant response
            const agentName = result.agent_name || result.specialist?.name || 'Legal Assistant';
            addMessage('assistant', result.response, agentName);
            
            // Update current agent if changed
            if (result.current_agent) {
                currentAgent = result.current_agent;
            }
        } else {
            addMessage('error', result.error || 'Failed to get response');
        }
    } catch (error) {
        hideTypingIndicator();
        addMessage('error', 'Connection error. Please try again.');
    }
    
    // Re-enable input
    messageInput.disabled = false;
    if (sendButton) sendButton.disabled = false;
    messageInput.focus();
}

// Helper function to get agents from backend
async function getAgentsFromBackend() {
    const result = await BackendAPI.getAgents();
    return result.success ? result.agents : [];
}

// Add message to chat
function addMessage(type, content, agentName = null) {
    const chatMessages = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (type === 'user') {
        messageDiv.innerHTML = `
            <div class="message-content">
                ${escapeHtml(content)}
                <div class="message-time">${timestamp}</div>
            </div>
        `;
    } else if (type === 'assistant') {
        const displayName = agentName || 'Legal Assistant';
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="agent-name">${displayName}</span>
            </div>
            <div class="message-content">
                ${formatMessage(content)}
                <div class="message-time">${timestamp}</div>
            </div>
        `;
    } else if (type === 'error') {
        messageDiv.innerHTML = `
            <div class="message-content error">
                ⚠️ ${escapeHtml(content)}
                <div class="message-time">${timestamp}</div>
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add to conversation history
    currentConversation.push({
        type,
        content,
        agentName,
        timestamp: new Date().toISOString()
    });
}

// Format message content
function formatMessage(content) {
    // Escape HTML first
    let formatted = escapeHtml(content);
    
    // Convert line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already
    if (!formatted.startsWith('<p>')) {
        formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('messages-container');
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Clear conversation
async function clearConversation() {
    if (confirm('Are you sure you want to start a new consultation?')) {
        await BackendAPI.clearConversation();
        await initializeChatScreen();
        showToast('Starting new consultation');
    }
}

// Export conversation
function exportConversation() {
    if (currentConversation.length === 0) {
        showToast('No conversation to export');
        return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `legal-consultation-${timestamp}.json`;
    
    const exportData = {
        timestamp: new Date().toISOString(),
        agent: currentAgent,
        conversation: currentConversation
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Conversation exported');
}

// Logout function
async function logout() {
    const result = await BackendAPI.logout();
    
    if (result.success) {
        isAuthenticated = false;
        currentConversation = [];
        currentAgent = 'router';
        
        // Clear session storage
        sessionStorage.removeItem('sessionExpiry');
        sessionStorage.removeItem('sessionRemember');
        
        // Show toast and return to landing page
        showToast('Logged out successfully');
        showScreen('landing-page');
        
        // Clear the API key input
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput) {
            apiKeyInput.value = '';
        }
        
        // Uncheck remember checkbox
        const rememberCheckbox = document.getElementById('remember-checkbox');
        if (rememberCheckbox) {
            rememberCheckbox.checked = false;
        }
    } else {
        showToast('Failed to logout. Please try again.');
    }
}

// Initialize the application
async function initApp() {
    // Initialize dark mode
    initDarkMode();
    
    // Check if already authenticated
    isAuthenticated = await BackendAPI.checkSession();
    
    if (isAuthenticated) {
        await initializeChatScreen();
        showScreen('chat-page');
    } else {
        showScreen('landing-page');
    }
    
    // Set up event listeners
    const apiKeyInput = document.getElementById('api-key');
    if (apiKeyInput) {
        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                activateAPI();
            }
        });
    }
    
    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
// Enable/disable send button based on input content
    const sendButton = document.getElementById('send-button');
    messageInput.addEventListener('input', () => {
        if (sendButton) {
            sendButton.disabled = messageInput.value.trim().length === 0;
        }
    });

    }
    
    // Set up send button
    const sendButton = document.getElementById('send-button');
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }

const newConsultationBtn = document.getElementById('new-consultation');
    if (newConsultationBtn) {
        newConsultationBtn.addEventListener('click', clearConversation);
    }
    
    // Set up Export button
    const exportBtn = document.getElementById('export-chat');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportConversation);
    }
    
    // Set up Clear All button
    const clearBtn = document.getElementById('clear-data');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearConversation);
    }
    
    // Set up Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('agent-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    if (mobileMenuToggle && sidebar && sidebarOverlay) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }    

// Toggle API key visibility
    const apiKeyToggle = document.querySelector('.toggle-visibility');
    
    if (apiKeyToggle && apiKeyInput) {
        apiKeyToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any form submission
            
            // Toggle input type
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            
            // Toggle eye icons
            const eyeOpen = apiKeyToggle.querySelector('.eye-open');
            const eyeClosed = apiKeyToggle.querySelector('.eye-closed');
            
            if (eyeOpen && eyeClosed) {
                eyeOpen.classList.toggle('hidden');
                eyeClosed.classList.toggle('hidden');
            }
        });
    }


// Set up activate button  ← ADD THESE LINES
    const activateBtn = document.getElementById('activate-btn');
    if (activateBtn) {
        activateBtn.addEventListener('click', activateAPI);
    }

    // Check for saved provider preference
    const lastProvider = localStorage.getItem('lastProvider');
    if (lastProvider) {
        const providerBtn = document.querySelector(`.provider-btn[onclick*="${lastProvider}"]`);
        if (providerBtn) {
            providerBtn.click();
        }
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
