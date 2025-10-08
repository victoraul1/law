/**
 * Agent Router - Intelligently routes users to appropriate legal specialists
 */

class AgentRouter {
    constructor() {
        this.agents = null;
        this.routerAgent = null;
        this.currentAgent = null;
        this.conversationContext = '';
        this.routingHistory = [];
    }

    /**
     * Load agents from JSON file
     */
    async loadAgents() {
        try {
            const response = await fetch('agents.json');
            const data = await response.json();
            
            this.routerAgent = data.router;
            this.agents = data.agents;
            
            return true;
        } catch (error) {
            console.error('Failed to load agents:', error);
            throw new Error('Failed to load agent configurations');
        }
    }

    /**
     * Parse routing decision from router's response
     */
    parseRoutingDecision(response) {
        // Look for ROUTE_TO: directive in the response
        const routeMatch = response.match(/ROUTE_TO:\s*([a-z_]+)/i);
        
        if (routeMatch) {
            return routeMatch[1].toLowerCase();
        }
        
        // If no explicit routing, try to detect from keywords
        return this.detectAgentFromKeywords(response);
    }

    /**
     * Detect appropriate agent based on keywords
     */
    detectAgentFromKeywords(text) {
        const lowerText = text.toLowerCase();
        
        const keywords = {
            'personal_injury': ['accident', 'injury', 'hurt', 'crash', 'slip', 'fall', 'medical malpractice', 'fault', 'insurance claim'],
            'business_law': ['business', 'company', 'llc', 'corporation', 'partnership', 'contract', 'commercial', 'startup'],
            'immigration': ['visa', 'green card', 'citizenship', 'immigration', 'deportation', 'asylum', 'naturalization'],
            'family_law': ['divorce', 'custody', 'child support', 'alimony', 'separation', 'prenup', 'adoption'],
            'real_estate': ['property', 'house', 'real estate', 'landlord', 'tenant', 'lease', 'mortgage', 'title', 'closing'],
            'estate_planning': ['will', 'trust', 'estate', 'inheritance', 'probate', 'power of attorney', 'beneficiary'],
            'employment_law': ['fired', 'terminated', 'discrimination', 'harassment', 'workplace', 'overtime', 'wages', 'wrongful'],
            'criminal_defense': ['arrested', 'criminal', 'charges', 'dui', 'dwi', 'police', 'jail', 'felony', 'misdemeanor'],
            'intellectual_property': ['patent', 'trademark', 'copyright', 'intellectual property', 'ip', 'invention', 'brand'],
            'contract_law': ['contract', 'agreement', 'breach', 'terms', 'negotiate', 'dispute', 'sue', 'lawsuit']
        };

        // Count keyword matches for each agent
        let bestMatch = null;
        let maxMatches = 0;

        for (const [agentId, agentKeywords] of Object.entries(keywords)) {
            const matches = agentKeywords.filter(keyword => lowerText.includes(keyword)).length;
            
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = agentId;
            }
        }

        return bestMatch;
    }

    /**
     * Route user message through router agent
     */
    async routeMessage(message, apiHandler) {
        try {
            // First, use the router agent to determine the appropriate specialist
            const routerResponse = await apiHandler.sendMessage(
                message,
                this.routerAgent.systemPrompt,
                { saveHistory: false, maxTokens: 500 }
            );

            const agentId = this.parseRoutingDecision(routerResponse.content);
            
            if (agentId) {
                const specialist = this.getAgentById(agentId);
                
                if (specialist) {
                    this.currentAgent = specialist;
                    this.conversationContext = message; // Save initial context
                    
                    // Add to routing history
                    this.routingHistory.push({
                        timestamp: new Date(),
                        fromAgent: 'router',
                        toAgent: agentId,
                        reason: routerResponse.content
                    });
                    
                    // Clean the router message by removing the ROUTE_TO directive
                    let cleanMessage = routerResponse.content.replace(/ROUTE_TO:\s*[a-z_]+\s*/gi, '').trim();
                    // Also clean any trailing periods or punctuation that might be orphaned
                    cleanMessage = cleanMessage.replace(/\s*\.\s*$/, '.').trim();
                    
                    return {
                        routerMessage: cleanMessage,
                        specialist: specialist,
                        handoff: true
                    };
                }
            }

            // If no specific routing, clean any potential ROUTE_TO from response
            const cleanMessage = routerResponse.content.replace(/ROUTE_TO:\s*[a-z_]+\s*/gi, '').trim();
            
            return {
                routerMessage: cleanMessage,
                specialist: null,
                handoff: false
            };

        } catch (error) {
            console.error('Routing error:', error);
            throw new Error('Failed to route your request. Please try again.');
        }
    }

    /**
     * Send message directly to current specialist
     */
    async sendToSpecialist(message, apiHandler) {
        if (!this.currentAgent) {
            throw new Error('No specialist selected');
        }

        try {
            // Include context in the system prompt if this is the first message to specialist
            let systemPrompt = this.currentAgent.systemPrompt;
            
            if (this.conversationContext) {
                systemPrompt += `\n\nInitial client inquiry: ${this.conversationContext}`;
                this.conversationContext = ''; // Clear after first use
            }

            const response = await apiHandler.sendMessage(
                message,
                systemPrompt,
                { saveHistory: true, maxTokens: 2000 }
            );

            return response;

        } catch (error) {
            console.error('Specialist communication error:', error);
            throw error;
        }
    }

    /**
     * Get agent by ID
     */
    getAgentById(agentId) {
        return this.agents.find(agent => agent.id === agentId);
    }

    /**
     * Get all available agents
     */
    getAllAgents() {
        return this.agents;
    }

    /**
     * Get current agent
     */
    getCurrentAgent() {
        return this.currentAgent;
    }

    /**
     * Set current agent manually
     */
    setCurrentAgent(agentId) {
        const agent = this.getAgentById(agentId);
        
        if (agent) {
            this.currentAgent = agent;
            
            // Add to routing history
            this.routingHistory.push({
                timestamp: new Date(),
                fromAgent: this.currentAgent?.id || 'user',
                toAgent: agentId,
                reason: 'Manual selection'
            });
            
            return true;
        }
        
        return false;
    }

    /**
     * Reset to router agent
     */
    resetToRouter() {
        this.currentAgent = null;
        this.conversationContext = '';
    }

    /**
     * Get routing history
     */
    getRoutingHistory() {
        return this.routingHistory;
    }

    /**
     * Clear routing history
     */
    clearRoutingHistory() {
        this.routingHistory = [];
    }

    /**
     * Analyze message for potential re-routing needs
     */
    shouldReroute(message) {
        const reRouteKeywords = [
            'different issue',
            'another question',
            'separate matter',
            'unrelated',
            'change topic',
            'new problem',
            'also need help with'
        ];

        const lowerMessage = message.toLowerCase();
        return reRouteKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    /**
     * Get agent recommendations based on message content
     */
    getAgentRecommendations(message) {
        const recommendations = [];
        const lowerMessage = message.toLowerCase();

        // Check each agent's keywords
        for (const agent of this.agents) {
            let score = 0;
            
            // Check specialty keywords
            if (lowerMessage.includes(agent.specialty.toLowerCase())) {
                score += 5;
            }

            // Check description keywords
            const descWords = agent.description.toLowerCase().split(' ');
            for (const word of descWords) {
                if (word.length > 4 && lowerMessage.includes(word)) {
                    score++;
                }
            }

            if (score > 0) {
                recommendations.push({
                    agent: agent,
                    score: score
                });
            }
        }

        // Sort by score and return top 3
        recommendations.sort((a, b) => b.score - a.score);
        return recommendations.slice(0, 3).map(r => r.agent);
    }

    /**
     * Generate handoff message when switching agents
     */
    generateHandoffMessage(fromAgent, toAgent) {
        const messages = [
            `I'll connect you with ${toAgent.name}, who specializes in ${toAgent.specialty}.`,
            `Let me transfer you to ${toAgent.name}, our ${toAgent.specialty} expert.`,
            `${toAgent.name} will be perfect for this. They specialize in ${toAgent.specialty}.`,
            `I'm bringing in ${toAgent.name} to help with this ${toAgent.specialty} matter.`
        ];

        return messages[Math.floor(Math.random() * messages.length)];
    }

    /**
     * Check if current conversation needs specialist
     */
    needsSpecialist(message, currentAgentId = null) {
        // If already with a specialist, check if topic has changed
        if (currentAgentId && currentAgentId !== 'router') {
            return this.shouldReroute(message);
        }

        // Otherwise, check if message contains legal issue keywords
        const legalKeywords = [
            'sue', 'lawsuit', 'legal', 'lawyer', 'attorney',
            'court', 'judge', 'rights', 'law', 'contract',
            'divorce', 'custody', 'accident', 'injury',
            'visa', 'immigration', 'business', 'patent',
            'arrested', 'criminal', 'estate', 'will'
        ];

        const lowerMessage = message.toLowerCase();
        return legalKeywords.some(keyword => lowerMessage.includes(keyword));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentRouter;
}