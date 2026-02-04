import React, { createContext, useState, useContext, useEffect } from 'react';
import { users as mockUsers } from '../views/marks-management/data/mockData'; 

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  // 1. Initialize state from localStorage if available
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("Error parsing user from local storage", error);
      return null;
    }
  });

  // 2. Login function: Accepts email, role, and the full user object
  const login = (email, role, fullUserObject = null) => {
    let userData = fullUserObject;

    // Fallback: If full object wasn't passed, try to find it in mockData
    if (!userData) {
      userData = mockUsers.find(u => u.email === email && u.role === role);
    }

    if (userData) {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData)); // Save to storage
    } else {
      console.error("Login failed: User not found or role mismatch");
    }
  };

  // 3. Logout function: Clears state and localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    window.location.href = '/session/signin'; // Force redirect to login
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;