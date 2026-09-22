import React from 'react';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import AppRoutes from './routes/AppRoutes';

export function App() {
  return (
    <Provider store={store}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </Provider>
  );
}

export default App;
