import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faClock, faCheckCircle, faHourglassHalf } from '@fortawesome/free-regular-svg-icons';
import Navbar from '../Navbar';
import MediaModal from './MediaModal';
import '../../styles/Catalog.css';

const Catalog = () => {
  useEffect(() => {
    document.title = 'Poketroid';
  }, []);

  const [media, setMedia] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('movies');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const abortControllerRef = useRef(null);

  const cancelTokenRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const getContentType = useCallback((tab) => ({
    movies: 'movie',
    anime: 'anime',
    books: 'book'
  }[tab]), []);

  const getContentLoc = useCallback((tab) => ({
    movies: 'фильмах',
    anime: 'аниме',
    books: 'книгах'
  }[tab]), []);

   const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setMedia([]);
    setIsLoading(true);
  };

  const loadMediaData = useCallback(async (query) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = localStorage.getItem('token');

      const params = {
        type: getContentType(selectedTab),
        sort_by: 'popularity',
        query: query.trim() || undefined,
        _: Date.now()
      };

      const headers = token ? {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache'
      } : {};

      const response = await axios.get('http://localhost:5000/api/media', {
        params,
        headers,
        cancelToken: new axios.CancelToken(c => cancelTokenRef.current = c),
        signal: abortController.signal
      });

      setMedia(response.data.items || []);
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error('Ошибка загрузки:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTab, getContentType]);

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

  const handleListChange = useCallback(async (mediaId, listType) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));

      if (!token || !user) {
        alert('Для выполнения действия необходимо войти в систему');
        window.location.href = '/login';
        return;
      }

      const response = await axios.post(
        'http://localhost:5000/api/media/list',
        {
          media_id: mediaId,
          list_type: listType,
          operation: 'toggle'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMedia(prev => prev.map(item =>
        item.id === mediaId ? {
          ...item,
          is_planned: response.data.is_planned,
          is_completed: response.data.is_completed,
          is_favorite: response.data.is_favorite
        } : item
      ));
    } catch (error) {
      console.error('Ошибка обновления списка:', error);
      alert(error.response?.data?.error || 'Ошибка обновления');
      setMedia(prev => prev.map(item =>
        item.id === mediaId ? {
          ...item,
          [listType === 'planned' ? 'is_planned' :
           listType === 'completed' ? 'is_completed' :
           'is_favorite']: !item[listType]
        } : item
      ));
    }
  }, []);

  const MediaCard = ({ item, onListChange }) => {
    const [localStatus, setLocalStatus] = useState({
      planned: item.is_planned,
      completed: item.is_completed,
      favorite: item.is_favorite
    });

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
      setLocalStatus({
        planned: item.is_planned,
        completed: item.is_completed,
        favorite: item.is_favorite
      });
    }, [item]);

    const handleToggle = async (listType, e) => {
      e.stopPropagation();
      try {
        setLocalStatus(prev => ({
          ...prev,
          [listType]: !prev[listType],
          ...(listType === 'planned' && { completed: false }),
          ...(listType === 'completed' && { planned: false })
        }));
        await onListChange(item.id, listType);
      } catch (error) {
        setLocalStatus({
          planned: item.is_planned,
          completed: item.is_completed,
          favorite: item.is_favorite
        });
      }
    };

    return (
      <div className="media-card" onClick={() => setSelectedMedia(item.id)}>

        {user ? (
          <>
            <div className="favorite-icon" onClick={(e) => handleToggle('favorite', e)}>
              <FontAwesomeIcon
                icon={faStar}
                className={localStatus.favorite ? 'active favorite' : ''}
              />
            </div>
          </>
        ) : (
          <>
          </>
        )}

        <img
          src={item.cover_url || '/placeholder.jpg'}
          alt={item.title}
          loading="lazy"
        />

        <div className="media-info">
          <h3>{item.title}</h3>
          <div className='author'>
            <span> {item.author || ''}</span>
          </div>
          <div className="rating">
            <span>★ {item.rating?.toFixed(1) || 'N/A'}</span>
            <span>{item.year}</span>
          </div>
        </div>

        <div className="status-bar">

          {user ? (
            <>
              <div className="planned" onClick={(e) => handleToggle('planned', e)}>
                <FontAwesomeIcon
                  icon={faClock}
                  className={localStatus.planned ? 'active planned' : ''}
                />
              </div>
              <div className="completed" onClick={(e) => handleToggle('completed', e)}>
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className={localStatus.completed ? 'active completed' : ''}
                />
              </div>
            </>
          ) : (
            <>
            </>
          )}
        </div>
      </div>
    );
  };

  const mediaToShow = media;

  return (
    <div className="catalog-page">
      <Navbar />

      {selectedMedia && (
        <MediaModal
          mediaId={selectedMedia}
          onClose={() => {
            setSelectedMedia(null);
            loadMediaData(searchQuery);
          }
          }
        />
      )}

      <div className="catalog-container">
        <div className="catalog-header">
          <h1>Каталог</h1>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder={`Поиск в ${getContentLoc(selectedTab)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tabs">
          {['movies', 'anime', 'books'].map((tab) => (
            <button
              key={tab}
              className={selectedTab === tab ? 'active' : ''}
              onClick={() => handleTabChange(tab)}
              disabled={selectedTab === tab}
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
          {isLoading ? (
            <div className="loading-overlay">
              <FontAwesomeIcon
                icon={faHourglassHalf}
                spin
                className="loading-spinner"
                size="2x"
              />
            </div>
          ) : (
            mediaToShow.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onListChange={handleListChange}
              />
            ))
          )}
        </div>

        {mediaToShow.length === 0 && !isLoading && (
          <div className="no-results">Ничего не найдено</div>
        )}
      </div>
    </div>
  );
};


export default Catalog;