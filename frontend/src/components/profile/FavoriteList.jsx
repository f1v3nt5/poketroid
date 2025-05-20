import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import MediaModal from '../media/MediaModal';
import '../../styles/FavoriteList.css';

const FavoriteList = ({ userId, username }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const getContentLoc = useCallback((type) => ({
    movie: 'фильм',
    anime: 'аниме',
    book: 'книга'
  }[type]), []);

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/media/favorites', {
        params: { user_id: userId },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const formattedData = response.data.items.map(item => ({
        id: item.media.id,
        title: item.media.title,
        type: item.media.type,
        added_at: item.added_at
      })).slice(0, 5);

      setFavorites(formattedData);
    } catch (err) {
      console.error('Ошибка:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  return (

    <section className="favorites-section">

      {selectedMedia && (
        <MediaModal
          mediaId={selectedMedia}
          onClose={() => {
            setSelectedMedia(null);
            fetchFavorites();
          }
          }
        />
      )}

      <h2 className="section-title">
        <Link to={`/users/${username}/favorites`}>Избранное</Link>
      </h2>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="favorite-item-skeleton"></div>
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="empty-state">
          <p>Список избранного пуст</p>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map(item => (
            <div
              key={item.id}
              className="favorite-item"
              style={{ borderColor: getBorderColor(item.type) }}
              onClick={() => setSelectedMedia(item.id)}
            >
              <div className="favorite-content">
                <span className="favorite-title">{item.title}</span>
                <span className="favorite-type">{getContentLoc(item.type)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </section>
  );
};

const getBorderColor = (type) => {
  switch(type) {
    case 'movie': return '#2196F3';
    case 'book': return '#4CAF50';
    case 'anime': return '#9C27B0';
    default: return '#cccccc';
  }
};

export default FavoriteList;