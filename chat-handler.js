import axios from 'axios';

let conversationHistory = [];
let providerUsage = {
  openrouter: { used_today: 0, daily_limit: 100 },
  huggingface: { used_this_month: 0, monthly_limit: 1000 }
};

class AIProviderManager {
  constructor() {
    this.providers = [
      {
        name: 'openrouter',
        apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: 'mistralai/mistral-7b-instruct:free',
        limits: { daily: 100 },
        getHeaders: () => ({
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Food Assistant'
        })
      }
    ];
  }

  getAvailableProvider() {
    return this.providers[0];
  }

async makeRequest(provider, messages) {
  console.log(`🤖 Using ${provider.name} with model ${provider.model}`);
  console.log('📤 Sending messages:', JSON.stringify(messages, null, 2));
  
  try {
    const response = await axios.post(provider.apiUrl, {
      model: provider.model,
      messages: messages,
      max_tokens: 500
    }, {
      headers: provider.getHeaders(),
      timeout: 30000
    });

    console.log('📥 Full API Response:', JSON.stringify(response.data, null, 2));

    // Check if we have the expected response structure
    if (response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message?.content;
      console.log('✅ Extracted content:', content);
      
      if (content && content.trim() !== '') {
        // Update usage tracking
        providerUsage[provider.name].used_today++;
        return content;
      } else {
        console.log('❌ Empty content in response');
        throw new Error('Empty response content');
      }
    } else {
      console.log('❌ No choices in response');
      throw new Error('No choices in response');
    }
    
  } catch (error) {
    console.error(`❌ ${provider.name} failed:`, error.response?.data || error.message);
    throw new Error(`${provider.name} service error: ${error.message}`);
  }
}
}

const aiManager = new AIProviderManager();

export async function handleAIRequest(userMessage) {
  console.log('🎯 Handling AI request:', userMessage);
  
  // Add user message to history
  conversationHistory.push({ role: 'user', content: userMessage });

  // Prepare messages for AI (last 6 messages)
  const recentMessages = conversationHistory.slice(-6);
  const messages = [
    { 
      role: 'system', 
      content: `You are a helpful food and cooking assistant. Help with recipes, ingredient management, food storage tips, expiration dates, freezer advice, and cooking suggestions. Be practical and concise. Focus on food-related topics. Always provide a response.`
    },
    ...recentMessages
  ];

  try {
    const provider = aiManager.getAvailableProvider();
    console.log('🔍 Using provider:', provider.name);
    
    const response = await aiManager.makeRequest(provider, messages);
    
    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: response });
    
    console.log('✅ Final AI Response:', response);
    return response;
    
  } catch (error) {
    console.error('❌ AI Request failed:', error.message);
    // If AI fails, provide a fallback
    const fallback = getFallbackResponse(userMessage);
    conversationHistory.push({ role: 'assistant', content: fallback });
    return fallback;
  }
}

function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('recipe') || lowerMessage.includes('make') || lowerMessage.includes('cook')) {
    return "I'm having trouble accessing my recipe database right now. Try searching online for recipes with your available ingredients!";
  } else if (lowerMessage.includes('expire') || lowerMessage.includes('fresh') || lowerMessage.includes('store')) {
    return "For food safety: refrigerate leftovers within 2 hours, freeze meat you won't use in 3-5 days, and when in doubt, throw it out!";
  } else if (lowerMessage.includes('buy') || lowerMessage.includes('shop') || lowerMessage.includes('grocery')) {
    return "Based on your ingredients, consider buying fresh vegetables, herbs, and staples like onions and garlic to expand your recipe options!";
  } else {
    return "I'm currently experiencing technical difficulties. For now, you might want to check your ingredient list and see what inspires you in the kitchen!";
  }
}

export function getConversationHistory() {
  return conversationHistory.slice(-10);
}

export function clearConversation() {
  conversationHistory = [];
  return 'Conversation cleared!';
}

export function getUsageStats() {
  return providerUsage;
}