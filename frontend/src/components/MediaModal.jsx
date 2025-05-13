import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/MediaModal.css';

const MediaModal = ({ mediaId, onClose }) => {
  const [media, setMedia] = useState(null);
  const [status, setStatus] = useState({
    planned: false,
    completed: false,
    favorite: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  const getContentLoc = useCallback((type) => ({
    movie: 'фильм',
    anime: 'аниме',
    book: 'книга'
  }[type]), []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (e) {
          localStorage.clear();
        }
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {

        // Запрос данных о медиа
        const mediaResponse = await axios.get(`http://localhost:5000/api/media/${mediaId}`);

        // Запрос статусов пользователя
        let statusResponse = { data: {} };
        if (user) {
          statusResponse = await axios.get(`http://localhost:5000/api/media/${mediaId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }

        setMedia(mediaResponse.data);
        setStatus(statusResponse.data);
        setError(null);
      } catch (err) {
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    if (mediaId) fetchData();
  }, [mediaId]);

  const handleStatusChange = async (listType) => {
    try {
      const currentStatus = status[listType];
      const newStatus = !currentStatus;

      const oppositeType = listType === 'completed' ? 'planned' :
                          listType === 'planned' ? 'completed' : null;

      const updates = {
        [listType]: newStatus,
        ...(oppositeType && { [oppositeType]: false })
      };

      await axios.post('http://localhost:5000/api/media/list',
        {
          media_id: mediaId,
          list_type: listType,
          operation: newStatus ? 'add' : 'remove'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStatus(prev => ({
        ...prev,
        ...updates
      }));
    } catch (err) {
      alert(err.response?.data?.error || 'Ошибка обновления');
    }
  };

  if (!mediaId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="media-modal" onClick={(e) => e.stopPropagation()}>
        <button className="media-close-btn" onClick={onClose}>×</button>

        {loading ? (
          <div className="loading-state">Загрузка...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : (
          <>
            <div className="media-header">
              <h1>{media.title}</h1>
              <div className="media-meta">
                <span>{getContentLoc(media.type)}, {media.release_year}</span>
              </div>
            </div>

            <div className="media-content">
              <div className="poster-section">
                <img
                  src={media.cover_url || '/placeholder.jpg'}
                  alt={media.title}
                  className="media-poster"
                />
                {user && (
                  <div className="status-controls">
                    <StatusButton
                      type="planned"
                      label="Запланировано"
                      isActive={status.planned}
                      onClick={handleStatusChange}
                    />
                    <StatusButton
                      type="completed"
                      label="Просмотрено"
                      isActive={status.completed}
                      onClick={handleStatusChange}
                    />
                    <StatusButton
                      type="favorite"
                      label="Избранное"
                      isActive={status.favorite}
                      onClick={handleStatusChange}
                    />
                  </div>
                )}
              </div>

              <div className="details-section">
                <p>★ {media.external_rating} ({media.external_rating_count} оценили)</p>
                <div className="genres">
                  {media.genres?.map(genre => (
                    <span key={genre} className="genre-tag">{genre}</span>
                  ))}
                </div>
                <p className="description">{media.description}</p>
                {media.author && <p className="author">Автор: {media.author}</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatusButton = ({ type, label, isActive, onClick, isDisabled }) => {
  const icons = {
    planned: '⏳',
    completed: '✅',
    favorite: '⭐'
  };

  return (
    <button
      className={`status-btn ${isActive ? 'active' : ''}`}
      onClick={() => onClick(type)}
      disabled={isDisabled}
    >
      <span className="status-icon">{icons[type]}</span>
      <span className="status-label">{label}</span>
      {isDisabled && <div className="loading-spinner"></div>}
    </button>
  );
};

export default MediaModal;