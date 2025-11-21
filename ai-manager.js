import axios from 'axios';

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
          'Authorization': `Bearer ${this.providers[0].apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
          'X-Title': 'Food Assistant'
        })
      },
      {
        name: 'huggingface',
        apiUrl: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: 'mistralai/Mistral-7B-Instruct-v0.1',
        limits: { monthly: 1000 },
        getHeaders: () => ({
          'Authorization': `Bearer ${this.providers[1].apiKey}`,
          'Content-Type': 'application/json'
        })
      }
    ];
  }

  getAvailableProvider() {
    // Simple round-robin for now - we'll add smart limit checking later
    return this.providers[0]; // Start with OpenRouter
  }

  async makeRequest(provider, messages) {
    const payload = this.createPayload(provider, messages);
    
    console.log(`🤖 Using ${provider.name} with model ${provider.model}`);
    
    try {
      const response = await axios.post(provider.apiUrl, payload, {
        headers: provider.getHeaders(),
        timeout: 30000
      });

      // Update usage tracking
      this.updateUsage(provider.name);

      return this.extractResponse(provider, response);
    } catch (error) {
      console.error(`❌ ${provider.name} failed:`, error.response?.data || error.message);
      throw new Error(`${provider.name} service error`);
    }
  }

  createPayload(provider, messages) {
    if (provider.name === 'openrouter') {
      return {
        model: provider.model,
        messages: messages,
        max_tokens: 500
      };
    } else {
      // Hugging Face format
      const lastMessage = messages[messages.length - 1].content;
      return {
        inputs: lastMessage,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7
        }
      };
    }
  }

  extractResponse(provider, response) {
    if (provider.name === 'openrouter') {
      return response.data.choices[0].message.content;
    } else {
      // Hugging Face
      return response.data[0].generated_text;
    }
  }

  updateUsage(providerName) {
    if (providerName === 'openrouter') {
      providerUsage.openrouter.used_today++;
    } else {
      providerUsage.huggingface.used_this_month++;
    }
  }
}

export default AIProviderManager;