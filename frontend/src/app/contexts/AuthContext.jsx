import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in when app loads
  useEffect(() => {
    const initAuth = async () => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            try {
                // Verify token by fetching user details
                const response = await api.get('/users/me/');
                setUser(response.data);
            } catch (error) {
                console.error("Session expired", error);
                logout();
            }
        }
        setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // 1. Get the Token
      const response = await api.post('/token/', { 
        username: email, // Django expects 'username', not 'email'
        password: password 
      });
      
      const { access, refresh } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      // 2. Get User Details (Role, Name, etc.)
      const userResponse = await api.get('/users/me/');
      const userData = userResponse.data;
      
      setUser(userData);
      return userData; // Return user to help with redirection
      
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    // 1. Clear all auth data
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);