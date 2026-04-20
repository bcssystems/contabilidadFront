// ========================================
// BC Systems - API Client
// ========================================

const API_BASE_URL = '/api/v1';

class ApiClient {
    constructor() {
        this.accessToken = localStorage.getItem('access_token');
        this.refreshTokenValue = localStorage.getItem('refresh_token');
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        return headers;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            console.log(`[API] ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);

            if (response.status === 401 && this.refreshTokenValue) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this.request(endpoint, options);
                } else {
                    this.logout();
                    window.location.href = 'index.html';
                }
            }

            if (response.status === 403) {
                const error = await response.json().catch(() => ({ message: 'Acceso denegido (403). Verifica tus permisos o el token.' }));
                throw new Error(error.message || 'Error 403: Acceso denegado');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Error desconocido' }));
                throw new Error(error.message || `Error ${response.status}`);
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.refreshTokenValue}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.refreshTokenValue = data.refresh_token;

            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);

            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    // Auth
    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.access_token && response.refresh_token) {
            this.accessToken = response.access_token;
            this.refreshTokenValue = response.refresh_token;
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            return true;
        }
        return false;
    }

    logout() {
        this.accessToken = null;
        this.refreshTokenValue = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    // Proveedores
    async getProveedores(page = 0, size = 20, sortBy = 'idProveedor', sortDir = 'asc') {
        return this.request(`/proveedor?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getProveedor(id) {
        return this.request(`/proveedor/${id}`);
    }

    async createProveedor(data) {
        return this.request('/proveedor', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateProveedor(id, data) {
        return this.request(`/proveedor/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteProveedor(id) {
        return this.request(`/proveedor/${id}`, {
            method: 'DELETE'
        });
    }

    // Compras
    async getCompras(page = 0, size = 20, sortBy = 'idCompra', sortDir = 'asc') {
        return this.request(`/compra?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getCompra(id) {
        return this.request(`/compra/${id}`);
    }

    async createCompra(data) {
        return this.request('/compra', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCompra(id, data) {
        return this.request(`/compra/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCompra(id) {
        return this.request(`/compra/${id}`, {
            method: 'DELETE'
        });
    }

    // Ventas
    async getVentas(page = 0, size = 20, sortBy = 'idVenta', sortDir = 'asc') {
        return this.request(`/venta?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getVenta(id) {
        return this.request(`/venta/${id}`);
    }

    async createVenta(data) {
        return this.request('/venta', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateVenta(id, data) {
        return this.request(`/venta/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteVenta(id) {
        return this.request(`/venta/${id}`, {
            method: 'DELETE'
        });
    }

    // Gastos
    async getGastos(page = 0, size = 20, sortBy = 'idGasto', sortDir = 'asc') {
        return this.request(`/gasto?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getGasto(id) {
        return this.request(`/gasto/${id}`);
    }

    async createGasto(data) {
        return this.request('/gasto', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateGasto(id, data) {
        return this.request(`/gasto/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteGasto(id) {
        return this.request(`/gasto/${id}`, {
            method: 'DELETE'
        });
    }

    // Nómina
    async getNominas(page = 0, size = 20, sortBy = 'idNomina', sortDir = 'asc') {
        return this.request(`/nomina?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getNomina(id) {
        return this.request(`/nomina/${id}`);
    }

    async createNomina(data) {
        return this.request('/nomina', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateNomina(id, data) {
        return this.request(`/nomina/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteNomina(id) {
        return this.request(`/nomina/${id}`, {
            method: 'DELETE'
        });
    }

    // Empleados
    async getEmpleados(page = 0, size = 20, sortBy = 'idEmpleado', sortDir = 'asc') {
        return this.request(`/empleado?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getEmpleado(id) {
        return this.request(`/empleado/${id}`);
    }

    async getEmpleadoByNombre(nombre) {
        return this.request(`/empleado/nombre/${nombre}`);
    }

    async createEmpleado(data) {
        return this.request('/empleado', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateEmpleado(id, data) {
        return this.request(`/empleado/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Cuentas Contables
    async getCuentasContables(page = 0, size = 20, sortBy = 'idCuentaContable', sortDir = 'asc') {
        return this.request(`/cuenta-contable?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getCuentaContable(id) {
        return this.request(`/cuenta-contable/${id}`);
    }

    async createCuentaContable(data) {
        return this.request('/cuenta-contable', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateCuentaContable(id, data) {
        return this.request(`/cuenta-contable/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteCuentaContable(id) {
        return this.request(`/cuenta-contable/${id}`, {
            method: 'DELETE'
        });
    }

    // Asientos Contables
    async getAsientosContables(page = 0, size = 20, sortBy = 'idAsientoContable', sortDir = 'asc') {
        return this.request(`/asiento-contable?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getAsientoContable(id) {
        return this.request(`/asiento-contable/${id}`);
    }

    async createAsientoContable(data) {
        return this.request('/asiento-contable', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateAsientoContable(id, data) {
        return this.request(`/asiento-contable/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteAsientoContable(id) {
        return this.request(`/asiento-contable/${id}`, {
            method: 'DELETE'
        });
    }

    // Movimientos Contables
    async getMovimientosContables(page = 0, size = 20, sortBy = 'idMovimientoContable', sortDir = 'asc') {
        return this.request(`/movimiento-contable?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getMovimientoContable(id) {
        return this.request(`/movimiento-contable/${id}`);
    }

    async getMovimientosByAsiento(asientoId) {
        return this.request(`/movimiento-contable/asiento/${asientoId}`);
    }

    async getMovimientosByCuenta(cuentaId) {
        return this.request(`/movimiento-contable/cuenta/${cuentaId}`);
    }

    async createMovimientoContable(data) {
        return this.request('/movimiento-contable', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateMovimientoContable(id, data) {
        return this.request(`/movimiento-contable/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteMovimientoContable(id) {
        return this.request(`/movimiento-contable/${id}`, {
            method: 'DELETE'
        });
    }

    // Comisiones
    async getComisiones(page = 0, size = 20, sortBy = 'idComision', sortDir = 'asc') {
        return this.request(`/comision?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
    }

    async getComision(id) {
        return this.request(`/comision/${id}`);
    }

    async getComisionesByVenta(ventaId) {
        return this.request(`/comision/venta/${ventaId}`);
    }

    async getComisionesByEmpleado(empleadoId) {
        return this.request(`/comision/empleado/${empleadoId}`);
    }

    async getComisionesPendientes() {
        return this.request('/comision/pendientes');
    }

    async getComisionesPendientesByEmpleado(empleadoId) {
        return this.request(`/comision/pendientes/empleado/${empleadoId}`);
    }

    async createComision(data) {
        return this.request('/comision', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateComision(id, data) {
        return this.request(`/comision/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteComision(id) {
        return this.request(`/comision/${id}`, {
            method: 'DELETE'
        });
    }

    async generarComisionesVenta(ventaId, empleadoVendedorId, empleadoCobradorId, porcentajeVenta, porcentajeCobranza) {
        return this.request(`/comision/generar-por-venta?ventaId=${ventaId}&empleadoVendedorId=${empleadoVendedorId}&empleadoCobradorId=${empleadoCobradorId}&porcentajeVenta=${porcentajeVenta}&porcentajeCobranza=${porcentajeCobranza}`, {
            method: 'POST'
        });
    }

    async pagarComisiones(comisionIds) {
        return this.request('/comision/pagar', {
            method: 'POST',
            body: JSON.stringify(comisionIds)
        });
    }
}

// Create global instance
const api = new ApiClient();
