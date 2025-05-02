import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../Navbar';
import EditProfileModal from './EditProfileModal';
import MediaPieChart from './MediaPieChart';
import FavoriteList from './FavoriteList';
import MediaStats from './MediaStats';
import '../../styles/ProfilePage.css';

const ProfilePage = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const cancelTokenRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');

        const headers = token ? {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        } : {};

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
    fetchProfile();
  }, [username]);

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
              src={`http://localhost:5000/uploads/${profile.avatar_url}` || '/default-avatar.png'}
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
          <FavoriteList userId={profile.id} />
          <MediaStats username={profile.username} />
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