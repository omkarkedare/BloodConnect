import { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      try {
        const response = await authService.getCurrentUser();
        setUser(response.data);
        setToken(storedToken);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    setToken(access_token);
    
    // Fetch the current user now that we have the token
    const userResponse = await authService.getCurrentUser();
    const userData = userResponse.data;
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    return userData;
  };

  const register = async (data) => {
    const response = await authService.register(data);
    return response.data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    loadUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
