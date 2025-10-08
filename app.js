/**
 * Main Application Logic for VRG & AI Law
 */

// Initialize global variables
let apiHandler = null;
let agentRouter = null;
let currentConversation = [];
let totalTokensUsed = 0;

// Encryption utilities
const ENCRYPTION_KEY = 'LegalAI-2024-Secure';

function encrypt(text) {
    // Simple XOR encryption for localStorage (not cryptographically secure, but better than plaintext)
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
        encrypted += String.fromCharCode(text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
    }
    return btoa(encrypted);
}

function decrypt(encryptedText) {
    try {
        const decoded = atob(encryptedText);
        let decrypted = '';
        for (let i = 0; i < decoded.length; i++) {
            decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length));
        }
        return decrypted;
    } catch {
        return null;
    }
}

// Storage utilities
const Storage = {
    save(key, value) {
        try {
            const encrypted = encrypt(JSON.stringify(value));
            localStorage.setItem(key, encrypted);
            return true;
        } catch (error) {
            console.error('Storage save error:', error);
            return false;
        }
    },

    load(key) {
        try {
            const encrypted = localStorage.getItem(key);
            if (!encrypted) return null;
            const decrypted = decrypt(encrypted);
            return decrypted ? JSON.parse(decrypted) : null;
        } catch (error) {
            console.error('Storage load error:', error);
            return null;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
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

// API Key Management
function initAPIKeyForm() {
    const providerSelect = document.getElementById('api-provider');
    const apiKeyInput = document.getElementById('api-key');
    const activateBtn = document.getElementById('activate-btn');
    const toggleVisibility = document.querySelector('.toggle-visibility');
    const eyeOpen = document.querySelector('.eye-open');
    const eyeClosed = document.querySelector('.eye-closed');
    
    // Check for saved credentials
    const savedCredentials = Storage.load('api_credentials');
    if (savedCredentials) {
        providerSelect.value = savedCredentials.provider;
        apiKeyInput.value = savedCredentials.apiKey;
        validateAndActivate(savedCredentials.provider, savedCredentials.apiKey, false);
    }
    
    // Toggle API key visibility
    toggleVisibility?.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission if inside form
        
        if (apiKeyInput.type === 'password') {
            // Show the API key
            apiKeyInput.type = 'text';
            eyeOpen?.classList.add('hidden');
            eyeClosed?.classList.remove('hidden');
            toggleVisibility.setAttribute('aria-label', 'Hide API key');
        } else {
            // Hide the API key
            apiKeyInput.type = 'password';
            eyeOpen?.classList.remove('hidden');
            eyeClosed?.classList.add('hidden');
            toggleVisibility.setAttribute('aria-label', 'Show API key');
        }
        
        // Maintain focus on input for better UX
        apiKeyInput.focus();
    });
    
    // Enable/disable activate button
    [providerSelect, apiKeyInput].forEach(input => {
        input.addEventListener('input', () => {
            activateBtn.disabled = !providerSelect.value || !apiKeyInput.value.trim();
        });
    });
    
    // Handle activation
    activateBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        
        if (!provider || !apiKey) {
            showToast('Please select a provider and enter your API key');
            return;
        }
        
        await validateAndActivate(provider, apiKey, true);
    });
}

function checkDisclaimerAcceptance() {
    return Storage.load('disclaimer_accepted') === true;
}

function showDisclaimerModal() {
    const modal = document.getElementById('disclaimer-modal');
    const checkbox = document.getElementById('disclaimer-checkbox');
    const acceptBtn = document.getElementById('accept-disclaimer');
    const declineBtn = document.getElementById('decline-disclaimer');
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Enable/disable accept button based on checkbox
    checkbox.addEventListener('change', () => {
        acceptBtn.disabled = !checkbox.checked;
    });
    
    // Handle accept
    acceptBtn.addEventListener('click', () => {
        if (checkbox.checked) {
            Storage.save('disclaimer_accepted', true);
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            // Continue with activation
            return true;
        }
    });
    
    // Handle decline
    declineBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        // Reset form
        document.getElementById('api-provider').value = '';
        document.getElementById('api-key').value = '';
        showToast('You must accept the disclaimer to use this platform');
        return false;
    });
}

async function validateAndActivate(provider, apiKey, testConnection = true) {
    // Check if disclaimer has been accepted
    if (!checkDisclaimerAcceptance()) {
        const modal = document.getElementById('disclaimer-modal');
        const checkbox = document.getElementById('disclaimer-checkbox');
        const acceptBtn = document.getElementById('accept-disclaimer');
        const declineBtn = document.getElementById('decline-disclaimer');
        
        // Show modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        return new Promise((resolve) => {
            // Enable/disable accept button based on checkbox
            checkbox.addEventListener('change', () => {
                acceptBtn.disabled = !checkbox.checked;
            });
            
            // Handle accept
            acceptBtn.addEventListener('click', async () => {
                if (checkbox.checked) {
                    Storage.save('disclaimer_accepted', true);
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                    // Continue with activation
                    await performActivation(provider, apiKey, testConnection);
                    resolve(true);
                }
            });
            
            // Handle disclaimer link in modal
            const modalDisclaimerLink = document.getElementById('modal-disclaimer-link');
            if (modalDisclaimerLink) {
                modalDisclaimerLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                    // Show disclaimer page
                    document.querySelectorAll('.page').forEach(page => {
                        page.classList.remove('active');
                    });
                    document.getElementById('disclaimer-page').classList.add('active');
                    window.scrollTo(0, 0);
                });
            }
            
            // Handle decline
            declineBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                // Reset form
                document.getElementById('api-provider').value = '';
                document.getElementById('api-key').value = '';
                showToast('You must accept the disclaimer to use this platform');
                resolve(false);
            });
        });
    } else {
        // Disclaimer already accepted, proceed with activation
        await performActivation(provider, apiKey, testConnection);
    }
}

async function performActivation(provider, apiKey, testConnection = true) {
    const activateBtn = document.getElementById('activate-btn');
    const btnText = activateBtn.querySelector('.btn-text');
    const btnIcon = activateBtn.querySelector('.btn-icon');
    const btnSpinner = activateBtn.querySelector('.btn-spinner');
    const progressDiv = document.getElementById('activation-progress');
    const progressText = document.getElementById('progress-text');
    const statusDiv = document.getElementById('activation-status');
    const errorDiv = document.getElementById('activation-error');
    const errorMessage = document.getElementById('error-message');
    const errorSuggestions = document.getElementById('error-suggestions');
    
    const originalText = btnText.textContent;
    
    // Clear previous states
    statusDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    try {
        // Show loading state on button
        activateBtn.disabled = true;
        btnText.textContent = 'Activating...';
        btnIcon.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        
        // Show progress messages
        progressDiv.classList.remove('hidden');
        progressText.textContent = `Connecting to ${provider.toUpperCase()}...`;
        
        // Initialize API handler
        apiHandler = new APIHandler();
        apiHandler.initialize(provider, apiKey);
        
        // Update progress
        await delay(500); // Small delay for UX
        progressText.textContent = 'Verifying API key...';
        
        // Test connection if requested
        if (testConnection) {
            const isConnected = await apiHandler.testConnection();
            if (!isConnected) {
                throw new Error('Connection test failed. API key may be invalid.');
            }
        }
        
        // Update progress
        progressText.textContent = 'Loading legal specialists...';
        await delay(300);
        
        // Initialize router
        agentRouter = new AgentRouter();
        await agentRouter.loadAgents();
        
        // Update progress
        progressText.textContent = 'Finalizing setup...';
        await delay(300);
        
        // Save credentials
        Storage.save('api_credentials', { provider, apiKey });
        
        // Hide progress and show success
        progressDiv.classList.add('hidden');
        statusDiv.classList.remove('hidden');
        
        // Reset button to success state
        btnSpinner.classList.add('hidden');
        btnIcon.classList.remove('hidden');
        btnText.textContent = 'Activated Successfully!';
        
        // Initialize chat interface after animation
        setTimeout(() => {
            initializeChatInterface();
            showChatPage();
        }, 1500);
        
    } catch (error) {
        console.error('Activation error:', error);
        
        // Hide progress
        progressDiv.classList.add('hidden');
        
        // Show error with suggestions
        errorDiv.classList.remove('hidden');
        errorMessage.textContent = error.message || 'Failed to activate AI Legal Team';
        
        // Generate error suggestions based on error type
        const suggestions = getErrorSuggestions(error.message, provider);
        errorSuggestions.innerHTML = suggestions.map(s => `<li>${s}</li>`).join('');
        
        // Reset button
        activateBtn.disabled = false;
        btnSpinner.classList.add('hidden');
        btnIcon.classList.remove('hidden');
        btnText.textContent = originalText;
    }
}

function getErrorSuggestions(errorMessage, provider) {
    const suggestions = [];
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('invalid') || lowerError.includes('unauthorized')) {
        suggestions.push(`Verify your API key starts with the correct prefix`);
        
        if (provider === 'openai') {
            suggestions.push(`OpenAI keys should start with "sk-"`);
            suggestions.push(`Check your key at platform.openai.com`);
        } else if (provider === 'anthropic') {
            suggestions.push(`Anthropic keys should start with "sk-ant-"`);
            suggestions.push(`Check your key at console.anthropic.com`);
        } else if (provider === 'grok') {
            suggestions.push(`Grok/xAI keys should start with "xai-"`);
            suggestions.push(`Check your key at x.ai`);
        }
    }
    
    if (lowerError.includes('rate limit')) {
        suggestions.push(`Wait a few moments before trying again`);
        suggestions.push(`Check your API usage limits`);
    }
    
    if (lowerError.includes('network') || lowerError.includes('connection')) {
        suggestions.push(`Check your internet connection`);
        suggestions.push(`Try refreshing the page`);
        suggestions.push(`Disable browser extensions that might block requests`);
    }
    
    if (lowerError.includes('quota') || lowerError.includes('credits')) {
        suggestions.push(`Check your account has available credits`);
        suggestions.push(`Verify billing is set up for your API account`);
    }
    
    if (suggestions.length === 0) {
        suggestions.push(`Double-check your API key is copied correctly`);
        suggestions.push(`Ensure you selected the correct provider`);
        suggestions.push(`Try generating a new API key`);
    }
    
    return suggestions;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Page Navigation
function showChatPage() {
    document.getElementById('landing-page').classList.remove('active');
    document.getElementById('chat-page').classList.add('active');
    
    // Focus on message input
    setTimeout(() => {
        document.getElementById('message-input').focus();
    }, 100);
}

function showLandingPage() {
    document.getElementById('chat-page').classList.remove('active');
    document.getElementById('landing-page').classList.add('active');
}

// Chat Interface
function initializeChatInterface() {
    loadAgentList();
    initMessageForm();
    initChatControls();
    initMobileMenu();
    loadConversationHistory();
}

// Mobile Menu Handler
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('agent-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburgerIcon = menuToggle?.querySelector('.hamburger-icon');
    const closeIcon = menuToggle?.querySelector('.close-icon');
    
    if (!menuToggle) return;
    
    // Toggle menu
    menuToggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
    
    // Close on overlay click
    overlay?.addEventListener('click', () => {
        closeSidebar();
    });
    
    // Close on agent selection (mobile)
    document.querySelectorAll('.agent-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                setTimeout(closeSidebar, 300); // Small delay for UX
            }
        });
    });
    
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        hamburgerIcon?.classList.add('hidden');
        closeIcon?.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
    
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        hamburgerIcon?.classList.remove('hidden');
        closeIcon?.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    // Handle resize - close sidebar if window becomes large
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
}

function loadAgentList() {
    const agentList = document.getElementById('agent-list');
    const agents = agentRouter.getAllAgents();
    
    agentList.innerHTML = '';
    
    agents.forEach(agent => {
        const agentItem = document.createElement('div');
        agentItem.className = 'agent-item';
        agentItem.dataset.agentId = agent.id;
        
        agentItem.innerHTML = `
            <span class="agent-item-name">${agent.name}</span>
            <span class="agent-item-specialty">${agent.specialty}</span>
        `;
        
        agentItem.addEventListener('click', () => {
            selectAgent(agent.id);
            // Close mobile menu if open
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('agent-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                const hamburgerIcon = document.querySelector('.hamburger-icon');
                const closeIcon = document.querySelector('.close-icon');
                
                setTimeout(() => {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                    hamburgerIcon?.classList.remove('hidden');
                    closeIcon?.classList.add('hidden');
                    document.body.style.overflow = '';
                }, 300);
            }
        });
        
        agentList.appendChild(agentItem);
    });
}

function selectAgent(agentId) {
    // Update router
    agentRouter.setCurrentAgent(agentId);
    
    // Update UI
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.toggle('active', item.dataset.agentId === agentId);
    });
    
    // Update current agent display
    const agent = agentRouter.getAgentById(agentId);
    updateCurrentAgentDisplay(agent);
    
    // Add system message
    addMessage(`You're now speaking with ${agent.name}, who specializes in ${agent.specialty}.`, 'system');
}

function updateCurrentAgentDisplay(agent) {
    const agentName = document.querySelector('.agent-name');
    const agentStatus = document.querySelector('.agent-status');
    
    if (agent) {
        agentName.textContent = agent.name;
        agentStatus.textContent = agent.specialty;
    } else {
        agentName.textContent = 'AI Legal Assistant';
        agentStatus.textContent = 'Ready to help';
    }
}

function initMessageForm() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('message-input');
    const sendButton = form.querySelector('.send-button');
    const charCount = document.getElementById('char-count');
    
    // Auto-resize textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        
        // Update character count
        charCount.textContent = `${input.value.length} / 4000`;
        
        // Enable/disable send button
        sendButton.disabled = input.value.trim().length === 0;
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = input.value.trim();
        if (!message) return;
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        charCount.textContent = '0 / 4000';
        sendButton.disabled = true;
        
        // Send message
        await handleUserMessage(message);
    });
    
    // Handle Enter key (without Shift)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
}

async function handleUserMessage(message) {
    // Add user message to chat
    addMessage(message, 'user');
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        let response;
        
        // Check if we need routing
        if (!agentRouter.getCurrentAgent()) {
            // Route through router agent
            const routingResult = await agentRouter.routeMessage(message, apiHandler);
            
            // Add router's response (already cleaned in router.js)
            hideTypingIndicator();
            addMessage(routingResult.routerMessage, 'ai');
            
            if (routingResult.handoff && routingResult.specialist) {
                // Update UI for specialist
                selectAgent(routingResult.specialist.id);
                
                // Show typing indicator for specialist
                showTypingIndicator();
                
                // Get specialist's response
                response = await agentRouter.sendToSpecialist(message, apiHandler);
                hideTypingIndicator();
                addMessage(response.content, 'ai');
            }
        } else {
            // Direct message to current specialist
            response = await agentRouter.sendToSpecialist(message, apiHandler);
            hideTypingIndicator();
            addMessage(response.content, 'ai');
        }
        
        // Update token usage
        if (response?.usage) {
            totalTokensUsed += response.usage.total_tokens || 0;
            updateTokenDisplay();
        }
        
        // Save conversation
        saveConversation();
        
    } catch (error) {
        hideTypingIndicator();
        console.error('Message handling error:', error);
        showToast(error.message || 'Failed to send message. Please try again.');
    }
}

function addMessage(content, type = 'user') {
    const container = document.getElementById('messages-container');
    
    // Remove welcome message if exists
    const welcomeMessage = container.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = content;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);
    
    container.appendChild(messageDiv);
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
    
    // Add to conversation history
    currentConversation.push({
        type,
        content,
        timestamp: new Date().toISOString()
    });
}

function showTypingIndicator() {
    document.getElementById('typing-indicator').classList.remove('hidden');
}

function hideTypingIndicator() {
    document.getElementById('typing-indicator').classList.add('hidden');
}

function updateTokenDisplay() {
    const tokenDisplay = document.getElementById('token-usage');
    tokenDisplay.textContent = `Tokens: ${totalTokensUsed.toLocaleString()}`;
    tokenDisplay.classList.remove('hidden');
}

// Chat Controls
function initChatControls() {
    // New consultation
    document.getElementById('new-consultation').addEventListener('click', () => {
        if (currentConversation.length > 0) {
            if (confirm('Start a new consultation? Current conversation will be saved.')) {
                saveConversation();
                clearChat();
            }
        } else {
            clearChat();
        }
    });
    
    // Export chat
    document.getElementById('export-chat').addEventListener('click', () => {
        showExportModal();
    });
    
    // Clear all data
    document.getElementById('clear-data').addEventListener('click', () => {
        if (confirm('Clear all data including API key and conversation history?')) {
            Storage.clear();
            location.reload();
        }
    });
}

function clearChat() {
    // Clear UI
    const container = document.getElementById('messages-container');
    container.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-icon">
                <svg width="60" height="60" viewBox="0 0 40 40">
                    <path d="M20 5L35 15V35H5V15L20 5Z" fill="#B8860B" opacity="0.9"/>
                    <path d="M20 8L32 16V32H8V16L20 8Z" fill="white"/>
                    <circle cx="20" cy="20" r="5" fill="#1a2840"/>
                </svg>
            </div>
            <h2>Welcome to VRG & AI Law</h2>
            <p>I'm your AI legal assistant. How can I help you today?</p>
            <p>You can describe your legal issue, and I'll connect you with the right specialist.</p>
        </div>
    `;
    
    // Clear data
    currentConversation = [];
    totalTokensUsed = 0;
    apiHandler.clearHistory();
    agentRouter.resetToRouter();
    
    // Reset agent selection
    document.querySelectorAll('.agent-item').forEach(item => {
        item.classList.remove('active');
    });
    updateCurrentAgentDisplay(null);
    
    // Update token display
    document.getElementById('token-usage').classList.add('hidden');
}

// Export functionality
function showExportModal() {
    const modal = document.getElementById('export-modal');
    modal.classList.remove('hidden');
    
    // Close modal handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Export options
    modal.querySelectorAll('.export-option').forEach(button => {
        button.addEventListener('click', () => {
            const format = button.dataset.format;
            exportConversation(format);
            modal.classList.add('hidden');
        });
    });
}

function exportConversation(format) {
    if (currentConversation.length === 0) {
        showToast('No conversation to export');
        return;
    }
    
    if (format === 'txt') {
        exportAsText();
    } else if (format === 'pdf') {
        exportAsPDF();
    }
}

function exportAsText() {
    let text = 'VRG & AI Law - Consultation Transcript\n';
    text += '=' + '='.repeat(40) + '\n\n';
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `Time: ${new Date().toLocaleTimeString()}\n\n`;
    text += '-'.repeat(40) + '\n\n';
    
    currentConversation.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        const sender = msg.type === 'user' ? 'You' : msg.type === 'ai' ? 'AI Lawyer' : 'System';
        text += `[${timestamp}] ${sender}:\n${msg.content}\n\n`;
    });
    
    // Download file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vrg-ai-law-consultation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Conversation exported as text file');
}

function exportAsPDF() {
    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank');
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Legal Consultation</title>
            <style>
                body {
                    font-family: 'Times New Roman', serif;
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px;
                }
                h1 {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                }
                .meta {
                    text-align: center;
                    margin: 20px 0;
                    color: #666;
                }
                .message {
                    margin: 20px 0;
                    padding: 10px;
                    border-left: 3px solid #ccc;
                }
                .message.user {
                    border-left-color: #1a2840;
                    background: #f0f0f0;
                }
                .message.ai {
                    border-left-color: #B8860B;
                }
                .sender {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .timestamp {
                    color: #666;
                    font-size: 0.9em;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <h1>VRG & AI Law - Consultation Transcript</h1>
            <div class="meta">
                <p>Date: ${new Date().toLocaleDateString()}</p>
                <p>Time: ${new Date().toLocaleTimeString()}</p>
            </div>
            <hr>
            ${currentConversation.map(msg => {
                const timestamp = new Date(msg.timestamp).toLocaleTimeString();
                const sender = msg.type === 'user' ? 'Client' : msg.type === 'ai' ? 'AI Legal Counsel' : 'System';
                return `
                    <div class="message ${msg.type}">
                        <div class="sender">${sender} <span class="timestamp">[${timestamp}]</span></div>
                        <div>${msg.content.replace(/\n/g, '<br>')}</div>
                    </div>
                `;
            }).join('')}
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 500);
    
    showToast('Opening print dialog for PDF export');
}

// Conversation persistence
function saveConversation() {
    const conversations = Storage.load('conversations') || [];
    
    if (currentConversation.length > 0) {
        conversations.push({
            id: Date.now(),
            date: new Date().toISOString(),
            messages: currentConversation,
            agent: agentRouter.getCurrentAgent()?.name || 'Router',
            tokens: totalTokensUsed
        });
        
        // Keep only last 10 conversations
        if (conversations.length > 10) {
            conversations.shift();
        }
        
        Storage.save('conversations', conversations);
    }
}

function loadConversationHistory() {
    const conversations = Storage.load('conversations') || [];
    // Could implement a conversation history viewer here
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode
    initDarkMode();
    
    // Initialize API key form
    initAPIKeyForm();
    
    // Initialize disclaimer page navigation
    initDisclaimerNavigation();
    
    // Check if already activated
    const savedCredentials = Storage.load('api_credentials');
    if (savedCredentials && apiHandler?.isInitialized()) {
        initializeChatInterface();
        showChatPage();
    }
});

// Disclaimer Page Navigation
function initDisclaimerNavigation() {
    let previousPage = 'landing-page';
    
    // Landing page disclaimer link
    const landingLink = document.getElementById('disclaimer-link-landing');
    if (landingLink) {
        landingLink.addEventListener('click', (e) => {
            e.preventDefault();
            previousPage = 'landing-page';
            showDisclaimerPage();
        });
    }
    
    // Chat page disclaimer link
    const chatLink = document.getElementById('disclaimer-link-chat');
    if (chatLink) {
        chatLink.addEventListener('click', (e) => {
            e.preventDefault();
            previousPage = 'chat-page';
            showDisclaimerPage();
        });
    }
    
    // Back button from disclaimer page
    const backBtn = document.getElementById('back-from-disclaimer');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            hideDisclaimerPage(previousPage);
        });
    }
    
    function showDisclaimerPage() {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        // Show disclaimer page
        document.getElementById('disclaimer-page').classList.add('active');
        // Scroll to top
        window.scrollTo(0, 0);
    }
    
    function hideDisclaimerPage(returnTo) {
        document.getElementById('disclaimer-page').classList.remove('active');
        document.getElementById(returnTo).classList.add('active');
    }
}

// Handle page unload
window.addEventListener('beforeunload', (e) => {
    if (currentConversation.length > 0) {
        saveConversation();
    }
});