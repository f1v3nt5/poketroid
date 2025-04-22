import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faClock, faCheckCircle } from '@fortawesome/free-regular-svg-icons';
import Navbar from '../Navbar';
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
      const token = localStorage.getItem('token');

      const params = {
        type: getContentType(selectedTab),
        sort_by: 'popularity',
        query: query.trim() || undefined
      };

      const headers = token ? { Authorization: `Bearer ${token}` } : {};

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

  const handleListChange = useCallback(async (mediaId, listType) => {
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

      // Определяем текущий статус
      const currentItem = media.find(item => item.id === mediaId);
      const isActive = currentItem[`is_${listType}`];
      const operation = isActive ? 'remove' : 'add';

      // Удаление из противоположного списка
      let oppositeType = null;
      if (listType === 'planned') oppositeType = 'completed';
      if (listType === 'completed') oppositeType = 'planned';

      const requests = [];
      if (oppositeType) {
        requests.push(
          axios.post('http://localhost:5000/api/media/list', {
            media_id: mediaId,
            list_type: oppositeType,
            operation: 'remove'
          }, {
            headers: { Authorization: `Bearer ${token}` }
          })
        );
      }

      // Основной запрос
      requests.push(
        axios.post('http://localhost:5000/api/media/list', {
          media_id: mediaId,
          list_type: listType,
          operation: operation
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );

      // Выполняем все запросы
      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1].data;

      // Обновляем состояние
      setMedia(prev => prev.map(item =>
        item.id === mediaId ? {
          ...item,
          is_planned: lastResponse.is_planned,
          is_completed: lastResponse.is_completed,
          is_favorite: lastResponse.is_favorite
        } : item
      ));
    } catch (error) {
      console.error('Ошибка обновления списка:', error);
      alert(error.response?.data?.error || 'Ошибка обновления');
    }
  }, [media]);

  // Компонент карточки медиа
  const MediaCard = ({ item, onListChange }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleToggle = async (listType, e) => {
      e.stopPropagation();
      setIsProcessing(true);
      try {
        await onListChange(item.id, listType);
      } finally {
        setIsProcessing(false);
      }
    };


    return (
      <div className={`media-card ${isProcessing ? 'processing' : ''}`}>
        <div className="favorite-icon" onClick={(e) => handleToggle('favorite', e)}>
          <FontAwesomeIcon
            icon={faStar}
            className={item.is_favorite ? 'active favorite' : ''}
          />
        </div>

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
        </div>

        <div className="status-bar">
          <div className="planned" onClick={(e) => handleToggle('planned', e)}>
            <FontAwesomeIcon
              icon={faClock}
              className={item.is_planned ? 'active planned' : ''}
            />
          </div>

          <div className="completed" onClick={(e) => handleToggle('completed', e)}>
            <FontAwesomeIcon
              icon={faCheckCircle}
              className={item.is_completed ? 'active completed' : ''}
            />
          </div>
        </div>

        {isProcessing && <div className="processing-overlay"></div>}
      </div>
    );
  };

  // Оптимизация рендеринга
  const mediaToShow = useMemo(() =>
    isLoading ? prevData.current : media,
  [isLoading, media]);

  return (
    <div className="catalog-page">
      <Navbar />

      <div className="catalog-container">
        <div className="search-bar">
          <input
            type="text"
            placeholder={`Поиск в ${selectedTab}...`}
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
              {{
                movies: 'Фильмы',
                anime: 'Аниме',
                books: 'Книги'
              }[tab]}
            </button>
          ))}
        </div>

        <div className="media-grid">
          {mediaToShow.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              onListChange={handleListChange}
            />
          ))}
        </div>

        {mediaToShow.length === 0 && !isLoading && (
          <div className="no-results">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
};

export default Catalog;