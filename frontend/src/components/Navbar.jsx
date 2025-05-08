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
              <Link to={`/${user.username}`} className="profile-link">
                <div className="profile-preview">
                  <img
                    src={user.avatar_url
                      ? `http://localhost:5000/uploads/${user.avatar_url}`
                      : '/default-avatar.png'
                    }
                    alt="Аватар"
                    className="nav-avatar"
                  />
                  <span className="nav-username">{user.username}</span>
                </div>
              </Link>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="logout-btn"
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