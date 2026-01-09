# 🧪 Postman+ Clone – API Testing Tool

A **lightweight, self-hosted Postman alternative** built with **HTML, Tailwind CSS, JavaScript, and PHP**, designed specifically for testing your **Messenger API** (or any RESTful service). This tool supports full test lifecycle management — from environment setup to execution, validation, and evidence collection — all in your browser.

---

## ✨ Features

### 🔐 **Authentication & Environment Management**
- Define and manage **environment variables** like `base_url`, `alice_token`, `userId`, etc.
- Use variables anywhere with `{{variable_name}}` syntax (e.g., `{{base_url}}/auth/login`)
- **Auto-extract and store JWT tokens** from `/auth/login` responses into your environment
- Save/load named environments (e.g., `Local`, `Staging`)

### 🧪 **Full HTTP Method Support**
- Test **GET, POST, PUT, PATCH, DELETE** requests
- Set custom **headers** (including `Authorization: Bearer {{token}}`)
- Send **raw JSON, plain text, or custom bodies**

### 🗂️ **Organized Test Structure**
- Create **Workspaces** (e.g., `Messenger API Tests`)
- Organize tests into **Modules** (e.g., `Auth`, `Users`, `Conversations`, `Messages`)
- Save unlimited **Requests** under each module with:
  - Unique names (e.g., `2.1 - Signup Alice`)
  - Full configuration (URL, method, headers, body, tests)
  - Timestamps for traceability

### ✅ **Postman-Style Test Scripts**
- Write **automated assertions** using familiar `pm.test()` syntax:
  ```js
  pm.test("Status is 200", () => pm.response.to.have.status(200));
  pm.test("Has token", () => pm.expect(pm.response.json()).to.have.property('token'));


