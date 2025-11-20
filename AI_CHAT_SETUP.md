# AI Chat Setup Guide (OpenAI)

## ✅ Completed Changes

The AI Chat feature has been converted to use **OpenAI API** instead of Anthropic API.

### Files Updated:
1. **`app/lib/ai/tools-openai.ts`** - Tool definitions in OpenAI function format
2. **`app/api/chat/route.ts`** - OpenAI streaming implementation
3. **`app/api/chat/tools/route.ts`** - Updated to use OpenAI tools

### Models Used:
- **GPT-4o** - Default for complex reasoning and FIRE planning
- **GPT-4o-mini** - Available for simple queries (set `useSimpleModel: true`)

### Pricing (per 1M tokens):
- GPT-4o: $2.50 input / $10.00 output
- GPT-4o-mini: $0.15 input / $0.60 output

---

## 🚀 Setup Instructions

### 1. Add OpenAI API Key

Add to `.env.local`:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 2. Run Database Migration

In Supabase SQL Editor, run:

```sql
-- Copy and paste the contents of add-ai-chat-tables.sql
```

This creates:
- `chat_conversations` table
- `chat_messages` table
- `fire_scenarios` table
- RLS policies and triggers

### 3. Install Dependencies

```bash
npm install
```

This installs:
- `openai` SDK
- `react-markdown` for message formatting

### 4. Start Dev Server

```bash
npm run dev
```

---

## 🧪 Testing Checklist

### Test 1: Basic Chat
1. Visit http://localhost:3000/dashboard
2. Click floating chat button (bottom-right)
3. Type: "How can I retire earlier?"
4. Verify: Response streams in, formatted with markdown

### Test 2: What-If Simulation
1. Click a suggested question: "What if I save ₹10K more per month?"
2. Verify: AI calls `run_simulation` tool
3. Check: Comparison table shows current vs new scenario

### Test 3: Asset Allocation
1. Ask: "Should I rebalance my portfolio?"
2. Verify: AI calls `get_asset_allocation_recommendation` tool
3. Check: Recommendations include specific rebalancing steps

### Test 4: Full-Screen Chat
1. Visit http://localhost:3000/dashboard/chat
2. Test same queries
3. Verify: Same functionality, better for extended conversations

---

## 📊 Features Ready

✅ Streaming responses (text appears as AI generates)
✅ Conversation history persistence
✅ What-if simulations with comparison
✅ Asset allocation recommendations
✅ Tax optimization advice
✅ Markdown formatting (bold, lists, headers)
✅ Suggested questions for new users
✅ Mobile responsive design
✅ Dark mode support
✅ Cost tracking per message

---

## 🔧 Configuration Options

### Use GPT-4o-mini for Simple Queries

In chat components, pass `useSimpleModel: true`:

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: content,
    conversationId,
    useSimpleModel: true, // Use GPT-4o-mini
  }),
});
```

### Adjust Token Limits

In `app/api/chat/route.ts`, line 178:

```typescript
max_tokens: 2000, // Increase for longer responses
```

### Temperature Setting

Line 177:

```typescript
temperature: 0.7, // 0-1 scale (higher = more creative)
```

---

## 🐛 Troubleshooting

### Error: "Unauthorized"
- Check `.env.local` has `OPENAI_API_KEY`
- Restart dev server after adding env var

### Error: "Profile not found"
- Complete onboarding first at /onboarding
- Check Supabase `user_profiles` table has data

### No streaming response
- Check browser console for errors
- Verify OpenAI API key is valid
- Check API quota/billing on OpenAI dashboard

### Tool calls not working
- Check console logs for "Tool execution error"
- Verify `tools-openai.ts` imports are correct
- Check OpenAI model supports function calling (gpt-4o does)

---

## 💰 Cost Estimation

**Example conversation (50 messages):**
- System prompt: ~2000 tokens (per message)
- User message: ~50 tokens average
- AI response: ~200 tokens average
- Total: ~112,500 tokens

**Using GPT-4o:**
- Input: 100K tokens × $2.50/1M = $0.25
- Output: 12.5K tokens × $10/1M = $0.13
- **Total: ~$0.38 per 50 messages**

**Using GPT-4o-mini:**
- Input: 100K tokens × $0.15/1M = $0.015
- Output: 12.5K tokens × $0.60/1M = $0.0075
- **Total: ~$0.02 per 50 messages** (95% cheaper!)

**Recommendation:** Use GPT-4o-mini by default, switch to GPT-4o only for complex scenarios.

---

## 🎯 Next Steps (Optional Enhancements)

1. **Implement "Apply This" buttons** - Update user_profiles when user confirms changes
2. **Add scenario comparison UI** - Side-by-side view at `/dashboard/scenarios`
3. **Create conversation history sidebar** - List past conversations
4. **Add streaming indicators** - Show "Thinking..." or tool names during execution
5. **Implement conversation titles** - Auto-generate from first message
6. **Add export conversation** - Download as PDF or markdown

---

## 📝 Notes

- All tool functions execute server-side for security
- User data never leaves your Supabase database
- OpenAI API calls include full user context in system prompt
- Conversation history limited to last 20 messages to control costs
- Tool results are formatted as markdown for better readability

---

**Ready to test!** 🚀

Run the database migration, add your OpenAI API key, and start the dev server.
