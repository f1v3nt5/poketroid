import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faSquarePlus, faClock } from '@fortawesome/free-regular-svg-icons';
import '../../styles/FriendSearch.css';

const FriendSearch = ({ onSendRequest }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const searchUsers = async () => {
    if (!query.trim()) {
      setError('Введите имя для поиска');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      const response = await axios.get(`http://localhost:5000/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}`}
      });
      setResults(response.data);
    } catch (err) {
      setError('Ошибка при поиске пользователей');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchUsers();
  };

  return (
    <div className="friend-search">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            placeholder="Поиск пользователей..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="search-button" type="submit" disabled={isLoading}>
            Найти
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </form>

      <div className="search-results">
        {results.map(user => (
          <div className="user-result">
            <Link key={user.id} to={`/users/${user.username}`} className="user-info">
              <img
                src={user.avatar
                      ? `http://localhost:5000/uploads/${user.avatar}`
                      : '/default-avatar.png'}
                alt={user.username}
                className="user-avatar"
              />
              <div className="user-details">
                <span className="display-name">@{user.username}</span>
                {user.displayName && <span className="display-name">{user.displayName}</span>}
              </div>
            </Link>
            <>
              {user.status === 'none' && !user.isCurrentUser &&
                <button
                  className="add-button"
                  onClick={() => {
                      onSendRequest(user.id);
                      user.status = 'pending'
                    }
                  }
                  disabled={user.isCurrentUser}
                >
                  <FontAwesomeIcon icon={faSquarePlus} />
                </button>
              }

              {user.status === 'pending' &&
                <button
                  className="add-button"
                  disabled={user.isCurrentUser}
                >
                  <FontAwesomeIcon icon={faClock} />
                </button>
              }

              {user.status === 'accepted' &&
                ''
              }
            </>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendSearch;