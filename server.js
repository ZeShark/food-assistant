import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';


// Import the chat handler functions
import { 
  handleAIRequest, 
  getConversationHistory, 
  clearConversation, 
  getUsageStats 
} from './chat-handler.js';

// Import Supabase database functions
import { 
  getAllIngredients, 
  addIngredient, 
  deleteIngredient,
  deleteAllIngredients,
  searchIngredients,
  getIngredientsByCategory
} from './database.js';

// Fix for ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only load .env file in development
if (process.env.NODE_ENV !== 'production') {
  const envPath = path.join(__dirname, '.env');
  console.log('📁 Loading .env from:', envPath);
  
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('❌ Error loading .env file:', result.error);
  } else {
    console.log('✅ Environment variables loaded from .env file');
  }
} else {
  console.log('🚀 Production mode - using Render environment variables');
}

console.log('🔍 Checking environment variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Present' : '❌ Missing');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Present' : '❌ Missing');



const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: '🍕 Food Assistant Backend Running on Cloud!',
    database: 'Supabase',
    hosting: 'Railway'
  });
});

// ===== INGREDIENT MANAGEMENT (Supabase Version) =====

// Get all ingredients
app.get('/ingredients', async (req, res) => {
  try {
    const ingredients = await getAllIngredients();
    res.json({ 
      success: true,
      ingredients: ingredients 
    });
  } catch (error) {
    console.error('❌ Error fetching ingredients:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// Add new ingredient
app.post('/ingredients', async (req, res) => {
  const { name, category, quantity, unit } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Ingredient name is required' });
  }

  try {
    const newIngredient = await addIngredient({
      name: name.toLowerCase().trim(),
      category: category || 'uncategorized',
      quantity: quantity || 1,
      unit: unit || 'unit'
    });

    res.json({ 
      success: true, 
      ingredient: newIngredient,
      message: `Added ${name} to your ingredients`
    });
  } catch (error) {
    console.error('❌ Error adding ingredient:', error);
    res.status(500).json({ error: 'Failed to add ingredient' });
  }
});

// Import multiple ingredients at once
app.post('/ingredients/import', async (req, res) => {
  const { ingredients } = req.body;
  
  if (!ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'Ingredients array is required' });
  }

  try {
    const imported = [];
    
    for (const ing of ingredients) {
      if (!ing.name) continue;

      const newIngredient = await addIngredient({
        name: ing.name.toLowerCase().trim(),
        category: ing.category || 'uncategorized',
        quantity: ing.quantity || 1,
        unit: ing.unit || 'unit'
      });
      
      imported.push(newIngredient);
    }

    res.json({ 
      success: true, 
      imported: imported,
      message: `Imported ${imported.length} ingredients successfully`
    });
  } catch (error) {
    console.error('❌ Error importing ingredients:', error);
    res.status(500).json({ error: 'Failed to import ingredients' });
  }
});

// Update ingredient
app.put('/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit } = req.body;
  
  try {
    const { data: updatedIngredient, error } = await supabase
      .from('ingredients')
      .update({
        name: name?.toLowerCase().trim(),
        category,
        quantity,
        unit
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updatedIngredient) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ 
      success: true, 
      ingredient: updatedIngredient 
    });
  } catch (error) {
    console.error('❌ Error updating ingredient:', error);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
});

// Delete ingredient
app.delete('/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    await deleteIngredient(id);
    res.json({ 
      success: true, 
      message: 'Ingredient removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting ingredient:', error);
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
});

// Clear all ingredients
app.delete('/ingredients', async (req, res) => {
  try {
    const count = await deleteAllIngredients();
    res.json({ 
      success: true, 
      message: `Cleared all ${count} ingredients` 
    });
  } catch (error) {
    console.error('❌ Error clearing ingredients:', error);
    res.status(500).json({ error: 'Failed to clear ingredients' });
  }
});

// Search ingredients by name
app.get('/ingredients/search/:query', async (req, res) => {
  const { query } = req.params;
  
  try {
    const ingredients = await searchIngredients(query);
    res.json({ 
      success: true,
      ingredients: ingredients 
    });
  } catch (error) {
    console.error('❌ Error searching ingredients:', error);
    res.status(500).json({ error: 'Failed to search ingredients' });
  }
});

// Get ingredients by category
app.get('/ingredients/category/:category', async (req, res) => {
  const { category } = req.params;
  
  try {
    const ingredients = await getIngredientsByCategory(category);
    res.json({ 
      success: true,
      ingredients: ingredients 
    });
  } catch (error) {
    console.error('❌ Error fetching ingredients by category:', error);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// ===== AI FOOD ASSISTANT =====

// Main chat endpoint
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log('📨 Received message:', message);
  
  try {
    const response = await handleAIRequest(message);
    res.json({ 
      success: true,
      response: response,
      conversationHistory: getConversationHistory()
    });
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'AI service unavailable. Please try again.'
    });
  }
});

// Get recipe suggestions based on current ingredients
app.post('/recipes/suggest', async (req, res) => {
  const { cuisine, diet, time } = req.body;
  
  try {
    const ingredients = await getAllIngredients();
    const ingredientNames = ingredients.map(ing => ing.name);
    
    if (ingredientNames.length === 0) {
      return res.status(400).json({ error: 'No ingredients available. Add some ingredients first!' });
    }

    let message = `I have these ingredients: ${ingredientNames.join(', ')}. `;
    if (cuisine) message += `I want ${cuisine} cuisine. `;
    if (diet) message += `Dietary preference: ${diet}. `;
    if (time) message += `I have ${time} to cook. `;
    message += `What are 2-3 specific recipes I can make?`;

    const response = await handleAIRequest(message);
    res.json({ 
      success: true,
      ingredients: ingredientNames,
      suggestions: response,
      filters: { cuisine, diet, time }
    });
  } catch (error) {
    console.error('❌ Recipe suggestion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get recipe suggestions'
    });
  }
});

// Get conversation history
app.get('/conversation', (req, res) => {
  res.json({
    success: true,
    history: getConversationHistory()
  });
});

// Clear conversation
app.post('/conversation/clear', (req, res) => {
  const result = clearConversation();
  res.json({ 
    success: true,
    message: result 
  });
});

// Get usage stats
app.get('/usage', (req, res) => {
  res.json({
    success: true,
    ...getUsageStats()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🍕 Food Assistant backend running on port ${PORT}`);
  console.log(`☁️  Using Supabase database`);
  console.log(`📍 Deployed to Render`);
});