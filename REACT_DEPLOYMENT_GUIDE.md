# React JS Deployment Guide for Shared Hosting

This guide provides step-by-step instructions for deploying a React application (built with Vite or Create React App) to a standard shared hosting environment (e.g., Hostinger, GoDaddy, cPanel).

## Prerequisites
- Terminal access to your local React project.
- Access to your shared hosting account (cPanel, FTP, or File Manager).

---

## Step 1: Build the Application for Production

Before uploading, you need to compile your React code into static files.

1. Open your terminal and navigate to your React frontend directory:
   ```bash
   cd path/to/your/frontend
   ```
2. Run the build command:
   ```bash
   npm run build
   ```
   *(If you are using yarn, run `yarn build`)*

3. This process will create a production-ready folder:
   - **For Vite:** A `dist` folder is created.
   - **For Create React App (CRA):** A `build` folder is created.

---

## Step 2: Upload Files to Shared Hosting

You need to upload the **contents** of the build folder (not the folder itself) to your hosting server.

1. Log in to your hosting provider's control panel (e.g., cPanel).
2. Open the **File Manager**.
3. Navigate to the `public_html` directory (or the specific add-on domain folder if you are deploying to a subdomain/addon domain).
4. **Delete** any default files (like `index.php` or `default.html`) that might conflict.
5. **Upload** all the files and folders from inside your local `dist` or `build` folder directly into `public_html`.
   *(Tip: You can zip the contents of the folder locally, upload the `.zip` file to File Manager, and extract it there to save time).*

---

## Step 3: Handle Client-Side Routing (Crucial)

React apps are Single Page Applications (SPAs). If you use `react-router-dom`, navigating to a route like `yourdomain.com/about` and refreshing the page will cause a **404 Not Found** error on shared hosting. 

To fix this, you must tell the Apache server to route all traffic through `index.html`.

1. In your `public_html` folder (where your React files are now located), look for a file named `.htaccess`.
   *(Note: Ensure "Settings > Show Hidden Files" is enabled in cPanel if you don't see it).*
2. If `.htaccess` does not exist, create a new file and name it exactly `.htaccess`.
3. Open/Edit the `.htaccess` file and paste the following code:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

4. **Save** the file.

---

## Step 4: Subdirectory Deployment (Optional)

If you are deploying your React app into a subfolder (e.g., `yourdomain.com/crm/`), you need to make a few additional adjustments:

**1. Update Base Path:**
- **Vite:** Add `base: '/crm/'` to your `vite.config.js`.
- **CRA:** Add `"homepage": "/crm"` to your `package.json`.

**2. Update React Router base name:**
If using `react-router-dom` `<BrowserRouter>`, add the basename constraint:
```jsx
<BrowserRouter basename="/crm">
```

**3. Adjust the `.htaccess` RewriteBase:**
In the `.htaccess` file located inside your `/crm` folder, modify the RewriteBase to match your subdirectory:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /crm/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Summary Checklist
- [ ] Run `npm run build` locally.
- [ ] Upload `dist`/`build` contents to `public_html`.
- [ ] Add `.htaccess` file to handle SPA routing 404s.
- [ ] Test the live site and refresh a sub-route to ensure it loads properly.
