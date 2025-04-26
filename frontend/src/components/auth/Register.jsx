import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!formData.username.match(usernameRegex)) {
      newErrors.username = 'Только буквы, цифры и нижнее подчеркивание';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Пароль должен быть не менее 8 символов';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        username: formData.username,
        password: formData.password
      });
      navigate('/login');
    } catch (error) {
      if (error.response?.data?.error.includes('Username')) {
        setErrors({ general: 'Имя пользователя уже занято' });
      } else {
        setErrors({ general: 'Ошибка регистрации' });
      }
    }
  };

  return (
    <div className="register-page">
    <div className="back-to-main">
      <button
        onClick={() => {
          localStorage.clear();
          window.location.href = '/';
        }}
      >
        На главную
      </button>
    </div>

    <div className="auth-container">
      <h2>Регистрация</h2>
      {errors.general && <div className="error-message">{errors.general}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Имя пользователя:</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            className={errors.username ? 'error' : ''}
          />
          {errors.username && <span className="error-text">{errors.username}</span>}
        </div>

        <div className="form-group">
          <label>Пароль:</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className={errors.password ? 'error' : ''}
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label>Подтвердите пароль:</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            className={errors.confirmPassword ? 'error' : ''}
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>

        <button type="submit" className="submit-btn">Зарегистрироваться</button>
      </form>

      <div className="auth-link">
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </div>
    </div>
    </div>
  );
};

export default Register;