# 🧪 Postman+ Clone – API Testing Tool

A **lightweight, self-hosted Postman alternative** built with **HTML, Tailwind CSS, JavaScript, and PHP**, designed for testing **RESTful APIs**—with first-class support for **Messenger API** workflows.

This tool runs entirely in your browser, requires **no database**, and is ideal for students, backend developers, and small teams who want a fast, local API testing solution.

---

## ✨ Features

### 🔐 Authentication & Environment Management

* Create and manage **environments** (e.g., `Local`, `Staging`)
* Define variables like `base_url`, `alice_token`, `userId`
* Use variables anywhere via `{{variable_name}}`

  ```
  {{base_url}}/auth/login
  ```
* **Auto-extract JWT tokens** from `/auth/login` responses and store them in the environment
* Save and load named environments using `localStorage`

---

### 🧪 Full HTTP Method Support

* Supported methods: **GET, POST, PUT, PATCH, DELETE**
* Custom headers (including `Authorization: Bearer {{token}}`)
* Request bodies:

  * Raw JSON
  * Plain text
  * Custom payloads

---

### 🗂️ Organized Test Structure

* **Workspaces** – e.g., `Messenger API Tests`
* **Modules** – e.g., `Auth`, `Users`, `Conversations`, `Messages`
* **Requests** under each module with:

  * Unique name (e.g., `2.1 - Signup Alice`)
  * Method, URL, headers, body, and tests
  * Auto timestamp for traceability

---

### ✅ Postman-Style Test Scripts

Write familiar assertions using `pm.test()` syntax:

```js
pm.test("Status is 200", () => pm.response.to.have.status(200));
pm.test("Has token", () => {
  pm.expect(pm.response.json()).to.have.property('token');
});
```

* Tests run **automatically after each request**
* Instant visual feedback on failures
* Environment variables can be set dynamically from responses

---

### 📊 Smart Response Handling

* Auto-detects **JSON responses**
* Pretty-printed, syntax-highlighted JSON output
* Raw text responses shown as-is for debugging

---

### 🔄 Import & Export

* Export **entire test suite** (workspaces + environments) as a single JSON file
* Import shared collections from teammates
* Ideal for **version control** and collaboration

---

### 🌙 Dark Theme UI

* Clean, modern UI inspired by Postman
* Sidebar navigation for workspaces, modules, and requests
* Responsive layout optimized for API testing

---

## 🛠️ Tech Stack

* **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript
* **Backend**: PHP (cURL proxy to bypass CORS)
* **Storage**: Browser `localStorage`
* **Database**: ❌ Not required
* **Dependencies**: ❌ None (fully self-contained)

---

## ▶️ How to Run

### Prerequisites

* PHP installed

  * Comes with **XAMPP**, **MAMP**, or preinstalled on macOS/Linux

### Steps

```bash
# 1. Clone or download this project
# 2. Open terminal in project folder
cd postman-plus

# 3. Start PHP development server
php -S localhost:8000

# 4. Open in browser
http://localhost:8000
```

> 💡 **Note:** Your Messenger API should be running at `http://localhost:8080` (as per your API documentation).

---

## 🧪 Example Workflow (Messenger API)

### 1️⃣ Create Environment

**Name:** Local

**Variables:**

* `base_url` → `http://localhost:8080`

---

### 2️⃣ Create Workspace

**Name:** Messenger API Tests

---

### 3️⃣ Add Module

**Name:** Auth

---

### 4️⃣ Save Request – Signup Alice

* **Method:** POST
* **URL:**

  ```
  {{base_url}}/auth/signup
  ```
* **Body (JSON):**

  ```json
  {
    "username": "alice_test",
    "email": "alice@test.com",
    "password": "1234"
  }
  ```
* **Tests:**

  ```js
  var json = pm.response.json();
  pm.environment.set("alice_id", json.userId);
  pm.test("Created", () => pm.response.to.have.status(201));
  ```

✔ Token and variables are auto-saved
✔ Request appears in sidebar with timestamp

Repeat for all test cases defined in your `STEP_BY_STEP_TESTING_GUIDE.txt`.

---

## 📁 Project Structure

```
postman-plus/
├── index.html          # Main UI
├── script.js           # Core logic (env, workspace, requests, tests)
├── api.php             # PHP cURL proxy (CORS bypass)
├── syntax.css          # JSON syntax highlighting
└── README.md           # Project documentation
```

---

## 🚧 Future Work

Planned features for upcoming releases:

* 🗑️ Delete Requests
* 🔍 Search & Filter across workspaces
* 🧩 Drag-and-drop reordering
* 🕘 Test history & execution logs
* ⚙️ Pre-request scripts (Postman-style)
* 📤 Export test evidence (responses/screenshots per test case)

---

<a href="https://youtu.be/fKsgbnic9uc"><img src="https://img.shields.io/badge/%E2%96%B6%20Watch%20Demo-YouTube-red?style=for-the-badge&logo=youtube" /></a>

---

## 📜 License

This project is open-source and free to use for educational and development purposes.

---

**Happy API Testing! 🚀**
