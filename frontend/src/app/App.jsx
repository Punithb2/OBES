import { useRoutes } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import SettingsProvider from './contexts/SettingsContext';
import ParcTheme from './components/parcTheme/ParcTheme';
import routes from './routes';
import { Toaster } from 'react-hot-toast'; 

function App() {
  const content = useRoutes(routes);

  return (
    <SettingsProvider>
      <AuthProvider>
        <ParcTheme>
          <CssBaseline />
          <Toaster 
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-white',
              duration: 3000,
              style: {
                fontWeight: '500',
                fontSize: '14px'
              }
            }} 
          />
          {content}
        </ParcTheme>
      </AuthProvider>
    </SettingsProvider>
  );
}

export default App;