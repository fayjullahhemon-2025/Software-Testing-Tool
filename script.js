// =============
// STATE
// =============
let currentWorkspace = null;
let currentModule = null;
let activeRequest = null;
let currentEnvironment = { name: 'Default', vars: {} };
let currentTestResults = [];

// =============
// UI UTILS
// =============
function showTab(tab) {
  ['body', 'headers', 'tests'].forEach(t => {
    const el = document.getElementById(t + 'Tab');
    if (el) el.classList.toggle('hidden', t !== tab);
    const btn = document.querySelector(`.tab-btn[onclick="showTab('${t}')"]`);
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function showResponseTab(tab) {
  ['body', 'raw', 'tests'].forEach(t => {
    const el = document.getElementById('response' + t.charAt(0).toUpperCase() + t.slice(1) + 'Tab');
    if (el) el.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('resTab' + t.charAt(0).toUpperCase() + t.slice(1) + 'Btn');
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function clearForm() {
  document.getElementById('url').value = '';
  document.getElementById('bodyInput').value = '';
  document.getElementById('headersInput').value = '';
  document.getElementById('testsInput').value = '';
  document.getElementById('requestName').value = '';
  activeRequest = null;
  loadWorkspaces();
}

// =============
// ENVIRONMENTS
// =============
function toggleEnvManager() {
  const drawer = document.getElementById('envManagerDrawer');
  drawer.classList.toggle('translate-x-full');
}

function populateEnvDropdown() {
  const envSelector = document.getElementById('envSelector');
  envSelector.innerHTML = '<option value="Default" class="bg-slate-950">Default</option>';
  const envs = JSON.parse(localStorage.getItem('environments') || '{}');
  for (const name of Object.keys(envs)) {
    if (name !== 'Default') {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      option.className = 'bg-slate-950';
      envSelector.appendChild(option);
    }
  }
  envSelector.value = currentEnvironment.name || 'Default';
}

function switchEnvironment(envName) {
  const envs = JSON.parse(localStorage.getItem('environments') || '{}');
  if (envName === 'Default') {
    currentEnvironment = { name: 'Default', vars: {} };
  } else {
    currentEnvironment = { name: envName, vars: envs[envName] || {} };
  }
  document.getElementById('envNameInput').value = currentEnvironment.name === 'Default' ? '' : currentEnvironment.name;
  renderEnvVars();
}

function renderEnvVars() {
  const list = document.getElementById('envVarsList');
  list.innerHTML = '';
  
  const entries = Object.entries(currentEnvironment.vars);
  
  const countBadge = document.getElementById('envVarCount');
  if (countBadge) {
    countBadge.textContent = `${entries.length} item${entries.length !== 1 ? 's' : ''}`;
  }
  
  if (entries.length === 0) {
    list.innerHTML = `
      <div class="text-center py-4 text-xs text-slate-650 font-medium">
        No variables in this environment.
      </div>
    `;
    return;
  }

  for (const [key, value] of entries) {
    const div = document.createElement('div');
    div.className = 'flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded p-2';
    div.innerHTML = `
      <div class="flex-1 min-w-0">
        <div class="text-[11px] font-bold text-indigo-400 font-mono truncate" title="${key}">${key}</div>
        <div class="text-[10px] text-slate-400 font-mono truncate mt-0.5" title="${value}">${value}</div>
      </div>
      <button onclick="deleteEnvVar('${key}')" class="text-slate-500 hover:text-rose-400 p-1 hover:bg-slate-800 rounded transition-all" title="Delete variable">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
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
  if (name === 'Default') return alert('Cannot overwrite "Default" environment name. Please type a custom name.');
  const saved = JSON.parse(localStorage.getItem('environments') || '{}');
  saved[name] = currentEnvironment.vars;
  localStorage.setItem('environments', JSON.stringify(saved));
  currentEnvironment.name = name;
  populateEnvDropdown();
  renderEnvVars();
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

  if (workspaces.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-500 font-medium">
        No workspaces active.<br>Click '+' to create one.
      </div>
    `;
    return;
  }

  workspaces.forEach(ws => {
    const isWsActive = currentWorkspace === ws.name;
    const wsDiv = document.createElement('div');
    wsDiv.className = `mb-3 rounded-lg overflow-hidden border ${isWsActive ? 'border-indigo-900/40 bg-indigo-950/5' : 'border-slate-900/40 bg-slate-950/20'}`;

    const header = document.createElement('div');
    header.className = `flex justify-between items-center p-2.5 cursor-pointer transition-all ${isWsActive ? 'bg-indigo-950/20 text-indigo-300 font-bold' : 'bg-slate-900/40 hover:bg-slate-900/60 text-slate-300'}`;
    header.innerHTML = `
      <div class="flex items-center gap-2 truncate">
        <svg class="w-4 h-4 shrink-0 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
        <span class="text-xs truncate">${ws.name}</span>
      </div>
    `;
    header.onclick = () => {
      selectWorkspace(ws.name);
      loadWorkspaces();
    };
    wsDiv.appendChild(header);

    const modulesDiv = document.createElement('div');
    modulesDiv.className = `p-2 space-y-2 ${isWsActive ? 'block' : 'hidden'}`;

    if (ws.modules.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'text-[10px] text-slate-600 font-medium text-center py-2';
      emptyMsg.textContent = 'No modules. Add one below.';
      modulesDiv.appendChild(emptyMsg);
    }

    ws.modules.forEach(mod => {
      const isModActive = isWsActive && currentModule === mod.name;
      const modDiv = document.createElement('div');
      modDiv.className = `rounded border ${isModActive ? 'border-slate-800 bg-slate-900/40' : 'border-slate-900/30 bg-slate-950/10'} p-2`;

      const modName = document.createElement('div');
      modName.className = `font-semibold text-xs cursor-pointer flex items-center justify-between mb-1 ${isModActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-300'}`;
      modName.innerHTML = `
        <div class="flex items-center gap-1.5 truncate">
          <svg class="w-3.5 h-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h5l2 2h5a2 2 0 012 2v8a2 2 0 01-2 2H5z"></path>
          </svg>
          <span class="truncate">${mod.name}</span>
        </div>
      `;
      modName.onclick = (e) => {
        e.stopPropagation();
        selectModule(ws.name, mod.name);
        loadWorkspaces();
      };
      modDiv.appendChild(modName);

      const reqList = document.createElement('div');
      reqList.className = 'space-y-1 mt-1.5 pl-2 border-l border-slate-800';

      if (mod.requests.length === 0) {
        const emptyReq = document.createElement('div');
        emptyReq.className = 'text-[9px] text-slate-750 italic py-1';
        emptyReq.textContent = 'Empty module';
        reqList.appendChild(emptyReq);
      }

      mod.requests.forEach(req => {
        const isReqActive = activeRequest === (req.id || req.name);
        const reqItem = document.createElement('div');
        reqItem.className = `text-[11px] p-1.5 rounded cursor-pointer flex items-center justify-between gap-2 transition-all ${isReqActive ? 'bg-indigo-950/40 border border-indigo-900/30 text-slate-100 font-semibold' : 'bg-slate-950/20 hover:bg-slate-900/30 border border-transparent text-slate-400 hover:text-slate-200'}`;
        
        let methodClass = 'text-[9px] font-bold uppercase w-10 text-center shrink-0 px-1 py-0.5 rounded ';
        if (req.method === 'GET') methodClass += 'method-badge-get';
        else if (req.method === 'POST') methodClass += 'method-badge-post';
        else if (req.method === 'PUT') methodClass += 'method-badge-put';
        else if (req.method === 'PATCH') methodClass += 'method-badge-patch';
        else if (req.method === 'DELETE') methodClass += 'method-badge-delete';
        else methodClass += 'bg-slate-800 text-slate-300 border border-slate-700';

        reqItem.innerHTML = `
          <div class="flex items-center gap-1.5 truncate flex-1 min-w-0">
            <span class="${methodClass}">${req.method}</span>
            <span class="truncate text-[10.5px]">${req.name}</span>
          </div>
          <span class="text-[9px] text-slate-500 font-mono shrink-0">${new Date(req.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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

    if (isWsActive) {
      const addBtn = document.createElement('button');
      addBtn.className = 'w-full text-[10px] text-indigo-400 bg-indigo-950/20 hover:bg-indigo-900/20 py-1.5 px-3 flex items-center justify-center gap-1 border-t border-indigo-950/30 font-semibold transition-all duration-200';
      addBtn.innerHTML = `
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        Add Module
      `;
      addBtn.onclick = (e) => {
        e.stopPropagation();
        const name = prompt(`Add module to "${ws.name}"`);
        if (name && name.trim()) createModule(ws.name, name.trim());
      };
      wsDiv.appendChild(addBtn);
    }

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
  currentWorkspace = name;
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
  currentWorkspace = workspaceName;
  currentModule = moduleName;
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
  if (!name || !currentModule) return alert('Select a module from the sidebar and enter a request name first.');

  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  const ws = workspaces.find(w => w.name === currentWorkspace);
  const mod = ws.modules.find(m => m.name === currentModule);

  const requestId = activeRequest || Date.now();

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

  const existingIndex = mod.requests.findIndex(r => r.name === name || (activeRequest && r.id === activeRequest));
  if (existingIndex !== -1) {
    if (activeRequest) {
      mod.requests[existingIndex] = request;
    } else {
      const choice = confirm(`A request named "${name}" already exists. Overwrite?`);
      if (choice) {
        mod.requests[existingIndex] = request;
      } else {
        const newName = prompt('Enter new name:', name + '_copy');
        if (!newName) return;
        request.name = newName;
        request.id = Date.now();
        mod.requests.push(request);
      }
    }
  } else {
    mod.requests.push(request);
  }

  localStorage.setItem('workspaces', JSON.stringify(workspaces));
  activeRequest = request.id;
  alert(`✅ Request "${request.name}" saved!`);
  loadWorkspaces();
}

// ===== LOAD REQUEST =====
function loadRequest(req) {
  activeRequest = req.id || req.name;
  document.getElementById('method').value = req.method;
  document.getElementById('url').value = req.url;
  document.getElementById('headersInput').value = req.headers || '';
  document.getElementById('bodyInput').value = req.body || '';
  document.getElementById('testsInput').value = req.tests || '';
  document.getElementById('requestName').value = req.name;

  loadWorkspaces();
  
  // Clean response areas
  document.getElementById('responseStatusBadge').classList.add('hidden');
  document.getElementById('responseTimeBadge').classList.add('hidden');
  document.getElementById('response').innerHTML = '';
  document.getElementById('responseRaw').value = '';
  
  // Clear test displays
  document.getElementById('testResultsPlaceholder').classList.remove('hidden');
  document.getElementById('testResultsList').classList.add('hidden');
  document.getElementById('testResultsList').innerHTML = '';
  document.getElementById('testResultsCounter').classList.add('hidden');
  currentTestResults = [];

  showResponseTab('body');
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

  // Activate loading spinners
  const sendBtn = document.getElementById('sendBtn');
  const sendText = document.getElementById('sendBtnText');
  const sendIcon = document.getElementById('sendBtnIcon');
  const sendSpinner = document.getElementById('sendBtnSpinner');

  sendBtn.disabled = true;
  sendText.textContent = 'Sending...';
  sendIcon.classList.add('hidden');
  sendSpinner.classList.remove('hidden');

  url = substituteEnvVars(url);
  body = substituteEnvVars(body);
  headersText = substituteEnvVars(headersText);

  const headers = {};
  if (headersText) {
    headersText.split('\n').forEach(line => {
      const parts = line.split(':');
      const key = parts[0]?.trim();
      const val = parts.slice(1).join(':')?.trim();
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

  const startTime = performance.now();

  try {
    const res = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const duration = Math.round(performance.now() - startTime);
    const responseText = await res.text();
    
    // Auto token extractions
    autoStoreTokenFromResponse(responseText);
    
    // Render Response
    renderResponse(responseText);
    
    // Populate raw view
    document.getElementById('responseRaw').value = responseText;
    
    // Show response stats badges
    const statusBadge = document.getElementById('responseStatusBadge');
    const statusDot = document.getElementById('responseStatusDot');
    const statusText = document.getElementById('responseStatusText');
    const timeBadge = document.getElementById('responseTimeBadge');
    const timeText = document.getElementById('responseTimeText');

    statusBadge.classList.remove('hidden');
    timeBadge.classList.remove('hidden');

    timeText.textContent = `${duration} ms`;
    statusText.textContent = `${res.status} ${getStatusMessage(res.status) || res.statusText || 'Response'}`;
    
    if (res.status >= 200 && res.status < 300) {
      statusBadge.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950/20 text-emerald-400 border border-emerald-900/40 shadow-sm flex items-center gap-1.5';
      statusDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-400 active-glow';
    } else if (res.status >= 300 && res.status < 400) {
      statusBadge.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-950/20 text-amber-400 border border-amber-900/40 shadow-sm flex items-center gap-1.5';
      statusDot.className = 'w-1.5 h-1.5 rounded-full bg-amber-400';
    } else {
      statusBadge.className = 'px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-950/20 text-rose-400 border border-rose-900/40 shadow-sm flex items-center gap-1.5';
      statusDot.className = 'w-1.5 h-1.5 rounded-full bg-rose-400 active-glow';
    }

    // Run tests if any
    currentTestResults = [];
    if (testsCode) {
      runTests(responseText, res.status);
    } else {
      renderTestResults();
    }

  } catch (err) {
    console.error('API Send Error:', err);
    document.getElementById('response').textContent = 'Error connecting to proxy: ' + err.message;
    document.getElementById('responseRaw').value = 'Error: ' + err.message;
  } finally {
    // Restore button state
    sendBtn.disabled = false;
    sendText.textContent = 'Send';
    sendIcon.classList.remove('hidden');
    sendSpinner.classList.add('hidden');
  }
}

function getStatusMessage(status) {
  const codes = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict',
    500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
  };
  return codes[status] || '';
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
      json: () => {
        try {
          return JSON.parse(responseText);
        } catch (e) {
          return null;
        }
      },
      to: {
        have: {
          status: (code) => {
            if (statusCode !== code) {
              throw new Error(`Expected status "${code}" but received "${statusCode}"`);
            }
          }
        }
      }
    },
    environment: {
      set: (key, value) => {
        currentEnvironment.vars[key] = value;
        renderEnvVars();
        console.log(`Environment variable "${key}" set to "${value}"`);
      },
      get: (key) => currentEnvironment.vars[key]
    },
    expect: (val) => ({
      to: {
        equal: (expected) => {
          if (val !== expected) {
            throw new Error(`Expected "${expected}" but received "${val}"`);
          }
        },
        have: {
          property: (prop) => {
            if (val === null || typeof val !== 'object' || !(prop in val)) {
              throw new Error(`Expected object to contain property "${prop}"`);
            }
          }
        }
      }
    }),
    test: (name, fn) => {
      try {
        fn();
        currentTestResults.push({ name, passed: true });
        console.log(`✅ Test passed: ${name}`);
      } catch (err) {
        currentTestResults.push({ name, passed: false, error: err.message });
        console.warn(`❌ Test failed: ${name}. ${err.message}`);
      }
    }
  };

  const testsCode = document.getElementById('testsInput').value.trim();

  if (!testsCode) {
    renderTestResults();
    return;
  }

  try {
    new Function('pm', testsCode)(pm);
  } catch (err) {
    currentTestResults.push({ name: 'Compilation Error', passed: false, error: err.message });
  }

  renderTestResults();
}

function renderTestResults() {
  const list = document.getElementById('testResultsList');
  const placeholder = document.getElementById('testResultsPlaceholder');
  const counterBadge = document.getElementById('testResultsCounter');
  
  list.innerHTML = '';
  
  if (currentTestResults.length === 0) {
    placeholder.classList.remove('hidden');
    list.classList.add('hidden');
    counterBadge.classList.add('hidden');
    return;
  }

  placeholder.classList.add('hidden');
  list.classList.remove('hidden');
  
  let passedCount = 0;
  
  currentTestResults.forEach(res => {
    if (res.passed) passedCount++;
    
    const div = document.createElement('div');
    div.className = `flex items-start gap-2.5 p-3 rounded-lg border ${res.passed ? 'bg-emerald-950/15 border-emerald-900/30' : 'bg-rose-950/15 border-rose-900/30'}`;
    
    const icon = res.passed 
      ? `<svg class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>`
      : `<svg class="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>`;
       
    div.innerHTML = `
      ${icon}
      <div class="flex-1 min-w-0">
        <div class="text-xs font-semibold ${res.passed ? 'text-emerald-400' : 'text-rose-400'}">${res.name}</div>
        ${!res.passed && res.error ? `<div class="text-[10px] text-rose-300 font-mono mt-1">${res.error}</div>` : ''}
      </div>
    `;
    list.appendChild(div);
  });
  
  counterBadge.textContent = `${passedCount}/${currentTestResults.length}`;
  counterBadge.classList.remove('hidden');
  
  if (passedCount === currentTestResults.length) {
    counterBadge.className = 'ml-1.5 px-1.5 py-0.2 bg-emerald-950/40 text-emerald-400 rounded-full font-bold border border-emerald-900/40 text-[10px]';
  } else {
    counterBadge.className = 'ml-1.5 px-1.5 py-0.2 bg-rose-950/40 text-rose-450 rounded-full font-bold border border-rose-900/40 text-[10px]';
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
        
        // Find default env
        const envNames = Object.keys(data.environments || {});
        const defaultName = envNames.includes('Local') ? 'Local' : (envNames[0] || 'Default');
        
        currentEnvironment.name = defaultName;
        currentEnvironment.vars = data.environments?.[defaultName] || {};
        
        populateEnvDropdown();
        renderEnvVars();
        loadWorkspaces();
        alert('Suite imported successfully!');
      } catch (err) {
        alert('Invalid collection file: ' + err.message);
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
  activeRequest = null; // Forces creation of a copy rather than overwriting
  saveRequest();
}

// =============
// INIT
// =============
window.onload = () => {
  // Load environments
  const envs = JSON.parse(localStorage.getItem('environments') || '{}');
  
  // Set default workspace from storage if available
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  if (workspaces.length > 0) {
    currentWorkspace = workspaces[0].name;
    if (workspaces[0].modules.length > 0) {
      currentModule = workspaces[0].modules[0].name;
    }
  }

  currentEnvironment.name = envs['Local'] ? 'Local' : (Object.keys(envs)[0] || 'Default');
  currentEnvironment.vars = envs[currentEnvironment.name] || envs['Default'] || {
    base_url: 'http://localhost:8080',
    token: '',
    userId: '',
    alice_id: '',
    bob_id: '',
    conversation_id: ''
  };

  populateEnvDropdown();
  renderEnvVars();
  loadWorkspaces();
};