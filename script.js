// =============
// STATE
// =============
let currentWorkspace = null;
let currentModule = null;
let currentEnvironment = { name: 'Default', vars: {} };

// =============
// UI UTILS
// =============
function showTab(tab) {
  ['body', 'headers', 'tests'].forEach(t => {
    document.getElementById(t + 'Tab').classList.toggle('hidden', t !== tab);
    document.querySelector(`.tab[onclick="showTab('${t}')"]`).classList.toggle('active', t === tab);
  });
}

function clearForm() {
  document.getElementById('url').value = '';
  document.getElementById('bodyInput').value = '';
  document.getElementById('headersInput').value = '';
  document.getElementById('testsInput').value = '';
  document.getElementById('requestName').value = '';
}

// =============
// ENVIRONMENTS
// =============
function renderEnvVars() {
  const list = document.getElementById('envVarsList');
  list.innerHTML = '';
  for (const [key, value] of Object.entries(currentEnvironment.vars)) {
    const div = document.createElement('div');
    div.className = 'env-row';
    div.innerHTML = `
      <span class="env-key">${key}</span>
      <span class="env-val">${value}</span>
      <button onclick="deleteEnvVar('${key}')" class="bg-red-700 text-white px-1 rounded text-xs">✕</button>
    `;
    list.appendChild(div);
  }
}

function addEnvVar() {
  const key = document.getElementById('newVarKey').value.trim();
  const value = document.getElementById('newVarValue').value.trim();
  if (!key) return alert('Key is required');
  currentEnvironment.vars[key] = value;
  renderEnvVars();
  document.getElementById('newVarKey').value = '';
  document.getElementById('newVarValue').value = '';
}

function deleteEnvVar(key) {
  delete currentEnvironment.vars[key];
  renderEnvVars();
}

function saveEnvironment() {
  const name = document.getElementById('envNameInput').value.trim() || 'Default';
  const saved = JSON.parse(localStorage.getItem('environments') || '{}');
  saved[name] = currentEnvironment.vars;
  localStorage.setItem('environments', JSON.stringify(saved));
  currentEnvironment.name = name;
  alert(`Environment "${name}" saved!`);
}

function substituteEnvVars(str) {
  if (!str) return str;
  let result = str;
  for (const [key, value] of Object.entries(currentEnvironment.vars)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

function autoStoreTokenFromResponse(responseText) {
  try {
    const json = JSON.parse(responseText);
    if (json.token) {
      currentEnvironment.vars['token'] = json.token;
    }
    if (json.userId) {
      currentEnvironment.vars['userId'] = json.userId;
    }
    renderEnvVars();
  } catch (e) { /* ignore */ }
}

// =============
// WORKSPACES / MODULES / REQUESTS
// =============
function loadWorkspaces() {
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  const list = document.getElementById('workspacesList');
  list.innerHTML = '';

  workspaces.forEach(ws => {
    const wsDiv = document.createElement('div');
    wsDiv.className = 'mb-2';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-2 bg-gray-800 rounded';
    header.innerHTML = `<span>📁 ${ws.name}</span>`;
    header.onclick = () => selectWorkspace(ws.name);
    wsDiv.appendChild(header);

    const modulesDiv = document.createElement('div');
    modulesDiv.className = 'ml-2 mt-1 space-y-1';

    ws.modules.forEach(mod => {
      const modDiv = document.createElement('div');
      modDiv.className = 'bg-gray-700 rounded p-2';

      const modName = document.createElement('div');
      modName.className = 'font-medium text-sm cursor-pointer';
      modName.textContent = '📂 ' + mod.name;
      modName.onclick = (e) => {
        e.stopPropagation();
        selectModule(ws.name, mod.name);
      };
      modDiv.appendChild(modName);

      const reqList = document.createElement('div');
      reqList.className = 'ml-2 mt-1 space-y-1';

      mod.requests.forEach(req => {
        const reqItem = document.createElement('div');
        reqItem.className = 'text-xs bg-gray-600 p-1 rounded cursor-pointer flex justify-between';
        reqItem.innerHTML = `
          <span>📄 ${req.name}</span>
          <span class="text-gray-400 text-xs">${new Date(req.timestamp).toLocaleTimeString()}</span>
        `;
        reqItem.onclick = (e) => {
          e.stopPropagation();
          loadRequest(req);
        };
        reqList.appendChild(reqItem);
      });

      modDiv.appendChild(reqList);
      modulesDiv.appendChild(modDiv);
    });

    wsDiv.appendChild(modulesDiv);

    const addBtn = document.createElement('button');
    addBtn.className = 'mt-1 w-full text-xs bg-yellow-700 text-white rounded py-0.5';
    addBtn.textContent = '+ Add Module';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      const name = prompt(`Add module to "${ws.name}"`);
      if (name && name.trim()) createModule(ws.name, name.trim());
    };
    wsDiv.appendChild(addBtn);

    list.appendChild(wsDiv);
  });
}

function createWorkspaceUI() {
  const name = prompt('Enter workspace name:');
  if (!name || !name.trim()) return;
  createWorkspace(name.trim());
}

function createWorkspace(name) {
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  if (workspaces.some(ws => ws.name === name)) {
    alert(`Workspace "${name}" already exists!`);
    return;
  }
  workspaces.push({ name, modules: [] });
  localStorage.setItem('workspaces', JSON.stringify(workspaces));
  loadWorkspaces();
}

function createModule(workspaceName, moduleName) {
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  const ws = workspaces.find(w => w.name === workspaceName);
  if (!ws) return;
  if (ws.modules.some(m => m.name === moduleName)) {
    alert(`Module "${moduleName}" already exists!`);
    return;
  }
  ws.modules.push({ name: moduleName, requests: [] });
  localStorage.setItem('workspaces', JSON.stringify(workspaces));
  loadWorkspaces();
}

function selectWorkspace(name) {
  currentWorkspace = name;
}

function selectModule(ws, mod) {
  currentWorkspace = ws;
  currentModule = mod;
}

// ===== SAVE REQUEST =====
function saveRequest() {
  const name = document.getElementById('requestName').value.trim();
  if (!name || !currentModule) return alert('Select a module and enter request name');

  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  const ws = workspaces.find(w => w.name === currentWorkspace);
  const mod = ws.modules.find(m => m.name === currentModule);

  // Generate unique ID for this request
  const requestId = Date.now(); // Simple unique ID

  const request = {
    id: requestId,
    name,
    method: document.getElementById('method').value,
    url: document.getElementById('url').value,
    headers: document.getElementById('headersInput').value,
    body: document.getElementById('bodyInput').value,
    tests: document.getElementById('testsInput').value,
    timestamp: new Date().toISOString()
  };

  // Check if request with same name exists — if yes, ask to overwrite or rename
  const existingIndex = mod.requests.findIndex(r => r.name === name);
  if (existingIndex !== -1) {
    const choice = confirm(`A request named "${name}" already exists. Overwrite?`);
    if (choice) {
      mod.requests[existingIndex] = request;
    } else {
      const newName = prompt('Enter new name:', name + '_copy');
      if (!newName) return;
      request.name = newName;
      mod.requests.push(request);
    }
  } else {
    mod.requests.push(request);
  }

  localStorage.setItem('workspaces', JSON.stringify(workspaces));
  alert(`✅ Request "${name}" saved!`);
  loadWorkspaces(); // Refresh UI
}


// ===== LOAD REQUEST =====
function loadRequest(req) {
  document.getElementById('method').value = req.method;
  document.getElementById('url').value = req.url;
  document.getElementById('headersInput').value = req.headers;
  document.getElementById('bodyInput').value = req.body;
  document.getElementById('testsInput').value = req.tests;
  document.getElementById('requestName').value = req.name;

  // Show/hide body section
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    document.getElementById('postBodySection').classList.remove('hidden');
  } else {
    document.getElementById('postBodySection').classList.add('hidden');
  }

  console.log('Loaded Request:', req.name);
}

// =============
// SEND REQUEST
// =============
async function sendRequest() {
  let method = document.getElementById('method').value;
  let url = document.getElementById('url').value.trim();
  let body = document.getElementById('bodyInput').value.trim();
  let headersText = document.getElementById('headersInput').value.trim();
  let testsCode = document.getElementById('testsInput').value.trim();

  if (!url) return alert('URL is required');

  url = substituteEnvVars(url);
  body = substituteEnvVars(body);
  headersText = substituteEnvVars(headersText);

  const headers = {};
  if (headersText) {
    headersText.split('\n').forEach(line => {
      const [key, val] = line.split(':').map(s => s.trim());
      if (key && val) headers[key] = val;
    });
  }

  if (currentEnvironment.vars.token && !headers.Authorization) {
    headers.Authorization = `Bearer ${currentEnvironment.vars.token}`;
  }

  const params = new URLSearchParams();
  params.append('url', url);
  params.append('method', method);
  if (body) params.append('body', body);
  params.append('headers', JSON.stringify(headers));

  try {
    const res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const responseText = await res.text();
    autoStoreTokenFromResponse(responseText);
    renderResponse(responseText);
    if (testsCode) runTests(responseText, res.status);

  } catch (err) {
    document.getElementById('response').textContent = '❌ Network error: ' + err.message;
  }
}

// =============
// RESPONSE & TESTS
// =============
function renderResponse(text) {
  try {
    const json = JSON.parse(text);
    const formatted = JSON.stringify(json, null, 2);
    const highlighted = formatJSON(formatted);
    document.getElementById('response').innerHTML = '<code>' + highlighted + '</code>';
  } catch (e) {
    document.getElementById('response').textContent = text;
  }
}

function formatJSON(json) {
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, match => {
    let cls = 'json-number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) cls = 'json-key';
      else cls = 'json-string';
    } else if (/true|false/.test(match)) cls = 'json-boolean';
    else if (/null/.test(match)) cls = 'json-null';
    return `<span class="${cls}">${match}</span>`;
  });
}

function runTests(responseText, statusCode) {
  const pm = {
    response: {
      text: () => responseText,
      json: () => JSON.parse(responseText),
      to: {
        have: {
          status: (code) => {
            if (statusCode !== code) throw new Error(`Expected status ${code}, got ${statusCode}`);
          }
        }
      }
    },
    expect: (val) => ({
      to: {
        equal: (expected) => {
          if (val !== expected) throw new Error(`Expected ${expected}, got ${val}`);
        },
        have: {
          property: (prop) => {
            if (!(prop in val)) throw new Error(`Missing property: ${prop}`);
          }
        }
      }
    }),
    test: (name, fn) => {
      try {
        fn();
        console.log(`✅ ${name}`);
      } catch (err) {
        console.error(`❌ ${name}: ${err.message}`);
        alert(`Test FAILED: ${name}\n${err.message}`);
      }
    }
  };
  try {
    new Function('pm', testsCode)(pm);
  } catch (err) {
    alert('Test script error:\n' + err.message);
  }
}

// =============
// IMPORT / EXPORT
// =============
function exportCollection() {
  const data = {
    workspaces: JSON.parse(localStorage.getItem('workspaces') || '[]'),
    environments: JSON.parse(localStorage.getItem('environments') || '{}')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'postman-collection.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importCollection() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        localStorage.setItem('workspaces', JSON.stringify(data.workspaces || []));
        localStorage.setItem('environments', JSON.stringify(data.environments || {}));
        loadWorkspaces();
        currentEnvironment.vars = data.environments?.Default || {};
        renderEnvVars();
        alert('Imported!');
      } catch (err) {
        alert('Invalid file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
function saveRequestAs() {
  const name = prompt('Enter new request name:');
  if (!name) return;
  document.getElementById('requestName').value = name;
  saveRequest();
}
// =============
// INIT
// =============
window.onload = () => {
  // Load env
  const envs = JSON.parse(localStorage.getItem('environments') || '{}');
  currentEnvironment.vars = envs['Local'] || envs['Default'] || {
    base_url: 'http://localhost:8080',
    token: '',
    userId: '',
    alice_id: '',
    bob_id: '',
    conversation_id: ''
  };
  renderEnvVars();

  // Load workspaces
  loadWorkspaces();
};