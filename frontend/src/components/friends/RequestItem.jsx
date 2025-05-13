import React from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const RequestItem = ({ request, type, onUpdate }) => {
  const handleAction = async (action) => {
    try {
      const token = localStorage.getItem('token');

      const headers = token ? {
        Authorization: `Bearer ${token}`
      } : {};

      if (type === 'incoming') {
        await axios.post(`http://localhost:5000/api/friends/requests/${request.user.id}/${action}`,
        { data: 'data' },
        {
          headers
        });
      } else {
        await axios.delete(`http://localhost:5000/api/friends/requests/${request.user.id}`, {
          headers
        });
      }
      onUpdate();
    } catch (err) {
      console.error('Ошибка:', err.response?.data);
    }
  };

  return (
    <div className="request-item">
      <Link className="user-info" key={request.user.id} to={`/users/${request.user.username}`}>
        <img
          src={request.user.avatar
                      ? `http://localhost:5000/uploads/${request.user.avatar}`
                      : '/default-avatar.png'}
          alt={request.user.username}
          className="user-avatar"
        />
        <div>
          <div className="username">{request.user.username}</div>
          <div className="date">{new Date(request.created_at).toLocaleDateString('ru-RU')}</div>
        </div>
      </Link>

      {type === 'incoming' ? (
        <div className="actions">
          <button
            className="accept-btn"
            onClick={() => handleAction('accept')}
          >
            Принять
          </button>
          <button
            className="reject-btn"
            onClick={() => handleAction('reject')}
          >
            Отклонить
          </button>
        </div>
      ) : (
        <button
          className="cancel-btn"
          onClick={() => handleAction('cancel')}
        >
          Отменить
        </button>
      )}
    </div>
  );
};

export default RequestItem;