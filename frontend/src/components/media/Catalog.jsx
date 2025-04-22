import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import Navbar from '../Navbar';
import ListButton from '../ListButton';
import '../../styles/Catalog.css';

const Catalog = () => {
  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');

  const prevData = useRef([]);
  const cancelTokenRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const getContentType = useCallback((tab) => ({
    movies: 'movie',
    anime: 'anime',
    books: 'book'
  }[tab]), []);


  const loadMediaData = useCallback(async (query) => {
    try {
      setIsLoading(true);

      const params = {
        type: getContentType(selectedTab),
        sort_by: 'popularity',
        query: query.trim() || undefined
      };

      const response = await axios.get('http://localhost:5000/api/media', {
        params,
        cancelToken: new axios.CancelToken(c => cancelTokenRef.current = c)
      });

      prevData.current = response.data.items || [];
      setMedia(prevData.current);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Ошибка загрузки:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTab, getContentType]);


  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadMediaData(searchQuery);
    }, 500);

    return () => {
      clearTimeout(searchTimeoutRef.current);
      if (cancelTokenRef.current) {
        cancelTokenRef.current();
      }
    };
  }, [searchQuery, loadMediaData]);

  useEffect(() => {
    loadMediaData(searchQuery);
  }, [searchQuery, selectedTab, loadMediaData]);

  const mediaToShow = useMemo(() =>
    isLoading ? prevData.current : media,
  [isLoading, media]);

  const handleAddToList = useCallback(async (mediaId, listType) => {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    // Проверка наличия токена
    if (!token || !user) {
      alert('Для выполнения действия необходимо войти в систему');
      window.location.href = '/login';
      return;
    }

    // Проверка срока действия токена
    const decodedToken = JSON.parse(atob(token.split('.')[1]));
    if (decodedToken.exp * 1000 < Date.now()) {
      alert('Сессия истекла. Пожалуйста, войдите снова');
      localStorage.clear();
      window.location.reload();
      return;
    }

    // Отправка запроса
    await axios.post(
      'http://localhost:5000/api/media/list',
      { media_id: mediaId, list_type: listType },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Обновление UI
    setMedia(prev => prev.map(item =>
      item.id === mediaId ? { ...item, user_list: listType } : item
    ));

  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    } else {
      console.error('Ошибка:', error);
      alert(error.response?.data?.error || 'Ошибка сервера');
    }
  }
}, []);

  return (
    <div className="catalog-page">
      <Navbar />

      <div className="catalog-container">

        <div className="search-bar">
          <input
            type="text"
            placeholder={`Search ${selectedTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isLoading && <div className="search-spinner"></div>}
        </div>

        <div className="tabs">
          {['movies', 'anime', 'books'].map((tab) => (
            <button
              key={tab}
              className={selectedTab === tab ? 'active' : ''}
              onClick={() => setSelectedTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="media-grid">
          {mediaToShow.map(item => (
            <div
              key={item.id}
              className={`media-card ${isLoading ? 'loading' : ''}`}
            >
              <img
                src={item.cover_url || '/placeholder.jpg'}
                alt={item.title}
                loading="lazy"
              />
                <div className="media-info">
                  <h3>{item.title}</h3>
                  <div className="rating">
                    <span>★ {item.rating?.toFixed(1) || 'N/A'}</span>
                    <span>{item.release_year}</span>
                  </div>
                  <div className="list-buttons">
                    <ListButton
                      type="planned"
                      isActive={item.user_list === 'planned'}
                      onClick={() => handleAddToList(item.id, 'planned')}
                    />
                    <ListButton
                      type="completed"
                      isActive={item.user_list === 'completed'}
                      onClick={() => handleAddToList(item.id, 'completed')}
                    />
                    <ListButton
                      type="favorite"
                      isActive={item.user_list === 'favorite'}
                      onClick={() => handleAddToList(item.id, 'favorite')}
                    />
                  </div>
                </div>
            </div>
          ))}
        </div>

        {mediaToShow.length === 0 && !isLoading && (
          <div className="no-results">No results found</div>
        )}

      </div>
    </div>
  );
};

export default Catalog;