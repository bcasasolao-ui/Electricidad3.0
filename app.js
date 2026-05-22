const BASE_URL = "https://cors-anywhere.herokuapp.com/https://sistemapagosenergia.azurewebsites.net";
let authToken = localStorage.getItem("token") || null;
let userRol = localStorage.getItem("rol") || null;

// Inicializar el estado visual de autenticación al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    updateAuthStatusVisuals();
});

// Cambiar de Pestañas (Tabs)
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    const currentBtn = event ? event.currentTarget : null;
    if (currentBtn) {
        currentBtn.classList.add('active');
    }
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Actualizar textos de estado de Login
function updateAuthStatusVisuals() {
    const statusDiv = document.getElementById("auth-status");
    if (authToken) {
        statusDiv.textContent = `Conectado (${userRol})`;
        statusDiv.classList.add("logged-in");
    } else {
        statusDiv.textContent = "No autenticado";
        statusDiv.classList.remove("logged-in");
    }
}

// Imprimir respuestas en la "Consola" inferior
function logOutput(actionName, status, data) {
    const outputBlock = document.getElementById("api-output");
    const timestamp = new Date().toLocaleTimeString();
    outputBlock.textContent = `[${timestamp}] Acción: ${actionName}\nStatus: ${status}\nRespuesta: ${JSON.stringify(data, null, 2)}`;
}

// 1. Manejo del Login (POST /api/Auth/login) con validación de Proxy
async function handleLogin(event) {
    event.preventDefault();
    
    const credencial = document.getElementById("login-credencial").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch(`${BASE_URL}/api/Auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credencial, password })
        });

        const rawText = await response.text();

        // Validar si el proxy de cors-anywhere está bloqueando la petición por falta de activación
        if (response.status === 403 && rawText.includes("corsdemo")) {
            logOutput("Proxy Bloqueado", response.status, "Falta activación en el servidor demo.");
            alert("Acceso denegado por el proxy. Por favor, abre una pestaña, entra a https://cors-anywhere.herokuapp.com/corsdemo y activa el acceso temporal.");
            return;
        }

        let data = {};
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                data = { mensaje: rawText };
            }
        }

        if (response.ok) {
            authToken = data.token;
            userRol = data.rol;
            localStorage.setItem("token", data.token || "");
            localStorage.setItem("rol", data.rol || "");
            updateAuthStatusVisuals();
            logOutput("Login Exitoso", response.status, data);
            alert("¡Login Correcto!");
        } else {
            logOutput("Error de Login", response.status, data);
            alert(`Error: ${data.title || 'Credenciales inválidas o error en el servidor'}`);
        }
    } catch (error) {
        console.error(error);
        logOutput("Error de Red / Servidor", "FETCH_ERROR", error.message);
    }
}

// 2. Manejo Seguro de POSTs (Lecturas, Clientes, Pagos)
async function handlePost(endpoint, formElement, event) {
    event.preventDefault();

    const formData = new FormData(formElement);
    const bodyData = {};

    // Mapear dinámicamente campos respetando el esquema OpenAPI
    formData.forEach((value, key) => {
        if (key === 'kilovatios') {
            bodyData[key] = parseInt(value, 10);
        } else if (key === 'monto' || key === 'montoRecibido') {
            bodyData[key] = parseFloat(value);
        } else {
            bodyData[key] = value;
        }
    });

    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(bodyData)
        });

        const rawText = await response.text();

        // Validar bloqueo de proxy
        if (response.status === 403 && rawText.includes("corsdemo")) {
            logOutput("Proxy Bloqueado", response.status, "Falta activación en el servidor demo.");
            alert("Acceso denegado por el proxy. Por favor, abre una pestaña, entra a https://cors-anywhere.herokuapp.com/corsdemo y activa el acceso temporal.");
            return;
        }

        let data = {};
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch(e) {
                data = { mensaje: rawText };
            }
        }

        logOutput(`POST ${endpoint}`, response.status, data);
        
        if (response.ok) {
            alert("Operación realizada con éxito.");
            formElement.reset();
        } else {
            alert(`Error en el servidor: Código ${response.status}`);
        }

    } catch (error) {
        console.error(error);
        logOutput(`Error en POST ${endpoint}`, "FETCH_ERROR", error.message);
    }
}

// 3. Manejo de Consultas GET (Deudas del Banco)
async function handleConsultarDeuda(event) {
    event.preventDefault();
    const contador = document.getElementById("consulta-contador").value;
    const resBox = document.getElementById("resultado-deuda");

    const headers = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/Energia/Banco/consultar/${encodeURIComponent(contador)}`, {
            method: 'GET',
            headers: headers
        });

        const rawText = await response.text();

        // Validar bloqueo de proxy
        if (response.status === 403 && rawText.includes("corsdemo")) {
            logOutput("Proxy Bloqueado", response.status, "Falta activación en el servidor demo.");
            alert("Acceso denegado por el proxy. Por favor, abre una pestaña, entra a https://cors-anywhere.herokuapp.com/corsdemo y activa el acceso temporal.");
            return;
        }

        let data = {};
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch(e) {
                data = { mensaje: rawText };
            }
        }

        logOutput(`GET Consultar Deuda`, response.status, data);

        if (response.ok) {
            resBox.classList.remove("hidden");
            resBox.innerHTML = `
                <strong>Contador:</strong> ${data.numeroContador}<br>
                <strong>Saldo Pendiente:</strong> Q ${parseFloat(data.saldoPendiente).toFixed(2)}
            `;
        } else {
            resBox.classList.add("hidden");
            alert("No se pudo obtener la deuda del contador especificado.");
        }
    } catch (error) {
        console.error(error);
        logOutput("Error en consulta", "FETCH_ERROR", error.message);
    }
}
