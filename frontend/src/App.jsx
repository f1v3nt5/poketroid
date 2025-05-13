import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './components/auth/Register';
import Login from './components/auth/Login';
import Catalog from './components/media/Catalog';
import ProfilePage from './components/profile/ProfilePage';
import FavoritesPage from './components/profile/FavoritesPage';
import UserMediaList from './components/profile/UserMediaList';
import PageNotFound from "./components/errors/PageNotFound";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/users/:username" element={<ProfilePage />} />
        <Route path="/users/:username/favorites" element={<FavoritesPage />} />
        <Route path="/users/:username/lists/:mediaType" element={<UserMediaList />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  );
}

export default App;