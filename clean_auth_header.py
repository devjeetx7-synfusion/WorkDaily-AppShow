import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Remove auth header container from header HTML
old_auth_block = """        <!-- Auth Profile / Google Sign-In Container -->
        <div id="wd-auth-header-container" class="wd-auth-header-wrap">
          <button class="wd-btn wd-btn-secondary wd-btn-sm" id="wd-google-login-btn">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
            <span class="wd-btn-text">Sign In</span>
          </button>
        </div>"""

html = html.replace(old_auth_block, '')

# 2. Remove WorkDailyAuth JS block if present
auth_js_pattern = r'/\* WORKDAILY AUTHENTICATION & USER IDENTITY SYSTEM \*/.*?(?=/\* CUSTOM WORKDAILY VIDEO PLAYER INTEGRATION)'
html = re.sub(auth_js_pattern, '', html, flags=re.DOTALL)
html = html.replace('    WorkDailyAuth.init();\n', '')

# 3. Clean category rendering in renderArticleView
old_labels_code = """        const labelsContainer = document.getElementById("wd-post-labels-container");
        if (labelsContainer) {
          const categoryName = post.category || "Article";
          labelsContainer.innerHTML = `<span class="wd-label-pill">${categoryName}</span>`;
        }"""

new_labels_code = """        const labelsContainer = document.getElementById("wd-post-labels-container");
        if (labelsContainer) {
          let cat = post.category;
          if (typeof cat === "object" && cat !== null) cat = cat.name || cat.term || "Article";
          const categoryName = (cat && typeof cat === "string" && !cat.includes("[object")) ? cat : "Article";
          labelsContainer.innerHTML = `<span class="wd-label-pill">${categoryName}</span>`;
        }"""

html = html.replace(old_labels_code, new_labels_code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

theme_xml = html.replace('<style>', '<b:skin><![CDATA[').replace('</style>', ']]></b:skin>')
with open('theme.xml', 'w', encoding='utf-8') as f:
    f.write(theme_xml)

print("Cleaned auth header and label formatting!")
