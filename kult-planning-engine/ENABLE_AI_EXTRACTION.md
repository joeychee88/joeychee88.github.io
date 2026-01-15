# Enable AI-Powered Extraction

## Option 1: GenSpark LLM Proxy (Recommended)

1. Go to GenSpark Dashboard → API Keys
2. Generate/Configure your LLM API key
3. Click "Inject" to set up environment
4. Restart backend: `pm2 restart kult-backend --update-env`

## Option 2: Direct OpenAI API Key

1. Get your OpenAI API key from https://platform.openai.com/api-keys
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   pm2 restart kult-backend --update-env
   ```

## Option 3: Manual Config File

Edit `~/.genspark_llm.yaml`:
```yaml
openai:
  api_key: "your-actual-key-here"
  base_url: "https://www.genspark.ai/api/llm_proxy/v1"
```

Then restart: `pm2 restart kult-backend --update-env`

## Verify AI Extraction is Working

Upload a brief file and check:
- Confidence score should be 80-95% (not 50%)
- Method should show "AI + Pattern" (not "Pattern-only")
- All fields should be extracted (not just basic ones)

---

For now, pattern-only extraction is sufficient for testing and basic use.
