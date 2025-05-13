import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-regular-svg-icons';
import FriendsDropdown from './FriendsDropdown';
import '../styles/Navbar.css';

const Navbar = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [requestsCount, setRequestsCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('user'));

  const fetchRequestsCount = async () => {
    try {
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};

      const res = await axios.get('http://localhost:5000/api/friends/requests', {
        headers
      });
      setRequestsCount(res.data.incoming.length);
    } catch (err) {
      console.error('Ошибка загрузки запросов:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchRequestsCount();
  }, [user]);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">Poketroid</Link>

        <div className="nav-links">
          {user ? (
            <>

              <Link to={`/users/${user.username}`} className="profile-link">
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
                className="friends-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <FontAwesomeIcon icon={faUser} />
                {requestsCount > 0 && (
                  <span className="badge">{requestsCount}</span>
                )}
            </button>

              <FriendsDropdown
                isOpen={dropdownOpen}
                onClose={() => setDropdownOpen(false)}
                labelChange={() => fetchRequestsCount()}
              />

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