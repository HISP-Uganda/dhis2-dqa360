# CORS Error Troubleshooting Guide

## 🚨 **Problem: "The user aborted a request" / CORS Error**

This error occurs when your browser blocks requests from `http://localhost:3000` to your DHIS2 server due to Cross-Origin Resource Sharing (CORS) restrictions.

## 🔧 **Solutions (Choose One)**

### **Solution 1: Use Built-in Proxy (Recommended for Development)**

The DHIS2 app platform includes a built-in proxy that bypasses CORS issues:

#### **Quick Setup:**
```bash
# Use the helper script to configure different DHIS2 instances
node scripts/dhis2-connect.js demo     # Connect to DHIS2 demo
node scripts/dhis2-connect.js stable   # Connect to stable demo
node scripts/dhis2-connect.js local    # Connect to local DHIS2
node scripts/dhis2-connect.js custom   # Enter custom URL
```

#### **Manual Setup:**
1. **Edit `.env.local` file** (create if it doesn't exist):
   ```
   DHIS2_BASE_URL=https://your-dhis2-server.org
   ```

2. **Restart development server:**
   ```bash
   npm start
   ```

### **Solution 2: DHIS2 CORS Allowlist (Production Ready)**

Ask your DHIS2 administrator to add your domain to the CORS allowlist:

#### **For Development:**
1. Login to DHIS2 as admin
2. Go to: **System Settings → Access → CORS allowlist**
3. Add: `http://localhost:3000`
4. Save settings

#### **For Production:**
1. Add your production domain: `https://your-app-domain.com`
2. Save settings

### **Solution 3: Browser Extension (Development Only)**

⚠️ **Warning**: Only use for development, never in production!

Install a CORS browser extension:
- **Chrome**: "CORS Unblock" or "Disable CORS"
- **Firefox**: "CORS Everywhere"

## 🛠 **Step-by-Step Fix for Your Current Issue**

### **Option A: Use Demo Server (Easiest)**
```bash
# Connect to DHIS2 demo server (no CORS issues)
node scripts/dhis2-connect.js demo
npm start
```

### **Option B: Configure Your External Server**
```bash
# Configure for your external DHIS2 server
node scripts/dhis2-connect.js custom
# Enter your DHIS2 URL when prompted
npm start
```

### **Option C: Use Local DHIS2**
```bash
# If you have DHIS2 running locally
node scripts/dhis2-connect.js local
npm start
```

## 🔍 **Verification Steps**

After applying a solution:

1. **Clear browser cache** and reload
2. **Check browser console** for errors
3. **Verify proxy is working**:
   - Open browser dev tools → Network tab
   - Try to create an assessment
   - Requests should go to `localhost:3000` (not directly to DHIS2)

## 📋 **Common CORS Error Messages**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "The user aborted a request" | CORS blocking | Use proxy or add to allowlist |
| "Access to fetch blocked by CORS" | Same as above | Same as above |
| "No 'Access-Control-Allow-Origin' header" | Server doesn't allow your domain | Add to CORS allowlist |

## 🚀 **Production Deployment**

For production deployment:

1. **Deploy on same domain as DHIS2** (no CORS issues)
2. **Or add your domain to DHIS2 CORS allowlist**
3. **Use HTTPS** for secure connections

## 🔧 **Advanced Configuration**

### **Multiple DHIS2 Instances**

Create different environment files:

```bash
# .env.development
DHIS2_BASE_URL=https://dev.dhis2.org

# .env.staging  
DHIS2_BASE_URL=https://staging.dhis2.org

# .env.production
DHIS2_BASE_URL=https://prod.dhis2.org
```

### **Custom Proxy Configuration**

Edit `d2.config.js` for advanced proxy settings:

```javascript
development: {
    port: 3000,
    proxy: {
        target: 'https://your-dhis2.org',
        changeOrigin: true,
        secure: true,
        headers: {
            'X-Forwarded-Proto': 'https'
        }
    }
}
```

## 🆘 **Still Having Issues?**

1. **Check DHIS2 server logs** for blocked requests
2. **Verify DHIS2 version compatibility** (2.38+ recommended)
3. **Test with curl**:
   ```bash
   curl -H "Origin: http://localhost:3000" https://your-dhis2.org/api/me
   ```
4. **Contact your DHIS2 administrator** for CORS allowlist access

## ✅ **Success Indicators**

You'll know it's working when:
- ✅ No CORS errors in browser console
- ✅ Network requests show `localhost:3000` as origin
- ✅ Assessment creation completes successfully
- ✅ DHIS2 API calls return data instead of errors

---

**Quick Fix**: Run `node scripts/dhis2-connect.js demo` and restart your dev server!