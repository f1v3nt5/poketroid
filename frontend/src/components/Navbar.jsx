import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">Poketroid</Link>

        <div className="nav-links">
          {user ? (
            <>
              <Link to={`/${user.username}`}>Профиль</Link>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;