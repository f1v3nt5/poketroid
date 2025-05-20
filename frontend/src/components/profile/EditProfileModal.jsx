import React, { useState } from 'react';
import axios from 'axios';

const EditProfileModal = ({ profile, onClose, onSave }) => {
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    display_name: profile.display_name || '',
    gender: profile.gender || '',
    age: profile.age?.toString() || '',
    about: profile.about || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url
                      ? `http://localhost:5000/uploads/${profile.avatar_url}`
                      : '/default-avatar.png');
  const [isUploading, setIsUploading] = useState(false);

  if (!profile) {
    return (
      <div className="modal-overlay">
        <div className="edit-modal">
          <h2>Загрузка данных профиля...</h2>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Файл должен быть изображением');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Максимальный размер файла 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setAvatarFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsUploading(true);

    try {
        const token = localStorage.getItem('token');

        let newAvatarUrl = profile.avatar_url;
        if (avatarFile) {
          const formData = new FormData();
          formData.append('file', avatarFile);
          const res = await axios.post('http://localhost:5000/api/users/avatar', formData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          newAvatarUrl = res.data.avatar_url;
        }

        await axios.put(
          'http://localhost:5000/api/users/me',
          {
            display_name: formData.display_name.trim(),
            gender: formData.gender || null,
            age: formData.age ? parseInt(formData.age) : null,
            about: formData.about.trim(),
            avatar_filename: newAvatarUrl
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        onSave({
          ...formData,
          avatar_url: newAvatarUrl,
          stats: profile.stats,
          is_current_user: profile.is_current_user,
          username: profile.username,
          registered_at: profile.registered_at,
          durations: profile.durations,
          id: profile.id
        });
        onClose();
      } catch (err) {
        setError(err.response?.data?.error || 'Ошибка сохранения');
      } finally {
        setIsUploading(false);
      }
    };

  return (
    <div className="modal-overlay">
      <div className="edit-modal">
        <h2>Редактирование профиля</h2>
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="modal-content">
        {error && <div className="error-message">{error}</div>}

        <div className="avatar-section">
          <img
            src={avatarPreview || '/default-avatar.png'}
            alt="Аватар"
            className="avatar-preview"
          />
          <label className="avatar-upload-label">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              hidden
            />
            {avatarFile ? 'Изменить фото' : 'Загрузить фото'}
          </label>
          {avatarFile && (
            <button
              type="button"
              onClick={() => {
                setAvatarFile(null);
                setAvatarPreview(`http://localhost:5000/uploads/${profile.avatar_url}`);
              }}
              className="remove-avatar-btn"
            >
              ×
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Отображаемое имя:</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({...formData, display_name: e.target.value})}
              maxLength="50"
            />
          </div>

          <div className="form-group">
            <label>Пол:</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
            >
              <option value="">Не указан</option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>

          <div className="form-group">
            <label>Возраст:</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => {
                const value = Math.min(120, e.target.value || '');
                setFormData({...formData, age: value});
              }}
            />
          </div>

          <div className="form-group">
            <label>Обо мне:</label>
            <textarea
              value={formData.about}
              onChange={(e) => setFormData({...formData, about: e.target.value})}
              maxLength="500"
            />
          </div>

          <div className="modal-actions">
            <button
              type="submit"
              disabled={isUploading}
              className={isUploading ? 'loading' : ''}
            >
              {isUploading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={onClose} disabled={isUploading}>
              Отмена
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;