# Frontend Deployment & Running Guide

## Quick Start (Development)

### 1. Start Backend First
Ensure the FastAPI backend is running:
```bash
cd ../backend
python -m uvicorn app.main:app --reload
```
Backend will be available at `http://127.0.0.1:8000`

### 2. Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

The application will open at `http://localhost:3000`

## Development Commands

```bash
# Start dev server with auto-reload
npm run dev

# Run ESLint and auto-fix issues
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

### API Base URL

The API base URL is configured in `src/services/apiClient.js`:

```javascript
const API_BASE_URL = 'http://127.0.0.1:8000/api';
```

**For production deployment**, update this URL to your backend server:

```javascript
const API_BASE_URL = 'https://api.yourdomain.com/api';
```

### Vite Configuration

Port and proxy settings in `vite.config.js`:

```javascript
server: {
  port: 3000,          // Change if needed
  strictPort: false,   // Use next available port if 3000 busy
  open: true,          // Auto-open browser
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8000',  // Change for production
      changeOrigin: true,
      secure: false,
    }
  }
}
```

## Production Build

### Build the Application

```bash
npm run build
```

This creates optimized files in the `dist/` directory:
- `dist/index.html` - Main HTML file
- `dist/assets/` - Bundled JS and CSS

### Test Production Build Locally

```bash
npm run preview
```

This serves the production build from `dist/` directory at `http://localhost:4173`

## Deployment Options

### Option 1: Vercel (Recommended for Vite)

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables if needed
4. Deploy

Vercel auto-detects Vite projects.

### Option 2: Netlify

1. Build locally: `npm run build`
2. Connect to Netlify via GitHub or CLI
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### Option 3: Traditional Server (Apache/Nginx)

**Build:**
```bash
npm run build
```

**Deploy `dist/` folder to web server:**

**Apache (.htaccess):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx:**
```nginx
server {
  listen 80;
  server_name yourdomain.com;
  root /path/to/dist;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### Option 4: Docker

**Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Build image:**
```bash
docker build -t homeopathy-frontend .
```

**Run container:**
```bash
docker run -p 3000:3000 \
  -e REACT_APP_API_URL=https://api.yourdomain.com \
  homeopathy-frontend
```

## Environment Variables

For different environments, create files:

- `.env` - Default (used by Vite)
- `.env.local` - Local overrides (gitignored)
- `.env.development` - Development specific
- `.env.production` - Production specific

Example `.env.production`:
```
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_APP_NAME=Homeopathy Case Manager
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
```

## Performance Optimization

### Before Deployment

1. **Audit dependencies:**
   ```bash
   npm audit
   npm audit fix
   ```

2. **Check bundle size:**
   ```bash
   npm run build
   # Check dist/ folder size
   ```

3. **Test all pages:**
   - Login flow
   - Case CRUD
   - Symptom search
   - Repertorization
   - Follow-ups

4. **Test error scenarios:**
   - Network failure
   - Invalid input
   - API errors
   - Session timeout

### Caching Strategy

The Vite build automatically includes:
- CSS hashing: `assets/index-BwYSUsvy.css`
- JS hashing: `assets/index-CHC1Zild.js`
- All assets in `dist/assets/` have cache-busting hashes

Set long cache headers for assets:
```nginx
location ~* ^/assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \.(html|json)$ {
  expires 0;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Monitoring & Logging

In development, logger outputs to console (visible in DevTools).

In production, logs are suppressed. To add remote logging:

```javascript
// In utils/logger.js
const logger = {
  error: (message, error) => {
    if (import.meta.env.DEV) {
      console.error(`[ERROR] ${message}`, error || '');
    } else {
      // Send to monitoring service
      // fetch('/api/logs', { method: 'POST', body: JSON.stringify({ message, error }) })
    }
  }
};
```

## Security Best Practices

1. ✅ HTTPS only in production
2. ✅ CORS properly configured
3. ✅ No sensitive data in localStorage (currently using store only)
4. ✅ Input validation on client and server
5. ✅ Content Security Policy headers
6. ✅ No hardcoded API keys

### Security Headers (Nginx)

```nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "DENY";
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
```

## Troubleshooting Deployment

### Blank Page
- Check browser console for JS errors
- Verify HTML file is being served
- Check network tab for failed requests

### API Errors
- Verify backend URL in apiClient.js
- Check CORS headers from backend
- Verify API keys/auth headers if needed

### Styles Not Loading
- Check CSS file in network tab
- Verify Tailwind config is correct
- Clear browser cache

### 404 Errors on Refresh
- Configure web server to serve index.html for SPA routing
- (Already included in .htaccess and nginx examples above)

## Rolling Back

Keep previous `dist/` folders with timestamps:
```bash
# After successful build
cp -r dist dist-$(date +%Y%m%d-%H%M%S)
```

To rollback:
```bash
cp -r dist-20260524-145000/* /var/www/html/
```

## Monitoring Checklist

Before deploying to production, verify:

- [ ] ESLint: `npm run lint` passes
- [ ] Build: `npm run build` succeeds
- [ ] Preview: `npm run preview` works
- [ ] All pages load without errors
- [ ] Forms validate correctly
- [ ] API calls work (backend running)
- [ ] Error states display properly
- [ ] Loading states appear
- [ ] Date formatting is correct
- [ ] No console errors or warnings
- [ ] Responsive design on mobile
- [ ] Page loads in < 3 seconds
- [ ] No API keys in source code
- [ ] HTTPS configured (if applicable)

---

**Status:** ✅ Ready for Production  
**Last Updated:** May 24, 2026
