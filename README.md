# VRG & AI Law - LangChain Backend Application

A full-stack AI-powered legal consultation platform built with Python, LangChain, and Flask. This application provides users with access to 10 specialized AI lawyer agents through a conversational interface.

## Features

- 🤖 **10 Specialized Legal AI Agents**: Personal Injury, Business Law, Immigration, Family Law, Real Estate, Estate Planning, Employment Law, Criminal Defense, Intellectual Property, and Contract Law
- 🔄 **Intelligent Routing System**: Automatically routes users to the appropriate legal specialist
- 💬 **Conversational Memory**: Maintains context throughout the consultation using LangChain's memory system
- 🔐 **Secure API Key Management**: Server-side encryption and session-based storage
- 🌓 **Dark Mode Support**: User-friendly interface with theme switching
- 📤 **Export Functionality**: Save consultation transcripts
- 🚀 **Multi-LLM Support**: Works with OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), and Grok

## Architecture

```
├── backend/                 # Python Flask backend
│   ├── app.py              # Main Flask application
│   ├── agents/             # LangChain agent implementations
│   ├── memory/             # Conversation memory management
│   ├── utils/              # LLM factory and utilities
│   └── config.py           # Configuration settings
├── frontend/               # Static frontend files
│   ├── index.html          # Main HTML
│   ├── styles.css          # Styling
│   └── app-backend.js      # Frontend JS (backend-enabled)
└── agents.json             # Agent configurations
```

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment tool (venv or virtualenv)

## Installation

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd law-langchain
```

### 2. Set Up Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file with your configuration
# Generate a secure SECRET_KEY for production
```

### 5. Run the Application

```bash
# From the backend directory
python app.py
```

The application will be available at `http://localhost:5000`

## Usage

1. **Open the Application**: Navigate to `http://localhost:5000` in your browser

2. **Select LLM Provider**: Choose between OpenAI, Anthropic, or Grok

3. **Enter API Key**: Provide your API key for the selected provider
   - OpenAI: Get from https://platform.openai.com/api-keys
   - Anthropic: Get from https://console.anthropic.com/
   - Grok: Get from https://console.x.ai/

4. **Start Consultation**: The Legal Assistant will greet you and understand your needs

5. **Automatic Routing**: Based on your description, you'll be connected to the appropriate specialist

6. **Conversation**: Have a natural conversation with the AI lawyer specialist

7. **Export**: Save your consultation transcript for future reference

## API Endpoints

- `POST /api/activate` - Validate and store API keys
- `POST /api/chat` - Send messages and receive AI responses
- `POST /api/route` - Route to appropriate specialist
- `GET /api/agents` - Get list of available specialists
- `POST /api/clear` - Clear conversation memory
- `GET /api/health` - Health check endpoint
- `GET /api/session/status` - Check authentication status

## Getting API Keys

### OpenAI (GPT-4)
1. Visit [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key (starts with `sk-`)
5. Copy and save it securely

### Anthropic (Claude)
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys section
4. Create new API key (starts with `sk-ant-`)
5. Copy and save it securely

### Grok
1. Visit [x.ai](https://x.ai) for API access
2. Follow their process for API key generation
3. Keys typically start with `xai-`

## Deployment

### Local Development

```bash
# Development mode with auto-reload
FLASK_ENV=development python backend/app.py
```

### Production Deployment (DigitalOcean)

1. **Create a DigitalOcean Droplet**
   - Ubuntu 22.04 LTS
   - At least 2GB RAM
   - Python 3.8+ installed

2. **Set Up the Server**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3-pip python3-venv nginx -y

# Clone your repository
git clone <your-repo-url>
cd law-langchain

# Set up virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
cd backend
pip install -r requirements.txt
pip install gunicorn
```

3. **Configure Gunicorn Service**

Create `/etc/systemd/system/vrg-law.service`:

```ini
[Unit]
Description=VRG Law LangChain Application
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/law-langchain/backend
Environment="PATH=/path/to/law-langchain/venv/bin"
ExecStart=/path/to/law-langchain/venv/bin/gunicorn --workers 3 --bind unix:vrg-law.sock -m 007 app:app

[Install]
WantedBy=multi-user.target
```

4. **Configure Nginx**

Create `/etc/nginx/sites-available/vrg-law`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        include proxy_params;
        proxy_pass http://unix:/path/to/law-langchain/backend/vrg-law.sock;
    }

    location /static {
        alias /path/to/law-langchain;
    }
}
```

5. **Enable and Start Services**

```bash
# Enable and start Gunicorn
sudo systemctl start vrg-law
sudo systemctl enable vrg-law

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/vrg-law /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

6. **Set Up SSL with Let's Encrypt**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-very-secret-key-change-in-production
FLASK_ENV=production
PORT=5000
CORS_ORIGINS=https://your-domain.com
```

## Security Considerations

- ⚠️ **Never commit API keys** to version control
- 🔐 Use **HTTPS in production** for secure data transmission
- 🔑 Generate a **strong SECRET_KEY** for production
- 🛡️ API keys are **encrypted** before storage in sessions
- 🔒 Sessions are **server-side only** with secure cookies

## Testing

Run the test script to verify the installation:

```bash
# From the project root
python backend/test_app.py
```

This will:
- Test API endpoints
- Verify agent routing
- Check memory persistence
- Test multi-LLM support

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure virtual environment is activated
2. **Port Already in Use**: Change PORT in .env file
3. **CORS Errors**: Add your domain to CORS_ORIGINS in config
4. **Memory Issues**: Restart application to clear all sessions

### Logs

Check application logs:
```bash
# Development
python app.py

# Production (if using systemd)
sudo journalctl -u vrg-law -f
```

## Development

### Adding New Agents

1. Edit `agents.json` to add agent configuration
2. Update `backend/agents/agent_config.py` if needed
3. Restart the application

### Modifying Prompts

Agent prompts are stored in `agents.json`. Edit the `systemPrompt` field for any agent to modify their behavior.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## License

This project is proprietary software for VRG Market Solutions.

---

Built with ❤️ by VRG Market Solutions using Python, LangChain, and Flask