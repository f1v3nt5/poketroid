import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../Navbar';
import EditProfileModal from './EditProfileModal';
import MediaPieChart from './MediaPieChart';
import FavoriteList from './FavoriteList';
import MediaStats from './MediaStats';
import FriendsList from './FriendsList';
import '../../styles/ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const cancelTokenRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = token ? {
    Authorization: `Bearer ${token}`,
    'Cache-Control': 'no-cache'
  } : {};

  const fetchProfile = async () => {

    try {
      const res = await axios.get(`http://localhost:5000/api/users/${username}`, {
        headers,
        cancelToken: new axios.CancelToken(c => cancelTokenRef.current = c)
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const FriendActions = ({ profile }) => {
    const [status, setStatus] = useState(profile.status);

    const deleteFriend = async () => {
      try {
        await axios.delete(`http://localhost:5000/api/friends/${profile.id}`, {
          headers
        });
      } catch (err) {
        console.error('Error deleting friend:', err);
      }
    };

    const acceptRequest = async () => {
      try {
        await axios.post(`http://localhost:5000/api/friends/requests/${profile.id}/accept`,
        { data: 'data' },
        {
          headers
        });
      } catch (err) {
        console.error('Error accepting request:', err);
      }
    };

    const rejectRequest = async () => {
      try {
        await axios.post(`http://localhost:5000/api/friends/requests/${profile.id}/reject`,
        { data: 'data' },
        {
          headers
        });
      } catch (err) {
        console.error('Error rejecting request:', err);
      }
    };

    const sendRequest = async () => {
      try {
        await axios.post(`http://localhost:5000/api/friends/${profile.id}/request`,
        { data: 'data' },
        {
          headers
        });
      } catch (err) {
        console.error('Error sending request:', err);
      }
    };

    const cancelRequest = async () => {
      try {
        await axios.delete(`http://localhost:5000/api/friends/requests/${profile.id}`,
        {
          headers
        });
      } catch (err) {
        console.error('Error cancelling request:', err);
      }
    }

    return (

      <div>
        {status === 'none' && !profile.is_current_user && (
          <button
            className="add-friend-btn"
            onClick={() => {
              sendRequest();
              setStatus('pending outcoming');
            }}
          >
            Добавить в друзья
          </button>
        )}

        {status === 'accepted' && (
          <button
            className="del-friend-btn"
            onClick={() => {
              deleteFriend();
              setStatus('none');
            }}
          >
            Удалить из друзей
          </button>
        )}

        {status === 'pending incoming' && (
          <div className='request-buttons'>
            <button
              className="accept-request-btn"
              onClick={() => {
                acceptRequest();
                setStatus('accepted');
              }}
            >
              Принять
            </button>
            <button
              className="reject-request-btn"
              onClick={() => {
                rejectRequest();
                setStatus('none');
              }}
            >
              Отклонить
            </button>
          </div>
        )}

        {status === 'pending outcoming' && (
          <button
            className="cancel-request-btn"
            onClick={() => {
                cancelRequest();
                setStatus('none');
              }}
          >
            Отменить запрос
          </button>
        )}
      </div>
    );
  };


  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!profile) {
    return <div className="error">Profile not found</div>;
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-container">

        <div className="profile-header">
          <div className="avatar-section">
            <img
              src={profile.avatar_url
                      ? `http://localhost:5000/uploads/${profile.avatar_url}`
                      : '/default-avatar.png'
                    }
              alt="Avatar"
              className="profile-avatar"
            />
            {profile.is_current_user && (
              <button
                className="edit-profile-btn"
                onClick={() => setIsEditing(true)}
              >
                Редактировать
              </button>
            )}

            <FriendActions profile={profile} />


          </div>
          <div className="profile-info">
            <h1>{profile.display_name || profile.username}</h1>
            <p className="username">@{profile.username}</p>
            <p className="reg-date">Дата регистрации: {new Date(profile.registered_at).toLocaleDateString("ru-RU")}</p>
            <h2 className="about-title">Обо мне</h2>
            <p className="about">{profile.about}</p>
          </div>

          <MediaPieChart stats={{
            books: profile.stats.books.completed + profile.stats.books.planned,
            movies: profile.stats.movies.completed + profile.stats.movies.planned,
            anime: profile.stats.anime.completed + profile.stats.anime.planned
          }} />

        </div>

        <div className="profile-lists">
          <FriendsList username={profile.username} />
          <MediaStats username={profile.username} />
          <FavoriteList userId={profile.id} username={profile.username} />
        </div>

      </div>
      {isEditing && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditing(false)}
          onSave={(updatedProfile) => {
            setProfile(updatedProfile);
            if (updatedProfile.avatar_url) {
              const user = JSON.parse(localStorage.getItem('user'));
              localStorage.setItem('user', JSON.stringify({
                ...user,
                avatar_url: updatedProfile.avatar_url
              }));
            }
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;