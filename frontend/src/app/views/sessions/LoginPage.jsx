import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icons } from '../marks-management/shared/icons';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const redirectUser = (user) => {
    console.log("Attempting to redirect user:", user); // DEBUG LOG

    if (!user) {
        setError("Login failed: No user data received.");
        return;
    }

    // Check if role exists
    if (!user.role) {
        console.error("MISSING ROLE IN USER OBJECT:", user);
        setError(`Login successful, but 'role' is missing. Got: ${JSON.stringify(user)}`);
        return;
    }

    const role = user.role.toLowerCase();
    console.log("Detected Role:", role); // DEBUG LOG
    
    if (role === 'faculty') navigate('/faculty/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'superadmin') navigate('/superadmin/dashboard');
    else {
        setError(`Unknown role: ${role}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
        console.log("Submitting login for:", email);
        const user = await login(email, password);
        console.log("Backend response in LoginPage:", user); // DEBUG LOG
        redirectUser(user);
    } catch (err) {
        console.error("Login Error:", err);
        setError('Invalid credentials. Please check your email and password.');
    }
  };

  // Quick Login for testing
  const handleQuickLogin = async (role) => {
    const defaultPassword = 'password123'; 
    let devEmail = '';
    if (role === 'superadmin') devEmail = 'superadmin@obe.com';
    else if (role === 'admin') devEmail = 'admin@obe.com';
    else if (role === 'faculty') devEmail = 'faculty@obe.com';

    setEmail(devEmail);
    setPassword(defaultPassword);
    
    try {
        const user = await login(devEmail, defaultPassword);
        redirectUser(user);
    } catch (err) {
        setError(`Quick login failed for ${devEmail}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
          Sign in
        </h2>
        
        {/* Error Display */}
        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
            </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white" />
            </div>
            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                Sign in
            </button>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3">
             <button onClick={() => handleQuickLogin('superadmin')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Superadmin</button>
             <button onClick={() => handleQuickLogin('admin')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Admin</button>
             <button onClick={() => handleQuickLogin('faculty')} className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md bg-white text-xs font-medium text-gray-500 hover:bg-gray-50">Faculty</button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;