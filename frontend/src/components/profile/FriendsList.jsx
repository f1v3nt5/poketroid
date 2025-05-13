import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../styles/FriendsList.css';

const FriendsList = ({ username }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const token = localStorage.getItem('token');

        const headers = token ? {
          Authorization: `Bearer ${token}`
        } : {};

        const res = await axios.get(`http://localhost:5000/api/users/${username}/friends`, {
          headers
        });
        setFriends(res.data.friends);
      } catch (err) {
        console.error('Ошибка загрузки друзей:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [username]);

  return (
    <section className="friends-section">
      <h2>Друзья</h2>

      {loading ? (
        <div className="loading-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="friend-item-skeleton"></div>
          ))}
        </div>
      ) : friends.length === 0 ? (
        <div className="empty-state">
          <p>Список друзей пуст</p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.slice(0,5).map(friend => (
            <Link
              key={friend.id}
              to={`/users/${friend.username}`}
              className="friend-item"
            >
              <img
                src={friend.avatar
                      ? `http://localhost:5000/uploads/${friend.avatar}`
                      : '/default-avatar.png'}
                alt={friend.username}
                className="friend-avatar"
              />
              <span className="friend-name">{friend.username}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default FriendsList;