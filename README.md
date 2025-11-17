# OpenRouter Chat PWA

Progressive Web App for chatting with OpenRouter AI models using voice input/output and image uploads for vision models.

## ✨ Features
- Chat with 100+ OpenRouter models (streaming responses)
- Voice mode: Speech-to-Text (mic) + Text-to-Speech (speaker icon)
- Image upload for vision models (e.g., GPT-4o, Llama Vision)
- Token auth stored in localStorage (get at openrouter.ai/keys)
- Modern Tailwind UI, dark theme, mobile-responsive
- Full PWA: offline-capable, installable to home screen
- Model selector, clear chat, responsive design

## 🚀 Quick Start

1. **Get API Token**: [openrouter.ai/keys](https://openrouter.ai/keys)
2. **Install deps**: `npm install`
3. **Dev server**: `npm run dev`
4. **Build**: `npm run build`

## 🌐 Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Follow prompts (link domain, set env vars if needed). Vercel auto-detects Vite.

## 🔧 Local Development

```
npm run dev  # http://localhost:5173
npm run build  # outputs to /dist
npm run lint
npm run preview
```

## 📱 PWA Features
- Installable (Add to Home Screen)
- Works offline (cached assets)
- Voice requires microphone permission
- Images base64-encoded for API

## 🛠 Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- vite-plugin-pwa
- Lucide React icons
- Web Speech API (STT/TTS)
- OpenRouter API v1

## ⚠️ Notes
- Free models available, paid credits for premium
- Voice works best in Chrome/Edge (webkitSpeechRecognition)
- Images: PNG/JPG up to ~20MB (API limits apply)

Built with ❤️ using Cursor AI
