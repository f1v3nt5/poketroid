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
              <span className="welcome">Hi, {user.username}</span>
              <Link to="/profile">Profile</Link>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;