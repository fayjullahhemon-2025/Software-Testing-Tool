🧪 Postman+ Clone – API Testing Tool
A lightweight, self-hosted Postman alternative built with HTML, Tailwind CSS, JavaScript, and PHP, designed specifically for testing your Messenger API (or any RESTful service). This tool supports full test lifecycle management — from environment setup to execution, validation, and evidence collection — all in your browser.
✨ Features
🔐 Authentication & Environment Management
Define and manage environment variables like base_url, alice_token, userId, etc.
Use variables anywhere with {{variable_name}} syntax (e.g., {{base_url}}/auth/login)
Auto-extract and store JWT tokens from /auth/login responses into your environment
Save/load named environments (e.g., Local, Staging)
🧪 Full HTTP Method Support
Test GET, POST, PUT, PATCH, DELETE requests
Set custom headers (including Authorization: Bearer {{token}})
Send raw JSON, plain text, or custom bodies
