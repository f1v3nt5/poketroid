import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Catalog from './components/media/Catalog';
import ProfilePage from './components/profile/ProfilePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/:username" element={<ProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;