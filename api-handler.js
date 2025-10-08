/**
 * API Handler for multiple LLM providers
 * Supports OpenAI, Anthropic, and Grok APIs
 */

class APIHandler {
    constructor() {
        this.provider = null;
        this.apiKey = null;
        this.conversationHistory = [];
    }

    /**
     * Initialize the API handler with provider and key
     */
    initialize(provider, apiKey) {
        this.provider = provider;
        this.apiKey = apiKey;
        
        // Validate the API key format
        if (!this.validateApiKey(provider, apiKey)) {
            throw new Error('Invalid API key format');
        }
        
        return true;
    }

    /**
     * Validate API key format based on provider
     */
    validateApiKey(provider, apiKey) {
        if (!apiKey || apiKey.trim() === '') return false;
        
        switch (provider) {
            case 'openai':
                // OpenAI keys typically start with 'sk-'
                return apiKey.startsWith('sk-') && apiKey.length > 20;
            case 'anthropic':
                // Anthropic keys typically start with 'sk-ant-'
                return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
            case 'grok':
                // xAI/Grok API keys start with 'xai-'
                return apiKey.startsWith('xai-') && apiKey.length > 20;
            default:
                return false;
        }
    }

    /**
     * Send a message to the LLM and get a response
     */
    async sendMessage(message, systemPrompt = null, options = {}) {
        if (!this.provider || !this.apiKey) {
            throw new Error('API not initialized. Please provide your API key.');
        }

        try {
            let response;
            
            switch (this.provider) {
                case 'openai':
                    response = await this.sendToOpenAI(message, systemPrompt, options);
                    break;
                case 'anthropic':
                    response = await this.sendToAnthropic(message, systemPrompt, options);
                    break;
                case 'grok':
                    response = await this.sendToGrok(message, systemPrompt, options);
                    break;
                default:
                    throw new Error('Unsupported provider');
            }
            
            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw this.handleApiError(error);
        }
    }

    /**
     * Send message to OpenAI API
     */
    async sendToOpenAI(message, systemPrompt, options = {}) {
        const messages = [];
        
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        // Add conversation history if enabled
        if (options.includeHistory && this.conversationHistory.length > 0) {
            messages.push(...this.conversationHistory.slice(-10)); // Last 10 messages
        }
        
        messages.push({ role: 'user', content: message });

        const requestBody = {
            model: options.model || 'gpt-4-turbo-preview',
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
            stream: false
        };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content;
        
        // Update conversation history
        if (options.saveHistory) {
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );
        }
        
        return {
            content: assistantMessage,
            usage: data.usage
        };
    }

    /**
     * Send message to Anthropic API
     */
    async sendToAnthropic(message, systemPrompt, options = {}) {
        const messages = [];
        
        // Add conversation history if enabled
        if (options.includeHistory && this.conversationHistory.length > 0) {
            messages.push(...this.conversationHistory.slice(-10));
        }
        
        messages.push({ role: 'user', content: message });

        const requestBody = {
            model: options.model || 'claude-3-sonnet-20240229',
            messages: messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7,
            stream: false
        };

        if (systemPrompt) {
            requestBody.system = systemPrompt;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Anthropic API error');
        }

        const data = await response.json();
        const assistantMessage = data.content[0].text;
        
        // Update conversation history
        if (options.saveHistory) {
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );
        }
        
        return {
            content: assistantMessage,
            usage: {
                prompt_tokens: data.usage?.input_tokens || 0,
                completion_tokens: data.usage?.output_tokens || 0,
                total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
            }
        };
    }

    /**
     * Send message to Grok/xAI API
     * Updated for current xAI API specification (as of 2024)
     * API Documentation: https://docs.x.ai/api
     */
    async sendToGrok(message, systemPrompt, options = {}) {
        const messages = [];
        
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        // Add conversation history if enabled
        if (options.includeHistory && this.conversationHistory.length > 0) {
            messages.push(...this.conversationHistory.slice(-10));
        }
        
        messages.push({ role: 'user', content: message });

        const requestBody = {
            model: options.model || 'grok-2-latest', // Updated model names: grok-2-latest, grok-2, grok-1
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 2000,
            top_p: options.topP || 1,
            frequency_penalty: options.frequencyPenalty || 0,
            presence_penalty: options.presencePenalty || 0,
            stream: false
        };

        // Official xAI API endpoint
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'X-API-Version': '1' // xAI specific header
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let error;
            try {
                error = await response.json();
            } catch {
                error = { error: { message: `xAI API error: ${response.status} ${response.statusText}` } };
            }
            
            // Handle xAI-specific error codes
            if (response.status === 401) {
                throw new Error('Invalid xAI API key. Please check your key starts with "xai-"');
            } else if (response.status === 429) {
                throw new Error('xAI rate limit exceeded. Please wait and try again.');
            } else if (response.status === 503) {
                throw new Error('xAI service temporarily unavailable. Please try again later.');
            }
            
            throw new Error(error.error?.message || error.message || 'xAI/Grok API error');
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid response from xAI API');
        }
        
        const assistantMessage = data.choices[0].message.content;
        
        // Update conversation history
        if (options.saveHistory) {
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: assistantMessage }
            );
        }
        
        return {
            content: assistantMessage,
            usage: data.usage || {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            }
        };
    }

    /**
     * Handle API errors and provide user-friendly messages
     */
    handleApiError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('api key') || message.includes('unauthorized') || message.includes('401')) {
            return new Error('Invalid API key. Please check your API key and try again.');
        }
        
        if (message.includes('rate limit') || message.includes('429')) {
            return new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return new Error('Network error. Please check your connection and try again.');
        }
        
        if (message.includes('quota') || message.includes('credits')) {
            return new Error('API quota exceeded. Please check your account credits.');
        }
        
        return new Error(`API Error: ${error.message}`);
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Estimate token count (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimation: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }

    /**
     * Check if API is initialized
     */
    isInitialized() {
        return this.provider !== null && this.apiKey !== null;
    }

    /**
     * Get current provider
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const response = await this.sendMessage(
                'Hello, please respond with "Connection successful"',
                'You are a connection test. Please respond only with: Connection successful',
                { saveHistory: false, maxTokens: 50 }
            );
            return response.content.includes('successful');
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHandler;
}