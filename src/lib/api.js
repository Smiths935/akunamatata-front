import axios from 'axios';
import { create } from 'zustand';

// Configuration de base de l'API
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Instance Axios configurée
export const api = axios.create({
  baseURL: API_BASE_URL,
  // timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('foodHive_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      // const publicPaths = ['/']; 
      
      // Obtenir le chemin de la page actuelle
      // const currentPath = window.location.pathname;

      // Vérifier si la page actuelle est un chemin public
      // const isPublicPath = publicPaths.some(path => currentPath.startsWith(path));

      // if (!isPublicPath) {
        localStorage.removeItem('foodHive_token');
        localStorage.removeItem('foodHive_user');
        window.location.href = '/login';
      // }
    }
    
    // Retourner l'erreur formatée
    return Promise.reject({
      message: error.response?.data?.message || 'Une erreur est survenue',
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// Services d'authentification
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  
  register: (userData) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  
  getProfile: () => api.get('/auth/me')
};

// Services des utilisateurs
export const userService = {
  getUsers: (params = {}) => api.get('/users', { params }),
  
  getUser: (id) => api.get(`/users/${id}`),
  
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  
  deleteUser: (id) => api.delete(`/users/${id}`),
  
  addFavorite: (userId, platId) => api.post(`/users/${userId}/add-favorite`, { platId }),
  
  removeFavorite: (userId, platId) => api.delete(`/users/${userId}/remove-favorite/${platId}`),
  
  getFavorites: (userId) => api.get(`/users/${userId}/favorites`)
};

// Services des tables
export const tableService = {
  getTables: (params = {}) => api.get('/table', { params }),
  
  getAvailableTables: () => api.get('/table/available'),
  
  getTable: (id) => api.get(`/table/${id}`),
  
  createTable: (tableData) => api.post('/table', tableData),
  
  updateTable: (id, tableData) => api.put(`/table/${id}`, tableData),
  
  deleteTable: (id) => api.delete(`/table/${id}`),
  
  getQRCode: (id) => api.get(`/table/${id}/qrcode`),
  
  occupyTable: (id) => api.post(`/table/${id}/occupy`),
  
  freeTable: (id) => api.post(`/table/${id}/free`),
  
  validateQR: (qrCode) => api.post('/table/validate-qr', { qrCode })
};

// Services des catégories
export const categorieService = {
  getCategories: (params = {}) => api.get('/categories', { params }),
  
  getCategorie: (id) => api.get(`/categories/${id}`),
  
  createCategorie: (categorieData) => api.post('/categories', categorieData),
  
  updateCategorie: (id, categorieData) => api.put(`/categories/${id}`, categorieData),
  
  deleteCategorie: (id) => api.delete(`/categories/${id}`),
  
  getCategoryPlats: (id, params = {}) => api.get(`/categories/${id}/plats`, { params })
};

// Services des plats
export const platService = {
  getPlats: (params = {}) => api.get('/plats', { params }),
  
  getFeaturedPlats: (params = {}) => api.get('/plats/featured', { params }),
  
  getPlat: (id) => api.get(`/plats/${id}`),
  
  createPlat: (platData) => api.post('/plats', platData),
  
  updatePlat: (id, platData) => api.put(`/plats/${id}`, platData),
  
  deletePlat: (id) => api.delete(`/plats/${id}`),
  
  toggleAvailability: (id) => api.patch(`/plats/${id}/toggle-availability`),
  
  getNutrition: (id) => api.get(`/plats/${id}/nutrition`)
};

// Services des menus
export const menuService = {
  getMenus: (params = {}) => api.get('/menus', { params }),
  
  getTodayMenu: (params = {}) => api.get('/menus/today', { params }),
  
  getMenu: (id) => api.get(`/menus/${id}`),
  
  createMenu: (menuData) => api.post('/menus', menuData),
  
  updateMenu: (id, menuData) => api.put(`/menus/${id}`, menuData),
  
  deleteMenu: (id) => api.delete(`/menus/${id}`),
  
  toggleStatus: (id) => api.patch(`/menus/${id}/toggle-status`),
  
  addPlat: (id, platId) => api.post(`/menus/${id}/add-plat`, { platId }),
  
  removePlat: (id, platId) => api.delete(`/menus/${id}/remove-plat/${platId}`)
};

// Services des paniers
export const panierService = {
  getPanier: (clientId, params={}) => api.get(`/paniers/${clientId}`, { params }),
  
  addToPanier: (panierId, itemData) => api.post(`/paniers/${panierId}/add`, itemData),
  
  updateItem: (panierId, itemData) => api.put(`/paniers/${panierId}/update-item`, itemData),
  
  removeItem: (panierId, platId) => api.delete(`/paniers/${panierId}/remove/${platId}`),
  
  clearPanier: (panierId) => api.delete(`/paniers/${panierId}/clear`),
  
  convertToOrder: (panierId, orderData) => api.post(`/paniers/${panierId}/convert-to-order`, orderData),
  
  getSummary: (panierId) => api.get(`/paniers/${panierId}/summary`)
};

// Services des commandes
export const commandeService = {
  getCommandes: (params = {}) => api.get('/commandes', { params }),
  
  getStats: (params = {}) => api.get('/commandes/stats', { params }),
  
  getUserCommande: (id) => api.get(`/commandes/${id}`),
  
  updateStatus: (id, statusData) => api.put(`/commandes/${id}/status`, statusData),
  
  getHistory: (clientId, params = {}) => api.get(`/commandes/client/${clientId}/history`, { params }),
  
  getTableCommandes: (tableId, params = {}) => api.get(`/commandes/table/${tableId}`, { params }),
  
  cancelCommande: (id) => api.delete(`/commandes/${id}`),
  
  getKitchenOrders: () => api.get('/commandes/pending/kitchen')
};

// Services des restaurants
export const restaurantService = {
  getRestaurants: () => api.get('/restaurants'),
  
  getRestaurant: (id) => api.get(`/restaurants/${id}`),

  createRestaurant: (restaurantData) => api.post('/restaurants', restaurantData),

  updateRestaurant: (id, restaurantData) => api.put(`/restaurants/${id}`, restaurantData),

  deleteRestaurant: (id) => api.delete(`/restaurants/${id}`),
};

// Services de paiement
export const paymentService = {
  createPayment: (paymentData) => api.post('/payments', paymentData),
  getPaymentByCommande: (commandeId) => api.get(`/payments/commande/${commandeId}`),
  getPaymentLink: (id, params) => api.get(`/payments/generate-link/${id}`, { params }),
  getPaymentStatus: (commandeId) => api.get(`/payments/status/commande/${commandeId}`),

  verifyPayment: (paymentId) => api.get(`/payments/verify/${paymentId}`),
  updatePayment: (commandeId, paymentData) => api.put(`/payments/${commandeId}`, paymentData),
}